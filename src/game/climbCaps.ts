/** 爬塔试玩默认（Notion 待定页 2026-09-17）。改数字先改本文件。引擎层常量，产品壳经 `combatLab/climbCaps.ts` re-export。 */

export const CLIMB_BLOCK_CAP = 12;
export const CLIMB_BLEED_CAP = 6;
export const CLIMB_EXPOSE_CAP = 4;
export const CLIMB_SWORD_CHAIN_CAP = 6;
export const CLIMB_COMBO_CAP = 6;
export const CLIMB_ENDURE_CAP = 3;
export const CLIMB_STAKE_CAP = 2;
export const CLIMB_STUN_N = 1;
export const CLIMB_COMBO_REPLAY_COST = 2;
export const CLIMB_DUST_MIN_HALL = 6;
export const CLIMB_HALL_COUNT_DEFAULT = 10;
export const CLIMB_GUARD_WAGER = 10;
export const CLIMB_SPEAR_CUT_QI = 3;
export const CLIMB_LIFESTEAL_PCT = 0.3;
export const CLIMB_UNSEAT_PACE = 1;
export const CLIMB_POOL_COPIES = 3;
/** 我裂桩爆炸：双方各吃这么多伤。 */
export const CLIMB_STAKE_BLAST_DMG = 4;
/** 敌裂桩：你立刻拿到这么多格挡。 */
export const CLIMB_STAKE_BREAK_BLOCK = 4;

export function climbCycleCost(faceCost: number): number {
  return Math.max(0, faceCost - 1);
}

/** 馆阶加在图鉴底速上：前期常先手，后期枪棍更容易后手。 */
export function climbEnemyPaceBonus(stage: number): number {
  if (stage >= 9) return 2;
  if (stage >= 6) return 1;
  return 0;
}

export function climbDustAllowed(stage: number, elite: boolean): boolean {
  return stage >= CLIMB_DUST_MIN_HALL && elite;
}

/** 爬塔开战默认敌我间距（7 格盘）。前段更近，后期拉满。 */
export function climbOpeningDistance(stage: number, elite: boolean): number {
  if (elite || stage >= 8) return 5;
  if (stage >= 5) return 4;
  return 3;
}

/** 玩家在左、敌在右，间距 = dist。 */
export function climbOpeningPositions(dist: number): { playerPos: number; enemyPos: number } {
  const d = Math.max(1, Math.min(6, dist));
  const playerPos = Math.max(0, Math.floor((6 - d) / 2));
  return { playerPos, enemyPos: playerPos + d };
}
