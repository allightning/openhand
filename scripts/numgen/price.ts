import type { CardDef } from "../../src/game/content/cards";
import { BAND, CHARGE_INTEREST, COIN, QI_TO_DMG, WALL_TRIGGER, ccDmg, fairForCost, moveDmg } from "./coins";

export type Line = { label: string; dmg: number };

export type Priced = {
  id: string;
  cost: number;
  school: string;
  kind: string;
  hooks: string[];
  values: Record<string, number>;
  text: string;
  lines: Line[];
  gross: number;
  discount: number;
  equiv: number;
  fair: number;
  delta: number;
  pct: number;
  band: "in" | "over" | "under";
  skip: string | null;
  generated: Record<string, number> | null;
};

const SCALE_KEYS = [
  "damage",
  "block",
  "heal",
  "wall",
  "chargeBonus",
  "bleed",
  "thorns",
  "expose",
  "energyNext",
  "nearBonus",
  "farBonus",
  "frail",
  "qiRegenSelf",
  "foeQiBurn",
  "foeMute",
  "foeDisarm",
  "foeHandTax",
  "foeNoBag",
  "pace",
  "regen",
  "retainAmt",
] as const;

function n(v: Record<string, number>, k: string): number {
  return typeof v[k] === "number" ? v[k]! : 0;
}

function drawCount(text: string): number {
  let total = 0;
  for (const m of text.matchAll(/抽\s*(\d+)/g)) total += Number(m[1]);
  return total;
}

function constructSkip(hooks: string[], id: string): string | null {
  if (hooks.includes("aura") || id.startsWith("aura")) return "构筑层·光环，不进牌面汇率";
  if (hooks.includes("fuse") || id.startsWith("fuse")) return "构筑层·连携，不进牌面汇率";
  if (hooks.includes("combo") && hooks.includes("assist")) return "构筑层·组合，不进牌面汇率";
  return null;
}

function riposteLines(text: string): Line[] {
  const lines: Line[] = [];
  const hit = text.match(/回敬\s*(\d+)/);
  if (hit) lines.push({ label: "反击伤", dmg: Number(hit[1]) * 0.6 });
  const blk = text.match(/挡\s*(\d+)/);
  if (blk) lines.push({ label: "反击挡", dmg: Number(blk[1]) * COIN.blockPer * 0.6 });
  const bleed = text.match(/叠\s*(\d+)\s*裂创/);
  if (bleed) lines.push({ label: "反击裂创", dmg: Number(bleed[1]) * COIN.stackDmg * 0.6 });
  const knock = text.match(/击退\s*(\d+)/);
  if (knock) lines.push({ label: "反击击退", dmg: moveDmg(Number(knock[1])) * 0.6 });
  if (!lines.length) lines.push({ label: "反击(估)", dmg: 4 });
  return lines;
}

