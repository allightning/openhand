/**
 * 洛阳 V7.3 — 御道拓宽、洛水自然化、三桥、L 形院落、灯笼白名单。
 */

export type LuoyangYardFn =
  | "yamen"
  | "wine"
  | "brothel"
  | "martial"
  | "clinic"
  | "pawn"
  | "temple"
  | "post"
  | "shop"
  | "home"
  | "jail"
  | "shed"
  | "sixDoors"
  | "garrison"
  | "silk"
  | "smith";

export interface LuoyangCourtyardConfig {
  jin: 1 | 2 | 3;
  fn: LuoyangYardFn;
  x: number;
  y: number;
  w: number;
  h: number;
  door: "n" | "s" | "e" | "w";
  mark?: string;
  form?: "courtyard" | "street";
}

export const W = 84;
export const H = 54;
export const cx = 42;
export const cy = 27;

export const PALACE = { x0: 38, x1: 46, y0: 1, y1: 15 } as const;
export const IMPERIAL_AXIS = {
  sidewalkX: [40, 44] as const,
  roadX: [41, 42, 43] as const,
  y0: 1,
  y1: cy + 4,
} as const;
export const YINGTIAN_GATE = { x0: 41, x1: 43, y: 7 } as const;

export const LUOYANG_BRIDGES = [
  { key: "west", x0: 16, x1: 17 },
  { key: "tianjin", x0: 41, x1: 43 },
  { key: "east", x0: 68, x1: 69 },
] as const;

export const V73_TREE_MIN = 111;
export const V73_TREE_MAX = 133;
export const V73_LANTERN_MAX = 24;

export const LUOYANG_L_SHAPE_KEYS = new Set([
  "yamen",
  "southMarket",
  "martial",
  "wine",
  "brothel",
  "home1",
  "home4",
  "home2",
]);

export type LuoyangYardDef = LuoyangCourtyardConfig & {
  key: string;
  lShape?: boolean;
  wing?: { x: number; y: number; w: number; h: number };
};

function get(g: string[], x: number, y: number): string {
  if (y < 0 || y >= g.length || x < 0 || x >= g[0]!.length) return "#";
  return g[y]![x]!;
}

function set(g: string[], x: number, y: number, ch: string): void {
  if (y < 0 || y >= g.length || x < 0 || x >= g[0]!.length) return;
  const row = g[y]!;
  g[y] = row.slice(0, x) + ch + row.slice(x + 1);
}

function rect(g: string[], x0: number, y0: number, x1: number, y1: number, ch: string): void {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(g, x, y, ch);
}

/** 洛水中心线相对 cy 的偏移（±1 蜿蜒）。 */
export function riverCenterOffset(x: number): number {
  const a = Math.sin((x / W) * Math.PI * 2.1) * 0.85;
  const b = Math.sin((x / 13 + 2) * 0.55) * 0.45;
  const v = a + b;
  if (v > 0.35) return 1;
  if (v < -0.35) return -1;
  return 0;
}

/** 河宽 2–4，沿 x 至少三处变宽。 */
export function riverWidth(x: number): number {
  if (x < 18) return 2;
  if (x < 34) return 3;
  if (x < 52) return 4;
  if (x < 68) return 2;
  return 3;
}

export function isRiverCell(g: string[], x: number, y: number, riverCy: number): boolean {
  const ch = get(g, x, y);
  if (ch === "~" || ch === "%") return true;
  const off = riverCenterOffset(x);
  const half = Math.floor(riverWidth(x) / 2);
  const cY = riverCy + off;
  return y >= cY - half - 1 && y <= cY + half + 1;
}

/** 自然洛水：~ 深流 + % 浅岸；禁止 5 行平池。 */
export function carveLuoyangRiver(g: string[], riverCy: number, width: number): void {
  for (let x = 1; x < width - 1; x++) {
    const off = riverCenterOffset(x);
    const rw = riverWidth(x);
    const cY = riverCy + off;
    const half = Math.min(1, Math.floor(rw / 2));
    for (let y = cY - half; y <= cY + half; y++) {
      if (y <= 0 || y >= g.length - 1) continue;
      set(g, x, y, "~");
    }
    for (const dy of [-half - 1, half + 1]) {
      const sy = cY + dy;
      if (sy <= 0 || sy >= g.length - 1) continue;
      if (get(g, x, sy) !== "~") set(g, x, sy, "%");
    }
  }
}

