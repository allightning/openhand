/** 2026-10-21 通用池/费用/主语盘点：npx tsx scripts/audit-pool.ts */
import { CARD_REGISTRY } from "../src/game/content/cards";

/** 六系核副主语 hook（铁律：别系凡牌不做这两个主语） */
const OWNER: Record<string, string> = {
  knock: "palm", combo: "palm",
  near: "saber", bleed: "saber",
  expose: "sword",
  far: "spear", // 距离档；断劲无专属 hook（qiBurn?）
  plant: "staff",
  pull: "hook", disarm: "hook",
};

const cards = Object.values(CARD_REGISTRY);
const any = cards.filter((c) => c.school === "any").sort((a, b) => a.cost - b.cost || a.id.localeCompare(b.id));

console.log("== 通用牌", any.length, "张（按费排序）");
for (const c of any) {
  console.log(`${c.cost}费 ${c.id} [${c.kind}] hooks=${c.effectHooks.join("/")} :: ${c.text}`);
}

console.log("\n== 主语踩线检查（非本系牌带主语 hook）");
for (const c of cards) {
  for (const h of c.effectHooks) {
    const owner = OWNER[h];
    if (owner && c.school !== owner) {
      console.log(`${c.school} ${c.id} 带 ${h}（主语=${owner}）${c.cost}费 :: ${c.text}`);
    }
  }
}

console.log("\n== 各系牌费用分布");
for (const s of ["palm", "saber", "sword", "spear", "staff", "hook"]) {
  const mine = cards.filter((c) => c.school === s);
  const dist: Record<string, number> = {};
  for (const c of mine) dist[c.cost] = (dist[c.cost] ?? 0) + 1;
  console.log(`${s}: ${mine.length} 张`, dist);
}
