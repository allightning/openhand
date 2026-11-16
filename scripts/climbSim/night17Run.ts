import { gauntletFieldMate } from "../../src/combatLab/gauntlet";
import { CARD_REGISTRY } from "../../src/game/content/cards";
import { breakStarterDeck } from "../../src/game/rogueCards";
import { breakRewardCardPool } from "../../src/game/rules/rewardRules";
import type { CardId, CompanionId, WeaponId } from "../../src/game/types";
import type { FightStamp } from "./boot";
import { freshRun, openHall } from "./boot";
import { fightSample, type FightResult } from "./fight";
import { envTagForStage, FLAGS_ON } from "./flags";
import { DEFAULT_KNOBS, type ClimbKnobs } from "./knobs";
import { growthOf } from "./night6Run";
import { headsOf, hpOf } from "./night7Run";
import { injectForSchool } from "./night8Run";
import { extras, JAG_TARGET, stampFor, trioPolicy, withNight9 } from "./night10Run";
import { withChase } from "./night11Run";
import { withDumpMiss } from "./night12Run";
import type { Policy } from "./policy";
import { mulberry32 } from "./rng";
import { schoolPolicy } from "./schools";
import { SIM_SEED, fightSeed } from "./tiers";

const SCHOOL: WeaponId = "saber";
const BAI: CompanionId = "baimenghe";
const HUO: CompanionId = "huochangchuan";
const GAMES = 20;

/** 馆 1 奖励短名单候选。正式名单等 NUMGEN14。纵步 / 换位现行门在 fought≥4。 */
export const SHORTLIST: Record<"输出" | "位移" | "破挡", CardId[]> = {
  输出: ["saberBleed", "rift", "drunkFist"],
  位移: ["stepSaber", "advance2", "sidestep"],
  破挡: ["bleedcut", "statusSaber2", "expose"],
};

export type Night17BaseRow = {
  stage: number;
  enemy: string;
  env: string;
  hitMul: number;
  games: number;
  wins: number;
  handSum: number;
  dmgTaken: number;
  dmgDealt: number;
  foeHp: number;
  segN: number;
  jag: number;
  hit: boolean;
};

export type Night17ArmRow = {
  arm: string;
  stage: number;
  enemy: string;
  injected: string;
  hitMul: number;
  enemyHpKnob: number;
  games: number;
  wins: number;
  handSum: number;
  dmgTaken: number;
  dmgDealt: number;
  foeHp: number;
  segN: number;
  jag: number;
  hit: boolean;
};

export type Night17Data = {
  base: Night17BaseRow[];
  knife1: Night17ArmRow[];
  knife23: Night17ArmRow[];
  knife4: Night17ArmRow[];
  knife5: Night17ArmRow[];
};

function leadOf(): CompanionId {
  return gauntletFieldMate(SCHOOL);
}

function policyOf(lead: CompanionId, stage: number): Policy {
  const solo = withDumpMiss(withChase(withNight9(schoolPolicy(SCHOOL, FLAGS_ON))));
  const trio = withDumpMiss(withChase(trioPolicy(lead)));
  return headsOf(stage) > 1 ? trio : solo;
}

function pack(fights: FightResult[], enemy: string, hitMul: number) {
  const games = fights.length;
  const wins = fights.filter((f) => f.win).length;
  return {
    enemy,
    hitMul,
    games,
    wins,
    handSum: fights.reduce((n, f) => n + f.hands, 0),
    dmgTaken: fights.reduce((n, f) => n + f.damageTaken, 0),
    dmgDealt: fights.reduce((n, f) => n + f.dmgDealt, 0),
    foeHp: fights.reduce((n, f) => n + f.foeMaxHp, 0),
    segN: fights.reduce((n, f) => n + f.segN, 0),
  };
}

function playN(
  stage: number,
  games: number,
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
  const policy = policyOf(lead, stage);
  for (let i = 0; i < games; i++) {
    const opened = openHall(run, stage, knobs, hp);
    opened.stamp = stamp;
    if (!enemy) enemy = opened.enemyName;
    if (!hitMul) hitMul = opened.enemyHitMul ?? 0;
    fights.push(fightSample(opened, policy, fightSeed(stage, i, fightSalt), knobs));
  }
  return { fights, enemy, hitMul };
}

function rowOf(
  arm: string,
  stage: number,
  injected: string,
  stamp: FightStamp,
  salt: number,
  opt?: { grade?: number; hp?: number; knobs?: ClimbKnobs },
): Night17ArmRow {
  const { fights, enemy, hitMul } = playN(stage, GAMES, stamp, salt, opt);
  const t = pack(fights, enemy, hitMul);
  const jag = JAG_TARGET[stage]?.floor ?? 0;
  return {
    arm,
    stage,
    injected,
    enemyHpKnob: opt?.knobs?.enemyHp ?? 1,
    ...t,
    jag,
    hit: t.games > 0 && t.wins / t.games + 1e-9 >= jag,
  };
}

function runBase(): Night17BaseRow[] {
  const lead = leadOf();
  const probe = freshRun(SCHOOL, SIM_SEED);
  const rows: Night17BaseRow[] = [];
  for (let stage = 1; stage <= 10; stage++) {
    const { extra, mates } = extras(probe, stage);
    const stamp = stampFor(lead, stage, extra, mates, false);
    const salt = growthOf(stage).grade + 3;
    const { fights, enemy, hitMul } = playN(stage, GAMES, stamp, salt);
    const t = pack(fights, enemy, hitMul);
    const jag = JAG_TARGET[stage]?.floor ?? 0;
    rows.push({
      stage,
      env: envTagForStage(stage, true) ?? "无",
      ...t,
      jag,
      hit: t.games > 0 && t.wins / t.games + 1e-9 >= jag,
    });
  }
  return rows;
}

