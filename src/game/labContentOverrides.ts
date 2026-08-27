import type { CardDef, CardId, CompanionId, EnemyDef, EnemyId, TechniqueDef, TechniqueId } from "./types";
import type { GearWeapon } from "./weapons";

const STORAGE_KEY = "openhand-combat-lab-content-overrides";

export type CardOverride = Partial<
  Pick<CardDef, "name" | "cost" | "damage" | "block" | "knock" | "wall" | "heal" | "bleed" | "expose" | "steps" | "chargeBonus">
>;

export type EnemyOverride = Partial<Pick<EnemyDef, "name" | "hp" | "pos" | "pace" | "reach">>;

export type WeaponOverride = Partial<Pick<GearWeapon, "name" | "damage" | "knock" | "ward">>;

export type TechniqueOverride = Partial<Pick<TechniqueDef, "name" | "text">>;

export type MateOverride = Partial<{ hp: number; passive: { name: string; text: string } }>;

export interface ContentOverrideStore {
  cards: Partial<Record<CardId, CardOverride>>;
  enemies: Partial<Record<EnemyId, EnemyOverride>>;
  weapons: Partial<Record<string, WeaponOverride>>;
  techniques: Partial<Record<TechniqueId, TechniqueOverride>>;
  mates: Partial<Record<CompanionId, MateOverride>>;
}

export const EMPTY_CONTENT_OVERRIDES: ContentOverrideStore = {
  cards: {},
  enemies: {},
  weapons: {},
  techniques: {},
  mates: {},
};

let store: ContentOverrideStore = loadStore();

function loadStore(): ContentOverrideStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(EMPTY_CONTENT_OVERRIDES);
    const parsed = JSON.parse(raw) as Partial<ContentOverrideStore>;
    return {
      cards: parsed.cards ?? {},
      enemies: parsed.enemies ?? {},
      weapons: parsed.weapons ?? {},
      techniques: parsed.techniques ?? {},
      mates: parsed.mates ?? {},
    };
  } catch {
    return structuredClone(EMPTY_CONTENT_OVERRIDES);
  }
}

function saveStore(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* ignore quota */
  }
}

export function getContentOverrides(): ContentOverrideStore {
  return {
    cards: { ...store.cards },
    enemies: { ...store.enemies },
    weapons: { ...store.weapons },
    techniques: { ...store.techniques },
    mates: { ...store.mates },
  };
}

export function setContentOverride<K extends keyof ContentOverrideStore>(
  bucket: K,
  id: string,
  patch: ContentOverrideStore[K][string] | null,
): void {
  const next = { ...store[bucket] } as Record<string, unknown>;
  if (patch == null || Object.keys(patch as object).length === 0) {
    delete next[id];
  } else {
    next[id] = { ...(next[id] as object), ...patch };
  }
  store = { ...store, [bucket]: next };
  saveStore();
}

export function clearEntityOverride<K extends keyof ContentOverrideStore>(bucket: K, id: string): void {
  const next = { ...store[bucket] } as Record<string, unknown>;
  delete next[id];
  store = { ...store, [bucket]: next };
  saveStore();
}

export function resetContentOverrides(): void {
  store = structuredClone(EMPTY_CONTENT_OVERRIDES);
  saveStore();
}

export function hasContentOverrides(): boolean {
  return (
    Object.keys(store.cards).length > 0 ||
    Object.keys(store.enemies).length > 0 ||
    Object.keys(store.weapons).length > 0 ||
    Object.keys(store.techniques).length > 0 ||
    Object.keys(store.mates).length > 0
  );
}
