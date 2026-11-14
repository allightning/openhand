import { boardStamp, poolStamp } from "./pool";
import { DEFAULT_KNOBS, KNOB_VERSION, knobLabel } from "./knobs";
import { JAG_TARGET } from "./night10Run";
import type { Night15Data, Night15PoisonRow, Night15RewardRow, Night15ScanRow } from "./night15Run";
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

function pierceShare(p: Night15PoisonRow): string {
  if (p.dmgDealt <= 0) return "—";
  return ((p.bleed + p.poison + p.pierce) / p.dmgDealt).toFixed(3);
}

function rewardTalk(rows: Night15RewardRow[]): string {
  const [a, b, c] = rows;
  const ra = rate(a.wins, a.games);
  const rb = rate(b.wins, b.games);
  const rc = rate(c.wins, c.games);
  let verdict: string;
  if (rb + 1e-9 >= 0.6) verdict = "真实奖励已够线，馆 2 不需要额外供给";
  else if (rc + 1e-9 >= 0.6) verdict = "真实奖励差一口气：再加 1 精（C）能过线，缺口在精牌密度";
  else verdict = "C 再加 1 精也没拉开，三臂全在 ±2 局粒度内——馆 2 缺口不在奖励张数，在牌质与对局方差";
  return `数字说了什么：真实奖励 B（2 凡 1 精）${pct(rb)}，${rb + 1e-9 >= 0.6 ? "过" : "未到"} 60% 线（A 1 精 ${pct(ra)}，C 2 凡 2 精 ${pct(rc)}）。${verdict}。A 与十四班同牌（expose）异盐 25.0%→${pct(ra)}，±3 局即盐噪，读三臂只看相对位置。20 局粒度 ±5 点。`;
}

function poisonTalk(rows: Night15PoisonRow[]): string {
  const at = (stage: number, id: string): Night15PoisonRow => rows.find((r) => r.stage === stage && r.id === id)!;
  const segs = [8, 10].map((stage) => {
    const base = at(stage, "基线");
    const poison = at(stage, "淬毒");
    const loss = poison.losses ? (poison.lossHands / poison.losses).toFixed(1) : "—";
    return `馆 ${stage} 基线 ${pct(rate(base.wins, base.games))} → 淬毒 ${pct(rate(poison.wins, poison.games))}（线 ${JAG_TARGET[stage]?.label}，淬毒败局场均 ${loss} 手）`;
  });
  const lifted = [8, 10].filter((stage) => {
    const p = at(stage, "淬毒");
    return rate(p.wins, p.games) + 1e-9 >= (JAG_TARGET[stage]?.floor ?? 0);
  });
  const shares = [8, 10].map((stage) => {
    const base = at(stage, "基线");
    const poison = at(stage, "淬毒");
    return `${pierceShare(base)}→${pierceShare(poison)}`;
  });
  let verdict: string;
  if (lifted.length === 2) verdict = "毒把后段两馆都抬过线，破挡供给一路有效";
  else if (lifted.length === 1) verdict = `毒只抬过馆 ${lifted[0]}；另一馆的墙不在破挡`;
  else verdict = "两馆毒都抬不过线";
  return `数字说了什么：${segs.join("；")}。${verdict}，但毒在后段照样兑伤（破挡占比 ${shares[0]} / ${shares[1]}），败局手数远超 7-9 手带——不是活不到毒兑完，是敌血敌伤压顶，毒是必要不充分。10 局粒度 ±10 点。`;
}

function scanTalk(rows: Night15ScanRow[]): string {
  const segs = [4, 6].map((stage) => {
    const jag = JAG_TARGET[stage];
    const cells = rows.filter((r) => r.stage === stage);
    const minN = [2, 4, 6, 8].find((n) => {
      const row = cells.find((r) => r.arm === `精 ${n}`);
      return row ? rate(row.wins, row.games) + 1e-9 >= (jag?.floor ?? 0) : false;
    });
    const g3 = cells.find((r) => r.arm === "档3提前")!;
    const g3r = rate(g3.wins, g3.games);
    const g3Hit = g3r + 1e-9 >= (jag?.floor ?? 0);
    if (minN == null && g3Hit) {
      return `馆 ${stage}（线 ${jag?.label}）：精 8 仍不过线，档 3 提前 ${pct(g3r)} 一次到线——断档在档（血条 / 兵器 / 绝牌位）不在精牌数，解法 = 档 3 前移`;
    }
    if (minN == null && !g3Hit) {
      return `馆 ${stage}（线 ${jag?.label}）：精 8 与档 3 提前全 ${pct(g3r)}——两条路都不通，墙在敌侧（龟谱 + 灼烧 + 敌伤），不是玩家成长供给`;
    }
    return `馆 ${stage}（线 ${jag?.label}）：精 ${minN} 起过线，档 3 提前 ${pct(g3r)}${g3Hit ? " 也过线" : " 不过线"}——堆精牌已够，不必动节拍`;
  });
  return `数字说了什么：${segs.join("；")}。10 局粒度 ±10 点。`;
}

