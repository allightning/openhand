import { CLIMB_BOND_BLEED_CAP, CLIMB_BOND_GRUDGE_QI, CLIMB_BOND_HEAL } from "./climbCaps";
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
  return stages?.[bondKey(a, b)] ?? "acquaint";
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

export function acquaintHeal(party: readonly string[]): number {
  const warm = PAIR_BONDS.find((b) => b.id === "warm");
  if (warm && pairTogether(party, warm)) return CLIMB_BOND_HEAL;
  return 0;
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
