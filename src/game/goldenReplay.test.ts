import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { applyAutoLoadout } from "../combatLab/autoLoadouts";
import { applyFinale } from "../combatLab/encounter";
import { startLabBattle } from "../combatLab/factory";
import { createGauntletRun, resolveWager, reviveGauntletRun } from "../combatLab/gauntlet";
import { assignToSegment, createQiFight, playUlt, resolveTurn, selectCard, type QiFight } from "../combatLab/qiCommit";
import { setLabMode } from "./labTuning";
import { setLabRuleset } from "./labRuleset";
import { canPlay, endTurn, livingFoes, playCard, setBattleRng, setSegmentProbe } from "./sim";
import { addStake } from "./stake";
import { climbTestContext, makeTestContext } from "./testContext";
import type { Battle, CardId } from "./types";

const DIR = dirname(fileURLToPath(import.meta.url));
const MECHANISM_BASELINE = join(DIR, "goldenReplay.baseline.json");
const PRESENT_BASELINE = join(DIR, "goldenReplay.present.json");

type Frame = {
  tag: string;
  youHp: number;
  foeHp: number;
  youPos: number;
  foePos: number;
  youBlock: number;
  foeBlock: number;
  energy: number;
  foeEnergy: number;
  youBleed: number;
  foeStun: number;
  youStun: number;
  wageDebt: number;
  phase: string;
  hand: string;
  drawN: number;
  discardN: number;
  /** 这一拍新出现的播报，渲染层要按这个顺序改画面。 */
  present: string;
};

type Corpus = {
  random: Record<string, Frame[]>;
  directed: Record<string, unknown>;
};

function splitCorpus(corpus: Corpus): { mechanism: Corpus; present: Record<string, string[]> } {
  const present: Record<string, string[]> = {};
  const random: Record<string, Frame[]> = {};
  for (const [key, frames] of Object.entries(corpus.random)) {
    present[key] = frames.map((f) => f.present);
    random[key] = frames.map(({ present: _present, ...rest }) => ({ ...rest, present: "" }));
  }
  const directed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(corpus.directed)) {
    if (Array.isArray(value) && value.every((row) => row && typeof row === "object" && "present" in row)) {
      const frames = value as Frame[];
      present[key] = frames.map((f) => f.present);
      directed[key] = frames.map(({ present: _present, ...rest }) => ({ ...rest, present: "" }));
    } else {
      directed[key] = value;
    }
  }
  return { mechanism: { random, directed }, present };
}

const SCHOOLS: Array<[string, string]> = [
  ["palm", "t1-four-palm"],
  ["staff", "t2-four-staff"],
  ["saber", "t7-four-saber"],
  ["sword", "t4-two-sword-spear"],
  ["spear", "t8-three-spear-palm"],
  ["hook", "t5-hook-saber-spear"],
];

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function battleOver(b: Battle): boolean {
  if (b.phase === "won" || b.phase === "lost") return true;
  if (b.player.hp <= 0) return true;
  return livingFoes(b).every((f) => f.hp <= 0);
}

function frameOf(b: Battle, tag: string, present: string): Frame {
  return {
    tag,
    youHp: b.player.hp,
    foeHp: b.enemy.hp,
    youPos: b.player.pos,
    foePos: b.enemy.pos,
    youBlock: b.playerBlock,
    foeBlock: b.enemyBlock,
    energy: b.energy,
    foeEnergy: b.enemyEnergy,
    youBleed: b.youBleed ?? 0,
    foeStun: b.foeStun ?? 0,
    youStun: b.youStun ?? 0,
    wageDebt: b.climbWageDebt ?? 0,
    phase: b.phase,
    hand: b.hand.map((c) => c.defId).join(","),
    drawN: b.drawPile.length,
    discardN: b.discardPile.length,
    present,
  };
}

function withProbe(run: (take: (b: Battle, tag: string, beforeLen: number) => void) => void): Frame[] {
  const frames: Frame[] = [];
  let cursor = 0;
  const push = (b: Battle, tag: string) => {
    const present = b.log.slice(cursor).join(" | ");
    cursor = b.log.length;
    frames.push(frameOf(b, tag, present));
  };
  setSegmentProbe((b, tag) => push(b, tag));
  try {
    run((b, tag, beforeLen) => {
      cursor = beforeLen;
      push(b, tag);
    });
  } finally {
    setSegmentProbe(null);
    setBattleRng(null);
    setLabMode(false);
    setLabRuleset("climb");
  }
  return frames;
}

