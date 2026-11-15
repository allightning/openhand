import { boardStamp, poolStamp } from "./pool";
import { DEFAULT_KNOBS, KNOB_VERSION, knobLabel } from "./knobs";
import { JAG_TARGET } from "./night10Run";
import type { Night16Data, Night16GradeRow, Night16KnobRow, Night16PierceRow } from "./night16Run";
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

function pierceShare(p: Night16PierceRow): string {
  if (p.dmgDealt <= 0) return "—";
  return ((p.bleed + p.poison + p.pierce) / p.dmgDealt).toFixed(3);
}

const N14: Record<number, { base: string; poison: string; line: string; poisonShare: string }> = {
  4: { base: "0%", poison: "60%", line: "≥50%", poisonShare: "0.620" },
  6: { base: "0%", poison: "10%", line: "≥35%", poisonShare: "0.484" },
  9: { base: "0%", poison: "0%", line: "≥25%", poisonShare: "0.543" },
};

function pierceTalk(rows: Night16PierceRow[]): string {
  const bits = rows.map((r) => {
    const wr = pct(rate(r.wins, r.games));
    const line = N14[r.stage]!;
    const hit = rate(r.wins, r.games) + 1e-9 >= (JAG_TARGET[r.stage]?.floor ?? 0);
    return `馆 ${r.stage} ${wr}（淬毒 ${line.poison}，线 ${line.line}，${hit ? "到" : "未到"}，破挡占比 ${pierceShare(r)} / 淬毒 ${line.poisonShare}）`;
  });
  const hall4 = rows.find((r) => r.stage === 4)!;
  const wr4 = rate(hall4.wins, hall4.games);
  let verdict: string;
  if (wr4 + 1e-9 >= 0.5 && rows.every((r) => rate(r.wins, r.games) + 1e-9 >= (JAG_TARGET[r.stage]?.floor ?? 0))) {
    verdict = "破甲+裂石三馆都到线，构筑层跨系口能复现淬毒抬升";
  } else if (wr4 + 1e-9 >= 0.5) {
    verdict = "馆 4 能复现淬毒到线，后段复现不了——跨系口必要不充分，和毒一样挡不住馆 6/9 敌侧压顶";
  } else if (rows.some((r) => r.wins > 0)) {
    verdict = "破甲+裂石有抬升但复现不了淬毒的馆 4 跃迁，待拍 35 不能把这两件当淬毒替代";
  } else {
    verdict = "破甲+裂石三馆胜率未动，跨系口复现不了淬毒抬升";
  }
  return `数字说了什么：${bits.join("；")}。${verdict}。穿挡列含破甲穿挡（正式结算 note）。10 局粒度 ±10 点。`;
}

function gradeTalk(rows: Night16GradeRow[]): string {
  const r = rows[0]!;
  const wr = rate(r.wins, r.games);
  const brainless = wr + 1e-9 >= 0.95;
  const lift = wr - 0.8;
  const liftTxt = `${lift >= 0 ? "+" : ""}${(lift * 100).toFixed(1)} 点`;
  let verdict: string;
  if (brainless) verdict = "档 3 前移到馆 4 起，会把馆 5 推到 95%+，馆 5 变无脑";
  else if (wr + 1e-9 >= 0.9) verdict = "档 3 前移抬馆 5 接近封顶，但 20 局没到 95%+，还不算无脑";
  else verdict = "档 3 前移没有把馆 5 推成无脑（对照十三班散点 80%）";
  return `数字说了什么：馆 5 档 3 前移 ${pct(wr)}（二十局，盐 20），对照十三班档 2 散点 80.0%，差 ${liftTxt}。${verdict}。20 局粒度 ±5 点。`;
}

function knobsTalk(rows: Night16KnobRow[]): string {
  const bits = rows.map((r) => {
    const wr = pct(rate(r.wins, r.games));
    const hands = mean(r.handSum, r.games);
    return `${r.arm} ${wr}（场均手 ${hands}，敌伤 ${mean(r.dmgTaken, r.games)}，我伤 ${mean(r.dmgDealt, r.games)}，系数 ${r.hitMul}，血旋钮 ${r.enemyHpKnob}，线 ≥35% ${r.hit ? "到" : "未到"}）`;
  });
  const hitters = rows.filter((r) => r.hit).map((r) => r.arm);
  let verdict: string;
  if (hitters.length === 2) verdict = "两臂都能到 35% 线";
  else if (hitters.length === 1) verdict = `只有 ${hitters[0]} 到 35% 线`;
  else verdict = "两臂都到不了 35% 线，馆 6 第四刀还要更重的敌侧下调，或两条一起动";
  return `数字说了什么：${bits.join("；")}。对照十五班馆 6 档 3 提前 0% / 敌伤 366.7。${verdict}。10 局粒度 ±10 点。`;
}

