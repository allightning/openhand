import { labCard } from "../../src/game/labContent";
import { defaultItemCharges, useLabItem } from "../../src/game/labV21";
import { applyLabEnemyKit, applyLabFightScale, answerReaction, applyClimbOpeningPositions, advanceProfession, canEndPlayerTurn, canPlay, commitFoeKit, endTurn, labDiscardCard, livingFoes, makeBattle, markEnemyOpen, needsDiscardToHandCap, playCard, rollWager, seeThrough, setBattleRng, swapFighter, syncBattleGear, yourPace } from "../../src/game/sim";
import { buildFoeKit, foeKitSeed, kitRng } from "../../src/game/foeArchetype";
import type { Battle, Intent } from "../../src/game/types";
import type { RunContext } from "../../src/game/runContext";
import type { OpenedHall } from "./boot";
import { emitHand, emitOpen, notePlay, type FightWatch } from "./fightWatch";
import { FLAGS_OFF } from "./flags";
import { envTagForStage } from "./flags";
import { canPlayAttack, canPlayMove, handIsEmpty, isMoveCard } from "./hand";
import { injectExtraCards, injectMateExtras, injectMechKit, injectThinKit, shuffleDrawPiles } from "./kitInject";
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
  foeVariant: string | null;
  dumpN: number;
  bleedTick: number;
  poisonTick: number;
  pierceHit: number;
  autopsy?: AutopsyHand[];
};

