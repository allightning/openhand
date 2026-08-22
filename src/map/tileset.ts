import type { Dir, SceneId, Tile } from "./types";

export const OUTDOOR = new Set<SceneId>([
  "wharf",
  "spit",
  "yard",
  "lamp",
  "sluice",
  "ropes",
  "pit",
  "lane",
  "drums",
  "outer",
  "plot",
  "ridge",
  "ferry",
  "isle",
  "pier",
  "huainan",
  "yangzhou",
  "jiankang",
  "suzhou",
  "linan",
  "changan",
  "luoyang",
  "bianjing",
  "usurpCamp",
  "jiaxing",
  "wuxi",
  "changzhou",
  "chuzhou",
  "suqian",
  "suzhousu",
  "bozhou",
  "yanshi",
  "shanzhou",
  "tongguan",
  "gaoyou",
  "taxMarket",
  "taxGate",
  "taxStable",
  "taxWell",
  "taxAlley",
  "taxWine",
  "taxClinic",
  "taxLodge",
  "taxArchive",
  "taxTea",
  "taxClerk",
  "taxJail",
  "taxMartial",
  "taxEscort",
  "taxPawn",
  "ropeMarket",
  "ropeGate",
  "ropeQuay",
  "ropeWell",
  "ropeAlley",
  "ropeYard",
  "ropeWine",
  "ropeClinic",
  "ropeStore",
  "ropeLodge",
  "ropeMess",
  "ropeWatch",
  "ropeForge",
  "ropeMartial",
  "ropeEscort",
]);

export function isOutdoor(scene: SceneId): boolean {
  return OUTDOOR.has(scene);
}

const GREEN = new Set<SceneId>([
  "yard",
  "lane",
  "outer",
  "drums",
  "plot",
  "ridge",
  "wharf",
  "pit",
  "isle",
  "huainan",
  "yangzhou",
  "jiankang",
  "suzhou",
]);
const CAVE = new Set<SceneId>(["cave", "cellar"]);

function frac(n: number): number {
  return n - Math.floor(n);
}

function hash(x: number, y: number, k: number): number {
  return frac(Math.sin(x * 127.1 + y * 311.7 + k * 74.7) * 43758.5453);
}

/** 野外泥土碎石 / 小城草坪碎石 / 大城石砖碎石 */
export type RoadKind = "gravel-dirt" | "gravel-grass" | "gravel-brick";

export function roadTex(scene: SceneId): RoadKind {
  if (BRICK_CITY.has(scene)) return "gravel-brick";
  // 正式院外场默认草底碎石；院内路由 cell 邻砖判定
  const onGrass = new Set<SceneId>([
    "plot",
    "ridge",
    "isle",
    "pit",
    "ferry",
    "usurpCamp",
    "jiaxing",
    "chuzhou",
    "suqian",
    "bozhou",
    "yanshi",
    "shanzhou",
    "tongguan",
    "wuxi",
    "changzhou",
    "suzhousu",
    "gaoyou",
    "lane",
    "yard",
    "wharf",
    "spit",
  ]);
  if (COURTYARD.has(scene) || onGrass.has(scene)) return "gravel-grass";
  return "gravel-dirt";
}

/** 石砖仅限正式院落建筑（衙门、镖局等），不含岗坡等过渡区。 */
const COURTYARD = new Set<SceneId>([
  "yard",
  "drums",
  "outer",
  "palace",
  "yamen",
  "martial",
  "escort",
  "customs",
  "flower",
  "wine",
  "wineUp",
  "clinic",
  "lodge",
  "pawn",
  "taxWine",
  "taxClinic",
  "taxLodge",
  "taxArchive",
  "taxTea",
  "taxClerk",
  "taxJail",
  "taxMartial",
  "taxEscort",
  "taxPawn",
  "ropeWine",
  "ropeClinic",
  "ropeLodge",
  "ropeMess",
  "ropeWatch",
  "ropeForge",
  "ropeMartial",
  "ropeEscort",
  "ropeStore",
]);

/** 大城市：围墙内地坪石砖。小城/过渡区用草坪。 */
const BRICK_CITY = new Set<SceneId>([
  "linan",
  "luoyang",
  "bianjing",
  "changan",
  "yangzhou",
  "jiankang",
  "suzhou",
  "huainan",
]);

export function isCourtyard(scene: SceneId): boolean {
  return COURTYARD.has(scene);
}

export function isBrickCity(scene: SceneId): boolean {
  return BRICK_CITY.has(scene);
}

export function usesBrickFloor(scene: SceneId): boolean {
  return COURTYARD.has(scene) || BRICK_CITY.has(scene);
}

