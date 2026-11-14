import { gauntletFieldMate } from "../../src/combatLab/gauntlet";
import { CARD_REGISTRY } from "../../src/game/content/cards";
import { buildFoeKit, foeKitSeed, kitRng } from "../../src/game/foeArchetype";
import { breakRewardCardPool } from "../../src/game/rules/rewardRules";
import type { CardId, CompanionId, WeaponId } from "../../src/game/types";
import type { FightStamp } from "./boot";
import { freshRun, openHall } from "./boot";
import { fightSample, type FightResult } from "./fight";
import { FLAGS_ON } from "./flags";
import { DEFAULT_KNOBS } from "./knobs";
import { extras, JAG_TARGET, stampFor, trioPolicy, withNight9 } from "./night10Run";
import { withChase } from "./night11Run";
import { withDumpMiss } from "./night12Run";
import { growthOf } from "./night6Run";
import { headsOf, hpOf } from "./night7Run";
import type { Policy } from "./policy";
import { mulberry32 } from "./rng";
import { schoolPolicy } from "./schools";
import { SIM_SEED, fightSeed } from "./tiers";

const SCHOOL: WeaponId = "saber";
const VARIANTS = ["brute-press", "turtle-shell", "skirmish-lane"] as const;
const MATRIX_GAMES = 10;
const PIERCE_GAMES = 10;
const HALL2_GAMES = 20;

export type Night14MatrixRow = {
  stage: number;
  enemy: string;
  variant: string;
  salt: number;
  games: number;
  wins: number;
  handSum: number;
  dmgTaken: number;
  dmgDealt: number;
  jag: number;
  hit: boolean;
};

export type Night14PierceRow = {
  id: string;
  stage: number;
  enemy: string;
  variant: string;
  games: number;
  wins: number;
  dmgDealt: number;
  bleed: number;
  poison: number;
  pierce: number;
};

export type Night14Hall2 = {
  adept: number;
  injected: string[];
  games: number;
  wins: number;
  dmgDealt: number;
  dmgTaken: number;
};

export type Night14Data = {
  matrix: Night14MatrixRow[];
  pierce: Night14PierceRow[];
  hall2: Night14Hall2[];
};

function leadOf(): CompanionId {
  return gauntletFieldMate(SCHOOL);
}

function policyOf(lead: CompanionId, stage: number): Policy {
  const solo = withDumpMiss(withChase(withNight9(schoolPolicy(SCHOOL, FLAGS_ON))));
  const trio = withDumpMiss(withChase(trioPolicy(lead)));
  return headsOf(stage) > 1 ? trio : solo;
}

function bleedId(id: CardId): boolean {
  return (CARD_REGISTRY[id]?.bleed ?? 0) > 0;
}

function doubleBleed(ids: CardId[]): CardId[] {
  const have = ids.filter(bleedId);
  const add: CardId[] = [...have];
  for (const id of ["bleedcut", "saberBleed"] as CardId[]) {
    if (!ids.includes(id) && bleedId(id)) {
      add.push(id);
      break;
    }
  }
  return add.length ? [...ids, ...add] : ids;
}

function saltOf(enemyId: string, stage: number, want: (typeof VARIANTS)[number]): number {
  for (let salt = 0; salt < 80; salt++) {
    const kit = buildFoeKit(
      { stage, enemyId, round: 1, salt, elite: true, seat: stage >= 10 },
      kitRng(foeKitSeed(1, enemyId, salt)),
    );
    if ((kit.foeVariant ?? "").endsWith(`:${want}`)) return salt;
  }
  return 0;
}

function playN(
  stage: number,
  games: number,
  policy: Policy,
  stamp: FightStamp,
  fightSalt: number,
): { fights: FightResult[]; enemy: string } {
  const spec = growthOf(stage);
  const run = freshRun(SCHOOL, SIM_SEED + stage * 19 + spec.grade);
  const lead = leadOf();
  run.weaponId = `${SCHOOL}-a-${spec.grade}`;
  run.mateWeapons = { ...run.mateWeapons, [lead]: run.weaponId };
  const fights: FightResult[] = [];
  let enemy = "";
  for (let i = 0; i < games; i++) {
    const opened = openHall(run, stage, DEFAULT_KNOBS, hpOf(stage));
    opened.stamp = stamp;
    if (!enemy) enemy = opened.enemyName;
    fights.push(fightSample(opened, policy, fightSeed(stage, i, fightSalt), DEFAULT_KNOBS));
  }
  return { fights, enemy };
}

