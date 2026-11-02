import type { CardDef, CardId } from "../../src/game/types";
import { leftoverSteps, upcomingIntents } from "./foeRead";
import { isMoveCard } from "./hand";
import type { Battle } from "../../src/game/types";

export function intentAdj(b: Battle, id: CardId, def: CardDef): number {
  const next = upcomingIntents(b)[0];
  if (!next) return 0;
  let n = 0;
  const steps = leftoverSteps(b);
  if ((next.kind === "charge" || next.kind === "advance" || next.kind === "lunge") && (def.pin ?? 0) > 0) {
    n += 24 + (def.pin ?? 0) * 8 + Math.min(12, steps * 4);
  }
  if ((next.kind === "strike" || next.kind === "bleedcut" || next.kind === "barrage") && (def.block ?? 0) > 0) {
    n += 16 + Math.min(12, def.block ?? 0);
  }
  if (next.kind === "pull" && isMoveCard(id) && (id === "retreat" || id === "stepSword" || id === "stepSpear" || id === "dartStep")) {
    n += 18;
  }
  return n;
}