/** 这一格要不要铺石砖：大城整图；室内正式院整层；室外正式院用墙环/围合判定。 */
export function cellUsesBrick(scene: SceneId, tiles: Tile[][], x: number, y: number): boolean {
  if (BRICK_CITY.has(scene)) return true;
  if (COURTYARD.has(scene) && !isOutdoor(scene)) return true;
  if (!(COURTYARD.has(scene) || OUTDOOR.has(scene))) return false;
  const t = tiles[y]?.[x];
  if (t !== "floor" && t !== "road" && t !== "pack" && t !== "brazier" && t !== "seal" && t !== "sign" && t !== "item" && t !== "cache") {
    return false;
  }
  // 贴山崖的外场一律草地
  for (const [dx, dy] of [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ] as const) {
    const n = tiles[y + dy]?.[x + dx];
    if (n === "hill" || n === "rock") return false;
  }
  if (enclosedCourt(tiles, x, y)) return true;
  if (!COURTYARD.has(scene)) return false;
  return insideWallRing(tiles, x, y);
}

/** 四向射线都能在短距内撞到墙/门 → 认作院内。 */
function insideWallRing(tiles: Tile[][], x: number, y: number): boolean {
  const h = tiles.length;
  const w = tiles[0]?.length ?? 0;
  const hit = (dx: number, dy: number): boolean => {
    for (let i = 1; i <= 10; i++) {
      const nx = x + dx * i;
      const ny = y + dy * i;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) return false;
      const t = tiles[ny][nx];
      if (t === "wall" || t === "gate") return true;
      if (t === "hill" || t === "rock" || t === "water") return false;
    }
    return false;
  };
  return hit(0, -1) && hit(0, 1) && hit(-1, 0) && hit(1, 0);
}

export function groundTex(scene: SceneId, tile: Tile): string {
  if (tile === "water") return "water";
  if (tile === "wall") return "wall";
  if (tile === "hill") return "hill";
  if (tile === "rock") return CAVE.has(scene) ? "stone" : "rock";
  if (tile === "road" || tile === "gate") return roadTex(scene);
  if (tile === "pack") return "dirt";
  if (tile === "floor" && BRICK_CITY.has(scene)) return "brick";
  if (CAVE.has(scene)) return "stone";
  if (GREEN.has(scene)) return "grass";
  if (isOutdoor(scene)) return "grass";
  if (scene === "glass" || scene === "inner") return "stone";
  return "wood";
}

export function texSrc(name: string): string {
  return `/art/tiles/sheet-${name}.png`;
}

function paintedSrc(name: string): string {
  if (name === "gravel-dirt") return `/art/tiles/tile-gravel-dirt.png`;
  if (name === "gravel-dirt-h") return `/art/tiles/tile-gravel-dirt-h.png`;
  if (name === "gravel-dirt-x") return `/art/tiles/tile-gravel-dirt-x.png`;
  if (name === "gravel-grass") return `/art/tiles/tile-gravel-grass.png`;
  if (name === "gravel-grass-h") return `/art/tiles/tile-gravel-grass-h.png`;
  if (name === "gravel-grass-x") return `/art/tiles/tile-gravel-grass-x.png`;
  if (name === "gravel-brick") return `/art/tiles/tile-gravel-brick.png`;
  if (name === "gravel-brick-h") return `/art/tiles/tile-gravel-brick-h.png`;
  if (name === "gravel-brick-x") return `/art/tiles/tile-gravel-brick-x.png`;
  if (name === "gravel") return `/art/tiles/tile-gravel.png`;
  if (name === "cobble" || name === "brick") return `/art/tiles/tile-brick.png`;
  if (name === "dirt") return `/art/tiles/tile-dirt.png`;
  if (name === "dirt-h") return `/art/tiles/tile-dirt-h.png`;
  if (name === "path") return `/art/tiles/tile-path.png`;
  if (name === "grass") return `/art/tiles/tile-grass.png`;
  return `/art/tiles/tile-${name}.png`;
}

/** 路过水 → 桥：左右皆水用竖桥（南北通行），上下皆水用横桥。 */
export function bridgeAxis(tiles: Tile[][], x: number, y: number): "h" | "v" | null {
  const water = (t?: Tile) => t === "water";
  const n = water(tiles[y - 1]?.[x]);
  const s = water(tiles[y + 1]?.[x]);
  const e = water(tiles[y]?.[x + 1]);
  const w = water(tiles[y]?.[x - 1]);
  if (e && w) return "v";
  if (n && s) return "h";
  return null;
}

export function bridgeSrc(axis: "h" | "v"): string {
  return axis === "h" ? "/art/objs/obj-bridge-h.png" : "/art/objs/obj-bridge.png";
}

function cliffLayers(_scene: SceneId, tiles: Tile[][], x: number, y: number): TileLayer[] {
  const idx = coreIndex(x, y, 8);
  const layers: TileLayer[] = [
    { src: "/art/tiles/tile-hill-bed.png", role: "under" },
    { src: `/art/tiles/hill-core-${idx}.png`, role: "hill-core" },
  ];
  const n = tiles[y - 1]?.[x];
  const s = tiles[y + 1]?.[x];
  const e = tiles[y]?.[x + 1];
  const w = tiles[y]?.[x - 1];
  const open = (t?: Tile) => t === "floor" || t === "road" || t === "pack" || t === "gate";
  if (open(s) || open(e) || open(w) || open(n)) {
    const corner = [open(n), open(e), open(s), open(w)].filter(Boolean).length >= 2;
    layers.push({
      src: corner ? "/art/tiles/overlay-cliff-corner-fy.png" : "/art/tiles/overlay-cliff-fy.png",
      role: "post",
    });
  }
  return layers;
}

