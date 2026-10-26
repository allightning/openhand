/** 2026-10-21 大评估用一次性盘点：npx tsx scripts/audit-content.ts */
import { CARD_REGISTRY, CARD_HOLDS } from "../src/game/content/cards";
import { ENEMY_REGISTRY } from "../src/game/content/enemies";
import { TECHNIQUE_REGISTRY } from "../src/game/content/techniques";
import { MIND_REGISTRY } from "../src/game/content/mindArts";
import { CHARM_REGISTRY } from "../src/game/content/charms";
import { ITEM_REGISTRY } from "../src/game/content/items";
import { MATES } from "../src/game/party";
import { GEAR_WEAPONS } from "../src/game/weapons";

function tally<T extends string>(rows: T[]): Record<T, number> {
  const out = {} as Record<T, number>;
  for (const r of rows) out[r] = (out[r] ?? 0) + 1;
  return out;
}

const cards = Object.values(CARD_REGISTRY);
console.log("== 卡牌", cards.length, "（合同红", CARD_HOLDS.length, "）");
console.log("分系:", tally(cards.map((c) => c.school)));
console.log("分型:", tally(cards.map((c) => c.kind)));
console.log("费用曲线:", tally(cards.map((c) => String(c.cost)).sort() as any));
const hookFreq = tally(cards.flatMap((c) => c.effectHooks));
console.log("hook 覆盖（种数", Object.keys(hookFreq).length, "）:", hookFreq);
console.log("0 费牌:", cards.filter((c) => c.cost === 0).map((c) => c.id).join(","));

const enemies = Object.values(ENEMY_REGISTRY) as any[];
console.log("\n== 敌人", enemies.length);
const sample = enemies[0];
console.log("敌字段样例:", Object.keys(sample).join(","));
console.log("分档:", tally(enemies.map((e) => String(e.tier ?? e.grade ?? e.slot ?? "?"))));

console.log("\n== 外功", Object.keys(TECHNIQUE_REGISTRY).length, " 心法", Object.keys(MIND_REGISTRY).length, " 符", Object.keys(CHARM_REGISTRY).length, " 道具", Object.keys(ITEM_REGISTRY).length);
console.log("\n== 同道", Object.keys(MATES).length);
console.log("== 兵器", GEAR_WEAPONS.length);
const gw = GEAR_WEAPONS as any[];
console.log("兵器分系:", tally(gw.map((w) => String(w.school ?? w.weapon ?? "?"))));
console.log("兵器分档:", tally(gw.map((w) => String(w.grade ?? w.tier ?? "?"))));
