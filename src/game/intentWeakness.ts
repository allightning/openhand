import type { Battle, CardId, Intent, V2TurnFlags, WeaknessDef, WeaknessKind } from "./types";
import { isBreakAlign } from "../combatLab/labRuleset";
import { SIGNATURE_BREAK } from "./enemySignatures";
import { ROGUE_SCHOOLS, stepCardId } from "./rogueCards";

export type { WeaknessKind, WeaknessDef };

const SCHOOL_STEP_IDS = ROGUE_SCHOOLS.map(stepCardId);
const SCHOOL_CHASE_IDS = SCHOOL_STEP_IDS.filter((id) => id !== "stepSword" && id !== "stepSpear");

export const MOVE_CARD_IDS: CardId[] = [
  "sidestep",
  "retreat",
  "advance",
  "advance2",
  "close",
  "backpalm",
  "push",
  "push2",
  "sweep",
  ...SCHOOL_STEP_IDS,
];
export const CHASE_CARD_IDS: CardId[] = ["advance", "advance2", "close", ...SCHOOL_CHASE_IDS];
export const PLANT_STAKE_CARD_IDS: CardId[] = ["plant", "split"];
export const ANTI_GUARD_CARD_IDS: CardId[] = ["expose", "pierce", "rift", "marking"];

/** Default weakness per intent kind (rules book §4.3). */
export const DEFAULT_WEAKNESS: Record<Intent["kind"], WeaknessDef> = {
  strike: { kind: "moveCardPlayed" },
  charge: { kind: "stakeOnBoard" },
  stake: { kind: "plantStakePlayed" },
  pull: { kind: "adjacentAttackHit" },
  trap: { kind: "trapAvoided" },
  windup: { kind: "hitFoeThisTurn" },
  lunge: { kind: "endDistGt1" },
  swap: { kind: "endBlockGt0" },
  barrage: { kind: "endBlockGte8", param: 8 },
  guard: { kind: "antiGuardPlayed" },
  bleedcut: { kind: "bleedcutFullyBlocked" },
  counter: { kind: "noAttackThisTurn" },
  mend: { kind: "markGte2", param: 2 },
  seal: { kind: "endEnergyGte3", param: 3 },
  shatter: { kind: "endBlockZero" },
  breathe: { kind: "adjacentAttackHitBreathe" },
  retreat: { kind: "chaseClosed" },
  pestle: { kind: "antiGuardPlayed" },
  dust: { kind: "adjacentAttackHit" },
  shackle: { kind: "endNotAdjacent" },
  dodge: { kind: "noAttackOrMoved" },
  endure: { kind: "antiGuardPlayed" },
  sig: { kind: "hitFoeThisTurn" },
};

function dist(b: Battle): number {
  return Math.abs(b.player.pos - b.enemy.pos);
}

export function weaknessForIntent(intent: Intent): WeaknessDef {
  if (intent.kind === "sig") {
    const sig = SIGNATURE_BREAK[intent.id as keyof typeof SIGNATURE_BREAK];
    if (sig) return intent.weakness ?? sig.weakness;
  }
  return intent.weakness ?? DEFAULT_WEAKNESS[intent.kind];
}

/** §31.6 破法教学文案：拆招要能被「读懂」，每段意图都必须说清怎么拆。 */
export function weaknessTip(intent: Intent): string {
  const w = weaknessForIntent(intent);
  switch (w.kind) {
    case "moveCardPlayed":
      return "打出位移牌，离开他锁定的红格（动了还在红圈里不算拆）";
    case "stakeOnBoard":
      return "场上有桩，朝他进步离开落点，或原地让他冲过头";
    case "stoodStillEndTurn":
      return "原地不动收势";
    case "plantStakePlayed":
      return "砸挡路的桩（攻击吃掉它的挡次），或打出点地/裂桩。棍一棍可拆高阶";
    case "adjacentAttackHit":
    case "adjacentAttackHitBreathe":
      return "贴身攻击命中他";
    case "trapAvoided":
      return "收势时脚下无机关";
    case "hitFoeThisTurn":
      return "本回合命中他";
    case "endDistGt1":
      return "离开他扑击的红格：出位移牌算拆，本就在圈外只能让开一半";
    case "endBlockGt0":
      return "收势时留住格挡";
    case "endBlockGte8":
      return `收势时格挡 ≥${w.param ?? 8}（只能让开一半，不算拆）`;
    case "antiGuardPlayed":
      return "打出破绽/刺/点穴/开缝类牌拆它（每张只够拆一段）";
    case "bleedcutFullyBlocked":
      return "格挡完全吃下这一刀";
    case "noAttackThisTurn":
      return "本回合不出攻击牌";
    case "noAttackOrMoved":
      return "不出攻击，或打出位移";
    case "markGte2":
      return `他身上印记 ≥${w.param ?? 2}`;
    case "endEnergyGte3":
      return `收势时留劲 ≥${w.param ?? 3}`;
    case "endBlockZero":
      return "收势时不留格挡";
    case "chaseClosed":
      return "打出朝他的位移（进步/纵步），收势比回合开始更近（追）";
    case "endNotAdjacent":
      return "收势时不要贴身";
    default:
      return "";
  }
}

