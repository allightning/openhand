import { isBreakAlign } from "./labRuleset";
import { isLabMode } from "../game/labTuning";

/** 爬塔不再 ×8 膨胀；读招与爬塔牌费都按牌面。 */
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
