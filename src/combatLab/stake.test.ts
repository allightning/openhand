import { describe, expect, it } from "vitest";
import { adjacentStakePos, enemyPlantHits, interceptStakePos, playerPlantHits, smashHitsForSchool, STAKE_HITS_HIGH, STAKE_HITS_LOW } from "../game/stake";

describe("桩挡次", () => {
  it("挡路取你和他之间的格", () => {
    expect(interceptStakePos(1, 4, [2, 5])).toBe(2);
    expect(interceptStakePos(1, 2, [3])).toBeNull();
  });

  it("贴身优先砸身侧桩（敌身后，再自己背后）", () => {
    expect(adjacentStakePos(2, 3, [4])).toBe(4);
    expect(adjacentStakePos(2, 3, [1])).toBe(1);
    expect(adjacentStakePos(2, 3, [])).toBeNull();
    expect(adjacentStakePos(1, 4, [2])).toBe(2);
  });

  it("棍立高阶、砸也按高阶；精棍敌才低阶", () => {
    expect(playerPlantHits("staff")).toBe(STAKE_HITS_HIGH);
    expect(playerPlantHits("saber")).toBe(STAKE_HITS_LOW);
    expect(smashHitsForSchool("staff")).toBe(STAKE_HITS_HIGH);
    expect(smashHitsForSchool("sword")).toBe(STAKE_HITS_LOW);
    expect(enemyPlantHits("staff", "jing")).toBe(STAKE_HITS_LOW);
    expect(enemyPlantHits("staff", "xuan")).toBe(STAKE_HITS_HIGH);
  });
});
