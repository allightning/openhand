/** 2026-10-21 卡池整改逐张表生成：npx tsx scripts/audit-plan.ts */
import { CARD_REGISTRY } from "../src/game/content/cards";

/** 删 17：连势家族 6 + weave（带连势）+ 家族合并 10 */
const DELETE: Record<string, string> = {
  combo: "叠连击层，与拳核副重复", comboTax: "付血叠连击，与拳重复", comboPay: "耗连击，与拳重复",
  chain: "读连击层，非拳拿不到层", chain2: "同上", lateChain: "耗连击，与拳重复",
  weave: "文本带连势+1，叠层不进通用池",
  salve: "与 mend2 重复（回 8 清裂创）", follow2: "与 follow 重复", gather2: "气脉留 gather/lateTide",
  tide: "气脉留 gather/lateTide", bindwound: "铺势留 setup/finisher/finisher2/echo",
  lateMute: "与 skillLock 重复", latePouch: "与 pouchSeal 重复", lateMirror: "与 mirror 重复",
  lateLeech: "与 qiLeech 重复", ironPulse: "与 qiPulse 重复",
  twinpalm: "连打两掌是弱连击，叠层不进通用池", follow: "基础攻击留 strike/elbow/split",
  charge2: "蓄劲留 charge", echo: "「第一掌」拳味，铺势留 setup/finisher/finisher2",
  peonyBrew: "回 2 太薄且带滞手，与 mend 重复", cauterize: "清裂创封脉与 unbind/mend2 重叠",
  haste2: "先机留 haste 一张",
};

/** 改挂 15：主语踩线 → 主语系 */
const RETAG: Record<string, string> = {
  push: "palm", strike2: "palm", push2: "palm", sweep: "palm", pierce: "palm", buryKnock: "palm",
  cut: "saber", venomFog: "saber", lateBleed: "saber", buryBleed: "saber",
  direct: "sword", rift: "sword",
  thrust: "spear", plant: "staff", hookpull: "hook",
};

/** 交叉系 8：系牌带别系主语，默认改挂，标黄待逐张定 */
const CROSS: Record<string, string> = {
  bleedcut: "saber", spearLock: "sword", swordMute: "saber", drunkFist: "saber",
  hitSpear: "sword", hitStaff: "palm", ultSaber: "?(击退是拳主语，刀绝招带它=违口径，改效果或接受)",
  ultSword: "?(裂创是刀主语，剑绝招带它=违口径，改效果或接受)",
};

/** 调价（0 费 16 张已拍：10→1 费、光环 6→2 费；weave 删不再调） */
const RECOST: Record<string, number> = {
  // 0 费整改（已定）
  wardPalm: 1, wardSaber: 1, wardSword: 1, wardSpear: 1, wardStaff: 1, wardHook: 1,
  retreat: 1, backpalm: 1, cauterize: 1, peonyBrew: 1,
  auraPalm: 2, auraSaber: 2, auraSword: 2, auraSpear: 2, auraStaff: 2, auraHook: 2,
  // 1→2：效果超 1 费锚点
  defend2: 2, mend2: 2, haste2: 2, qiPulse: 2, suture: 2, finisher: 2, marking: 2,
  skillLock: 2, handCut: 2, burySlash: 2, buryWard: 2, buryKnock: 2, buryBleed: 2,
  mirror: 2, varBackwater: 2, varOverhand: 2, advance2: 2, sidestep: 2,
  qiLeech: 2, pouchSeal: 2, echo: 2, gather: 2, setup: 2, charge2: 3,
  // 2→3
  ironform: 3, qiFlood: 3, lateTide: 3, finisher2: 4,
  comboSaber: 3, comboSpear: 3, comboSword: 3, comboStaff: 3, comboHook: 3,
  // 绝招归位 4
  ultIronWall: 4, ultQiBurst: 4,
  ultPalm: 4, ultSaber: 4, ultSword: 4, ultSpear: 4, ultStaff: 4, ultHook: 4,
};

/** 主语 hook：带这些的牌费用不自动动，全部标黄给用户（六系机制用户亲刀） */
const CORE_HOOKS = new Set(["knock", "combo", "near", "bleed", "expose", "far", "plant", "pull", "disarm", "ultimate"]);

