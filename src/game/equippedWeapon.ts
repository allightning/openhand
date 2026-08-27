import { MATES, canMateLearnSchool } from "./party";
import type { Battle, CompanionId, WeaponId } from "./types";
import { gearById, starterGear } from "./weapons";

export function schoolFromGearId(gearId: string | undefined, fallback: WeaponId): WeaponId {
  if (!gearId) return fallback;
  return gearById(gearId)?.school ?? fallback;
}

export function defaultMateGear(mateId: CompanionId, school?: WeaponId): string {
  const m = MATES[mateId];
  return starterGear(school ?? m.weapon);
}

export function battleMateGearId(b: Battle, mateId: CompanionId): string {
  return b.labMateWeapons?.[mateId] ?? defaultMateGear(mateId);
}

/** 当前装备兵器系（§23.2 / §17.6）。换系无硬成本，品阶差由掉落/装备层自然形成（§23.2 v2.3）。 */
export function battleEquippedSchool(b: Battle, mateId: CompanionId): WeaponId {
  return schoolFromGearId(b.labMateWeapons?.[mateId], MATES[mateId].weapon);
}

export function initBattleMateWeapons(b: Battle, weapons: Partial<Record<CompanionId, string>>): void {
  const map: Partial<Record<CompanionId, string>> = {};
  for (const id of b.party) {
    const wid = weapons[id];
    if (wid && canMateEquipGear(id, wid)) map[id] = wid;
    else map[id] = defaultMateGear(id);
  }
  b.labMateWeapons = map;
}

/** 兵器 id 须落在角色主/副系之一。 */
export function canMateEquipGear(mateId: CompanionId, gearId: string): boolean {
  const school = gearById(gearId)?.school;
  if (!school) return false;
  return canMateLearnSchool(mateId, school);
}

export function gearIdsForMateSchools(mateId: CompanionId, allGearIds: string[]): { main: string[]; alt: string[] } {
  const m = MATES[mateId];
  const main: string[] = [];
  const alt: string[] = [];
  for (const id of allGearIds) {
    const s = gearById(id)?.school;
    if (s === m.weapon) main.push(id);
    else if (s === m.secondFamily) alt.push(id);
  }
  return { main, alt };
}
