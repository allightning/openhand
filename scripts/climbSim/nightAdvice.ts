import { CLIMB_EXPOSE_THROUGH_BLOCK } from "../../src/game/climbCaps";
import { CARDS } from "../../src/game/content";
import type { Tot } from "./ledger";
import type { NightData } from "./nightRun";
import { bandDeviation } from "./tiers";

function hallBand(stage: number): string {
  if (stage <= 3) return "4-5";
  if (stage <= 9) return "5-6";
  return "7-9";
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function meanFreshHands(data: NightData, stage: number): number {
  const rows = data.fresh.filter((s) => s.id !== "random");
  let sum = 0;
  let n = 0;
  for (const school of rows) {
    const hall = school.halls[stage - 1]!;
    if (!hall.games) continue;
    sum += hall.handSum / hall.games;
    n += 1;
  }
  return n ? sum / n : 0;
}

function depth(data: NightData): { id: string; label: string; depth: number; clears: number }[] {
  return data.climb.map((school) => {
    let sum = school.clears * 10;
    for (let i = 0; i < school.halls.length; i++) sum += school.halls[i]!.deaths * (i + 1);
    return { id: school.id, label: school.label, depth: school.runs ? sum / school.runs : 0, clears: school.clears };
  });
}

function sixFresh(data: NightData): NightData["fresh"] {
  return data.fresh.filter((s) => s.id !== "random");
}

function meanWin(data: NightData, stage: number): number {
  let wins = 0;
  let games = 0;
  for (const school of sixFresh(data)) {
    const hall = school.halls[stage - 1]!;
    wins += hall.wins;
    games += hall.games;
  }
  return games ? wins / games : 0;
}

function hallKind(hands: number, band: string, win: number, capRate: number): string {
  if (capRate >= 0.5) return "僵持";
  const lo = Number(band.split("-")[0]);
  const hi = Number(band.split("-")[1]);
  if (hands < lo) return win < 0.5 ? "早死" : "偏快";
  if (hands > hi) return win < 0.5 ? "久攻未胜" : "偏慢";
  return "带内";
}

function foeBand(stage: number): string {
  if (stage <= 3) return "100-125";
  if (stage <= 6) return "195-235";
  if (stage <= 9) return "253-305";
  return "400-520";
}

function foeDrift(data: NightData): string {
  const bag = data.ledger.fresh;
  const bits: string[] = [];
  for (let stage = 1; stage <= 10; stage++) {
    const n = bag.foeHpN[stage - 1] ?? 0;
    if (!n) continue;
    const hp = (bag.foeHpSum[stage - 1] ?? 0) / n;
    const band = foeBand(stage);
    const dev = bandDeviation(hp, band);
    if (dev === 0) continue;
    const lo = Number(band.split("-")[0]);
    bits.push(`馆 ${stage} ${hp.toFixed(0)} 对照 ${band}（${hp < lo ? "-" : "+"}${(dev * 100).toFixed(0)}%）`);
  }
  return bits.join("；");
}

export function deviationLines(data: NightData): string[] {
  const buckets = new Map<string, string[]>();
  for (let stage = 1; stage <= 10; stage++) {
    const hands = meanFreshHands(data, stage);
    const band = hallBand(stage);
    const games = sixFresh(data).reduce((n, s) => n + s.halls[stage - 1]!.games, 0);
    const capped = sixFresh(data).reduce((n, s) => n + s.halls[stage - 1]!.capped, 0);
    const win = meanWin(data, stage);
    const kind = hallKind(hands, band, win, games ? capped / games : 0);
    const label = kind === "带内" && win < 0.5 ? "锚内阵亡" : kind;
    if (label === "带内") continue;
    const lo = Number(band.split("-")[0]);
    const dev = bandDeviation(hands, band);
    const sign = hands < lo ? "-" : "+";
    const devText = dev === 0 ? "带内" : `${sign}${(dev * 100).toFixed(0)}%`;
    const text = `馆 ${stage} 均 ${hands.toFixed(1)} 手（${devText}），胜率 ${pct(win)}，封顶 ${capped}/${games}`;
    const list = buckets.get(label) ?? [];
    list.push(text);
    buckets.set(label, list);
  }
  const ranks = depth(data)
    .filter((row) => row.id !== "random")
    .slice()
    .sort((a, b) => b.depth - a.depth || b.clears - a.clears);
  const random = depth(data).find((row) => row.id === "random");
  const top = ranks[0];
  const bot = ranks[ranks.length - 1];
  const lines = [
    "## P2 · 偏差",
    "",
    "满血单馆的六系平均。手数低于锚且胜率低，记早死。手数落在锚里但胜率低于一半，记锚内阵亡。封顶过半记僵持。随机对照单独写。",
    "",
  ];
  for (const kind of ["锚内阵亡", "早死", "偏快", "久攻未胜", "偏慢", "僵持"]) {
    const list = buckets.get(kind);
    if (list?.length) lines.push(`${kind}：${list.join("；")}。`);
  }
  if (buckets.size === 0) lines.push("六系均手都落在锚里。");
  const far = ranks.filter((row) => top && row.depth === top.depth);
  const near = ranks.filter((row) => bot && row.depth === bot.depth);
  if (top && far.length) {
    lines.push(
      `六系里走得最远的是${far.map((row) => row.label).join("、")}，场均到第 ${top.depth.toFixed(1)} 馆，通关 ${top.clears}/${data.climbRuns}。`,
    );
  }
  if (bot && near.length) {
    lines.push(`停在最前的是${near.map((row) => row.label).join("、")}，场均到第 ${bot.depth.toFixed(1)} 馆。`);
  }
  if (random) lines.push(`随机对照场均到第 ${random.depth.toFixed(1)} 馆，通关 ${random.clears}/${data.climbRuns}。`);
  const drift = foeDrift(data);
  if (drift) lines.push(`敌血落在汇率锚外的馆：${drift}。`);
  else lines.push("十馆敌血都落在汇率锚里。");
  let distSum = 0;
  let distN = 0;
  for (let i = 0; i < 10; i++) {
    distSum += data.ledger.fresh.distSum[i] ?? 0;
    distN += data.ledger.fresh.distN[i] ?? 0;
  }
  if (distN) lines.push(`满血样本开局距平均 ${(distSum / distN).toFixed(2)}。`);
  lines.push("");
  return lines;
}

function layerSentence(title: string, tot: Tot): string {
  const bleed = tot.bleedAdded ? (tot.bleedTick / tot.bleedAdded).toFixed(2) : "无";
  const expose = tot.exposeAdded ? ((tot.exposeHits * CLIMB_EXPOSE_THROUGH_BLOCK) / tot.exposeAdded).toFixed(2) : "无";
  return `${title}：裂创新增 ${tot.bleedAdded} 层，跳血 ${tot.bleedTick}，每层 ${bleed} 血；破绽新增 ${tot.exposeAdded} 层，穿挡 ${tot.exposeHits} 次，每层 ${expose} 血。见到的裂创最高 ${tot.maxBleed} 层。`;
}

function bleedMove(tot: Tot, wins: Tot): string {
  if (tot.bleedAdded <= 0) return "裂创层数是 0。现值 2 没有被这批对局打到，维持 2。";
  const per = tot.bleedTick / tot.bleedAdded;
  if (per >= 2.5 && wins.bleedAdded > 0) {
    return `裂创每层兑现 ${per.toFixed(2)} 血，高于 2 至少两成五，而且胜场里真有层。建议改为 ${per.toFixed(1)}（整数 ${Math.round(per)}）。`;
  }
  if (per <= 1.5) {
    return `裂创每层兑现 ${per.toFixed(2)} 血，胜场新增层 ${wins.bleedAdded}。比值靠近 1，是层加上去之后没来得及跳第二次，不是层在衰减。不把 2 改成 1。维持 2，等有打满锚点的胜场再回拍。`;
  }
  return `裂创每层兑现 ${per.toFixed(2)} 血。维持 2。`;
}

function exposeMove(tot: Tot): string {
  if (tot.exposeAdded <= 0) return "破绽层数是 0。和裂创共用的 2 没有被破绽打到，维持，等剑系打出穿挡再拆价。";
  const per = (tot.exposeHits * CLIMB_EXPOSE_THROUGH_BLOCK) / tot.exposeAdded;
  if (Math.abs(per - 2) <= 0.5) return `破绽每层兑现 ${per.toFixed(2)} 血，接近 2。可与裂创继续共用。`;
  return `破绽每层兑现 ${per.toFixed(2)} 血（穿挡一口 ${CLIMB_EXPOSE_THROUGH_BLOCK}，打不中的层把均价拉低）。建议单独标 ${per.toFixed(1)}，不要和裂创写同一个 2。`;
}

function paceMove(tot: Tot): string {
  const opens = tot.opens || 1;
  const behind = tot.openBehind / opens;
  const bonus = tot.openBehindBonus / opens;
  const lossA = tot.ahead ? tot.hpAhead / tot.ahead : 0;
  const lossB = tot.behind ? tot.hpBehind / tot.behind : 0;
  const bits = [
    `开局 ${tot.opens} 局，后手 ${tot.openBehind}（${pct(behind)}）。若给敌方加上馆阶先机（馆 6 起 +1，馆 9 起 +2），后手变成 ${tot.openBehindBonus}（${pct(bonus)}）。`,
    `手头先机比较：后手 ${tot.behind} 手，场均掉血 ${lossB.toFixed(1)}；先手或并手 ${tot.ahead} 手，场均掉血 ${lossA.toFixed(1)}。日志「手先到」${tot.foeFirst} 次。`,
    `先机牌：抢先 ${tot.hastePlays}，刀步 ${tot.stepSaberPlays}。`,
  ];
  if (tot.openBehind === 0 && tot.openBehindBonus === 0) {
    bits.push("现平台和馆阶反事实都没有开局后手。常驻 +1 的 1.75 劲/场在这六系底速上翻不了手先。不要改成 0：飞刀底速 9 和馆阶加成还没进这套对局。维持 1.75。");
  } else if (tot.behind > 0 && lossB + 1 < lossA) {
    bits.push("后手手的场均掉血低于先手。后手叠在打空的长局里，掉血接近 0，不能折成先机便宜。维持常驻 +1 = 1.75 劲/场。");
  } else if (tot.openBehind === 0 && tot.openBehindBonus > 0) {
    bits.push("现平台开局后手是 0，所以这批血线量不出 +1 先机值多少血。反事实后手不是 0。先把 applyLabEnemyKit 的馆阶先机接进模拟器，再决定 1.75 动不动。今晚维持 1.75。");
  } else {
    const gap = lossB - lossA;
    const qi = gap / 5;
    bits.push(
      `后手比先手每手多掉 ${gap.toFixed(1)} 血，约 ${qi.toFixed(2)} 劲。常驻 +1 若只能翻一手，对照现值 1.75 劲/场：${qi < 1.2 ? "测得偏贵，建议降到 1.0 附近" : qi > 2.3 ? "测得偏便宜，建议升到 2.5 附近" : "和 1.75 同量级，维持"}。这是每手差，不是整场差，主窗拍的时候按一场里会后手的手数乘。`,
    );
  }
  return bits.join("");
}

function chargeMove(tot: Tot): string {
  if (tot.chargePlays <= 0) {
    return "蓄劲 / 蓄劲二档出手 0。棍核的蓄力利息没有结算口，通用蓄劲也没进自动手的选择。+25%/手是草稿 20–30 的中点。本跑不能把 25 改成别的数。维持 25%。";
  }
  return `蓄劲类出手 ${tot.chargePlays}。结算是下一击 +4，不是「憋一手、按 25% 利息爆发」。利息这条仍然没有口。维持 +25%/手，等棍的蓄力牌面落地再校。`;
}

function pinMove(tot: Tot): string {
  const named: string[] = [];
  for (const card of Object.values(CARDS)) {
    if (card.id.includes("dart") || card.text.includes("钉")) named.push(`${card.name}（${card.id}）`);
  }
  const list = named.length ? named.join("、") : "无";
  return `钉层出手 ${tot.pinPlays}。牌面带「钉」或 id 含 dart 的有：${list}。飞刀不在六系策略里，没有每层减位移的结算。维持 0.2 劲/层。`;
}

export function knobLines(data: NightData): string[] {
  const fresh = data.ledger.fresh;
  const lines = [
    "## P3 · 标黄四旋钮",
    "",
    "四个数都没有乘进伤害。下面是对局里数出来的层、先机和出手，不改 knobs.ts。",
    "",
    "### 叠层 2",
    "",
    layerSentence("满血全部", fresh.all),
    layerSentence("满血胜场", fresh.wins),
    layerSentence("带伤整局", data.ledger.climb.all),
    bleedMove(fresh.all, fresh.wins),
    exposeMove(fresh.all),
    "回拍：裂创、破绽分开写。共用的 2 只在两边都靠近 2 时保留。",
    "",
    "### 先机 临时 ±1 = 0.5 劲/手，常驻 +1 = 1.75 劲/场",
    "",
    paceMove(fresh.all),
    "",
    "### 蓄力利息 +25%/手",
    "",
    chargeMove(fresh.all),
    "",
    "### 钉 0.2 劲/层",
    "",
    pinMove(fresh.all),
    "",
  ];
  return lines;
}
