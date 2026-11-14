import { gauntletFieldMate } from "../../src/combatLab/gauntlet";
import type { CardId, CompanionId, WeaponId } from "../../src/game/types";
import type { FightStamp } from "./boot";
import { freshRun, openHall } from "./boot";
import { fightSample, type AutopsyHand, type FightResult } from "./fight";
import { FLAGS_ON } from "./flags";
import { DEFAULT_KNOBS, type ClimbKnobs } from "./knobs";
import { extras, JAG_TARGET, stampFor, trioPolicy, withNight9, type Night10Cell, type Night10Window } from "./night10Run";
import { withChase } from "./night11Run";
import { withDumpMiss } from "./night12Run";
import { growthOf } from "./night6Run";
import { headsOf, hpOf } from "./night7Run";
import type { Policy } from "./policy";
import { schoolPolicy } from "./schools";
import { SIM_SEED, fightSeed } from "./tiers";

const SCHOOL: WeaponId = "saber";
const HALLS = 10;
const AUTOPSY_GAMES = 3;

export type Night13Pierce = {
  stage: number;
  enemy: string;
  variant: string;
  games: number;
  turtle: number;
  dmgDealt: number;
  bleed: number;
  poison: number;
  pierce: number;
};

export type Night13Probe = {
  id: string;
  stage: number;
  enemy: string;
  variant: string;
  games: number;
  wins: number;
  timeoutZero: number;
  handMean: number;
  dmgDealtMean: number;
  minDistMean: number;
  dumpMean: number;
  approachHands: number;
  rows: { i: number; win: boolean; hands: number; dmgDealt: number; minDist: number; dumpN: number; openQ: string }[];
};

export type Night13Data = {
  games: number;
  hall1Taken: number;
  hall1Ok: boolean;
  inject: { stage: number; grade: number; adept: number; supreme: number; cards: string[] }[];
  scatter: Night10Cell[];
  windows: Night10Window[];
  reached: string[];
  pierce: Night13Pierce[];
  hall9: Night13Probe;
};

function blank(stage: number, injected: string[], mateInjected: string, enemy: string): Night10Cell {
  const spec = growthOf(stage);
  return {
    stage,
    games: 0,
    wins: 0,
    handSum: 0,
    dmgTaken: 0,
    dmgDealt: 0,
    swaps: 0,
    hp: hpOf(stage),
    heads: headsOf(stage),
    grade: spec.grade,
    injected,
    mateInjected,
    enemy,
    dmgCoef: 0,
    hitMul: 0,
    armed: 0,
    dismantle: 0,
    bind: 0,
    read: 0,
    variants: {},
  };
}

function add(cell: Night10Cell, fight: FightResult): void {
  cell.games += 1;
  if (fight.win) cell.wins += 1;
  cell.handSum += fight.hands;
  cell.dmgTaken += fight.damageTaken;
  cell.dmgDealt += fight.dmgDealt;
  cell.swaps += fight.swaps;
  if (fight.foeArmed) cell.armed += 1;
  cell.dismantle += fight.foeDismantle;
  cell.bind += fight.foeBind;
  cell.read += fight.foeRead;
  const key = fight.foeVariant ?? "无";
  cell.variants[key] = (cell.variants[key] ?? 0) + 1;
}

function playStage(
  stage: number,
  games: number,
  policy: Policy,
  stamp: FightStamp,
  knobs: ClimbKnobs,
  salt: number,
  mateNote: string,
  pierceAcc?: Night13Pierce,
): Night10Cell {
  const spec = growthOf(stage);
  const run = freshRun(SCHOOL, SIM_SEED + stage * 19 + spec.grade);
  const lead = gauntletFieldMate(SCHOOL);
  const weapon = `${SCHOOL}-a-${spec.grade}`;
  run.weaponId = weapon;
  run.mateWeapons = { ...run.mateWeapons, [lead]: weapon };
  const cell = blank(stage, stamp.extraIds ?? [], mateNote, "");
  for (let i = 0; i < games; i++) {
    const opened = openHall(run, stage, knobs, hpOf(stage));
    opened.stamp = stamp;
    if (!cell.enemy) cell.enemy = opened.enemyName;
    if (!cell.hitMul) cell.hitMul = opened.enemyHitMul ?? 0;
    if (!cell.dmgCoef) cell.dmgCoef = opened.dmgCoef ?? 0;
    const fight = fightSample(opened, policy, fightSeed(stage, i, salt), knobs);
    add(cell, fight);
    if (pierceAcc) {
      pierceAcc.games += 1;
      pierceAcc.dmgDealt += fight.dmgDealt;
      pierceAcc.bleed += fight.bleedTick;
      pierceAcc.poison += fight.poisonTick;
      pierceAcc.pierce += fight.pierceHit;
      if ((fight.foeVariant ?? "").includes("turtle")) pierceAcc.turtle += 1;
      if (!pierceAcc.enemy) pierceAcc.enemy = opened.enemyName;
      if (!pierceAcc.variant) pierceAcc.variant = fight.foeVariant ?? "无";
    }
  }
  return cell;
}

function mateNote(extra: Partial<Record<CompanionId, CardId[]>>): string {
  const bai = extra["baimenghe"]?.join(" ") || "—";
  const huo = extra["huochangchuan"]?.join(" ") || "—";
  return `白 ${bai} / 霍 ${huo}`;
}

