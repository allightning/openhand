import { afterEach, describe, expect, it } from "vitest";
import { setLabMode } from "../game/labTuning";
import { climbTestContext } from "../game/testContext";
import { canPlay } from "../game/sim";
import { startLabBattle } from "./factory";
import { buildGauntletPreset, createGauntletRun } from "./gauntlet";
import { setLabRuleset } from "./labRuleset";

describe("进步/退步无路闸", () => {
  afterEach(() => {
    setLabRuleset("climb");
    setLabMode(false);
  });

  function climbBattle() {
    setLabRuleset("climb");
    setLabMode(true);
    return startLabBattle(buildGauntletPreset(createGauntletRun("bandit", "saber")), true, 1);
  }

  it("贴墙时退步灰掉，身前有空则进步可用", () => {
    const b = climbBattle();
    b.player.pos = 0;
    b.enemy.pos = 3;
    b.energy = 10;
    b.hand = [
      { uid: "r1", defId: "retreat" },
      { uid: "a1", defId: "advance" },
    ];
    expect(canPlay(b, "r1", climbTestContext())).toEqual({ ok: false, reason: "身后无路" });
    expect(canPlay(b, "a1", climbTestContext()).ok).toBe(true);
  });

  it("贴敌身前时进步灰掉（无对撞技）", () => {
    const b = climbBattle();
    b.player.pos = 2;
    b.enemy.pos = 3;
    b.energy = 10;
    b.hand = [{ uid: "a1", defId: "advance" }];
    expect(canPlay(b, "a1", climbTestContext())).toEqual({ ok: false, reason: "身前无路" });
  });

  it("系别退步牌（steps<0）贴墙也灰", () => {
    setLabRuleset("climb");
    setLabMode(true);
    const b = startLabBattle(buildGauntletPreset(createGauntletRun("bandit", "sword")), true, 1);
    b.player.pos = 0;
    b.enemy.pos = 4;
    b.energy = 10;
    b.hand = [{ uid: "ss", defId: "stepSword" }];
    expect(canPlay(b, "ss", climbTestContext())).toEqual({ ok: false, reason: "身后无路" });
  });
});
