import { comboAssistMods } from "./comboAssist";
import { battleEquippedSchool } from "./equippedWeapon";
import { LAB_ASSIST_COST, LAB_HUNDRED_FLOWERS } from "./labV25Constants";
import { isLabMode, isLabV2, getLabTuning } from "./labTuning";
import { v2IncomingBonus } from "./labV2";
import { tryAppendStressIntent } from "./labEnemyStress";
import { MATES } from "./party";
import { livingFoes } from "./sim";
import type { Battle, CardDef, CardId, CompanionId } from "./types";
import { BOARD_SIZE } from "./types";

export { LAB_ASSIST_COST };

export function isComboRulesEnabled(): boolean {
  return isLabMode() && isLabV2() && getLabTuning().rulesCombo;
}

export function assistEnergyCost(b: Battle): number {
  let cost = LAB_ASSIST_COST;
  if (isComboRulesEnabled() && b.v2HundredFlowers) {
    cost = Math.max(1, cost - LAB_HUNDRED_FLOWERS.assistCostCut);
  }
  return cost;
}

function cellBlockedForAssist(b: Battle, pos: number): boolean {
  if (pos < 0 || pos >= BOARD_SIZE) return true;
  if (b.stakes.includes(pos)) return true;
  if (livingFoes(b).some((f) => f.pos === pos)) return true;
  return false;
}

/** §16.2 相邻格；靠壁取唯一可行侧。 */
export function pickAssistPos(b: Battle): number | null {
  const p = b.player.pos;
  const candidates: number[] = [];
  if (p > 0 && !cellBlockedForAssist(b, p - 1)) candidates.push(p - 1);
  if (p < BOARD_SIZE - 1 && !cellBlockedForAssist(b, p + 1)) candidates.push(p + 1);
  if (!candidates.length) return null;
  if (p === 0) return candidates.includes(1) ? 1 : null;
  if (p === BOARD_SIZE - 1) return candidates.includes(p - 1) ? p - 1 : null;
  return candidates[0] ?? null;
}

export function assistOccupies(b: Battle, pos: number): boolean {
  return isComboRulesEnabled() && b.labAssistActive != null && b.labAssistPos === pos;
}

/** §16.2 v2.3：助战 HP 归零 → 立即退回后场，本局禁止再助战。 */
export function retreatAssistIfDown(b: Battle): Battle {
  const id = b.labAssistActive;
  if (!id) return b;
  const bag = b.bench.find((m) => m.id === id);
  if (!bag || bag.hp > 0) return b;
  const name = MATES[id].name;
  return {
    ...b,
    labAssistActive: undefined,
    labAssistPos: undefined,
    labAssistBanned: true,
    journal: [...b.journal, { side: "you", text: `${name}助战倒地，退回后场；本局不可再助战。` }],
  };
}

export function canCallAssist(b: Battle, mateId?: CompanionId): { ok: boolean; reason?: string } {
  if (!isComboRulesEnabled()) return { ok: false, reason: "组合技未开启" };
  if (b.labAssistBanned) return { ok: false, reason: "本局助战已禁用" };
  if (b.labAssistActive) return { ok: false, reason: "已有助战在场" };
  if (b.labFreshSwap) return { ok: false, reason: "刚换上场，不可助战" };
  if (b.swappedThisTurn) return { ok: false, reason: "本回合已换人，不可助战" };
  if (b.labAssistCalledThisTurn) return { ok: false, reason: "本回合已叫过助战" };
  if (b.phase !== "player") return { ok: false, reason: "不是你的回合" };
  if (mateId === b.active) return { ok: false, reason: "不能叫自己助战" };
  if (mateId && !b.bench.some((m) => m.id === mateId)) return { ok: false, reason: "不在后场" };
  if (b.energy < assistEnergyCost(b)) return { ok: false, reason: `助战需 ${assistEnergyCost(b)} 劲力` };
  if (pickAssistPos(b) == null) return { ok: false, reason: "相邻格被占，无法上场" };
  return { ok: true };
}

export function assistTargets(b: Battle): CompanionId[] {
  if (!canCallAssist(b).ok) return [];
  return b.bench.map((m) => m.id);
}

export function recordAssistDamage(b: Battle, hpLoss: number): void {
  if (hpLoss <= 0 || !b.labAssistActive) return;
  b.labAssistDamage = (b.labAssistDamage ?? 0) + hpLoss;
}

