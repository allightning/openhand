import { intentEnergyCost } from "./labEnemyStress";
import { contextNow, type RunContext } from "./runContext";
import { intentIncoming } from "./sim";
import type { Battle, Intent } from "./types";

export type IntentSegmentFate = "gone" | "grey" | "hit" | "self" | "qiout";

export interface IntentSegmentPreview {
  fate: IntentSegmentFate;
  threatCells: number[];
  tierCode: "" | "空" | "打" | "劲尽" | "晕" | "缴械";
  displayDamage: number;
}

function selfIntent(intent: Intent): boolean {
  return (
    intent.kind === "guard" ||
    intent.kind === "mend" ||
    intent.kind === "breathe" ||
    intent.kind === "stake" ||
    intent.kind === "windup" ||
    intent.kind === "endure" ||
    intent.kind === "dodge" ||
    intent.kind === "counter" ||
    intent.kind === "dust" ||
    intent.kind === "shackle" ||
    intent.kind === "trap" ||
    intent.kind === "retreat" ||
    intent.kind === "swap"
  );
}

/** 意图条预演：跟 sim 投影链 + 劲/晕/缴械/收势位。 */
export function previewIntentSegments(
  b: Battle,
  queue: Intent[],
  projectedCells: number[][],
  ctx: RunContext = contextNow(),
): IntentSegmentPreview[] {
  const aimPos = ctx.caps.intent.aimAtTurnStart
    ? (b.v2Turn?.turnStartPos ?? b.player.pos)
    : (b.v2Turn?.endPos ?? b.player.pos);
  let foeStun = b.foeStun ?? 0;
  let foeDisarm = b.foeDisarm ?? 0;
  let energy = b.enemyEnergy;

  return queue.map((intent, i) => {
    const cells = projectedCells[i] ?? [];
    const cost = intentEnergyCost(intent);
    const rawDmg = "damage" in intent ? (intent.damage ?? 0) : 0;

    if (energy < cost) {
      return { fate: "qiout", threatCells: cells, tierCode: "劲尽", displayDamage: 0 };
    }
    energy -= cost;

    if (foeStun > 0 && rawDmg > 0) {
      foeStun -= 1;
      return { fate: "gone", threatCells: cells, tierCode: "晕", displayDamage: 0 };
    }
    if (foeDisarm > 0 && rawDmg > 0) {
      foeDisarm -= 1;
      return { fate: "gone", threatCells: cells, tierCode: "缴械", displayDamage: 0 };
    }

    if (intent.kind === "advance") {
      return { fate: "grey", threatCells: [], tierCode: "空", displayDamage: 0 };
    }

    if (selfIntent(intent)) {
      return { fate: "self", threatCells: cells, tierCode: "", displayDamage: 0 };
    }

    if (rawDmg <= 0) {
      return { fate: "self", threatCells: cells, tierCode: "", displayDamage: 0 };
    }

    if (!cells.includes(aimPos)) {
      return { fate: "grey", threatCells: cells, tierCode: "空", displayDamage: 0 };
    }

    const inc = intentIncoming(b, intent);
    return { fate: "hit", threatCells: cells, tierCode: "打", displayDamage: inc.total || rawDmg };
  });
}
