import type { SceneId } from "../map/types";
import { artUrl } from "./artUrl";

/**
 * Stand plates. Rule: party heroes/mates keep exclusive plates;
 * road NPCs and foes must not reuse those faces.
 * Shared only when the talker IS the mate who later joins (porter/boat/watch/…).
 */
const FILE: Record<string, string> = {
  // party / heroes
  rail: "rail",
  seer: "scribe",
  sapper: "wright",
  porter: "porter",
  boat: "boat",
  watch: "watch",
  pilgrim: "pilgrim",
  hooker: "roper",
  hermit: "lamper",
  // road talkers (joiners keep their plate)
  clerk: "clerk",
  fisher: "sluicer",
  digger: "coolie",
  beggar: "guest",
  hawker: "inn",
  roadHawker: "inn",
  roadBeggar: "guest",
  roadHunter: "wright",
  roadPatient: "coolie",
  vendor: "salt",
  kid: "piler",
  aunt: "maid",
  farmer: "sluicer",
  sentry: "escort",
  woodcut: "wright",
  docker: "roper",
  carter: "coolie",
  barber: "usher",
  butcher: "hauler",
  monk: "pilgrim",
  bailiff: "escort",
  barkeep: "stamp",
  drinker: "guest",
  hostess: "maid",
  lute: "inn",
  doctor: "clerk",
  coach: "escort",
  warder: "usher",
  tutorPace: "escort",
  tutorWard: "clerk",
  tutorEdge: "usher",
  fugitive: "coolie",
  stamp: "stamp",
  catcher: "catcher",
  filer: "delay",
  scribe: "stamp",
  saltman: "salt",
  roper: "roper",
  lamper: "coolie",
  sluicer: "sluicer",
  wright: "wright",
  coolie: "coolie",
  escort: "escort",
  piler: "piler",
  inn: "inn",
  guest: "guest",
  usher: "usher",
  maid: "maid",
  hauler: "hauler",
  alley: "alley",
  trapper: "trapper",
  delay: "delay",
  twin: "twin",
  lord: "lord",
  // foes — never party plates
  bandit: "alley",
  raider: "alley",
  robber: "trapper",
  smuggler: "salt",
  thug: "alley",
  thief: "guest",
  hillBandit: "alley",
  riverThug: "hauler",
  intruder: "guest",
  brute: "hauler",
  cavehand: "piler",
  warden: "escort",
  inkhand: "delay",
  bookcut: "alley",
  nametaker: "lord",
  glasspin: "trapper",
  knotboss: "hauler",
  stakeboss: "piler",
  usurper: "lord",

  // —— 洛阳具名（禁止回落 alley；按职/龄/性分散到既有 stand PNG）——
  judge: "lord",
  caseclerk: "scribe",
  luoBailiff: "escort",
  luoClerk: "clerk",
  luoJailer: "usher",
  luoJailer2: "watch",
  luoPrisoner: "trapper",
  luoBarkeeper: "stamp",
  luoCook: "hauler",
  luoWaiter: "piler",
  luoWaiter2: "twin",
  luoGuest: "guest",
  luoGuest2: "inn",
  luoRaconteur: "lamper",
  luoFlower: "maid",
  luoAsha: "inn",
  luoMadam: "maid",
  luoGirl: "twin",
  luoGirl2: "maid",
  luoMusician: "roper",
  luoTurtle: "coolie",
  luoEmbroid: "maid",
  luoCoach: "escort",
  luoDisciple: "wright",
  luoDisciple2: "catcher",
  luoDisciple3: "usher",
  luoYardHand: "coolie",
  luoDoctor: "clerk",
  luoHerbBoy: "piler",
  luoHerb: "salt",
  luoHerb2: "inn",
  luoVendor: "salt",
  luoTemple: "pilgrim",
  luoPost: "porter",
  messenger: "boat",
  luoAntique: "stamp",
  luoHawker: "inn",
  luoShopHand: "twin",
  luoShopWife: "maid",
  luoBeggar: "guest",
  luoTeaGirl: "inn",
  luoElder: "lamper",
  luoElder2: "sluicer",
  luoKid: "piler",
  luoKid2: "twin",
  luoWife: "maid",
  passClerk: "scribe",
  luoGate: "watch",
  luoWasher: "sluicer",
  townWatch: "watch",
};

