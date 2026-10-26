import type { GauntletRun } from "../../src/game/rules/gauntletModel";
import type { WeaponId } from "../../src/game/types";
import { freshRun, openHall } from "./boot";
import { fightSample, mergeTally, type CardTally } from "./fight";
import type { ClimbKnobs } from "./knobs";
import { chooseReward } from "./rewards";
import { mulberry32 } from "./rng";
import { schoolPolicy } from "./schools";
import { CAMPAIGN_RUNS, SCHOOLS, SIM_SEED } from "./tiers";

const HALLS = 10;

export type CampaignSchool = {
  school: WeaponId;
  label: string;
  runs: number;
  clears: number;
  deaths: number[];
  hands: number[];
  hp: number[];
  tally: CardTally;
};

type OneRun = {
  cleared: boolean;
  diedAt: number | null;
  hands: number[];
  hpAfter: number[];
  tally: CardTally;
};

function zeros(): number[] {
  return Array.from({ length: HALLS }, () => 0);
}

function schoolSalt(school: string): number {
  let n = 0;
  for (const ch of school) n += ch.charCodeAt(0);
  return n;
}

function reached(row: OneRun, index: number): boolean {
  if (row.cleared) return true;
  return row.diedAt != null && index + 1 <= row.diedAt;
}

function playHalls(school: WeaponId, seed: number, knobs: ClimbKnobs): OneRun {
  let run = freshRun(school, seed);
  const policy = schoolPolicy(school);
  const hands = zeros();
  const hpAfter = zeros();
  const tally: CardTally = {};
  for (let stage = 1; stage <= HALLS; stage++) {
    const opened = openHall(run, stage, knobs, run.hp);
    const fight = fightSample(opened, policy, seed + stage * 17, knobs);
    mergeTally(tally, fight.tally);
    hands[stage - 1] = fight.hands;
    if (!fight.win) {
      hpAfter[stage - 1] = 0;
      return { cleared: false, diedAt: stage, hands, hpAfter, tally };
    }
    let next: GauntletRun = {
      ...run,
      stage: stage + 1,
      streak: stage,
      hp: Math.max(1, fight.hpLeft),
      facedEnemies: run.facedEnemies.includes(opened.enemyId) ? run.facedEnemies : [...run.facedEnemies, opened.enemyId],
    };
    if (stage < HALLS) next = chooseReward(next, mulberry32(seed + stage * 97));
    hpAfter[stage - 1] = next.hp;
    run = next;
  }
  return { cleared: true, diedAt: null, hands, hpAfter, tally };
}

function summarize(school: WeaponId, knobs: ClimbKnobs, runs: number): CampaignSchool {
  const deaths = zeros();
  const handSum = zeros();
  const hpSum = zeros();
  const seen = zeros();
  const tally: CardTally = {};
  let clears = 0;
  for (let i = 0; i < runs; i++) {
    const row = playHalls(school, SIM_SEED + schoolSalt(school) * 50 + i * 1000, knobs);
    if (row.cleared) clears += 1;
    if (row.diedAt) deaths[row.diedAt - 1] += 1;
    mergeTally(tally, row.tally);
    for (let s = 0; s < HALLS; s++) {
      if (!reached(row, s)) continue;
      handSum[s] += row.hands[s]!;
      hpSum[s] += row.hpAfter[s]!;
      seen[s] += 1;
    }
  }
  return {
    school,
    label: schoolPolicy(school).label,
    runs,
    clears,
    deaths,
    hands: handSum.map((n, i) => (seen[i] ? n / seen[i]! : 0)),
    hp: hpSum.map((n, i) => (seen[i] ? n / seen[i]! : 0)),
    tally,
  };
}

export function runCampaigns(knobs: ClimbKnobs, runs = CAMPAIGN_RUNS): CampaignSchool[] {
  return SCHOOLS.map((school) => summarize(school, knobs, runs));
}
