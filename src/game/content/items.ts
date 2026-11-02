import { CLIMB_POISON_ITEM, CLIMB_POISON_MIND, CLIMB_POISON_TECH } from "../climbCaps";
import { LAB_ITEM_TIP } from "../labV21Constants";
import type { LabItemId } from "../types";
import type { HookId, ItemKind, SchoolId } from "./hooks";
import { ITEM_KINDS, uniqueHooks } from "./hooks";
import { splitByContract, validateRow, type Hold } from "./validate";

/** 道具。cost 记 1：一颗一颗用。数字来自 labV21Constants，不另造。 */
export interface ItemDef {
  id: LabItemId;
  cost: number;
  school: SchoolId;
  kind: ItemKind;
  effectHooks: HookId[];
  values: Record<string, number>;
  text: string;
}

const ROWS: ItemDef[] = [
  {
    id: "jinchuang",
    cost: 1,
    school: "any",
    kind: "item",
    effectHooks: uniqueHooks(["heal"]),
    values: { healPct: 32 },
    text: LAB_ITEM_TIP.jinchuang!,
  },
  {
    id: "xiujian",
    cost: 1,
    school: "any",
    kind: "item",
    effectHooks: uniqueHooks(["damage"]),
    values: { damage: 8 },
    text: LAB_ITEM_TIP.xiujian!,
  },
  {
    id: "huiqi",
    cost: 1,
    school: "any",
    kind: "item",
    effectHooks: uniqueHooks(["qiRegen"]),
    values: { qiClimb: 4, qiBreak: 6 },
    text: LAB_ITEM_TIP.huiqi!,
  },
  {
    id: "lianhuan",
    cost: 1,
    school: "any",
    kind: "item",
    effectHooks: uniqueHooks(["combo"]),
    values: { combo: 1 },
    text: LAB_ITEM_TIP.lianhuan!,
  },
  {
    id: "pojin",
    cost: 1,
    school: "any",
    kind: "item",
    effectHooks: uniqueHooks(["ultimate"]),
    values: { turns: 1 },
    text: `${LAB_ITEM_TIP.pojin}（1 回合）。`,
  },
  {
    id: "deathSquad",
    cost: 1,
    school: "any",
    kind: "item",
    effectHooks: uniqueHooks(["damage"]),
    values: { damage: 8 },
    text: LAB_ITEM_TIP.deathSquad!,
  },
  {
    id: "cuandu",
    cost: 1,
    school: "any",
    kind: "item",
    effectHooks: uniqueHooks(["poison"]),
    values: { price: CLIMB_POISON_ITEM },
    text: `淬毒。标价 ${CLIMB_POISON_ITEM}。`,
  },
  {
    id: "dujing",
    cost: 1,
    school: "any",
    kind: "item",
    effectHooks: uniqueHooks(["poison"]),
    values: { price: CLIMB_POISON_MIND },
    text: `毒经。标价 ${CLIMB_POISON_MIND}。`,
  },
  {
    id: "dugong",
    cost: 1,
    school: "any",
    kind: "item",
    effectHooks: uniqueHooks(["poison"]),
    values: { price: CLIMB_POISON_TECH },
    text: `毒功。标价 ${CLIMB_POISON_TECH}。`,
  },
];

const split = splitByContract(ROWS, (row) => validateRow(row, { kinds: ITEM_KINDS, requireDigit: true }));

export const ITEM_REGISTRY: Readonly<Record<string, ItemDef>> = split.registry;
export const ITEM_HOLDS: readonly Hold<ItemDef>[] = split.holds;