/** 2 格宽竖向 = 桥，冲过河带。 */
export function punchRiverBridge(g: string[], x0: number, x1: number, riverCy: number): void {
  for (let x = x0; x <= x1; x++) {
    const off = riverCenterOffset(x);
    const rw = riverWidth(x);
    const cY = riverCy + off;
    const half = Math.floor(rw / 2);
    for (let y = cY - half - 2; y <= cY + half + 2; y++) {
      if (y <= 0 || y >= g.length - 1) continue;
      const c = get(g, x, y);
      if (c === "~" || c === "%") set(g, x, y, "=");
    }
  }
}

/** 御道 x=40–44：40/44 人行道 `,`，41–43 车行道 `=`。 */
export function paintImperialAxis(g: string[], axisCx: number, axisCy: number): void {
  void axisCx;
  for (let y = IMPERIAL_AXIS.y0; y <= IMPERIAL_AXIS.y1; y++) {
    if (y <= 0 || y >= g.length - 1) continue;
    if (y === YINGTIAN_GATE.y) continue;
    for (const sx of IMPERIAL_AXIS.sidewalkX) {
      if (y === PALACE.y1 && sx >= PALACE.x0 && sx <= PALACE.x1) continue;
      const c = get(g, sx, y);
      if (c === "#" || c === "D" || c === "H" || c === ":" || c === "l") continue;
      set(g, sx, y, ",");
    }
    for (const rx of IMPERIAL_AXIS.roadX) {
      if (y === PALACE.y1 && rx >= PALACE.x0 && rx <= PALACE.x1) continue;
      const c = get(g, rx, y);
      if (c === "#" || c === "D" || c === "H") continue;
      if (c === ":") continue;
      set(g, rx, y, "=");
    }
  }
  // 天津桥段仍走 cx±1，与御道汇于桥心
  for (let y = 1; y < g.length - 1; y++) {
    for (const dx of [-1, 0, 1] as const) {
      const x = axisCx + dx;
      if (x < IMPERIAL_AXIS.roadX[0]! || x > IMPERIAL_AXIS.roadX[2]!) continue;
      const c = get(g, x, y);
      if (c === "~" || c === "%" || c === "#" || c === ";" || c === "@") continue;
      set(g, x, y, "=");
    }
  }
  void axisCy;
}

/** 宫城闭合墙 x38–46 y1–15；端门南墙 y=15 留门。 */
export function paintPalaceWalls(g: string[]): void {
  const { x0, x1, y0, y1 } = PALACE;
  for (let x = x0; x <= x1; x++) {
    set(g, x, y0, "#");
    if (x === cx) set(g, x, y1, ":");
    else set(g, x, y1, "#");
  }
  for (let y = y0; y <= y1; y++) {
    set(g, x0, y, "#");
    set(g, x1, y, "#");
  }
  // 应天门 y=7 :/H/:
  set(g, YINGTIAN_GATE.x0, YINGTIAN_GATE.y, ":");
  set(g, cx, YINGTIAN_GATE.y, "H");
  set(g, YINGTIAN_GATE.x1, YINGTIAN_GATE.y, ":");
}

