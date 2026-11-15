import { boardLen, wallEndsOf, wallOnSide } from "../board";
import { CLIMB_BURN_DMG } from "../climbCaps";
import type { Battle, EnvTag, Unit, WallEnds, WallSide } from "../types";

export function burnCellsFor(tag: EnvTag | undefined, boardSize: number): number[] | undefined {
  if (tag !== "burn") return undefined;
  return [Math.floor((boardSize - 1) / 2)];
}

/** 缺格下标。gap_end 跟墙同侧的末端一格；没写墙侧时用高侧。gap_mid 是中格。 */
export function gapFieldFor(
  tag: EnvTag | undefined,
  boardSize = 9,
  wallSide?: WallSide,
): number[] | undefined {
  if (tag !== "gap_end" && tag !== "gap_mid") return undefined;
  const last = Math.max(0, boardSize - 1);
  if (tag === "gap_mid") return [Math.floor(last / 2)];
  if (wallSide === "low") return [0];
  return [last];
}

export function isGapCell(b: { gapCells?: number[] }, pos: number): boolean {
  return (b.gapCells ?? []).includes(pos);
}

export type BoardStep =
  | { kind: "stand"; pos: number }
  | { kind: "cross"; cursor: number }
  | { kind: "wall"; side: "low" | "high" }
  | { kind: "void" }
  | { kind: "blocked"; pos: number };

/** 走一步。缺格后面还有实格就跨过，不落上去。末端缺格、那边有墙，算撞墙。 */
export function readBoardStep(
  b: { gapCells?: number[]; boardSize?: number; wallEnds?: WallEnds },
  cursor: number,
  dir: number,
  blocked: (pos: number) => boolean,
): BoardStep {
  if (dir === 0) return { kind: "void" };
  const stepDir = dir < 0 ? -1 : 1;
  const next = cursor + stepDir;
  const len = boardLen(b);
  if (next < 0 || next >= len) {
    const side = next < 0 ? "low" : "high";
    if (wallOnSide(wallEndsOf(b), side)) return { kind: "wall", side };
    return { kind: "void" };
  }
  if (isGapCell(b, next)) {
    let look = next + stepDir;
    let solid = false;
    while (look >= 0 && look < len) {
      if (!isGapCell(b, look)) {
        solid = true;
        break;
      }
      look += stepDir;
    }
    if (!solid) {
      const side = stepDir < 0 ? "low" : "high";
      if (wallOnSide(wallEndsOf(b), side)) return { kind: "wall", side };
      return { kind: "void" };
    }
    return { kind: "cross", cursor: next };
  }
  if (blocked(next)) return { kind: "blocked", pos: next };
  return { kind: "stand", pos: next };
}

export function tickBurnCells(b: Battle): string[] {
  const cells = b.burnCells ?? [];
  if (cells.length === 0) return [];
  const dmg = CLIMB_BURN_DMG;
  const notes: string[] = [];
  const hit = (u: Unit, who: string) => {
    if (!cells.includes(u.pos) || u.hp <= 0) return;
    u.hp -= dmg;
    notes.push(`灼烧 ${who} ${dmg}`);
  };
  hit(b.player, "你");
  for (const f of b.foes ?? []) hit(f, f.name);
  if (b.enemy && !(b.foes ?? []).some((f) => f.id === b.enemy.id)) hit(b.enemy, b.enemy.name);
  return notes;
}
