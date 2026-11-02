import { boardStamp, poolStamp } from "./pool";
import { DEFAULT_KNOBS, KNOB_VERSION, knobLabel } from "./knobs";
import type { Night4Cell, Night4Row } from "./night4Run";
import type { Night5Data } from "./night5Run";
import { SIM_SEED } from "./tiers";

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function win(c: Night4Cell): number {
  return c.games ? c.wins / c.games : 0;
}

function hands(c: Night4Cell): number {
  return c.games ? c.handSum / c.games : 0;
}

function ratio(c: Night4Cell): string {
  if (!c.games || c.dmgDealt <= 0) return "—";
  return (c.dmgTaken / c.dmgDealt).toFixed(3);
}

function targetOf(stage: number): { floor: number; label: string } | null {
  if (stage <= 3) return { floor: 0.5, label: "≥50%" };
  if (stage <= 6) return { floor: 0.3, label: "≥30%" };
  return null;
}

function mark(c: Night4Cell): string {
  const t = targetOf(c.stage);
  if (!t || !c.games) return "—";
  return win(c) + 1e-9 >= t.floor ? "到" : "未到";
}

function pairTable(on: Night4Row, off: Night4Row): string[] {
  const lines = [
    `| 馆 | 开·胜 | 关·胜 | 胜差 | 开·手 | 关·手 | 手差 | 开·挂窗 | 开·拆/缠/读 | 关·拆/缠/读 |`,
    `|---|---|---|---|---|---|---|---|---|---|`,
  ];
  let ow = 0;
  let fw = 0;
  let oh = 0;
  let fh = 0;
  let n = 0;
  for (let s = 6; s <= 10; s++) {
    const a = on.cells[s - 1]!;
    const b = off.cells[s - 1]!;
    if (!a.games && !b.games) continue;
    ow += a.wins;
    fw += b.wins;
    oh += a.handSum;
    fh += b.handSum;
    n += a.games;
    const aw = win(a);
    const bw = win(b);
    lines.push(
      `| ${s} | ${pct(aw)} | ${pct(bw)} | ${((aw - bw) * 100).toFixed(1)} 点 | ${hands(a).toFixed(1)} | ${hands(b).toFixed(1)} | ${(hands(a) - hands(b)).toFixed(1)} | ${a.armed}/${a.games} | ${a.dismantle}/${a.bind}/${a.read} | ${b.dismantle}/${b.bind}/${b.read} |`,
    );
  }
  lines.push("");
  if (n) {
    lines.push(
      `合计 开 ${pct(ow / n)} / ${(oh / n).toFixed(1)} 手，关 ${pct(fw / n)} / ${(fh / n).toFixed(1)} 手。胜差 ${(((ow - fw) / n) * 100).toFixed(1)} 点，手差 ${((oh - fh) / n).toFixed(1)}。`,
    );
    lines.push("");
  }
  return lines;
}

function scatterBlock(row: Night4Row, games: number): string[] {
  const lines = [
    "## 馆 1–10 胜率散点",
    "",
    `刀配装、满血单馆、种子 ${SIM_SEED}、每格 ${games} 局。同夜四配装。目标：馆 1–3 ≥50%，馆 4–6 ≥30%，馆 7+ 不苛求。`,
    "",
    `| 馆 | 胜率 | 目标 | 到否 | 场均手 | 敌伤 | 我伤 | 敌伤/我伤 |`,
    `|---|---|---|---|---|---|---|---|`,
  ];
  for (const c of row.cells) {
    if (!c.games) continue;
    const t = targetOf(c.stage);
    lines.push(
      `| ${c.stage} | ${pct(win(c))} | ${t ? t.label : "不苛求"} | ${mark(c)} | ${hands(c).toFixed(1)} | ${(c.dmgTaken / c.games).toFixed(1)} | ${(c.dmgDealt / c.games).toFixed(1)} | ${ratio(c)} |`,
    );
  }
  lines.push("");
  const early = row.cells.filter((c) => c.stage <= 3 && c.games);
  const mid = row.cells.filter((c) => c.stage >= 4 && c.stage <= 6 && c.games);
  const earlyOk = early.every((c) => win(c) >= 0.5);
  const midOk = mid.every((c) => win(c) >= 0.3);
  lines.push(`馆 1–3 全部 ≥50%：${earlyOk ? "是" : "否"}。馆 4–6 全部 ≥30%：${midOk ? "是" : "否"}。`);
  lines.push("");
  return lines;
}

export function renderNight5(data: Night5Data, gateNote: string): string {
  const winBlock = data.windows
    ? [
        "## 敌窗开/关（新曲线）",
        "",
        "馆 6–10，同一刀配装。开 = 馆≥6 挂三窗，触发按 caps 原型概率。关 = `foeWindowP=0`。原曲线双方胜率都是 0%，胜差被盖住。",
        "",
        ...pairTable(data.windows.on, data.windows.off),
      ]
    : ["## 敌窗开/关（新曲线）", "", "NUMGEN6 未齐，敌窗对照没跑。", ""];

  return [
    "# 夜校五班报告 · 2026-11-02",
    "",
    gateNote,
    "",
    `种子 ${SIM_SEED} · 旋钮 ${KNOB_VERSION}（${knobLabel(DEFAULT_KNOBS)}） · ${boardStamp()} · 卡池 ${poolStamp()}。每格 ${data.games} 局，满血单馆。src 未改，旋钮默认未改。`,
    "",
    ...scatterBlock(data.scatter, data.games),
    ...winBlock,
    "未 commit。",
    "",
  ].join("\n");
}