function mash(seed: number, loadout: string, ruleset: "climb" | "break"): Frame[] {
  return withProbe((take) => {
    setLabRuleset(ruleset);
    setLabMode(true);
    const rng = mulberry32(seed);
    setBattleRng(rng);
    const preset = applyAutoLoadout(loadout, 1, 1);
    let b = startLabBattle(preset, false, 1);
    const rc = makeTestContext({ mode: ruleset, lab: true });
    take(b, "open", 0);
    let guard = 0;
    while (!battleOver(b) && guard < 36) {
      guard += 1;
      if (b.phase !== "player") break;
      const legal = b.hand.filter((c) => canPlay(b, c.uid, rc).ok);
      if (legal.length > 0 && b.energy > 0) {
        const card = legal[Math.floor(rng() * legal.length)]!;
        const before = b.log.length;
        b = playCard(b, card.uid, rc);
        take(b, `play:${card.defId}`, before);
      } else {
        const before = b.log.length;
        b = endTurn(b, rc);
        take(b, "end", before);
      }
    }
  });
}

function buildCorpus(): Corpus {
  const random: Record<string, Frame[]> = {};
  for (const [school, loadout] of SCHOOLS) {
    random[`climb-${school}-1`] = mash(41000 + school.length * 17, loadout, "climb");
    random[`climb-${school}-2`] = mash(82000 + school.length * 29, loadout, "climb");
  }
  for (const [school, loadout] of SCHOOLS.slice(0, 4)) {
    random[`break-${school}-1`] = mash(12000 + school.length * 13, loadout, "break");
    random[`break-${school}-2`] = mash(24000 + school.length * 19, loadout, "break");
  }

  const spearDebt = withProbe((take) => {
    setLabRuleset("climb");
    setLabMode(true);
    const preset = applyAutoLoadout("t8-three-spear-palm", 1, 1);
    let b = startLabBattle(preset, true, 1);
    b.energy = 20;
    b.player.pos = 0;
    b.enemy.pos = 3;
    b.enemyEnergy = 0;
    b.hand = [
      { uid: "spk1", defId: "thrust" as CardId },
      { uid: "spk2", defId: "thrust" as CardId },
      ...b.hand,
    ];
    const a = b.log.length;
    b = playCard(b, "spk1", climbTestContext());
    take(b, "spear-1", a);
    b.energy = 20;
    b.player.pos = 0;
    b.enemy.pos = 4;
    const c = b.log.length;
    b = playCard(b, "spk2", climbTestContext());
    take(b, "spear-debt", c);
  });

  const stakeBlast = withProbe((take) => {
    setLabRuleset("climb");
    setLabMode(true);
    const preset = applyAutoLoadout("t2-four-staff", 1, 1);
    let b = startLabBattle(preset, true, 1);
    b.energy = 20;
    b.player.pos = 2;
    b.enemy.pos = 5;
    addStake(b, 3, 1, climbTestContext());
    b.hand = [{ uid: "spl", defId: "split" as CardId }, ...b.hand];
    const before = b.log.length;
    b = playCard(b, "spl", climbTestContext());
    take(b, "split", before);
  });

  const stunLock = withProbe((take) => {
    setLabRuleset("climb");
    setLabMode(true);
    const preset = applyAutoLoadout("t1-four-palm", 1, 1);
    let b = startLabBattle(preset, true, 1);
    b.youStun = b.hand.length;
    b.energy = 0;
    const before = b.log.length;
    b = endTurn(b, climbTestContext());
    take(b, "stun-end", before);
  });

  const run = createGauntletRun("bandit", "palm", "usurper", { rng: mulberry32(7) });
  const wager = resolveWager(
    {
      ...run,
      wager: { kind: "guard", stake: 10, target: 10, odds: 1.5 },
    },
    {
      breaks: 0,
      turns: 4,
      hpEndRatio: 0.8,
      won: true,
      eyes: 0,
      itemsUsed: false,
      endBlock: 12,
    },
  );
  const finale = (["mob", "seat", "private"] as const).map((kind) => {
    const next = applyFinale(run, kind);
    return {
      kind,
      waves: next.pendingExtraWaves ?? 0,
      dmg: next.pendingDmgMul ?? 1,
      law: next.pendingHallLaw ?? "",
      potMul: next.pendingBasePotMul ?? 1,
    };
  });
  const revived = reviveGauntletRun({ ...run, pot: 99, bankruptUsed: false });
  const qiCommit = scriptQiCommit();

  return {
    random,
    directed: {
      spearDebt,
      stakeBlast,
      stunLock,
      guardWager: { won: wager.won, payout: wager.payout, text: wager.text },
      finale,
      revive: revived
        ? { pot: revived.pot, hp: revived.hp, bankruptUsed: revived.bankruptUsed }
        : null,
      qiCommit,
    },
  };
}