export const LUOYANG_YARD_DEFS: LuoyangYardDef[] = [
  { key: "yingtian", jin: 1, fn: "shed", x: 38, y: 1, w: 9, h: 7, door: "s", form: "courtyard" },
  { key: "duanmen", jin: 1, fn: "shed", x: 39, y: 10, w: 7, h: 5, door: "s", form: "courtyard" },
  { key: "shangyang", jin: 2, fn: "home", x: 2, y: 2, w: 18, h: 12, door: "e", form: "courtyard", lShape: true },
  {
    key: "yamen",
    jin: 3,
    fn: "yamen",
    x: 17,
    y: 13,
    w: 14,
    h: 10,
    door: "s",
    mark: "a",
    form: "courtyard",
    lShape: true,
    wing: { x: 31, y: 13, w: 6, h: 6 },
  },
  { key: "jail", jin: 1, fn: "jail", x: 2, y: 14, w: 14, h: 10, door: "e", mark: "z", form: "courtyard" },
  { key: "sixDoors", jin: 1, fn: "sixDoors", x: 30, y: 14, w: 14, h: 10, door: "s", mark: "b", form: "courtyard" },
  { key: "southMarket", jin: 2, fn: "shop", x: 48, y: 13, w: 14, h: 10, door: "s", form: "courtyard", lShape: true },
  { key: "tongyuanGate", jin: 1, fn: "home", x: 44, y: 14, w: 10, h: 8, door: "s", form: "courtyard" },
  { key: "lideGate", jin: 1, fn: "home", x: 58, y: 13, w: 10, h: 8, door: "s", form: "courtyard" },
  { key: "martial", jin: 2, fn: "martial", x: 66, y: 2, w: 18, h: 12, door: "w", mark: "B", form: "courtyard", lShape: true },
  { key: "garrison", jin: 1, fn: "garrison", x: 66, y: 13, w: 14, h: 10, door: "w", mark: "C", form: "courtyard" },
  { key: "templeOffice", jin: 1, fn: "temple", x: 48, y: 2, w: 14, h: 10, door: "s", mark: "I", form: "courtyard" },
  { key: "home3", jin: 1, fn: "home", x: 62, y: 2, w: 10, h: 8, door: "s", form: "courtyard" },
  { key: "wine", jin: 2, fn: "wine", x: 3, y: 33, w: 18, h: 12, door: "e", mark: "E", form: "courtyard", lShape: true },
  { key: "westMarket", jin: 1, fn: "shop", x: 18, y: 33, w: 14, h: 10, door: "n", form: "courtyard" },
  { key: "brothel", jin: 2, fn: "brothel", x: 66, y: 33, w: 18, h: 12, door: "w", mark: "§", form: "courtyard", lShape: true },
  { key: "home1", jin: 1, fn: "home", x: 2, y: 44, w: 10, h: 8, door: "n", form: "courtyard", lShape: true },
  { key: "home5", jin: 1, fn: "home", x: 13, y: 44, w: 10, h: 8, door: "n", form: "courtyard" },
  { key: "home4", jin: 1, fn: "home", x: 28, y: 44, w: 10, h: 8, door: "n", form: "courtyard", lShape: true },
  { key: "home6", jin: 1, fn: "home", x: 38, y: 44, w: 10, h: 8, door: "n", form: "courtyard" },
  { key: "home2", jin: 1, fn: "home", x: 48, y: 44, w: 10, h: 8, door: "n", form: "courtyard", lShape: true },
  { key: "pawn", jin: 1, fn: "pawn", x: 44, y: cy - 8, w: 5, h: 3, door: "s", form: "street" },
  { key: "silk", jin: 1, fn: "silk", x: 50, y: cy - 8, w: 5, h: 3, door: "s", form: "street" },
  { key: "shop2", jin: 1, fn: "shop", x: 56, y: cy - 8, w: 5, h: 3, door: "s", form: "street" },
  { key: "smith", jin: 1, fn: "smith", x: 62, y: cy - 8, w: 5, h: 3, door: "s", form: "street" },
  { key: "clinic", jin: 1, fn: "clinic", x: 68, y: cy - 8, w: 6, h: 3, door: "s", form: "street" },
  { key: "shed2", jin: 1, fn: "shed", x: 75, y: cy - 8, w: 5, h: 3, door: "s", form: "street" },
  { key: "shop4", jin: 1, fn: "shop", x: 20, y: 8, w: 5, h: 3, door: "s", form: "street" },
  { key: "shop7", jin: 1, fn: "shop", x: 27, y: 8, w: 5, h: 3, door: "s", form: "street" },
  { key: "shop8", jin: 1, fn: "shop", x: 33, y: 8, w: 5, h: 3, door: "s", form: "street" },
  { key: "shop1", jin: 1, fn: "shop", x: 27, y: cy + 6, w: 5, h: 3, door: "n", form: "street" },
  { key: "shed", jin: 1, fn: "shed", x: 34, y: cy + 6, w: 5, h: 3, door: "n", form: "street" },
  { key: "post", jin: 1, fn: "post", x: 47, y: cy + 6, w: 6, h: 3, door: "n", form: "street" },
  { key: "shop3", jin: 1, fn: "shop", x: 54, y: cy + 6, w: 5, h: 3, door: "n", form: "street" },
  { key: "shop5", jin: 1, fn: "shop", x: 60, y: cy + 6, w: 5, h: 3, door: "n", form: "street" },
  { key: "shop6", jin: 1, fn: "shop", x: 48, y: H - 11, w: 5, h: 3, door: "n", form: "street" },
];

