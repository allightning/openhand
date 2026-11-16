import { boardStamp, poolStamp } from "./pool";
import { DEFAULT_KNOBS, KNOB_VERSION, knobLabel } from "./knobs";
import { JAG_TARGET } from "./night10Run";
import { SHORTLIST, type Night17ArmRow, type Night17BaseRow, type Night17Data } from "./night17Run";
import { SIM_SEED } from "./tiers";

/** 十三班散点（旧环境表）。只进历史列。 */
const N13: Record<number, string> = {
  1: "90.0%",
  2: "30.0%",
  3: "45.0%",
  4: "5.0%",
  5: "80.0%",
  6: "0.0%",
  7: "70.0%",
  8: "5.0%",
  9: "0.0%",
  10: "0.0%",
};

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function rate(wins: number, games: number): number {
  return games ? wins / games : 0;
}

function mean(n: number, games: number): string {
  return (n / Math.max(1, games)).toFixed(1);
}

function indexOf(foeHp: number, games: number, hitMul: number, segN: number): number {
  const hp = foeHp / Math.max(1, games);
  const seg = segN / Math.max(1, games);
  return hp * hitMul * seg;
}

function idx(row: { foeHp: number; games: number; hitMul: number; segN: number }): string {
  return indexOf(row.foeHp, row.games, row.hitMul, row.segN).toFixed(0);
}

function monoTalk(rows: Night17BaseRow[]): string {
  const breaks: string[] = [];
  for (let stage = 3; stage < 10; stage++) {
    const a = rows.find((r) => r.stage === stage)!;
    const b = rows.find((r) => r.stage === stage + 1)!;
    const ia = indexOf(a.foeHp, a.games, a.hitMul, a.segN);
    const ib = indexOf(b.foeHp, b.games, b.hitMul, b.segN);
    if (!(ia < ib)) breaks.push(`${stage}→${stage + 1}（${ia.toFixed(0)}→${ib.toFixed(0)}）`);
  }
  if (!breaks.length) return "馆 3 到馆 10 敌强指数逐馆上升。";
  return `不单调：${breaks.join("、")}。段数含对局长短（败局多打亮招），指数被手数带着走。`;
}

function baseTalk(rows: Night17BaseRow[]): string {
  const bits = rows.map((r) => {
    const wr = pct(rate(r.wins, r.games));
    const mark = r.hit ? "到" : "未到";
    return `馆 ${r.stage} ${wr}（${JAG_TARGET[r.stage]?.label ?? "—"} ${mark}，境 ${r.env}）`;
  });
  return `数字说了什么：${bits.join("；")}。历史列是十三班旧环境表，不与本表混读。20 局粒度 ±5 点。`;
}

function knife1Talk(rows: Night17ArmRow[]): string {
  const [ctrl, next] = rows;
  const a = rate(ctrl.wins, ctrl.games);
  const b = rate(next.wins, next.games);
  const hit = b + 1e-9 >= 0.6;
  return `数字说了什么：短名单 ${pct(b)}（注入 ${next.injected}），对照真实奖励 ${pct(a)}（${ctrl.injected}）。目标 ≥60% ${hit ? "到" : "未到"}。两臂同两张凡、同盐 40，差在那张精。20 局粒度 ±5 点。`;
}

function band(wins: number, games: number): string {
  const r = rate(wins, games);
  if (r + 1e-9 >= 0.4 && r <= 0.7 + 1e-9) return "在 40-70 带";
  if (r > 0.7) return "高于 70 带";
  return "低于 40 带";
}

function knife23Talk(rows: Night17ArmRow[]): string {
  const h4 = rows.find((r) => r.stage === 4)!;
  const a = rows.find((r) => r.arm.startsWith("A"))!;
  const b = rows.find((r) => r.arm.startsWith("B"))!;
  const h6 = rows.find((r) => r.stage === 6)!;
  const h4hit = rate(h4.wins, h4.games) + 1e-9 >= 0.5;
  return `数字说了什么：馆 4 档 3 前移 ${pct(rate(h4.wins, h4.games))}（≥50% ${h4hit ? "到" : "未到"}，本馆现挂缺格）。馆 5 A ${pct(rate(a.wins, a.games))} ${band(a.wins, a.games)}，B ${pct(rate(b.wins, b.games))} ${band(b.wins, b.games)}。馆 6 只前移档、不动敌：${pct(rate(h6.wins, h6.games))}（线 ≥35% ${h6.hit ? "到" : "未到"}）。20 局粒度 ±5 点。`;
}

function knife4Talk(row: Night17ArmRow, hall5: Night17ArmRow[]): string {
  const wr = rate(row.wins, row.games);
  const i6 = indexOf(row.foeHp, row.games, row.hitMul, row.segN);
  const highs = hall5.map((r) => {
    const n = indexOf(r.foeHp, r.games, r.hitMul, r.segN);
    return `${r.arm} ${n.toFixed(0)}`;
  });
  return `数字说了什么：馆 6 组合刀 ${pct(wr)}（线 ≥35% ${row.hit ? "到" : "未到"}），敌伤 ${mean(row.dmgTaken, row.games)}，指数 ${i6.toFixed(0)}。馆 5 补强后指数 ${highs.join(" / ")}，都高于本行——约束「馆 5 敌强 < 刀四后馆 6」没站住；馆 5 手数更长，段数被对局长短抬着。20 局粒度 ±5 点。`;
}

function knife5Talk(rows: Night17ArmRow[]): string {
  const bits = rows.map((r) => `馆 ${r.stage} ${pct(rate(r.wins, r.games))}（${JAG_TARGET[r.stage]?.label} ${r.hit ? "到" : "未到"}）`);
  const flat = rows.filter((r) => r.stage === 10 && rate(r.wins, r.games) > 0.5);
  const peak = flat.length ? "馆 10 过半，座前峰被削平" : "馆 10 没有被抬成过半";
  return `数字说了什么：${bits.join("；")}。系数仍是馆 8-10 的 1.0，只乘敌血 0.9。${peak}。20 局粒度 ±5 点。`;
}

