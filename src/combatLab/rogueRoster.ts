/**
 * 拆招开踢 18 人花名册 · 见 docs/combat/ROGUE_GRADIENT.md
 * 一档 6 主角 / 二档 3 馆 / 三档 7 馆。单系，无双武器。
 */
import type { CompanionId, WeaponId } from "../game/types";
import type { MateRole } from "../game/labV25Constants";

export type RogueRosterTier = 1 | 2 | 3;

export interface RogueMateDef {
  id: CompanionId;
  name: string;
  title: string;
  weapon: WeaponId;
  role: MateRole;
  tier: RogueRosterTier;
  hp: number;
  energyMax: number;
  paceBonus: number;
  skillName: string;
  skillText: string;
  bio: string;
}

/** 一档开局主角：选系 = 选人。刀保留沈夜行。 */
export const ROGUE_LEAD_BY_SCHOOL: Record<WeaponId, CompanionId> = {
  saber: "watch",
  palm: "baimenghe",
  sword: "wenrensheng",
  spear: "huochangchuan",
  staff: "shiwanshan",
  hook: "moqiwan",
};

export const ROGUE_ROSTER: RogueMateDef[] = [
  // —— 一档 ——
  {
    id: "watch",
    name: "沈夜行",
    title: "夜巡刀",
    weapon: "saber",
    role: "dps",
    tier: 1,
    hp: 42,
    energyMax: 5,
    paceBonus: 0,
    skillName: "贴刃",
    skillText: "贴身攻击 +2。",
    bio: "夜里刀短，袖里却长。",
  },
  {
    id: "baimenghe",
    name: "白孟和",
    title: "掌门医",
    weapon: "palm",
    role: "support",
    tier: 1,
    hp: 42,
    energyMax: 5,
    paceBonus: 0,
    skillName: "温掌",
    skillText: "本回未出攻击，收势全队回 4 血。",
    bio: "拳先救人，再救人局。",
  },
  {
    id: "wenrensheng",
    name: "闻人笙",
    title: "听锋客",
    weapon: "sword",
    role: "dps",
    tier: 1,
    hp: 42,
    energyMax: 5,
    paceBonus: 0,
    skillName: "起势",
    skillText: "开战获得 1 连势。",
    bio: "剑未出，势已起。",
  },
  {
    id: "huochangchuan",
    name: "霍长川",
    title: "长枪客",
    weapon: "spear",
    role: "dps",
    tier: 1,
    hp: 42,
    energyMax: 5,
    paceBonus: 0,
    skillName: "远照",
    skillText: "敌在 3 格或更远时攻击 +2。",
    bio: "枪要空，才伸得直。",
  },
  {
    id: "shiwanshan",
    name: "石万山",
    title: "定桩人",
    weapon: "staff",
    role: "tank",
    tier: 1,
    hp: 42,
    energyMax: 5,
    paceBonus: 0,
    skillName: "钉地",
    skillText: "开战落 1 桩；有桩时减伤 1。",
    bio: "先占步，再认人。",
  },
  {
    id: "moqiwan",
    name: "万俟晚",
    title: "钩夜",
    weapon: "hook",
    role: "control",
    tier: 1,
    hp: 42,
    energyMax: 5,
    paceBonus: 0,
    skillName: "吸血丝",
    skillText: "拉近后，下一次攻击吸血 +2。",
    bio: "钩不抢路，只收线头。",
  },
  // —— 二档（3 馆）——
  {
    id: "lvchifeng",
    name: "吕赤锋",
    title: "赤剪",
    weapon: "saber",
    role: "dps",
    tier: 2,
    hp: 52,
    energyMax: 6,
    paceBonus: 1,
    skillName: "见血",
    skillText: "贴身攻击叠 1 层裂创。",
    bio: "拆完才下刀。",
  },
  {
    id: "zhounuanxiang",
    name: "周暖香",
    title: "暖粥",
    weapon: "palm",
    role: "support",
    tier: 2,
    hp: 52,
    energyMax: 6,
    paceBonus: 1,
    skillName: "温补",
    skillText: "收势时若仍有格挡，额外回 6 血。",
    bio: "挡得住，才养得活。",
  },
  {
    id: "boqing",
    name: "薄青",
    title: "半锋",
    weapon: "sword",
    role: "dps",
    tier: 2,
    hp: 52,
    energyMax: 6,
    paceBonus: 1,
    skillName: "裂甲",
    skillText: "攻击先撕掉敌 3 点格挡。",
    bio: "一剑只求破半寸。",
  },
  {
    id: "ananhuo",
    name: "安岸火",
    title: "岸枪",
    weapon: "spear",
    role: "dps",
    tier: 2,
    hp: 52,
    energyMax: 6,
    paceBonus: 1,
    skillName: "离尺",
    skillText: "与敌相隔至少 2 格时攻击 +2。",
    bio: "走开一步，枪长一寸。",
  },
  {
    id: "zhangshoushan",
    name: "章守山",
    title: "闸门",
    weapon: "staff",
    role: "tank",
    tier: 2,
    hp: 52,
    energyMax: 6,
    paceBonus: 1,
    skillName: "桩甲",
    skillText: "场上有桩时，受伤少 2 点。",
    bio: "拆完才站得稳。",
  },
  {
    id: "chenchenlan",
    name: "陈沉缆",
    title: "沉钩",
    weapon: "hook",
    role: "control",
    tier: 2,
    hp: 52,
    energyMax: 6,
    paceBonus: 1,
    skillName: "缴手",
    skillText: "拉近成功：敌短缴械 1 回合。",
    bio: "挡着卸，卸完再钩。",
  },
  // —— 三档（7 馆）——
  {
    id: "lishuangxing",
    name: "厉霜行",
    title: "沥血",
    weapon: "saber",
    role: "dps",
    tier: 3,
    hp: 64,
    energyMax: 7,
    paceBonus: 2,
    skillName: "霜叠",
    skillText: "本系刀攻击再叠 1 层裂创。",
    bio: "拆势喂刀，刀喂血。",
  },
  {
    id: "fubishan",
    name: "傅壁山",
    title: "扶壁",
    weapon: "palm",
    role: "support",
    tier: 3,
    hp: 64,
    energyMax: 7,
    paceBonus: 2,
    skillName: "震岳奶",
    skillText: "击退撞壁时全队回 6 血。",
    bio: "推人撞壁，壁养一队。",
  },
  {
    id: "duguposui",
    name: "独孤破岁",
    title: "独岁",
    weapon: "sword",
    role: "dps",
    tier: 3,
    hp: 64,
    energyMax: 7,
    paceBonus: 2,
    skillName: "岁破",
    skillText: "连势上限 +2；打出本系防御刷新 1 层破绽。",
    bio: "让势不散，破绽常新。",
  },
  {
    id: "gongsunsizhang",
    name: "公孙四丈",
    title: "四丈",
    weapon: "spear",
    role: "dps",
    tier: 3,
    hp: 64,
    energyMax: 7,
    paceBonus: 2,
    skillName: "加尺刺",
    skillText: "枪攻按再远 1 格的距离结算。",
    bio: "拆完再远一格。",
  },
  {
    id: "fengtang",
    name: "封堂",
    title: "封棍",
    weapon: "staff",
    role: "control",
    tier: 3,
    hp: 64,
    energyMax: 7,
    paceBonus: 2,
    skillName: "封段",
    skillText: "敌已缴械或眩晕时，再延长 1 息。",
    bio: "控场比伤重。",
  },
  {
    id: "ouyangyingou",
    name: "欧阳饮钩",
    title: "饮锋",
    weapon: "hook",
    role: "control",
    tier: 3,
    hp: 64,
    energyMax: 7,
    paceBonus: 2,
    skillName: "饮血",
    skillText: "敌缴械期间，你的攻击吸血 2。",
    bio: "卸了兵，再喝血。",
  },
];

