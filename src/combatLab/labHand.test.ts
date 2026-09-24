import { describe, expect, it } from "vitest";
import { setLabMode } from "./labTuning";
import { breakTestContext } from "./testContext";
import { canEndPlayerTurn, canPlay, labCanCycle, labCycleCard, labDiscardCard, needsDiscardToHandCap, playCard } from "../game/sim";
import { startLabBattle } from "./factory";
import { CARDS } from "../game/content";
import { buildGauntletPreset, createGauntletRun } from "./gauntlet";
import { setLabRuleset } from "./labRuleset";

function saberBattle() {
  setLabRuleset("break");
  setLabMode(true);
  return startLabBattle(buildGauntletPreset(createGauntletRun("bandit", "saber")), false, 1);
}

describe("手牌上限 / 弃牌 / 置换", () => {
  it("超上限仍可出牌，但不能收势；点弃才压到上限", () => {
    let b = saberBattle();
    b.energy = 6;
    b.player.pos = 3;
    b.enemy.pos = 4;
    const extra = { uid: "xtra", defId: "direct" as const };
    b.hand = [...b.hand, extra, { uid: "x2", defId: "direct" }];
    expect(needsDiscardToHandCap(b, breakTestContext())).toBe(true);
    expect(canEndPlayerTurn(b, breakTestContext()).ok).toBe(false);
    const playable = b.hand.find((c) => canPlay(b, c.uid, breakTestContext()).ok && CARDS[c.defId]?.type === "attack");
    expect(playable).toBeTruthy();
    const afterPlay = playCard(b, playable!.uid, breakTestContext());
    expect(afterPlay.hand.length).toBeLessThan(b.hand.length);

    b = saberBattle();
    b.hand = [...b.hand, extra, { uid: "x2", defId: "direct" }];
    while (needsDiscardToHandCap(b, breakTestContext()) && b.hand[0]) {
      b = labDiscardCard(b, b.hand[0].uid, breakTestContext());
    }
    expect(needsDiscardToHandCap(b, breakTestContext())).toBe(false);
    expect(canEndPlayerTurn(b, breakTestContext()).ok).toBe(true);
  });

  it("置换：弃 1 摸 1，每回一次，不占收势闸", () => {
    let b = saberBattle();
    b.drawPile = [{ uid: "d1", defId: "direct" }];
    const n = b.hand.length;
    expect(labCanCycle(b, breakTestContext()).ok).toBe(true);
    const uid = b.hand[0]!.uid;
    b = labCycleCard(b, uid, breakTestContext());
    expect(b.hand.length).toBe(n);
    expect(b.hand.some((c) => c.uid === uid)).toBe(false);
    expect(labCanCycle(b, breakTestContext()).ok).toBe(false);
    expect(canEndPlayerTurn(b, breakTestContext()).ok).toBe(true);
  });
});
