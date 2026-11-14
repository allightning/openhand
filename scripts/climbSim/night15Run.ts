import { gauntletFieldMate } from "../../src/combatLab/gauntlet";
import { CARD_REGISTRY } from "../../src/game/content/cards";
import { breakStarterDeck } from "../../src/game/rogueCards";
import { breakRewardCardPool } from "../../src/game/rules/rewardRules";
import type { CardId, CompanionId, WeaponId } from "../../src/game/types";
import type { FightStamp } from "./boot";
import { freshRun, openHall } from "./boot";
import { fightSample, type FightResult } from "./fight";
import { FLAGS_ON } from "./flags";
import { DEFAULT_KNOBS } from "./knobs";
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
const P1_GAMES = 20;
const P2_GAMES = 10;
const P3_GAMES = 10;

type Rarity = "common" | "adept" | "supreme";

export type Night15RewardRow = {
  arm: string;
  injected: string[];
  games: number;
  wins: number;
  dmgDealt: number;
  dmgTaken: number;
};

export type Night15PoisonRow = {
  id: string;
  stage: number;
  enemy: string;
  variant: string;
  games: number;
  wins: number;
  handSum: number;
  lossHands: number;
  losses: number;
  dmgDealt: number;
  bleed: number;
  poison: number;
  pierce: number;
};

export type Night15ScanRow = {
  stage: number;
  enemy: string;
  arm: string;
  games: number;
  wins: number;
  dmgDealt: number;
  dmgTaken: number;
  jag: number;
  hit: boolean;
};

export type Night15Data = {
  reward: Night15RewardRow[];
  poison: Night15PoisonRow[];
  scan: Night15ScanRow[];
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
    lossHands: losses.reduce((n, f) => n + f.hands, 0),
    variant: fights[0]?.foeVariant ?? "无",
  };
}

function playN(
  stage: number,
  games: number,
  policy: Policy,
  stamp: FightStamp,
  fightSalt: number,
  opt?: { grade?: number; hp?: number },
): { fights: FightResult[]; enemy: string } {
  const grade = opt?.grade ?? growthOf(stage).grade;
  const hp = opt?.hp ?? hpOf(stage);
  const run = freshRun(SCHOOL, SIM_SEED + stage * 19 + grade);
  const lead = leadOf();
  run.weaponId = `${SCHOOL}-a-${grade}`;
  run.mateWeapons = { ...run.mateWeapons, [lead]: run.weaponId };
  const fights: FightResult[] = [];
  let enemy = "";
  for (let i = 0; i < games; i++) {
    const opened = openHall(run, stage, DEFAULT_KNOBS, hp);
    opened.stamp = stamp;
    if (!enemy) enemy = opened.enemyName;
    fights.push(fightSample(opened, policy, fightSeed(stage, i, fightSalt), DEFAULT_KNOBS));
  }
  return { fights, enemy };
}

/** 配方奖励池按档取未持有（起手牌已有同名，注入同名不兑新牌）。 */
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

/** 同一盐流按 wants 顺序无放回抽，袋干重灌；同盐下短单是长单的前缀。 */
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

/** P1 馆 2 真实奖励三臂。同伴注入沿用档 1（growthOf(2) 各 1 精），三臂共用盐 40 的对局流。 */
function runReward(): Night15RewardRow[] {
  const lead = leadOf();
  const probe = freshRun(SCHOOL, SIM_SEED);
  const { mates } = extras(probe, 2);
  const arms: { arm: string; ids: CardId[] }[] = [
    { arm: "A 1 精（对照）", ids: drawIds(2, [["adept", 1]], 0) },
    { arm: "B 2 凡 + 1 精", ids: drawIds(2, [["adept", 1], ["common", 2]], 0) },
    { arm: "C 2 凡 + 2 精", ids: drawIds(2, [["adept", 2], ["common", 2]], 0) },
  ];
  return arms.map(({ arm, ids }) => {
    const stamp = stampFor(lead, 2, ids, mates, false);
    const { fights } = playN(2, P1_GAMES, policyOf(lead, 2), stamp, 40);
    const t = sum(fights);
    return { arm, injected: ids, games: t.games, wins: t.wins, dmgDealt: t.dmgDealt, dmgTaken: t.dmgTaken };
  });
}

