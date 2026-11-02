import {
  CLIMB_BOND_BLEED_CAP,
  CLIMB_BOND_CHARGE,
  CLIMB_BOND_DISARM,
  CLIMB_BOND_EXPOSE,
  CLIMB_BOND_FAR,
  CLIMB_BOND_GRUDGE_QI,
  CLIMB_BOND_HEAL,
  CLIMB_BOND_HEAL_GROUP,
  CLIMB_BOND_LEECH,
  CLIMB_BOND_STAKE,
  CLIMB_BOND_SWORD,
  CLIMB_BOND_TEAR,
  CLIMB_BOND_WALL,
} from "./climbCaps";
import type { CompanionId } from "./types";

export type BondStage = "acquaint" | "road" | "life";

export interface PairBond {
  id: string;
  a: CompanionId;
  b: CompanionId;
  /** 生死段发融合牌。 */
  link: boolean;
  /** 初识效果。 */
  acquaint: "bleed" | "heal" | "stake" | "leech" | "far" | "sword" | "tear" | "wall";
}

export interface GroupBond {
  id: string;
  members: CompanionId[];
  /** 初识：至少 2 人同队。 */
  acquaint: "bleedCap" | "heal" | "expose" | "far" | "stake" | "disarm";
}

export interface GrudgeBond {
  id: string;
  a: CompanionId;
  b: CompanionId;
  acquaint: "qi" | "sword";
}

export const PAIR_BONDS: PairBond[] = [
  { id: "nightfrost", a: "watch", b: "lishuangxing", link: true, acquaint: "bleed" },
  { id: "warm", a: "baimenghe", b: "zhounuanxiang", link: false, acquaint: "heal" },
  { id: "gate", a: "shiwanshan", b: "zhangshoushan", link: true, acquaint: "stake" },
  { id: "silk", a: "moqiwan", b: "ouyangyingou", link: true, acquaint: "leech" },
  { id: "ruler", a: "huochangchuan", b: "gongsunsizhang", link: true, acquaint: "far" },
  { id: "year", a: "wenrensheng", b: "duguposui", link: true, acquaint: "sword" },
  { id: "splitblade", a: "boqing", b: "lvchifeng", link: true, acquaint: "tear" },
  { id: "shore", a: "fubishan", b: "ananhuo", link: true, acquaint: "wall" },
];

export const GROUP_BONDS: GroupBond[] = [
  { id: "saberhall", members: ["watch", "lvchifeng", "lishuangxing"], acquaint: "bleedCap" },
  { id: "palmspring", members: ["baimenghe", "zhounuanxiang", "fubishan"], acquaint: "heal" },
  { id: "swordloft", members: ["wenrensheng", "boqing", "duguposui"], acquaint: "expose" },
  { id: "spearline", members: ["huochangchuan", "ananhuo", "gongsunsizhang"], acquaint: "far" },
  { id: "stakegate", members: ["shiwanshan", "zhangshoushan", "fengtang"], acquaint: "stake" },
  { id: "hookline", members: ["moqiwan", "chenchenlan", "ouyangyingou"], acquaint: "disarm" },
];

export const GRUDGE_BONDS: GrudgeBond[] = [
  { id: "healerkill", a: "baimenghe", b: "lishuangxing", acquaint: "qi" },
  { id: "rival", a: "wenrensheng", b: "duguposui", acquaint: "sword" },
];

function hasBoth(party: readonly string[], a: string, b: string): boolean {
  return party.includes(a) && party.includes(b);
}

export function bondKey(a: string, b: string): string {
  return [a, b].sort().join("|");
}

export function stageOf(stages: Record<string, BondStage> | undefined, a: string, b: string): BondStage {
  return stages?.[bondKey(a, b)] ?? stages?.[a] ?? stages?.[b] ?? "acquaint";
}

export function groupStage(stages: Record<string, BondStage> | undefined, id: string): BondStage {
  return stages?.[id] ?? "acquaint";
}

/** 初识原数，同路 ×1.5 取整，生死 ×2。 */
export function bondScale(base: number, stage: BondStage): number {
  if (stage === "life") return base * 2;
  if (stage === "road") return Math.round(base * 1.5);
  return base;
}

function groupCount(party: readonly string[], id: string): number {
  const group = GROUP_BONDS.find((g) => g.id === id);
  if (!group) return 0;
  return group.members.filter((m) => party.includes(m)).length;
}

function pairActive(party: readonly string[], active: string, id: string): PairBond | null {
  const bond = PAIR_BONDS.find((b) => b.id === id);
  if (!bond || !pairTogether(party, bond)) return null;
  if (active !== bond.a && active !== bond.b) return null;
  return bond;
}

export function pairTogether(party: readonly string[], bond: PairBond): boolean {
  return hasBoth(party, bond.a, bond.b);
}

/** 生死段的连携缘分才发融合牌。 */
export function fuseForSwap(
  party: readonly string[],
  outId: string,
  inId: string,
  stages: Record<string, BondStage> | undefined,
): boolean {
  if (!party.includes(outId) || !party.includes(inId)) return false;
  const stage = stageOf(stages, outId, inId);
  if (stage !== "life") return false;
  return PAIR_BONDS.some((bond) => bond.link && hasBoth([outId, inId], bond.a, bond.b));
}

