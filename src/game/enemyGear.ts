import type { WeaponId } from "./types";

/** 敌兵刃只三档，不复用玩家凡良精玄神表。 */
export type EnemyGearGrade = "jing" | "xuan" | "shen";

export const ENEMY_GEAR_GRADE_LABEL: Record<EnemyGearGrade, string> = {
  jing: "精",
  xuan: "玄",
  shen: "神",
};

export interface EnemyGear {
  id: string;
  school: WeaponId;
  grade: EnemyGearGrade;
  name: string;
  /** 基础打击档（再按距离修正）。 */
  strike: number;
  passive: string;
  godSkill: string | null;
}

const NAMES: Record<WeaponId, Record<EnemyGearGrade, string>> = {
  staff: { jing: "齐眉白蜡", xuan: "伏魔杖", shen: "降龙禅杖" },
  palm: { jing: "罗汉手", xuan: "韦陀拳套", shen: "金刚拳套" },
  saber: { jing: "短刀", xuan: "黑布刀", shen: "夜路神刃" },
  sword: { jing: "皂隶腰刀", xuan: "绣春剑", shen: "赐死剑" },
  spear: { jing: "点杆", xuan: "锁步枪", shen: "判官点杆" },
  hook: { jing: "绊钩", xuan: "拖尸钩", shen: "沉渊钩" },
};

const PASSIVE: Record<WeaponId, Record<EnemyGearGrade, string>> = {
  saber: {
    jing: "刀口平砍：距 1–2 同伤；命中叠刀口（下张技能费 +1）",
    xuan: "刀口平砍加强；刀口 +1 费",
    shen: "夜幕：刀口改为技能费 +2",
  },
  palm: {
    jing: "罗汉手：连打段多；打击命中推 1 格",
    xuan: "推撞加强；连打更密",
    shen: "金刚手：打击推 1 且自己挡 +2",
  },
  sword: {
    jing: "官差剑：封脉滞步更长；无连势",
    xuan: "封脉叠层更快",
    shen: "赐死：封脉 ≥2 则下一段真伤",
  },
  spear: {
    jing: "点杆：贴脸能戳但伤低；无标尺",
    xuan: "2–3 格伤抬一档",
    shen: "远点加伤，贴脸仍能戳",
  },
  staff: {
    jing: "齐眉：落桩给自己挡；有桩打击可眩 1",
    xuan: "落桩挡更多",
    shen: "罗汉圈：落桩同时威胁邻格",
  },
  hook: {
    jing: "绊钩：拉近后下一段必打；卸 1 张手牌",
    xuan: "拉距更稳",
    shen: "卸牌 2 张",
  },
};

const STRIKE: Record<EnemyGearGrade, number> = { jing: 7, xuan: 11, shen: 16 };

const GOD: Partial<Record<WeaponId, string>> = {
  staff: "罗汉圈",
  saber: "夜幕",
  sword: "赐死",
  palm: "金刚手",
  spear: "判官点",
  hook: "沉渊缴",
};

export function enemyGearId(school: WeaponId, grade: EnemyGearGrade): string {
  return `foe-${school}-${grade}`;
}

export function enemyGear(school: WeaponId, grade: EnemyGearGrade): EnemyGear {
  return {
    id: enemyGearId(school, grade),
    school,
    grade,
    name: NAMES[school][grade],
    strike: STRIKE[grade],
    passive: PASSIVE[school][grade],
    godSkill: grade === "shen" ? (GOD[school] ?? null) : null,
  };
}

/**
 * 品阶曲线。
 * 肉鸽 10 馆：1–2 精、3–6 玄、7+ 主神、8+ 副神。
 * 肉鸽 10 馆：1–2 精、3–6 玄、7+ 主神（8+ 替补可神）。
 */
export function enemyGradeForStage(
  stage: number,
  role: "main" | "extra" = "main",
  _mode: "break" | "classic" = "break",
): EnemyGearGrade {
  if (stage <= 2) return "jing";
  if (stage <= 6) return "xuan";
  if (stage >= 8 && role === "extra") return "shen";
  if (stage >= 7 && role === "main") return "shen";
  return "xuan";
}

/**
 * 敌刀平砍：距 1 与 2 同伤。枪贴脸能戳但腰斩。
 * 玩家刀 10/4、枪禁贴身不走这条。
 */
export function enemyStrikeAtDist(school: WeaponId, grade: EnemyGearGrade, dist: number): number {
  const base = STRIKE[grade];
  if (school === "saber") return dist <= 2 ? base : Math.max(1, Math.floor(base / 2));
  if (school === "spear") {
    if (dist <= 1) return Math.max(1, Math.floor(base * 0.5));
    if (dist === 2 || dist === 3) return base + (grade === "jing" ? 0 : 1);
    return base;
  }
  if (school === "palm") return dist <= 1 ? base : Math.max(1, Math.floor(base * 0.4));
  return dist <= 3 ? base : Math.max(1, Math.floor(base * 0.6));
}

export function enemyNickTax(grade: EnemyGearGrade): number {
  return grade === "shen" ? 2 : 1;
}
