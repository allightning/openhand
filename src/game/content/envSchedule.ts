import type { EnvTag } from "../types";

/**
 * 环境词条投放表（2026-11-15）：灼烧馆 3/6/8，无墙馆 5/9，缺格·末端馆 4/7。
 * gap_end 结算已接（MECH8，gapFieldFor 跟墙同侧缺末端一格）。gap_mid 结算认，本表不投。
 * 缺格不与灼烧同馆（中格会叠），不投无墙馆（墙位语义绕）。馆 1/2 教学期与馆 10 座前不投。
 * 生产壳经 envTagForHall 读表写 run.envTag；灼烧 tickBurnCells、无墙 board.ts、缺格 gapFieldFor。
 */
export const CLIMB_ENV_SCHEDULE: Readonly<Record<number, EnvTag>> = {
  3: "burn",
  4: "gap_end",
  5: "nowall",
  6: "burn",
  7: "gap_end",
  8: "burn",
  9: "nowall",
};

export function envTagForHall(stage: number): EnvTag | undefined {
  return CLIMB_ENV_SCHEDULE[stage];
}