const SCENE_BG: Partial<Record<SceneId, string>> = {
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
  palace: "map-court",
  glass: "map-glass",
  inner: "map-inner",
  cave: "map-hold",
  cellar: "map-hold",
  pit: "map-harbor",
  ferry: "map-harbor",
  isle: "map-court",
  yamen: "map-office",
  wine: "map-tea",
  flower: "map-harbor",
  clinic: "map-hold",
  pier: "map-harbor",
  pawn: "map-lane",
  escort: "map-harbor",
  martial: "map-tea",
  lodge: "map-tea",
  railNight: "map-lane",
  seerGaze: "map-court",
  sapperPile: "map-harbor",
  huainan: "map-harbor",
  yangzhou: "map-harbor",
  jiankang: "map-lane",
  suzhou: "map-lane",
  linan: "map-lane",
  changan: "map-court",
  luoyang: "map-court",
  bianjing: "map-court",
  usurpCamp: "map-court",
  jiaxing: "map-harbor",
  wuxi: "map-lane",
  changzhou: "map-lane",
  chuzhou: "map-yard",
  suqian: "map-harbor",
  suzhousu: "map-lane",
  bozhou: "map-court",
  yanshi: "map-yard",
  shanzhou: "map-yard",
  tongguan: "map-court",
  gaoyou: "map-harbor",
  wineUp: "map-tea",
  shaolin: "map-shrine",
  luohan: "map-court",
  taxMarket: "map-office",
  taxWine: "map-tea",
  taxClinic: "map-hold",
  taxGate: "map-office",
  taxStable: "map-yard",
  taxLodge: "map-tea",
  taxArchive: "map-office",
  taxTea: "map-tea",
  taxClerk: "map-office",
  taxJail: "map-hold",
  taxWell: "map-yard",
  taxMartial: "map-tea",
  taxEscort: "map-harbor",
  taxPawn: "map-lane",
  taxAlley: "map-lane",
  ropeMarket: "map-harbor",
  ropeWine: "map-tea",
  ropeClinic: "map-hold",
  ropeGate: "map-harbor",
  ropeStore: "map-hold",
  ropeLodge: "map-tea",
  ropeMess: "map-hold",
  ropeQuay: "map-harbor",
  ropeWatch: "map-harbor",
  ropeForge: "map-hold",
  ropeWell: "map-yard",
  ropeMartial: "map-tea",
  ropeEscort: "map-harbor",
  ropeAlley: "map-lane",
  ropeYard: "map-harbor",
};

export function standFile(id: string): string {
  return resolveStandKey(id) ?? "alley";
}

export function hasStand(id: string): boolean {
  return resolveStandKey(id) !== null;
}

/** Map generated mobs / luohan onto existing stand plates — never fall back to rail. */
function resolveStandKey(id: string): string | null {
  if (FILE[id]) return FILE[id];
  if (id.startsWith("mob_road") || id.startsWith("mob_escort") || id.startsWith("mob_side")) return "alley";
  if (id.startsWith("mob_canal") || id.startsWith("mob_yamen")) return "escort";
  if (id.startsWith("mob_monk") || id.startsWith("luohan")) return "pilgrim";
  if (id.startsWith("mob_court") || id.startsWith("mob_rebel")) return "lord";
  if (id.startsWith("mob_")) return "hauler";
  return null;
}

export function standSrc(id: string, cut = true): string {
  return cut ? artUrl(`art/stand/${standFile(id)}.png`) : artUrl(`art/${standFile(id)}.png`);
}

export function stand(id: string, kind = ""): string {
  return `<img class="stand ${kind}" src="${standSrc(id, true)}" alt="" draggable="false">`;
}

export function sceneBg(scene: SceneId): string {
  const key = SCENE_BG[scene] ?? (scene.startsWith("tax") ? "map-office" : scene.startsWith("rope") ? "map-harbor" : "map-lane");
  return artUrl(`art/maps/${key}.png`);
}

export function titleBg(): string {
  return artUrl("art/maps/bg-title.png");
}

export function combatBg(scene?: SceneId): string {
  const set =
    scene === "plot" || scene === "ridge" || scene === "yard" || scene === "isle" || scene === "usurpCamp"
      ? "combat-yard"
      : scene === "wharf" || scene === "spit" || scene === "lamp" || scene === "ropes" || scene === "docks" || scene === "sluice" || scene === "pit" || scene === "ferry" || scene === "huainan" || scene === "yangzhou"
        ? "combat-harbor"
        : scene === "lane" || scene === "drums" || scene === "tea" || scene === "outer" || scene === "linan" || scene === "suzhou" || scene === "jiankang"
          ? "combat-lane"
          : scene === "customs" ||
          scene === "shrine" ||
          scene === "glass" ||
          scene === "inner" ||
          scene === "palace" ||
          scene === "yamen" ||
          scene === "wine" ||
          scene === "luoyang" ||
          scene === "bianjing" ||
          scene === "changan"
        ? "combat-court"
        : scene === "hut" ||
            scene === "hold" ||
            scene === "salt" ||
            scene === "shed" ||
            scene === "cave" ||
            scene === "cellar" ||
            scene === "clinic" ||
            scene === "flower"
          ? "combat-hold"
          : "combat";
  return artUrl(`art/maps/bg-${set}.png`);
}
