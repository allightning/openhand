import type { MindArtId } from "../mindArts";
import { rogueLeadId } from "../rogueRoster";
import type { RunContext } from "../runContext";
import type { CardId, CompanionId, LabItemId, TechniqueId, WeaponId } from "../types";
import { GAUNTLET_SCHOOL_LOADOUT, type GauntletLadderEntry, type GauntletPath, type GauntletRun } from "./gauntletModel";

/** 壳层注入。规则函数不读 localStorage、不调 Math.random。 */
export interface GauntletPorts {
  isBreakAlign(): boolean;
  runContext(): RunContext;
  itemTip(id: LabItemId): string;
  mindTip(id: MindArtId): string;
  techniqueTip(id: TechniqueId): string;
  ownedCardIds(run: GauntletRun): Set<CardId>;
  climbTechSlotMax(stage: number): number;
  pathLadder(path: GauntletPath): GauntletLadderEntry[];
  getGauntletFinalStage(run?: { routeLength?: number }): number;
  maxCompanions(stage?: number): number;
  expandDeckRecipe(recipe: CardId[], mul: number): CardId[];
  usesBanditStory(run: Pick<GauntletRun, "path" | "endless">): boolean;
  rewardWeights: {
    tech: number;
    mind: number;
    item: number;
    aid: number;
    forge: number;
    upgrade: number;
    card?: number;
  };
  finalStage: number;
  midtermStage: number;
  grantCardToLoadout<T extends GauntletRun>(run: T, id: CardId): T;
  replaceOwnedCard<T extends GauntletRun>(run: T, from: CardId, to: CardId): T;
  withMateDeck<T extends GauntletRun>(run: T, mate: CompanionId, deck: CardId[]): T;
}

let ports: GauntletPorts | undefined;

export function installGauntletPorts(next: GauntletPorts): void {
  ports = next;
}

export function gauntletPorts(): GauntletPorts {
  if (!ports) throw new Error("gauntlet ports missing");
  return ports;
}

export function gauntletFieldMate(school: WeaponId): CompanionId {
  return gauntletPorts().isBreakAlign() ? rogueLeadId(school) : GAUNTLET_SCHOOL_LOADOUT[school].fieldMate;
}
