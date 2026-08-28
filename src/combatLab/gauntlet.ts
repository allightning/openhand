import { CARDS, TECHNIQUES } from "../game/content";
import { applyAutoLoadout } from "./autoLoadouts";
import { normalizePreset } from "./draft";
import { expandDeckRecipe } from "./rules";
import type { LabPreset } from "./types";
import { cardSchool, MATES, WEAPON_NAME } from "../game/party";
import { gearById, nextGrade } from "../game/weapons";
import type { CardId, CompanionId, EnemyId, LabItemId, TechniqueId, WeaponId } from "../game/types";
import { getLabTuning, setLabTuning, type LabTuning } from "../game/labTuning";
import type { MindArtId } from "../game/mindArts";
import { ALL_MIND_ART_IDS, MIND_ARTS, mindArtFitsSchool, sumMindArtBonuses } from "../game/mindArts";
import { LAB_ITEM_LABEL } from "../game/labV21Constants";
import {
  GAUNTLET_FINAL_STAGE,
  PATH_COMPANION_POOL,
  getGauntletFinalStage,
  maxCompanions,
  pathLadder,
  type GauntletPath,
} from "./gauntletPaths";
import { isBreakAlign } from "./labRuleset";
import { BREAK_REWARD_WEIGHTS, itemTip, mindTip, techniqueTip } from "./breakAlign";

/** §31.9 难度阶梯：简单/中等/困难/极难（2/2/2/1）。 */
export type GauntletTier = "easy" | "mid" | "hard" | "extreme";

export const GAUNTLET_TIER_LABEL: Record<GauntletTier, string> = {
  easy: "简单",
  mid: "中等",
  hard: "困难",
  extreme: "极难",
};

/** §31 馆序占位（甲方可调）。segBonus=额外意图段预算，dmgCoef=敌伤害系数（不拆就疼的压力源）。 */
export interface GauntletLadderEntry {
  stage: number;
  tier: GauntletTier;
  label: string;
  enemyId: EnemyId;
  hpMul: number;
  segBonus: number;
  dmgCoef: number;
  forceGrudge?: boolean;
  /** §31.10 该馆应激段上限（缺省用全局旋钮）。 */
  stressCap?: number;
  /** 同场额外敌人（不含主敌）。第 8 关起渐多，第 15 关期末四人。 */
  extraEnemyIds?: EnemyId[];
}

/**
 * §31.9/§31.10 甲方定结构：7 馆分 2/2/2/1——第4馆后选伙伴，第6馆后超级奖励。
 * §31.10 困难/极难「机制阴险化」：长兵器敌（reach 2 隔格打）、应激上限抬高、段预算 4——靠出题密度与空间压迫，不纯堆数值。
 */
/**
 * @deprecated 使用 gauntletPaths 三线阶梯；保留供旧测试引用部分馆序。
 */
export const GAUNTLET_LADDER: GauntletLadderEntry[] = pathLadder("bandit").slice(0, 7);

/** Classic final (15). Runtime caps use getGauntletFinalStage(). */
export const GAUNTLET_MAX_STAGE = GAUNTLET_FINAL_STAGE;
export { getGauntletFinalStage };

/** §31.16 黑市：领奖屏的彩金出口。免费三选一照给（战利品的仪式感），黑市是额外花钱的路——
 *  攒着押大、花掉买稳、留着救命，三角张力从此成立。 */
export type GauntletMarketKind = "heal" | "card" | "item" | "tech" | "forge";

export interface GauntletMarketOffer {
  /** 本屏唯一；card/item/tech 槽的 id 带 payload（如 "card:pierce"），保证屏显与落锤同一份。 */
  id: string;
  kind: GauntletMarketKind;
  price: number;
  title: string;
  tip: string;
}

export const GAUNTLET_MARKET_BASE: Record<GauntletMarketKind, number> = {
  heal: 12,
  card: 18,
  item: 15,
  tech: 25,
  forge: 40,
};

/** @deprecated 用 marketPrice；保留别名供旧测试引用基数。 */
export const GAUNTLET_MARKET_PRICE = GAUNTLET_MARKET_BASE;

function marketTierMul(tier: GauntletTier): number {
  return tier === "easy" ? 1 : tier === "mid" ? 1.25 : tier === "hard" ? 1.5 : 2;
}

/** 当馆免费三选一期望价值锚点（黑市单价天花板 = 此值 ×0.8）。 */
export function freeRewardEV(stage: number): number {
  const entry = ladderEntry(stage);
  const tierBonus = entry.tier === "easy" ? 8 : entry.tier === "mid" ? 14 : entry.tier === "hard" ? 22 : 30;
  return basePot(stage) * 2.2 + tierBonus + stage * 6;
}

/** §31.17 黑市通胀：随馆序与档位涨价，且不超过免费奖励期望的 80%。 */
export function marketPrice(kind: GauntletMarketKind, stage: number, tier: GauntletTier): number {
  const stageMul = 1 + 0.35 * Math.max(0, stage - 1);
  const raw = GAUNTLET_MARKET_BASE[kind] * stageMul * marketTierMul(tier);
  const cap = freeRewardEV(stage) * 0.8;
  return Math.min(Math.max(1, Math.round(raw)), Math.max(1, Math.round(cap)));
}