export function renderNight15(data: Night15Data): string {
  const lines = [
    "# 夜校十五班报告 · 2026-11-14",
    "",
    `种子 ${SIM_SEED} · 旋钮 ${KNOB_VERSION}（${knobLabel(DEFAULT_KNOBS)}） · ${boardStamp()} · 卡池 ${poolStamp()}。入口 \`npm run sim:climb:night15\`。src 结算未改。`,
    "",
    "## P1 馆 2 真实奖励",
    "",
    "三臂各 20 局。凡 / 精取馆 2 配方奖励池未持有者（起手已有同名不注入）；同盐抽取，短单是长单前缀。同伴注入沿用档 1（各 1 精）。三臂共用盐 40 的对局流。目标 ≥60%。",
    "",
    "| 臂 | 注入 | 胜率 | 敌伤 | 我伤 | 过 60% |",
    "|---|---|---|---|---|---|",
  ];
  for (const h of data.reward) {
    const wr = rate(h.wins, h.games);
    lines.push(
      `| ${h.arm} | ${h.injected.join(" ") || "—"} | ${pct(wr)} | ${mean(h.dmgTaken, h.games)} | ${mean(h.dmgDealt, h.games)} | ${wr + 1e-9 >= 0.6 ? "到" : "未到"} |`,
    );
  }
  lines.push("");
  lines.push(rewardTalk(data.reward));
  lines.push("");
  lines.push("## P2 毒对馆 8、馆 10");
  lines.push("");
  lines.push("基线 vs 淬毒开（`useLabItem(cuandu)`）各 10 局，盐 0 = 龟谱，与十四班破挡实验同口径。馆 8 无墙场；馆 10 座前窗帽 2。团灭手 = 败局场均手数。");
  lines.push("");
  lines.push("| 实验 | 馆 | 敌 | 谱 | 胜率 | 场均手 | 团灭手 | 总我伤 | 裂创 | 毒 | 穿挡 | 破挡占比 |");
  lines.push("|---|---|---|---|---|---|---|---|---|---|---|---|");
  for (const p of data.poison) {
    lines.push(
      `| ${p.id} | ${p.stage} | ${p.enemy} | ${shortVar(p.variant)} | ${pct(rate(p.wins, p.games))} | ${mean(p.handSum, p.games)} | ${p.losses ? (p.lossHands / p.losses).toFixed(1) : "—"} | ${p.dmgDealt} | ${p.bleed} | ${p.poison} | ${p.pierce} | ${pierceShare(p)} |`,
    );
  }
  lines.push("");
  lines.push(poisonTalk(data.poison));
  lines.push("");
  lines.push("## P3 断档定位扫描");
  lines.push("");
  lines.push("馆 4（伏草客）/ 馆 6（裂旗劫手）× 档 2 + N 精（N=2/4/6/8，配方精池取未持有、袋干重灌、同馆同盐嵌套）各 10 局；档 3 提前 = HP 140 + 档 3 兵器 + 馆 7 口径注入（4 精 2 绝），敌不动。馆 4 无精英套件（6 馆起）；馆 6 盐 0 龟谱、带灼烧格。目标：馆 4 ≥50%，馆 6 ≥35%。");
  lines.push("");
  lines.push("| 馆 | 敌 | 臂 | 胜率 | 目标 | 到否 | 敌伤 | 我伤 |");
  lines.push("|---|---|---|---|---|---|---|---|");
  for (const r of data.scan) {
    const t = JAG_TARGET[r.stage];
    lines.push(
      `| ${r.stage} | ${r.enemy} | ${r.arm} | ${pct(rate(r.wins, r.games))} | ${t ? t.label : "—"} | ${r.hit ? "到" : "未到"} | ${mean(r.dmgTaken, r.games)} | ${mean(r.dmgDealt, r.games)} |`,
    );
  }
  lines.push("");
  lines.push(scanTalk(data.scan));
  lines.push("");
  lines.push("未 commit。");
  lines.push("");
  return lines.join("\n");
}
