import { describe, expect, it } from "vitest";
import { endTurn, makeBattle } from "./sim";
import { makeRun } from "./run";

describe("flow vs enemy guard", () => {
  it("does not stack endless block when player has high flow", () => {
    const run = makeRun("empty");
    let b = makeBattle("intruder", run, true);
    b.flow = 3;
    b.enemyBlock = 0;
    // Force enemy to act after player ends turn with high flow.
    b = endTurn(b);
    // After one react, block should be modest, not exploding over many turns.
    expect(b.enemyBlock).toBeLessThanOrEqual(20);
    b.flow = 3;
    b = endTurn(b);
    b.flow = 3;
    b = endTurn(b);
    expect(b.enemyBlock).toBeLessThanOrEqual(20);
  });
});
