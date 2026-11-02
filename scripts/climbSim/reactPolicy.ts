import { CLIMB_SPEAR_REVERSE_QI } from "../../src/game/climbCaps";
import type { RunContext } from "../../src/game/runContext";
import type { Battle } from "../../src/game/types";
import type { ReactMode } from "./flags";

function windowValue(b: Battle): number {
  const w = b.reactionWindow;
  if (!w) return 0;
  const leftover = w.leftover ?? 0;
  const charge = w.chargeDamage ?? 0;
  return leftover * 8 + charge + 12;
}

export function shouldTakeReaction(b: Battle, _rc: RunContext, mode: ReactMode): boolean {
  const w = b.reactionWindow;
  if (!w || mode === "off" || mode === "never") return false;
  const cost = w.cost ?? CLIMB_SPEAR_REVERSE_QI;
  if (b.energy < cost) return false;
  if (mode === "always") return true;
  return windowValue(b) >= cost * 5;
}
