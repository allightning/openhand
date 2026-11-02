import { CLIMB_PIN_CAP } from "../climbCaps";
import type { Battle, DartForm } from "../types";

export function dartFormAllows(form: DartForm | undefined, dist: number): boolean {
  if (dist < 1 || dist > 6) return false;
  if (!form || form === "any") return true;
  if (form === "melee") return dist <= 2;
  return dist >= 3;
}

export function dartFormFailReason(form: DartForm | undefined, dist: number): string {
  if (form === "melee") return `近战刀要 1–2 格，敌在 ${dist} 格`;
  if (form === "ranged") return `远掷要 3–6 格，敌在 ${dist} 格`;
  return `飞刀打 1–6 格，敌在 ${dist} 格`;
}

export function addPin(b: Battle, n: number): string[] {
  const add = Math.max(0, Math.floor(n));
  if (add <= 0) return [];
  const next = Math.min(CLIMB_PIN_CAP, (b.foePin ?? 0) + add);
  b.foePin = next;
  return [`钉 ${next}`];
}

/** 兑「下次位移」：减步后清层。 */
export function applyPinBudget(b: Battle, want: number): number {
  const pin = b.foePin ?? 0;
  if (pin <= 0) return want;
  b.foePin = 0;
  return Math.max(0, want - pin);
}
