import { applyLabEnemyKit, answerReaction, applyClimbOpeningPositions, advanceProfession, canEndPlayerTurn, endTurn, labDiscardCard, livingFoes, makeBattle, markEnemyOpen, needsDiscardToHandCap, playCard, rollWager, seeThrough, setBattleRng, swapFighter, yourPace } from "../../src/game/sim";
import type { Battle } from "../../src/game/types";
import type { RunContext } from "../../src/game/runContext";
import type { OpenedHall } from "./boot";
import { emitHand, emitOpen, notePlay, type FightWatch } from "./fightWatch";
import { FLAGS_OFF } from "./flags";
import { envTagForStage } from "./flags";
import { canPlayAttack, canPlayMove, handIsEmpty } from "./hand";
import { injectMechKit, injectThinKit } from "./kitInject";
import { noteBoard } from "./pool";
import type { ClimbKnobs } from "./knobs";
import { mulberry32 } from "./rng";
import type { Policy } from "./policy";
import { HANDS_CAP } from "./tiers";

const PLAYS_PER_HAND = 12;

export type CardTally = Record<string, { plays: number; draws: number }>;

export type FightResult = {
  win: boolean;
  hands: number;
  emptyHands: number;
  damageTaken: number;
  hpLeft: number;
  capped: boolean;
  tally: CardTally;
  chargePeak: number;
  burstDmg: number;
  pinPeak: number;
  pinPlays: number;
  burnDmg: number;
  reactOffer: number;
  reactTake: number;
  reactQi: number;
  dmgDealt: number;
  foeArmed: boolean;
  foeDismantle: number;
  foeBind: number;
  foeRead: number;
  swaps: number;
};

function blankExtra() {
  return { chargePeak: 0, burstDmg: 0, pinPeak: 0, pinPlays: 0, burnDmg: 0, reactOffer: 0, reactTake: 0, reactQi: 0 };
}

function over(b: Battle): boolean {
  return b.phase === "won" || b.phase === "lost" || b.player.hp <= 0 || livingFoes(b).every((f) => f.hp <= 0);
}

function won(b: Battle): boolean {
  return b.player.hp > 0 && (b.phase === "won" || livingFoes(b).every((f) => f.hp <= 0));
}

function soak(book: { hp: number; taken: number }, hp: number): void {
  book.taken += Math.max(0, book.hp - hp);
  book.hp = hp;
}

function scanFoeWin(lines: string[], into: { dismantle: number; bind: number; read: number }): void {
  for (const line of lines) {
    if (line.includes("敌拆招")) into.dismantle += 1;
    if (line.includes("敌缠手")) into.bind += 1;
    if (line.includes("敌读破")) into.read += 1;
  }
}

function applyFoeWindowP(b: Battle, p: number, stage: number, want: boolean): void {
  if (!want) return;
  if (p <= 0) {
    b.foeWindows = [];
    return;
  }
  if (stage < 6) return;
  if ((b.foeWindows?.length ?? 0) === 0) {
    b.foeWindows = ["dismantle", "bind", "read"];
    b.foeWindowCap = stage >= 10 ? 2 : 1;
  }
}

function bump(tally: CardTally, id: string, key: "plays" | "draws"): void {
  const row = tally[id] ?? { plays: 0, draws: 0 };
  row[key] += 1;
  tally[id] = row;
}

function noteDraws(b: Battle, seen: Set<string>, tally: CardTally): void {
  for (const card of b.hand) {
    if (seen.has(card.uid)) continue;
    seen.add(card.uid);
    bump(tally, card.defId, "draws");
  }
}

function junkUid(b: Battle, rc: RunContext): string | null {
  const junk = b.hand.filter((card) => !canPlayAttack(b, card, rc) && !canPlayMove(b, card, rc));
  const pick = junk[junk.length - 1] ?? b.hand[b.hand.length - 1];
  return pick?.uid ?? null;
}

function shedToCap(b: Battle, rc: RunContext): Battle {
  let guard = 0;
  while (needsDiscardToHandCap(b, rc) && guard < 12) {
    const uid = junkUid(b, rc);
    if (!uid) break;
    const before = b.hand.length;
    b = labDiscardCard(b, uid, rc);
    if (b.hand.length >= before) break;
    guard += 1;
  }
  return b;
}

type Extra = ReturnType<typeof blankExtra>;

