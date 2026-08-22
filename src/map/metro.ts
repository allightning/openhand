import type { ChapterId, EnemyId } from "../game/types";
import type { GateKind, ItemId, SceneId, SealId } from "./types";
import type { LuoBuildingDef, LuoFurnishTemplate, LuoTalkerDef } from "./luoyangMeta";
import { LUO_FACTION_SPRITE, talkerMeta } from "./luoyangMeta";
import {
  assignNpcSprite as npcAssignSprite,
  COMPANION_PROPS,
  npcById,
  type LuoNpcFull,
} from "./npc";

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
  /** 路网骨架：每城一种，禁止全员十字官道。 */
  layout?: MetroLayout;
  portals: MetroScene["portals"];
  talkers: Record<string, string>;
  npcs?: Record<string, EnemyId>;
  signs?: string[];
  marks?: { ch: string; x: number; y: number }[];
}

export type MetroLayout =
  | "cross" // 少用
  | "ferry" // 淮阴：横河主路
  | "wardGrid" // 长安：里坊格
  | "bridge" // 洛阳：一桥纵轴
  | "imperial" // 汴京：宽御街
  | "canalLadder" // 扬州：运河夹巷
  | "riverFan" // 建康：航边扇形
  | "waterLane" // 苏州：水巷碎路
  | "lakeShore"; // 临安：湖岸蛇路

export function layoutOf(id: string, explicit?: MetroLayout): MetroLayout {
  if (explicit) return explicit;
  const map: Record<string, MetroLayout> = {
    huainan: "ferry",
    changan: "wardGrid",
    luoyang: "bridge",
    bianjing: "imperial",
    yangzhou: "canalLadder",
    jiankang: "riverFan",
    suzhou: "waterLane",
    linan: "lakeShore",
  };
  return map[id] ?? "cross";
}

/** 多进院：外院 + 内院，非单矩形空壳。 */
function siheyuan(
  grid: string[],
  x: number,
  y: number,
  bw: number,
  bh: number,
  door: "s" | "n" | "e" | "w",
  mark?: string,
): void {
  building(grid, x, y, bw, bh, door, mark);
  const midY = y + Math.floor(bh / 2);
  const midX = x + Math.floor(bw / 2);
  if (bh >= 7) {
    for (let xx = x + 1; xx < x + bw - 1; xx++) {
      if (xx === midX) set(grid, xx, midY, ".");
      else if (get(grid, xx, midY) === ".") set(grid, xx, midY, "#");
    }
    set(grid, midX, midY, ":");
  }
}

type DistrictKind = "yamen" | "martial" | "clinic" | "pawn" | "wine" | "shop" | "tea" | "shrine" | "post" | "shed";

/** 港湾式烟火：陈设靠墙/靠角，门口到院心留走道。bridge（洛阳）用加厚功能陈设。 */
function furnishDistrict(
  grid: string[],
  b: { x: number; y: number; bw: number; bh: number; door: "s" | "n" | "e" | "w" },
  kind: DistrictKind,
  seed: number,
  layout?: MetroLayout,
): void {
  const ix0 = b.x + 1;
  const iy0 = b.y + 1;
  const ix1 = b.x + b.bw - 2;
  const iy1 = b.y + b.bh - 2;
  const w = Math.max(1, ix1 - ix0);
  const h = Math.max(1, iy1 - iy0);
  const midX = Math.floor(w / 2);
  const midY = Math.floor(h / 2);
  const rich = layout === "bridge";
  const blocksDoor = (lx: number, ly: number) => {
    if (!rich) return false;
    if (b.door === "n" || b.door === "s") return Math.abs(lx - midX) <= 1 && ly !== 0 && ly !== h;
    return Math.abs(ly - midY) <= 1 && lx !== 0 && lx !== w;
  };
  const put = (lx: number, ly: number, ch: string) => {
    const x = ix0 + lx;
    const y = iy0 + ly;
    if (x < ix0 || x > ix1 || y < iy0 || y > iy1) return;
    if (get(grid, x, y) === "#" || get(grid, x, y) === ":") return;
    if (blocksDoor(lx, ly)) return;
    set(grid, x, y, ch);
  };
  put(0, 0, "l");
  put(w, 0, "l");
  if (h > 2) {
    put(0, h, "l");
    put(w, h, "l");
  }
  if (rich) {
    if (kind === "yamen") {
      put(0, 1, "j");
      put(w, 1, "j");
      put(0, h - 1, ",");
      put(w, h - 1, ",");
    } else if (kind === "martial") {
      put(0, 1, "d");
      put(w, 1, "c");
      put(0, h - 1, "z");
      put(w, h - 1, "d");
    } else if (kind === "clinic") {
      put(0, 1, "v");
      put(w, 1, "b");
      put(0, h - 1, "k");
      put(w, h - 1, "v");
    } else if (kind === "pawn") {
      put(0, 1, "q");
      put(w, 1, "i");
      put(0, h - 1, "i");
      put(w, h - 1, "q");
    } else if (kind === "wine") {
      put(0, 1, "y");
      put(w, 1, "o");
      put(0, h - 1, "o");
      put(w, h - 1, "*");
    } else if (kind === "shop") {
      put(0, 1, "v");
      put(w, 1, "v");
      put(0, h - 1, ",");
      put(w, h - 1, ",");
    } else if (kind === "tea") {
      put(0, 1, "t");
      put(w, 1, "t");
      put(0, h - 1, "j");
      put(w, h - 1, "j");
    } else if (kind === "shrine") {
      put(0, 1, "h");
      put(w, 1, "h");
      put(0, h - 1, "g");
      put(w, Math.max(1, h - 1), "g");
    } else if (kind === "post") {
      put(0, 1, "p");
      put(w, 1, "v");
      put(0, h - 1, "v");
      put(w, h - 1, "p");
    } else {
      put(0, 1, "b");
      put(w, 1, "o");
      put(0, h - 1, "o");
      put(w, h - 1, "b");
    }
  } else if (kind === "yamen") {
    put(0, 1, "j");
    put(w, 1, "j");
    put(0, Math.floor(h / 2), ",");
    put(w, Math.floor(h / 2), ",");
  } else if (kind === "martial") {
    put(0, 1, "j");
    put(w, 1, "j");
    put(0, h - 1, ",");
    put(w, h - 1, "v");
  } else if (kind === "clinic") {
    put(0, 1, "v");
    put(w, 1, "b");
    put(0, h - 1, "p");
    put(w, h - 1, ",");
  } else if (kind === "pawn") {
    put(0, 1, "v");
    put(w, Math.floor(h / 2), "j");
    put(0, h - 1, "p");
  } else if (kind === "wine") {
    put(0, 1, "v");
    put(w, 1, "v");
    put(0, 2, "b");
    put(w, h - 1, "p");
    put(Math.floor(w / 2), h, ",");
  } else if (kind === "shop") {
    put(0, 1, "p");
    put(0, 2, "p");
    put(w, 1, "v");
    put(Math.floor(w / 2), h, ",");
  } else if (kind === "tea") {
    put(0, 1, "v");
    put(w, 1, "v");
    put(0, h - 1, "b");
    put(w, h - 1, ",");
  } else if (kind === "shrine") {
    put(Math.floor(w / 2), 0, "g");
    put(0, Math.floor(h / 2), ",");
    put(w, Math.floor(h / 2), ",");
  } else if (kind === "post") {
    put(0, 1, "j");
    put(w, 1, "p");
    put(Math.floor(w / 2), h, ",");
  } else {
    put(0, 1, "p");
    put(w, 1, "v");
  }
  const jitter = (seed + b.x * 7 + b.y * 13) % 4;
  if (jitter === 1) put(w, Math.max(1, Math.min(h - 1, 2)), "p");
  if (jitter === 2) put(0, Math.max(1, Math.min(h - 1, 2)), "j");
}

/** 外院靠门落座，保证从门口能摸到。 */
function seatsNearDoor(
  b: { x: number; y: number; bw: number; bh: number; door: "s" | "n" | "e" | "w" },
): { lx: number; ly: number }[] {
  const iw = b.bw - 3;
  const ih = b.bh - 3;
  const mid = Math.floor(iw / 2);
  if (b.door === "s") {
    return [
      { lx: mid, ly: ih },
      { lx: mid - 1, ly: ih },
      { lx: mid + 1, ly: ih },
      { lx: mid, ly: ih - 1 },
      { lx: 1, ly: ih },
      { lx: iw - 1, ly: ih },
    ];
  }
  if (b.door === "n") {
    return [
      { lx: mid, ly: 0 },
      { lx: mid - 1, ly: 0 },
      { lx: mid + 1, ly: 0 },
      { lx: mid, ly: 1 },
      { lx: 1, ly: 0 },
      { lx: iw - 1, ly: 0 },
    ];
  }
  if (b.door === "e") {
    return [
      { lx: iw, ly: Math.floor(ih / 2) },
      { lx: iw, ly: Math.floor(ih / 2) - 1 },
      { lx: iw - 1, ly: Math.floor(ih / 2) },
      { lx: iw, ly: 1 },
    ];
  }
  return [
    { lx: 0, ly: Math.floor(ih / 2) },
    { lx: 0, ly: Math.floor(ih / 2) - 1 },
    { lx: 1, ly: Math.floor(ih / 2) },
    { lx: 0, ly: 1 },
  ];
}

function hashSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

/** 院内靠门空地（门檐失败时兜底）。 */
function seatInYard(
  grid: string[],
  b: { x: number; y: number; bw: number; bh: number },
  occupied: Set<string>,
  prefer: { lx: number; ly: number }[],
): { x: number; y: number } | null {
  const tryAt = (x: number, y: number) => {
    if (get(grid, x, y) !== ".") return false;
    if (occupied.has(`${x},${y}`)) return false;
    for (const [dx, dy] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ] as const) {
      if (occupied.has(`${x + dx},${y + dy}`)) return false;
    }
    return true;
  };
  for (const p of prefer) {
    const x = b.x + 1 + p.lx;
    const y = b.y + 1 + p.ly;
    if (tryAt(x, y)) return { x, y };
  }
  for (let y = b.y + 1; y < b.y + b.bh - 1; y++) {
    for (let x = b.x + 1; x < b.x + b.bw - 1; x++) {
      if (tryAt(x, y)) return { x, y };
    }
  }
  return null;
}

/** 门前檐下：门前 1～3 步错开；bridge 额外避开三线桥轴。 */
function seatAtEaves(
  grid: string[],
  b: { x: number; y: number; bw: number; bh: number; door: "s" | "n" | "e" | "w" },
  occupied: Set<string>,
  cx: number,
  cy: number,
  layout?: MetroLayout,
): { x: number; y: number } | null {
  let dx = 0;
  let dy = 0;
  let doorX = b.x + Math.floor(b.bw / 2);
  let doorY = b.y + Math.floor(b.bh / 2);
  if (b.door === "s") {
    doorX = b.x + Math.floor(b.bw / 2);
    doorY = b.y + b.bh - 1;
    dy = 1;
  } else if (b.door === "n") {
    doorX = b.x + Math.floor(b.bw / 2);
    doorY = b.y;
    dy = -1;
  } else if (b.door === "e") {
    doorX = b.x + b.bw - 1;
    doorY = b.y + Math.floor(b.bh / 2);
    dx = 1;
  } else {
    doorX = b.x;
    doorY = b.y + Math.floor(b.bh / 2);
    dx = -1;
  }
  const candidates: { x: number; y: number }[] = [];
  const steps = layout === "bridge" ? ([2, 3, 1] as const) : ([1, 2, 3] as const);
  const sides = layout === "bridge" ? ([1, -1, 2, -2, 0] as const) : ([0, 1, -1, 2, -2] as const);
  for (const step of steps) {
    const bx = doorX + dx * step;
    const by = doorY + dy * step;
    for (const side of sides) {
      const sx = dx !== 0 ? bx : bx + side;
      const sy = dy !== 0 ? by : by + side;
      candidates.push({ x: sx, y: sy });
      if (dx !== 0) candidates.push({ x: bx, y: by + side });
      if (dy !== 0) candidates.push({ x: bx + side, y: by });
    }
  }
  for (const s of candidates) {
    if (get(grid, s.x, s.y) !== ".") continue;
    if (occupied.has(`${s.x},${s.y}`)) continue;
    if (get(grid, s.x, s.y) === "=") continue;
    if (layout === "bridge" && Math.abs(s.x - cx) <= 1) continue;
    if (Math.abs(s.x - cx) + Math.abs(s.y - cy) < (layout === "bridge" ? 4 : 3)) continue;
    const onMain =
      (s.x === cx || s.y === cy) &&
      [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ].some(([ox, oy]) => get(grid, s.x + ox, s.y + oy) === "=");
    if (onMain && (s.x === cx || s.y === cy)) continue;
    let neighborBusy = false;
    for (const [ox, oy] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ] as const) {
      if (occupied.has(`${s.x + ox},${s.y + oy}`)) neighborBusy = true;
    }
    if (neighborBusy) continue;
    return s;
  }
  return null;
}

