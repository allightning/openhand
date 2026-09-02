import { BOARD_SIZE, type Battle, type WeaponId } from "./types";
import type { EnemyGearGrade } from "./enemyGear";

/** 低阶桩挡 1 次攻击；高阶挡 2 次。棍立的永远是高阶。 */
export const STAKE_HITS_LOW = 1;
export const STAKE_HITS_HIGH = 2;

export function stakeHitsAt(b: Battle, pos: number): number {
  if (!b.stakes.includes(pos)) return 0;
  return b.stakeHits?.[pos] ?? STAKE_HITS_LOW;
}

export function isHighStake(b: Battle, pos: number): boolean {
  return stakeHitsAt(b, pos) >= STAKE_HITS_HIGH;
}

export function addStake(b: Battle, pos: number, hits: number): boolean {
  if (pos < 0 || pos >= BOARD_SIZE || b.stakes.includes(pos)) return false;
  b.stakes.push(pos);
  b.stakeHits = { ...(b.stakeHits ?? {}), [pos]: Math.max(1, hits) };
  return true;
}

export function removeStake(b: Battle, pos: number): void {
  const i = b.stakes.indexOf(pos);
  if (i < 0) return;
  b.stakes.splice(i, 1);
  if (b.stakeHits) delete b.stakeHits[pos];
}

/** 砸 n 下。毁掉返回 true。 */
export function smashStake(b: Battle, pos: number, n: number): boolean {
  if (!b.stakes.includes(pos) || n <= 0) return false;
  const left = Math.max(0, stakeHitsAt(b, pos) - n);
  if (left <= 0) {
    removeStake(b, pos);
    return true;
  }
  b.stakeHits = { ...(b.stakeHits ?? {}), [pos]: left };
  return false;
}

export function playerPlantHits(school: WeaponId): number {
  return school === "staff" ? STAKE_HITS_HIGH : STAKE_HITS_LOW;
}

export function enemyPlantHits(school: WeaponId, grade: EnemyGearGrade | undefined): number {
  if (school === "staff") return grade === "jing" ? STAKE_HITS_LOW : STAKE_HITS_HIGH;
  return STAKE_HITS_LOW;
}

export function smashHitsForSchool(school: WeaponId): number {
  return school === "staff" ? STAKE_HITS_HIGH : STAKE_HITS_LOW;
}

/** 你和他之间的桩（挡路）。贴身无格，不挡。 */
export function interceptStakePos(from: number, to: number, stakes: number[]): number | null {
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  for (let p = lo + 1; p < hi; p++) {
    if (stakes.includes(p)) return p;
  }
  return null;
}

/** 挡路优先；贴身无中间格时砸身侧（敌身后，再自己背后）。 */
export function adjacentStakePos(from: number, to: number, stakes: number[]): number | null {
  const intercept = interceptStakePos(from, to, stakes);
  if (intercept != null) return intercept;
  if (Math.abs(from - to) !== 1) return null;
  const dir = to > from ? 1 : -1;
  const pastFoe = to + dir;
  const behindYou = from - dir;
  for (const p of [pastFoe, behindYou]) {
    if (p >= 0 && p < BOARD_SIZE && stakes.includes(p)) return p;
  }
  return null;
}
