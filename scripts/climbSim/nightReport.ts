import { CARDS } from "../../src/game/content";
import { mergeTally, type CardTally } from "./fight";
import { DEFAULT_KNOBS, KNOB_VERSION, knobLabel } from "./knobs";
import type { Bag } from "./ledger";
import { deviationLines, knobLines } from "./nightAdvice";
import type { ClimbSchool, FreshHall, FreshSchool, NightData } from "./nightRun";
import { boardStamp, poolStamp } from "./pool";
import { SIM_SEED, bandDeviation } from "./tiers";
import { usageRows, watchList, type UsageRow } from "./usage";

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function hallBand(stage: number): string {
  if (stage <= 3) return "4-5";
  if (stage <= 9) return "5-6";
  return "7-9";
}

function foeBand(stage: number): string {
  if (stage <= 3) return "100-125";
  if (stage <= 6) return "195-235";
  if (stage <= 9) return "253-305";
  return "400-520";
}

const SHORT: Record<string, string> = {
  palm: "拳",
  saber: "刀",
  sword: "剑",
  spear: "枪",
  staff: "棍",
  hook: "钩",
  random: "随机",
};

function avg(sum: number, n: number): string {
  if (!n) return "—";
  return (sum / n).toFixed(1);
}

function handsCell(sum: number, n: number, lo: number, hi: number, capped: number): string {
  if (!n) return "—";
  const spread = lo === hi ? "" : `（${lo}-${hi}）`;
  const cap = capped ? ` 封${capped}` : "";
  return `${(sum / n).toFixed(1)}${spread}${cap}`;
}

function devCell(hands: number, band: string): string {
  const d = bandDeviation(hands, band);
  if (d === 0) return "内";
  const lo = Number(band.split("-")[0]);
  return `${hands < lo ? "-" : "+"}${(d * 100).toFixed(0)}%`;
}

function headRow(schools: { id: string }[]): string {
  return `| 馆 | 锚 | ${schools.map((s) => SHORT[s.id] ?? s.id).join(" | ")} |`;
}

function ruleRow(n: number): string {
  return `|---|---|${Array.from({ length: n }, () => "---").join("|")}|`;
}

