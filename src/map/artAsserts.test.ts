import { describe, expect, it } from "vitest";
import {
  assertPortraitUniqueness,
  assertFurnishingCapAfterPass,
  assertNoNpcLineup,
  luoyangArtReport,
} from "./artAsserts";
import { generateLuoyang } from "./luoyangGen";
import { loadScene } from "./world";
import { makeRun } from "../game/run";
import { LUOYANG_NPCS } from "./npc";
import { getNpcMapSrc, getPortraitSrc } from "../assets/sprites";

describe("task 0-B art iron rules", () => {
  it("luoyang actors use pregenerated PNG paths (no svg silhouettes)", () => {
    expect(getNpcMapSrc("luoBarkeeper")).toMatch(/\/art\/stand\/.+\.png$/);
    expect(getPortraitSrc("luoAsha")).toMatch(/\/art\/stand\/.+\.png$/);
    expect(getPortraitSrc("luoBarkeeper")).not.toBe(getPortraitSrc("judge"));
  });

  it("luoyang portrait share <= 30%", () => {
    const ids = LUOYANG_NPCS.map((n) => n.id);
    const r = assertPortraitUniqueness(ids, 0.3);
    expect(r.ok, `top=${r.top} share=${r.maxShare}`).toBe(true);
  });

  it("luoyang furnishings within caps incl posts", () => {
    const scene = generateLuoyang();
    const r = assertFurnishingCapAfterPass(scene.ascii);
    expect(r.ok, r.over.join("; ")).toBe(true);
    expect(r.counts.post ?? 0).toBeLessThanOrEqual(10);
    expect(r.counts.cart ?? 0).toBeLessThanOrEqual(8);
  });

  it("loadScene talkers not in a street lineup", () => {
    const run = {
      ...makeRun("empty"),
      flags: ["branded", "watchOpen", "trueMirror", "booksOk", "knotOk", "tideOpen", "mainOpen"],
      items: ["deed", "incense", "brand", "roadPass"],
    };
    const w = loadScene("luoyang", run);
    const r = assertNoNpcLineup(w.talkers);
    expect(r.ok, r.lines.join("; ")).toBe(true);
    expect(w.talkers.length).toBeGreaterThanOrEqual(30);
  });

  it("art report aggregates", () => {
    const r = luoyangArtReport();
    expect(r.npcCount).toBeGreaterThanOrEqual(30);
    expect(r.furn.ok).toBe(true);
  });
});
