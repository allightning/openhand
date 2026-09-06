import { isBreakAlign } from "./labRuleset";
import { isLabMode } from "../game/labTuning";

/** 爬塔蓝池 ×8；回劲 ×4；牌费非等比（1→6，2→14）。读招不跟。 */
export const CLIMB_ENERGY_POOL_MUL = 8;
export const CLIMB_ENERGY_REGEN_MUL = 4;

export function climbCardCost(base: number): number {
  if (base <= 0) return 0;
  if (base === 1) return 6;
  if (base === 2) return 14;
  return Math.round(base * 6.5);
}

export function labPlayCost(base: number): number {
  if (!isLabMode() || isBreakAlign()) return base;
  return climbCardCost(base);
}

export function scaleClimbResource(n: number, kind: "pool" | "regen"): number {
  if (!isLabMode() || isBreakAlign()) return n;
  return n * (kind === "pool" ? CLIMB_ENERGY_POOL_MUL : CLIMB_ENERGY_REGEN_MUL);
}
