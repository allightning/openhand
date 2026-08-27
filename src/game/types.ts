import type { MindArtId } from "./mindArts";

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
  | "retreat"
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
  | "drunkFist"
  | "ultQiBurst"
  | "ultIronWall"
  | "ultSaber"
  | "ultSword"
  | "ultSpear"
  | "ultStaff"
  | "ultHook"
  | "ultPalm"
  | "varBackwater"
  | "varOverhand"
  | "comboPalm"
  | "comboSaber"
  | "comboSpear"
  | "comboSword"
  | "comboStaff"
  | "comboHook";

export type CardType = "attack" | "skill";
export type Phase = "player" | "won" | "lost";
export type RiposteKind = "slash" | "bleed" | "knock" | "ward";

export type WeaknessKind =
  | "moveCardPlayed"
  | "stakeOnBoard"
  | "stoodStillEndTurn"
  | "plantStakePlayed"
  | "adjacentAttackHit"
  | "trapAvoided"
  | "hitFoeThisTurn"
  | "endDistGt1"
  | "endBlockGt0"
  | "endBlockGte8"
  | "antiGuardPlayed"
  | "bleedcutFullyBlocked"
  | "noAttackThisTurn"
  | "markGte2"
  | "endEnergyGte3"
  | "endBlockZero"
  | "adjacentAttackHitBreathe";

export interface WeaknessDef {
  kind: WeaknessKind;
  param?: number;
}

export type LabItemId =
  | "jinchuang"
  | "xiujian"
  | "huiqi"
  | "lianhuan"
  | "pojin"
  | "deathSquad"
  | "aidPalm"
  | "aidSaber"
  | "aidSword"
  | "aidSpear"
  | "aidStaff"
  | "aidHook";

/** §31.12 助战符召唤的客座好手（与同行完全分家）：实体一格、一回合、放一手本系绝活就走。 */
export interface SummonState {
  school: WeaponId;
  name: string;
  pos: number;
  hp: number;
  maxHp: number;
  /** 拳符专属：嘲讽——敌下一段攻击打它（算拆）。 */
  taunt: boolean;
}

export interface UltimateReq {
  qiMin?: number;
  blockMin?: number;
  markMin?: number;
  brokeThisTurn?: boolean;
  spatialThisTurn?: boolean;
  adjacent?: boolean;
  distMin?: number;
  /** 绝招：格挡效果翻倍 */
  doubleBlock?: boolean;
  /** §31.11 六系绝招前置：敌创伤层数 ≥N（剑） */
  bleedMin?: number;
  /** §31.11 本回合已出攻击牌 ≥N（棍·连击） */
  attacksMin?: number;
  /** §31.11 敌处于缴械中（钩） */
  foeDisarmed?: boolean;
  /** §31.11 敌贴墙（拳·震壁） */
  foeAtWall?: boolean;
  /** §31.11 上一敌回合你受过实际伤害（刀·埋招反击） */
  foeHitLastTurn?: boolean;
}

export interface VariantDef {
  kind: "highHp" | "lowHp" | "fullEnergy" | "emptyEnergy";
  threshold?: number;
  labelA: string;
  labelB: string;
  damageMulA?: number;
  damageBonusB?: number;
  costZeroOnB?: boolean;
  qiBonusA?: number;
}

