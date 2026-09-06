import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { setLabMode, setLabTuning } from "../game/labTuning";
import type { Battle } from "../game/types";
import { startLabBattle } from "./factory";
import { buildGauntletPreset, createGauntletRun } from "./gauntlet";
import { setLabRuleset } from "./labRuleset";
import { moveGhostPreview } from "./moveGhost";

function battle(): Battle {
  return startLabBattle(buildGauntletPreset(createGauntletRun("bandit", "palm")), true, 1);
}

beforeEach(() => {
  setLabRuleset("climb");
  setLabMode(true);
  setLabTuning({ rulesV2: true, v2Fx: true });
});
afterEach(() => setLabMode(false));

describe("位移落脚预览只跟悬停走", () => {
  it("未悬停、悬停攻击牌都不出落脚预览", () => {
    const b = battle();
    b.player.pos = 2;
    b.hand = [
      { uid: "atk", defId: "strike" },
      { uid: "mv", defId: "advance" },
    ];
    expect(moveGhostPreview(b, null)).toBeNull();
    expect(moveGhostPreview(b, "atk")).toBeNull();
  });

  it("悬停进步才给出不同落脚", () => {
    const b = battle();
    b.player.pos = 1;
    b.enemy.pos = 5;
    b.energy = 20;
    b.hand = [{ uid: "mv", defId: "advance" }];
    const prev = moveGhostPreview(b, "mv");
    expect(prev).not.toBeNull();
    expect(prev!.playerPos).not.toBe(b.player.pos);
  });
});
