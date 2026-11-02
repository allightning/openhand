import type { GauntletRun } from "../../src/game/rules/gauntletModel";
import type { WeaponId } from "../../src/game/types";
import { freshRun, openHall } from "./boot";
import { fightSample, mergeTally, type CardTally, type FightResult } from "./fight";
import { FLAGS_ON, flagLabel, type SimFlags } from "./flags";
import { DEFAULT_KNOBS } from "./knobs";
import { createLedger, type Ledger } from "./ledger";
import { randomPolicy, type Policy } from "./policy";
import { chooseReward } from "./rewards";
import { mulberry32 } from "./rng";
import { schoolPolicy } from "./schools";
import { NIGHT2_SCHOOLS, SIM_SEED, fightSeed } from "./tiers";

const HALLS = 10;

export type ExtraSum = {
  chargePeak: number;
  burstDmg: number;
  pinPeak: number;
  pinPlays: number;
  burnDmg: number;
  reactOffer: number;
  reactTake: number;
  reactQi: number;
  dmg: number;
  hpMax: number;
  games: number;
};

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
  potSum: number;
};

export type Night2School = {
  id: string;
  label: string;
  flags: string;
  extra: ExtraSum;
  halls: FreshHall[];
  tally: CardTally;
};

export type Night2Climb = {
  id: string;
  label: string;
  flags: string;
  runs: number;
  clears: number;
  hpMax: number;
  potStart: number;
  extra: ExtraSum;
  halls: ClimbHall[];
  tally: CardTally;
};

export type Night2Data = {
  freshGames: number;
  climbRuns: number;
  fresh: Night2School[];
  climb: Night2Climb[];
  ledger: Ledger;
};

type Spec = { id: string; label: string; policy: Policy; deck: WeaponId };

function salt(school: string): number {
  let n = 0;
  for (const ch of school) n += ch.charCodeAt(0);
  return n;
}

function extra0(): ExtraSum {
  return { chargePeak: 0, burstDmg: 0, pinPeak: 0, pinPlays: 0, burnDmg: 0, reactOffer: 0, reactTake: 0, reactQi: 0, dmg: 0, hpMax: 0, games: 0 };
}

function addExtra(into: ExtraSum, fight: FightResult, hpMax: number): void {
  into.chargePeak = Math.max(into.chargePeak, fight.chargePeak);
  into.burstDmg += fight.burstDmg;
  into.pinPeak = Math.max(into.pinPeak, fight.pinPeak);
  into.pinPlays += fight.pinPlays;
  into.burnDmg += fight.burnDmg;
  into.reactOffer += fight.reactOffer;
  into.reactTake += fight.reactTake;
  into.reactQi += fight.reactQi;
  into.dmg += fight.damageTaken;
  into.hpMax = hpMax;
  into.games += 1;
}

function withFlags(base: SimFlags, patch: Partial<SimFlags>): SimFlags {
  return { ...base, ...patch };
}

export function night2Specs(): Spec[] {
  const rows: Spec[] = NIGHT2_SCHOOLS.map((id) => {
    const policy = schoolPolicy(id, FLAGS_ON);
    return { id, label: policy.label, policy, deck: id === "dart" ? "saber" : id };
  });
  rows.push({ id: "random", label: "随机合法（拳牌）", policy: randomPolicy, deck: "palm" });
  const punch = schoolPolicy("staff", withFlags(FLAGS_ON, { charge: "punch" }));
  rows.push({ id: "staff-punch", label: punch.label, policy: punch, deck: "staff" });
  const never = schoolPolicy("spear", withFlags(FLAGS_ON, { react: "never" }));
  rows.push({ id: "spear-never", label: `${never.label}·窗永不`, policy: never, deck: "spear" });
  const always = schoolPolicy("spear", withFlags(FLAGS_ON, { react: "always" }));
  rows.push({ id: "spear-always", label: `${always.label}·窗总按`, policy: always, deck: "spear" });
  const noEnv = schoolPolicy("palm", withFlags(FLAGS_ON, { env: false }));
  rows.push({ id: "palm-noenv", label: `${noEnv.label}·环境关`, policy: noEnv, deck: "palm" });
  return rows;
}

function blankFresh(stage: number): FreshHall {
  return { stage, games: 0, wins: 0, handSum: 0, handMin: 999, handMax: 0, emptySum: 0, dmgSum: 0, capped: 0, foe: "" };
}

