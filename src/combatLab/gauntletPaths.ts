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
  shaolin: "从山门走进罗汉院。棍、拳、阵一层紧一层。钟响过一次，门还开着。馆间有斋堂、寺径、夹道，终馆是方丈的规矩：人海、座前、私了，开打前再选一次。",
  bandit: "剪径、劫镖、漕帮。刀钩枪混在野路上。下一馆从不报上号，歇脚处认刀伤。客栈、荒路、剪径的后果不一样：彩金、替补、人名、黑市，踩哪条改哪条。",
  court: "差役、影卫、殿前。快刀藏在规矩里。官道上看不见的那一刀，才是这一馆。驿站、官道、黑巷改赏格和围场，终馆三条走法赏格不同。",
};

export const GAUNTLET_ENDLESS_BLURB: Record<GauntletPath, string> = {
  shaolin: "棍塔。楼层涨的是血与段数，没有禅院歇脚，也没有斋堂问路。",
  bandit: "刀塔。一层一馆往上打，没有城与岔路，也没有客栈挡债。",
  court: "衙塔。比的是谁站得更久，没有天街剧情，也没有驿站买口供。",
};

export const COMPANION_MILESTONES = [4, 7] as const;
export const GAUNTLET_MIDTERM_STAGE = 7;
export const GAUNTLET_FINAL_STAGE = 10;

/** 行路长度默认 10；剧情可选短 9 / 长 12。接口保留 run.routeLength，便于后续分线选择。 */
export function getGauntletFinalStage(run?: { routeLength?: number }): number {
  return run?.routeLength ?? GAUNTLET_FINAL_STAGE;
}

export function companionMilestones(): readonly number[] {
  return COMPANION_MILESTONES;
}

