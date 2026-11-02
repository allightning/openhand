import { boardStamp, poolStamp } from "./pool";
import { DEFAULT_KNOBS, KNOB_VERSION, knobLabel } from "./knobs";
import type { Night6Cell, Night6Data } from "./night6Run";
import { SIM_SEED } from "./tiers";

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function win(c: Night6Cell): number {
  return c.games ? c.wins / c.games : 0;
}

function hands(c: Night6Cell): number {
  return c.games ? c.handSum / c.games : 0;
}

function ratio(c: Night6Cell): string {
  if (!c.games || c.dmgDealt <= 0) return "—";
  return (c.dmgTaken / c.dmgDealt).toFixed(3);
}

function targetOf(stage: number): { floor: number; label: string } | null {
  if (stage <= 3) return { floor: 0.5, label: "≥50%" };
  if (stage <= 6) return { floor: 0.3, label: "≥30%" };
  if (stage <= 9) return { floor: 0.15, label: "≥15%" };
  return null;
}

function mark(c: Night6Cell): string {
  const t = targetOf(c.stage);
  if (!t || !c.games) return "—";
  return win(c) + 1e-9 >= t.floor ? "到" : "未到";
}

export function renderNight6(data: Night6Data): string {
  const lines = [
    "# 夜校六班报告 · 2026-11-02",
    "",
    `种子 ${SIM_SEED} · 旋钮 ${KNOB_VERSION}（${knobLabel(DEFAULT_KNOBS)}） · ${boardStamp()} · 卡池 ${poolStamp()}。每格 ${data.games} 局，满血单馆，刀配装。src 结算未改，旋钮默认未改。`,
    "",
    "## P1 换人冷却",
    "",
    "同一手最多换 1 次。换上去的人接下来 2 手不许换下（到手当手加后面一整手）。血低于 60% 换上白孟和，回到 85% 换回。馆 4、兵器档 3、每格与夜五相同的 20 局。",
    "",
    `馆 4 同伴格换人合计 ${data.hall4Swaps}（${data.hall4Games} 局）。夜五同格是 720。`,
    "",
    "## P2 成长档散点",
    "",
    "馆 1–2 档 1 起手。馆 3–4 档 2 + 2 精。馆 5–6 档 2 + 4 精。馆 7–9 档 3 + 2 绝 4 精。馆 10 档 3 + 3 绝 4 精。精/绝从当铺奖励池按种子抽，可重复。绝牌用馆 ≥8 的开闸池。未到的馆只记账。",
    "",
    "| 馆 | 档 | 注入 | 胜率 | 目标 | 到否 | 场均手 | 敌伤 | 我伤 | 敌伤/我伤 |",
    "|---|---|---|---|---|---|---|---|---|---|",
  ];
  const missed: string[] = [];
  for (const c of data.scatter) {
    const t = targetOf(c.stage);
    const bag = c.injected.length ? c.injected.join(" ") : "—";
    lines.push(
      `| ${c.stage} | ${c.grade} | ${bag} | ${pct(win(c))} | ${t ? t.label : "不设"} | ${mark(c)} | ${hands(c).toFixed(1)} | ${(c.dmgTaken / Math.max(1, c.games)).toFixed(1)} | ${(c.dmgDealt / Math.max(1, c.games)).toFixed(1)} | ${ratio(c)} |`,
    );
    if (t && win(c) + 1e-9 < t.floor) {
      missed.push(`馆 ${c.stage} 未到：敌伤 ${(c.dmgTaken / c.games).toFixed(1)}，我伤 ${(c.dmgDealt / c.games).toFixed(1)}，场均手 ${hands(c).toFixed(1)}。`);
    }
  }
  lines.push("");
  lines.push(missed.length ? missed.join("\n") : "设了目标的馆都到了。");
  lines.push("");
  lines.push("未 commit。");
  lines.push("");
  return lines.join("\n");
}
