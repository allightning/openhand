import { isLabMode } from "./labTuning";
import { isBreakAlign } from "./labRuleset";

/** 爬塔资源倍率。放在引擎层，供 sim / labV21 使用，不经过产品壳。 */
export const CLIMB_ENERGY_POOL_MUL = 1;
export const CLIMB_ENERGY_REGEN_MUL = 1;

export function climbCardCost(base: number): number {
  return Math.max(0, base);
}

export function labPlayCost(base: number): number {
  return Math.max(0, base);
}

export function scaleClimbResource(n: number, _kind: "pool" | "regen"): number {
  if (!isLabMode() || isBreakAlign()) return n;
  return n;
}