/** 每过馆摆一摊：金创（残血才摆）+ 明码谱 + 小道具 + 外功 +（可升阶时）淬刃。与奖励同批 roll 定，不随重渲染变。 */
export function marketOffers(run: GauntletRun, rng: () => number = Math.random): GauntletMarketOffer[] {
  const out: GauntletMarketOffer[] = [];
  const entry = ladderEntryForRun(run);
  const priceOf = (kind: GauntletMarketKind) => marketPrice(kind, run.stage, entry.tier);
  if (run.hp < run.hpMax) {
    const n = Math.ceil(run.hpMax * GAUNTLET_HEAL_RATIO);
    out.push({ id: "heal", kind: "heal", price: priceOf("heal"), title: "金创药", tip: `当场回 ${n} 血（战后回血同方）。` });
  }
  const cards = cardPool(run.school, Boolean(runCompanions(run).length || run.lifelineCompanion));
  if (cards.length > 0) {
    const id = cards[Math.floor(rng() * cards.length)]!;
    out.push({ id: `card:${id}`, kind: "card", price: priceOf("card"), title: `谱 · ${CARDS[id].name}`, tip: `${CARDS[id].text}（买入进牌组）` });
  }
  const itemId = ALL_ITEMS[Math.floor(rng() * ALL_ITEMS.length)]!;
  out.push({ id: `item:${itemId}`, kind: "item", price: priceOf("item"), title: `货 · ${LAB_ITEM_LABEL[itemId]}`, tip: `${itemTip(itemId)}。` });
  const techs = techPool(allOwnedTechs(run), run.school);
  if (techs.length > 0) {
    const id = techs[Math.floor(rng() * techs.length)]!;
    out.push({ id: `tech:${id}`, kind: "tech", price: priceOf("tech"), title: `外功 · ${TECHNIQUES[id].name}`, tip: techniqueTip(id).replace(/^[^：]+：/, "") });
  }
  const nextId = nextGrade(run.weaponId);
  const next = nextId ? gearById(nextId) : null;
  if (nextId && next && next.grade < 5) {
    const gain = (next.damage ?? 0) - (gearById(run.weaponId)?.damage ?? 0);
    out.push({ id: "forge", kind: "forge", price: priceOf("forge"), title: `淬刃 · ${next.name}`, tip: `兵刃升阶${gain > 0 ? `（伤害 +${gain}）` : ""}。` });
  }
  return out;
}

/** 买下即生效；彩金不够返回 null。卖出与否由 UI 侧按屏记账（每馆刷新一摊）。 */
export function buyMarketOffer(run: GauntletRun, offer: GauntletMarketOffer): GauntletRun | null {
  if (run.pot < offer.price) return null;
  const pot = run.pot - offer.price;
  if (offer.kind === "heal") {
    return { ...run, pot, hp: Math.min(run.hpMax, run.hp + Math.ceil(run.hpMax * GAUNTLET_HEAL_RATIO)) };
  }
  if (offer.kind === "card") {
    return { ...run, pot, deckRecipe: [...run.deckRecipe, offer.id.slice(5) as CardId] };
  }
  if (offer.kind === "item") {
    return { ...run, pot, items: [...run.items, offer.id.slice(5) as LabItemId] };
  }
  if (offer.kind === "tech") {
    const id = offer.id.slice(5) as TechniqueId;
    if (run.techniques.includes(id)) return null;
    return { ...run, pot, techniques: [...run.techniques, id] };
  }
  const nextId = nextGrade(run.weaponId);
  if (!nextId) return null;
  return { ...run, pot, weaponId: nextId };
}

/** §31.17 理想峰值彩金锚点（全押×3 一路胜的标尺，随馆序递进）。 */
export function peakPotAnchor(stage: number): number {
  const s = Math.max(1, stage);
  const banker = GAUNTLET_START_POT * 3;
  let pot = banker;
  for (let i = 1; i <= s; i++) {
    pot += basePot(i);
    const stake = Math.max(pot, GAUNTLET_START_POT * 3);
    pot += stake * 2.5;
  }
  return Math.round(pot);
}

/** 复活费 = 峰值锚点 / 3；pot 低于此值 = 破产区，不可赊账复活。 */
export function reviveCost(stage: number): number {
  return Math.max(12, Math.floor(peakPotAnchor(stage) / 3));
}

export type LifelineKind = "stat50" | "tempCompanion" | "divineWeapons" | "aidPair";

const AID_ITEM_BY_SCHOOL: Record<WeaponId, LabItemId> = {
  sword: "aidSword",
  saber: "aidSaber",
  spear: "aidSpear",
  palm: "aidPalm",
  staff: "aidStaff",
  hook: "aidHook",
};

export const LIFELINE_DEFS: Record<
  LifelineKind,
  { title: string; tip: string }
> = {
  stat50: { title: "赌坊秘药", tip: "本局气血与伤害 +50%，过关后失效。" },
  tempCompanion: { title: "客座同道", tip: "本局临时入伙一位同道（组合技/光环），过关后离去。" },
  divineWeapons: { title: "神兵借予", tip: "本局全员兵刃临时升为神兵（5 阶），过关后收回。" },
  aidPair: { title: "双符助战", tip: "本局获得 2 张本系助战符，可召唤客座好手。" },
};

/** 整局首次输馆且彩金 ≥ 复活费 → 可赊账一次。 */
export function canOfferLifeline(run: GauntletRun): boolean {
  return !run.bankruptUsed && run.pot >= reviveCost(run.stage);
}

export function applyLifeline(run: GauntletRun, kind: LifelineKind, rng: () => number = Math.random): GauntletRun {
  if (kind === "stat50") return { ...run, lifeline: kind, statBoostMul: 1.5 };
  if (kind === "divineWeapons") return { ...run, lifeline: kind, divineWeapons: true };
  if (kind === "aidPair") {
    const aid = AID_ITEM_BY_SCHOOL[run.school];
    return { ...run, lifeline: kind, items: [...run.items, aid, aid] };
  }
  const taken = new Set(runCompanions(run));
  if (run.lifelineCompanion) taken.add(run.lifelineCompanion);
  const pool = rollCompanionChoices(run, rng).filter((id) => !taken.has(id));
  const pick = pool[0] ?? rollCompanionChoices(run, rng)[0]!;
  return { ...run, lifeline: kind, lifelineCompanion: pick };
}

/** 付复活费、标记已破产、满血回本馆（不赔光彩金）。 */
export function reviveGauntletRun(run: GauntletRun): GauntletRun | null {
  const cost = reviveCost(run.stage);
  if (run.bankruptUsed || run.pot < cost) return null;
  const hpMax = scaledHpMax(run);
  return {
    ...run,
    pot: run.pot - cost,
    hp: hpMax,
    hpMax,
    bankruptUsed: true,
    wager: null,
    lastPotText: `赊账复活 -${cost}`,
  };
}

