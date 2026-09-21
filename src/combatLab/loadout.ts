import type { CardId, CompanionId, LabItemId, WeaponId } from "../game/types";
import { CARDS } from "../game/content";
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

function countCardCopies(run: LoadoutRun, id: CardId): number {
  const hero = loadoutHero(run.school);
  const deck = mateDeck(run, hero);
  const stash = run.stashCards ?? [];
  return deck.filter((x) => x === id).length + stash.filter((x) => x === id).length;
}

/** 同谱最多 3 张；满 3 再摸才尝试换页。 */
export function grantCardToLoadout<T extends LoadoutRun>(run: T, id: CardId): T {
  const copies = countCardCopies(run, id);
  if (copies >= 3) {
    const up = breakCardUpgrade(id);
    if (up && countCardCopies(run, up) === 0) return replaceOwnedCard(run, id, up);
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

/** 爬塔外功栏：馆 1–3 为 3，4–7 为 4，8+ 为 5。 */
export function climbTechSlotMax(stage: number): number {
  const s = Math.max(1, stage);
  if (s <= 3) return 3;
  if (s <= 7) return 4;
  return 5;
}

/** 进退/换位不合成；攻击、防御、状态可走换页链。 */
export function climbCardFusable(id: CardId): boolean {
  const def = CARDS[id];
  if (!def) return false;
  if (def.steps || def.swap) return false;
  if (id === "advance" || id === "retreat" || id === "advance2" || id.startsWith("step")) return false;
  return Boolean(breakCardUpgrade(id));
}

function removeFirst(list: CardId[], id: CardId): CardId[] {
  const i = list.indexOf(id);
  if (i < 0) return list;
  const next = [...list];
  next.splice(i, 1);
  return next;
}

/** 两张同名合成一张换页（精）；再合成走下一级（绝，若表里有）。合成后费更高的是换页牌本身。 */
export function fuseOwnedCard<T extends LoadoutRun>(run: T, id: CardId): T {
  const up = breakCardUpgrade(id);
  if (!up || !climbCardFusable(id) || countCardCopies(run, id) < 2) return run;
  let left = 2;
  let stash = [...(run.stashCards ?? [])];
  while (left && stash.includes(id)) {
    stash = removeFirst(stash, id);
    left -= 1;
  }
  let next: T = { ...run, stashCards: stash };
  const hero = loadoutHero(next.school);
  const mates = new Set<CompanionId>([hero, ...(Object.keys(next.mateDecks ?? {}) as CompanionId[])]);
  for (const mate of mates) {
    while (left) {
      const deck = mateDeck(next, mate);
      if (!deck.includes(id)) break;
      next = withMateDeck(next, mate, removeFirst(deck, id));
      left -= 1;
    }
  }
  if (left) return run;
  const deck = mateDeck(next, hero);
  const { max } = deckBounds(next.stage);
  if (deck.length < max) return withMateDeck(next, hero, [...deck, up]);
  return { ...next, stashCards: [...(next.stashCards ?? []), up] };
}