/** 御道/干道/院落/河桥岸允许 `.` 的粗略区域。 */
function outdoorDotAllowed(
  g: string[],
  x: number,
  y: number,
  yards: LuoyangYardDef[],
  axisCx: number,
  axisCy: number,
): boolean {
  const ch = get(g, x, y);
  if (ch !== ".") return true;
  if (x <= 0 || y <= 0 || x >= W - 1 || y >= H - 1) return false;
  if (y >= IMPERIAL_AXIS.y0 && y <= IMPERIAL_AXIS.y1 && x >= 38 && x <= 46) return true;
  if (y === axisCy - 5 || y === axisCy + 5 || y === axisCy) return false;
  if (x >= 40 && x <= 44 && y >= 1 && y <= axisCy + 4) return true;
  for (const yd of yards) {
    if (x >= yd.x && x < yd.x + yd.w && y >= yd.y && y < yd.y + yd.h) return true;
    if (yd.wing && x >= yd.wing.x && x < yd.wing.x + yd.wing.w && y >= yd.wing.y && y < yd.wing.y + yd.wing.h)
      return true;
  }
  if (isRiverCell(g, x, y, axisCy)) return false;
  if (x >= 58 && x < 80 && y >= 42 && y < 52) return true; // 南苑
  if (Math.abs(x - axisCx) <= 3 && Math.abs(y - axisCy) <= 4) return true; // 桥区
  if (ch === "=" || ch === "," || ch === ":" || ch === "l" || ch === "!" || ch === "&") return true;
  // 路肩邻道
  for (const [dx, dy] of [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ] as const) {
    if (get(g, x + dx, y + dy) === "=") return true;
  }
  return false;
}

const IMPERIAL_LANTERN_Y = new Set([4, 20, 36, 52]);

/** 室外 `.` 只留允许区；`,` 仅御道 x=40,44（灯笼白名单格除外）。 */
export function sweepBareOutdoor(
  g: string[],
  yards: LuoyangYardDef[],
  axisCx: number,
  axisCy: number,
): void {
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const ch = get(g, x, y);
      if ("DWE@;".includes(ch)) continue;
      if (ch === ",") {
        const imperialSidewalk =
          IMPERIAL_AXIS.sidewalkX.includes(x as 40 | 44) &&
          y >= IMPERIAL_AXIS.y0 &&
          y <= IMPERIAL_AXIS.y1;
        const lanternOk =
          IMPERIAL_LANTERN_Y.has(y) &&
          (x === axisCx - 2 || x === axisCx + 2) &&
          ch === "l";
        if (!imperialSidewalk && !lanternOk) set(g, x, y, ".");
        continue;
      }
      if (ch === "l" && IMPERIAL_LANTERN_Y.has(y) && (x === axisCx - 2 || x === axisCx + 2)) continue;
      if (ch !== ".") continue;
      if (!outdoorDotAllowed(g, x, y, yards, axisCx, axisCy)) set(g, x, y, "=");
    }
  }
}

