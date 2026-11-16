import { gauntletFieldMate } from "../../src/combatLab/gauntlet";
import { climbHallGrowth } from "../../src/game/climbCaps";
import { breakStarterDeck } from "../../src/game/rogueCards";
import { canSwap } from "../../src/game/sim";
import type { Battle, CardId, CompanionId, WeaponId } from "../../src/game/types";
import type { FightStamp } from "./boot";
import { freshRun, openHall } from "./boot";
import { fightSample, type FightResult } from "./fight";
import { FLAGS_ON } from "./flags";
import { DEFAULT_KNOBS, type ClimbKnobs } from "./knobs";
import { growthOf, injectFor } from "./night6Run";
import type { Policy } from "./policy";
import { schoolPolicy } from "./schools";
import { SIM_SEED, fightSeed } from "./tiers";

const SCHOOL: WeaponId = "saber";
const BAI: CompanionId = "baimenghe";
const HUO: CompanionId = "huochangchuan";
const HALLS = 10;

/** 锚带中值。读 `climbHallGrowth`：馆 4 起血 140。 */
export function hpOf(stage: number): number {
  return climbHallGrowth(stage).hp;
}

export function headsOf(stage: number): number {
  return stage <= 1 ? 1 : 3;
}

export type Night7Cell = {
  stage: number;
  games: number;
  wins: number;
  handSum: number;
  dmgTaken: number;
  dmgDealt: number;
  swaps: number;
  hp: number;
  heads: number;
  grade: number;
  injected: string[];
  enemy: string;
  armed: number;
  dismantle: number;
  bind: number;
  read: number;
};

export type Night7Window = {
  stage: number;
  on: Night7Cell;
  off: Night7Cell;
};

export type Night7Data = {
  games: number;
  scatter: Night7Cell[];
  windows: Night7Window[];
  reached: string[];
};

function blank(stage: number, injected: string[], enemy: string): Night7Cell {
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
    enemy,
    armed: 0,
    dismantle: 0,
    bind: 0,
    read: 0,
  };
}

function add(cell: Night7Cell, fight: FightResult): void {
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
}

function bagRatio(b: Battle, id: CompanionId): number {
  if (b.active === id) return b.player.hp / Math.max(1, b.player.maxHp);
  const bag = b.bench.find((m) => m.id === id);
  if (!bag) return 0;
  return bag.hp / Math.max(1, bag.maxHp);
}

function trioPolicy(lead: CompanionId): Policy {
  const saber = schoolPolicy(SCHOOL, FLAGS_ON);
  const palm = schoolPolicy("palm", FLAGS_ON);
  const spear = schoolPolicy("spear", FLAGS_ON);
  const play = new Map<CompanionId, Policy>([
    [lead, saber],
    [BAI, palm],
    [HUO, spear],
  ]);
  return {
    ...saber,
    id: "saber-trio",
    label: "刀 + 白孟和 + 霍长川",
    swap(b, rc) {
      const ratio = bagRatio(b, b.active);
      if (ratio < 0.6) {
        const choices = [BAI, HUO]
          .filter((id) => id !== b.active && bagRatio(b, id) > ratio && canSwap(b, id, rc).ok)
          .sort((a, c) => bagRatio(b, c) - bagRatio(b, a) || (a === BAI ? -1 : c === BAI ? 1 : 0));
        return choices[0] ?? null;
      }
      if (b.active !== lead && ratio >= 0.85 && canSwap(b, lead, rc).ok) return lead;
      return null;
    },
    pick(b, rc, rng) {
      return (play.get(b.active) ?? saber).pick(b, rc, rng);
    },
  };
}

function gearStamp(lead: CompanionId, grade: number, heads: number): FightStamp["mateWeapons"] {
  const weapons: FightStamp["mateWeapons"] = { [lead]: `${SCHOOL}-a-${grade}` };
  if (heads > 1) {
    weapons[BAI] = `palm-a-${grade}`;
    weapons[HUO] = `spear-a-${grade}`;
  }
  return weapons;
}

function playStage(
  stage: number,
  games: number,
  policy: Policy,
  stamp: FightStamp,
  knobs: ClimbKnobs,
  salt: number,
): Night7Cell {
  const spec = growthOf(stage);
  const run = freshRun(SCHOOL, SIM_SEED + stage * 19 + spec.grade);
  const lead = gauntletFieldMate(SCHOOL);
  const weapon = `${SCHOOL}-a-${spec.grade}`;
  run.weaponId = weapon;
  run.mateWeapons = { ...run.mateWeapons, [lead]: weapon };
  const cell = blank(stage, stamp.extraIds ?? [], "");
  for (let i = 0; i < games; i++) {
    const opened = openHall(run, stage, knobs, hpOf(stage));
    opened.stamp = stamp;
    if (!cell.enemy) cell.enemy = opened.enemyName;
    add(cell, fightSample(opened, policy, fightSeed(stage, i, salt), knobs));
  }
  return cell;
}

function stampFor(lead: CompanionId, stage: number, extra: CardId[], foe: boolean): FightStamp {
  const spec = growthOf(stage);
  const heads = headsOf(stage);
  const stamp: FightStamp = {
    extraIds: extra.length ? extra : undefined,
    partyHp: hpOf(stage),
    mateWeapons: gearStamp(lead, spec.grade, heads),
  };
  if (heads > 1) {
    stamp.party = [lead, BAI, HUO];
    stamp.mateDecks = {
      [BAI]: breakStarterDeck("palm"),
      [HUO]: breakStarterDeck("spear"),
    };
  }
  if (foe) stamp.foeRound = 1;
  return stamp;
}

function bandHit(cells: Night7Cell[], from: number, to: number, floor: number): boolean {
  const rows = cells.filter((c) => c.stage >= from && c.stage <= to);
  return rows.length > 0 && rows.every((c) => c.games > 0 && c.wins / c.games + 1e-9 >= floor);
}

export function runNight7(games = 20): Night7Data {
  const lead = gauntletFieldMate(SCHOOL);
  const probe = freshRun(SCHOOL, SIM_SEED);
  const solo = schoolPolicy(SCHOOL, FLAGS_ON);
  const trio = trioPolicy(lead);
  const scatter: Night7Cell[] = [];
  for (let stage = 1; stage <= HALLS; stage++) {
    const extra = injectFor(probe, stage);
    const policy = headsOf(stage) > 1 ? trio : solo;
    scatter.push(playStage(stage, games, policy, stampFor(lead, stage, extra, false), DEFAULT_KNOBS, growthOf(stage).grade + 3));
  }
  const reached: string[] = [];
  const halls: number[] = [];
  if (bandHit(scatter, 1, 3, 0.5)) reached.push("1–3");
  if (bandHit(scatter, 4, 6, 0.3)) {
    reached.push("4–6");
    halls.push(6);
  }
  if (bandHit(scatter, 7, 9, 0.15)) {
    reached.push("7–9");
    halls.push(7, 8, 9, 10);
  }
  const off: ClimbKnobs = { ...DEFAULT_KNOBS, foeWindowP: 0 };
  const windows: Night7Window[] = halls.map((stage) => {
    const extra = injectFor(probe, stage);
    const policy = trio;
    const onCell = playStage(stage, games, policy, stampFor(lead, stage, extra, true), DEFAULT_KNOBS, 90);
    const offCell = playStage(stage, games, policy, stampFor(lead, stage, extra, true), off, 90);
    return { stage, on: onCell, off: offCell };
  });
  return { games, scatter, windows, reached };
}
