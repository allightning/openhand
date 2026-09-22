import { CLIMB_EXPOSE_THROUGH_BLOCK, CLIMB_LIFESTEAL_PCT } from "./climbCaps";
import {
  BREAK_EXPOSE_BEFORE_BLOCK,
  BREAK_SABER_ON_HIT,
  BREAK_SWORD_CHAIN_PER,
} from "./breakCaps";
import { getLabRuleset, type LabRuleset } from "./labRuleset";
import { getLabTuning, isLabMode, type LabTuning } from "./labTuning";

export interface RunRuleset {
  mode: LabRuleset;
}

/** 预演构成用的已决议数字。结算函数只读这些字段，不读 mode。 */
export interface BreakdownCaps {
  exposeBeforeBlock: number;
  exposeThroughBlock: number;
  swordChainPerLayer: number;
  swordAsMomentum: boolean;
  swordBleedStack: boolean;
  saberOnHit: number;
  saberGrudge: boolean;
  spearStance: boolean;
  brightBlade: boolean;
  hookLifestealPct: number;
}

/** 按域加字段。下一刀加 caps.wager，不要把预演 / 下注 / 出牌摊进同一个 interface。 */
export interface RunCaps {
  breakdown: BreakdownCaps;
}

export interface RunContext {
  ruleset: RunRuleset;
  tuning: LabTuning;
  lab: boolean;
  caps: RunCaps;
}

function breakdownCaps(lab: boolean, mode: LabRuleset): BreakdownCaps {
  const climbLab = lab && mode === "climb";
  const breakLab = lab && mode === "break";
  return {
    exposeBeforeBlock: climbLab ? 0 : BREAK_EXPOSE_BEFORE_BLOCK,
    exposeThroughBlock: climbLab ? CLIMB_EXPOSE_THROUGH_BLOCK : 0,
    swordChainPerLayer: mode === "break" ? BREAK_SWORD_CHAIN_PER : 0,
    swordAsMomentum: climbLab,
    swordBleedStack: !climbLab,
    saberOnHit: climbLab ? 0 : BREAK_SABER_ON_HIT,
    saberGrudge: !breakLab,
    spearStance: !breakLab,
    brightBlade: !breakLab,
    hookLifestealPct: climbLab ? CLIMB_LIFESTEAL_PCT : 0,
  };
}

export function makeContext(mode: LabRuleset, tuning: LabTuning, lab: boolean): RunContext {
  return { ruleset: { mode }, tuning, lab, caps: { breakdown: breakdownCaps(lab, mode) } };
}

export function climbContext(tuning: LabTuning = getLabTuning(), lab = true): RunContext {
  return makeContext("climb", tuning, lab);
}

export function breakContext(tuning: LabTuning = getLabTuning(), lab = true): RunContext {
  return makeContext("break", tuning, lab);
}

/** 调用点还没传入 ctx 时的桥。阶段 1 收尾删掉。 */
export function contextNow(): RunContext {
  return makeContext(getLabRuleset(), getLabTuning(), isLabMode());
}
