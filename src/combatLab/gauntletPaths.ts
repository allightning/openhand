import type { GauntletLadderEntry } from "./gauntlet";
import type { CompanionId, EnemyId } from "../game/types";
import { isBreakAlign } from "./labRuleset";

/** 三条踢馆线：少林 / 土匪 / 朝廷。数值曲线相近，敌人与主题不同。 */
export type GauntletPath = "shaolin" | "bandit" | "court";

export const GAUNTLET_PATH_LABEL: Record<GauntletPath, string> = {
  shaolin: "少林寺",
  bandit: "绿林寨",
  court: "朝廷暗线",
};

export const GAUNTLET_PATH_BLURB: Record<GauntletPath, string> = {
  shaolin: "山门、罗汉、方丈。棍拳并用，阵法渐紧。",
  bandit: "剪径、劫镖、漕帮。刀钩枪混杂，野路数。",
  court: "差役、影卫、殿前。快刀与暗桩，规矩里藏刀。",
};

/** Classic milestones (15 馆). Break uses [4, 7] via companionMilestones(). */
export const COMPANION_MILESTONES = [4, 7, 12] as const;
export const BREAK_COMPANION_MILESTONES = [4, 7] as const;
export const GAUNTLET_MIDTERM_STAGE = 7;
/** Classic final stage constant (15). Prefer getGauntletFinalStage() at runtime. */
export const GAUNTLET_FINAL_STAGE = 15;
export const BREAK_GAUNTLET_FINAL_STAGE = 10;

export function getGauntletFinalStage(): number {
  return isBreakAlign() ? BREAK_GAUNTLET_FINAL_STAGE : GAUNTLET_FINAL_STAGE;
}

export function companionMilestones(): readonly number[] {
  return isBreakAlign() ? BREAK_COMPANION_MILESTONES : COMPANION_MILESTONES;
}

