/**
 * 读招战役 · 气力承诺制（顶替旧空间拆招谜题）
 * 规则核：`qiCommit.ts` / `docs/combat/CORE_PLAYGUIDE.md`
 */
import type { Battle, CompanionId, EnemyId, Intent } from "../game/types";
import { emptyV2Turn } from "../game/labV2";
import { DEMO_FIELD_MATE } from "./breakDemo";
import type { LabPreset } from "./types";
import { normalizePreset } from "./draft";
import {
  createQiFight,
  type QiCardId,
  type QiFight,
  type QiSegment,
} from "./qiCommit";

const CAMPAIGN_DONE_KEY = "openhand-break-campaign-done";
let campaignDoneMemory = false;

export type CampaignGoal =
  | { type: "hardBreaks"; min: number }
  | { type: "chase"; min: number }
  | { type: "graze"; min: number }
  | { type: "interrupt"; min: number }
  | { type: "dodge"; min: number }
  | { type: "kill" }
  | { type: "noHit" }
  | { type: "withinTurns"; max: number };

export type CampaignStageId = "R1" | "R2" | "R3" | "R4" | "R5" | "R6" | "R7" | "R8" | "RB";

export interface CampaignStage {
  id: CampaignStageId;
  title: string;
  blurb: string;
  teach: string;
  enemyId: EnemyId;
  enemyHp: number;
  playerHp: number;
  playerPos: number;
  enemyPos: number;
  qiQueue: QiSegment[];
  qiNextQueue?: QiSegment[];
  eyeIdx: number;
  hand: QiCardId[];
  energy: number;
  goals: CampaignGoal[];
  failTip: string;
  maxTurns: number;
}

export interface BreakCampaignRun {
  stageIndex: number;
  stageId: CampaignStageId;
  hp: number;
  hpMax: number;
  totalHardBreaks: number;
  puzzleTurn: number;
  sessionHardBreaks: number;
  sessionChases: number;
  sessionGrazes: number;
  sessionInterrupts: number;
  sessionDodges: number;
  guideCardIds: string[];
  guideCoach: string;
  teachBanner: string;
  foeDebrief: null;
  battleStartHp: number;
  lastFailTip: string;
}

function intentsFromQueue(queue: QiSegment[]): Intent[] {
  return queue.map((s) =>
    s.move === "windup" ? { kind: "windup" as const } : { kind: "strike" as const, damage: s.damage },
  );
}

