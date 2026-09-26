import type { LabTuning } from "../game/labTypes";
import { difficultyScale, getDifficulty } from "../game/settings";
import {
  QI_MAX,
  QI_BURST_DMG,
  LAB_ENTRANCE_BONUS,
  GRUDGE_NORMAL,
  GRUDGE_ELITE,
  GRUDGE_BOSS,
  VARIANT_BREAK_THRESHOLD,
  BOSS_VARIANT_BREAK_THRESHOLD,
} from "../game/labV2Constants";

export type { LabTuning };

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
