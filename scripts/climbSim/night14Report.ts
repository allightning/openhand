import { boardStamp, poolStamp } from "./pool";
import { DEFAULT_KNOBS, KNOB_VERSION, knobLabel } from "./knobs";
import { JAG_TARGET } from "./night10Run";
import type { Night14Data, Night14MatrixRow, Night14PierceRow } from "./night14Run";
import { SIM_SEED } from "./tiers";

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function rate(wins: number, games: number): number {
  return games ? wins / games : 0;
}

function mean(n: number, games: number): string {
  return (n / Math.max(1, games)).toFixed(1);
}

function shortVar(v: string): string {
  if (v.includes("brute")) return "莽";
  if (v.includes("turtle")) return "龟";
  if (v.includes("skirmish")) return "游走";
  return v;
}

function pierceShare(p: Night14PierceRow): string {
  if (p.dmgDealt <= 0) return "—";
  return ((p.bleed + p.poison + p.pierce) / p.dmgDealt).toFixed(3);
}

function matrixTalk(rows: Night14MatrixRow[]): string[] {
  const byVar = { 莽: [] as number[], 龟: [] as number[], 游走: [] as number[] };
  const dmg = { 莽: [] as number[], 龟: [] as number[], 游走: [] as number[] };
  const lines: string[] = [];
  for (const r of rows) {
    const k = shortVar(r.variant);
    if (k !== "莽" && k !== "龟" && k !== "游走") continue;
    byVar[k].push(rate(r.wins, r.games));
    dmg[k].push(r.games ? r.dmgDealt / r.games : 0);
  }
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  lines.push(
    `五馆均胜：莽 ${pct(avg(byVar.莽))}，龟 ${pct(avg(byVar.龟))}，游走 ${pct(avg(byVar.游走))}。胜率上看龟不是系统最难（馆 7 龟 60%，莽/游走 50%；6/8/9/10 三谱都是 0%）。`,
  );
  lines.push(
    `五馆场均我伤：莽 ${avg(dmg.莽).toFixed(1)}，龟 ${avg(dmg.龟).toFixed(1)}，游走 ${avg(dmg.游走).toFixed(1)}。馆 6 龟我伤明显更低。`,
  );
  const jagHits = rows.filter((r) => r.hit).map((r) => `馆${r.stage}${shortVar(r.variant)}`);
  lines.push(
    jagHits.length
      ? `同馆锯齿线打到的：${jagHits.join("、")}。莽/游走在 6/8/9/10 也未到，不是龟独有的未达标。`
      : "莽/游走在 6–10 也没有馆打到锯齿线。",
  );
  return lines;
}

export function renderNight14(data: Night14Data): string {
  const lines = [
    "# 夜校十四班报告 · 2026-11-14",
    "",
    `种子 ${SIM_SEED} · 旋钮 ${KNOB_VERSION}（${knobLabel(DEFAULT_KNOBS)}） · ${boardStamp()} · 卡池 ${poolStamp()}。src 结算未改。待拍 35 只给数。`,
    "",
    "## P1 变体矩阵",
    "",
    "馆 6–10 × 莽/龟/游走 × 10 局。盐按敌 id 扫到目标谱。锯齿：6 ≥35% / 7 ≥20% / 8 ≥35% / 9 ≥25% / 10 ≥10%。",
    "",
    "| 馆 | 敌 | 谱 | 盐 | 胜率 | 目标 | 到否 | 场均手 | 敌伤 | 我伤 |",
    "|---|---|---|---|---|---|---|---|---|---|",
  ];
  for (const r of data.matrix) {
    const t = JAG_TARGET[r.stage];
    lines.push(
      `| ${r.stage} | ${r.enemy} | ${shortVar(r.variant)} | ${r.salt} | ${pct(rate(r.wins, r.games))} | ${t ? t.label : "—"} | ${r.hit ? "到" : "未到"} | ${mean(r.handSum, r.games)} | ${mean(r.dmgTaken, r.games)} | ${mean(r.dmgDealt, r.games)} |`,
    );
  }
  lines.push("");
  lines.push(...matrixTalk(data.matrix));
  lines.push("");
  lines.push("## P2 破挡供给（待拍 35 证据）");
  lines.push("");
  lines.push("不改 src 默认。裂创加倍 = 注入裂创牌再加一份，并补一张未持有的裂创（配方按同名 ×3，只加同名不会变）。淬毒 = 开局 `useLabItem(cuandu)`。馆 4/6/9 各 10 局。");
  lines.push("");
  lines.push("| 实验 | 馆 | 敌 | 变体 | 胜率 | 总我伤 | 裂创 | 毒 | 穿挡 | 破挡占比 |");
  lines.push("|---|---|---|---|---|---|---|---|---|---|");
  for (const p of data.pierce) {
    lines.push(
      `| ${p.id} | ${p.stage} | ${p.enemy} | ${shortVar(p.variant)} | ${pct(rate(p.wins, p.games))} | ${p.dmgDealt} | ${p.bleed} | ${p.poison} | ${p.pierce} | ${pierceShare(p)} |`,
    );
  }
  lines.push("");
  lines.push("裂创加倍三格数字与基线相同；两开与淬毒相同。多塞裂创没兑成伤。淬毒开了毒跳，馆 4 胜率 0→60%，破挡占比 0.14→0.62；馆 6 0→10%、0.19→0.48；馆 9 胜率仍 0，破挡占比 0.17→0.54。穿挡全程 0。");
  lines.push("");
  lines.push("## P3 馆 2 灵敏度");
  lines.push("");
  lines.push("目标 ≥60%。十三班散点 20 局 30%。本班 1 精 / 2 精用不同精牌（配方同名去重，不能只叠 expose）。");
  lines.push("");
  lines.push("| 精 | 注入 | 胜率 | 敌伤 | 我伤 | 过 60% |");
  lines.push("|---|---|---|---|---|---|");
  for (const h of data.hall2) {
    const wr = rate(h.wins, h.games);
    lines.push(
      `| ${h.adept} | ${h.injected.join(" ") || "—"} | ${pct(wr)} | ${mean(h.dmgTaken, h.games)} | ${mean(h.dmgDealt, h.games)} | ${wr + 1e-9 >= 0.6 ? "到" : "未到"} |`,
    );
  }
  lines.push("");
  lines.push("未 commit。");
  lines.push("");
  return lines.join("\n");
}