/** 气力承诺九关：克制 / 连拆 / 出红格 / 墨痕 / 气势 / 存气 / 闪 / 分格 / 座前试刃 */
export const CAMPAIGN_STAGES: CampaignStage[] = [
  {
    id: "R1",
    title: "拆·点",
    blurb: "气力只有 3 点。拆·点费 2，硬拆立刻还 1。刺必须用拆·点。",
    teach: "气力=本拍能花的点数。点「拆·点」再点刺，收势。目标：硬拆 ≥1 · 零「打」 · 1 拍内",
    enemyId: "mob_road_01",
    enemyHp: 99,
    playerHp: 12,
    playerPos: 3,
    enemyPos: 4,
    qiQueue: [{ move: "pierce", damage: 6, cell: 3 }],
    eyeIdx: -1,
    hand: ["break_point", "brace"],
    energy: 3,
    goals: [
      { type: "hardBreaks", min: 1 },
      { type: "noHit" },
      { type: "withinTurns", max: 1 },
    ],
    failTip: "点「拆·点」再点刺段，然后收势。架不能硬拆，错拆会挨打。",
    maxTurns: 1,
  },
  {
    id: "R2",
    title: "连拆返气",
    blurb: "气力不够同时付两段拆。先硬拆还 1 气，才能拆下一段。",
    teach: "拆费 2、还 1，等于净花 1 拆一段。目标：硬拆 ≥2 · 零「打」 · 1 拍内",
    enemyId: "mob_road_01",
    enemyHp: 99,
    playerHp: 12,
    playerPos: 3,
    enemyPos: 4,
    qiQueue: [
      { move: "sweep", damage: 4, cell: 3 },
      { move: "pierce", damage: 6, cell: 3 },
    ],
    eyeIdx: -1,
    hand: ["break_press", "break_point", "brace"],
    energy: 3,
    goals: [
      { type: "hardBreaks", min: 2 },
      { type: "noHit" },
      { type: "withinTurns", max: 1 },
    ],
    failTip: "先拆一段（2 气返 1），再用剩下的气拆另一段。只架不拆过不了。",
    maxTurns: 1,
  },
  {
    id: "R3",
    title: "出红格",
    blurb: "不在红格，来招会打空。花 1 气撤步离开红格，再用攻打断蓄力（伤×2）。",
    teach: "红格=他打得到你的格子。目标：断蓄 ≥1 · 零「打」 · 1 拍内",
    enemyId: "mob_road_02",
    enemyHp: 99,
    playerHp: 16,
    playerPos: 3,
    enemyPos: 4,
    qiQueue: [
      { move: "sweep", damage: 4, cell: 3 },
      { move: "windup", damage: 0 },
    ],
    eyeIdx: -1,
    hand: ["step_back", "atk1"],
    energy: 3,
    goals: [
      { type: "interrupt", min: 1 },
      { type: "noHit" },
      { type: "withinTurns", max: 1 },
    ],
    failTip: "点「撤步」离开 4 格红圈，扫落空；再把攻牌打在蓄力段上。站着挨扫算「打」。",
    maxTurns: 1,
  },
  {
    id: "R4",
    title: "墨痕",
    blurb: "墨痕：硬拆留在那个红格。他下一拍再打这格，会自动破，并再留一轮墨。",
    teach: "墨痕是格子上的印，不是你的气力。目标：硬拆 ≥2 · 零「打」 · 2 拍内",
    enemyId: "mob_road_01",
    enemyHp: 99,
    playerHp: 12,
    playerPos: 2,
    enemyPos: 4,
    qiQueue: [{ move: "pierce", damage: 6, cell: 2 }],
    qiNextQueue: [{ move: "pierce", damage: 6, cell: 2 }],
    eyeIdx: -1,
    hand: ["break_point"],
    energy: 3,
    goals: [
      { type: "hardBreaks", min: 2 },
      { type: "noHit" },
      { type: "withinTurns", max: 2 },
    ],
    failTip: "第一拍硬拆留墨痕；第二拍他再刺同格，收势即可白赚一段。",
    maxTurns: 2,
  },
  {
    id: "R5",
    title: "气势",
    blurb: "硬拆和墨痕都会叠气势。▲3 后直取收势多 1 伤。",
    teach: "气势：拆/墨每段 +1。▲3 直取 +1，▲5 每拍回 4 气，▲8 绝式。本关靠第三拍 +1 砍满。",
    enemyId: "mob_road_01",
    enemyHp: 10,
    playerHp: 20,
    playerPos: 3,
    enemyPos: 4,
    qiQueue: [{ move: "pierce", damage: 6, cell: 3 }],
    qiNextQueue: [{ move: "pierce", damage: 6, cell: 3 }],
    eyeIdx: -1,
    hand: ["break_point", "atk1"],
    energy: 3,
    goals: [
      { type: "kill" },
      { type: "withinTurns", max: 3 },
    ],
    failTip: "第一拍拆刺并直取，后两拍他再刺同格会吃墨。第三拍气势到 3，直取才是 4，合计 10。",
    maxTurns: 3,
  },
  {
    id: "R6",
    title: "过·存气",
    blurb: "点「过」把 1 气存到下拍。下拍回 3 再加存的 1，才能拆+断蓄。",
    teach: "气力每拍回 3。过=下拍多 1（上限 5）。本关第一拍来招打空，先过；第二拍拆刺并把攻点在蓄力上。",
    enemyId: "mob_road_02",
    enemyHp: 12,
    playerHp: 16,
    playerPos: 3,
    enemyPos: 4,
    qiQueue: [{ move: "sweep", damage: 4, cell: 0 }],
    qiNextQueue: [
      { move: "pierce", damage: 6, cell: 3 },
      { move: "windup", damage: 0 },
    ],
    eyeIdx: -1,
    hand: ["break_point", "atk1"],
    energy: 3,
    goals: [
      { type: "interrupt", min: 1 },
      { type: "noHit" },
      { type: "withinTurns", max: 2 },
    ],
    failTip: "第一拍扫在 1 格，你在 4 格，打空。点「过」存气。第二拍拆·点点刺，攻牌点蓄力。",
    maxTurns: 2,
  },
  {
    id: "R7",
    title: "闪",
    blurb: "架只能减 3 伤，刺仍挨打。闪费 1，完全躲开这一段。",
    teach: "闪须站红格。目标：闪 ≥1 · 零「打」 · 1 拍内。后面分格关要用。",
    enemyId: "mob_road_01",
    enemyHp: 99,
    playerHp: 12,
    playerPos: 3,
    enemyPos: 4,
    qiQueue: [{ move: "pierce", damage: 6, cell: 3 }],
    eyeIdx: -1,
    hand: ["dodge", "brace"],
    energy: 3,
    goals: [
      { type: "dodge", min: 1 },
      { type: "noHit" },
      { type: "withinTurns", max: 1 },
    ],
    failTip: "点「退步·闪」再点刺段。架会擦到 3 伤，算「打」。",
    maxTurns: 1,
  },
  {
    id: "R8",
    title: "分格",
    blurb: "两段不在同一格。先硬拆留墨，再走进另一格用闪。",
    teach: "墨痕管旧格，新红格要自己走过去闪。目标：硬拆 ≥1 · 闪 ≥1 · 零「打」 · 2 拍内",
    enemyId: "mob_road_02",
    enemyHp: 99,
    playerHp: 16,
    playerPos: 3,
    enemyPos: 4,
    qiQueue: [{ move: "pierce", damage: 6, cell: 3 }],
    qiNextQueue: [{ move: "sweep", damage: 4, cell: 4 }],
    eyeIdx: -1,
    hand: ["break_point", "dodge", "step_fwd"],
    energy: 3,
    goals: [
      { type: "hardBreaks", min: 1 },
      { type: "dodge", min: 1 },
      { type: "noHit" },
      { type: "withinTurns", max: 2 },
    ],
    failTip: "第一拍拆·点点刺。第二拍进步到 5 格，闪点扫。站着不动扫会打空过不了（本关要闪）。",
    maxTurns: 2,
  },
  {
    id: "RB",
    title: "座前试刃",
    blurb: "气力不够全防。换血也行，砍倒他。",
    teach: "目标：击倒对方 · 4 拍内。第一拍拆刺、撤步、把攻点在蓄力上（×2）；后三拍直取。气势▲3 后直取收势 +1。",
    enemyId: "mob_monk_01",
    enemyHp: 18,
    playerHp: 30,
    playerPos: 3,
    enemyPos: 4,
    qiQueue: [
      { move: "sweep", damage: 4, cell: 3 },
      { move: "pierce", damage: 6, cell: 3 },
      { move: "windup", damage: 0 },
    ],
    qiNextQueue: [
      { move: "crash", damage: 5, cell: 3 },
      { move: "sweep", damage: 4, cell: 3 },
    ],
    eyeIdx: -1,
    hand: ["break_press", "break_point", "break_yield", "step_back", "step_fwd", "atk1"],
    energy: 3,
    goals: [
      { type: "kill" },
      { type: "withinTurns", max: 4 },
    ],
    failTip: "攻要点在蓄力上才是 6。拆刺+撤步躲开扫，后三拍直取；墨痕叠气势后收势 +1 才能砍满 18。",
    maxTurns: 4,
  },
];

