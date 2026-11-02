import { describe, expect, it } from "vitest";
import { buildGauntletPreset, createGauntletRun } from "../gauntlet";
import { startLabBattle } from "../factory";
import { setLabRuleset } from "../labRuleset";
import { setLabMode } from "../labTuning";
import { shellRunContext } from "../shellContext";
import { applyReactChoice, writeReactSec } from "./reactChoice";

function openSpear() {
  setLabRuleset("climb");
  setLabMode(true);
  const b = startLabBattle(buildGauntletPreset(createGauntletRun("bandit", "spear")), true, 1);
  b.reactionWindow = {
    kind: "spearReverse",
    cost: 2,
    leftover: 1,
    dir: -1,
    intentKind: "advance",
  };
  b.energy = 5;
  b.player.pos = 0;
  b.enemy.pos = 2;
  return b;
}

describe("反应窗选择", () => {
  it("回马走已有结算，窗收掉并标成功", () => {
    const next = applyReactChoice(openSpear(), true, shellRunContext());
    expect(next.reactionWindow).toBeUndefined();
    expect(next.reactionLanded).toBe(true);
    expect(next.energy).toBe(3);
    expect(next.log.some((line) => line.includes("回马枪"))).toBe(true);
  });

  it("放过把窗收掉，不标成功", () => {
    const next = applyReactChoice(openSpear(), false, shellRunContext());
    expect(next.reactionWindow).toBeUndefined();
    expect(next.reactionLanded).not.toBe(true);
    expect(next.energy).toBe(5);
  });

  it("劲不够时窗还在，不算成功", () => {
    const b = openSpear();
    b.energy = 0;
    const next = applyReactChoice(b, true, shellRunContext());
    expect(next.reactionWindow?.kind).toBe("spearReverse");
    expect(next.reactionLanded).not.toBe(true);
    expect(next.log.some((line) => line.includes("劲不够"))).toBe(true);
  });

  it("3 秒写进本局，选完还在", () => {
    const next = writeReactSec(openSpear(), 3);
    expect(next.reactionSec).toBe(3);
    expect(next.reactionWindow?.kind).toBe("spearReverse");
    const chosen = applyReactChoice(next, true, shellRunContext());
    expect(chosen.reactionSec).toBe(3);
    expect(chosen.reactionLanded).toBe(true);
  });
});