/** Build a large city — 港湾升级：坊内烟火 + 略规整坊区，禁止干道两排人。 */
export function buildMetro(opts: MetroOpts): MetroScene {
  const PROP_CHARS = new Set(",pvlHt&$bj".split(""));
  /** 封印 nsewx、缓存 C、门额等不能当 talker 键，否则人站在封印/宝箱格上。 */
  const BAD_KEY = new Set("nsewxCIG!*$0123456789NSEWUDYLK@#:=~^%&,.tplvHbj".split(""));
  const rawTalk = { ...opts.talkers };
  const usedKeys = new Set([...Object.keys(rawTalk), ...Object.keys(opts.npcs ?? {})]);
  const freePool = "ijklmnopqrstuvyzABDEFHJKLMOPQRTUV"
    .split("")
    .filter((c) => !usedKeys.has(c) && !PROP_CHARS.has(c) && !BAD_KEY.has(c));
  let poolI = 0;
  const talkers: Record<string, string> = {};
  for (const [ch, id] of Object.entries(rawTalk)) {
    if ((PROP_CHARS.has(ch) || BAD_KEY.has(ch)) && poolI < freePool.length) {
      const nk = freePool[poolI++]!;
      talkers[nk] = id;
      usedKeys.add(nk);
    } else {
      talkers[ch] = id;
    }
  }
  const have = new Set(Object.values(talkers));
  const used = new Set([...Object.keys(talkers), ...Object.keys(opts.npcs ?? {})]);
  const free = "ijklmnopqrstuvyzABDEFHJKLMOPQRTUV"
    .split("")
    .filter((c) => !used.has(c) && !PROP_CHARS.has(c) && !BAD_KEY.has(c));
  let fi = 0;
  const addTalk = (id: string) => {
    if (have.has(id) || fi >= free.length) return;
    talkers[free[fi++]] = id;
    have.add(id);
  };
  for (const id of [
    "innkeep",
    "townWatch",
    "townHawker",
    "roadCook",
    "doctor",
    "coach",
    "vendor",
    "barkeep",
    "bailiff",
    "passClerk",
    "postRider",
    "rumorTea",
    "roadHawker",
    "butcher",
    "barber",
    "carter",
    "docker",
    "scribe",
    "monk",
  ]) {
    addTalk(id);
  }
  const npcs = { ...(opts.npcs ?? {}) };
  if (!npcs["1"]) npcs["1"] = "thug";
  if (!npcs["2"]) npcs["2"] = "alley";
  if (!npcs["3"]) npcs["3"] = "hauler";
  opts = { ...opts, talkers, npcs };

  const seed = hashSeed(opts.id);
  const W = opts.w ?? 72;
  const H = opts.h ?? 48;
  const cx = Math.floor(W / 2) + ((seed % 5) - 2);
  const cy = Math.floor(H / 2) + (((seed >> 3) % 5) - 2);
  const grid = blank(W, H, ".");
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

  const punchV = (gx: number, y0: number, y1: number) => {
    const a = Math.min(y0, y1);
    const b = Math.max(y0, y1);
    for (let y = a; y <= b; y++) {
      for (const dx of [-1, 0, 1]) {
        const ch = get(grid, gx + dx, y);
        if (ch === "~" || ch === "^" || ch === "%") set(grid, gx + dx, y, ".");
      }
      setRoad(grid, gx, y);
    }
  };
  const punchH = (gy: number, x0: number, x1: number) => {
    const a = Math.min(x0, x1);
    const b = Math.max(x0, x1);
    for (let x = a; x <= b; x++) {
      for (const dy of [-1, 0, 1]) {
        const ch = get(grid, x, gy + dy);
        if (ch === "~" || ch === "^" || ch === "%") set(grid, x, gy + dy, ".");
      }
      setRoad(grid, x, gy);
    }
  };

  type B = {
    x: number;
    y: number;
    bw: number;
    bh: number;
    door: "s" | "n" | "e" | "w";
    mark: string;
    kind: DistrictKind;
    deep?: boolean;
  };
  const layout = layoutOf(opts.id, opts.layout);
  const ox = (seed % 3) - 1;
  const oy = ((seed >> 2) % 3) - 1;

  const districtsFor = (L: MetroLayout): B[] => {
    if (L === "ferry") {
      return [
        { x: 4, y: 6, bw: 9, bh: 7, door: "s", mark: "a", kind: "yamen", deep: true },
        { x: 18, y: 5, bw: 8, bh: 6, door: "s", mark: "b", kind: "martial", deep: true },
        { x: W - 14, y: 7, bw: 8, bh: 7, door: "s", mark: "g", kind: "tea", deep: true },
        { x: 5, y: H - 14, bw: 9, bh: 7, door: "n", mark: "c", kind: "clinic", deep: true },
        { x: 20, y: H - 13, bw: 8, bh: 6, door: "n", mark: "d", kind: "pawn", deep: true },
        { x: W - 16, y: H - 15, bw: 9, bh: 7, door: "n", mark: "e", kind: "wine", deep: true },
        { x: 8, y: cy - 3, bw: 7, bh: 5, door: "e", mark: "f", kind: "shop", deep: true },
        { x: W - 18, y: cy - 2, bw: 7, bh: 5, door: "w", mark: "h", kind: "post", deep: true },
        { x: Math.floor(W * 0.35), y: 8, bw: 7, bh: 5, door: "s", mark: "I", kind: "shrine", deep: true },
        { x: Math.floor(W * 0.55), y: H - 12, bw: 6, bh: 5, door: "n", mark: "J", kind: "shed" },
      ];
    }
    if (L === "wardGrid") {
      const cols = [4, Math.floor(W / 3) + 1, Math.floor((2 * W) / 3)];
      const rowsY = [5, Math.floor(H / 2) + 2];
      const kinds: DistrictKind[] = ["yamen", "martial", "clinic", "pawn", "wine", "shop", "tea", "post", "shrine", "shed"];
      const marks = ["a", "b", "c", "d", "e", "f", "g", "h", "I", "J"];
      const out: B[] = [];
      let i = 0;
      for (const ry of rowsY) {
        for (const cx0 of cols) {
          if (i >= 10) break;
          const door: B["door"] = ry < H / 2 ? "s" : "n";
          out.push({
            x: cx0 + (i % 3) - 1,
            y: ry + (i % 2),
            bw: 8 + (i % 3),
            bh: 6 + (i % 2),
            door,
            mark: marks[i]!,
            kind: kinds[i]!,
            deep: i < 8,
          });
          i++;
        }
      }
      while (i < 10) {
        out.push({
          x: 6 + i * 5,
          y: H - 10,
          bw: 6,
          bh: 5,
          door: "n",
          mark: marks[i]!,
          kind: kinds[i]!,
          deep: false,
        });
        i++;
      }
      return out;
    }
    if (L === "bridge") {
      // 天津桥：坊仅贴桥轴两侧支路，门朝主桥；仅衙/武/医多进
      const left = cx - 3;
      const right = cx + 3;
      return [
        { x: left - 9, y: 6, bw: 9, bh: 8, door: "e", mark: "a", kind: "yamen", deep: true },
        { x: right, y: 6, bw: 9, bh: 8, door: "w", mark: "b", kind: "martial", deep: true },
        { x: left - 8, y: 16, bw: 8, bh: 7, door: "e", mark: "c", kind: "clinic", deep: true },
        { x: right, y: 16, bw: 8, bh: 7, door: "w", mark: "d", kind: "pawn", deep: false },
        { x: left - 9, y: 26, bw: 9, bh: 7, door: "e", mark: "e", kind: "wine", deep: false },
        { x: right, y: 26, bw: 8, bh: 6, door: "w", mark: "f", kind: "shop", deep: false },
        { x: left - 8, y: 36, bw: 8, bh: 5, door: "e", mark: "g", kind: "tea", deep: false },
        { x: right, y: 35, bw: 9, bh: 6, door: "w", mark: "h", kind: "post", deep: false },
        { x: left - 7, y: 42, bw: 7, bh: 5, door: "e", mark: "I", kind: "shrine", deep: false },
        { x: right + 1, y: 42, bw: 6, bh: 5, door: "w", mark: "J", kind: "shed", deep: false },
      ];
    }
    if (L === "imperial") {
      return [
        { x: 3, y: 5, bw: 10, bh: 8, door: "e", mark: "a", kind: "yamen", deep: true },
        { x: 4, y: 16, bw: 9, bh: 7, door: "e", mark: "c", kind: "clinic", deep: true },
        { x: 3, y: 28, bw: 9, bh: 7, door: "e", mark: "e", kind: "wine", deep: true },
        { x: 5, y: H - 12, bw: 8, bh: 6, door: "e", mark: "I", kind: "shrine", deep: true },
        { x: W - 15, y: 6, bw: 9, bh: 7, door: "w", mark: "b", kind: "martial", deep: true },
        { x: W - 14, y: 15, bw: 8, bh: 7, door: "w", mark: "d", kind: "pawn", deep: true },
        { x: W - 16, y: 26, bw: 9, bh: 7, door: "w", mark: "f", kind: "shop", deep: true },
        { x: W - 13, y: H - 13, bw: 8, bh: 6, door: "w", mark: "h", kind: "post", deep: true },
        { x: cx - 12, y: 4, bw: 8, bh: 5, door: "s", mark: "g", kind: "tea", deep: true },
        { x: cx + 4, y: H - 10, bw: 7, bh: 5, door: "n", mark: "J", kind: "shed" },
      ];
    }
    if (L === "canalLadder") {
      return [
        { x: 4, y: 8, bw: 8, bh: 6, door: "s", mark: "e", kind: "wine", deep: true },
        { x: 16, y: 6, bw: 8, bh: 6, door: "s", mark: "f", kind: "shop", deep: true },
        { x: 30, y: 7, bw: 8, bh: 6, door: "s", mark: "g", kind: "tea", deep: true },
        { x: 44, y: 5, bw: 8, bh: 6, door: "s", mark: "a", kind: "yamen", deep: true },
        { x: 6, y: 22, bw: 8, bh: 6, door: "n", mark: "c", kind: "clinic", deep: true },
        { x: 20, y: 24, bw: 8, bh: 6, door: "n", mark: "d", kind: "pawn", deep: true },
        { x: 34, y: 23, bw: 8, bh: 6, door: "n", mark: "b", kind: "martial", deep: true },
        { x: 48, y: 22, bw: 8, bh: 6, door: "n", mark: "h", kind: "post", deep: true },
        { x: 10, y: H - 12, bw: 7, bh: 5, door: "n", mark: "I", kind: "shrine", deep: true },
        { x: W - 14, y: H - 11, bw: 6, bh: 5, door: "n", mark: "J", kind: "shed" },
      ];
    }
    if (L === "riverFan") {
      return [
        { x: cx - 4, y: 5, bw: 9, bh: 6, door: "s", mark: "g", kind: "tea", deep: true },
        { x: 4, y: 12, bw: 8, bh: 7, door: "e", mark: "a", kind: "yamen", deep: true },
        { x: W - 14, y: 12, bw: 8, bh: 7, door: "w", mark: "b", kind: "martial", deep: true },
        { x: 6, y: 24, bw: 8, bh: 6, door: "e", mark: "c", kind: "clinic", deep: true },
        { x: W - 15, y: 24, bw: 8, bh: 6, door: "w", mark: "d", kind: "pawn", deep: true },
        { x: 8, y: 34, bw: 8, bh: 6, door: "e", mark: "e", kind: "wine", deep: true },
        { x: W - 16, y: 34, bw: 8, bh: 6, door: "w", mark: "f", kind: "shop", deep: true },
        { x: cx - 8, y: H - 12, bw: 9, bh: 6, door: "n", mark: "h", kind: "post", deep: true },
        { x: 14, y: 18, bw: 6, bh: 5, door: "s", mark: "I", kind: "shrine", deep: true },
        { x: W - 20, y: 18, bw: 6, bh: 5, door: "s", mark: "J", kind: "shed" },
      ];
    }
    if (L === "waterLane") {
      return [
        { x: 5, y: 5, bw: 7, bh: 6, door: "s", mark: "f", kind: "shop", deep: true },
        { x: 16, y: 4, bw: 7, bh: 5, door: "s", mark: "g", kind: "tea", deep: true },
        { x: 28, y: 6, bw: 8, bh: 6, door: "s", mark: "e", kind: "wine", deep: true },
        { x: 42, y: 5, bw: 7, bh: 6, door: "s", mark: "d", kind: "pawn", deep: true },
        { x: 54, y: 7, bw: 7, bh: 5, door: "s", mark: "b", kind: "martial", deep: true },
        { x: 8, y: 18, bw: 8, bh: 6, door: "n", mark: "c", kind: "clinic", deep: true },
        { x: 22, y: 20, bw: 7, bh: 6, door: "e", mark: "a", kind: "yamen", deep: true },
        { x: 38, y: 19, bw: 8, bh: 6, door: "w", mark: "h", kind: "post", deep: true },
        { x: 52, y: 22, bw: 7, bh: 5, door: "n", mark: "I", kind: "shrine", deep: true },
        { x: 30, y: H - 12, bw: 8, bh: 6, door: "n", mark: "J", kind: "shed", deep: true },
      ];
    }
    if (L === "lakeShore") {
      return [
        { x: Math.floor(W * 0.42), y: 5, bw: 9, bh: 7, door: "s", mark: "e", kind: "wine", deep: true },
        { x: Math.floor(W * 0.58), y: 6, bw: 8, bh: 6, door: "s", mark: "g", kind: "tea", deep: true },
        { x: Math.floor(W * 0.74), y: 5, bw: 8, bh: 7, door: "s", mark: "a", kind: "yamen", deep: true },
        { x: Math.floor(W * 0.4), y: 18, bw: 8, bh: 7, door: "e", mark: "c", kind: "clinic", deep: true },
        { x: Math.floor(W * 0.55), y: 20, bw: 8, bh: 6, door: "s", mark: "d", kind: "pawn", deep: true },
        { x: Math.floor(W * 0.72), y: 18, bw: 8, bh: 7, door: "w", mark: "b", kind: "martial", deep: true },
        { x: Math.floor(W * 0.45), y: 32, bw: 8, bh: 6, door: "n", mark: "f", kind: "shop", deep: true },
        { x: Math.floor(W * 0.62), y: 33, bw: 9, bh: 6, door: "n", mark: "h", kind: "post", deep: true },
        { x: Math.floor(W * 0.35), y: H - 12, bw: 7, bh: 5, door: "n", mark: "I", kind: "shrine", deep: true },
        { x: Math.floor(W * 0.78), y: H - 11, bw: 6, bh: 5, door: "n", mark: "J", kind: "shed" },
      ];
    }
    return [
      { x: cx - 20 + ox, y: cy - 17 + oy, bw: 10, bh: 9, door: "s", mark: "a", kind: "yamen", deep: true },
      { x: cx + 7 + ox, y: cy - 16 + oy, bw: 9, bh: 8, door: "s", mark: "b", kind: "martial", deep: true },
      { x: cx - 20 + ox, y: cy + 5 + oy, bw: 9, bh: 8, door: "n", mark: "c", kind: "clinic", deep: true },
      { x: cx + 8 + ox, y: cy + 5 + oy, bw: 9, bh: 8, door: "n", mark: "d", kind: "pawn", deep: true },
      { x: Math.floor(W * 0.1), y: Math.floor(H * 0.3), bw: 8, bh: 7, door: "e", mark: "e", kind: "wine", deep: true },
      { x: Math.floor(W * 0.78), y: Math.floor(H * 0.28), bw: 8, bh: 7, door: "w", mark: "f", kind: "shop", deep: true },
      { x: Math.floor(W * 0.4) + ox, y: Math.floor(H * 0.1), bw: 9, bh: 6, door: "s", mark: "g", kind: "tea", deep: true },
      { x: Math.floor(W * 0.42) + ox, y: Math.floor(H * 0.76), bw: 10, bh: 7, door: "n", mark: "h", kind: "post", deep: true },
      { x: Math.floor(W * 0.18), y: Math.floor(H * 0.58), bw: 7, bh: 6, door: "e", mark: "I", kind: "shrine", deep: true },
      { x: Math.floor(W * 0.72), y: Math.floor(H * 0.58), bw: 6, bh: 5, door: "w", mark: "J", kind: "shed" },
    ];
  };

  const blds = districtsFor(layout);
  for (const b of blds) {
    b.x = Math.min(W - b.bw - 2, Math.max(2, b.x));
    b.y = Math.min(H - b.bh - 2, Math.max(2, b.y));
  }
  for (const b of blds) {
    if (b.deep) siheyuan(grid, b.x, b.y, b.bw, b.bh, b.door, b.mark);
    else building(grid, b.x, b.y, b.bw, b.bh, b.door, b.mark);
    furnishDistrict(grid, b, b.kind, seed, layout);
  }

  const paintRoads = (L: MetroLayout) => {
    if (L === "ferry") {
      hroad(grid, cy, 1, W - 2);
      hroad(grid, cy - 1, 8, W - 10);
      vroad(grid, 12, 4, H - 4);
      vroad(grid, W - 14, 5, H - 5);
      vroad(grid, Math.floor(W / 2), cy - 6, cy + 6);
    } else if (L === "wardGrid") {
      const c1 = Math.floor(W / 3);
      const c2 = Math.floor((2 * W) / 3);
      const r1 = Math.floor(H / 2);
      vroad(grid, c1, 2, H - 3);
      vroad(grid, c2, 2, H - 3);
      hroad(grid, r1, 2, W - 3);
      hroad(grid, 8, c1 - 6, c1 + 6);
      hroad(grid, H - 9, c2 - 6, c2 + 6);
    } else if (L === "bridge") {
      // 主桥三线宽 + 左右各两条横支（共四条）
      vroad(grid, cx - 1, 2, H - 3);
      vroad(grid, cx, 2, H - 3);
      vroad(grid, cx + 1, 2, H - 3);
      hroad(grid, 10, 3, cx - 2);
      hroad(grid, 10, cx + 2, W - 4);
      hroad(grid, 20, 3, cx - 2);
      hroad(grid, 20, cx + 2, W - 4);
      hroad(grid, 30, 3, cx - 2);
      hroad(grid, 30, cx + 2, W - 4);
      hroad(grid, 40, 4, cx - 2);
      hroad(grid, 40, cx + 2, W - 5);
    } else if (L === "imperial") {
      vroad(grid, cx - 1, 2, H - 3);
      vroad(grid, cx, 2, H - 3);
      vroad(grid, cx + 1, 2, H - 3);
      hroad(grid, 12, 2, cx - 3);
      hroad(grid, 12, cx + 3, W - 3);
      hroad(grid, 24, 2, cx - 3);
      hroad(grid, 24, cx + 3, W - 3);
      hroad(grid, H - 10, 3, W - 4);
    } else if (L === "canalLadder") {
      hroad(grid, 12, 2, W - 3);
      hroad(grid, 28, 2, W - 3);
      vroad(grid, 14, 10, 30);
      vroad(grid, 28, 10, 30);
      vroad(grid, 42, 8, 32);
      hroad(grid, H - 8, 4, W - 5);
    } else if (L === "riverFan") {
      vroad(grid, cx, 2, H - 3);
      hroad(grid, 14, 4, cx);
      hroad(grid, 14, cx, W - 5);
      hroad(grid, 26, 6, cx);
      hroad(grid, 26, cx, W - 6);
      hroad(grid, 36, 8, cx);
      hroad(grid, 36, cx, W - 8);
      hroad(grid, H - 8, cx - 10, cx + 10);
    } else if (L === "waterLane") {
      hroad(grid, 10, 4, 22);
      hroad(grid, 10, 30, 50);
      hroad(grid, 22, 8, 28);
      hroad(grid, 22, 40, W - 5);
      hroad(grid, 34, 12, 45);
      vroad(grid, 12, 8, 24);
      vroad(grid, 26, 6, 36);
      vroad(grid, 40, 10, 28);
      vroad(grid, 54, 8, 30);
      hroad(grid, H - 9, 20, 50);
    } else if (L === "lakeShore") {
      for (let y = 4; y < H - 4; y++) {
        for (let x = 2; x < Math.floor(W * 0.32); x++) {
          if (get(grid, x, y) === ".") set(grid, x, y, "~");
        }
      }
      vroad(grid, Math.floor(W * 0.38), 3, H - 4);
      hroad(grid, 10, Math.floor(W * 0.36), W - 4);
      hroad(grid, 22, Math.floor(W * 0.4), W - 5);
      hroad(grid, 34, Math.floor(W * 0.38), W - 4);
      vroad(grid, Math.floor(W * 0.55), 8, 38);
      vroad(grid, Math.floor(W * 0.72), 6, H - 6);
      hroad(grid, H - 9, Math.floor(W * 0.36), W - 5);
    } else {
      hroad(grid, cy, 1, W - 2);
      vroad(grid, cx, 1, H - 2);
    }
  };
  paintRoads(layout);

  for (const b of blds) {
    if (b.door === "s") approachDoor(grid, b.x + Math.floor(b.bw / 2), b.y + b.bh - 1, "s");
    if (b.door === "n") approachDoor(grid, b.x + Math.floor(b.bw / 2), b.y, "n");
    if (b.door === "e") approachDoor(grid, b.x + b.bw - 1, b.y + Math.floor(b.bh / 2), "e");
    if (b.door === "w") approachDoor(grid, b.x, b.y + Math.floor(b.bh / 2), "w");
  }

  if (opts.hills && layout !== "lakeShore") {
    const x0 = W - 18;
    const y0 = H - 16;
    for (let y = y0; y < H - 1; y++) {
      for (let x = x0; x < W - 1; x++) {
        const dx = x - (W - 9);
        const dy = y - (H - 8);
        if (dx * dx + dy * dy * 1.15 < 80 && get(grid, x, y) === ".") set(grid, x, y, "^");
      }
    }
    if (layout === "riverFan" || layout === "bridge") vroad(grid, W - 9, Math.floor(H / 2), H - 4);
  }

  const marketSpot =
    layout === "lakeShore"
      ? { x: Math.floor(W * 0.5), y: 14 }
      : layout === "imperial"
        ? { x: cx - 8, y: 18 }
        : layout === "ferry"
          ? { x: Math.floor(W * 0.4), y: cy + 3 }
          : layout === "waterLane"
            ? { x: 32, y: 28 }
            : layout === "bridge"
              ? { x: cx + 4, y: cy } // 主桥中段东侧空地，摊不压三线桥
              : { x: seed % 2 === 0 ? Math.min(W - 8, cx + 8) : Math.max(8, cx - 10), y: seed % 2 === 0 ? Math.min(H - 8, cy + 4) : Math.max(8, cy - 5) };
  const marketCx = marketSpot.x;
  const marketCy = marketSpot.y;
  const stallBits = [",", "p", "p", "l", "v", ",", "p", "l"] as const;
  let si = 0;
  for (const [dx, dy] of [
    [0, 0], [1, 0], [2, 1], [0, 2], [-1, 1], [3, 0], [1, 2], [-2, 0], [2, -1], [-1, -1],
  ] as const) {
    const x = marketCx + dx;
    const y = marketCy + dy;
    if (get(grid, x, y) === ".") set(grid, x, y, stallBits[si++ % stallBits.length]!);
  }

  for (let y = 4; y < H - 4; y++) {
    for (let x = 4; x < W - 4; x++) {
      if (get(grid, x, y) !== ".") continue;
      const besideRoad = [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => get(grid, x + dx, y + dy) === "=");
      if (besideRoad) continue;
      if (layout === "bridge" && Math.abs(x - cx) <= 2) continue; // 永不遮主桥
      // bridge：约每 3 格一棵，压缩大块空地；其它布局仍稀疏
      const dens = layout === "bridge" ? 11 : 47;
      if ((x * 17 + y * 31 + seed) % dens === 0) set(grid, x, y, "&");
    }
  }

  const portals = opts.portals;
  if (portals.N || portals.D || portals.U) {
    const ch = portals.N ? "N" : portals.U ? "U" : "D";
    set(grid, cx, 0, "#");
    set(grid, cx - 1, 1, "#");
    set(grid, cx, 1, ch);
    set(grid, cx + 1, 1, "#");
    punchV(cx, 1, cy);
  }
  if (portals.S) {
    set(grid, cx - 1, H - 2, "#");
    set(grid, cx, H - 2, "S");
    set(grid, cx + 1, H - 2, "#");
    punchV(cx, cy, H - 3);
  }
  if (portals.W) {
    set(grid, 1, cy - 1, "#");
    set(grid, 1, cy, "W");
    set(grid, 1, cy + 1, "#");
    punchH(cy, 2, cx);
  }
  if (portals.E) {
    set(grid, W - 2, cy - 1, "#");
    set(grid, W - 2, cy, "E");
    set(grid, W - 2, cy + 1, "#");
    punchH(cy, cx, W - 3);
  }
  if (portals.Y) {
    const yx = Math.floor(W * 0.2);
    set(grid, yx, H - 2, "Y");
    punchV(yx, cy, H - 3);
    punchH(cy, Math.min(cx, yx), Math.max(cx, yx));
  }
  if (portals.L) set(grid, cx, H - 2, "L");
  if (portals.K) {
    const kx = Math.max(3, cx - 10);
    set(grid, kx - 1, 1, "#");
    set(grid, kx, 1, "K");
    set(grid, kx + 1, 1, "#");
    punchV(kx, 2, cy);
  }
  if (portals.D && portals.U) set(grid, cx + 8, H - 2, "D");

  set(grid, cx, cy, "@");

  for (const m of opts.marks ?? []) {
    if (get(grid, m.x, m.y) === "#") continue;
    if (opts.talkers[m.ch]) continue;
    if (get(grid, m.x, m.y) === "=" && (m.ch === "~" || m.ch === "^" || m.ch === "%")) continue;
    set(grid, m.x, m.y, m.ch);
  }
  punchV(cx, 1, H - 2);
  punchH(cy, 1, W - 2);
  if (layout === "bridge") {
    punchV(cx - 1, 1, H - 2);
    punchV(cx + 1, 1, H - 2);
  }

  // 功能人 → 对应坊；路人 → 市集簇旁（禁止贴干道排队）
  const roleYard: Record<string, string> = {
    bailiff: "a",
    passClerk: "a",
    townWatch: "a",
    scribe: "a",
    coach: "b",
    doctor: "c",
    vendor: "d",
    barkeep: "e",
    innkeep: "e",
    townHawker: "f",
    rumorTea: "g",
    postRider: "h",
    monk: "I",
    butcher: "J",
    barber: "J",
    carter: "J",
    docker: "f",
  };
  const yardByMark = new Map(blds.map((b) => [b.mark, b]));
  const occupied = new Set<string>();
  const placedTalk: Record<string, string> = {};

  const plazaSpots: { x: number; y: number }[] = [];
  for (let dy = -4; dy <= 4; dy++) {
    for (let dx = -4; dx <= 4; dx++) {
      const x = marketCx + dx;
      const y = marketCy + dy;
      if (get(grid, x, y) !== ".") continue;
      const nearStall = [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
        [1, 1],
        [-1, -1],
      ].some(([ox, oy]) => ",plv".includes(get(grid, x + ox, y + oy)));
      const onRoad =
        get(grid, x, y) === "=" ||
        [
          [0, 1],
          [0, -1],
          [1, 0],
          [-1, 0],
        ].every(([ox, oy]) => get(grid, x + ox, y + oy) === "=");
      if (layout === "bridge" && Math.abs(x - cx) <= 1) continue;
      if (nearStall && !onRoad) plazaSpots.push({ x, y });
    }
  }
  // 打散市集空位顺序
  for (let i = plazaSpots.length - 1; i > 0; i--) {
    const j = (seed + i * 17) % (i + 1);
    const tmp = plazaSpots[i]!;
    plazaSpots[i] = plazaSpots[j]!;
    plazaSpots[j] = tmp;
  }
  let plazaI = 0;

  const yardFill = new Map<string, number>();

  for (const [ch, id] of Object.entries(opts.talkers)) {
    placedTalk[ch] = id;
    let placed = false;
    for (let y = 0; y < H; y++) {
      if (grid[y].includes(ch)) {
        occupied.add(`${grid[y].indexOf(ch)},${y}`);
        placed = true;
        break;
      }
    }
    if (placed) continue;

    const mark = roleYard[id];
    const yard = mark ? yardByMark.get(mark) : undefined;
    const filled = mark ? yardFill.get(mark) ?? 0 : 99;
    // 验帖吏：优先站在旅行门户内侧旁，不进坊挤门檐
    if (!placed && (id === "passClerk" || id === "townWatch") && layout === "bridge") {
      const gateSpots: { x: number; y: number }[] = [];
      for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
          const ch = get(grid, x, y);
          if (!"NSEWUD".includes(ch)) continue;
          for (const [ox, oy] of [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
            [2, 0],
            [-2, 0],
            [0, 2],
            [0, -2],
          ] as const) {
            gateSpots.push({ x: x + ox, y: y + oy });
          }
        }
      }
      for (const s of gateSpots) {
        if (get(grid, s.x, s.y) !== ".") continue;
        if (occupied.has(`${s.x},${s.y}`)) continue;
        if (Math.abs(s.x - cx) <= 1 && s.y > 2 && s.y < H - 3) continue;
        set(grid, s.x, s.y, ch);
        occupied.add(`${s.x},${s.y}`);
        placed = true;
        break;
      }
    }
    // 功能人：优先门檐下（可达+有烟火），每坊两人；再溢到市集
    if (!placed && yard && filled < 2) {
      const eaves = seatAtEaves(grid, yard, occupied, cx, cy, layout);
      if (eaves) {
        set(grid, eaves.x, eaves.y, ch);
        occupied.add(`${eaves.x},${eaves.y}`);
        yardFill.set(mark!, filled + 1);
        placed = true;
      } else {
        const seat = seatInYard(grid, yard, occupied, seatsNearDoor(yard));
        if (seat) {
          set(grid, seat.x, seat.y, ch);
          occupied.add(`${seat.x},${seat.y}`);
          yardFill.set(mark!, filled + 1);
          placed = true;
        }
      }
    }
    if (!placed) {
      while (plazaI < plazaSpots.length) {
        const s = plazaSpots[plazaI++]!;
        if (get(grid, s.x, s.y) !== "." || occupied.has(`${s.x},${s.y}`)) continue;
        let neighborBusy = false;
        for (const [dx, dy] of [
          [0, 1],
          [0, -1],
          [1, 0],
          [-1, 0],
        ] as const) {
          if (occupied.has(`${s.x + dx},${s.y + dy}`)) neighborBusy = true;
        }
        if (neighborBusy) continue;
        set(grid, s.x, s.y, ch);
        occupied.add(`${s.x},${s.y}`);
        placed = true;
        break;
      }
    }
    if (!placed) {
      // 最后：院门内侧，仍不贴干道
      for (const b of blds) {
        const seat = seatInYard(grid, b, occupied, [
          { lx: 1, ly: 1 },
          { lx: 2, ly: 2 },
          { lx: 3, ly: 1 },
        ]);
        if (seat) {
          set(grid, seat.x, seat.y, ch);
          occupied.add(`${seat.x},${seat.y}`);
          placed = true;
          break;
        }
      }
    }
  }

  for (const slot of ["a", "b", "c", "d", "e", "f", "g", "h", "I", "J"]) {
    for (let y = 0; y < H; y++) {
      const x = grid[y].indexOf(slot);
      if (x >= 0 && get(grid, x, y) === slot) set(grid, x, y, ".");
    }
  }

  // 闲匪站在坊巷拐角，不站官道
  const npcKeys = Object.keys(opts.npcs ?? {});
  npcKeys.forEach((ch, i) => {
    for (let y = 0; y < H; y++) {
      if (grid[y].includes(ch)) return;
    }
    const corners = [
      { x: cx - 6 - i, y: cy - 5 },
      { x: cx + 5 + i, y: cy + 4 },
      { x: cx - 4, y: cy + 6 + i },
    ];
    for (const s of corners) {
      if (get(grid, s.x, s.y) === "." && !occupied.has(`${s.x},${s.y}`)) {
        const touchRoad = [
          [0, 1],
          [0, -1],
          [1, 0],
          [-1, 0],
        ].some(([dx, dy]) => get(grid, s.x + dx, s.y + dy) === "=");
        if (touchRoad) continue;
        set(grid, s.x, s.y, ch);
        occupied.add(`${s.x},${s.y}`);
        return;
      }
    }
  });

  // 可达性修补：用与游戏相同的阻挡规则（杂物不可穿），困住人挪到贴路空位
  const BLOCK_CH = new Set("vbptj&gdkfmyzuqhic".split(""));
  const reach = new Set<string>();
  const rq: { x: number; y: number }[] = [{ x: cx, y: cy }];
  reach.add(`${cx},${cy}`);
  while (rq.length) {
    const cur = rq.pop()!;
    for (const [dx, dy] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ] as const) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      const k = `${nx},${ny}`;
      if (reach.has(k)) continue;
      const ch = get(grid, nx, ny);
      if (ch === "#" || ch === "~" || ch === "^" || ch === "%") continue;
      if (BLOCK_CH.has(ch)) continue;
      if (opts.talkers[ch]) continue;
      reach.add(k);
      rq.push({ x: nx, y: ny });
    }
  }
  const rescueSpots: { x: number; y: number }[] = [];
  for (let y = 2; y < H - 2; y++) {
    for (let x = 2; x < W - 2; x++) {
      if (get(grid, x, y) !== ".") continue;
      if (!reach.has(`${x},${y}`)) continue;
      const besideRoad = [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ].some(([dx, dy]) => get(grid, x + dx, y + dy) === "=");
      // 贴支路即可，不要贴十字正中排队
      if (!besideRoad) continue;
      if (x === cx || y === cy) continue;
      rescueSpots.push({ x, y });
    }
  }
  for (const s of plazaSpots) {
    if (get(grid, s.x, s.y) === "." && reach.has(`${s.x},${s.y}`)) rescueSpots.push(s);
  }
  let rescueI = 0;
  for (const [ch] of Object.entries(placedTalk)) {
    let px = -1;
    let py = -1;
    for (let y = 0; y < H; y++) {
      const x = grid[y].indexOf(ch);
      if (x >= 0) {
        px = x;
        py = y;
        break;
      }
    }
    const ok =
      px >= 0 &&
      [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ].some(([dx, dy]) => reach.has(`${px + dx},${py + dy}`));
    if (ok) continue;
    if (px >= 0) {
      set(grid, px, py, ".");
      occupied.delete(`${px},${py}`);
    }
    while (rescueI < rescueSpots.length) {
      const s = rescueSpots[rescueI++]!;
      if (get(grid, s.x, s.y) !== "." || occupied.has(`${s.x},${s.y}`)) continue;
      let neighborBusy = false;
      for (const [dx, dy] of [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ] as const) {
        if (occupied.has(`${s.x + dx},${s.y + dy}`)) neighborBusy = true;
      }
      if (neighborBusy) continue;
      set(grid, s.x, s.y, ch);
      occupied.add(`${s.x},${s.y}`);
      break;
    }
  }

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