function scaledHpMax(run: GauntletRun): number {
  const base = Math.max(MATES[GAUNTLET_SCHOOL_LOADOUT[run.school].fieldMate].hp, 48);
  const fromRun = run.hpMax;
  const raw = Math.max(base, fromRun);
  return run.statBoostMul > 1 ? Math.floor(raw * run.statBoostMul) : raw;
}

/** @deprecated §31.17 改用 reviveGauntletRun */
export function redeemGauntletRun(run: GauntletRun): GauntletRun | null {
  return reviveGauntletRun(run);
}

/** §31.13 无尽踢馆：对战版可在终馆后继续；拆招短局（10 馆）通关即结，无尽后开独立模式。 */
export const GAUNTLET_ENDLESS = true;

export function isGauntletEndless(): boolean {
  return GAUNTLET_ENDLESS && !isBreakAlign();
}

/** §31.13 赌馆启动资金：开局 20 彩金——够押小注，攒过馆底彩换重注。 */
export const GAUNTLET_START_POT = 20;

/** §31.13 赌馆：彩金（本场成绩+赌注本金）。底彩 = 过馆固定进账。 */
export function basePot(stage: number): number {
  return 10 + 6 * stage;
}

export type WagerKind = "chain" | "eye" | "clean" | "speed" | "blood" | "fist";

export interface GauntletWager {
  kind: WagerKind;
  /** 注额（从彩金里扣；赢按赔率连本带利回） */
  stake: number;
  target: number;
  odds: number;
}

export interface WagerOffer {
  kind: WagerKind;
  title: string;
  tip: string;
  target: number;
  odds: number;
}

/** §31.17 第 1 馆开踢前：庄家垫资起步 ×2 或 ×3（仅此一次）。 */
export function applyBankerBoost(run: GauntletRun, mult: 2 | 3): GauntletRun {
  return { ...run, pot: GAUNTLET_START_POT * mult, bankerChosen: true };
}

/** §31.15 注额上限 = 当前彩金（第 1 馆垫资后亦同）。 */
export function wagerStakeMax(pot: number): number {
  return Math.max(1, pot);
}

/**
 * §31.14 盘口轮换：六种盘口每场随机开三（甲方：「怎么能每次都是那三个赌注」）。
 * 设计对子：完璧(≥75%) ↔ 血战(≤35%) 互斥路线；破眼/连拆喂拆招流；速胜喂爆发流；赤手喂空手流。
 * Break 模式：权重偏连拆/破眼，壳盘口改写为拆招兑现。
 */
export function wagerOffers(run: GauntletRun, rng: () => number = Math.random): WagerOffer[] {
  const s = run.stage;
  const final = getGauntletFinalStage();
  const tierIdx = s <= 2 ? 0 : s <= 4 ? 1 : s <= 6 ? 2 : 3;
  const k = Math.max(0, s - final);
  const chainTarget = 3 + tierIdx + k;
  const eyeTarget = (s >= 5 ? 2 : 1) + Math.floor(k / 2);
  const speedTarget = (s >= 5 ? 7 : 6) + Math.floor(k / 2);
  const fistBreakTarget = 2 + tierIdx;
  const breakMode = isBreakAlign();
  const all: WagerOffer[] = [
    {
      kind: "chain",
      title: "连拆注",
      target: chainTarget,
      odds: 2,
      tip: `本局硬拆 ≥${chainTarget} 段（助战化招也算）。赢：注额 ×2；输：注额归庄家。`,
    },
    {
      kind: "eye",
      title: "破眼注",
      target: eyeTarget,
      odds: 2,
      tip: `本局破眼 ≥${eyeTarget} 次：硬拆带「眼」的那一段，让他整套套路崩塌。赢：注额 ×2。`,
    },
    breakMode
      ? {
          kind: "clean",
          title: "少伤拆完",
          target: 75,
          odds: 3,
          tip: `赢下本馆、硬拆 ≥${chainTarget} 段，且收势气血 ≥75%。拆完还不残。赢：注额 ×3。`,
        }
      : {
          kind: "clean",
          title: "完璧注",
          target: 75,
          odds: 3,
          tip: "赢下本馆且收势时气血 ≥75% 上限。赢：注额 ×3；没赢或带伤收官：注额归庄家。",
        },
    {
      kind: "speed",
      title: "速胜注",
      target: speedTarget,
      odds: 3,
      tip: breakMode
        ? `在 ${speedTarget} 回合内赢下本馆（硬拆反打可速胜）。赢：注额 ×3；超时或落败：注额归庄家。`
        : `在 ${speedTarget} 回合内赢下本馆。赢：注额 ×3；超时或落败：注额归庄家。`,
    },
    breakMode
      ? {
          kind: "blood",
          title: "险拆",
          target: 35,
          odds: 2,
          tip: `走钢丝：赢下本馆、硬拆 ≥${Math.max(2, chainTarget - 1)}，且收势气血 ≤35%。赢：注额 ×2。`,
        }
      : {
          kind: "blood",
          title: "血战注",
          target: 35,
          odds: 2,
          tip: "走钢丝：赢下本馆且收势时气血 ≤35% 上限（与完璧注互斥的路）。赢：注额 ×2；压过头（死了）当然算飞。",
        },
    breakMode
      ? {
          kind: "fist",
          title: "赤手拆",
          target: fistBreakTarget,
          odds: 2,
          tip: `本局不用任何小道具/助战符，且硬拆 ≥${fistBreakTarget} 段。赢：注额 ×2。`,
        }
      : {
          kind: "fist",
          title: "赤手注",
          target: 0,
          odds: 2,
          tip: "本局不用任何小道具/助战符，空手赢下本馆。赢：注额 ×2。",
        },
  ];
  // §31.15 盘口按持有开门：手里一件道具/助战符都没有时不开赤手注——那不是赌，是白送 ×2。
  const pool = all.filter((o) => o.kind !== "fist" || run.items.length > 0);
  if (!breakMode) {
    const out: WagerOffer[] = [];
    while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]!);
    return out;
  }
  // Break：连拆/破眼加权
  const weights: Record<WagerKind, number> = {
    chain: 28,
    eye: 22,
    speed: 18,
    fist: 12,
    clean: 10,
    blood: 10,
  };
  const out: WagerOffer[] = [];
  const bag = [...pool];
  while (out.length < 3 && bag.length) {
    const total = bag.reduce((s, o) => s + (weights[o.kind] ?? 10), 0);
    let roll = rng() * total;
    let pick = 0;
    for (let i = 0; i < bag.length; i++) {
      roll -= weights[bag[i]!.kind] ?? 10;
      if (roll <= 0) {
        pick = i;
        break;
      }
    }
    out.push(bag.splice(pick, 1)[0]!);
  }
  return out;
}

