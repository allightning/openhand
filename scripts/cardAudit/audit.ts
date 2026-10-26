/** 155 张审计。npx tsx scripts/cardAudit/audit.ts */
import { writeFileSync } from "node:fs";
import { CARDS } from "../../src/game/content/legacy";
import { projectCard } from "../../src/game/content/cards";
import { validateRow } from "../../src/game/content/validate";
import { CARD_KINDS } from "../../src/game/content/hooks";
import { CROSS_HOLD, CROSS_MOVE, DELETED, RECOST, RETAG, TARGET_SCHOOL } from "../../src/game/content/cards/rectify";

const CN: Record<string, string> = {
  any: "any",
  palm: "拳",
  saber: "刀",
  sword: "剑",
  spear: "枪",
  staff: "棍",
  hook: "钩",
};

function disposition(id: string): string {
  const bits: string[] = [];
  if (DELETED.has(id)) bits.push("删");
  if (RETAG[id]) bits.push(`改挂→${CN[RETAG[id]!] ?? RETAG[id]}`);
  if (CROSS_MOVE[id]) bits.push(`交叉改挂→${CN[CROSS_MOVE[id]!] ?? CROSS_MOVE[id]}`);
  if (CROSS_HOLD[id]) bits.push("交叉未拍");
  if (RECOST[id] !== undefined) bits.push(`调价→${RECOST[id]}`);
  return bits.length ? bits.join("；") : "留";
}

const rows = Object.values(CARDS)
  .map((card) => {
    const projected = projectCard(card);
    const contract = validateRow(projected, { kinds: CARD_KINDS, requireDigit: true });
    return { card, projected, contract };
  })
  .sort((a, b) => a.card.id.localeCompare(b.card.id));

const lines: string[] = [];
lines.push("# 卡池审计 · 2026-10-23");
lines.push("");
lines.push("开工快照。155 张还在注册表里，处置按 `docs/combat/CARD_POOL_PLAN_20261021.md`。Notion 逐张表本窗读不到，没有另加稿面以外的调价。");
lines.push("");
lines.push(`注册 ${rows.length} 张。合同红 ${rows.filter((r) => r.contract.length > 0).length} 张（不含交叉未拍）。`);
lines.push("");
lines.push("| id | 系 | 费 | kind | 钩子 | 文案带数 | 合同 | 处置 | 牌面 |");
lines.push("|---|---|---|---|---|---|---|---|---|");
for (const { card, projected, contract } of rows) {
  const digit = /[0-9]/.test(card.text) ? "有" : "无";
  const text = card.text.replaceAll("|", "\\|");
  lines.push(
    `| ${card.id} | ${CN[projected.school] ?? projected.school} | ${card.cost} | ${projected.kind} | ${projected.effectHooks.join(",")} | ${digit} | ${contract.join(",") || "—"} | ${disposition(card.id)} | ${text} |`,
  );
}

lines.push("");
lines.push("## 处置计数");
lines.push("");
lines.push(`- 删 ${DELETED.size}`);
lines.push(`- 改挂 ${Object.keys(RETAG).length}`);
lines.push(`- 交叉改挂 ${Object.keys(CROSS_MOVE).length}`);
lines.push(`- 交叉未拍 ${Object.keys(CROSS_HOLD).length}（${Object.keys(CROSS_HOLD).join("、")}）`);
lines.push(`- 调价 ${Object.keys(RECOST).length}`);
lines.push(`- 目标张数 ${JSON.stringify(TARGET_SCHOOL)}`);
lines.push("");
lines.push("起手（稿 §6，尚未改函数）：五系 `direct` → `strike`；钩 `push` → `sidestep`。");
lines.push("");
lines.push("复跑：`npx tsx scripts/cardAudit/audit.ts`。不读随机数。");

const out = "docs/combat/CARD_AUDIT_20261023.md";
if (rows.length !== 155) {
  console.log("注册表已是", rows.length, "张。保留开工快照", out, "不覆盖。");
  console.log("删", DELETED.size, "改挂", Object.keys(RETAG).length, "交叉改挂", Object.keys(CROSS_MOVE).length, "未拍", Object.keys(CROSS_HOLD).join(","));
  process.exit(0);
}
writeFileSync(out, lines.join("\n") + "\n");
console.log("wrote", out, "rows", rows.length);