function playOut(
  b: Battle,
  rc: RunContext,
  policy: Policy,
  rng: () => number,
  book: { hp: number; taken: number },
  hit: { hp: number; taken: number },
  tally: CardTally,
  seen: Set<string>,
  extra: Extra,
  foeWin: { dismantle: number; bind: number; read: number },
  swaps: { n: number },
  watch?: FightWatch,
): Battle {
  let plays = 0;
  while (plays < PLAYS_PER_HAND && !over(b)) {
    const onto = policy.swap?.(b, rc);
    if (onto && onto !== b.active) {
      const stepped = swapFighter(b, onto, rc);
      if (stepped.active === onto) {
        b = stepped;
        swaps.n += 1;
      }
    }
    const uid = policy.pick(b, rc, rng);
    if (!uid) break;
    const card = b.hand.find((c) => c.uid === uid);
    const bleed0 = b.bleed;
    const expose0 = b.expose;
    const log0 = b.log.length;
    const before = { hp: b.enemy.hp, pin: b.foePin ?? 0, charge: b.chargeStacks ?? 0 };
    b = playCard(b, uid, rc);
    scanFoeWin(b.log.slice(log0), foeWin);
    if (card) {
      bump(tally, card.defId, "plays");
      notePlay(watch, bleed0, expose0, log0, b, card.defId);
      extra.chargePeak = Math.max(extra.chargePeak, b.chargeStacks ?? 0, before.charge);
      extra.pinPeak = Math.max(extra.pinPeak, b.foePin ?? 0);
      if (card.defId === "staffBurst") extra.burstDmg += Math.max(0, before.hp - b.enemy.hp);
      if ((b.foePin ?? 0) > before.pin) extra.pinPlays += 1;
    }
    noteDraws(b, seen, tally);
    soak(book, b.player.hp);
    soak(hit, b.enemy.hp);
    plays += 1;
  }
  return b;
}

function scanBurn(lines: string[]): number {
  let n = 0;
  for (const line of lines) {
    const m = /灼烧 你 (\d+)/.exec(line);
    if (m) n += Number(m[1]);
  }
  return n;
}

function finishHand(
  b: Battle,
  rc: RunContext,
  policy: Policy,
  book: { hp: number; taken: number },
  hit: { hp: number; taken: number },
  extra: Extra,
  foeWin: { dismantle: number; bind: number; read: number },
): Battle | null {
  b = shedToCap(b, rc);
  soak(book, b.player.hp);
  soak(hit, b.enemy.hp);
  if (over(b)) return b;
  if (!canEndPlayerTurn(b, rc).ok) return null;
  const stamp = `${b.turn}:${b.phase}:${b.player.hp}:${b.enemy.hp}:${b.hand.length}`;
  const logAt = b.log.length;
  b = endTurn(b, rc);
  extra.burnDmg += scanBurn(b.log.slice(logAt));
  scanFoeWin(b.log.slice(logAt), foeWin);
  let guard = 0;
  while (b.reactionWindow && guard < 6) {
    extra.reactOffer += 1;
    const qi = b.energy;
    const take = policy.react(b, rc);
    b = answerReaction(b, take, rc);
    if (take) {
      extra.reactTake += 1;
      extra.reactQi += Math.max(0, qi - b.energy);
    }
    soak(book, b.player.hp);
    soak(hit, b.enemy.hp);
    guard += 1;
  }
  soak(book, b.player.hp);
  soak(hit, b.enemy.hp);
  const next = `${b.turn}:${b.phase}:${b.player.hp}:${b.enemy.hp}:${b.hand.length}`;
  if (!over(b) && next === stamp) return null;
  return b;
}

