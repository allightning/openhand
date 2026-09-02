import type { GauntletLadderEntry } from "./gauntlet";
import type { CompanionId, EnemyId } from "../game/types";

/** 三条踢馆线：少林 / 江湖 / 朝廷。数值曲线相近，敌人与主题不同。 */
export type GauntletPath = "shaolin" | "bandit" | "court";

export const GAUNTLET_PATH_LABEL: Record<GauntletPath, string> = {
  shaolin: "少林寺",
  bandit: "江湖",
  court: "朝廷暗线",
};

export const GAUNTLET_PATH_BLURB: Record<GauntletPath, string> = {
  shaolin: "从山门走进罗汉院。棍、拳、阵一层紧一层，终馆是方丈的规矩。",
  bandit: "剪径、劫镖、漕帮。刀钩枪混在野路上，下一馆从不报上号。",
  court: "差役、影卫、殿前。快刀藏在规矩里，官道上看不见的那一刀才是馆。",
};

export const COMPANION_MILESTONES = [3, 7] as const;
export const BREAK_COMPANION_MILESTONES = COMPANION_MILESTONES;
export const GAUNTLET_MIDTERM_STAGE = 7;
export const GAUNTLET_FINAL_STAGE = 10;
export const BREAK_GAUNTLET_FINAL_STAGE = 10;

export function getGauntletFinalStage(): number {
  return 10;
}

export function companionMilestones(): readonly number[] {
  return COMPANION_MILESTONES;
}

export function maxCompanions(): number {
  return 2;
}

function stage(
  stageNum: number,
  tier: GauntletLadderEntry["tier"],
  label: string,
  enemyId: EnemyId,
  hpMul: number,
  segBonus: number,
  dmgCoef: number,
  extra?: Partial<GauntletLadderEntry>,
): GauntletLadderEntry {
  return { stage: stageNum, tier, label, enemyId, hpMul, segBonus, dmgCoef, ...extra };
}

/** 拆招短局 10 馆：少林。3 后双人轮番，8–9 三人，10 四人。 */
const SHAOLIN_LADDER: GauntletLadderEntry[] = [
  stage(1, "easy", "第1关·来锋位移·山门沙弥", "mob_monk_01", 1.15, 1, 1.15, { stressCap: 0 }),
  stage(2, "easy", "第2关·让与破眼·巡寺棍僧", "mob_monk_02", 1.38, 1, 1.28, { stressCap: 0 }),
  stage(3, "mid", "第3关·戒刀僧", "mob_monk_03", 1.62, 2, 1.45),
  stage(4, "mid", "第4关·同道·拳僧", "mob_monk_04", 1.85, 2, 1.65, { extraEnemyIds: ["mob_monk_07"] }),
  stage(5, "hard", "第5关·护寺武僧", "mob_monk_05", 2.15, 3, 1.85, { stressCap: 4, extraEnemyIds: ["mob_monk_09"] }),
  stage(6, "hard", "第6关·罗汉堂前", "mob_monk_06", 2.4, 3, 2.05, { stressCap: 4, extraEnemyIds: ["mob_monk_11"] }),
  stage(7, "extreme", "第7关·期中·罗汉", "mob_monk_08", 2.75, 4, 2.35, { forceGrudge: true, stressCap: 5, extraEnemyIds: ["mob_monk_13"] }),
  stage(8, "hard", "第8关·棍阵三僧", "mob_monk_10", 2.55, 3, 2.15, { extraEnemyIds: ["mob_monk_11", "mob_monk_07"] }),
  stage(9, "hard", "第9关·伏魔三杖", "mob_monk_12", 2.8, 4, 2.35, { extraEnemyIds: ["mob_monk_13", "mob_monk_15"] }),
  stage(10, "extreme", "第10关·期末·方丈座前", "mob_monk_05", 3.2, 5, 2.55, {
    forceGrudge: true,
    stressCap: 6,
    extraEnemyIds: ["mob_monk_06", "mob_monk_08", "mob_monk_09"],
  }),
];

