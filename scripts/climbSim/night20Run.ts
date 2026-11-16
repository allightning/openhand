import { gauntletFieldMate } from "../../src/combatLab/gauntlet";
import { labEnemy } from "../../src/game/labContent";
import {
  CLIMB_MARKET_ADEPT,
  CLIMB_MARKET_COMMON,
  climbHallPot,
} from "../../src/game/climbCaps";
import { CARD_REGISTRY } from "../../src/game/content/cards";
import { climbWaveBattleHp } from "../../src/game/foeCatalog";
import { breakStarterDeck } from "../../src/game/rogueCards";
import { breakRewardCardPool } from "../../src/game/rules/rewardRules";
import type { CardId, WeaponId } from "../../src/game/types";
import { freshRun, openHall, type OpenedHall } from "./boot";
import { fightSample, type FightResult } from "./fight";
import { FLAGS_ON } from "./flags";
import { DEFAULT_KNOBS } from "./knobs";
import { growthOf } from "./night6Run";
import { headsOf, hpOf } from "./night7Run";
import { injectForSchool } from "./night8Run";
import { JAG_TARGET, stampFor, trioPolicy, withNight9 } from "./night10Run";
import { withChase } from "./night11Run";
import { withDumpMiss } from "./night12Run";
import type { Policy } from "./policy";
import { mulberry32 } from "./rng";
import { schoolPolicy } from "./schools";
import { SIM_SEED, fightSeed } from "./tiers";

const SCHOOL: WeaponId = "saber";
const GAMES = 20;

export type Night20Plan = {
  stage: number;
  reward: CardId[];
  shop: CardId[];
  ult: CardId | null;
  pot: number;
  budget: number;
  oldIds: CardId[];
};

export type Night20Row = {
  stage: number;
  enemy: string;
  games: number;
  wins: number;
  handSum: number;
  dmgTaken: number;
  dmgDealt: number;
  foeHp: number;
  waveHp: number;
  jag: number;
  hit: boolean;
  plan: Night20Plan;
};

export type Night20Data = { plans: Night20Plan[]; rows: Night20Row[] };

function policyOf(stage: number): Policy {
  const lead = gauntletFieldMate(SCHOOL);
  const solo = withDumpMiss(withChase(withNight9(schoolPolicy(SCHOOL, FLAGS_ON))));
  const trio = withDumpMiss(withChase(trioPolicy(lead)));
  return headsOf(stage) > 1 ? trio : solo;
}

function rarityOf(id: CardId): "common" | "adept" | "supreme" | null {
  const rarity = CARD_REGISTRY[id]?.rarity;
  if (rarity === "common" || rarity === "adept" || rarity === "supreme") return rarity;
  return null;
}

function poolAt(cleared: number): CardId[] {
  const run = freshRun(SCHOOL, SIM_SEED);
  return breakRewardCardPool({ ...run, stage: cleared + 1, school: SCHOOL });
}

function takeUnheld(bag: CardId[], held: Set<CardId>, n: number, rng: () => number): CardId[] {
  const left = bag.filter((id) => !held.has(id));
  const out: CardId[] = [];
  for (let i = 0; i < n && left.length; i++) {
    const id = left.splice(Math.floor(rng() * left.length), 1)[0]!;
    held.add(id);
    out.push(id);
  }
  return out;
}