function blankClimb(): ClimbHall {
  return { seen: 0, wins: 0, handSum: 0, handMin: 999, handMax: 0, emptySum: 0, hpSum: 0, dmgSum: 0, capped: 0, deaths: 0, foe: "", potSum: 0 };
}

function play(ledger: Ledger, sample: "fresh" | "climb", school: string, opened: ReturnType<typeof openHall>, policy: Policy, seed: number): FightResult {
  const fight = fightSample(opened, policy, seed, DEFAULT_KNOBS, (event) => ledger.note(event));
  ledger.endFight(sample, school, fight.win);
  return fight;
}

function takeFresh(row: FreshHall, fight: FightResult, opened: ReturnType<typeof openHall>): void {
  row.games += 1;
  if (fight.win) row.wins += 1;
  row.handSum += fight.hands;
  row.handMin = Math.min(row.handMin, fight.hands);
  row.handMax = Math.max(row.handMax, fight.hands);
  row.emptySum += fight.emptyHands;
  row.dmgSum += fight.damageTaken;
  if (fight.capped) row.capped += 1;
  if (!row.foe) row.foe = `${opened.enemyName}（${opened.enemyId}）`;
}

function runFresh(ledger: Ledger, spec: Spec, games: number): Night2School {
  const halls = Array.from({ length: HALLS }, (_, i) => blankFresh(i + 1));
  const tally: CardTally = {};
  const extra = extra0();
  const run = freshRun(spec.deck, SIM_SEED + salt(spec.id));
  for (let stage = 1; stage <= HALLS; stage++) {
    const hall = halls[stage - 1]!;
    for (let i = 0; i < games; i++) {
      const opened = openHall(run, stage, DEFAULT_KNOBS, run.hpMax);
      const fight = play(ledger, "fresh", spec.id, opened, spec.policy, fightSeed(stage, i, salt(spec.id) + 11));
      mergeTally(tally, fight.tally);
      addExtra(extra, fight, opened.run.hpMax);
      takeFresh(hall, fight, opened);
    }
  }
  return { id: spec.id, label: spec.label, flags: flagLabel(spec.policy.flags), extra, halls, tally };
}

function faced(run: GauntletRun, enemyId: string): string[] {
  const list = run.facedEnemies ?? [];
  return list.includes(enemyId) ? list : [...list, enemyId];
}

function runClimb(ledger: Ledger, spec: Spec, runs: number): Night2Climb {
  const halls = Array.from({ length: HALLS }, () => blankClimb());
  const tally: CardTally = {};
  const extra = extra0();
  let clears = 0;
  let hpMax = 0;
  let potStart = 0;
  for (let i = 0; i < runs; i++) {
    const seed = SIM_SEED + salt(spec.id) * 50 + i * 1000;
    let run = freshRun(spec.deck, seed);
    if (!potStart) potStart = run.pot;
    let cleared = false;
    for (let stage = 1; stage <= HALLS; stage++) {
      const opened = openHall(run, stage, DEFAULT_KNOBS, run.hp);
      if (!hpMax) hpMax = opened.run.hpMax;
      const fight = play(ledger, "climb", spec.id, opened, spec.policy, seed + stage * 17);
      mergeTally(tally, fight.tally);
      addExtra(extra, fight, opened.run.hpMax);
      const hall = halls[stage - 1]!;
      if (!hall.foe) hall.foe = `${opened.enemyName}（${opened.enemyId}）`;
      if (!fight.win) {
        hall.seen += 1;
        hall.handSum += fight.hands;
        hall.handMin = Math.min(hall.handMin, fight.hands);
        hall.handMax = Math.max(hall.handMax, fight.hands);
        hall.emptySum += fight.emptyHands;
        hall.dmgSum += fight.damageTaken;
        hall.potSum += run.pot;
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
      hall.potSum += next.pot;
      if (fight.capped) hall.capped += 1;
      run = next;
      if (stage === HALLS) cleared = true;
    }
    if (cleared) clears += 1;
  }
  return { id: spec.id, label: spec.label, flags: flagLabel(spec.policy.flags), runs, clears, hpMax, potStart, extra, halls, tally };
}

export function runNight2(freshGames = 10, climbRuns = 10): Night2Data {
  const ledger = createLedger();
  const list = night2Specs();
  return {
    freshGames,
    climbRuns,
    fresh: list.map((spec) => runFresh(ledger, spec, freshGames)),
    climb: list.map((spec) => runClimb(ledger, spec, climbRuns)),
    ledger,
  };
}
