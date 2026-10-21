import { CLIMB_GUARD_WAGER } from "../climbCaps";
import { climbVitals } from "../climbVitals";
import { CARDS, ENEMIES, TECHNIQUES } from "../content";
import { cardDisplayText } from "../cardTextV2";
import { GAUNTLET_FOE_IDENTITY } from "../enemyKit";
import { MOVE_CARD_IDS } from "../intentWeakness";
import { grantLabItem } from "../labV21";
import { LAB_ITEM_LABEL } from "../labV21Constants";
import { ALL_MIND_ART_IDS, MIND_ARTS, mindArtFitsSchool } from "../mindArts";
import { cardSchool, MATES, WEAPON_NAME } from "../party";
import {
  breakCardUpgrade,
  SCHOOL_EXTRA_HIT,
  SCHOOL_EXTRA_STATUS,
  SCHOOL_EXTRA_STATUS2,
  SCHOOL_SCHOOL_STEP,
  SCHOOL_SUB_ATTACK,
  SCHOOL_ULTIMATE,
} from "../rogueCards";
import {
  breakStarterDeck,
  injectRogueBondCards,
  rogueCompanionTierForStage,
  rogueLeadId,
  rogueMate,
  rogueRosterByTier,
} from "../rogueRoster";
import { gearById, nextGrade } from "../weapons";
import type { CardId, CompanionId, LabItemId, TechniqueId } from "../types";
import type { MindArtId } from "../mindArts";
import { gauntletPorts } from "./gauntletPorts";
import type { GauntletLadderEntry, GauntletPath, GauntletRun } from "./gauntletModel";

export {
  ALL_MIND_ART_IDS,
  CARDS,
  CLIMB_GUARD_WAGER,
  ENEMIES,
  GAUNTLET_FOE_IDENTITY,
  LAB_ITEM_LABEL,
  MATES,
  MIND_ARTS,
  MOVE_CARD_IDS,
  SCHOOL_EXTRA_HIT,
  SCHOOL_EXTRA_STATUS,
  SCHOOL_EXTRA_STATUS2,
  SCHOOL_SCHOOL_STEP,
  SCHOOL_SUB_ATTACK,
  SCHOOL_ULTIMATE,
  TECHNIQUES,
  WEAPON_NAME,
  breakCardUpgrade,
  breakStarterDeck,
  cardDisplayText,
  cardSchool,
  climbVitals,
  gearById,
  grantLabItem,
  injectRogueBondCards,
  mindArtFitsSchool,
  nextGrade,
  rogueCompanionTierForStage,
  rogueLeadId,
  rogueMate,
  rogueRosterByTier,
};

export function isBreakAlign(): boolean {
  return gauntletPorts().isBreakAlign();
}

export function shellRunContext() {
  return gauntletPorts().runContext();
}

export function itemTip(id: LabItemId): string {
  return gauntletPorts().itemTip(id);
}

export function mindTip(id: MindArtId): string {
  return gauntletPorts().mindTip(id);
}

export function techniqueTip(id: TechniqueId): string {
  return gauntletPorts().techniqueTip(id);
}

export function grantCardToLoadout<T extends GauntletRun>(run: T, id: CardId): T {
  return gauntletPorts().grantCardToLoadout(run, id);
}

export function ownedCardIds(run: GauntletRun): Set<CardId> {
  return gauntletPorts().ownedCardIds(run);
}

export function replaceOwnedCard<T extends GauntletRun>(run: T, from: CardId, to: CardId): T {
  return gauntletPorts().replaceOwnedCard(run, from, to);
}

export function withMateDeck<T extends GauntletRun>(run: T, mate: CompanionId, deck: CardId[]): T {
  return gauntletPorts().withMateDeck(run, mate, deck);
}

export function climbTechSlotMax(stage: number): number {
  return gauntletPorts().climbTechSlotMax(stage);
}

export function pathLadder(path: GauntletPath): GauntletLadderEntry[] {
  return gauntletPorts().pathLadder(path);
}

export function getGauntletFinalStage(run?: { routeLength?: number }): number {
  return gauntletPorts().getGauntletFinalStage(run);
}

export function maxCompanions(stage?: number): number {
  return gauntletPorts().maxCompanions(stage);
}

export function expandDeckRecipe(recipe: CardId[], mul: number): CardId[] {
  return gauntletPorts().expandDeckRecipe(recipe, mul);
}

export function usesBanditStory(run: Pick<GauntletRun, "path" | "endless">): boolean {
  return gauntletPorts().usesBanditStory(run);
}
