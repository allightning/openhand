import type {
  CardOverride,
  ContentOverrideStore,
  EnemyOverride,
  MateOverride,
  TechniqueOverride,
  WeaponOverride,
} from "../game/labTypes";

export type {
  CardOverride,
  ContentOverrideStore,
  EnemyOverride,
  MateOverride,
  TechniqueOverride,
  WeaponOverride,
};

const STORAGE_KEY = "openhand-combat-lab-content-overrides";

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
  patch: object | null,
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
