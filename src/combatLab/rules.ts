import type { CardId, CompanionId, TechniqueId, WeaponId } from "../game/types";
import { cardSchool, WEAPON_NAME } from "../game/party";
import { isCardAllowedForWeapon } from "./cardUi";

export const LAB_DECK_TYPE_CAP = 20;
export const LAB_DECK_MULT_DEFAULT = 5;
export const LAB_DECK_MULT_MIN = 1;
export const LAB_DECK_MULT_MAX = 10;
export const LAB_PARTY_CAP = 4;
export const LAB_TECH_CAP = 3;
export const LAB_SWAP_COST = 1;
export const LAB_RESONANCE_COST = 2;
export const QUOTA_ANY_MIN = 6;

/** 各系可装配谱池规模（批次四前用于 min(8, pool) 下限）。 */
export const SCHOOL_RECIPE_POOL: Record<WeaponId, number> = {
  palm: 14,
  staff: 7,
  saber: 5,
  sword: 5,
  spear: 3,
  hook: 3,
};

export function fieldSchoolQuotaMin(school: WeaponId): number {
  return Math.min(8, SCHOOL_RECIPE_POOL[school] ?? 8);
}

export function quotaCheck(
  recipe: CardId[],
  fieldSchool: WeaponId,
): { ok: boolean; hints: string[]; schoolCount: number; anyCount: number } {
  let schoolCount = 0;
  let anyCount = 0;
  for (const id of recipe) {
    const cs = cardSchool(id);
    if (cs === "any") anyCount += 1;
    else if (cs === fieldSchool) schoolCount += 1;
  }
  const hints: string[] = [];
  const minSchool = fieldSchoolQuotaMin(fieldSchool);
  if (schoolCount < minSchool) {
    hints.push(`field ${WEAPON_NAME[fieldSchool]}系牌 ${schoolCount}/${minSchool}`);
  }
  if (anyCount < QUOTA_ANY_MIN) {
    hints.push(`通用牌 ${anyCount}/${QUOTA_ANY_MIN}`);
  }
  return { ok: hints.length === 0, hints, schoolCount, anyCount };
}

/** 配方 × 乘数 → 实战牌堆（每种重复 mult 张）。 */
export function expandDeckRecipe(recipe: CardId[], mult: number): CardId[] {
  const k = Math.max(LAB_DECK_MULT_MIN, Math.min(LAB_DECK_MULT_MAX, Math.round(mult)));
  const out: CardId[] = [];
  for (const id of recipe) {
    for (let i = 0; i < k; i++) out.push(id);
  }
  return out;
}

export function uniqueRecipe(deck: CardId[]): CardId[] {
  return [...new Set(deck)].slice(0, LAB_DECK_TYPE_CAP);
}

export function tryAddToRecipe(
  recipe: CardId[],
  id: CardId,
  weaponId: string,
): { ok: true; recipe: CardId[] } | { ok: false; reason: string } {
  if (recipe.includes(id)) return { ok: false, reason: "该谱已在配方中（每种仅 1 张）" };
  if (recipe.length >= LAB_DECK_TYPE_CAP) return { ok: false, reason: `配方已满 ${LAB_DECK_TYPE_CAP} 种` };
  if (!isCardAllowedForWeapon(id, weaponId)) return { ok: false, reason: "非本门或通用谱，不可装入配方" };
  return { ok: true, recipe: [...recipe, id] };
}

export function tryAddMate(party: CompanionId[], id: CompanionId): { ok: true; party: CompanionId[] } | { ok: false; reason: string } {
  if (party.includes(id)) return { ok: false, reason: "已在同行槽" };
  if (party.length >= LAB_PARTY_CAP) return { ok: false, reason: `同行已满 ${LAB_PARTY_CAP} 人` };
  return { ok: true, party: [...party, id] };
}

export function tryLearnTech(
  have: TechniqueId[],
  id: TechniqueId,
): { ok: true; list: TechniqueId[] } | { ok: false; reason: string } {
  if (have.includes(id)) return { ok: false, reason: "已学此门" };
  if (have.length >= LAB_TECH_CAP) return { ok: false, reason: `外功已满 ${LAB_TECH_CAP} 门（可遗忘后重试）` };
  return { ok: true, list: [...have, id] };
}

export function deckTypeLabel(recipe: CardId[], mult: number): string {
  const pile = recipe.length * mult;
  return `${recipe.length}/${LAB_DECK_TYPE_CAP} 种 · 进局 ${pile} 张（×${mult}）`;
}
