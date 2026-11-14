import { gauntletFieldMate } from "../../src/combatLab/gauntlet";
import { CARD_REGISTRY } from "../../src/game/content/cards";
import { breakStarterDeck } from "../../src/game/rogueCards";
import { breakRewardCardPool } from "../../src/game/rules/rewardRules";
import { canSwap } from "../../src/game/sim";
import type { CardId, CompanionId, WeaponId } from "../../src/game/types";
import type { FightStamp } from "./boot";
import { freshRun, openHall } from "./boot";
import { fightSample, type FightResult } from "./fight";
import { FLAGS_ON } from "./flags";
import { DEFAULT_KNOBS } from "./knobs";
import type { Policy } from "./policy";
import { mulberry32 } from "./rng";
import { schoolPolicy } from "./schools";
import { SIM_SEED, fightSeed } from "./tiers";

const SCHOOL: WeaponId = "saber";
const MATE: CompanionId = "baimenghe";
const HALLS = 10;

export type Night6Cell = {
  stage: number;
  games: number;
  wins: number;
  handSum: number;
  dmgTaken: number;
  dmgDealt: number;
  swaps: number;
  grade: number;
  adept: number;
  supreme: number;
  injected: string[];
};

export type Night6Data = {
  games: number;
  hall4Swaps: number;
  hall4Games: number;
  scatter: Night6Cell[];
};

function blank(stage: number, grade: number, adept: number, supreme: number, injected: string[]): Night6Cell {
  return { stage, games: 0, wins: 0, handSum: 0, dmgTaken: 0, dmgDealt: 0, swaps: 0, grade, adept, supreme, injected };
}

function add(cell: Night6Cell, fight: FightResult): void {
  cell.games += 1;
  if (fight.win) cell.wins += 1;
  cell.handSum += fight.hands;
  cell.dmgTaken += fight.damageTaken;
  cell.dmgDealt += fight.dmgDealt;
  cell.swaps += fight.swaps;
}

export function growthOf(stage: number): { grade: number; adept: number; supreme: number } {
  if (stage <= 1) return { grade: 1, adept: 0, supreme: 0 };
  if (stage === 2) return { grade: 1, adept: 1, supreme: 0 };
  if (stage <= 4) return { grade: 2, adept: 2, supreme: 0 };
  if (stage <= 6) return { grade: 2, adept: 4, supreme: 0 };
  if (stage <= 9) return { grade: 3, adept: 4, supreme: 2 };
  return { grade: 3, adept: 4, supreme: 3 };
}

function pawnIds(run: ReturnType<typeof freshRun>, stage: number): CardId[] {
  return breakRewardCardPool({ ...run, stage, school: SCHOOL });
}

function ofRarity(ids: CardId[], rarity: "adept" | "supreme"): CardId[] {
  return ids.filter((id) => CARD_REGISTRY[id]?.rarity === rarity);
}

function pickCopies(pool: CardId[], n: number, rng: () => number): CardId[] {
  if (!pool.length || n <= 0) return [];
  const out: CardId[] = [];
  for (let i = 0; i < n; i++) out.push(pool[Math.floor(rng() * pool.length)]!);
  return out;
}

export function injectFor(run: ReturnType<typeof freshRun>, stage: number): CardId[] {
  const spec = growthOf(stage);
  const rng = mulberry32(SIM_SEED + stage * 97);
  const here = pawnIds(run, stage);
  const opened = spec.supreme > 0 ? pawnIds(run, Math.max(stage, 8)) : here;
  return [...pickCopies(ofRarity(here, "adept"), spec.adept, rng), ...pickCopies(ofRarity(opened, "supreme"), spec.supreme, rng)];
}

function duoPolicy(lead: CompanionId): Policy {
  const saber = schoolPolicy(SCHOOL, FLAGS_ON);
  const palm = schoolPolicy("palm", FLAGS_ON);
  return {
    ...saber,
    id: "saber-baimenghe",
    label: "刀 + 白孟和",
    swap(b, rc) {
      const ratio = b.player.hp / Math.max(1, b.player.maxHp);
      if (b.active !== MATE && ratio < 0.6 && canSwap(b, MATE, rc).ok) return MATE;
      if (b.active === MATE && ratio >= 0.85 && canSwap(b, lead, rc).ok) return lead;
      return null;
    },
    pick(b, rc, rng) {
      return b.active === MATE ? palm.pick(b, rc, rng) : saber.pick(b, rc, rng);
    },
  };
}

function playStage(
  stage: number,
  games: number,
  policy: Policy,
  stamp: FightStamp,
  grade: number,
): { swaps: number; cell?: Night6Cell } {
  const spec = growthOf(stage);
  const run = freshRun(SCHOOL, SIM_SEED + stage * 19 + grade);
  const lead = gauntletFieldMate(SCHOOL);
  const weapon = `${SCHOOL}-a-${grade}`;
  run.weaponId = weapon;
  run.mateWeapons = { ...run.mateWeapons, [lead]: weapon };
  let swaps = 0;
  const cell = blank(stage, spec.grade, spec.adept, spec.supreme, stamp.extraIds ?? []);
  for (let i = 0; i < games; i++) {
    const opened = openHall(run, stage, DEFAULT_KNOBS, run.hpMax);
    opened.stamp = stamp;
    const fight = fightSample(opened, policy, fightSeed(stage, i, grade + 3), DEFAULT_KNOBS);
    add(cell, fight);
    swaps += fight.swaps;
  }
  return { swaps, cell };
}

export function runNight6(games = 20): Night6Data {
  const lead = gauntletFieldMate(SCHOOL);
  const mateStamp: FightStamp = {
    party: [lead, MATE],
    mateDecks: { [MATE]: breakStarterDeck("palm") },
  };
  const hall4 = playStage(4, games, duoPolicy(lead), mateStamp, 3);
  const policy = schoolPolicy(SCHOOL, FLAGS_ON);
  const scatter: Night6Cell[] = [];
  const probe = freshRun(SCHOOL, SIM_SEED);
  for (let stage = 1; stage <= HALLS; stage++) {
    const spec = growthOf(stage);
    const extra = injectFor(probe, stage);
    const row = playStage(stage, games, policy, { extraIds: extra }, spec.grade).cell!;
    row.injected = extra;
    scatter.push(row);
  }
  return { games, hall4Swaps: hall4.swaps, hall4Games: games, scatter };
}
