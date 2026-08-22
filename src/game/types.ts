export const BOARD_SIZE = 7;
export const WALL_DAMAGE = 8;
export const HAND_SIZE = 5;
export const BASE_HP = 28;

export type ChapterId = "dock" | "alley" | "court" | "isle";

export type WeaponId = "palm" | "saber" | "spear" | "sword" | "staff" | "hook";
export type CompanionId =
  | "rail"
  | "seer"
  | "sapper"
  | "porter"
  | "boat"
  | "watch"
  | "pilgrim"
  | "hooker"
  | "hermit"
  | "salter"
  | "scribe"
  | "bard"
  | "blade"
  | "weaver"
  | "guard";
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
  | "tide"
  | "burySlash"
  | "buryBleed"
  | "buryKnock"
  | "buryWard"
  | "salve"
  | "unbind"
  | "sidestep"
  | "suture"
  | "cauterize"
  | "bindwound"
  // school / mid-late expansion
  | "qiPulse"
  | "qiFlood"
  | "palmSeal"
  | "saberBleed"
  | "spearLock"
  | "swordMute"
  | "staffBind"
  | "hookDisarm"
  | "venomFog"
  | "skillLock"
  | "pouchSeal"
  | "handCut"
  | "qiLeech"
  | "ironPulse"
  | "comboTax"
  | "comboPay"
  | "setupTax"
  | "flowTax"
  | "midStrike"
  | "midGuard"
  | "midPush"
  | "lateAnvil"
  | "lateTide"
  | "lateMirror"
  | "lateChain"
  | "lateWard"
  | "lateBleed"
  | "lateMute"
  | "lateLeech"
  | "lateHand"
  | "latePouch"
  | "jinwuToken"
  | "peonyBrew"
  | "drunkFist";

export type CardType = "attack" | "skill";
export type Phase = "player" | "won" | "lost";
export type RiposteKind = "slash" | "bleed" | "knock" | "ward";

/** Enemy catalog ids — core named + generated mobs (see foeCatalog). */
export type EnemyId = string;

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
  riposte?: RiposteKind;
  clearBleed?: boolean;
  clearSeal?: boolean;
  swap?: boolean;
  regen?: number;
  regenTurns?: number;
  payHp?: number;
  /** Spend this much combo to play (combo payoff cards). */
  comboCost?: number;
  /** Spend this much flow to play. */
  flowCost?: number;
  /** Spend this much setup to play. */
  setupCost?: number;
  /** Pay HP as combo/stack tax when gaining combo/flow/setup. */
  stackTaxHp?: number;
  /** Extra qi cost beyond `cost` when building combo (discourages empty spam stacks). */
  stackTaxQi?: number;
  mute?: number;
  foeMute?: number;
  noBag?: number;
  foeNoBag?: number;
  handTax?: number;
  foeHandTax?: number;
  qiBurn?: number;
  foeQiBurn?: number;
  qiRegenSelf?: number;
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
  | { kind: "guard"; block: number }
  | { kind: "bleedcut"; damage: number; bleed: number }
  | { kind: "counter"; form: RiposteKind }
  | { kind: "mend"; heal: number }
  | { kind: "seal" }
  | { kind: "shatter"; amount: number }
  /** 吐纳：回敌劲 */
  | { kind: "breathe"; amount: number };

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
  /** 生成敌精英手感：开场反应 / 蓄势链可读 */
  elite?: "windup" | "shatter" | "stake";
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
  /** Base qi restored each turn (before energyNext / seal / gear). */
  energyRegen: number;
  nextDamage: number;
  stakes: number[];
  traps: number[];
  techniques: TechniqueId[];
  hand: CardInst[];
  drawPile: CardInst[];
  discardPile: CardInst[];
  intent: Intent;
  /** Planned foe moves this round; only the first is shown. */
  intents: Intent[];
  intentIndex: number;
  enemyEnergy: number;
  enemyEnergyMax: number;
  turn: number;
  phase: Phase;
  log: string[];
  /** Dual-color fight journal (replaces discard UI). */
  journal: { side: "you" | "foe"; text: string }[];
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
  youBleed: number;
  youSeal: number;
  youSlow: number;
  youRiposte: RiposteKind | null;
  foeRiposte: RiposteKind | null;
  youRiposteTurns: number;
  foeRiposteTurns: number;
  pressedLast: number;
  hero: HeroId;
  movedFwd: boolean;
  movedBack: boolean;
  enteredMelee: boolean;
  youSway: number;
  youGift: number;
  youRegen: number;
  youRegenTurns: number;
  regenClock: number;
  /** 禁技：不能打 skill 牌 */
  youMute: number;
  foeMute: number;
  /** 禁药/暗器 */
  youNoBag: number;
  foeNoBag: number;
  /** 手牌上限减免（正数=少能拿几张） */
  youHandTax: number;
  foeHandTax: number;
  /** 每回合额外扣劲（敌对我 / 我对敌在敌回劲时） */
  youQiBurn: number;
  foeQiBurn: number;
  /** 本场已用暗器/灵药次数。上限 1。 */
  bagUsed?: number;
}

