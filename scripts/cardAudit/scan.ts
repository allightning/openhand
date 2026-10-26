/** 开工扫描：155 张现状 + 整改后分布预演。npx tsx scripts/cardAudit/scan.ts */
import { CARDS } from "../../src/game/content/legacy";
import { projectCard, cardProblems } from "../../src/game/content/cards";
import { DELETED, RETAG, CROSS_MOVE, RECOST } from "./plan";

const BANNED = /便|却|只|亦|忽|遂|乃|方|而|于是|终究|其实|所谓|归根|仿佛|如同|像/;
const REVERSAL = /不是.+[是而]|看似|其实|要的不是|不开口的是/;
const NEG_TAIL = /不问|没叫|不报|不抬头|不认/;

const cards = Object.values(CARDS);
console.log("now", cards.length);

const schools: Record<string, number> = {};
const costs: Record<string, number> = {};
for (const c of cards) {
  const school = RETAG[c.id] ?? CROSS_MOVE[c.id] ?? c.school ?? "any";
  const drop = DELETED.has(c.id);
  if (drop) continue;
  schools[school] = (schools[school] ?? 0) + 1;
  const cost = RECOST[c.id] ?? c.cost;
  costs[cost] = (costs[cost] ?? 0) + 1;
}
console.log("after schools", schools, "sum", Object.values(schools).reduce((a, b) => a + b, 0));
console.log("after costs", costs);

console.log("\n== text without digit (survivors) ==");
for (const c of cards) {
  if (DELETED.has(c.id)) continue;
  if (!/[0-9]/.test(c.text)) console.log(c.id, JSON.stringify(c.text), "steps", c.steps, "plant", c.plant, "damage", c.damage, "block", c.block);
}

console.log("\n== flavor hits ==");
for (const c of cards) {
  if (DELETED.has(c.id)) continue;
  const f = c.flavor ?? "";
  const t = c.text;
  const hit = [f, t].filter((s) => BANNED.test(s) || REVERSAL.test(s) || NEG_TAIL.test(s));
  if (hit.length) console.log(c.id, "F", JSON.stringify(f), "T", JSON.stringify(t));
}

console.log("\n== holds now ==");
let n = 0;
for (const c of cards) {
  const p = cardProblems(projectCard(c));
  if (p.length) {
    n++;
    console.log(c.id, p.join(","));
  }
}
console.log("hold count", n);

console.log("\n== missing plan ids ==");
for (const id of [...DELETED, ...Object.keys(RETAG), ...Object.keys(CROSS_MOVE), ...Object.keys(RECOST)]) {
  if (!CARDS[id as keyof typeof CARDS]) console.log("missing", id);
}