export interface WagerStats {
  breaks: number;
  turns: number;
  /** 收局时场上角色气血/上限（0-1） */
  hpEndRatio: number;
  won: boolean;
  /** §31.14 本局破眼次数（破眼注）。 */
  eyes: number;
  /** §31.14 本局用过小道具/助战符（赤手注）。 */
  itemsUsed: boolean;
}

export function resolveWager(run: GauntletRun, stats: WagerStats): { won: boolean; payout: number; text: string } {
  const w = run.wager;
  if (!w) return { won: false, payout: 0, text: "" };
  const breakMode = isBreakAlign();
  let ok = false;
  if (w.kind === "chain") ok = stats.breaks >= w.target;
  else if (w.kind === "eye") ok = stats.eyes >= w.target;
  else if (w.kind === "clean") {
    ok = stats.hpEndRatio >= w.target / 100;
    if (breakMode) ok = ok && stats.breaks >= 3 + (run.stage <= 2 ? 0 : run.stage <= 4 ? 1 : run.stage <= 6 ? 2 : 3);
  } else if (w.kind === "speed") ok = stats.turns <= w.target;
  else if (w.kind === "blood") {
    ok = stats.hpEndRatio <= w.target / 100;
    if (breakMode) ok = ok && stats.breaks >= Math.max(2, 2 + (run.stage <= 2 ? 0 : run.stage <= 4 ? 1 : run.stage <= 6 ? 2 : 3));
  } else if (w.kind === "fist") {
    ok = !stats.itemsUsed;
    if (breakMode) ok = ok && stats.breaks >= w.target;
  }
  const won = Boolean(stats.won && ok);
  const payout = won ? w.stake * w.odds : -Math.min(w.stake, run.pot);
  const text = won ? `「${wagerLabel(w.kind)}」中了 +${payout} 彩金` : `「${wagerLabel(w.kind)}」飞了 ${Math.min(w.stake, run.pot)} 彩金`;
  return { won, payout, text };
}

export function wagerLabel(kind: WagerKind): string {
  if (isBreakAlign()) {
    const breakLabels: Partial<Record<WagerKind, string>> = {
      clean: "少伤拆完",
      blood: "险拆",
      fist: "赤手拆",
    };
    if (breakLabels[kind]) return breakLabels[kind]!;
  }
  const labels: Record<WagerKind, string> = {
    chain: "连拆注",
    eye: "破眼注",
    clean: "完璧注",
    speed: "速胜注",
    blood: "血战注",
    fist: "赤手注",
  };
  return labels[kind];
}

/** §27 纯系队第一位（占位映射）。 */
export const GAUNTLET_SCHOOL_LOADOUT: Record<
  WeaponId,
  { loadoutId: string; fieldMate: CompanionId; label: string }
> = {
  palm: { loadoutId: "t1-four-palm", fieldMate: "rail", label: "拳掌" },
  staff: { loadoutId: "t2-four-staff", fieldMate: "sapper", label: "棍" },
  saber: { loadoutId: "t7-four-saber", fieldMate: "watch", label: "刀" },
  sword: { loadoutId: "t4-two-sword-spear", fieldMate: "seer", label: "剑" },
  spear: { loadoutId: "t8-three-spear-palm", fieldMate: "guard", label: "枪" },
  hook: { loadoutId: "t5-hook-saber-spear", fieldMate: "hooker", label: "钩" },
};

export const GAUNTLET_SCHOOLS: WeaponId[] = ["palm", "staff", "saber", "sword", "spear", "hook"];

/**
 * 战间奖励权重占位（§31.9 甲方可调）。难度阶梯越高，淬刃/外功权重越大、选项越多：
 * 简单 3 选 / 中等 4 选 / 困难 4 选偏重养成；第 6 馆后改走超级奖励三选一（rollSuperRewards）。
 */
/** 战间奖励权重：心法/助战/道具/外功 同阶层（§31.18）。谱牌与淬刃单独归位。 */
/** 战间奖励权重：心法/助战/道具/外功 同阶层（§31.18）。伙伴加入高一层，仅 4/7/12 关。 */
export const GAUNTLET_REWARD_TIERS: Record<
  Exclude<GauntletTier, "extreme">,
  { picks: number; weights: { tech: number; mind: number; item: number; aid: number } }
> = {
  easy: { picks: 3, weights: { tech: 25, mind: 25, item: 25, aid: 25 } },
  mid: { picks: 4, weights: { tech: 25, mind: 25, item: 25, aid: 25 } },
  hard: { picks: 4, weights: { tech: 25, mind: 25, item: 25, aid: 25 } },
};

/** 战后回血占位：最大 HP 的 30%。 */
export const GAUNTLET_HEAL_RATIO = 0.3;

export const GAUNTLET_BEST_KEY = "openhand-gauntlet-best";

/**
 * §31.6 起手脚（策展 · 甲方可调）。三条铁律：
 * 1) 不含「组合」标签卡——踢馆单人无助战，组合卡是死卡；
 * 2) 每系至少 2 张位移/身法（拆招长在空间上，没位移=没玩法）；
 * 3) 攻击 / 防御 / 功能大致 5:2:5，允许重复（ deckbuilding 惯例）。
 * 内容缺口警示：枪/钩系本系卡仅 2–3 种可用，家族扩卡（批次四）是下一批内容任务。
 */
