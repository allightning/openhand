/**
 * 洛阳 V7.4 — 渲染映射配套、NPC 绑定校验、坊内活化、井/灯配额。
 */

import {
  W,
  H,
  cx,
  cy,
  LUOYANG_YARD_DEFS,
  type LuoyangYardDef,
  IMPERIAL_AXIS,
} from "./luoyangV73";
import type { NpcBinding } from "./luoyangGen";

export const V74_WELL_MAX = 6;
export const V74_FANG_PROP_MAX = 8;
export const V74_AT_RIVER_MAX = 2;

export let LUOYANG_WELLS = new Map<string, { x: number; y: number }>();

function get(g: string[], x: number, y: number): string {
  if (y < 0 || y >= g.length || x < 0 || x >= g[0]!.length) return "#";
  return g[y]![x]!;
}

function set(g: string[], x: number, y: number, ch: string): void {
  if (y < 0 || y >= g.length || x < 0 || x >= g[0]!.length) return;
  const row = g[y]!;
  g[y] = row.slice(0, x) + ch + row.slice(x + 1);
}

function interiorCells(yd: LuoyangYardDef): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let yy = yd.y + 1; yy < yd.y + yd.h - 1; yy++) {
    for (let xx = yd.x + 1; xx < yd.x + yd.w - 1; xx++) out.push({ x: xx, y: yy });
  }
  if (yd.wing) {
    const w = yd.wing;
    for (let yy = w.y + 1; yy < w.y + w.h - 1; yy++) {
      for (let xx = w.x + 1; xx < w.x + w.w - 1; xx++) out.push({ x: xx, y: yy });
    }
  }
  return out;
}

function countTreesIn(g: string[], cells: { x: number; y: number }[]): number {
  let n = 0;
  for (const c of cells) if (get(g, c.x, c.y) === "&") n += 1;
  return n;
}

function has8x8Vacuum(g: string[], yd: LuoyangYardDef): boolean {
  for (let y = yd.y + 1; y <= yd.y + yd.h - 9; y++) {
    for (let x = yd.x + 1; x <= yd.x + yd.w - 9; x++) {
      let blank = 0;
      for (let dy = 0; dy < 8; dy++) {
        for (let dx = 0; dx < 8; dx++) {
          const c = get(g, x + dx, y + dy);
          if (c === "." || c === ",") blank += 1;
        }
      }
      if (blank >= 56) return true;
    }
  }
  return false;
}

/** 洛水 x∈[1,82] 每列有 ~ 与 %（桥列除外）。 */
export function riverColumnsOk(g: string[]): { ok: boolean; bad: string[] } {
  const bridgeCols = new Set<number>();
  for (const [x0, x1] of [
    [16, 17],
    [41, 43],
    [68, 69],
  ] as const) {
    for (let x = x0; x <= x1; x++) bridgeCols.add(x);
  }
  const axisCols = new Set<number>([...IMPERIAL_AXIS.sidewalkX, ...IMPERIAL_AXIS.roadX]);
  const bad: string[] = [];
  for (let x = 1; x <= W - 2; x++) {
    if (bridgeCols.has(x) || axisCols.has(x)) continue;
    let hasT = false;
    let hasP = false;
    for (let y = 1; y < H - 1; y++) {
      if (g[y]![x] === "~") hasT = true;
      if (g[y]![x] === "%") hasP = true;
    }
    if (!hasT) bad.push(`x${x}:no~`);
    if (!hasP) bad.push(`x${x}:no%`);
  }
  return { ok: bad.length === 0, bad };
}

/** 天津桥东西水头：x=39/45 列在 cy±3 内仍有 ~/% 接岸。 */
export function tianjinWaterHeadsOk(g: string[]): boolean {
  for (const x of [39, 45]) {
    let hit = false;
    for (let y = cy - 3; y <= cy + 3; y++) {
      const c = g[y]![x]!;
      if (c === "~" || c === "%") hit = true;
    }
    if (!hit) return false;
  }
  return true;
}