// ═══════════════════════════════════════════
// 洛阳表现层：命名 / 陈设模板 / NPC 立绘（不定布局骨架）
// ═══════════════════════════════════════════

function gridGet(g: string[], x: number, y: number): string {
  if (y < 0 || y >= g.length || x < 0 || x >= (g[0]?.length ?? 0)) return "#";
  return g[y]![x]!;
}

function gridSet(g: string[], x: number, y: number, ch: string): void {
  if (y < 0 || y >= g.length || x < 0 || x >= (g[0]?.length ?? 0)) return;
  const row = g[y]!;
  g[y] = row.slice(0, x) + ch + row.slice(x + 1);
}

/** 任务1：主入口外侧 1 格挂告示牌（! + signs 登记名） */
export function renderBuildingName(
  g: string[],
  building: Pick<LuoBuildingDef, "name">,
  doorX: number,
  doorY: number,
  door: "n" | "s" | "e" | "w",
  signs: string[],
): void {
  const ox = door === "e" ? 1 : door === "w" ? -1 : 0;
  const oy = door === "s" ? 1 : door === "n" ? -1 : 0;
  // 正上方/外侧 1 格；若被占则旁移
  const candidates = [
    { x: doorX + ox, y: doorY + oy },
    { x: doorX + ox + (oy !== 0 ? 1 : 0), y: doorY + oy + (ox !== 0 ? 1 : 0) },
    { x: doorX + ox - (oy !== 0 ? 1 : 0), y: doorY + oy - (ox !== 0 ? 1 : 0) },
  ];
  for (const c of candidates) {
    const cur = gridGet(g, c.x, c.y);
    if (cur === "." || cur === "=") {
      gridSet(g, c.x, c.y, "!");
      signs.push(building.name);
      return;
    }
  }
  signs.push(building.name);
}