function qiHand(f: QiFight, defId: string): string {
  const card = f.hand.find((x) => x.defId === defId);
  if (!card) throw new Error(`qi hand missing ${defId}`);
  return card.uid;
}

function qiPlay(f: QiFight, defId: string, seg: number): QiFight {
  return assignToSegment(selectCard(f, qiHand(f, defId)), seg);
}

/** 登门承诺核逐拍。放生 = 站在红格上闪开该段（播报「闪」），不算拆。 */
function qiBeat(f: QiFight, tag: string) {
  return {
    tag,
    playerStance: f.playerStance,
    enemyStance: f.enemyStance,
    qi: f.qi,
    momentum: f.momentum,
    ink: [...f.inkCells],
    recap: f.lastRecap.map((r) => `${r.name}${r.outcome}`).join(","),
    phase: f.phase,
  };
}

function scriptQiCommit() {
  let broken = createQiFight({
    playerHp: 12,
    enemyHp: 18,
    playerPos: 3,
    hand: ["break_point", "dodge", "step_back", "atk1"],
    queue: [{ move: "pierce", damage: 6, cell: 3 }],
    nextQueue: [{ move: "pierce", damage: 6, cell: 3 }],
  });
  broken = resolveTurn(qiPlay(broken, "break_point", 0));
  const hard = qiBeat(broken, "拆中");
  const inked = qiBeat(resolveTurn(broken), "墨痕");

  let released = createQiFight({
    playerHp: 12,
    enemyHp: 18,
    playerPos: 3,
    hand: ["dodge", "break_point", "step_back", "atk1"],
    queue: [{ move: "pierce", damage: 6, cell: 3 }],
  });
  released = resolveTurn(qiPlay(released, "dodge", 0));

  let ult = createQiFight({
    playerHp: 12,
    enemyHp: 14,
    playerPos: 3,
    momentum: 8,
    hand: ["atk1", "dodge", "break_point", "step_back"],
    queue: [{ move: "crash", damage: 5, cell: 3 }],
  });
  ult = resolveTurn(playUlt(ult, 0));

  return [hard, qiBeat(released, "放生"), inked, qiBeat(ult, "绝式")];
}

describe("黄金对局", () => {
  it("同一注入种子跑两次，逐拍相同", () => {
    const a = buildCorpus();
    const b = buildCorpus();
    expect(a).toEqual(b);
  }, 60_000);

  it("对照已录基线，逐拍 diff 为空", () => {
    const next = splitCorpus(buildCorpus());
    if (process.env.UPDATE_GOLDEN === "1") {
      writeFileSync(MECHANISM_BASELINE, `${JSON.stringify(next.mechanism, null, 2)}\n`);
      writeFileSync(PRESENT_BASELINE, `${JSON.stringify(next.present, null, 2)}\n`);
    }
    const saved = JSON.parse(readFileSync(MECHANISM_BASELINE, "utf8")) as Corpus;
    const savedPresent = JSON.parse(readFileSync(PRESENT_BASELINE, "utf8")) as Record<string, string[]>;
    expect(next.mechanism).toEqual(saved);
    expect(next.present).toEqual(savedPresent);
    const keys = Object.keys(next.mechanism.random);
    expect(keys).toHaveLength(20);
    expect(keys.filter((k) => k.startsWith("climb-")).length).toBe(12);
    expect(keys.filter((k) => k.startsWith("break-")).length).toBe(8);
    const qi = next.mechanism.directed.qiCommit as Array<{ tag: string; recap: string }>;
    expect(qi.map((row) => row.tag)).toEqual(["拆中", "放生", "墨痕", "绝式"]);
    expect(qi.map((row) => row.recap)).toEqual(["刺破", "刺闪", "刺墨", "撞绝"]);
  }, 60_000);
});
