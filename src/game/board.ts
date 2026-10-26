import type { LabRuleset } from "./labTypes";
import { BOARD_SIZE, CLIMB_BOARD_SIZE, type WallEnds, type WallSide } from "./types";

/** 开局间距缺省与上限。玩家钉在低侧 0，敌在这一格。 */
export const OPENING_DIST_DEFAULT = 5;
export const OPENING_DIST_MAX = 5;

export function boardLen(b: { boardSize?: number }): number {
  const n = b.boardSize;
  return n != null && n > 0 ? n : BOARD_SIZE;
}

export function wallEndsOf(b: { wallEnds?: WallEnds }): WallEnds {
  return b.wallEnds ?? "both";
}

export function clampOpeningDist(n: number | undefined): number {
  const raw = n == null || !Number.isFinite(n) ? OPENING_DIST_DEFAULT : Math.floor(n);
  return Math.max(1, Math.min(OPENING_DIST_MAX, raw));
}

export function wallEndsFromSide(side: WallSide | undefined): WallEnds {
  if (side === "low" || side === "none") return side;
  return "high";
}

/**
 * 组局时唯一的 mode 分叉：登门 7 格两端墙，行路 9 格按 wallSide。
 * 结算之后只读返回值，不再看 mode。
 */
export function assembleBattleBoard(
  mode: LabRuleset,
  run: { wallSide?: WallSide; openingDist?: number },
): { boardSize: number; wallEnds: WallEnds; openingDist?: number } {
  if (mode === "break") return { boardSize: BOARD_SIZE, wallEnds: "both" };
  return {
    boardSize: CLIMB_BOARD_SIZE,
    wallEnds: wallEndsFromSide(run.wallSide),
    openingDist: clampOpeningDist(run.openingDist),
  };
}

/** 玩家在低侧 0，敌在 dist。不居中，不换边。 */
export function openingPosts(dist: number, boardSize: number): { playerPos: number; enemyPos: number } {
  const d = Math.max(1, Math.min(dist, OPENING_DIST_MAX, boardSize - 1));
  return { playerPos: 0, enemyPos: d };
}

/**
 * 双人站位按板长缩放。7 格 → 中格 3、高侧边 6；9 格 → 中格 4、高侧边 8。
 */
export function twinPosts(boardSize: number): { lead: number; shadow: number } {
  const high = Math.max(1, boardSize - 1);
  return { lead: Math.floor(high / 2), shadow: high };
}

/** 图鉴槽位落进本局板内。4/5 是开局距离，不是旧墙下标。 */
export function catalogCell(slot: number, boardSize: number): number {
  return Math.max(0, Math.min(slot, boardSize - 1));
}

export function offBoardSide(next: number, boardSize: number): "low" | "high" | null {
  if (next < 0) return "low";
  if (next >= boardSize) return "high";
  return null;
}

export function wallOnSide(ends: WallEnds, side: "low" | "high"): boolean {
  if (ends === "both") return true;
  if (ends === "none") return false;
  return ends === side;
}

export function atBoardEnd(pos: number, boardSize: number): boolean {
  return pos === 0 || pos === boardSize - 1;
}

/** 到最近一堵墙的格数。无墙时返回板长，表示贴不上。 */
export function nearestWallDist(pos: number, boardSize: number, ends: WallEnds): number {
  const dists: number[] = [];
  if (ends === "both" || ends === "low") dists.push(Math.abs(pos));
  if (ends === "both" || ends === "high") dists.push(Math.abs(boardSize - 1 - pos));
  if (!dists.length) return boardSize;
  return Math.min(...dists);
}

export function unitAtWall(pos: number, boardSize: number, ends: WallEnds): boolean {
  if ((ends === "both" || ends === "low") && pos === 0) return true;
  if ((ends === "both" || ends === "high") && pos === boardSize - 1) return true;
  return false;
}
