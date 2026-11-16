import { gauntletFieldMate } from "../../src/combatLab/gauntlet";
import { hallEnemyHitMul } from "../../src/game/climbCaps";
import type { WeaponId } from "../../src/game/types";
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
import { segBudgetOf } from "./night18Run";

const SCHOOL: WeaponId = "saber";
const SPLIT_STAGES = [2, 6, 8, 9, 10];

export type Night19Probe = {
  hit: number;
  scale: number;
  taken: number[];
  direct: number[];
};

export type Night19Part = {
  stage: number;
  enemy: string;
  games: number;
  wins: number;
  handSum: number;
  taken: number;
  direct: number;
  burn: number;
  bleed: number;
  self: number;
  jag: number;
};

export type Night19Arm = Night19Part & {
  arm: string;
  hitMul: number;
  foeHp: number;
};

export type Night19Data = {
  probe: Night19Probe[];
  parts: Night19Part[];
  arms: Night19Arm[];
  notes: string[];
};

function policyOf(stage: number): Policy {
  const lead = gauntletFieldMate(SCHOOL);
  const solo = withDumpMiss(withChase(withNight9(schoolPolicy(SCHOOL, FLAGS_ON))));
  const trio = withDumpMiss(withChase(trioPolicy(lead)));
  return headsOf(stage) > 1 ? trio : solo;
}

function play(stage: number, games: number, knobs: ClimbKnobs): { fights: FightResult[]; enemy: string; scale: number; hitMul: number } {
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
  let scale = 0;
  let hitMul = 0;
  for (let i = 0; i < games; i++) {
    const opened = openHall(run, stage, knobs, hp);
    opened.stamp = stamp;
    if (!enemy) enemy = opened.enemyName;
    if (!scale) scale = opened.rc.fightScale.dmg;
    if (!hitMul) hitMul = opened.enemyHitMul ?? hallEnemyHitMul(stage);
    fights.push(fightSample(opened, policy, fightSeed(stage, i, salt), knobs));
  }
  return { fights, enemy, scale, hitMul };
}

function partOf(stage: number, enemy: string, fights: FightResult[]): Night19Part {
  return {
    stage,
    enemy,
    games: fights.length,
    wins: fights.filter((f) => f.win).length,
    handSum: fights.reduce((n, f) => n + f.hands, 0),
    taken: fights.reduce((n, f) => n + f.damageTaken, 0),
    direct: fights.reduce((n, f) => n + f.dmgDirect, 0),
    burn: fights.reduce((n, f) => n + f.burnDmg, 0),
    bleed: fights.reduce((n, f) => n + f.dmgBleed, 0),
    self: fights.reduce((n, f) => n + f.dmgSelf, 0),
    jag: JAG_TARGET[stage]?.floor ?? 0,
  };
}

function probeArm(hit: number): Night19Probe {
  const knobs = { ...DEFAULT_KNOBS, enemyHitMul: hit };
  const { fights, scale } = play(8, 3, knobs);
  return {
    hit,
    scale,
    taken: fights.map((f) => f.damageTaken),
    direct: fights.map((f) => f.dmgDirect),
  };
}

function share(n: number, total: number): number {
  return total > 0 ? n / total : 0;
}

function arm(stage: number, name: string, knobs: ClimbKnobs): Night19Arm {
  const { fights, enemy, hitMul } = play(stage, 20, knobs);
  const row = partOf(stage, enemy, fights);
  return {
    ...row,
    arm: name,
    hitMul,
    foeHp: fights.reduce((n, f) => n + f.foeMaxHp, 0),
  };
}

function runArms(parts: Night19Part[], directEats: boolean): { arms: Night19Arm[]; notes: string[] } {
  const at = (stage: number) => parts.find((r) => r.stage === stage)!;
  const arms: Night19Arm[] = [];
  const notes: string[] = [];
  const hall2 = at(2);
  arms.push(arm(2, "坡蹲血 ×0.9", { ...DEFAULT_KNOBS, enemyHp: 0.9 }));
  const hall2Gross = hall2.direct + hall2.burn + hall2.bleed + hall2.self;
  if (share(hall2.burn + hall2.bleed, hall2Gross) >= 0.25) {
    const bonus = segBudgetOf(2, "mob_road_02") - 2;
    notes.push(`馆 2 灼烧+裂创占日志伤 ${(share(hall2.burn + hall2.bleed, hall2Gross) * 100).toFixed(0)}%，加段预算臂。`);
    arms.push(arm(2, "段预算 4→3", { ...DEFAULT_KNOBS, enemySegBonus: Math.max(0, bonus - 1) }));
  }
  arms.push(arm(6, "系数 0.5 + 血 ×0.9", { ...DEFAULT_KNOBS, enemyHitMul: 0.5, enemyHp: 0.9 }));
  const hall6 = at(6);
  const hall6Gross = hall6.direct + hall6.burn + hall6.bleed + hall6.self;
  if (share(hall6.burn, hall6Gross) >= 0.25) {
    notes.push(`馆 6 灼烧占日志伤 ${(share(hall6.burn, hall6Gross) * 100).toFixed(0)}%，加灼烧 4→2。`);
    arms.push(arm(6, "灼烧 4→2", { ...DEFAULT_KNOBS, burnCap: 2 }));
  }
  const hall8 = at(8);
  if (hall8.burn >= hall8.direct) {
    notes.push("馆 8 灼烧不少于直伤，臂用灼烧 4→2。");
    arms.push(arm(8, "灼烧 4→2", { ...DEFAULT_KNOBS, burnCap: 2 }));
  } else if (directEats) {
    notes.push("馆 8 直伤为主，且直伤吃系数，臂用系数 0.8。");
    arms.push(arm(8, "系数 0.8", { ...DEFAULT_KNOBS, enemyHitMul: hallEnemyHitMul(8) * 0.8 }));
  } else {
    notes.push("馆 8 直伤为主，但 P0 直伤不吃系数，系数臂不跑。");
  }
  arms.push(arm(9, "水匪哨血 ×0.75", { ...DEFAULT_KNOBS, enemyHp: 0.75 }));
  arms.push(arm(10, "夺玺者血 ×0.85", { ...DEFAULT_KNOBS, enemyHp: 0.85 }));
  return { arms, notes };
}

export function runNight19(): Night19Data {
  const probe = [probeArm(1), probeArm(0.5)];
  const mean = (xs: number[]) => xs.reduce((n, v) => n + v, 0) / Math.max(1, xs.length);
  const directRatio = mean(probe[1]!.direct) / Math.max(1, mean(probe[0]!.direct));
  const directEats = directRatio <= 0.7;
  const parts: Night19Part[] = [];
  for (const stage of SPLIT_STAGES) {
    const { fights, enemy } = play(stage, 20, DEFAULT_KNOBS);
    parts.push(partOf(stage, enemy, fights));
  }
  const picked = runArms(parts, directEats);
  return { probe, parts, arms: picked.arms, notes: picked.notes };
}
