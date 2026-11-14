import { boardStamp, poolStamp } from "./pool";
import { DEFAULT_KNOBS, KNOB_VERSION, knobLabel } from "./knobs";
import type { Night9Cell, Night9Data } from "./night9Run";
import { SIM_SEED } from "./tiers";

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function win(c: Night9Cell): number {
  return c.games ? c.wins / c.games : 0;
}

function hands(c: Night9Cell): number {
  return c.games ? c.handSum / c.games : 0;
}

function mean(n: number, games: number): string {
  return (n / Math.max(1, games)).toFixed(1);
}

function poolRatio(c: Night9Cell): string {
  const pool = c.hp * c.heads * c.games;
  if (!pool) return "—";
  return (c.dmgTaken / pool).toFixed(3);
}

function dmgPerHand(c: Night9Cell): string {
  if (!c.handSum) return "—";
  return (c.dmgTaken / c.handSum).toFixed(2);
}

function targetOf(stage: number): { floor: number; label: string } | null {
  if (stage <= 3) return { floor: 0.5, label: "≥50%" };
  if (stage <= 6) return { floor: 0.3, label: "≥30%" };
  if (stage <= 9) return { floor: 0.15, label: "≥15%" };
  return null;
}

function mark(c: Night9Cell): string {
  const t = targetOf(c.stage);
  if (!t || !c.games) return "—";
  return win(c) + 1e-9 >= t.floor ? "到" : "未到";
}

function turtle(stage: number): string {
  return stage === 4 || stage === 9 ? "对龟" : "—";
}

function row(c: Night9Cell): string {
  const t = targetOf(c.stage);
  const bag = c.injected.length ? c.injected.join(" ") : "—";
  return `| ${c.stage} | ${turtle(c.stage)} | ${c.enemy} | ${c.dmgCoef} | ${c.hp} | ${c.heads} | ${c.grade} | ${bag} | ${pct(win(c))} | ${t ? t.label : "不设"} | ${mark(c)} | ${hands(c).toFixed(1)} | ${mean(c.dmgTaken, c.games)} | ${mean(c.dmgDealt, c.games)} | ${poolRatio(c)} | ${dmgPerHand(c)} |`;
}

export function renderNight9(data: Night9Data): string {
  const lines = [
    "# 夜校九班报告 · 2026-11-02",
    "",
    `种子 ${SIM_SEED} · 旋钮 ${KNOB_VERSION}（${knobLabel(DEFAULT_KNOBS)}） · ${boardStamp()} · 卡池 ${poolStamp()}。每格 ${data.games} 局，单馆，刀配装。src 结算未改，旋钮默认未改。`,
    "",
    `门：${data.gate || "NUMGEN8"}。馆梯 dmgCoef 直进（rawLadder，不乘 STAGE_DMG）。`,
    "",
    "## P1 破挡优先",
    "",
    "敌挡 >8 时，手里能出的裂创/破绽牌先打。八班对龟收势仍在：敌挡 >10 或 3 手没掉血则收势 2 手。",
    "",
    "## P2 成长档散点",
    "",
    "沿用八班：血档 60/90/140，馆 2 起三人，换人带本系当铺同档牌。目标：馆 1–3 ≥50%，馆 4–6 ≥30%，馆 7–9 ≥15%。",
    "",
    "| 馆 | 标记 | 敌 | 梯伤 | 血 | 人数 | 档 | 刀注入 | 胜率 | 目标 | 到否 | 场均手 | 敌伤 | 我伤 | 血池消耗比 | 敌伤每手 |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|",
  ];
  for (const c of data.scatter) lines.push(row(c));
  lines.push("");
  lines.push("### 对龟");
  lines.push("");
  for (const c of data.scatter.filter((item) => item.stage === 4 || item.stage === 9)) {
    lines.push(
      `馆 ${c.stage} 对龟（${c.enemy}）：胜率 ${pct(win(c))}，场均手 ${hands(c).toFixed(1)}，敌伤 ${mean(c.dmgTaken, c.games)}，我伤 ${mean(c.dmgDealt, c.games)}，血池消耗比 ${poolRatio(c)}，敌伤每手 ${dmgPerHand(c)}。`,
    );
  }
  const swaps = data.scatter.reduce((s, c) => s + c.swaps, 0);
  lines.push("");
  lines.push(`馆 1–10 换人合计 ${swaps}。`);
  lines.push("");
  lines.push("## P3 敌窗");
  lines.push("");
  lines.push("馆段全到才算到。到的段和馆 6–10 重叠的才测。关窗是 foeWindowP = 0，不进旋钮默认。");
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