export const SHEET = 640;

export const ATLAS_COLS = 16;
export const ATLAS_CELL = 40;
export const BIT_N = 1;
export const BIT_NE = 2;
export const BIT_E = 4;
export const BIT_SE = 8;
export const BIT_S = 16;
export const BIT_SW = 32;
export const BIT_W = 64;
export const BIT_NW = 128;

const DIRS8: [number, number, number][] = [
  [0, -1, BIT_N],
  [1, -1, BIT_NE],
  [1, 0, BIT_E],
  [1, 1, BIT_SE],
  [0, 1, BIT_S],
  [-1, 1, BIT_SW],
  [-1, 0, BIT_W],
  [-1, -1, BIT_NW],
];

export function isCliffTile(tile: Tile): boolean {
  return tile === "hill" || tile === "rock";
}

export function neighborMask(
  tiles: Tile[][],
  x: number,
  y: number,
  same: (tile: Tile) => boolean,
  oobSame: boolean,
): number {
  const h = tiles.length;
  const w = tiles[0]?.length ?? 0;
  let mask = 0;
  for (const [dx, dy, bit] of DIRS8) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= w || ny >= h) {
      if (oobSame) mask |= bit;
      continue;
    }
    if (same(tiles[ny][nx])) mask |= bit;
  }
  return mask;
}

export function coreIndex(x: number, y: number, n = 8): number {
  return Math.floor(hash(x, y, 9) * n) % n;
}

export type TileLayer = {
  src: string;
  ox?: number;
  oy?: number;
  mask?: number;
  blend?: boolean;
  role?: "under" | "wall" | "post" | "bar-h" | "bar-v" | "arm-n" | "arm-e" | "arm-s" | "arm-w" | "hill-core";
};

function flat(name: string): TileLayer {
  return { src: paintedSrc(name) };
}

function paintedName(kind: string): string {
  if (
    kind === "water" ||
    kind === "wall" ||
    kind === "grass" ||
    kind === "wood" ||
    kind === "stone" ||
    kind === "masonry" ||
    kind === "path" ||
    kind === "cobble" ||
    kind === "brick" ||
    kind === "dirt" ||
    kind === "gravel" ||
    kind === "gravel-dirt" ||
    kind === "gravel-grass" ||
    kind === "gravel-brick"
  ) {
    return kind;
  }
  return "path";
}

export type TileArt = {
  key: string;
  src: string;
  mask?: number;
  layers: TileLayer[];
};

function atlasPos(mask: number): { px: number; py: number } {
  return { px: (mask % ATLAS_COLS) * ATLAS_CELL, py: Math.floor(mask / ATLAS_COLS) * ATLAS_CELL };
}

function finish(layers: TileLayer[]): TileArt {
  const key = layers.map((l) => `${l.src}:${l.ox ?? 0},${l.oy ?? 0},${l.mask ?? ""},${l.blend ? "b" : ""},${l.role ?? ""}`).join("|");
  return { key, src: layers[0]?.src ?? "", mask: layers.find((l) => l.mask !== undefined && !l.blend)?.mask, layers };
}

/** 墙下只铺与环境一致的地皮：室内木/石，室外草或石砖；绝不铺路。 */
function wallBed(scene: SceneId, tiles: Tile[][], x: number, y: number): string {
  if (!isOutdoor(scene)) {
    return paintedName(groundTex(scene, "floor"));
  }
  for (const [dx, dy] of [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ] as const) {
    const t = tiles[y + dy]?.[x + dx];
    if (t === "floor" && cellUsesBrick(scene, tiles, x + dx, y + dy)) return "brick";
    if (t === "floor") return "grass";
    if (t === "hill" || t === "rock") return "hill-bed";
  }
  if (BRICK_CITY.has(scene)) return "brick";
  return "grass";
}

function wallTone(scene: SceneId, tiles: Tile[][], x: number, y: number): "" | "-warm" | "-moss" {
  for (const [dx, dy] of [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ] as const) {
    if (tiles[y + dy]?.[x + dx] === "water") return "-moss";
  }
  // Keep outdoor walls on the solid default plate — warm variants read as faded.
  void scene;
  void x;
  void y;
  return "";
}

function wallSrc(piece: "post" | "bar-h" | "bar-v", tone: "" | "-warm" | "-moss" = ""): string {
  return `/art/tiles/wall-${piece}${tone}.png`;
}

