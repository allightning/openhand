import type { CardDef, CardId, CompanionId, EnemyDef, EnemyId, TechniqueDef, TechniqueId } from "./types";
import type { GearWeapon } from "./weapons";

/** 行路 / 登门。运行时开关在壳层。 */
export type LabRuleset = "climb" | "break";

/** Combat Lab runtime knobs — separate from main-game settings. */
export interface LabTuning {
  dmgCoef: number;
  breakWindow: number;
  paceBias: number;
  aiAggression: number;
  turnLimitSec: number;
  deckMultiplier: number;
  designerMode: boolean;
  /** v2 combat rules (Lab only). Default on; off = v1 behavior. */
  rulesV2: boolean;
  /** v2 juice: break flash, wall shake, kill slow-mo. */
  v2Fx: boolean;
  /** v2 variant AI when breaks repeat. */
  v2VariantAi: boolean;
  /** v2 grudge overtime damage ramp. */
  v2Grudge: boolean;
  /** §21.5 专属技次数模式 */
  signatureLimitMode: "perBattle" | "cooldown";
  signatureUsesPerBattle: number;
  signatureCooldownTurns: number;
  /** §16 组合技总开关；关 = v2.5 基准行为不受影响。 */
  rulesCombo: boolean;
  /** §28.5 发牌加权（0=关，仅备用旋钮）。 */
  deckBias: number;
  /** §29.3 敌 HP 倍率。 */
  enemyHpMul: number;
  /** §29.3 boss/精英额外意图段预算。 */
  enemySegBonus: number;
  /** §31.6 段预算加成扩到全体敌人（踢馆线：杂兵也要出题）。默认关，仅 boss/精英吃 segBonus。 */
  enemySegAll: boolean;
  /** §29.3 每场应激段上限。 */
  enemyStressCap: number;
  /** §31.14 敌方单回合攻击段总伤总督：占玩家气血上限比例（0=关）。防「满血一招秒」。 */
  enemyTurnCapRatio: number;
  /** §31.9 踢馆仙药：玩家劲力上限加成（仅踢馆线写入）。 */
  playerEnergyBonus: number;
  /** §31.17 救命奖励等：玩家伤害倍率。 */
  playerDmgMul: number;
}

export type CardOverride = Partial<
  Pick<CardDef, "name" | "cost" | "damage" | "block" | "knock" | "wall" | "heal" | "bleed" | "expose" | "steps" | "chargeBonus">
>;

export type EnemyOverride = Partial<Pick<EnemyDef, "name" | "hp" | "pos" | "pace" | "reach">>;

export type WeaponOverride = Partial<Pick<GearWeapon, "name" | "damage" | "knock" | "ward">>;

export type TechniqueOverride = Partial<Pick<TechniqueDef, "name" | "text">>;

export type MateOverride = Partial<{ hp: number; passive: { name: string; text: string } }>;

export interface ContentOverrideStore {
  cards: Partial<Record<CardId, CardOverride>>;
  enemies: Partial<Record<EnemyId, EnemyOverride>>;
  weapons: Partial<Record<string, WeaponOverride>>;
  techniques: Partial<Record<TechniqueId, TechniqueOverride>>;
  mates: Partial<Record<CompanionId, MateOverride>>;
}
