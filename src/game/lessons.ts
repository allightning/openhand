import { TECHNIQUES } from "./content";
import type { TechniqueId } from "./types";

/** Martial-hall catalog — modest silver, dock/alley forgiveness only. */
export interface TechLesson {
  id: TechniqueId;
  price: number;
  label: string;
}

export const MARTIAL_LESSONS: TechLesson[] = [
  { id: "longPush", price: 14, label: "开山劲" },
  { id: "backstep", price: 12, label: "回身" },
  { id: "keepGuard", price: 16, label: "残劲" },
  { id: "hardWall", price: 18, label: "震壁" },
  { id: "leftover", price: 15, label: "余劲" },
  { id: "rebound", price: 16, label: "回桩" },
  { id: "stackHand", price: 20, label: "多手" },
  { id: "shortCharge", price: 18, label: "绊步" },
  { id: "ghostStep", price: 22, label: "镜步" },
  { id: "nightStep", price: 24, label: "夜步残谱" },
];

export function martialOffers(owned: TechniqueId[]): TechLesson[] {
  const have = new Set(owned);
  return MARTIAL_LESSONS.filter((l) => !have.has(l.id) && TECHNIQUES[l.id]);
}

export function lessonByPick(pick: string): TechLesson | null {
  if (!pick.startsWith("learn:")) return null;
  const id = pick.slice(6) as TechniqueId;
  return MARTIAL_LESSONS.find((l) => l.id === id) ?? null;
}
