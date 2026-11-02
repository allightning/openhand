import { profileFor } from "../../src/game/enemyKit";
import type { Battle, Intent, WeaponId } from "../../src/game/types";

type ArchetypeBattle = Battle & { foeArchetype?: string };

export function foeSchool(b: Battle): WeaponId {
  const tagged = (b as ArchetypeBattle).foeArchetype;
  if (tagged === "palm" || tagged === "saber" || tagged === "sword" || tagged === "spear" || tagged === "staff" || tagged === "hook" || tagged === "dart") {
    return tagged;
  }
  return profileFor(b.enemyId, b.labGauntletStage ?? 1, b.labEnemyKitRole ?? "main", "classic").school;
}

export function upcomingIntents(b: Battle): Intent[] {
  if (b.intents?.length) return b.intents.slice(Math.max(0, b.intentIndex));
  return b.intent ? [b.intent] : [];
}

export function leftoverSteps(b: Battle): number {
  let n = 0;
  for (const it of upcomingIntents(b)) {
    if ("steps" in it && typeof it.steps === "number") n += it.steps;
  }
  return n;
}
