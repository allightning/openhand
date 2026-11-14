import { boardStamp, poolStamp } from "./pool";
import { DEFAULT_KNOBS, KNOB_VERSION, knobLabel } from "./knobs";
import type { Night8Cell, Night8Data } from "./night8Run";
import { SIM_SEED } from "./tiers";

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function win(c: Night8Cell): number {
  return c.games ? c.wins / c.games : 0;
}

function hands(c: Night8Cell): number {
  return c.games ? c.handSum / c.games : 0;
}

function mean(n: number, games: number): string {
  return (n / Math.max(1, games)).toFixed(1);
}

function poolRatio(c: Night8Cell): string {
  const pool = c.hp * c.heads * c.games;
  if (!pool) return "—";
  return (c.dmgTaken / pool).toFixed(3);
}

function targetOf(stage: number): { floor: number; label: string } | null {
  if (stage <= 3) return { floor: 0.5, label: "≥50%" };
  if (stage <= 6) return { floor: 0.3, label: "≥30%" };
  if (stage <= 9) return { floor: 0.15, label: "≥15%" };
  return null;
}

function mark(c: Night8Cell): string {
  const t = targetOf(c.stage);
  if (!t || !c.games) return "—";
  return win(c) + 1e-9 >= t.floor ? "到" : "未到";
}

function turtle(stage: number): string {
  return stage === 4 || stage === 9 ? "对龟" : "—";
}

function row(c: Night8Cell): string {
  const t = targetOf(c.stage);
  const bag = c.injected.length ? c.injected.join(" ") : "—";
  return `| ${c.stage} | ${turtle(c.stage)} | ${c.enemy} | ${c.hp} | ${c.heads} | ${c.grade} | ${bag} | ${c.mateInjected} | ${pct(win(c))} | ${t ? t.label : "不设"} | ${mark(c)} | ${hands(c).toFixed(1)} | ${mean(c.dmgTaken, c.games)} | ${mean(c.dmgDealt, c.games)} | ${poolRatio(c)} |`;
}

export function renderNight8(data: Night8Data): string {
  const lines = [
    "# 夜校八班报告 · 2026-11-02",
    "",
    `种子 ${SIM_SEED} · 旋钮 ${KNOB_VERSION}（${knobLabel(DEFAULT_KNOBS)}） · ${boardStamp()} · 卡池 ${poolStamp()}。每格 ${data.games} 局，单馆，刀配装。src 结算未改，旋钮默认未改。`,
    "",
    `门：${data.gate || "MECH5"}。`,
    "",
    "## P1 换人带牌",
    "",
    "换上来的人用自己的兵器档：白孟和拳、霍长川枪。起手是该系基础卡，同档精/绝从当铺池按种子抽，开战后再塞进后场抽堆。",
    "",
    "## P2 僵局策略",
    "",
    "敌挡 >10，或连续 3 手敌血没掉：这一手收势。连收 2 手攒劲，下一手优先打费高的攻击。六班换人冷却照旧。",
    "",
    "## P3 成长档散点",
    "",
    "血档 / 牌组档 / 三人血池沿用七班。馆 1 只有刀主。馆 2 起满编。馆 4、馆 9 标「对龟」。接力减半跟 MECH5 结算，本班不改 src。",
    "",
    "| 馆 | 标记 | 敌 | 血 | 人数 | 档 | 刀注入 | 同伴注入 | 胜率 | 目标 | 到否 | 场均手 | 敌伤 | 我伤 | 血池消耗比 |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|",
  ];
  for (const c of data.scatter) lines.push(row(c));
  lines.push("");
  lines.push("### 对龟");
  lines.push("");
  for (const c of data.scatter.filter((item) => item.stage === 4 || item.stage === 9)) {
    lines.push(
      `馆 ${c.stage} 对龟（${c.enemy}）：胜率 ${pct(win(c))}，场均手 ${hands(c).toFixed(1)}，敌伤 ${mean(c.dmgTaken, c.games)}，我伤 ${mean(c.dmgDealt, c.games)}，血池消耗比 ${poolRatio(c)}。`,
    );
  }
  const swaps = data.scatter.reduce((s, c) => s + c.swaps, 0);
  lines.push("");
  lines.push(`馆 1–10 换人合计 ${swaps}。`);
  lines.push("");
  lines.push("## P4 敌窗");
  lines.push("");
  lines.push("馆段全到才算到：馆 1–3 都 ≥50%，馆 4–6 都 ≥30%，馆 7–9 都 ≥15%。到的段和馆 6–10 重叠的才测。开窗给馆 ≥6 挂拆招 / 缠手 / 读破。关窗是 foeWindowP = 0，不进旋钮默认。");
  lines.push("");
  lines.push(data.reached.length ? `到的馆段：${data.reached.join("、")}。` : "到的馆段：无。");
  lines.push("");
  if (!data.windows.length) {
    lines.push("馆 6–10 没有落在已到的馆段里。敌窗没测。");
  } else {
    lines.push("| 馆 | 开胜率 | 关胜率 | 胜差 | 开手数 | 关手数 | 开敌伤 | 关敌伤 | 开我伤 | 关我伤 | 开拆/缠/读 | 关拆/缠/读 | 开挂窗 |");
    lines.push("|---|---|---|---|---|---|---|---|---|---|---|---|---|");
    for (const w of data.windows) {
      const delta = (win(w.on) - win(w.off)) * 100;
      const sign = delta > 0 ? "+" : "";
      lines.push(
        `| ${w.stage} | ${pct(win(w.on))} | ${pct(win(w.off))} | ${sign}${delta.toFixed(1)} | ${hands(w.on).toFixed(1)} | ${hands(w.off).toFixed(1)} | ${mean(w.on.dmgTaken, w.on.games)} | ${mean(w.off.dmgTaken, w.off.games)} | ${mean(w.on.dmgDealt, w.on.games)} | ${mean(w.off.dmgDealt, w.off.games)} | ${w.on.dismantle}/${w.on.bind}/${w.on.read} | ${w.off.dismantle}/${w.off.bind}/${w.off.read} | ${w.on.armed}/${w.on.games} |`,
      );
    }
  }
  lines.push("");
  lines.push("未 commit。");
  lines.push("");
  return lines.join("\n");
}
