import { battleEquippedSchool } from "./equippedWeapon";
import { isLabV2 } from "./labTuning";
import {
  AURA_DUO_START_QI,
  LAB_HUNDRED_FLOWERS,
  LAB_RESONANCE_LADDER,
  TIER_NAMES,
  type LadderTierFx,
  type PartyComposition,
  type ResonanceTier,
} from "./labV25Constants";
import type { Battle, CardId, WeaponId } from "./types";
import { cardSchool } from "./party";
import { addStake } from "./stake";
import { addQi } from "./labV2";

const TRIO_HEROES = ["rail", "seer", "sapper"] as const;
const ALL_SCHOOLS: WeaponId[] = ["palm", "saber", "sword", "spear", "staff", "hook"];

export interface SchoolResonanceChip {
  school: WeaponId;
  count: number;
  tier: ResonanceTier;
  tierName: string;
  toNext: number;
  activeLabel: string;
}

export interface ResonanceStatus {
  schools: SchoolResonanceChip[];
  hundredFlowers: boolean;
  duoHeroes: boolean;
  composition: PartyComposition;
  labels: string[];
  /** @deprecated v2.5 兼容 */
  school: WeaponId;
  basic: boolean;
  advanced: boolean;
}

export function teamSchoolCounts(b: Battle): Record<WeaponId, number> {
  const out: Partial<Record<WeaponId, number>> = {};
  for (const id of b.party ?? []) {
    const s = battleEquippedSchool(b, id);
    out[s] = (out[s] ?? 0) + 1;
  }
  return out as Record<WeaponId, number>;
}

export function countToTier(n: number): ResonanceTier {
  if (n >= 4) return 3;
  if (n >= 3) return 2;
  if (n >= 2) return 1;
  return 0;
}

export function tierFx(school: WeaponId, tier: ResonanceTier): LadderTierFx | null {
  if (tier === 0) return null;
  const row = LAB_RESONANCE_LADDER[school];
  return tier === 1 ? row.t1 : tier === 2 ? row.t2 : row.t3;
}

export function schoolTier(b: Battle, school: WeaponId): ResonanceTier {
  if (!isLabV2()) return 0;
  return countToTier(teamSchoolCounts(b)[school] ?? 0);
}

export function classifyPartyComposition(counts: number[]): PartyComposition {
  const sorted = [...counts].sort((a, b) => b - a);
  if (sorted[0] === 4) return "4same";
  if (sorted[0] === 3) return "3plus1";
  if (sorted[0] === 2 && sorted[1] === 2) return "2plus2";
  if (sorted.length === 4 && sorted.every((n) => n === 1)) return "allDiff";
  return "2plus1plus1";
}

export function computeResonance(b: Battle): ResonanceStatus {
  const counts = teamSchoolCounts(b);
  const schools: SchoolResonanceChip[] = ALL_SCHOOLS.map((school) => {
    const count = counts[school] ?? 0;
    const tier = countToTier(count);
    const fx = tierFx(school, tier);
    const toNext = tier >= 3 ? 0 : (tier === 0 ? 2 : tier === 1 ? 3 : 4) - count;
    const activeLabel = fx?.label ?? "";
    return {
      school,
      count,
      tier,
      tierName: TIER_NAMES[tier],
      toNext: Math.max(0, toNext),
      activeLabel,
    };
  }).filter((c) => c.count > 0);

  const equipped = (b.party ?? []).map((id) => battleEquippedSchool(b, id));
  const hundredFlowers = equipped.length === 4 && new Set(equipped).size === 4;
  const benchIds = b.bench?.map((m) => m.id) ?? [];
  const duoHeroes = TRIO_HEROES.filter((h) => benchIds.includes(h)).length >= 2;

  const composition = classifyPartyComposition(Object.values(counts));
  const labels: string[] = [];
  for (const chip of schools) {
    if (chip.tier === 0) continue;
    const next = chip.toNext > 0 ? ` · 距${TIER_NAMES[(chip.tier + 1) as ResonanceTier] ?? "下一档"} ×${chip.toNext}` : "";
    labels.push(
      `${schoolLabel(chip.school)} ${chip.count}/${chip.tier >= 3 ? 4 : chip.tier === 2 ? 4 : 3} · ${chip.tierName}已激活${next}`,
    );
  }
  if (hundredFlowers) labels.push("百花齐放");
  if (duoHeroes) labels.push("三主角同框");

  const fieldSchool = battleEquippedSchool(b, b.active);
  const maxTier = Math.max(0, ...schools.map((s) => s.tier));
  return {
    schools,
    hundredFlowers,
    duoHeroes,
    composition,
    labels,
    school: fieldSchool,
    basic: maxTier >= 1,
    advanced: maxTier >= 2,
  };
}