/**
 * 任务3：按模板加密陈设。只写空地 `.`，不改墙 `#` / 路 `=` / 水 / 门洞。
 * 物件字母避开 talker 占用的 i/k/p/t/v/y。
 */
export function furnishByTemplate(
  g: string[],
  template: LuoFurnishTemplate,
  x0: number,
  y0: number,
  iw: number,
  ih: number,
  door: "n" | "s" | "e" | "w",
): void {
  const midX = Math.floor(iw / 2);
  const midY = Math.floor(ih / 2);
  const onAxis = (lx: number, ly: number) => {
    if (door === "n" || door === "s") return Math.abs(lx - midX) <= 1 && ly > 0 && ly < ih - 1;
    return Math.abs(ly - midY) <= 1 && lx > 0 && lx < iw - 1;
  };
  const put = (lx: number, ly: number, ch: string) => {
    if (lx < 0 || ly < 0 || lx >= iw || ly >= ih) return;
    if (onAxis(lx, ly)) return;
    const x = x0 + lx;
    const y = y0 + ly;
    const cur = gridGet(g, x, y);
    if (cur !== ".") return;
    gridSet(g, x, y, ch);
  };
  const R = iw - 1;
  const B = ih - 1;
  const scale = Math.max(1, Math.floor(iw / 8));

  if (template === "yamenHall") {
    put(0, 1, "m");
    put(2, 1, "m"); // 惊堂木以桌代
    put(R, 1, "z");
    put(R - 2, 1, "z");
    put(0, B - 1, "i");
    put(1, B - 1, "i");
    put(R, B - 1, "j");
    put(0, Math.floor(B / 2), "o");
    put(0, Math.floor(B / 2) + 1, "o");
    put(R, Math.floor(B / 2), "o");
    put(R, Math.floor(B / 2) + 1, "o");
    put(1, 2, "l");
    put(R - 1, 2, "l");
    for (let s = 0; s < scale; s++) put(2 + s, B - 1, "o");
  } else if (template === "jailCell") {
    put(0, 1, "k");
    put(R, 1, "v");
    put(0, B - 1, "c");
    put(R, B - 1, "l");
    put(1, 1, "l");
    put(Math.floor(R / 2), B - 1, ",");
  } else if (template === "yanboChamber") {
    put(0, 1, "u");
    put(R, 1, "h");
    put(0, B - 1, "g");
    put(R, B - 1, "m");
    put(1, 0, "&");
    put(R - 1, 0, "&");
    put(Math.floor(R / 2), 1, "z");
    put(R - 2, B - 1, "h");
    put(1, B - 1, "l");
    put(R - 1, 2, "l");
  } else if (template === "yanboStage") {
    put(0, 1, "z");
    put(R, 1, "z");
    put(0, B - 1, "o");
    put(1, B - 1, "o");
    put(R, B - 1, "o");
    put(0, 2, "l");
    put(R, 2, "l");
  } else if (template === "taibaiHall") {
    for (let s = 0; s < Math.min(4, 1 + scale); s++) {
      put(1 + s * 2, 1, "m");
      put(1 + s * 2, 2, "o");
    }
    put(R, 1, "j");
    put(R, 2, "j");
    put(R - 1, 1, "j");
    put(0, B - 1, "q");
    put(1, 0, "l");
    put(R - 1, 0, "l");
    put(1, B, "l");
    put(R - 1, B, "l");
    put(Math.floor(R / 2), B - 1, "*");
  } else if (template === "taibaiPrivate") {
    put(Math.floor(R / 2), Math.floor(B / 2), "m");
    put(0, 1, "h");
    put(R, 1, "j");
  } else if (template === "martialYard") {
    put(0, 1, "d");
    put(2, 1, "d");
    put(R, 1, "c");
    put(R - 2, 1, "c");
    put(0, B - 1, "z");
    put(R, B - 1, "z");
    put(1, B - 1, "b");
    put(R - 1, 2, "h");
    put(Math.floor(R / 2), B - 1, "l");
  } else if (template === "clinicHall") {
    put(0, 1, "k");
    put(1, 1, "k");
    put(R, 1, "m");
    put(0, B - 1, "z");
    put(R, B - 1, "j");
    put(R - 1, B - 1, "j");
    put(R - 2, B - 1, "j");
    put(R - 3, B - 1, "j");
    put(2, B - 1, "c");
    put(1, 0, "l");
  } else if (template === "pawnHall" || template === "shopHall") {
    put(0, 1, "q");
    put(R, 1, "i");
    put(0, B - 1, "v");
    put(R, B - 1, "v");
    put(1, B - 1, ",");
    put(R - 1, B - 1, ",");
    put(Math.floor(R / 2), 1, "l");
  } else if (template === "templeHall") {
    put(Math.floor(R / 2), 1, "g");
    put(0, Math.floor(B / 2), "h");
    put(R, Math.floor(B / 2), "h");
    put(0, B - 1, "l");
    put(R, B - 1, "l");
  } else if (template === "postHall") {
    put(0, 1, "p");
    put(R, 1, "v");
    put(0, B - 1, "b");
    put(R, B - 1, "p");
    put(1, 1, "l");
  } else if (template === "homeHall") {
    put(0, 1, "u");
    put(R, 1, "m");
    put(0, B - 1, "j");
    put(R, B - 1, "l");
  } else if (template === "shedHall") {
    put(0, 1, "z");
    put(R, 1, "v");
    put(0, B - 1, "b");
  }
}

