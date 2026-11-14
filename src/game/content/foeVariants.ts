import type { ArchetypeId } from "../foeArchetype";

/** 精英 / 座前的三套配招。同名谱，不同敌 id 前缀分开。 */
export interface FoeVariant {
  id: string;
  archetype: ArchetypeId;
  /** 血线换势目标。缺省走 STANCE_SHIFT_TO。 */
  shiftTo?: ArchetypeId;
}

const ROWS: readonly { id: string; archetype: ArchetypeId; shiftTo?: ArchetypeId }[] = [
  { id: "brute-press", archetype: "brute", shiftTo: "brute" },
  { id: "turtle-shell", archetype: "turtle", shiftTo: "brute" },
  { id: "skirmish-lane", archetype: "skirmish" },
];

/** 缺省换势。莽、刺客、教头留在本谱。龟和游走改莽。 */
export const STANCE_SHIFT_TO: Record<ArchetypeId, ArchetypeId> = {
  brute: "brute",
  turtle: "brute",
  skirmish: "brute",
  assassin: "assassin",
  coach: "coach",
};

/** 这个敌 id 的 2–3 套。 */
export function foeVariantSet(enemyId: string): FoeVariant[] {
  return ROWS.map((row) => ({
    id: `${enemyId}:${row.id}`,
    archetype: row.archetype,
    ...(row.shiftTo ? { shiftTo: row.shiftTo } : {}),
  }));
}

export function pickFoeVariant(enemyId: string, rng: () => number): FoeVariant {
  const rows = foeVariantSet(enemyId);
  const i = Math.min(rows.length - 1, Math.floor(rng() * rows.length));
  return rows[i]!;
}

export function shiftArchetype(from: ArchetypeId, specified?: ArchetypeId): ArchetypeId {
  return specified ?? STANCE_SHIFT_TO[from];
}