export type AutopsyHand = {
  n: number;
  you: number;
  foe: number;
  dist: number;
  qi: number;
  block: number;
  hand: string[];
  gates: { id: string; ok: boolean; why: string }[];
  moves: { id: string; ok: boolean; why: string }[];
  played: string[];
  intents: string[];
  approach: string[];
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

type HpBook = { hp: number; taken: number; who: string };

const APPROACH = new Set(["advance", "lunge", "charge", "pull"]);

function intentText(it: Intent): string {
  if (it.kind === "advance" || it.kind === "retreat" || it.kind === "charge" || it.kind === "pull") {
    return `${it.kind}${it.steps}`;
  }
  if (it.kind === "strike" || it.kind === "lunge" || it.kind === "bleedcut" || it.kind === "pestle") {
    return `${it.kind}${it.damage}`;
  }
  if (it.kind === "guard") return `guard${it.block}`;
  return it.kind;
}

function snapHand(b: Battle, rc: RunContext, n: number): AutopsyHand {
  const intents = (b.intents?.length ? b.intents : b.intent ? [b.intent] : []).map(intentText);
  const approach = (b.intents?.length ? b.intents : b.intent ? [b.intent] : [])
    .filter((it) => APPROACH.has(it.kind))
    .map(intentText);
  const gates = b.hand.map((c) => {
    const gate = canPlay(b, c.uid, rc);
    return { id: c.defId, ok: gate.ok, why: gate.ok ? "" : gate.reason ?? "不出" };
  });
  const moves = gates.filter((g) => isMoveCard(g.id));
  return {
    n,
    you: b.player.pos,
    foe: b.enemy.pos,
    dist: Math.abs(b.enemy.pos - b.player.pos),
    qi: b.energy,
    block: b.enemyBlock,
    hand: b.hand.map((c) => c.defId),
    gates,
    moves,
    played: [],
    intents,
    approach,
  };
}

function soak(book: HpBook, hp: number): void {
  book.taken += Math.max(0, book.hp - hp);
  book.hp = hp;
}

/** 换人先对上新人的当前血，血跳不算掉血。 */
function adopt(book: HpBook, who: string, hp: number): void {
  if (book.who === who) return;
  book.who = who;
  book.hp = hp;
}

function scanPierce(lines: string[], into: { bleed: number; poison: number; pierce: number }): void {
  for (const line of lines) {
    const bleed = /^裂创 (\d+)$/.exec(line);
    if (bleed) into.bleed += Number(bleed[1]);
    const poison = /^毒 (\d+)$/.exec(line);
    if (poison) into.poison += Number(poison[1]);
    const pierce = /破绽穿挡 (\d+)/.exec(line);
    if (pierce) into.pierce += Number(pierce[1]);
    const mind = /破甲穿挡 (\d+)/.exec(line);
    if (mind) into.pierce += Number(mind[1]);
  }
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

/** 馆 ≥6 精英/座前：目录没标 elite 时，仍按机制六班抽三套。 */
function applyEliteKit(b: Battle, opened: OpenedHall, stamp: OpenedHall["stamp"]): void {
  if (stamp?.foeRound == null || opened.stage < 6) return;
  const round = stamp.foeRound;
  const salt = stamp.foeSalt ?? 0;
  const kit = buildFoeKit(
    {
      stage: opened.stage,
      enemyId: opened.enemyId,
      round,
      salt,
      elite: true,
      seat: opened.stage >= 10,
    },
    kitRng(foeKitSeed(round, opened.enemyId, salt)),
  );
  commitFoeKit(b, kit, opened.rc);
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

function dumpUnreachableAttacks(b: Battle, rc: RunContext): { b: Battle; n: number } {
  const toss = b.hand.filter((card) => {
    const def = labCard(card.defId, rc);
    return def.type === "attack" && !canPlayAttack(b, card, rc);
  });
  let n = 0;
  for (const card of toss) {
    if (!b.hand.some((c) => c.uid === card.uid)) continue;
    const before = b.hand.length;
    b = labDiscardCard(b, card.uid, rc);
    if (b.hand.length < before) n += 1;
  }
  return { b, n };
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

type SwapCool = { turn: number; n: number; lock: string | null; left: number };

function cooledSwap(
  b: Battle,
  rc: RunContext,
  policy: Policy,
  cool: SwapCool,
  swaps: { n: number },
): Battle {
  if (!policy.swap) return b;
  if (cool.turn !== b.turn) {
    cool.turn = b.turn;
    cool.n = 0;
    if (cool.left > 0) cool.left -= 1;
  }
  if (cool.n >= 1) return b;
  if (cool.left > 0 && cool.lock === b.active) return b;
  const onto = policy.swap(b, rc);
  if (!onto || onto === b.active) return b;
  const stepped = swapFighter(b, onto, rc);
  if (stepped.active !== onto) return b;
  cool.n += 1;
  cool.lock = onto;
  cool.left = 2;
  swaps.n += 1;
  return stepped;
}

function playOut(
  b: Battle,
  rc: RunContext,
  policy: Policy,
  rng: () => number,
  book: HpBook,
  hit: { hp: number; taken: number },
  tally: CardTally,
  seen: Set<string>,
  extra: Extra,
  foeWin: { dismantle: number; bind: number; read: number },
  pierce: { bleed: number; poison: number; pierce: number },
  swaps: { n: number },
  cool: SwapCool,
  watch?: FightWatch,
  played?: string[],
): Battle {
  let plays = 0;
  while (plays < PLAYS_PER_HAND && !over(b)) {
    b = cooledSwap(b, rc, policy, cool, swaps);
    adopt(book, b.active, b.player.hp);
    const uid = policy.pick(b, rc, rng);
    if (!uid) {
      if (plays === 0) played?.push("收势");
      break;
    }
    const card = b.hand.find((c) => c.uid === uid);
    const bleed0 = b.bleed;
    const expose0 = b.expose;
    const log0 = b.log.length;
    const before = { hp: b.enemy.hp, pin: b.foePin ?? 0, charge: b.chargeStacks ?? 0 };
    b = playCard(b, uid, rc);
    const slice = b.log.slice(log0);
    scanFoeWin(slice, foeWin);
    scanPierce(slice, pierce);
    if (card) {
      played?.push(card.defId);
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
  book: HpBook,
  hit: { hp: number; taken: number },
  extra: Extra,
  foeWin: { dismantle: number; bind: number; read: number },
  pierce: { bleed: number; poison: number; pierce: number },
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
  scanPierce(b.log.slice(logAt), pierce);
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
    ...(stamp?.techniques?.length
      ? { techniques: [...new Set([...(opened.run.techniques ?? []), ...stamp.techniques])] }
      : {}),
  };
  setBattleRng(mulberry32(seed));
  let b = makeBattle(opened.enemyId, opened.rc, run, false);
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
  if (stamp?.extraIds?.length) injectExtraCards(b, stamp.extraIds, seed);
  if (stamp?.extraByMate) injectMateExtras(b, stamp.extraByMate, seed);
  shuffleDrawPiles(b, mulberry32(seed ^ 0x9e3779b9));
  applyLabFightScale(opened.rc);
  applyEliteKit(b, opened, stamp);
  applyFoeWindowP(b, knobs.foeWindowP ?? 1, opened.stage, stamp?.foeRound != null);
  if (stamp?.mateWeapons) {
    b.labMateWeapons = { ...(b.labMateWeapons ?? {}), ...stamp.mateWeapons };
    syncBattleGear(b);
  }
  if (stamp?.mateMinds) {
    b.labMateMinds = { ...(b.labMateMinds ?? {}), ...stamp.mateMinds };
  }
  if (stamp?.partyHp != null) {
    const hp = stamp.partyHp;
    b.player.hp = hp;
    b.player.maxHp = hp;
    for (const mate of b.bench) {
      mate.hp = hp;
      mate.maxHp = hp;
    }
  }
  if (flags.react !== "off") b.holdReaction = true;
  if (stamp?.advance) advanceProfession(b);
  if (stamp?.mark) markEnemyOpen(b);
  if (stamp?.see) seeThrough(b);
  if (stamp?.usePoison) {
    b.labItems = [...(b.labItems ?? []), "cuandu"];
    b.labItemCharges = { ...(b.labItemCharges ?? defaultItemCharges(["cuandu"])), cuandu: Math.max(1, b.labItemCharges?.cuandu ?? 2) };
    const used = useLabItem(b, "cuandu", opened.rc);
    if (used.battle) b = used.battle;
  }
  return b;
}

/** 一局。构造只走 `makeBattle(enemyId, rc, run)`。 */
export function fightSample(
  opened: OpenedHall,
  policy: Policy,
  seed: number,
  knobs: ClimbKnobs,
  watch?: FightWatch,
  autopsy?: AutopsyHand[],
): FightResult {
  let b = arm(opened, knobs, seed, policy);
  policy.begin?.(b);
  emitOpen(watch, b, opened);
  const policyRng = mulberry32(seed + 0x9e3779b9);
  const book: HpBook = { hp: b.player.hp, taken: 0, who: b.active };
  const hit = { hp: b.enemy.hp, taken: 0 };
  const tally: CardTally = {};
  const seen = new Set<string>();
  const extra = blankExtra();
  const foeWin = { dismantle: 0, bind: 0, read: 0 };
  const pierce = { bleed: 0, poison: 0, pierce: 0 };
  const swaps = { n: 0 };
  let dumpN = 0;
  let farStreak = 0;
  const cool: SwapCool = { turn: -1, n: 0, lock: null, left: 0 };
  const foeArmed = (b.foeWindows?.length ?? 0) > 0;
  const foeVariant = b.foeVariant ?? null;
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
    const row = autopsy ? snapHand(b, opened.rc, hands) : null;
    if (row && autopsy) autopsy.push(row);
    const distNow = Math.abs(b.enemy.pos - b.player.pos);
    farStreak = distNow > 1 ? farStreak + 1 : 0;
    b = playOut(b, opened.rc, policy, policyRng, book, hit, tally, seen, extra, foeWin, pierce, swaps, cool, watch, row?.played);
    if (policy.dumpMiss && farStreak >= 3 && b.hand.length >= 6) {
      const dumped = dumpUnreachableAttacks(b, opened.rc);
      b = dumped.b;
      dumpN += dumped.n;
    }
    extra.chargePeak = Math.max(extra.chargePeak, b.chargeStacks ?? 0);
    extra.pinPeak = Math.max(extra.pinPeak, b.foePin ?? 0);
    if (over(b)) {
      emitHand(watch, opened, hands, empty, paceY, paceF, hpAt, b, logAt);
      break;
    }
    const next = finishHand(b, opened.rc, policy, book, hit, extra, foeWin, pierce);
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
    foeVariant,
    dumpN,
    bleedTick: pierce.bleed,
    poisonTick: pierce.poison,
    pierceHit: pierce.pierce,
    ...(autopsy ? { autopsy } : {}),
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
