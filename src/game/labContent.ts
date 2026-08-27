import { CARDS, ENEMIES, TECHNIQUES } from "./content";
import { getContentOverrides } from "./labContentOverrides";
import { isLabMode } from "./labTuning";
import { MATES } from "./party";
import type { CardDef, CardId, CompanionId, EnemyDef, EnemyId, TechniqueDef, TechniqueId } from "./types";
import { GEAR_WEAPONS, type GearWeapon } from "./weapons";

function merge<T extends object>(base: T, patch: Partial<T> | undefined): T {
  return patch ? { ...base, ...patch } : base;
}

export function labCard(id: CardId): CardDef {
  const base = CARDS[id];
  if (!isLabMode()) return base;
  return merge(base, getContentOverrides().cards[id]);
}

export function labEnemy(id: EnemyId): EnemyDef {
  const base = ENEMIES[id];
  if (!isLabMode()) return base;
  return merge(base, getContentOverrides().enemies[id]);
}

export function labTechnique(id: TechniqueId): TechniqueDef {
  const base = TECHNIQUES[id];
  if (!isLabMode()) return base;
  return merge(base, getContentOverrides().techniques[id]);
}

export function labMate(id: CompanionId): (typeof MATES)[CompanionId] {
  const base = MATES[id];
  if (!isLabMode()) return base;
  const ov = getContentOverrides().mates[id];
  if (!ov) return base;
  const hp = ov.hp != null ? ov.hp : base.hp;
  return { ...base, hp };
}

export function labGearById(id: string | null | undefined): GearWeapon | null {
  if (!id) return null;
  const hit = GEAR_WEAPONS.find((g) => g.id === id);
  if (!hit) return null;
  if (!isLabMode()) return hit;
  return merge(hit, getContentOverrides().weapons[id]);
}
