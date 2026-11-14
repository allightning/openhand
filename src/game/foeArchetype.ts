import {
  CLIMB_FOE_DECK_MAX,
  CLIMB_FOE_DECK_MIN,
  CLIMB_FOE_GROW_EARLY,
  CLIMB_FOE_GROW_MID,
  CLIMB_FOE_GROW_SEAT,
  CLIMB_FOE_P_ASSASSIN,
  CLIMB_FOE_P_BRUTE,
  CLIMB_FOE_P_COACH,
  CLIMB_FOE_P_SKIRMISH,
  CLIMB_FOE_P_TURTLE,
  CLIMB_FOE_WINDOW_CAP,
  CLIMB_FOE_WINDOW_CAP_SEAT,
  CLIMB_FOE_WINDOW_HALL,
} from "./climbCaps";
import type { Intent } from "./types";
import { pickFoeVariant, type FoeVariant } from "./content/foeVariants";

export const ARCHETYPE_IDS = ["brute", "turtle", "skirmish", "assassin", "coach"] as const;
export type ArchetypeId = (typeof ARCHETYPE_IDS)[number];

export interface FoeCard {
  intent: Intent;
  feint?: boolean;
}

export interface FoeTagSlot {
  wall?: string;
  env?: string;
}

export interface FoeBondSlot {
  id: string;
}

export interface FoeAuraSlot {
  id: string;
}

export interface FoeKit {
  archetype: ArchetypeId;
  cards: FoeCard[];
  cap: number;
  growth: number;
  tags: FoeTagSlot;
  bond: FoeBondSlot | null;
  aura: FoeAuraSlot | null;
  foeWindows: string[];
  windowCap: number;
  foeVariant?: string;
  shiftTo?: ArchetypeId;
}

/** 族 → 原型。不改目录血和招伤。 */
export const FOE_FAMILY_ARCHETYPE: Record<string, ArchetypeId> = {
  road: "brute",
  escortBand: "brute",
  yamenRunner: "turtle",
  monk: "turtle",
  canal: "skirmish",
  court: "assassin",
  rebel: "coach",
  side: "skirmish",
};

const POOL: Record<ArchetypeId, FoeCard[]> = {
  brute: [
    { intent: { kind: "strike", damage: 12 } },
    { intent: { kind: "strike", damage: 10 } },
    { intent: { kind: "lunge", damage: 11 } },
    { intent: { kind: "advance", steps: 2 } },
    { intent: { kind: "barrage", damage: 5, hits: 2 } },
    { intent: { kind: "charge", damage: 11, steps: 2 } },
    { intent: { kind: "bleedcut", damage: 8, bleed: 1 } },
    { intent: { kind: "pestle", damage: 9 } },
  ],
  turtle: [
    { intent: { kind: "guard", block: 6 } },
    { intent: { kind: "guard", block: 8 } },
    { intent: { kind: "mend", heal: 4 } },
    { intent: { kind: "breathe", amount: 3 } },
    { intent: { kind: "strike", damage: 8 } },
    { intent: { kind: "endure" } },
    { intent: { kind: "retreat", steps: 1 } },
    { intent: { kind: "stake" } },
  ],
  skirmish: [
    { intent: { kind: "advance", steps: 1 } },
    { intent: { kind: "retreat", steps: 1 } },
    { intent: { kind: "lunge", damage: 9 } },
    { intent: { kind: "strike", damage: 8 } },
    { intent: { kind: "dodge" } },
    { intent: { kind: "swap" } },
    { intent: { kind: "advance", steps: 2 } },
    { intent: { kind: "retreat", steps: 2 } },
  ],
  assassin: [
    { intent: { kind: "strike", damage: 10 }, feint: true },
    { intent: { kind: "dust" } },
    { intent: { kind: "lunge", damage: 12 } },
    { intent: { kind: "retreat", steps: 2 } },
    { intent: { kind: "bleedcut", damage: 7, bleed: 2 }, feint: true },
    { intent: { kind: "dodge" } },
    { intent: { kind: "seal" } },
    { intent: { kind: "advance", steps: 1 } },
  ],
  coach: [
    { intent: { kind: "windup" } },
    { intent: { kind: "guard", block: 6 } },
    { intent: { kind: "strike", damage: 11 } },
    { intent: { kind: "advance", steps: 1 } },
    { intent: { kind: "breathe", amount: 3 } },
    { intent: { kind: "pull", steps: 1 } },
    { intent: { kind: "counter", form: "slash" } },
    { intent: { kind: "barrage", damage: 4, hits: 3 } },
  ],
};

