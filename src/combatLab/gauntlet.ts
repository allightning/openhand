import { CARDS, ENEMIES, TECHNIQUES } from "../game/content";
import { applyAutoLoadout } from "./autoLoadouts";
import { normalizePreset } from "./draft";
import { expandDeckRecipe } from "./rules";
import type { LabPreset } from "./types";
import { cardSchool, MATES, WEAPON_NAME } from "../game/party";
import { gearById, nextGrade } from "../game/weapons";
import type { Battle, CardId, CompanionId, EnemyId, LabItemId, TechniqueId, WeaponId } from "../game/types";
import { DEFAULT_LAB_TUNING, getLabTuning, setLabTuning, type LabTuning } from "../game/labTuning";
import type { MindArtId } from "../game/mindArts";
import { ALL_MIND_ART_IDS, MIND_ARTS, mindArtFitsSchool, sumMindArtBonuses } from "../game/mindArts";
import { LAB_ITEM_LABEL } from "../game/labV21Constants";
import { grantLabItem } from "../game/labV21";
import {
  GAUNTLET_FINAL_STAGE,
  GAUNTLET_MIDTERM_STAGE,
  PATH_COMPANION_POOL,
  getGauntletFinalStage,
  maxCompanions,
  pathLadder,
  type GauntletPath,
} from "./gauntletPaths";
import { isBreakAlign } from "./labRuleset";
import { BREAK_REWARD_WEIGHTS, itemTip, mindTip, techniqueTip } from "./breakAlign";
import {
  breakStarterDeck,
  injectRogueBondCards,
  rogueLeadId,
  rogueCompanionTierForStage,
  rogueRosterByTier,
} from "./rogueRoster";
import { SCHOOL_EXTRA_HIT, SCHOOL_EXTRA_STATUS, SCHOOL_SCHOOL_STEP, SCHOOL_SUB_ATTACK, SCHOOL_ULTIMATE, breakCardUpgrade } from "../game/rogueCards";
import { GAUNTLET_FOE_IDENTITY } from "../game/enemyKit";
import { MOVE_CARD_IDS } from "../game/intentWeakness";
import { fieldDeck, gearSlotMax, grantCardToLoadout, isAidItem, ownedCardIds, replaceOwnedCard, withMateDeck } from "./loadout";

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

/** 十馆终局。 */
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

/** 黑市梯度：1–3 / 4–7 / 8–10 带内缓涨，过 3、过 7 跳一档。 */
export function marketGradientMul(stage: number): number {
  const s = Math.max(1, stage);
  if (s <= 3) return 1 + 0.06 * (s - 1);
  if (s <= 7) return 1.45 + 0.07 * (s - 4);
  return 2.15 + 0.08 * (s - 8);
}

const MARKET_B_MUL: Record<GauntletMarketKind, number> = {
  heal: 0.9,
  item: 0.9,
  card: 1.1,
  tech: 1.4,
  forge: 1.8,
};

/** 货架价只跟馆序/底彩/档位，不跟当前彩金池。最便宜 ≈ 0.9B。 */
export function marketPrice(kind: GauntletMarketKind, stage: number, tier: GauntletTier, _pot?: number): number {
  const B = basePot(stage);
  const jump = kind === "heal" || kind === "item" ? 1 : marketGradientMul(stage);
  const raw = Math.max(1, Math.round(B * MARKET_B_MUL[kind] * jump * marketTierMul(tier)));
  if (kind === "heal" || kind === "item") return Math.min(raw, B);
  return raw;
}

/** 第 10 馆开战前（stage≥10）取消购买件数上限。 */
export function marketBuyCap(stage: number): number {
  return stage >= 10 ? 99 : 4;
}

/** 刷新费跟底彩走；同一摊第 n 次（0 起）×1.35^n。 */
export function marketRefreshCost(run: { pot: number; stage: number }, refreshIndex = 0): number {
  const base = Math.max(4, Math.round(0.45 * basePot(run.stage)));
  return Math.max(1, Math.round(base * 1.35 ** Math.max(0, refreshIndex)));
}

export function sellPriceFor(kind: GauntletMarketKind, stage: number, tier: GauntletTier): number {
  return Math.max(1, Math.floor(marketPrice(kind, stage, tier) / 2));
}

export const WAGER_BLEED_RATE = 0.1;

export function bleedRemainingPot(pot: number): { pot: number; tax: number } {
  if (pot <= 0) return { pot: 0, tax: 0 };
  const tax = Math.max(1, Math.round(pot * WAGER_BLEED_RATE));
  return { pot: Math.max(0, pot - tax), tax };
}

/** 刚打完的馆序。战后 stage 已 +1，故 fought = stage - 1（未开打时按 1）。 */
export function rewardFought(run: { stage: number }): number {
  return Math.max(1, run.stage - 1);
}

/** 免费奖励与黑市共用：淬刃/换页 3 馆战后，±2 4 馆战后，绝招 7 馆战后。 */
export function rewardGate(fought: number): {
  forge: boolean;
  upgrade: boolean;
  ultimate: boolean;
  advance2: boolean;
} {
  return {
    forge: fought >= 3,
    upgrade: fought >= 3,
    ultimate: fought >= 7,
    advance2: fought >= 4,
  };
}

function breakRewardCardPool(run: GauntletRun): CardId[] {
  const gate = rewardGate(rewardFought(run));
  const have = ownedCardIds(run);
  const pool: CardId[] = [
    ...SCHOOL_SUB_ATTACK[run.school],
    SCHOOL_EXTRA_HIT[run.school],
    SCHOOL_EXTRA_STATUS[run.school],
    SCHOOL_SCHOOL_STEP[run.school],
  ];
  if (gate.advance2) pool.push("advance2", "sidestep", "brace");
  if (gate.ultimate) pool.push(SCHOOL_ULTIMATE[run.school]);
  return pool.filter((id) => CARDS[id] && !have.has(id));
}

