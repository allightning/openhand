import { boardStamp, poolStamp } from "./pool";
import { DEFAULT_KNOBS, KNOB_VERSION, knobLabel } from "./knobs";
import { JAG_TARGET } from "./night10Run";
import type { Night18Data, Night18Row } from "./night18Run";
import { SIM_SEED } from "./tiers";

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function rate(row: Night18Row): number {
  return row.games ? row.wins / row.games : 0;
}

function mean(n: number, games: number): string {
  return (n / Math.max(1, games)).toFixed(1);
}

export function powerIndex(row: Night18Row): number {
  const hp = row.foeHp / Math.max(1, row.games);
  return hp * row.hitMul * row.segBudget;
}

function monoBreaks(rows: Night18Row[]): string[] {
  const breaks: string[] = [];
  for (let stage = 1; stage < 10; stage++) {
    const a = rows.find((r) => r.stage === stage);
    const b = rows.find((r) => r.stage === stage + 1);
    if (!a || !b) continue;
    if (!(powerIndex(a) < powerIndex(b))) breaks.push(`${stage}→${stage + 1}`);
  }
  return breaks;
}

function baseTalk(rows: Night18Row[]): string {
  const hit = rows.filter((r) => r.hit).map((r) => r.stage);
  const miss = rows.filter((r) => !r.hit).map((r) => r.stage);
  return `数字说了什么：到线 ${hit.join("、") || "无"}；未到 ${miss.join("、") || "无"}。馆 2 是 40 局，其余 20 局。第四刀后全馆过线 ${hit.length} 馆。20 局粒度 ±5 点，馆 2 为 ±2.5 点。`;
}

function hall6Talk(row: Night18Row): string {
  const wr = rate(row);
  const inBand = wr + 1e-9 >= 0.3 && wr <= 0.35 + 1e-9;
  const where = inBand ? "落在 30-35 带内，按主窗口径认" : wr < 0.3 ? "低于 30-35 带" : "高于 30-35 带";
  return `数字说了什么：馆 6 ${pct(wr)}，敌伤 ${mean(row.dmgTaken, row.games)}，${where}。这行就是验收表的馆 6，没有另抽一组。`;
}

function bracketTalk(rows: Night18Row[], base: Night18Row[]): string {
  const a = rows.find((r) => r.stage === 8)!;
  const b = rows.find((r) => r.stage === 9)!;
  const h7 = base.find((r) => r.stage === 7)!;
  const h8 = base.find((r) => r.stage === 8)!;
  const h10 = base.find((r) => r.stage === 10)!;
  const i7 = powerIndex(h7);
  const i8 = powerIndex(a);
  const i9 = powerIndex(b);
  const i10 = powerIndex(h10);
  const bound = i7 < powerIndex(h8) ? "基线 7<8 守住" : "基线 7<8 没守住";
  const after = i7 < i8 ? "A 之后 7<8 仍守住" : "A 把馆 8 指数压到馆 7 以下，7<8 段界破了";
  const nine = i8 < i9 && i9 < i10 ? "B 之后 8<9<10 仍升" : "B 动过之后 8、9、10 不再逐馆升";
  const hit = [a, b].filter((r) => r.hit).map((r) => `馆 ${r.stage}`);
  const dmgNote = `A 场均敌伤 ${mean(a.dmgTaken, a.games)}，验收行 ${mean(h8.dmgTaken, h8.games)}，系数记成 ${a.hitMul} 但累计敌伤没跟着降。`;
  return `数字说了什么：${a.arm} ${pct(rate(a))}（≥35% ${a.hit ? "到" : "未到"}）；${b.arm} ${pct(rate(b))}（≥25% ${b.hit ? "到" : "未到"}）。到线：${hit.join("、") || "无"}。${bound}；${after}；${nine}。${dmgNote}`;
}

function monoTalk(rows: Night18Row[]): string {
  const breaks = monoBreaks(rows);
  const bounds = ["3→4", "7→8"].filter((step) => breaks.includes(step));
  const inner = breaks.filter((step) => step !== "3→4" && step !== "7→8");
  const boundTxt = bounds.length ? `段界没守住：${bounds.join("、")}。` : "段界 3<4、7<8 守住。";
  const innerTxt = inner.length
    ? `其余回落：${inner.join("、")}。5→6 按主窗定量豁免（胜率是难度口径，指数只作参照）；别的回落照实记。`
    : "没有别的回落。";
  return `${boundTxt}${innerTxt}`;
}

