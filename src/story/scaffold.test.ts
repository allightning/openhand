import { describe, expect, it } from "vitest";
import { validateTransitNetwork } from "../map/transit";
import { WILDERNESS, assertWildernessCaps } from "../map/wilderness";
import { assertStarterVillage } from "../map/starterVillage";
import { assertPathDistinct, PATH_BEATS, SHARED_FINALE } from "../story/mainline";
import {
  applyDifficultyChange,
  difficultyModifier,
  validateDifficultyCurve,
  type DifficultyState,
} from "../system/difficulty";
import { assertNoBruteForceClear, calcToleranceMargin, capProgressionPower } from "../reward/rewardCurve";

describe("phase1-5 scaffolds", () => {
  it("transit", () => expect(validateTransitNetwork().ok).toBe(true));
  it("wilderness x12+", () => {
    expect(WILDERNESS.length).toBeGreaterThanOrEqual(12);
    expect(assertWildernessCaps(WILDERNESS[0]!).ok).toBe(true);
  });
  it("starter village", () => expect(assertStarterVillage().ok).toBe(true));
  it("mainline paths distinct + finale needs trio", () => {
    expect(assertPathDistinct().ok).toBe(true);
    expect(SHARED_FINALE.need.length).toBe(3);
    expect(PATH_BEATS.blade.length).toBeGreaterThanOrEqual(4);
  });
  it("difficulty change cap 3 + smooth curve", () => {
    const cool = 10 * 60 * 1000;
    let s: DifficultyState = { difficulty: "normal", changes: 0, lastChangeAt: -cool };
    for (let i = 0; i < 3; i++) {
      const r = applyDifficultyChange(s, "hard", i * cool + cool);
      expect(r.error).toBeUndefined();
      s = r.state;
    }
    expect(applyDifficultyChange(s, "easy", 99 * cool).error).toMatch(/用尽/);
    const mods = [1, 2, 3, 4, 5, 6, 7].map((c) => difficultyModifier("normal", c));
    expect(validateDifficultyCurve(mods).ok).toBe(true);
  });
  it("reward tolerance + brute force gate + cap", () => {
    expect(calcToleranceMargin(0.2, "normal")).toBeLessThan(0.2);
    expect(assertNoBruteForceClear(0.4, 0.2).ok).toBe(false);
    expect(assertNoBruteForceClear(0.4, 0.8).ok).toBe(true);
    expect(capProgressionPower(999, 999).capped).toBe(true);
  });
});