function wallNeighbor(tiles: Tile[][], x: number, y: number): { n: boolean; e: boolean; s: boolean; w: boolean } {
  return {
    n: tiles[y - 1]?.[x] === "wall",
    e: tiles[y]?.[x + 1] === "wall",
    s: tiles[y + 1]?.[x] === "wall",
    w: tiles[y]?.[x - 1] === "wall",
  };
}

function wallLayers(scene: SceneId, tiles: Tile[][], x: number, y: number): TileLayer[] {
  const tone = wallTone(scene, tiles, x, y);
  const { n, e, s, w } = wallNeighbor(tiles, x, y);
  const layers: TileLayer[] = [{ ...flat(wallBed(scene, tiles, x, y)), role: "under" }];
  const throughH = e && w;
  const throughV = n && s;
  const count = [n, e, s, w].filter(Boolean).length;
  // Straight runs: continuous bar only — joint posts only at corners / ends / T
  if (throughH && !n && !s) {
    layers.push({ src: wallSrc("bar-h", tone), role: "bar-h" });
    return layers;
  }
  if (throughV && !e && !w) {
    layers.push({ src: wallSrc("bar-v", tone), role: "bar-v" });
    return layers;
  }
  if (throughH) layers.push({ src: wallSrc("bar-h", tone), role: "bar-h" });
  else {
    if (w) layers.push({ src: wallSrc("bar-h", tone), role: "arm-w" });
    if (e) layers.push({ src: wallSrc("bar-h", tone), role: "arm-e" });
  }
  if (throughV) layers.push({ src: wallSrc("bar-v", tone), role: "bar-v" });
  else {
    if (n) layers.push({ src: wallSrc("bar-v", tone), role: "arm-n" });
    if (s) layers.push({ src: wallSrc("bar-v", tone), role: "arm-s" });
  }
  const cornerOrJoint = count !== 2 || (n && e) || (e && s) || (s && w) || (w && n) || count >= 3;
  if (cornerOrJoint) layers.push({ src: wallSrc("post", tone), role: "post" });
  return layers;
}

function roadish(t?: Tile): boolean {
  return t === "road" || t === "gate" || t === "pack";
}

/** 墙内小院：从该格洪水填，碰不到地图外沿 → 石砖地。 */
const encloseMemo = new WeakMap<Tile[][], (boolean | null)[][]>();

export function enclosedCourt(tiles: Tile[][], x: number, y: number): boolean {
  const h = tiles.length;
  const w = tiles[0]?.length ?? 0;
  if (y < 0 || x < 0 || y >= h || x >= w) return false;
  if (tiles[y][x] !== "floor") return false;
  let memo = encloseMemo.get(tiles);
  if (!memo) {
    memo = Array.from({ length: h }, () => Array.from({ length: w }, () => null as boolean | null));
    encloseMemo.set(tiles, memo);
  }
  if (memo[y][x] !== null) return memo[y][x]!;

  const pass = (t?: Tile) =>
    t === "floor" || t === "road" || t === "pack" || t === "sign" || t === "item" || t === "cache" || t === "brazier" || t === "seal";
  // gate 算封口，不把院内泄到外场
  const seen = new Set<string>();
  const q: { x: number; y: number }[] = [{ x, y }];
  seen.add(`${x},${y}`);
  let hitEdge = false;
  let area = 0;
  for (let i = 0; i < q.length; i++) {
    const c = q[i];
    area += 1;
    if (area > 200) {
      hitEdge = true;
      break;
    }
    if (c.x <= 0 || c.y <= 0 || c.x >= w - 1 || c.y >= h - 1) hitEdge = true;
    for (const [dx, dy] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ] as const) {
      const nx = c.x + dx;
      const ny = c.y + dy;
      const key = `${nx},${ny}`;
      if (seen.has(key)) continue;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) {
        hitEdge = true;
        continue;
      }
      const t = tiles[ny][nx];
      if (t === "wall" || t === "gate") continue;
      if (!pass(t)) continue;
      seen.add(key);
      q.push({ x: nx, y: ny });
    }
  }
  // 小围合且碰不到外沿 → 院落石砖
  const court = !hitEdge && area >= 4 && area <= 160;
  for (const key of seen) {
    const [sx, sy] = key.split(",").map(Number);
    if (tiles[sy]?.[sx] === "floor") memo[sy][sx] = court;
  }
  return court;
}

/** Horizontal / vertical / cross (no direction) for road paint. */
export function roadAxis(tiles: Tile[][], x: number, y: number): "h" | "v" | "x" {
  const n = roadish(tiles[y - 1]?.[x]);
  const s = roadish(tiles[y + 1]?.[x]);
  const e = roadish(tiles[y]?.[x + 1]);
  const w = roadish(tiles[y]?.[x - 1]);
  const hv = (e ? 1 : 0) + (w ? 1 : 0);
  const vv = (n ? 1 : 0) + (s ? 1 : 0);
  // 十字路口：无导向碎石
  if (hv > 0 && vv > 0) return "x";
  if (hv > vv) return "h";
  if (vv > hv) return "v";
  return "v";
}

