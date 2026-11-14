import { boardStamp, poolStamp } from "./pool";
import { DEFAULT_KNOBS, KNOB_VERSION, knobLabel } from "./knobs";
import type { AutopsyHand } from "./fight";
import type { Night11Cell, Night11Data, Night11Game } from "./night11Run";
import { SIM_SEED } from "./tiers";

function handLine(r: AutopsyHand): string {
  const gates = r.gates.map((m) => `${m.id}${m.ok ? "" : `(${m.why || "不出"})`}`).join("、") || "空手";
  const play = r.played.join("、") || "收势";
  const q = r.intents.join("→") || "空";
  const ap = r.approach.length ? r.approach.join("、") : "无";
  return `手${r.n} 我${r.you}/敌${r.foe} 距${r.dist} 劲${r.qi} 敌挡${r.block}｜队列 ${q}｜进势 ${ap}｜手牌 ${gates}｜打出 ${play}`;
}

function gameBlock(g: Night11Game): string[] {
  const lines = [
    `局${g.i + 1} 变体 ${g.variant} 手${g.hands}${g.capped ? " 超时" : ""} 胜=${g.win ? "是" : "否"} 我伤${g.dmgDealt} 敌伤${g.dmgTaken} 最近${g.minDist}格 终距${g.endDist}`,
    `进势手 ${g.approachHands}/${g.hands} 种类 [${g.approachKinds.join(" ") || "无"}]；位移在手 ${g.moveInHandHands} 可出 ${g.moveOkHands} 打出 ${g.playedMoveHands} 可出却未出 ${g.unusedMoveHands}；能出牌的手 ${g.playableHands}；劲 0 的手 ${g.qiZeroHands}`,
    `摸到过 ${g.uniqueHand.join("、") || "无"}。闸口 ${Object.entries(g.gateWhy).map(([k, n]) => `${k}×${n}`).join("；") || "无"}`,
  ];
  for (const s of g.samples) lines.push(`- ${handLine(s)}`);
  if (g.evidence.length) {
    lines.push("证据手：");
    for (const e of g.evidence.slice(0, 4)) lines.push(`- ${handLine(e)}`);
  }
  return lines;
}

function causeLabel(c: Night11Cell): string {
  if (c.cause === "mechanism") return "机制（变体套件缺逼近）";
  if (c.cause === "sim") return "模拟（策略不追）";
  if (c.cause === "design") return "距离/节奏设计";
  return "混合";
}

function cellBlock(c: Night11Cell): string[] {
  const lines = [
    `### ${c.id}`,
    "",
    `馆 ${c.stage} ${c.enemy} · 期望 ${c.want} · foeSalt ${c.salt} · 变体 ${c.variant}`,
    "",
    `定性：**${causeLabel(c)}**。${c.note}`,
    "",
  ];
  for (const g of c.games) {
    lines.push(...gameBlock(g));
    lines.push("");
  }
  return lines;
}

export function renderNight11(data: Night11Data): string {
  const lines = [
    "# 夜校十一班报告 · 2026-11-14",
    "",
    `种子 ${SIM_SEED} · 旋钮 ${KNOB_VERSION}（${knobLabel(DEFAULT_KNOBS)}） · ${boardStamp()} · 卡池 ${poolStamp()}。每格 3 局验尸。src 结算未改。`,
    "",
    "## P1 逐手",
    "",
    "三格：馆 8 岸匪（龟谱，散点 foeSalt 0）/ 馆 6 裂旗劫手（游走，十班盐 4）/ 馆 9 水匪哨（散点 foeSalt 0）。",
    "",
  ];
  for (const c of data.cells) lines.push(...cellBlock(c));
  lines.push("## P2 定性");
  lines.push("");
  lines.push("三问压缩：");
  lines.push("");
  lines.push("- **(a) 敌队列有没有进势**：馆 8 手1 龟谱无进势（retreat1/strike/breathe/stake/guard）；手2 起队列出现 advance2，但后面跟 retreat2，距离从 5 退到 6 后钉死。馆 6 手1 游走谱有 lunge9、advance1，同时 4 段 retreat；手2 起变成 breathe/guard/advance2，距钉 6。馆 9 手1 无进势；手2 有 lunge41+advance2（距 5→3）；手3 起只剩 breathe+guard，再无进势。");
  lines.push("- **(b) 玩家有没有位移、为什么不出**：三格 40 手位移在手 0。摸到的只有 strike / cut / hitSaber。劲 6→10，不是没蓝。闸口全是「刀打到 2 格，敌在 3/5/6 格」。策略不是拒出位移，是手里没有；手 3 已 8 张够不着的攻击，配方里的 advance/retreat 摸不进来。");
  lines.push("- **(c) 最近几格**：馆 8 / 馆 6 最近 5、终距 6。馆 9 最近 3、终距 3。刀 reach 2，三格都从没进过攻击距离。");
  lines.push("");
  lines.push("归类：");
  lines.push("");
  lines.push("- **(a) 机制**：龟谱开手缺进势（馆 8/9 手1）。馆 9 手3 起变体套件打完只剩挡/调息，保底逼近没了。馆 8 标签仍是 turtle-shell，手2 起队列却有 advance2（龟池本身没有），和 retreat2 对消。请主窗看精英套件打完后的重抽。");
  lines.push("- **(b) 模拟**：不是「有位移不出」。是收势后手牌被攻击塞满、不弃、摸不到位移。用户点名的追贴补丁（3 手没贴身且手里有位移）打不上——可出位移手数 = 0。");
  lines.push("- **(c) 距离/节奏**：馆 9 最近 3 vs 刀 2，差 1 格；敌不再进，我方无步。馆 6 游走有进势段但不兑现（退多于进，随后队列冻住）。双方工具在日志里对不上。");
  lines.push("");
  for (const c of data.cells) {
    lines.push(`- **${c.id}** 脚本标签 ${causeLabel(c)}。${c.note}`);
  }
  lines.push("");
  lines.push("## P3 追贴");
  lines.push("");
  if (!data.chased) {
    lines.push("未启用追贴、未重跑。条件是「手里有位移才优先贴」，本班 9 局可出位移都是 0。请主窗拍：模拟弃满手攻击 / 配方保底位移进手，还是敌套件保底进势。夜校不改 src。");
  } else {
    lines.push("至少一格判模拟/混合，已加「3 手没贴身且手里有逼近位移则先贴」。对照：");
    lines.push("");
    lines.push("| 格 | 追贴 | 胜 | 场均手 | 场均我伤 | 场均最近格 |");
    lines.push("|---|---|---|---|---|---|");
    for (const v of data.verify) {
      lines.push(
        `| ${v.id} | ${v.chased ? "开" : "关"} | ${v.wins}/${v.games} | ${v.handMean.toFixed(1)} | ${v.dmgDealtMean.toFixed(1)} | ${v.minDistMean.toFixed(1)} |`,
      );
    }
  }
  lines.push("");
  lines.push("未改 src 结算。未 commit。");
  lines.push("");
  return lines.join("\n");
}