/** 任务4：建筑主题地标（门口石狮/灯笼/酒旗等），不改墙体尺寸 */
export function applyBuildingTheme(
  g: string[],
  building: LuoBuildingDef,
  doorX: number,
  doorY: number,
  door: "n" | "s" | "e" | "w",
  signs: string[],
): void {
  const ox = door === "e" ? 1 : door === "w" ? -1 : 0;
  const oy = door === "s" ? 1 : door === "n" ? -1 : 0;
  const side = door === "n" || door === "s" ? 1 : 0;
  const sx = door === "e" || door === "w" ? 0 : 1;
  const tryPut = (x: number, y: number, ch: string) => {
    const cur = gridGet(g, x, y);
    if (cur === "." || cur === "=") gridSet(g, x, y, ch);
  };
  const theme = building.spriteTheme;
  if (theme === "yamen") {
    tryPut(doorX + ox + sx, doorY + oy + side, "p");
    tryPut(doorX + ox - sx, doorY + oy - side, "p");
    tryPut(doorX - ox, doorY - oy, "h"); // 照壁在门内一侧若为空
    signs.push("肃静");
    signs.push("回避");
    tryPut(doorX + ox * 2 + sx, doorY + oy * 2 + side, "!");
    tryPut(doorX + ox * 2 - sx, doorY + oy * 2 - side, "!");
  } else if (theme === "yanbo") {
    for (const d of [-2, -1, 1, 2]) {
      tryPut(doorX + ox + (sx ? d : 0), doorY + oy + (side ? d : 0), "l");
    }
    for (const d of [-3, -2, -1, 1, 2, 3]) {
      tryPut(doorX - ox * 2 + (sx ? d : 0), doorY - oy * 2 + (side ? 0 : d), "&");
    }
  } else if (theme === "taibai") {
    tryPut(doorX + ox * 2, doorY + oy * 2, "!");
    signs.push("太白·酒旗");
    tryPut(doorX + ox + sx, doorY + oy + side, "j");
    tryPut(doorX + ox - sx, doorY + oy - side, "j");
  } else if (theme === "martial") {
    tryPut(doorX + ox + sx, doorY + oy + side, "z");
    tryPut(doorX + ox - sx, doorY + oy - side, "d");
  } else if (theme === "clinic") {
    tryPut(doorX + ox * 2, doorY + oy * 2, "!");
    signs.push("回春堂·药幌");
    tryPut(doorX + ox + sx, doorY + oy + side, "j");
    tryPut(doorX + ox - sx, doorY + oy - side, "j");
  }
}

