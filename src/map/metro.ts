import type { ChapterId, EnemyId } from "../game/types";
import type { GateKind, ItemId, SceneId, SealId } from "./types";

export interface MetroScene {
  id: SceneId;
  chapter: ChapterId;
  name: string;
  kicker: string;
  enter: string;
  mood: string;
  ascii: string[];
  npcs: Record<string, EnemyId>;
  talkers: Record<string, string>;
  portals: Record<string, { to: SceneId; at: string }>;
  order: SealId[];
  gate: GateKind;
  signs: string[];
  items: Record<string, ItemId>;
}

function rows(id: string, lines: string[]): string[] {
  const w = lines[0]?.length ?? 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].length !== w) throw new Error(`${id} row ${i} width ${lines[i].length} != ${w}`);
  }
  return lines;
}

function blank(w: number, h: number, fill = "."): string[] {
  return Array.from({ length: h }, () => fill.repeat(w));
}

function get(grid: string[], x: number, y: number): string {
  if (y < 0 || y >= grid.length) return "#";
  if (x < 0 || x >= grid[0].length) return "#";
  return grid[y][x];
}

function set(grid: string[], x: number, y: number, ch: string): void {
  if (y < 0 || y >= grid.length) return;
  if (x < 0 || x >= grid[0].length) return;
  const row = grid[y];
  grid[y] = row.slice(0, x) + ch + row.slice(x + 1);
}

/** 只在空地铺路，绝不盖掉墙/门/水/山。 */
function setRoad(grid: string[], x: number, y: number): void {
  const ch = get(grid, x, y);
  if (ch === "#" || ch === ":" || ch === "~" || ch === "^" || ch === "%") return;
  // 保留已有出口字母
  if ("NSEWUDYLK".includes(ch)) return;
  set(grid, x, y, "=");
}

function hroad(grid: string[], y: number, x0: number, x1: number): void {
  const a = Math.min(x0, x1);
  const b = Math.max(x0, x1);
  for (let x = a; x <= b; x++) setRoad(grid, x, y);
}

function vroad(grid: string[], x: number, y0: number, y1: number): void {
  const a = Math.min(y0, y1);
  const b = Math.max(y0, y1);
  for (let y = a; y <= b; y++) setRoad(grid, x, y);
}

function rect(grid: string[], x0: number, y0: number, x1: number, y1: number, ch: string): void {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(grid, x, y, ch);
}

function building(grid: string[], x: number, y: number, bw: number, bh: number, door: "s" | "n" | "e" | "w", mark?: string): void {
  rect(grid, x, y, x + bw - 1, y + bh - 1, "#");
  rect(grid, x + 1, y + 1, x + bw - 2, y + bh - 2, ".");
  if (mark) set(grid, x + Math.floor(bw / 2), y + Math.floor(bh / 2), mark);
  if (door === "s") set(grid, x + Math.floor(bw / 2), y + bh - 1, ":");
  if (door === "n") set(grid, x + Math.floor(bw / 2), y, ":");
  if (door === "e") set(grid, x + bw - 1, y + Math.floor(bh / 2), ":");
  if (door === "w") set(grid, x, y + Math.floor(bh / 2), ":");
  // 灯笼放院内，不压路
  set(grid, x + 1, y + 1, "t");
}

/** 从干道朝门口铺短支路，停在墙外一格，绝不穿墙。 */
function approachDoor(grid: string[], doorX: number, doorY: number, axis: "n" | "s" | "e" | "w"): void {
  if (axis === "s") {
    for (let y = doorY + 1; y < grid.length - 1; y++) {
      if (get(grid, doorX, y) === "#") break;
      if (get(grid, doorX, y) === "=") break;
      setRoad(grid, doorX, y);
    }
  } else if (axis === "n") {
    for (let y = doorY - 1; y > 0; y--) {
      if (get(grid, doorX, y) === "#") break;
      if (get(grid, doorX, y) === "=") break;
      setRoad(grid, doorX, y);
    }
  } else if (axis === "e") {
    for (let x = doorX + 1; x < grid[0].length - 1; x++) {
      if (get(grid, x, doorY) === "#") break;
      if (get(grid, x, doorY) === "=") break;
      setRoad(grid, x, doorY);
    }
  } else {
    for (let x = doorX - 1; x > 0; x--) {
      if (get(grid, x, doorY) === "#") break;
      if (get(grid, x, doorY) === "=") break;
      setRoad(grid, x, doorY);
    }
  }
}

export interface MetroOpts {
  id: SceneId;
  name: string;
  kicker: string;
  enter: string;
  mood: string;
  chapter?: ChapterId;
  w?: number;
  h?: number;
  water?: "none" | "north" | "east" | "canal";
  hills?: boolean;
  portals: MetroScene["portals"];
  talkers: Record<string, string>;
  npcs?: Record<string, EnemyId>;
  signs?: string[];
  marks?: { ch: string; x: number; y: number }[];
}