export function archetypesForStage(stage: number): ArchetypeId[] {
  if (stage <= 3) return ["brute", "turtle"];
  if (stage <= 6) return ["brute", "turtle", "skirmish", "assassin"];
  return ["brute", "turtle", "skirmish", "assassin", "coach"];
}

export function deckGrowth(stage: number): number {
  if (stage >= 10) return CLIMB_FOE_GROW_SEAT;
  if (stage >= 4) return CLIMB_FOE_GROW_MID;
  return CLIMB_FOE_GROW_EARLY;
}

/** 局内随回合涨，不超过该馆段的成长帽。 */
export function deckCap(stage: number, turn: number, span: number): number {
  const base = CLIMB_FOE_DECK_MIN + (Math.abs(span) % (CLIMB_FOE_DECK_MAX - CLIMB_FOE_DECK_MIN + 1));
  const step = Math.min(deckGrowth(stage), Math.max(0, turn - 1));
  return base + step;
}

export function foeKitSeed(round: number, enemyId: string, salt: number): number {
  let h = (Math.imul(round, 374761393) + salt) >>> 0;
  for (let i = 0; i < enemyId.length; i++) h = Math.imul(h ^ enemyId.charCodeAt(i), 668265263) >>> 0;
  return h >>> 0;
}

export function kitRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export interface KitInput {
  stage: number;
  enemyId: string;
  round: number;
  salt: number;
  turn?: number;
  elite?: boolean;
  seat?: boolean;
}

export function emptyTag(): FoeTagSlot {
  return {};
}

export function bondSlot(): FoeBondSlot | null {
  return null;
}

export function auraSlot(): FoeAuraSlot | null {
  return null;
}

export function foeWindowChance(id: ArchetypeId | undefined): number {
  if (id === "assassin") return CLIMB_FOE_P_ASSASSIN;
  if (id === "coach") return CLIMB_FOE_P_COACH;
  if (id === "skirmish") return CLIMB_FOE_P_SKIRMISH;
  if (id === "brute") return CLIMB_FOE_P_BRUTE;
  if (id === "turtle") return CLIMB_FOE_P_TURTLE;
  return 0;
}

function foeWindowsFor(stage: number, elite: boolean, seat: boolean): string[] {
  if (seat || (elite && stage >= CLIMB_FOE_WINDOW_HALL)) return ["dismantle", "bind", "read"];
  return [];
}

export function dealArchetypeCards(archetype: ArchetypeId, cap: number, rng: () => number): FoeCard[] {
  const bag = POOL[archetype];
  const cards: FoeCard[] = [];
  const n = Math.max(0, cap);
  for (let i = 0; i < n; i++) cards.push(bag[Math.floor(rng() * bag.length)]!);
  return cards;
}

export { type FoeVariant };

/** 馆段 → 原型或变体 → 配牌 → 词条（空）→ 羁绊（空）→ 光环（空）→ 成长。 */
export function buildFoeKit(input: KitInput, rng: () => number): FoeKit {
  const seat = input.seat === true || input.stage >= 10;
  const varied = input.elite === true || seat;
  let archetype: ArchetypeId;
  let foeVariant: string | undefined;
  let shiftTo: ArchetypeId | undefined;
  if (varied) {
    const variant = pickFoeVariant(input.enemyId, rng);
    archetype = variant.archetype;
    foeVariant = variant.id;
    shiftTo = variant.shiftTo;
  } else {
    const poolIds = archetypesForStage(input.stage);
    archetype = poolIds[Math.floor(rng() * poolIds.length)] ?? "brute";
  }
  const span = Math.floor(rng() * 1000);
  const cap = deckCap(input.stage, input.turn ?? 1, span);
  return {
    archetype,
    cards: dealArchetypeCards(archetype, cap, rng),
    cap,
    growth: deckGrowth(input.stage),
    tags: emptyTag(),
    bond: bondSlot(),
    aura: auraSlot(),
    foeWindows: foeWindowsFor(input.stage, input.elite === true, seat),
    windowCap: seat ? CLIMB_FOE_WINDOW_CAP_SEAT : CLIMB_FOE_WINDOW_CAP,
    ...(foeVariant ? { foeVariant, ...(shiftTo ? { shiftTo } : {}) } : {}),
  };
}
