import type { Battle, ReactionWindow } from "../types";
import { spearReverseCost } from "./wallLinks";

export function openSpearReverseWindow(
  b: Battle,
  leftover: number,
  dir: number,
  intentKind: ReactionWindow["intentKind"],
  chargeDamage?: number,
): void {
  b.reactionWindow = {
    kind: "spearReverse",
    cost: spearReverseCost(),
    leftover,
    dir,
    intentKind,
    ...(chargeDamage != null ? { chargeDamage } : {}),
  };
}

export function takeSpearReverse(b: Battle): string[] {
  const w = b.reactionWindow;
  if (!w || w.kind !== "spearReverse") return [];
  const cost = w.cost;
  if (b.energy < cost) return ["劲不够，回马枪没打出"];
  b.energy -= cost;
  w.leftover = 0;
  b.reactionWindow = undefined;
  return [`回马枪 耗劲 ${cost}，敌停 2 格`];
}

export function declineReaction(b: Battle): ReactionWindow | undefined {
  const w = b.reactionWindow;
  b.reactionWindow = undefined;
  return w;
}