/** 1–8 程最多 2 名同伴；9 程起可第 3 名同伴（仍可第 4 人仅替补/光环位）。 */
export function maxCompanions(stage = 1): number {
  return stage >= 9 ? 3 : 2;
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

/** 行路 10 程：少林。3 后双人轮番，8–9 三人，10 四人。馆名只写地点/对手，不教破招。 */
const SHAOLIN_LADDER: GauntletLadderEntry[] = [
  stage(1, "easy", "第1程·山门沙弥", "mob_monk_01", 1.7, 1, 1.18, { stressCap: 0 }),
  stage(2, "easy", "第2程·巡寺棍僧", "mob_monk_02", 2.0, 2, 1.32, { stressCap: 0 }),
  stage(3, "mid", "第3程·戒刀僧", "mob_monk_03", 2.4, 2, 1.5),
  stage(4, "mid", "第4程·拳僧", "mob_monk_04", 2.55, 2, 1.7, { extraEnemyIds: ["mob_monk_07"] }),
  stage(5, "hard", "第5程·护寺武僧", "mob_monk_05", 2.9, 3, 1.9, { stressCap: 4, extraEnemyIds: ["mob_monk_09"] }),
  stage(6, "hard", "第6程·罗汉堂前", "mob_monk_06", 3.25, 3, 2.1, { stressCap: 4, extraEnemyIds: ["mob_monk_11"] }),
  stage(7, "extreme", "第7程·期中·罗汉", "mob_monk_08", 3.65, 4, 2.4, { forceGrudge: true, stressCap: 5, extraEnemyIds: ["mob_monk_13"] }),
  stage(8, "hard", "第8程·棍阵三僧", "mob_monk_10", 3.4, 3, 2.2, { extraEnemyIds: ["mob_monk_11", "mob_monk_07"] }),
  stage(9, "hard", "第9程·伏魔三杖", "mob_monk_12", 3.7, 4, 2.4, { extraEnemyIds: ["mob_monk_13", "mob_monk_15"] }),
  stage(10, "extreme", "第10程·期末·方丈座前", "mob_monk_05", 4.2, 5, 2.6, {
    forceGrudge: true,
    stressCap: 6,
    extraEnemyIds: ["mob_monk_06", "mob_monk_08", "mob_monk_09"],
  }),
];

/** 行路 10 程：江湖。 */
const BANDIT_LADDER: GauntletLadderEntry[] = [
  stage(1, "easy", "第1程·剪径", "mob_road_01", 1.7, 1, 1.18, { stressCap: 0 }),
  stage(2, "easy", "第2程·坡蹲", "mob_road_02", 2.0, 2, 1.32, { stressCap: 0 }),
  stage(3, "mid", "第3程·路匪", "mob_road_05", 2.4, 2, 1.5),
  stage(4, "mid", "第4程·伏草客", "mob_road_06", 2.55, 2, 1.7, { extraEnemyIds: ["mob_road_08"] }),
  stage(5, "hard", "第5程·截镖", "mob_escortBand_01", 2.9, 3, 1.9, { stressCap: 4, extraEnemyIds: ["mob_road_09"] }),
  stage(6, "hard", "第6程·裂旗劫手", "mob_escortBand_02", 3.25, 3, 2.1, { stressCap: 4, extraEnemyIds: ["mob_canal_01"] }),
  stage(7, "extreme", "第7程·期中·寨口", "mob_escortBand_03", 3.65, 4, 2.4, { forceGrudge: true, stressCap: 5, extraEnemyIds: ["mob_road_10"] }),
  stage(8, "hard", "第8程·岸匪三刀", "mob_escortBand_04", 3.4, 3, 2.2, { extraEnemyIds: ["mob_road_09", "mob_canal_02"] }),
  stage(9, "hard", "第9程·水匪哨", "mob_escortBand_05", 3.7, 4, 2.4, { extraEnemyIds: ["mob_canal_01", "mob_canal_05"] }),
  stage(10, "extreme", "第10程·期末·寨主堂", "mob_escortBand_02", 4.2, 5, 2.6, {
    forceGrudge: true,
    stressCap: 6,
    extraEnemyIds: ["mob_canal_03", "mob_canal_04", "mob_canal_02"],
  }),
];

/** 行路 10 程：朝廷。 */
const COURT_LADDER: GauntletLadderEntry[] = [
  stage(1, "easy", "第1程·皂隶", "mob_yamenRunner_01", 1.7, 1, 1.18, { stressCap: 0 }),
  stage(2, "easy", "第2程·快班", "mob_yamenRunner_02", 2.0, 2, 1.32, { stressCap: 0 }),
  stage(3, "mid", "第3程·捕快副", "mob_yamenRunner_03", 2.4, 2, 1.5),
  stage(4, "mid", "第4程·锁链手", "mob_yamenRunner_04", 2.55, 2, 1.7, { extraEnemyIds: ["mob_court_05"] }),
  stage(5, "hard", "第5程·内侍刀", "mob_court_02", 2.9, 3, 1.9, { stressCap: 4, extraEnemyIds: ["mob_yamenRunner_05"] }),
  stage(6, "hard", "第6程·影卫", "mob_court_03", 3.25, 3, 2.1, { stressCap: 4, extraEnemyIds: ["mob_court_08"] }),
  stage(7, "extreme", "第7程·期中·锦衣", "mob_court_04", 3.65, 4, 2.4, { forceGrudge: true, stressCap: 5, extraEnemyIds: ["mob_court_11"] }),
  stage(8, "hard", "第8程·门下暗", "mob_court_06", 3.4, 3, 2.2, { extraEnemyIds: ["mob_yamenRunner_05", "mob_court_09"] }),
  stage(9, "hard", "第9程·案卷刺客", "mob_court_07", 3.7, 4, 2.4, { extraEnemyIds: ["mob_court_08", "mob_court_11"] }),
  stage(10, "extreme", "第10程·期末·殿前", "mob_court_07", 4.2, 5, 2.6, {
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

/** 各线同道池（高阶奖励：程 4 / 7 里程碑四选一）。 */
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
