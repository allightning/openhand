import type { CardId, CompanionId, EnemyId, HeroId, LabItemId, TechniqueId } from "../game/types";
import type { MindArtId } from "../game/mindArts";

export interface LabPreset {
  id: string;
  name: string;
  blurb: string;
  tags: string[];
  enemyId: EnemyId;
  /** 同行槽，最多 4 人。 */
  party: CompanionId[];
  /** 开战场上角色。 */
  fieldMate: CompanionId;
  /** 配方：最多 20 种不重复。 */
  deckRecipe: CardId[];
  /** 每人兵器 id。 */
  mateWeapons: Partial<Record<CompanionId, string>>;
  /** 外功绑定角色，每人最多 3 门。 */
  mateTechs: Partial<Record<CompanionId, TechniqueId[]>>;
  /** 心法绑定角色（气血/劲力/回合回复加成）。 */
  mateMinds?: Partial<Record<CompanionId, MindArtId[]>>;
  /** 额外敌人（拆招练习等多敌场景）。 */
  extraFoeIds?: EnemyId[];
  /** §31.17 踢馆轮番：前排倒下后接力上场（单敌开局）。 */
  waveEnemyId?: EnemyId;
  /** §31.17 救命奖励：本局伤害倍率。 */
  statBoostMul?: number;
  hp?: number;
  hpMax?: number;
  /** v2.1 携带道具，最多 2。 */
  labItems?: LabItemId[];
  /** @deprecated 迁移用 */
  hero?: HeroId;
  active?: CompanionId;
  deck?: CardId[];
  weapon?: string;
  weapons?: string[];
  techniques?: TechniqueId[];
  mateDecks?: Partial<Record<CompanionId, CardId[]>>;
}

export interface LabSessionMeta {
  presetId: string;
  presetName: string;
  enemyId?: string;
  designerMode: boolean;
  startedAt: number;
}

export interface LabTurnRecord {
  turn: number;
  side: "player" | "foe";
  action: string;
  cardId?: CardId;
  decisionMs: number;
  previewMatched: boolean;
  playerHp: number;
  enemyHp: number;
  playerPos: number;
  enemyPos: number;
}

export interface LabTelemetry {
  meta: LabSessionMeta;
  turns: LabTurnRecord[];
  endedAt?: number;
  outcome?: "win" | "loss" | "flee" | "abort";
  stallTurn?: number;
  cardsPlayed: Partial<Record<CardId, number>>;
  spatialTags: Partial<Record<string, number>>;
  breakAttempts: number;
  breakSuccess: number;
  breakByType?: Partial<Record<string, number>>;
  v2QiSum?: number;
  v2QiPeak?: number;
  v2QiClears?: number;
  v2SwapCount?: number;
  v2ResonanceCount?: number;
  v2VariantTriggers?: number;
  v2GrudgeTurns?: number;
  /** §24 审计指标（v2.3 并入 WI-9 / 批次二埋点清单）。 */
  v2QiMean?: number;
  v2QiTurnSum?: number;
  v2QiTurnSamples?: number;
  v2GrudgeRatePct?: number;
  v2UltGateAttempts?: number;
  v2UltGateBlocks?: number;
  v2UltBlockRatePct?: number;
  v2VariantBranchA?: number;
  v2VariantBranchB?: number;
  v2VariantBranchNone?: number;
  v2AssistCalls?: number;
  v2AssistDamage?: number;
  v2DoubleHitCount?: number;
  v2SecondaryEquipCount?: number;
  v2ItemUses?: number;
  v2OpeningDamage?: number;
  v2OpeningPaceBehind?: boolean;
  /** §17 v2.5 */
  v2PartyComposition?: import("../game/labV25Constants").PartyComposition;
  v2ResonanceTierMax?: number;
  v2HundredFlowers?: boolean;
  v2SignatureUses?: number;
  v2ComboCardsPlayed?: number;
  v2CompositionCounts?: Partial<Record<string, number>>;
  /** §28 埋点 */
  v2FieldSchoolDeckPct?: number;
  v2ComboUnlockPlays?: number;
  v2DeadHandTurns?: number;
  /** §29 压力埋点 */
  v2FoeSegments?: number;
  v2PlayerActions?: number;
  v2ActionRatio?: number;
  v2AvgTurnDamage?: number;
  v2StressBySource?: Partial<Record<string, number>>;
  v2TurnDamageSum?: number;
  v2TurnDamageSamples?: number;
  tuningSnapshot: import("../game/labTuning").LabTuning;
}

export type LabPhase = "setup" | "battle" | "report";

export interface LabStorageFile {
  customPresets: LabPreset[];
  lastPresetId: string | null;
  recentReports: LabTelemetry[];
}
