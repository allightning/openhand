import { gauntletFieldMate } from "../../src/combatLab/gauntlet";
import { ladderEntryForRun } from "../../src/game/rules/ladderRules";
import { labCard } from "../../src/game/labContent";
import { breakStarterDeck } from "../../src/game/rogueCards";
import { canPlay, canSwap } from "../../src/game/sim";
import type { Battle, CardId, CompanionId, WeaponId } from "../../src/game/types";
import type { FightStamp } from "./boot";
import { freshRun, openHall } from "./boot";
import { fightSample, type FightResult } from "./fight";
import { FLAGS_ON } from "./flags";
import { DEFAULT_KNOBS, type ClimbKnobs } from "./knobs";
import { growthOf } from "./night6Run";
import { headsOf, hpOf } from "./night7Run";
import { injectForSchool } from "./night8Run";
import type { Policy } from "./policy";
import { schoolPolicy } from "./schools";
import { SIM_SEED, fightSeed } from "./tiers";

const SCHOOL: WeaponId = "saber";
const BAI: CompanionId = "baimenghe";
const HUO: CompanionId = "huochangchuan";
const HALLS = 10;
const MATE_SCHOOL: Partial<Record<CompanionId, WeaponId>> = {
  baimenghe: "palm",
  huochangchuan: "spear",
};

export type Night9Cell = {
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
  mateInjected: string;
  enemy: string;
  dmgCoef: number;
  armed: number;
  dismantle: number;
  bind: number;
  read: number;
};

export type Night9Window = { stage: number; on: Night9Cell; off: Night9Cell };

export type Night9Data = {
  games: number;
  gate: string;
  scatter: Night9Cell[];
  windows: Night9Window[];
  reached: string[];
};

function blank(stage: number, injected: string[], mateInjected: string, enemy: string): Night9Cell {
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
    armed: 0,
    dismantle: 0,
    bind: 0,
    read: 0,
  };
}

