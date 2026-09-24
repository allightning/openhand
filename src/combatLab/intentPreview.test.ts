import { describe, expect, it } from "vitest";
import { contextNow } from "../game/runContext";
import { previewIntentSegments } from "../game/intentPreview";
import { climbTestContext } from "../game/testContext";
import { projectedQueueThreat } from "../game/sim";
import type { Battle, Intent } from "../game/types";
import { setLabMode } from "../game/labTuning";
import { setLabRuleset } from "../combatLab/labRuleset";

function stubBattle(partial: Partial<Battle> & Pick<Battle, "player" | "enemy">): Battle {
  return {
    phase: "player",
    turn: 1,
    hand: [],
    drawPile: [],
    discardPile: [],
    log: [],
    journal: [],
    intents: [],
    intent: { kind: "guard", block: 1 },
    intentIndex: 0,
    enemyEnergy: 4,
    enemyEnergyMax: 6,
    energy: 5,
    energyMax: 6,
    energyRegen: 3,
    playerBlock: 0,
    bleed: 0,
    youBleed: 0,
    stakes: [],
    traps: [],
    techniques: [],
    playedThisTurn: [],
    party: ["rail"],
    active: "rail",
    bench: [],
    swappedThisTurn: false,
    thorns: 0,
    expose: 0,
    energyNext: 0,
    frail: 0,
    combo: 0,
    attacksThisTurn: 0,
    paceBoost: 0,
    foePace: 5,
    enemyBlock: 0,
    spar: false,
    flow: 0,
    setup: 0,
    echoNext: 0,
    retainTurns: 0,
    retainAmt: 0,
    mark: 0,
    lastPlay: null,
    youSeal: 0,
    youSlow: 0,
    youRiposte: null,
    foeRiposte: null,
    youRiposteTurns: 0,
    foeRiposteTurns: 0,
    foeDodge: 0,
    foeEndure: 0,
    pressedLast: 0,
    hero: "rail",
    movedFwd: false,
    movedBack: false,
    enteredMelee: false,
    youSway: 0,
    youGift: 0,
    youUnseat: 0,
    foeSway: 0,
    foeGift: 0,
    foeUnseat: 0,
    foeMovedFwd: false,
    foeMovedBack: false,
    foeEnteredMelee: false,
    foeStrikesThisTurn: 0,
    youExpose: 0,
    youStun: 0,
    youRegen: 0,
    youRegenTurns: 0,
    regenClock: 0,
    youMute: 0,
    foeMute: 0,
    youNoBag: 0,
    foeNoBag: 0,
    youHandTax: 0,
    foeHandTax: 0,
    youQiBurn: 0,
    foeQiBurn: 0,
    bagUsed: 0,
    orderedDeal: true,
    enemyId: "mob_bandit_0",
    foes: [partial.enemy],
    ...partial,
  } as Battle;
}

describe("intentPreview", () => {
  it("breathe 预演为自用，不是劲尽", () => {
    setLabMode(true);
    setLabRuleset("climb");
    const queue: Intent[] = [{ kind: "breathe", amount: 3 }];
    const b = stubBattle({
      player: { id: "you", name: "你", title: "", hp: 20, maxHp: 20, pos: 2 },
      enemy: { id: "foe", name: "敌", title: "", hp: 20, maxHp: 20, pos: 5 },
      intents: queue,
      intent: queue[0]!,
      enemyEnergy: 4,
      v2Turn: { turnStartPos: 2, endPos: 2, turnStartHand: 5 },
    });
    const prev = previewIntentSegments(b, queue, projectedQueueThreat(b, contextNow()), climbTestContext());
    expect(prev[0]!.tierCode).toBe("");
    expect(prev[0]!.fate).toBe("self");
  });

  it("撤步后抢步预演为空", () => {
    setLabMode(true);
    setLabRuleset("climb");
    const queue: Intent[] = [{ kind: "lunge", damage: 8 }];
    const b = stubBattle({
      player: { id: "you", name: "你", title: "", hp: 20, maxHp: 20, pos: 1 },
      enemy: { id: "foe", name: "敌", title: "", hp: 20, maxHp: 20, pos: 4 },
      intents: queue,
      intent: queue[0]!,
      v2Turn: { turnStartPos: 2, endPos: 1, turnStartHand: 5 },
    });
    const prev = previewIntentSegments(b, queue, projectedQueueThreat(b, contextNow()), climbTestContext());
    expect(prev[0]!.tierCode).toBe("空");
  });
});