function acceptRow(r: Night18Row): string {
  return `| ${r.stage} | ${r.enemy} | ${r.grade} | ${r.hp} | ${r.hitMul} | ${r.games} | ${pct(rate(r))} | ${JAG_TARGET[r.stage]?.label ?? "—"} | ${r.hit ? "到" : "未到"} | ${mean(r.handSum, r.games)} | ${mean(r.dmgTaken, r.games)} | ${mean(r.dmgDealt, r.games)} |`;
}

function powerRow(r: Night18Row): string {
  const hp = mean(r.foeHp, r.games);
  return `| ${r.stage} | ${r.enemy} | ${r.enemyId} | ${hp} | ${r.hitMul} | ${r.segBudget} | ${powerIndex(r).toFixed(0)} |`;
}

function armRow(r: Night18Row): string {
  return `| ${r.arm} | ${r.stage} | ${r.enemy} | ${r.hitMul} | ${r.games} | ${pct(rate(r))} | ${JAG_TARGET[r.stage]?.label ?? "—"} | ${r.hit ? "到" : "未到"} | ${mean(r.handSum, r.games)} | ${mean(r.dmgTaken, r.games)} | ${mean(r.dmgDealt, r.games)} | ${mean(r.foeHp, r.games)} | ${powerIndex(r).toFixed(0)} |`;
}

export function renderNight18(data: Night18Data): string {
  const hall6 = data.base.find((r) => r.stage === 6)!;
  return [
    "# 夜校十八班报告 · 2026-11-16",
    "",
    `种子 ${SIM_SEED} · 旋钮 ${KNOB_VERSION}（${knobLabel(DEFAULT_KNOBS)}） · ${boardStamp()} · ${poolStamp()}。入口 \`npm run sim:climb:night18\`。src 未改。玩家血 / 兵器档读 \`hpOf\` / \`growthOf\`（内部是 \`climbHallGrowth\`）。敌伤系数读 \`hallEnemyHitMul\`。馆 8/9 两臂才覆写模拟旋钮。`,
    "",
    "## P0 全馆验收",
    "",
    "盐 = 兵器档 + 3。环境走 `envTagForHall`。馆 2 为 40 局。",
    "",
    "| 馆 | 敌 | 档 | 血 | 系数 | 局 | 胜率 | 线 | 到否 | 场均手 | 敌伤 | 我伤 |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|",
    ...data.base.map(acceptRow),
    "",
    baseTalk(data.base),
    "",
    "## P1 馆 6 复核",
    "",
    "组合刀与波次修正已在结算里。不另开盐。",
    "",
    `| 馆 | 胜率 | 敌伤 | 我伤 | 场均手 | 30-35 |`,
    `|---|---|---|---|---|---|`,
    `| 6 | ${pct(rate(hall6))} | ${mean(hall6.dmgTaken, hall6.games)} | ${mean(hall6.dmgDealt, hall6.games)} | ${mean(hall6.handSum, hall6.games)} | ${rate(hall6) + 1e-9 >= 0.3 && rate(hall6) <= 0.35 + 1e-9 ? "带内" : "带外"} |`,
    "",
    hall6Talk(hall6),
    "",
    "## P2 馆 8/9 bracket",
    "",
    "A：馆 8 敌伤系数 ×0.8（`enemyHitMul`）。B：馆 9 敌血 ×0.85。各 20 局，盐与验收相同。",
    "",
    "| 臂 | 馆 | 敌 | 系数 | 局 | 胜率 | 线 | 到否 | 场均手 | 敌伤 | 我伤 | 敌血 | 指数 |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|---|",
    ...data.bracket.map(armRow),
    "",
    bracketTalk(data.bracket, data.base),
    "",
    "## P3 单调性（数值十三班口径）",
    "",
    "指数 = 场均开局敌血 × 伤系数 × 段预算。段预算 = `ENEMY_ENERGY` 缺省 2，再加上该馆 `segBonus`（`enemyRoundBudgetCap`；踢馆 `enemySegAll` 开着）。不用含手数的场均段。",
    "",
    "| 馆 | 敌 | id | 有效血 | 系数 | 段预算 | 指数 |",
    "|---|---|---|---|---|---|---|",
    ...data.base.map(powerRow),
    "",
    monoTalk(data.base),
    "",
    "未 commit。",
    "",
  ].join("\n");
}
