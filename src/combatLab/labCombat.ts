import { isLabMode, isLabV2, getLabTuning } from "../game/labTuning";
import { isLabV21 } from "../game/labV21";
import { MATES } from "../game/party";
import type { Battle, CompanionId, WeaponId } from "../game/types";
import { cloneBattle, canPlay, canSwap, swapFighter, livingFoes, rebindMindStats } from "../game/sim";
import { addQi, pushFx } from "../game/labV2";
import { LAB_RESONANCE_COST, LAB_SWAP_COST } from "./rules";

export interface ResonanceDef {
  name: string;
  text: string;
  cost: number;
}

export const LAB_RESONANCE: Record<WeaponId, ResonanceDef> = {
  palm: { name: "双掌合击", text: "场+后场拳掌共鸣：伤 10，推 1 格。", cost: LAB_RESONANCE_COST },
  saber: { name: "双刀交剪", text: "场+后场刀共鸣：伤 12，贴身再 +4。", cost: LAB_RESONANCE_COST },
  spear: { name: "枪棍齐戳", text: "场+后场枪共鸣：伤 11，破绽 +2。", cost: LAB_RESONANCE_COST },
  sword: { name: "双剑映月", text: "场+后场剑共鸣：伤 9，封脉滞步 1。", cost: LAB_RESONANCE_COST },
  staff: { name: "桩棍齐扫", text: "场+后场棍共鸣：伤 8，格挡 +6。", cost: LAB_RESONANCE_COST },
  hook: { name: "钩索齐发", text: "场+后场钩共鸣：拉近 1，伤 8。", cost: LAB_RESONANCE_COST },
};

function note(b: Battle, text: string): Battle {
  return { ...b, log: [...b.log, text], journal: [...b.journal, { side: "you", text }] };
}

export function labSwapCost(): number {
  return LAB_SWAP_COST;
}

export function labCanPlay(b: Battle, uid: string): { ok: boolean; reason?: string } {
  return canPlay(b, uid);
}

export function labCanSwap(b: Battle, id: CompanionId): { ok: boolean; reason?: string } {
  if (!isLabMode()) return canSwap(b, id);
  if (b.phase !== "player") return { ok: false, reason: "现在不是你的回合" };
  if (id === b.active) return { ok: false, reason: "已经在场上" };
  if (b.swappedThisTurn) return { ok: false, reason: "这一息已经换过人" };
  if (b.energy < labSwapCost()) return { ok: false, reason: `换人需 ${labSwapCost()} 劲力` };
  if (!b.bench.some((m) => m.id === id)) return { ok: false, reason: "在后场槽" };
  return { ok: true };
}

export function labSwapFighter(b: Battle, id: CompanionId): Battle {
  if (!isLabMode()) return swapFighter(b, id);
  const gate = labCanSwap(b, id);
  if (!gate.ok) return b;
  const prevActive = b.active;
  let next = swapFighter(b, id);
  const cost = labSwapCost();
  if (next.labMateTechs?.[id]?.length) {
    next = { ...next, techniques: [...next.labMateTechs[id]!] };
  }
  next = cloneBattle(next);
  rebindMindStats(next, prevActive);
  if (next.energy > 0) {
    next = { ...next, energy: Math.max(0, next.energy - Math.max(0, cost - 1)) };
  }
  next.v2SwapCount = (next.v2SwapCount ?? 0) + 1;
  if (isLabV2()) {
    next = note(next, `${MATES[id].name}换上场，消耗 ${cost} 劲 —— 登场势就绪`);
    return { ...next, labEntranceActive: true, labEntranceUsed: false, labResonanceTurn: false };
  }
  next = note(next, `${MATES[id].name}换上场，消耗 ${cost} 劲 —— 落后一回合（抢先类可破例）`);
  return { ...next, labFreshSwap: true, labResonanceTurn: false };
}

export function labResonanceTargets(b: Battle): CompanionId[] {
  if (isLabV21()) return [];
  if (!isLabMode() || b.phase !== "player") return [];
  const school = MATES[b.active].weapon;
  return b.bench.filter((m) => MATES[m.id].weapon === school).map((m) => m.id);
}

