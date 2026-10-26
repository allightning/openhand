/** 2026-10-21 凡精绝分层草案：npx tsx scripts/audit-rarity.ts（在整改后 131 张上分类） */
import { CARD_REGISTRY } from "../src/game/content/cards";

const DELETE = new Set([
  "combo", "comboTax", "comboPay", "chain", "chain2", "lateChain", "weave",
  "salve", "follow2", "gather2", "tide", "bindwound", "lateMute", "latePouch",
  "lateMirror", "lateLeech", "ironPulse", "twinpalm", "follow", "charge2",
  "echo", "peonyBrew", "cauterize", "haste2",
]);

/** 引擎件 hook（家族核心）→ 精 */
const ENGINE = new Set([
  "flow", "setup", "charge", "mark", "foeMute", "foeNoBag", "riposte", "variant",
  "regen", "finisher", "thorns", "mirror", "retain", "qiRegen", "foeQiBurn",
  "foeHandTax", "mute", "frail", "weave", "tide", "layer", "assist", "combo",
]);
const CONTROL = new Set(["stun", "disarm"]);
const LAYER_HOOKS = ["knock", "near", "bleed", "expose", "far", "plant", "pull"] as const;
const LAYER_VALUE: Record<string, string> = { knock: "knock", near: "nearBonus", bleed: "bleed", expose: "expose", far: "farBonus", plant: "stake", pull: "pullEnemy" };

function rarityOf(c: (typeof CARD_REGISTRY)[string]): "凡" | "精" | "绝" | "连携" {
  if (c.id.startsWith("fuse")) return "连携";
  if (c.effectHooks.includes("ultimate") || c.effectHooks.includes("aura")) return "绝";
  if (c.effectHooks.some((h) => ENGINE.has(h) || CONTROL.has(h))) return "精";
  const layers = LAYER_HOOKS.filter((h) => c.effectHooks.includes(h));
  const layerSum = layers.reduce((s, h) => s + (c.values[LAYER_VALUE[h]] ?? 1), 0);
  if (layerSum >= 2) return "精"; // 多层/多主语强化件
  if (layers.length > 0 && !c.values.damage && !c.values.block) return "精"; // 无伤害无格挡的主语引擎
  return "凡";
}

const dist: Record<string, number> = { 凡: 0, 精: 0, 绝: 0, 连携: 0 };
const rows: string[] = [];
for (const c of Object.values(CARD_REGISTRY)) {
  if (DELETE.has(c.id)) continue;
  const r = rarityOf(c);
  dist[r]++;
  rows.push(`| ${c.id} | ${c.school} | ${c.cost} | ${r} | ${c.text} |`);
}
console.log("分布:", dist, "总", Object.values(dist).reduce((a, b) => a + b, 0));
import { writeFileSync } from "node:fs";
writeFileSync("/tmp/rarity.md", rows.join("\n"));
console.log("WROTE /tmp/rarity.md", rows.length, "行");
// 按系看
const bySchool: Record<string, Record<string, number>> = {};
for (const c of Object.values(CARD_REGISTRY)) {
  if (DELETE.has(c.id)) continue;
  const r = rarityOf(c);
  bySchool[c.school] ??= { 凡: 0, 精: 0, 绝: 0, 连携: 0 };
  bySchool[c.school]![r]++;
}
console.log(JSON.stringify(bySchool, null, 1));
