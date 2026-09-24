import { EMPTY_CONTENT_OVERRIDES } from "./labContentOverrides";
import { DEFAULT_LAB_TUNING, type LabTuning } from "./labTuning";
import type { LabRuleset } from "./labRuleset";
import { makeContext, type FightScale, type RunContext } from "./runContext";
import { difficultyScale, getDifficulty } from "./settings";

export interface TestContextOver {
  mode?: LabRuleset;
  lab?: boolean;
  tuning?: Partial<LabTuning>;
}

/** 与 resolveFightScale 同一公式，系数取本上下文合并后的 tuning，不读实验室单例。 */
function fightScaleFor(lab: boolean, tuning: LabTuning): FightScale {
  const base = difficultyScale(getDifficulty());
  if (!lab) return base;
  const k = Math.max(0.25, Math.min(3, tuning.dmgCoef));
  return { hp: base.hp, dmg: base.dmg * k, youDmg: base.youDmg * k };
}

/** 固定 DEFAULT_LAB_TUNING，不读当前单例。B1 起测试再改调用点。 */
export function makeTestContext(over: TestContextOver = {}): RunContext {
  const mode = over.mode ?? "climb";
  const lab = over.lab ?? true;
  const tuning = { ...DEFAULT_LAB_TUNING, ...over.tuning };
  return makeContext(mode, tuning, lab, EMPTY_CONTENT_OVERRIDES, fightScaleFor(lab, tuning));
}

export function climbTestContext(tuning?: Partial<LabTuning>): RunContext {
  return makeTestContext({ mode: "climb", lab: true, tuning });
}

export function breakTestContext(tuning?: Partial<LabTuning>): RunContext {
  return makeTestContext({ mode: "break", lab: true, tuning });
}