/** §31.15 各系起手 14 张：撤步（通用退步答案）+ 换位（贴脸对调）入起手——位置对策不再只有进步/纵步。 */
export const GAUNTLET_STARTERS: Record<WeaponId, CardId[]> = {
  sword: ["pierce", "pierce", "marking", "marking", "expose", "swordMute", "advance", "advance2", "retreat", "sidestep", "defend", "brace", "sweep", "charge"],
  saber: ["cut", "cut", "drawcut", "drawcut", "rift", "saberBleed", "advance", "advance2", "retreat", "sidestep", "defend", "brace", "sweep", "charge"],
  spear: ["thrust", "thrust", "thrust", "spearLock", "spearLock", "haste", "advance", "advance2", "retreat", "sidestep", "defend", "brace", "sweep", "charge"],
  palm: ["strike", "strike", "strike2", "push", "elbow", "weave", "layer", "backpalm", "retreat", "sidestep", "advance", "advance2", "defend", "brace"],
  staff: ["split", "split", "bleedcut", "plant", "thorns", "ironform", "advance", "advance2", "retreat", "sidestep", "defend", "brace", "sweep", "charge"],
  hook: ["hookpull", "hookpull", "hookpull", "hookDisarm", "hookDisarm", "haste", "advance", "advance2", "retreat", "sidestep", "defend", "brace", "sweep", "charge"],
};

const ALL_ITEMS: LabItemId[] = ["jinchuang", "xiujian", "huiqi", "lianhuan", "pojin"];

export type GauntletRewardKind = "tech" | "mind" | "item" | "aid" | "card" | "forge" | "elixir" | "aidPair";

export interface GauntletRewardOption {
  kind: GauntletRewardKind;
  id: string;
  title: string;
  tip: string;
  /** 外功/心法：需指定受益角色（队伍内）。 */
  targetMate?: CompanionId;
}

export interface GauntletBest {
  streak: number;
  breaks: number;
  /** §31.13 彩金纪录（打榜的成绩单）。 */
  pot: number;
}

export interface GauntletRun {
  path: GauntletPath;
  school: WeaponId;
  stage: number;
  streak: number;
  totalBreaks: number;
  deckRecipe: CardId[];
  /** @deprecated 用 mateTechs */
  techniques: TechniqueId[];
  /** 每人外功（最多 3 门/人） */
  mateTechs: Partial<Record<CompanionId, TechniqueId[]>>;
  /** 每人心法 */
  mateMindArts: Partial<Record<CompanionId, MindArtId[]>>;
  items: LabItemId[];
  hp: number;
  hpMax: number;
  startedAt: number;
  weaponId: string;
  bossId: EnemyId;
  companion?: CompanionId;
  /** Extra companions beyond the first (break mode up to 2 total). companion stays synced as companions[0]. */
  companions?: CompanionId[];
  bonusEnergyMax?: number;
  pot: number;
  wager?: GauntletWager | null;
  lastPotText?: string;
  /** §31.17 整局只允许赊账破产一次。 */
  bankruptUsed: boolean;
  /** §31.17 第 1 馆是否已选庄家垫资。 */
  bankerChosen: boolean;
  /** §31.17 本局路径已遇敌人（不重复）。 */
  facedEnemies: EnemyId[];
  /** §31.17 赊账时选的救命奖励（本局有效）。 */
  lifeline?: LifelineKind;
  lifelineCompanion?: CompanionId;
  statBoostMul: number;
  divineWeapons: boolean;
}

export type GauntletScreen = "path" | "pick" | "banker" | "reward" | "result" | "companion" | "wager" | "lifeline" | "rewardTarget";

let savedTuning: LabTuning | null = null;

export function isGauntletTuningLocked(): boolean {
  return savedTuning != null;
}

/** G2：进入踢馆时快照并强制覆盖；退出时恢复。 */
export function enterGauntletTuning(): void {
  if (!savedTuning) savedTuning = { ...getLabTuning() };
  setLabTuning({
    rulesCombo: false,
    deckMultiplier: 1,
    designerMode: false,
    rulesV2: true,
    v2Fx: true,
    v2VariantAi: true,
    enemySegAll: true,
  });
}

export function exitGauntletTuning(): void {
  if (savedTuning) {
    setLabTuning(savedTuning);
    savedTuning = null;
  }
}

export function ladderEntry(stage: number, path: GauntletPath = "bandit"): GauntletLadderEntry {
  const ladder = pathLadder(path);
  const hit = ladder.find((e) => e.stage === stage);
  if (hit) return hit;
  const final = getGauntletFinalStage();
  if (stage > final) {
    const k = stage - final;
    const last = ladder[ladder.length - 1]!;
    return {
      ...last,
      stage,
      label: `第${stage}关·回头`,
      hpMul: last.hpMul + 0.15 * k,
      segBonus: Math.min(last.segBonus + Math.ceil(k / 2), 8),
      dmgCoef: Math.min(last.dmgCoef + 0.05 * k, 2.3),
    };
  }
  throw new Error(`未知踢馆馆序：${stage}`);
}

export function ladderEntryForRun(run: GauntletRun, stage = run.stage): GauntletLadderEntry {
  return ladderEntry(stage, run.path);
}

export function resolveStageEnemy(entry: GauntletLadderEntry, bossId: EnemyId, faced: EnemyId[] = []): EnemyId {
  const final = getGauntletFinalStage();
  if (entry.stage === final) return bossId;
  if (entry.stage > final) {
    return (entry.stage - final) % 2 === 1 ? nextBossId(bossId) : bossId;
  }
  if (!faced.includes(entry.enemyId)) return entry.enemyId;
  const pool = GAUNTLET_LADDER.map((e) => e.enemyId).filter((id) => !faced.includes(id));
  return pool[0] ?? entry.enemyId;
}

/** §31.17 轮番替补：第 3 馆起可能有第二名敌人，打倒前排后接力。 */
export function waveEnemyForStage(run: GauntletRun, entry: GauntletLadderEntry, primary: EnemyId): EnemyId | undefined {
  if (entry.stage < 3) return undefined;
  const pool = GAUNTLET_LADDER.filter((e) => e.stage <= entry.stage)
    .map((e) => e.enemyId)
    .filter((id) => id !== primary && !run.facedEnemies.includes(id));
  if (!pool.length) return undefined;
  return pool[(run.stage + primary.length) % pool.length];
}