function lanternWhitelist(
  axisCx: number,
  axisCy: number,
  doors: Map<string, { doorX: number; doorY: number }>,
): { x: number; y: number }[] {
  const spots: { x: number; y: number }[] = [];
  const push = (x: number, y: number) => {
    if (!spots.some((s) => s.x === x && s.y === y)) spots.push({ x, y });
  };
  for (const y of [4, 20, 36, 52]) {
    push(axisCx - 2, y);
    push(axisCx + 2, y);
  }
  // W/E 门廊（避开 x=1/W-2 传送格与 y=cy-5 干道）
  push(2, axisCy - 6);
  push(3, axisCy - 6);
  push(80, axisCy - 6);
  push(81, axisCy - 6);
  // 天津桥南北桥头（御道人行道，不占 =）
  push(axisCx - 2, axisCy - 4);
  push(axisCx + 2, axisCy - 4);
  push(axisCx - 2, axisCy + 4);
  push(axisCx + 2, axisCy + 4);
  for (const key of ["tongyuanGate", "lideGate", "southMarket", "westMarket"] as const) {
    const d = doors.get(key);
    if (d) {
      push(d.doorX - 1, d.doorY);
      push(d.doorX + 1, d.doorY);
      push(d.doorX, d.doorY - 1);
      push(d.doorX, d.doorY + 1);
    }
  }
  return spots;
}

function canPlantLantern(g: string[], x: number, y: number): boolean {
  const c = get(g, x, y);
  return c !== "#" && c !== "~" && c !== "%" && c !== "=" && c !== "H" && !"DWE@;".includes(c);
}

export function plantV73Lanterns(
  g: string[],
  axisCx: number,
  axisCy: number,
  doors: Map<string, { doorX: number; doorY: number }>,
): void {
  let n = 0;
  for (const s of lanternWhitelist(axisCx, axisCy, doors)) {
    if (n >= V73_LANTERN_MAX) break;
    const tryAt = (x: number, y: number) => {
      if (!canPlantLantern(g, x, y)) return false;
      set(g, x, y, "l");
      n += 1;
      return true;
    };
    if (tryAt(s.x, s.y)) continue;
    for (const [dx, dy] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ] as const) {
      if (tryAt(s.x + dx, s.y + dy)) break;
    }
  }
}

/** 终局：清掉非白名单灯柱，再按 24 格账目重种。 */
export function finalizeV73Lanterns(
  g: string[],
  axisCx: number,
  axisCy: number,
  doors: Map<string, { doorX: number; doorY: number }>,
): number {
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      if (get(g, x, y) !== "l") continue;
      const imperialSidewalk =
        IMPERIAL_AXIS.sidewalkX.includes(x as 40 | 44) &&
        y >= IMPERIAL_AXIS.y0 &&
        y <= IMPERIAL_AXIS.y1;
      set(g, x, y, imperialSidewalk ? "," : ".");
    }
  }
  plantV73Lanterns(g, axisCx, axisCy, doors);
  let n = 0;
  for (const row of g) for (const c of row) if (c === "l") n += 1;
  return n;
}

const CLUMP: [number, number][][] = [
  [[0, 0], [1, 0], [0, 1]],
  [[0, 0], [2, 0], [1, 1]],
  [[0, 0], [0, 1]],
];

/** 6×6 空窗强制补树丛。 */
export function fillBlankWindows6(
  g: string[],
  axisCx: number,
  axisCy: number,
  treeMin: number,
  treeMax: number,
): void {
  const countTrees = () => {
    let n = 0;
    for (const row of g) for (const c of row) if (c === "&") n += 1;
    return n;
  };
  const ban = (x: number, y: number) => treeBan(x, y, axisCx, axisCy);
  for (let y = 2; y < H - 8; y++) {
    for (let x = 2; x < W - 8; x++) {
      if (countTrees() >= treeMax) return;
      let blank = 0;
      for (let dy = 0; dy < 6; dy++) {
        for (let dx = 0; dx < 6; dx++) {
          const c = get(g, x + dx, y + dy);
          if (c === "." || c === ",") blank += 1;
        }
      }
      if (blank < 28) continue;
      let n3 = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (get(g, x + 2 + dx, y + 2 + dy) === "&") n3 += 1;
        }
      }
      if (n3 >= 3) continue;
      for (const shape of CLUMP) {
        if (countTrees() >= treeMax) return;
        const ok = shape.every(([dx, dy]) => {
          const px = x + 2 + dx;
          const py = y + 2 + dy;
          const c = get(g, px, py);
          return (c === "." || c === ",") && !ban(px, py);
        });
        if (!ok) continue;
        for (const [dx, dy] of shape) set(g, x + 2 + dx, y + 2 + dy, "&");
        break;
      }
    }
  }
  if (countTrees() < treeMin) {
    for (let y = 3; y < H - 3 && countTrees() < treeMin; y++) {
      for (let x = 3; x < W - 3 && countTrees() < treeMin; x++) {
        if (ban(x, y)) continue;
        if (get(g, x, y) === ".") set(g, x, y, "&");
      }
    }
  }
}

