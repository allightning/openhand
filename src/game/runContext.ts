import { CLIMB_EXPOSE_THROUGH_BLOCK, CLIMB_LIFESTEAL_PCT, CLIMB_STAKE_CAP } from "./climbCaps";
import {
  BREAK_EXPOSE_BEFORE_BLOCK,
  BREAK_SABER_ON_HIT,
  BREAK_SWORD_CHAIN_PER,
} from "./breakCaps";
import type { ContentOverrideStore, LabRuleset, LabTuning } from "./labTypes";

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

/** 按域加字段。不把预演 / 意图 / 桩帽 / 组合技 / 敌压 / 资源倍率 / 牌面摊进同一个 interface。 */
export interface IntentCaps {
  /** 登门用回合开始站位；行路用收势站位。 */
  aimAtTurnStart: boolean;
  /** 带绵掌时，结束格挡门槛少减这么多。登门 2，行路 0。 */
  softPalmBlockRelax: number;
}

export interface ComboCaps {
  /** 行路允许组合技卡。登门关闭，异系走融合卡。 */
  allowComboCards: boolean;
}

export interface EnemyCaps {
  /** source 为 break 的施压意图是否生效。仅登门。 */
  allowBreakStress: boolean;
}

export interface EconomyCaps {
  /** 行路实验室才进资源倍率。登门或非实验室原样返回。 */
  applyScale: boolean;
}

export interface ContentCaps {
  /** 行路用爬塔牌面。只看 mode，实验室门在访问器里。 */
  applyClimbCardFace: boolean;
}

export interface StakeCaps {
  /** 场上立桩上限，0 = 不限。行路实验室为 CLIMB_STAKE_CAP。 */
  cap: number;
}

export interface RunCaps {
  breakdown: BreakdownCaps;
  intent: IntentCaps;
  stake: StakeCaps;
  combo: ComboCaps;
  enemy: EnemyCaps;
  economy: EconomyCaps;
  content: ContentCaps;
}

export interface FightScale {
  hp: number;
  dmg: number;
  youDmg: number;
}

export interface RunContext {
  ruleset: RunRuleset;
  tuning: LabTuning;
  lab: boolean;
  caps: RunCaps;
  contentOverrides: ContentOverrideStore;
  fightScale: FightScale;
}

function intentCaps(mode: LabRuleset): IntentCaps {
  const brk = mode === "break";
  return { aimAtTurnStart: brk, softPalmBlockRelax: brk ? 2 : 0 };
}

function comboCaps(mode: LabRuleset): ComboCaps {
  return { allowComboCards: mode === "climb" };
}

function enemyCaps(mode: LabRuleset): EnemyCaps {
  return { allowBreakStress: mode === "break" };
}

function economyCaps(lab: boolean, mode: LabRuleset): EconomyCaps {
  return { applyScale: lab && mode === "climb" };
}

function contentCaps(mode: LabRuleset): ContentCaps {
  return { applyClimbCardFace: mode === "climb" };
}

/** 实验室且开了 v2 规则。结算函数用这个，不要各抄一份。 */
export function labV2(ctx: RunContext): boolean {
  return ctx.lab && ctx.tuning.rulesV2;
}

/** 实验室先机偏置。非实验室为 0。 */
export function paceBias(rc: RunContext): number {
  return rc.lab ? rc.tuning.paceBias : 0;
}

/** 实验室 AI 是否允许这一拍反应。阈值与分支与旧 labAiAllowsReaction 相同。 */
export function aiAllowsReaction(rc: RunContext, kind: string, defensive: boolean): boolean {
  if (!rc.lab) return true;
  const agg = rc.tuning.aiAggression;
  if (defensive) {
    if (agg >= 85) return false;
    if (agg <= 15) return true;
    return agg < 60 || kind === "mend" || kind === "breathe";
  }
  if (agg <= 25) return false;
  if (agg >= 75) return true;
  return kind === "strike" || kind === "barrage" || kind === "lunge" || kind === "bleedcut";
}

function stakeCaps(lab: boolean, mode: LabRuleset): StakeCaps {
  return { cap: lab && mode === "climb" ? CLIMB_STAKE_CAP : 0 };
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

export function makeContext(
  mode: LabRuleset,
  tuning: LabTuning,
  lab: boolean,
  contentOverrides: ContentOverrideStore,
  fightScale: FightScale,
): RunContext {
  return {
    ruleset: { mode },
    tuning,
    lab,
    caps: {
      breakdown: breakdownCaps(lab, mode),
      intent: intentCaps(mode),
      stake: stakeCaps(lab, mode),
      combo: comboCaps(mode),
      enemy: enemyCaps(mode),
      economy: economyCaps(lab, mode),
      content: contentCaps(mode),
    },
    contentOverrides,
    fightScale,
  };
}
