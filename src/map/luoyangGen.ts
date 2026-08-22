/**
 * 洛阳·天津桥 —— 专属大城生成器
 * 多进院 / 功能陈设 / 分区 NPC；仅输出既有 ASCII 图例（#.=:~%^ 等），不引入未解析字符。
 */
import type { ChapterId, EnemyId } from "../game/types";
import type { GateKind, ItemId, SceneId, SealId } from "./types";
import type { MetroScene } from "./metro";
import {
  applyBuildingTheme,
  furnishByTemplate,
  renderBuildingName,
  validateReachability,
  spawnCompanionProps,
  renderWallVariant,
} from "./metro";
import { buildingByYard, LUO_PORTAL_PRISON, LUO_PORTAL_YANBO } from "./luoyangMeta";
import { capAllFurnishings, capFurnishing, placeNpc, cellKey, ensureFurnishingMins, type PlaceOcc } from "./placement";
import { npcById } from "./npc";

export type YardFn =
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
  | "shed";

export interface CourtyardConfig {
  jin: 1 | 2 | 3;
  fn: YardFn;
  x: number;
  y: number;
  w: number;
  h: number;
  /** 外门朝向（朝街/朝桥） */
  door: "n" | "s" | "e" | "w";
  /** 可选 mark 字母（生成后可清） */
  mark?: string;
}

function blank(w: number, h: number, fill = "."): string[] {
  return Array.from({ length: h }, () => fill.repeat(w));
}

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

function hroad(g: string[], y: number, x0: number, x1: number): void {
  for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
    const c = get(g, x, y);
    if (c === "#" || c === "~" || c === "^" || c === "%") continue;
    if ("NSEWUDYLK".includes(c)) continue;
    set(g, x, y, "=");
  }
}

function vroad(g: string[], x: number, y0: number, y1: number): void {
  for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) {
    const c = get(g, x, y);
    if (c === "#" || c === "~" || c === "^" || c === "%") continue;
    if ("NSEWUDYLK".includes(c)) continue;
    set(g, x, y, "=");
  }
}

function punchWater(g: string[], x: number, y: number): void {
  const c = get(g, x, y);
  if (c === "~" || c === "%" || c === "^") set(g, x, y, ".");
}

/** 多进院落：外墙 #、门洞 :、内隔墙；不输出 Unicode 墙符（解析层不认）。 */
export function generateCourtyard(g: string[], cfg: CourtyardConfig): { doorX: number; doorY: number } {
  const { x, y, w, h, jin, fn, door } = cfg;
  rect(g, x, y, x + w - 1, y + h - 1, "#");
  rect(g, x + 1, y + 1, x + w - 2, y + h - 2, ".");

  const midX = x + Math.floor(w / 2);
  const midY = y + Math.floor(h / 2);
  let doorX = midX;
  let doorY = y + h - 1;
  if (door === "s") {
    doorX = midX;
    doorY = y + h - 1;
  } else if (door === "n") {
    doorX = midX;
    doorY = y;
  } else if (door === "e") {
    doorX = x + w - 1;
    doorY = midY;
  } else {
    doorX = x;
    doorY = midY;
  }
  set(g, doorX, doorY, ":");

  // 进数隔墙（留中门）
  const splits: number[] = [];
  if (jin >= 2) splits.push(y + Math.floor(h / (jin + 1)));
  if (jin >= 3) splits.push(y + Math.floor((2 * h) / (jin + 1)));
  for (const sy of splits) {
    if (sy <= y + 1 || sy >= y + h - 2) continue;
    for (let xx = x + 1; xx < x + w - 1; xx++) {
      if (xx === midX) set(g, xx, sy, ":");
      else set(g, xx, sy, "#");
    }
  }

  furnishRoom(g, x + 1, y + 1, w - 2, h - 2, fn, door);
  if (cfg.mark) set(g, midX, midY, cfg.mark);
  // 角灯
  set(g, x + 1, y + 1, "l");
  set(g, x + w - 2, y + 1, "l");
  set(g, x + 1, y + h - 2, "l");
  set(g, x + w - 2, y + h - 2, "l");
  return { doorX, doorY };
}

function clearAxis(
  _g: string[],
  _ix0: number,
  _iy0: number,
  iw: number,
  ih: number,
  door: "n" | "s" | "e" | "w",
  lx: number,
  ly: number,
): boolean {
  const midX = Math.floor(iw / 2);
  const midY = Math.floor(ih / 2);
  if (door === "n" || door === "s") return Math.abs(lx - midX) <= 1 && ly > 0 && ly < ih - 1;
  return Math.abs(ly - midY) <= 1 && lx > 0 && lx < iw - 1;
}

/** 房间陈设模板：贴墙靠角，门轴留走道。 */
export function furnishRoom(
  g: string[],
  x0: number,
  y0: number,
  iw: number,
  ih: number,
  fn: YardFn,
  door: "n" | "s" | "e" | "w",
): void {
  const put = (lx: number, ly: number, ch: string) => {
    if (lx < 0 || ly < 0 || lx >= iw || ly >= ih) return;
    if (clearAxis(g, x0, y0, iw, ih, door, lx, ly)) return;
    const x = x0 + lx;
    const y = y0 + ly;
    if (get(g, x, y) === "#" || get(g, x, y) === ":") return;
    set(g, x, y, ch);
  };
  const R = iw - 1;
  const B = ih - 1;
  if (fn === "yamen") {
    put(0, 1, "m");
    put(R, 1, "z");
    put(0, B - 1, "i");
    put(R, B - 1, "j");
    put(1, B, ",");
    put(R - 1, B, ",");
  } else if (fn === "jail") {
    put(0, 1, "k");
    put(R, 1, "v");
    put(0, B - 1, "c");
    put(R, B - 1, "l");
  } else if (fn === "brothel") {
    put(0, 1, "u");
    put(R, 1, "h");
    put(0, B - 1, "g");
    put(R, B - 1, "y");
    put(Math.floor(R / 2), 0, "&");
  } else if (fn === "wine") {
    put(0, 1, "y");
    put(2, 1, "t");
    put(R, 1, "j");
    put(0, B - 1, "o");
    put(R, B - 1, "*");
    put(Math.floor(R / 2), B, ",");
  } else if (fn === "martial") {
    put(0, 1, "d");
    put(R, 1, "c");
    put(0, B - 1, "z");
    put(R, B - 1, "&"); // 松
    put(Math.floor(R / 2), B, "v");
    put(Math.floor(R / 2), 1, "z");
  } else if (fn === "clinic") {
    put(0, 1, "k");
    put(R, 1, "j");
    put(0, B - 1, "z");
    put(R, B - 1, "v");
    put(Math.floor(R / 2), B - 1, "&"); // 竹意象树
  } else if (fn === "pawn") {
    put(0, 1, "q");
    put(R, 1, "i");
    put(0, B - 1, "v");
    put(R, B - 1, "q");
  } else if (fn === "temple") {
    put(Math.floor(R / 2), 1, "g");
    put(0, Math.floor(B / 2), "h");
    put(R, Math.floor(B / 2), "h");
    put(0, B - 1, ",");
  } else if (fn === "post") {
    put(0, 1, "p");
    put(R, 1, "v");
    put(0, B - 1, "j");
    put(R, B - 1, "p");
  } else if (fn === "shop") {
    put(0, 1, "v");
    put(R, 1, "v");
    put(0, B - 1, ",");
    put(R, B - 1, ",");
    put(Math.floor(R / 2), B, "p");
  } else if (fn === "home") {
    put(0, 1, "u");
    put(R, 1, "y");
    put(0, B - 1, "o");
    put(R, B - 1, "j");
    put(Math.floor(R / 2), Math.floor(B / 2), "t"); // 石凳
  } else {
    put(0, 1, "v");
    put(R, 1, "o");
    put(0, B - 1, "j");
  }
}

