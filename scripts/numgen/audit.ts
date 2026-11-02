import { writeFileSync } from "node:fs";
import { CARD_REGISTRY } from "../../src/game/content/cards";
import { BASELINE_IDS, BASELINE_SET } from "./baseline";
import { BAND } from "./coins";
import { priceCard, type Priced } from "./price";

export function loadBaseline(): Priced[] {
  const missing = BASELINE_IDS.filter((id) => !CARD_REGISTRY[id]);
  if (missing.length) throw new Error(`基线牌已不在注册表: ${missing.join(",")}`);
  const extra = Object.keys(CARD_REGISTRY).filter((id) => !BASELINE_SET.has(id));
  if (extra.length) {
    console.warn("注册表有基线外新牌，本包忽略:", extra.join(","));
  }
  return BASELINE_IDS.map((id) => priceCard(CARD_REGISTRY[id]!));
}

function pct(p: Priced): string {
  const sign = p.pct > 0 ? "+" : "";
  return `${sign}${Math.round(p.pct * 1000) / 10}%`;
}

export function renderAudit(rows: Priced[]): string {
  const inBand = rows.filter((r) => !r.skip && r.band === "in");
  const over = rows.filter((r) => !r.skip && r.band === "over");
  const under = rows.filter((r) => !r.skip && r.band === "under");
  const skip = rows.filter((r) => r.skip);
  const lines: string[] = [];
  lines.push(process.argv.includes("--now") ? "# 数值生成器审计 · 2026-11-02" : "# 数值生成器审计 · 2026-10-23");
  lines.push("");
  lines.push("P1。输入：`EXCHANGE_V2_20261023.md` 九币价 + 标尺牌 + 开工时 `CARD_REGISTRY` 131 张。机制核并行新牌不进本包。本文件不改一张牌。");
  lines.push("");
  lines.push("当量 = Σ(效果 × 币价) − 条件折扣。公平价 = 费用 × 5。浮动带 ±15%。");
  lines.push("");
  lines.push("## 汇总");
  lines.push("");
  lines.push(`| 项 | 张 |`);
  lines.push(`|---|---|`);
  lines.push(`| 基线 | ${rows.length} |`);
  lines.push(`| 带内（将重填） | ${inBand.length} |`);
  lines.push(`| 超带·偏肥 | ${over.length} |`);
  lines.push(`| 超带·偏瘦 | ${under.length} |`);
  lines.push(`| 构筑层跳过 | ${skip.length} |`);
  lines.push(`| 带 | ±${BAND * 100}% |`);
  lines.push("");
  lines.push("## 九币");
  lines.push("");
  lines.push("| 币 | 价 |");
  lines.push("|---|---|");
  lines.push("| 伤 | 1 劲 = 5 伤 |");
  lines.push("| 挡 | 1 劲 = 6 挡 |");
  lines.push("| 血 | 1 劲 = 4 血 |");
  lines.push("| 位移 | 1 格 = 0.4 劲 |");
  lines.push("| 控制 | 晕/缴械 1 段 = 1.5 劲 |");
  lines.push("| 叠层 | 1 层 = 2 伤 |");
  lines.push("| 抽 | 1 = 1 劲 |");
  lines.push("| 先机 | 临时 ±1 = 0.5 劲 |");
  lines.push("| 撞墙 | 触发期望 0.6 |");
  lines.push("| 蓄力利息 | +25%/手 |");
  lines.push("");
  lines.push("## 全池");
  lines.push("");
  lines.push("| id | 系 | 费 | 当量 | 公平 | 偏差 | 带 | 跳过 | 构成 |");
  lines.push("|---|---|---|---|---|---|---|---|---|");
  for (const r of rows) {
    const bits = r.lines.filter((l) => l.dmg).map((l) => `${l.label}${l.dmg.toFixed(1)}`).join("；") || "—";
    lines.push(
      `| ${r.id} | ${r.school} | ${r.cost} | ${r.equiv} | ${r.fair} | ${pct(r)} | ${r.skip ? "跳" : r.band} | ${r.skip ?? "—"} | ${bits} |`,
    );
  }
  lines.push("");
  lines.push("## 超带名单（不自动削）");
  lines.push("");
  lines.push("| id | 现值当量 | 生成目标 | 偏差 | 现值数字 |");
  lines.push("|---|---|---|---|---|");
  for (const r of [...over, ...under].sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))) {
    lines.push(`| ${r.id} | ${r.equiv} | ${r.fair} | ${pct(r)} | ${JSON.stringify(r.values)} |`);
  }
  lines.push("");
  lines.push("## 构筑层（单独审）");
  lines.push("");
  for (const r of skip) lines.push(`- ${r.id}：${r.skip}（毛当量 ${r.gross}）`);
  lines.push("");
  lines.push("复跑：`npx tsx scripts/numgen/audit.ts`。");
  lines.push("");
  return lines.join("\n");
}

export function writeAudit(path = process.argv.includes("--now") ? "docs/combat/NUMGEN_AUDIT_20261102.md" : "docs/combat/NUMGEN_AUDIT_20261023.md"): Priced[] {
  const rows = loadBaseline();
  if (rows.length !== 131) throw new Error(`基线应 131，实得 ${rows.length}`);
  writeFileSync(path, renderAudit(rows));
  console.log(
    "wrote",
    path,
    "in",
    rows.filter((r) => !r.skip && r.band === "in").length,
    "over",
    rows.filter((r) => !r.skip && r.band === "over").length,
    "under",
    rows.filter((r) => !r.skip && r.band === "under").length,
    "skip",
    rows.filter((r) => r.skip).length,
  );
  return rows;
}

const runningThis = process.argv[1]?.includes("numgen/audit");
if (runningThis) writeAudit();
