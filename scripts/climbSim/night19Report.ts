import { boardStamp, poolStamp } from "./pool";
import { DEFAULT_KNOBS, KNOB_VERSION, knobLabel } from "./knobs";
import { JAG_TARGET } from "./night10Run";
import type { Night19Arm, Night19Data, Night19Part, Night19Probe } from "./night19Run";
import { SIM_SEED } from "./tiers";

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function mean(n: number, games: number): string {
  return (n / Math.max(1, games)).toFixed(1);
}

function avg(xs: number[]): number {
  return xs.reduce((n, v) => n + v, 0) / Math.max(1, xs.length);
}

function gross(row: Night19Part): number {
  return row.direct + row.burn + row.bleed + row.self;
}

function share(n: number, total: number): string {
  if (total <= 0) return "—";
  return pct(n / total);
}

function probeTalk(rows: Night19Probe[]): string {
  const full = rows.find((r) => r.hit === 1)!;
  const half = rows.find((r) => r.hit === 0.5)!;
  const takenRatio = avg(half.taken) / Math.max(1, avg(full.taken));
  const directRatio = avg(half.direct) / Math.max(1, avg(full.direct));
  let verdict: string;
  if (takenRatio <= 0.65) verdict = "总敌伤降到约一半，旋钮接到总伤上。十八班 P2-A 没降，更像那次 0.8 落在噪声里。";
  else if (directRatio <= 0.7) verdict = "总敌伤几乎没降，直伤降了。旋钮接到直伤；总伤被不吃系数的部分托住。";
  else verdict = "fightScale 减半了，直伤只少一截，没有减半。系数写进了缩放，打到身上的「你受」大部分不吃它。";
  return `数字说了什么：系数 1.0 的 fightScale.dmg=${full.scale.toFixed(2)}，0.5 为 ${half.scale.toFixed(2)}。总伤比 ${takenRatio.toFixed(2)}，直伤比 ${directRatio.toFixed(2)}。${verdict} 3 局，种子 ${SIM_SEED}。`;
}

function partTalk(rows: Night19Part[]): string {
  const bits = rows.map((r) => {
    const wall = [
      ["直伤", r.direct],
      ["灼烧", r.burn],
      ["裂创", r.bleed],
      ["自损", r.self],
    ].sort((a, b) => Number(b[1]) - Number(a[1]))[0]!;
    return `馆 ${r.stage} 大头是${wall[0]}（占日志伤 ${share(Number(wall[1]), gross(r))}）`;
  });
  const blind = rows.filter((r) => r.direct < gross(r) * 0.5).map((r) => r.stage);
  return `数字说了什么：${bits.join("；")}。直伤不到日志伤一半的馆：${blind.join("、") || "无"}。占比以日志伤为分母。净敌伤更低的差额记成回血，不是多出来的伤。20 局，种子 ${SIM_SEED}，疑似。`;
}

function armLine(row: Night19Arm, base: Night19Part | undefined): string {
  const wr = row.games ? row.wins / row.games : 0;
  const hit = wr + 1e-9 >= row.jag;
  const baseTaken = base ? mean(base.taken, base.games) : "—";
  return `${row.arm} ${pct(wr)}（线 ${JAG_TARGET[row.stage]?.label ?? "—"} ${hit ? "到" : "未到"}），场均手 ${mean(row.handSum, row.games)}，敌伤 ${mean(row.taken, row.games)}（基线 ${baseTaken}），直伤 ${mean(row.direct, row.games)} / 灼烧 ${mean(row.burn, row.games)} / 裂创 ${mean(row.bleed, row.games)}`;
}

function armTalk(rows: Night19Arm[], parts: Night19Part[]): string {
  return [2, 6, 8, 9, 10]
    .map((stage) => {
      const arms = rows.filter((r) => r.stage === stage);
      if (!arms.length) return `馆 ${stage}：没有可跑的臂。`;
      const base = parts.find((r) => r.stage === stage);
      return `馆 ${stage}：${arms.map((r) => armLine(r, base)).join("；")}。`;
    })
    .join("");
}

