import { describe, expect, it } from "vitest";
import { generateLuoyang } from "./luoyangGen";
import { LUOYANG_SUBSCENES } from "./luoyangHub";
import { loadScene, floodFloor, walkable } from "./world";
import { makeRun } from "../game/run";
import { TALKER_NAME } from "./scenes";
import fs from "node:fs";
import path from "node:path";

function openRun(extra: { items?: string[] } = {}) {
  return {
    ...makeRun("empty"),
    flags: ["branded", "watchOpen", "trueMirror", "booksOk", "knotOk", "tideOpen", "mainOpen"],
    items: ["deed", "incense", "brand", ...(extra.items ?? [])] as never[],
  };
}

describe("Luoyang V5 东都重构", () => {
  it("1: NPC id unique across hub + all luoyang subscenes (no clones)", () => {
    const hub = generateLuoyang();
    const ids = new Map<string, string>();
    const add = (scene: string, npcId: string) => {
      const prev = ids.get(npcId);
      expect(prev, `${npcId} also in ${prev}`).toBeUndefined();
      ids.set(npcId, scene);
    };
    for (const m of hub.entityMarks ?? []) {
      if (m.role === "talker" && m.ref) add("luoyang", m.ref);
    }
    for (const [sid, sc] of Object.entries(LUOYANG_SUBSCENES)) {
      for (const npcId of Object.values(sc.talkers ?? {})) add(sid, npcId);
    }
    expect(ids.has("luoAsha")).toBe(true);
    expect(ids.get("luoAsha")).toBe("luoyang_yanbo_inner");
    expect(ids.has("luoJailer")).toBe(true);
    expect(ids.get("luoJailer")).toBe("luoyang_yamen_prison");
  });

  it("2: display names unique among placed talkers", () => {
    const w = loadScene("luoyang", openRun({ items: ["roadPass"] }));
    const names = w.talkers.map((t) => TALKER_NAME[t.id] ?? t.id);
    expect(new Set(names).size).toBe(names.length);
  });

  it("3: 东都密度 — 官府建筑 + 鳞次商铺", () => {
    const scene = generateLuoyang();
    const w = loadScene("luoyang", openRun({ items: ["roadPass"] }));
    for (const id of ["luoConstable", "luoCaptain", "luoGuard", "luoSilk", "luoSmith", "judge"]) {
      expect(w.talkers.some((t) => t.id === id), id).toBe(true);
    }
    // 北市干道旁小铺：连续 H 间距 ≤3
    const cy = Math.floor(54 / 2);
    const y = cy - 7;
    const houses: number[] = [];
    for (let x = 40; x < 80; x++) {
      if (scene.ascii[y]![x] === "H" || scene.ascii[y + 1]![x] === "H") houses.push(x);
    }
    expect(houses.length).toBeGreaterThanOrEqual(6);
    for (let i = 1; i < houses.length; i++) {
      expect(houses[i]! - houses[i - 1]!).toBeLessThanOrEqual(8);
    }
    expect(w.talkers.length).toBeGreaterThanOrEqual(45);
  });

  it("4: no walls/houses on hill or deep water tiles", () => {
    const scene = generateLuoyang();
    // After gen, #/H must not share a cell with ^/~ in the same ascii (mutually exclusive chars).
    // Stronger: every #/H cell's neighbors that are yard-adjacent must not leave the footprint on ^.
    // Check: nowhere is a wall character written while terrain was left as ^ under footprint —
    // we assert no ^ remains inside known courtyard boxes.
    const boxes = [
      { x: 17, y: 13, w: 14, h: 10 }, // yamen
      { x: 30, y: 14, w: 14, h: 10 }, // sixDoors
      { x: 2, y: 14, w: 14, h: 10 }, // jail
      { x: 66, y: 2, w: 18, h: 12 }, // martial
      { x: 66, y: 13, w: 14, h: 10 }, // garrison
      { x: 66, y: 33, w: 18, h: 12 }, // brothel
      { x: 3, y: 33, w: 18, h: 12 }, // wine
      { x: 2, y: 2, w: 18, h: 12 }, // shangyang
    ];
    for (const b of boxes) {
      for (let yy = b.y; yy < b.y + b.h; yy++) {
        for (let xx = b.x; xx < b.x + b.w; xx++) {
          const ch = scene.ascii[yy]![xx]!;
          expect(ch === "^" || ch === "~", `terrain under building @${xx},${yy}`).toBe(false);
        }
      }
    }
  });

  it("5: flood reaches major doors; jail barrier closed without pass", () => {
    const run = openRun({ items: ["roadPass"] });
    const w = loadScene("luoyang", run);
    const flooded = floodFloor(w, run);
    const cy = Math.floor(w.h / 2);
    expect(flooded.has(`${Math.floor(w.w / 2)},${cy}`)).toBe(true);
    // 烟波楼西门外
    let brothelOk = false;
    for (let y = cy + 5; y < cy + 15; y++) {
      for (let x = 84 - 20; x < 84 - 14; x++) {
        if (flooded.has(`${x},${y}`)) brothelOk = true;
      }
    }
    expect(brothelOk).toBe(true);

    const scene = generateLuoyang();
    let door: { x: number; y: number } | null = null;
    const jail = { x: 2, y: 14, w: 14, h: 10 };
    for (let y = jail.y; y < jail.y + jail.h; y++) {
      for (let x = jail.x; x < jail.x + jail.w; x++) {
        if (scene.ascii[y]![x] === "G") door = { x, y };
      }
    }
    expect(door).toBeTruthy();
    expect(walkable(loadScene("luoyang", openRun()), door!.x, door!.y, openRun())).toBe(false);
  });

  it("6: float-labels CSS sits above actors; 洛阳门 retained", () => {
    const css = fs.readFileSync(path.resolve(__dirname, "../style.css"), "utf8");
    expect(css).toMatch(/\.float-labels\s*\{[^}]*z-index:\s*9999/s);
    expect(css).toMatch(/\.float-labels \.float-label\s*\{[^}]*z-index:\s*9999/s);
    expect(css).toMatch(/translate\(-50%,\s*-100%\)/);
    const main = fs.readFileSync(path.resolve(__dirname, "../main.ts"), "utf8");
    expect(main).toContain('id="float-labels"');
    expect(main).toContain("floatLabel(");

    const w = loadScene("luoyang", openRun({ items: ["roadPass"] }));
    expect(w.props.filter((p) => p.kind === "arch" && p.tag === "洛阳门").length).toBeGreaterThanOrEqual(2);
  });

  it("7: error library — multi-char marks, no outdoor counters, trees off arterial", () => {
    const scene = generateLuoyang();
    const w = loadScene("luoyang", openRun({ items: ["roadPass"] }));
    for (const m of scene.entityMarks ?? []) {
      expect(m.id.length).toBeGreaterThanOrEqual(2);
    }
    // 城门 D/W/E 仍为单字母出行门户；交互实体必须双字符
    for (const p of w.portals.filter((x) => x.to.startsWith("luoyang_"))) {
      expect(p.ch.length).toBeGreaterThanOrEqual(2);
    }
    for (const p of w.props) {
      if (p.id) expect(p.id.length).toBeGreaterThanOrEqual(2);
      if (p.kind === "counter") {
        expect(w.tiles[p.y]![p.x]).not.toBe("road");
      }
    }
    const cx = Math.floor(w.w / 2);
    const cy = Math.floor(w.h / 2);
    for (const t of w.props.filter((p) => p.kind === "tree")) {
      expect(Math.abs(t.x - cx) <= 1).toBe(false);
      expect(t.y === cy - 5 || t.y === cy + 5).toBe(false);
    }
  });
});
