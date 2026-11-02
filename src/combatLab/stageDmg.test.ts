import { describe, expect, it } from "vitest";
import { STAGE_DMG, stageDmgAdjust } from "../../scripts/climbSim/knobs";
import { GAUNTLET_PATH_LADDERS } from "./gauntletPaths";

describe("馆段伤旋钮", () => {
  it("默认敌伤等于馆梯，我伤是 1，倍率不改现行读数", () => {
    for (const row of STAGE_DMG) {
      const ladder = GAUNTLET_PATH_LADDERS.bandit.find((entry) => entry.stage === row.stage);
      expect(ladder?.dmgCoef).toBe(row.enemy);
      expect(row.player).toBe(1);
      expect(stageDmgAdjust(row.stage, row.enemy)).toEqual({ enemy: 1, player: 1 });
    }
  });
});
