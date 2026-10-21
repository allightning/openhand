import type { MindArtId } from "../mindArts";
import type { CardId, CompanionId, EnemyId, LabItemId, TechniqueId, WeaponId } from "../types";

export type GauntletPath = "shaolin" | "bandit" | "court";

export type StoryPending = "opening" | "choice" | "followup" | "travel" | "rest" | "stall" | "market" | "ambush";

export type StoryPlaceId =
  | "liangshan"
  | "liangshan-rear"
  | "jinan"
  | "caozhou"
  | "xuzhou"
  | "xuzhou-gate"
  | "yangzhou"
  | "taian"
  | "yanzhou"
  | "shanmen"
  | "ruin"
  | "slope"
  | "end";

export type StorySchedule = { stallSlots: number[]; marketSlots: number[] };

export interface RouteLogEntry {
  stage: number;
  placeId: string;
  placeName: string;
  rest: string;
  note?: string;
}

export const ALL_ITEMS: LabItemId[] = ["jinchuang", "xiujian", "huiqi", "lianhuan", "pojin"];

export type GauntletTier = "easy" | "mid" | "hard" | "extreme";

export const GAUNTLET_TIER_LABEL: Record<GauntletTier, string> = {
  easy: "简单",
  mid: "中等",
  hard: "困难",
  extreme: "极难",
};

/** §31 馆序占位（甲方可调）。segBonus=额外意图段预算，dmgCoef=敌伤害系数（不拆就疼的压力源）。 */
export interface GauntletLadderEntry {
  stage: number;
  tier: GauntletTier;
  label: string;
  enemyId: EnemyId;
  hpMul: number;
  segBonus: number;
  dmgCoef: number;
  forceGrudge?: boolean;
  /** §31.10 该馆应激段上限（缺省用全局旋钮）。 */
  stressCap?: number;
  /** 同场额外敌人（不含主敌）。第 8 关起渐多，第 15 关期末四人。 */
  extraEnemyIds?: EnemyId[];
}

export type GauntletMarketKind = "heal" | "card" | "item" | "tech" | "forge";
export type GauntletShopStall = "pawn" | "black";

export interface GauntletMarketOffer {
  /** 本屏唯一；card/item/tech 槽的 id 带 payload（如 "card:pierce"），保证屏显与落锤同一份。 */
  id: string;
  kind: GauntletMarketKind;
  price: number;
  title: string;
  tip: string;
  /** 当铺常驻低阶；黑市跨阶。跳过黑市只藏这一栏。省略则按 kind 推断。 */
  stall?: GauntletShopStall;
}

export type LifelineKind = "stat50" | "tempCompanion" | "divineWeapons" | "aidPair";

export const LIFELINE_DEFS: Record<
  LifelineKind,
  { title: string; tip: string }
> = {
  stat50: { title: "赌坊秘药", tip: "本局气血与伤害 +50%。过关失效，下一馆不带着走。" },
  tempCompanion: { title: "客座同道", tip: "本局临时入伙 1 人（组合技/光环）。过关离去。" },
  divineWeapons: { title: "神兵借予", tip: "本局全员兵刃升到 5 阶神兵。过关收回。" },
  aidPair: { title: "双符助战", tip: "本局得 2 张本系助战符，可召唤客座好手。" },
};

/** §31.13 赌馆启动资金：开局 20 彩金——够押小注，攒过馆底彩换重注。 */
export const GAUNTLET_START_POT = 20;

export type WagerKind =
  | "chain"
  | "eye"
  | "clean"
  | "speed"
  | "blood"
  | "fist"
  | "range"
  | "guard"
  | "school"
  | "swap";

export interface GauntletWager {
  kind: WagerKind;
  /** 注额（从彩金里扣；赢按赔率连本带利回） */
  stake: number;
  target: number;
  odds: number;
}

export interface WagerOffer {
  kind: WagerKind;
  title: string;
  tip: string;
  target: number;
  odds: number;
}

export interface WagerStats {
  breaks: number;
  turns: number;
  /** 收局时场上角色气血/上限（0-1） */
  hpEndRatio: number;
  won: boolean;
  /** 本局破眼次数（破眼注）。 */
  eyes: number;
  /** 本局用过小道具/助战符（赤手注）。 */
  itemsUsed: boolean;
  endDist?: number;
  endBlock?: number;
  schoolPure?: boolean;
  swaps?: number;
}

export const GAUNTLET_SCHOOL_LOADOUT: Record<
  WeaponId,
  { loadoutId: string; fieldMate: CompanionId; label: string }
> = {
  palm: { loadoutId: "t1-four-palm", fieldMate: "rail", label: "拳掌" },
  staff: { loadoutId: "t2-four-staff", fieldMate: "sapper", label: "棍" },
  saber: { loadoutId: "t7-four-saber", fieldMate: "watch", label: "刀" },
  sword: { loadoutId: "t4-two-sword-spear", fieldMate: "seer", label: "剑" },
  spear: { loadoutId: "t8-three-spear-palm", fieldMate: "guard", label: "枪" },
  hook: { loadoutId: "t5-hook-saber-spear", fieldMate: "hooker", label: "钩" },
};

export const GAUNTLET_SCHOOLS: WeaponId[] = ["palm", "staff", "saber", "sword", "spear", "hook"];

export const GAUNTLET_REWARD_TIERS: Record<
  Exclude<GauntletTier, "extreme">,
  { picks: number; weights: { tech: number; mind: number; item: number; aid: number } }
> = {
  easy: { picks: 3, weights: { tech: 25, mind: 25, item: 25, aid: 25 } },
  mid: { picks: 4, weights: { tech: 25, mind: 25, item: 25, aid: 25 } },
  hard: { picks: 4, weights: { tech: 25, mind: 25, item: 25, aid: 25 } },
};

