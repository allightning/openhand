import type { SceneId } from "../map/types";

const FILE: Record<string, string> = {
  rail: "rail",
  clerk: "clerk",
  porter: "porter",
  fisher: "boat",
  digger: "coolie",
  beggar: "guest",
  hawker: "inn",
  vendor: "porter",
  kid: "coolie",
  aunt: "inn",
  farmer: "inn",
  sentry: "watch",
  woodcut: "wright",
  docker: "coolie",
  carter: "porter",
  barber: "usher",
  warder: "watch",
  tutorPace: "wright",
  tutorWard: "porter",
  tutorEdge: "usher",
  hermit: "wright",
  fugitive: "scribe",
  stamp: "stamp",
  boat: "boat",
  catcher: "catcher",
  filer: "scribe",
  scribe: "scribe",
  saltman: "salt",
  roper: "roper",
  lamper: "lamper",
  pilgrim: "pilgrim",
  sluicer: "sluicer",
  wright: "wright",
  coolie: "coolie",
  escort: "escort",
  piler: "piler",
  inn: "inn",
  guest: "guest",
  watch: "watch",
  usher: "usher",
  maid: "maid",
  hauler: "hauler",
  alley: "alley",
  trapper: "trapper",
  delay: "delay",
  twin: "twin",
  lord: "lord",
  bandit: "hauler",
  raider: "hauler",
  robber: "alley",
  smuggler: "salt",
  thug: "alley",
  intruder: "guest",
  brute: "piler",
  cavehand: "hauler",
  warden: "watch",
  seer: "scribe",
  sapper: "piler",
  inkhand: "scribe",
  bookcut: "scribe",
  nametaker: "scribe",
  glasspin: "trapper",
  knotboss: "hauler",
  stakeboss: "piler",
};

const SCENE_BG: Record<SceneId, string> = {
  hut: "map-hold",
  plot: "map-yard",
  ridge: "map-yard",
  wharf: "map-harbor",
  spit: "map-harbor",
  lamp: "map-harbor",
  sluice: "map-harbor",
  ropes: "map-harbor",
  yard: "map-yard",
  hold: "map-hold",
  salt: "map-hold",
  docks: "map-hold",
  shed: "map-hold",
  customs: "map-office",
  shrine: "map-shrine",
  lane: "map-lane",
  tea: "map-tea",
  drums: "map-tea",
  outer: "map-court",
  glass: "map-glass",
  inner: "map-inner",
  cave: "map-hold",
  cellar: "map-hold",
};

export function standFile(id: string): string {
  return FILE[id] ?? "rail";
}

export function hasStand(id: string): boolean {
  return Boolean(FILE[id]);
}

export function standSrc(id: string, cut = true): string {
  return cut ? `/art/stand/${standFile(id)}.png` : `/art/${standFile(id)}.png`;
}

export function stand(id: string, kind = ""): string {
  return `<img class="stand ${kind}" src="${standSrc(id, true)}" alt="" draggable="false">`;
}

export function sceneBg(scene: SceneId): string {
  return `/art/maps/${SCENE_BG[scene]}.png`;
}

export function titleBg(): string {
  return "/art/maps/bg-title.png";
}

export function combatBg(scene?: SceneId): string {
  const set =
    scene === "plot" || scene === "ridge" || scene === "yard"
      ? "combat-yard"
      : scene === "wharf" || scene === "spit" || scene === "lamp" || scene === "ropes" || scene === "docks" || scene === "sluice"
        ? "combat-harbor"
        : scene === "lane" || scene === "drums" || scene === "tea" || scene === "outer"
          ? "combat-lane"
          : scene === "customs" || scene === "shrine" || scene === "glass" || scene === "inner"
            ? "combat-court"
            : scene === "hut" || scene === "hold" || scene === "salt" || scene === "shed" || scene === "cave" || scene === "cellar"
              ? "combat-hold"
              : "combat";
  return `/art/maps/bg-${set}.png`;
}
