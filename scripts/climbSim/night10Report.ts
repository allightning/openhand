import { boardStamp, poolStamp } from "./pool";
import { DEFAULT_KNOBS, KNOB_VERSION, knobLabel } from "./knobs";
import { JAG_TARGET, type Night10Cell, type Night10Data } from "./night10Run";
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

export function renderNight10(data: Night10Data): string {
  const lines = [
    "# 夜校十班报告 · 2026-11-14",
    "",
    `种子 ${SIM_SEED} · 旋钮 ${KNOB_VERSION}（${knobLabel(DEFAULT_KNOBS)}） · ${boardStamp()} · 卡池 ${poolStamp()}。每格 ${data.games} 局。src 结算未改。`,
    "",
    "## P1 敌伤接线",
    "",
    "散点走 `applyStageTuning`，不再 rawLadder。馆 1 先验：",
    "",
    `馆 1 场均敌伤 ${data.hall1Taken.toFixed(1)}。伤系应是 0.3。九班同格 33。${data.hall1Ok ? "系数已进。" : "还没掉到九班以下。"}`,
    "",
    "## P2 锯齿散点",
    "",
    "沿用八班血档 / 三人 / 换人带牌 / 破挡优先。目标：1–2 ≥60%，3 ≥30%，4 ≥50%，5 ≥40%，6 ≥35%，7 ≥20%，8 ≥35%，9 ≥25%，10 ≥10%。",
    "",
    "| 馆 | 敌 | 伤系 | 梯伤 | 血 | 人数 | 胜率 | 目标 | 到否 | 场均手 | 敌伤 | 我伤 | 血池消耗比 | 敌伤每手 | 变体 |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|",
  ];
  for (const c of data.scatter) lines.push(row(c));
  lines.push("");
  lines.push("## P3 一敌多谱");
  lines.push("");
  lines.push("馆 6–10 散点盖 foeRound，脚本按精英抽莽/龟/游走。馆 6 换盐对照：");
  lines.push("");
  lines.push("| 盐 | 变体 | 胜率 | 场均手 | 敌伤 |");
  lines.push("|---|---|---|---|---|");
  for (const k of data.kits) {
    lines.push(
      `| ${k.salt} | ${k.variant} | ${pct(k.games ? k.wins / k.games : 0)} | ${(k.games ? k.handSum / k.games : 0).toFixed(1)} | ${mean(k.dmgTaken, k.games)} |`,
    );
  }
  const distinct = new Set(data.kits.map((k) => k.variant));
  lines.push("");
  lines.push(distinct.size > 1 ? `同一敌不同谱 ${distinct.size} 套：${[...distinct].join("、")}。` : "换盐没换成另一套。");
  lines.push("");
  lines.push("## P4 敌窗");
  lines.push("");
  lines.push(data.reached.length ? `到的馆：${data.reached.join("、")}。` : "到的馆：无。");
  const winRows = data.windows;
  if (!winRows.length) {
    lines.push("");
    lines.push("馆 6–10 没有落到目标。敌窗没测。");
  } else {
    lines.push("");
    lines.push("| 馆 | 开胜率 | 关胜率 | 胜差 | 开手数 | 关手数 | 开敌伤 | 关敌伤 | 开拆/缠/读 | 关拆/缠/读 | 开挂窗 |");
    lines.push("|---|---|---|---|---|---|---|---|---|---|---|");
    for (const w of winRows) {
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