export interface V2TurnFlags {
  moveCardPlayed: boolean;
  playerMoved: boolean;
  attackPlayed: boolean;
  hitFoeThisTurn: boolean;
  adjacentAttackHit: boolean;
  plantStakePlayed: boolean;
  antiGuardPlayed: boolean;
  stoodStill: boolean;
  endTurnCommitted: boolean;
  endBlock?: number;
  endEnergy?: number;
  endDist?: number;
  /** §31.9 收势位置（红格判定用；预览期缺省取当前位）。 */
  endPos?: number;
  /** §31.10 弃牌：回合开始手牌数（定上限 floor(n/2)）与已用次数。 */
  turnStartHand?: number;
  discardsUsed?: number;
  turnStartPos: number;
  spatialPlayed?: boolean;
  breakPromised?: boolean;
  /** §31.8 v3：破招充能——每张位移牌 +1，拆一段打击类消耗 1。乱点万能钥匙作废。 */
  moveCharges?: number;
  /** §31.8 v3：每张破绽/刺类牌 +1，拆一段架势类消耗 1。 */
  antiGuardCharges?: number;
}

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
  | "stackHand"
  // §31.19 分系外功：拳掌
  | "ironPalm"
  | "softPalm"
  | "piercingPalm"
  // 刀
  | "saberGrudge"
  // 枪
  | "spearWind"
  | "longMarch"
  | "pikeBrace"
  // 剑
  | "swordRain"
  | "swordScreen"
  | "flowSword"
  // 棍
  | "stakeArmor"
  | "heavyStaff"
  // 钩
  | "barbedHook"
  | "hookVeil";

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
  /** v2.1 绝招前置 */
  ultimate?: UltimateReq;
  /** v2.1 变式分支 */
  variant?: VariantDef;
  /** 牌面标签展示 */
  tags?: string[];
  /** §16.4 需助战在场 */
  requiresAssist?: boolean;
  foeMute?: number;
  /** §31.11 缴械：敌攻击伤害减半 N 回合（钩系） */
  foeDisarm?: number;
  /** §31.11 眩晕：敌跳过 N 个攻击段（棍连击/拳震壁/牌面） */
  foeStun?: number;
  /** §31.11 减费：本回合下一张牌耗劲 -N（搓手） */
  costDiscountNext?: number;
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
  | { kind: "strike"; damage: number; weakness?: WeaknessDef }
  | { kind: "charge"; damage: number; steps: number; weakness?: WeaknessDef }
  | { kind: "stake"; weakness?: WeaknessDef }
  | { kind: "pull"; steps: number; weakness?: WeaknessDef }
  | { kind: "trap"; weakness?: WeaknessDef }
  | { kind: "windup"; weakness?: WeaknessDef }
  | { kind: "lunge"; damage: number; weakness?: WeaknessDef }
  | { kind: "swap"; weakness?: WeaknessDef }
  | { kind: "barrage"; damage: number; hits: number; weakness?: WeaknessDef }
  | { kind: "guard"; block: number; weakness?: WeaknessDef }
  | { kind: "bleedcut"; damage: number; bleed: number; weakness?: WeaknessDef }
  | { kind: "counter"; form: RiposteKind; weakness?: WeaknessDef }
  | { kind: "mend"; heal: number; weakness?: WeaknessDef }
  | { kind: "seal"; weakness?: WeaknessDef }
  | { kind: "shatter"; amount: number; weakness?: WeaknessDef }
  | { kind: "breathe"; amount: number; weakness?: WeaknessDef };

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
  /** Boss 变招阶段备用意图表。 */
  patternSets?: Intent[][];
  pace?: number;
  /** 生成敌精英手感：开场反应 / 蓄势链可读 */
  elite?: "windup" | "shatter" | "stake";
  /** §31.10 兵刃攻击距离（默认 1=贴身）。长兵器敌（棍/枪/长刀）=2：隔一格也能打到。 */
  reach?: number;
}

