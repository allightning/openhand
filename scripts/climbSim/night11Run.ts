import { gauntletFieldMate } from "../../src/combatLab/gauntlet";
import { CHASE_CARD_IDS } from "../../src/game/intentWeakness";
import { canPlay } from "../../src/game/sim";
import type { CompanionId } from "../../src/game/types";
import type { FightStamp } from "./boot";
import { freshRun, openHall } from "./boot";
import { fightSample, type AutopsyHand, type FightResult } from "./fight";
import { foeDist } from "./hand";
import { DEFAULT_KNOBS } from "./knobs";
import { extras, stampFor, trioPolicy } from "./night10Run";
import { hpOf } from "./night7Run";
import type { Policy } from "./policy";
import { SIM_SEED, fightSeed } from "./tiers";

const SCHOOL = "saber" as const;
const GAMES = 3;

export type Night11Cause = "mechanism" | "sim" | "design" | "mixed";

export type Night11Game = {
  i: number;
  win: boolean;
  hands: number;
  capped: boolean;
  dmgDealt: number;
  dmgTaken: number;
  variant: string;
  minDist: number;
  approachHands: number;
  approachKinds: string[];
  moveInHandHands: number;
  moveOkHands: number;
  unusedMoveHands: number;
  playedMoveHands: number;
  playableHands: number;
  qiZeroHands: number;
  uniqueHand: string[];
  gateWhy: Record<string, number>;
  endDist: number;
  samples: AutopsyHand[];
  evidence: AutopsyHand[];
};

export type Night11Cell = {
  id: string;
  stage: number;
  enemy: string;
  want: string;
  salt: number;
  fightSalt: number;
  variant: string;
  games: Night11Game[];
  cause: Night11Cause;
  note: string;
};

export type Night11Verify = {
  id: string;
  chased: boolean;
  wins: number;
  games: number;
  handMean: number;
  dmgDealtMean: number;
  minDistMean: number;
};

export type Night11Data = {
  cells: Night11Cell[];
  verify: Night11Verify[];
  chased: boolean;
};

export function withChase(inner: Policy): Policy {
  let far = 0;
  let turn = -1;
  return {
    ...inner,
    id: `${inner.id}-chase`,
    label: `${inner.label} · 追贴`,
    begin(b) {
      far = 0;
      turn = -1;
      inner.begin?.(b);
    },
    pick(b, rc, rng) {
      if (turn !== b.turn) {
        turn = b.turn;
        const d = foeDist(b) ?? 0;
        far = d > 1 ? far + 1 : 0;
      }
      if (far >= 3) {
        const uid = chaseUid(b, rc);
        if (uid) return uid;
      }
      return inner.pick(b, rc, rng);
    },
  };
}

function chaseUid(b: Parameters<Policy["pick"]>[0], rc: Parameters<Policy["pick"]>[1]): string | null {
  const want = new Set<string>(CHASE_CARD_IDS);
  for (const card of b.hand) {
    if (!want.has(card.defId)) continue;
    if (!canPlay(b, card.uid, rc).ok) continue;
    return card.uid;
  }
  return null;
}

function policyOf(lead: CompanionId, chase: boolean): Policy {
  const trio = trioPolicy(lead);
  return chase ? withChase(trio) : trio;
}

function unique(xs: string[]): string[] {
  return [...new Set(xs)];
}

function summarize(fight: FightResult, i: number): Night11Game {
  const rows = fight.autopsy ?? [];
  const minDist = rows.reduce((m, r) => Math.min(m, r.dist), 99);
  const approachKinds = unique(rows.flatMap((r) => r.approach));
  const approachHands = rows.filter((r) => r.approach.length).length;
  let moveInHandHands = 0;
  let moveOkHands = 0;
  let unusedMoveHands = 0;
  let playedMoveHands = 0;
  let playableHands = 0;
  let qiZeroHands = 0;
  const uniqueHand: string[] = [];
  const seenCard = new Set<string>();
  const gateWhy: Record<string, number> = {};
  const evidence: AutopsyHand[] = [];
  for (const r of rows) {
    const hasMove = r.moves.length > 0;
    const okMove = r.moves.some((m) => m.ok);
    const playedMove = r.played.some((id) => r.moves.some((m) => m.id === id));
    const playable = r.gates.some((g) => g.ok);
    if (hasMove) moveInHandHands += 1;
    if (okMove) moveOkHands += 1;
    if (playedMove) playedMoveHands += 1;
    if (playable) playableHands += 1;
    if (r.qi <= 0) qiZeroHands += 1;
    for (const id of r.hand) {
      if (!seenCard.has(id)) {
        seenCard.add(id);
        uniqueHand.push(id);
      }
    }
    for (const g of r.gates) {
      if (g.ok) continue;
      const key = g.why || "不出";
      gateWhy[key] = (gateWhy[key] ?? 0) + 1;
    }
    if (okMove && !playedMove && r.dist > 1) {
      unusedMoveHands += 1;
      if (evidence.length < 6) evidence.push(r);
    } else if (!playable && evidence.length < 3) {
      evidence.push(r);
    }
  }
  const samples = [1, 3, 8, 20, 40]
    .map((n) => rows.find((r) => r.n === n))
    .filter((r): r is AutopsyHand => !!r);
  if (!samples.length && rows[0]) samples.push(rows[0], rows[rows.length - 1]!);
  return {
    i,
    win: fight.win,
    hands: fight.hands,
    capped: fight.capped,
    dmgDealt: fight.dmgDealt,
    dmgTaken: fight.damageTaken,
    variant: fight.foeVariant ?? "无",
    minDist,
    approachHands,
    approachKinds,
    moveInHandHands,
    moveOkHands,
    unusedMoveHands,
    playedMoveHands,
    playableHands,
    qiZeroHands,
    uniqueHand,
    gateWhy,
    endDist: rows[rows.length - 1]?.dist ?? -1,
    samples,
    evidence,
  };
}

