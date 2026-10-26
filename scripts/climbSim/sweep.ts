import type { ClimbKnobs } from "./knobs";
import { DEFAULT_KNOBS } from "./knobs";
import { runSpot, type SpotRow } from "./spot";
import { SWEEP_GAMES } from "./tiers";

export type SweepCell = {
  knobs: ClimbKnobs;
  rows: SpotRow[];
};

const GRID = [0.85, 1, 1.15];

export function sweepGrid(): ClimbKnobs[] {
  const out: ClimbKnobs[] = [];
  for (const enemyHp of GRID) {
    for (const enemyDmg of GRID) {
      out.push({ ...DEFAULT_KNOBS, enemyHp, enemyDmg });
    }
  }
  return out;
}

/** 只扫有结算口的敌血 / 敌伤。汇率保持 1，不改牌面。 */
export function runSweep(): SweepCell[] {
  return sweepGrid().map((knobs) => ({
    knobs,
    rows: runSpot(knobs, SWEEP_GAMES, false).baseline,
  }));
}
