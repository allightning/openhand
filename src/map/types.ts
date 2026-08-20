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
  | "cellar";

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
  | "lessonTalk";

export type ItemId = "brand" | "scrap" | "slip" | "deed" | "incense" | "badge" | "flask" | "cake";

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
  | "incense";

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
  | "pack";

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
  | "house";

export interface Prop {
  x: number;
  y: number;
  kind: PropKind;
  tag?: string;
}

export interface GroundItem {
  id: ItemId;
  x: number;
  y: number;
  taken: boolean;
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
  | "spar";