function isUntouchable(c: (typeof CARD_REGISTRY)[string]): boolean {
  return c.id.startsWith("fuse") || c.effectHooks.some((h) => CORE_HOOKS.has(h)) || CROSS[c.id] !== undefined;
}

/** 1→2 自动提议：非主语、伤 ≥8 或双效果 */
function autoBump(c: (typeof CARD_REGISTRY)[string]): boolean {
  if (c.cost !== 1) return false;
  if (RECOST[c.id] !== undefined || DELETE[c.id] || RETAG[c.id] || isUntouchable(c)) return false;
  const v = c.values;
  const effects = c.effectHooks.filter((h) => h !== "damage").length;
  return (v.damage ?? 0) >= 8 || ((v.damage ?? 0) > 0 && effects >= 2);
}

/** 2→3 自动提议：非主语、伤 ≥12 或伤 ≥8 带效果 */
function autoBump3(c: (typeof CARD_REGISTRY)[string]): boolean {
  if (c.cost !== 2) return false;
  if (RECOST[c.id] !== undefined || DELETE[c.id] || RETAG[c.id] || isUntouchable(c)) return false;
  const v = c.values;
  const effects = c.effectHooks.filter((h) => h !== "damage").length;
  return (v.damage ?? 0) >= 12 || ((v.damage ?? 0) >= 8 && effects >= 1);
}

const cards = Object.values(CARD_REGISTRY);
const dist: Record<string, Record<number, number>> = {};
let total = 0;
for (const c of cards) {
  if (DELETE[c.id]) continue;
  const school = (RETAG[c.id] ?? (CROSS[c.id] && !CROSS[c.id]!.startsWith("?") ? CROSS[c.id]! : c.school)) as string;
  let cost = RECOST[c.id] ?? c.cost;
  if (autoBump(c)) {
    cost = 2;
    console.log(`AUTO 1→2 ${c.school} ${c.id} :: ${c.text}`);
  } else if (autoBump3(c)) {
    cost = 3;
    console.log(`AUTO 2→3 ${c.school} ${c.id} :: ${c.text}`);
  } else if (c.cost <= 2 && !DELETE[c.id] && !RETAG[c.id] && isUntouchable(c) && !c.id.startsWith("fuse") && !RECOST[c.id]) {
    console.log(`YELLOW 主语牌人工看 ${c.school} ${c.id} ${c.cost}费 :: ${c.text}`);
  }
  dist[school] ??= {};
  dist[school][cost] = (dist[school][cost] ?? 0) + 1;
  total++;
}
console.log("整改后总数", total);
for (const [s, d] of Object.entries(dist)) {
  const n = Object.values(d).reduce((a, b) => a + b, 0);
  console.log(s, n, JSON.stringify(d));
}
const costDist: Record<number, number> = {};
for (const d of Object.values(dist)) for (const [k, v] of Object.entries(d)) costDist[+k] = (costDist[+k] ?? 0) + v;
console.log("费用曲线:", JSON.stringify(costDist));
console.log("删", Object.keys(DELETE).length, "改挂", Object.keys(RETAG).length, "交叉", Object.keys(CROSS).length, "调价", Object.keys(RECOST).length);
const changed = new Set([...Object.keys(DELETE), ...Object.keys(RETAG), ...Object.keys(RECOST)]);
console.log("未动", cards.filter((c) => !changed.has(c.id) && !CROSS[c.id]).length);
// 校验删/挂/调 id 都存在
for (const id of changed) if (!CARD_REGISTRY[id]) console.log("!! 不存在:", id);

// ---- 输出 Notion 逐张表 markdown ----
import { writeFileSync } from "node:fs";
const L: string[] = [];
const esc = (s: string) => s.replaceAll("|", "\\|");
L.push("# 卡池整改逐张表（草案待逐条拍）\n");
L.push("方向四拍（2026-10-21 已拍）：连势家族不留通用、通用瘦到 ~40、奖励池规则先不动、曲线 1/2/3/4 费 ≈ 55/55/28/12。六系核副机制与牌面不动；连携（fuse）费用不动，归「十五张连携重写」未锁区。\n");
L.push("整改后：131 张（删 24）。any 43 / 拳 16 / 刀 17 / 剑 15 / 枪 11 / 棍 14 / 钩 15。曲线 64/46/12/9——1 费仍厚 ~16 张，缺口在 22 张主语黄牌（下方 §5），你从黄牌里挑着提费即可对齐。\n");

