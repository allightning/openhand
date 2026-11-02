import { CLIMB_SPEAR_REVERSE_QI, CLIMB_STAFF_WALL_STUN } from "../climbCaps";
import { boardLen, wallEndsOf, wallOnSide } from "../board";
import { WALL_DAMAGE, type Battle, type WeaponId } from "../types";

export const STAFF_WALL = { extraDmg: 0, stun: CLIMB_STAFF_WALL_STUN } as const;

export function staffWallOnCrash(school: WeaponId, who: "player" | "enemy"): { extraDmg: number; stun: number } | null {
  if (who !== "enemy") return null;
  if (school !== "staff") return null;
  return STAFF_WALL;
}

export function unitBackToWall(b: Battle, pos: number): boolean {
  const last = boardLen(b) - 1;
  const ends = wallEndsOf(b);
  if (pos === 0 && wallOnSide(ends, "low")) return true;
  if (pos === last && wallOnSide(ends, "high")) return true;
  return false;
}

/** 墙-我-敌一线且贴身。 */
export function hookSmashLine(b: Battle): boolean {
  const p = b.player.pos;
  const e = b.enemy.pos;
  if (Math.abs(p - e) !== 1) return false;
  if (!unitBackToWall(b, p)) return false;
  const last = boardLen(b) - 1;
  if (p === 0 && e === 1) return true;
  if (p === last && e === last - 1) return true;
  return false;
}

export function spearReverseReady(b: Battle, school: WeaponId, pace: number): boolean {
  if (school !== "spear") return false;
  if (pace >= b.foePace) return false;
  if (!unitBackToWall(b, b.player.pos)) return false;
  return Math.abs(b.player.pos - b.enemy.pos) === 2;
}

export function spearReverseCost(): number {
  return CLIMB_SPEAR_REVERSE_QI;
}

export function hookSmashSwap(b: Battle, standable: (pos: number) => boolean): string[] {
  const notes: string[] = [];
  const p0 = b.player.pos;
  const e0 = b.enemy.pos;
  const playerLand = standable(e0) ? e0 : p0;
  const enemyLand = standable(p0) || playerLand !== p0 ? p0 : e0;
  b.player.pos = playerLand;
  b.enemy.pos = enemyLand;
  notes.push(`抡撞换位 你${playerLand + 1} 敌${enemyLand + 1}`);
  const wh = WALL_DAMAGE;
  b.enemy.hp -= wh;
  notes.push(`抡撞撞墙 ${wh}`);
  return notes;
}