/** §31.8 v3 拆招分级：破=硬拆（耗充能，全免+得势）；让=软拆（站位/架势兜底，半效不得势）。 */
export type BreakTier = "hard" | "graze";

/** §31.9 红格提供者由 sim 注册（intentWeakness 不能反向依赖 sim）。 */
type ThreatProvider = (b: Battle, intent: Intent) => number[];
let threatProvider: ThreatProvider | null = null;
export function registerThreatProvider(fn: ThreatProvider): void {
  threatProvider = fn;
}
function threatCells(b: Battle, intent: Intent): number[] {
  return threatProvider ? threatProvider(b, intent) : [];
}

/** §31.15 队列级投影提供者：逐段推进敌位后的每段红格（与显示/结算同一投影链）。 */
type QueueThreatProvider = (b: Battle, queue: Intent[]) => number[][];
let queueThreatProvider: QueueThreatProvider | null = null;
export function registerQueueThreatProvider(fn: QueueThreatProvider): void {
  queueThreatProvider = fn;
}

/** 与显示/结算同一条投影链；无提供者时退回静态逐段。 */
export function queuedThreatCells(b: Battle, queue: Intent[]): number[][] {
  if (queueThreatProvider) return queueThreatProvider(b, queue);
  return queue.map((intent) => threatCells(b, intent));
}

/** 哪些破法属于「耗充能的硬拆」。 */
function chargeKind(w: WeaknessDef): "move" | "antiGuard" | null {
  if (w.kind === "moveCardPlayed") return "move";
  if (w.kind === "antiGuardPlayed") return "antiGuard";
  return null;
}

/** §31.9 空间破法（打击锁格 / 抢步锁线）：离开红格才算拆。 */
function isSpatialKind(w: WeaknessDef): boolean {
  return w.kind === "moveCardPlayed" || w.kind === "endDistGt1";
}

/** 哪些破法只是「让」（软拆半效）。 */
function isGrazeKind(w: WeaknessDef): boolean {
  return w.kind === "endBlockGte8";
}

/**
 * 预览与结算共用的破招计划器（D4：预览=结算）。
 * §31.9 空间规则：打击/抢步类——收势位置必须离开该段红格；
 * 在红格外出位移牌 = 破（耗 1 充能），在红格外没出牌 = 让（半效），还在红圈里 = 照打。
 */
export function planBreaks(b: Battle, queue: Intent[], phase: "preview" | "resolve"): Map<number, BreakTier> {
  const flags = b.v2Turn;
  const out = new Map<number, BreakTier>();
  if (!flags) return out;
  const charges = {
    move: flags.moveCharges ?? 0,
    antiGuard: flags.antiGuardCharges ?? 0,
  };
  // §31.15 逐段投影的红格（后手段按先手落位后的敌位算）；无提供者时退回静态逐段
  const projected = queueThreatProvider ? queueThreatProvider(b, queue) : null;
  queue.forEach((intent, i) => {
    const w = weaknessForIntent(intent);
    if (w.kind === "chaseClosed") {
      const startPos = flags.turnStartPos ?? b.player.pos;
      const endPos = flags.endPos ?? b.player.pos;
      const startDist = Math.abs(startPos - b.enemy.pos);
      const endDist = flags.endDist ?? Math.abs(endPos - b.enemy.pos);
      const chased = Boolean(flags.chaseCardPlayed) && endDist < startDist;
      const attempted = Boolean(flags.chaseCardPlayed);
      if (chased && charges.move > 0) {
        charges.move -= 1;
        out.set(i, "hard");
      } else if (attempted) {
        out.set(i, "graze");
      }
      return;
    }
    if (isSpatialKind(w)) {
      const cells = projected?.[i] ?? threatCells(b, intent);
      const pos = flags.endPos ?? b.player.pos;
      const startPos = flags.turnStartPos ?? pos;
      // §31.14 公平性：这一手本来就够不着你（开局你就不在红圈）→ 不算拆也不算让，段会自己打空。
      if (!cells.includes(startPos)) return;
      if (cells.includes(pos)) return; // 还在红圈里：动了也不算拆
      if (charges.move > 0) {
        charges.move -= 1;
        out.set(i, "hard");
      } else {
        out.set(i, "graze");
      }
      return;
    }
    const ck = chargeKind(w);
    if (ck) {
      if (charges[ck] > 0) {
        charges[ck] -= 1;
        out.set(i, "hard");
      }
      return;
    }
    if (isGrazeKind(w)) {
      if (evalWeakness(intent, b, flags, phase)) out.set(i, "graze");
      return;
    }
    if (intent.kind === "charge") {
      if (evalWeakness(intent, b, flags, phase)) out.set(i, "hard");
      else if (flags.endTurnCommitted && !flags.stoodStill) out.set(i, "graze");
      return;
    }
    if (evalWeakness(intent, b, flags, phase)) out.set(i, "hard");
  });
  return out;
}

