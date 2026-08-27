import { CARDS } from "./content";
import { isLabMode, isLabV2, getLabTuning } from "./labTuning";
import {
  DEFAULT_SIGNATURE_COOLDOWN,
  DEFAULT_SIGNATURE_USES,
  LAB_SIGNATURE,
  type SignatureDef,
} from "./labV25Constants";
import { battleEquippedSchool } from "./equippedWeapon";
import { WEAPON_PACE } from "./party";

import type { Battle, CompanionId } from "./types";

function paceLead(b: Battle): boolean {
  const pace = Math.max(1, WEAPON_PACE[battleEquippedSchool(b, b.active)] + (b.paceBoost ?? 0) - b.youSlow);
  return pace >= b.foePace;
}

function handCap(b: Battle): number {
  return Math.max(3, 5 - (b.youHandTax ?? 0));
}

export function signatureDef(mateId: CompanionId): SignatureDef {
  return LAB_SIGNATURE[mateId];
}

export function initSignatureBattle(b: Battle): void {
  if (!isLabV2()) return;
  const mode = getLabTuning().signatureLimitMode;
  b.labSigUsesLeft = mode === "perBattle" ? getLabTuning().signatureUsesPerBattle : DEFAULT_SIGNATURE_USES;
  b.labSigCooldownLeft = 0;
  b.labSigMeleeBonus = 0;
  b.labSigPullBuff = false;
}

export function canUseSignature(b: Battle): { ok: boolean; reason?: string } {
  if (!isLabMode() || !isLabV2()) return { ok: false, reason: "仅 Lab v2" };
  if (b.phase !== "player") return { ok: false, reason: "不是你的回合" };
  const mode = getLabTuning().signatureLimitMode;
  if (mode === "cooldown" && (b.labSigCooldownLeft ?? 0) > 0) {
    return { ok: false, reason: `冷却 ${b.labSigCooldownLeft} 回` };
  }
  if (mode === "perBattle" && (b.labSigUsesLeft ?? 0) <= 0) {
    return { ok: false, reason: "本场次数已尽" };
  }
  return { ok: true };
}

function adjacent(b: Battle): boolean {
  return Math.abs(b.player.pos - b.enemy.pos) === 1;
}

export function useSignature(b: Battle): { ok: boolean; reason?: string; battle?: Battle; notes: string[] } {
  const gate = canUseSignature(b);
  if (!gate.ok) return { ok: false, reason: gate.reason, notes: [] };
  const def = signatureDef(b.active);
  const next: Battle = {
    ...b,
    labSigUsesLeft: b.labSigUsesLeft,
    labSigCooldownLeft: b.labSigCooldownLeft,
    labSigMeleeBonus: 0,
    labSigPullBuff: b.labSigPullBuff,
    v2SignatureUses: (b.v2SignatureUses ?? 0) + 1,
  };
  const notes: string[] = [];
  const mode = getLabTuning().signatureLimitMode;
  if (mode === "perBattle") next.labSigUsesLeft = Math.max(0, (next.labSigUsesLeft ?? 0) - 1);
  else next.labSigCooldownLeft = getLabTuning().signatureCooldownTurns;

  switch (def.kind) {
    case "blockAfterKnock":
      next.playerBlock += def.amount ?? 2;
      notes.push(`格挡 +${def.amount ?? 2}（下推撞后生效）`);
      next.labSigKnockBlockPending = true;
      break;
    case "exposeWhenAdjacent":
      if (!adjacent(next)) return { ok: false, reason: "需贴身", notes: [] };
      next.expose += def.amount ?? 1;
      notes.push(`破绽 +${def.amount ?? 1}`);
      break;
    case "thornWhenBlock":
      if (next.playerBlock <= 0) return { ok: false, reason: "需有格挡", notes: [] };
      next.thorns += def.amount ?? 2;
      notes.push(`反震 +${def.amount ?? 2}`);
      break;
    case "startBlock":
      next.playerBlock += def.amount ?? 3;
      notes.push(`格挡 +${def.amount ?? 3}`);
      break;
    case "blockWhenFar":
      if (adjacent(next)) return { ok: false, reason: "需不贴身", notes: [] };
      next.playerBlock += def.amount ?? 2;
      notes.push(`格挡 +${def.amount ?? 2}`);
      break;
    case "drawOne": {
      const cap = handCap(next);
      if (next.drawPile.length === 0 && next.discardPile.length === 0) {
        return { ok: false, reason: "无牌可抽", notes: [] };
      }
      while (next.hand.length < cap && next.drawPile.length === 0 && next.discardPile.length > 0) {
        next.drawPile = [...next.discardPile];
        next.discardPile = [];
      }
      if (next.drawPile.length > 0) {
        const c = next.drawPile.shift()!;
        next.hand = [...next.hand, c];
        notes.push("抽 1");
      }
      break;
    }
    case "healIfNoAttack":
      if (next.attacksThisTurn > 0) return { ok: false, reason: "本回已出攻击", notes: [] };
      next.player = { ...next.player, hp: Math.min(next.player.maxHp, next.player.hp + (def.amount ?? 1)) };
      notes.push(`回 ${def.amount ?? 1}`);
      break;
    case "nextAttackAfterPull":
      next.labSigPullBuff = true;
      notes.push("下一掌 +2");
      break;
    case "blockWhenStake":
      if (!next.stakes.length) return { ok: false, reason: "场上无桩", notes: [] };
      next.playerBlock += def.amount ?? 2;
      notes.push(`格挡 +${def.amount ?? 2}`);
      break;
    case "attackWhenPaceLead":
      if (!paceLead(next)) return { ok: false, reason: "需先机领先", notes: [] };
      next.nextDamage += def.amount ?? 2;
      notes.push(`下攻 +${def.amount ?? 2}`);
      break;
    case "drawWhenExpose":
      if (next.expose < 2) return { ok: false, reason: "破绽≥2", notes: [] };
      if (next.drawPile.length > 0) {
        next.hand = [...next.hand, next.drawPile.shift()!];
        notes.push("抽 1");
      }
      break;
    case "blockWhenSkillInHand": {
      const hasSkill = next.hand.some((c) => CARDS[c.defId]?.type === "skill");
      if (!hasSkill) return { ok: false, reason: "手牌无技能", notes: [] };
      next.playerBlock += def.amount ?? 2;
      notes.push(`格挡 +${def.amount ?? 2}`);
      break;
    }
    case "meleeBonus":
      if (!adjacent(next)) return { ok: false, reason: "需贴身", notes: [] };
      next.labSigMeleeBonus = def.amount ?? 2;
      notes.push(`贴身攻 +${def.amount ?? 2}`);
      break;
    case "blockWhenQi":
      if ((next.qi ?? 0) < 1) return { ok: false, reason: "势≥1", notes: [] };
      next.playerBlock += def.amount ?? 2;
      notes.push(`格挡 +${def.amount ?? 2}`);
      break;
    case "heavyBlockSlowPace":
      next.playerBlock += def.amount ?? 4;
      next.paceBoost = (next.paceBoost ?? 0) - 1;
      notes.push(`格挡 +${def.amount ?? 4}，先机 -1`);
      break;
  }

  next.journal = [...next.journal, { side: "you", text: `${def.name}：${notes.join("，")}` }];
  // §31.10 签名技不再触发应激：签名技本身限次数，再惩罚等于把爽点变痛点（甲方实测定性为 bug）。
  return { ok: true, battle: next, notes };
}

export function tickSignatureCooldown(b: Battle): void {
  if ((b.labSigCooldownLeft ?? 0) > 0) b.labSigCooldownLeft! -= 1;
}
