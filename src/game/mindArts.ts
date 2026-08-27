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
    text: "气血上限 +10。",
    hpMax: 10,
  },
  springQi: {
    id: "springQi",
    name: "回春心法",
    text: "每回合收势回血 +4。",
    turnHeal: 4,
  },
  calmSea: {
    id: "calmSea",
    name: "抱元心法",
    text: "劲力上限 +1，每回合多回劲 +1。",
    energyMax: 1,
    turnEnergy: 1,
  },
  steadyRoot: {
    id: "steadyRoot",
    name: "扎根心法",
    text: "气血上限 +6，每回合回血 +2。",
    hpMax: 6,
    turnHeal: 2,
  },
  palmMeridian: {
    id: "palmMeridian",
    name: "推宫心法",
    text: "拳掌系：气血 +8，收势回血 +2。",
    school: "palm",
    hpMax: 8,
    turnHeal: 2,
  },
  saberEdge: {
    id: "saberEdge",
    name: "快刀心法",
    text: "刀系：劲力上限 +1，每回合多回劲 +1。",
    school: "saber",
    energyMax: 1,
    turnEnergy: 1,
  },
  swordMirror: {
    id: "swordMirror",
    name: "镜亭心法",
    text: "剑系：气血 +6，劲力上限 +1。",
    school: "sword",
    hpMax: 6,
    energyMax: 1,
  },
  spearStride: {
    id: "spearStride",
    name: "锁步心法",
    text: "枪系：气血 +8，每回合回血 +3。",
    school: "spear",
    hpMax: 8,
    turnHeal: 3,
  },
  staffRoot: {
    id: "staffRoot",
    name: "定桩心法",
    text: "棍系：气血 +12。",
    school: "staff",
    hpMax: 12,
  },
  hookTide: {
    id: "hookTide",
    name: "钩潮心法",
    text: "钩系：劲力上限 +1，收势回血 +3。",
    school: "hook",
    energyMax: 1,
    turnHeal: 3,
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