export function hitAssist(b: Battle, raw: number, verb: string): void {
  if (!isComboRulesEnabled() || !b.labAssistActive) return;
  const id = b.labAssistActive;
  const bag = b.bench.find((m) => m.id === id);
  if (!bag) return;
  const incoming = Math.max(1, v2IncomingBonus(raw, b));
  bag.hp = Math.max(0, bag.hp - incoming);
  recordAssistDamage(b, incoming);
  b.labFoeTurnAssistHit = true;
  b.log.push(`${MATES[id].name}${verb}${incoming}（助战承伤 ${bag.hp}/${bag.maxHp}）`);
  b.journal.push({ side: "foe", text: `${MATES[id].name}助战受 ${incoming}。` });
  retreatAssistIfDown(b);
}

/** 下一玩家回合开始时助战退回后场（§16.2）。 */
export function dismissAssistAtTurnStart(b: Battle): void {
  if (!b.labAssistActive) return;
  const id = b.labAssistActive;
  const name = MATES[id].name;
  b.labAssistActive = undefined;
  b.labAssistPos = undefined;
  b.log.push(`${name}助战退回后场。`);
}

export function callAssist(b: Battle, mateId: CompanionId): Battle {
  const gate = canCallAssist(b, mateId);
  if (!gate.ok) return b;
  const pos = pickAssistPos(b);
  if (pos == null) return b;
  const cost = assistEnergyCost(b);
  const name = MATES[mateId].name;
  const out: Battle = {
    ...b,
    energy: b.energy - cost,
    labAssistActive: mateId,
    labAssistPos: pos,
    labAssistCalls: (b.labAssistCalls ?? 0) + 1,
    labAssistCalledThisTurn: true,
    log: [...b.log, `${name}助战上场（第 ${pos + 1} 步），耗 ${cost} 劲。`],
    journal: [...b.journal, { side: "you", text: `${name}助战占第 ${pos + 1} 步。` }],
  };
  tryAppendStressIntent(out, "assist");
  return out;
}

/** §16.3 跨系助战属性附加（仅攻击类牌）。 */
export function assistAttackBonus(b: Battle, def: CardDef, base: number, dist: number): number {
  if (!isComboRulesEnabled() || !b.labAssistActive || def.type !== "attack") return base;
  const assistId = b.labAssistActive;
  const assistSchool = battleEquippedSchool(b, assistId);
  const fieldSchool = battleEquippedSchool(b, b.active);
  const mods = comboAssistMods(assistSchool, fieldSchool);
  if (!mods) return base;
  let dmg = base;
  if (mods.meleeBonus && dist === 1) dmg += mods.meleeBonus;
  if (mods.rangeBonus && dist >= 2) dmg += mods.rangeBonus;
  if (mods.exposeBonus && b.expose > 0) dmg += mods.exposeBonus;
  return dmg;
}

export function assistBlockBonus(b: Battle, def: CardDef): number {
  if (!isComboRulesEnabled() || !b.labAssistActive || def.type !== "attack") return 0;
  const mods = comboAssistMods(
    battleEquippedSchool(b, b.labAssistActive),
    battleEquippedSchool(b, b.active),
  );
  return mods?.blockBonus ?? 0;
}

export function assistPullAfterHit(b: Battle, def: CardDef, hit: boolean): number {
  if (!hit || !isComboRulesEnabled() || !b.labAssistActive || def.type !== "attack") return 0;
  const mods = comboAssistMods(
    battleEquippedSchool(b, b.labAssistActive),
    battleEquippedSchool(b, b.active),
  );
  return mods?.pullAfterHit ?? 0;
}

export function assistKnockBonus(b: Battle, def: CardDef): number {
  if (!isComboRulesEnabled() || !b.labAssistActive || def.type !== "attack") return 0;
  const mods = comboAssistMods(
    battleEquippedSchool(b, b.labAssistActive),
    battleEquippedSchool(b, b.active),
  );
  return mods?.knockBonus ?? 0;
}

export function syncDoubleHitTelemetry(b: Battle): void {
  if (b.labFoeTurnPlayerHit && b.labFoeTurnAssistHit) {
    b.labDoubleHitCount = (b.labDoubleHitCount ?? 0) + 1;
  }
  b.labFoeTurnPlayerHit = false;
  b.labFoeTurnAssistHit = false;
}

/** 组合卡耗劲减免（§17.3 百花 · 首张组合卡 -1 劲）。 */
export function comboCardCostCut(b: Battle, defId: CardId): number {
  if (!isComboRulesEnabled() || !b.v2HundredFlowers || b.labComboCardPlayedThisTurn) return 0;
  if (!defId.startsWith("combo")) return 0;
  return LAB_HUNDRED_FLOWERS.firstComboCardCostCut;
}
