import type { RunContext } from "./runContext";

/** 爬塔资源倍率。放在引擎层，供 sim / labV21 使用，不经过产品壳。 */
export const CLIMB_ENERGY_POOL_MUL = 1;
export const CLIMB_ENERGY_REGEN_MUL = 1;

export function climbCardCost(base: number): number {
  return Math.max(0, base);
}

export function labPlayCost(base: number): number {
  return Math.max(0, base);
}

export function scaleClimbResource(
  n: number,
  kind: "pool" | "regen",
  ctx: RunContext,
): number {
  if (!ctx.caps.economy.applyScale) return n;
  const mul = kind === "pool" ? CLIMB_ENERGY_POOL_MUL : CLIMB_ENERGY_REGEN_MUL;
  return n * mul;
}