export function tileArt(scene: SceneId, tiles: Tile[][], x: number, y: number): TileArt {
  const tile = tiles[y][x];
  if (tile === "water") {
    // 取消水岸：纯水面
    return finish([{ src: paintedSrc("water"), role: "under" }]);
  }
  if (tile === "hill") {
    return finish(cliffLayers(scene, tiles, x, y));
  }
  if (tile === "rock") {
    const idx = coreIndex(x, y, 8);
    return finish([
      { src: paintedSrc(CAVE.has(scene) ? "stone" : "grass"), role: "under" },
      { src: `/art/tiles/rock-core-${idx}.png`, role: "hill-core" },
    ]);
  }
  if (tile === "wall") return finish(wallLayers(scene, tiles, x, y));
  // 一格宽的路：横/竖分贴；过水变桥；石砖区铺在砖上
  if (tile === "road" || tile === "gate") {
    const bridge = bridgeAxis(tiles, x, y);
    if (bridge) {
      return finish([
        { src: paintedSrc("water"), role: "under" },
        { src: bridgeSrc(bridge), role: "under" },
      ]);
    }
    const brickBed =
      BRICK_CITY.has(scene) ||
      cellUsesBrick(scene, tiles, x, y) ||
      cellUsesBrick(scene, tiles, x - 1, y) ||
      cellUsesBrick(scene, tiles, x + 1, y) ||
      cellUsesBrick(scene, tiles, x, y - 1) ||
      cellUsesBrick(scene, tiles, x, y + 1);
    // 石砖区铺青石板，不用泥土碎石心
    if (brickBed) {
      return finish([
        { src: paintedSrc("brick"), role: "under" },
        { src: "/art/tiles/tile-cobble.png", role: "under" },
      ]);
    }
    const kind = roadTex(scene) === "gravel-brick" ? "gravel-grass" : roadTex(scene);
    const axis = roadAxis(tiles, x, y);
    const suffix = axis === "h" ? "-h" : axis === "x" ? "-x" : "";
    const roadSrc = paintedSrc(`${kind}${suffix}`);
    if (kind === "gravel-grass") {
      return finish([
        { src: paintedSrc("grass"), role: "under" },
        { src: roadSrc, role: "under" },
      ]);
    }
    return finish([{ src: roadSrc, role: "under" }]);
  }
  if (tile === "pack") {
    return finish([
      { src: paintedSrc("grass"), role: "under" },
      { src: paintedSrc("dirt"), role: "under" },
    ]);
  }
  // 炉/印/箱等占格：石砖院与大城用砖底，勿露草皮
  if (tile === "seal" || tile === "brazier" || tile === "sign" || tile === "item" || tile === "cache") {
    if (BRICK_CITY.has(scene) || COURTYARD.has(scene) || cellUsesBrick(scene, tiles, x, y)) {
      return finish([{ src: paintedSrc("brick"), role: "under" }]);
    }
    if (OUTDOOR.has(scene)) {
      return finish([{ src: paintedSrc("grass"), role: "under" }]);
    }
  }
  if (tile === "floor") {
    if (cellUsesBrick(scene, tiles, x, y)) {
      return finish([{ src: paintedSrc("brick"), role: "under" }]);
    }
    if (OUTDOOR.has(scene)) {
      return finish([{ src: paintedSrc("grass"), role: "under" }]);
    }
  }
  return finish([flat(paintedName(groundTex(scene, tile)))]);
}

export function texMarkup(art: TileArt): string {
  return art.layers
    .map((layer) => {
      if (layer.blend && layer.mask !== undefined) {
        const { px, py } = atlasPos(layer.mask);
        return `<div class="tex sheet blend" style="background-image:url('${layer.src}');background-position:-${layer.ox}px -${layer.oy}px;-webkit-mask-image:url('/art/tiles/mask-blend.png');mask-image:url('/art/tiles/mask-blend.png');-webkit-mask-position:-${px}px -${py}px;mask-position:-${px}px -${py}px"></div>`;
      }
      if (layer.mask !== undefined) {
        const { px, py } = atlasPos(layer.mask);
        return `<div class="tex atlas overlay" style="background-image:url('${layer.src}');background-position:-${px}px -${py}px"></div>`;
      }
      if (layer.ox === undefined || layer.oy === undefined) {
        const role = layer.role ? ` ${layer.role}` : "";
        return `<img class="tex${role}" src="${layer.src}" alt="" draggable="false">`;
      }
      return `<div class="tex sheet" style="background-image:url('${layer.src}');background-position:-${layer.ox}px -${layer.oy}px"></div>`;
    })
    .join("");
}

export type StampName =
  | "tree"
  | "bush"
  | `tree-${"pine" | "gold" | "olive"}`
  | `crag-${number}`
  | `tuft-${number}`
  | "tuft-fy"
  | "tree-pot";