/** 拆招短局 10 馆：江湖。 */
const BANDIT_LADDER: GauntletLadderEntry[] = [
  stage(1, "easy", "第1关·来锋位移·剪径", "mob_road_01", 1.15, 1, 1.15, { stressCap: 0 }),
  stage(2, "easy", "第2关·让与破眼·坡蹲", "mob_road_02", 1.38, 1, 1.28, { stressCap: 0 }),
  stage(3, "mid", "第3关·蓄势路匪", "mob_road_05", 1.62, 2, 1.45),
  stage(4, "mid", "第4关·同道·伏草客", "mob_road_06", 1.85, 2, 1.65, { extraEnemyIds: ["mob_road_08"] }),
  stage(5, "hard", "第5关·截镖", "mob_escortBand_01", 2.15, 3, 1.85, { stressCap: 4, extraEnemyIds: ["mob_road_09"] }),
  stage(6, "hard", "第6关·裂旗劫手", "mob_escortBand_02", 2.4, 3, 2.05, { stressCap: 4, extraEnemyIds: ["mob_canal_01"] }),
  stage(7, "extreme", "第7关·期中·同道再聚", "mob_escortBand_03", 2.75, 4, 2.35, { forceGrudge: true, stressCap: 5, extraEnemyIds: ["mob_road_10"] }),
  stage(8, "hard", "第8关·岸匪三刀", "mob_escortBand_04", 2.55, 3, 2.15, { extraEnemyIds: ["mob_road_09", "mob_canal_02"] }),
  stage(9, "hard", "第9关·水匪哨", "mob_escortBand_05", 2.8, 4, 2.35, { extraEnemyIds: ["mob_canal_01", "mob_canal_05"] }),
  stage(10, "extreme", "第10关·期末·寨主堂", "mob_escortBand_02", 3.2, 5, 2.55, {
    forceGrudge: true,
    stressCap: 6,
    extraEnemyIds: ["mob_canal_03", "mob_canal_04", "mob_canal_02"],
  }),
];

/** 拆招短局 10 馆：朝廷。 */
const COURT_LADDER: GauntletLadderEntry[] = [
  stage(1, "easy", "第1关·来锋位移·皂隶", "mob_yamenRunner_01", 1.15, 1, 1.15, { stressCap: 0 }),
  stage(2, "easy", "第2关·让与破眼·快班", "mob_yamenRunner_02", 1.38, 1, 1.28, { stressCap: 0 }),
  stage(3, "mid", "第3关·捕快副", "mob_yamenRunner_03", 1.62, 2, 1.45),
  stage(4, "mid", "第4关·同道·锁链手", "mob_yamenRunner_04", 1.85, 2, 1.65, { extraEnemyIds: ["mob_court_05"] }),
  stage(5, "hard", "第5关·内侍刀", "mob_court_02", 2.15, 3, 1.85, { stressCap: 4, extraEnemyIds: ["mob_yamenRunner_05"] }),
  stage(6, "hard", "第6关·影卫", "mob_court_03", 2.4, 3, 2.05, { stressCap: 4, extraEnemyIds: ["mob_court_08"] }),
  stage(7, "extreme", "第7关·期中·锦衣", "mob_court_04", 2.75, 4, 2.35, { forceGrudge: true, stressCap: 5, extraEnemyIds: ["mob_court_11"] }),
  stage(8, "hard", "第8关·门下暗", "mob_court_06", 2.55, 3, 2.15, { extraEnemyIds: ["mob_yamenRunner_05", "mob_court_09"] }),
  stage(9, "hard", "第9关·案卷刺客", "mob_court_07", 2.8, 4, 2.35, { extraEnemyIds: ["mob_court_08", "mob_court_11"] }),
  stage(10, "extreme", "第10关·期末·殿前", "mob_court_07", 3.2, 5, 2.55, {
    forceGrudge: true,
    stressCap: 6,
    extraEnemyIds: ["mob_court_08", "mob_court_11", "mob_yamenRunner_07"],
  }),
];

export const GAUNTLET_PATH_LADDERS: Record<GauntletPath, GauntletLadderEntry[]> = {
  shaolin: SHAOLIN_LADDER,
  bandit: BANDIT_LADDER,
  court: COURT_LADDER,
};

export const BREAK_PATH_LADDERS = GAUNTLET_PATH_LADDERS;

/** 各线同道池（高阶奖励：第 4 / 7 / 12 关后三选一）。 */
export const PATH_COMPANION_POOL: Record<GauntletPath, CompanionId[]> = {
  shaolin: ["pilgrim", "hermit", "porter", "guard"],
  bandit: ["watch", "hooker", "blade", "salter"],
  court: ["scribe", "guard", "bard", "weaver"],
};

export function pathLadder(path: GauntletPath): GauntletLadderEntry[] {
  return GAUNTLET_PATH_LADDERS[path];
}

export function isCompanionMilestone(stageCompleted: number): boolean {
  return companionMilestones().includes(stageCompleted);
}
