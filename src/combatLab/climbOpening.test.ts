import { describe, expect, it } from "vitest";
import { climbOpeningDistance, climbOpeningPositions } from "./climbCaps";
import { applyClimbOpeningPositions } from "../game/sim";
import { setLabMode } from "../game/labTuning";
import { setLabRuleset } from "./labRuleset";
import type { Battle } from "../game/types";

describe("climb opening distance", () => {
  it("前 4 馆距 3，8+ 距 5", () => {
    expect(climbOpeningDistance(1, false)).toBe(3);
    expect(climbOpeningDistance(4, false)).toBe(3);
    expect(climbOpeningDistance(5, false)).toBe(4);
    expect(climbOpeningDistance(8, false)).toBe(5);
    expect(climbOpeningDistance(3, true)).toBe(5);
  });

  it("applyClimbOpeningPositions 写站位", () => {
    setLabMode(true);
    setLabRuleset("climb");
    const b = {
      player: { pos: 0 },
      enemy: { pos: 5, id: "e" },
      foes: [{ pos: 5, id: "e", hp: 10, maxHp: 10, name: "x", title: "" }],
      enemyId: "mob_bandit_0",
      labGauntletStage: 2,
    } as unknown as Battle;
    applyClimbOpeningPositions(b);
    expect(Math.abs(b.enemy.pos - b.player.pos)).toBe(3);
    expect(climbOpeningPositions(3)).toEqual({ playerPos: 1, enemyPos: 4 });
  });
});