function pierceRow(r: Night16PierceRow): string {
  const n14 = N14[r.stage]!;
  return `| ${r.stage} | ${r.enemy} | ${shortVar(r.variant)} | ${n14.base} | ${n14.poison} | ${pct(rate(r.wins, r.games))} | ${n14.line} | ${r.dmgDealt} | ${r.bleed} | ${r.poison} | ${r.pierce} | ${pierceShare(r)} |`;
}

function gradeRow(r: Night16GradeRow): string {
  return `| ${r.arm} | ${r.stage} | ${r.enemy} | ${pct(rate(r.wins, r.games))} | ${pct(r.jag)} | ${r.hit ? "到" : "未到"} | ${mean(r.dmgTaken, r.games)} | ${mean(r.dmgDealt, r.games)} |`;
}

function knobRow(r: Night16KnobRow): string {
  return `| ${r.arm} | ${r.enemy} | ${r.hitMul} | ${r.enemyHpKnob} | ${pct(rate(r.wins, r.games))} | ≥35% | ${r.hit ? "到" : "未到"} | ${mean(r.handSum, r.games)} | ${mean(r.dmgTaken, r.games)} | ${mean(r.dmgDealt, r.games)} |`;
}

export function renderNight16(data: Night16Data): string {
  return [
    "# 夜校十六班报告 · 2026-11-15",
    "",
    `种子 ${SIM_SEED} · 旋钮 ${KNOB_VERSION}（${knobLabel(DEFAULT_KNOBS)}） · ${boardStamp()} · ${poolStamp()}。入口 \`npm run sim:climb:night16\`。src 结算未改。破甲 / 裂石走 \`labMateMinds=pojia\` + \`techniques=lieshi\`（\`guardBreak\` / \`hitEnemy\` 正式口）。馆 6 敌伤系数 / 敌血只覆写模拟旋钮。`,
    "",
    "## P1 35 终验：破甲 + 裂石 vs 淬毒",
    "",
    "馆 4 / 6 / 9 各 10 局。盐 = 十四班淬毒组（\`310 + 馆 + 7 + 注入张数\`）。基线 / 淬毒列抄十四班，本班只跑破甲+裂石。",
    "",
    "| 馆 | 敌 | 谱 | 基线（十四班） | 淬毒（十四班） | 破甲+裂石 | 线 | 总我伤 | 裂创 | 毒 | 穿挡 | 破挡占比 |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|",
    ...data.pierce.map(pierceRow),
    "",
    pierceTalk(data.pierce),
    "",
    "## P2 档 3 前移对馆 5",
    "",
    "HP 140 + 档 3 兵器 + 馆 7 口径注入（4 精 2 绝）。20 局，对局盐 20（对齐十三班散点馆 5 档 2 的 80.0%）。",
    "",
    "| 臂 | 馆 | 敌 | 胜率 | 线 | 到否 | 敌伤 | 我伤 |",
    "|---|---|---|---|---|---|---|---|",
    ...data.grade.map(gradeRow),
    "",
    gradeTalk(data.grade),
    "",
    "## P3 馆 6 敌侧支架（28 第四刀）",
    "",
    "盐 0 龟谱。A：\`enemyHitMul\` MID 0.7 → 0.6（\`openHall\` 覆写，不改 src）。B：\`enemyHp\` ×0.85。各 10 局，对局盐 706（对齐十五班扫描）。",
    "",
    "| 臂 | 敌 | 系数 | 血旋钮 | 胜率 | 线 | 到否 | 场均手 | 敌伤 | 我伤 |",
    "|---|---|---|---|---|---|---|---|---|---|",
    ...data.knobs.map(knobRow),
    "",
    knobsTalk(data.knobs),
    "",
    "未 commit。",
    "",
  ].join("\n");
}
