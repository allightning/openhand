import type { CompanionId, WeaponId } from "../../src/game/types";
import { freshRun, openHall, type FightStamp } from "./boot";
import { fightSample } from "./fight";
import { FLAGS_ON } from "./flags";
import { DEFAULT_KNOBS } from "./knobs";
import { schoolPolicy } from "./schools";
import { SIM_SEED, fightSeed } from "./tiers";

const HALLS = 10;

export type Night3Cell = {
  stage: number;
  games: number;
  wins: number;
  handSum: number;
};

export type Night3Row = {
  id: string;
  label: string;
  school: WeaponId;
  cells: Night3Cell[];
};

export type Night3Pair = {
  id: string;
  label: string;
  on: Night3Row;
  off: Night3Row;
};

export type Night3Data = {
  games: number;
  pairs: Night3Pair[];
  poison: Night3Row[];
};

type Spec = { id: string; label: string; school: WeaponId; stamp?: FightStamp };

function blank(): Night3Cell[] {
  return Array.from({ length: HALLS }, (_, i) => ({ stage: i + 1, games: 0, wins: 0, handSum: 0 }));
}

function runSpec(spec: Spec, games: number): Night3Row {
  const policy = schoolPolicy(spec.school, FLAGS_ON);
  const cells = blank();
  const run = freshRun(spec.school, SIM_SEED + spec.id.length * 17);
  for (let stage = 1; stage <= HALLS; stage++) {
    const cell = cells[stage - 1]!;
    for (let i = 0; i < games; i++) {
      const opened = openHall(run, stage, DEFAULT_KNOBS, run.hpMax);
      opened.stamp = spec.stamp;
      const fight = fightSample(opened, policy, fightSeed(stage, i, spec.id.charCodeAt(0)), DEFAULT_KNOBS);
      cell.games += 1;
      if (fight.win) cell.wins += 1;
      cell.handSum += fight.hands;
    }
  }
  return { id: spec.id, label: spec.label, school: spec.school, cells };
}

function pair(id: string, label: string, school: WeaponId, stamp: FightStamp, games: number): Night3Pair {
  return {
    id,
    label,
    on: runSpec({ id: `${id}-on`, label: `${label}·有`, school, stamp }, games),
    off: runSpec({ id: `${id}-off`, label: `${label}·无`, school }, games),
  };
}

function bond(id: string, label: string, school: WeaponId, party: CompanionId[], games: number): Night3Pair {
  return pair(id, label, school, { party }, games);
}

export function runNight3Role(games = 10): Night3Pair[] {
  return [
    pair("staker", "桩师队（棍）", "staff", { professions: { sapper: "staker" }, advance: true }, games),
    pair("diviner", "相士队（亮招）", "saber", { professions: { watch: "diviner" }, advance: true, mark: true, see: true }, games),
    pair("gambler", "赌徒队（加注）", "saber", { professions: { watch: "gambler" }, wager: true }, games),
    bond("warm", "缘分·温补", "palm", ["baimenghe", "zhounuanxiang"], games),
    bond("healerkill", "缘分·医杀", "palm", ["baimenghe", "lishuangxing"], games),
    bond("nightfrost", "缘分·夜霜", "saber", ["watch", "lishuangxing"], games),
    bond("saberhall", "缘分·刀社", "saber", ["watch", "lvchifeng", "lishuangxing"], games),
  ];
}

export function runNight3Poison(games = 10): Night3Row[] {
  const school: WeaponId = "saber";
  return [
    runSpec({ id: "poison-off", label: "无毒件", school }, games),
    runSpec({ id: "cuandu", label: "淬毒在囊", school, stamp: { bag: [{ id: "cuandu", n: 1 }] } }, games),
    runSpec({ id: "dujing", label: "毒经在囊", school, stamp: { bag: [{ id: "dujing", n: 1 }] } }, games),
    runSpec({ id: "dugong", label: "毒功在囊", school, stamp: { bag: [{ id: "dugong", n: 1 }] } }, games),
  ];
}

export function runNight3(games = 10, poison = false): Night3Data {
  return { games, pairs: runNight3Role(games), poison: poison ? runNight3Poison(games) : [] };
}
