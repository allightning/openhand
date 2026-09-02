import { CARDS } from "../game/content";
import { getLabTuning } from "../game/labTuning";
import type { Battle, CardId } from "../game/types";
import { recordOpeningFoeDamage, sampleQiTurn, snapshotAuditFromBattle } from "./labAudit";
import type { LabSessionMeta, LabTelemetry, LabTurnRecord } from "./types";

export function startTelemetry(meta: LabSessionMeta): LabTelemetry {
  return {
    meta,
    turns: [],
    cardsPlayed: {},
    spatialTags: {},
    breakAttempts: 0,
    breakSuccess: 0,
    breakByType: {},
    v2QiSum: 0,
    v2QiPeak: 0,
    v2QiClears: 0,
    v2SwapCount: 0,
    v2ResonanceCount: 0,
    v2VariantTriggers: 0,
    v2GrudgeTurns: 0,
    tuningSnapshot: getLabTuning(),
  };
}

function spatialTagForCard(id: CardId): string {
  const def = CARDS[id];
  const text = def.text;
  if (def.knock || text.includes("推") || text.includes("拉") || text.includes("近") || text.includes("退")) return "position";
  if (text.includes("相邻") || text.includes("隔") || text.includes("步")) return "range";
  if (text.includes("撞壁") || text.includes("桩") || text.includes("机")) return "terrain";
  if (def.damage) return "damage";
  if (def.block) return "block";
  return "other";
}

export function snapshotV2FromBattle(tel: LabTelemetry, b: Battle): LabTelemetry {
  const breakByType = { ...tel.breakByType, ...(b.v2BreakByKind ?? {}) };
  return {
    ...tel,
    breakSuccess: b.v2BreakCount ?? tel.breakSuccess,
    breakByType,
    v2QiPeak: Math.max(tel.v2QiPeak ?? 0, b.v2QiPeak ?? 0, b.qi ?? 0),
    v2QiClears: b.v2QiClearCount ?? tel.v2QiClears,
    v2SwapCount: b.v2SwapCount ?? tel.v2SwapCount,
    v2ResonanceCount: b.v2ResonanceCount ?? tel.v2ResonanceCount,
    v2VariantTriggers: b.v2VariantTriggers ?? tel.v2VariantTriggers,
    v2GrudgeTurns: (b.v2GrudgeBonus ?? 0) > 0 ? (tel.v2GrudgeTurns ?? 0) + 1 : tel.v2GrudgeTurns,
    v2QiSum: (tel.v2QiSum ?? 0) + (b.qi ?? 0),
  };
}

export function recordPlayerTurn(
  tel: LabTelemetry,
  b: Battle,
  action: string,
  decisionMs: number,
  previewMatched: boolean,
  cardId?: CardId,
): LabTelemetry {
  const rec: LabTurnRecord = {
    turn: b.turn,
    side: "player",
    action,
    cardId,
    decisionMs,
    previewMatched,
    playerHp: b.player.hp,
    enemyHp: b.enemy.hp,
    playerPos: b.player.pos,
    enemyPos: b.enemy.pos,
  };
  const cardsPlayed = { ...tel.cardsPlayed };
  const spatialTags = { ...tel.spatialTags };
  if (cardId) {
    cardsPlayed[cardId] = (cardsPlayed[cardId] ?? 0) + 1;
    const tag = spatialTagForCard(cardId);
    spatialTags[tag] = (spatialTags[tag] ?? 0) + 1;
  }
  let next = { ...tel, turns: [...tel.turns, rec], cardsPlayed, spatialTags };
  sampleQiTurn(b);
  next = snapshotV2FromBattle(next, b);
  next = snapshotAuditFromBattle(next, b);
  if ((b.v2BreakPreview?.length ?? 0) > 0) next.breakAttempts = (next.breakAttempts ?? 0) + 1;
  return next;
}

export function recordFoeTurn(tel: LabTelemetry, b: Battle, action: string): LabTelemetry {
  const beforeHp = tel.turns.filter((t) => t.side === "player").at(-1)?.playerHp ?? b.v2OpeningHp ?? b.player.hp;
  recordOpeningFoeDamage(b, beforeHp);
  const rec: LabTurnRecord = {
    turn: b.turn,
    side: "foe",
    action,
    decisionMs: 0,
    previewMatched: true,
    playerHp: b.player.hp,
    enemyHp: b.enemy.hp,
    playerPos: b.player.pos,
    enemyPos: b.enemy.pos,
  };
  let next = { ...tel, turns: [...tel.turns, rec] };
  next = snapshotV2FromBattle(next, b);
  next = snapshotAuditFromBattle(next, b);
  return next;
}

