import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { applyAutoLoadout } from "../combatLab/autoLoadouts";
import { applyFinale } from "../combatLab/encounter";
import { startLabBattle } from "../combatLab/factory";
import { createGauntletRun, resolveWager, reviveGauntletRun } from "../combatLab/gauntlet";
import { setLabMode } from "./labTuning";
import { setLabRuleset } from "./labRuleset";
import { canPlay, endTurn, livingFoes, playCard, setBattleRng, setSegmentProbe } from "./sim";
import { addStake } from "./stake";
import type { Battle, CardId } from "./types";

const BASELINE = join(dirname(fileURLToPath(import.meta.url)), "goldenReplay.baseline.json");

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
    take(b, "open", 0);
    let guard = 0;
    while (!battleOver(b) && guard < 36) {
      guard += 1;
      if (b.phase !== "player") break;
      const legal = b.hand.filter((c) => canPlay(b, c.uid).ok);
      if (legal.length > 0 && b.energy > 0) {
        const card = legal[Math.floor(rng() * legal.length)]!;
        const before = b.log.length;
        b = playCard(b, card.uid);
        take(b, `play:${card.defId}`, before);
      } else {
        const before = b.log.length;
        b = endTurn(b);
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
    b = playCard(b, "spk1");
    take(b, "spear-1", a);
    b.energy = 20;
    b.player.pos = 0;
    b.enemy.pos = 4;
    const c = b.log.length;
    b = playCard(b, "spk2");
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
    addStake(b, 3, 1);
    b.hand = [{ uid: "spl", defId: "split" as CardId }, ...b.hand];
    const before = b.log.length;
    b = playCard(b, "spl");
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
    b = endTurn(b);
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
    },
  };
}

describe("黄金对局", () => {
  it("同一注入种子跑两次，逐拍相同", () => {
    const a = buildCorpus();
    const b = buildCorpus();
    expect(a).toEqual(b);
  }, 60_000);

  it("对照已录基线，逐拍 diff 为空", () => {
    const next = buildCorpus();
    if (process.env.UPDATE_GOLDEN === "1") {
      writeFileSync(BASELINE, JSON.stringify(next));
    }
    const saved = JSON.parse(readFileSync(BASELINE, "utf8")) as Corpus;
    expect(next).toEqual(saved);
    const keys = Object.keys(next.random);
    expect(keys).toHaveLength(20);
    expect(keys.filter((k) => k.startsWith("climb-")).length).toBe(12);
    expect(keys.filter((k) => k.startsWith("break-")).length).toBe(8);
  }, 60_000);
});
