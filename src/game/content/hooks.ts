import type { WeaponId } from "../types";

/**
 * 牌的 kind。盘点见 KIND.md。
 * 绝招 / 位移 / 换人 / 共鸣 / 连携 / 光环 / 架 都是 effectHooks，不进这个枚举。
 * stance 留给持续姿态；现行牌没有这一类。
 */
export const CARD_KINDS = ["attack", "skill", "stance"] as const;
export type CardKind = (typeof CARD_KINDS)[number];

/** 敌人档。对应 labEnemyStress 的首领 / 精英 / 其余，不是出牌种类。 */
export const ENEMY_KINDS = ["mob", "elite", "boss"] as const;
export type EnemyKind = (typeof ENEMY_KINDS)[number];

export const TECHNIQUE_KINDS = ["technique"] as const;
export type TechniqueKind = (typeof TECHNIQUE_KINDS)[number];

export const MIND_KINDS = ["mind"] as const;
export type MindKind = (typeof MIND_KINDS)[number];

export const HEART_KINDS = ["heart"] as const;
export type HeartKind = (typeof HEART_KINDS)[number];

export const CHARM_KINDS = ["charm"] as const;
export type CharmKind = (typeof CHARM_KINDS)[number];

export const ITEM_KINDS = ["item"] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

export const SCHOOLS = ["palm", "saber", "spear", "sword", "staff", "hook", "any"] as const;
export type SchoolId = WeaponId | "any";

/**
 * 已经存在的机制。牌面字段、意图 kind、外功/心法系统、以及盘点里确认能用钩子表达的七类。
 * 共鸣有系统（labResonance），现行没有共鸣牌。
 */
export const MECHANISM_HOOKS = [
  "damage",
  "block",
  "knock",
  "wall",
  "charge",
  "step",
  "heal",
  "pull",
  "near",
  "far",
  "plant",
  "bleed",
  "thorns",
  "expose",
  "energyNext",
  "frail",
  "combo",
  "pace",
  "flow",
  "setup",
  "finisher",
  "echo",
  "retain",
  "mark",
  "mirror",
  "weave",
  "layer",
  "tide",
  "riposte",
  "clearBleed",
  "clearSeal",
  "swap",
  "regen",
  "payHp",
  "stackTax",
  "mute",
  "ultimate",
  "variant",
  "assist",
  "foeMute",
  "disarm",
  "stun",
  "costDiscount",
  "noBag",
  "foeNoBag",
  "handTax",
  "foeHandTax",
  "qiBurn",
  "foeQiBurn",
  "qiRegen",
  "aura",
  "ward",
  "fuse",
  "resonance",
  "handCap",
  "mind",
  "heart",
  "technique",
  "stake",
  "strike",
  "guard",
  "breathe",
  "lunge",
  "trap",
  "windup",
  "advance",
  "barrage",
  "bleedcut",
  "counter",
  "mend",
  "seal",
  "shatter",
  "retreat",
  "pestle",
  "dust",
  "shackle",
  "dodge",
  "endure",
  "sig",
  "summon",
] as const;

export type HookId = (typeof MECHANISM_HOOKS)[number];

const HOOK_SET = new Set<string>(MECHANISM_HOOKS);

export function isMechanismHook(id: string): id is HookId {
  return HOOK_SET.has(id);
}

export function uniqueHooks(hooks: readonly HookId[]): HookId[] {
  return [...new Set(hooks)].sort();
}