/** Active permanent companions (excludes lifeline temp). */
export function runCompanions(run: GauntletRun): CompanionId[] {
  if (run.companions?.length) return [...run.companions];
  return run.companion ? [run.companion] : [];
}

export function createGauntletRun(path: GauntletPath, school: WeaponId, bossId: EnemyId = "usurper"): GauntletRun {
  const cfg = GAUNTLET_SCHOOL_LOADOUT[school];
  const base = applyAutoLoadout(cfg.loadoutId, 3, 0);
  const mate = cfg.fieldMate;
  const hpMax = Math.max(base.hpMax ?? MATES[mate].hp, 48);
  return {
    path,
    school,
    stage: 1,
    streak: 0,
    totalBreaks: 0,
    deckRecipe: [...GAUNTLET_STARTERS[school]],
    techniques: [],
    mateTechs: { [mate]: [] },
    mateMindArts: { [mate]: [] },
    items: [],
    hp: hpMax,
    hpMax,
    startedAt: Date.now(),
    weaponId: `${school}-a-3`,
    bossId,
    pot: GAUNTLET_START_POT,
    wager: null,
    bankruptUsed: false,
    bankerChosen: false,
    facedEnemies: [],
    companions: [],
    statBoostMul: 1,
    divineWeapons: false,
  };
}

export function buildGauntletPreset(run: GauntletRun): LabPreset {
  const entry = ladderEntryForRun(run);
  const cfg = GAUNTLET_SCHOOL_LOADOUT[run.school];
  const enemyId = resolveStageEnemy(entry, run.bossId, run.facedEnemies);
  const waveEnemyId = waveEnemyForStage(run, entry, enemyId);
  const base = applyAutoLoadout(cfg.loadoutId, 3, 0, { enemyId });
  const mate = cfg.fieldMate;
  const weapon = run.divineWeapons ? `${run.school}-a-5` : (run.weaponId ?? base.mateWeapons?.[mate] ?? `${run.school}-a-3`);
  const companions = runCompanions(run);
  const party: CompanionId[] = [mate, ...companions];
  if (run.lifelineCompanion && !party.includes(run.lifelineCompanion)) {
    party.push(run.lifelineCompanion);
  }
  const mateWeapons: Record<string, string> = { [mate]: weapon };
  const grade = run.divineWeapons ? 5 : Math.min(gearById(weapon)?.grade ?? 3, 4);
  for (const id of party) {
    if (id === mate) continue;
    mateWeapons[id] = `${MATES[id].weapon}-a-${grade}`;
  }
  const mateTechs: Record<string, TechniqueId[]> = {};
  for (const id of party) {
    const from = run.mateTechs[id] ?? (id === mate ? run.techniques : []) ?? [];
    mateTechs[id] = [...from];
  }
  const mindHp = sumMindArtBonuses(run.mateMindArts[mate] ?? []).hpMax;
  const hpMax = scaledHpMax(run) + mindHp;
  return normalizePreset({
    id: `gauntlet-${run.school}-${run.stage}`,
    name: `${entry.label}（${GAUNTLET_TIER_LABEL[entry.tier]}）`,
    blurb: `踢馆 · ${WEAPON_NAME[run.school]}`,
    tags: ["踢馆", run.school],
    enemyId,
    waveEnemyId,
    extraFoeIds: entry.extraEnemyIds ? [...entry.extraEnemyIds] : undefined,
    party,
    fieldMate: mate,
    deckRecipe: [...run.deckRecipe],
    mateWeapons,
    mateTechs,
    mateMinds: { ...run.mateMindArts },
    labItems: [...run.items].slice(0, 3),
    hp: Math.min(run.hp, hpMax),
    hpMax,
    statBoostMul: run.statBoostMul,
  });
}

export function applyStageTuning(entry: GauntletLadderEntry): void {
  // §31.14 总督按档：简单 45% / 中等 55% / 困难 65% / 极难 80%（单回合攻击总伤占你气血上限的比例）
  const capRatio = entry.tier === "easy" ? 0.45 : entry.tier === "mid" ? 0.55 : entry.tier === "hard" ? 0.65 : 0.8;
  setLabTuning({
    enemyHpMul: entry.hpMul,
    enemySegBonus: entry.segBonus,
    dmgCoef: entry.dmgCoef,
    v2Grudge: Boolean(entry.forceGrudge),
    enemyTurnCapRatio: capRatio,
    ...(entry.stressCap != null ? { enemyStressCap: entry.stressCap } : {}),
  });
}

export function afterGauntletWin(
  run: GauntletRun,
  breaksThisBattle: number,
  hpLeft: number,
  hpMax: number,
  enemyId: EnemyId,
): GauntletRun {
  const healed = Math.min(hpMax, hpLeft + Math.round(hpMax * GAUNTLET_HEAL_RATIO));
  const completed = run.stage;
  const faced = run.facedEnemies.includes(enemyId) ? run.facedEnemies : [...run.facedEnemies, enemyId];
  return {
    ...run,
    streak: completed,
    stage: completed + 1,
    totalBreaks: run.totalBreaks + breaksThisBattle,
    hp: healed,
    hpMax,
    facedEnemies: faced,
  };
}

export function afterGauntletLoss(run: GauntletRun, breaksThisBattle: number): GauntletRun {
  return {
    ...run,
    streak: Math.max(0, run.stage - 1),
    totalBreaks: run.totalBreaks + breaksThisBattle,
  };
}

/** §31.9 伙伴入伙后组合卡解禁（之前单人踢馆组合卡是死卡）。 */
export function cardPool(school: WeaponId, withCombo: boolean): CardId[] {
  return (Object.keys(CARDS) as CardId[]).filter((id) => {
    const cs = cardSchool(id);
    if (cs !== school && cs !== "any") return false;
    if (!withCombo && CARDS[id].tags?.includes("组合")) return false;
    return true;
  });
}

/** 全队已学外功（去重池用）。 */
function allOwnedTechs(run: GauntletRun): TechniqueId[] {
  return [...new Set([...run.techniques, ...Object.values(run.mateTechs).flat()])];
}

