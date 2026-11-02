import { CARDS } from "../../src/game/content";
import { MECH_CARDS } from "../../src/game/content/cards/mechPool";
import { mergeTally, type CardTally } from "./fight";
import { DEFAULT_KNOBS, KNOB_VERSION, knobLabel } from "./knobs";
import { deviationLines, knobLines, win33 } from "./night2Advice";
import type { Night2Data, Night2School } from "./night2Run";
import { boardStamp, poolStamp } from "./pool";
import { SIM_SEED } from "./tiers";
import { usageRows, watchList } from "./usage";

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function hallBand(stage: number): string {
  if (stage <= 3) return "4-5";
  if (stage <= 9) return "5-6";
  return "7-9";
}

function handsCell(sum: number, n: number, lo: number, hi: number, capped: number): string {
  if (!n) return "—";
  const spread = lo === hi ? "" : `（${lo}-${hi}）`;
  const cap = capped ? ` 封${capped}` : "";
  return `${(sum / n).toFixed(1)}${spread}${cap}`;
}

function headRow(schools: { id: string; label: string }[]): string {
  return `| 馆 | 锚 | ${schools.map((s) => s.id).join(" | ")} |`;
}

function ruleRow(n: number): string {
  return `|---|---|${Array.from({ length: n }, () => "---").join("|")}|`;
}

function mergeAll(rows: { tally: CardTally }[]): CardTally {
  const into: CardTally = {};
  for (const row of rows) mergeTally(into, row.tally);
  return into;
}

function extraBlock(data: Night2Data): string[] {
  const lines = [
    "## 新机制计数 · 满血",
    "",
    "| 策略 | 蓄力峰 | 爆发伤 | 钉峰 | 钉出手 | 灼烧 | 窗亮 | 窗按 | 窗耗蓝 |",
    "|---|---|---|---|---|---|---|---|---|",
  ];
  for (const s of data.fresh) {
    const e = s.extra;
    lines.push(`| ${s.id} | ${e.chargePeak} | ${e.burstDmg} | ${e.pinPeak} | ${e.pinPlays} | ${e.burnDmg} | ${e.reactOffer} | ${e.reactTake} | ${e.reactQi} |`);
  }
  lines.push("");
  return lines;
}

function freshHands(data: Night2Data): string[] {
  const schools = data.fresh;
  const lines = [
    "## 满血单馆 · 手数",
    "",
    `每格每策略 ${data.freshGames} 局。格子是场均手数。`,
    "",
    headRow(schools),
    ruleRow(schools.length),
  ];
  for (let stage = 1; stage <= 10; stage++) {
    const cells = schools.map((school) => {
      const h = school.halls[stage - 1]!;
      return handsCell(h.handSum, h.games, h.handMin, h.handMax, h.capped);
    });
    lines.push(`| ${stage} | ${hallBand(stage)} | ${cells.join(" | ")} |`);
  }
  lines.push("");
  return lines;
}

function freshRates(data: Night2Data, pick: (s: Night2School, stage: number) => string, title: string, note: string): string[] {
  const schools = data.fresh;
  const lines = [title, "", note, "", headRow(schools), ruleRow(schools.length)];
  for (let stage = 1; stage <= 10; stage++) {
    const cells = schools.map((school) => pick(school, stage));
    lines.push(`| ${stage} | ${hallBand(stage)} | ${cells.join(" | ")} |`);
  }
  lines.push("");
  return lines;
}

function climbSummary(data: Night2Data): string[] {
  const lines = ["## 带伤整局", "", "| 策略 | 通关 | 走最远馆 | 场均承伤 | 开局彩金 |", "|---|---|---|---|---|"];
  for (const s of data.climb) {
    let far = 0;
    for (let i = 0; i < s.halls.length; i++) if (s.halls[i]!.seen) far = i + 1;
    const dmg = s.extra.games ? (s.extra.dmg / s.extra.games).toFixed(1) : "—";
    lines.push(`| ${s.id} | ${s.clears}/${s.runs} | ${far} | ${dmg} | ${s.potStart} |`);
  }
  lines.push("");
  return lines;
}

function usageBlock(title: string, tally: CardTally): string[] {
  const rows = usageRows(tally);
  const watch = watchList(rows);
  const zero = rows.filter((row) => row.plays === 0);
  const drawn = new Set(rows.map((row) => row.id));
  const pool = [...Object.values(CARDS), ...Object.values(MECH_CARDS).filter((c): c is NonNullable<typeof c> => Boolean(c))];
  const never = pool.filter((card) => !drawn.has(card.id)).map((card) => `${card.name}（${card.id}）`);
  return [
    `## ${title}`,
    "",
    `摸过 ${rows.length} 张，使用率低于 5% 的 ${watch.length} 张，摸到但出 0 的 ${zero.length} 张，整池没摸到的 ${never.length} 张。没摸到 ≠ 废牌。`,
    "",
    "### 观察名单（出/摸 < 5%）",
    "",
    "| 牌 | id | 摸 | 出 | 使用率 |",
    "|---|---|---|---|---|",
    ...watch.map((row) => `| ${row.name} | ${row.id} | ${row.draws} | ${row.plays} | ${pct(row.rate)} |`),
    "",
    `出 0：${zero.map((row) => `${row.name}（摸 ${row.draws}）`).join("、") || "无"}`,
    "",
    `没摸到：${never.join("、") || "无"}`,
    "",
  ];
}