export function plantStamp(scene: SceneId, tile: Tile, x: number, y: number, tiles?: Tile[][]): StampName | null {
  if (!OUTDOOR.has(scene)) return null;
  // 山崖只靠崖面贴图，不嵌树丛/草影
  if (tile === "hill" || tile === "rock") return null;
  // 装饰只铺草影，不挡路；完整树/灌木一律手摆 `&`（实体）
  if (tile === "floor" || tile === "pack" || tile === "road") {
    const onBrick =
      tile === "floor" &&
      (tiles ? cellUsesBrick(scene, tiles, x, y) : usesBrickFloor(scene));
    if (onBrick) return null;
    const n = hash(x, y, 5);
    if (n < 0.08) return "tuft-fy";
  }
  return null;
}

/** Authored trees pick a nearby canopy so a yard is not one clone stamped over. */
export function treeStampAt(x: number, y: number): StampName {
  const n = hash(x, y, 7);
  if (n < 0.18) return "bush";
  if (n < 0.4) return "tree-pine";
  if (n < 0.58) return "tree-gold";
  if (n < 0.76) return "tree-olive";
  return "tree";
}

/** 院内 / 石砖：镂空树冠，禁止 stamp-tree-pot（烘焙草地会糊成绿块）。 */
export function courtyardTreeStamp(x: number, y: number): StampName {
  const n = hash(x, y, 7);
  if (n < 0.28) return "bush";
  if (n < 0.5) return "tree-pine";
  if (n < 0.7) return "tree";
  if (n < 0.86) return "tree-olive";
  return "tree-gold";
}

export function stampSrc(name: StampName): string {
  if (name === "tuft-fy") return `/art/sprites/stamp-tuft-fy.png`;
  if (name === "tree-pot") return `/art/sprites/stamp-tree-pot.png`;
  return `/art/sprites/stamp-${name}.png`;
}

const SPRITE: Record<string, string> = {
  rail: "rail",
  clerk: "clerk",
  stamp: "clerk",
  filer: "clerk",
  scribe: "clerk",
  usher: "clerk",
  guest: "clerk",
  watch: "clerk",
  boat: "woman",
  fisher: "woman",
  inn: "woman",
  maid: "woman",
  pilgrim: "woman",
  porter: "worker",
  saltman: "worker",
  roper: "worker",
  wright: "worker",
  coolie: "worker",
  sluicer: "worker",
  lamper: "worker",
  piler: "worker",
  digger: "worker",
  hermit: "worker",
  beggar: "clerk",
  fugitive: "clerk",
  catcher: "foe",
  escort: "foe",
  hauler: "foe",
  alley: "foe",
  trapper: "foe",
  delay: "foe",
  twin: "foe",
  lord: "foe",
  bandit: "foe",
  raider: "foe",
  robber: "foe",
  smuggler: "foe",
  thug: "foe",
  intruder: "foe",
  brute: "foe",
  cavehand: "foe",
  warden: "foe",
  inkhand: "foe",
  bookcut: "foe",
  nametaker: "foe",
  glasspin: "foe",
  knotboss: "foe",
  stakeboss: "foe",
  hawker: "woman",
  vendor: "worker",
  kid: "rail",
  aunt: "woman",
  farmer: "woman",
  sentry: "clerk",
  woodcut: "worker",
  docker: "sapper",
  carter: "seer",
  barber: "clerk",
  butcher: "foe",
  monk: "woman",
  bailiff: "foe",
  barkeep: "clerk",
  drinker: "worker",
  hostess: "woman",
  lute: "woman",
  doctor: "clerk",
  coach: "worker",
  warder: "clerk",
  tutorPace: "worker",
  tutorWard: "worker",
  tutorEdge: "clerk",
  seer: "seer",
  sapper: "sapper",
};

export function spriteSrc(id: string): string {
  return `/art/sprites/sprite-${SPRITE[id] ?? "worker"}.png`;
}

const OBJ: Record<string, string> = {
  barrel: "barrel",
  crate: "chest",
  cart: "cart",
  lantern: "lantern",
  coil: "coil",
  post: "pile",
  bench: "bench",
  jar: "jar",
  well: "well",
  stone: "barrel",
  house: "hut",
  stall: "stall",
  arch: "paifang",
  dummy: "dummy",
  table: "table",
  stool: "stool",
  rack: "rack",
  sandbag: "sandbag",
  cabinet: "cabinet",
  shelf: "shelf",
  bed: "bed",
  counter: "counter",
  screen: "screen",
  censer: "censer",
  basin: "basin",
  drum: "drum",
  mat: "mat",
  banner: "banner",
  board: "board",
  pot: "pot",
  desk: "desk",
};

export function objSrc(kind: string): string {
  return `/art/objs/obj-${OBJ[kind] ?? "barrel"}.png`;
}

export type DoorKind = "paifang" | "pavilion" | "hall" | "ferry" | "post" | "wine" | "camp" | "shrine" | "hut";

