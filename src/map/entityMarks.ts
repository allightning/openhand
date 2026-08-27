/**
 * 多字符实体 ID：AA..ZZ / P01.. — 避免单字母 A–Z 与陈设字母撞车导致交互错乱
 */
import type { PropKind, SceneId } from "./types";

export type EntityRole = "talker" | "portal" | "npc" | "prop" | "barrier";

export interface EntityMark {
  /** 唯一键，如 AA、AB、FA、P01 */
  id: string;
  x: number;
  y: number;
  role: EntityRole;
  /** talker→npcId；portal→目标 scene；npc→enemyId；prop→PropKind；barrier→need (item:roadPass / flag:xxx) */
  ref: string;
  /** portal 的 at；prop 的 tag；barrier 的提示文案前缀 */
  tag?: string;
}

export function makeBarrierMark(
  id: string,
  x: number,
  y: number,
  need: string,
  hint?: string,
): EntityMark {
  return { id, x, y, role: "barrier", ref: need, tag: hint };
}

/** AA, AB, … AZ, BA, … ZZ */
export function encodeMarkId(index: number): string {
  if (index < 0 || index >= 26 * 26) throw new Error(`mark index out of range: ${index}`);
  const a = Math.floor(index / 26);
  const b = index % 26;
  return String.fromCharCode(65 + a) + String.fromCharCode(65 + b);
}

/** P01, P02, … */
export function encodePropId(index: number): string {
  return `P${String(index + 1).padStart(2, "0")}`;
}

export function makeTalkerMark(id: string, x: number, y: number, npcId: string): EntityMark {
  return { id, x, y, role: "talker", ref: npcId };
}

export function makePortalMark(
  id: string,
  x: number,
  y: number,
  to: SceneId,
  at: string,
): EntityMark {
  return { id, x, y, role: "portal", ref: to, tag: at };
}

export function makePropMark(
  id: string,
  x: number,
  y: number,
  kind: PropKind,
  tag?: string,
): EntityMark {
  return { id, x, y, role: "prop", ref: kind, tag };
}
