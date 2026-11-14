import { boardStamp, poolStamp } from "./pool";
import { DEFAULT_KNOBS, KNOB_VERSION, knobLabel } from "./knobs";
import { JAG_TARGET, type Night10Cell } from "./night10Run";
import type { Night13Data, Night13Pierce } from "./night13Run";
import { SIM_SEED } from "./tiers";

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function win(c: Night10Cell): number {
  return c.games ? c.wins / c.games : 0;
}

function hands(c: Night10Cell): string {
  return c.games ? (c.handSum / c.games).toFixed(1) : "0.0";
}

function mean(n: number, games: number): string {
  return (n / Math.max(1, games)).toFixed(1);
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

function poolRatio(c: Night10Cell): string {
  const pool = c.hp * c.heads * c.games;
  if (!pool) return "—";
  return (c.dmgTaken / pool).toFixed(3);
}

function dmgPerHand(c: Night10Cell): string {
  if (!c.handSum) return "—";
  return (c.dmgTaken / c.handSum).toFixed(2);
}

function row(c: Night10Cell): string {
  const t = JAG_TARGET[c.stage];
  return `| ${c.stage} | ${c.enemy} | ${c.hitMul} | ${c.dmgCoef} | ${c.hp} | ${c.heads} | ${c.grade} | ${c.injected.join(" ") || "—"} | ${pct(win(c))} | ${t ? t.label : "—"} | ${mark(c)} | ${hands(c)} | ${mean(c.dmgTaken, c.games)} | ${mean(c.dmgDealt, c.games)} | ${poolRatio(c)} | ${dmgPerHand(c)} | ${variants(c)} |`;
}

function pierceShare(p: Night13Pierce): string {
  if (p.dmgDealt <= 0) return "—";
  return ((p.bleed + p.poison + p.pierce) / p.dmgDealt).toFixed(3);
}

export function renderNight13(data: Night13Data): string {
  const h9 = data.hall9;
  const lines = [
    "# 夜校十三班报告 · 2026-11-14",
    "",
    `种子 ${SIM_SEED} · 旋钮 ${KNOB_VERSION}（${knobLabel(DEFAULT_KNOBS)}） · ${boardStamp()} · 卡池 ${poolStamp()}。散点每格 ${data.games} 局。src 结算未改。`,
    "",
    "## P1 洗牌与开手套件",
    "",
    "真局 `startLabBattle` 调 `makeBattle(..., ordered=false)`：`deal` / 回收 / 爬塔重建抽堆都走 `shuffle`，用 `battleRng`。夜校此前 `makeBattle` 默认 `ordered=true`，开手不洗，注入牌贴在抽堆末。本班开战 `ordered=false`，注入后再用同一种子洗抽堆（含后场）。",
    "",
    "`applyEliteKit` 改走 `commitFoeKit`（站位之后），龟/游走开手吃变体池 + 保底逼近。不改 src。",
    "",
    "## P2 注入前移",
    "",
    "馆 1 仍 0 精。馆 2 = 档 1 + 1 精。馆 3–4 = 档 2 + 2 精。后续不变。",
    "",
    "| 馆 | 档 | 精 | 绝 | 注入 |",
    "|---|---|---|---|---|",
  ];
  for (const rowI of data.inject) {
    lines.push(`| ${rowI.stage} | ${rowI.grade} | ${rowI.adept} | ${rowI.supreme} | ${rowI.cards.join(" ") || "—"} |`);
  }
  lines.push("");
  lines.push("## P3 锯齿散点");
  lines.push("");
  lines.push(`馆 1 先验敌伤 ${data.hall1Taken.toFixed(1)}，伤系 0.3 ${data.hall1Ok ? "已进" : "未进"}。目标：1–2 ≥60%，3 ≥30%，4 ≥50%，5 ≥40%，6 ≥35%，7 ≥20%，8 ≥35%，9 ≥25%，10 ≥10%。`);
  lines.push("");
  lines.push("| 馆 | 敌 | 伤系 | 梯伤 | 血 | 人数 | 档 | 注入 | 胜率 | 目标 | 到否 | 场均手 | 敌伤 | 我伤 | 血池消耗比 | 敌伤每手 | 变体 |");
  lines.push("|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|");
  for (const c of data.scatter) lines.push(row(c));
  lines.push("");
  lines.push("## P3 馆 9 复测");
  lines.push("");
  lines.push(
    `${h9.enemy} · ${h9.variant} · 胜 ${h9.wins}/${h9.games} · 超时0伤 ${h9.timeoutZero}/${h9.games} · 场均手 ${h9.handMean.toFixed(1)} · 我伤 ${h9.dmgDealtMean.toFixed(1)} · 最近 ${h9.minDistMean.toFixed(1)} · 弃远攻 ${h9.dumpMean.toFixed(1)} · 开手进势手合计 ${h9.approachHands}`,
  );
  lines.push("");
  for (const r of h9.rows) {
    lines.push(
      `- 局${r.i + 1} 胜=${r.win ? "是" : "否"} 手${r.hands} 我伤${r.dmgDealt} 最近${r.minDist} 弃${r.dumpN} 开手队列 ${r.openQ}`,
    );
  }
  lines.push("");
  lines.push("## P3 破挡伤占比");
  lines.push("");
  lines.push("裂创跳血 + 毒跳血 + 破绽穿挡，除以总我伤。馆 5 散点无精英变体；馆 9 散点盖 foeRound，多为龟谱。");
  lines.push("");
  lines.push("| 馆 | 敌 | 变体 | 龟局 | 总我伤 | 裂创 | 毒 | 穿挡 | 破挡占比 |");
  lines.push("|---|---|---|---|---|---|---|---|---|");
  for (const p of data.pierce) {
    lines.push(
      `| ${p.stage} | ${p.enemy} | ${p.variant} | ${p.turtle}/${p.games} | ${p.dmgDealt} | ${p.bleed} | ${p.poison} | ${p.pierce} | ${pierceShare(p)} |`,
    );
  }
  lines.push("");
  lines.push("## P3 敌窗 6–10");
  lines.push("");
  lines.push(data.reached.length ? `散点到的馆：${data.reached.join("、")}。` : "散点到的馆：无。");
  lines.push("");
  lines.push("| 馆 | 开胜率 | 关胜率 | 胜差 | 开手数 | 关手数 | 开敌伤 | 关敌伤 | 开我伤 | 关我伤 | 开拆/缠/读 | 关拆/缠/读 | 开挂窗 |");
  lines.push("|---|---|---|---|---|---|---|---|---|---|---|---|---|");
  for (const w of data.windows) {
    const delta = (win(w.on) - win(w.off)) * 100;
    const sign = delta > 0 ? "+" : "";
    lines.push(
      `| ${w.stage} | ${pct(win(w.on))} | ${pct(win(w.off))} | ${sign}${delta.toFixed(1)} | ${hands(w.on)} | ${hands(w.off)} | ${mean(w.on.dmgTaken, w.on.games)} | ${mean(w.off.dmgTaken, w.off.games)} | ${mean(w.on.dmgDealt, w.on.games)} | ${mean(w.off.dmgDealt, w.off.games)} | ${w.on.dismantle}/${w.on.bind}/${w.on.read} | ${w.off.dismantle}/${w.off.bind}/${w.off.read} | ${w.on.armed}/${w.on.games} |`,
    );
  }
  lines.push("");
  lines.push("未 commit。");
  lines.push("");
  return lines.join("\n");
}
