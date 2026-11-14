import { boardStamp, poolStamp } from "./pool";
import { DEFAULT_KNOBS, KNOB_VERSION, knobLabel } from "./knobs";
import { JAG_TARGET, type Night10Cell } from "./night10Run";
import type { Night12Data, Night12Probe } from "./night12Run";
import { SIM_SEED } from "./tiers";

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function win(c: Night10Cell): number {
  return c.games ? c.wins / c.games : 0;
}

function hands(c: Night10Cell): number {
  return c.games ? c.handSum / c.games : 0;
}

function mean(n: number, games: number): string {
  return (n / Math.max(1, games)).toFixed(1);
}

function poolRatio(c: Night10Cell): string {
  const pool = c.hp * c.heads * c.games;
  if (!pool) return "—";
  return (c.dmgTaken / pool).toFixed(3);
}

function dmgPerHand(c: Night10Cell): string {
  if (!c.handSum) return "—";
  return (c.dmgTaken / c.handSum).toFixed(2);
}

function mark(c: Night10Cell): string {
  const t = JAG_TARGET[c.stage];
  if (!t || !c.games) return "—";
  return win(c) + 1e-9 >= t.floor ? "到" : "未到";
}

function variants(c: Night10Cell): string {
  const keys = Object.keys(c.variants);
  if (!keys.length) return "—";
  return keys.map((k) => `${k}×${c.variants[k]}`).join(" ");
}

function row(c: Night10Cell): string {
  const t = JAG_TARGET[c.stage];
  return `| ${c.stage} | ${c.enemy} | ${c.hitMul} | ${c.dmgCoef} | ${c.hp} | ${c.heads} | ${pct(win(c))} | ${t ? t.label : "—"} | ${mark(c)} | ${hands(c).toFixed(1)} | ${mean(c.dmgTaken, c.games)} | ${mean(c.dmgDealt, c.games)} | ${poolRatio(c)} | ${dmgPerHand(c)} | ${variants(c)} |`;
}

function probeBlock(p: Night12Probe): string[] {
  const ok = p.timeoutZero === 0 ? "过" : "仍超时0伤";
  const lines = [
    `### ${p.id} · ${ok}`,
    "",
    `${p.enemy} · ${p.variant} · 胜 ${p.wins}/${p.games} · 超时0伤 ${p.timeoutZero}/${p.games} · 场均手 ${p.handMean.toFixed(1)} · 我伤 ${p.dmgDealtMean.toFixed(1)} · 最近 ${p.minDistMean.toFixed(1)} · 弃远攻 ${p.dumpMean.toFixed(1)} · 位移可出手 ${p.moveOkMean.toFixed(1)}`,
    "",
  ];
  for (const r of p.rows) {
    lines.push(
      `- 局${r.i + 1} 胜=${r.win ? "是" : "否"} 手${r.hands} 我伤${r.dmgDealt} 最近${r.minDist} 弃${r.dumpN} 位移可出${r.moveOk}`,
    );
  }
  lines.push("");
  return lines;
}

export function renderNight12(data: Night12Data): string {
  const lines = [
    "# 夜校十二班报告 · 2026-11-14",
    "",
    `种子 ${SIM_SEED} · 旋钮 ${KNOB_VERSION}（${knobLabel(DEFAULT_KNOBS)}） · ${boardStamp()} · 卡池 ${poolStamp()}。散点每格 ${data.games} 局。机制六班 / 数值九班报告已在。src 结算未改。`,
    "",
    "## P1 弃远攻",
    "",
    "连续 3 手没贴身且手牌 ≥6：弃牌阶段丢掉够不着的攻击，腾位摸位移。摸到逼近牌后优先出（避免破挡闷手把位移收势掉）。不改 src。",
    "",
    "## P2 锯齿散点",
    "",
    `馆 1 先验（未套弃远攻）场均敌伤 ${data.hall1Taken.toFixed(1)}，伤系 0.3 ${data.hall1Ok ? "已进" : "未进"}。`,
    "",
    "目标：1–2 ≥60%，3 ≥30%，4 ≥50%，5 ≥40%，6 ≥35%，7 ≥20%，8 ≥35%，9 ≥25%，10 ≥10%。",
    "",
    "| 馆 | 敌 | 伤系 | 梯伤 | 血 | 人数 | 胜率 | 目标 | 到否 | 场均手 | 敌伤 | 我伤 | 血池消耗比 | 敌伤每手 | 变体 |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|",
  ];
  for (const c of data.scatter) lines.push(row(c));
  lines.push("");
  lines.push("## P2 三格复测");
  lines.push("");
  lines.push(data.probePass ? "验收：三格都不再 40 手 0 伤。" : "验收：仍有格 40 手 0 伤。");
  lines.push("");
  for (const p of data.probes) lines.push(...probeBlock(p));
  lines.push("## P3 敌窗");
  lines.push("");
  lines.push(data.reached.length ? `散点到的馆：${data.reached.join("、")}。` : "散点到的馆：无。");
  if (!data.windows.length) {
    lines.push("");
    lines.push("馆 6–10 没有落到目标。敌窗没测。");
  } else {
    lines.push("");
    lines.push("| 馆 | 开胜率 | 关胜率 | 胜差 | 开手数 | 关手数 | 开敌伤 | 关敌伤 | 开拆/缠/读 | 关拆/缠/读 | 开挂窗 |");
    lines.push("|---|---|---|---|---|---|---|---|---|---|---|");
    for (const w of data.windows) {
      const delta = (win(w.on) - win(w.off)) * 100;
      const sign = delta > 0 ? "+" : "";
      lines.push(
        `| ${w.stage} | ${pct(win(w.on))} | ${pct(win(w.off))} | ${sign}${delta.toFixed(1)} | ${hands(w.on).toFixed(1)} | ${hands(w.off).toFixed(1)} | ${mean(w.on.dmgTaken, w.on.games)} | ${mean(w.off.dmgTaken, w.off.games)} | ${w.on.dismantle}/${w.on.bind}/${w.on.read} | ${w.off.dismantle}/${w.off.bind}/${w.off.read} | ${w.on.armed}/${w.on.games} |`,
      );
    }
  }
  lines.push("");
  lines.push("未 commit。");
  lines.push("");
  return lines.join("\n");
}
