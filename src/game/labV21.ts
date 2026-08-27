import { CARDS } from "./content";
import { isLabMode, isLabV2 } from "./labTuning";
import { addQi } from "./labV2";
import { isSummonItem, SUMMON_ITEM_TO_SCHOOL } from "./labSummon";
import { legalSummonCells, summonAssist } from "./sim";
import {
  computeResonance,
  initResonanceBattle,
  resonanceExtraQiOnGain,
  resonanceStrikeBonus,
  type ResonanceStatus,
} from "./labResonance";
import { initSignatureBattle } from "./labSignature";
import { comboEffectiveCost, isComboCard } from "./labCombo";
import { ITEM_DART_DMG, ITEM_HEAL_PCT, ITEM_QI_GAIN } from "./labV21Constants";
import { BOARD_SIZE, type Battle, type CardDef, type CardId, type LabItemId } from "./types";

export type { ResonanceStatus as AuraStatus };
export {
  computeResonance as computeAuras,
  computeResonance,
  teamSchoolCounts,
  schoolTier,
  classifyPartyComposition,
  resonancePaceBonus,
  staffBlockRetain,
  resonanceKnockBonus,
  resonanceWallCrashBonus,
  resonancePullBonus,
  resonanceChargeStepsCut,
} from "./labResonance";

export function isLabV21(): boolean {
  return isLabV2();
}

function isSpatialCard(id: CardId): boolean {
  const c = CARDS[id];
  if (!c) return false;
  if (c.knock || c.steps || c.pullEnemy || c.plant || c.swap) return true;
  const t = c.text;
  return t.includes("推") || t.includes("进步") || t.includes("退") || t.includes("换位");
}

function dist(b: Battle): number {
  return Math.abs(b.player.pos - b.enemy.pos);
}

export function initLabV21Battle(b: Battle): void {
  if (!isLabV21()) return;
  b.v2AuraQiBonusUsed = false;
  b.labItemUsedThisTurn = false;
  b.labUnlockUltimate = false;
  b.labComboPillActive = false;
  if (!b.labItems) b.labItems = [];
  initResonanceBattle(b);
  initSignatureBattle(b);
}

/** @deprecated v2.5 用 resonanceStrikeBonus */
export function auraDamageBonus(b: Battle, cardId: CardId): number {
  const adj = dist(b) === 1;
  return resonanceStrikeBonus(b, cardId, 0, adj, dist(b));
}

export function auraExtraQiOnGain(b: Battle, cardId?: CardId): number {
  if (!cardId) return 0;
  return resonanceExtraQiOnGain(b, cardId);
}

export function ultimateGate(b: Battle, def: CardDef): { ok: boolean; reason?: string } {
  if (!def.ultimate || !isLabV21()) return { ok: true };
  if (b.labUnlockUltimate) return { ok: true };
  const u = def.ultimate;
  const reasons: string[] = [];
  if ((u.qiMin ?? 0) > (b.qi ?? 0)) reasons.push(`势 ≥${u.qiMin}`);
  if ((u.blockMin ?? 0) > b.playerBlock) reasons.push(`格挡 ≥${u.blockMin}`);
  if ((u.markMin ?? 0) > b.mark) reasons.push(`点穴印 ≥${u.markMin}`);
  if (u.brokeThisTurn && !(b.v2Turn?.breakPromised)) reasons.push("本回合将破招");
  if (u.spatialThisTurn && !(b.v2Turn?.spatialPlayed)) reasons.push("本回合出过空间牌");
  if (u.adjacent && !dist(b)) reasons.push("需贴身");
  if ((u.distMin ?? 0) > 0 && dist(b) < (u.distMin ?? 0)) reasons.push(`距离 ≥${u.distMin}`);
  // §31.11 六系绝招的差异化前置
  if ((u.bleedMin ?? 0) > (b.bleed ?? 0)) reasons.push(`敌裂创 ≥${u.bleedMin}`);
  if ((u.attacksMin ?? 0) > b.attacksThisTurn) reasons.push(`本回合已出攻击 ≥${u.attacksMin}`);
  if (u.foeDisarmed && (b.foeDisarm ?? 0) <= 0) reasons.push("敌缴械中");
  if (u.foeAtWall && b.enemy.pos !== 0 && b.enemy.pos !== BOARD_SIZE - 1) reasons.push("敌贴墙");
  if (u.foeHitLastTurn && !b.foeHitLastTurn) reasons.push("上回合挨过敌招");
  if (reasons.length) return { ok: false, reason: `绝招：缺 ${reasons.join("、")}` };
  return { ok: true };
}