const TEMPLE = new Set<SceneId>([
  "yard",
  "drums",
  "outer",
  "glass",
  "inner",
  "palace",
  "yamen",
  "martial",
  "escort",
  "seerGaze",
  "luoyang",
  "bianjing",
  "changan",
  "tongguan",
]);
const STORE = new Set<SceneId>([
  "hold",
  "salt",
  "shed",
  "ropes",
  "cellar",
  "pit",
  "clinic",
  "pawn",
  "lodge",
  "customs",
  "railNight",
  "sapperPile",
  "linan",
  "suzhou",
  "jiankang",
  "taxClinic",
  "taxLodge",
  "taxArchive",
  "taxClerk",
  "taxJail",
  "taxPawn",
  "taxMartial",
  "taxEscort",
  "ropeClinic",
  "ropeLodge",
  "ropeMess",
  "ropeStore",
  "ropeWatch",
  "ropeForge",
  "ropeMartial",
  "ropeEscort",
  "taxMarket",
  "ropeMarket",
  "taxGate",
  "ropeGate",
]);
const FERRY = new Set<SceneId>([
  "wharf",
  "pier",
  "spit",
  "ferry",
  "isle",
  "suqian",
  "gaoyou",
  "jiaxing",
  "yangzhou",
]);
const POST = new Set<SceneId>([
  "bozhou",
  "yanshi",
  "shanzhou",
  "changzhou",
  "wuxi",
  "suzhousu",
  "huainan",
]);
const SHRINE = new Set<SceneId>(["shrine", "tea", "chuzhou"]);
const WINE = new Set<SceneId>(["wine", "wineUp", "flower", "taxWine", "ropeWine", "taxTea"]);
const CAMP = new Set<SceneId>(["usurpCamp"]);

export function doorKind(to: SceneId): DoorKind {
  if (CAMP.has(to)) return "camp";
  if (WINE.has(to)) return "wine";
  if (SHRINE.has(to)) return "shrine";
  if (FERRY.has(to)) return "ferry";
  if (POST.has(to)) return "post";
  if (TEMPLE.has(to)) return "paifang";
  if (STORE.has(to)) return "hall";
  if (to === "cave" || to === "cellar") return "hall";
  if (to === "hut" || to === "plot") return "hut";
  if (to === "ridge") return "post";
  return "hall";
}

export function doorSrc(kind: DoorKind, _edge: "h" | "v" | "" = "h"): string {
  // 一律横向正脸贴图，不再分竖向/旋转
  return `/art/objs/obj-${kind}-h.png`;
}

/**
 * 门朝向提示（仅布局用）：左右边横路尽头、上下边正门通路。
 * 贴图一律横向，此函数不再驱动精灵旋转。
 */
export function portalEdge(tiles: Tile[][], x: number, y: number): "h" | "v" | "" {
  const h = tiles.length;
  const w = tiles[0]?.length ?? 0;
  if (x <= 1 || x >= w - 2) return "h"; // 左右边也横着放
  if (y <= 1 || y >= h - 2) return "h";
  const solid = (nx: number, ny: number): boolean => {
    if (nx < 0 || ny < 0 || nx >= w || ny >= h) return true;
    const t = tiles[ny]?.[nx];
    return t === "wall" || t === "rock" || t === "hill" || t === "water";
  };
  if (solid(x - 1, y) && solid(x + 1, y)) return "h";
  if (solid(x, y - 1) && solid(x, y + 1)) return "h";
  return "h";
}

/** 大城/要地门口可夹墙；小地点不必。 */
export function wantsPortalFrame(to: SceneId): boolean {
  return (
    TEMPLE.has(to) ||
    STORE.has(to) ||
    FERRY.has(to) ||
    to === "ridge" ||
    to === "plot" ||
    to === "hut" ||
    to === "yamen" ||
    to === "customs" ||
    to === "hold" ||
    to === "huainan" ||
    to === "bianjing" ||
    to === "changan" ||
    to === "luoyang" ||
    to === "jiankang" ||
    to === "linan" ||
    to === "suzhou" ||
    to === "yangzhou"
  );
}

/** 墙缝门朝向：上下夹墙 → 竖门；左右夹墙 → 横门。 */
export function wallSeamEdge(tiles: Tile[][], x: number, y: number): "h" | "v" {
  const h = tiles.length;
  const w = tiles[0]?.length ?? 0;
  const solid = (nx: number, ny: number): boolean => {
    if (nx < 0 || ny < 0 || nx >= w || ny >= h) return true;
    const t = tiles[ny]?.[nx];
    return t === "wall" || t === "rock" || t === "hill" || t === "water";
  };
  const n = solid(x, y - 1);
  const s = solid(x, y + 1);
  const e = solid(x + 1, y);
  const west = solid(x - 1, y);
  if (n && s) return "v";
  if (e && west) return "h";
  return "h";
}

export function archSrc(tiles: Tile[][], x: number, y: number): string {
  return `/art/objs/obj-paifang-${wallSeamEdge(tiles, x, y)}.png`;
}

