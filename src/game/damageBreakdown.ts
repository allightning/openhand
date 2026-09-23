import type { Battle, CardDef, TechniqueId } from "./types";
import { gearById, pathSkillMods } from "./weapons";
import { battleEquippedSchool } from "./equippedWeapon";
import { saberReachDamage } from "./rogueRoster";
import { LAB_ENTRANCE_BONUS, OFFBALANCE_MULT } from "./labV2Constants";
import { cardSchool, WEAPON_PACE } from "./party";
import { schoolTier, tierFx, resonancePaceBonus } from "./labResonance";
import { techBonus } from "./techRank";
import { comboAssistMods } from "./comboAssist";
import { labV2, type RunContext } from "./runContext";

export interface BreakdownPart {
  label: string;
  n: number;
}

function hasTech(b: Battle, id: TechniqueId): boolean {
  return b.techniques.includes(id);
}

function add(parts: BreakdownPart[], label: string, n: number): void {
  if (!n) return;
  parts.push({ label, n });
}

function youPaceNow(b: Battle, ctx: RunContext): number {
  const school = battleEquippedSchool(b, b.active);
  const res = labV2(ctx) ? resonancePaceBonus(b) : 0;
  return Math.max(1, WEAPON_PACE[school] + res + (b.paceBoost ?? 0) - (b.youSlow ?? 0));
}

export function damageBreakdown(
  b: Battle,
  def: CardDef,
  ctx: RunContext,
): { parts: BreakdownPart[]; riders: string[]; total: number } {
  const parts: BreakdownPart[] = [];
  const riders: string[] = [];
  if (def.type !== "attack") {
    if (def.block) parts.push({ label: "牌面", n: def.block });
    return { parts, riders, total: parts.reduce((s, p) => s + p.n, 0) };
  }
  const dist = Math.abs(b.player.pos - b.enemy.pos);
  const adj = dist === 1;
  const caps = ctx.caps.breakdown;
  const table = ctx.lab ? saberReachDamage(def.id, dist) : null;
  const face = table ?? (def.damage ?? 0);
  add(parts, "牌面", face);
  add(parts, "蓄劲", b.nextDamage);
  if ((b.expose ?? 0) > 0 && caps.exposeBeforeBlock) add(parts, "破绽", caps.exposeBeforeBlock);
  if (b.youSway > 0 || (b.youUnseat ?? 0) > 0) add(parts, "乱步", -2);
  if ((b.foeSway ?? 0) > 0 || (b.foeUnseat ?? 0) > 0) add(parts, "他失位", 3);

  let sub = parts.reduce((s, p) => s + p.n, 0);
  if (labV2(ctx) && (b.v2OffBalance ?? 0) > 0) {
    const next = Math.ceil(sub * OFFBALANCE_MULT);
    add(parts, "失衡", next - sub);
    sub = next;
  }

  if (labV2(ctx) && def.type === "attack" && b.labEntranceActive && !b.labEntranceUsed) {
    add(parts, "登场", LAB_ENTRANCE_BONUS);
  }
  if (labV2(ctx) && (b.labChaseMeleeBonus ?? 0) > 0 && dist <= 1) {
    add(parts, "追击", b.labChaseMeleeBonus!);
  }
  if (caps.swordChainPerLayer > 0 && battleEquippedSchool(b, b.active) === "sword") {
    const n = b.v2SwordChain ?? 0;
    if (n > 0) add(parts, "剑链", caps.swordChainPerLayer * n);
  }
  add(parts, "鏖战", b.v2GrudgeBonus ?? 0);
  const mul = ctx.tuning.playerDmgMul ?? 1;
  if (mul > 1 && labV2(ctx)) {
    const now = parts.reduce((s, p) => s + p.n, 0);
    add(parts, "倍率", Math.floor(now * mul) - now);
  }

  const cs = cardSchool(def.id);
  if (labV2(ctx) && cs !== "any") {
    const fx = tierFx(cs, schoolTier(b, cs));
    if (fx?.meleeBonus && adj) add(parts, "系贴身", fx.meleeBonus);
    if (fx?.rangeAttackBonus && dist >= 3) add(parts, "系远攻", fx.rangeAttackBonus);
  }
  if (labV2(ctx) && b.labSigMeleeBonus && adj) add(parts, "贴刃", b.labSigMeleeBonus);
  if (labV2(ctx) && b.labSigPullBuff) add(parts, "拉近加伤", 2);

  const school = battleEquippedSchool(b, b.active);
  if (school === "saber" && b.foeHitLastTurn && caps.saberOnHit) add(parts, "挨打加伤", caps.saberOnHit);
  if (hasTech(b, "saberGrudge") && b.foeHitLastTurn && caps.saberGrudge) {
    add(parts, "记仇", techBonus(b, "saberGrudge", 2));
  }
  if (school === "spear" && caps.spearStance) add(parts, dist >= 2 ? "远枪" : "贴枪", dist >= 2 ? 3 : -2);
  if (hasTech(b, "spearWind") && dist >= 3) add(parts, "枪风", techBonus(b, "spearWind", 3));
  if (school === "sword") {
    if (caps.swordAsMomentum) add(parts, "剑势", b.v2SwordChain ?? 0);
    else if (caps.swordBleedStack) add(parts, "创叠", Math.floor((b.bleed ?? 0) / 3));
  }
  if (hasTech(b, "swordRain") && (b.bleed ?? 0) >= 3) add(parts, "剑雨", techBonus(b, "swordRain", 3));
  if (school === "hook" && (b.foeDisarm ?? 0) > 0) {
    add(parts, "缴械", 3);
    if (caps.hookLifestealPct > 0) riders.push(`噬血 ${Math.round(caps.hookLifestealPct * 100)}%`);
  }
  if (b.active === "ananhuo" && dist >= 2) add(parts, "远打", 2);
  if (hasTech(b, "brightBlade") && adj && caps.brightBlade) {
    add(parts, "亮刀", techBonus(b, "brightBlade", 3));
  }

  if (labV2(ctx) && ctx.tuning.rulesCombo && b.labAssistActive && def.type === "attack") {
    const mods = comboAssistMods(battleEquippedSchool(b, b.labAssistActive), school);
    if (mods) {
      if (mods.meleeBonus && dist === 1) add(parts, "助战近", mods.meleeBonus);
      if (mods.rangeBonus && dist >= 2) add(parts, "助战远", mods.rangeBonus);
      if (mods.exposeBonus && (b.expose ?? 0) > 0) add(parts, "助战破", mods.exposeBonus);
    }
  }

  const youDmg = 1;
  if (youDmg !== 1) {
    const now = parts.reduce((s, p) => s + p.n, 0);
    add(parts, "难度", Math.max(1, Math.round(now * youDmg)) - now);
  }

  const g = gearById(b.labGearId);
  add(parts, "兵器", g?.damage ?? 0);
  const mods = pathSkillMods(g, {
    dist,
    combo: b.combo,
    paceAdvantage: youPaceNow(b, ctx) >= b.foePace,
    hasBlock: b.playerBlock > 0,
  });
  if (mods.damage) add(parts, mods.note ?? "兵路", mods.damage);
  add(parts, "同门", b.labAuraStrike ?? 0);
  const hits = (b.v2Turn?.attackHitsThisTurn ?? 0) + 1;
  if (g?.godSkill) {
    const sk = g.skill;
    if (!sk) add(parts, "神兵", 2);
    else if (sk === "palm-b" && (b.qi ?? 0) >= 2 && hits >= 3) add(parts, "叠浪", 4);
    else if (sk === "staff-b" && (b.foes ?? [b.enemy]).filter((f) => f.hp > 0).length > 1) add(parts, "千斤", 3);
    else if (sk === "saber-b" && youPaceNow(b, ctx) >= b.foePace) {
      riders.push("快刀抽 1 · 回 1 劲");
    } else if (sk === "spear-a") riders.push("锁喉封技");
    else if (sk === "spear-b" && (b.expose ?? 0) >= 3) riders.push("三封削手");
    else if (sk === "sword-a") riders.push("照影下张技能免费");
    else if (sk === "sword-b" && b.playerBlock > 0) riders.push("格反回 2 劲");
    else if (sk === "staff-a") riders.push("定桩 +2 格挡");
    else if (sk === "hook-a") riders.push("纤力回 2 劲");
    else if (sk === "hook-b" && (b.foeDisarm ?? 0) > 0) riders.push("缴兵抽 2");
    else if (sk === "palm-a") riders.push("连环震步 1");
  }

  if (def.bleed) riders.push(`裂创 +${def.bleed}${dist > 1 && (def.id === "cut" || def.id === "drawcut") ? "（须贴身）" : ""}`);
  if (def.knock) riders.push(`击退 ${def.knock}`);
  if (def.expose) riders.push(`破绽 +${def.expose}`);

  let total = parts.reduce((s, p) => s + p.n, 0);
  if (g?.skill === "saber-a" && dist <= 1 && (b.v2Turn?.attackHitsThisTurn ?? 0) + 1 >= 3 && total > 0) {
    add(parts, "破门", total);
    total *= 2;
  }
  if (b.enemyBlock > 0 && total > 0) {
    const blocked = Math.min(b.enemyBlock, total);
    add(parts, "他卸了", -blocked);
    total -= blocked;
  }
  if (caps.exposeThroughBlock && (b.expose ?? 0) > 0) {
    add(parts, "破绽穿挡", caps.exposeThroughBlock);
    total += caps.exposeThroughBlock;
  }
  if ((b.foeGift ?? 0) > 0) {
    add(parts, "送手", 4);
    total += 4;
  }
  return { parts, riders, total: Math.max(0, total) };
}