export function variantBranch(def: CardDef, b: Battle): "a" | "b" | null {
  const v = def.variant;
  if (!v || !isLabV21()) return null;
  const hpPct = b.player.hp / Math.max(1, b.player.maxHp);
  if (v.kind === "highHp" && hpPct >= (v.threshold ?? 0.8)) return "a";
  if (v.kind === "lowHp" && hpPct <= (v.threshold ?? 0.2)) return "b";
  if (v.kind === "fullEnergy" && b.energy >= b.energyMax) return "a";
  if (v.kind === "emptyEnergy" && b.energy <= 0) return "b";
  return null;
}

export function variantActiveLabel(def: CardDef, b: Battle): string | null {
  const br = variantBranch(def, b);
  if (!br || !def.variant) return null;
  return br === "a" ? def.variant.labelA : def.variant.labelB;
}

export function labV21EffectiveCost(b: Battle, def: CardDef): number {
  const tax = def.stackTaxQi ?? 0;
  const discount = b.costDiscountNext ?? 0;
  const v = def.variant;
  if (!v || !isLabV21()) {
    const base = def.cost + tax;
    const c = isComboCard(def.id) ? comboEffectiveCost(b, def.id, base) : base;
    return Math.max(0, c - discount);
  }
  const br = variantBranch(def, b);
  let cost = br === "b" && v.costZeroOnB ? tax : def.cost + tax;
  if (isComboCard(def.id)) cost = comboEffectiveCost(b, def.id, cost);
  return Math.max(0, cost - discount);
}

export function labV21StrikeAdjust(b: Battle, def: CardDef, base: number): number {
  const adj = dist(b) === 1;
  let dmg = base + resonanceStrikeBonus(b, def.id, base, adj, dist(b));
  if (b.labSigPullBuff && def.type === "attack") {
    dmg += 2;
    b.labSigPullBuff = false;
  }
  const v = def.variant;
  if (!v || !isLabV21()) return dmg;
  const br = variantBranch(def, b);
  if (br === "a" && v.damageMulA) dmg = Math.round(dmg * v.damageMulA);
  if (br === "b" && v.damageBonusB) dmg += v.damageBonusB;
  return dmg;
}

export function labV21BlockAdjust(b: Battle, def: CardDef, block: number): number {
  let out = block;
  if (def.ultimate?.doubleBlock && isLabV21() && (ultimateGate(b, def).ok || b.labUnlockUltimate)) {
    out *= 2;
  }
  return out;
}

export function labV21AfterCard(b: Battle, defId: CardId): void {
  if (!isLabV21() || !b.v2Turn) return;
  if (isSpatialCard(defId)) b.v2Turn.spatialPlayed = true;
  const def = CARDS[defId];
  if (def.variant) {
    const br = variantBranch(def, b);
    if (br === "a") b.v2VariantBranchA = (b.v2VariantBranchA ?? 0) + 1;
    else if (br === "b") b.v2VariantBranchB = (b.v2VariantBranchB ?? 0) + 1;
    else b.v2VariantBranchNone = (b.v2VariantBranchNone ?? 0) + 1;
  }
}

export function refreshBreakPromised(b: Battle): void {
  if (!b.v2Turn) return;
  b.v2Turn.breakPromised = (b.v2BreakPreview?.length ?? 0) > 0;
}

