import { CLIMB_SHRED_BLOCK, CLIMB_SHRED_BLOCK_GATE, CLIMB_WINDOW_PAYOFF_BONUS, CLIMB_WINDOW_THINK_BONUS } from "../climbCaps";
import type { TechniqueDef as LegacyTechnique, TechniqueId } from "../types";
import { TECHNIQUES } from "./legacy";
import type { HookId, SchoolId, TechniqueKind } from "./hooks";
import { TECHNIQUE_KINDS, uniqueHooks } from "./hooks";
import { splitByContract, validateRow, type Hold } from "./validate";

/** 外功。cost 是投喂底档：未写档时 techRank 按 1。 */
export interface TechniqueDef {
  id: TechniqueId;
  cost: number;
  school: SchoolId;
  kind: TechniqueKind;
  effectHooks: HookId[];
  values: Record<string, number>;
  text: string;
}

const FACE: Record<TechniqueId, { hooks: readonly HookId[]; values: Record<string, number> }> = {
  longPush: { hooks: ["knock"], values: { knock: 1 } },
  backstep: { hooks: ["step"], values: {} },
  keepGuard: { hooks: ["block"], values: { block: 4 } },
  hardWall: { hooks: ["wall"], values: { wall: 12 } },
  brightBlade: { hooks: ["damage"], values: { damage: 3 } },
  bodyCheck: { hooks: ["damage", "step"], values: { damage: 6 } },
  heelStake: { hooks: ["plant"], values: { stake: 1 } },
  shortCharge: { hooks: ["step"], values: { step: 1 } },
  ghostStep: { hooks: ["step"], values: {} },
  trapWard: { hooks: ["ward"], values: {} },
  tether: { hooks: ["pull"], values: { pull: 1 } },
  closeCut: { hooks: ["damage"], values: {} },
  delayGuard: { hooks: ["block"], values: { block: 3 } },
  throne: { hooks: ["block"], values: { block: 4 } },
  nightStep: { hooks: ["block"], values: { block: 1 } },
  leftover: { hooks: ["energyNext"], values: { energyNext: 1 } },
  rebound: { hooks: ["thorns"], values: { thorns: 3 } },
  stackHand: { hooks: ["handCap"], values: { handCap: 1 } },
  ironPalm: { hooks: ["wall"], values: { wall: 6 } },
  softPalm: { hooks: ["block"], values: { block: 2 } },
  piercingPalm: { hooks: ["knock"], values: { knock: 1 } },
  saberGrudge: { hooks: ["damage"], values: { damage: 2 } },
  spearWind: { hooks: ["damage"], values: { damage: 3 } },
  longMarch: { hooks: ["step"], values: { step: 1 } },
  pikeBrace: { hooks: ["block"], values: { block: 2 } },
  swordRain: { hooks: ["damage", "bleed"], values: { damage: 3, bleed: 3 } },
  swordScreen: { hooks: ["block"], values: { block: 3 } },
  flowSword: { hooks: ["energyNext"], values: { energyNext: 1 } },
  stakeArmor: { hooks: ["block", "plant"], values: { block: 2, stake: 1 } },
  heavyStaff: { hooks: ["knock"], values: { knock: 1 } },
  barbedHook: { hooks: ["pull", "damage"], values: { damage: 3 } },
  hookVeil: { hooks: ["block", "disarm"], values: { block: 3 } },
  lieshi: { hooks: ["shredBlock"], values: { shredBlock: CLIMB_SHRED_BLOCK, shredGate: CLIMB_SHRED_BLOCK_GATE } },
  tingjin: { hooks: ["windowTime"], values: { windowTime: CLIMB_WINDOW_THINK_BONUS } },
  qiangbanzhao: { hooks: ["windowDamage"], values: { windowDamage: CLIMB_WINDOW_PAYOFF_BONUS } },
};

export function projectTechnique(def: LegacyTechnique): TechniqueDef {
  const face = FACE[def.id];
  return {
    id: def.id,
    cost: 1,
    school: def.school ?? "any",
    kind: "technique",
    effectHooks: uniqueHooks(face.hooks),
    values: { ...face.values },
    text: def.text,
  };
}

function techniqueProblems(row: TechniqueDef): string[] {
  return validateRow(row, { kinds: TECHNIQUE_KINDS, requireDigit: false });
}

const split = splitByContract(Object.values(TECHNIQUES).map(projectTechnique), techniqueProblems);

export const TECHNIQUE_REGISTRY: Readonly<Record<string, TechniqueDef>> = split.registry;
export const TECHNIQUE_HOLDS: readonly Hold<TechniqueDef>[] = split.holds;