export interface StatusChip {
  key: string;
  name: string;
  value: string;
  tip: string;
}

export interface Preview {
  playerHp: number;
  playerBlock: number;
  enemyHp: number;
  enemyBlock: number;
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
  /** 灵丹服用后的永久加成（按同行 id）。 */
  companionBonus?: Record<string, { maxHp?: number; qiMax?: number; pace?: number }>;
  scrolls: CardId[];
  talks: Record<string, number>;
  mateDecks: Record<string, CardId[]>;
  falls: number;
  /** 命数：战败扣 1；每场开战满血。 */
  lives: number;
  livesMax: number;
  hero: HeroId;
  /** 银两 — meta currency for shops / clinics / bribes. Keep rewards modest. */
  silver: number;
  /** 行囊货色（药、材料、暗器）。武器/招式不进此栏。 */
  bag?: { id: string; n: number }[];
  /** 元宝 — 中高阶通货，买锻材/玄药。 */
  yuanbao?: number;
  /** 通关文牒数（城门/关卡）。 */
  passes?: number;
  /** 炼制/锻造完成时间戳；未完成前不可再开炉。 */
  craftUntil?: number;
  /** 炉中待取货。 */
  craftPending?: { id: string; n: number } | null;
  /** Equipped gear weapon id, e.g. palm-3. */
  weapon: string;
  /** Owned gear weapon ids. */
  weapons: string[];
  /** Tea-house stake on next duel ending within maxTurn player turns. */
  teaBet?: { stake: number; maxTurn: number } | null;
  /** Boss-count watermark when last bounty was armed. */
  bountyAt?: number;
  /** Must finish bounty target before beaten.length exceeds this. */
  bountyDeadline?: number;
}

export type Reward =
  | { kind: "upgrade"; from: CardId; to: CardId }
  | { kind: "replace"; from: CardId; to: CardId }
  | { kind: "technique"; id: TechniqueId }
  | { kind: "add"; id: CardId }
  | { kind: "silver"; amount: number }
  | { kind: "yuanbao"; amount: number }
  | { kind: "pass"; amount: number }
  | { kind: "goods"; id: string; n: number }
  | { kind: "scrollBox" }
  | { kind: "gear"; id: string }
  | { kind: "mate"; id: string };

export interface SaveFile {
  seen: EnemyId[];
  cleared: number;
  /** Full mid-run snapshot for local resume. */
  run?: Run | null;
  /** Last map scene when the run was saved. */
  scene?: string | null;
  /** Last player tile when the run was saved. */
  at?: { x: number; y: number } | null;
  /** 通宝 — 稀少高阶通货。不氪，难刷。 */
  tongbao?: number;
  /** 局外窖藏，下局可带入有限件数。 */
  stash?: { id: string; n: number }[];
}
