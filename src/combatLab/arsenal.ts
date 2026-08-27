import { CARDS, ENEMIES, TECHNIQUES } from "../game/content";
import { MATES } from "../game/party";
import type { CardId, CompanionId, EnemyId, TechniqueId } from "../game/types";
import { GEAR_WEAPONS } from "../game/weapons";

export const ALL_CARD_IDS = Object.keys(CARDS) as CardId[];
export const ALL_TECHNIQUE_IDS = Object.keys(TECHNIQUES) as TechniqueId[];
export const ALL_ENEMY_IDS = Object.keys(ENEMIES) as EnemyId[];
export const ALL_MATE_IDS = Object.keys(MATES) as CompanionId[];
export const ALL_WEAPON_IDS = GEAR_WEAPONS.map((g) => g.id);

export interface ArsenalEntry {
  id: string;
  name: string;
  group: string;
  tip: string;
}

export function cardEntries(): ArsenalEntry[] {
  return ALL_CARD_IDS.map((id) => ({
    id,
    name: CARDS[id].name,
    group: CARDS[id].type === "attack" ? "攻击" : "技能",
    tip: CARDS[id].text,
  }));
}

export function weaponEntries(): ArsenalEntry[] {
  return GEAR_WEAPONS.map((g) => ({
    id: g.id,
    name: g.name,
    group: `${g.school} · ${g.tier}`,
    tip: g.tip,
  }));
}

export function techniqueEntries(): ArsenalEntry[] {
  return ALL_TECHNIQUE_IDS.map((id) => ({
    id,
    name: TECHNIQUES[id].name,
    group: "外功",
    tip: TECHNIQUES[id].text,
  }));
}

export function mateEntries(): ArsenalEntry[] {
  return ALL_MATE_IDS.map((id) => ({
    id,
    name: MATES[id].name,
    group: MATES[id].title,
    tip: MATES[id].bio ?? MATES[id].title,
  }));
}

export function enemyEntries(): ArsenalEntry[] {
  return ALL_ENEMY_IDS.map((id) => ({
    id,
    name: ENEMIES[id].name,
    group: ENEMIES[id].title,
    tip: ENEMIES[id].pitch,
  }));
}

export const ARSENAL_COUNTS = {
  cards: ALL_CARD_IDS.length,
  weapons: ALL_WEAPON_IDS.length,
  techniques: ALL_TECHNIQUE_IDS.length,
  mates: ALL_MATE_IDS.length,
  enemies: ALL_ENEMY_IDS.length,
};