function schoolLabel(s: WeaponId): string {
  const names: Record<WeaponId, string> = {
    palm: "拳掌",
    saber: "刀",
    sword: "剑",
    spear: "枪",
    staff: "棍",
    hook: "钩",
  };
  return names[s];
}

/** 兼容旧名 */
export const computeAuras = computeResonance;

export function resonancePaceBonus(b: Battle): number {
  if (!isLabV2()) return 0;
  let bonus = 0;
  const spearFx = tierFx("spear", schoolTier(b, "spear"));
  if (spearFx?.paceBonus) bonus += spearFx.paceBonus;
  if (computeResonance(b).hundredFlowers) bonus += LAB_HUNDRED_FLOWERS.paceBonus;
  return bonus;
}

export function initResonanceBattle(b: Battle): void {
  if (!isLabV2()) return;
  const res = computeResonance(b);
  if (res.duoHeroes) addQi(b, AURA_DUO_START_QI);
  const swordFx = tierFx("sword", schoolTier(b, "sword"));
  if (swordFx?.startExpose) b.expose += swordFx.startExpose;
  const staffFx = tierFx("staff", schoolTier(b, "staff"));
  if (staffFx?.startBlock) b.playerBlock += staffFx.startBlock;
  if (staffFx?.startStake) {
    const spot = Math.min(BOARD_SIZE - 2, Math.max(0, b.player.pos + 1));
    if (!b.stakes.includes(spot) && spot < BOARD_SIZE - 1) addStake(b, spot, 2);
  }
  b.v2PartyComposition = res.composition;
  b.v2ResonanceTierMax = Math.max(0, ...res.schools.map((s) => s.tier));
  if (res.hundredFlowers) b.v2HundredFlowers = true;
}

const BOARD_SIZE = 7;

export function resonanceStrikeBonus(b: Battle, cardId: CardId, base: number, adjacent: boolean, dist: number): number {
  if (!isLabV2()) return 0;
  const cs = cardSchool(cardId);
  if (cs === "any") return 0;
  let bonus = 0;
  const fx = tierFx(cs, schoolTier(b, cs));
  if (fx?.meleeBonus && adjacent) bonus += fx.meleeBonus;
  if (fx?.rangeAttackBonus && dist >= 3) bonus += fx.rangeAttackBonus;
  if (b.labSigMeleeBonus && adjacent) bonus += b.labSigMeleeBonus;
  return bonus;
}

export function resonanceKnockBonus(b: Battle, cardId: CardId): number {
  if (!isLabV2()) return 0;
  const cs = cardSchool(cardId);
  if (cs !== "palm") return 0;
  return tierFx("palm", schoolTier(b, "palm"))?.knockBonus ?? 0;
}

export function resonanceWallCrashBonus(b: Battle, cardId: CardId): number {
  if (!isLabV2()) return 0;
  const cs = cardSchool(cardId);
  if (cs !== "palm") return 0;
  return tierFx("palm", schoolTier(b, "palm"))?.wallCrashBonus ?? 0;
}

export function resonancePullBonus(b: Battle, cardId: CardId): number {
  if (!isLabV2()) return 0;
  const cs = cardSchool(cardId);
  if (cs !== "hook") return 0;
  return tierFx("hook", schoolTier(b, "hook"))?.pullBonus ?? 0;
}

export function resonanceExtraQiOnGain(b: Battle, cardId: CardId): number {
  if (!isLabV2() || b.v2AuraQiBonusUsed) return 0;
  const cs = cardSchool(cardId);
  if (cs !== "sword") return 0;
  const fx = tierFx("sword", schoolTier(b, "sword"));
  if (!fx?.exposeCardQiBonus) return 0;
  const def = cardId.replace(/2$/, "");
  if (def === "expose" || def === "marking" || def === "pierce" || def === "swordMute") {
    b.v2AuraQiBonusUsed = true;
    return fx.exposeCardQiBonus;
  }
  return 0;
}

export function staffBlockRetain(b: Battle): boolean {
  return isLabV2() && Boolean(tierFx("staff", schoolTier(b, "staff"))?.blockRetainOnEndTurn);
}

export function resonanceChargeStepsCut(b: Battle): number {
  if (!isLabV2()) return 0;
  return tierFx("spear", schoolTier(b, "spear"))?.chargeStepsCut ?? 0;
}