/** 招眼可选段：必须有「硬拆」路径（充能类破法），否则这一手没有眼。 */
const EYE_KINDS: WeaknessKind[] = ["moveCardPlayed", "antiGuardPlayed", "chaseClosed"];

/** 招眼 = 队列中第一个可硬拆的攻击段；撤也可以当眼。 */
export function planEyeIdx(queue: Intent[]): number {
  for (let i = 0; i < queue.length; i++) {
    const it = queue[i]!;
    const w = weaknessForIntent(it).kind;
    if (!EYE_KINDS.includes(w)) continue;
    const dmg = "damage" in it ? (it.damage ?? 0) : 0;
    if (dmg > 0 || it.kind === "retreat" || it.kind === "pestle") return i;
  }
  return -1;
}

export function evalWeakness(
  intent: Intent,
  b: Battle,
  flags: V2TurnFlags,
  phase: "preview" | "resolve",
  resolveCtx?: { bleedcutRaw?: number; bleedcutBlocked?: number },
): boolean {
  if (intent.kind === "charge") {
    if (b.stakes.length > 0) return true;
    if (flags.stoodStill && flags.endTurnCommitted) return true;
    return Boolean(flags.chaseCardPlayed && flags.endTurnCommitted && !flags.stoodStill);
  }

  const w = weaknessForIntent(intent);

  switch (w.kind) {
    case "moveCardPlayed":
      return flags.moveCardPlayed;
    case "stakeOnBoard":
      return b.stakes.length > 0;
    case "stoodStillEndTurn":
      return flags.stoodStill && flags.endTurnCommitted;
    case "plantStakePlayed":
      return flags.plantStakePlayed || Boolean(flags.hitStakeThisTurn);
    case "adjacentAttackHit":
    case "adjacentAttackHitBreathe":
      return flags.adjacentAttackHit;
    case "trapAvoided":
      return !b.traps.includes(b.player.pos);
    case "hitFoeThisTurn":
      return flags.hitFoeThisTurn;
    case "endDistGt1":
      return flags.endTurnCommitted && (flags.endDist ?? dist(b)) > 1;
    case "endBlockGt0":
      return flags.endTurnCommitted && (flags.endBlock ?? b.playerBlock) > 0;
    case "endBlockGte8": {
      let need = w.param ?? 8;
      if (isBreakAlign() && b.techniques.includes("softPalm")) need = Math.max(1, need - 2);
      return flags.endTurnCommitted && (flags.endBlock ?? b.playerBlock) >= need;
    }
    case "antiGuardPlayed":
      return flags.antiGuardPlayed;
    case "bleedcutFullyBlocked":
      if (phase === "resolve" && resolveCtx) {
        return (resolveCtx.bleedcutRaw ?? 0) > 0 && (resolveCtx.bleedcutBlocked ?? 0) >= (resolveCtx.bleedcutRaw ?? 0);
      }
      return false;
    case "noAttackThisTurn":
      return !flags.attackPlayed;
    case "noAttackOrMoved":
      return !flags.attackPlayed || Boolean(flags.moveCardPlayed);
    case "markGte2":
      return b.mark >= (w.param ?? 2);
    case "endEnergyGte3":
      return flags.endTurnCommitted && (flags.endEnergy ?? b.energy) >= (w.param ?? 3);
    case "endBlockZero":
      return flags.endTurnCommitted && (flags.endBlock ?? b.playerBlock) <= 0;
    case "chaseClosed": {
      const startPos = flags.turnStartPos ?? b.player.pos;
      const endPos = flags.endPos ?? b.player.pos;
      const startDist = Math.abs(startPos - b.enemy.pos);
      const endDist = flags.endDist ?? Math.abs(endPos - b.enemy.pos);
      return Boolean(flags.chaseCardPlayed) && endDist < startDist;
    }
    case "endNotAdjacent":
      return flags.endTurnCommitted && (flags.endDist ?? dist(b)) > 1;
    default:
      return false;
  }
}