/** 战后回血占位：最大 HP 的 30%。 */
export const GAUNTLET_HEAL_RATIO = 0.3;

export const GAUNTLET_PLAYER_HP_MUL = 1.81;

export type GauntletRewardKind = "tech" | "mind" | "item" | "aid" | "card" | "forge" | "upgrade" | "elixir" | "aidPair";

export interface GauntletRewardOption {
  kind: GauntletRewardKind;
  id: string;
  title: string;
  tip: string;
  /** 外功/心法：需指定受益角色（队伍内）。 */
  targetMate?: CompanionId;
}

export interface GauntletBest {
  streak: number;
  breaks: number;
  /** §31.13 彩金纪录（打榜的成绩单）。 */
  pot: number;
}

export interface GauntletRun {
  path: GauntletPath;
  school: WeaponId;
  stage: number;
  streak: number;
  totalBreaks: number;
  deckRecipe: CardId[];
  /** 场上这人的外功，与 mateTechs 同步。 */
  techniques: TechniqueId[];
  /** 每人外功 */
  mateTechs: Partial<Record<CompanionId, TechniqueId[]>>;
  /** 外功档位 1–3，缺省 1 */
  mateTechRanks?: Partial<Record<CompanionId, Partial<Record<TechniqueId, number>>>>;
  /** 行囊里未分配的外功（喂养/改佩） */
  stashTechs?: TechniqueId[];
  /** 行囊里未分配的心法 */
  stashMinds?: MindArtId[];
  /** 每人心法 */
  mateMindArts: Partial<Record<CompanionId, MindArtId[]>>;
  items: LabItemId[];
  equippedItems?: LabItemId[];
  equippedAids?: LabItemId[];
  stashCards?: CardId[];
  mateDecks?: Partial<Record<CompanionId, CardId[]>>;
  skipNextWager?: boolean;
  /** 每种道具剩余颗数；发道具时 +2。 */
  itemCharges?: Partial<Record<LabItemId, number>>;
  hp: number;
  hpMax: number;
  startedAt: number;
  weaponId: string;
  /** 每人兵器；缺省回退 weaponId。 */
  mateWeapons?: Partial<Record<CompanionId, string>>;
  /** 神兵主/副分别获得。 */
  godMain?: boolean;
  godSub?: boolean;
  godUsing?: "main" | "sub";
  bossId: EnemyId;
  companion?: CompanionId;
  /** Extra companions beyond the first (break mode up to 2 total). companion stays synced as companions[0]. */
  companions?: CompanionId[];
  bonusEnergyMax?: number;
  pot: number;
  wager?: GauntletWager | null;
  lastPotText?: string;
  /** §31.17 整局只允许赊账破产一次。 */
  bankruptUsed: boolean;
  /** §31.17 第 1 馆是否已选庄家垫资。 */
  bankerChosen: boolean;
  /** §31.17 本局路径已遇敌人（不重复）。 */
  facedEnemies: EnemyId[];
  /** §31.17 赊账时选的救命奖励（本局有效）。 */
  lifeline?: LifelineKind;
  lifelineCompanion?: CompanionId;
  statBoostMul: number;
  divineWeapons: boolean;
  scars?: number;
  scarPassUsed?: boolean;
  finaleKind?: "mob" | "seat" | "private";
  seenEvents?: string[];
  pendingExtraWaves?: number;
  pendingDmgMul?: number;
  pendingHallLaw?: "noMove" | "mustMelee" | "earlyEye";
  pendingRewardBonus?: number;
  pendingBasePotMul?: number;
  pendingSkipMarket?: boolean;
  /** 江湖：程后黑市事页选开摊后，下一程营地才摆跨阶货。 */
  pendingOpenMarket?: boolean;
  /** 江湖：选项把你送进赌馆屏。 */
  pendingOpenWager?: boolean;
  skipCompanionPick?: boolean;
  forceDangerNext?: boolean;
  pendingIntel?: boolean;
  pendingSkirmish?: "save" | "duel" | "side";
  pendingRecruit?: CompanionId;
  pendingGuestEnemyId?: EnemyId;
  /** 馆间支线标号：脊骨馆 N · 第 k 条（展示 N-k） */
  pendingSideLabel?: string;
  sideBranchAt?: Record<number, number>;
  skirmishActive?: boolean;
  /** 无尽打榜：无馆间遭遇，馆序不停 */
  endless?: boolean;
  /** 行路长度：默认 10，剧情可选短 9 / 长 12。 */
  routeLength?: 9 | 10 | 12;
  storyFlags?: string[];
  /** 江湖本期：开场人 */
  openingId?: CompanionId;
  /** 江湖本期：抽中的 2 人 */
  castDraw?: CompanionId[];
  /** 江湖本期：下一页是开场 / 选项 / 后果 / 赶路 / 收束 / 赌馆 / 黑市 / 剪径 */
  storyPending?: StoryPending;
  /** 江湖本期：当前地理挂点 */
  storyPlace?: StoryPlaceId;
  /** 江湖本期：本拍事页上的人（到地名短页，不换 openingId） */
  storyGuest?: CompanionId;
  /** 江湖本期：人事赌 + 程后赌馆共用，上限 3 */
  gambleCount?: number;
  /** 江湖本期：已经见过面的 cast */
  seenStoryIds?: CompanionId[];
  /** 江湖本期：开局 roll 的赌馆/黑市程号 */
  storySchedule?: StorySchedule;
  bgUses?: Record<string, number>;
  bgAssign?: Record<string, string>;
  /** 最近一次馆间选择的后果（营地/赌馆可见）。 */
  lastEncounterNote?: string;
  /** 路程小本：落过的城/殿与选择。 */
  routeLog?: RouteLogEntry[];
}