export function labCanUseItem(b: Battle, item: LabItemId): { ok: boolean; reason?: string } {
  if (!isLabMode()) return { ok: false, reason: "仅 Combat Lab" };
  if (b.phase !== "player") return { ok: false, reason: "不是你的回合" };
  if (b.labItemUsedThisTurn) return { ok: false, reason: "本回合已用过道具" };
  if (!b.labItems?.includes(item)) return { ok: false, reason: "未携带该道具" };
  if (b.youNoBag > 0) return { ok: false, reason: "禁药中" };
  return { ok: true };
}

export function useLabItem(b: Battle, item: LabItemId, pos?: number): { ok: boolean; reason?: string; battle?: Battle } {
  const gate = labCanUseItem(b, item);
  if (!gate.ok) return gate;
  if (!isLabMode()) return { ok: false, reason: "仅 Combat Lab" };
  const next = { ...b, labItemUsedThisTurn: true, v2ItemUses: (b.v2ItemUses ?? 0) + 1 };
  if (item === "jinchuang") {
    const heal = Math.max(1, Math.round(next.player.maxHp * ITEM_HEAL_PCT));
    next.player = { ...next.player, hp: Math.min(next.player.maxHp, next.player.hp + heal) };
    next.journal = [...next.journal, { side: "you", text: `金疮药 回 ${heal}` }];
  } else if (item === "xiujian") {
    const foe = next.enemy;
    foe.hp = Math.max(0, foe.hp - ITEM_DART_DMG);
    next.enemy = { ...foe };
    next.foes = next.foes.map((f) => (f.id === foe.id ? { ...foe } : f));
    next.journal = [...next.journal, { side: "you", text: `袖箭 ${ITEM_DART_DMG}（无视格挡）` }];
  } else if (item === "huiqi") {
    next.energy = Math.min(next.energyMax, next.energy + ITEM_QI_GAIN);
    next.journal = [...next.journal, { side: "you", text: `回气散 +${ITEM_QI_GAIN} 劲` }];
  } else if (item === "lianhuan") {
    next.labComboPillActive = true;
    next.journal = [...next.journal, { side: "you", text: "连环丹：本回合积势额外 +1" }];
  } else if (item === "pojin") {
    next.labUnlockUltimate = true;
    next.journal = [...next.journal, { side: "you", text: "破禁丹：本回合绝招无视前置" }];
  } else if (item === "deathSquad") {
    // §31.9 死士符：在场一回合的挡刀实体（占位：无形体占格，拦截逻辑在敌结算管线）
    next.labDeathSquad = true;
    next.journal = [...next.journal, { side: "you", text: "死士入场：替你挡一段攻击并反扑 8" }];
  } else if (isSummonItem(item)) {
    // §31.12 助战符：一次性消耗。落点 pos 由 UI 点位模式给；缺省取敌身侧（测试/快捷路径）。
    const school = SUMMON_ITEM_TO_SCHOOL[item]!;
    const cells = legalSummonCells(b);
    if (!cells.length) return { ok: false, reason: "台上没空地" };
    if (b.labSummon && b.labSummon.hp > 0) return { ok: false, reason: "已有助战在场" };
    const pick =
      pos ??
      (() => {
        const around = [b.enemy.pos + 1, b.enemy.pos - 1].filter((c) => cells.includes(c));
        return (around[0] ?? cells[0])!;
      })();
    const summoned = summonAssist(b, school, pick);
    if (!summoned.labSummon) return { ok: false, reason: "该格落不了" };
    summoned.labItems = (summoned.labItems ?? []).filter((i) => i !== item);
    summoned.labItemUsedThisTurn = true;
    summoned.v2ItemUses = (summoned.v2ItemUses ?? 0) + 1;
    return { ok: true, battle: summoned };
  }
  return { ok: true, battle: next };
}
