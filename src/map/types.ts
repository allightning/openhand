import type { ChapterId, EnemyId } from "../game/types";

export type SceneId =
  | "hut"
  | "plot"
  | "ridge"
  | "wharf"
  | "hold"
  | "yard"
  | "spit"
  | "customs"
  | "salt"
  | "ropes"
  | "shed"
  | "shrine"
  | "lamp"
  | "docks"
  | "sluice"
  | "lane"
  | "tea"
  | "drums"
  | "outer"
  | "glass"
  | "inner"
  | "cave"
  | "cellar"
  | "palace"
  | "pit"
  | "ferry"
  | "isle"
  | "yamen"
  | "wine"
  | "flower"
  | "clinic"
  | "pier"
  | "pawn"
  | "escort"
  | "martial"
  | "lodge"
  | "railNight"
  | "seerGaze"
  | "sapperPile"
  | "huainan"
  | "linan"
  | "luoyang"
  | "luoyang_yamen_prison"
  | "luoyang_yanbo_inner"
  | "bianjing"
  | "usurpCamp"
  | "changan"
  | "yangzhou"
  | "jiankang"
  | "suzhou"
  | "jiaxing"
  | "wuxi"
  | "changzhou"
  | "chuzhou"
  | "suqian"
  | "suzhousu"
  | "bozhou"
  | "yanshi"
  | "shanzhou"
  | "tongguan"
  | "gaoyou"
  | "wineUp"
  | "shaolin"
  | "luohan"
  | "taxMarket"
  | "taxWine"
  | "taxClinic"
  | "taxGate"
  | "taxStable"
  | "taxLodge"
  | "taxArchive"
  | "taxTea"
  | "taxClerk"
  | "taxJail"
  | "taxWell"
  | "taxMartial"
  | "taxEscort"
  | "taxPawn"
  | "taxAlley"
  | "ropeMarket"
  | "ropeWine"
  | "ropeClinic"
  | "ropeGate"
  | "ropeStore"
  | "ropeLodge"
  | "ropeMess"
  | "ropeQuay"
  | "ropeWatch"
  | "ropeForge"
  | "ropeWell"
  | "ropeMartial"
  | "ropeEscort"
  | "ropeAlley"
  | "ropeYard";

export type FlagId =
  | "branded"
  | "readHold"
  | "emptyBowl"
  | "watchOpen"
  | "trueMirror"
  | "booksOk"
  | "tideOpen"
  | "knotOk"
  | "metPorter"
  | "metWatch"
  | "metGuest"
  | "metBoat"
  | "metMaid"
  | "joinPorter"
  | "joinBoat"
  | "joinWatch"
  | "joinPilgrim"
  | "joinRoper"
  | "restedTea"
  | "restedYard"
  | "restedShrine"
  | "metFisher"
  | "metDigger"
  | "metBeggar"
  | "heardWell"
  | "askedWell"
  | "wellOpen"
  | "heardTree"
  | "treeOpen"
  | "heardStone"
  | "stoneOpen"
  | "joinHermit"
  | "mainOpen"
  | "sideWell"
  | "sideTree"
  | "sideStone"
  | "askedPace"
  | "sparredPace"
  | "askedWard"
  | "sparredWard"
  | "askedEdge"
  | "sparredEdge"
  | "lessonWalk"
  | "lessonDoor"
  | "lessonFight"
  | "lessonTalk"
  | "metButcher"
  | "metMonk"
  | "heardPlaza"
  | "heardRebel"
  | "throneTrue"
  | "roadUsurp"
  | "caseRebel"
  | "purgeReady"
  | "graceKnown"
  | "traitorSeen"
  | "endingRail"
  | "endingSeer"
  | "endingSapper";

export type ItemId = "brand" | "scrap" | "slip" | "deed" | "incense" | "badge" | "flask" | "cake" | "token" | "cargo" | "roadPass";

export type Dir = "up" | "down" | "left" | "right";
export type SealId = "n" | "e" | "w" | "s" | "x";

export type GateKind =
  | "open"
  | "fire-seals"
  | "watch"
  | "mirror"
  | "books"
  | "deed"
  | "tide"
  | "incense"
  | "crossing";

export type Tile =
  | "wall"
  | "floor"
  | "water"
  | "seal"
  | "gate"
  | "sign"
  | "cache"
  | "portal"
  | "brazier"
  | "item"
  | "hill"
  | "rock"
  | "road"
  | "pack"
  | "shore"
  | "sidewalk";

export interface Pos {
  x: number;
  y: number;
}

export interface Sign {
  x: number;
  y: number;
  text: string;
}

export interface MapNpc {
  id: EnemyId;
  x: number;
  y: number;
  beaten: boolean;
}

export interface Talker {
  id: string;
  x: number;
  y: number;
}

export interface Seal {
  x: number;
  y: number;
  id: SealId;
}

export interface Cache {
  x: number;
  y: number;
  open: boolean;
}

export interface Portal {
  ch: string;
  x: number;
  y: number;
  to: SceneId;
  at: string;
}

export type PropKind =
  | "barrel"
  | "crate"
  | "cart"
  | "lantern"
  | "coil"
  | "post"
  | "bench"
  | "jar"
  | "well"
  | "stone"
  | "tree"
  | "house"
  | "stall"
  | "arch"
  | "dummy"
  | "table"
  | "stool"
  | "rack"
  | "sandbag"
  | "cabinet"
  | "shelf"
  | "bed"
  | "counter"
  | "screen"
  | "censer"
  | "basin"
  | "drum"
  | "mat"
  | "banner"
  | "board"
  | "pot"
  | "desk";

export interface Prop {
  x: number;
  y: number;
  kind: PropKind;
  tag?: string;
  /** 多字符唯一 ID（洛阳等大图必填，防单字母溢出错乱） */
  id?: string;
  /** 多格足迹（默认 1×1；仅大型家具/载具） */
  spanW?: number;
  spanH?: number;
}

export interface GroundItem {
  id: ItemId;
  x: number;
  y: number;
  taken: boolean;
}

export interface Barrier {
  x: number;
  y: number;
  /** item:roadPass | flag:jailOpen */
  need: string;
  said: string;
  thought: string;
}

export interface World {
  scene: SceneId;
  chapter: ChapterId;
  w: number;
  h: number;
  tiles: Tile[][];
  player: Pos;
  facing: Dir;
  seals: Seal[];
  order: SealId[];
  progress: SealId[];
  gate: GateKind;
  npcs: MapNpc[];
  talkers: Talker[];
  portals: Portal[];
  items: GroundItem[];
  props: Prop[];
  braziers: Pos[];
  signs: Sign[];
  caches: Cache[];
  /** 逻辑空气墙（牢房正门等） */
  barriers: Barrier[];
  arrival: string | null;
  hp: number;
  hpMax: number;
  dueling: EnemyId | null;
  speaker: string;
  message: string;
  thought: string;
  said: string;
  reply: string;
  choices: TalkChoice[];
}

export interface TalkChoice {
  id: string;
  label: string;
}

export type InteractAction =
  | "none"
  | "duel"
  | "talk"
  | "loot"
  | "take"
  | "brand"
  | "rest"
  | "end"
  | "spar"
  | "shop"
  | "heal"
  | "escort"
  | "learn"
  | "sellBag"
  | "buyBag"
  | "craft"
  | "collectCraft"
  | "tongbaoPass"
  | "tongbaoForge"
  | "tongbaoTech"
  | "matForge";
