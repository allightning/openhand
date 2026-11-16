import { gauntletFieldMate } from "../../src/combatLab/gauntlet";
import { hallEnemyHitMul } from "../../src/game/climbCaps";
import { ENEMY_ENERGY } from "../../src/game/content";
import { ladderEntry } from "../../src/game/rules/ladderRules";
import type { EnemyId, WeaponId } from "../../src/game/types";
import { freshRun, openHall } from "./boot";
import { fightSample, type FightResult } from "./fight";
import { FLAGS_ON } from "./flags";
import { DEFAULT_KNOBS, type ClimbKnobs } from "./knobs";
import { growthOf } from "./night6Run";
import { headsOf, hpOf } from "./night7Run";
import { extras, JAG_TARGET, stampFor, trioPolicy, withNight9 } from "./night10Run";
import { withChase } from "./night11Run";
import { withDumpMiss } from "./night12Run";
import type { Policy } from "./policy";
import { schoolPolicy } from "./schools";
import { SIM_SEED, fightSeed } from "./tiers";

const SCHOOL: WeaponId = "saber";

export type Night18Row = {
  arm: string;
  stage: number;
  enemy: string;
  enemyId: string;
  grade: number;
  hp: number;
  hitMul: number;
  segBudget: number;
  games: number;
  wins: number;
  handSum: number;
  dmgTaken: number;
  dmgDealt: number;
  foeHp: number;
  jag: number;
  hit: boolean;
};

export type Night18Data = {
  base: Night18Row[];
  bracket: Night18Row[];
};

function policyOf(stage: number): Policy {
  const lead = gauntletFieldMate(SCHOOL);
  const solo = withDumpMiss(withChase(withNight9(schoolPolicy(SCHOOL, FLAGS_ON))));
  const trio = withDumpMiss(withChase(trioPolicy(lead)));
  return headsOf(stage) > 1 ? trio : solo;
}

/** 段预算 = 敌劲力底 + 馆 segBonus。踢馆 enemySegAll 开着，杂兵也加。 */
export function segBudgetOf(stage: number, enemyId: string): number {
  const base = ENEMY_ENERGY[enemyId as EnemyId] ?? 2;
  return base + ladderEntry(stage, "bandit").segBonus;
}

function pack(fights: FightResult[]) {
  return {
    games: fights.length,
    wins: fights.filter((f) => f.win).length,
    handSum: fights.reduce((n, f) => n + f.hands, 0),
    dmgTaken: fights.reduce((n, f) => n + f.damageTaken, 0),
    dmgDealt: fights.reduce((n, f) => n + f.dmgDealt, 0),
    foeHp: fights.reduce((n, f) => n + f.foeMaxHp, 0),
  };
}

function playRow(stage: number, games: number, arm: string, knobs: ClimbKnobs = DEFAULT_KNOBS): Night18Row {
  const grade = growthOf(stage).grade;
  const hp = hpOf(stage);
  const lead = gauntletFieldMate(SCHOOL);
  const probe = freshRun(SCHOOL, SIM_SEED);
  const { extra, mates } = extras(probe, stage);
  const stamp = stampFor(lead, stage, extra, mates, false);
  const run = freshRun(SCHOOL, SIM_SEED + stage * 19 + grade);
  run.weaponId = `${SCHOOL}-a-${grade}`;
  run.mateWeapons = { ...run.mateWeapons, [lead]: run.weaponId };
  const policy = policyOf(stage);
  const salt = grade + 3;
  const fights: FightResult[] = [];
  let enemy = "";
  let enemyId = "";
  let hitMul = 0;
  for (let i = 0; i < games; i++) {
    const opened = openHall(run, stage, knobs, hp);
    opened.stamp = stamp;
    if (!enemy) enemy = opened.enemyName;
    if (!enemyId) enemyId = opened.enemyId;
    if (!hitMul) hitMul = opened.enemyHitMul ?? hallEnemyHitMul(stage);
    fights.push(fightSample(opened, policy, fightSeed(stage, i, salt), knobs));
  }
  const t = pack(fights);
  const jag = JAG_TARGET[stage]?.floor ?? 0;
  return {
    arm,
    stage,
    enemy,
    enemyId,
    grade,
    hp,
    hitMul,
    segBudget: segBudgetOf(stage, enemyId),
    ...t,
    jag,
    hit: t.games > 0 && t.wins / t.games + 1e-9 >= jag,
  };
}

function runBase(): Night18Row[] {
  const rows: Night18Row[] = [];
  for (let stage = 1; stage <= 10; stage++) {
    rows.push(playRow(stage, stage === 2 ? 40 : 20, "验收"));
  }
  return rows;
}

function runBracket(): Night18Row[] {
  return [
    playRow(8, 20, "A 岸匪伤 ×0.8", { ...DEFAULT_KNOBS, enemyHitMul: hallEnemyHitMul(8) * 0.8 }),
    playRow(9, 20, "B 水匪哨血 ×0.85", { ...DEFAULT_KNOBS, enemyHp: 0.85 }),
  ];
}

export function runNight18(): Night18Data {
  return { base: runBase(), bracket: runBracket() };
}
