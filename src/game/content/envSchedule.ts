import type { EnvTag } from "../types";

/**
 * 环境词条投放表（2026-11-14 用户拍定）：灼烧馆 3/6/8，无墙馆 5/9。
 * 缺格不投：结算未接（rules/envTags.ts 的 gapFieldFor 返空），投放空标签等于骗玩家。
 * 生产壳经 envTagForHall 读表写 run.envTag；灼烧结算 tickBurnCells、无墙 board.ts。
 */
export const CLIMB_ENV_SCHEDULE: Readonly<Record<number, EnvTag>> = {
  3: "burn",
  5: "nowall",
  6: "burn",
  8: "burn",
  9: "nowall",
};

export function envTagForHall(stage: number): EnvTag | undefined {
  return CLIMB_ENV_SCHEDULE[stage];
}