export function maxCompanions(): number {
  return isBreakAlign() ? 2 : 1;
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

/** 少林线：僧兵、守门、罗汉阵、方丈。 */
const SHAOLIN_LADDER: GauntletLadderEntry[] = [
  stage(1, "easy", "第1关·山门沙弥", "mob_monk_01", 1.0, 1, 0.9),
  stage(2, "easy", "第2关·巡寺棍僧", "mob_monk_02", 1.05, 1, 1.0),
  stage(3, "mid", "第3关·戒刀僧", "mob_monk_03", 1.15, 2, 1.05),
  stage(4, "mid", "第4关·拳僧", "mob_monk_04", 1.25, 2, 1.15),
  stage(5, "hard", "第5关·护寺武僧", "mob_monk_05", 1.4, 3, 1.25, { stressCap: 4 }),
  stage(6, "hard", "第6关·罗汉堂前", "mob_monk_06", 1.55, 3, 1.35, { stressCap: 4 }),
  stage(7, "extreme", "第7关·期中·十八罗汉", "mob_monk_08", 2.0, 4, 1.55, {
    forceGrudge: true,
    stressCap: 5,
    extraEnemyIds: ["mob_monk_07", "mob_monk_09"],
  }),
  stage(8, "hard", "第8关·棍阵二僧", "mob_monk_10", 1.65, 3, 1.4, { extraEnemyIds: ["mob_monk_11"] }),
  stage(9, "hard", "第9关·伏魔杖", "mob_monk_12", 1.75, 4, 1.45, { extraEnemyIds: ["mob_monk_13"] }),
  stage(10, "hard", "第10关·禅武双僧", "mob_monk_10", 1.85, 4, 1.5, { extraEnemyIds: ["mob_monk_11"] }),
  stage(11, "extreme", "第11关·戒律院", "mob_monk_12", 1.95, 4, 1.55, { extraEnemyIds: ["mob_monk_13"], stressCap: 5 }),
  stage(12, "extreme", "第12关·方丈前殿", "mob_monk_14", 2.05, 4, 1.6, { extraEnemyIds: ["mob_monk_15"], stressCap: 5 }),
  stage(13, "extreme", "第13关·罗汉续阵", "mob_monk_07", 2.1, 5, 1.65, { extraEnemyIds: ["mob_monk_08"], stressCap: 5 }),
  stage(14, "extreme", "第14关·护法僧", "mob_monk_10", 2.15, 5, 1.7, { extraEnemyIds: ["mob_monk_11"], stressCap: 5 }),
  stage(15, "extreme", "第15关·期末·方丈座前", "mob_monk_05", 2.35, 5, 1.75, {
    forceGrudge: true,
    stressCap: 6,
    extraEnemyIds: ["mob_monk_06"],
  }),
];

/** 土匪线：路匪、劫镖、漕帮。 */
const BANDIT_LADDER: GauntletLadderEntry[] = [
  stage(1, "easy", "第1关·剪径", "mob_road_01", 1.0, 1, 0.9),
  stage(2, "easy", "第2关·坡蹲", "mob_road_02", 1.05, 1, 1.0),
  stage(3, "mid", "第3关·蓄势路匪", "mob_road_05", 1.15, 2, 1.05),
  stage(4, "mid", "第4关·伏草客", "mob_road_06", 1.25, 2, 1.15),
  stage(5, "hard", "第5关·截镖", "mob_escortBand_01", 1.4, 3, 1.25, { stressCap: 4 }),
  stage(6, "hard", "第6关·裂旗劫手", "mob_escortBand_02", 1.55, 3, 1.35, { stressCap: 4 }),
  stage(7, "extreme", "第7关·期中·双匪合击", "mob_escortBand_03", 2.0, 4, 1.55, {
    forceGrudge: true,
    stressCap: 5,
    extraEnemyIds: ["mob_road_08"],
  }),
  stage(8, "hard", "第8关·岸匪双刀", "mob_escortBand_04", 1.65, 3, 1.4, { extraEnemyIds: ["mob_road_09"] }),
  stage(9, "hard", "第9关·水匪哨", "mob_escortBand_05", 1.75, 4, 1.45, { extraEnemyIds: ["mob_canal_01"] }),
  stage(10, "hard", "第10关·盐牙打手", "mob_canal_03", 1.85, 4, 1.5, { extraEnemyIds: ["mob_canal_02"] }),
  stage(11, "extreme", "第11关·河霸", "mob_canal_04", 1.95, 4, 1.55, { extraEnemyIds: ["mob_canal_05"], stressCap: 5 }),
  stage(12, "extreme", "第12关·缆手恶", "mob_canal_06", 2.05, 4, 1.6, { extraEnemyIds: ["mob_road_10"], stressCap: 5 }),
  stage(13, "extreme", "第13关·三匪围殴", "mob_road_11", 2.1, 5, 1.65, { extraEnemyIds: ["mob_road_12"], stressCap: 5 }),
  stage(14, "extreme", "第14关·夜劫", "mob_escortBand_07", 2.15, 5, 1.7, { extraEnemyIds: ["mob_escortBand_08"], stressCap: 5 }),
  stage(15, "extreme", "第15关·期末·寨主堂", "mob_escortBand_02", 2.35, 5, 1.75, {
    forceGrudge: true,
    stressCap: 6,
    extraEnemyIds: ["mob_canal_03"],
  }),
];

/** 朝廷线：差役、影卫、殿前。 */
const COURT_LADDER: GauntletLadderEntry[] = [
  stage(1, "easy", "第1关·皂隶", "mob_yamenRunner_01", 1.0, 1, 0.9),
  stage(2, "easy", "第2关·快班", "mob_yamenRunner_02", 1.05, 1, 1.0),
  stage(3, "mid", "第3关·捕快副", "mob_yamenRunner_03", 1.15, 2, 1.05),
  stage(4, "mid", "第4关·锁链手", "mob_yamenRunner_04", 1.25, 2, 1.15),
  stage(5, "hard", "第5关·内侍刀", "mob_court_02", 1.4, 3, 1.25, { stressCap: 4 }),
  stage(6, "hard", "第6关·影卫", "mob_court_03", 1.55, 3, 1.35, { stressCap: 4 }),
  stage(7, "extreme", "第7关·期中·锦衣双哨", "mob_court_04", 2.0, 4, 1.55, {
    forceGrudge: true,
    stressCap: 5,
    extraEnemyIds: ["mob_court_05"],
  }),
  stage(8, "hard", "第8关·门下暗", "mob_court_06", 1.65, 3, 1.4, { extraEnemyIds: ["mob_yamenRunner_05"] }),
  stage(9, "hard", "第9关·案卷刺客", "mob_court_07", 1.75, 4, 1.45, { extraEnemyIds: ["mob_court_08"] }),
  stage(10, "hard", "第10关·禁军探", "mob_court_09", 1.85, 4, 1.5, { extraEnemyIds: ["mob_yamenRunner_06"] }),
  stage(11, "extreme", "第11关·夜封", "mob_court_10", 1.95, 4, 1.55, { extraEnemyIds: ["mob_court_11"], stressCap: 5 }),
  stage(12, "extreme", "第12关·殿前替", "mob_court_12", 2.05, 4, 1.6, { extraEnemyIds: ["mob_yamenRunner_07"], stressCap: 5 }),
  stage(13, "extreme", "第13关·三卫合围", "mob_court_02", 2.1, 5, 1.65, { extraEnemyIds: ["mob_court_03"], stressCap: 5 }),
  stage(14, "extreme", "第14关·夺名走卒", "mob_court_04", 2.15, 5, 1.7, { extraEnemyIds: ["mob_court_05"], stressCap: 5 }),
  stage(15, "extreme", "第15关·期末·殿前四卫", "mob_court_07", 2.35, 5, 1.75, {
    forceGrudge: true,
    stressCap: 6,
    extraEnemyIds: ["mob_court_08"],
  }),
];

/** 拆招短局 10 馆：少林。 */
const BREAK_SHAOLIN_LADDER: GauntletLadderEntry[] = [
  stage(1, "easy", "第1关·来锋位移·山门沙弥", "mob_monk_01", 1.0, 1, 0.9),
  stage(2, "easy", "第2关·让与破眼·巡寺棍僧", "mob_monk_02", 1.05, 1, 1.0),
  stage(3, "mid", "第3关·戒刀僧", "mob_monk_03", 1.15, 2, 1.05),
  stage(4, "mid", "第4关·同道·拳僧", "mob_monk_04", 1.25, 2, 1.15),
  stage(5, "hard", "第5关·护寺武僧", "mob_monk_05", 1.4, 3, 1.25, { stressCap: 4 }),
  stage(6, "hard", "第6关·罗汉堂前", "mob_monk_06", 1.55, 3, 1.35, { stressCap: 4 }),
  stage(7, "extreme", "第7关·期中·罗汉", "mob_monk_08", 1.9, 4, 1.5, { forceGrudge: true, stressCap: 5 }),
  stage(8, "hard", "第8关·棍阵双僧", "mob_monk_10", 1.65, 3, 1.4, { extraEnemyIds: ["mob_monk_11"] }),
  stage(9, "hard", "第9关·伏魔双杖", "mob_monk_12", 1.75, 4, 1.45, { extraEnemyIds: ["mob_monk_13"] }),
  stage(10, "extreme", "第10关·期末·方丈座前", "mob_monk_05", 2.2, 5, 1.7, {
    forceGrudge: true,
    stressCap: 6,
    extraEnemyIds: ["mob_monk_06"],
  }),
];

/** 拆招短局 10 馆：土匪。 */
const BREAK_BANDIT_LADDER: GauntletLadderEntry[] = [
  stage(1, "easy", "第1关·来锋位移·剪径", "mob_road_01", 1.0, 1, 0.9),
  stage(2, "easy", "第2关·让与破眼·坡蹲", "mob_road_02", 1.05, 1, 1.0),
  stage(3, "mid", "第3关·蓄势路匪", "mob_road_05", 1.15, 2, 1.05),
  stage(4, "mid", "第4关·同道·伏草客", "mob_road_06", 1.25, 2, 1.15),
  stage(5, "hard", "第5关·截镖", "mob_escortBand_01", 1.4, 3, 1.25, { stressCap: 4 }),
  stage(6, "hard", "第6关·裂旗劫手", "mob_escortBand_02", 1.55, 3, 1.35, { stressCap: 4 }),
  stage(7, "extreme", "第7关·期中·同道再聚", "mob_escortBand_03", 1.9, 4, 1.5, { forceGrudge: true, stressCap: 5 }),
  stage(8, "hard", "第8关·岸匪双刀", "mob_escortBand_04", 1.65, 3, 1.4, { extraEnemyIds: ["mob_road_09"] }),
  stage(9, "hard", "第9关·水匪哨", "mob_escortBand_05", 1.75, 4, 1.45, { extraEnemyIds: ["mob_canal_01"] }),
  stage(10, "extreme", "第10关·期末·寨主堂", "mob_escortBand_02", 2.2, 5, 1.7, {
    forceGrudge: true,
    stressCap: 6,
    extraEnemyIds: ["mob_canal_03"],
  }),
];

/** 拆招短局 10 馆：朝廷。 */
const BREAK_COURT_LADDER: GauntletLadderEntry[] = [
  stage(1, "easy", "第1关·来锋位移·皂隶", "mob_yamenRunner_01", 1.0, 1, 0.9),
  stage(2, "easy", "第2关·让与破眼·快班", "mob_yamenRunner_02", 1.05, 1, 1.0),
  stage(3, "mid", "第3关·捕快副", "mob_yamenRunner_03", 1.15, 2, 1.05),
  stage(4, "mid", "第4关·同道·锁链手", "mob_yamenRunner_04", 1.25, 2, 1.15),
  stage(5, "hard", "第5关·内侍刀", "mob_court_02", 1.4, 3, 1.25, { stressCap: 4 }),
  stage(6, "hard", "第6关·影卫", "mob_court_03", 1.55, 3, 1.35, { stressCap: 4 }),
  stage(7, "extreme", "第7关·期中·锦衣", "mob_court_04", 1.9, 4, 1.5, { forceGrudge: true, stressCap: 5 }),
  stage(8, "hard", "第8关·门下暗", "mob_court_06", 1.65, 3, 1.4, { extraEnemyIds: ["mob_yamenRunner_05"] }),
  stage(9, "hard", "第9关·案卷刺客", "mob_court_07", 1.75, 4, 1.45, { extraEnemyIds: ["mob_court_08"] }),
  stage(10, "extreme", "第10关·期末·殿前", "mob_court_07", 2.2, 5, 1.7, {
    forceGrudge: true,
    stressCap: 6,
    extraEnemyIds: ["mob_court_08"],
  }),
];

export const GAUNTLET_PATH_LADDERS: Record<GauntletPath, GauntletLadderEntry[]> = {
  shaolin: SHAOLIN_LADDER,
  bandit: BANDIT_LADDER,
  court: COURT_LADDER,
};

export const BREAK_PATH_LADDERS: Record<GauntletPath, GauntletLadderEntry[]> = {
  shaolin: BREAK_SHAOLIN_LADDER,
  bandit: BREAK_BANDIT_LADDER,
  court: BREAK_COURT_LADDER,
};

/** 各线同道池（高阶奖励：第 4 / 7 / 12 关后三选一）。 */
export const PATH_COMPANION_POOL: Record<GauntletPath, CompanionId[]> = {
  shaolin: ["pilgrim", "hermit", "porter", "guard"],
  bandit: ["watch", "hooker", "blade", "salter"],
  court: ["scribe", "guard", "bard", "weaver"],
};

export function pathLadder(path: GauntletPath): GauntletLadderEntry[] {
  return isBreakAlign() ? BREAK_PATH_LADDERS[path] : GAUNTLET_PATH_LADDERS[path];
}

export function isCompanionMilestone(stageCompleted: number): boolean {
  return companionMilestones().includes(stageCompleted);
}
