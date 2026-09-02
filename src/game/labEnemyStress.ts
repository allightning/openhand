import { ENEMIES, ENEMY_ENERGY } from "./content";
import { getLabTuning, isLabMode } from "./labTuning";
import { isBreakAlign } from "../combatLab/labRuleset";
import type { Battle, EnemyId, Intent } from "./types";

export type StressSource = "break" | "burst" | "assist" | "signature";

const BOSS_IDS = new Set<EnemyId>(["lord", "usurper", "twin"]);
const ELITE_IDS = new Set<EnemyId>([
  "bandit",
  "nametaker",
  "warden",
  "knotboss",
  "stakeboss",
  "brute",
  "twin",
]);

export function isBossEnemy(id: EnemyId): boolean {
  return BOSS_IDS.has(id);
}

export function isEliteEnemy(id: EnemyId): boolean {
  return ELITE_IDS.has(id) || Boolean(ENEMIES[id]?.elite);
}

export function enemyRoundBudgetCap(b: Battle): number {
  const base = ENEMY_ENERGY[b.enemyId] ?? 2;
  if (!isLabMode()) return base;
  const bonus = getLabTuning().enemySegBonus;
  // §31.6 踢馆线：杂兵也吃段预算加成（甲方手测「前面随便点就赢」的结构性修正）。
  if (getLabTuning().enemySegAll) return base + bonus;
  if (isBossEnemy(b.enemyId) || isEliteEnemy(b.enemyId)) return base + bonus;
  return base;
}

export function isAttackIntent(intent: Intent): boolean {
  return (
    intent.kind === "strike" ||
    intent.kind === "charge" ||
    intent.kind === "lunge" ||
    intent.kind === "barrage" ||
    intent.kind === "bleedcut" ||
    intent.kind === "pestle" ||
    (intent.kind === "sig" && (intent.damage ?? 0) > 0)
  );
}

export function isHeavyIntent(intent: Intent): boolean {
  return intent.kind === "barrage" || intent.kind === "charge" || intent.kind === "pestle" || intent.kind === "sig";
}

/** 与 sim 结算扣劲同一套：连打/冲锋/吐纳/回血/杵/特色 2，其余 1。 */
export function intentEnergyCost(intent: Intent): number {
  if (intent.kind === "barrage" || intent.kind === "charge") return 2;
  if (intent.kind === "mend" || intent.kind === "breathe") return 2;
  if (intent.kind === "pestle" || intent.kind === "sig") return 2;
  return 1;
}

export function intentFirePlan(
  energy: number,
  queue: Intent[],
): { cost: number; skip: boolean; energyBefore: number }[] {
  let e = energy;
  return queue.map((intent) => {
    const cost = intentEnergyCost(intent);
    const skip = e < cost;
    const row = { cost, skip, energyBefore: e };
    if (!skip) e -= cost;
    return row;
  });
}

const STRESS_LABELS: Record<StressSource, string> = {
  break: "破招应激",
  burst: "势爆应激",
  assist: "助战应激",
  signature: "签名技应激",
};

function stressIntentFor(b: Battle): Intent {
  const def = ENEMIES[b.enemyId];
  const d = Math.abs(b.player.pos - b.enemy.pos);
  const reach = def?.reach ?? 1;
  const defensive = def?.elite === "windup" || def?.pattern.some((p) => p.kind === "guard");
  if (defensive && d > reach) return { kind: "guard", block: 10 };
  // §31.10 够得着才出打击，够不着就逼近（旧版写反：远距出打击=打不到还白送拆）
  return d <= reach ? { kind: "strike", damage: 12 } : { kind: "lunge", damage: 12 };
}

/**
 * §29.2/§31.14 应激段：挂起到「下一手」——本回合触发不入当前队列，
 * 下次敌规划时带着「应」签入场（全亮、可拆、吃总督）。
 * 旧版当场追加攻击段 = 你越拆他打得越多（死亡螺旋，也是「满血被一招秒」的主因）。
 */
export function tryAppendStressIntent(b: Battle, source: StressSource): boolean {
  if (!isLabMode()) return false;
  if (source === "break" && !isBreakAlign()) return false;
  const cap = getLabTuning().enemyStressCap;
  if ((b.v2StressCount ?? 0) >= cap) return false;
  b.v2PendingStress = [...(b.v2PendingStress ?? []), { source, label: STRESS_LABELS[source] }];
  b.v2StressCount = (b.v2StressCount ?? 0) + 1;
  const tally = { ...(b.v2StressBySource ?? {}) };
  tally[source] = (tally[source] ?? 0) + 1;
  b.v2StressBySource = tally;
  b.log.push(`【应激·${STRESS_LABELS[source]}】他按下这口气——下一手要拼命`);
  return true;
}

/** §31.14 规划下一手时调用：挂起的应激段入场（打击/抢步按入场时的距离现算），返回应签元数据。 */
export function drainPendingStress(b: Battle): { intents: Intent[]; metas: { source: StressSource; label: string }[] } {
  const pending = b.v2PendingStress ?? [];
  b.v2PendingStress = [];
  return {
    intents: pending.map(() => stressIntentFor(b)),
    metas: pending.map((p) => ({ source: p.source, label: p.label })),
  };
}

export function stressMetaAt(b: Battle, index: number): { source: StressSource; label: string } | null {
  return b.v2StressMeta?.[index] ?? null;
}

/** 助战在场时 50% 指定助战承伤（§29.5）。 */
export function stressTargetsAssist(b: Battle): boolean {
  if (!b.labAssistActive) return false;
  return Math.random() < 0.5;
}
