import { CLIMB_PIERCE_BLOCK_MIND, CLIMB_WINDOW_CAP_BONUS } from "./climbCaps";
import type { WeaponId } from "./types";

export type MindArtId =
  | "ironBreath"
  | "springQi"
  | "calmSea"
  | "steadyRoot"
  | "palmMeridian"
  | "saberEdge"
  | "swordMirror"
  | "spearStride"
  | "staffRoot"
  | "hookTide"
  // 破挡 / 反应窗流（2026-11-14 拍定，通用件）
  | "pojia"
  | "mingjing";

export interface MindArtDef {
  id: MindArtId;
  name: string;
  text: string;
  /** 通用或系别亲和 */
  school?: WeaponId;
  hpMax?: number;
  energyMax?: number;
  turnHeal?: number;
  turnEnergy?: number;
  /** 攻击穿挡（破甲）。天花板 2，锚 = 剑破绽穿 4。 */
  pierceBlock?: number;
  /** 每场反应窗帽 +N（明镜）。 */
  windowCap?: number;
}

export const MIND_ARTS: Record<MindArtId, MindArtDef> = {
  ironBreath: {
    id: "ironBreath",
    name: "铁骨心法",
    text: "气血上限 +30。",
    hpMax: 30,
  },
  springQi: {
    id: "springQi",
    name: "回春心法",
    text: "每回合收势回血 +8。",
    turnHeal: 8,
  },
  calmSea: {
    id: "calmSea",
    name: "抱元心法",
    text: "劲力上限 +4，每回合多回劲 +2。",
    energyMax: 4,
    turnEnergy: 2,
  },
  steadyRoot: {
    id: "steadyRoot",
    name: "扎根心法",
    text: "气血上限 +20，每回合回血 +4。",
    hpMax: 20,
    turnHeal: 4,
  },
  palmMeridian: {
    id: "palmMeridian",
    name: "推宫心法",
    text: "拳掌系：气血 +25，收势回血 +5。",
    school: "palm",
    hpMax: 25,
    turnHeal: 5,
  },
  saberEdge: {
    id: "saberEdge",
    name: "快刀心法",
    text: "刀系：劲力上限 +4，每回合多回劲 +2。",
    school: "saber",
    energyMax: 4,
    turnEnergy: 2,
  },
  swordMirror: {
    id: "swordMirror",
    name: "镜亭心法",
    text: "剑系：气血 +20，劲力上限 +4。",
    school: "sword",
    hpMax: 20,
    energyMax: 4,
  },
  spearStride: {
    id: "spearStride",
    name: "锁步心法",
    text: "枪系：气血 +25，每回合回血 +6。",
    school: "spear",
    hpMax: 25,
    turnHeal: 6,
  },
  staffRoot: {
    id: "staffRoot",
    name: "定桩心法",
    text: "棍系：气血 +35。",
    school: "staff",
    hpMax: 35,
  },
  hookTide: {
    id: "hookTide",
    name: "钩潮心法",
    text: "钩系：劲力上限 +4，收势回血 +6。",
    school: "hook",
    energyMax: 4,
    turnHeal: 6,
  },
  pojia: {
    id: "pojia",
    name: "破甲心法",
    text: `你的攻击穿 ${CLIMB_PIERCE_BLOCK_MIND} 点格挡。`,
    pierceBlock: CLIMB_PIERCE_BLOCK_MIND,
  },
  mingjing: {
    id: "mingjing",
    name: "明镜心法",
    text: `每场你的反应窗多 ${CLIMB_WINDOW_CAP_BONUS} 次。`,
    windowCap: CLIMB_WINDOW_CAP_BONUS,
  },
};

export const ALL_MIND_ART_IDS = Object.keys(MIND_ARTS) as MindArtId[];

export function mindArtById(id: MindArtId): MindArtDef {
  return MIND_ARTS[id];
}

export function mindArtFitsSchool(id: MindArtId, school: WeaponId): boolean {
  const s = MIND_ARTS[id].school;
  return !s || s === school;
}

export interface MindArtBonuses {
  hpMax: number;
  energyMax: number;
  turnHeal: number;
  turnEnergy: number;
  pierceBlock: number;
  windowCap: number;
}

export function sumMindArtBonuses(ids: MindArtId[]): MindArtBonuses {
  const out: MindArtBonuses = { hpMax: 0, energyMax: 0, turnHeal: 0, turnEnergy: 0, pierceBlock: 0, windowCap: 0 };
  for (const id of ids) {
    const d = MIND_ARTS[id];
    out.hpMax += d.hpMax ?? 0;
    out.energyMax += d.energyMax ?? 0;
    out.turnHeal += d.turnHeal ?? 0;
    out.turnEnergy += d.turnEnergy ?? 0;
    out.pierceBlock += d.pierceBlock ?? 0;
    out.windowCap += d.windowCap ?? 0;
  }
  return out;
}