/** 坊内活化：树丛+井+生活 prop；单坊 prop ≤8；全图井 ≤6。 */
export function activateFangYards(g: string[]): void {
  LUOYANG_WELLS = new Map();
  let wellTotal = 0;
  const skip = new Set(["yingtian", "duanmen", "tongyuanGate", "lideGate"]);
  const clump: [number, number][] = [
    [0, 0],
    [1, 0],
    [0, 1],
  ];

  const home1 = LUOYANG_YARD_DEFS.find((y) => y.key === "home1");
  if (home1) {
    for (const c of interiorCells(home1)) {
      if (get(g, c.x, c.y) !== ".") continue;
      set(g, c.x, c.y, "n");
      LUOYANG_WELLS.set("home1", c);
      wellTotal += 1;
      break;
    }
  }

  for (const yd of LUOYANG_YARD_DEFS) {
    if (yd.form === "street" || skip.has(yd.key)) continue;
    const cells = interiorCells(yd);
    if (!cells.length) continue;

    let propCount = 0;
    const countProp = () => {
      let n = 0;
      for (const c of cells) {
        const ch = get(g, c.x, c.y);
        if ("&ntobv".includes(ch)) n += 1;
      }
      return n;
    };
    propCount = countProp();

    if (countTreesIn(g, cells) < 2) {
      const seed = yd.x * 17 + yd.y * 13;
      const cx0 = yd.x + 2 + (seed % Math.max(1, yd.w - 5));
      const cy0 = yd.y + 2 + ((seed >> 3) % Math.max(1, yd.h - 5));
      for (const [dx, dy] of clump) {
        const px = cx0 + dx;
        const py = cy0 + dy;
        if (get(g, px, py) === ".") {
          set(g, px, py, "&");
          propCount += 1;
        }
      }
    }

    if (wellTotal < V74_WELL_MAX && !LUOYANG_WELLS.has(yd.key)) {
      for (const c of cells) {
        if (yd.key === "home1") break;
        if (propCount >= V74_FANG_PROP_MAX) break;
        if (get(g, c.x, c.y) !== ".") continue;
        set(g, c.x, c.y, "n");
        LUOYANG_WELLS.set(yd.key, { x: c.x, y: c.y });
        wellTotal += 1;
        propCount += 1;
        break;
      }
    }

    const addProp = (ch: string) => {
      if (propCount >= V74_FANG_PROP_MAX) return false;
      for (const c of cells) {
        if (get(g, c.x, c.y) !== ".") continue;
        set(g, c.x, c.y, ch);
        propCount += 1;
        return true;
      }
      return false;
    };

    addProp("o");
    addProp("t");
    addProp("b");

    if (yd.key === "southGarden" || yd.key === "home4" || yd.key === "home2") {
      for (let dy = 0; dy < 2; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          const px = yd.x + 2 + dx;
          const py = yd.y + yd.h - 4 + dy;
          if (propCount >= V74_FANG_PROP_MAX) break;
          if (get(g, px, py) === ".") {
            set(g, px, py, "e");
            propCount += 1;
          }
        }
      }
    }

    if (has8x8Vacuum(g, yd)) {
      addProp("&");
      addProp("v");
    }
  }

  // 城南园林：菜畦 + 补树（luoElder2 绑定区）
  let gProp = 0;
  for (let x = 59; x < 78 && gProp < 6; x++) {
    for (let y = 43; y < 51 && gProp < 6; y++) {
      const c = get(g, x, y);
      if (c !== "." && c !== "=") continue;
      if (gProp < 4) {
        set(g, x, y, "e");
        gProp += 1;
      }
    }
  }
  if (wellTotal < V74_WELL_MAX && !LUOYANG_WELLS.has("southGarden")) {
    set(g, 62, 45, "n");
    LUOYANG_WELLS.set("southGarden", { x: 62, y: 45 });
    wellTotal += 1;
  }

  // 全图井硬顶
  let wellsSeen = 0;
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      if (get(g, x, y) !== "n") continue;
      wellsSeen += 1;
      if (wellsSeen > V74_WELL_MAX) set(g, x, y, ".");
    }
  }
}

/** 南岸岸外 1 格（洛水 % 南侧邻格）。 */
export function riverBankSpots(g: string[], riverCy: number): { x: number; y: number }[] {
  const spots: { x: number; y: number }[] = [];
  for (let x = 2; x < W - 2; x++) {
    for (let y = riverCy - 2; y < riverCy + 5; y++) {
      if (y <= 0 || y >= H - 1) continue;
      if (get(g, x, y) !== "%") continue;
      const sy = y + 1;
      if (sy >= H - 1) continue;
      const c = get(g, x, sy);
      if (c === "." || c === "," || c === "=") {
        if (!spots.some((s) => s.x === x && s.y === sy)) spots.push({ x, y: sy });
      }
    }
  }
  return spots;
}

export function wellAdjSpots(g: string[], wx: number, wy: number): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (const [dx, dy] of [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ] as const) {
    const x = wx + dx;
    const y = wy + dy;
    const c = get(g, x, y);
    if (c === "." || c === "," || c === "=" || c === ":") out.push({ x, y });
  }
  return out;
}

function spotInBox(
  x: number,
  y: number,
  box: { x: number; y: number; w: number; h: number } | null | undefined,
): boolean {
  if (!box) return false;
  return x >= box.x && x < box.x + box.w && y >= box.y && y < box.y + box.h;
}

export function npcOnBindSpot(
  g: string[],
  bind: NpcBinding,
  pos: { x: number; y: number },
  virtualBox: (id: string) => { x: number; y: number; w: number; h: number } | null | undefined,
  validSpots: { x: number; y: number }[],
): boolean {
  if (validSpots.some((s) => s.x === pos.x && s.y === pos.y)) return true;
  const box = virtualBox(bind.buildingId);
  if (bind.mode === "inYard" && box) {
    if (!spotInBox(pos.x, pos.y, box)) return false;
    const ch = get(g, pos.x, pos.y);
    return ch !== "#" && ch !== "~" && ch !== "%";
  }
  if (bind.mode === "atDoor" || bind.mode === "atWell" || bind.mode === "atRiver") {
    return validSpots.some((s) => Math.abs(s.x - pos.x) + Math.abs(s.y - pos.y) <= 3);
  }
  return false;
}

export function countWells(g: string[]): number {
  let n = 0;
  for (const row of g) for (const c of row) if (c === "n") n += 1;
  return n;
}

/** 灯柱禁止 ≥3 连排（横/竖）。 */
export function trimLanternRuns(g: string[]): void {
  const isL = (x: number, y: number) => get(g, x, y) === "l";
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 3; x++) {
      if (isL(x, y) && isL(x + 1, y) && isL(x + 2, y)) {
        set(g, x + 1, y, ".");
      }
    }
  }
  for (let x = 1; x < W - 1; x++) {
    for (let y = 1; y < H - 3; y++) {
      if (isL(x, y) && isL(x, y + 1) && isL(x, y + 2)) {
        set(g, x, y + 1, ".");
      }
    }
  }
}

export function imperialSidewalkCells(): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let y = IMPERIAL_AXIS.y0; y <= IMPERIAL_AXIS.y1; y++) {
    for (const x of IMPERIAL_AXIS.sidewalkX) out.push({ x, y });
  }
  return out;
}