/** 东南南苑：径+树+亭，取代 ^ 丘。 */
export function southGarden(g: string[]): void {
  const x0 = 58;
  const y0 = 42;
  const w = 22;
  const h = 10;
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const c = get(g, x, y);
      if (c === "^" || c === ".") set(g, x, y, ".");
    }
  }
  const midX = x0 + Math.floor(w / 2);
  const midY = y0 + Math.floor(h / 2);
  for (let x = x0 + 1; x < x0 + w - 1; x++) set(g, x, midY, "=");
  for (let y = y0 + 1; y < y0 + h - 1; y++) set(g, midX, y, "=");
  set(g, midX, midY, "g");
  set(g, x0 + 3, y0 + 2, "&");
  set(g, x0 + w - 4, y0 + 2, "&");
  set(g, x0 + 3, y0 + h - 3, "&");
  set(g, x0 + w - 4, y0 + h - 3, "&");
  set(g, midX - 3, midY - 2, "&");
  set(g, midX + 3, midY - 2, "&");
}

export function fixShoreRoads(g: string[], riverCy: number): void {
  const bridge = (x: number) => (x >= 16 && x <= 17) || (x >= 41 && x <= 43) || (x >= 68 && x <= 69);
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      if (get(g, x, y) !== "=") continue;
      if (bridge(x) && Math.abs(y - riverCy) <= 4) continue;
      for (const [dx, dy] of [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ] as const) {
        const c = get(g, x + dx, y + dy);
        if (c === "~" || c === "%") {
          set(g, x, y, ".");
          break;
        }
      }
    }
  }
}

export function enforceTreeDensity(g: string[]): void {
  const count3 = (cx: number, cy: number) => {
    let n = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (get(g, cx + dx, cy + dy) === "&") n += 1;
      }
    }
    return n;
  };
  const count5 = (cx: number, cy: number) => {
    let n = 0;
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (get(g, cx + dx, cy + dy) === "&") n += 1;
      }
    }
    return n;
  };
  for (let pass = 0; pass < 32; pass++) {
    let changed = false;
    for (let y = 2; y < H - 2; y++) {
      for (let x = 2; x < W - 2; x++) {
        if (count5(x, y) <= 6) continue;
        const cells: { x: number; y: number; n: number }[] = [];
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const px = x + dx;
            const py = y + dy;
            if (get(g, px, py) !== "&") continue;
            cells.push({ x: px, y: py, n: count3(px, py) });
          }
        }
        cells.sort((a, b) => b.n - a.n);
        if (cells[0]) {
          set(g, cells[0].x, cells[0].y, ".");
          changed = true;
        }
      }
    }
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        if (count3(x, y) <= 3) continue;
        const cells: { x: number; y: number; n: number }[] = [];
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const px = x + dx;
            const py = y + dy;
            if (get(g, px, py) !== "&") continue;
            cells.push({ x: px, y: py, n: count3(px, py) });
          }
        }
        cells.sort((a, b) => b.n - a.n);
        if (cells[0]) {
          set(g, cells[0].x, cells[0].y, ".");
          changed = true;
        }
      }
    }
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        if (get(g, x, y) !== "&") continue;
        for (const [dx, dy] of [
          [1, 0],
          [0, 1],
        ] as const) {
          let run = 1;
          for (let k = 1; k < 4; k++) {
            if (get(g, x + dx * k, y + dy * k) === "&") run += 1;
            else break;
          }
          if (run >= 3) {
            set(g, x, y, ".");
            changed = true;
            break;
          }
        }
      }
    }
    if (!changed) break;
  }
}

