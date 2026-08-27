/**
 * 洛阳·天津桥 —— 专属大城生成器
 * 多进院 / 功能陈设 / 分区 NPC；仅输出既有 ASCII 图例（#.=:~%^ 等），不引入未解析字符。
 */
import type { ChapterId, EnemyId } from "../game/types";
import type { GateKind, ItemId, SceneId, SealId } from "./types";
import type { MetroScene } from "./metro";
import {
  applyBuildingTheme,
  renderBuildingName,
  validateReachability,
  spawnCompanionProps,
  renderWallVariant,
} from "./metro";
import { buildingByYard } from "./luoyangMeta";
import { capAllFurnishings, capFurnishing, placeNpc, cellKey, ensureFurnishingMins, type PlaceOcc } from "./placement";
import { npcById } from "./npc";
import {
  encodeMarkId,
  makePortalMark,
  makeTalkerMark,
  type EntityMark,
  makeBarrierMark,
} from "./entityMarks";
import {
  W as LUO_W,
  H as LUO_H,
  cx as LUO_CX,
  cy as LUO_CY,
  LUOYANG_YARD_DEFS,
  LUOYANG_BRIDGES,
  LUOYANG_L_SHAPE_KEYS,
  V73_TREE_MIN,
  V73_TREE_MAX,
  V73_LANTERN_MAX,
  YINGTIAN_GATE,
  carveLuoyangRiver,
  punchRiverBridge,
  paintImperialAxis,
  paintPalaceWalls,
  finalizeV73Lanterns,
  plantV73Lanterns,
  sweepBareOutdoor,
  fillBlankWindows6,
  southGarden,
  fixShoreRoads,
  enforceTreeDensity,
  topUpV73Trees,
  stripArterialTrees,
  ensureV73TreeMin,
  type LuoyangYardDef,
} from "./luoyangV73";
import {
  activateFangYards,
  riverBankSpots,
  wellAdjSpots,
  trimLanternRuns,
  LUOYANG_WELLS,
  npcOnBindSpot,
  riverColumnsOk,
  tianjinWaterHeadsOk,
  countWells,
  V74_WELL_MAX,
} from "./luoyangV74";

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
  | "shed"
  | "sixDoors"
  | "garrison"
  | "silk"
  | "smith";

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
  /** courtyard=带围墙大院；street=临街开放铺面 */
  form?: "courtyard" | "street";
  /** L 形 footprint（切角或附翼） */
  lShape?: boolean;
  wing?: { x: number; y: number; w: number; h: number };
}

/**
 * 临街小铺（V4）：无黑墙、无马路巨型柜台。
 * 主体=小房子 H；门口仅单格幌/摊/灯；掌柜站屋侧（靠墙），顾客站门前空地。
 */
export function generateStreetShop(
  g: string[],
  cfg: CourtyardConfig,
): {
  doorX: number;
  doorY: number;
  behindX: number;
  behindY: number;
  front: { x: number; y: number }[];
} {
  const { x, y, w, h, fn, door } = cfg;
  rect(g, x, y, x + w - 1, y + h - 1, ".");

  const midX = x + Math.floor(w / 2);
  const midY = y + Math.floor(h / 2);
  let doorX = midX;
  let doorY = y + h - 1;
  let houseX = midX;
  let houseY = y;
  let behindX = midX;
  let behindY = y;
  const front: { x: number; y: number }[] = [];

  if (door === "s") {
    doorX = midX;
    doorY = y + h - 1;
    houseX = midX;
    houseY = y + 1;
    behindX = midX - 1;
    behindY = y + 1;
    front.push({ x: midX, y: doorY }, { x: midX - 1, y: doorY }, { x: midX + 1, y: doorY });
  } else if (door === "n") {
    doorX = midX;
    doorY = y;
    houseX = midX;
    houseY = y + h - 2;
    behindX = midX + 1;
    behindY = y + h - 2;
    front.push({ x: midX, y: doorY }, { x: midX - 1, y: doorY }, { x: midX + 1, y: doorY });
  } else if (door === "e") {
    doorX = x + w - 1;
    doorY = midY;
    houseX = x + 1;
    houseY = midY;
    behindX = x + 1;
    behindY = midY - 1;
    front.push({ x: doorX, y: midY }, { x: doorX, y: midY - 1 }, { x: doorX, y: midY + 1 });
  } else {
    doorX = x;
    doorY = midY;
    houseX = x + w - 2;
    houseY = midY;
    behindX = x + w - 2;
    behindY = midY + 1;
    front.push({ x: doorX, y: midY }, { x: doorX, y: midY - 1 }, { x: doorX, y: midY + 1 });
  }

  set(g, houseX, houseY, "H");
  // 门口单格点缀（绝不放 q 柜台）
  const sideX = door === "e" || door === "w" ? doorX : Math.max(x, doorX - 1);
  const sideY = door === "e" || door === "w" ? Math.max(y, doorY - 1) : doorY;
  if (!(sideX === houseX && sideY === houseY)) {
    if (fn === "clinic" || fn === "pawn") set(g, sideX, sideY, "l");
    else if (fn === "shed") set(g, sideX, sideY, "b");
    else set(g, sideX, sideY, "e"); // 单格幌/摊
  }
  set(g, doorX, doorY, ",");
  return { doorX, doorY, behindX, behindY, front };
}

/** 室外大地图禁止的室内家具字母 */
const INDOOR_ONLY = new Set(["h", "u"]);

function neighborWater(g: string[], x: number, y: number): boolean {
  let n = 0;
  for (const [dx, dy] of [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ] as const) {
    const c = get(g, x + dx, y + dy);
    if (c === "~" || c === "%") n += 1;
  }
  return n >= 2;
}

/** 清洗室外幽灵墙：屏风/床榻清掉；水/路/山上的室内家具清掉。 */
export function sanitizeOutdoorLuoyang(g: string[], cx: number, cy: number): void {
  const H = g.length;
  const W = g[0]?.length ?? 0;
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const ch = get(g, x, y);
      if (!INDOOR_ONLY.has(ch)) continue;
      if (y === cy - 5 || y === cy + 5 || y === cy || Math.abs(x - cx) <= 1) set(g, x, y, "=");
      else if (neighborWater(g, x, y)) set(g, x, y, "~");
      else set(g, x, y, ".");
    }
  }
}

/** 相邻院落之间强制 2 格通道（只切开空地/草地之间的贴墙缝）。 */
export function ensureYardAlleys(
  g: string[],
  yards: { x: number; y: number; w: number; h: number }[],
): void {
  for (let i = 0; i < yards.length; i++) {
    for (let j = i + 1; j < yards.length; j++) {
      const a = yards[i]!;
      const b = yards[j]!;
      const overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      const overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      if (overlapY >= 3 && overlapX <= 0) {
        const left = a.x < b.x ? a : b;
        const right = a.x < b.x ? b : a;
        const gap = right.x - (left.x + left.w);
        if (gap >= 1 && gap <= 2) {
          const y0 = Math.max(a.y, b.y) + 1;
          const y1 = Math.min(a.y + a.h, b.y + b.h) - 2;
          for (let y = y0; y <= y1; y++) {
            for (let x = left.x + left.w; x < right.x; x++) {
              const c = get(g, x, y);
              if (c === "#" || c === ".") set(g, x, y, "=");
            }
          }
        }
      }
      if (overlapX >= 3 && overlapY <= 0) {
        const top = a.y < b.y ? a : b;
        const bot = a.y < b.y ? b : a;
        const gap = bot.y - (top.y + top.h);
        if (gap >= 1 && gap <= 2) {
          const x0 = Math.max(a.x, b.x) + 1;
          const x1 = Math.min(a.x + a.w, b.x + b.w) - 2;
          for (let x = x0; x <= x1; x++) {
            for (let y = top.y + top.h; y < bot.y; y++) {
              const c = get(g, x, y);
              if (c === "#" || c === ".") set(g, x, y, "=");
            }
          }
        }
      }
    }
  }
}

function cellIsVacant(ch: string): boolean {
  return ch === "." || ch === ",";
}

/** 在 15×15 真空里点一处民居/井/树丛，消灭超级空地。 */
export function fillVacuumPatches(g: string[], W: number, H: number): void {
  const planted: { x: number; y: number }[] = [];
  const far = (x: number, y: number) => planted.every((p) => Math.abs(p.x - x) + Math.abs(p.y - y) > 10);
  for (let y = 2; y < H - 16; y++) {
    for (let x = 2; x < W - 16; x++) {
      let empty = 0;
      let blocked = false;
      for (let dy = 0; dy < 15 && !blocked; dy++) {
        for (let dx = 0; dx < 15; dx++) {
          const ch = get(g, x + dx, y + dy);
          if (ch === "~" || ch === "%" || ch === "^" || ch === "#" || ch === "=" || ch === "H") {
            blocked = true;
            break;
          }
          if (cellIsVacant(ch)) empty += 1;
        }
      }
      if (blocked || empty < 15 * 15 * 0.85) continue;
      const px = x + 5;
      const py = y + 5;
      if (!far(px, py)) continue;
      if (!cellIsVacant(get(g, px, py))) continue;
      // 5×4 小宅：围墙+俯视门+井+树
      rect(g, px, py, px + 4, py + 3, "#");
      rect(g, px + 1, py + 1, px + 3, py + 2, ".");
      set(g, px + 2, py + 3, ":");
      set(g, px + 3, py + 3, ":");
      set(g, px + 1, py + 1, "n");
      set(g, px + 3, py + 1, "&");
      set(g, px + 1, py + 2, "j");
      planted.push({ x: px, y: py });
      glueCottageToRoad(g, px, py, W, H);
    }
  }
}

