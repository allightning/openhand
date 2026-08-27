import { isLabV2 } from "./labTuning";
import type { CardDef, CardId } from "./types";
import { GOD_SKILL, PATH_SKILL } from "./weapons";

/** Batch v2 card copy — semantics only; mechanics stay in sim hooks. */
const CARD_TEXT_V2: Partial<Record<CardId, string>> = {
  combo: "势 +1（积）。下一张攻击按势各加 2 伤。",
  chain: "打 5。若有势则打 9 并抽 1。",
  chain2: "打 7。若有势则打 11 并抽 1。",
  gather: "聚势 +1（最多 5）。抽 1。",
  gather2: "聚势 +2（最多 5）。抽 1。",
  setup: "铺势：下回势 +1。抽 1。",
  finisher: "需势≥1。打 4，每点势再 +3，然后清空势。",
  finisher2: "打 6。每点势再 +3，并清空势。",
  weave: "上一招是攻则挡 8 并势 +1；否则蓄劲 +3。",
  comboTax: "付 2 血积势 +1。抽 1。",
  comboPay: "消耗 1 势：伤 10。",
  setupTax: "下回势 +1。抽 1。额外耗 1 劲。",
  flowTax: "聚势 +1（上限 5）。额外耗 1 劲。",
  tide: "下回劲力 +1。有势则抽 1。",
  bindwound: "有势可爆：回 7 清裂创；否则回 2。",
  lateTide: "势拉满。抽 2。",
  lateChain: "耗 2 势：伤 16 并抽 1。",
  // §31.8 v3：拆招答案不再倒贴抽牌（文案与机制同步，D4）
  advance: "身前一格为空则前进。拆招充能 +1。",
  advance2: "身前最多前进 2 格。拆招充能 +1。",
  sweep: "击退 1 格。拆招充能 +1。",
  retreat: "身后最多退 2 格。拆招充能 +1。",
  sidestep: "相邻对调位置。拆招充能 +1。",
};

function migrateLegacyText(text: string): string {
  return text
    .replace(/连势/g, "势")
    .replace(/气脉/g, "势")
    .replace(/铺势/g, "势")
    .replace(/每层势再 \+5/g, "每点势再 +3")
    .replace(/每层势再 \+6/g, "每点势再 +3");
}

export function cardDisplayText(def: Pick<CardDef, "id" | "text">): string {
  if (!isLabV2()) return def.text;
  return CARD_TEXT_V2[def.id] ?? migrateLegacyText(def.text);
}

const PATH_SKILL_V2: Record<string, string> = {
  "palm-b": "势有层时伤+1（仍要先付势代价）",
};

const GOD_SKILL_V2: Record<string, string> = {
  "palm-a": "连环震步：本息每段势额外推1",
  "palm-b": "叠浪三连：势≥2时本息第三击免费",
};

export function pathSkillDisplay(key: string, fallback: string): string {
  if (!isLabV2()) return fallback;
  return PATH_SKILL_V2[key] ?? migrateLegacyText(fallback);
}

export function godSkillDisplay(key: string, fallback: string): string {
  if (!isLabV2()) return fallback;
  return GOD_SKILL_V2[key] ?? migrateLegacyText(fallback);
}

export function pathSkillText(key: string): string {
  return pathSkillDisplay(key, PATH_SKILL[key] ?? "");
}

export function godSkillText(key: string): string {
  return godSkillDisplay(key, GOD_SKILL[key] ?? "");
}