L.push("\n## §1 删 24 张\n");
L.push("| id | 现牌面 | 理由 |\n|---|---|---|");
for (const [id, why] of Object.entries(DELETE)) {
  const c = CARD_REGISTRY[id];
  if (!c) {
    L.push(`| ${id} | （已不在注册表） | ${why} |`);
    continue;
  }
  L.push(`| ${id} | ${c.cost}费 ${esc(c.text)} | ${why} |`);
}

L.push("\n## §2 改挂 15 张（通用 → 主语系，费用见 §4 同步调整）\n");
L.push("| id | 现牌面 | 改挂 |\n|---|---|---|");
const CN: Record<string, string> = { palm: "拳", saber: "刀", sword: "剑", spear: "枪", staff: "棍", hook: "钩" };
for (const [id, s] of Object.entries(RETAG)) {
  const c = CARD_REGISTRY[id]!;
  L.push(`| ${id} | ${c.cost}费 ${esc(c.text)} | ${CN[s]} |`);
}

L.push("\n## §3 交叉系 8 张（系牌带别系主语，默认改挂；两张绝招是改效果还是改挂，你定）\n");
L.push("| id | 现属 | 牌面 | 默认 |\n|---|---|---|---|");
for (const [id, s] of Object.entries(CROSS)) {
  const c = CARD_REGISTRY[id]!;
  L.push(`| ${id} | ${CN[c.school as string] ?? c.school} | ${c.cost}费 ${esc(c.text)} | ${s.startsWith("?") ? s : `改挂${CN[s]}`} |`);
}

L.push("\n## §4 调价（含 0 费整改 14 张；weave / 牡丹酿 / 烙口改删除，见 §1）\n");
L.push("| id | 现费 → 新费 | 牌面 |\n|---|---|---|");
const recostRows: string[] = [];
for (const c of cards) {
  if (DELETE[c.id]) continue;
  let nc = RECOST[c.id];
  let tag = "";
  if (nc === undefined && autoBump(c)) { nc = 2; tag = "（自动档）"; }
  if (nc === undefined && autoBump3(c)) { nc = 3; tag = "（自动档）"; }
  if (nc === undefined || nc === c.cost) continue;
  recostRows.push(`| ${c.id} | ${c.cost} → ${nc}${tag} | ${esc(c.text)} |`);
}
L.push(...recostRows);

L.push("\n## §5 主语黄牌 22 张（六系机制你亲刀，费用未动；曲线 1 费缺口从这里补）\n");
L.push("| id | 系 | 费 | 牌面 |\n|---|---|---|---|");
for (const c of cards) {
  if (DELETE[c.id] || RETAG[c.id] || RECOST[c.id] !== undefined) continue;
  if (c.cost > 2 || !isUntouchable(c) || c.id.startsWith("fuse")) continue;
  L.push(`| ${c.id} | ${CN[c.school as string] ?? c.school} | ${c.cost} | ${esc(c.text)} |`);
}

L.push("\n## §6 起手替换（改挂的连带）\n");
L.push("- 五系起手 `direct`（破绽=剑主语）→ `strike`（打 5，真通用）");
L.push("- 钩起手 `push`（击退=拳主语）→ `sidestep`（相邻对调，解贴墙）");

L.push("\n## §7 施工口径\n");
L.push("- 一个结算包全做：删 24 + 改挂 15 + 交叉 8 + 调价 + 起手 2 处 + 注册表/图鉴/codex/起始牌同步。黄金基线重录一次。");
L.push("- 奖励池规则不动（已拍）。连携 15 张费用不动（归连携重写包）。");
L.push("- 逐条改法：直接改本表「新费 / 改挂 / 删」列，改完跟主窗说一声开核玩结算包。");
writeFileSync("/tmp/cardplan.md", L.join("\n"));
console.log("WROTE /tmp/cardplan.md", L.length, "行");
