import type { CampaignSchool } from "./campaign";
import { judgeRow, type Gate } from "./check";
import type { CardTally } from "./fight";
import type { ClimbKnobs } from "./knobs";
import { KNOB_VERSION, knobLabel } from "./knobs";
import { boardStamp, poolStamp } from "./pool";
import type { SpotRow } from "./spot";
import type { SweepCell } from "./sweep";
import { bandDeviation } from "./tiers";
import { usageRows, watchList, type UsageRow } from "./usage";

export type ReportInput = {
  seed: number;
  knobs: ClimbKnobs;
  baseline: SpotRow[];
  schools: SpotRow[];
  campaigns: CampaignSchool[];
  tally: CardTally;
  sweep: SweepCell[];
};

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function num(n: number): string {
  return n.toFixed(1);
}

function devText(hands: number, band: string): string {
  const d = bandDeviation(hands, band);
  if (d === 0) return "内";
  const lo = Number(band.split("-")[0]);
  const sign = hands < lo ? "-" : "+";
  return `${sign}${(d * 100).toFixed(0)}%`;
}

function header(input: ReportInput): string {
  return [
    `行路数值模拟 · 现行板长 ${boardStamp()} · 旋钮 ${KNOB_VERSION}（${knobLabel(input.knobs)}） · 种子 ${input.seed} · 卡池 ${poolStamp()}`,
    "自动手在脚本里。makeBattle 形参未改。开场站位走现有 applyClimbOpeningPositions。",
  ].join("\n");
}

function spotLine(row: SpotRow): string {
  const gate = judgeRow(row.emptyRate, row.hands, row.handsBand, row.winRate);
  const foe = `${row.enemyName}（${row.enemyId}）`;
  return `| ${row.label} | ${row.stage} | ${row.policy} | ${foe} | ${num(row.hands)} | ${row.handsBand} | ${devText(row.hands, row.handsBand)} | ${pct(row.winRate)} | ${pct(row.emptyRate)} | ${num(row.damage)} | ${row.capped}/${row.games} | ${gate} |`;
}

const SPOT_HEAD = "| 档 | 馆 | 策略 | 敌人 | 场均手数 | 对照 | 偏差 | 胜率 | 空手率 | 场均承伤 | 封顶 | 门 |";
const SPOT_RULE = "|---|---|---|---|---|---|---|---|---|---|---|---|";

function spotTable(title: string, rows: SpotRow[]): string[] {
  return [title, "", SPOT_HEAD, SPOT_RULE, ...rows.map(spotLine), ""];
}

function deathText(row: CampaignSchool): string {
  const bits = row.deaths.map((n, i) => (n ? `${i + 1}馆×${n}` : "")).filter(Boolean);
  return bits.join("，") || "无";
}

function campaignLine(row: CampaignSchool): string {
  return `| ${row.label} | ${pct(row.clears / row.runs)} | ${deathText(row)} | ${row.hands.map(num).join("/")} | ${row.hp.map(num).join("/")} |`;
}

function usageLine(row: UsageRow): string {
  return `| ${row.name} | ${row.id} | ${row.draws} | ${row.plays} | ${pct(row.rate)} | ${row.watch ? "观察" : ""} |`;
}

function sweepLine(cell: SweepCell): string {
  const bits = cell.rows.map((row) => `${row.label} ${num(row.hands)}手/${pct(row.winRate)}/${pct(row.emptyRate)}`);
  return `| ${cell.knobs.enemyHp} | ${cell.knobs.enemyDmg} | ${bits.join("；")} |`;
}

export function renderReport(input: ReportInput): string {
  const used = usageRows(input.tally);
  const lines = [
    header(input),
    "",
    ...spotTable("## 抽样 · 先攻后移（拳牌，馆 1 / 5 / 10）", input.baseline),
    ...spotTable("## 六系策略 + 随机对照", input.schools),
    "## 十馆整局（带伤过馆，回血奖励优先）",
    "",
    "| 策略 | 通关率 | 死在哪馆 | 每馆手数 | 每馆战后血 |",
    "|---|---|---|---|---|",
    ...input.campaigns.map(campaignLine),
    "",
    "## 牌使用率（出/摸 <5% 进观察）",
    "",
    "| 牌 | id | 摸 | 出 | 使用率 | 名单 |",
    "|---|---|---|---|---|---|",
    ...used.map(usageLine),
    "",
    `观察名单：${watchList(used).map((row) => `${row.name}(${pct(row.rate)})`).join("、") || "无"}`,
    "",
    "## 旋钮扫描 · 敌血 × 敌伤（先攻后移）",
    "",
    "汇率旋钮保持 1。没有结算口，不改牌面。",
    "",
    "| 敌血 | 敌伤 | 杂兵 / 精英 / 座前 |",
    "|---|---|---|",
    ...input.sweep.map(sweepLine),
    "",
  ];
  return lines.join("\n");
}

export function gateOf(rows: SpotRow[]): Gate {
  const gates = rows.map((row) => judgeRow(row.emptyRate, row.hands, row.handsBand, row.winRate));
  if (gates.includes("red")) return "red";
  if (gates.includes("warn")) return "warn";
  return "green";
}
