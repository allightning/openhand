import { describe, expect, it } from "vitest";
import {
  generateLuoyang,
  NPC_BINDINGS,
  type NpcBinding,
} from "./luoyangGen";
import {
  riverColumnsOk,
  tianjinWaterHeadsOk,
  countWells,
  V74_WELL_MAX,
  LUOYANG_WELLS,
  riverBankSpots,
  wellAdjSpots,
  npcOnBindSpot,
  trimLanternRuns,
} from "./luoyangV74";
import { W, H, cx, cy, V73_LANTERN_MAX, V73_TREE_MIN, V73_TREE_MAX, LUOYANG_YARD_DEFS } from "./luoyangV73";
import { loadScene } from "./world";
import { makeRun } from "../game/run";
import { tileArt } from "./tileset";

function openRun() {
  return {
    ...makeRun("empty"),
    flags: ["branded", "watchOpen", "trueMirror", "booksOk", "knotOk", "tideOpen", "mainOpen", "testMode"],
    items: [] as never[],
  };
}

function virtualBox(id: string) {
  const market = { x: cx + 5, y: cy + 8 };
  if (id === "luoyangGate") return { x: cx - 4, y: cy - 4, w: 9, h: 8 };
  if (id === "tianjinMarket") return { x: market.x - 2, y: market.y - 1, w: 8, h: 5 };
  if (id === "southGarden") return { x: 58, y: 42, w: 22, h: 10 };
  if (id === "luoRiver") return { x: 1, y: cy - 2, w: W - 2, h: 6 };
  if (id === "westGate") return { x: 1, y: cy - 6, w: 4, h: 4 };
  if (id === "eastGate") return { x: W - 5, y: cy - 6, w: 4, h: 4 };
  const yd = LUOYANG_YARD_DEFS.find((y) => y.key === id);
  if (yd) return { x: yd.x, y: yd.y, w: yd.w, h: yd.h };
  return null;
}

function bindSpotsFor(g: string[], b: NpcBinding): { x: number; y: number }[] {
  if (b.mode === "atRiver") return riverBankSpots(g, cy).slice(0, 12);
  if (b.mode === "atWell") {
    const well = LUOYANG_WELLS.get(b.buildingId);
    if (well) return wellAdjSpots(g, well.x, well.y);
    return [];
  }
  if (b.mode === "atDoor") {
    if (b.buildingId === "westGate") {
      return [
        { x: 2, y: cy - 5 },
        { x: 2, y: cy - 4 },
        { x: 3, y: cy - 5 },
      ];
    }
    if (b.buildingId === "eastGate") {
      return [
        { x: W - 3, y: cy - 5 },
        { x: W - 3, y: cy - 4 },
        { x: W - 4, y: cy - 5 },
      ];
    }
    if (b.buildingId === "luoyangGate") {
      return [
        { x: cx - 3, y: cy - 4 },
        { x: cx + 3, y: cy - 4 },
        { x: cx - 3, y: cy + 4 },
        { x: cx + 3, y: cy + 4 },
      ];
    }
    const yd = LUOYANG_YARD_DEFS.find((y) => y.key === b.buildingId);
    if (yd) {
      const doorX =
        yd.door === "e" ? yd.x + yd.w - 1 : yd.door === "w" ? yd.x : yd.x + Math.floor(yd.w / 2);
      const doorY =
        yd.door === "s" ? yd.y + yd.h - 1 : yd.door === "n" ? yd.y : yd.y + Math.floor(yd.h / 2);
      return [
        { x: doorX + 1, y: doorY },
        { x: doorX - 1, y: doorY },
        { x: doorX, y: doorY + 1 },
        { x: doorX, y: doorY - 1 },
      ];
    }
  }
  const box = virtualBox(b.buildingId);
  if (b.mode === "inYard" && box) {
    const out: { x: number; y: number }[] = [];
    for (let yy = box.y + 1; yy < box.y + box.h - 1; yy++) {
      for (let xx = box.x + 1; xx < box.x + box.w - 1; xx++) {
        const c = g[yy]![xx]!;
        if (c === "." || c === "," || c === "o" || c === "t" || c === "n") out.push({ x: xx, y: yy });
      }
    }
    return out;
  }
  return [];
}

describe("Luoyang V7.4 rework", () => {
  it("1: river columns ~/% (bridge cols exempt)", () => {
    const scene = generateLuoyang();
    const r = riverColumnsOk(scene.ascii);
    expect(r.ok, r.bad.join(";")).toBe(true);
    expect(tianjinWaterHeadsOk(scene.ascii)).toBe(true);
  });

  it("2: sidewalk/shore tile mapping in world", () => {
    const w = loadScene("luoyang", openRun());
    const sw = tileArt("luoyang", w.tiles, 40, 4);
    expect(sw.layers.some((l) => l.src.includes("cobble-fy"))).toBe(true);
    let shore = 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (w.tiles[y]![x] === "shore") shore += 1;
      }
    }
    expect(shore).toBeGreaterThan(50);
  });

  it("3: NPC 100% binding — unbound count = 0", () => {
    const scene = generateLuoyang();
    const g = scene.ascii;
    const marks = (scene.entityMarks ?? []).filter((m) => m.role === "talker" && m.ref);
    const unbound: string[] = [];
    for (const m of marks) {
      const bind = NPC_BINDINGS.find((b) => b.npcId === m.ref);
      if (!bind) {
        unbound.push(`${m.ref}:no-bind`);
        continue;
      }
      const spots = bindSpotsFor(g, bind);
      if (!npcOnBindSpot(g, bind, { x: m.x, y: m.y }, virtualBox, spots)) {
        unbound.push(`${m.ref}@(${m.x},${m.y})`);
      }
    }
    expect(unbound, unbound.join(", ")).toEqual([]);
  });

  it("4: wells ≤6; lanterns ≤24; trees in range", () => {
    const scene = generateLuoyang();
    expect(countWells(scene.ascii)).toBeLessThanOrEqual(V74_WELL_MAX);
    let l = 0;
    let t = 0;
    for (const row of scene.ascii) {
      for (const c of row) {
        if (c === "l") l += 1;
        if (c === "&") t += 1;
      }
    }
    expect(l).toBeLessThanOrEqual(V73_LANTERN_MAX);
    expect(t).toBeGreaterThanOrEqual(V73_TREE_MIN);
    expect(t).toBeLessThanOrEqual(V73_TREE_MAX);
  });

  it("5: lantern runs trimmed — no 3+ consecutive", () => {
    const g = Array.from({ length: H }, () => ".".repeat(W));
    g[10] = g[10]!.slice(0, 10) + "lll" + g[10]!.slice(13);
    trimLanternRuns(g);
    expect(g[10]![11]).toBe(".");
  });
});