/** §31.10 外功按系别过滤：只出「本系亲和 + 通用」（选刀不会再弹桩功/钩功）。 */
function techPool(owned: TechniqueId[], school: WeaponId): TechniqueId[] {
  return (Object.keys(TECHNIQUES) as TechniqueId[]).filter((id) => {
    if (owned.includes(id)) return false;
    const ts = TECHNIQUES[id].school;
    return !ts || ts === school;
  });
}

/** §31.12 六系助战符。 */
const ALL_AID_ITEMS: LabItemId[] = ["aidPalm", "aidSaber", "aidSword", "aidSpear", "aidStaff", "aidHook"];

function itemPool(owned: LabItemId[]): LabItemId[] {
  return ALL_ITEMS.filter((id) => !owned.includes(id));
}

function pickWeightedKind(rng: () => number, tier: Exclude<GauntletTier, "extreme">): GauntletRewardKind {
  const w = isBreakAlign() ? BREAK_REWARD_WEIGHTS : GAUNTLET_REWARD_TIERS[tier].weights;
  const total = w.tech + w.mind + w.item + w.aid;
  const roll = rng() * total;
  if (roll < w.tech) return "tech";
  if (roll < w.tech + w.mind) return "mind";
  if (roll < w.tech + w.mind + w.item) return "item";
  return "aid";
}

/** 淬刃选项：兵刃升一阶。§31.9 甲方定：常规淬刃封顶玄阶，神兵只出第 6 馆超级奖励。 */
function forgeOption(run: GauntletRun): GauntletRewardOption | null {
  const cur = gearById(run.weaponId);
  const nextId = nextGrade(run.weaponId);
  const next = nextId ? gearById(nextId) : null;
  if (!cur || !next || !nextId) return null;
  if (next.grade >= 5) return null;
  const dmgGain = (next.damage ?? 0) - (cur.damage ?? 0);
  return {
    kind: "forge",
    id: nextId,
    title: `淬刃 · ${next.name}`,
    tip: `${cur.name} → ${next.name}：每击 +${dmgGain} 伤，械效增强（悬停兵刃牌可看细则）。`,
  };
}

function pickOne<T>(pool: T[], rng: () => number): T | null {
  if (!pool.length) return null;
  return pool[Math.floor(rng() * pool.length)] ?? null;
}

/** §31.9 奖励档位 = 刚打过的那一馆的难度（stage 已 +1，所以按 stage-1 查）。 */
function rewardTier(run: GauntletRun): Exclude<GauntletTier, "extreme"> {
  const entry = ladderEntry(Math.max(1, run.stage - 1), run.path);
  return entry.tier === "extreme" ? "hard" : entry.tier;
}

export function rollGauntletRewards(run: GauntletRun, rng: () => number = Math.random): GauntletRewardOption[] {
  const tier = rewardTier(run);
  const picks = GAUNTLET_REWARD_TIERS[tier].picks;
  const out: GauntletRewardOption[] = [];
  const usedTech = new Set(allOwnedTechs(run));
  const usedMind = new Set(Object.values(run.mateMindArts).flat());
  const usedItems = new Set(run.items);
  let guard = 0;
  while (out.length < picks && guard < 32) {
    guard += 1;
    const kind = pickWeightedKind(rng, tier);
    if (kind === "tech") {
      const pool = techPool([...usedTech], run.school);
      const id = pickOne(pool, rng);
      if (!id) continue;
      usedTech.add(id);
      out.push({ kind, id, title: TECHNIQUES[id].name, tip: techniqueTip(id) });
    } else if (kind === "mind") {
      const pool = ALL_MIND_ART_IDS.filter((id) => !usedMind.has(id) && mindArtFitsSchool(id, run.school));
      const id = pickOne(pool, rng);
      if (!id) continue;
      usedMind.add(id);
      out.push({ kind, id, title: MIND_ARTS[id].name, tip: mindTip(id) });
    } else if (kind === "item" || kind === "aid") {
      if (run.items.length >= 3) continue;
      const aidPool = kind === "aid" ? ALL_AID_ITEMS : itemPool([...usedItems, ...run.items]);
      const pool = aidPool.filter((id) => !usedItems.has(id) && !run.items.includes(id));
      const id = pickOne(pool.length ? pool : itemPool([...usedItems, ...run.items]), rng);
      if (!id) continue;
      usedItems.add(id);
      out.push({
        kind: "item",
        id,
        title: LAB_ITEM_LABEL[id] ?? id,
        tip: itemTip(id),
      });
    }
  }
  while (out.length < picks) {
    const pool = ALL_MIND_ART_IDS.filter((id) => !usedMind.has(id) && mindArtFitsSchool(id, run.school));
    const id = pickOne(pool, rng);
    if (!id) break;
    usedMind.add(id);
    out.push({ kind: "mind", id, title: MIND_ARTS[id].name, tip: mindTip(id) });
  }
  return out.slice(0, picks);
}

/** §31.9 第 4 馆后：随机三位同道三选一入伙（排除已在场的主角与伙伴）。保底同系+异系各至少 1 个。 */
export function rollCompanionChoices(run: GauntletRun, rng: () => number = Math.random): CompanionId[] {
  const field = GAUNTLET_SCHOOL_LOADOUT[run.school].fieldMate;
  const taken = new Set(runCompanions(run));
  const pool = [...PATH_COMPANION_POOL[run.path]].filter((id) => id !== field && !taken.has(id));
  const same = pool.filter((id) => MATES[id].weapon === run.school);
  const cross = pool.filter((id) => MATES[id].weapon !== run.school);
  const out: CompanionId[] = [];
  // 保底：同系、异系各先抽 1 个
  if (same.length) out.push(same.splice(Math.floor(rng() * same.length), 1)[0]!);
  if (cross.length) out.push(cross.splice(Math.floor(rng() * cross.length), 1)[0]!);
  // 剩余从合并池补满 3 个
  const rest = [...same, ...cross];
  while (out.length < 3 && rest.length) {
    const idx = Math.floor(rng() * rest.length);
    out.push(rest.splice(idx, 1)[0]!);
  }
  return out;
}