export function finishTelemetry(
  tel: LabTelemetry,
  outcome: LabTelemetry["outcome"],
  stallTurn?: number,
  b?: Battle,
): LabTelemetry {
  let next: LabTelemetry = { ...tel, endedAt: Date.now(), outcome, stallTurn };
  if (b) next = snapshotAuditFromBattle(next, b);
  return next;
}

export function balanceReport(tel: LabTelemetry): string {
  const turns = tel.turns.length;
  const playerTurns = tel.turns.filter((t) => t.side === "player");
  const avgMs =
    playerTurns.length > 0
      ? Math.round(playerTurns.reduce((s, t) => s + t.decisionMs, 0) / playerTurns.length)
      : 0;
  const previewFails = playerTurns.filter((t) => !t.previewMatched).length;
  const topCards = Object.entries(tel.cardsPlayed)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id, n]) => `${CARDS[id as CardId]?.name ?? id}×${n}`)
    .join("、");
  const spatial = Object.entries(tel.spatialTags)
    .map(([k, v]) => `${k}:${v}`)
    .join(" ");
  const breakRate =
    tel.breakAttempts > 0 ? `${Math.round(((tel.breakSuccess ?? 0) / tel.breakAttempts) * 100)}%` : "—";
  const breakTypes = Object.entries(tel.breakByType ?? {})
    .map(([k, v]) => `${k}:${v}`)
    .join(" ");
  const avgTurns = playerTurns.length;
  const lines = [
    `# 踢馆平衡报告`,
    `- 预设：${tel.meta.presetName}`,
    `- 结果：${tel.outcome ?? "进行中"}`,
    `- 回合记录：${turns}（玩家 ${playerTurns.length}）`,
    `- 平均决策耗时：${avgMs} ms`,
    `- 预演不符次数：${previewFails}（应为 0）`,
    `- 破招尝试/成功：${tel.breakAttempts}/${tel.breakSuccess ?? 0}（破招率 ${breakRate}）`,
    `- 破招分型：${breakTypes || "—"}`,
    `- 势 峰值/均值/清零：${tel.v2QiPeak ?? 0} / ${tel.v2QiMean ?? "—"} / ${tel.v2QiClears ?? 0}`,
    `- 换人/共鸣：${tel.v2SwapCount ?? 0} / ${tel.v2ResonanceCount ?? 0}`,
    `- 变招触发：${tel.v2VariantTriggers ?? 0}`,
    `- 鏖战回合/率：${tel.v2GrudgeTurns ?? 0} / ${tel.v2GrudgeRatePct ?? "—"}%`,
    `- 平均玩家回合：${avgTurns}`,
    `- 卡关回合：${tel.stallTurn ?? "—"}`,
    `- 出牌 Top：${topCards || "—"}`,
    `- 空间标签分布：${spatial || "—"}`,
    `- 调参快照：v2=${tel.tuningSnapshot.rulesV2} combo=${tel.tuningSnapshot.rulesCombo} dmg×${tel.tuningSnapshot.dmgCoef} 破招窗${tel.tuningSnapshot.breakWindow} 先机偏${tel.tuningSnapshot.paceBias} AI激${tel.tuningSnapshot.aiAggression}`,
    `- 敌人：${tel.meta.enemyId ?? "—"}`,
    ``,
    `## §24 死穴审计（v2.3 埋点清单）`,
    `| # | 指标 | 值 | 健康参考 |`,
    `|---|------|-----|----------|`,
    `| 1 | 势均值 / 清零 | ${tel.v2QiMean ?? "—"} / ${tel.v2QiClears ?? 0} | 均值>0 且清零不过频 |`,
    `| 2 | 平均回合 / 鏖战率 | ${avgTurns} / ${tel.v2GrudgeRatePct ?? "—"}% | 6–12 回 / <15% |`,
    `| 3 | 破招分型 | ${breakTypes || "—"} | 单型 <90% |`,
    `| 4 | 破招率 | ${breakRate} | 有收益感 |`,
    `| 5 | 助战率 / 承伤 | ${tel.v2AssistCalls ?? 0} / ${tel.v2AssistDamage ?? 0} | 批次三接线 |`,
    `| 6 | 一箭双雕 | ${tel.v2DoubleHitCount ?? 0} | 批次三接线 |`,
    `| 7–8 | 流派胜率差 | — | 跨 preset 聚合 |`,
    `| 9 | 绝招卡手率 | ${tel.v2UltBlockRatePct ?? "—"}% | <30% |`,
    `| 10 | 变式分支 A/B/无 | ${tel.v2VariantBranchA ?? 0}/${tel.v2VariantBranchB ?? 0}/${tel.v2VariantBranchNone ?? 0} | 无分支≠0 |`,
    `| 11 | 副系装备人数 | ${tel.v2SecondaryEquipCount ?? 0} | 分布观察 |`,
    `| 12 | 道具使用 | ${tel.v2ItemUses ?? 0} | 非单一解 |`,
    `| 13 | 后手首回合承伤 | ${tel.v2OpeningPaceBehind ? (tel.v2OpeningDamage ?? 0) : "先手"} | 可拆/可扛 |`,
    ``,
    `## §17 v2.5 共鸣阶梯`,
    `- 队伍构成：${tel.v2PartyComposition ?? "—"}`,
    `- 最高共鸣档：${tel.v2ResonanceTierMax ?? 0}`,
    `- 百花齐放：${tel.v2HundredFlowers ? "是" : "否"}`,
    `- 专属技使用：${tel.v2SignatureUses ?? 0}`,
    `- 组合卡打出：${tel.v2ComboCardsPlayed ?? 0}`,
    `- §28 field本系浓度：${tel.v2FieldSchoolDeckPct ?? "—"}% · 开闸打出：${tel.v2ComboUnlockPlays ?? 0} · 卡手回合：${tel.v2DeadHandTurns ?? 0} · 换人：${tel.v2SwapCount ?? 0}`,
    `- 构成分布：${Object.entries(tel.v2CompositionCounts ?? {}).map(([k, v]) => `${k}:${v}`).join(" ") || "—"}`,
    ``,
    `## §29 敌方压力`,
    `- 敌我行动比：${tel.v2ActionRatio ?? "—"}（目标 1:2.5–1:3.5 · 敌段 ${tel.v2FoeSegments ?? 0} / 玩家动 ${tel.v2PlayerActions ?? 0}）`,
    `- 玩家承伤均值：${tel.v2AvgTurnDamage ?? "—"}`,
    `- 应激分布：${Object.entries(tel.v2StressBySource ?? {}).map(([k, v]) => `${k}:${v}`).join(" ") || "—"}`,
    `- 调参：敌HP×${tel.tuningSnapshot.enemyHpMul} 段+${tel.tuningSnapshot.enemySegBonus} 应激上限${tel.tuningSnapshot.enemyStressCap}`,
  ];
  return lines.join("\n");
}