export interface TechniqueDef {
  id: TechniqueId;
  name: string;
  text: string;
  flavor: string;
  chapter: ChapterId;
  /** §31.10 系别亲和（缺省=通用）。踢馆奖励池只出「本系 + 通用」。 */
  school?: WeaponId;
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
  /** Combat Lab: swapped-in fighter skips main plays this player phase. */
  labFreshSwap?: boolean;
  /** Combat Lab: resonance already used this player phase. */
  labResonanceTurn?: boolean;
  /** Combat Lab: per-mate learned techniques for swap binding. */
  labMateTechs?: Partial<Record<CompanionId, TechniqueId[]>>;
  /** Combat Lab: per-mate 心法（属性加成跟随在场角色）。 */
  labMateMinds?: Partial<Record<CompanionId, MindArtId[]>>;
  /** v2.2 各角色当前装备兵器（战前定、局内锁）。 */
  labMateWeapons?: Partial<Record<CompanionId, string>>;
  /** v2: unified 势 (0–5). */
  qi?: number;
  /** v2: delayed 铺势 → next turn qi. */
  v2PendingQi?: number;
  /** v2: per-turn action flags for break window. */
  v2Turn?: V2TurnFlags;
  /** v2: segment indices broken this round. */
  v2BrokenSegments?: number[];
  /** v2: preview of segments that will break on foe turn. */
  v2BreakPreview?: number[];
  /** §31.8 v3：本回合被「让」（软拆，半效）的段。 */
  v2GrazedSegments?: number[];
  v2GrazePreview?: number[];
  /** §31.8 v3：招眼段下标——硬拆它则套路全崩 + 失衡。 */
  v2EyeIdx?: number;
  /** §31.8 v3：失衡剩余行动窗（敌方承伤 ×1.5）。 */
  v2OffBalance?: number;
  /** v2: break count by intent kind (per foe). */
  v2BreakByKind?: Partial<Record<string, number>>;
  v2VariantStage?: number;
  v2GrudgeBonus?: number;
  /** §31.12 预演条空闲态：上一轮敌方行动全程日志（收势到敌结算完）。 */
  v2LastFoeTurn?: string[];
  v2FxQueue?: string[];
  /** v2: entrance bonus on first attack after swap. */
  labEntranceActive?: boolean;
  labEntranceUsed?: boolean;
  /** v2 telemetry counters (session). */
  v2QiPeak?: number;
  v2QiClearCount?: number;
  v2BreakCount?: number;
  /** §31.13 本回合（敌结算窗内）硬拆计数——连环拆判定用，玩家回合开始清零。 */
  v2TurnBreakCount?: number;
  v2VariantTriggers?: number;
  v2SwapCount?: number;
  v2ResonanceCount?: number;
  v2EntranceTriggers?: number;
  /** §31.9 死士符：在场一回合，替玩家挡一段攻击并反扑（占位：不占格实体）。 */
  labDeathSquad?: boolean;
  /** §31.17 踢馆轮番：前排倒下后此敌接力（非同时上场）。 */
  gauntletWaveEnemy?: EnemyId;
  /** §16.2 v2.3 助战（批次三实体接线）。 */
  labAssistActive?: CompanionId;
  labAssistPos?: number;
  labAssistBanned?: boolean;
  labAssistCalls?: number;
  labAssistDamage?: number;
  labAssistCalledThisTurn?: boolean;
  /** §31.12 助战符召唤体（在场一回合的客座好手）。 */
  labSummon?: SummonState | null;
  labComboCardPlayedThisTurn?: boolean;
  labFoeTurnPlayerHit?: boolean;
  labFoeTurnAssistHit?: boolean;
  labComboCardsPlayed?: number;
  labDoubleHitCount?: number;
  /** §24 死穴审计计数器（Lab 埋点）。 */
  v2SecondaryWeaponEquip?: number;
  v2OpeningPaceBehind?: boolean;
  v2OpeningHp?: number;
  v2OpeningDamage?: number;
  v2OpeningDamageRecorded?: boolean;
  v2UltGateAttempts?: number;
  v2UltGateBlocks?: number;
  v2VariantBranchA?: number;
  v2VariantBranchB?: number;
  v2VariantBranchNone?: number;
  v2ItemUses?: number;
  v2QiTurnSamples?: number;
  v2QiTurnSum?: number;
  /** v2.5 共鸣/签名 */
  v2PartyComposition?: import("./labV25Constants").PartyComposition;
  v2ResonanceTierMax?: number;
  v2HundredFlowers?: boolean;
  labSigUsesLeft?: number;
  labSigCooldownLeft?: number;
  labSigMeleeBonus?: number;
  labSigPullBuff?: boolean;
  labSigKnockBlockPending?: boolean;
  v2SignatureUses?: number;
  /** §28 埋点 */
  v2FieldSchoolDeckPct?: number;
  v2ComboUnlockPlays?: number;
  v2DeadHandTurns?: number;
  /** §29 应激 / 压力埋点 */
  v2StressCount?: number;
  v2StressMeta?: Array<{ source: import("./labEnemyStress").StressSource; label: string } | null>;
  v2StressBySource?: Partial<Record<import("./labEnemyStress").StressSource, number>>;
  /** §31.14 应激段改为「下一手入场」：本回合触发的应激先挂起，下次敌规划时入队（全亮、可拆）。 */
  v2PendingStress?: Array<{ source: import("./labEnemyStress").StressSource; label: string }>;
  /** §31.14 本场破眼次数（赌馆「破眼注」结算用）。 */
  v2EyeCount?: number;
  v2PlayerActions?: number;
  v2FoeSegments?: number;
  v2TurnDamageSum?: number;
  v2TurnDamageSamples?: number;
  /** 敌回合队列解析中的段索引（§29 应激承伤目标）。 */
  v2ResolveIntentIdx?: number;
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
  /** §31.11 眩晕段数：敌队列每跳过一次攻击段消耗 1（棍连击/拳震壁施加） */
  foeStun?: number;
  /** §31.11 缴械回合数：敌攻击段伤害减半（钩系施加） */
  foeDisarm?: number;
  /** §31.11 上一敌回合你受过实际穿盾伤害（刀·埋招反击前置） */
  foeHitLastTurn?: boolean;
  /** §31.11 本回合下一张牌耗劲减免（搓手等减费手段） */
  costDiscountNext?: number;
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
  /** 开战发牌/回收是否保持配方序（单测 true；实战 false）。 */
  orderedDeal?: boolean;
  /** v2.1 Lab 携带道具（最多 2） */
  labItems?: LabItemId[];
  labItemUsedThisTurn?: boolean;
  labUnlockUltimate?: boolean;
  labComboPillActive?: boolean;
  v2AuraQiBonusUsed?: boolean;
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
