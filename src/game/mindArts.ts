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
  | "hookTide";

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
}

export function sumMindArtBonuses(ids: MindArtId[]): MindArtBonuses {
  const out: MindArtBonuses = { hpMax: 0, energyMax: 0, turnHeal: 0, turnEnergy: 0 };
  for (const id of ids) {
    const d = MIND_ARTS[id];
    out.hpMax += d.hpMax ?? 0;
    out.energyMax += d.energyMax ?? 0;
    out.turnHeal += d.turnHeal ?? 0;
    out.turnEnergy += d.turnEnergy ?? 0;
  }
  return out;
}