function add(cell: Night9Cell, fight: FightResult): void {
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

function burstPick(inner: Policy, b: Battle, rc: Parameters<Policy["pick"]>[1], rng: () => number): string | null {
  let best: string | null = null;
  let n = -1;
  for (const card of b.hand) {
    if (!canPlay(b, card.uid, rc).ok) continue;
    const def = labCard(card.defId, rc);
    const score = (def.cost ?? 0) * 10 + (def.type === "attack" ? 40 : 0) + (def.damage ?? 0);
    if (score > n) {
      n = score;
      best = card.uid;
    }
  }
  return best ?? inner.pick(b, rc, rng);
}

function pierceUid(b: Battle, rc: Parameters<Policy["pick"]>[1]): string | null {
  if (b.enemyBlock <= 8) return null;
  let best: string | null = null;
  let n = -1;
  for (const card of b.hand) {
    if (!canPlay(b, card.uid, rc).ok) continue;
    const def = labCard(card.defId, rc);
    const pierce = (def.bleed ?? 0) + (def.expose ?? 0);
    if (pierce <= 0) continue;
    const score = pierce * 20 + (def.cost ?? 0);
    if (score > n) {
      n = score;
      best = card.uid;
    }
  }
  return best;
}

function withNight9(inner: Policy): Policy {
  let lastHp = -1;
  let idle = 0;
  let bank = 0;
  let burst = 0;
  let turn = -1;
  return {
    ...inner,
    id: `${inner.id}-n9`,
    label: `${inner.label} · 破挡优先`,
    begin() {
      lastHp = -1;
      idle = 0;
      bank = 0;
      burst = 0;
      turn = -1;
    },
    pick(b, rc, rng) {
      if (turn !== b.turn) {
        turn = b.turn;
        if (lastHp >= 0 && b.enemy.hp >= lastHp) idle += 1;
        else idle = 0;
        lastHp = b.enemy.hp;
        if (bank > 0) {
          bank -= 1;
          if (bank === 0) burst = 1;
        } else if (burst > 0) {
          burst -= 1;
        } else if (b.enemyBlock > 10 || idle >= 3) {
          bank = 2;
        }
      }
      if (bank > 0) return null;
      const pierce = pierceUid(b, rc);
      if (pierce) return pierce;
      if (burst > 0) return burstPick(inner, b, rc, rng);
      return inner.pick(b, rc, rng);
    },
  };
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
  return withNight9({
    ...saber,
    id: "saber-trio-kit",
    label: "刀 + 白孟和拳 + 霍长川枪",
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
  });
}

function gearStamp(lead: CompanionId, grade: number, heads: number): FightStamp["mateWeapons"] {
  const weapons: FightStamp["mateWeapons"] = { [lead]: `${SCHOOL}-a-${grade}` };
  if (heads > 1) {
    weapons[BAI] = `palm-a-${grade}`;
    weapons[HUO] = `spear-a-${grade}`;
  }
  return weapons;
}

function stampFor(
  lead: CompanionId,
  stage: number,
  extra: CardId[],
  mateExtra: Partial<Record<CompanionId, CardId[]>>,
  foe: boolean,
): FightStamp {
  const spec = growthOf(stage);
  const heads = headsOf(stage);
  const stamp: FightStamp = {
    extraIds: extra.length ? extra : undefined,
    extraByMate: heads > 1 ? mateExtra : undefined,
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

function playStage(
  stage: number,
  games: number,
  policy: Policy,
  stamp: FightStamp,
  knobs: ClimbKnobs,
  salt: number,
  mateNote: string,
): Night9Cell {
  const spec = growthOf(stage);
  const run = freshRun(SCHOOL, SIM_SEED + stage * 19 + spec.grade);
  const lead = gauntletFieldMate(SCHOOL);
  const weapon = `${SCHOOL}-a-${spec.grade}`;
  run.weaponId = weapon;
  run.mateWeapons = { ...run.mateWeapons, [lead]: weapon };
  const cell = blank(stage, stamp.extraIds ?? [], mateNote, "");
  cell.dmgCoef = ladderEntryForRun({ ...run, stage }).dmgCoef;
  for (let i = 0; i < games; i++) {
    const opened = openHall(run, stage, knobs, hpOf(stage), true);
    opened.stamp = stamp;
    if (!cell.enemy) cell.enemy = opened.enemyName;
    add(cell, fightSample(opened, policy, fightSeed(stage, i, salt), knobs));
  }
  return cell;
}

function bandHit(cells: Night9Cell[], from: number, to: number, floor: number): boolean {
  const rows = cells.filter((c) => c.stage >= from && c.stage <= to);
  return rows.length > 0 && rows.every((c) => c.games > 0 && c.wins / c.games + 1e-9 >= floor);
}

function mateNote(extra: Partial<Record<CompanionId, CardId[]>>): string {
  const bai = extra[BAI]?.join(" ") || "—";
  const huo = extra[HUO]?.join(" ") || "—";
  return `白 ${bai} / 霍 ${huo}`;
}

export function runNight9(games = 20, gate = ""): Night9Data {
  const lead = gauntletFieldMate(SCHOOL);
  const probe = freshRun(SCHOOL, SIM_SEED);
  const solo = withNight9(schoolPolicy(SCHOOL, FLAGS_ON));
  const trio = trioPolicy(lead);
  const scatter: Night9Cell[] = [];
  for (let stage = 1; stage <= HALLS; stage++) {
    const extra = injectForSchool(probe, stage, SCHOOL);
    const mates: Partial<Record<CompanionId, CardId[]>> = {
      [BAI]: injectForSchool(probe, stage, MATE_SCHOOL[BAI]!),
      [HUO]: injectForSchool(probe, stage, MATE_SCHOOL[HUO]!),
    };
    const policy = headsOf(stage) > 1 ? trio : solo;
    scatter.push(
      playStage(stage, games, policy, stampFor(lead, stage, extra, mates, false), DEFAULT_KNOBS, growthOf(stage).grade + 3, mateNote(mates)),
    );
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
  const windows: Night9Window[] = halls.map((stage) => {
    const extra = injectForSchool(probe, stage, SCHOOL);
    const mates: Partial<Record<CompanionId, CardId[]>> = {
      [BAI]: injectForSchool(probe, stage, MATE_SCHOOL[BAI]!),
      [HUO]: injectForSchool(probe, stage, MATE_SCHOOL[HUO]!),
    };
    const note = mateNote(mates);
    const policy = headsOf(stage) > 1 ? trio : solo;
    const onCell = playStage(stage, games, policy, stampFor(lead, stage, extra, mates, true), DEFAULT_KNOBS, 90, note);
    const offCell = playStage(stage, games, policy, stampFor(lead, stage, extra, mates, true), off, 90, note);
    return { stage, on: onCell, off: offCell };
  });
  return { games, gate, scatter, windows, reached };
}