function probeRow(r: Night19Probe): string {
  const taken = r.taken.map((n) => n.toFixed(0)).join(" / ");
  const direct = r.direct.map((n) => n.toFixed(0)).join(" / ");
  return `| ${r.hit} | ${r.scale.toFixed(2)} | ${taken} | ${direct} | ${avg(r.taken).toFixed(1)} | ${avg(r.direct).toFixed(1)} |`;
}

function partRow(r: Night19Part): string {
  const g = gross(r);
  return `| ${r.stage} | ${r.enemy} | ${mean(r.taken, r.games)} | ${mean(g, r.games)} | ${mean(r.direct, r.games)} | ${share(r.direct, g)} | ${mean(r.burn, r.games)} | ${share(r.burn, g)} | ${mean(r.bleed, r.games)} | ${share(r.bleed, g)} | ${mean(r.self, r.games)} | ${mean(r.taken - g, r.games)} |`;
}

function armRow(r: Night19Arm): string {
  const wr = r.games ? r.wins / r.games : 0;
  return `| ${r.arm} | ${r.stage} | ${r.enemy} | ${r.hitMul} | ${mean(r.foeHp, r.games)} | ${pct(wr)} | ${JAG_TARGET[r.stage]?.label ?? "—"} | ${wr + 1e-9 >= r.jag ? "到" : "未到"} | ${mean(r.handSum, r.games)} | ${mean(r.taken, r.games)} | ${mean(r.direct, r.games)} | ${mean(r.burn, r.games)} | ${mean(r.bleed, r.games)} | ${mean(r.self, r.games)} |`;
}

export function renderNight19(data: Night19Data): string {
  return [
    "# 夜校十九班报告 · 2026-11-16",
    "",
    `种子 ${SIM_SEED} · 旋钮 ${KNOB_VERSION}（${knobLabel(DEFAULT_KNOBS)}） · ${boardStamp()} · ${poolStamp()}。入口 \`npm run sim:climb:night19\`。src 未改。直伤 = 日志「你受」且不是裂创行（\`sim.ts\` hitPlayer）。灼烧 = 「灼烧 你」（\`envTags.ts\` tickBurnCells，不乘 fightScale）。裂创 = 「你裂创」跳血。自损 = 「自损 / 付血」。对不上的残差单列。盐 = 兵器档 + 3，与十八班验收同盐。`,
    "",
    "## P0 馆 8 系数 1.0 对 0.5",
    "",
    "各 3 局。fightScale.dmg 是组局时 \`resolveFightScale\` 的读数。",
    "",
    "| 系数 | fightScale | 每局敌伤 | 每局直伤 | 场均敌伤 | 场均直伤 |",
    "|---|---|---|---|---|---|",
    ...data.probe.map(probeRow),
    "",
    probeTalk(data.probe),
    "",
    "## P1 敌伤构成",
    "",
    "各 20 局。占比以日志伤（直伤+灼烧+裂创+自损）为分母。回血 = 净敌伤 − 日志伤。",
    "",
    "| 馆 | 敌 | 净敌伤 | 日志伤 | 直伤 | 占比 | 灼烧 | 占比 | 裂创 | 占比 | 自损 | 回血 |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|",
    ...data.parts.map(partRow),
    "",
    partTalk(data.parts),
    "",
    "## P2 定向 bracket",
    "",
    data.notes.length ? data.notes.map((n) => `- ${n}`).join("\n") : "- 没有加臂。",
    "",
    "灼烧 4→2 是模拟覆写：回合结束后把多扣的血加回，不改 `CLIMB_BURN_DMG`。段预算臂只改 `enemySegBonus`。血臂乘的是全场敌血，波次一起动。",
    "",
    "| 臂 | 馆 | 敌 | 系数 | 敌血 | 胜率 | 线 | 到否 | 场均手 | 敌伤 | 直伤 | 灼烧 | 裂创 | 自损 |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|",
    ...data.arms.map(armRow),
    "",
    armTalk(data.arms, data.parts),
    "",
    "未 commit。",
    "",
  ].join("\n");
}
