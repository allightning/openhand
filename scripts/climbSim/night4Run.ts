import * as caps from "../../src/game/climbCaps";
import { canPlay } from "../../src/game/sim";
import type { CardId, WeaponId } from "../../src/game/types";
import { freshRun, openHall, type FightStamp } from "./boot";
import { fightSample, type FightResult } from "./fight";
import { FLAGS_ON } from "./flags";
import { DEFAULT_KNOBS, type ClimbKnobs } from "./knobs";
import type { Policy } from "./policy";
import { schoolPolicy } from "./schools";
import { SIM_SEED, fightSeed } from "./tiers";

const HALLS = 10;
const ELITE_FROM = 6;
const SCHOOL: WeaponId = "saber";
const THIN: CardId[] = ["cut", "bleedcut", "advance"];

export type Night4Cell = {
  stage: number;
  games: number;
  wins: number;
  handSum: number;
  dmgTaken: number;
  dmgDealt: number;
  armed: number;
  dismantle: number;
  bind: number;
  read: number;
  swaps: number;
};

export type Night4Row = {
  id: string;
  label: string;
  cells: Night4Cell[];
};

export type Night4Data = {
  games: number;
  windows: boolean;
  capKeys: string[];
  elite: { on: Night4Row; off: Night4Row };
  read: { on: Night4Row; off: Night4Row };
  scatter: Night4Row;
};

function blank(): Night4Cell[] {
  return Array.from({ length: HALLS }, (_, i) => ({
    stage: i + 1,
    games: 0,
    wins: 0,
    handSum: 0,
    dmgTaken: 0,
    dmgDealt: 0,
    armed: 0,
    dismantle: 0,
    bind: 0,
    read: 0,
    swaps: 0,
  }));
}

function add(cell: Night4Cell, fight: FightResult): void {
  cell.games += 1;
  if (fight.win) cell.wins += 1;
  cell.handSum += fight.hands;
  cell.dmgTaken += fight.damageTaken;
  cell.dmgDealt += fight.dmgDealt;
  if (fight.foeArmed) cell.armed += 1;
  cell.dismantle += fight.foeDismantle;
  cell.bind += fight.foeBind;
  cell.read += fight.foeRead;
  cell.swaps += fight.swaps;
}

export function capWindowKeys(): string[] {
  return Object.keys(caps).filter((k) => /FOE.*WINDOW|WINDOW.*P|FOE_P_|FOE_READ|FOE_BIND|FOE_DISMANTLE/i.test(k));
}

function thinPolicy(): Policy {
  const base = schoolPolicy(SCHOOL, FLAGS_ON);
  return {
    ...base,
    id: "thin-saber",
    label: "单招流（刀 2 攻）",
    pick(b, rc) {
      for (const id of ["cut", "bleedcut"] as CardId[]) {
        const card = b.hand.find((c) => c.defId === id && canPlay(b, c.uid, rc).ok);
        if (card) return card.uid;
      }
      const step = b.hand.find((c) => c.defId === "advance" && canPlay(b, c.uid, rc).ok);
      return step?.uid ?? null;
    },
  };
}

export function runRow(
  id: string,
  label: string,
  games: number,
  from: number,
  to: number,
  knobs: ClimbKnobs,
  stamp: FightStamp,
  policy: Policy,
  rawLadder = false,
): Night4Row {
  const cells = blank();
  const run = freshRun(SCHOOL, SIM_SEED + id.length * 19);
  for (let stage = from; stage <= to; stage++) {
    const cell = cells[stage - 1]!;
    for (let i = 0; i < games; i++) {
      const opened = openHall(run, stage, knobs, run.hpMax, rawLadder);
      opened.stamp = { ...stamp, foeStage: stamp.foeStage ?? stage };
      add(cell, fightSample(opened, policy, fightSeed(stage, i, id.charCodeAt(0)), knobs));
    }
  }
  return { id, label, cells };
}

const KIT: FightStamp = { foeRound: 1 };

export function runNight4P2(games: number, rawLadder = false): Night4Row {
  return runRow("scatter", "刀配装满血", games, 1, HALLS, DEFAULT_KNOBS, {}, schoolPolicy(SCHOOL, FLAGS_ON), rawLadder);
}

export function runNight4P1(games: number): Pick<Night4Data, "elite" | "read"> {
  const off: ClimbKnobs = { ...DEFAULT_KNOBS, foeWindowP: 0 };
  const on = DEFAULT_KNOBS;
  const policy = schoolPolicy(SCHOOL, FLAGS_ON);
  const thin = thinPolicy();
  return {
    elite: {
      on: runRow("win-on", "敌窗开", games, ELITE_FROM, HALLS, on, KIT, policy),
      off: runRow("win-off", "敌窗关 p=0", games, ELITE_FROM, HALLS, off, KIT, policy),
    },
    read: {
      on: runRow("read-on", "读破·单招流·开", games, ELITE_FROM, HALLS, on, { ...KIT, thinIds: THIN }, thin),
      off: runRow("read-off", "读破·单招流·关", games, ELITE_FROM, HALLS, off, { ...KIT, thinIds: THIN }, thin),
    },
  };
}

export function runNight4(games: number, windows: boolean): Night4Data {
  const scatter = runNight4P2(games);
  const p1 = windows
    ? runNight4P1(games)
    : {
        elite: { on: { id: "win-on", label: "敌窗开", cells: blank() }, off: { id: "win-off", label: "敌窗关 p=0", cells: blank() } },
        read: { on: { id: "read-on", label: "读破·单招流·开", cells: blank() }, off: { id: "read-off", label: "读破·单招流·关", cells: blank() } },
      };
  return { games, windows, capKeys: capWindowKeys(), scatter, ...p1 };
}
