import { gauntletFieldMate } from "../../src/combatLab/gauntlet";
import { breakStarterDeck } from "../../src/game/rogueCards";
import type { CardId, CompanionId, WeaponId } from "../../src/game/types";
import type { FightStamp } from "./boot";
import { freshRun, openHall } from "./boot";
import { fightSample, type FightResult } from "./fight";
import { FLAGS_ON } from "./flags";
import { DEFAULT_KNOBS, type ClimbKnobs } from "./knobs";
import { growthOf } from "./night6Run";
import { headsOf, hpOf } from "./night7Run";
import { injectForSchool } from "./night8Run";
import { extras, JAG_TARGET, stampFor, trioPolicy, withNight9 } from "./night10Run";
import { withChase } from "./night11Run";
import { withDumpMiss } from "./night12Run";
import type { Policy } from "./policy";
import { schoolPolicy } from "./schools";
import { SIM_SEED, fightSeed } from "./tiers";

const SCHOOL: WeaponId = "saber";
const BAI: CompanionId = "baimenghe";
const HUO: CompanionId = "huochangchuan";
const P1_GAMES = 10;
const P2_GAMES = 20;
const P3_GAMES = 10;

export type Night16PierceRow = {
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

export type Night16GradeRow = {
  arm: string;
  stage: number;
  enemy: string;
  games: number;
  wins: number;
  dmgDealt: number;
  dmgTaken: number;
  jag: number;
  hit: boolean;
};

export type Night16KnobRow = {
  arm: string;
  stage: number;
  enemy: string;
  hitMul: number;
  enemyHpKnob: number;
  games: number;
  wins: number;
  handSum: number;
  dmgDealt: number;
  dmgTaken: number;
  jag: number;
  hit: boolean;
};

export type Night16Data = {
  pierce: Night16PierceRow[];
  grade: Night16GradeRow[];
  knobs: Night16KnobRow[];
};

function leadOf(): CompanionId {
  return gauntletFieldMate(SCHOOL);
}

function policyOf(lead: CompanionId, stage: number): Policy {
  const solo = withDumpMiss(withChase(withNight9(schoolPolicy(SCHOOL, FLAGS_ON))));
  const trio = withDumpMiss(withChase(trioPolicy(lead)));
  return headsOf(stage) > 1 ? trio : solo;
}

function sum(fights: FightResult[]) {
  const losses = fights.filter((f) => !f.win);
  return {
    games: fights.length,
    wins: fights.length - losses.length,
    handSum: fights.reduce((n, f) => n + f.hands, 0),
    dmgTaken: fights.reduce((n, f) => n + f.damageTaken, 0),
    dmgDealt: fights.reduce((n, f) => n + f.dmgDealt, 0),
    bleed: fights.reduce((n, f) => n + f.bleedTick, 0),
    poison: fights.reduce((n, f) => n + f.poisonTick, 0),
    pierce: fights.reduce((n, f) => n + f.pierceHit, 0),
    losses: losses.length,
    variant: fights[0]?.foeVariant ?? "无",
  };
}

function playN(
  stage: number,
  games: number,
  policy: Policy,
  stamp: FightStamp,
  fightSalt: number,
  opt?: { grade?: number; hp?: number; knobs?: ClimbKnobs },
): { fights: FightResult[]; enemy: string; hitMul: number } {
  const grade = opt?.grade ?? growthOf(stage).grade;
  const hp = opt?.hp ?? hpOf(stage);
  const knobs = opt?.knobs ?? DEFAULT_KNOBS;
  const run = freshRun(SCHOOL, SIM_SEED + stage * 19 + grade);
  const lead = leadOf();
  run.weaponId = `${SCHOOL}-a-${grade}`;
  run.mateWeapons = { ...run.mateWeapons, [lead]: run.weaponId };
  const fights: FightResult[] = [];
  let enemy = "";
  let hitMul = 0;
  for (let i = 0; i < games; i++) {
    const opened = openHall(run, stage, knobs, hp);
    opened.stamp = stamp;
    if (!enemy) enemy = opened.enemyName;
    if (!hitMul) hitMul = opened.enemyHitMul ?? 0;
    fights.push(fightSample(opened, policy, fightSeed(stage, i, fightSalt), knobs));
  }
  return { fights, enemy, hitMul };
}

function pierceMinds(lead: CompanionId): NonNullable<FightStamp["mateMinds"]> {
  return { [lead]: ["pojia"], [BAI]: ["pojia"], [HUO]: ["pojia"] };
}

/** P1：破甲心法 + 裂石外功，盐对齐十四班淬毒组。 */
function pierceSpec(stage: number): Night16PierceRow {
  const lead = leadOf();
  const probe = freshRun(SCHOOL, SIM_SEED);
  const { extra, mates } = extras(probe, stage);
  const stamp = stampFor(lead, stage, extra, mates, stage >= 6, 0);
  stamp.techniques = ["lieshi"];
  stamp.mateMinds = pierceMinds(lead);
  const { fights, enemy } = playN(
    stage,
    P1_GAMES,
    policyOf(lead, stage),
    stamp,
    310 + stage + 7 + extra.length,
  );
  const t = sum(fights);
  return {
    id: "破甲+裂石",
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

function runPierce(): Night16PierceRow[] {
  return [4, 6, 9].map(pierceSpec);
}

function grade3Stamp(
  lead: CompanionId,
  extra: CardId[],
  mates: Partial<Record<CompanionId, CardId[]>>,
): FightStamp {
  return {
    extraIds: extra.length ? extra : undefined,
    extraByMate: mates,
    partyHp: 140,
    mateWeapons: { [lead]: `${SCHOOL}-a-3`, [BAI]: "palm-a-3", [HUO]: "spear-a-3" },
    party: [lead, BAI, HUO],
    mateDecks: { [BAI]: breakStarterDeck("palm"), [HUO]: breakStarterDeck("spear") },
  };
}

/** P2：馆 5 档 3 前移。盐 20 对齐十三班散点。 */
function runGrade(): Night16GradeRow[] {
  const lead = leadOf();
  const probe = freshRun(SCHOOL, SIM_SEED);
  const extra = injectForSchool(probe, 7, SCHOOL);
  const mates = {
    [BAI]: injectForSchool(probe, 7, "palm"),
    [HUO]: injectForSchool(probe, 7, "spear"),
  };
  const stamp = grade3Stamp(lead, extra, mates);
  const { fights, enemy } = playN(5, P2_GAMES, policyOf(lead, 5), stamp, 20, { grade: 3, hp: 140 });
  const t = sum(fights);
  const jag = JAG_TARGET[5]?.floor ?? 0;
  return [
    {
      arm: "档3前移",
      stage: 5,
      enemy,
      games: t.games,
      wins: t.wins,
      dmgDealt: t.dmgDealt,
      dmgTaken: t.dmgTaken,
      jag,
      hit: t.games > 0 && t.wins / t.games + 1e-9 >= jag,
    },
  ];
}

/** P3：馆 6 敌侧两臂。盐 0 龟谱，对局盐对齐十五班扫描。 */
function knobArm(arm: string, knobs: ClimbKnobs): Night16KnobRow {
  const lead = leadOf();
  const probe = freshRun(SCHOOL, SIM_SEED);
  const { extra, mates } = extras(probe, 6);
  const stamp = stampFor(lead, 6, extra, mates, true, 0);
  const { fights, enemy, hitMul } = playN(6, P3_GAMES, policyOf(lead, 6), stamp, 706, {
    knobs,
  });
  const t = sum(fights);
  const jag = JAG_TARGET[6]?.floor ?? 0;
  return {
    arm,
    stage: 6,
    enemy,
    hitMul,
    enemyHpKnob: knobs.enemyHp,
    games: t.games,
    wins: t.wins,
    handSum: t.handSum,
    dmgDealt: t.dmgDealt,
    dmgTaken: t.dmgTaken,
    jag,
    hit: t.games > 0 && t.wins / t.games + 1e-9 >= jag,
  };
}

function runKnobs(): Night16KnobRow[] {
  return [
    knobArm("A 敌伤系数 0.6", { ...DEFAULT_KNOBS, enemyHitMul: 0.6 }),
    knobArm("B 敌血 −15%", { ...DEFAULT_KNOBS, enemyHp: 0.85 }),
  ];
}

export function runNight16(): Night16Data {
  return {
    pierce: runPierce(),
    grade: runGrade(),
    knobs: runKnobs(),
  };
}
