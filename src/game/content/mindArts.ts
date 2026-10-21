import type { HeartDef as LegacyHeart, HeartId } from "../types";
import type { MindArtDef, MindArtId } from "../mindArts";
import { MIND_ARTS } from "../mindArts";
import { HEARTS } from "./legacy";
import type { HeartKind, HookId, MindKind, SchoolId } from "./hooks";
import { HEART_KINDS, MIND_KINDS } from "./hooks";
import { splitByContract, validateRow, type Hold } from "./validate";

/** 心法。cost 记 1：一份一份装，没有出牌费用。 */
export interface MindDef {
  id: MindArtId;
  cost: number;
  school: SchoolId;
  kind: MindKind;
  effectHooks: HookId[];
  values: Record<string, number>;
  text: string;
}

export interface HeartDef {
  id: HeartId;
  cost: number;
  school: SchoolId;
  kind: HeartKind;
  effectHooks: HookId[];
  values: Record<string, number>;
  text: string;
}

function projectMind(def: MindArtDef): MindDef {
  const values: Record<string, number> = {};
  if (def.hpMax) values.hpMax = def.hpMax;
  if (def.energyMax) values.energyMax = def.energyMax;
  if (def.turnHeal) values.turnHeal = def.turnHeal;
  if (def.turnEnergy) values.turnEnergy = def.turnEnergy;
  return {
    id: def.id,
    cost: 1,
    school: def.school ?? "any",
    kind: "mind",
    effectHooks: ["mind"],
    values,
    text: def.text,
  };
}

function projectHeart(def: LegacyHeart): HeartDef {
  return {
    id: def.id,
    cost: 1,
    school: "any",
    kind: "heart",
    effectHooks: ["heart"],
    values: {},
    text: def.text,
  };
}

const minds = splitByContract(
  Object.values(MIND_ARTS).map(projectMind),
  (row) => validateRow(row, { kinds: MIND_KINDS, requireDigit: false }),
);
const hearts = splitByContract(
  Object.values(HEARTS).map(projectHeart),
  (row) => validateRow(row, { kinds: HEART_KINDS, requireDigit: false }),
);

export const MIND_REGISTRY: Readonly<Record<string, MindDef>> = minds.registry;
export const MIND_HOLDS: readonly Hold<MindDef>[] = minds.holds;
export const HEART_REGISTRY: Readonly<Record<string, HeartDef>> = hearts.registry;
export const HEART_HOLDS: readonly Hold<HeartDef>[] = hearts.holds;