export function labCanResonance(b: Battle, benchId: CompanionId): { ok: boolean; reason?: string } {
  if (isLabV21()) return { ok: false, reason: "v2.1 共鸣已改为构成光环" };
  if (!isLabMode()) return { ok: false, reason: "仅踢馆" };
  if (b.phase !== "player") return { ok: false, reason: "不是你的回合" };
  if (!isLabV2() && b.labFreshSwap) return { ok: false, reason: "刚换上场，不能共鸣" };
  if (b.labResonanceTurn) return { ok: false, reason: "本回合已共鸣" };
  if (!b.bench.some((m) => m.id === benchId)) return { ok: false, reason: "目标不在后场" };
  const school = MATES[b.active].weapon;
  if (MATES[benchId].weapon !== school) return { ok: false, reason: "须同武器系方可共鸣" };
  const def = LAB_RESONANCE[school];
  if (b.energy < def.cost) return { ok: false, reason: `共鸣需 ${def.cost} 劲力` };
  return { ok: true };
}

function hitFoe(b: Battle, dmg: number): Battle {
  const foe = livingFoes(b)[0];
  if (!foe) return b;
  const next = cloneBattle(b);
  const unit = next.foes.find((f) => f.id === foe.id) ?? next.enemy;
  unit.hp = Math.max(0, unit.hp - dmg);
  if (unit.id === next.enemy.id) next.enemy = { ...unit };
  next.foes = next.foes.map((f) => (f.id === unit.id ? { ...unit } : f));
  return next;
}

export function labResonance(b: Battle, benchId: CompanionId): Battle {
  const gate = labCanResonance(b, benchId);
  if (!gate.ok) return b;
  const school = MATES[b.active].weapon;
  const def = LAB_RESONANCE[school];
  let next = cloneBattle(b);
  next.energy -= def.cost;
  next.labResonanceTurn = true;
  next.v2ResonanceCount = (next.v2ResonanceCount ?? 0) + 1;
  if (isLabV2()) addQi(next, 1);
  if (getLabTuning().v2Fx) pushFx(next, "resonance");

  const mate = MATES[benchId].name;
  if (school === "palm") {
    const dist = Math.abs(next.player.pos - next.enemy.pos);
    if (dist >= 1 && next.enemy.pos > next.player.pos) next.enemy = { ...next.enemy, pos: next.enemy.pos - 1 };
    else if (dist >= 1 && next.enemy.pos < next.player.pos) next.enemy = { ...next.enemy, pos: next.enemy.pos + 1 };
    next = hitFoe(next, 10);
    next = note(next, `【${def.name}】${next.player.name}+${mate}：${def.text}`);
  } else if (school === "saber") {
    let dmg = 12;
    if (Math.abs(next.player.pos - next.enemy.pos) === 1) dmg += 4;
    next = hitFoe(next, dmg);
    next = note(next, `【${def.name}】${next.player.name}+${mate}：${def.text}`);
  } else if (school === "spear") {
    next.expose += 2;
    next = hitFoe(next, 11);
    next = note(next, `【${def.name}】${next.player.name}+${mate}：${def.text}`);
  } else if (school === "sword") {
    next.youSlow = Math.max(next.youSlow, 1);
    next = hitFoe(next, 9);
    next = note(next, `【${def.name}】${next.player.name}+${mate}：${def.text}`);
  } else if (school === "staff") {
    next.playerBlock += 6;
    next = hitFoe(next, 8);
    next = note(next, `【${def.name}】${next.player.name}+${mate}：${def.text}`);
  } else {
    const pull = 1;
    const toward = next.enemy.pos > next.player.pos ? -1 : 1;
    if (Math.abs(next.player.pos - next.enemy.pos) > 1) {
      next.enemy = { ...next.enemy, pos: next.enemy.pos + toward * pull };
    }
    next = hitFoe(next, 8);
    next = note(next, `【${def.name}】${next.player.name}+${mate}：${def.text}`);
  }
  syncFoes(next);
  return next;
}

function syncFoes(b: Battle): void {
  b.foes = b.foes.map((f) => (f.id === b.enemy.id ? { ...b.enemy } : f));
}
