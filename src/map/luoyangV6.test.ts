import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { generateLuoyang } from "./luoyangGen";
import { LUOYANG_SUBSCENES } from "./luoyangHub";
import { loadScene, floodFloor, walkable } from "./world";
import { makeRun } from "../game/run";
import { TALKER_NAME } from "./scenes";

function openRun(extra: { items?: string[] } = {}) {
  return {
    ...makeRun("empty"),
    flags: ["branded", "watchOpen", "trueMirror", "booksOk", "knotOk", "tideOpen", "mainOpen"],
    items: ["deed", "incense", "brand", ...(extra.items ?? [])] as never[],
  };
}

describe("Luoyang V6 系统性重构", () => {
  it("1: outdoor map has no screens/beds; indoor yanbo keeps 2-wide screens", () => {
    const scene = generateLuoyang();
    for (let y = 0; y < scene.ascii.length; y++) {
      for (let x = 0; x < scene.ascii[0]!.length; x++) {
        const ch = scene.ascii[y]![x]!;
        expect(ch === "h" || ch === "u", `indoor furniture @${x},${y}`).toBe(false);
      }
    }
    const w = loadScene("luoyang", openRun({ items: ["roadPass"] }));
    expect(w.props.some((p) => p.kind === "screen" || p.kind === "bed")).toBe(false);
    expect(w.props.some((p) => w.tiles[p.y]![p.x] === "water")).toBe(false);

    const inner = LUOYANG_SUBSCENES.luoyang_yanbo_inner!;
    const row = inner.ascii.join("");
    expect(row.includes("hh")).toBe(true);
    const iw = loadScene("luoyang_yanbo_inner", openRun());
    const screens = iw.props.filter((p) => p.kind === "screen");
    expect(screens.length).toBeGreaterThanOrEqual(2);
    expect(screens.some((p) => (p.spanW ?? 1) >= 2)).toBe(true);
  });

  it("2: street shops hug arterial roads (door within 1 of =)", () => {
    const scene = generateLuoyang();
    const cy = Math.floor(54 / 2);
    const shopKeys = [
      { x: 50, y: cy - 8, h: 3, door: "s" as const },
      { x: 56, y: cy - 8, h: 3, door: "s" as const },
      { x: 27, y: cy + 6, h: 3, door: "n" as const },
    ];
    for (const s of shopKeys) {
      const doorY = s.door === "s" ? s.y + s.h - 1 : s.y;
      const doorX = s.x + 2;
      let nearRoad = false;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (scene.ascii[doorY + dy]?.[doorX + dx] === "=") nearRoad = true;
        }
      }
      expect(nearRoad, `shop@${s.x},${s.y} door ${doorX},${doorY} not on road`).toBe(true);
    }
  });

  it("3: no 15x15 vacuum of empty floor", () => {
    const scene = generateLuoyang();
    const H = scene.ascii.length;
    const W = scene.ascii[0]!.length;
    const vacant = (ch: string) => ch === "." || ch === ",";
    for (let y = 1; y < H - 15; y++) {
      for (let x = 1; x < W - 15; x++) {
        let empty = 0;
        for (let dy = 0; dy < 15; dy++) {
          for (let dx = 0; dx < 15; dx++) {
            if (vacant(scene.ascii[y + dy]![x + dx]!)) empty += 1;
          }
        }
        expect(empty === 15 * 15, `vacuum @${x},${y}`).toBe(false);
      }
    }
  });

  it("4: courtyard doors are visible 院门; 洛阳门 kept", () => {
    const w = loadScene("luoyang", openRun({ items: ["roadPass"] }));
    expect(w.props.filter((p) => p.kind === "arch" && p.tag === "院门").length).toBeGreaterThanOrEqual(8);
    expect(w.props.filter((p) => p.kind === "arch" && p.tag === "洛阳门").length).toBeGreaterThanOrEqual(2);
  });

  it("5: labels bottom-center + z 9999; NPC unique", () => {
    const css = fs.readFileSync(path.resolve(__dirname, "../style.css"), "utf8");
    expect(css).toMatch(/z-index:\s*9999/);
    expect(css).toMatch(/translate\(-50%,\s*-100%\)/);
    const main = fs.readFileSync(path.resolve(__dirname, "../main.ts"), "utf8");
    expect(main).toMatch(/style="left:\$\{left\}px;top:\$\{top\}px"/);
    expect(main).not.toMatch(/transform:translate\(\$\{left\}px,\$\{top\}px\)/);

    const hub = generateLuoyang();
    const ids = new Map<string, string>();
    for (const m of hub.entityMarks ?? []) {
      if (m.role === "talker" && m.ref) {
        expect(ids.has(m.ref), `clone ${m.ref}`).toBe(false);
        ids.set(m.ref, "luoyang");
      }
    }
    for (const [sid, sc] of Object.entries(LUOYANG_SUBSCENES)) {
      for (const npcId of Object.values(sc.talkers ?? {})) {
        expect(ids.has(npcId), `clone ${npcId} in ${sid}`).toBe(false);
        ids.set(npcId, sid);
      }
    }
    const w = loadScene("luoyang", openRun({ items: ["roadPass"] }));
    const names = w.talkers.map((t) => TALKER_NAME[t.id] ?? t.id);
    expect(new Set(names).size).toBe(names.length);
  });

  it("6: flood from spawn reaches wine/brothel/sixDoors; jail still barred", () => {
    const run = openRun({ items: ["roadPass"] });
    const w = loadScene("luoyang", run);
    const flooded = floodFloor(w, run);
    const cy = Math.floor(w.h / 2);
    expect(flooded.has(`${Math.floor(w.w / 2)},${cy}`)).toBe(true);
    let wineOk = false;
    let brothelOk = false;
    let sixOk = false;
    for (let y = 33; y < 45; y++) {
      for (let x = 3; x < 22; x++) if (flooded.has(`${x},${y}`)) wineOk = true;
      for (let x = 66; x < 84; x++) if (flooded.has(`${x},${y}`)) brothelOk = true;
    }
    for (let y = 14; y < 24; y++) {
      for (let x = 30; x < 44; x++) if (flooded.has(`${x},${y}`)) sixOk = true;
    }
    expect(wineOk).toBe(true);
    expect(brothelOk).toBe(true);
    expect(sixOk).toBe(true);

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
});
