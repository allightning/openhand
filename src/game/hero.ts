import type { CardId, EnemyId, HeroId } from "./types";
import type { SceneId } from "../map/types";

export const HERO_START: Record<HeroId, SceneId> = {
  rail: "hut",
  seer: "customs",
  sapper: "ropes",
};

export const HERO_BOSSES: Record<HeroId, EnemyId[]> = {
  rail: [
    "intruder",
    "brute",
    "warden",
    "raider",
    "bandit",
    "catcher",
    "escort",
    "piler",
    "smuggler",
    "robber",
    "hauler",
    "thug",
    "alley",
    "trapper",
    "delay",
    "twin",
    "lord",
    "cavehand",
  ],
  seer: [
    "inkhand",
    "bookcut",
    "nametaker",
    "glasspin",
    "delay",
    "twin",
    "lord",
    "catcher",
    "bandit",
    "thug",
    "alley",
    "trapper",
    "escort",
    "piler",
    "smuggler",
  ],
  sapper: [
    "stakeboss",
    "knotboss",
    "robber",
    "piler",
    "hauler",
    "thug",
    "trapper",
    "raider",
    "smuggler",
    "brute",
    "warden",
    "bandit",
    "alley",
    "delay",
    "lord",
  ],
};

const SEER_SWAP: Partial<Record<EnemyId, EnemyId>> = {
  intruder: "inkhand",
  brute: "bookcut",
  warden: "nametaker",
  raider: "glasspin",
};

const SAPPER_SWAP: Partial<Record<EnemyId, EnemyId>> = {
  intruder: "stakeboss",
  raider: "knotboss",
};

export function remapEnemy(hero: HeroId, id: EnemyId): EnemyId {
  if (hero === "seer") return SEER_SWAP[id] ?? id;
  if (hero === "sapper") return SAPPER_SWAP[id] ?? id;
  return id;
}

export function bossCount(hero: HeroId, beaten: EnemyId[]): number {
  const need = HERO_BOSSES[hero];
  return need.filter((id) => beaten.includes(id)).length;
}

export const SEER_DECK: CardId[] = [
  "pierce",
  "pierce",
  "expose",
  "defend",
  "marking",
  "advance",
  "advance",
  "inbreath",
  "pierce",
  "mend",
  "setup",
  "rift",
  "follow",
  "echo",
];

export const SAPPER_DECK: CardId[] = [
  "plant",
  "plant",
  "thorns",
  "strike",
  "strike",
  "defend",
  "ironform",
  "sweep",
  "split",
  "mend",
  "advance",
  "bleedcut",
  "setup",
  "layer",
  "follow",
];
