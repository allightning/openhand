import type { WeaponId } from "../../src/game/types";
import { freshRun, openHall } from "./boot";
import { fightSample, mergeTally, type CardTally, type FightResult } from "./fight";
import type { ClimbKnobs } from "./knobs";
import { greedyPolicy, randomPolicy, type Policy } from "./policy";
import { SCHOOL_POLICIES } from "./schools";
import { SPOT_GAMES, SPOT_STAGES, SIM_SEED } from "./tiers";

export type SpotRow = {
  label: string;
  stage: number;
  enemyId: string;
  enemyName: string;
  policy: string;
  school: WeaponId | "mix";
  hands: number;
  handsBand: string;
  winRate: number;
  emptyRate: number;
  damage: number;
  capped: number;
  games: number;
};

export type SpotPack = {
  baseline: SpotRow[];
  schools: SpotRow[];
  tally: CardTally;
};

function average(policy: Policy, school: WeaponId | "mix", stage: number, band: string, games: number, knobs: ClimbKnobs, salt: number): { row: SpotRow; tally: CardTally } {
  const deckSchool: WeaponId = school === "mix" ? "palm" : school;
  const run = freshRun(deckSchool, SIM_SEED + salt);
  const tally: CardTally = {};
  let hands = 0;
  let wins = 0;
  let emptyHands = 0;
  let damage = 0;
  let capped = 0;
  let enemyId = "";
  let enemyName = "";
  for (let i = 0; i < games; i++) {
    const opened = openHall(run, stage, knobs, run.hpMax);
    enemyId = opened.enemyId;
    enemyName = opened.enemyName;
    const fight: FightResult = fightSample(opened, policy, SIM_SEED + salt + stage * 1000 + i, knobs);
    mergeTally(tally, fight.tally);
    hands += fight.hands;
    emptyHands += fight.emptyHands;
    damage += fight.damageTaken;
    if (fight.win) wins += 1;
    if (fight.capped) capped += 1;
  }
  const stageLabel = SPOT_STAGES.find((s) => s.stage === stage)?.label ?? String(stage);
  return {
    tally,
    row: {
      label: stageLabel,
      stage,
      enemyId,
      enemyName,
      policy: policy.label,
      school: deckSchool,
      hands: hands / games,
      handsBand: band,
      winRate: wins / games,
      emptyRate: hands > 0 ? emptyHands / hands : 0,
      damage: damage / games,
      capped,
      games,
    },
  };
}

export function runSpot(knobs: ClimbKnobs, games = SPOT_GAMES, schoolsToo = true): SpotPack {
  const tally: CardTally = {};
  const baseline = SPOT_STAGES.map((tier) => {
    const got = average(greedyPolicy, "mix", tier.stage, tier.handsBand, games, knobs, 1);
    mergeTally(tally, got.tally);
    return got.row;
  });
  const schools: SpotRow[] = [];
  if (schoolsToo) {
    const policies: Policy[] = [...SCHOOL_POLICIES, randomPolicy];
    for (const policy of policies) {
      for (const tier of SPOT_STAGES) {
        const school = policy.school === "mix" ? "palm" : policy.school;
        const got = average(policy, school, tier.stage, tier.handsBand, games, knobs, school.length * 20 + policy.id.length);
        mergeTally(tally, got.tally);
        schools.push(got.row);
      }
    }
  }
  return { baseline, schools, tally };
}
