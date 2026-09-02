import type { CompanionId, WeaponId } from "./types";

export type ResonanceTier = 0 | 1 | 2 | 3;
export type MateRole = "dps" | "tank" | "control" | "support" | "skirmish";
export type PartyComposition = "4same" | "3plus1" | "2plus2" | "2plus1plus1" | "allDiff";
export type SignatureLimitMode = "perBattle" | "cooldown";

export const TIER_NAMES: Record<ResonanceTier, string> = {
  0: "未激活",
  1: "入门",
  2: "登堂",
  3: "宗师",
};

export const ROLE_LABEL: Record<MateRole, string> = {
  dps: "输出",
  tank: "承伤",
  control: "控制",
  support: "辅助",
  skirmish: "游击",
};

/** §17.2 阶梯光环 — 六系 × 三档（2/3/4 同系），Lab 可调占位。 */
export interface LadderTierFx {
  label: string;
  knockBonus?: number;
  wallCrashBonus?: number;
  knockEnergyOnSuccess?: number;
  meleeBonus?: number;
  bleedCapBonus?: number;
  firstMeleeAttackCostCut?: number;
  startExpose?: number;
  exposeCardQiBonus?: number;
  exposeDouble?: boolean;
  paceBonus?: number;
  rangeAttackBonus?: number;
  chargeStepsCut?: number;
  startBlock?: number;
  startStake?: number;
  blockRetainOnEndTurn?: boolean;
  pullBonus?: number;
  pullExposeBonus?: number;
  firstPullFree?: boolean;
}

export const LAB_RESONANCE_LADDER: Record<WeaponId, { t1: LadderTierFx; t2: LadderTierFx; t3: LadderTierFx }> = {
  palm: {
    t1: { label: "击退 +1", knockBonus: 1 },
    t2: { label: "撞壁伤 +3", wallCrashBonus: 3 },
    t3: { label: "推撞成功回劲 +1", knockEnergyOnSuccess: 1 },
  },
  saber: {
    t1: { label: "贴身 +2 伤", meleeBonus: 2 },
    t2: { label: "裂创上限 +2", bleedCapBonus: 2 },
    t3: { label: "首张贴身攻 -2 劲", firstMeleeAttackCostCut: 2 },
  },
  sword: {
    t1: { label: "开战破绽 +1", startExpose: 1 },
    t2: { label: "破绽牌 +1 势", exposeCardQiBonus: 1 },
    t3: { label: "破绽触发两次", exposeDouble: true },
  },
  spear: {
    t1: { label: "先机 +2", paceBonus: 2 },
    t2: { label: "远距攻 +3", rangeAttackBonus: 3 },
    t3: { label: "敌冲锋 -1 步", chargeStepsCut: 1 },
  },
  staff: {
    t1: { label: "开战格挡 +4", startBlock: 4 },
    t2: { label: "开战落桩 +1", startStake: 1 },
    t3: { label: "格挡收势不清", blockRetainOnEndTurn: true },
  },
  hook: {
    t1: { label: "拉近 +1 格", pullBonus: 1 },
    t2: { label: "拉近后破绽 +1", pullExposeBonus: 1 },
    t3: { label: "首拉不耗劲", firstPullFree: true },
  },
};

/** §17.3 百花齐放 — 四系全异。 */
export const LAB_HUNDRED_FLOWERS = {
  paceBonus: 1,
  assistCostCut: 1,
  firstComboCardCostCut: 1,
};

/** §16.1 叫助战耗劲 */
export const LAB_ASSIST_COST = 2;

/** §17.5 三主角同框彩蛋 */
export const AURA_DUO_START_QI = 1;

export const DEFAULT_SIGNATURE_USES = 2;
export const DEFAULT_SIGNATURE_COOLDOWN = 3;

export type SignatureKind =
  | "blockAfterKnock"
  | "exposeWhenAdjacent"
  | "thornWhenBlock"
  | "startBlock"
  | "blockWhenFar"
  | "drawOne"
  | "healIfNoAttack"
  | "nextAttackAfterPull"
  | "blockWhenStake"
  | "attackWhenPaceLead"
  | "drawWhenExpose"
  | "blockWhenSkillInHand"
  | "meleeBonus"
  | "blockWhenQi"
  | "heavyBlockSlowPace";

export interface SignatureDef {
  id: CompanionId;
  name: string;
  text: string;
  kind: SignatureKind;
  /** mechanic-keyed 参数占位 */
  amount?: number;
}

/** §21.5 主动技占位 — mechanic-keyed；花名册新人暂用 drawOne 壳，技能真相在 MATE_PASSIVE / rogueRoster */
export const LAB_SIGNATURE: Partial<Record<CompanionId, SignatureDef>> = {
  rail: { id: "rail", name: "门劲", text: "推撞成功后格挡 +2。", kind: "blockAfterKnock", amount: 2 },
  seer: { id: "seer", name: "余墨", text: "贴身时敌破绽 +1。", kind: "exposeWhenAdjacent", amount: 1 },
  sapper: { id: "sapper", name: "桩皮", text: "有格挡时本回反震 +2。", kind: "thornWhenBlock", amount: 2 },
  porter: { id: "porter", name: "稳肩", text: "立即获得格挡 +3。", kind: "startBlock", amount: 3 },
  boat: { id: "boat", name: "水步", text: "不贴身时格挡 +2。", kind: "blockWhenFar", amount: 2 },
  watch: { id: "watch", name: "贴刃", text: "贴身攻击 +2。", kind: "meleeBonus", amount: 2 },
  pilgrim: { id: "pilgrim", name: "锡息", text: "本回未出攻击则回 1 血。", kind: "healIfNoAttack", amount: 1 },
  hooker: { id: "hooker", name: "缆手", text: "拉近后下一掌 +2 伤。", kind: "nextAttackAfterPull", amount: 2 },
  hermit: { id: "hermit", name: "井根", text: "场上有桩则格挡 +2。", kind: "blockWhenStake", amount: 2 },
  salter: { id: "salter", name: "秤口", text: "先机领先时攻击 +2。", kind: "attackWhenPaceLead", amount: 2 },
  scribe: { id: "scribe", name: "案锋", text: "破绽≥2 时抽 1。", kind: "drawWhenExpose", amount: 1 },
  bard: { id: "bard", name: "舌刃", text: "手牌有技能则格挡 +2。", kind: "blockWhenSkillInHand", amount: 2 },
  blade: { id: "blade", name: "航刃", text: "贴身攻击 +2。", kind: "meleeBonus", amount: 2 },
  weaver: { id: "weaver", name: "经纬", text: "势≥1 时格挡 +2。", kind: "blockWhenQi", amount: 2 },
  guard: { id: "guard", name: "门岗", text: "格挡 +4，先机 -1（本回）。", kind: "heavyBlockSlowPace", amount: 4 },
};