function baseRow(r: Night17BaseRow): string {
  return `| ${r.stage} | ${r.enemy} | ${r.env} | ${r.hitMul} | ${pct(rate(r.wins, r.games))} | ${N13[r.stage]} | ${JAG_TARGET[r.stage]?.label ?? "—"} | ${r.hit ? "到" : "未到"} | ${mean(r.handSum, r.games)} | ${mean(r.dmgTaken, r.games)} | ${mean(r.dmgDealt, r.games)} |`;
}

function powerRow(r: Night17BaseRow): string {
  const hp = mean(r.foeHp, r.games);
  const seg = mean(r.segN, r.games);
  return `| ${r.stage} | ${r.enemy} | ${hp} | ${r.hitMul} | ${seg} | ${idx(r)} |`;
}

function armRow(r: Night17ArmRow): string {
  return `| ${r.arm} | ${r.stage} | ${r.enemy} | ${r.injected} | ${r.hitMul} | ${r.enemyHpKnob} | ${pct(rate(r.wins, r.games))} | ${JAG_TARGET[r.stage]?.label ?? "—"} | ${r.hit ? "到" : "未到"} | ${mean(r.handSum, r.games)} | ${mean(r.dmgTaken, r.games)} | ${mean(r.dmgDealt, r.games)} | ${idx(r)} |`;
}

function listCandidates(): string {
  const line = (k: keyof typeof SHORTLIST) => `${k}：${SHORTLIST[k].join(" ")}`;
  return [line("输出"), line("位移"), line("破挡")].join("；");
}

export function renderNight17(data: Night17Data): string {
  return [
    "# 夜校十七班报告 · 2026-11-16",
    "",
    `种子 ${SIM_SEED} · 旋钮 ${KNOB_VERSION}（${knobLabel(DEFAULT_KNOBS)}） · ${boardStamp()} · ${poolStamp()}。入口 \`npm run sim:climb:night17\`。src 结算未改。环境词条改读 \`envTagForHall\`。段数 = 开局 \`intents.length\` + 日志「亮招 / 共 N 段」（\`sim.ts\` climbRollNextIntents）。敌强指数 = 场均敌血 × 敌伤系数 × 场均段数。`,
    "",
    "## P0 全馆真基线",
    "",
    "各 20 局。盐 = 档 + 3，注入沿用成长梯，与十三班散点同盐。历史列只抄十三班，环境表已换，不许混排。",
    "",
    "| 馆 | 敌 | 境 | 系数 | 胜率 | 十三班 | 线 | 到否 | 场均手 | 敌伤 | 我伤 |",
    "|---|---|---|---|---|---|---|---|---|---|---|",
    ...data.base.map(baseRow),
    "",
    baseTalk(data.base),
    "",
    "### 敌强指数",
    "",
    "| 馆 | 敌 | 敌血 | 系数 | 场均段 | 指数 |",
    "|---|---|---|---|---|---|",
    ...data.base.map(powerRow),
    "",
    monoTalk(data.base),
    "",
    "## P1 刀一：短名单（馆 2）",
    "",
    `候选（正式名单等 NUMGEN14）：${listCandidates()}。纵步、换位现行奖励门在 fought≥4，本班把它们放进馆 1 奖励候选。两臂同两张凡（奖励池盐 0），精牌对照走奖励池盐 1，短名单走三类并集盐 1。对局盐 40。`,
    "",
    "| 臂 | 馆 | 敌 | 注入 | 系数 | 血旋钮 | 胜率 | 线 | 到否 | 场均手 | 敌伤 | 我伤 | 指数 |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|---|",
    ...data.knife1.map(armRow),
    "",
    knife1Talk(data.knife1),
    "",
    "## P2 刀二+三：档 3 前移 × 馆 5 补强",
    "",
    "HP 140 + 档 3 兵器 + 馆 7 口径注入。馆 4 / 馆 6 敌不动。馆 5 两臂：A 敌血 ×1.15，B 敌伤系数 0.85。各 20 局，盐 20。",
    "",
    "| 臂 | 馆 | 敌 | 注入 | 系数 | 血旋钮 | 胜率 | 线 | 到否 | 场均手 | 敌伤 | 我伤 | 指数 |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|---|",
    ...data.knife23.map(armRow),
    "",
    knife23Talk(data.knife23),
    "",
    "## P3 刀四：馆 6 组合刀",
    "",
    "档 3 前移之上，敌伤系数 0.6 与敌血 ×0.85 同开。20 局，盐 20。",
    "",
    "| 臂 | 馆 | 敌 | 注入 | 系数 | 血旋钮 | 胜率 | 线 | 到否 | 场均手 | 敌伤 | 我伤 | 指数 |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|---|",
    ...data.knife4.map(armRow),
    "",
    knife4Talk(data.knife4[0]!, data.knife23.filter((r) => r.stage === 5)),
    "",
    "## P4 刀五：末段血 −10%",
    "",
    "馆 8-10 敌伤系数保持 1.0，敌血 ×0.9。馆 7 单列 0.85 本表未跑。各 20 局，盐 20。成长仍是本馆档，不前移。",
    "",
    "| 臂 | 馆 | 敌 | 注入 | 系数 | 血旋钮 | 胜率 | 线 | 到否 | 场均手 | 敌伤 | 我伤 | 指数 |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|---|",
    ...data.knife5.map(armRow),
    "",
    knife5Talk(data.knife5),
    "",
    "未 commit。",
    "",
  ].join("\n");
}