export function campaignStageCount(): number {
  return CAMPAIGN_STAGES.length;
}

export function campaignStage(id: CampaignStageId): CampaignStage | undefined {
  return CAMPAIGN_STAGES.find((s) => s.id === id);
}

export function currentCampaignStage(run: BreakCampaignRun): CampaignStage {
  return CAMPAIGN_STAGES[Math.min(run.stageIndex, CAMPAIGN_STAGES.length - 1)]!;
}

export function isBreakCampaignCleared(): boolean {
  try {
    const v = localStorage.getItem(CAMPAIGN_DONE_KEY);
    if (v === "1") {
      campaignDoneMemory = true;
      return true;
    }
    if (v === "0") {
      campaignDoneMemory = false;
      return false;
    }
  } catch {
    /* ignore */
  }
  return campaignDoneMemory;
}

export function markBreakCampaignCleared(): void {
  campaignDoneMemory = true;
  try {
    localStorage.setItem(CAMPAIGN_DONE_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function clearBreakCampaignProgress(): void {
  campaignDoneMemory = false;
  try {
    localStorage.removeItem(CAMPAIGN_DONE_KEY);
  } catch {
    /* ignore */
  }
}

function guideFor(stage: CampaignStage): Pick<BreakCampaignRun, "guideCardIds" | "guideCoach" | "teachBanner"> {
  return {
    guideCardIds: [...stage.hand],
    guideCoach: `${stage.blurb} ${stage.teach}`,
    teachBanner: `谜题 · ${stage.title}`,
  };
}

export function createBreakCampaignRun(): BreakCampaignRun {
  const stage = CAMPAIGN_STAGES[0]!;
  const g = guideFor(stage);
  return {
    stageIndex: 0,
    stageId: stage.id,
    hp: stage.playerHp,
    hpMax: stage.playerHp,
    totalHardBreaks: 0,
    puzzleTurn: 0,
    sessionHardBreaks: 0,
    sessionChases: 0,
    sessionGrazes: 0,
    sessionInterrupts: 0,
    sessionDodges: 0,
    foeDebrief: null,
    battleStartHp: stage.playerHp,
    lastFailTip: "",
    ...g,
  };
}

/** 谜题无分步教案：手中牌都可打（仅本关 hand 内）。 */
export function campaignLessonDone(_run: BreakCampaignRun): boolean {
  return true;
}

export function currentCampaignLesson(_run: BreakCampaignRun): {
  kind: "play";
  allowCardIds: string[];
  teachBanner: string;
  coach: string;
} {
  return { kind: "play", allowCardIds: [], teachBanner: "", coach: "" };
}

export function syncCampaignLesson(run: BreakCampaignRun): BreakCampaignRun {
  const stage = currentCampaignStage(run);
  return {
    ...run,
    stageId: stage.id,
    ...guideFor(stage),
  };
}

export function campaignAllowsCard(run: BreakCampaignRun, cardId: string): boolean {
  return (currentCampaignStage(run).hand as string[]).includes(cardId);
}

export function campaignAllowsEndTurn(_run: BreakCampaignRun): boolean {
  return true;
}

export function campaignAllowsSwap(_run: BreakCampaignRun, _mateId: CompanionId): boolean {
  return false;
}

export function afterCampaignPlayCard(run: BreakCampaignRun, _cardId: string): BreakCampaignRun {
  return run;
}

export function afterCampaignEndTurn(run: BreakCampaignRun): BreakCampaignRun {
  return run;
}

export function afterCampaignSwap(run: BreakCampaignRun): BreakCampaignRun {
  return run;
}

export function dismissCampaignFoeDebrief(run: BreakCampaignRun): BreakCampaignRun {
  return run;
}

export interface CampaignResolveStats {
  hardBreaksDelta: number;
  chaseDelta: number;
  grazeDelta: number;
  interruptDelta: number;
  dodgeDelta: number;
  hitCount: number;
  enemyDead: boolean;
  outcomes: string[];
}

export function readCampaignResolveStats(b: Battle, _breaksBefore: number): CampaignResolveStats {
  const outcomes = (b.v2LastIntentRecap ?? []).map((r) => r.outcome);
  return {
    hardBreaksDelta: outcomes.filter((o) => o === "破" || o === "墨" || o === "绝").length,
    chaseDelta: outcomes.filter((o) => o === "追").length,
    grazeDelta: outcomes.filter((o) => o === "擦" || o === "让").length,
    interruptDelta: outcomes.filter((o) => o === "断").length,
    dodgeDelta: outcomes.filter((o) => o === "闪").length,
    hitCount: outcomes.filter((o) => o === "打").length,
    enemyDead: b.enemy.hp <= 0,
    outcomes,
  };
}

export function readQiResolveStats(f: QiFight): CampaignResolveStats {
  const outcomes = f.lastRecap.map((r) => r.outcome);
  return {
    hardBreaksDelta: outcomes.filter((o) => o === "破" || o === "墨" || o === "绝").length,
    chaseDelta: 0,
    grazeDelta: outcomes.filter((o) => o === "擦").length,
    interruptDelta: outcomes.filter((o) => o === "断").length,
    dodgeDelta: outcomes.filter((o) => o === "闪").length,
    hitCount: outcomes.filter((o) => o === "打").length,
    enemyDead: f.enemyHp <= 0 || f.phase === "won",
    outcomes,
  };
}

export function createQiFightFromStage(stage: CampaignStage): QiFight {
  return createQiFight({
    playerHp: stage.playerHp,
    enemyHp: stage.enemyHp,
    playerPos: stage.playerPos,
    enemyPos: stage.enemyPos,
    hand: stage.hand,
    queue: stage.qiQueue,
    nextQueue: stage.qiNextQueue,
    qi: stage.energy,
    loopQueue: stage.maxTurns > 2,
  });
}

export type CampaignTick =
  | { kind: "win"; run: BreakCampaignRun }
  | { kind: "lose"; tip: string; run: BreakCampaignRun }
  | { kind: "continue"; run: BreakCampaignRun };

/**
 * 敌回合结算后调用：即时胜负，不看击杀。
 */
export function tickCampaignAfterResolve(run: BreakCampaignRun, stats: CampaignResolveStats): CampaignTick {
  const stage = currentCampaignStage(run);
  const next: BreakCampaignRun = {
    ...run,
    puzzleTurn: run.puzzleTurn + 1,
    sessionHardBreaks: run.sessionHardBreaks + stats.hardBreaksDelta,
    sessionChases: run.sessionChases + stats.chaseDelta,
    sessionGrazes: run.sessionGrazes + stats.grazeDelta,
    sessionInterrupts: (run.sessionInterrupts ?? 0) + (stats.interruptDelta ?? 0),
    sessionDodges: (run.sessionDodges ?? 0) + (stats.dodgeDelta ?? 0),
  };

  if (stats.hitCount > 0 && stage.goals.some((g) => g.type === "noHit")) {
    return { kind: "lose", tip: stage.failTip, run: { ...next, lastFailTip: stage.failTip } };
  }

  if (goalsMet(next, stage, stats.enemyDead)) {
    return { kind: "win", run: next };
  }
  if (next.puzzleTurn >= stage.maxTurns) {
    return { kind: "lose", tip: stage.failTip, run: { ...next, lastFailTip: stage.failTip } };
  }
  return { kind: "continue", run: next };
}

function goalsMet(run: BreakCampaignRun, stage: CampaignStage, enemyDead = false): boolean {
  for (const g of stage.goals) {
    if (g.type === "hardBreaks" && run.sessionHardBreaks < g.min) return false;
    if (g.type === "chase" && run.sessionChases < g.min) return false;
    if (g.type === "graze" && run.sessionGrazes < g.min) return false;
    if (g.type === "interrupt" && (run.sessionInterrupts ?? 0) < g.min) return false;
    if (g.type === "dodge" && (run.sessionDodges ?? 0) < g.min) return false;
    if (g.type === "withinTurns" && run.puzzleTurn > g.max) return false;
    if (g.type === "kill" && !enemyDead) return false;
  }
  return true;
}

/** @deprecated 击杀路径已不用；保留给旧测试迁移 */
export function evaluateCampaignBattle(
  run: BreakCampaignRun,
  stats: { won: boolean; hardBreaks: number; hitsTaken: number; chases?: number; grazes?: number; turns?: number },
): { ok: boolean; tip: string } {
  if (!stats.won && stats.hitsTaken > 0) {
    return { ok: false, tip: currentCampaignStage(run).failTip };
  }
  const stage = currentCampaignStage(run);
  const probe: BreakCampaignRun = {
    ...run,
    sessionHardBreaks: stats.hardBreaks,
    sessionChases: stats.chases ?? 0,
    sessionGrazes: stats.grazes ?? 0,
    puzzleTurn: stats.turns ?? stage.maxTurns,
  };
  if (stats.hitsTaken > 0 && stage.goals.some((g) => g.type === "noHit")) {
    return { ok: false, tip: stage.failTip };
  }
  if (!goalsMet(probe, stage, stats.won && stage.goals.some((g) => g.type === "kill"))) return { ok: false, tip: stage.failTip };
  return { ok: true, tip: "" };
}

export function advanceCampaignAfterClear(run: BreakCampaignRun): { run: BreakCampaignRun; done: boolean } {
  const nextIndex = run.stageIndex + 1;
  if (nextIndex >= CAMPAIGN_STAGES.length) {
    return { done: true, run };
  }
  const next = CAMPAIGN_STAGES[nextIndex]!;
  return {
    done: false,
    run: syncCampaignLesson({
      ...run,
      stageIndex: nextIndex,
      stageId: next.id,
      hp: next.playerHp,
      hpMax: next.playerHp,
      puzzleTurn: 0,
      sessionHardBreaks: 0,
      sessionChases: 0,
      sessionGrazes: 0,
      sessionInterrupts: 0,
      lastFailTip: "",
    }),
  };
}

export function recordCampaignClear(run: BreakCampaignRun, hardBreaks: number, hp: number): BreakCampaignRun {
  return {
    ...run,
    totalHardBreaks: run.totalHardBreaks + hardBreaks,
    hp: Math.max(1, hp),
    lastFailTip: "",
  };
}

export function syncCampaignBattle(b: Battle, run: BreakCampaignRun): Battle {
  const stage = currentCampaignStage(run);
  // 每拍开始：只发本关 hand（不随机摸牌）
  b.hand = [];
  b.drawPile = [];
  b.discardPile = [];
  b.energy = Math.max(b.energy, stage.energy);
  return b;
}

export function lockCampaignAfterFoeTurn(_b: Battle, _playerPos: number, _enemyPos: number): void {
  // 谜题不锁弱意图：下一拍仍用关卡意图（由 apply / refresh 负责）
}

export function applyCampaignBattle(b: Battle, run: BreakCampaignRun): Battle {
  const synced = syncCampaignLesson({
    ...run,
    puzzleTurn: 0,
    sessionHardBreaks: 0,
    sessionChases: 0,
    sessionGrazes: 0,
    sessionInterrupts: 0,
  });
  Object.assign(run, synced);
  const stage = currentCampaignStage(run);
  b.player.pos = stage.playerPos;
  b.enemy.pos = stage.enemyPos;
  b.enemy.hp = stage.enemyHp;
  b.enemy.maxHp = stage.enemyHp;
  b.player.hp = stage.playerHp;
  b.player.maxHp = Math.max(b.player.maxHp, stage.playerHp);
  b.intents = intentsFromQueue(stage.qiQueue);
  b.intent = b.intents[0]!;
  b.intentIndex = 0;
  b.v2EyeIdx = stage.eyeIdx;
  b.v2Turn = emptyV2Turn(b);
  b.v2BreakCount = 0;
  b.energy = stage.energy;
  b.labBreakLesson = true;
  run.battleStartHp = b.player.hp;
  run.hp = b.player.hp;
  return syncCampaignBattle(b, run);
}

/** 收势后刷新下一拍意图（同关循环） */
export function refreshCampaignIntents(b: Battle, run: BreakCampaignRun): void {
  const stage = currentCampaignStage(run);
  b.intents = intentsFromQueue(stage.qiQueue);
  b.intent = b.intents[0]!;
  b.intentIndex = 0;
  b.v2EyeIdx = stage.eyeIdx;
  if (b.v2Turn) {
    b.v2Turn.turnStartPos = b.player.pos;
    b.v2Turn.endPos = b.player.pos;
  }
}

export function buildCampaignPreset(run: BreakCampaignRun): LabPreset {
  const stage = currentCampaignStage(run);
  const mate = DEMO_FIELD_MATE;
  return normalizePreset({
    id: `break-campaign-${stage.id}`,
    name: `读招谜题 · ${stage.title}`,
    blurb: stage.blurb,
    tags: ["读招", "谜题", "saber"],
    enemyId: stage.enemyId,
    party: [mate],
    fieldMate: mate,
    deckRecipe: ["defend", "strike"],
    mateWeapons: { [mate]: "saber-a-3" },
    mateTechs: { [mate]: ["brightBlade", "closeCut"] },
    mateMinds: {},
    labItems: [],
    labItemCharges: {},
    hp: stage.playerHp,
    hpMax: stage.playerHp,
  });
}

export function campaignBadge(run: BreakCampaignRun): string {
  const stage = currentCampaignStage(run);
  return `谜题 ${run.stageIndex + 1}/${CAMPAIGN_STAGES.length} · ${stage.title}`;
}

export function campaignGoalLine(run: BreakCampaignRun): string {
  return currentCampaignStage(run).teach;
}