function jitter(seed: number, n: number): number {
  return ((seed * 1103515245 + 12345) >>> 0) % n;
}

function placeChar(g: string[], x: number, y: number, ch: string, occupied: Set<string>): boolean {
  const cur = get(g, x, y);
  if (cur !== "." && cur !== "=" && cur !== ":") return false;
  if (occupied.has(`${x},${y}`)) return false;
  set(g, x, y, ch);
  occupied.add(`${x},${y}`);
  return true;
}

function eavesSpot(
  doorX: number,
  doorY: number,
  door: "n" | "s" | "e" | "w",
  seed: number,
): { x: number; y: number }[] {
  const dx = door === "e" ? 1 : door === "w" ? -1 : 0;
  const dy = door === "s" ? 1 : door === "n" ? -1 : 0;
  const out: { x: number; y: number }[] = [];
  for (const step of [2, 1, 3]) {
    const bx = doorX + dx * step;
    const by = doorY + dy * step;
    const side = (jitter(seed + step, 5) - 2) as number;
    if (dx !== 0) out.push({ x: bx, y: by + side }, { x: bx, y: by - side || 1 });
    else out.push({ x: bx + side, y: by }, { x: bx - side || 1, y: by });
  }
  return out;
}

export interface LuoNpcSpec {
  ch: string;
  id: string;
  near: "yamen" | "wine" | "brothel" | "martial" | "clinic" | "pawn" | "temple" | "post" | "shop" | "market" | "gate" | "bridge";
}