export { breakRewardCardPool };

/** 谱牌类权重：攻 > 防 > 位移；位移软顶（牌组已有 ≥3 张位移则权重归零）。 */
function cardRewardBucket(id: CardId): "atk" | "def" | "move" | "ult" {
  if (Object.values(SCHOOL_ULTIMATE).includes(id)) return "ult";
  if ((MOVE_CARD_IDS as CardId[]).includes(id) || id === "advance2" || id === "sidestep") return "move";
  if (id === "brace" || id === "defend" || (CARDS[id]?.type === "skill" && (CARDS[id]?.block ?? 0) > 0)) return "def";
  return "atk";
}

const CARD_BUCKET_WEIGHT: Record<"atk" | "def" | "move" | "ult", number> = {
  atk: 55,
  def: 20,
  move: 15,
  /** 绝招开闸后应能摸到，勿被副攻淹没 */
  ult: 45,
};

function deckMoveCount(deck: CardId[]): number {
  return deck.filter((id) => (MOVE_CARD_IDS as CardId[]).includes(id) || id === "advance2").length;
}

/** 类权重随机抽一张谱；位移在牌组已 ≥3 时不出。 */
export function pickWeightedRewardCard(pool: CardId[], deck: CardId[], rng: () => number): CardId | null {
  if (!pool.length) return null;
  const moveSoftCap = deckMoveCount(deck) >= 3;
  const weighted: Array<{ id: CardId; w: number }> = [];
  for (const id of pool) {
    const bucket = cardRewardBucket(id);
    let w = CARD_BUCKET_WEIGHT[bucket];
    if (bucket === "move" && moveSoftCap) w = 0;
    if (w > 0) weighted.push({ id, w });
  }
  if (!weighted.length) {
    // 位移被软顶后仍有攻/防：回落均匀（池里只剩位移则仍抽位移）
    const fallback = pool.filter((id) => cardRewardBucket(id) !== "move");
    const use = fallback.length ? fallback : pool;
    return use[Math.floor(rng() * use.length)] ?? null;
  }
  const total = weighted.reduce((s, x) => s + x.w, 0);
  let roll = rng() * total;
  for (const row of weighted) {
    if (roll < row.w) return row.id;
    roll -= row.w;
  }
  return weighted[weighted.length - 1]!.id;
}

function forgeGradeOk(run: GauntletRun, nextGrade: number): boolean {
  if (!isBreakAlign()) return nextGrade < 5;
  const gate = rewardGate(rewardFought(run));
  if (!gate.forge) return false;
  return nextGrade <= (gate.ultimate ? 3 : 2);
}

