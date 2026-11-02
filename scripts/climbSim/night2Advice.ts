import { climbChargeBurstEq, CLIMB_BURN_DMG, CLIMB_CHARGE_CAP, CLIMB_SPEAR_REVERSE_QI } from "../../src/game/climbCaps";
import type { ExtraSum, Night2Data, Night2School } from "./night2Run";

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function hallBand(stage: number): string {
  if (stage <= 3) return "4-5";
  if (stage <= 9) return "5-6";
  return "7-9";
}

function mainFresh(data: Night2Data): Night2School[] {
  return data.fresh.filter((s) => ["palm", "saber", "sword", "spear", "staff", "hook", "dart"].includes(s.id));
}

function extraOf(data: Night2Data, id: string): ExtraSum | undefined {
  return data.fresh.find((s) => s.id === id)?.extra;
}

function meanHands(school: Night2School, stage: number): number {
  const h = school.halls[stage - 1]!;
  return h.games ? h.handSum / h.games : 0;
}

function meanWin(school: Night2School, stage: number): number {
  const h = school.halls[stage - 1]!;
  return h.games ? h.wins / h.games : 0;
}

export function deviationLines(data: Night2Data): string[] {
  const rows = mainFresh(data);
  const lines = ["## P2 · 偏差", "", "七系满血平均。手数低于锚且胜率低记早死。手数在锚里胜率低于一半记锚内阵亡。封顶过半记僵持。胜率对照 33%。空手红线 5%。", ""];
  for (let stage = 1; stage <= 10; stage++) {
    let hands = 0;
    let wins = 0;
    let games = 0;
    let empty = 0;
    let caps = 0;
    for (const school of rows) {
      const h = school.halls[stage - 1]!;
      if (!h.games) continue;
      hands += h.handSum / h.games;
      wins += h.wins;
      games += h.games;
      empty += h.emptySum;
      caps += h.capped;
    }
    if (!games) continue;
    const avg = hands / rows.filter((s) => s.halls[stage - 1]!.games).length;
    const band = hallBand(stage);
    const win = wins / games;
    const emptyRate = rows.reduce((n, s) => n + s.halls[stage - 1]!.handSum, 0);
    const emptyN = empty / Math.max(1, emptyRate);
    const capRate = caps / games;
    const lo = Number(band.split("-")[0]);
    const hi = Number(band.split("-")[1]);
    let kind = "带内";
    if (capRate >= 0.5) kind = "僵持";
    else if (avg < lo) kind = win < 0.5 ? "早死" : "偏快";
    else if (avg > hi) kind = win < 0.5 ? "久攻未胜" : "偏慢";
    else if (win < 0.5) kind = "锚内阵亡";
    const vs33 = win - 0.33;
    lines.push(
      `馆 ${stage} ${kind}：均 ${avg.toFixed(1)} 手（锚 ${band}），胜率 ${pct(win)}（相对 33% ${vs33 >= 0 ? "+" : ""}${(vs33 * 100).toFixed(0)} 点），空手 ${pct(emptyN)}，封顶 ${caps}/${games}。`,
    );
  }
  const climb = data.climb.filter((s) => ["palm", "saber", "sword", "spear", "staff", "hook", "dart"].includes(s.id));
  const far = climb.slice().sort((a, b) => b.clears - a.clears || b.halls.findIndex((h) => h.deaths) - a.halls.findIndex((h) => h.deaths));
  if (far[0]) lines.push(`整局走得最远的是${far[0].label}，通关 ${far[0].clears}/${far[0].runs}。`);
  lines.push("");
  return lines;
}

function contrast(data: Night2Data, a: string, b: string, title: string): string {
  const x = data.fresh.find((s) => s.id === a);
  const y = data.fresh.find((s) => s.id === b);
  if (!x || !y) return `${title}：缺对照。`;
  const wx = x.halls.reduce((n, h) => n + h.wins, 0) / Math.max(1, x.halls.reduce((n, h) => n + h.games, 0));
  const wy = y.halls.reduce((n, h) => n + h.wins, 0) / Math.max(1, y.halls.reduce((n, h) => n + h.games, 0));
  return `${title}：${x.label} 胜率 ${pct(wx)}，${y.label} 胜率 ${pct(wy)}。蓄力爆发伤 ${x.extra.burstDmg} vs ${y.extra.burstDmg}。窗按 ${x.extra.reactTake}/${x.extra.reactOffer} vs ${y.extra.reactTake}/${y.extra.reactOffer}。`;
}

