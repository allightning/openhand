import { describe, expect, it } from "vitest";
import { LUOYANG_NPCS, luoyangSpriteReport, silhouetteKey } from "./npc";
import { assertSpriteUniqueness, assertGenderRatio } from "./npcSprite";
import { capFurnishing, placeNpc, cellKey } from "./placement";
import { generateLuoyang } from "./luoyangGen";

describe("task0 luoyang sprite+placement", () => {
  it("four-dimension uniqueness and gender ratio ~1.5", () => {
    const r = luoyangSpriteReport();
    expect(r.uniqueness.ok, r.uniqueness.dupes.join("; ")).toBe(true);
    expect(r.gender.female).toBeGreaterThanOrEqual(12);
    expect(r.gender.ratio).toBeGreaterThanOrEqual(1.2);
    expect(r.gender.ratio).toBeLessThanOrEqual(1.8);
    // child / old 不得与 mid 共用同一 key 前缀逻辑：独立 age
    const kids = LUOYANG_NPCS.filter((n) => n.age === "child");
    expect(kids.length).toBeGreaterThanOrEqual(3);
    expect(kids.every((n) => n.dims.age === "child")).toBe(true);
  });

  it("no blue palette", () => {
    for (const n of LUOYANG_NPCS) {
      expect(n.palette).not.toMatch(/Indigo|Blue|blue|indigo/i);
    }
  });

  it("placeNpc never overlaps occupied cells", () => {
    const g = Array.from({ length: 8 }, () => ".".repeat(10));
    g[0] = "#".repeat(10);
    g[7] = "#".repeat(10);
    const occ = new Set<string>();
    occ.add(cellKey(3, 3));
    const a = placeNpc(g, { id: "a", ch: "A", x: 3, y: 3 }, occ, { x: 1, y: 1, w: 8, h: 6 });
    expect(a.to.x !== 3 || a.to.y !== 3).toBe(true);
    expect(occ.has(cellKey(a.to.x, a.to.y))).toBe(true);
  });

  it("capFurnishing cuts barrels to <=6", () => {
    const g = Array.from({ length: 20 }, () => ".".repeat(20));
    for (let i = 0; i < 20; i++) {
      g[2] = g[2]!.slice(0, i) + "b" + g[2]!.slice(i + 1);
    }
    // put water near first few
    g[2] = "bbbbbbbbbbbb~~~~~~~~";
    const r = capFurnishing(g, "barrel", 6);
    expect(r.before).toBeGreaterThan(6);
    expect(r.after).toBeLessThanOrEqual(6);
  });

  it("luoyang: carts<=8, barrels<=6, npcs>=30, multi props", () => {
    const scene = generateLuoyang();
    const flat = scene.ascii.join("");
    const count = (ch: string) => flat.split("").filter((c) => c === ch).length;
    expect(count("f"), "carts").toBeLessThanOrEqual(8);
    expect(count("b"), "barrels").toBeLessThanOrEqual(6);
    expect(count("b"), "barrels min").toBeGreaterThanOrEqual(3);
    expect(count("&"), "trees").toBeGreaterThanOrEqual(12);
    expect(count("l"), "lanterns").toBeGreaterThanOrEqual(8);
    expect(count("*"), "braziers").toBeGreaterThanOrEqual(3);
    expect(count("j"), "jars").toBeGreaterThanOrEqual(3);
    expect(count("v"), "stalls/crates").toBeGreaterThanOrEqual(4);
    const ids = [...new Set(Object.values(scene.talkers))];
    expect(ids.length).toBeGreaterThanOrEqual(30);
    const dims = ids.map((id) => LUOYANG_NPCS.find((n) => n.id === id)).filter(Boolean);
    const u = assertSpriteUniqueness(dims.map((n) => ({ id: n!.id, dims: n!.dims })));
    expect(u.ok, u.dupes.join("; ")).toBe(true);
    const g = assertGenderRatio(dims.map((n) => ({ gender: n!.gender })));
    expect(g.ratio).toBeGreaterThanOrEqual(1.2);
    expect(g.ratio).toBeLessThanOrEqual(1.8);
    expect(g.female).toBeGreaterThanOrEqual(12);
    void silhouetteKey;
  });
});