export function applyCompanion(run: GauntletRun, mateId: CompanionId): GauntletRun {
  const cur = runCompanions(run);
  if (cur.includes(mateId)) return { ...run, companion: cur[0], companions: cur };
  const max = maxCompanions();
  const next = [...cur, mateId].slice(0, max);
  return { ...run, companion: next[0], companions: next };
}

/** §31.9 第 6 馆后超级奖励三选一：神兵 / 死士符 / 仙药。 */
export function rollSuperRewards(run: GauntletRun): GauntletRewardOption[] {
  const godId = `${run.school}-a-5`;
  const god = gearById(godId);
  const cur = gearById(run.weaponId);
  const out: GauntletRewardOption[] = [];
  if (god && cur && cur.grade < 5) {
    out.push({
      kind: "forge",
      id: godId,
      title: `神兵 · ${god.name}`,
      tip: `${cur.name} 直跃神阶：每击 +${(god.damage ?? 0) - (cur.damage ?? 0)} 伤，械效全开${god.godSkill ? `，神通「${god.godSkill}」` : ""}。神兵只此一遭。`,
    });
  }
  // §31.12 助战重做：超级奖励给「助战符·一对」（随机两系各一枚；强度在小道具与同行之间）
  out.push({
    kind: "aidPair",
    id: "aidPair",
    title: "助战符 · 一对",
    tip: "随机两系客座好手各一张：上场放本系绝活、实体占格一回合。拳吸仇挡刀 / 刀破绽 / 剑裂创 / 枪挑退 / 棍眩晕 / 钩缴械。",
  });
  out.push({
    kind: "elixir",
    id: "xianyao",
    title: "仙药",
    tip: "气血上限 +12（并回 12），劲力上限 +1。",
  });
  return out;
}

export function applySuperReward(run: GauntletRun, opt: GauntletRewardOption): GauntletRun {
  if (opt.kind === "forge") {
    const god = gearById(opt.id);
    if (!god || god.grade < 5) return run;
    return { ...run, weaponId: god.id };
  }
  if (opt.kind === "aidPair") {
    // §31.12 随机两系助战符各一枚
    const pool = [...ALL_AID_ITEMS];
    const roll = () => Math.random();
    const first = pool.splice(Math.floor(roll() * pool.length), 1)[0]!;
    const second = pool.splice(Math.floor(roll() * pool.length), 1)[0]!;
    return { ...run, items: [...run.items, first, second] };
  }
  if (opt.kind === "elixir") {
    return {
      ...run,
      hpMax: run.hpMax + 12,
      hp: run.hp + 12,
      bonusEnergyMax: (run.bonusEnergyMax ?? 0) + 1,
    };
  }
  // 死士符：超级奖励通道不占常规 2 件上限（preset 截 slice(0,3)）。
  if (run.items.includes(opt.id as LabItemId)) return run;
  return { ...run, items: [...run.items, opt.id as LabItemId] };
}

export function applyGauntletReward(run: GauntletRun, opt: GauntletRewardOption): GauntletRun {
  if (opt.kind === "forge") {
    const nextId = nextGrade(run.weaponId);
    if (!nextId || opt.id !== nextId) return run;
    return { ...run, weaponId: nextId };
  }
  if (opt.kind === "card") {
    // 允许重复卡：叠加是构筑手感的来源。
    return { ...run, deckRecipe: [...run.deckRecipe, opt.id as CardId] };
  }
  if (opt.kind === "tech") {
    const id = opt.id as TechniqueId;
    const mate = opt.targetMate ?? GAUNTLET_SCHOOL_LOADOUT[run.school].fieldMate;
    const owned = run.mateTechs[mate] ?? [];
    if (owned.includes(id)) return run;
    return { ...run, mateTechs: { ...run.mateTechs, [mate]: [...owned, id] } };
  }
  if (opt.kind === "mind") {
    const id = opt.id as MindArtId;
    const mate = opt.targetMate ?? GAUNTLET_SCHOOL_LOADOUT[run.school].fieldMate;
    const owned = run.mateMindArts[mate] ?? [];
    if (owned.includes(id)) return run;
    return { ...run, mateMindArts: { ...run.mateMindArts, [mate]: [...owned, id] } };
  }
  if (run.items.length >= 3 || run.items.includes(opt.id as LabItemId)) return run;
  return { ...run, items: [...run.items, opt.id as LabItemId] };
}

export function loadGauntletBest(): GauntletBest | null {
  try {
    const raw = localStorage.getItem(GAUNTLET_BEST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GauntletBest;
    if (typeof parsed.streak !== "number" || typeof parsed.breaks !== "number") return null;
    return { streak: parsed.streak, breaks: parsed.breaks, pot: typeof parsed.pot === "number" ? parsed.pot : 0 };
  } catch {
    return null;
  }
}

export function isBetterBest(next: GauntletBest, cur: GauntletBest | null): boolean {
  if (!cur) return true;
  if (next.streak !== cur.streak) return next.streak > cur.streak;
  if (next.pot !== cur.pot) return next.pot > cur.pot;
  return next.breaks > cur.breaks;
}

export function saveGauntletBest(run: GauntletRun): GauntletBest | null {
  const cur = loadGauntletBest();
  const next: GauntletBest = { streak: run.streak, breaks: run.totalBreaks, pot: run.pot };
  if (isBetterBest(next, cur)) {
    localStorage.setItem(GAUNTLET_BEST_KEY, JSON.stringify(next));
    return next;
  }
  return cur;
}

export function gauntletDeckExpanded(run: GauntletRun): CardId[] {
  return expandDeckRecipe(run.deckRecipe, 1);
}

export function nextBossId(prev: EnemyId): EnemyId {
  return prev === "usurper" ? "lord" : "usurper";
}

export function starterTip(school: WeaponId): string {
  const counts = new Map<CardId, number>();
  for (const id of GAUNTLET_STARTERS[school]) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts.entries()]
    .map(([id, n]) => {
      const c = CARDS[id];
      return `${c.name}${n > 1 ? `×${n}` : ""}：${c.text}`;
    })
    .join("\n");
}
