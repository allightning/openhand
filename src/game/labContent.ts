import { CARDS, ENEMIES, TECHNIQUES } from "./content";
import { getContentOverrides } from "./labContentOverrides";
import { isLabMode } from "./labTuning";
import { isBreakAlign } from "../combatLab/labRuleset";
import { MATES } from "./party";
import type { CardDef, CardId, CompanionId, EnemyDef, EnemyId, TechniqueDef, TechniqueId } from "./types";
import { remapLegacyCardId } from "./rogueCards";
import { GEAR_WEAPONS, type GearWeapon } from "./weapons";

/** 爬塔牌面：经典资源改写成势/格挡，读招仍用 content.ts 原文。 */
const CLIMB_CARD_FACE: Partial<Record<CardId, Partial<CardDef>>> = {
  gather: { name: "聚势", text: "势 +1。抽 1。" },
  gather2: { name: "聚势入骨", text: "势 +2。抽 1。" },
  setup: { name: "铺势", text: "下回势 +1。抽 1。" },
  finisher: { name: "收势掌", text: "打 4，耗尽当前势爆发。" },
  finisher2: { name: "收势开山", text: "打 6，耗尽当前势爆发。" },
  weave: { name: "搓手", text: "格挡 6。本回合下一张牌耗劲 -1。" },
};

function merge<T extends object>(base: T, patch: Partial<T> | undefined): T {
  return patch ? { ...base, ...patch } : base;
}

export function labCard(id: CardId): CardDef {
  const nid = remapLegacyCardId(id);
  const base = CARDS[nid];
  if (!isLabMode()) return base;
  const climb = !isBreakAlign() ? CLIMB_CARD_FACE[nid] : undefined;
  return merge(merge(base, climb), getContentOverrides().cards[nid] as Partial<CardDef> | undefined);
}

export function labEnemy(id: EnemyId): EnemyDef {
  const base = ENEMIES[id];
  if (!isLabMode()) return base;
  return merge(base, getContentOverrides().enemies[id] as Partial<EnemyDef> | undefined);
}

export function labTechnique(id: TechniqueId): TechniqueDef {
  const base = TECHNIQUES[id];
  if (!isLabMode()) return base;
  return merge(base, getContentOverrides().techniques[id] as Partial<TechniqueDef> | undefined);
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
  return merge(hit, getContentOverrides().weapons[id] as Partial<GearWeapon> | undefined);
}