export function knobLines(data: Night2Data): string[] {
  const staff = extraOf(data, "staff");
  const punch = extraOf(data, "staff-punch");
  const dart = extraOf(data, "dart");
  const spear = extraOf(data, "spear");
  const never = extraOf(data, "spear-never");
  const always = extraOf(data, "spear-always");
  const palm = extraOf(data, "palm");
  const noEnv = extraOf(data, "palm-noenv");
  const cap6 = climbChargeBurstEq(CLIMB_CHARGE_CAP);
  const cap4 = climbChargeBurstEq(4);
  const peak = staff?.chargePeak ?? 0;
  const burst = staff?.burstDmg ?? 0;
  const games = staff?.games ?? 1;
  const burstAvg = burst / games;
  let chargeMove = "维持 6";
  if (peak >= 6 && burstAvg > 80) chargeMove = "改 4";
  else if (peak <= 2 && burst === 0) chargeMove = "维持 6（本跑几乎没爆发，264 当量没打出来）";

  const burnGames = (palm?.games ?? 0) || 1;
  const burnPer = (palm?.burnDmg ?? 0) / burnGames;
  const burnHall = CLIMB_BURN_DMG;
  let burnMove = "维持 4";
  if (burnPer >= 8) burnMove = "改 2";
  else if ((palm?.burnDmg ?? 0) === 0) burnMove = "维持 4（馆 3/6 才挂灼烧，本跑没站上中格或对局在跳血前结束）";

  const offer = (spear?.reactOffer ?? 0) + (always?.reactOffer ?? 0);
  const take = spear?.reactTake ?? 0;
  const alwaysTake = always?.reactTake ?? 0;
  const qi = spear?.reactQi ?? 0;
  let reactMove = "维持 大 2 / 小 1";
  if (offer === 0) reactMove = "维持 大 2 / 小 1（回马窗本跑没亮，holdReaction 已开；缺后手+背墙+距 2）";
  else if (take / Math.max(1, spear?.reactOffer ?? 1) > 0.6 && qi / Math.max(1, take) < 2) reactMove = "改大窗 3（按得太勤，2 不够肉疼）";

  const pinPlays = dart?.pinPlays ?? 0;
  let pinMove = "维持 0.2";
  if (pinPlays === 0) pinMove = "维持 0.2（钉出手 0。飞刀代表牌有摸到但引擎拒出——飞刀未装备进武器轴，位移段占比量不出）";
  else if ((dart?.pinPeak ?? 0) >= 6) pinMove = "维持 0.2（帽 6 打满，单价先不动）";

  const climb = data.climb.find((s) => s.id === "palm");
  const hpMax = climb?.hpMax || palm?.hpMax || 50;
  const dmg = (climb?.extra.dmg ?? palm?.dmg ?? 0) / Math.max(1, climb?.extra.games ?? palm?.games ?? 1);
  const net = dmg / hpMax;
  const clears = data.climb.filter((s) => ["palm", "saber", "sword", "spear", "staff", "hook", "dart"].includes(s.id)).reduce((n, s) => n + s.clears, 0);
  let potMove = "维持 15-20% 锚";
  if (clears === 0) potMove = "维持 15-20%（整局没通关，净耗被截成阵亡血条，不能据此改锚）";
  else if (net > 0.35) potMove = "改净耗锚 25-30%（通关样本场均承伤高于血条 20%）";
  else if (net < 0.08) potMove = "维持 15-20%（通关样本净耗偏矮，先不降锚）";

  return [
    "## P4 · 标黄五项",
    "",
    contrast(data, "staff", "staff-punch", "蓄力憋爆 vs 每手正常打"),
    contrast(data, "spear", "spear-never", "窗估值 vs 永不按"),
    contrast(data, "spear-always", "spear-never", "窗总按 vs 永不按"),
    contrast(data, "palm", "palm-noenv", "环境开 vs 关"),
    "",
    "### 1 蓄力帽 6（264 当量，备选 4）",
    "",
    `帽 6 爆发 ${cap6}，帽 4 爆发 ${cap4}。棍憋爆见到的最高层 ${peak}，满血样本爆发伤合计 ${burst}，场均 ${burstAvg.toFixed(1)}。${chargeMove}。`,
    "",
    "### 2 灼烧 4",
    "",
    `常量 ${burnHall}。拳环境开的灼烧跳血合计 ${palm?.burnDmg ?? 0}，环境关 ${noEnv?.burnDmg ?? 0}。${burnMove}。`,
    "",
    "### 3 窗耗蓝 大 2 / 小 1",
    "",
    `现值大窗 ${CLIMB_SPEAR_REVERSE_QI}。枪估值策略：亮 ${spear?.reactOffer ?? 0}，按 ${take}，耗蓝 ${qi}。永不按亮 ${never?.reactOffer ?? 0}。总按亮 ${always?.reactOffer ?? 0}、按 ${alwaysTake}。${reactMove}。`,
    "",
    "### 4 钉 0.2",
    "",
    `飞刀钉出手 ${pinPlays}，最高层 ${dart?.pinPeak ?? 0}。${pinMove}。`,
    "",
    "### 5 彩金净耗 15-20%",
    "",
    `开局彩金 ${climb?.potStart ?? "—"}。满血场均承伤 ${dmg.toFixed(1)} / 血上限 ${hpMax} = ${pct(net)}。这是战斗净耗，不是赌馆支出。${potMove}。`,
    "",
  ];
}

export function win33(data: Night2Data): string[] {
  const lines = ["## 胜率 33% 参照", ""];
  for (const school of mainFresh(data)) {
    const g = school.halls.reduce((n, h) => n + h.games, 0);
    const w = school.halls.reduce((n, h) => n + h.wins, 0);
    const r = g ? w / g : 0;
    lines.push(`${school.label} 满血 ${w}/${g} = ${pct(r)}（${r + 0.001 >= 0.33 ? "到 33%" : "不到 33%"}）。`);
  }
  lines.push("");
  return lines;
}

export { meanHands, meanWin };
