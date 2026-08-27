import type { CompanionId, HeroId, TechniqueId } from "../game/types";
import { MATES } from "../game/party";
import { canMateEquipGear } from "../game/equippedWeapon";
import { starterGear } from "../game/weapons";
import { uniqueRecipe, LAB_PARTY_CAP, LAB_TECH_CAP } from "./rules";
import type { LabPreset } from "./types";

export function normalizePreset(p: LabPreset): LabPreset {
  const fieldMate = p.fieldMate ?? p.active ?? p.hero ?? "rail";
  const deckRecipe = uniqueRecipe(p.deckRecipe ?? p.deck ?? []);
  let party = [...(p.party?.length ? p.party : [fieldMate])];
  if (!party.includes(fieldMate)) party = [fieldMate, ...party];
  party = party.slice(0, LAB_PARTY_CAP);

  const mateWeapons: Partial<Record<CompanionId, string>> = { ...p.mateWeapons };
  const legacyWeapon = p.weapon ?? starterGear(MATES[fieldMate].weapon);
  for (const id of party) {
    if (!mateWeapons[id]) mateWeapons[id] = starterGear(MATES[id].weapon);
    else if (!canMateEquipGear(id, mateWeapons[id]!)) mateWeapons[id] = starterGear(MATES[id].weapon);
  }
  if (!mateWeapons[fieldMate]) mateWeapons[fieldMate] = legacyWeapon;

  const mateTechs: Partial<Record<CompanionId, TechniqueId[]>> = {};
  for (const id of party) {
    const from = p.mateTechs?.[id] ?? (id === fieldMate ? p.techniques : []) ?? [];
    mateTechs[id] = [...from].slice(0, LAB_TECH_CAP);
  }

  return {
    id: p.id,
    name: p.name,
    blurb: p.blurb,
    tags: [...p.tags],
    enemyId: p.enemyId,
    party,
    fieldMate,
    deckRecipe,
    mateWeapons,
    mateTechs,
    mateMinds: p.mateMinds ? { ...p.mateMinds } : undefined,
    hp: p.hp,
    hpMax: p.hpMax,
    extraFoeIds: p.extraFoeIds ? [...p.extraFoeIds] : undefined,
    waveEnemyId: p.waveEnemyId,
    statBoostMul: p.statBoostMul,
    labItems: p.labItems ? [...p.labItems].slice(0, 2) : undefined,
  };
}

export function fieldHero(fieldMate: CompanionId): HeroId {
  if (fieldMate === "seer" || fieldMate === "sapper" || fieldMate === "rail") return fieldMate;
  return "rail";
}

export function primaryWeapon(p: LabPreset): string {
  const n = normalizePreset(p);
  return n.mateWeapons[n.fieldMate] ?? starterGear(MATES[n.fieldMate].weapon);
}

export function clonePreset(p: LabPreset): LabPreset {
  const n = normalizePreset(p);
  return {
    ...n,
    tags: [...n.tags],
    party: [...n.party],
    deckRecipe: [...n.deckRecipe],
    mateWeapons: { ...n.mateWeapons },
    mateTechs: Object.fromEntries(Object.entries(n.mateTechs).map(([k, v]) => [k, [...v!]])) as LabPreset["mateTechs"],
    extraFoeIds: n.extraFoeIds ? [...n.extraFoeIds] : undefined,
    labItems: n.labItems ? [...n.labItems] : undefined,
  };
}
