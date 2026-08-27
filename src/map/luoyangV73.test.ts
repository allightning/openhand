import { describe, expect, it } from "vitest";
import {
  W,
  H,
  cx,
  cy,
  PALACE,
  IMPERIAL_AXIS,
  YINGTIAN_GATE,
  LUOYANG_BRIDGES,
  V73_TREE_MIN,
  V73_TREE_MAX,
  V73_LANTERN_MAX,
  LUOYANG_L_SHAPE_KEYS,
  LUOYANG_YARD_DEFS,
  riverCenterOffset,
  riverWidth,
  carveLuoyangRiver,
  isRiverCell,
  punchRiverBridge,
  paintImperialAxis,
  paintPalaceWalls,
  plantV73Lanterns,
  sweepBareOutdoor,
  fillBlankWindows6,
  southGarden,
  bridgeChebyshevOk,
} from "./luoyangV73";
import { generateLuoyang, NPC_BINDINGS } from "./luoyangGen";
import { LUOYANG_BUILDINGS } from "./luoyangMeta";
import { LUOYANG_SUBSCENES } from "./luoyangHub";
import { loadScene, walkable, floodFloor } from "./world";
import { makeRun } from "../game/run";

function blank(w: number, h: number): string[] {
  return Array.from({ length: h }, () => ".".repeat(w));
}

function openRun(extra: { items?: string[] } = {}) {
  return {
    ...makeRun("empty"),
    flags: ["branded", "watchOpen", "trueMirror", "booksOk", "knotOk", "tideOpen", "mainOpen", "testMode"],
    items: ["deed", "incense", "brand", ...(extra.items ?? [])] as never[],
  };
}

