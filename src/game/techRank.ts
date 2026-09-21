import type { Battle, TechniqueId } from "./types";

/** 外功投喂档：1 不变，2 +15%，3 +30%。 */
export function techRankMul(rank: number): number {
  const r = Math.min(3, Math.max(1, Math.floor(rank) || 1));
  return 1 + 0.15 * (r - 1);
}

export function battleTechRank(b: Battle, id: TechniqueId): number {
  return Math.min(3, Math.max(1, b.labMateTechRanks?.[b.active]?.[id] ?? 1));
}

/** 未装备该外功则 0；否则按档位缩放整数加成。 */
export function techBonus(b: Battle, id: TechniqueId, base: number): number {
  if (!b.techniques.includes(id)) return 0;
  return Math.round(base * techRankMul(battleTechRank(b, id)));
}
