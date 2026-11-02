import { CLIMB_BURN_DMG } from "../climbCaps";
import type { Battle, EnvTag, Unit } from "../types";

export function burnCellsFor(tag: EnvTag | undefined, boardSize: number): number[] | undefined {
  if (tag !== "burn") return undefined;
  return [Math.floor((boardSize - 1) / 2)];
}

export function gapFieldFor(tag: EnvTag | undefined): number[] | undefined {
  if (tag !== "gap_end" && tag !== "gap_mid") return undefined;
  return [];
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
