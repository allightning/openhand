import type { CompanionId } from "../game/types";
import { rogueMate } from "./rogueRoster";
import type { MateRole } from "../game/labV25Constants";

/** 爬塔角色气血/劲力（读招不读此表）。方案 C：每人一条蓝，回劲当工资。 */
export interface ClimbVitals {
  hp: number;
  energyMax: number;
  energyStart: number;
  energyRegen: number;
}

function pack(tier: 1 | 2 | 3, role: MateRole): ClimbVitals {
  const hp = { dps: [50, 80, 130], tank: [55, 88, 145], support: [55, 88, 145], control: [45, 72, 115], skirmish: [50, 80, 130] }[role][tier - 1]!;
  const energyMax = { dps: [10, 12, 14], tank: [9, 11, 13], support: [10, 12, 14], control: [11, 13, 15], skirmish: [10, 12, 14] }[role][tier - 1]!;
  const energyStart = [6, 8, 10][tier - 1]!;
  const energyRegen = [4, 5, 6][tier - 1]!;
  return { hp, energyMax, energyStart, energyRegen };
}

const BY_ROLE: Record<1 | 2 | 3, Record<MateRole, ClimbVitals>> = {
  1: { dps: pack(1, "dps"), tank: pack(1, "tank"), support: pack(1, "support"), control: pack(1, "control"), skirmish: pack(1, "skirmish") },
  2: { dps: pack(2, "dps"), tank: pack(2, "tank"), support: pack(2, "support"), control: pack(2, "control"), skirmish: pack(2, "skirmish") },
  3: { dps: pack(3, "dps"), tank: pack(3, "tank"), support: pack(3, "support"), control: pack(3, "control"), skirmish: pack(3, "skirmish") },
};

const LEGACY_ROLE: Partial<Record<CompanionId, MateRole>> = {
  rail: "dps",
  seer: "control",
  sapper: "tank",
};

export function climbVitals(id: CompanionId): ClimbVitals {
  const r = rogueMate(id);
  if (r) return { ...BY_ROLE[r.tier][r.role] };
  const role = LEGACY_ROLE[id] ?? "dps";
  return { ...BY_ROLE[1][role] };
}

export function climbEnergyRegen(id: CompanionId): number {
  return climbVitals(id).energyRegen;
}

export function climbEnergyStart(id: CompanionId): number {
  return climbVitals(id).energyStart;
}

export function climbMateTier(id: CompanionId): 1 | 2 | 3 {
  return rogueMate(id)?.tier ?? 1;
}