/** 按年龄×职业赋 sprite / palette（优先 npc.ts） */
export function assignNpcSprite(talker: { id: string; faction?: string }): {
  sprite: string;
  palette: string;
  age?: string;
  attire?: string;
} {
  const fromNpc = npcById(talker.id);
  if (fromNpc) return npcAssignSprite(talker);
  const meta = talkerMeta(talker.id);
  if (meta) return { sprite: meta.sprite, palette: meta.palette, age: "mid", attire: "plain" };
  const faction = (talker.faction ?? "folk") as keyof typeof LUO_FACTION_SPRITE;
  const row = LUO_FACTION_SPRITE[faction] ?? LUO_FACTION_SPRITE.folk;
  return { sprite: row.sprite, palette: row.palette, age: "mid", attire: "plain" };
}

/** 进入场景时从 standSpots 抽站位（相对原点抖动） */
export function pickTalkerStand(
  id: string,
  baseX: number,
  baseY: number,
  occupied: Set<string>,
  walkable: (x: number, y: number) => boolean,
): { x: number; y: number } {
  const fromNpc = npcById(id);
  const meta = talkerMeta(id);
  const spots = fromNpc?.standSpots ?? meta?.standSpots ?? [[0, 0], [1, 0], [-1, 0], [0, 1]];
  const order = [...spots].sort(() => Math.random() - 0.5);
  for (const [dx, dy] of order) {
    const x = baseX + dx;
    const y = baseY + dy;
    const k = `${x},${y}`;
    if (occupied.has(k)) continue;
    if (!walkable(x, y)) continue;
    return { x, y };
  }
  return { x: baseX, y: baseY };
}

export interface ReachFix {
  building: string;
  doorX: number;
  doorY: number;
  action: "clearProp" | "nudgeDoor";
  detail: string;
}

const REACH_BLOCK = new Set("#~^%".split(""));
const REACH_PROP = new Set("vbptj&gdkfmyzuqhic*,o".split(""));

