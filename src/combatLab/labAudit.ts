import { battleEquippedSchool } from "../game/equippedWeapon";
import { computeResonance } from "../game/labResonance";
import { MATES } from "../game/party";
import type { Battle } from "../game/types";
import type { LabPreset, LabTelemetry } from "./types";

/** §24 死穴审计 — 开战快照（WI-9 / 批次二埋点清单）。 */
export function initLabAuditFromPreset(b: Battle, preset: LabPreset): Battle {
  let secondaryEquipped = 0;
  for (const id of preset.party) {
    const school = battleEquippedSchool(b, id);
    if (school === MATES[id].secondFamily) secondaryEquipped += 1;
  }
  const res = computeResonance(b);
  return {
    ...b,
    v2SecondaryWeaponEquip: secondaryEquipped,
    v2OpeningHp: b.player.hp,
    v2PartyComposition: res.composition,
    v2HundredFlowers: res.hundredFlowers,
    v2ResonanceTierMax: Math.max(0, ...res.schools.map((s) => s.tier)),
    labAssistBanned: false,
    labAssistCalls: 0,
    labAssistDamage: 0,
    labDoubleHitCount: 0,
    v2UltGateAttempts: 0,
    v2UltGateBlocks: 0,
    v2VariantBranchA: 0,
    v2VariantBranchB: 0,
    v2VariantBranchNone: 0,
    v2ItemUses: 0,
    v2QiTurnSamples: 0,
    v2QiTurnSum: 0,
  };
}

export function sampleQiTurn(b: Battle): void {
  if (b.qi == null) return;
  b.v2QiTurnSamples = (b.v2QiTurnSamples ?? 0) + 1;
  b.v2QiTurnSum = (b.v2QiTurnSum ?? 0) + (b.qi ?? 0);
}

export function recordOpeningFoeDamage(b: Battle, beforeHp: number): void {
  if (b.v2OpeningDamageRecorded || !b.v2OpeningPaceBehind) return;
  const loss = Math.max(0, beforeHp - b.player.hp);
  if (loss > 0) {
    b.v2OpeningDamage = loss;
    b.v2OpeningDamageRecorded = true;
  }
}

export function snapshotAuditFromBattle(tel: LabTelemetry, b: Battle): LabTelemetry {
  const playerTurns = tel.turns.filter((t) => t.side === "player").length || 1;
  const qiMean =
    (b.v2QiTurnSum ?? tel.v2QiTurnSum ?? 0) / Math.max(1, b.v2QiTurnSamples ?? tel.v2QiTurnSamples ?? 1);
  const grudgeRate = Math.round(((tel.v2GrudgeTurns ?? 0) / playerTurns) * 100);
  const ultAttempts = b.v2UltGateAttempts ?? tel.v2UltGateAttempts ?? 0;
  const ultBlocks = b.v2UltGateBlocks ?? tel.v2UltGateBlocks ?? 0;
  const ultBlockRate = ultAttempts > 0 ? Math.round((ultBlocks / ultAttempts) * 100) : 0;
  const assistCalls = b.labAssistCalls ?? tel.v2AssistCalls ?? 0;
  const assistDmg = b.labAssistDamage ?? tel.v2AssistDamage ?? 0;
  const doubleHit = b.labDoubleHitCount ?? tel.v2DoubleHitCount ?? 0;
  const comboCards = b.labComboCardsPlayed ?? tel.v2ComboCardsPlayed ?? 0;
  const secondary = b.v2SecondaryWeaponEquip ?? tel.v2SecondaryEquipCount ?? 0;
  const openingDmg = b.v2OpeningDamage ?? tel.v2OpeningDamage ?? 0;
  const foeSegs = b.v2FoeSegments ?? tel.v2FoeSegments ?? 0;
  const playerActs = b.v2PlayerActions ?? tel.v2PlayerActions ?? 0;
  const actionRatio = playerActs > 0 ? Math.round((foeSegs / playerActs) * 100) / 100 : 0;
  const dmgSamples = b.v2TurnDamageSamples ?? tel.v2TurnDamageSamples ?? 0;
  const dmgSum = b.v2TurnDamageSum ?? tel.v2TurnDamageSum ?? 0;
  const avgTurnDmg = dmgSamples > 0 ? Math.round((dmgSum / dmgSamples) * 10) / 10 : 0;
  const stressBySource = b.v2StressBySource ?? tel.v2StressBySource;

  const composition = b.v2PartyComposition ?? tel.v2PartyComposition;
  const compCounts = { ...(tel.v2CompositionCounts ?? {}) };
  if (composition) compCounts[composition] = (compCounts[composition] ?? 0) + 1;

  return {
    ...tel,
    v2QiTurnSum: b.v2QiTurnSum ?? tel.v2QiTurnSum,
    v2QiTurnSamples: b.v2QiTurnSamples ?? tel.v2QiTurnSamples,
    v2QiMean: Math.round(qiMean * 10) / 10,
    v2GrudgeRatePct: grudgeRate,
    v2UltGateAttempts: ultAttempts,
    v2UltGateBlocks: ultBlocks,
    v2UltBlockRatePct: ultBlockRate,
    v2VariantBranchA: b.v2VariantBranchA ?? tel.v2VariantBranchA,
    v2VariantBranchB: b.v2VariantBranchB ?? tel.v2VariantBranchB,
    v2VariantBranchNone: b.v2VariantBranchNone ?? tel.v2VariantBranchNone,
    v2AssistCalls: assistCalls,
    v2AssistDamage: assistDmg,
    v2DoubleHitCount: doubleHit,
    v2ComboCardsPlayed: comboCards,
    v2SecondaryEquipCount: secondary,
    v2ItemUses: b.v2ItemUses ?? tel.v2ItemUses,
    v2OpeningDamage: openingDmg,
    v2OpeningPaceBehind: b.v2OpeningPaceBehind ?? tel.v2OpeningPaceBehind,
    v2PartyComposition: composition,
    v2ResonanceTierMax: b.v2ResonanceTierMax ?? tel.v2ResonanceTierMax,
    v2HundredFlowers: b.v2HundredFlowers ?? tel.v2HundredFlowers,
    v2SignatureUses: b.v2SignatureUses ?? tel.v2SignatureUses,
    v2CompositionCounts: compCounts,
    v2FieldSchoolDeckPct: b.v2FieldSchoolDeckPct ?? tel.v2FieldSchoolDeckPct,
    v2ComboUnlockPlays: b.v2ComboUnlockPlays ?? tel.v2ComboUnlockPlays,
    v2DeadHandTurns: b.v2DeadHandTurns ?? tel.v2DeadHandTurns,
    v2SwapCount: b.v2SwapCount ?? tel.v2SwapCount,
    v2FoeSegments: foeSegs,
    v2PlayerActions: playerActs,
    v2ActionRatio: actionRatio,
    v2AvgTurnDamage: avgTurnDmg,
    v2TurnDamageSum: dmgSum,
    v2TurnDamageSamples: dmgSamples,
    v2StressBySource: stressBySource,
  };
}
