import type { WeaponId } from "../../src/game/types";

export const SIM_SEED = 20261023;
export const SPOT_GAMES = 10;
export const CAMPAIGN_RUNS = 3;
export const SWEEP_GAMES = 3;
export const HANDS_CAP = 40;
export const SIM_PATH = "bandit" as const;
export const EMPTY_LIMIT = 0.05;
export const HAND_WARN = 0.3;
export const WIN_ANCHOR = "33%锚";

export const SPOT_STAGES = [
  { stage: 1, label: "杂兵", handsBand: "4-5" },
  { stage: 5, label: "精英", handsBand: "5-6" },
  { stage: 10, label: "座前", handsBand: "7-9" },
] as const;

export const SCHOOLS: WeaponId[] = ["palm", "saber", "sword", "spear", "staff", "hook"];
export const NIGHT2_SCHOOLS: WeaponId[] = ["palm", "saber", "sword", "spear", "staff", "hook", "dart"];

export function fightSeed(stage: number, index: number, salt = 0): number {
  return SIM_SEED + salt * 100000 + stage * 1000 + index;
}

export function bandDeviation(hands: number, band: string): number {
  const [lo, hi] = band.split("-").map(Number);
  if (hands < lo) return (lo - hands) / lo;
  if (hands > hi) return (hands - hi) / hi;
  return 0;
}

export function handsBandForStage(stage: number): string {
  if (stage <= 2) return "4-5";
  if (stage <= 7) return "5-6";
  return "7-9";
}