/** 传送点是否在路尽头（本格是路，且通向内侧的一格也是路/包地）。 */
export function portalOnRoadEnd(tiles: Tile[][], x: number, y: number): boolean {
  const h = tiles.length;
  const w = tiles[0]?.length ?? 0;
  const roadish = (t?: Tile) => t === "road" || t === "gate" || t === "pack";
  if (!roadish(tiles[y]?.[x])) return false;
  const onLeft = x <= 1;
  const onRight = x >= w - 2;
  const onTop = y <= 1;
  const onBot = y >= h - 2;
  if (onLeft) return roadish(tiles[y]?.[x + 1]);
  if (onRight) return roadish(tiles[y]?.[x - 1]);
  if (onTop) return roadish(tiles[y + 1]?.[x]);
  if (onBot) return roadish(tiles[y - 1]?.[x]);
  // 内部门：至少一邻格是路
  return (
    roadish(tiles[y - 1]?.[x]) ||
    roadish(tiles[y + 1]?.[x]) ||
    roadish(tiles[y]?.[x - 1]) ||
    roadish(tiles[y]?.[x + 1])
  );
}

export function portalHasFrame(tiles: Tile[][], x: number, y: number): boolean {
  const h = tiles.length;
  const w = tiles[0]?.length ?? 0;
  const rim = (nx: number, ny: number) => nx === 0 || ny === 0 || nx === w - 1 || ny === h - 1;
  for (const [dx, dy] of [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ] as const) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
    if (tiles[ny][nx] === "wall" && !rim(nx, ny)) return true;
  }
  return false;
}

export function portalInThreshold(tiles: Tile[][], x: number, y: number): boolean {
  const h = tiles.length;
  const w = tiles[0]?.length ?? 0;
  const blocked = (nx: number, ny: number) => {
    if (nx < 0 || ny < 0 || nx >= w || ny >= h) return true;
    const t = tiles[ny][nx];
    return t === "wall" || t === "water" || t === "rock";
  };
  return (blocked(x - 1, y) && blocked(x + 1, y)) || (blocked(x, y - 1) && blocked(x, y + 1));
}

export function tileKey(x: number, y: number): string {
  return `${x},${y}`;
}

function inBounds(x: number, y: number, w: number, h: number): boolean {
  return x >= 0 && y >= 0 && x < w && y < h;
}

export function faceDelta(dir: Dir): { x: number; y: number } {
  if (dir === "up") return { x: 0, y: -1 };
  if (dir === "down") return { x: 0, y: 1 };
  if (dir === "left") return { x: -1, y: 0 };
  return { x: 1, y: 0 };
}

export function sideDelta(dir: Dir): { left: { x: number; y: number }; right: { x: number; y: number } } {
  if (dir === "up") return { left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
  if (dir === "down") return { left: { x: 1, y: 0 }, right: { x: -1, y: 0 } };
  if (dir === "left") return { left: { x: 0, y: 1 }, right: { x: 0, y: -1 } };
  return { left: { x: 0, y: -1 }, right: { x: 0, y: 1 } };
}

export function visionCells(
  px: number,
  py: number,
  facing: Dir,
  w: number,
  h: number,
  blocked?: (x: number, y: number) => boolean,
  outdoor = true,
): { x: number; y: number }[] {
  const cells: { x: number; y: number }[] = [];
  const have = new Set<string>();
  const fwd = faceDelta(facing);
  const side = sideDelta(facing);
  // 室外宽：大地图要认路；室内窄：房间已有墙隔断，留一点灯火感
  const near = outdoor ? 3 : 2;
  const cone = outdoor ? 5 : 3;
  const add = (x: number, y: number) => {
    if (!inBounds(x, y, w, h)) return;
    const k = `${x},${y}`;
    if (have.has(k)) return;
    have.add(k);
    cells.push({ x, y });
  };
  for (let dy = -near; dy <= near; dy++) {
    for (let dx = -near; dx <= near; dx++) add(px + dx, py + dy);
  }
  for (let dist = 1; dist <= cone; dist++) {
    const cx = px + fwd.x * dist;
    const cy = py + fwd.y * dist;
    if (!inBounds(cx, cy, w, h)) break;
    if (blocked?.(cx, cy)) {
      add(cx, cy);
      break;
    }
    add(cx, cy);
    add(cx + side.left.x, cy + side.left.y);
    add(cx + side.right.x, cy + side.right.y);
  }
  return cells;
}

export function markVision(
  seen: Record<string, string[]>,
  scene: string,
  px: number,
  py: number,
  facing: Dir,
  w: number,
  h: number,
  blocked?: (x: number, y: number) => boolean,
  outdoor = true,
): Record<string, string[]> {
  const have = new Set(seen[scene] ?? []);
  for (const cell of visionCells(px, py, facing, w, h, blocked, outdoor)) {
    have.add(tileKey(cell.x, cell.y));
  }
  return { ...seen, [scene]: [...have] };
}

export function isSeen(seen: Record<string, string[]>, scene: string, x: number, y: number): boolean {
  const list = seen[scene];
  if (!list) return false;
  return list.includes(tileKey(x, y));
}
