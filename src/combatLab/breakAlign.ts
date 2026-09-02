import type { TechniqueId, LabItemId } from "../game/types";
import type { MindArtId } from "../game/mindArts";
import { TECHNIQUES } from "../game/content";
import { MIND_ARTS } from "../game/mindArts";
import { LAB_ITEM_LABEL, LAB_ITEM_TIP } from "../game/labV21Constants";
import { isBreakAlign } from "./labRuleset";

/** 仅保留空间工具外功的短注；其余走 TECHNIQUES 数值原文。 */
export const TECH_TEXT_BREAK: Partial<Record<TechniqueId, { name?: string; text: string }>> = {
  backstep: { text: "每回合首次打位移牌额外 +1 位移充能。" },
  bodyCheck: { text: "打位移牌贴脸时造成 4 伤。" },
  ghostStep: { text: "打位移牌不消耗「桩」阻挡。" },
  nightStep: { text: "开战 +1 位移充能。" },
  longMarch: { text: "进步类牌额外 +1 位移充能。" },
  heelStake: { text: "开场落桩。" },
  tether: { text: "过远拉近。" },
  barbedHook: { text: "拉近成功时 +1 位移充能。" },
  closeCut: { text: "抽刀按相邻结算。" },
};

/** 心法走 MIND_ARTS 数值原文。 */
export const MIND_TEXT_BREAK: Partial<Record<MindArtId, { name?: string; text: string }>> = {};

export const PASSIVE_BREAK: Partial<Record<string, string>> = {
  rail: "硬拆成功时挡 +1。",
  seer: "本回合硬拆≥1 且劲尽，下回 +1 劲。",
  sapper: "软拆（让）时反震 +2。",
  watch: "手牌有位移牌时上限 +1。",
  guard: "开局 +1 位移充能，挡 +1。",
  hooker: "拉近后下一硬拆反打 +3。",
  hermit: "有桩时硬拆冲锋反打 +1。",
  boat: "不贴身时来锋硬拆反打 +1。",
};

/** 道具走 LAB_ITEM_TIP 数值原文。 */
export const ITEM_TIP_BREAK: Partial<Record<LabItemId, string>> = {};

export function techniqueTip(id: TechniqueId): string {
  const def = TECHNIQUES[id];
  if (isBreakAlign()) {
    const o = TECH_TEXT_BREAK[id];
    if (o) return `${o.name ?? def.name}：${o.text}`;
  }
  return `${def.name}：${def.text}`;
}

export function mindTip(id: MindArtId): string {
  const def = MIND_ARTS[id];
  if (isBreakAlign()) {
    const o = MIND_TEXT_BREAK[id];
    if (o) return `${o.name ?? def.name}：${o.text}`;
  }
  return `${def.name}：${def.text}`;
}

export function itemTip(id: LabItemId): string {
  if (isBreakAlign() && ITEM_TIP_BREAK[id]) return ITEM_TIP_BREAK[id]!;
  return LAB_ITEM_TIP[id] ?? LAB_ITEM_LABEL[id] ?? id;
}

/** Break-mode reward kind weights（含谱牌、淬刃、换页）。 */
export const BREAK_REWARD_WEIGHTS = {
  tech: 10,
  mind: 6,
  item: 8,
  aid: 8,
  card: 34,
  forge: 14,
  upgrade: 16,
} as const;