describe("Luoyang V7.3 structural", () => {
  it("1: constants and yard defs", () => {
    expect(W).toBe(84);
    expect(H).toBe(54);
    expect(cx).toBe(42);
    expect(cy).toBe(27);
    expect(PALACE).toEqual({ x0: 38, x1: 46, y0: 1, y1: 15 });
    expect(IMPERIAL_AXIS.sidewalkX).toEqual([40, 44]);
    expect(IMPERIAL_AXIS.roadX).toEqual([41, 42, 43]);
    expect(YINGTIAN_GATE).toEqual({ x0: 41, x1: 43, y: 7 });
    expect(V73_TREE_MIN).toBe(111);
    expect(V73_TREE_MAX).toBe(133);
    expect(V73_LANTERN_MAX).toBe(24);
    expect(LUOYANG_L_SHAPE_KEYS.size).toBe(8);
    expect(LUOYANG_YARD_DEFS.some((y) => y.key === "templeOffice")).toBe(true);
    expect(LUOYANG_YARD_DEFS.find((y) => y.key === "jail")).toMatchObject({ x: 2, y: 14, w: 14, h: 10 });
  });

  it("2: river meanders with width changes; no 5-row flat pool", () => {
    const widths = new Set<number>();
    for (let x = 1; x < W - 1; x++) widths.add(riverWidth(x));
    expect(widths.size).toBeGreaterThanOrEqual(3);
    const g = blank(W, H);
    carveLuoyangRiver(g, cy, W);
    let maxDepth = 0;
    for (let x = 1; x < W - 1; x++) {
      let depth = 0;
      for (let y = 1; y < H - 1; y++) {
        if (g[y]![x] === "~") depth += 1;
        else depth = 0;
        maxDepth = Math.max(maxDepth, depth);
      }
    }
    expect(maxDepth).toBeLessThanOrEqual(4);
    expect(riverCenterOffset(10)).toBeGreaterThanOrEqual(-1);
    expect(riverCenterOffset(10)).toBeLessThanOrEqual(1);
  });

  it("3: three bridges Chebyshev >= 12 apart", () => {
    expect(bridgeChebyshevOk()).toBe(true);
    expect(LUOYANG_BRIDGES.length).toBe(3);
    const scene = generateLuoyang();
    for (const br of LUOYANG_BRIDGES) {
      let hit = false;
      for (let y = cy - 3; y <= cy + 3; y++) {
        for (let x = br.x0; x <= br.x1; x++) {
          if (scene.ascii[y]![x] === "=") hit = true;
        }
      }
      expect(hit, `${br.key} bridge`).toBe(true);
    }
  });

  it("4: imperial axis sidewalk only on x=40,44", () => {
    const scene = generateLuoyang();
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        if (scene.ascii[y]![x] !== ",") continue;
        if (y >= 1 && y <= cy + 4) {
          expect([40, 44].includes(x), `, @${x},${y}`).toBe(true);
        }
      }
    }
    for (const y of [4, 10, 20]) {
      expect(scene.ascii[y]![41]).toBe("=");
      expect(scene.ascii[y]![42]).toBe("=");
    }
  });

  it("5: yingtian gate :/H/: and palace walls", () => {
    const scene = generateLuoyang();
    expect(scene.ascii[YINGTIAN_GATE.y]![YINGTIAN_GATE.x0]).toBe(":");
    expect(scene.ascii[YINGTIAN_GATE.y]![cx]).toBe("H");
    expect(scene.ascii[YINGTIAN_GATE.y]![YINGTIAN_GATE.x1]).toBe(":");
    for (let x = PALACE.x0; x <= PALACE.x1; x++) {
      const top = scene.ascii[PALACE.y0]![x];
      expect(top === "#" || (x === cx && top === "D")).toBe(true);
      expect(scene.ascii[PALACE.y1]![x] === "#" || scene.ascii[PALACE.y1]![x] === ":").toBe(true);
    }
  });

  it("6: trees 111-133; lanterns <=24; no SE hill", () => {
    const scene = generateLuoyang();
    let trees = 0;
    let lanterns = 0;
    let hills = 0;
    for (const row of scene.ascii) {
      for (const ch of row) {
        if (ch === "&") trees += 1;
        if (ch === "l") lanterns += 1;
        if (ch === "^") hills += 1;
      }
    }
    expect(trees).toBeGreaterThanOrEqual(V73_TREE_MIN);
    expect(trees).toBeLessThanOrEqual(V73_TREE_MAX);
    expect(lanterns).toBeGreaterThan(0);
    expect(lanterns).toBeLessThanOrEqual(V73_LANTERN_MAX);
    let whitelistLanterns = 0;
    for (const y of [4, 20, 36, 52]) {
      if (scene.ascii[y]![cx - 2] === "l") whitelistLanterns += 1;
      if (scene.ascii[y]![cx + 2] === "l") whitelistLanterns += 1;
    }
    expect(whitelistLanterns).toBe(8);
    expect(hills).toBe(0);
    for (let y = 42; y < 52; y++) {
      for (let x = 58; x < 80; x++) {
        expect(scene.ascii[y]![x] === "^").toBe(false);
      }
    }
  });

  it("6b: L-shape courtyard count matches bbox table (8/17 ≥40%)", () => {
    const courtyards = LUOYANG_YARD_DEFS.filter(
      (y) => y.form !== "street" && !["yingtian", "duanmen", "tongyuanGate", "lideGate"].includes(y.key),
    );
    const lKeys = [...LUOYANG_L_SHAPE_KEYS];
    expect(courtyards.length).toBe(17);
    expect(lKeys.length).toBe(8);
    for (const key of lKeys) {
      expect(courtyards.some((y) => y.key === key && (y.lShape || y.wing))).toBe(true);
    }
    expect(lKeys.length / courtyards.length).toBeGreaterThanOrEqual(0.4);
  });

  it("7: temple portal TB; luoMonk in subscene only", () => {
    const scene = generateLuoyang();
    expect(scene.portals?.TB?.to).toBe("luoyang_temple_outer");
    const tb = (scene.entityMarks ?? []).find((m) => m.id === "TB" && m.role === "portal");
    expect(tb).toBeTruthy();
    expect(Math.abs(tb!.x - 71) + Math.abs(tb!.y - 30)).toBeLessThanOrEqual(3);
    expect(NPC_BINDINGS.some((b) => b.npcId === "luoMonk")).toBe(false);
    expect(LUOYANG_SUBSCENES.luoyang_temple_outer?.talkers?.m).toBe("luoMonk");
    const names = LUOYANG_BUILDINGS.map((b) => b.name);
    expect(names).toContain("白马寺司");
    expect(names).toContain("白马寺");
    expect(LUOYANG_BUILDINGS.find((b) => b.key === "templeOffice")?.landmark).toBe(false);
    expect(LUOYANG_BUILDINGS.find((b) => b.key === "templeOuter")?.landmark).toBe(true);
  });

  it("8: unit helpers paint axis / garden / sweep", () => {
    const g = blank(W, H);
    carveLuoyangRiver(g, cy, W);
    expect(isRiverCell(g, 20, cy, cy)).toBe(true);
    punchRiverBridge(g, 16, 17, cy);
    paintImperialAxis(g, cx, cy);
    paintPalaceWalls(g);
    southGarden(g);
    const doors = new Map<string, { doorX: number; doorY: number }>([
      ["tongyuanGate", { doorX: 49, doorY: 21 }],
      ["westMarket", { doorX: 25, doorY: 33 }],
    ]);
    plantV73Lanterns(g, cx, cy, doors);
    sweepBareOutdoor(g, LUOYANG_YARD_DEFS, cx, cy);
    fillBlankWindows6(g, cx, cy, V73_TREE_MIN, V73_TREE_MAX);
    expect(g[cy]![16] === "=" || g[cy]![17] === "=").toBe(true);
    expect(g[4]![40] === "," || g[4]![40] === "l").toBe(true);
  });

  it("9: jail at new bbox; flood still works", () => {
    const scene = generateLuoyang();
    const jail = { x: 2, y: 14, w: 14, h: 10 };
    let door: { x: number; y: number } | null = null;
    for (let y = jail.y; y < jail.y + jail.h; y++) {
      for (let x = jail.x; x < jail.x + jail.w; x++) {
        if (scene.ascii[y]![x] === "G") door = { x, y };
      }
    }
    expect(door).toBeTruthy();
    expect(walkable(loadScene("luoyang", openRun()), door!.x, door!.y, openRun())).toBe(false);
    const w = loadScene("luoyang", openRun({ items: ["roadPass"] }));
    const flooded = floodFloor(w, openRun({ items: ["roadPass"] }));
    expect(flooded.has(`${cx},${cy}`)).toBe(true);
  });
});
