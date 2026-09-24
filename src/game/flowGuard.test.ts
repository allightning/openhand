import { describe, expect, it } from "vitest";
import { contextNow } from "./runContext";
import { endTurn, makeBattle } from "./sim";
import { makeRun } from "./run";

describe("flow vs enemy guard", () => {
  it("does not stack endless block when player has high flow", () => {
    const run = makeRun("empty");
    let b = makeBattle("intruder", contextNow(), run, true);
    b.flow = 3;
    b.enemyBlock = 0;
    // Force enemy to act after player ends turn with high flow.
    b = endTurn(b, contextNow());
    // After one react, block should be modest, not exploding over many turns.
    expect(b.enemyBlock).toBeLessThanOrEqual(20);
    b.flow = 3;
    b = endTurn(b, contextNow());
    b.flow = 3;
    b = endTurn(b, contextNow());
    expect(b.enemyBlock).toBeLessThanOrEqual(20);
  });
});