/** Build a large city (~4–5× harbor footprint) with rim exits and districts. */
export function buildMetro(opts: MetroOpts): MetroScene {
  const talkers = { ...opts.talkers };
  const have = new Set(Object.values(talkers));
  const used = new Set([...Object.keys(talkers), ...Object.keys(opts.npcs ?? {})]);
  const free = "ijklmnopqrstuvwxyz".split("").filter((c) => !used.has(c));
  let fi = 0;
  const addTalk = (id: string) => {
    if (have.has(id) || fi >= free.length) return;
    talkers[free[fi++]] = id;
    have.add(id);
  };
  addTalk("innkeep");
  addTalk("townWatch");
  addTalk("townHawker");
  addTalk("roadCook");
  const npcs = { ...(opts.npcs ?? {}) };
  if (Object.keys(npcs).length === 0) npcs["1"] = "thug";
  opts = { ...opts, talkers, npcs };

  const W = opts.w ?? 72;
  const H = opts.h ?? 48;
  const cx = Math.floor(W / 2);
  const cy = Math.floor(H / 2);
  const grid = blank(W, H, ".");
  // border wall
  for (let x = 0; x < W; x++) {
    set(grid, x, 0, "#");
    set(grid, x, H - 1, "#");
  }
  for (let y = 0; y < H; y++) {
    set(grid, 0, y, "#");
    set(grid, W - 1, y, "#");
  }
  if (opts.water === "north" || opts.water === "canal") {
    for (let y = 1; y <= 3; y++) for (let x = 1; x < W - 1; x++) set(grid, x, y, "~");
  }
  if (opts.water === "east" || opts.water === "canal") {
    for (let x = W - 5; x < W - 1; x++) for (let y = 1; y < H - 1; y++) set(grid, x, y, "~");
  }

  // 先建筑，再单条十字干道（路不穿墙）
  const blds: { x: number; y: number; bw: number; bh: number; door: "s" | "n" | "e" | "w"; mark: string }[] = [
    { x: cx - 16, y: cy - 14, bw: 7, bh: 6, door: "s", mark: "a" },
    { x: cx + 8, y: cy - 14, bw: 7, bh: 6, door: "s", mark: "b" },
    { x: cx - 16, y: cy + 6, bw: 7, bh: 6, door: "n", mark: "c" },
    { x: cx + 8, y: cy + 6, bw: 7, bh: 6, door: "n", mark: "d" },
    { x: Math.floor(W * 0.15), y: Math.floor(H * 0.35), bw: 6, bh: 5, door: "e", mark: "e" },
    { x: Math.floor(W * 0.78), y: Math.floor(H * 0.35), bw: 6, bh: 5, door: "w", mark: "f" },
    { x: Math.floor(W * 0.4), y: Math.floor(H * 0.15), bw: 8, bh: 5, door: "s", mark: "g" },
    { x: Math.floor(W * 0.4), y: Math.floor(H * 0.78), bw: 8, bh: 5, door: "n", mark: "h" },
  ];
  for (const b of blds) building(grid, b.x, b.y, b.bw, b.bh, b.door, b.mark);

  // 单条十字官道
  hroad(grid, cy, 1, W - 2);
  vroad(grid, cx, 1, H - 2);

  // 门口到干道：只铺空地，遇墙即停
  for (const b of blds) {
    const dx = b.x + Math.floor(b.bw / 2);
    const dy = b.y + Math.floor(b.bh / 2);
    if (b.door === "s") approachDoor(grid, b.x + Math.floor(b.bw / 2), b.y + b.bh - 1, "s");
    if (b.door === "n") approachDoor(grid, b.x + Math.floor(b.bw / 2), b.y, "n");
    if (b.door === "e") approachDoor(grid, b.x + b.bw - 1, b.y + Math.floor(b.bh / 2), "e");
    if (b.door === "w") approachDoor(grid, b.x, b.y + Math.floor(b.bh / 2), "w");
    void dx;
    void dy;
  }

  if (opts.hills) {
    // 一座东南山 + 接上南向干道的山路（不另开平行干道）
    const x0 = W - 18;
    const y0 = H - 16;
    for (let y = y0; y < H - 1; y++) {
      for (let x = x0; x < W - 1; x++) {
        const dx = x - (W - 9);
        const dy = y - (H - 8);
        if (dx * dx + dy * dy * 1.15 < 80 && get(grid, x, y) === ".") set(grid, x, y, "^");
      }
    }
    const mx = W - 9;
    // 从十字横道向南接山路，绕开墙
    vroad(grid, mx, cy, H - 4);
  }

  // 稀疏散树，避开路
  for (let y = 4; y < H - 4; y++) {
    for (let x = 4; x < W - 4; x++) {
      if (get(grid, x, y) !== ".") continue;
      if ((x * 17 + y * 31) % 53 === 0) set(grid, x, y, "&");
    }
  }

  // 市集放干道旁空地
  for (const [x, y, ch] of [
    [cx - 3, cy - 2, ","],
    [cx - 2, cy - 2, ","],
    [cx + 2, cy - 2, ","],
    [cx + 3, cy + 2, "p"],
    [cx - 5, cy + 2, "l"],
    [cx + 5, cy - 3, "v"],
  ] as const) {
    if (get(grid, x, y) === "." || get(grid, x, y) === "=") {
      if (ch === "," || ch === "p" || ch === "l" || ch === "v") {
        if (get(grid, x, y) === "=") continue; // 不占干道
        set(grid, x, y, ch);
      }
    }
  }

  const portals = opts.portals;
  if (portals.N || portals.D || portals.U) {
    const ch = portals.N ? "N" : portals.U ? "U" : "D";
    set(grid, cx, 0, "#");
    set(grid, cx - 1, 1, "#");
    set(grid, cx, 1, ch);
    set(grid, cx + 1, 1, "#");
    // 水路让出北门通道
    for (let y = 1; y <= 3; y++) {
      if (get(grid, cx, y) === "~") set(grid, cx, y, ".");
    }
    vroad(grid, cx, 2, cy);
  }
  if (portals.S) {
    set(grid, cx - 1, H - 2, "#");
    set(grid, cx, H - 2, "S");
    set(grid, cx + 1, H - 2, "#");
    vroad(grid, cx, cy, H - 3);
  }
  if (portals.W) {
    set(grid, 1, cy - 1, "#");
    set(grid, 1, cy, "W");
    set(grid, 1, cy + 1, "#");
    hroad(grid, cy, 2, cx);
  }
  if (portals.E) {
    set(grid, W - 2, cy - 1, "#");
    set(grid, W - 2, cy, "E");
    set(grid, W - 2, cy + 1, "#");
    // 东岸水路让出城门通道
    for (let x = W - 5; x <= W - 3; x++) {
      if (get(grid, x, cy) === "~") set(grid, x, cy, ".");
      if (get(grid, x, cy - 1) === "#") set(grid, x, cy - 1, "~");
      if (get(grid, x, cy + 1) === "#") set(grid, x, cy + 1, "~");
    }
    hroad(grid, cy, cx, W - 3);
  }
  if (portals.Y) set(grid, Math.floor(W * 0.2), H - 2, "Y");
  if (portals.L) set(grid, cx, H - 2, "L");
  if (portals.K) {
    // 少室寺：西北缘，与北门错开至少 3 格
    const kx = Math.max(3, cx - 10);
    set(grid, kx - 1, 1, "#");
    set(grid, kx, 1, "K");
    set(grid, kx + 1, 1, "#");
    vroad(grid, kx, 2, cy);
  }
  if (portals.D && portals.U) set(grid, cx + 8, H - 2, "D");
  else if (portals.D && !portals.N && !portals.U) {
    set(grid, cx - 1, 1, "#");
    set(grid, cx, 1, "D");
    set(grid, cx + 1, 1, "#");
  }

  set(grid, cx, cy, "@");

  for (const m of opts.marks ?? []) {
    if (get(grid, m.x, m.y) !== "#") set(grid, m.x, m.y, m.ch);
  }

  const slots = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const talkKeys = Object.keys(opts.talkers);
  const talkersOnGrid = new Set<string>();
  for (let y = 0; y < H; y++) {
    for (const ch of talkKeys) {
      if (grid[y].includes(ch)) talkersOnGrid.add(ch);
    }
  }
  const placedTalk: Record<string, string> = {};
  let slotI = 0;
  talkKeys.forEach((ch) => {
    placedTalk[ch] = opts.talkers[ch];
    if (talkersOnGrid.has(ch)) return;
    if (slotI < slots.length) {
      const slot = slots[slotI++];
      for (let y = 0; y < H; y++) {
        const x = grid[y].indexOf(slot);
        if (x >= 0) {
          set(grid, x, y, ch);
          return;
        }
      }
    }
  });
  for (const slot of slots) {
    for (let y = 0; y < H; y++) {
      const x = grid[y].indexOf(slot);
      if (x >= 0) set(grid, x, y, ".");
    }
  }

  const npcKeys = Object.keys(opts.npcs ?? {});
  npcKeys.forEach((ch, i) => {
    let found = false;
    for (let y = 0; y < H; y++) {
      if (grid[y].includes(ch)) {
        found = true;
        break;
      }
    }
    if (found) return;
    const x = cx - 6 + i * 3;
    const y = cy - 6;
    if (get(grid, x, y) === "." || get(grid, x, y) === "=") set(grid, x, y, ch);
  });

  return {
    id: opts.id,
    chapter: opts.chapter ?? "alley",
    name: opts.name,
    kicker: opts.kicker,
    enter: opts.enter,
    mood: opts.mood,
    ascii: rows(opts.id, grid),
    npcs: opts.npcs ?? {},
    talkers: placedTalk,
    portals: opts.portals,
    order: [],
    gate: "open",
    signs: opts.signs ?? [],
    items: {},
  };
}
