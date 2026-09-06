import { afterEach, describe, expect, it } from "vitest";
import { CARDS } from "../game/content";
import { labV21EffectiveCost } from "../game/labV21";
import { setLabMode } from "../game/labTuning";
import { climbCardCost, labPlayCost, scaleClimbResource } from "./climbEconomy";
import { startLabBattle } from "./factory";
import { buildGauntletPreset, createGauntletRun } from "./gauntlet";
import { setLabRuleset } from "./labRuleset";

describe("climbEconomy", () => {
  afterEach(() => {
    setLabRuleset("climb");
    setLabMode(false);
  });

  it("读招保持原费；爬塔 1 费变 6、2 费变 14，池 ×8 回劲 ×4", () => {
    setLabMode(true);
    setLabRuleset("break");
    expect(labPlayCost(1)).toBe(1);
    expect(scaleClimbResource(5, "pool")).toBe(5);
    setLabRuleset("climb");
    expect(climbCardCost(1)).toBe(6);
    expect(climbCardCost(2)).toBe(14);
    expect(labPlayCost(1)).toBe(6);
    expect(scaleClimbResource(5, "pool")).toBe(40);
    expect(scaleClimbResource(3, "regen")).toBe(12);
  });

  it("爬塔开战劲池抬到数量级，牌费非等比", () => {
    setLabRuleset("climb");
    setLabMode(true);
    const b = startLabBattle(buildGauntletPreset(createGauntletRun("bandit", "saber")), true, 1);
    expect(b.energyMax).toBeGreaterThanOrEqual(40);
    expect(b.energyRegen).toBeGreaterThanOrEqual(12);
    expect(labV21EffectiveCost(b, CARDS.direct)).toBe(6);
  });
});