/** 按 preset / 敌人 / tuning 快照分场景键。 */
export function scenarioKey(tel: LabTelemetry): string {
  const t = tel.tuningSnapshot;
  return [
    tel.meta.presetId,
    tel.meta.enemyId ?? "?",
    `v2=${t.rulesV2}`,
    `combo=${t.rulesCombo}`,
    `dmg=${t.dmgCoef}`,
  ].join("|");
}

/** 多局报告按场景分组摘要（§16.5 / v2.5 埋点过滤）。 */
export function balanceReportsByScenario(reports: LabTelemetry[]): string {
  if (!reports.length) return "（无历史局）";
  const groups = new Map<string, LabTelemetry[]>();
  for (const r of reports) {
    const k = scenarioKey(r);
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }
  const lines: string[] = [];
  for (const [key, list] of groups) {
    const wins = list.filter((r) => r.outcome === "win").length;
    const assist = list.reduce((s, r) => s + (r.v2AssistCalls ?? 0), 0);
    const combo = list.reduce((s, r) => s + (r.v2ComboCardsPlayed ?? 0), 0);
    const dbl = list.reduce((s, r) => s + (r.v2DoubleHitCount ?? 0), 0);
    lines.push(
      `### ${key}`,
      `- 局数 ${list.length} · 胜 ${wins}`,
      `- 助战 ${assist} · 组合卡 ${combo} · 一箭双雕 ${dbl}`,
      ``,
    );
  }
  return lines.join("\n");
}
