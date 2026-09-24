import { MATES, canMateLearnSchool } from "./party";
import type { RunContext } from "./runContext";
import type { Battle, CompanionId, WeaponId } from "./types";
import { gearById, starterGear } from "./weapons";

export function schoolFromGearId(gearId: string | undefined, fallback: WeaponId, rc: RunContext): WeaponId {
  if (!gearId) return fallback;
  return gearById(gearId, rc)?.school ?? fallback;
}

export function defaultMateGear(mateId: CompanionId, school?: WeaponId): string {
  const m = MATES[mateId];
  return starterGear(school ?? m.weapon);
}

export function battleMateGearId(b: Battle, mateId: CompanionId): string {
  return b.labMateWeapons?.[mateId] ?? defaultMateGear(mateId);
}

/** 当前装备兵器系（§23.2 / §17.6）。换系无硬成本，品阶差由掉落/装备层自然形成（§23.2 v2.3）。 */
export function battleEquippedSchool(b: Battle, mateId: CompanionId, rc: RunContext): WeaponId {
  return schoolFromGearId(b.labMateWeapons?.[mateId], MATES[mateId].weapon, rc);
}

export function initBattleMateWeapons(
  b: Battle,
  weapons: Partial<Record<CompanionId, string>>,
  rc: RunContext,
): void {
  const map: Partial<Record<CompanionId, string>> = {};
  for (const id of b.party) {
    const wid = weapons[id];
    if (wid && canMateEquipGear(id, wid, rc)) map[id] = wid;
    else map[id] = defaultMateGear(id);
  }
  b.labMateWeapons = map;
}

/** 兵器 id 须落在角色主/副系之一。 */
export function canMateEquipGear(mateId: CompanionId, gearId: string, rc: RunContext): boolean {
  const school = gearById(gearId, rc)?.school;
  if (!school) return false;
  return canMateLearnSchool(mateId, school);
}

export function gearIdsForMateSchools(
  mateId: CompanionId,
  allGearIds: string[],
  rc: RunContext,
): { main: string[]; alt: string[] } {
  const m = MATES[mateId];
  const main: string[] = [];
  const alt: string[] = [];
  for (const id of allGearIds) {
    const s = gearById(id, rc)?.school;
    if (s === m.weapon) main.push(id);
    else if (s === m.secondFamily) alt.push(id);
  }
  return { main, alt };
}