export function rogueMate(id: CompanionId): RogueMateDef | undefined {
  return ROGUE_ROSTER.find((m) => m.id === id);
}

export function rogueRosterByTier(tier: RogueRosterTier): RogueMateDef[] {
  return ROGUE_ROSTER.filter((m) => m.tier === tier);
}

export function rogueLeadId(school: WeaponId): CompanionId {
  return ROGUE_LEAD_BY_SCHOOL[school];
}

/** 3 馆 → 二档；7 馆 → 三档。 */
export function rogueCompanionTierForStage(stageCompleted: number): RogueRosterTier | null {
  if (stageCompleted === 3) return 2;
  if (stageCompleted === 7) return 3;
  return null;
}

/**
 * 六人池抽 4，再由 UI 做 4 选 1。
 * 排除已在队（含主角）；不足 4 则有多少给多少。
 */
export function rollRogueCompanionChoices(
  tier: RogueRosterTier,
  taken: ReadonlySet<CompanionId>,
  rng: () => number = Math.random,
  picks = 4,
): CompanionId[] {
  const pool = rogueRosterByTier(tier)
    .map((m) => m.id)
    .filter((id) => !taken.has(id));
  const out: CompanionId[] = [];
  const rest = [...pool];
  while (out.length < picks && rest.length) {
    const idx = Math.floor(rng() * rest.length);
    out.push(rest.splice(idx, 1)[0]!);
  }
  return out;
}

/** 流血层 n → 每回合跳伤 2n−1（1→1，2→3，3→5）。 */
export function bleedTickDamage(stacks: number): number {
  if (stacks <= 0) return 0;
  return 2 * stacks - 1;
}

/** 枪攻距离闸：禁 1 格；2–4 可打。返回可打时的伤档基数（未计标尺/拆势）。 */
export function spearReachDamage(dist: number): number | null {
  if (dist <= 1) return null;
  if (dist === 2) return 3;
  if (dist === 3) return 5;
  if (dist >= 4) return 8;
  return null;
}

/** 刀主攻距离闸：贴脸较高；距 2 中低档。流血另算。 */
export function saberReachDamage(id: string, dist: number): number | null {
  if (id !== "cut" && id !== "drawcut" && id !== "saberBleed") return null;
  const melee = dist <= 1;
  if (id === "cut") return melee ? 10 : 4;
  if (id === "drawcut") return melee ? 8 : 4;
  return melee ? 7 : 4;
}

export function handRefillAmount(cap: number): number {
  return Math.ceil(Math.max(0, cap) / 2);
}

export const HAND_CAP_HARD_MAX = 10;
export const HAND_CAP_DEFAULT = 5;

export function clampHandCap(raw: number): number {
  return Math.max(2, Math.min(HAND_CAP_HARD_MAX, raw));
}

/** 拆招馆阶轮番人数：1–3 单人，4–7 双人，8–9 三人，10 四人（仍 1 上场）。 */
export function breakWaveExtraCount(stage: number): number {
  if (stage <= 3) return 0;
  if (stage <= 7) return 1;
  if (stage <= 9) return 2;
  return 3;
}

export { breakStarterDeck, injectRogueBondCards, rogueBondCards } from "../game/rogueCards";