export function priceCard(card: CardDef): Priced {
  const v = card.values;
  const hooks = card.effectHooks;
  const lines: Line[] = [];
  const add = (label: string, dmg: number) => {
    if (dmg) lines.push({ label, dmg });
  };

  add("伤", n(v, "damage") * COIN.dmg);
  add("近加成", n(v, "nearBonus") * COIN.dmg * 0.7);
  add("远加成", n(v, "farBonus") * COIN.dmg * 0.7);
  add("挡", n(v, "block") * COIN.blockPer);
  add("回血", n(v, "heal") * COIN.healPer);
  add("击退", moveDmg(n(v, "knock")));
  add("拉近", moveDmg(n(v, "pullEnemy")));
  add("位移", moveDmg(n(v, "steps")));
  add("撞墙期望", n(v, "wall") * COIN.dmg * WALL_TRIGGER);
  add("蓄劲", n(v, "chargeBonus") * COIN.dmg * (1 + CHARGE_INTEREST));
  add("裂创", n(v, "bleed") * COIN.stackDmg);
  add("破绽", n(v, "expose") * COIN.stackDmg);
  add("滞手", n(v, "frail") * COIN.stackDmg);
  add("铁布", n(v, "thorns") * COIN.dmg * 0.7);
  add("下回劲", n(v, "energyNext") * QI_TO_DMG);
  add("本场回劲", n(v, "qiRegenSelf") * QI_TO_DMG * 2);
  add("断敌劲", n(v, "foeQiBurn") * 1.75 * QI_TO_DMG);
  add("禁技", ccDmg(n(v, "foeMute")));
  add("缴械", ccDmg(n(v, "foeDisarm")));
  add("晕", ccDmg(n(v, "foeStun")));
  add("削手", n(v, "foeHandTax") * QI_TO_DMG);
  add("封囊", n(v, "foeNoBag") * 0.5 * QI_TO_DMG);
  add("先机", n(v, "pace") * COIN.paceTempQi * QI_TO_DMG);
  add("气脉", n(v, "flow") * COIN.stackDmg);
  add("铺势", n(v, "setupGain") * COIN.stackDmg);
  add("铺势消耗", -n(v, "setupCost") * COIN.stackDmg);
  add("连击消耗", -n(v, "comboCost") * COIN.stackDmg);
  add("气脉消耗", -n(v, "flowCost") * COIN.stackDmg);
  add("留挡", n(v, "retainAmt") * n(v, "retainTurns") * COIN.blockPer * 0.7);
  add("印", n(v, "mark") * COIN.stackDmg);
  add("再生", n(v, "regen") * n(v, "regenTurns") * COIN.healPer * 0.8);
  add("自伤", -n(v, "payHp") * COIN.healPer);
  add("减费", n(v, "costDiscountNext") * QI_TO_DMG);
  if (hooks.includes("plant") || n(v, "stake")) add("落桩", 3);
  if (hooks.includes("swap")) add("换位", 2);
  if (hooks.includes("clearBleed") || hooks.includes("clearSeal")) add("驱散", 3);
  if (hooks.includes("mirror")) add("卸力(估)", 8);
  if (hooks.includes("layer") || hooks.includes("weave") || hooks.includes("tide")) add("势技", 4);
  if (hooks.includes("riposte")) for (const line of riposteLines(card.text)) add(line.label, line.dmg);
  if (/势\s*\+1/.test(card.text) && !n(v, "setupGain") && !n(v, "flow")) add("势+1", COIN.stackDmg);
  add("抽", drawCount(card.text) * COIN.drawQi * QI_TO_DMG);

  const gross = lines.reduce((s, l) => s + l.dmg, 0);
  let discount = 0;
  const reasons: string[] = [];
  const cut = (label: string, frac: number) => {
    const d = gross * frac;
    if (d <= 0) return;
    discount += d;
    reasons.push(label);
  };
  if (hooks.includes("finisher")) cut("收势条件", 0.25);
  if (hooks.includes("plant")) cut("空格落桩", 0.15);
  if (hooks.includes("near") || hooks.includes("far")) cut("距离条件", 0.12);
  if (hooks.includes("variant")) cut("变式条件", 0.2);
  if (hooks.includes("ultimate")) cut("绝招前置", 0.35);
  if (hooks.includes("riposte")) cut("须挨打", 0.15);
  if (hooks.includes("step") && (card.id === "close" || card.id === "retreat" || card.id === "advance")) cut("路要空", 0.1);

  const skip = constructSkip(hooks, card.id);
  const equiv = skip ? gross : gross - discount;
  const fair = fairForCost(card.cost);
  const delta = equiv - fair;
  const pct = fair === 0 ? 0 : delta / fair;
  let band: Priced["band"] = "in";
  if (pct > BAND) band = "over";
  else if (pct < -BAND) band = "under";

  let generated: Record<string, number> | null = null;
  if (!skip && band === "in" && equiv > 0) {
    const scale = fair / equiv;
    const next: Record<string, number> = { ...v };
    for (const key of SCALE_KEYS) {
      if (!(key in v)) continue;
      const cur = v[key]!;
      if (cur === 0) continue;
      const signed = cur < 0;
      const mag = Math.max(1, Math.round(Math.abs(cur) * scale));
      next[key] = signed ? -mag : mag;
    }
    generated = next;
  }

  return {
    id: card.id,
    cost: card.cost,
    school: card.school,
    kind: card.kind,
    hooks,
    values: v,
    text: card.text,
    lines,
    gross: round1(gross),
    discount: round1(discount),
    equiv: round1(equiv),
    fair,
    delta: round1(delta),
    pct: round1(pct * 100) / 100,
    band,
    skip,
    generated,
  };
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

export function inBand(p: Priced): boolean {
  return !p.skip && p.band === "in";
}