/** 真空小宅门前拉 2 格宽支路，接到最近的巷/干道。 */
function glueCottageToRoad(g: string[], px: number, py: number, W: number, H: number): void {
  const doorX = px + 2;
  const doorY = py + 3;
  let best: { x: number; y: number; dist: number } | null = null;
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      if (get(g, x, y) !== "=") continue;
      const dist = Math.abs(x - doorX) + Math.abs(y - doorY);
      if (dist < 2 || dist > 16) continue;
      if (!best || dist < best.dist) best = { x, y, dist };
    }
  }
  if (!best) return;
  const sx = Math.sign(best.x - doorX);
  const sy = Math.sign(best.y - doorY);
  let x = doorX;
  let y = doorY + 1;
  for (let i = 0; i < 20 && (x !== best.x || y !== best.y); i++) {
    if (x !== best.x) x += sx;
    else if (y !== best.y) y += sy;
    for (const [ox, oy] of [
      [0, 0],
      [sx === 0 ? 1 : 0, sy === 0 ? 1 : 0],
    ] as const) {
      const c = get(g, x + ox, y + oy);
      if (c === "#" || c === "~" || c === "^" || c === "%") continue;
      if ("NSEWUDYLK;@".includes(c)) continue;
      set(g, x + ox, y + oy, "=");
    }
  }
}

export type NpcBindMode = "inYard" | "atDoor" | "atRiver" | "atWell";
export interface NpcBinding {
  npcId: string;
  buildingId: string;
  mode: NpcBindMode;
}

/** 室外 NPC 全部绑建筑，禁止自由坐标。阿砂/狱卒主卒不在此表（子场景）。 */
export const NPC_BINDINGS: NpcBinding[] = [
  { npcId: "judge", buildingId: "yamen", mode: "inYard" },
  { npcId: "caseclerk", buildingId: "yamen", mode: "inYard" },
  { npcId: "luoBailiff", buildingId: "yamen", mode: "inYard" },
  { npcId: "luoClerk", buildingId: "yamen", mode: "inYard" },
  { npcId: "luoConstable", buildingId: "sixDoors", mode: "inYard" },
  { npcId: "luoConstable2", buildingId: "sixDoors", mode: "inYard" },
  { npcId: "luoCaptain", buildingId: "garrison", mode: "inYard" },
  { npcId: "luoGuard", buildingId: "garrison", mode: "inYard" },
  { npcId: "luoGuard2", buildingId: "luoyangGate", mode: "atDoor" },
  { npcId: "luoCoach", buildingId: "martial", mode: "inYard" },
  { npcId: "luoDisciple", buildingId: "martial", mode: "inYard" },
  { npcId: "luoDisciple2", buildingId: "martial", mode: "inYard" },
  { npcId: "luoDisciple3", buildingId: "martial", mode: "atDoor" },
  { npcId: "luoYardHand", buildingId: "martial", mode: "inYard" },
  { npcId: "luoBarkeeper", buildingId: "wine", mode: "inYard" },
  { npcId: "luoCook", buildingId: "wine", mode: "inYard" },
  { npcId: "luoWaiter", buildingId: "wine", mode: "inYard" },
  { npcId: "luoWaiter2", buildingId: "wine", mode: "atDoor" },
  { npcId: "luoRaconteur", buildingId: "tianjinMarket", mode: "inYard" },
  { npcId: "luoGuest", buildingId: "tianjinMarket", mode: "inYard" },
  { npcId: "luoGuest2", buildingId: "tianjinMarket", mode: "inYard" },
  { npcId: "luoFlower", buildingId: "tianjinMarket", mode: "inYard" },
  { npcId: "luoHawker", buildingId: "tianjinMarket", mode: "inYard" },
  { npcId: "rumorTea", buildingId: "tianjinMarket", mode: "inYard" },
  { npcId: "luoBeggar", buildingId: "tianjinMarket", mode: "inYard" },
  { npcId: "luoMadam", buildingId: "brothel", mode: "inYard" },
  { npcId: "luoMusician", buildingId: "brothel", mode: "inYard" },
  { npcId: "luoGirl", buildingId: "brothel", mode: "inYard" },
  { npcId: "luoGirl2", buildingId: "brothel", mode: "atDoor" },
  { npcId: "luoTurtle", buildingId: "brothel", mode: "inYard" },
  { npcId: "luoEmbroid", buildingId: "brothel", mode: "atDoor" },
  { npcId: "luoDoctor", buildingId: "clinic", mode: "inYard" },
  { npcId: "luoHerbBoy", buildingId: "clinic", mode: "atDoor" },
  { npcId: "luoHerb", buildingId: "clinic", mode: "atDoor" },
  { npcId: "luoShopHand", buildingId: "shop1", mode: "atDoor" },
  { npcId: "luoShopWife", buildingId: "shop1", mode: "atDoor" },
  { npcId: "luoHerb2", buildingId: "shop3", mode: "atDoor" },
  { npcId: "butcher", buildingId: "shop3", mode: "inYard" },
  { npcId: "luoVendor", buildingId: "pawn", mode: "inYard" },
  { npcId: "luoSilk", buildingId: "silk", mode: "inYard" },
  { npcId: "luoSmith", buildingId: "smith", mode: "inYard" },
  { npcId: "barber", buildingId: "shop4", mode: "atDoor" },
  { npcId: "luoTeaGirl", buildingId: "shop5", mode: "atDoor" },
  { npcId: "townHawker", buildingId: "westGate", mode: "atDoor" },
  { npcId: "carter", buildingId: "shed2", mode: "inYard" },
  { npcId: "luoAntique", buildingId: "shop2", mode: "inYard" },
  { npcId: "luoTemple", buildingId: "templeOffice", mode: "atDoor" },
  { npcId: "luoPost", buildingId: "post", mode: "inYard" },
  { npcId: "messenger", buildingId: "eastGate", mode: "atDoor" },
  { npcId: "passClerk", buildingId: "luoyangGate", mode: "atDoor" },
  { npcId: "townWatch", buildingId: "luoyangGate", mode: "atDoor" },
  { npcId: "luoGate", buildingId: "yingtian", mode: "atDoor" },
  { npcId: "roadHawker", buildingId: "westMarket", mode: "atDoor" },
  { npcId: "docker", buildingId: "shed", mode: "atDoor" },
  { npcId: "luoJailer2", buildingId: "jail", mode: "inYard" },
  { npcId: "luoPrisoner", buildingId: "jail", mode: "inYard" },
  { npcId: "luoElder", buildingId: "home1", mode: "atWell" },
  { npcId: "luoElder2", buildingId: "southGarden", mode: "inYard" },
  { npcId: "luoKid", buildingId: "home1", mode: "atDoor" },
  { npcId: "luoKid2", buildingId: "home2", mode: "inYard" },
  { npcId: "luoWife", buildingId: "home1", mode: "inYard" },
  { npcId: "luoWasher", buildingId: "luoRiver", mode: "atRiver" },
];

export const LUOYANG_PLAZAS = [
  { key: "bridgeNorth", x: 39, y: 20, w: 7, h: 4 },
  { key: "yingtianFore", x: 39, y: 8, w: 7, h: 3 },
] as const;

export function inLuoyangPlaza(x: number, y: number): boolean {
  return LUOYANG_PLAZAS.some((p) => x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h);
}

function punchAxisThrough(g: string[], cfg: { x: number; y: number; w: number; h: number }, axisCx: number): void {
  if (cfg.y <= 1 && cfg.h >= 7) {
    set(g, YINGTIAN_GATE.x0, YINGTIAN_GATE.y, ":");
    set(g, axisCx, YINGTIAN_GATE.y, "H");
    set(g, YINGTIAN_GATE.x1, YINGTIAN_GATE.y, ":");
  }
  const left = 40;
  const right = 44;
  if (cfg.x > right || cfg.x + cfg.w - 1 < left) return;
  for (let y = cfg.y; y < cfg.y + cfg.h; y++) {
    if (y === YINGTIAN_GATE.y) continue;
    for (let x = left; x <= right; x++) {
      if (x < cfg.x || x > cfg.x + cfg.w - 1) continue;
      const edge = y === cfg.y || y === cfg.y + cfg.h - 1;
      if (y === 1 && x === axisCx) {
        set(g, x, y, "D");
        continue;
      }
      if (edge) set(g, x, y, ":");
      else {
        const c = get(g, x, y);
        if (c === "#" || c === ".") set(g, x, y, "=");
      }
    }
  }
}

const DRESS_CH = ["!", ",", "f"] as const;

/** 路肩点缀：邻 = 的空地约六成放下幌/灯/摊/车，不占马路。 */
export function dressRoadEdges(
  g: string[],
  doors: Iterable<{ doorX: number; doorY: number; door: "n" | "s" | "e" | "w" }>,
  skipBoxes: { x: number; y: number; w: number; h: number }[],
  cx: number,
  cy: number,
): void {
  const W = g[0]?.length ?? 0;
  const H = g.length;
  const doorFront = new Set<string>();
  for (const d of doors) {
    doorFront.add(`${d.doorX},${d.doorY}`);
    const ox = d.door === "e" ? 1 : d.door === "w" ? -1 : 0;
    const oy = d.door === "s" ? 1 : d.door === "n" ? -1 : 0;
    doorFront.add(`${d.doorX + ox},${d.doorY + oy}`);
  }
  const inSkip = (x: number, y: number) =>
    skipBoxes.some((b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h);
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      if (get(g, x, y) !== ".") continue;
      if (Math.abs(x - cx) <= 1) continue;
      if (y === cy - 5 || y === cy + 5 || y === cy) continue;
      if (doorFront.has(`${x},${y}`)) continue;
      if (inSkip(x, y) && !inLuoyangPlaza(x, y)) continue;
      let road = false;
      for (const [dx, dy] of [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ] as const) {
        if (get(g, x + dx, y + dy) === "=") road = true;
      }
      if (!road) continue;
      const n = (x * 31 + y * 17) % 10;
      if (inLuoyangPlaza(x, y)) {
        if (n < 5) set(g, x, y, "!");
        continue;
      }
      if (n >= 9) continue;
      const ch = DRESS_CH[n % (DRESS_CH.length - (n === 6 ? 1 : 0))]!;
      if (ch === "f" && n !== 1) set(g, x, y, ",");
      else set(g, x, y, ch);
    }
  }
}

/** V7 实测凳子 o+t=99；V7.1 按口径 A 砍 80%、树补 70%。 */
export const V71_STOOL_BASELINE = 99;
export const V71_STOOL_MAX = Math.floor(V71_STOOL_BASELINE * 0.2);
export const V71_TREE_MIN = V73_TREE_MIN;
export const V71_TREE_MAX = V73_TREE_MAX;