/** 洛阳全图：十字水街 + 十二处功能建筑 + 分区 NPC。 */
export function generateLuoyang(): MetroScene {
  const W = 84;
  const H = 54;
  const cx = Math.floor(W / 2);
  const cy = Math.floor(H / 2);
  const g = blank(W, H, ".");
  for (let x = 0; x < W; x++) {
    set(g, x, 0, "#");
    set(g, x, H - 1, "#");
  }
  for (let y = 0; y < H; y++) {
    set(g, 0, y, "#");
    set(g, W - 1, y, "#");
  }

  // 洛水横贯（中带）+ 南北岸 %
  for (let x = 1; x < W - 1; x++) {
    for (let dy = -2; dy <= 2; dy++) set(g, x, cy + dy, "~");
    set(g, x, cy - 3, "%");
    set(g, x, cy + 3, "%");
  }
  // 天津桥三线纵贯，冲开水面
  for (let y = 1; y < H - 1; y++) {
    for (const dx of [-1, 0, 1]) {
      punchWater(g, cx + dx, y);
      set(g, cx + dx, y, "=");
    }
  }
  // 桥亭
  rect(g, cx - 3, cy - 1, cx + 3, cy + 1, "#");
  for (const dx of [-1, 0, 1]) {
    set(g, cx + dx, cy - 1, ":");
    set(g, cx + dx, cy + 1, ":");
    set(g, cx + dx, cy, "=");
  }
  set(g, cx, cy, "@");

  // 横支官道（避开深水，靠岸）
  hroad(g, cy - 5, 2, W - 3);
  hroad(g, cy + 5, 2, W - 3);
  hroad(g, 10, 2, cx - 3);
  hroad(g, 10, cx + 3, W - 3);
  hroad(g, H - 11, 2, cx - 3);
  hroad(g, H - 11, cx + 3, W - 3);
  vroad(g, 14, 2, cy - 4);
  vroad(g, W - 15, 2, cy - 4);
  vroad(g, 16, cy + 4, H - 3);
  vroad(g, W - 17, cy + 4, H - 3);

  const yards: (CourtyardConfig & { key: string })[] = [
    { key: "yamen", jin: 3, fn: "yamen", x: 4, y: 3, w: 14, h: 12, door: "e", mark: "a" },
    { key: "jail", jin: 1, fn: "jail", x: 4, y: 16, w: 10, h: 7, door: "e", mark: "z" },
    { key: "martial", jin: 2, fn: "martial", x: W - 18, y: 3, w: 13, h: 11, door: "w", mark: "B" },
    { key: "clinic", jin: 1, fn: "clinic", x: W - 16, y: 16, w: 11, h: 8, door: "w", mark: "c" },
    { key: "wine", jin: 2, fn: "wine", x: 5, y: cy + 6, w: 13, h: 10, door: "e", mark: "E" },
    { key: "brothel", jin: 2, fn: "brothel", x: W - 19, y: cy + 6, w: 14, h: 11, door: "w", mark: "§" },
    { key: "pawn", jin: 1, fn: "pawn", x: 22, y: 4, w: 10, h: 7, door: "s", mark: "d" },
    { key: "temple", jin: 1, fn: "temple", x: 48, y: 4, w: 10, h: 7, door: "s", mark: "I" },
    { key: "post", jin: 1, fn: "post", x: 24, y: H - 14, w: 11, h: 8, door: "n", mark: "h" },
    { key: "shop1", jin: 1, fn: "shop", x: cx - 18, y: cy - 12, w: 8, h: 6, door: "s", mark: "s" },
    { key: "shop2", jin: 1, fn: "shop", x: cx + 8, y: cy - 12, w: 8, h: 6, door: "s", mark: "t" },
    { key: "shop3", jin: 1, fn: "shop", x: cx - 10, y: cy + 7, w: 8, h: 6, door: "n", mark: "u" },
    { key: "home1", jin: 1, fn: "home", x: 3, y: H - 12, w: 8, h: 6, door: "n" },
    { key: "home2", jin: 1, fn: "home", x: W - 12, y: H - 12, w: 8, h: 6, door: "n" },
    { key: "shed", jin: 1, fn: "shed", x: cx + 10, y: H - 13, w: 7, h: 5, door: "n", mark: "J" },
  ];

  const doors = new Map<string, { doorX: number; doorY: number; door: CourtyardConfig["door"] }>();
  for (const yd of yards) {
    const d = generateCourtyard(g, yd);
    doors.set(yd.key, { ...d, door: yd.door });
    // 门前短支路
    const { doorX, doorY } = d;
    if (yd.door === "e") hroad(g, doorY, doorX + 1, Math.min(W - 2, doorX + 4));
    if (yd.door === "w") hroad(g, doorY, Math.max(1, doorX - 4), doorX - 1);
    if (yd.door === "s") vroad(g, doorX, doorY + 1, Math.min(H - 2, doorY + 3));
    if (yd.door === "n") vroad(g, doorX, Math.max(1, doorY - 3), doorY - 1);
  }

  // 院墙若压住东西干道 cy-5，在 cy-4 补旁路（不挪建筑，只开廊道）
  const bypass = (y: number) => {
    for (let x = 2; x < W - 2; x++) {
      const c = get(g, x, y);
      if (c === "#" || c === "~" || c === "^") continue;
      if (c === "." || c === "%" || c === "=" || c === ",") set(g, x, y, "=");
    }
  };
  bypass(cy - 4);
  bypass(cy + 4);
  // 把旁路接到城门 W/E
  for (let y = cy - 5; y <= cy - 4; y++) {
    for (let x = 2; x <= 5; x++) {
      const c = get(g, x, y);
      if (c === "#" || c === "~") continue;
      set(g, x, y, "=");
    }
    for (let x = W - 6; x <= W - 3; x++) {
      const c = get(g, x, y);
      if (c === "#" || c === "~") continue;
      set(g, x, y, "=");
    }
  }
  // 东门：若 clinic 南墙压道，从旁路向 E 拉通
  for (let x = cx; x < W - 1; x++) {
    const y = cy - 4;
    const c = get(g, x, y);
    if (c === "#" || c === "~" || c === "^") continue;
    set(g, x, y, "=");
  }
  set(g, W - 2, cy - 5, "E");
  set(g, W - 2, cy - 4, "=");
  set(g, W - 3, cy - 4, "=");

  // 南市摊位簇（桥南空地）
  const market = { x: cx + 5, y: cy + 8 };
  for (const [dx, dy, ch] of [
    [0, 0, ","],
    [1, 0, "p"],
    [2, 1, ","],
    [0, 2, "l"],
    [-1, 1, "v"],
    [3, 0, "p"],
    [1, 2, ","],
    [-2, 0, "l"],
  ] as const) {
    if (get(g, market.x + dx, market.y + dy) === ".") set(g, market.x + dx, market.y + dy, ch);
  }

  // 东南丘陵
  for (let y = H - 14; y < H - 1; y++) {
    for (let x = W - 16; x < W - 1; x++) {
      const dx = x - (W - 8);
      const dy = y - (H - 7);
      if (dx * dx + dy * dy * 1.2 < 70 && get(g, x, y) === ".") set(g, x, y, "^");
    }
  }

  // 疏密树（错落，非网格）
  const seed = 9041;
  for (let y = 3; y < H - 3; y++) {
    for (let x = 3; x < W - 3; x++) {
      if (get(g, x, y) !== ".") continue;
      if (Math.abs(x - cx) <= 2) continue;
      const beside = [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([a, b]) => get(g, x + a, y + b) === "=");
      if (beside) continue;
      if ((x * 19 + y * 41 + seed) % 13 === 0) set(g, x, y, "&");
      else if ((x * 7 + y * 11 + seed) % 29 === 0) {
        set(g, x, y, "&");
        if (get(g, x + 1, y) === ".") set(g, x + 1, y, "&");
      }
    }
  }

  // 门户（既有连通：D→偃师、W→陕州、E→汴京）
  set(g, cx - 1, 1, "#");
  set(g, cx, 1, "D");
  set(g, cx + 1, 1, "#");
  for (let y = 2; y < cy; y++) for (const dx of [-1, 0, 1]) {
    punchWater(g, cx + dx, y);
    set(g, cx + dx, y, "=");
  }
  set(g, 1, cy - 5, "W");
  set(g, 1, cy - 6, "#");
  set(g, 2, cy - 5, "=");
  set(g, 2, cy - 4, "="); // 旁路接入，勿用墙封死
  hroad(g, cy - 5, 2, cx - 2);
  set(g, W - 2, cy - 5, "E");
  set(g, W - 2, cy - 6, "#");
  set(g, W - 3, cy - 5, "=");
  set(g, W - 3, cy - 4, "=");
  hroad(g, cy - 5, cx + 2, W - 3);

  // 城门片段（定鼎意象：北缘瓮城感）
  for (let x = cx - 6; x <= cx + 6; x++) {
    if (get(g, x, 2) === ".") set(g, x, 2, "#");
  }
  set(g, cx, 2, "=");
  // 告示
  if (get(g, cx + 5, 4) === "." || get(g, cx + 5, 4) === "=") set(g, cx + 5, 5, "!");
  if (get(g, market.x, market.y - 2) === ".") set(g, market.x, market.y - 2, "!");

  const occupied = new Set<string>();
  occupied.add(`${cx},${cy}`);

  const talkers: Record<string, string> = {};
  /** 每个 talker 字母只保留这一格，其余同字母（陈设冲突）清回地面 */
  const talkerCell = new Map<string, { x: number; y: number }>();
  const placeTalk = (ch: string, id: string, spots: { x: number; y: number }[]) => {
    for (const s of spots) {
      if (placeChar(g, s.x, s.y, ch, occupied)) {
        talkers[ch] = id;
        talkerCell.set(ch, { x: s.x, y: s.y });
        return true;
      }
    }
    return false;
  };

  const nearDoor = (key: string, n = 8) => {
    const d = doors.get(key);
    if (!d) return [] as { x: number; y: number }[];
    const out: { x: number; y: number }[] = [];
    const { doorX, doorY, door } = d;
    if (door === "s") out.push({ x: doorX, y: doorY + 1 }, { x: doorX - 1, y: doorY + 1 }, { x: doorX + 1, y: doorY + 1 });
    if (door === "n") out.push({ x: doorX, y: doorY - 1 }, { x: doorX - 1, y: doorY - 1 }, { x: doorX + 1, y: doorY - 1 });
    if (door === "e") out.push({ x: doorX + 1, y: doorY }, { x: doorX + 1, y: doorY - 1 }, { x: doorX + 1, y: doorY + 1 });
    if (door === "w") out.push({ x: doorX - 1, y: doorY }, { x: doorX - 1, y: doorY - 1 }, { x: doorX - 1, y: doorY + 1 });
    return out.concat(eavesSpot(doorX, doorY, door, seed + key.length)).slice(0, n);
  };

  // 具名 NPC：大写 / 数字（避开门户 DWEFG、敌位 1–4）
  placeTalk("J", "judge", nearDoor("yamen"));
  placeTalk("N", "caseclerk", nearDoor("yamen"));
  placeTalk("B", "luoBailiff", nearDoor("yamen"));
  placeTalk("5", "luoClerk", nearDoor("yamen"));
  placeTalk("K", "luoCoach", [
    { x: W - 20, y: 15 },
    { x: W - 22, y: 14 },
    ...nearDoor("martial"),
  ]);
  placeTalk("X", "luoDoctor", nearDoor("clinic"));
  placeTalk("P", "luoBarkeeper", nearDoor("wine"));
  placeTalk("6", "luoCook", nearDoor("wine"));
  placeTalk("A", "luoAsha", nearDoor("brothel"));
  placeTalk("M", "luoMadam", nearDoor("brothel"));
  placeTalk("V", "luoVendor", nearDoor("pawn"));
  placeTalk("H", "luoHerb", nearDoor("shop1"));
  placeTalk("O", "luoAntique", nearDoor("shop2"));
  placeTalk("R", "luoRaconteur", nearDoor("shop3").concat([{ x: market.x + 2, y: market.y + 3 }]));
  placeTalk("T", "luoTemple", [
    { x: 48, y: 12 },
    { x: 50, y: 12 },
    ...nearDoor("temple"),
  ]);
  placeTalk("U", "luoPost", nearDoor("post"));
  placeTalk("Q", "passClerk", [
    { x: cx + 2, y: 3 },
    { x: 3, y: cy - 5 },
    { x: W - 4, y: cy - 5 },
  ]);
  placeTalk("S", "townWatch", [
    { x: cx - 3, y: 4 },
    { x: cx + 3, y: 5 },
  ]);
  placeTalk("7", "messenger", nearDoor("post"));
  placeTalk("8", "rumorTea", [
    { x: market.x - 1, y: market.y + 2 },
    { x: market.x + 4, y: market.y },
  ]);
  placeTalk("9", "luoHawker", [
    { x: market.x + 1, y: market.y - 1 },
    { x: market.x - 2, y: market.y + 1 },
    { x: market.x + 3, y: market.y + 2 },
  ]);
  placeTalk("L", "luoGate", [
    { x: 10, y: 5 },
    { x: W - 10, y: 5 },
    { x: cx - 5, y: 6 },
  ]);
  placeTalk("Y", "luoMusician", nearDoor("brothel"));
  placeTalk("Z", "luoDisciple", [
    { x: W - 20, y: 14 },
    ...nearDoor("martial"),
  ]);
  placeTalk("0", "luoJailer", nearDoor("jail"));

  /** 院内空地候选（不堵门） */
  const yardFloors = (key: string): { x: number; y: number }[] => {
    const yd = yards.find((y) => y.key === key);
    if (!yd) return [];
    const door = doors.get(key);
    const out: { x: number; y: number }[] = [];
    for (let yy = yd.y + 1; yy < yd.y + yd.h - 1; yy++) {
      for (let xx = yd.x + 1; xx < yd.x + yd.w - 1; xx++) {
        if (get(g, xx, yy) !== ".") continue;
        if (door && Math.abs(xx - door.doorX) + Math.abs(yy - door.doorY) <= 1) continue;
        out.push({ x: xx, y: yy });
      }
    }
    return out;
  };

  const placeYardNpc = (ch: string, id: string, yardKey: string) => {
    if (talkers[ch] && talkers[ch] !== id) return false;
    const spots = yardFloors(yardKey);
    for (let i = 0; i < spots.length; i++) {
      const s = spots[(i * 7 + seed) % spots.length]!;
      if (placeChar(g, s.x, s.y, ch, occupied)) {
        talkers[ch] = id;
        talkerCell.set(ch, { x: s.x, y: s.y });
        return true;
      }
    }
    // 门口备选
    return placeTalk(ch, id, nearDoor(yardKey));
  };

  // 院内密度填充（已落具名的跳过字母冲突时换位）
  const EXTRA: { id: string; ch: string; yard: string }[] = [
    { id: "luoJailer2", ch: "I", yard: "jail" },
    { id: "luoPrisoner", ch: "h", yard: "jail" },
    { id: "luoWaiter", ch: "n", yard: "wine" },
    { id: "luoWaiter2", ch: "s", yard: "wine" },
    { id: "luoGuest", ch: "w", yard: "wine" },
    { id: "luoGuest2", ch: "x", yard: "wine" },
    { id: "luoFlower", ch: "e", yard: "wine" },
    { id: "luoGirl", ch: "$", yard: "brothel" },
    { id: "luoGirl2", ch: "+", yard: "brothel" },
    { id: "luoTurtle", ch: "/", yard: "brothel" },
    { id: "luoEmbroid", ch: "r", yard: "brothel" },
    { id: "luoDisciple2", ch: "?", yard: "martial" },
    { id: "luoDisciple3", ch: "_", yard: "martial" },
    { id: "luoYardHand", ch: "(", yard: "martial" },
    { id: "luoHerbBoy", ch: ")", yard: "clinic" },
    { id: "luoHerb2", ch: "[", yard: "clinic" },
    { id: "luoShopHand", ch: "]", yard: "shop1" },
    { id: "luoShopWife", ch: "g", yard: "shop1" },
    { id: "luoElder", ch: "{", yard: "home1" },
    { id: "luoElder2", ch: "}", yard: "home2" },
    { id: "luoKid", ch: "|", yard: "home1" },
    { id: "luoKid2", ch: "'", yard: "home2" },
    { id: "luoWife", ch: "`", yard: "home1" },
    { id: "luoWasher", ch: "m", yard: "home2" },
    { id: "luoBeggar", ch: "a", yard: "shop3" },
    { id: "luoTeaGirl", ch: "d", yard: "shop3" },
    { id: "butcher", ch: "※", yard: "shed" },
  ];
  for (const ex of EXTRA) {
    // 优先门外可达点，避免院门被陈设封死后困死
    if (!placeTalk(ex.ch, ex.id, nearDoor(ex.yard, 12))) {
      placeYardNpc(ex.ch, ex.id, ex.yard);
    }
  }

  // 路人：小写字母，随后 uniquify 只留一格
  const crowdIds = ["roadHawker", "rumorTea", "townHawker", "docker", "carter", "barber"];
  // 严禁占用陈设字母 v(箱)/p(桩)/i(架)/t(凳)——否则配套扫描会把全城箱子当成车夫刷车
  const crowdPoolSafe = [">", "<", ";", "·", "‡", "†"];
  for (let i = 0; i < crowdPoolSafe.length; i++) {
    const ox = jitter(seed + i * 3, 9) - 4;
    const oy = jitter(seed + i * 5, 7) - 3;
    const x = market.x + ox;
    const y = market.y + oy;
    if (Math.abs(x - cx) <= 1) continue;
    const ch = crowdPoolSafe[i]!;
    if (placeChar(g, x, y, ch, occupied)) {
      talkers[ch] = crowdIds[i % crowdIds.length]!;
      talkerCell.set(ch, { x, y });
    }
  }

  // 清掉与 talker 字母撞车的陈设重复格——仅小写（大写允许多格同 id）
  for (const [ch, keep] of talkerCell) {
    if (ch.length === 1 && ch >= "A" && ch <= "Z") continue;
    if (ch >= "0" && ch <= "9") continue;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (get(g, x, y) !== ch) continue;
        if (x === keep.x && y === keep.y) continue;
        set(g, x, y, ".");
      }
    }
  }

  // 金吾卫 / 漕帮匪（可打）
  const npcs: Record<string, EnemyId> = {
    "1": "jinwu",
    "2": "canalThug",
    "3": "brothelGuard",
    "4": "jailer",
  };
  const foeSpots = [
    { ch: "1", x: cx + 6, y: 8 },
    { ch: "2", x: cx - 5, y: cy + 9 },
    { ch: "3", x: W - 22, y: cy + 8 },
    { ch: "4", x: 15, y: 18 },
  ];
  for (const f of foeSpots) {
    if (get(g, f.x, f.y) === "." && !occupied.has(`${f.x},${f.y}`)) {
      set(g, f.x, f.y, f.ch);
      occupied.add(`${f.x},${f.y}`);
    }
  }

  // 清 mark：只清院心一格（禁止整院同字母抹除——会误删木桶/NPC）
  for (const yd of yards) {
    if (!yd.mark) continue;
    const mx = yd.x + Math.floor(yd.w / 2);
    const my = yd.y + Math.floor(yd.h / 2);
    if (get(g, mx, my) === yd.mark) set(g, mx, my, ".");
  }

  // 可达性：从 @ 洪水，挪困住 talker
  const BLOCK = new Set("vbptj&gdkfmyzuqhic*,".split(""));
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
      const ch = get(g, nx, ny);
      if (ch === "#" || ch === "~" || ch === "^" || ch === "%") continue;
      if (BLOCK.has(ch)) continue;
      reach.add(k);
      rq.push({ x: nx, y: ny });
    }
  }
  const rescueFloor = (): { x: number; y: number } | null => {
    for (let y = 2; y < H - 2; y++) {
      for (let x = 2; x < W - 2; x++) {
        if (get(g, x, y) !== ".") continue;
        if (!reach.has(`${x},${y}`)) continue;
        if (Math.abs(x - cx) <= 1) continue;
        if (occupied.has(`${x},${y}`)) continue;
        return { x, y };
      }
    }
    return null;
  };
  for (const [ch] of Object.entries(talkers)) {
    let px = -1;
    let py = -1;
    for (let y = 0; y < H; y++) {
      const x = g[y]!.indexOf(ch);
      if (x >= 0) {
        px = x;
        py = y;
        break;
      }
    }
    if (px < 0) continue;
    const ok = [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ].some(([dx, dy]) => reach.has(`${px + dx},${py + dy}`));
    if (ok) continue;
    const spot = rescueFloor();
    if (!spot) continue;
    set(g, px, py, ".");
    set(g, spot.x, spot.y, ch);
    occupied.delete(`${px},${py}`);
    occupied.add(`${spot.x},${spot.y}`);
  }

  // 宽度校验
  for (let i = 0; i < g.length; i++) {
    if (g[i]!.length !== W) throw new Error(`luoyang row ${i} width ${g[i]!.length} != ${W}`);
  }

  // ─── 表现层补全（不定墙体/道路/建筑外框；仅加密室内、挂牌、主题地标、子场景门）───
  const nameSigns: string[] = [
    "西陕州。东汴京。南偃师。河南府衙在桥北。",
    "天津桥市集。平康坊东，酒楼西。金吾夜巡。",
  ];
  for (const yd of yards) {
    const def = buildingByYard(yd.key);
    const doorInfo = doors.get(yd.key);
    if (!def || !doorInfo) continue;
    // 加密陈设：只填室内 `.`
    furnishByTemplate(g, def.furnishTemplate, yd.x + 1, yd.y + 1, yd.w - 2, yd.h - 2, yd.door);
    if (yd.key === "brothel") {
      furnishByTemplate(g, "yanboStage", yd.x + 2, yd.y + 2, Math.max(4, yd.w - 4), Math.max(3, Math.floor(yd.h / 2) - 1), yd.door);
    }
    if (yd.key === "wine") {
      furnishByTemplate(g, "taibaiPrivate", yd.x + 2, yd.y + 2, Math.max(4, yd.w - 4), Math.max(3, Math.floor(yd.h / 2) - 1), yd.door);
    }
    renderBuildingName(g, def, doorInfo.doorX, doorInfo.doorY, yd.door, nameSigns);
    applyBuildingTheme(g, def, doorInfo.doorX, doorInfo.doorY, yd.door, nameSigns);
    // 墙垛 + 墙脚主题（默认 1.3×，不改 # 厚）
    renderWallVariant(
      g,
      { key: yd.key, spriteTheme: def.spriteTheme, x: yd.x, y: yd.y, w: yd.w, h: yd.h },
      "battlement",
    );
  }

  // 水边柳/荷：桥畔与渠岸补树
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      if (get(g, x, y) !== ".") continue;
      const waterNear = [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ].some(([dx, dy]) => get(g, x + dx, y + dy) === "~");
      if (!waterNear) continue;
      if ((x * 17 + y * 31 + seed) % 11 !== 0) continue;
      if (occupied.has(`${x},${y}`)) continue;
      set(g, x, y, "&");
    }
  }

  // 门洞可达性修复（清门口物件 / 微调门位，不挪建筑外框）
  const doorList = [...doors.entries()].map(([key, d]) => ({
    key,
    doorX: d.doorX,
    doorY: d.doorY,
    doorCh: get(g, d.doorX, d.doorY),
  }));
  const reachFixes = validateReachability(g, doorList);
  for (const f of reachFixes) {
    if (f.action !== "nudgeDoor") continue;
    const d = doors.get(f.building);
    if (d) {
      d.doorX = f.doorX;
      d.doorY = f.doorY;
    }
  }

  // 子场景门：牢房 / 烟波 外门同坐标由 : 改为门户字母（不挪位置）
  const jailDoor = doors.get("jail");
  if (jailDoor) set(g, jailDoor.doorX, jailDoor.doorY, LUO_PORTAL_PRISON);
  const brothelDoor = doors.get("brothel");
  if (brothelDoor) set(g, brothelDoor.doorX, brothelDoor.doorY, LUO_PORTAL_YANBO);

  // 配套物件：只在 talkerCell 登记点生成（禁止按字母全图扫描——箱柜 v / 墙垛 p 会触发假车夫刷车）
  let cartLeft = 8;
  for (const [ch, pos] of talkerCell) {
    const id = talkers[ch];
    if (!id) continue;
    if (get(g, pos.x, pos.y) !== ch) continue;
    const placed = spawnCompanionProps(g, { id, x: pos.x, y: pos.y }, occupied);
    for (const p of placed) {
      if (p.ch !== "f") continue;
      cartLeft -= 1;
      if (cartLeft < 0) {
        set(g, p.x, p.y, ".");
        occupied.delete(`${p.x},${p.y}`);
      }
    }
  }

  // 清干道上的配套物件（车/箱/桩不得占 =）
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const ch = get(g, x, y);
      if (ch !== "f" && ch !== "v" && ch !== "p" && ch !== "b") continue;
      // 若邻格是干道门户或本不该在路心：检查四邻是否多为路
      let roads = 0;
      for (const [dx, dy] of [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ] as const) {
        if (get(g, x + dx, y + dy) === "=") roads += 1;
        if ("DWE".includes(get(g, x + dx, y + dy))) roads += 2;
      }
      if (roads >= 2) {
        set(g, x, y, ".");
        occupied.delete(`${x},${y}`);
      }
    }
  }

  // 最终清门口：门/门户邻格物件与挡路 NPC 一律挪开
  const PROP_CLEAR = new Set("vbptj&gdkfmyzuqhic*,oalfzr".split(""));
  const clearApproach = (dx: number, dy: number) => {
    if (dx < 0 || dy < 0) return;
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        const x = dx + ox;
        const y = dy + oy;
        const ch = get(g, x, y);
        if (PROP_CLEAR.has(ch) && !talkers[ch]) {
          set(g, x, y, ".");
          occupied.delete(`${x},${y}`);
          continue;
        }
        // 挡门 NPC：挪到院内或门外远处
        if (!talkers[ch]) continue;
        if (x === dx && y === dy) continue; // 门户字母本身可留
        if ("GFDWE".includes(ch)) continue;
        const spot = (() => {
          for (const [ax, ay] of [
            [2, 0],
            [-2, 0],
            [0, 2],
            [0, -2],
            [2, 2],
            [-2, 2],
            [3, 0],
            [0, 3],
          ] as const) {
            const nx = dx + ax;
            const ny = dy + ay;
            if (get(g, nx, ny) !== ".") continue;
            if (occupied.has(`${nx},${ny}`)) continue;
            return { x: nx, y: ny };
          }
          return null;
        })();
        if (!spot) continue;
        set(g, x, y, ".");
        set(g, spot.x, spot.y, ch);
        occupied.delete(`${x},${y}`);
        occupied.add(`${spot.x},${spot.y}`);
        talkerCell.set(ch, { x: spot.x, y: spot.y });
      }
    }
  };
  for (const d of doors.values()) clearApproach(d.doorX, d.doorY);

  // 再次洪水：把困死的 talker 挪到可达空地
  const reach2 = new Set<string>();
  const rq2: { x: number; y: number }[] = [{ x: cx, y: cy }];
  reach2.add(`${cx},${cy}`);
  while (rq2.length) {
    const cur = rq2.pop()!;
    for (const [dx, dy] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ] as const) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      const k = `${nx},${ny}`;
      if (reach2.has(k)) continue;
      const ch = get(g, nx, ny);
      if (ch === "#" || ch === "~" || ch === "^" || ch === "%") continue;
      if (PROP_CLEAR.has(ch) && !talkers[ch]) continue;
      reach2.add(k);
      rq2.push({ x: nx, y: ny });
    }
  }
  const rescue2 = (): { x: number; y: number } | null => {
    for (let y = 2; y < H - 2; y++) {
      for (let x = 2; x < W - 2; x++) {
        if (get(g, x, y) !== ".") continue;
        if (!reach2.has(`${x},${y}`)) continue;
        if (occupied.has(`${x},${y}`)) continue;
        return { x, y };
      }
    }
    return null;
  };
  for (const [ch] of Object.entries(talkers)) {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (get(g, x, y) !== ch) continue;
        const ok =
          reach2.has(`${x},${y}`) ||
          [
            [0, 1],
            [0, -1],
            [1, 0],
            [-1, 0],
          ].some(([dx, dy]) => reach2.has(`${x + dx},${y + dy}`));
        if (ok) continue;
        const spot = rescue2();
        if (!spot) continue;
        set(g, x, y, ".");
        set(g, spot.x, spot.y, ch);
        occupied.delete(`${x},${y}`);
        occupied.add(`${spot.x},${spot.y}`);
        talkerCell.set(ch, { x: spot.x, y: spot.y });
      }
    }
  }

  // 再次 uniquify：仅小写
  for (const [ch, keep] of talkerCell) {
    if (ch.length === 1 && ch >= "A" && ch <= "Z") continue;
    if (ch >= "0" && ch <= "9") continue;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (get(g, x, y) !== ch) continue;
        if (x === keep.x && y === keep.y) continue;
        set(g, x, y, ".");
      }
    }
  }

  // 干道清障：东西门廊道（cy-5）与南北桥轴（cx）上不得站人/挡路物件
  const clearArterial = (x: number, y: number) => {
    const ch = get(g, x, y);
    if (talkers[ch]) {
      const spot = (() => {
        for (const [ax, ay] of [
          [0, 2],
          [0, -2],
          [2, 0],
          [-2, 0],
          [1, 2],
          [-1, 2],
        ] as const) {
          const nx = x + ax;
          const ny = y + ay;
          if (get(g, nx, ny) !== ".") continue;
          if (occupied.has(`${nx},${ny}`)) continue;
          if (nx === cx || ny === cy - 5) continue;
          return { x: nx, y: ny };
        }
        return null;
      })();
      if (spot) {
        set(g, x, y, ".");
        set(g, spot.x, spot.y, ch);
        occupied.delete(`${x},${y}`);
        occupied.add(`${spot.x},${spot.y}`);
        talkerCell.set(ch, spot);
      }
    } else if ("fvpb&".includes(ch)) {
      set(g, x, y, "=");
      occupied.delete(`${x},${y}`);
    }
  };
  for (let x = 1; x < W - 1; x++) clearArterial(x, cy - 5);
  for (let y = 1; y < H - 1; y++) clearArterial(cx, y);

  // —— 先限频车/桶等（语义补种放到门廊清障之后，避免被抹掉）——
  capAllFurnishings(g);

  const occNpc: PlaceOcc = new Set();
  const talkerPositions: { ch: string; id: string; x: number; y: number }[] = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const ch = get(g, x, y);
      const id = talkers[ch];
      if (!id) continue;
      talkerPositions.push({ ch, id, x, y });
      occNpc.add(cellKey(x, y));
    }
  }
  const placeFails: string[] = [];
  for (const tp of talkerPositions) {
    const cur = get(g, tp.x, tp.y);
    if (cur === tp.ch && cur !== "#" && cur !== "~" && cur !== "^" && cur !== "%") {
      continue;
    }
    const meta = npcById(tp.id);
    const yd = meta?.yard ? yards.find((y) => y.key === meta.yard) : undefined;
    const yardBox = yd ? { x: yd.x, y: yd.y, w: yd.w, h: yd.h } : undefined;
    occNpc.delete(cellKey(tp.x, tp.y));
    const placed = placeNpc(g, { id: tp.id, ch: tp.ch, x: tp.x, y: tp.y }, occNpc, yardBox);
    if (!placed.ok) placeFails.push(`${tp.id}: ${placed.reason}`);
    talkerCell.set(tp.ch, { x: placed.to.x, y: placed.to.y });
  }
  if (placeFails.length) {
    throw new Error(`洛阳 NPC 落点失败（禁止静默丢弃）:\n${placeFails.join("\n")}`);
  }

  // 落地率：缺失则强制重落（报错清单，禁止静默丢弃）
  const missingOnGrid: string[] = [];
  for (const [ch, id] of Object.entries(talkers)) {
    const pos = talkerCell.get(ch);
    if (pos && get(g, pos.x, pos.y) === ch) continue;
    // 扫描全图是否仍有该字母
    let found: { x: number; y: number } | null = null;
    for (let y = 0; y < H && !found; y++) {
      for (let x = 0; x < W; x++) {
        if (get(g, x, y) === ch) {
          found = { x, y };
          break;
        }
      }
    }
    if (found) {
      talkerCell.set(ch, found);
      continue;
    }
    const meta = npcById(id);
    const yd = meta?.yard ? yards.find((y) => y.key === meta.yard) : undefined;
    const yardBox = yd ? { x: yd.x, y: yd.y, w: yd.w, h: yd.h } : undefined;
    const prefer = pos ?? (yd ? { x: yd.x + 2, y: yd.y + 2 } : { x: market.x, y: market.y });
    const placed = placeNpc(g, { id, ch, x: prefer.x, y: prefer.y }, occNpc, yardBox);
    if (!placed.ok) missingOnGrid.push(`${id}(${ch}): ${placed.reason}`);
    else talkerCell.set(ch, { x: placed.to.x, y: placed.to.y });
  }
  if (missingOnGrid.length) {
    throw new Error(`洛阳 NPC 未上图: ${missingOnGrid.join(", ")}`);
  }
  if (Object.keys(talkers).length < 30) {
    throw new Error(`洛阳 NPC 过少: ${Object.keys(talkers).length} < 30`);
  }

  // 最终：旁路干道 + 东/西门接入（防院墙再次封死）
  for (let x = 2; x < W - 2; x++) {
    for (const y of [cy - 4, cy + 4]) {
      const c = get(g, x, y);
      if (c === "#" || c === "~" || c === "^") continue;
      if (!talkers[c]) set(g, x, y, "=");
    }
  }
  // 院墙压住 cy-5 时开一格廊道（只改干道行上的墙，保留进深墙体）
  for (let x = 2; x < W - 2; x++) {
    if (get(g, x, cy - 5) === "#") set(g, x, cy - 5, "=");
  }
  set(g, 1, cy - 5, "W");
  set(g, W - 2, cy - 5, "E");
  for (const [x, y] of [
    [2, cy - 5],
    [2, cy - 4],
    [3, cy - 4],
    [W - 3, cy - 5],
    [W - 3, cy - 4],
    [W - 4, cy - 4],
  ] as const) {
    if (!talkers[get(g, x, y)]) set(g, x, y, "=");
  }

  // 每扇门：清 3×3 物件，门外一格强制可走，保证院落连通
  for (const [key, d] of doors) {
    const ch = get(g, d.doorX, d.doorY);
    if (ch === "#") set(g, d.doorX, d.doorY, ":");
    for (let oy = -2; oy <= 2; oy++) {
      for (let ox = -2; ox <= 2; ox++) {
        const x = d.doorX + ox;
        const y = d.doorY + oy;
        const c = get(g, x, y);
        if (talkers[c]) continue;
        if ("GFDWE".includes(c)) continue;
        if (PROP_CLEAR.has(c) || c === "f") {
          set(g, x, y, ".");
          occupied.delete(`${x},${y}`);
        }
      }
    }
    const ox = d.door === "e" ? 1 : d.door === "w" ? -1 : 0;
    const oy = d.door === "s" ? 1 : d.door === "n" ? -1 : 0;
    for (const step of [1, 2, 3, 4, 5, 6]) {
      const x = d.doorX + ox * step;
      const y = d.doorY + oy * step;
      const c = get(g, x, y);
      if (c === "~" || c === "^") break;
      if (talkers[c] || "GFDWE".includes(c)) continue;
      // 穿薄墙开廊，接到主路
      if (c === "#" || c === "." || c === "=" || PROP_CLEAR.has(c)) set(g, x, y, "=");
    }
    void key;
  }

  // —— 门廊清障之后：语义补种多类物件 + 再 cap ——
  {
    const wineDoor = doors.get("wine");
    const postDoor = doors.get("post");
    const templeDoor = doors.get("temple");
    const clinicDoor = doors.get("clinic");
    const wineYard = yards.find((y) => y.key === "wine");
    const postYard = yards.find((y) => y.key === "post");
    ensureFurnishingMins(
      g,
      {
        barrel: 4,
        tree: 12,
        lantern: 8,
        jar: 3,
        brazier: 3,
        stall: 4,
        well: 1,
        stele: 1,
        cart: 2,
      },
      [
        {
          kind: "barrel",
          spots: wineYard
            ? [
                { x: wineYard.x + 2, y: wineYard.y + wineYard.h - 3 },
                { x: wineYard.x + 3, y: wineYard.y + wineYard.h - 3 },
                { x: wineYard.x + 4, y: wineYard.y + wineYard.h - 4 },
                { x: wineYard.x + 2, y: wineYard.y + 2 },
              ]
            : [],
        },
        {
          kind: "tree",
          spots: [
            { x: cx - 4, y: cy - 3 },
            { x: cx + 4, y: cy - 3 },
            { x: 8, y: 22 },
            { x: W - 10, y: 22 },
            { x: market.x + 1, y: market.y + 5 },
          ],
        },
        {
          kind: "lantern",
          spots: [...doors.values()].flatMap((d) => [
            { x: d.doorX + 1, y: d.doorY + 1 },
            { x: d.doorX - 1, y: d.doorY - 1 },
          ]),
        },
        {
          kind: "jar",
          spots: wineYard
            ? [
                { x: wineYard.x + wineYard.w - 3, y: wineYard.y + 2 },
                { x: wineYard.x + wineYard.w - 4, y: wineYard.y + 3 },
                { x: wineYard.x + wineYard.w - 3, y: wineYard.y + 4 },
              ]
            : [],
        },
        {
          kind: "brazier",
          spots: wineYard
            ? [
                { x: wineYard.x + 5, y: wineYard.y + wineYard.h - 3 },
                { x: wineYard.x + 6, y: wineYard.y + wineYard.h - 4 },
              ]
            : [],
        },
        {
          kind: "stall",
          spots: [
            { x: market.x - 2, y: market.y },
            { x: market.x + 2, y: market.y },
            { x: market.x, y: market.y + 2 },
            { x: market.x - 1, y: market.y - 1 },
            { x: market.x + 3, y: market.y + 1 },
            { x: market.x + 1, y: market.y - 2 },
          ],
        },
        {
          kind: "well",
          spots: [
            { x: market.x - 5, y: market.y + 2 },
            { x: 18, y: cy + 4 },
          ],
        },
        {
          kind: "stele",
          spots: [
            { x: cx + 3, y: cy - 3 },
            ...(templeDoor ? [{ x: templeDoor.doorX + 2, y: templeDoor.doorY + 2 }] : []),
          ],
        },
        {
          kind: "cart",
          spots: [
            ...(postYard
              ? [
                  { x: postYard.x + 2, y: postYard.y + postYard.h - 2 },
                  { x: postYard.x + 3, y: postYard.y + postYard.h - 3 },
                ]
              : []),
            { x: market.x + 6, y: market.y + 1 },
            { x: cx - 7, y: cy + 3 },
            { x: 12, y: cy + 2 },
          ],
        },
      ],
      occupied,
    );
    void wineDoor;
    void postDoor;
    void clinicDoor;
    capFurnishing(g, "cart", 8);
    capFurnishing(g, "barrel", 6);
    capFurnishing(g, "tree", 15);
    capFurnishing(g, "lantern", 10);
    capFurnishing(g, "jar", 4);
    capFurnishing(g, "post", 10);
  }

  return {
    id: "luoyang" as SceneId,
    chapter: "court" as ChapterId,
    name: "洛阳·天津桥",
    kicker: "洛阳",
    enter:
      "天津桥三线石面。洛水横贯，府衙在北，平康在南东，酒旗在南西。桥亭有人验帖，市集里声杂。",
    mood: "桥上风硬。案卷比刀响。",
    ascii: g,
    npcs,
    talkers,
    portals: {
      D: { to: "yanshi", at: "W" },
      W: { to: "shanzhou", at: "E" },
      E: { to: "bianjing", at: "W" },
      [LUO_PORTAL_PRISON]: { to: "luoyang_yamen_prison" as SceneId, at: "A" },
      [LUO_PORTAL_YANBO]: { to: "luoyang_yanbo_inner" as SceneId, at: "A" },
    },
    order: [] as SealId[],
    gate: "open" as GateKind,
    signs: nameSigns,
    items: {} as Record<string, ItemId>,
  };
}