function sum(fights: FightResult[]) {
  return {
    games: fights.length,
    wins: fights.filter((f) => f.win).length,
    handSum: fights.reduce((n, f) => n + f.hands, 0),
    dmgTaken: fights.reduce((n, f) => n + f.damageTaken, 0),
    dmgDealt: fights.reduce((n, f) => n + f.dmgDealt, 0),
    bleed: fights.reduce((n, f) => n + f.bleedTick, 0),
    poison: fights.reduce((n, f) => n + f.poisonTick, 0),
    pierce: fights.reduce((n, f) => n + f.pierceHit, 0),
    variant: fights[0]?.foeVariant ?? "无",
  };
}

function runMatrix(): Night14MatrixRow[] {
  const lead = leadOf();
  const probe = freshRun(SCHOOL, SIM_SEED);
  const rows: Night14MatrixRow[] = [];
  for (let stage = 6; stage <= 10; stage++) {
    const { extra, mates } = extras(probe, stage);
    const policy = policyOf(lead, stage);
    const peek = openHall(freshRun(SCHOOL, SIM_SEED + stage), stage, DEFAULT_KNOBS, hpOf(stage));
    for (const want of VARIANTS) {
      const salt = saltOf(peek.enemyId, stage, want);
      const stamp = stampFor(lead, stage, extra, mates, true, salt);
      const { fights, enemy } = playN(stage, MATRIX_GAMES, policy, stamp, 200 + salt);
      const t = sum(fights);
      const jag = JAG_TARGET[stage]?.floor ?? 0;
      const rate = t.games ? t.wins / t.games : 0;
      rows.push({
        stage,
        enemy,
        variant: t.variant,
        salt,
        games: t.games,
        wins: t.wins,
        handSum: t.handSum,
        dmgTaken: t.dmgTaken,
        dmgDealt: t.dmgDealt,
        jag,
        hit: rate + 1e-9 >= jag,
      });
    }
  }
  return rows;
}

function pierceSpec(
  id: string,
  stage: number,
  extra: CardId[],
  mates: Partial<Record<CompanionId, CardId[]>>,
  poison: boolean,
): Night14PierceRow {
  const lead = leadOf();
  const stamp = stampFor(lead, stage, extra, mates, stage >= 6, 0);
  stamp.usePoison = poison;
  const { fights, enemy } = playN(stage, PIERCE_GAMES, policyOf(lead, stage), stamp, 310 + stage + (poison ? 7 : 0) + extra.length);
  const t = sum(fights);
  return {
    id,
    stage,
    enemy,
    variant: t.variant,
    games: t.games,
    wins: t.wins,
    dmgDealt: t.dmgDealt,
    bleed: t.bleed,
    poison: t.poison,
    pierce: t.pierce,
  };
}

function runPierce(): Night14PierceRow[] {
  const probe = freshRun(SCHOOL, SIM_SEED);
  const out: Night14PierceRow[] = [];
  for (const stage of [4, 6, 9]) {
    const { extra, mates } = extras(probe, stage);
    const doubled = doubleBleed(extra);
    const mates2: Partial<Record<CompanionId, CardId[]>> = {};
    for (const [id, ids] of Object.entries(mates) as [CompanionId, CardId[] | undefined][]) {
      if (ids) mates2[id] = doubleBleed(ids);
    }
    out.push(pierceSpec(`基线`, stage, extra, mates, false));
    out.push(pierceSpec(`裂创加倍`, stage, doubled, mates2, false));
    out.push(pierceSpec(`淬毒`, stage, extra, mates, true));
    out.push(pierceSpec(`两开`, stage, doubled, mates2, true));
  }
  return out;
}

function hall2Inject(n: number): CardId[] {
  const run = freshRun(SCHOOL, SIM_SEED);
  const pool = [
    ...new Set(
      breakRewardCardPool({ ...run, stage: 2, school: SCHOOL }).filter((id) => CARD_REGISTRY[id]?.rarity === "adept"),
    ),
  ];
  const rng = mulberry32(SIM_SEED + 2 * 97 + SCHOOL.charCodeAt(0) * 13);
  const bag = [...pool];
  const out: CardId[] = [];
  for (let i = 0; i < n && bag.length; i++) {
    const j = Math.floor(rng() * bag.length);
    out.push(bag.splice(j, 1)[0]!);
  }
  return out;
}

function hall2Cell(adept: number): Night14Hall2 {
  const lead = leadOf();
  const probe = freshRun(SCHOOL, SIM_SEED);
  const { mates } = extras(probe, 2);
  const ids = hall2Inject(adept);
  const stamp = stampFor(lead, 2, ids, mates, false);
  const { fights } = playN(2, HALL2_GAMES, policyOf(lead, 2), stamp, 40 + adept);
  const t = sum(fights);
  return { adept, injected: ids, games: t.games, wins: t.wins, dmgDealt: t.dmgDealt, dmgTaken: t.dmgTaken };
}

export function runNight14(): Night14Data {
  return {
    matrix: runMatrix(),
    pierce: runPierce(),
    hall2: [hall2Cell(1), hall2Cell(2)],
  };
}