export function acquaintHeal(party: readonly string[], stages?: Record<string, BondStage>): number {
  let n = 0;
  const warm = PAIR_BONDS.find((b) => b.id === "warm");
  if (warm && pairTogether(party, warm)) n += bondScale(CLIMB_BOND_HEAL, stageOf(stages, warm.a, warm.b));
  if (groupCount(party, "palmspring") >= 2) n += bondScale(CLIMB_BOND_HEAL_GROUP, groupStage(stages, "palmspring"));
  return n;
}

export function stakeHitBonus(party: readonly string[], active: string, stages?: Record<string, BondStage>): number {
  const bond = pairActive(party, active, "gate");
  if (!bond) return 0;
  return bondScale(CLIMB_BOND_STAKE, stageOf(stages, bond.a, bond.b));
}

export function leechFlatBonus(party: readonly string[], active: string, stages?: Record<string, BondStage>): number {
  const bond = pairActive(party, active, "silk");
  if (!bond) return 0;
  return bondScale(CLIMB_BOND_LEECH, stageOf(stages, bond.a, bond.b));
}

export function farDamageBonus(party: readonly string[], active: string, stages?: Record<string, BondStage>): number {
  let n = 0;
  const ruler = pairActive(party, active, "ruler");
  if (ruler) n += bondScale(CLIMB_BOND_FAR, stageOf(stages, ruler.a, ruler.b));
  const line = GROUP_BONDS.find((g) => g.id === "spearline");
  if (line && groupCount(party, "spearline") >= 2 && line.members.includes(active as CompanionId)) {
    n += bondScale(CLIMB_BOND_FAR, groupStage(stages, "spearline"));
  }
  return n;
}

export function openingSword(party: readonly string[], active: string, stages?: Record<string, BondStage>): number {
  const bond = pairActive(party, active, "year");
  if (!bond) return 0;
  return bondScale(CLIMB_BOND_SWORD, stageOf(stages, bond.a, bond.b));
}

export function tearBlock(party: readonly string[], active: string, stages?: Record<string, BondStage>): number {
  const bond = pairActive(party, active, "splitblade");
  if (!bond) return 0;
  return bondScale(CLIMB_BOND_TEAR, stageOf(stages, bond.a, bond.b));
}

export function wallHeal(party: readonly string[], active: string, stages?: Record<string, BondStage>): number {
  const bond = pairActive(party, active, "shore");
  if (!bond) return 0;
  return bondScale(CLIMB_BOND_WALL, stageOf(stages, bond.a, bond.b));
}

export function exposePierceBonus(party: readonly string[], active: string, stages?: Record<string, BondStage>): number {
  const loft = GROUP_BONDS.find((g) => g.id === "swordloft");
  if (!loft || groupCount(party, "swordloft") < 2 || !loft.members.includes(active as CompanionId)) return 0;
  return bondScale(CLIMB_BOND_EXPOSE, groupStage(stages, "swordloft"));
}

export function chargeStackBonus(party: readonly string[], active: string, stages?: Record<string, BondStage>): number {
  const gate = GROUP_BONDS.find((g) => g.id === "stakegate");
  if (!gate || groupCount(party, "stakegate") < 2 || !gate.members.includes(active as CompanionId)) return 0;
  return bondScale(CLIMB_BOND_CHARGE, groupStage(stages, "stakegate"));
}

export function disarmExtra(party: readonly string[], active: string, stages?: Record<string, BondStage>): number {
  const line = GROUP_BONDS.find((g) => g.id === "hookline");
  if (!line || groupCount(party, "hookline") < 2 || !line.members.includes(active as CompanionId)) return 0;
  return bondScale(CLIMB_BOND_DISARM, groupStage(stages, "hookline"));
}

export function rivalSwordCut(party: readonly string[], active: string): number {
  const row = GRUDGE_BONDS.find((b) => b.id === "rival");
  if (!row || !hasBoth(party, row.a, row.b)) return 0;
  if (active !== row.a && active !== row.b) return 0;
  return bondScale(CLIMB_BOND_SWORD, "acquaint");
}

export function grudgeQi(party: readonly string[]): number {
  const row = GRUDGE_BONDS.find((b) => b.id === "healerkill");
  if (row && hasBoth(party, row.a, row.b)) return CLIMB_BOND_GRUDGE_QI;
  return 0;
}

export function bleedCapBonus(party: readonly string[]): number {
  const hall = GROUP_BONDS.find((g) => g.id === "saberhall");
  if (!hall) return 0;
  const n = hall.members.filter((id) => party.includes(id)).length;
  return n >= 2 ? CLIMB_BOND_BLEED_CAP : 0;
}

export function bleedStackBonus(party: readonly string[]): number {
  const row = PAIR_BONDS.find((b) => b.id === "nightfrost");
  return row && pairTogether(party, row) ? 1 : 0;
}
