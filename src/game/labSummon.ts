import type { LabItemId, WeaponId } from "./types";

/**
 * §31.12 助战符 —— 与「同行」完全分家的客座好手。
 * 同行 = 后场队友（换人/光环/组合技）；助战符 = 一次性召唤：实体占一格、放一手本系绝活、替你站一回合就走。
 * 强度介于小道具与同行之间；血量/功力随主角兵刃品阶走（不带武器技能）。
 */
export interface SummonDef {
  item: LabItemId;
  school: WeaponId;
  name: string;
  title: string;
  /** 品阶 3/4/5 → HP。 */
  hp: (grade: number) => number;
  /** 上场即放的一手绝活（文案）。 */
  skill: string;
  tip: string;
}

export const SUMMON_DEFS: Record<WeaponId, SummonDef> = {
  palm: {
    item: "aidPalm",
    school: "palm",
    name: "铁牛",
    title: "扛山汉",
    hp: (g) => 12 + (g - 3) * 2,
    skill: "吸仇：敌下一段攻击打他（算你拆了这段）",
    tip: "拳助·铁牛：皮糙肉厚。上场后敌下一段攻击只认他——替你挡刀，还算你拆招。放敌身后还能当墙（震壁连招）。",
  },
  saber: {
    item: "aidSaber",
    school: "saber",
    name: "燕七",
    title: "掠影客",
    hp: (g) => 8 + (g - 3) * 2,
    skill: "上场：敌破绽 +2（你打他更疼）",
    tip: "刀助·燕七：上场即剜出敌破绽 +2（承伤加深）。本体占一格，可卡位、可挡冲锋。",
  },
  sword: {
    item: "aidSword",
    school: "sword",
    name: "白衣",
    title: "细雨剑",
    hp: (g) => 8 + (g - 3) * 2,
    skill: "上场：敌裂创 +3",
    tip: "剑助·白衣：一剑三创——敌裂创 +3，配剑系叠层。本体占一格，可卡位、可挡冲锋。",
  },
  spear: {
    item: "aidSpear",
    school: "spear",
    name: "长梢",
    title: "芦苇枪",
    hp: (g) => 8 + (g - 3) * 2,
    skill: "上场：敌被挑退 1 格（替你控距）",
    tip: "枪助·长梢：上场一枪把敌挑退 1 格，帮你拉开距离。本体占一格，可卡位、可挡冲锋。",
  },
  staff: {
    item: "aidStaff",
    school: "staff",
    name: "顿僧",
    title: "扫地僧",
    hp: (g) => 10 + (g - 3) * 2,
    skill: "上场：敌眩晕 1 段（本回合少出一招）",
    tip: "棍助·顿僧：禅杖顿地，敌眩晕 1 段。本体占一格，可卡位、可挡冲锋。",
  },
  hook: {
    item: "aidHook",
    school: "hook",
    name: "缠丝",
    title: "盘链手",
    hp: (g) => 8 + (g - 3) * 2,
    skill: "上场：敌缴械 2 息（伤害减半）",
    tip: "钩助·缠丝：链钩一绞，敌缴械 2 息。本体占一格，可卡位、可挡冲锋。",
  },
};

export const SUMMON_ITEM_TO_SCHOOL: Partial<Record<LabItemId, WeaponId>> = Object.fromEntries(
  Object.values(SUMMON_DEFS).map((d) => [d.item, d.school]),
);

export function isSummonItem(item: LabItemId): boolean {
  return item in SUMMON_ITEM_TO_SCHOOL;
}
