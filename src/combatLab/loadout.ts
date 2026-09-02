import type { CardId, CompanionId, LabItemId, WeaponId } from "../game/types";
import { breakCardUpgrade } from "../game/rogueCards";
import { rogueLeadId } from "./rogueRoster";

export function loadoutHero(school: WeaponId): CompanionId {
  return rogueLeadId(school);
}

export type LoadoutBand = "early" | "mid" | "late";

export interface LoadoutRun {
  school: WeaponId;
  stage: number;
  deckRecipe: CardId[];
  mateDecks?: Partial<Record<CompanionId, CardId[]>>;
  stashCards?: CardId[];
  items: LabItemId[];
  equippedItems?: LabItemId[];
  equippedAids?: LabItemId[];
  itemCharges?: Partial<Record<LabItemId, number>>;
  pot: number;
}

export function loadoutBand(stage: number): LoadoutBand {
  const s = Math.max(1, stage);
  if (s <= 2) return "early";
  if (s <= 7) return "mid";
  return "late";
}

export function deckBounds(stage: number): { min: number; max: number } {
  const b = loadoutBand(stage);
  if (b === "early") return { min: 8, max: 10 };
  if (b === "mid") return { min: 10, max: 12 };
  return { min: 12, max: 15 };
}

export function gearSlotMax(stage: number): number {
  const b = loadoutBand(stage);
  if (b === "early") return 1;
  if (b === "mid") return 2;
  return 3;
}

export function isAidItem(id: LabItemId): boolean {
  return id.startsWith("aid");
}

export function mateDeck(run: LoadoutRun, mate: CompanionId): CardId[] {
  return [...(run.mateDecks?.[mate] ?? (mate === loadoutHero(run.school) ? run.deckRecipe : []))];
}

export function fieldDeck(run: LoadoutRun): CardId[] {
  return mateDeck(run, loadoutHero(run.school));
}

export function deckLegal(n: number, stage: number): boolean {
  const { min, max } = deckBounds(stage);
  return n >= min && n <= max;
}

export function fieldDeckLegal(run: LoadoutRun): boolean {
  return deckLegal(fieldDeck(run).length, run.stage);
}

export function equippedNonAid(run: LoadoutRun): LabItemId[] {
  const src = run.equippedItems ?? run.items.filter((id) => !isAidItem(id));
  return src.filter((id) => !isAidItem(id));
}

export function equippedAids(run: LoadoutRun): LabItemId[] {
  return (run.equippedAids ?? run.items.filter(isAidItem)).filter(isAidItem);
}

export function gearLegal(run: LoadoutRun): boolean {
  const cap = gearSlotMax(run.stage);
  return equippedNonAid(run).length <= cap && equippedAids(run).length <= cap;
}

export function canStartBattle(run: LoadoutRun): boolean {
  return fieldDeckLegal(run) && gearLegal(run);
}

export function withMateDeck<T extends LoadoutRun>(run: T, mate: CompanionId, deck: CardId[]): T {
  const mateDecks = { ...(run.mateDecks ?? {}), [mate]: deck };
  const hero = loadoutHero(run.school);
  return { ...run, mateDecks, deckRecipe: mate === hero ? deck : run.deckRecipe };
}

export function ownedCardIds(run: LoadoutRun): Set<CardId> {
  const s = new Set<CardId>(run.deckRecipe);
  for (const deck of Object.values(run.mateDecks ?? {})) {
    for (const id of deck) s.add(id);
  }
  for (const id of run.stashCards ?? []) s.add(id);
  return s;
}

function replaceFirst(list: CardId[], from: CardId, to: CardId): CardId[] {
  const i = list.indexOf(from);
  if (i < 0) return list;
  const next = [...list];
  next[i] = to;
  return next;
}

/** 把一张已有谱换成换页目标（牌包或仓库里第一张）。 */
export function replaceOwnedCard<T extends LoadoutRun>(run: T, from: CardId, to: CardId): T {
  if (run.deckRecipe.includes(from)) {
    const deck = replaceFirst(run.deckRecipe, from, to);
    const hero = loadoutHero(run.school);
    return withMateDeck(run, hero, deck);
  }
  for (const mate of Object.keys(run.mateDecks ?? {}) as CompanionId[]) {
    const deck = run.mateDecks![mate] ?? [];
    if (deck.includes(from)) return withMateDeck(run, mate, replaceFirst(deck, from, to));
  }
  const stash = run.stashCards ?? [];
  if (stash.includes(from)) return { ...run, stashCards: replaceFirst(stash, from, to) };
  return run;
}

export function grantCardToLoadout<T extends LoadoutRun>(run: T, id: CardId): T {
  const owned = ownedCardIds(run);
  if (owned.has(id)) {
    const up = breakCardUpgrade(id);
    if (up && !owned.has(up)) return replaceOwnedCard(run, id, up);
    return run;
  }
  const hero = loadoutHero(run.school);
  const deck = mateDeck(run, hero);
  const { max } = deckBounds(run.stage);
  if (deck.length < max) return withMateDeck(run, hero, [...deck, id]);
  return { ...run, stashCards: [...(run.stashCards ?? []), id] };
}

export function moveStashToDeck<T extends LoadoutRun>(run: T, mate: CompanionId, stashIdx: number): T {
  const stash = [...(run.stashCards ?? [])];
  const card = stash[stashIdx];
  if (!card) return run;
  const { max } = deckBounds(run.stage);
  const deck = mateDeck(run, mate);
  if (deck.length >= max) return run;
  stash.splice(stashIdx, 1);
  return { ...withMateDeck(run, mate, [...deck, card]), stashCards: stash };
}

export function moveDeckToStash<T extends LoadoutRun>(run: T, mate: CompanionId, deckIdx: number): T {
  const { min } = deckBounds(run.stage);
  const deck = mateDeck(run, mate);
  if (deck.length <= min) return run;
  const card = deck[deckIdx];
  if (!card) return run;
  const next = deck.filter((_, i) => i !== deckIdx);
  return { ...withMateDeck(run, mate, next), stashCards: [...(run.stashCards ?? []), card] };
}

export function sellStashCard<T extends LoadoutRun>(run: T, stashIdx: number, price: number): T {
  const stash = [...(run.stashCards ?? [])];
  if (!stash[stashIdx]) return run;
  stash.splice(stashIdx, 1);
  return { ...run, stashCards: stash, pot: run.pot + Math.max(1, price) };
}
