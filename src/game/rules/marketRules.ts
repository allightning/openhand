import { CARDS, TECHNIQUES, cardDisplayText, gearById, nextGrade, LAB_ITEM_LABEL, grantLabItem, isBreakAlign, shellRunContext, itemTip, techniqueTip, grantCardToLoadout, ownedCardIds } from "./gauntletKit";
import { GauntletRun, GauntletTier, GauntletMarketKind, GauntletMarketOffer, GauntletShopStall, GAUNTLET_HEAL_RATIO, ALL_ITEMS } from "./gauntletModel";
import type { CardId, LabItemId, TechniqueId } from "../types";
import { gauntletFieldMate, gauntletPorts } from "./gauntletPorts";
import { breakRewardCardPool, forgeGradeOk, pickWeightedRewardCard, techPool, allOwnedTechs } from "./rewardRules";
import { grantTechToRun } from "./lifelineRules";
import { ladderEntry, ladderEntryForRun } from "./ladderRules";
import { basePot } from "./wagerRules";

export function marketStallOf(o: Pick<GauntletMarketOffer, "kind" | "stall">): GauntletShopStall {
  if (o.stall) return o.stall;
  return o.kind === "tech" || o.kind === "forge" ? "black" : "pawn";
}

export const GAUNTLET_MARKET_BASE: Record<GauntletMarketKind, number> = {
  heal: 12,
  card: 18,
  item: 15,
  tech: 25,
  forge: 40,
};

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

/** 期末馆开战前取消购买件数上限。 */
export function marketBuyCap(stage: number, final = gauntletPorts().finalStage): number {
  return stage >= final ? 99 : 4;
}

/** 刷新费跟底彩走；同一摊第 n 次（0 起）×1.35^n。 */
export function marketRefreshCost(run: { pot: number; stage: number }, refreshIndex = 0): number {
  const base = Math.max(4, Math.round(0.45 * basePot(run.stage)));
  return Math.max(1, Math.round(base * 1.35 ** Math.max(0, refreshIndex)));
}

export function sellPriceFor(kind: GauntletMarketKind, stage: number, tier: GauntletTier): number {
  return Math.max(1, Math.floor(marketPrice(kind, stage, tier) / 2));
}


function pushOffer(
  out: GauntletMarketOffer[],
  offer: Omit<GauntletMarketOffer, "stall"> & { stall?: GauntletShopStall },
): void {
  out.push({ ...offer, stall: offer.stall ?? marketStallOf(offer) });
}

/** 每过馆摆摊：当铺（金创/谱/小货）常驻；黑市（外功/淬刃）可被 skipMarket 藏掉。 */
export function marketOffers(run: GauntletRun, rng: () => number): GauntletMarketOffer[] {
  const out: GauntletMarketOffer[] = [];
  const entry = ladderEntryForRun(run);
  const priceOf = (kind: GauntletMarketKind) => marketPrice(kind, run.stage, entry.tier, run.pot);
  const climbCopy = !isBreakAlign();
  if (run.hp < run.hpMax) {
    const n = Math.ceil(run.hpMax * GAUNTLET_HEAL_RATIO);
    pushOffer(out, {
      id: "heal",
      kind: "heal",
      price: priceOf("heal"),
      title: "金创药",
      tip: `现在回 ${n} 点血。这馆打完再回 ${n} 点。残血才摆这一味。`,
      stall: "pawn",
    });
  }
  const cards = breakRewardCardPool(run);
  if (cards.length > 0) {
    const id = pickWeightedRewardCard(cards, [...ownedCardIds(run)], rng);
    if (id) {
      const def = CARDS[id];
      const body = def ? cardDisplayText(def, shellRunContext(), { breakAlign: !climbCopy }) : "";
      pushOffer(out, {
        id: `card:${id}`,
        kind: "card",
        price: priceOf("card"),
        title: `谱 · ${def?.name ?? id}`,
        tip: `${body}（买入进牌组）`,
        stall: "pawn",
      });
    }
  }
  const itemId = ALL_ITEMS[Math.floor(rng() * ALL_ITEMS.length)]!;
  pushOffer(out, {
    id: `item:${itemId}`,
    kind: "item",
    price: priceOf("item"),
    title: `货 · ${LAB_ITEM_LABEL[itemId]}`,
    tip: `${itemTip(itemId)}。`,
    stall: "pawn",
  });
  if (run.pendingSkipMarket) return out;
  if (run.path === "bandit" && !run.endless && !run.pendingOpenMarket && !isBreakAlign()) return out;
  const techs = techPool(allOwnedTechs(run), run.school);
  if (techs.length > 0) {
    const id = techs[Math.floor(rng() * techs.length)]!;
    pushOffer(out, {
      id: `tech:${id}`,
      kind: "tech",
      price: priceOf("tech"),
      title: `外功 · ${TECHNIQUES[id].name}`,
      tip: techniqueTip(id).replace(/^[^：]+：/, ""),
      stall: "black",
    });
  }
  const nextId = nextGrade(run.weaponId, shellRunContext());
  const next = nextId ? gearById(nextId, shellRunContext()) : null;
  if (nextId && next && forgeGradeOk(run, next.grade)) {
    const gain = (next.damage ?? 0) - (gearById(run.weaponId, shellRunContext())?.damage ?? 0);
    pushOffer(out, {
      id: "forge",
      kind: "forge",
      price: priceOf("forge"),
      title: `淬刃 · ${next.name}`,
      tip: `兵刃升阶${gain > 0 ? `（伤害 +${gain}）` : ""}。`,
      stall: "black",
    });
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
    return grantTechToRun({ ...run, pot }, id, gauntletFieldMate(run.school));
  }
  const nextId = nextGrade(run.weaponId, shellRunContext());
  if (!nextId) return null;
  return {
    ...run,
    pot,
    weaponId: nextId,
    mateWeapons: { ...(run.mateWeapons ?? {}), [gauntletFieldMate(run.school)]: nextId },
  };
}
