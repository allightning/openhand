export const BOARD_SIZE = 7;
export const WALL_DAMAGE = 8;
export const HAND_SIZE = 5;
export const BASE_HP = 28;

export type ChapterId = "dock" | "alley" | "court";

export type WeaponId = "palm" | "saber" | "spear" | "sword" | "staff" | "hook";
export type CompanionId = "rail" | "seer" | "sapper" | "porter" | "boat" | "watch" | "pilgrim" | "hooker" | "hermit";
export type HeroId = "rail" | "seer" | "sapper";

export type CardId =
  | "strike"
  | "defend"
  | "push"
  | "charge"
  | "advance"
  | "strike2"
  | "defend2"
  | "push2"
  | "charge2"
  | "advance2"
  | "drawcut"
  | "backpalm"
  | "split"
  | "close"
  | "elbow"
  | "sweep"
  | "mend"
  | "mend2"
  | "cut"
  | "thrust"
  | "pierce"
  | "plant"
  | "hookpull"
  | "bleedcut"
  | "expose"
  | "thorns"
  | "inbreath"
  | "combo"
  | "haste"
  | "haste2"
  | "follow"
  | "twinpalm"
  | "brace"
  | "chain"
  | "follow2"
  | "chain2"
  | "gather"
  | "gather2"
  | "setup"
  | "finisher"
  | "finisher2"
  | "weave"
  | "echo"
  | "ironform"
  | "marking"
  | "rift"
  | "mirror"
  | "layer"
  | "tide";

export type CardType = "attack" | "skill";
export type Phase = "player" | "won" | "lost";

export type EnemyId =
  | "catcher"
  | "escort"
  | "piler"
  | "hauler"
  | "alley"
  | "trapper"
  | "delay"
  | "twin"
  | "lord"
  | "bandit"
  | "raider"
  | "robber"
  | "smuggler"
  | "thug"
  | "intruder"
  | "brute"
  | "cavehand"
  | "warden"
  | "inkhand"
  | "bookcut"
  | "nametaker"
  | "glasspin"
  | "knotboss"
  | "stakeboss"
  | "tutorPace"
  | "tutorWard"
  | "tutorEdge";

export type TechniqueId =
  | "longPush"
  | "backstep"
  | "keepGuard"
  | "hardWall"
  | "brightBlade"
  | "bodyCheck"
  | "heelStake"
  | "shortCharge"
  | "ghostStep"
  | "trapWard"
  | "tether"
  | "closeCut"
  | "delayGuard"
  | "throne"
  | "nightStep"
  | "leftover"
  | "rebound"
  | "stackHand";

export type HeartId = "iron" | "breath" | "empty";

export interface CardDef {
  id: CardId;
  name: string;
  cost: number;
  type: CardType;
  text: string;
  flavor: string;
  damage?: number;
  block?: number;
  knock?: number;
  wall?: number;
  chargeBonus?: number;
  steps?: number;
  heal?: number;
  pullEnemy?: number;
  nearBonus?: number;
  farBonus?: number;
  plant?: boolean;
  school?: WeaponId | "any";
  bleed?: number;
  thorns?: number;
  expose?: number;
  energyNext?: number;
  frail?: number;
  combo?: boolean;
  pace?: number;
  flow?: number;
  setupGain?: number;
  finisher?: boolean;
  echo?: number;
  retainTurns?: number;
  retainAmt?: number;
  mark?: number;
  mirror?: boolean;
  weave?: boolean;
  layer?: boolean;
  tide?: boolean;
}

export interface CardInst {
  uid: string;
  defId: CardId;
}

export type Intent =
  | { kind: "strike"; damage: number }
  | { kind: "charge"; damage: number; steps: number }
  | { kind: "stake" }
  | { kind: "pull"; steps: number }
  | { kind: "trap" }
  | { kind: "windup" }
  | { kind: "lunge"; damage: number }
  | { kind: "swap" }
  | { kind: "barrage"; damage: number; hits: number }
  | { kind: "guard"; block: number };

export interface EnemyDef {
  id: EnemyId;
  name: string;
  title: string;
  hp: number;
  pos: number;
  skill: string;
  pitch: string;
  remnant: TechniqueId;
  pattern: Intent[];
  pace?: number;
}

export interface TechniqueDef {
  id: TechniqueId;
  name: string;
  text: string;
  flavor: string;
  chapter: ChapterId;
}

export interface HeartDef {
  id: HeartId;
  name: string;
  text: string;
  flavor: string;
}

export interface Unit {
  id: string;
  name: string;
  title: string;
  hp: number;
  maxHp: number;
  pos: number;
}

export interface FighterBag {
  id: CompanionId;
  hp: number;
  maxHp: number;
  hand: CardInst[];
  drawPile: CardInst[];
  discardPile: CardInst[];
}

export interface Battle {
  player: Unit;
  enemy: Unit;
  foes: Unit[];
  enemyId: EnemyId;
  playerBlock: number;
  energy: number;
  energyMax: number;
  nextDamage: number;
  stakes: number[];
  traps: number[];
  techniques: TechniqueId[];
  hand: CardInst[];
  drawPile: CardInst[];
  discardPile: CardInst[];
  intent: Intent;
  intentIndex: number;
  turn: number;
  phase: Phase;
  log: string[];
  playedThisTurn: string[];
  party: CompanionId[];
  active: CompanionId;
  bench: FighterBag[];
  swappedThisTurn: boolean;
  bleed: number;
  thorns: number;
  expose: number;
  energyNext: number;
  frail: number;
  combo: number;
  attacksThisTurn: number;
  paceBoost: number;
  foePace: number;
  enemyBlock: number;
  spar: boolean;
  flow: number;
  setup: number;
  echoNext: number;
  retainTurns: number;
  retainAmt: number;
  mark: number;
  lastPlay: "attack" | "skill" | null;
}

export interface Preview {
  playerHp: number;
  playerBlock: number;
  enemyHp: number;
  enemyPos: number;
  playerPos: number;
  nextDamage: number;
  stakes: number[];
  traps: number[];
  enemyDies: boolean;
  notes: string[];
  legal: boolean;
  reason?: string;
}

export interface HeroDef {
  id: string;
  name: string;
  title: string;
  sect: string;
  verb: string;
  hp: string;
  crime: string;
  pitch: string;
  locked: boolean;
}

export interface Run {
  hp: number;
  hpMax: number;
  heart: HeartId;
  deck: CardId[];
  techniques: TechniqueId[];
  chapter: ChapterId;
  scene: string;
  beaten: EnemyId[];
  chests: string[];
  flags: string[];
  items: string[];
  visited: string[];
  seenTiles: Record<string, string[]>;
  sealProgress: Record<string, string[]>;
  party: CompanionId[];
  active: CompanionId;
  companionHp: Record<string, number>;
  scrolls: CardId[];
  talks: Record<string, number>;
  mateDecks: Record<string, CardId[]>;
  falls: number;
  hero: HeroId;
}

export type Reward =
  | { kind: "upgrade"; from: CardId; to: CardId }
  | { kind: "replace"; from: CardId; to: CardId }
  | { kind: "technique"; id: TechniqueId }
  | { kind: "add"; id: CardId };

export interface SaveFile {
  seen: EnemyId[];
  cleared: number;
}