function classify(cell: Night11Cell): void {
  const games = cell.games;
  const anyApproach = games.some((g) => g.approachHands > 0);
  const unused = games.reduce((n, g) => n + g.unusedMoveHands, 0);
  const minDist = Math.min(...games.map((g) => g.minDist));
  const okMoves = games.reduce((n, g) => n + g.moveOkHands, 0);
  const moveHands = games.reduce((n, g) => n + g.moveInHandHands, 0);
  const playable = games.reduce((n, g) => n + g.playableHands, 0);
  if (!anyApproach && minDist > 1) {
    cell.cause = "mechanism";
    cell.note = `敌队列全程无进势。最近 ${minDist} 格。变体 ${cell.variant}。`;
    return;
  }
  if (unused > 0 && minDist > 1) {
    cell.cause = "sim";
    cell.note = `手里位移可出却没贴，共 ${unused} 手。最近 ${minDist} 格。`;
    return;
  }
  if (moveHands === 0 && playable === 0 && minDist > 1) {
    cell.cause = "sim";
    cell.note = `40 手没摸到位移，能出的牌也是 0（攻击够不着）。策略只能收势。最近 ${minDist} 格。敌进势 ${anyApproach ? unique(games.flatMap((g) => g.approachKinds)).join(" ") : "无"}。`;
    return;
  }
  if (okMoves > 0 && anyApproach && minDist > 1) {
    cell.cause = "design";
    cell.note = `双方都有逼近手段，40 手最近仍 ${minDist} 格。`;
    return;
  }
  cell.cause = "design";
  cell.note = `进势有、位移摸不到或打不出。最近 ${minDist} 格。可出牌手 ${playable}，位移在手 ${moveHands}。`;
}

function playCell(
  id: string,
  stage: number,
  want: string,
  foeSalt: number,
  fightSalt: number,
  chase: boolean,
): Night11Cell {
  const lead = gauntletFieldMate(SCHOOL);
  const probe = freshRun(SCHOOL, SIM_SEED);
  const { extra, mates } = extras(probe, stage);
  const stamp: FightStamp = stampFor(lead, stage, extra, mates, true, foeSalt);
  const policy = policyOf(lead, chase);
  const run = freshRun(SCHOOL, SIM_SEED + stage * 19 + 3);
  const specGrade = stage <= 2 ? 1 : stage <= 6 ? 2 : 3;
  run.weaponId = `${SCHOOL}-a-${specGrade}`;
  const cell: Night11Cell = {
    id,
    stage,
    enemy: "",
    want,
    salt: foeSalt,
    fightSalt,
    variant: "",
    games: [],
    cause: "mixed",
    note: "",
  };
  for (let i = 0; i < GAMES; i++) {
    const opened = openHall(run, stage, DEFAULT_KNOBS, hpOf(stage));
    opened.stamp = stamp;
    if (!cell.enemy) cell.enemy = opened.enemyName;
    const autopsy: AutopsyHand[] = [];
    const fight = fightSample(opened, policy, fightSeed(stage, i, fightSalt), DEFAULT_KNOBS, undefined, autopsy);
    cell.games.push(summarize(fight, i));
  }
  cell.variant = unique(cell.games.map((g) => g.variant)).join(" / ");
  classify(cell);
  return cell;
}

function verifyOf(cell: Night11Cell, chased: boolean): Night11Verify {
  const n = cell.games.length;
  return {
    id: cell.id,
    chased,
    wins: cell.games.filter((g) => g.win).length,
    games: n,
    handMean: n ? cell.games.reduce((s, g) => s + g.hands, 0) / n : 0,
    dmgDealtMean: n ? cell.games.reduce((s, g) => s + g.dmgDealt, 0) / n : 0,
    minDistMean: n ? cell.games.reduce((s, g) => s + g.minDist, 0) / n : 0,
  };
}

export function runNight11(): Night11Data {
  const hall8 = playCell("馆8岸匪龟谱", 8, "龟谱", 0, 6, false);
  const hall6 = playCell("馆6裂旗游走", 6, "游走谱", 4, 114, false);
  const hall9 = playCell("馆9水匪哨", 9, "散点同盐", 0, 6, false);
  const cells = [hall8, hall6, hall9];
  const needChase = cells.some((c) => c.cause === "sim" && c.games.some((g) => g.moveOkHands > 0));
  const verify: Night11Verify[] = cells.map((c) => verifyOf(c, false));
  if (needChase) {
    const chased = [
      playCell("馆8岸匪龟谱", 8, "龟谱", 0, 6, true),
      playCell("馆6裂旗游走", 6, "游走谱", 4, 114, true),
      playCell("馆9水匪哨", 9, "散点同盐", 0, 6, true),
    ];
    for (const c of chased) verify.push(verifyOf(c, true));
  }
  return { cells, verify, chased: needChase };
}
