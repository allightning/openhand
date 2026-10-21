import { LAB_ITEM_TIP } from "../labV21Constants";
import { SUMMON_DEFS } from "../labSummon";
import type { LabItemId } from "../types";
import type { CharmKind, HookId, SchoolId } from "./hooks";
import { CHARM_KINDS, uniqueHooks } from "./hooks";
import { splitByContract, validateRow, type Hold } from "./validate";

/** 助战符。cost 记 1：一张符用一次。 */
export interface CharmDef {
  id: LabItemId;
  cost: number;
  school: SchoolId;
  kind: CharmKind;
  effectHooks: HookId[];
  values: Record<string, number>;
  text: string;
}

const FACE: Record<
  string,
  { hooks: HookId[]; values: Record<string, number> }
> = {
  palm: { hooks: ["summon"], values: { hpBase: 12 } },
  saber: { hooks: ["summon", "expose"], values: { hpBase: 8, expose: 2 } },
  sword: { hooks: ["summon", "bleed"], values: { hpBase: 8, bleed: 3 } },
  spear: { hooks: ["summon", "knock"], values: { hpBase: 8, knock: 1 } },
  staff: { hooks: ["summon", "stun"], values: { hpBase: 10, foeStun: 1 } },
  hook: { hooks: ["summon", "disarm"], values: { hpBase: 8, foeDisarm: 2 } },
};

function projectCharm(school: string): CharmDef {
  const def = SUMMON_DEFS[school as keyof typeof SUMMON_DEFS];
  const face = FACE[school]!;
  const tip = LAB_ITEM_TIP[def.item] ?? def.tip;
  return {
    id: def.item,
    cost: 1,
    school: def.school,
    kind: "charm",
    effectHooks: uniqueHooks(face.hooks),
    values: face.values,
    text: `${tip}。气血底 ${face.values.hpBase}。`,
  };
}

const split = splitByContract(
  Object.keys(SUMMON_DEFS).map(projectCharm),
  (row) => validateRow(row, { kinds: CHARM_KINDS, requireDigit: true }),
);

export const CHARM_REGISTRY: Readonly<Record<string, CharmDef>> = split.registry;
export const CHARM_HOLDS: readonly Hold<CharmDef>[] = split.holds;
