import { CARDS } from "./content";
import { battleEquippedSchool } from "./equippedWeapon";
import {
  assistBlockBonus,
  comboCardCostCut,
  isComboRulesEnabled,
} from "./labAssist";
import { isLabV2 } from "./labTuning";
import { MATES } from "./party";
import type { Battle, CardId, WeaponId } from "./types";

export const COMBO_CARD_BY_SCHOOL: Record<WeaponId, CardId> = {
  palm: "comboPalm",
  saber: "comboSaber",
  spear: "comboSpear",
  sword: "comboSword",
  staff: "comboStaff",
  hook: "comboHook",
};

export function isComboCard(id: CardId): boolean {
  return id.startsWith("combo") && Boolean(CARDS[id]?.requiresAssist);
}

export function comboCardSchool(id: CardId): WeaponId | null {
  if (id === "comboPalm") return "palm";
  if (id === "comboSaber") return "saber";
  if (id === "comboSpear") return "spear";
  if (id === "comboSword") return "sword";
  if (id === "comboStaff") return "staff";
  if (id === "comboHook") return "hook";
  return null;
}

export function comboPlayGate(b: Battle, defId: CardId): { ok: boolean; reason?: string } {
  if (!isComboCard(defId)) return { ok: true };
  if (!isComboRulesEnabled()) return { ok: false, reason: "组合技未开启" };
  const school = comboCardSchool(defId);
  if (!school) return { ok: false, reason: "未知组合卡" };
  // §31.12 助战与同行分家：v2 组合技看「后场活着的异系同行」，不再要助战在场。
  if (isLabV2()) {
    const mate = b.bench.find((m) => m.hp > 0 && battleEquippedSchool(b, m.id) === school);
    if (!mate) return { ok: false, reason: `需后场有${school}系同行（异系伙伴=组合技）` };
    return { ok: true };
  }
  if (!b.labAssistActive) return { ok: false, reason: "需助战在场" };
  const assistSchool = battleEquippedSchool(b, b.labAssistActive);
  if (assistSchool !== school) {
    return { ok: false, reason: `需${MATES[b.labAssistActive].name}（${school}系）助战` };
  }
  return { ok: true };
}

export function comboEffectiveCost(b: Battle, defId: CardId, base: number): number {
  if (!isLabV2() || !isComboCard(defId)) return base;
  return Math.max(0, base - comboCardCostCut(b, defId));
}

export function markComboCardPlayed(b: Battle, defId: CardId): void {
  if (!isComboCard(defId)) return;
  b.labComboCardPlayedThisTurn = true;
  b.labComboCardsPlayed = (b.labComboCardsPlayed ?? 0) + 1;
}

/** §16.4 同门合击效果 — 迁移自旧主动共鸣技。 */
export function comboCardNotes(b: Battle, defId: CardId): string[] {
  const notes: string[] = [];
  const school = comboCardSchool(defId);
  if (!school) return notes;
  // §31.12 v2：组合技挂后场同行；v1 旧制挂在场助战。
  const mateId = isLabV2()
    ? b.bench.find((m) => m.hp > 0 && battleEquippedSchool(b, m.id) === school)?.id
    : b.labAssistActive;
  if (!mateId) return notes;
  const mate = MATES[mateId].name;
  notes.push(`【合击·${CARDS[defId]?.name}】${b.player.name}+${mate}`);

  if (school === "palm") {
    const dist = Math.abs(b.player.pos - b.enemy.pos);
    if (dist >= 1 && b.enemy.pos > b.player.pos) b.enemy = { ...b.enemy, pos: b.enemy.pos - 1 };
    else if (dist >= 1 && b.enemy.pos < b.player.pos) b.enemy = { ...b.enemy, pos: b.enemy.pos + 1 };
    notes.push("合击伤 10，推 1 格");
  } else if (school === "saber") {
    notes.push(Math.abs(b.player.pos - b.enemy.pos) === 1 ? "合击伤 16（贴身）" : "合击伤 12");
  } else if (school === "spear") {
    b.expose += 2;
    notes.push("合击伤 11，破绽 +2");
  } else if (school === "sword") {
    b.youSlow = Math.max(b.youSlow, 1);
    notes.push("合击伤 9，封脉滞步");
  } else if (school === "staff") {
    b.playerBlock += 6 + assistBlockBonus(b, CARDS[defId]!);
    notes.push("合击伤 8，格挡 +6");
  } else {
    notes.push("合击伤 8，拉近 1");
  }
  return notes;
}

export function comboCardDamage(b: Battle, defId: CardId): number {
  const school = comboCardSchool(defId);
  if (school === "saber") return Math.abs(b.player.pos - b.enemy.pos) === 1 ? 16 : 12;
  if (school === "spear") return 11;
  if (school === "sword") return 9;
  if (school === "staff") return 8;
  if (school === "hook") return 8;
  return 10;
}

export function comboCardPull(b: Battle, defId: CardId): number {
  if (comboCardSchool(defId) !== "hook") return 0;
  if (Math.abs(b.player.pos - b.enemy.pos) <= 1) return 0;
  const toward = b.enemy.pos > b.player.pos ? -1 : 1;
  b.enemy = { ...b.enemy, pos: b.enemy.pos + toward };
  return 1;
}