/** 每过馆摆一摊：金创（残血才摆）+ 明码谱 + 小道具 + 外功 +（可升阶时）淬刃。与奖励同批 roll 定，不随重渲染变。 */
export function marketOffers(run: GauntletRun, rng: () => number = Math.random): GauntletMarketOffer[] {
  const out: GauntletMarketOffer[] = [];
  const entry = ladderEntryForRun(run);
  const priceOf = (kind: GauntletMarketKind) => marketPrice(kind, run.stage, entry.tier, run.pot);
  if (run.hp < run.hpMax) {
    const n = Math.ceil(run.hpMax * GAUNTLET_HEAL_RATIO);
    out.push({ id: "heal", kind: "heal", price: priceOf("heal"), title: "金创药", tip: `当场回 ${n} 血（战后回血同方）。` });
  }
  if (run.pendingSkipMarket) return out;
  const cards = isBreakAlign()
    ? breakRewardCardPool(run)
    : cardPool(run.school, Boolean(runCompanions(run).length || run.lifelineCompanion));
  if (cards.length > 0) {
    const id = isBreakAlign()
      ? pickWeightedRewardCard(cards, [...ownedCardIds(run)], rng)
      : cards[Math.floor(rng() * cards.length)]!;
    if (id) {
      out.push({ id: `card:${id}`, kind: "card", price: priceOf("card"), title: `谱 · ${CARDS[id].name}`, tip: `${CARDS[id].text}（买入进牌组）` });
    }
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
  if (nextId && next && forgeGradeOk(run, next.grade)) {
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
    return grantCardToLoadout({ ...run, pot }, offer.id.slice(5) as CardId);
  }
  if (offer.kind === "item") {
    const g = grantLabItem(run.items, run.itemCharges, offer.id.slice(5) as LabItemId, undefined, 3);
    if (!g) return null;
    return { ...run, pot, items: g.items, itemCharges: g.charges };
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

/** 峰值彩金锚：二次曲线，馆 10 约 880，不再指数上亿。 */
export function peakPotAnchor(stage: number): number {
  const s = Math.max(1, stage);
  return Math.round(60 + 22 * s + 6 * s * s);
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

/** 第二次馆败：带伤过馆，不另开亡命线。 */
export function canOfferScarPass(run: GauntletRun): boolean {
  return Boolean(run.bankruptUsed) && !run.scarPassUsed && (run.scars ?? 0) < 1 && run.stage < getGauntletFinalStage();
}

export function applyScarPass(run: GauntletRun): GauntletRun {
  const tax = Math.max(1, Math.round(run.pot * 0.2));
  const hpMax = scaledHpMax(run);
  return {
    ...run,
    pot: Math.max(0, run.pot - tax),
    stage: run.stage + 1,
    streak: 0,
    scars: (run.scars ?? 0) + 1,
    scarPassUsed: true,
    forceDangerNext: true,
    hp: Math.max(1, Math.floor(hpMax * 0.8)),
    hpMax,
    wager: null,
    lastPotText: `带伤过馆 -${tax}`,
  };
}

export function applyLifeline(run: GauntletRun, kind: LifelineKind, rng: () => number = Math.random): GauntletRun {
  if (kind === "stat50") return { ...run, lifeline: kind, statBoostMul: 1.5 };
  if (kind === "divineWeapons") return { ...run, lifeline: kind, divineWeapons: true };
  if (kind === "aidPair") {
    const aid = AID_ITEM_BY_SCHOOL[run.school];
    const g = grantLabItem(run.items, run.itemCharges, aid, undefined, 3);
    if (!g) return { ...run, lifeline: kind };
    return { ...run, lifeline: kind, items: g.items, itemCharges: g.charges };
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
    skipNextWager: true,
    wager: null,
    lastPotText: `赊账复活 -${cost}`,
  };
}

function scaledHpMax(run: GauntletRun): number {
  const base = Math.max(MATES[gauntletFieldMate(run.school)].hp, isBreakAlign() ? 42 : 48);
  const fromRun = run.hpMax;
  const raw = Math.max(base, fromRun);
  return run.statBoostMul > 1 ? Math.floor(raw * run.statBoostMul) : raw;
}

/** @deprecated §31.17 改用 reviveGauntletRun */
export function redeemGauntletRun(run: GauntletRun): GauntletRun | null {
  return reviveGauntletRun(run);
}

/** §31.13 无尽踢馆：对战版可在终馆后继续；拆招短局（10 馆）通关即结，无尽后开独立模式。 */
export const GAUNTLET_ENDLESS = false;

export function isGauntletEndless(): boolean {
  return false;
}

/** §31.13 赌馆启动资金：开局 20 彩金——够押小注，攒过馆底彩换重注。 */
export const GAUNTLET_START_POT = 20;

/** §31.13 赌馆：彩金（本场成绩+赌注本金）。底彩 = 过馆固定进账。 */
export function basePot(stage: number): number {
  return 10 + 6 * stage;
}

export type WagerKind =
  | "chain"
  | "eye"
  | "clean"
  | "speed"
  | "blood"
  | "fist"
  | "range"
  | "guard"
  | "school"
  | "swap";

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

/** 注额帽随馆序放开：1/2/3 = 30/50/70；4 起 120+50×(馆-4)；7 后每馆 +100。 */
export function wagerStakeCap(stage: number): number {
  const s = Math.max(1, stage);
  if (s <= 1) return 30;
  if (s === 2) return 50;
  if (s === 3) return 70;
  if (s <= 7) return 120 + 50 * (s - 4);
  return 270 + 100 * (s - 7);
}

export function wagerStakeMax(pot: number, stage = 1): number {
  return Math.max(1, Math.min(pot, wagerStakeCap(stage)));
}

function wagerOdds(kind: WagerKind): number {
  if (kind === "clean" || kind === "guard" || kind === "school") return 1.5;
  if (kind === "chain" || kind === "range" || kind === "swap") return 2.5;
  if (kind === "eye") return 3;
  return 2;
}

/**
 * 盘口每场开三。主盘：完璧/速胜/血战/赤手/不贴身/堆挡/本系刀。连破/破眼默认不开。
 */
export function wagerOffers(run: GauntletRun, rng: () => number = Math.random): WagerOffer[] {
  const s = run.stage;
  const final = getGauntletFinalStage();
  const tierIdx = s <= 2 ? 0 : s <= 4 ? 1 : s <= 6 ? 2 : 3;
  const k = Math.max(0, s - final);
  const chainTarget = 3 + tierIdx + k;
  const eyeTarget = (s >= 5 ? 2 : 1) + Math.floor(k / 2);
  const speedTarget = (s >= 5 ? 7 : 6) + Math.floor(k / 2);
  const mk = (kind: WagerKind, title: string, target: number, tip: string): WagerOffer => ({
    kind,
    title,
    target,
    odds: wagerOdds(kind),
    tip,
  });
  const all: WagerOffer[] = [
    mk("chain", "连破注", chainTarget, `本局硬破 ≥${chainTarget} 段。赢：注额 ×${wagerOdds("chain")}。`),
    mk("eye", "破眼注", eyeTarget, `本局破眼 ≥${eyeTarget} 次。赢：注额 ×${wagerOdds("eye")}。`),
    mk("clean", "完璧注", 75, `赢下本馆且收势气血 ≥75%。赢：注额 ×${wagerOdds("clean")}。`),
    mk("speed", "速胜注", speedTarget, `在 ${speedTarget} 回合内赢下本馆。赢：注额 ×${wagerOdds("speed")}。`),
    mk("blood", "血战注", 35, `赢下本馆且收势气血 ≤35%。赢：注额 ×${wagerOdds("blood")}。`),
    mk("fist", "赤手注", 0, `本局不用小道具/助战符，空手赢馆。赢：注额 ×${wagerOdds("fist")}。`),
    mk("range", "不贴身", 2, `赢馆且收势与敌相隔 ≥2 格。赢：注额 ×${wagerOdds("range")}。`),
    mk("guard", "堆挡注", 8, `赢馆且收势格挡 ≥8。赢：注额 ×${wagerOdds("guard")}。`),
    mk("school", "本系刀", 1, `赢馆且本局攻击牌皆为本系（须至少打出一张攻击）。赢：注额 ×${wagerOdds("school")}。`),
    mk("swap", "换人注", 1, `本局换人至少 1 次。赢：注额 ×${wagerOdds("swap")}。`),
  ];
  const pool = all.filter((o) => {
    if (o.kind === "fist" && run.items.length === 0) return false;
    if (o.kind === "chain" || o.kind === "eye") return false;
    if (o.kind === "swap" && runCompanions(run).length < 1) return false;
    if (o.kind === "range" && (run.school === "spear" || run.school === "staff")) return false;
    return true;
  });
  const weights: Record<WagerKind, number> = {
    chain: 8,
    eye: 6,
    clean: 16,
    speed: 14,
    blood: 10,
    fist: 10,
    range: run.school === "palm" ? 6 : 12,
    guard: 16,
    school: 14,
    swap: 14,
  };
  const out: WagerOffer[] = [];
  const bag = [...pool];
  while (out.length < 3 && bag.length) {
    const total = bag.reduce((sum, o) => sum + (weights[o.kind] ?? 10), 0);
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
  /** 本局破眼次数（破眼注）。 */
  eyes: number;
  /** 本局用过小道具/助战符（赤手注）。 */
  itemsUsed: boolean;
  endDist?: number;
  endBlock?: number;
  schoolPure?: boolean;
  swaps?: number;
}

export function wagerBattleStats(b: Battle, won: boolean): WagerStats {
  return {
    breaks: b.v2BreakCount ?? 0,
    turns: b.turn,
    hpEndRatio: b.player.maxHp > 0 ? b.player.hp / b.player.maxHp : 0,
    won,
    eyes: b.v2EyeCount ?? 0,
    itemsUsed: (b.v2ItemUses ?? 0) > 0,
    endDist: Math.abs(b.player.pos - b.enemy.pos),
    endBlock: b.playerBlock,
    schoolPure: (b.v2AttackPlays ?? 0) > 0 && !(b.v2OffSchoolAtk ?? 0),
    swaps: b.v2SwapCount ?? 0,
  };
}

/** 假定注额已从池里扣走。赢：返还 注额×赔率；飞：0。 */
export function resolveWager(run: GauntletRun, stats: WagerStats): { won: boolean; payout: number; text: string } {
  const w = run.wager;
  if (!w) return { won: false, payout: 0, text: "" };
  let ok = false;
  if (w.kind === "chain") ok = stats.breaks >= w.target;
  else if (w.kind === "eye") ok = stats.eyes >= w.target;
  else if (w.kind === "clean") ok = stats.hpEndRatio >= w.target / 100;
  else if (w.kind === "speed") ok = stats.turns <= w.target;
  else if (w.kind === "blood") ok = stats.hpEndRatio <= w.target / 100;
  else if (w.kind === "fist") ok = !stats.itemsUsed;
  else if (w.kind === "range") ok = (stats.endDist ?? 0) >= w.target;
  else if (w.kind === "guard") ok = (stats.endBlock ?? 0) >= w.target;
  else if (w.kind === "school") ok = Boolean(stats.schoolPure);
  else if (w.kind === "swap") ok = (stats.swaps ?? 0) >= w.target;
  const won = Boolean(stats.won && ok);
  const payout = won ? Math.round(w.stake * w.odds) : 0;
  const text = won
    ? `「${wagerLabel(w.kind)}」中了 +${payout} 彩金`
    : `「${wagerLabel(w.kind)}」飞了（注额已扣）`;
  return { won, payout, text };
}

export function wagerLabel(kind: WagerKind): string {
  const labels: Record<WagerKind, string> = {
    chain: "连破注",
    eye: "破眼注",
    clean: "完璧注",
    speed: "速胜注",
    blood: "血战注",
    fist: "赤手注",
    range: "不贴身",
    guard: "堆挡注",
    school: "本系刀",
    swap: "换人注",
  };
  return labels[kind];
}

/** 馆结算：注已托管。赢馆+中注 → 返还赔率并发底彩；赢馆飞注 → 只发底彩；输馆有注 → 底彩不发并抽 10%。 */
export function settleHallPot(
  run: GauntletRun,
  stats: WagerStats,
  fightWon: boolean,
): { pot: number; texts: string[] } {
  const texts: string[] = [];
  let pot = run.pot;
  if (run.wager) {
    const r = resolveWager(run, stats);
    pot += r.payout;
    texts.push(r.text);
  }
  if (fightWon) {
    const mul = run.pendingBasePotMul ?? 1;
    const base = Math.max(0, Math.round(basePot(run.stage) * mul));
    pot += base;
    texts.push(`底彩 +${base}`);
  } else if (run.wager) {
    const bled = bleedRemainingPot(pot);
    if (bled.tax > 0) {
      pot = bled.pot;
      texts.push(`出血 -${bled.tax}`);
    }
  }
  return { pot: Math.max(0, pot), texts };
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

/** 拆招开踢用花名册主角；经典模式仍用旧 loadout。 */
export function gauntletFieldMate(school: WeaponId): CompanionId {
  return isBreakAlign() ? rogueLeadId(school) : GAUNTLET_SCHOOL_LOADOUT[school].fieldMate;
}

/**
 * 战间奖励权重占位（§31.9 甲方可调）。难度阶梯越高，淬刃/外功权重越大、选项越多：
 * 简单 3 选 / 中等 4 选 / 困难 4 选偏重养成；第 7 馆后超级奖励三选一，再发本轮免费奖励。
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

/** 神兵/仙药只在第 7 馆打完后出现，并且不能顶掉本轮免费奖励。 */
export function isMidtermSuperFought(fought: number): boolean {
  return fought === GAUNTLET_MIDTERM_STAGE;
}

const ALL_ITEMS: LabItemId[] = ["jinchuang", "xiujian", "huiqi", "lianhuan", "pojin"];

export type GauntletRewardKind = "tech" | "mind" | "item" | "aid" | "card" | "forge" | "upgrade" | "elixir" | "aidPair";

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
  equippedItems?: LabItemId[];
  equippedAids?: LabItemId[];
  stashCards?: CardId[];
  mateDecks?: Partial<Record<CompanionId, CardId[]>>;
  skipNextWager?: boolean;
  /** 每种道具剩余颗数；发道具时 +2。 */
  itemCharges?: Partial<Record<LabItemId, number>>;
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
  scars?: number;
  scarPassUsed?: boolean;
  finaleKind?: "mob" | "seat" | "private";
  seenEvents?: string[];
  pendingExtraWaves?: number;
  pendingDmgMul?: number;
  pendingHallLaw?: "noMove" | "mustMelee" | "earlyEye";
  pendingRewardBonus?: number;
  pendingBasePotMul?: number;
  pendingSkipMarket?: boolean;
  skipCompanionPick?: boolean;
  forceDangerNext?: boolean;
  pendingIntel?: boolean;
  pendingSkirmish?: "save" | "duel";
  pendingRecruit?: CompanionId;
  pendingGuestEnemyId?: EnemyId;
  skirmishActive?: boolean;
  storyFlags?: string[];
  bgUses?: Record<string, number>;
  bgAssign?: Record<string, string>;
}

export type GauntletScreen =
  | "intro"
  | "path"
  | "pick"
  | "banker"
  | "reward"
  | "result"
  | "companion"
  | "wager"
  | "lifeline"
  | "loadout"
  | "rewardTarget"
  | "event"
  | "finale"
  | "scar";

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
  const mate = gauntletFieldMate(school);
  const rosterHp = MATES[mate]?.hp ?? 42;
  const hpMax = Math.max(base.hpMax ?? rosterHp, isBreakAlign() ? rosterHp : 48);
  const recipe = [...breakStarterDeck(school)];
  return {
    path,
    school,
    stage: 1,
    streak: 0,
    totalBreaks: 0,
    deckRecipe: recipe,
    mateDecks: { [mate]: [...recipe] },
    stashCards: [],
    techniques: [],
    mateTechs: { [mate]: [] },
    mateMindArts: { [mate]: [] },
    items: [],
    itemCharges: {},
    hp: hpMax,
    hpMax,
    startedAt: Date.now(),
    weaponId: `${school}-a-${isBreakAlign() ? 1 : 3}`,
    bossId,
    pot: GAUNTLET_START_POT,
    wager: null,
    bankruptUsed: false,
    bankerChosen: false,
    facedEnemies: [],
    companions: [],
    statBoostMul: 1,
    divineWeapons: false,
    scars: 0,
    seenEvents: [],
    bgUses: {},
    bgAssign: {},
  };
}

export function buildGauntletPreset(run: GauntletRun): LabPreset {
  const entry = ladderEntryForRun(run);
  const cfg = GAUNTLET_SCHOOL_LOADOUT[run.school];
  const enemyId = resolveStageEnemy(entry, run.bossId, run.facedEnemies);
  const extras = entry.extraEnemyIds ? [...entry.extraEnemyIds] : [];
  const used = new Set<EnemyId>([enemyId, ...extras, ...run.facedEnemies]);
  const pool = pathLadder(run.path)
    .map((e) => e.enemyId)
    .filter((id) => !used.has(id));
  const waveDelta = run.pendingExtraWaves ?? 0;
  if (waveDelta > 0) {
    for (let i = 0; i < waveDelta; i++) {
      const id = pool[i];
      if (id) extras.push(id);
    }
  } else if (waveDelta < 0) {
    extras.splice(Math.max(0, extras.length + waveDelta));
  }
  const guest = run.pendingGuestEnemyId;
  if (guest && guest !== enemyId && !extras.includes(guest)) extras.unshift(guest);
  let waveEnemyId = waveEnemyForStage(run, entry, enemyId);
  let waveQueue: EnemyId[] | undefined;
  let extraFoeIds = extras.length ? extras : undefined;
  if (isBreakAlign()) {
    waveEnemyId = extras[0];
    waveQueue = extras.length > 1 ? extras.slice(1) : undefined;
    extraFoeIds = undefined;
  }
  const base = applyAutoLoadout(cfg.loadoutId, 3, 0, { enemyId });
  const mate = gauntletFieldMate(run.school);
  const weapon = run.divineWeapons
    ? `${run.school}-a-5`
    : (run.weaponId ?? base.mateWeapons?.[mate] ?? `${run.school}-a-${isBreakAlign() ? 1 : 3}`);
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
    waveQueue,
    extraFoeIds,
    party,
    fieldMate: mate,
    deckRecipe: [...fieldDeck(run)],
    mateDeckRecipes: run.mateDecks,
    mateWeapons,
    mateTechs,
    mateMinds: { ...run.mateMindArts },
    labItems: [...(run.equippedItems ?? run.items.filter((id) => !isAidItem(id))), ...(run.equippedAids ?? run.items.filter(isAidItem))].slice(0, gearSlotMax(run.stage) * 2),
    labItemCharges: { ...(run.itemCharges ?? {}) },
    hp: hpMax,
    hpMax,
    statBoostMul: run.statBoostMul,
    gauntletStage: run.stage,
    hallLaw: run.pendingHallLaw,
  });
}

export function duelEnemyForSchool(school: WeaponId): EnemyId {
  if (school === "palm") return "mob_monk_01";
  if (school === "staff") return "mob_monk_02";
  if (school === "saber") return "mob_road_01";
  if (school === "spear") return "mob_canal_01";
  if (school === "hook") return "mob_escortBand_03";
  return "mob_court_03";
}

export function upcomingFoeNames(run: GauntletRun, n = 2): Array<{ stage: number; name: string }> {
  const out: Array<{ stage: number; name: string }> = [];
  const cap = getGauntletFinalStage();
  for (let s = run.stage; s < run.stage + n && s <= cap; s++) {
    const entry = ladderEntryForRun(run, s);
    const id = resolveStageEnemy(entry, run.bossId, run.facedEnemies);
    const name = GAUNTLET_FOE_IDENTITY[id]?.name ?? ENEMIES[id]?.name ?? id;
    out.push({ stage: s, name });
  }
  return out;
}

export function intelReport(run: GauntletRun): string {
  if (!run.pendingIntel) return "";
  return upcomingFoeNames(run, 2)
    .map((r) => `第${r.stage}馆 ${r.name}`)
    .join(" · ");
}

const RIVAL_WEAPON: Record<WeaponId, WeaponId> = {
  saber: "staff",
  staff: "saber",
  palm: "sword",
  sword: "palm",
  spear: "hook",
  hook: "spear",
};

export function relatedCompanionIds(run: GauntletRun, pool: CompanionId[]): CompanionId[] {
  const first = runCompanions(run)[0];
  if (!first) return pool;
  const w = MATES[first]?.weapon;
  if (!w) return pool;
  const rival = RIVAL_WEAPON[w];
  const same = pool.filter((id) => MATES[id]?.weapon === w);
  const riv = pool.filter((id) => MATES[id]?.weapon === rival);
  const rest = pool.filter((id) => MATES[id]?.weapon !== w && MATES[id]?.weapon !== rival);
  return [...same, ...riv, ...rest];
}

export function buildSkirmishPreset(run: GauntletRun): LabPreset {
  const recruit = run.pendingRecruit;
  const duel = run.pendingSkirmish === "duel" && recruit;
  const enemyId: EnemyId = duel
    ? duelEnemyForSchool(MATES[recruit]!.weapon)
    : run.path === "shaolin"
      ? "mob_monk_01"
      : run.path === "court"
        ? "mob_yamenRunner_01"
        : "mob_road_01";
  const who = recruit ? (MATES[recruit]?.name ?? "") : "";
  const base = buildGauntletPreset({
    ...run,
    stage: Math.min(run.stage, 2),
    pendingExtraWaves: -99,
    pendingHallLaw: undefined,
    pendingDmgMul: 0.7,
    pendingGuestEnemyId: undefined,
  });
  return {
    ...base,
    id: `skirmish-${run.school}`,
    name: duel ? `点到 · ${who}` : who ? `替${who}挡刀` : "路遇出手",
    blurb: "短战 · 不占馆号 · 禁注",
    enemyId,
    waveEnemyId: undefined,
    waveQueue: undefined,
    extraFoeIds: undefined,
    hallLaw: undefined,
  };
}

export function applyStageTuning(entry: GauntletLadderEntry, run?: Pick<GauntletRun, "pendingDmgMul" | "forceDangerNext" | "scars">): void {
  // §31.14 总督按档：简单 45% / 中等 55% / 困难 65% / 极难 80%（单回合攻击总伤占你气血上限的比例）
  const capRatio = entry.tier === "easy" ? 0.45 : entry.tier === "mid" ? 0.55 : entry.tier === "hard" ? 0.65 : 0.8;
  const stressCap =
    isBreakAlign() && entry.stage <= 2 ? 0 : (entry.stressCap ?? DEFAULT_LAB_TUNING.enemyStressCap);
  const dmgMul = run?.pendingDmgMul ?? 1;
  setLabTuning({
    enemyHpMul: entry.hpMul,
    enemySegBonus: entry.segBonus,
    dmgCoef: Math.min(2.6, entry.dmgCoef * dmgMul),
    v2Grudge: Boolean(entry.forceGrudge || run?.forceDangerNext || (run?.scars ?? 0) > 0 && entry.tier === "extreme"),
    enemyTurnCapRatio: capRatio,
    enemyStressCap: stressCap,
  });
}

export function afterGauntletWin(
  run: GauntletRun,
  breaksThisBattle: number,
  _hpLeft: number,
  hpMax: number,
  enemyId: EnemyId,
): GauntletRun {
  const healed = hpMax;
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

export function consumeFightStartMods(run: GauntletRun): GauntletRun {
  return {
    ...run,
    pendingExtraWaves: 0,
    pendingDmgMul: undefined,
    pendingHallLaw: undefined,
    pendingGuestEnemyId: undefined,
  };
}

export function consumeHallPotMods(run: GauntletRun): GauntletRun {
  return { ...run, pendingBasePotMul: undefined };
}

export function consumeCampMods(run: GauntletRun): GauntletRun {
  return { ...run, pendingRewardBonus: 0, pendingSkipMarket: false };
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

function pickWeightedKind(rng: () => number, tier: Exclude<GauntletTier, "extreme">, fought: number): GauntletRewardKind {
  const w = isBreakAlign() ? BREAK_REWARD_WEIGHTS : { ...GAUNTLET_REWARD_TIERS[tier].weights, card: 0, forge: 0, upgrade: 0 };
  const gate = rewardGate(fought);
  const forgeW = isBreakAlign() && gate.forge ? w.forge : 0;
  const upgradeW = isBreakAlign() && gate.upgrade ? w.upgrade : 0;
  const parts: Array<[GauntletRewardKind, number]> = [
    ["tech", w.tech],
    ["mind", w.mind],
    ["item", w.item],
    ["aid", w.aid],
    ["card", "card" in w ? w.card : 0],
    ["forge", forgeW],
    ["upgrade", upgradeW],
  ];
  const total = parts.reduce((s, [, n]) => s + n, 0);
  let roll = rng() * Math.max(1, total);
  for (const [kind, n] of parts) {
    if (n <= 0) continue;
    if (roll < n) return kind;
    roll -= n;
  }
  return "card";
}

/** 淬刃：拆招必须 1→2→3；3–6 馆顶 2 档，7 馆后顶 3 档。经典封顶玄阶。 */
function forgeOption(run: GauntletRun): GauntletRewardOption | null {
  const cur = gearById(run.weaponId);
  const nextId = nextGrade(run.weaponId);
  const next = nextId ? gearById(nextId) : null;
  if (!cur || !next || !nextId) return null;
  if (!forgeGradeOk(run, next.grade)) return null;
  const dmgGain = (next.damage ?? 0) - (cur.damage ?? 0);
  return {
    kind: "forge",
    id: nextId,
    title: `淬刃 · ${next.name}`,
    tip: `${cur.name} → ${next.name}：每击 +${dmgGain} 伤，械效增强（悬停兵刃牌可看细则）。`,
  };
}

function upgradeOption(run: GauntletRun, usedFrom: Set<CardId>, rng: () => number): GauntletRewardOption | null {
  if (!isBreakAlign()) return null;
  if (!rewardGate(rewardFought(run)).upgrade) return null;
  const seen = new Set<CardId>();
  const pool: CardId[] = [];
  for (const id of ownedCardIds(run)) {
    if (seen.has(id) || usedFrom.has(id)) continue;
    seen.add(id);
    const to = breakCardUpgrade(id);
    if (to && !ownedCardIds(run).has(to)) pool.push(id);
  }
  const from = pickOne(pool, rng);
  if (!from) return null;
  const to = breakCardUpgrade(from);
  if (!to) return null;
  usedFrom.add(from);
  return {
    kind: "upgrade",
    id: from,
    title: `换页 · ${CARDS[from].name} → ${CARDS[to].name}`,
    tip: `${CARDS[from].text} → ${CARDS[to].text}（进步/撤步永不换成 ±2）`,
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

/** 拆招：4 选 2；第 9 馆后 4 选 3。经典：按档 3/4 选 1。 */
export function gauntletRewardTakeCount(run: GauntletRun): number {
  if (!isBreakAlign()) return 1;
  const fought = Math.max(1, run.stage - 1);
  const base = fought >= 9 ? 3 : 2;
  return base + Math.max(0, run.pendingRewardBonus ?? 0);
}

export function rollGauntletRewards(run: GauntletRun, rng: () => number = Math.random): GauntletRewardOption[] {
  const tier = rewardTier(run);
  const picks = isBreakAlign() ? 4 : GAUNTLET_REWARD_TIERS[tier].picks;
  const out: GauntletRewardOption[] = [];
  const usedTech = new Set(allOwnedTechs(run));
  const usedMind = new Set(Object.values(run.mateMindArts).flat());
  const usedItems = new Set(run.items);
  const usedCards = new Set<CardId>();
  const usedUpgradeFrom = new Set<CardId>();
  const itemCap = isBreakAlign() ? 2 : 3;
  const fought = Math.max(1, run.stage - 1);
  let guard = 0;
  while (out.length < picks && guard < 40) {
    guard += 1;
    const kind = pickWeightedKind(rng, tier, fought);
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
    } else if (kind === "card") {
      const pool = breakRewardCardPool(run).filter((id) => !usedCards.has(id));
      const id = pickWeightedRewardCard(pool, [...ownedCardIds(run), ...usedCards], rng);
      if (!id) continue;
      usedCards.add(id);
      out.push({ kind: "card", id, title: CARDS[id].name, tip: CARDS[id].text });
    } else if (kind === "item" || kind === "aid") {
      if (run.items.length >= itemCap) continue;
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
    } else if (kind === "forge") {
      if (out.some((o) => o.kind === "forge")) continue;
      const fo = forgeOption(run);
      if (!fo) continue;
      out.push(fo);
    } else if (kind === "upgrade") {
      const uo = upgradeOption(run, usedUpgradeFrom, rng);
      if (!uo) continue;
      out.push(uo);
    }
  }
  while (out.length < picks) {
    const pool = ALL_MIND_ART_IDS.filter((id) => !usedMind.has(id) && mindArtFitsSchool(id, run.school));
    const id = pickOne(pool, rng);
    if (!id) break;
    usedMind.add(id);
    out.push({ kind: "mind", id, title: MIND_ARTS[id].name, tip: mindTip(id) });
  }
  if (isBreakAlign() && fought <= 2 && !out.some((o) => o.kind === "card")) {
    const pool = breakRewardCardPool(run).filter((id) => !usedCards.has(id));
    const id = pickWeightedRewardCard(pool, [...ownedCardIds(run), ...usedCards], rng);
    if (id) {
      if (out.length >= picks) out.pop();
      out.unshift({ kind: "card", id, title: CARDS[id].name, tip: CARDS[id].text });
    }
  }
  if (isBreakAlign() && rewardGate(fought).upgrade) {
    const uo = upgradeOption(run, usedUpgradeFrom, rng);
    if (uo && !out.some((o) => o.kind === "upgrade")) {
      if (out.length >= picks) out.pop();
      out.unshift(uo);
    }
  }
  if (isBreakAlign() && rewardGate(fought).forge) {
    const fo = forgeOption(run);
    if (fo && !out.some((o) => o.kind === "forge")) {
      if (out.length >= picks) out.pop();
      out.unshift(fo);
    }
  }
  return out.slice(0, picks);
}

/** 拆招：3/7 馆六抽四选一；经典：路径池三选一（保底同系+异系）。 */
export function rollCompanionChoices(run: GauntletRun, rng: () => number = Math.random): CompanionId[] {
  if (isBreakAlign()) {
    const fought = Math.max(1, run.stage - 1);
    const tier = rogueCompanionTierForStage(fought) ?? (run.companions?.length ? 3 : 2);
    const field = rogueLeadId(run.school);
    const taken = new Set<CompanionId>([field, ...runCompanions(run)]);
    const pool = relatedCompanionIds(
      run,
      rogueRosterByTier(tier)
        .map((m) => m.id)
        .filter((id) => !taken.has(id)),
    );
    const out: CompanionId[] = [];
    const bag = [...pool];
    while (out.length < 4 && bag.length) {
      const window = Math.min(bag.length, out.length === 0 && runCompanions(run).length ? 1 : 3);
      const idx = Math.floor(rng() * window);
      out.push(bag.splice(idx, 1)[0]!);
    }
    return out;
  }
  const field = GAUNTLET_SCHOOL_LOADOUT[run.school].fieldMate;
  const taken = new Set(runCompanions(run));
  const pool = [...PATH_COMPANION_POOL[run.path]].filter((id) => id !== field && !taken.has(id));
  const same = pool.filter((id) => MATES[id].weapon === run.school);
  const cross = pool.filter((id) => MATES[id].weapon !== run.school);
  const out: CompanionId[] = [];
  if (same.length) out.push(same.splice(Math.floor(rng() * same.length), 1)[0]!);
  if (cross.length) out.push(cross.splice(Math.floor(rng() * cross.length), 1)[0]!);
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
  const schools = [run.school, ...next.map((id) => MATES[id].weapon)];
  let deck = run.deckRecipe;
  let nextRun = { ...run, companion: next[0], companions: next };
  if (isBreakAlign()) {
    const theirs = injectRogueBondCards(breakStarterDeck(MATES[mateId].weapon), MATES[mateId].weapon, schools);
    nextRun = withMateDeck(nextRun, mateId, theirs);
  }
  return nextRun;
}

/** §31.9 第 7 馆后超级奖励三选一：神兵 / 死士符 / 仙药。 */
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
    const pool = [...ALL_AID_ITEMS];
    const roll = () => Math.random();
    const first = pool.splice(Math.floor(roll() * pool.length), 1)[0]!;
    const second = pool.splice(Math.floor(roll() * pool.length), 1)[0]!;
    let next: GauntletRun = { ...run };
    const a = grantLabItem(next.items, next.itemCharges, first, undefined, 6);
    if (a) next = { ...next, items: a.items, itemCharges: a.charges };
    const b = grantLabItem(next.items, next.itemCharges, second, undefined, 6);
    if (b) next = { ...next, items: b.items, itemCharges: b.charges };
    return next;
  }
  if (opt.kind === "elixir") {
    return {
      ...run,
      hpMax: run.hpMax + 12,
      hp: run.hp + 12,
      bonusEnergyMax: (run.bonusEnergyMax ?? 0) + 1,
    };
  }
  const g = grantLabItem(run.items, run.itemCharges, opt.id as LabItemId, undefined, 6);
  if (!g) return run;
  return { ...run, items: g.items, itemCharges: g.charges };
}

export function applyGauntletReward(run: GauntletRun, opt: GauntletRewardOption): GauntletRun {
  if (opt.kind === "forge") {
    const nextId = nextGrade(run.weaponId);
    if (!nextId || opt.id !== nextId) return run;
    return { ...run, weaponId: nextId };
  }
  if (opt.kind === "upgrade") {
    const from = opt.id as CardId;
    const to = breakCardUpgrade(from);
    if (!to) return run;
    if (!ownedCardIds(run).has(from)) return run;
    return replaceOwnedCard(run, from, to);
  }
  if (opt.kind === "card") {
    return grantCardToLoadout(run, opt.id as CardId);
  }
  if (opt.kind === "tech") {
    const id = opt.id as TechniqueId;
    const mate = opt.targetMate ?? gauntletFieldMate(run.school);
    const owned = run.mateTechs[mate] ?? [];
    if (owned.includes(id)) return run;
    return { ...run, mateTechs: { ...run.mateTechs, [mate]: [...owned, id] } };
  }
  if (opt.kind === "mind") {
    const id = opt.id as MindArtId;
    const mate = opt.targetMate ?? gauntletFieldMate(run.school);
    const owned = run.mateMindArts[mate] ?? [];
    if (owned.includes(id)) return run;
    return { ...run, mateMindArts: { ...run.mateMindArts, [mate]: [...owned, id] } };
  }
  const g = grantLabItem(run.items, run.itemCharges, opt.id as LabItemId, undefined, isBreakAlign() ? 2 : 3);
  if (!g) return run;
  return { ...run, items: g.items, itemCharges: g.charges };
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
  const recipe = breakStarterDeck(school);
  const counts = new Map<CardId, number>();
  for (const id of recipe) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts.entries()]
    .map(([id, n]) => {
      const c = CARDS[id];
      return `${c.name}${n > 1 ? `×${n}` : ""}：${c.text}`;
    })
    .join("\n");
}
