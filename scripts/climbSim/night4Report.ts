import { boardStamp, poolStamp } from "./pool";
import { DEFAULT_KNOBS, KNOB_VERSION, knobLabel } from "./knobs";
import type { Night4Cell, Night4Data, Night4Row } from "./night4Run";
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

function pairTable(on: Night4Row, off: Night4Row, from: number, to: number): string[] {
  const lines = [
    `| 馆 | 开·胜 | 关·胜 | 胜差 | 开·手 | 关·手 | 手差 | 开·挂窗 | 开·拆/缠/读 | 关·拆/缠/读 |`,
    `|---|---|---|---|---|---|---|---|---|---|`,
  ];
  let ow = 0;
  let fw = 0;
  let oh = 0;
  let fh = 0;
  let n = 0;
  for (let s = from; s <= to; s++) {
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

function scatterBlock(row: Night4Row): string[] {
  const lines = [
    "## P2 难度定位",
    "",
    "刀配装、满血单馆、种子 20261023。不判结论。敌伤 = 我方掉血合计，我伤 = 敌方掉血合计，比值 = 敌伤/我伤。",
    "",
    `| 馆 | 胜率 | 场均手 | 敌伤 | 我伤 | 敌伤/我伤 |`,
    `|---|---|---|---|---|---|`,
  ];
  let first30: number | null = null;
  const long: number[] = [];
  let prevR = "";
  for (const c of row.cells) {
    if (!c.games) continue;
    const w = win(c);
    const h = hands(c);
    const r = ratio(c);
    const taken = c.games ? (c.dmgTaken / c.games).toFixed(1) : "—";
    const dealt = c.games ? (c.dmgDealt / c.games).toFixed(1) : "—";
    lines.push(`| ${c.stage} | ${pct(w)} | ${h.toFixed(1)} | ${taken} | ${dealt} | ${r} |`);
    if (first30 == null && w < 0.3) first30 = c.stage;
    if (h > 15) long.push(c.stage);
    prevR = r;
  }
  void prevR;
  lines.push("");
  lines.push(`胜率跌破 30% 的第一个馆：${first30 == null ? "没有" : first30}。`);
  lines.push(`场均手数 >15 的馆：${long.length ? long.join("、") : "没有"}。`);
  lines.push("");
  lines.push("馆间比值变化（后馆 − 前馆）：");
  lines.push("");
  lines.push("| 从→到 | 比值差 | 胜差 | 手差 |");
  lines.push("|---|---|---|---|");
  for (let i = 1; i < row.cells.length; i++) {
    const a = row.cells[i - 1]!;
    const b = row.cells[i]!;
    if (!a.games || !b.games) continue;
    const ra = a.dmgDealt > 0 ? a.dmgTaken / a.dmgDealt : NaN;
    const rb = b.dmgDealt > 0 ? b.dmgTaken / b.dmgDealt : NaN;
    const rd = Number.isFinite(ra) && Number.isFinite(rb) ? (rb - ra).toFixed(3) : "—";
    lines.push(`| ${a.stage}→${b.stage} | ${rd} | ${((win(b) - win(a)) * 100).toFixed(1)} 点 | ${(hands(b) - hands(a)).toFixed(1)} |`);
  }
  lines.push("");
  return lines;
}

export function renderNight4(data: Night4Data, gateNote: string): string {
  const p1 = data.windows
    ? [
        "## P1 敌窗影响",
        "",
        "精英段馆 6–10，同一刀配装。开 = 配招 + 馆≥6 挂三窗，触发按 caps 原型概率（刺客 0.8 / 教头 0.6 / 游走 0.4 / 莽夫·乌龟 0.2）。目录敌没有 `def.elite`，开战 elite 进不了 kit，脚本在馆≥6 补挂，不改 src。关 = `foeWindowP=0` 清空。未改 DEFAULT_KNOBS。挂窗 = 开局 `foeWindows` 非空的局数。",
        "",
        `caps 敌窗相关键：${data.capKeys.join("、") || "无"}。`,
        "",
        "### 同配队 开/关",
        "",
        ...pairTable(data.elite.on, data.elite.off, 6, 10),
        "### 读破 × 单招流",
        "",
        "配装只留攻击牌 `cut` / `bleedcut` 两张，另留 `advance` 贴身。策略只打这两张攻击。",
        "",
        ...pairTable(data.read.on, data.read.off, 6, 10),
      ]
    : ["## P1 敌窗影响", "", "MECH3 未齐，敌窗对照没跑。", ""];

  return [
    "# 夜校四班报告 · 2026-11-02",
    "",
    gateNote,
    "",
    `种子 ${SIM_SEED} · 旋钮 ${KNOB_VERSION}（${knobLabel(DEFAULT_KNOBS)}） · ${boardStamp()} · 卡池 ${poolStamp()}。每格 ${data.games} 局，满血单馆。src 未改，旋钮默认未改。`,
    "",
    ...p1,
    ...scatterBlock(data.scatter),
    "未 commit。",
    "",
  ].join("\n");
}
