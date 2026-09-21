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

  it("读招与爬塔牌费都按牌面，不再 ×8", () => {
    setLabMode(true);
    setLabRuleset("break");
    expect(labPlayCost(1)).toBe(1);
    expect(scaleClimbResource(5, "pool")).toBe(5);
    setLabRuleset("climb");
    expect(climbCardCost(1)).toBe(1);
    expect(climbCardCost(2)).toBe(2);
    expect(labPlayCost(1)).toBe(1);
    expect(scaleClimbResource(5, "pool")).toBe(5);
  });

  it("爬塔开战按角色档位给劲，一档刀客上限 10", () => {
    setLabRuleset("climb");
    setLabMode(true);
    const b = startLabBattle(buildGauntletPreset(createGauntletRun("bandit", "saber")), true, 1);
    expect(b.energyMax).toBe(10);
    expect(b.energyRegen).toBe(4);
    expect(b.energy).toBe(6);
    expect(b.player.maxHp).toBe(50);
    // 攻击牌费用回退为牌面 cost（爬塔 floor 1），实际伤害看悬停预演条
    expect(labV21EffectiveCost(b, CARDS.direct)).toBe(Math.max(1, CARDS.direct.cost));
  });
});