function pierceBlank(stage: number): Night13Pierce {
  return { stage, enemy: "", variant: "", games: 0, turtle: 0, dmgDealt: 0, bleed: 0, poison: 0, pierce: 0 };
}

function probeHall9(policy: Policy): Night13Probe {
  const lead = gauntletFieldMate(SCHOOL);
  const probeRun = freshRun(SCHOOL, SIM_SEED);
  const { extra, mates } = extras(probeRun, 9);
  const stamp = stampFor(lead, 9, extra, mates, true, 0);
  const run = freshRun(SCHOOL, SIM_SEED + 9 * 19 + 3);
  run.weaponId = `${SCHOOL}-a-${growthOf(9).grade}`;
  const rows: Night13Probe["rows"] = [];
  let enemy = "";
  let variant = "";
  let approachHands = 0;
  for (let i = 0; i < AUTOPSY_GAMES; i++) {
    const opened = openHall(run, 9, DEFAULT_KNOBS, hpOf(9));
    opened.stamp = stamp;
    if (!enemy) enemy = opened.enemyName;
    const autopsy: AutopsyHand[] = [];
    const fight = fightSample(opened, policy, fightSeed(9, i, 6), DEFAULT_KNOBS, undefined, autopsy);
    if (!variant) variant = fight.foeVariant ?? "无";
    const minDist = autopsy.reduce((m, r) => Math.min(m, r.dist), 99);
    approachHands += autopsy.filter((r) => r.approach.length).length;
    rows.push({
      i,
      win: fight.win,
      hands: fight.hands,
      dmgDealt: fight.dmgDealt,
      minDist,
      dumpN: fight.dumpN,
      openQ: autopsy[0]?.intents.join("→") ?? "空",
    });
  }
  const n = rows.length;
  return {
    id: "馆9水匪哨",
    stage: 9,
    enemy,
    variant,
    games: n,
    wins: rows.filter((r) => r.win).length,
    timeoutZero: rows.filter((r) => r.hands >= 40 && r.dmgDealt <= 0).length,
    handMean: n ? rows.reduce((s, r) => s + r.hands, 0) / n : 0,
    dmgDealtMean: n ? rows.reduce((s, r) => s + r.dmgDealt, 0) / n : 0,
    minDistMean: n ? rows.reduce((s, r) => s + r.minDist, 0) / n : 0,
    dumpMean: n ? rows.reduce((s, r) => s + r.dumpN, 0) / n : 0,
    approachHands,
    rows,
  };
}

export function runNight13(games = 20): Night13Data {
  const lead = gauntletFieldMate(SCHOOL);
  const probe = freshRun(SCHOOL, SIM_SEED);
  const solo = withDumpMiss(withChase(withNight9(schoolPolicy(SCHOOL, FLAGS_ON))));
  const trio = withDumpMiss(withChase(trioPolicy(lead)));
  const hall1 = playStage(1, games, schoolPolicy(SCHOOL, FLAGS_ON), stampFor(lead, 1, extras(probe, 1).extra, extras(probe, 1).mates, false), DEFAULT_KNOBS, 4, mateNote(extras(probe, 1).mates));
  const taken = hall1.games ? hall1.dmgTaken / hall1.games : 0;
  const inject = [1, 2, 3, 4, 6, 8, 10].map((stage) => {
    const spec = growthOf(stage);
    const { extra } = extras(probe, stage);
    return { stage, grade: spec.grade, adept: spec.adept, supreme: spec.supreme, cards: extra };
  });
  const scatter: Night10Cell[] = [];
  const pierce: Night13Pierce[] = [];
  for (let stage = 1; stage <= HALLS; stage++) {
    const { extra, mates } = extras(probe, stage);
    const policy = headsOf(stage) > 1 ? trio : solo;
    const acc = stage === 5 || stage === 9 ? pierceBlank(stage) : undefined;
    scatter.push(
      playStage(stage, games, policy, stampFor(lead, stage, extra, mates, false), DEFAULT_KNOBS, growthOf(stage).grade + 3, mateNote(mates), acc),
    );
    if (acc) pierce.push(acc);
  }
  const reached = scatter.filter((c) => {
    const t = JAG_TARGET[c.stage];
    return t && c.games > 0 && c.wins / c.games + 1e-9 >= t.floor;
  });
  const off: ClimbKnobs = { ...DEFAULT_KNOBS, foeWindowP: 0 };
  const windows: Night10Window[] = [];
  for (let stage = 6; stage <= 10; stage++) {
    const { extra, mates } = extras(probe, stage);
    const note = mateNote(mates);
    const policy = headsOf(stage) > 1 ? trio : solo;
    const onCell = playStage(stage, games, policy, stampFor(lead, stage, extra, mates, true), DEFAULT_KNOBS, 90, note);
    const offCell = playStage(stage, games, policy, stampFor(lead, stage, extra, mates, true), off, 90, note);
    windows.push({ stage, on: onCell, off: offCell });
  }
  return {
    games,
    hall1Taken: taken,
    hall1Ok: hall1.hitMul === 0.3 && taken < 32,
    inject,
    scatter,
    windows,
    reached: reached.map((c) => String(c.stage)),
    pierce,
    hall9: probeHall9(trio),
  };
}