function treeBan(x: number, y: number, axisCx: number, axisCy: number): boolean {
  if (x >= 40 && x <= 44 && y >= 1 && y <= axisCy + 4) return true;
  if (Math.abs(x - axisCx) <= 1) return true;
  if (y === axisCy - 5 || y === axisCy + 5 || y === axisCy) return true;
  for (const [dx, dy] of [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ] as const) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 40 && nx <= 44 && ny >= 1 && ny <= axisCy + 4) return true;
    if (Math.abs(nx - axisCx) <= 1) return true;
    if (ny === axisCy - 5 || ny === axisCy + 5 || ny === axisCy) return true;
  }
  return false;
}

function canPlantV73Tree(g: string[], x: number, y: number): boolean {
  if (get(g, x, y) !== ".") return false;
  set(g, x, y, "&");
  let ok = true;
  for (let cy = y - 2; cy <= y + 2 && ok; cy++) {
    for (let cx = x - 2; cx <= x + 2; cx++) {
      let n3 = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (get(g, cx + dx, cy + dy) === "&") n3 += 1;
        }
      }
      if (n3 > 3) ok = false;
      let n5 = 0;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          if (get(g, cx + dx, cy + dy) === "&") n5 += 1;
        }
      }
      if (n5 > 6) ok = false;
    }
  }
  for (const [dx, dy] of [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ] as const) {
    let run = 1;
    for (const s of [1, -1]) {
      for (let k = 1; k < 4; k++) {
        if (get(g, x + dx * k * s, y + dy * k * s) === "&") run += 1;
        else break;
      }
    }
    if (run >= 3) ok = false;
  }
  set(g, x, y, ".");
  return ok;
}

/** 剔除御道/桥带禁区的树。 */
export function stripArterialTrees(g: string[], axisCx: number, axisCy: number): void {
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      if (get(g, x, y) === "&" && treeBan(x, y, axisCx, axisCy)) set(g, x, y, ".");
    }
  }
}

/** 密度修剪后补满树下限。 */
export function topUpV73Trees(
  g: string[],
  axisCx: number,
  axisCy: number,
  treeMin: number,
): void {
  const countTrees = () => {
    let n = 0;
    for (const row of g) for (const c of row) if (c === "&") n += 1;
    return n;
  };
  for (let pass = 0; pass < 8 && countTrees() < treeMin; pass++) {
    let planted = false;
    for (let y = 2; y < H - 2 && countTrees() < treeMin; y++) {
      for (let x = 2; x < W - 2 && countTrees() < treeMin; x++) {
        if (treeBan(x, y, axisCx, axisCy)) continue;
        if (x >= 58 && x < 80 && y >= 42 && y < 52) continue;
        if (!canPlantV73Tree(g, x, y)) continue;
        set(g, x, y, "&");
        planted = true;
      }
    }
    if (!planted) break;
  }
}

/** 终局：剔禁带后补满树下限（不再二次 enforce，避免振荡）。 */
export function ensureV73TreeMin(
  g: string[],
  axisCx: number,
  axisCy: number,
  treeMin: number,
): void {
  stripArterialTrees(g, axisCx, axisCy);
  topUpV73Trees(g, axisCx, axisCy, treeMin);
}

export function bridgeChebyshevOk(): boolean {
  const centers = LUOYANG_BRIDGES.map((b) => ({ x: Math.floor((b.x0 + b.x1) / 2), y: cy }));
  for (let i = 0; i < centers.length; i++) {
    for (let j = i + 1; j < centers.length; j++) {
      const d = Math.max(Math.abs(centers[i]!.x - centers[j]!.x), Math.abs(centers[i]!.y - centers[j]!.y));
      if (d < 12) return false;
    }
  }
  return true;
}
