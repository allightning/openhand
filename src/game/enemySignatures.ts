import type { Intent, WeaknessDef } from "./types";

export type EnemySigId =
  | "luohan-array"
  | "vajra-ward"
  | "flower-seal"
  | "snare"
  | "oil"
  | "chaos-cut"
  | "jinyi-lock"
  | "court-cane"
  | "death-grant"
  | "staff-circle"
  | "night-veil"
  | "grant-kill";

export interface SignatureBreak {
  id: EnemySigId;
  label: string;
  tip: string;
  weakness: WeaknessDef;
  lootPath: "space" | "antiGuard" | "plant" | "chase" | "hit";
  intent: Intent;
}

export const SIGNATURE_BREAK: Record<EnemySigId, SignatureBreak> = {
  "luohan-array": {
    id: "luohan-array",
    label: "罗汉桩阵",
    tip: "一次两桩。打出点地/裂桩拆它。",
    weakness: { kind: "plantStakePlayed" },
    lootPath: "plant",
    intent: { kind: "sig", id: "luohan-array" },
  },
  "vajra-ward": {
    id: "vajra-ward",
    label: "金刚罩",
    tip: "高挡+反震。打破绽/刺/点穴/开缝拆它。",
    weakness: { kind: "antiGuardPlayed" },
    lootPath: "antiGuard",
    intent: { kind: "sig", id: "vajra-ward" },
  },
  "flower-seal": {
    id: "flower-seal",
    label: "拈花",
    tip: "封你抽牌 1 息。本回合命中他拆它。",
    weakness: { kind: "hitFoeThisTurn" },
    lootPath: "hit",
    intent: { kind: "sig", id: "flower-seal" },
  },
  snare: {
    id: "snare",
    label: "绊索",
    tip: "滞步。贴身攻击命中拆它。",
    weakness: { kind: "adjacentAttackHit" },
    lootPath: "space",
    intent: { kind: "sig", id: "snare" },
  },
  oil: {
    id: "oil",
    label: "火油",
    tip: "脚下持续伤。收势脚下无机关拆它。",
    weakness: { kind: "trapAvoided" },
    lootPath: "space",
    intent: { kind: "sig", id: "oil" },
  },
  "chaos-cut": {
    id: "chaos-cut",
    label: "乱刀",
    tip: "三连刀口。格挡吃满拆它。",
    weakness: { kind: "bleedcutFullyBlocked" },
    lootPath: "antiGuard",
    intent: { kind: "sig", id: "chaos-cut", damage: 6 },
  },
  "jinyi-lock": {
    id: "jinyi-lock",
    label: "锦衣锁喉",
    tip: "贴脸封技。收势不贴身拆它。",
    weakness: { kind: "endNotAdjacent" },
    lootPath: "space",
    intent: { kind: "sig", id: "jinyi-lock" },
  },
  "court-cane": {
    id: "court-cane",
    label: "廷杖",
    tip: "蓄势后真伤。本回合命中他拆它。",
    weakness: { kind: "hitFoeThisTurn" },
    lootPath: "hit",
    intent: { kind: "sig", id: "court-cane", damage: 16 },
  },
  "death-grant": {
    id: "death-grant",
    label: "赐死",
    tip: "封脉叠满则真伤。留劲 ≥3 拆它。",
    weakness: { kind: "endEnergyGte3", param: 3 },
    lootPath: "hit",
    intent: { kind: "sig", id: "death-grant", damage: 14 },
  },
  "staff-circle": {
    id: "staff-circle",
    label: "罗汉圈",
    tip: "落桩同时威胁邻格。打出落桩牌拆它。",
    weakness: { kind: "plantStakePlayed" },
    lootPath: "plant",
    intent: { kind: "sig", id: "staff-circle" },
  },
  "night-veil": {
    id: "night-veil",
    label: "夜幕",
    tip: "刀口改为费 +2。格挡吃满拆它。",
    weakness: { kind: "bleedcutFullyBlocked" },
    lootPath: "antiGuard",
    intent: { kind: "sig", id: "night-veil", damage: 8 },
  },
  "grant-kill": {
    id: "grant-kill",
    label: "赐死剑",
    tip: "封脉 ≥2 下一段真伤。留劲 ≥3 拆它。",
    weakness: { kind: "endEnergyGte3", param: 3 },
    lootPath: "hit",
    intent: { kind: "sig", id: "grant-kill", damage: 18 },
  },
};

export const ALL_SIGNATURE_IDS = Object.keys(SIGNATURE_BREAK) as EnemySigId[];