/** P2 毒对馆 8 / 馆 10。盐 0 = 龟谱，与十四班破挡实验同口径。 */
function poisonSpec(id: string, stage: number, poison: boolean): Night15PoisonRow {
  const lead = leadOf();
  const probe = freshRun(SCHOOL, SIM_SEED);
  const { extra, mates } = extras(probe, stage);
  const stamp = stampFor(lead, stage, extra, mates, true, 0);
  stamp.usePoison = poison;
  const { fights, enemy } = playN(
    stage,
    P2_GAMES,
    policyOf(lead, stage),
    stamp,
    310 + stage + (poison ? 7 : 0) + extra.length,
  );
  const t = sum(fights);
  return {
    id,
    stage,
    enemy,
    variant: t.variant,
    games: t.games,
    wins: t.wins,
    handSum: t.handSum,
    lossHands: t.lossHands,
    losses: t.losses,
    dmgDealt: t.dmgDealt,
    bleed: t.bleed,
    poison: t.poison,
    pierce: t.pierce,
  };
}

function runPoison(): Night15PoisonRow[] {
  const out: Night15PoisonRow[] = [];
  for (const stage of [8, 10]) {
    out.push(poisonSpec("基线", stage, false));
    out.push(poisonSpec("淬毒", stage, true));
  }
  return out;
}

/** 档 3 提前印：HP 140 + 档 3 兵器 + 馆 7 口径注入（4 精 2 绝），敌仍是本馆敌。 */
function grade3Stamp(
  lead: CompanionId,
  stage: number,
  extra: CardId[],
  mates: Partial<Record<CompanionId, CardId[]>>,
  salt: number,
): FightStamp {
  const stamp: FightStamp = {
    extraIds: extra.length ? extra : undefined,
    extraByMate: mates,
    partyHp: 140,
    mateWeapons: { [lead]: `${SCHOOL}-a-3`, [BAI]: "palm-a-3", [HUO]: "spear-a-3" },
    party: [lead, BAI, HUO],
    mateDecks: { [BAI]: breakStarterDeck("palm"), [HUO]: breakStarterDeck("spear") },
  };
  if (stage >= 6) {
    stamp.foeRound = 1;
    stamp.foeStage = stage;
    stamp.foeSalt = salt;
  }
  return stamp;
}

function mateGrade3(probe: ReturnType<typeof freshRun>): Partial<Record<CompanionId, CardId[]>> {
  return {
    [BAI]: injectForSchool(probe, 7, "palm"),
    [HUO]: injectForSchool(probe, 7, "spear"),
  };
}

function scanCell(stage: number, arm: string, ids: CardId[], grade3 = false): Night15ScanRow {
  const lead = leadOf();
  const probe = freshRun(SCHOOL, SIM_SEED);
  const { mates } = extras(probe, stage);
  const stamp = grade3
    ? grade3Stamp(lead, stage, ids, mateGrade3(probe), 0)
    : stampFor(lead, stage, ids, mates, stage >= 6, 0);
  const { fights, enemy } = playN(
    stage,
    P3_GAMES,
    policyOf(lead, stage),
    stamp,
    700 + stage,
    grade3 ? { grade: 3, hp: 140 } : undefined,
  );
  const t = sum(fights);
  const jag = JAG_TARGET[stage]?.floor ?? 0;
  return {
    stage,
    enemy,
    arm,
    games: t.games,
    wins: t.wins,
    dmgDealt: t.dmgDealt,
    dmgTaken: t.dmgTaken,
    jag,
    hit: t.games > 0 && t.wins / t.games + 1e-9 >= jag,
  };
}

/** P3 断档定位：馆 4 / 馆 6 × 档 2 + N 精（N=2/4/6/8），加一行档 3 提前对照。 */
function runScan(): Night15ScanRow[] {
  const probe = freshRun(SCHOOL, SIM_SEED);
  const out: Night15ScanRow[] = [];
  for (const stage of [4, 6]) {
    for (const n of [2, 4, 6, 8]) {
      out.push(scanCell(stage, `精 ${n}`, drawIds(stage, [["adept", n]], 0)));
    }
    out.push(scanCell(stage, "档3提前", injectForSchool(probe, 7, SCHOOL), true));
  }
  return out;
}

export function runNight15(): Night15Data {
  return {
    reward: runReward(),
    poison: runPoison(),
    scan: runScan(),
  };
}