/** 打完 1..stage-1 馆之后手里多出来的牌。同名只进一次，配方再 ×3。 */
export function productPlan(stage: number): Night20Plan {
  const held = new Set<CardId>(breakStarterDeck(SCHOOL));
  const rng = mulberry32(SIM_SEED + 20);
  const reward: CardId[] = [];
  let pot = 0;
  let budget = 0;
  const shop: CardId[] = [];
  for (let cleared = 1; cleared < stage; cleared++) {
    const pool = poolAt(cleared);
    reward.push(
      ...takeUnheld(pool.filter((id) => rarityOf(id) === "common"), held, 2, rng),
      ...takeUnheld(pool.filter((id) => rarityOf(id) === "adept"), held, 1, rng),
    );
    pot += climbHallPot(cleared);
    budget += Math.floor(climbHallPot(cleared) / 2);
    const shopPool = poolAt(cleared);
    const buy = (price: number, rarity: "common" | "adept") => {
      const bag = shopPool.filter((id) => rarityOf(id) === rarity && !held.has(id));
      while (budget >= price && bag.length) {
        const id = bag.splice(Math.floor(rng() * bag.length), 1)[0]!;
        budget -= price;
        held.add(id);
        shop.push(id);
      }
    };
    buy(CLIMB_MARKET_COMMON, "common");
    buy(CLIMB_MARKET_ADEPT, "adept");
  }
  let ult: CardId | null = null;
  if (stage >= 8) {
    const ults = poolAt(stage - 1).filter((id) => rarityOf(id) === "supreme" && !held.has(id));
    ult = ults[0] ?? null;
    if (ult) held.add(ult);
  }
  const probe = freshRun(SCHOOL, SIM_SEED);
  const oldIds = [...new Set(injectForSchool(probe, stage, SCHOOL))];
  return { stage, reward, shop, ult, pot, budget, oldIds };
}

function waveList(opened: OpenedHall): string[] {
  return [opened.waveEnemyId, ...(opened.waveQueue ?? [])].filter((id): id is NonNullable<typeof id> => Boolean(id));
}

function waveHpOf(opened: OpenedHall): number {
  const mul = opened.rc.tuning.enemyHpMul;
  let sum = 0;
  for (const id of waveList(opened)) {
    const def = labEnemy(id, opened.rc);
    sum += climbWaveBattleHp(id, opened.stage, def.hp, mul);
  }
  return sum;
}

function playStage(stage: number, plan: Night20Plan): Night20Row {
  const grade = growthOf(stage).grade;
  const hp = hpOf(stage);
  const lead = gauntletFieldMate(SCHOOL);
  const ids = [...plan.reward, ...plan.shop, ...(plan.ult ? [plan.ult] : [])];
  const stamp = stampFor(lead, stage, ids, {}, false);
  const run = freshRun(SCHOOL, SIM_SEED + stage * 19 + grade);
  run.weaponId = `${SCHOOL}-a-${grade}`;
  run.mateWeapons = { ...run.mateWeapons, [lead]: run.weaponId };
  const policy = policyOf(stage);
  const salt = grade + 3;
  const fights: FightResult[] = [];
  let enemy = "";
  let foeHp = 0;
  let waveHp = 0;
  for (let i = 0; i < GAMES; i++) {
    const opened = openHall(run, stage, DEFAULT_KNOBS, hp);
    opened.stamp = stamp;
    if (!enemy) enemy = opened.enemyName;
    const fight = fightSample(opened, policy, fightSeed(stage, i, salt), DEFAULT_KNOBS);
    if (!foeHp) foeHp = fight.foeMaxHp;
    if (!waveHp) waveHp = waveHpOf(opened);
    fights.push(fight);
  }
  const wins = fights.filter((f) => f.win).length;
  const jag = JAG_TARGET[stage]?.floor ?? 0;
  return {
    stage,
    enemy,
    games: fights.length,
    wins,
    handSum: fights.reduce((n, f) => n + f.hands, 0),
    dmgTaken: fights.reduce((n, f) => n + f.damageTaken, 0),
    dmgDealt: fights.reduce((n, f) => n + f.dmgDealt, 0),
    foeHp,
    waveHp,
    jag,
    hit: fights.length > 0 && wins / fights.length + 1e-9 >= jag,
    plan,
  };
}

export function runNight20(): Night20Data {
  const plans = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(productPlan);
  return { plans, rows: plans.map((plan) => playStage(plan.stage, plan)) };
}

/** 十八班旧尺胜率。馆 2 是 40 局，其余 20 局。 */
export const OLD_WIN = [0, 0.9, 0.425, 0.45, 0.5, 0.6, 0.1, 0.8, 0.1, 0, 0];
