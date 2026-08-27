import { difficultyScale, getDifficulty } from "./settings";
import {
  QI_MAX,
  QI_BURST_DMG,
  LAB_ENTRANCE_BONUS,
  GRUDGE_NORMAL,
  GRUDGE_ELITE,
  GRUDGE_BOSS,
  VARIANT_BREAK_THRESHOLD,
  BOSS_VARIANT_BREAK_THRESHOLD,
} from "./labV2Constants";

export {
  QI_MAX,
  QI_BURST_DMG,
  LAB_ENTRANCE_BONUS,
  GRUDGE_NORMAL,
  GRUDGE_ELITE,
  GRUDGE_BOSS,
  VARIANT_BREAK_THRESHOLD,
  BOSS_VARIANT_BREAK_THRESHOLD,
};

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

export const DEFAULT_LAB_TUNING: LabTuning = {
  dmgCoef: 1,
  breakWindow: 50,
  paceBias: 0,
  aiAggression: 70,
  turnLimitSec: 0,
  deckMultiplier: 5,
  designerMode: true,
  rulesV2: true,
  v2Fx: true,
  v2VariantAi: true,
  v2Grudge: true,
  signatureLimitMode: "perBattle",
  signatureUsesPerBattle: 2,
  signatureCooldownTurns: 3,
  rulesCombo: true,
  deckBias: 0,
  /** §29.3 敌 HP 倍率（Lab）。乱点基线调参后默认 2.6。 */
  enemyHpMul: 2.6,
  /** §29.3 boss/精英额外段预算。 */
  enemySegBonus: 3,
  /** §31.6 默认关：Lab 常规战斗维持 boss/精英加段。踢馆进 run 时开。 */
  enemySegAll: false,
  /** §29.3 每场应激上限。 */
  enemyStressCap: 3,
  /** §31.14 实验台默认总督：敌单回合攻击总伤 ≤ 60% 玩家气血上限。 */
  enemyTurnCapRatio: 0.6,
  playerEnergyBonus: 0,
  playerDmgMul: 1,
};

const STORAGE_KEY = "openhand-combat-lab-tuning";

let labActive = false;
let tuning: LabTuning = { ...DEFAULT_LAB_TUNING };

function loadTuning(): LabTuning {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_LAB_TUNING };
    const parsed = JSON.parse(raw) as Partial<LabTuning>;
    return { ...DEFAULT_LAB_TUNING, ...parsed, designerMode: parsed.designerMode ?? true };
  } catch {
    return { ...DEFAULT_LAB_TUNING };
  }
}

if (typeof localStorage !== "undefined") tuning = loadTuning();

function saveTuning(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tuning));
  } catch {
    /* ignore quota */
  }
}

export function isLabMode(): boolean {
  return labActive;
}

/** Lab + v2 rules active. */
export function isLabV2(): boolean {
  return labActive && tuning.rulesV2;
}

export function getLabTuning(): LabTuning {
  return { ...tuning };
}

export function setLabMode(active: boolean): void {
  labActive = active;
}

export function setLabTuning(patch: Partial<LabTuning>): LabTuning {
  tuning = { ...tuning, ...patch };
  saveTuning();
  return { ...tuning };
}

export function resetLabTuning(): LabTuning {
  tuning = { ...DEFAULT_LAB_TUNING };
  saveTuning();
  return { ...tuning };
}

export function resolveFightScale(): { hp: number; dmg: number; youDmg: number } {
  const base = difficultyScale(getDifficulty());
  if (!labActive) return base;
  const k = Math.max(0.25, Math.min(3, tuning.dmgCoef));
  return {
    hp: base.hp,
    dmg: base.dmg * k,
    youDmg: base.youDmg * k,
  };
}

export function labPaceBias(): number {
  return labActive ? tuning.paceBias : 0;
}

export function labAiAllowsReaction(kind: string, defensive: boolean): boolean {
  if (!labActive) return true;
  const agg = tuning.aiAggression;
  if (defensive) {
    if (agg >= 85) return false;
    if (agg <= 15) return true;
    return agg < 60 || kind === "mend" || kind === "breathe";
  }
  if (agg <= 25) return false;
  if (agg >= 75) return true;
  return kind === "strike" || kind === "barrage" || kind === "lunge" || kind === "bleedcut";
}