type Rarity = "common" | "adept";

function poolBag(stage: number, rarity: Rarity): CardId[] {
  const run = freshRun(SCHOOL, SIM_SEED);
  const held = new Set<CardId>(breakStarterDeck(SCHOOL));
  return [
    ...new Set(
      breakRewardCardPool({ ...run, stage, school: SCHOOL }).filter(
        (id) => CARD_REGISTRY[id]?.rarity === rarity && !held.has(id),
      ),
    ),
  ];
}

function drawIds(stage: number, wants: [Rarity, number][], salt: number): CardId[] {
  const rng = mulberry32(SIM_SEED + stage * 97 + SCHOOL.charCodeAt(0) * 13 + salt);
  const bags = new Map<Rarity, CardId[]>();
  const out: CardId[] = [];
  for (const [rarity, n] of wants) {
    for (let i = 0; i < n; i++) {
      let bag = bags.get(rarity);
      if (!bag?.length) {
        bag = poolBag(stage, rarity);
        bags.set(rarity, bag);
      }
      if (!bag.length) break;
      out.push(bag.splice(Math.floor(rng() * bag.length), 1)[0]!);
    }
  }
  return out;
}

function shortAdept(salt: number): CardId {
  const bag = [...new Set([...SHORTLIST.输出, ...SHORTLIST.位移, ...SHORTLIST.破挡])];
  const rng = mulberry32(SIM_SEED + 2 * 97 + salt);
  return bag[Math.floor(rng() * bag.length)]!;
}

function rewardStamp(lead: CompanionId, ids: CardId[]): FightStamp {
  const probe = freshRun(SCHOOL, SIM_SEED);
  const { mates } = extras(probe, 2);
  return stampFor(lead, 2, ids, mates, false);
}

function runKnife1(): Night17ArmRow[] {
  const lead = leadOf();
  const commons = drawIds(2, [["common", 2]], 0);
  const poolAdept = drawIds(2, [["adept", 1]], 1);
  const listed = shortAdept(1);
  const control = [...commons, ...poolAdept];
  const treat = [...commons, listed];
  return [
    rowOf("真实奖励 2凡1精", 2, control.join(" "), rewardStamp(lead, control), 40),
    rowOf("短名单 2凡1精", 2, treat.join(" "), rewardStamp(lead, treat), 40),
  ];
}

function grade3Stamp(lead: CompanionId, stage: number): { stamp: FightStamp; note: string } {
  const probe = freshRun(SCHOOL, SIM_SEED);
  const extra = injectForSchool(probe, 7, SCHOOL);
  const mates = {
    [BAI]: injectForSchool(probe, 7, "palm"),
    [HUO]: injectForSchool(probe, 7, "spear"),
  };
  const stamp: FightStamp = {
    extraIds: extra,
    extraByMate: mates,
    partyHp: 140,
    mateWeapons: { [lead]: `${SCHOOL}-a-3`, [BAI]: "palm-a-3", [HUO]: "spear-a-3" },
    party: [lead, BAI, HUO],
    mateDecks: { [BAI]: breakStarterDeck("palm"), [HUO]: breakStarterDeck("spear") },
  };
  if (stage >= 6) {
    stamp.foeRound = 1;
    stamp.foeStage = stage;
    stamp.foeSalt = 0;
  }
  return { stamp, note: extra.join(" ") };
}

function runKnife23(): Night17ArmRow[] {
  const lead = leadOf();
  const rows: Night17ArmRow[] = [];
  for (const stage of [4, 5, 6]) {
    const { stamp, note } = grade3Stamp(lead, stage);
    if (stage !== 5) {
      rows.push(rowOf("档3前移", stage, note, stamp, 20, { grade: 3, hp: 140 }));
      continue;
    }
    rows.push(
      rowOf("A 敌血 +15%", stage, note, stamp, 20, {
        grade: 3,
        hp: 140,
        knobs: { ...DEFAULT_KNOBS, enemyHp: 1.15 },
      }),
    );
    rows.push(
      rowOf("B 敌伤系数 0.85", stage, note, stamp, 20, {
        grade: 3,
        hp: 140,
        knobs: { ...DEFAULT_KNOBS, enemyHitMul: 0.85 },
      }),
    );
  }
  return rows;
}

function runKnife4(): Night17ArmRow[] {
  const lead = leadOf();
  const { stamp, note } = grade3Stamp(lead, 6);
  return [
    rowOf("系数 0.6 + 血 ×0.85", 6, note, stamp, 20, {
      grade: 3,
      hp: 140,
      knobs: { ...DEFAULT_KNOBS, enemyHitMul: 0.6, enemyHp: 0.85 },
    }),
  ];
}

function runKnife5(): Night17ArmRow[] {
  const lead = leadOf();
  const probe = freshRun(SCHOOL, SIM_SEED);
  const rows: Night17ArmRow[] = [];
  for (const stage of [8, 9, 10]) {
    const { extra, mates } = extras(probe, stage);
    const stamp = stampFor(lead, stage, extra, mates, true, 0);
    rows.push(
      rowOf("血 −10%", stage, extra.join(" "), stamp, 20, {
        knobs: { ...DEFAULT_KNOBS, enemyHp: 0.9 },
      }),
    );
  }
  return rows;
}

export function runNight17(): Night17Data {
  return {
    base: runBase(),
    knife1: runKnife1(),
    knife23: runKnife23(),
    knife4: runKnife4(),
    knife5: runKnife5(),
  };
}
