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
import { spriteSrc } from "./tileset";

describe("Luoyang screenshot baseline", () => {
  it("map actors use /art/sprites only — never stand portraits", () => {
    for (const n of LUOYANG_NPCS) {
      const map = getNpcMapSrc(n.id);
      expect(map, n.id).toMatch(/^\/art\/sprites\/sprite-.+\.png$/);
      expect(map, n.id).not.toMatch(/\/art\/stand\//);
      expect(spriteSrc(n.id)).toBe(map);
    }
  });

  it("dialogue portraits may use stand (separate from map)", () => {
    expect(getPortraitSrc("luoBarkeeper")).toMatch(/\/art\/stand\//);
    expect(getPortraitSrc("judge")).not.toBe(getPortraitSrc("luoBarkeeper"));
  });

  it("portrait share <= 30%", () => {
    const r = assertPortraitUniqueness(
      LUOYANG_NPCS.map((n) => n.id),
      0.3,
    );
    expect(r.ok, `top=${r.top} share=${r.maxShare}`).toBe(true);
  });

  it("furnishings within caps", () => {
    const scene = generateLuoyang();
    const r = assertFurnishingCapAfterPass(scene.ascii);
    expect(r.ok, r.over.join("; ")).toBe(true);
  });

  it("no street lineup + enough NPCs", () => {
    const run = {
      ...makeRun("empty"),
      flags: ["branded", "watchOpen", "trueMirror", "booksOk", "knotOk", "tideOpen", "mainOpen"],
      items: ["deed", "incense", "brand", "roadPass"],
    };
    const w = loadScene("luoyang", run);
    expect(assertNoNpcLineup(w.talkers).ok).toBe(true);
    expect(w.talkers.length).toBeGreaterThanOrEqual(30);
  });

  it("art report", () => {
    const r = luoyangArtReport();
    expect(r.npcCount).toBeGreaterThanOrEqual(30);
    expect(r.furn.ok).toBe(true);
  });

  it("wine-yard unique map sprites exist (incremental)", async () => {
    const fs = await import("node:fs");
    const wine = [
      "luoBarkeeper",
      "luoCook",
      "luoWaiter",
      "luoWaiter2",
      "luoGuest",
      "luoGuest2",
      "luoRaconteur",
      "luoFlower",
    ];
    const paths = wine.map((id) => spriteSrc(id));
    expect(new Set(paths).size).toBe(wine.length);
    for (const id of wine) {
      const src = spriteSrc(id);
      expect(src).toBe(`/art/sprites/sprite-${id}.png`);
      expect(fs.existsSync(`public${src}`), src).toBe(true);
    }
  });
});