function arm(opened: OpenedHall, knobs: ClimbKnobs, seed: number, policy: Policy): Battle {
  const flags = policy.flags ?? FLAGS_OFF;
  const tag = envTagForStage(opened.stage, flags.env);
  const stamp = opened.stamp;
  const run = {
    ...opened.run,
    ...(tag ? { envTag: tag } : {}),
    ...(stamp?.professions ? { professions: stamp.professions } : {}),
    ...(stamp?.party ? { party: stamp.party } : {}),
    ...(stamp?.bag ? { bag: stamp.bag } : {}),
    ...(stamp?.mateDecks ? { mateDecks: { ...opened.run.mateDecks, ...stamp.mateDecks } } : {}),
    ...(stamp?.foeRound != null ? { foeRound: stamp.foeRound, foeStage: stamp.foeStage ?? opened.stage, foeSalt: stamp.foeSalt ?? 0 } : {}),
  };
  setBattleRng(mulberry32(seed));
  let b = makeBattle(opened.enemyId, opened.rc, run);
  noteBoard(b);
  b.labGauntletStage = opened.stage;
  applyLabEnemyKit(b, opened.rc);
  if (knobs.energyRegen !== 1) b.energyRegen = Math.round(b.energyRegen * knobs.energyRegen);
  applyClimbOpeningPositions(b, opened.rc);
  if (opened.waveEnemyId) {
    b.gauntletWaveEnemy = opened.waveEnemyId;
    b.gauntletWaveQueue = opened.waveQueue ? [...opened.waveQueue] : undefined;
  }
  const school = policy.school === "mix" ? "palm" : policy.school;
  injectMechKit(b, school, flags, seed);
  if (stamp?.thinIds?.length) injectThinKit(b, stamp.thinIds, seed);
  applyFoeWindowP(b, knobs.foeWindowP ?? 1, opened.stage, stamp?.foeRound != null);
  if (flags.react !== "off") b.holdReaction = true;
  if (stamp?.advance) advanceProfession(b);
  if (stamp?.mark) markEnemyOpen(b);
  if (stamp?.see) seeThrough(b);
  return b;
}

/** 一局。构造只走 `makeBattle(enemyId, rc, run)`。 */
export function fightSample(
  opened: OpenedHall,
  policy: Policy,
  seed: number,
  knobs: ClimbKnobs,
  watch?: FightWatch,
): FightResult {
  let b = arm(opened, knobs, seed, policy);
  emitOpen(watch, b, opened);
  const policyRng = mulberry32(seed + 0x9e3779b9);
  const book = { hp: b.player.hp, taken: 0 };
  const hit = { hp: b.enemy.hp, taken: 0 };
  const tally: CardTally = {};
  const seen = new Set<string>();
  const extra = blankExtra();
  const foeWin = { dismantle: 0, bind: 0, read: 0 };
  const swaps = { n: 0 };
  const foeArmed = (b.foeWindows?.length ?? 0) > 0;
  let hands = 0;
  let emptyHands = 0;
  let capped = false;
  while (!over(b) && hands < HANDS_CAP) {
    if (b.phase !== "player") break;
    hands += 1;
    noteDraws(b, seen, tally);
    if (opened.stamp?.wager) rollWager(b, policyRng);
    const empty = handIsEmpty(b, opened.rc);
    if (empty) emptyHands += 1;
    const logAt = b.log.length;
    const hpAt = b.player.hp;
    const paceY = yourPace(b, opened.rc);
    const paceF = b.foePace;
    b = playOut(b, opened.rc, policy, policyRng, book, hit, tally, seen, extra, foeWin, swaps, watch);
    extra.chargePeak = Math.max(extra.chargePeak, b.chargeStacks ?? 0);
    extra.pinPeak = Math.max(extra.pinPeak, b.foePin ?? 0);
    if (over(b)) {
      emitHand(watch, opened, hands, empty, paceY, paceF, hpAt, b, logAt);
      break;
    }
    const next = finishHand(b, opened.rc, policy, book, hit, extra, foeWin);
    if (!next) {
      capped = true;
      emitHand(watch, opened, hands, empty, paceY, paceF, hpAt, b, logAt);
      break;
    }
    b = next;
    emitHand(watch, opened, hands, empty, paceY, paceF, hpAt, b, logAt);
  }
  if (hands >= HANDS_CAP && !over(b)) capped = true;
  soak(book, b.player.hp);
  soak(hit, b.enemy.hp);
  return {
    win: won(b),
    hands,
    emptyHands,
    damageTaken: book.taken,
    hpLeft: Math.max(0, b.player.hp),
    capped,
    tally,
    ...extra,
    dmgDealt: hit.taken,
    foeArmed,
    foeDismantle: foeWin.dismantle,
    foeBind: foeWin.bind,
    foeRead: foeWin.read,
    swaps: swaps.n,
  };
}

export function mergeTally(into: CardTally, row: CardTally): void {
  for (const [id, n] of Object.entries(row)) {
    const cur = into[id] ?? { plays: 0, draws: 0 };
    cur.plays += n.plays;
    cur.draws += n.draws;
    into[id] = cur;
  }
}