function freshHands(data: NightData): string[] {
  const schools = data.fresh;
  const lines = [
    "## 满血单馆 · 手数",
    "",
    `每格每策略 ${data.freshGames} 局，开局满血。格子是场均手数；括弧是最小-最大；封是打到 40 手还没结束的局数。`,
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

function freshRates(data: NightData, pick: (h: FreshHall) => string, title: string, note: string): string[] {
  const schools = data.fresh;
  const lines = [title, "", note, "", headRow(schools), ruleRow(schools.length)];
  for (let stage = 1; stage <= 10; stage++) {
    const cells = schools.map((school) => pick(school.halls[stage - 1]!));
    lines.push(`| ${stage} | ${hallBand(stage)} | ${cells.join(" | ")} |`);
  }
  lines.push("");
  return lines;
}

function winPick(h: FreshHall): string {
  if (!h.games) return "—";
  return pct(h.wins / h.games);
}

function emptyPick(h: FreshHall): string {
  if (!h.handSum) return "—";
  return pct(h.emptySum / h.handSum);
}

function deathText(school: ClimbSchool): string {
  const bits = school.halls.map((h, i) => (h.deaths ? `${i + 1}馆×${h.deaths}` : "")).filter(Boolean);
  return bits.join("，") || "无";
}

function climbSummary(data: NightData): string[] {
  const lines = [
    "## 带伤整局",
    "",
    `每策略 ${data.climbRuns} 趟。赢了把剩余血带进下一馆，馆间奖励药优先。通关率分母是趟数。死在哪馆是没赢的那一馆。`,
    "",
    "| 策略 | 通关率 | 死在哪馆 | 血上限 |",
    "|---|---|---|---|",
  ];
  for (const school of data.climb) {
    lines.push(`| ${school.label} | ${pct(school.clears / school.runs)} | ${deathText(school)} | ${school.hpMax} |`);
  }
  lines.push("");
  return lines;
}

function climbHands(data: NightData): string[] {
  const schools = data.climb;
  const lines = [
    "### 每馆手数（只平均到达的趟）",
    "",
    headRow(schools),
    ruleRow(schools.length),
  ];
  for (let stage = 1; stage <= 10; stage++) {
    const cells = schools.map((school) => {
      const h = school.halls[stage - 1]!;
      return handsCell(h.handSum, h.seen, h.handMin, h.handMax, h.capped);
    });
    lines.push(`| ${stage} | ${hallBand(stage)} | ${cells.join(" | ")} |`);
  }
  lines.push("");
  return lines;
}

function climbHp(data: NightData): string[] {
  const schools = data.climb;
  const lines = [
    "### 胜后血（领完馆间奖励，只平均打赢的趟）",
    "",
    headRow(schools),
    ruleRow(schools.length),
  ];
  for (let stage = 1; stage <= 10; stage++) {
    const cells = schools.map((school) => {
      const h = school.halls[stage - 1]!;
      return h.wins ? avg(h.hpSum, h.wins) : "—";
    });
    lines.push(`| ${stage} | ${hallBand(stage)} | ${cells.join(" | ")} |`);
  }
  lines.push("");
  return lines;
}

function climbEmpty(data: NightData): string[] {
  const schools = data.climb;
  const lines = ["### 空手率（到达的趟，空手数 / 手数）", "", headRow(schools), ruleRow(schools.length)];
  for (let stage = 1; stage <= 10; stage++) {
    const cells = schools.map((school) => {
      const h = school.halls[stage - 1]!;
      return h.handSum ? pct(h.emptySum / h.handSum) : "—";
    });
    lines.push(`| ${stage} | ${hallBand(stage)} | ${cells.join(" | ")} |`);
  }
  lines.push("");
  return lines;
}

function mergeAll(rows: { tally: CardTally }[]): CardTally {
  const out: CardTally = {};
  for (const row of rows) mergeTally(out, row.tally);
  return out;
}

function foeName(school: FreshSchool, stage: number): string {
  return school.halls[stage - 1]?.foe || "—";
}

function foeTable(data: NightData): string[] {
  const bag: Bag = data.ledger.fresh;
  const lines = [
    "## 敌血与开局距（满血样本）",
    "",
    "敌血锚来自汇率 v2 §6。开局距是这一局站定后的格距。",
    "",
    "| 馆 | 敌人 | 敌血 | 敌血锚 | 血偏差 | 开局距 | 板长 |",
    "|---|---|---|---|---|---|---|",
  ];
  const nameOf = data.fresh[0];
  for (let stage = 1; stage <= 10; stage++) {
    const i = stage - 1;
    const n = bag.foeHpN[i] ?? 0;
    const hp = n ? (bag.foeHpSum[i] ?? 0) / n : 0;
    const band = foeBand(stage);
    const distN = bag.distN[i] ?? 0;
    const dist = distN ? ((bag.distSum[i] ?? 0) / distN).toFixed(2) : "—";
    lines.push(
      `| ${stage} | ${nameOf ? foeName(nameOf, stage) : "—"} | ${n ? hp.toFixed(0) : "—"} | ${band} | ${n ? devCell(hp, band) : "—"} | ${dist} | ${bag.boards.join("/") || "—"} |`,
    );
  }
  lines.push("");
  return lines;
}

function usageBlock(title: string, tally: CardTally): string[] {
  const rows = usageRows(tally);
  const watch = watchList(rows);
  const zero = rows.filter((row) => row.plays === 0);
  const drawn = new Set(rows.map((row) => row.id));
  const never = Object.values(CARDS)
    .filter((card) => !drawn.has(card.id))
    .map((card) => `${card.name}（${card.id}）`);
  const lines = [
    `## ${title}`,
    "",
    `摸过 ${rows.length} 张，使用率低于 5% 的 ${watch.length} 张，摸到但出 0 的 ${zero.length} 张，整池没摸到的 ${never.length} 张。`,
    "",
    "### 观察名单（出/摸 < 5%）",
    "",
    "| 牌 | id | 摸 | 出 | 使用率 |",
    "|---|---|---|---|---|",
    ...watch.map((row) => usageLine(row)),
    "",
    `出 0：${zero.map((row) => `${row.name}（摸 ${row.draws}）`).join("、") || "无"}`,
    "",
    `没摸到：${never.join("、") || "无"}`,
    "",
  ];
  return lines;
}

function usageLine(row: UsageRow): string {
  return `| ${row.name} | ${row.id} | ${row.draws} | ${row.plays} | ${pct(row.rate)} |`;
}

function clock(data: NightData): string[] {
  const anchor = 3 * 4.5 + 6 * 5.5 + 8;
  const lines = [
    "## 四十手钟",
    "",
    `锚按馆 1–3 取 4.5、馆 4–9 取 5.5、馆 10 取 8，十馆合计 ${anchor.toFixed(1)} 手。一手按 25–35 秒，纯对打约 ${(anchor * 25 / 60).toFixed(0)}–${(anchor * 35 / 60).toFixed(0)} 分钟，馆间另计，对着 40 分钟这档。`,
  ];
  const cleared = data.climb.filter((s) => s.clears > 0);
  if (!cleared.length) {
    lines.push("没有策略通关。不把中途死亡或 40 手封顶加进这档分钟。");
  } else {
    for (const school of cleared) {
      let sum = 0;
      for (const hall of school.halls) sum += hall.seen ? hall.handSum / hall.seen : 0;
      lines.push(`${school.label} 通关 ${school.clears} 趟，到达馆的场均手数相加 ${sum.toFixed(1)}。`);
    }
  }
  lines.push("");
  return lines;
}

export function renderNight(data: NightData): string {
  const lines = [
    `行路夜校校准 · 种子 ${SIM_SEED} · 旋钮 ${KNOB_VERSION}（${knobLabel(DEFAULT_KNOBS)}） · ${boardStamp()} · 卡池 ${poolStamp()}`,
    `满血单馆 ${data.freshGames} 局/格。带伤整局 ${data.climbRuns} 趟。锚：馆 1–3 为 4–5，馆 4–9 为 5–6，馆 10 为 7–9（汇率 v2 §6）。`,
    "构造只走 makeBattle 三参，开场站位走 applyClimbOpeningPositions。没有调用 applyLabEnemyKit，馆阶先机没加进敌方底速。src 未改，旋钮默认未改。",
    "",
    ...freshHands(data),
    ...freshRates(data, winPick, "## 满血单馆 · 胜率", "胜 = 自己血还在，且敌方活口没了或阶段已是胜。"),
    ...freshRates(data, emptyPick, "## 满血单馆 · 空手率", "空手 = 这一手没有打得中的攻击，也没有位移可出。超过 5% 是红线。"),
    ...climbSummary(data),
    ...climbHands(data),
    ...climbHp(data),
    ...climbEmpty(data),
    ...foeTable(data),
    ...usageBlock("牌使用率 · 满血单馆", mergeAll(data.fresh)),
    ...usageBlock("牌使用率 · 带伤整局", mergeAll(data.climb)),
    ...deviationLines(data),
    ...knobLines(data),
    ...clock(data),
  ];
  return lines.join("\n");
}
