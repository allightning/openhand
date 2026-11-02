import { CLIMB_CHARGE_CAP, climbChargeBurstEq } from "../climbCaps";
import type { Battle } from "../types";

export function gainCharge(b: Battle, n: number): string[] {
  const add = Math.max(0, Math.floor(n));
  if (add <= 0) return [];
  const next = Math.min(CLIMB_CHARGE_CAP, (b.chargeStacks ?? 0) + add);
  b.chargeStacks = next;
  return [`蓄力 ${next}`];
}

export function consumeChargeBurst(b: Battle): { stacks: number; damage: number } {
  const stacks = b.chargeStacks ?? 0;
  b.chargeStacks = 0;
  return { stacks, damage: climbChargeBurstEq(stacks) };
}
