import type { GauntletRun } from "../../src/game/rules/gauntletModel";
import type { WeaponId } from "../../src/game/types";
import { freshRun, openHall } from "./boot";
import { fightSample, mergeTally, type CardTally, type FightResult } from "./fight";
import { DEFAULT_KNOBS } from "./knobs";
import { createLedger, type Ledger } from "./ledger";
import { randomPolicy, type Policy } from "./policy";
import { chooseReward } from "./rewards";
import { mulberry32 } from "./rng";
import { schoolPolicy } from "./schools";
import { SCHOOLS, SIM_SEED, fightSeed } from "./tiers";

const HALLS = 10;

export type FreshHall = {
  stage: number;
  games: number;
  wins: number;
  handSum: number;
  handMin: number;
  handMax: number;
  emptySum: number;
  dmgSum: number;
  capped: number;
  foe: string;
};

export type FreshSchool = {
  id: string;
  label: string;
  halls: FreshHall[];
  tally: CardTally;
};

export type ClimbHall = {
  seen: number;
  wins: number;
  handSum: number;
  handMin: number;
  handMax: number;
  emptySum: number;
  hpSum: number;
  dmgSum: number;
  capped: number;
  deaths: number;
  foe: string;
};

export type ClimbSchool = {
  id: string;
  label: string;
  runs: number;
  clears: number;
  hpMax: number;
  halls: ClimbHall[];
  tally: CardTally;
};

export type NightData = {
  freshGames: number;
  climbRuns: number;
  fresh: FreshSchool[];
  climb: ClimbSchool[];
  ledger: Ledger;
};

type Spec = { id: string; label: string; policy: Policy; deck: WeaponId };

function salt(school: string): number {
  let n = 0;
  for (const ch of school) n += ch.charCodeAt(0);
  return n;
}

function specs(): Spec[] {
  const rows: Spec[] = SCHOOLS.map((id) => {
    const policy = schoolPolicy(id);
    return { id, label: policy.label, policy, deck: id };
  });
  rows.push({ id: "random", label: "随机合法（拳牌）", policy: randomPolicy, deck: "palm" });
  return rows;
}

function blankFresh(stage: number): FreshHall {
  return { stage, games: 0, wins: 0, handSum: 0, handMin: 999, handMax: 0, emptySum: 0, dmgSum: 0, capped: 0, foe: "" };
}

function blankClimb(): ClimbHall {
  return { seen: 0, wins: 0, handSum: 0, handMin: 999, handMax: 0, emptySum: 0, hpSum: 0, dmgSum: 0, capped: 0, deaths: 0, foe: "" };
}

function play(ledger: Ledger, sample: "fresh" | "climb", school: string, opened: ReturnType<typeof openHall>, policy: Policy, seed: number): FightResult {
  const fight = fightSample(opened, policy, seed, DEFAULT_KNOBS, (event) => ledger.note(event));
  ledger.endFight(sample, school, fight.win);
  return fight;
}

function runFresh(ledger: Ledger, spec: Spec, games: number): FreshSchool {
  const halls = Array.from({ length: HALLS }, (_, i) => blankFresh(i + 1));
  const tally: CardTally = {};
  const run = freshRun(spec.deck, SIM_SEED + salt(spec.id));
  for (let stage = 1; stage <= HALLS; stage++) {
    const hall = halls[stage - 1]!;
    for (let i = 0; i < games; i++) {
      const opened = openHall(run, stage, DEFAULT_KNOBS, run.hpMax);
      const fight = play(ledger, "fresh", spec.id, opened, spec.policy, fightSeed(stage, i, salt(spec.id) + 3));
      mergeTally(tally, fight.tally);
      hall.games += 1;
      if (fight.win) hall.wins += 1;
      hall.handSum += fight.hands;
      hall.handMin = Math.min(hall.handMin, fight.hands);
      hall.handMax = Math.max(hall.handMax, fight.hands);
      hall.emptySum += fight.emptyHands;
      hall.dmgSum += fight.damageTaken;
      if (fight.capped) hall.capped += 1;
      if (!hall.foe) hall.foe = `${opened.enemyName}（${opened.enemyId}）`;
    }
  }
  return { id: spec.id, label: spec.label, halls, tally };
}

function faced(run: GauntletRun, enemyId: string): string[] {
  const list = run.facedEnemies ?? [];
  return list.includes(enemyId) ? list : [...list, enemyId];
}

function runClimb(ledger: Ledger, spec: Spec, runs: number): ClimbSchool {
  const halls = Array.from({ length: HALLS }, () => blankClimb());
  const tally: CardTally = {};
  let clears = 0;
  let hpMax = 0;
  for (let i = 0; i < runs; i++) {
    const seed = SIM_SEED + salt(spec.id) * 50 + i * 1000;
    let run = freshRun(spec.deck, seed);
    let cleared = false;
    for (let stage = 1; stage <= HALLS; stage++) {
      const opened = openHall(run, stage, DEFAULT_KNOBS, run.hp);
      if (!hpMax) hpMax = opened.run.hpMax;
      const fight = play(ledger, "climb", spec.id, opened, spec.policy, seed + stage * 17);
      mergeTally(tally, fight.tally);
      const hall = halls[stage - 1]!;
      if (!hall.foe) hall.foe = `${opened.enemyName}（${opened.enemyId}）`;
      if (!fight.win) {
        hall.seen += 1;
        hall.handSum += fight.hands;
        hall.handMin = Math.min(hall.handMin, fight.hands);
        hall.handMax = Math.max(hall.handMax, fight.hands);
        hall.emptySum += fight.emptyHands;
        hall.dmgSum += fight.damageTaken;
        if (fight.capped) hall.capped += 1;
        hall.deaths += 1;
        break;
      }
      let next: GauntletRun = {
        ...run,
        stage: stage + 1,
        streak: stage,
        hp: Math.max(1, fight.hpLeft),
        facedEnemies: faced(run, opened.enemyId),
      };
      if (stage < HALLS) next = chooseReward(next, mulberry32(seed + stage * 97));
      hall.seen += 1;
      hall.wins += 1;
      hall.handSum += fight.hands;
      hall.handMin = Math.min(hall.handMin, fight.hands);
      hall.handMax = Math.max(hall.handMax, fight.hands);
      hall.emptySum += fight.emptyHands;
      hall.hpSum += next.hp;
      hall.dmgSum += fight.damageTaken;
      if (fight.capped) hall.capped += 1;
      run = next;
      if (stage === HALLS) cleared = true;
    }
    if (cleared) clears += 1;
  }
  return { id: spec.id, label: spec.label, runs, clears, hpMax, halls, tally };
}

export function runNight(freshGames = 10, climbRuns = 10): NightData {
  const ledger = createLedger();
  const list = specs();
  return {
    freshGames,
    climbRuns,
    fresh: list.map((spec) => runFresh(ledger, spec, freshGames)),
    climb: list.map((spec) => runClimb(ledger, spec, climbRuns)),
    ledger,
  };
}