export interface LuoLabelAnchor {
  key: string;
  x: number;
  y: number;
  houseX?: number;
  houseY?: number;
}

/** 最近一次 generateLuoyang 的门口/铺面锚点，供渲染层读。 */
export let LUOYANG_LABEL_ANCHORS: LuoLabelAnchor[] = [];

const CLUMP_SHAPES: [number, number][][] = [
  [
    [0, 0],
    [0, 1],
  ],
  [
    [0, 0],
    [1, 1],
    [2, 1],
  ],
  [
    [0, 0],
    [2, 0],
    [1, 1],
    [0, 2],
  ],
  [[0, 0]],
];

export function arterialTreeBan(x: number, y: number, cx: number, cy: number): boolean {
  if (x >= 40 && x <= 44 && y >= 1 && y <= cy + 4) return true;
  if (Math.abs(x - cx) <= 1) return true;
  if (y === cy - 5 || y === cy + 5 || y === cy) return true;
  for (const [dx, dy] of [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ] as const) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 40 && nx <= 44 && ny >= 1 && ny <= cy + 4) return true;
    if (Math.abs(nx - cx) <= 1) return true;
    if (ny === cy - 5 || ny === cy + 5 || ny === cy) return true;
  }
  return false;
}

function countChar(g: string[], ch: string): number {
  let n = 0;
  for (const row of g) for (const c of row) if (c === ch) n += 1;
  return n;
}

function treeWindowOk(g: string[], x: number, y: number, placed: boolean): boolean {
  let n3 = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (get(g, x + dx, y + dy) === "&") n3 += 1;
    }
  }
  if (placed ? n3 > 3 : n3 >= 3) return false;
  let n5 = 0;
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      if (get(g, x + dx, y + dy) === "&") n5 += 1;
    }
  }
  return placed ? n5 <= 6 : n5 < 6;
}

function treeLineOk(g: string[], x: number, y: number): boolean {
  const dirs = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ] as const;
  for (const [dx, dy] of dirs) {
    let run = 1;
    for (const s of [1, -1]) {
      for (let k = 1; k < 4; k++) {
        if (get(g, x + dx * k * s, y + dy * k * s) === "&") run += 1;
        else break;
      }
    }
    if (run >= 3) return false;
  }
  return true;
}

function canPlantTree(
  g: string[],
  x: number,
  y: number,
  cx: number,
  cy: number,
  doors: Iterable<{ doorX: number; doorY: number }>,
): boolean {
  if (get(g, x, y) !== ".") return false;
  if (arterialTreeBan(x, y, cx, cy)) return false;
  if (inLuoyangPlaza(x, y)) return false;
  if (get(g, x, y) === "=") return false;
  for (const d of doors) {
    if (Math.abs(x - d.doorX) + Math.abs(y - d.doorY) <= 2) return false;
  }
  if (!treeWindowOk(g, x, y, false)) return false;
  return true;
}