export function breakdownTipLine(b: Battle, def: CardDef, ctx: RunContext): string {
  const { inner, riders } = breakdownDisplay(b, def, ctx);
  if (!inner && !riders.length) return "";
  return riders.length ? `${inner} ${riders.join(" · ")}`.trim() : inner;
}

export function breakdownDisplay(b: Battle, def: CardDef, ctx: RunContext): { inner: string; riders: string[] } {
  const { parts, riders, total } = damageBreakdown(b, def, ctx);
  if (!parts.length && !riders.length) return { inner: "", riders };
  const body = parts.filter((p) => p.n).map((p) => `${p.n > 0 ? "+" : ""}${p.n} ${p.label}`).join(" ");
  const inner = parts.length ? `构成 ${total}：${body}` : "";
  return { inner, riders };
}

export function previewShortLine(notes: string[], legal: boolean, reason?: string, breakdown?: string, riderLine?: string): string {
  if (!legal) return reason ?? "现在不能打出";
  const skip = /血|第 \d+ 步|劲力/;
  const bits = notes.filter((n) => !skip.test(n)).slice(0, 2);
  const head = bits.join(" · ") || "打出";
  if (breakdown) {
    const after = riderLine?.trim() ? ` ${riderLine.trim()}` : "";
    return `${head}（${breakdown}）${after}`;
  }
  return head;
}