function doorReachable(g: string[], doorX: number, doorY: number): boolean {
  const h = g.length;
  const w = g[0]?.length ?? 0;
  const seen = new Set<string>();
  const q: { x: number; y: number }[] = [{ x: doorX, y: doorY }];
  seen.add(`${doorX},${doorY}`);
  while (q.length) {
    const cur = q.shift()!;
    const ch = gridGet(g, cur.x, cur.y);
    if (ch === "=" || ch === "-") return true;
    for (const [dx, dy] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ] as const) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const k = `${nx},${ny}`;
      if (seen.has(k)) continue;
      const nch = gridGet(g, nx, ny);
      if (REACH_BLOCK.has(nch)) continue;
      if (REACH_PROP.has(nch)) continue;
      seen.add(k);
      q.push({ x: nx, y: ny });
    }
  }
  return false;
}

/** 门洞 `:` / 门户字母 → 主路 BFS；堵死则清门口物件或沿墙挪门 */
export function validateReachability(
  g: string[],
  doors: { key: string; doorX: number; doorY: number; doorCh?: string }[],
): ReachFix[] {
  const fixes: ReachFix[] = [];
  for (const d of doors) {
    let { doorX, doorY } = d;
    const doorCh = d.doorCh ?? gridGet(g, doorX, doorY);
    if (doorReachable(g, doorX, doorY)) continue;
    // ① 清门口 1 格内物件
    let cleared = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = doorX + dx;
        const ny = doorY + dy;
        const ch = gridGet(g, nx, ny);
        if (REACH_PROP.has(ch)) {
          gridSet(g, nx, ny, ".");
          cleared += 1;
        }
      }
    }
    if (cleared) {
      fixes.push({
        building: d.key,
        doorX,
        doorY,
        action: "clearProp",
        detail: `cleared ${cleared} props near door`,
      });
    }
    if (doorReachable(g, doorX, doorY)) continue;
    // ② 沿墙挪门到最近可通路
    let best: { x: number; y: number; dist: number } | null = null;
    for (let y = 0; y < g.length; y++) {
      for (let x = 0; x < (g[0]?.length ?? 0); x++) {
        const ch = gridGet(g, x, y);
        if (ch !== "#" && ch !== ":") continue;
        // 候选：墙邻空地且能通到路
        for (const [dx, dy] of [
          [0, 1],
          [0, -1],
          [1, 0],
          [-1, 0],
        ] as const) {
          const fx = x + dx;
          const fy = y + dy;
          const floor = gridGet(g, fx, fy);
          if (floor !== "." && floor !== "=" && floor !== "-") continue;
          // 试把门开在 (x,y)
          const dist = Math.abs(x - doorX) + Math.abs(y - doorY);
          if (dist === 0 || dist > 12) continue;
          const prev = gridGet(g, x, y);
          gridSet(g, doorX, doorY, "#");
          gridSet(g, x, y, doorCh === ":" || doorCh === "#" ? ":" : doorCh);
          const ok = doorReachable(g, x, y);
          gridSet(g, x, y, prev);
          gridSet(g, doorX, doorY, doorCh);
          if (!ok) continue;
          if (!best || dist < best.dist) best = { x, y, dist };
        }
      }
    }
    if (best) {
      gridSet(g, doorX, doorY, "#");
      gridSet(g, best.x, best.y, doorCh === "#" ? ":" : doorCh);
      fixes.push({
        building: d.key,
        doorX: best.x,
        doorY: best.y,
        action: "nudgeDoor",
        detail: `nudged from ${doorX},${doorY} → ${best.x},${best.y}`,
      });
      doorX = best.x;
      doorY = best.y;
    }
  }
  return fixes;
}

/** 按 NPC companion / role 在身旁落配套物件（不堵门、不叠人） */
export function spawnCompanionProps(
  g: string[],
  npc: { id: string; x: number; y: number; companion?: string | null },
  occupied: Set<string>,
): { ch: string; x: number; y: number; tag: string }[] {
  const full = npcById(npc.id);
  const key = npc.companion ?? full?.companion ?? npc.id;
  const specs = COMPANION_PROPS[key] ?? COMPANION_PROPS[full?.role ?? ""] ?? [];
  const placed: { ch: string; x: number; y: number; tag: string }[] = [];
  for (const spec of specs) {
    const candidates = [
      [spec.dx, spec.dy],
      [spec.dy, spec.dx],
      [-spec.dx, spec.dy],
      [spec.dx, -spec.dy],
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0],
    ] as const;
    for (const [dx, dy] of candidates) {
      const x = npc.x + dx;
      const y = npc.y + dy;
      const k = `${x},${y}`;
      if (occupied.has(k)) continue;
      const cur = gridGet(g, x, y);
      // 只落空地，禁止上路堵干道
      if (cur !== ".") continue;
      // 不堵门/城门传送
      const nearDoor = [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ].some(([ax, ay]) => {
        const c = gridGet(g, x + ax, y + ay);
        return c === ":" || "GFDWE".includes(c);
      });
      if (nearDoor) continue;
      gridSet(g, x, y, spec.ch);
      occupied.add(k);
      placed.push({ ch: spec.ch, x, y, tag: spec.tag });
      break;
    }
  }
  return placed;
}

export type WallVariantMode = "battlement" | "double";

/** 墙变体：默认墙垛(1.3×) + 墙脚主题装饰；可选双字符 ##（不默认启用） */
export function renderWallVariant(
  g: string[],
  building: { key: string; spriteTheme: string; x: number; y: number; w: number; h: number },
  mode: WallVariantMode = "battlement",
): void {
  const { x, y, w, h, spriteTheme } = building;
  const tryPut = (px: number, py: number, ch: string) => {
    if (gridGet(g, px, py) !== ".") return;
    // 不堵门洞邻格
    for (const [dx, dy] of [
      [0, 0],
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ] as const) {
      const c = gridGet(g, px + dx, py + dy);
      if (c === ":" || c === "G" || c === "F" || c === "D" || c === "W" || c === "E") return;
    }
    gridSet(g, px, py, ch);
  };
  // 墙垛：仅四角各一根桩，禁止沿墙密植（曾导致木桩泛滥）
  if (mode === "battlement") {
    tryPut(x, y - 1, "p");
    tryPut(x + w - 1, y - 1, "p");
    tryPut(x, y + h, "p");
    tryPut(x + w - 1, y + h, "p");
  } else if (mode === "double") {
    // 双字符方案：外墙外侧再描一圈 #（仅空地；回滚删此外圈即可）
    for (let i = 0; i < w; i++) {
      if (gridGet(g, x + i, y) === "#") tryPut(x + i, y - 1, "#");
      if (gridGet(g, x + i, y + h - 1) === "#") tryPut(x + i, y + h, "#");
    }
    for (let j = 0; j < h; j++) {
      if (gridGet(g, x, y + j) === "#") tryPut(x - 1, y + j, "#");
      if (gridGet(g, x + w - 1, y + j) === "#") tryPut(x + w, y + j, "#");
    }
  }
  // 墙脚主题装饰
  if (spriteTheme === "yamen" || spriteTheme === "jail") {
    tryPut(x + 1, y + h, "p");
    tryPut(x + w - 2, y + h, "p");
    tryPut(x + Math.floor(w / 2), y - 1, "h");
  } else if (spriteTheme === "home") {
    tryPut(x + 2, y + h, "j");
    tryPut(x + w - 3, y + h, "v");
  } else if (spriteTheme === "yanbo" || spriteTheme === "brothel") {
    for (const d of [1, 3, 5]) tryPut(x + d, y - 1, "l");
  } else if (spriteTheme === "martial") {
    tryPut(x + 1, y + h, "z");
    tryPut(x + w - 2, y + h, "d");
  } else if (spriteTheme === "clinic") {
    tryPut(x + 2, y + h, "j");
    tryPut(x + w - 3, y + h, "&");
  } else if (spriteTheme === "taibai" || spriteTheme === "wine") {
    tryPut(x + 2, y + h, "b");
    tryPut(x + w - 3, y - 1, "l");
  }
}

/** 可选：整图外墙双线加粗（默认不用） */
export function thickenWallsDouble(g: string[]): void {
  const h = g.length;
  const w = g[0]?.length ?? 0;
  const add: { x: number; y: number }[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (gridGet(g, x, y) !== "#") continue;
      for (const [dx, dy] of [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ] as const) {
        const nx = x + dx;
        const ny = y + dy;
        if (gridGet(g, nx, ny) === ".") add.push({ x: nx, y: ny });
      }
    }
  }
  for (const p of add) gridSet(g, p.x, p.y, "#");
}

export type { LuoTalkerDef, LuoNpcFull };