/** 丛与丛之间 Chebyshev ≥ 3（本丛尚未写入）。 */
function clumpFarFromTrees(g: string[], cells: { x: number; y: number }[]): boolean {
  for (const c of cells) {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (get(g, c.x + dx, c.y + dy) === "&") return false;
      }
    }
  }
  return true;
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
  // 墙缝双格门（俯视木门 2 格宽），禁止单缝空气墙
  if (door === "n" || door === "s") {
    if (doorX + 1 < x + w - 1) set(g, doorX + 1, doorY, ":");
    else if (doorX - 1 > x) set(g, doorX - 1, doorY, ":");
  } else if (doorY + 1 < y + h - 1) set(g, doorX, doorY + 1, ":");
  else if (doorY - 1 > y) set(g, doorX, doorY - 1, ":");

  // 进数隔墙（留中门，同样双格）
  const splits: number[] = [];
  if (jin >= 2) splits.push(y + Math.floor(h / (jin + 1)));
  if (jin >= 3) splits.push(y + Math.floor((2 * h) / (jin + 1)));
  for (const sy of splits) {
    if (sy <= y + 1 || sy >= y + h - 2) continue;
    for (let xx = x + 1; xx < x + w - 1; xx++) {
      if (xx === midX || xx === midX + 1) set(g, xx, sy, ":");
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

/** L 形院落：可选附翼 + 切角。 */
export function generateLCourtyard(
  g: string[],
  cfg: CourtyardConfig & { lShape?: boolean; wing?: { x: number; y: number; w: number; h: number } },
): { doorX: number; doorY: number } {
  const main = generateCourtyard(g, cfg);
  if (cfg.wing) {
    const w = cfg.wing;
    rect(g, w.x, w.y, w.x + w.w - 1, w.y + w.h - 1, "#");
    rect(g, w.x + 1, w.y + 1, w.x + w.w - 2, w.y + w.h - 2, ".");
    const connectX = Math.min(cfg.x + cfg.w - 1, w.x);
    for (let y = Math.max(cfg.y + 1, w.y + 1); y < Math.min(cfg.y + cfg.h - 1, w.y + w.h - 1); y++) {
      set(g, connectX, y, ":");
    }
    set(g, w.x + 1, w.y + 1, "l");
    set(g, w.x + w.w - 2, w.y + 1, "l");
  }
  if (cfg.lShape && !cfg.wing) {
    const { x, y, w, h, door } = cfg;
    const cutW = Math.max(3, Math.floor(w / 3));
    const cutH = Math.max(3, Math.floor(h / 3));
    let cx0 = x + w - cutW;
    let cy0 = y + 1;
    if (door === "n") {
      cx0 = x + w - cutW;
      cy0 = y + h - cutH - 1;
    } else if (door === "e") {
      cx0 = x + 1;
      cy0 = y + 1;
    } else if (door === "w") {
      cx0 = x + w - cutW;
      cy0 = y + 1;
    }
    for (let yy = cy0; yy < cy0 + cutH; yy++) {
      for (let xx = cx0; xx < cx0 + cutW; xx++) {
        if (get(g, xx, yy) === "#") continue;
        set(g, xx, yy, "=");
      }
    }
    for (let xx = cx0; xx < cx0 + cutW; xx++) set(g, xx, cy0 - 1, "#");
    for (let yy = cy0; yy < cy0 + cutH; yy++) set(g, cx0 - 1, yy, "#");
  }
  return main;
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
    put(0, 2, "q"); // 大堂柜台（避开门轴）
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
    put(0, 1, "g");
    put(R, 1, "l");
    put(0, B - 1, "y");
    put(R, B - 1, "j");
    put(Math.floor(R / 2), 0, "&");
  } else if (fn === "wine") {
    put(0, 1, "y"); // 双人桌（院内多格）
    put(2, 1, "t");
    put(4, 1, "o");
    put(0, 2, "q"); // 大型柜台仅院内（避开门轴中行）
    put(R, 1, "j");
    put(R - 2, 2, "r");
    put(0, B - 1, "b");
    put(2, B - 1, "j");
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
    put(0, Math.floor(B / 2), "l");
    put(R, Math.floor(B / 2), "l");
    put(0, B - 1, ",");
  } else if (fn === "post") {
    put(0, 1, "p");
    put(R, 1, "v");
    put(0, B - 1, "j");
    put(R, B - 1, "p");
  } else if (fn === "shop") {
    put(0, 1, "v");
    put(R, 1, "e"); // 摊棚意象（洛阳 e=stall）
    put(R, B - 1, "j");
    put(Math.floor(R / 2), B, "p");
  } else if (fn === "home") {
    put(0, 1, "j");
    put(R, 1, "y");
    put(0, B - 1, "n");
    put(R, B - 1, "j");
  } else if (fn === "sixDoors") {
    put(0, 1, "z"); // 兵器架（院内）
    put(R, 1, "k"); // 卷宗柜
    put(0, B - 1, "m");
    put(R, B - 1, "z");
  } else if (fn === "garrison") {
    put(0, 1, "z");
    put(R, 1, "d");
    put(0, B - 1, "c");
    put(R, B - 1, "z");
  } else if (fn === "silk" || fn === "smith") {
    put(0, 1, "i");
    put(R, 1, "e");
    put(0, B - 1, "j");
  } else {
    put(0, 1, "v");
    put(0, B - 1, "j");
  }
}

function jitter(seed: number, n: number): number {
  return ((seed * 1103515245 + 12345) >>> 0) % n;
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
  const W = LUO_W;
  const H = LUO_H;
  const cx = LUO_CX;
  const cy = LUO_CY;
  const g = blank(W, H, ".");
  for (let x = 0; x < W; x++) {
    set(g, x, 0, "#");
    set(g, x, H - 1, "#");
  }
  for (let y = 0; y < H; y++) {
    set(g, 0, y, "#");
    set(g, W - 1, y, "#");
  }

  // V7.3 自然洛水 + 西/天津/东三桥
  carveLuoyangRiver(g, cy, W);
  for (const br of LUOYANG_BRIDGES) punchRiverBridge(g, br.x0, br.x1, cy);
  // 天津桥·洛阳门牌楼（水面门面，严禁删除）
  // 中轴桥面可走；南北牌楼用 ;（arch「洛阳门」）；四角立柱点缀，勿再砌厚重黑亭
  for (let dx = -3; dx <= 3; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      punchWater(g, cx + dx, cy + dy);
      if (Math.abs(dx) <= 1) set(g, cx + dx, cy + dy, "=");
      else set(g, cx + dx, cy + dy, "~");
    }
  }
  punchWater(g, cx, cy - 2);
  punchWater(g, cx, cy + 2);
  set(g, cx, cy - 2, ";");
  set(g, cx, cy + 2, ";");
  set(g, cx - 2, cy - 1, "#");
  set(g, cx + 2, cy - 1, "#");
  set(g, cx - 2, cy + 1, "#");
  set(g, cx + 2, cy + 1, "#");
  for (const dy of [-1, 0, 1]) {
    for (const dx of [-1, 0, 1]) set(g, cx + dx, cy + dy, "=");
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

  const yards: (CourtyardConfig & { key: string })[] = LUOYANG_YARD_DEFS.map((yd) => ({ ...yd }));

  const doors = new Map<
    string,
    {
      doorX: number;
      doorY: number;
      door: CourtyardConfig["door"];
      counterX?: number;
      counterY?: number;
      behindX?: number;
      behindY?: number;
      front?: { x: number; y: number }[];
    }
  >();
  for (const yd of yards) {
    const useL = yd.lShape || yd.wing || LUOYANG_L_SHAPE_KEYS.has(yd.key);
    const d =
      yd.form === "street"
        ? generateStreetShop(g, yd)
        : useL
          ? generateLCourtyard(g, yd)
          : generateCourtyard(g, yd);
    doors.set(yd.key, { ...d, door: yd.door });
    // 门前短支路
    const { doorX, doorY } = d;
    if (yd.door === "e") hroad(g, doorY, doorX + 1, Math.min(W - 2, doorX + 4));
    if (yd.door === "w") hroad(g, doorY, Math.max(1, doorX - 4), doorX - 1);
    if (yd.door === "s") vroad(g, doorX, doorY + 1, Math.min(H - 2, doorY + 3));
    if (yd.door === "n") vroad(g, doorX, Math.max(1, doorY - 3), doorY - 1);
  }
  for (const key of ["yingtian", "duanmen"] as const) {
    const yd = yards.find((y) => y.key === key);
    if (yd) punchAxisThrough(g, yd, cx);
  }
  paintPalaceWalls(g);
  paintImperialAxis(g, cx, cy);
  ensureYardAlleys(g, yards);
  fillVacuumPatches(g, W, H);
  // 临街铺必须贴干道：店门到 cy±5 拉 2 格宽支路
  for (const yd of yards) {
    if (yd.form !== "street") continue;
    const midX = yd.x + Math.floor(yd.w / 2);
    if (yd.door === "s") {
      const doorY = yd.y + yd.h - 1;
      for (let y = doorY + 1; y <= cy - 5; y++) {
        for (const x of [midX, midX + 1]) {
          const c = get(g, x, y);
          if (c === "#" || c === "~" || c === "^") continue;
          set(g, x, y, "=");
        }
      }
    } else if (yd.door === "n") {
      const doorY = yd.y;
      for (let y = cy + 5; y < doorY; y++) {
        for (const x of [midX, midX + 1]) {
          const c = get(g, x, y);
          if (c === "#" || c === "~" || c === "^") continue;
          set(g, x, y, "=");
        }
      }
    }
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

  // 东南南苑（取代 ^ 浅丘）
  southGarden(g);
  // 建筑地基下若有山/水，一律清成院地
  for (const yd of yards) {
    for (let yy = yd.y; yy < yd.y + yd.h; yy++) {
      for (let xx = yd.x; xx < yd.x + yd.w; xx++) {
        const c = get(g, xx, yy);
        if (c === "^" || c === "~" || c === "%") set(g, xx, yy, ".");
      }
    }
  }

  // 树木改到后期成组种植（V4），此处跳过

    // 门户（既有连通：D→偃师、W→陕州、E→汴京）
  set(g, cx - 1, 1, "#");
  set(g, cx, 1, "D");
  set(g, cx + 1, 1, "#");
  for (let y = 2; y < cy; y++) for (const dx of [-1, 0, 1]) {
    punchWater(g, cx + dx, y);
    set(g, cx + dx, y, "=");
  }
  // 洛阳门牌楼：干道冲刷后必须重钉（严禁被 = 抹掉）
  punchWater(g, cx, cy - 2);
  punchWater(g, cx, cy + 2);
  set(g, cx, cy - 2, ";");
  set(g, cx, cy + 2, ";");
  set(g, cx - 2, cy - 1, "#");
  set(g, cx + 2, cy - 1, "#");
  set(g, cx - 2, cy + 1, "#");
  set(g, cx + 2, cy + 1, "#");
  for (const dy of [-1, 0, 1]) {
    for (const dx of [-1, 0, 1]) set(g, cx + dx, cy + dy, "=");
  }
  set(g, cx, cy, "@");
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

  // 应天门前广场告示（勿再在阙内砌瓮城墙）
  if (get(g, cx + 3, 9) === "." || get(g, cx + 3, 9) === "=") set(g, cx + 3, 9, "!");
  if (get(g, market.x, market.y - 2) === ".") set(g, market.x, market.y - 2, "!");

  const occupied = new Set<string>();
  occupied.add(`${cx},${cy}`);

  const talkers: Record<string, string> = {};
  const entityMarks: EntityMark[] = [];
  let talkSeq = 0;
  /** 每个 talker 唯一 ID → 坐标（配套物件用） */
  const talkerCell = new Map<string, { x: number; y: number }>();
  const placedNpcIds = new Set<string>();
  const seed = 9041;

  const isArterial = (x: number, y: number) =>
    (x >= 40 && x <= 44 && y >= 1 && y <= cy + 4) ||
    Math.abs(x - cx) <= 1 ||
    y === cy - 5 ||
    y === cy + 5 ||
    y === cy;
  const canStand = (x: number, y: number) => {
    const cur = get(g, x, y);
    if (cur !== "." && cur !== "=" && cur !== ":" && cur !== "," && cur !== "G") return false;
    if (cur === "G") return false; // 空气墙格不站人
    if (occupied.has(`${x},${y}`)) return false;
    if (isArterial(x, y) && cur === "=") return false; // 主路不站人
    for (const d of doors.values()) {
      if (x === d.doorX && y === d.doorY) return false;
      // 门口正前方一格也不堵
      const ox = d.door === "e" ? 1 : d.door === "w" ? -1 : 0;
      const oy = d.door === "s" ? 1 : d.door === "n" ? -1 : 0;
      if (x === d.doorX + ox && y === d.doorY + oy) return false;
    }
    return true;
  };

  const placeTalkMark = (npcId: string, spots: { x: number; y: number }[]) => {
    if (placedNpcIds.has(npcId)) return false;
    const trySpots = spots;
    for (const s of trySpots) {
      if (!canStand(s.x, s.y)) continue;
      const id = encodeMarkId(talkSeq++);
      occupied.add(`${s.x},${s.y}`);
      entityMarks.push(makeTalkerMark(id, s.x, s.y, npcId));
      talkers[id] = npcId;
      talkerCell.set(id, { x: s.x, y: s.y });
      placedNpcIds.add(npcId);
      return true;
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

  const shopBehind = (key: string) => {
    const d = doors.get(key);
    if (!d) return nearDoor(key, 4);
    const spots: { x: number; y: number }[] = [];
    if (d.behindX != null && d.behindY != null) {
      spots.push(
        { x: d.behindX, y: d.behindY },
        { x: d.behindX - 1, y: d.behindY },
        { x: d.behindX + 1, y: d.behindY },
        { x: d.behindX, y: d.behindY - 1 },
        { x: d.behindX, y: d.behindY + 1 },
      );
    }
    spots.push(...nearDoor(key, 4));
    return spots;
  };

  const virtualBox = (id: string) => {
    if (id === "luoyangGate") return { x: cx - 4, y: cy - 4, w: 9, h: 8 };
    if (id === "tianjinMarket") return { x: market.x - 2, y: market.y - 1, w: 8, h: 5 };
    if (id === "southGarden") return { x: 58, y: 42, w: 22, h: 10 };
    if (id === "luoRiver") return { x: 1, y: cy - 2, w: W - 2, h: 6 };
    if (id === "westGate") return { x: 1, y: cy - 6, w: 4, h: 4 };
    if (id === "eastGate") return { x: W - 5, y: cy - 6, w: 4, h: 4 };
    return yards.find((y) => y.key === id) ?? null;
  };

  const scanBox = (box: { x: number; y: number; w: number; h: number }) => {
    const out: { x: number; y: number }[] = [];
    for (let yy = box.y; yy < box.y + box.h; yy++) {
      for (let xx = box.x; xx < box.x + box.w; xx++) {
        if (canStand(xx, yy)) out.push({ x: xx, y: yy });
      }
    }
    return out;
  };

  const bindSpots = (b: NpcBinding) => {
    const box = virtualBox(b.buildingId);
    const doorSpots = nearDoor(b.buildingId, 8);
    if (b.mode === "atRiver") {
      return riverBankSpots(g, cy).slice(0, 12);
    }
    if (b.mode === "atWell") {
      const well = LUOYANG_WELLS.get(b.buildingId);
      if (well) return wellAdjSpots(g, well.x, well.y);
      return doorSpots;
    }
    if (b.mode === "atDoor") {
      if (b.buildingId === "luoyangGate") {
        return [
          { x: cx - 3, y: cy - 4 },
          { x: cx + 3, y: cy - 4 },
          { x: cx - 3, y: cy + 4 },
          { x: cx + 3, y: cy + 4 },
          { x: cx - 4, y: cy - 4 },
          { x: cx + 4, y: cy - 4 },
        ];
      }
      if (b.buildingId === "westGate") {
        return [
          { x: 2, y: cy - 5 },
          { x: 2, y: cy - 4 },
          { x: 3, y: cy - 5 },
          { x: 3, y: cy - 4 },
        ];
      }
      if (b.buildingId === "eastGate") {
        return [
          { x: W - 3, y: cy - 5 },
          { x: W - 3, y: cy - 4 },
          { x: W - 4, y: cy - 5 },
          { x: W - 4, y: cy - 4 },
        ];
      }
      const d = doors.get(b.buildingId);
      return [...doorSpots, ...(d?.front ?? [])];
    }
    const inner = box
      ? scanBox({ x: box.x + 1, y: box.y + 1, w: Math.max(1, box.w - 2), h: Math.max(1, box.h - 2) })
      : [];
    const extra = shopBehind(b.buildingId);
    if (inner.length) return [...inner, ...extra];
    console.warn(`洛阳 NPC ${b.npcId} 院内无站位，退到门口 ${b.buildingId}`);
    return [...doorSpots, ...extra];
  };

  activateFangYards(g);

  for (const b of NPC_BINDINGS) {
    if (!placeTalkMark(b.npcId, bindSpots(b))) {
      console.warn(`洛阳 NPC 绑定落空: ${b.npcId} @ ${b.buildingId}/${b.mode}`);
    }
  }
  // 车：只放院内僻角（室外马路上禁止巨型载具挡路）
  {
    const wine = yards.find((y) => y.key === "wine");
    const martial = yards.find((y) => y.key === "martial");
    const cartSpots = [
      ...(wine ? [{ x: wine.x + 2, y: wine.y + 2 }] : []),
      ...(martial ? [{ x: martial.x + martial.w - 3, y: martial.y + 2 }] : []),
    ];
    for (const s of cartSpots) {
      if (get(g, s.x, s.y) === "#" || get(g, s.x, s.y) === ":") continue;
      set(g, s.x, s.y, "f");
      occupied.add(`${s.x},${s.y}`);
    }
  }

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
  void yardFloors;

  // 金吾卫 / 漕帮匪（可打）—— 仍用 ascii 敌位字母
  const npcs: Record<string, EnemyId> = {
    "1": "jinwu",
    "2": "canalThug",
    "3": "brothelGuard",
    "4": "jailer",
  };
  const foeSpots = [
    { ch: "1", x: 45, y: 9 },
    { ch: "2", x: 28, y: cy + 9 },
    { ch: "3", x: W - 22, y: cy + 8 },
    { ch: "4", x: 8, y: 18 },
  ];
  for (const f of foeSpots) {
    if (get(g, f.x, f.y) === "." && !occupied.has(`${f.x},${f.y}`)) {
      set(g, f.x, f.y, f.ch);
      occupied.add(`${f.x},${f.y}`);
    }
  }

  // 清 mark：只清院心一格
  for (const yd of yards) {
    if (!yd.mark) continue;
    const mx = yd.x + Math.floor(yd.w / 2);
    const my = yd.y + Math.floor(yd.h / 2);
    if (get(g, mx, my) === yd.mark) set(g, mx, my, ".");
  }

  // 可达性：从 @ 洪水，挪困住 talker
  const BLOCK = new Set("vbptj&gdkfmyzuqhic*,en".split(""));
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
  for (const [id, pos] of talkerCell) {
    const px = pos.x;
    const py = pos.y;
    const ok = [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ].some(([dx, dy]) => reach.has(`${px + dx},${py + dy}`));
    if (ok) continue;
    const spot = rescueFloor();
    if (!spot) continue;
    occupied.delete(`${px},${py}`);
    occupied.add(`${spot.x},${spot.y}`);
    talkerCell.set(id, { x: spot.x, y: spot.y });
    const mark = entityMarks.find((m) => m.id === id && m.role === "talker");
    if (mark) {
      mark.x = spot.x;
      mark.y = spot.y;
    }
  }

  // 宽度校验
  for (let i = 0; i < g.length; i++) {
    if (g[i]!.length !== W) throw new Error(`luoyang row ${i} width ${g[i]!.length} != ${W}`);
  }

  // ─── 表现层补全（不定墙体/道路/建筑外框；仅加密室内、挂牌、主题地标、子场景门）───
  const nameSigns: string[] = [
    "西陕州。东汴京。南偃师。应天门北，上阳宫西，府衙靠桥。",
    "天津桥市集。南市在桥北东，西市在桥南西。金吾夜巡。",
  ];
  for (const yd of yards) {
    const def = buildingByYard(yd.key);
    const doorInfo = doors.get(yd.key);
    if (!def || !doorInfo) continue;
    // 临街小铺已用 H+柜台建模，勿再套院落模板（会加黑墙感陈设）
    if (yd.form !== "street") {
      // 室外大地图禁止套室内模板（屏风/床榻/内室柜）；院内陈设只走 furnishRoom
      renderWallVariant(
        g,
        { key: yd.key, spriteTheme: def.spriteTheme, x: yd.x, y: yd.y, w: yd.w, h: yd.h },
        "battlement",
      );
    }
    renderBuildingName(g, def, doorInfo.doorX, doorInfo.doorY, yd.door, nameSigns);
    applyBuildingTheme(g, def, doorInfo.doorX, doorInfo.doorY, yd.door, nameSigns);
  }

  // 水边不再乱种树（密度已在科学种树段控制）

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

  // 子场景门：正厅深处（非院子大门），并开一条可走中轴廊
  const innerPortalSpot = (
    key: string,
  ): { x: number; y: number } | null => {
    const yd = yards.find((y) => y.key === key);
    const d = doors.get(key);
    if (!yd || !d) return null;
    let x = d.doorX;
    let y = d.doorY;
    const steps =
      d.door === "e" || d.door === "w"
        ? Math.max(3, Math.floor(yd.w / 2) + 1)
        : Math.max(3, Math.floor(yd.h / 2) + 1);
    const clearCell = (cx: number, cy: number) => {
      const c = get(g, cx, cy);
      if (c === "#" || c === "~" || c === "^" || c === "%") return false;
      if ("vbptj&gdkfmyzuqhic*,oalfzrenf*".includes(c)) {
        set(g, cx, cy, ".");
        occupied.delete(`${cx},${cy}`);
      }
      return true;
    };
    for (let i = 0; i < steps; i++) {
      if (d.door === "w") x += 1;
      else if (d.door === "e") x -= 1;
      else if (d.door === "n") y += 1;
      else y -= 1;
      // 撞隔墙时改走中门
      if (get(g, x, y) === "#") {
        const midX = yd.x + Math.floor(yd.w / 2);
        const midY = yd.y + Math.floor(yd.h / 2);
        if (d.door === "w" || d.door === "e") {
          x = midX;
          y = midY;
        } else {
          x = midX;
          y = get(g, midX, y) === "#" ? midY : y;
        }
        if (get(g, x, y) === "#") set(g, x, y, ":");
      }
      clearCell(x, y);
      // 两侧各清一格，防道具夹死
      clearCell(x + 1, y);
      clearCell(x - 1, y);
      clearCell(x, y + 1);
      clearCell(x, y - 1);
    }
    // 落在深处但仍在院内
    if (x <= yd.x || x >= yd.x + yd.w - 1 || y <= yd.y || y >= yd.y + yd.h - 1) {
      x = yd.x + Math.floor(yd.w / 2);
      y = yd.y + Math.floor(yd.h / 2);
    }
    clearCell(x, y);
    set(g, x, y, ".");
    occupied.delete(`${x},${y}`);
    return { x, y };
  };

  // 外门恢复为院门（可走入院），二级传送只在正厅
  const jailDoor = doors.get("jail");
  if (jailDoor) set(g, jailDoor.doorX, jailDoor.doorY, "G");
  const brothelDoor = doors.get("brothel");
  if (brothelDoor) set(g, brothelDoor.doorX, brothelDoor.doorY, ":");

  const prisonInner = innerPortalSpot("jail");
  if (prisonInner) {
    entityMarks.push(
      makePortalMark("GA", prisonInner.x, prisonInner.y, "luoyang_yamen_prison" as SceneId, "A"),
    );
  }
  const yanboInner = innerPortalSpot("brothel");
  if (yanboInner) {
    entityMarks.push(
      makePortalMark("FA", yanboInner.x, yanboInner.y, "luoyang_yanbo_inner" as SceneId, "A"),
    );
  }
  entityMarks.push(makePortalMark("TB", 71, 30, "luoyang_temple_outer" as SceneId, "A"));
  set(g, 71, 30, ".");

  const modelBlocked = (x: number, y: number) => {
    const c = get(g, x, y);
    return c === "H" || c === "e" || c === "#" || c === ";" || c === "G";
  };
  const nudgeInnerPortal = (markId: "FA" | "GA", yardKey: string) => {
    const mark = entityMarks.find((m) => m.id === markId && m.role === "portal");
    const yd = yards.find((y) => y.key === yardKey);
    if (!mark || !yd) return;
    if (!modelBlocked(mark.x, mark.y)) return;
    const q: { x: number; y: number }[] = [{ x: mark.x, y: mark.y }];
    const seen = new Set<string>([`${mark.x},${mark.y}`]);
    while (q.length) {
      const cur = q.shift()!;
      for (const [dx, dy] of [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ] as const) {
        const nx = cur.x + dx;
        const ny = cur.y + dy;
        const k = `${nx},${ny}`;
        if (seen.has(k)) continue;
        if (nx <= yd.x || nx >= yd.x + yd.w - 1 || ny <= yd.y || ny >= yd.y + yd.h - 1) continue;
        seen.add(k);
        const c = get(g, nx, ny);
        if (c !== "." && c !== "," && c !== ":") {
          q.push({ x: nx, y: ny });
          continue;
        }
        if (modelBlocked(nx, ny) || occupied.has(k)) {
          q.push({ x: nx, y: ny });
          continue;
        }
        mark.x = nx;
        mark.y = ny;
        return;
      }
    }
    console.warn(`洛阳二级门 ${markId} 与建模重叠，无法平移 @${mark.x},${mark.y}`);
  };
  nudgeInnerPortal("GA", "jail");
  nudgeInnerPortal("FA", "brothel");

  // 配套物件：只在 talkerCell 登记点生成
  let cartLeft = 8;
  for (const [ch, pos] of talkerCell) {
    const id = talkers[ch];
    if (!id) continue;
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
  const PROP_CLEAR = new Set("vbptj&gdkfmyzuhi*,oalfzren".split("")); // 不含 q（柜台）
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
  for (const [id, pos] of talkerCell) {
    const ok =
      reach2.has(`${pos.x},${pos.y}`) ||
      [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ].some(([dx, dy]) => reach2.has(`${pos.x + dx},${pos.y + dy}`));
    if (ok) continue;
    const spot = rescue2();
    if (!spot) continue;
    occupied.delete(`${pos.x},${pos.y}`);
    occupied.add(`${spot.x},${spot.y}`);
    talkerCell.set(id, spot);
    const mark = entityMarks.find((m) => m.id === id && m.role === "talker");
    if (mark) {
      mark.x = spot.x;
      mark.y = spot.y;
    }
  }

  // 干道清障：东西门廊道与桥轴上不得挡路物件；人站干道则挪开
  const clearArterial = (x: number, y: number) => {
    const ch = get(g, x, y);
    if ("fvpb&".includes(ch)) {
      set(g, x, y, "=");
      occupied.delete(`${x},${y}`);
    }
  };
  for (const [id, pos] of talkerCell) {
    if (pos.x === cx || pos.y === cy - 5) {
      for (const [ax, ay] of [
        [0, 2],
        [0, -2],
        [2, 0],
        [-2, 0],
        [1, 2],
        [-1, 2],
      ] as const) {
        const nx = pos.x + ax;
        const ny = pos.y + ay;
        if (get(g, nx, ny) !== "." && get(g, nx, ny) !== "=") continue;
        if (occupied.has(`${nx},${ny}`)) continue;
        if (nx === cx || ny === cy - 5) continue;
        occupied.delete(`${pos.x},${pos.y}`);
        occupied.add(`${nx},${ny}`);
        talkerCell.set(id, { x: nx, y: ny });
        const mark = entityMarks.find((m) => m.id === id && m.role === "talker");
        if (mark) {
          mark.x = nx;
          mark.y = ny;
        }
        break;
      }
    }
  }
  for (let x = 1; x < W - 1; x++) clearArterial(x, cy - 5);
  for (let y = 1; y < H - 1; y++) clearArterial(cx, y);

  // —— 先限频车/桶等；树留到路肩/干道清障后再种，避免被后处理抹掉 ——
  capAllFurnishings(g);

  const occNpc: PlaceOcc = new Set();
  for (const pos of talkerCell.values()) occNpc.add(cellKey(pos.x, pos.y));

  // 校验 talker 落点可站（不写 ascii 字母）
  const placeFails: string[] = [];
  for (const [id, pos] of talkerCell) {
    const cur = get(g, pos.x, pos.y);
    if (cur === "#" || cur === "~" || cur === "^" || cur === "%") {
      const npcId = talkers[id]!;
      const meta = npcById(npcId);
      const yd = meta?.yard ? yards.find((y) => y.key === meta.yard) : undefined;
      const yardBox = yd ? { x: yd.x, y: yd.y, w: yd.w, h: yd.h } : undefined;
      occNpc.delete(cellKey(pos.x, pos.y));
      const placed = placeNpc(g, { id: npcId, ch: ".", x: pos.x, y: pos.y }, occNpc, yardBox);
      if (!placed.ok) placeFails.push(`${npcId}: ${placed.reason}`);
      else {
        // placeNpc 可能写入 "." — 清回地面语义
        set(g, placed.to.x, placed.to.y, get(g, placed.to.x, placed.to.y) === "." ? "." : "=");
        if (get(g, placed.to.x, placed.to.y) === ".") {
          /* keep */
        }
        // 若写成了其他，强制地面
        const c = get(g, placed.to.x, placed.to.y);
        if (c !== "." && c !== "=" && c !== "," && c !== ":") set(g, placed.to.x, placed.to.y, ".");
        talkerCell.set(id, { x: placed.to.x, y: placed.to.y });
        const mark = entityMarks.find((m) => m.id === id && m.role === "talker");
        if (mark) {
          mark.x = placed.to.x;
          mark.y = placed.to.y;
        }
        occNpc.add(cellKey(placed.to.x, placed.to.y));
      }
    }
  }
  if (placeFails.length) {
    throw new Error(`洛阳 NPC 落点失败（禁止静默丢弃）:\n${placeFails.join("\n")}`);
  }

  if (Object.keys(talkers).length < 30) {
    throw new Error(`洛阳 NPC 过少: ${Object.keys(talkers).length} < 30`);
  }

  // 同步 entityMarks 坐标
  for (const m of entityMarks) {
    if (m.role !== "talker") continue;
    const pos = talkerCell.get(m.id);
    if (pos) {
      m.x = pos.x;
      m.y = pos.y;
    }
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
    const templeDoor = doors.get("templeOffice");
    const clinicDoor = doors.get("clinic");
    const wineYard = yards.find((y) => y.key === "wine");
    const postYard = yards.find((y) => y.key === "post");
    ensureFurnishingMins(
      g,
      {
        barrel: 4,
        tree: 0, // V4 成组已种
        lantern: 0,
        jar: 3,
        brazier: 3,
        stall: 3,
        well: 0,
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
          spots: [],
        },
        {
          kind: "lantern",
          spots: [],
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
          spots: [],
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
    capFurnishing(g, "tree", V73_TREE_MAX);
    capFurnishing(g, "lantern", V73_LANTERN_MAX);
    capFurnishing(g, "jar", 4);
    capFurnishing(g, "post", 10);
  }

  // 保护二级传送格，并清出十字邻格保证 flood 可踩上；挪开叠在门上的 talker
  for (const m of entityMarks) {
    if (m.role !== "portal") continue;
    const c = get(g, m.x, m.y);
    if (c === "#" || c === "~" || c === "^" || c === "%") {
      let fixed = false;
      for (const [dx, dy] of [
        [0, 0],
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [1, 1],
        [-1, 1],
      ] as const) {
        const nx = m.x + dx;
        const ny = m.y + dy;
        const nc = get(g, nx, ny);
        if (nc === "." || nc === "=" || nc === "," || nc === ":") {
          m.x = nx;
          m.y = ny;
          fixed = true;
          break;
        }
      }
      if (!fixed) continue;
    }
    set(g, m.x, m.y, ".");
    for (const [dx, dy] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ] as const) {
      const nx = m.x + dx;
      const ny = m.y + dy;
      const nc = get(g, nx, ny);
      if ("vbptj&gdkfmyzuhi*,oalfzrenf".includes(nc)) {
        set(g, nx, ny, ".");
        occupied.delete(`${nx},${ny}`);
      }
    }
    // talker 不得压在传送格上
    for (const [id, pos] of talkerCell) {
      if (pos.x !== m.x || pos.y !== m.y) continue;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [2, 0],
        [0, 2],
      ] as const) {
        const nx = m.x + dx;
        const ny = m.y + dy;
        if (!canStand(nx, ny) && get(g, nx, ny) !== "." && get(g, nx, ny) !== "=") continue;
        if (occupied.has(`${nx},${ny}`) && !(nx === pos.x && ny === pos.y)) continue;
        occupied.delete(`${pos.x},${pos.y}`);
        occupied.add(`${nx},${ny}`);
        talkerCell.set(id, { x: nx, y: ny });
        const tm = entityMarks.find((e) => e.id === id && e.role === "talker");
        if (tm) {
          tm.x = nx;
          tm.y = ny;
        }
        break;
      }
    }
  }

  // 最终强制：外门内 3 步中轴落二级门（可走入院，再进内室）
  {
    const forceInner = (key: string, markId: string, to: SceneId) => {
      const yd = yards.find((y) => y.key === key);
      const d = doors.get(key);
      if (!yd || !d) return;
      const ox = d.door === "e" ? -1 : d.door === "w" ? 1 : 0;
      const oy = d.door === "s" ? -1 : d.door === "n" ? 1 : 0;
      const corridor: { x: number; y: number }[] = [];
      let x = d.doorX;
      let y = d.doorY;
      for (let i = 0; i < 3; i++) {
        x += ox;
        y += oy;
        if (get(g, x, y) === "#") set(g, x, y, ":");
        else set(g, x, y, ".");
        occupied.delete(`${x},${y}`);
        corridor.push({ x, y });
      }
      const existing = entityMarks.find((m) => m.id === markId && m.role === "portal");
      if (existing) {
        existing.x = x;
        existing.y = y;
      } else {
        entityMarks.push(makePortalMark(markId, x, y, to, "A"));
      }
      // 廊道与传送格上不得站人（否则 flood 进不了内室门）
      const blocked = new Set(corridor.map((c) => `${c.x},${c.y}`));
      blocked.add(`${d.doorX},${d.doorY}`);
      for (const [id, pos] of [...talkerCell]) {
        if (!blocked.has(`${pos.x},${pos.y}`)) continue;
        let moved = false;
        for (const [dx, dy] of [
          [0, 2],
          [0, -2],
          [2, 0],
          [-2, 0],
          [1, 2],
          [-1, 2],
          [2, 1],
          [-2, 1],
        ] as const) {
          const nx = pos.x + dx;
          const ny = pos.y + dy;
          if (blocked.has(`${nx},${ny}`)) continue;
          if (get(g, nx, ny) !== "." && get(g, nx, ny) !== "=" && get(g, nx, ny) !== ",") continue;
          if (occupied.has(`${nx},${ny}`)) continue;
          occupied.delete(`${pos.x},${pos.y}`);
          occupied.add(`${nx},${ny}`);
          talkerCell.set(id, { x: nx, y: ny });
          const tm = entityMarks.find((e) => e.id === id && e.role === "talker");
          if (tm) {
            tm.x = nx;
            tm.y = ny;
          }
          moved = true;
          break;
        }
        if (!moved) {
          // 最后手段：挪到院外门旁支路
          const nx = d.doorX - ox * 2;
          const ny = d.doorY - oy * 2 + 1;
          occupied.delete(`${pos.x},${pos.y}`);
          occupied.add(`${nx},${ny}`);
          talkerCell.set(id, { x: nx, y: ny });
          const tm = entityMarks.find((e) => e.id === id && e.role === "talker");
          if (tm) {
            tm.x = nx;
            tm.y = ny;
          }
        }
      }
    };
    forceInner("brothel", "FA", "luoyang_yanbo_inner" as SceneId);
    forceInner("jail", "GA", "luoyang_yamen_prison" as SceneId);
  }

  // 最终钉死：洛阳门 + 临街小房（无柜台）+ 牢房围墙/空气墙
  punchWater(g, cx, cy - 2);
  punchWater(g, cx, cy + 2);
  set(g, cx, cy - 2, ";");
  set(g, cx, cy + 2, ";");
  for (const dy of [-1, 0, 1]) {
    for (const dx of [-1, 0, 1]) {
      if (get(g, cx + dx, cy + dy) !== "#") set(g, cx + dx, cy + dy, "=");
    }
  }
  set(g, cx, cy, "@");
  for (const yd of yards) {
    if (yd.form !== "street") continue;
    const d = doors.get(yd.key);
    if (!d) continue;
    // 清掉误留的马路柜台
    for (let yy = yd.y; yy < yd.y + yd.h; yy++) {
      for (let xx = yd.x; xx < yd.x + yd.w; xx++) {
        if (get(g, xx, yy) === "q") set(g, xx, yy, ".");
      }
    }
    if (d.behindX != null && d.behindY != null) {
      // 屋体锚在 behind 旁：优先保留已有 H，否则钉 H
      let hx = d.behindX;
      let hy = d.behindY;
      let found = false;
      for (let yy = yd.y; yy < yd.y + yd.h; yy++) {
        for (let xx = yd.x; xx < yd.x + yd.w; xx++) {
          if (get(g, xx, yy) === "H") {
            hx = xx;
            hy = yy;
            found = true;
            break;
          }
        }
        if (found) break;
      }
      if (!found) set(g, hx, hy, "H");
    }
  }
  // 院内大型柜台终局钉死（酒楼/衙门），避免被清障抹掉
  {
    const wine = yards.find((y) => y.key === "wine");
    const yamen = yards.find((y) => y.key === "yamen");
    if (wine) set(g, wine.x + 8, wine.y + 6, "q");
    if (yamen) set(g, yamen.x + 1, yamen.y + 2, "q");
  }
  // 牢房：完整围墙 + 正门 G + 逻辑屏障（需路引）
  {
    const yd = yards.find((y) => y.key === "jail");
    const d = doors.get("jail");
    if (yd && d) {
      for (let xx = yd.x; xx < yd.x + yd.w; xx++) {
        set(g, xx, yd.y, "#");
        set(g, xx, yd.y + yd.h - 1, "#");
      }
      for (let yy = yd.y; yy < yd.y + yd.h; yy++) {
        set(g, yd.x, yy, "#");
        set(g, yd.x + yd.w - 1, yy, "#");
      }
      set(g, d.doorX, d.doorY, "G");
      const existing = entityMarks.find((m) => m.id === "JB" && m.role === "barrier");
      if (existing) {
        existing.x = d.doorX;
        existing.y = d.doorY;
      } else {
        entityMarks.push(
          makeBarrierMark("JB", d.doorX, d.doorY, "item:roadPass", "牢门关着。没路引，狱卒不放人。"),
        );
      }
      // 门廊清障：门外三步可走，门内可走；人不得站门上
      const ox = d.door === "e" ? 1 : d.door === "w" ? -1 : 0;
      const oy = d.door === "s" ? 1 : d.door === "n" ? -1 : 0;
      for (const step of [1, 2, 3]) {
        const x = d.doorX + ox * step;
        const y = d.doorY + oy * step;
        if (get(g, x, y) === "#" || get(g, x, y) === "~") continue;
        set(g, x, y, "=");
      }
      const ix = -ox;
      const iy = -oy;
      for (const step of [1, 2]) {
        const x = d.doorX + ix * step;
        const y = d.doorY + iy * step;
        if (x > yd.x && x < yd.x + yd.w - 1 && y > yd.y && y < yd.y + yd.h - 1) {
          set(g, x, y, ".");
        }
      }
    }
  }
  // 车只留在驿站院内/僻静角，清干道上的车
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      if (get(g, x, y) !== "f") continue;
      if (Math.abs(x - cx) <= 2 || y === cy - 5 || y === cy + 5 || y === cy || get(g, x, y) === "=") {
        set(g, x, y, ".");
      }
    }
  }

  // 终局：凡站在墙/门/水上的 talker 必须挪进可站格（牢房封墙后尤甚）
  for (const [id, pos] of [...talkerCell]) {
    const npcId = talkers[id]!;
    const jailNpc = ["luoJailer", "luoJailer2", "luoPrisoner"].includes(npcId);
    const yd = jailNpc ? yards.find((y) => y.key === "jail") : undefined;
    const ch = get(g, pos.x, pos.y);
    const outsideJail =
      yd &&
      (pos.x <= yd.x || pos.x >= yd.x + yd.w - 1 || pos.y <= yd.y || pos.y >= yd.y + yd.h - 1);
    const badCell = ch !== "." && ch !== "=" && ch !== "," && ch !== ":";
    if (!badCell && !outsideJail) continue;
    let moved = false;
    const ox0 = yd ? yd.x + Math.floor(yd.w / 2) : pos.x;
    const oy0 = yd ? yd.y + Math.floor(yd.h / 2) : pos.y;
    for (let r = 0; r <= 8 && !moved; r++) {
      for (let dy = -r; dy <= r && !moved; dy++) {
        for (let dx = -r; dx <= r && !moved; dx++) {
          const nx = ox0 + dx;
          const ny = oy0 + dy;
          const nc = get(g, nx, ny);
          if (nc !== "." && nc !== "=" && nc !== ",") continue;
          if (occupied.has(`${nx},${ny}`) && !(nx === pos.x && ny === pos.y)) continue;
          if (yd && (nx <= yd.x || nx >= yd.x + yd.w - 1 || ny <= yd.y || ny >= yd.y + yd.h - 1)) continue;
          occupied.delete(`${pos.x},${pos.y}`);
          occupied.add(`${nx},${ny}`);
          talkerCell.set(id, { x: nx, y: ny });
          const tm = entityMarks.find((e) => e.id === id && e.role === "talker");
          if (tm) {
            tm.x = nx;
            tm.y = ny;
          }
          moved = true;
        }
      }
    }
  }

  sanitizeOutdoorLuoyang(g, cx, cy);
  // 清洗后再钉洛阳门，防止真空填充/廊道冲掉牌楼
  punchWater(g, cx, cy - 2);
  punchWater(g, cx, cy + 2);
  set(g, cx, cy - 2, ";");
  set(g, cx, cy + 2, ";");
  for (const dy of [-1, 0, 1]) {
    for (const dx of [-1, 0, 1]) {
      if (get(g, cx + dx, cy + dy) !== "#") set(g, cx + dx, cy + dy, "=");
    }
  }
  set(g, cx, cy, "@");
  {
    const yd = yards.find((y) => y.key === "jail");
    const d = doors.get("jail");
    if (yd && d) {
      for (let xx = yd.x; xx < yd.x + yd.w; xx++) {
        set(g, xx, yd.y, "#");
        set(g, xx, yd.y + yd.h - 1, "#");
      }
      for (let yy = yd.y; yy < yd.y + yd.h; yy++) {
        set(g, yd.x, yy, "#");
        set(g, yd.x + yd.w - 1, yy, "#");
      }
      set(g, d.doorX, d.doorY, "G");
    }
  }
  for (const yd of yards) {
    if (yd.form !== "street") continue;
    const midX = yd.x + Math.floor(yd.w / 2);
    if (yd.door === "s") {
      const doorY = yd.y + yd.h - 1;
      for (const x of [midX, midX + 1]) {
        const c = get(g, x, cy - 5);
        if (c !== "#" && c !== "~" && c !== "^" && c !== "W" && c !== "E") set(g, x, cy - 5, "=");
        const lip = get(g, x, doorY + 1);
        if (lip !== "#" && lip !== "~" && lip !== "H") set(g, x, doorY + 1, "=");
      }
    } else if (yd.door === "n") {
      const doorY = yd.y;
      for (const x of [midX, midX + 1]) {
        const c = get(g, x, cy + 5);
        if (c !== "#" && c !== "~" && c !== "^" && c !== "W" && c !== "E") set(g, x, cy + 5, "=");
        const lip = get(g, x, doorY - 1);
        if (lip !== "#" && lip !== "~" && lip !== "H") set(g, x, doorY - 1, "=");
      }
    }
  }

  const palace = yards.find((y) => y.key === "shangyang");
  dressRoadEdges(
    g,
    doors.values(),
    palace ? [{ x: palace.x, y: palace.y, w: palace.w, h: palace.h }] : [],
    cx,
    cy,
  );
  for (const name of ["应天门", "端门", "上阳宫", "南市楼", "西市楼", "立德坊门", "通远坊门", "慈惠堂", "天津桥"]) {
    if (!nameSigns.includes(name)) nameSigns.push(name);
  }
  // 路肩布置之后再清一次干道，告示/灯不得占 = 
  const keepOnRoad = new Set(["=", "@", ";", "D", "W", "E", "N", "S"]);
  for (let x = 1; x < W - 1; x++) {
    for (const y of [cy - 5, cy + 5, cy]) {
      const c = get(g, x, y);
      if (!keepOnRoad.has(c) && c !== "#" && c !== "~" && c !== "%") set(g, x, y, "=");
    }
  }
  for (let y = 1; y < H - 1; y++) {
    for (const dx of [-1, 0, 1]) {
      const c = get(g, cx + dx, y);
      if (c === "~" || c === "%" || c === "#") continue;
      if (!keepOnRoad.has(c)) set(g, cx + dx, y, "=");
    }
  }
  set(g, cx, 1, "D");
  set(g, 1, cy - 5, "W");
  set(g, W - 2, cy - 5, "E");
  set(g, cx, cy - 2, ";");
  set(g, cx, cy + 2, ";");
  set(g, cx, cy, "@");

  // V7.3：树丛改由 fillBlankWindows6 统一补种
  {
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        if (get(g, x, y) === "&") {
          set(g, x, y, ".");
          occupied.delete(`${x},${y}`);
        }
      }
    }
  }

  // V7.1 凳白名单：酒楼/茶铺门前 + 坊内树下偶发 + 酒楼内 1
  {
    const keep: { x: number; y: number }[] = [];
    const pushKeep = (x: number, y: number) => {
      if (get(g, x, y) === "#" || get(g, x, y) === "~" || get(g, x, y) === "=") return;
      if (keep.some((k) => k.x === x && k.y === y)) return;
      keep.push({ x, y });
    };
    const wineD = doors.get("wine");
    const wineYd = yards.find((y) => y.key === "wine");
    if (wineD) {
      const ox = wineD.door === "e" ? 1 : wineD.door === "w" ? -1 : 0;
      const oy = wineD.door === "s" ? 1 : wineD.door === "n" ? -1 : 0;
      pushKeep(wineD.doorX + ox, wineD.doorY + oy + 1);
      pushKeep(wineD.doorX + ox, wineD.doorY + oy - 1);
    }
    if (wineYd) pushKeep(wineYd.x + 4, wineYd.y + 2);
    const tea = doors.get("shop4");
    if (tea) {
      pushKeep(tea.doorX - 1, tea.doorY + 1);
      pushKeep(tea.doorX + 1, tea.doorY + 1);
    }
    for (const key of ["home1", "home2", "home3", "home4", "home5", "home6"]) {
      const yd = yards.find((y) => y.key === key);
      if (!yd) continue;
      let placed = false;
      for (let yy = yd.y + 1; yy < yd.y + yd.h - 1 && !placed; yy++) {
        for (let xx = yd.x + 1; xx < yd.x + yd.w - 1 && !placed; xx++) {
          if (get(g, xx, yy) !== "&") continue;
          for (const [dx, dy] of [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ] as const) {
            const nx = xx + dx;
            const ny = yy + dy;
            if (get(g, nx, ny) === "." || get(g, nx, ny) === "t" || get(g, nx, ny) === "o") {
              pushKeep(nx, ny);
              placed = true;
              break;
            }
          }
        }
      }
    }
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        if (get(g, x, y) !== "t" && get(g, x, y) !== "o") continue;
        if (!keep.some((k) => k.x === x && k.y === y)) set(g, x, y, ".");
      }
    }
    let stools = 0;
    for (const k of keep) {
      if (stools >= V71_STOOL_MAX) break;
      const c = get(g, k.x, k.y);
      if (c === "#" || c === "~" || c === "=" || c === "H" || c === "&") continue;
      set(g, k.x, k.y, "t");
      stools += 1;
    }
  }

  // V7.1 人群：任意 3×3 内 talker + 出生格 ≤ 3
  {
    const bindOf = new Map(NPC_BINDINGS.map((b) => [b.npcId, b]));
    const positions = [...talkerCell.entries()];
    const crowdAt = (x: number, y: number) => {
      let n = 0;
      if (x === cx && y === cy) n += 1;
      for (const [, p] of talkerCell) {
        if (Math.abs(p.x - x) <= 1 && Math.abs(p.y - y) <= 1) n += 1;
      }
      return n;
    };
    const tryMove = (id: string, npcId: string) => {
      const bind = bindOf.get(npcId);
      if (!bind) return false;
      const cand = bindSpots(bind);
      for (const s of cand) {
        if (!canStand(s.x, s.y) && get(g, s.x, s.y) !== "." && get(g, s.x, s.y) !== ",") continue;
        if (occupied.has(`${s.x},${s.y}`)) continue;
        if (arterialTreeBan(s.x, s.y, cx, cy) && get(g, s.x, s.y) === "=") continue;
        const old = talkerCell.get(id)!;
        occupied.delete(`${old.x},${old.y}`);
        talkerCell.set(id, s);
        occupied.add(`${s.x},${s.y}`);
        const mark = entityMarks.find((m) => m.id === id && m.role === "talker");
        if (mark) {
          mark.x = s.x;
          mark.y = s.y;
        }
        if (crowdAt(s.x, s.y) <= 3) return true;
        occupied.delete(`${s.x},${s.y}`);
        talkerCell.set(id, old);
        occupied.add(`${old.x},${old.y}`);
        if (mark) {
          mark.x = old.x;
          mark.y = old.y;
        }
      }
      return false;
    };
    const snapToBind = () => {
      for (const [id, pos] of talkerCell) {
        const npcId = talkers[id];
        if (!npcId) continue;
        const bind = bindOf.get(npcId);
        if (!bind) continue;
        const spots = bindSpots(bind);
        if (npcOnBindSpot(g, bind, pos, virtualBox, spots)) continue;
        for (const s of spots) {
          if (!canStand(s.x, s.y)) continue;
          if (occupied.has(`${s.x},${s.y}`) && !(talkerCell.get(id)?.x === s.x && talkerCell.get(id)?.y === s.y))
            continue;
          occupied.delete(`${pos.x},${pos.y}`);
          talkerCell.set(id, s);
          occupied.add(`${s.x},${s.y}`);
          const mark = entityMarks.find((m) => m.id === id && m.role === "talker");
          if (mark) {
            mark.x = s.x;
            mark.y = s.y;
          }
          break;
        }
      }
    };
    for (let pass = 0; pass < 4; pass++) {
      let dirty = false;
      for (const [id, pos] of positions) {
        if (crowdAt(pos.x, pos.y) <= 3) continue;
        const npcId = talkers[id];
        if (!npcId) continue;
        if (tryMove(id, npcId)) dirty = true;
      }
      if (!dirty) break;
    }
    snapToBind();
  }

  sweepBareOutdoor(g, yards as LuoyangYardDef[], cx, cy);
  fillBlankWindows6(g, cx, cy, V73_TREE_MIN, V73_TREE_MAX);
  fixShoreRoads(g, cy);
  enforceTreeDensity(g);
  topUpV73Trees(g, cx, cy, V73_TREE_MIN);
  paintImperialAxis(g, cx, cy);
  paintPalaceWalls(g);
  while (countChar(g, "&") > V73_TREE_MAX) {
    let cut = false;
    for (let y = H - 2; y >= 1 && !cut; y--) {
      for (let x = W - 2; x >= 1 && !cut; x--) {
        if (get(g, x, y) !== "&") continue;
        if (x >= 58 && x < 80 && y >= 42 && y < 52) continue;
        set(g, x, y, ".");
        cut = true;
      }
    }
    if (!cut) break;
  }
  set(g, cx, cy - 2, ";");
  set(g, cx, cy + 2, ";");
  set(g, cx, cy, "@");
  set(g, 1, cy - 5, "W");
  set(g, W - 2, cy - 5, "E");
  set(g, YINGTIAN_GATE.x0, YINGTIAN_GATE.y, ":");
  set(g, cx, YINGTIAN_GATE.y, "H");
  set(g, YINGTIAN_GATE.x1, YINGTIAN_GATE.y, ":");
  set(g, cx, 1, "D");
  {
    const wineYd = yards.find((y) => y.key === "wine");
    const yamenYd = yards.find((y) => y.key === "yamen");
    if (wineYd) set(g, wineYd.x + 8, wineYd.y + 6, "q");
    if (yamenYd) set(g, yamenYd.x + 4, yamenYd.y + 4, "q");
  }
  enforceTreeDensity(g);
  ensureV73TreeMin(g, cx, cy, V73_TREE_MIN);
  enforceTreeDensity(g);
  ensureV73TreeMin(g, cx, cy, V73_TREE_MIN);
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      if (get(g, x, y) === "f") set(g, x, y, ".");
    }
  }
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      if (get(g, x, y) !== "f") continue;
      let onRoad = false;
      for (const [dx, dy] of [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ] as const) {
        if (get(g, x + dx, y + dy) === "=") onRoad = true;
      }
      if (Math.abs(x - cx) <= 2 || y === cy - 5 || y === cy + 5 || y === cy || onRoad) set(g, x, y, ".");
    }
  }
  {
    const wineYd = yards.find((y) => y.key === "wine");
    if (wineYd) set(g, wineYd.x + 10, wineYd.y + 3, "f");
  }
  trimLanternRuns(g);
  finalizeV73Lanterns(g, cx, cy, doors);
  set(g, 1, cy - 5, "W");
  set(g, W - 2, cy - 5, "E");

  LUOYANG_LABEL_ANCHORS = [];
  for (const yd of yards) {
    const d = doors.get(yd.key);
    if (!d) continue;
    let houseX: number | undefined;
    let houseY: number | undefined;
    for (let yy = yd.y; yy < yd.y + yd.h; yy++) {
      for (let xx = yd.x; xx < yd.x + yd.w; xx++) {
        if (get(g, xx, yy) === "H") {
          houseX = xx;
          houseY = yy;
        }
      }
    }
    LUOYANG_LABEL_ANCHORS.push({ key: yd.key, x: d.doorX, y: d.doorY, houseX, houseY });
  }
  LUOYANG_LABEL_ANCHORS.push({ key: "bridge", x: cx, y: cy - 4 });
  LUOYANG_LABEL_ANCHORS.push({ key: "templeOuter", x: 71, y: 30 });

  // 终局：人群再分散（后期步骤不再挪动 talker）
  {
    const bindOf = new Map(NPC_BINDINGS.map((b) => [b.npcId, b]));
    const crowdAt = (x: number, y: number) => {
      let n = 0;
      if (x === cx && y === cy) n += 1;
      for (const [, p] of talkerCell) {
        if (Math.abs(p.x - x) <= 1 && Math.abs(p.y - y) <= 1) n += 1;
      }
      return n;
    };
    for (let pass = 0; pass < 8; pass++) {
      let dirty = false;
      for (const [id, pos] of [...talkerCell]) {
        if (crowdAt(pos.x, pos.y) <= 3) continue;
        const npcId = talkers[id];
        if (!npcId) continue;
        const bind = bindOf.get(npcId);
        if (!bind) continue;
        const cand = bindSpots(bind).sort(
          (a, b) => crowdAt(a.x, a.y) - crowdAt(b.x, b.y),
        );
        for (const s of cand) {
          if (!canStand(s.x, s.y) && get(g, s.x, s.y) !== "." && get(g, s.x, s.y) !== ",") continue;
          if (occupied.has(`${s.x},${s.y}`)) continue;
          occupied.delete(`${pos.x},${pos.y}`);
          talkerCell.set(id, s);
          occupied.add(`${s.x},${s.y}`);
          const mark = entityMarks.find((m) => m.id === id && m.role === "talker");
          if (mark) {
            mark.x = s.x;
            mark.y = s.y;
          }
          dirty = true;
          break;
        }
      }
      if (!dirty) break;
    }
  }

  return {
    id: "luoyang" as SceneId,
    chapter: "court" as ChapterId,
    name: "洛阳·天津桥",
    kicker: "洛阳",
    enter:
      "天津桥三线石面。洛水横贯。北阙应天，西苑上阳，府衙靠桥。南市在桥北东，西市在桥南西。",
    mood: "桥上风硬。案卷比刀响。",
    ascii: g,
    npcs,
    talkers,
    entityMarks,
    portals: {
      D: { to: "yanshi", at: "W" },
      W: { to: "shanzhou", at: "E" },
      E: { to: "bianjing", at: "W" },
      FA: { to: "luoyang_yanbo_inner" as SceneId, at: "A" },
      GA: { to: "luoyang_yamen_prison" as SceneId, at: "A" },
      TB: { to: "luoyang_temple_outer" as SceneId, at: "A" },
    },
    order: [] as SealId[],
    gate: "open" as GateKind,
    signs: nameSigns,
    items: {} as Record<string, ItemId>,
  };
}
