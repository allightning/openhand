import type { GauntletRun } from "./rules/gauntletModel";
import { gauntletFieldMate, gauntletPorts } from "./rules/gauntletPorts";
import { breakStarterDeck } from "./rogueCards";
import type { WeaponId } from "./types";

/** 七系各一张。 */
export const OPEN_SCHOOLS: WeaponId[] = ["palm", "saber", "sword", "spear", "staff", "hook", "dart"];

/** 用这一局的随机数洗牌。同一颗种子，牌序相同。 */
export function dealOpenDeck(rng: () => number): WeaponId[] {
  const deck = [...OPEN_SCHOOLS];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const swap = deck[i]!;
    deck[i] = deck[j]!;
    deck[j] = swap;
  }
  return deck;
}

/** 选定一张：写入主角兵器和起手配方。 */
export function applyOpenPick(run: GauntletRun, index: number): GauntletRun {
  if (!(run.openFlipped ?? []).includes(index)) return run;
  const school = run.openDeck?.[index];
  if (!school) return { ...run, openPick: index };
  const mate = gauntletFieldMate(school);
  const weaponId = `${school}-a-${gauntletPorts().isBreakAlign() ? 1 : 3}`;
  const deckRecipe = breakStarterDeck(school);
  return {
    ...run,
    openPick: index,
    school,
    weaponId,
    deckRecipe,
    mateDecks: { ...run.mateDecks, [mate]: [...deckRecipe] },
    mateWeapons: { ...run.mateWeapons, [mate]: weaponId },
  };
}
