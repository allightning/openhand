import { describe, expect, it } from "vitest";
import { WILDERNESS, assertWildernessCaps } from "./wilderness";
import { assertStarterVillage } from "./starterVillage";
import { validateTransitNetwork } from "./transit";

describe("task2 wilderness", () => {
  it("each hub has wilderness with resources and npcs", () => {
    expect(WILDERNESS.length).toBeGreaterThanOrEqual(12);
    for (const w of WILDERNESS) {
      const r = assertWildernessCaps(w);
      expect(r.ok, `${w.id} ${r.reason}`).toBe(true);
    }
  });
});

describe("task3 starter village", () => {
  it("北宋小市井 gender+teach", () => {
    const r = assertStarterVillage();
    expect(r.ok, r.reasons.join("; ")).toBe(true);
  });
});

describe("task1 still green", () => {
  it("transit", () => {
    expect(validateTransitNetwork().ok).toBe(true);
  });
});