function clock(data: Night2Data): string[] {
  const anchor = 3 * 4.5 + 6 * 5.5 + 8;
  const lines = [
    "## 四十手钟",
    "",
    `锚按馆 1–3 取 4.5、馆 4–9 取 5.5、馆 10 取 8，十馆合计 ${anchor.toFixed(1)} 手。一手 25–35 秒，纯对打约 ${(anchor * 25 / 60).toFixed(0)}–${(anchor * 35 / 60).toFixed(0)} 分钟。`,
  ];
  const cleared = data.climb.filter((s) => s.clears > 0);
  if (!cleared.length) lines.push("没有策略通关。不把中途死亡或 40 手封顶加进这档分钟。");
  else {
    for (const school of cleared) {
      let sum = 0;
      for (const hall of school.halls) sum += hall.seen ? hall.handSum / hall.seen : 0;
      lines.push(`${school.label} 通关 ${school.clears} 趟，到达馆的场均手数相加 ${sum.toFixed(1)}。`);
    }
  }
  lines.push("");
  return lines;
}

function platform(): string[] {
  return [
    "## 平台策略（脚本层，未改 src）",
    "",
    "- 蓄力：棍 `bank` 能蓄则蓄、层满或能斩杀才 `staffBurst`；对照 `punch` 当普通棍打。代表牌注入抽堆。",
    "- 飞刀：按 `dartForm` 切近战 1-2 / 远战 3-6；钉优先，位移多的敌加分。七张代表牌注入。",
    "- 反应窗：`value` 用 leftover×8 + 冲锋伤 ≥ 耗蓝×5 才按；对照 `never` / `always`。需 `holdReaction`。引擎不把窗后剩余意图自动续上，脚本只答当前窗。",
    "- 环境：馆 3/6 `burn` 中格，站上优先位移离开；馆 8 `nowall` 击退降权。",
    "- 敌原型：读 `foeArchetype`，没有则 `profileFor(..., classic)`。",
    "- 亮招：看剩余 `intents` 段，位移段抬钉/后退，打击段抬挡。",
    "",
  ];
}

export function renderNight2(data: Night2Data, gateNote: string): string {
  const lines = [
    `行路夜校二班 · 种子 ${SIM_SEED} · 旋钮 ${KNOB_VERSION}（${knobLabel(DEFAULT_KNOBS)}） · ${boardStamp()} · 卡池 ${poolStamp()}`,
    `满血单馆 ${data.freshGames} 局/格。带伤整局 ${data.climbRuns} 趟。锚：馆 1–3 为 4–5，馆 4–9 为 5–6，馆 10 为 7–9。胜率参照 33%，空手红线 5%。`,
    "构造走 makeBattle 三参 + applyLabEnemyKit + 脚本注入代表牌。src 未改，旋钮默认未改。",
    gateNote,
    "",
    ...platform(),
    ...freshHands(data),
    ...freshRates(
      data,
      (s, stage) => {
        const h = s.halls[stage - 1]!;
        return h.games ? pct(h.wins / h.games) : "—";
      },
      "## 满血单馆 · 胜率",
      "胜 = 自己血还在，且敌方活口没了或阶段已是胜。参照 33%。",
    ),
    ...freshRates(
      data,
      (s, stage) => {
        const h = s.halls[stage - 1]!;
        return h.handSum ? pct(h.emptySum / h.handSum) : "—";
      },
      "## 满血单馆 · 空手率",
      "空手 = 这一手没有打得中的攻击，也没有位移可出。超过 5% 是红线。",
    ),
    ...climbSummary(data),
    ...extraBlock(data),
    ...usageBlock("牌使用率 · 满血单馆", mergeAll(data.fresh)),
    ...usageBlock("牌使用率 · 带伤整局", mergeAll(data.climb)),
    ...win33(data),
    ...deviationLines(data),
    ...knobLines(data),
    ...clock(data),
  ];
  return lines.join("\n");
}

export function renderNight2Summary(data: Night2Data, gateNote: string, extraMd: string): string {
  return [
    "# 夜校二班报告 · 2026-11-02",
    "",
    gateNote,
    "",
    extraMd,
    "",
    renderNight2(data, ""),
  ].join("\n");
}
