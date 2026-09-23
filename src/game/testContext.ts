import { DEFAULT_LAB_TUNING, type LabTuning } from "./labTuning";
import type { LabRuleset } from "./labRuleset";
import { makeContext, type RunContext } from "./runContext";

export interface TestContextOver {
  mode?: LabRuleset;
  lab?: boolean;
  tuning?: Partial<LabTuning>;
}

/** 固定 DEFAULT_LAB_TUNING，不读当前单例。B1 起测试再改调用点。 */
export function makeTestContext(over: TestContextOver = {}): RunContext {
  const mode = over.mode ?? "climb";
  const lab = over.lab ?? true;
  return makeContext(mode, { ...DEFAULT_LAB_TUNING, ...over.tuning }, lab);
}

export function climbTestContext(tuning?: Partial<LabTuning>): RunContext {
  return makeTestContext({ mode: "climb", lab: true, tuning });
}

export function breakTestContext(tuning?: Partial<LabTuning>): RunContext {
  return makeTestContext({ mode: "break", lab: true, tuning });
}
