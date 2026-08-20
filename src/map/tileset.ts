import type { Dir, SceneId, Tile } from "./types";

export const OUTDOOR = new Set<SceneId>([
  "wharf",
  "spit",
  "yard",
  "lamp",
  "sluice",
  "ropes",
  "lane",
  "drums",
  "outer",
  "plot",
  "ridge",
]);

export function isOutdoor(scene: SceneId): boolean {
  return OUTDOOR.has(scene);
}

const GREEN = new Set<SceneId>(["yard", "lane", "outer", "drums", "plot", "ridge", "wharf"]);
const CITY = new Set<SceneId>(["lane", "outer"]);
const CAVE = new Set<SceneId>(["cave", "cellar"]);

function frac(n: number): number {
  return n - Math.floor(n);
}

function hash(x: number, y: number, k: number): number {
  return frac(Math.sin(x * 127.1 + y * 311.7 + k * 74.7) * 43758.5453);
}

export function roadTex(scene: SceneId): string {
  // Rural tracks stay dirt; harbor towns use cobble; dense streets use brick.
  if (CITY.has(scene)) return "brick";
  if (scene === "plot" || scene === "ridge") return "dirt";
  if (scene === "wharf" || scene === "yard" || scene === "spit" || scene === "ropes" || scene === "lamp" || scene === "sluice") {
    return "cobble";
  }
  return "cobble";
}

export function groundTex(scene: SceneId, tile: Tile): string {
  if (tile === "water") return "water";
  if (tile === "wall") return "wall";
  if (tile === "hill") return "hill";
  if (tile === "rock") return CAVE.has(scene) ? "stone" : "rock";
  if (tile === "road" || tile === "gate") return roadTex(scene);
  if (tile === "pack") return "dirt";
  if (CAVE.has(scene)) return "stone";
  if (GREEN.has(scene)) return "grass";
  if (isOutdoor(scene)) return "path";
  if (scene === "glass" || scene === "inner") return "stone";
  return "wood";
}

export function texSrc(name: string): string {
  return `/art/tiles/sheet-${name}.png`;
}

function paintedSrc(name: string): string {
  return `/art/tiles/tile-${name}.png`;
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
  role?: "under" | "wall" | "post" | "bar-h" | "bar-v" | "arm-n" | "arm-e" | "arm-s" | "arm-w";
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
    kind === "dirt"
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

function wallBed(scene: SceneId, tiles: Tile[][], x: number, y: number): string {
  for (const [dx, dy] of [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ] as const) {
    const t = tiles[y + dy]?.[x + dx];
    if (t === "road" || t === "gate") return paintedName(roadTex(scene));
  }
  return paintedName(groundTex(scene, "floor"));
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
  if (OUTDOOR.has(scene)) {
    const h = tiles.length;
    const w = tiles[0]?.length ?? 0;
    if (x > 1 && y > 1 && x < w - 2 && y < h - 2) return "-warm";
  }
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
  if (!(throughH && !n && !s) && !(throughV && !e && !w)) {
    layers.push({ src: wallSrc("post", tone), role: "post" });
  }
  return layers;
}

export function tileArt(scene: SceneId, tiles: Tile[][], x: number, y: number): TileArt {
  const tile = tiles[y][x];
  if (tile === "water" || (isOutdoor(scene) && isCliffTile(tile))) {
    return finish([flat("water")]);
  }
  if (tile === "wall") return finish(wallLayers(scene, tiles, x, y));
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

export type StampName = "tree" | "bush" | `tree-${"pine" | "gold" | "olive"}` | `crag-${number}` | `tuft-${number}`;

export function plantStamp(scene: SceneId, tile: Tile, x: number, y: number): StampName | null {
  if (!OUTDOOR.has(scene)) return null;
  if (tile === "hill" || tile === "rock") {
    const n = hash(x, y, 3);
    if (n < 0.12) return treeStampAt(x, y);
    if (n < 0.28) return "bush";
    return null;
  }
  return null;
}

/** Authored trees pick a nearby canopy so a yard is not one clone stamped over. */
export function treeStampAt(x: number, y: number): StampName {
  const n = hash(x, y, 7);
  if (n < 0.2) return "bush";
  if (n < 0.4) return "tree-pine";
  if (n < 0.6) return "tree-gold";
  if (n < 0.78) return "tree-olive";
  return "tree";
}

export function stampSrc(name: StampName): string {
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
  kid: "worker",
  aunt: "woman",
  farmer: "woman",
  sentry: "clerk",
  woodcut: "worker",
  docker: "worker",
  carter: "worker",
  barber: "clerk",
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
  post: "lantern",
  bench: "chest",
  jar: "jar",
  well: "well",
  stone: "barrel",
  house: "hall",
};

export function objSrc(kind: string): string {
  return `/art/objs/obj-${OBJ[kind] ?? "barrel"}.png`;
}

export type DoorKind = "paifang" | "pavilion" | "hall";

const TEMPLE = new Set<SceneId>(["yard", "customs", "shrine", "drums", "outer", "glass", "inner"]);
const STORE = new Set<SceneId>(["hold", "salt", "shed", "ropes", "cellar"]);

export function doorKind(to: SceneId): DoorKind {
  if (TEMPLE.has(to)) return "paifang";
  if (STORE.has(to)) return "hall";
  if (to === "cave" || to === "cellar") return "hall";
  return "pavilion";
}

export function doorSrc(kind: DoorKind): string {
  return `/art/objs/obj-${kind}.png`;
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
): { x: number; y: number }[] {
  const cells: { x: number; y: number }[] = [];
  const have = new Set<string>();
  const fwd = faceDelta(facing);
  const add = (x: number, y: number) => {
    if (!inBounds(x, y, w, h)) return;
    const k = `${x},${y}`;
    if (have.has(k)) return;
    have.add(k);
    cells.push({ x, y });
  };
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) add(px + dx, py + dy);
  }
  const f1x = px + fwd.x;
  const f1y = py + fwd.y;
  const wallAhead = inBounds(f1x, f1y, w, h) && (blocked?.(f1x, f1y) ?? false);
  if (!wallAhead) add(px + fwd.x * 2, py + fwd.y * 2);
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
): Record<string, string[]> {
  const have = new Set(seen[scene] ?? []);
  for (const cell of visionCells(px, py, facing, w, h, blocked)) {
    have.add(tileKey(cell.x, cell.y));
  }
  return { ...seen, [scene]: [...have] };
}

export function isSeen(seen: Record<string, string[]>, scene: string, x: number, y: number): boolean {
  const list = seen[scene];
  if (!list) return false;
  return list.includes(tileKey(x, y));
}
