import { ENEMIES } from "./content";
import { isLabV2, getLabTuning } from "./labTuning";
import {
  BOSS_VARIANT_BREAK_THRESHOLD,
  BREAK_COUNTER_BASE,
  BREAK_COUNTER_CHAIN,
  GRUDGE_BOSS,
  GRUDGE_ELITE,
  GRUDGE_NORMAL,
  LAB_ENTRANCE_BONUS,
  QI_BURST_DMG,
  QI_MAX,
  VARIANT_BREAK_THRESHOLD,
} from "./labV2Constants";
import { evalWeakness, planBreaks, weaknessForIntent, MOVE_CARD_IDS, PLANT_STAKE_CARD_IDS, ANTI_GUARD_CARD_IDS } from "./intentWeakness";
import { applyBreakLoot, type BreakLoot } from "./breakLootBus";
import { refreshBreakPromised } from "./labV21";
import { tryAppendStressIntent } from "./labEnemyStress";
import { battleMateGearId } from "./equippedWeapon";
import { gearById } from "./weapons";
import type { Battle, CardId, Intent, V2TurnFlags } from "./types";

export type LabFxKind = "break" | "wall" | "kill" | "resonance" | "burst" | "swap" | "counter";

export function emptyV2Turn(b: Battle): V2TurnFlags {
  return {
    moveCardPlayed: false,
    playerMoved: false,
    attackPlayed: false,
    hitFoeThisTurn: false,
    adjacentAttackHit: false,
    plantStakePlayed: false,
    antiGuardPlayed: false,
    stoodStill: true,
    endTurnCommitted: false,
    turnStartPos: b.player.pos,
    moveCharges: 0,
    antiGuardCharges: 0,
    turnStartHand: b.hand?.length ?? 0,
    discardsUsed: 0,
  };
}

export function initV2Battle(b: Battle): void {
  b.qi = b.qi ?? 0;
  b.v2Turn = emptyV2Turn(b);
  b.v2BrokenSegments = [];
  b.v2BreakPreview = [];
  b.v2BreakByKind = {};
  b.v2VariantStage = 0;
  b.v2GrudgeBonus = 0;
  b.v2PendingQi = 0;
  b.v2FxQueue = [];
  b.labEntranceActive = false;
  b.labEntranceUsed = false;
}

export function addQi(b: Battle, n: number, note?: (t: string) => void): void {
  if (!isLabV2()) return;
  const before = b.qi ?? 0;
  b.qi = Math.min(QI_MAX, Math.max(0, before + n));
  if (note && b.qi !== before) note(`势 ${b.qi}`);
}

export function clearQi(b: Battle, note?: (t: string) => void): void {
  if (!isLabV2() || !(b.qi ?? 0)) return;
  b.qi = 0;
  note?.("势散");
}

export function qiBurstDamage(b: Battle): number {
  return (b.qi ?? 0) * QI_BURST_DMG;
}

export function v2StrikeBonus(b: Battle, base: number, isAttack: boolean): number {
  let dmg = base;
  if (!isLabV2()) return dmg;
  if (isAttack && b.labEntranceActive && !b.labEntranceUsed) {
    dmg += LAB_ENTRANCE_BONUS;
    b.labEntranceUsed = true;
  }
  const grudge = b.v2GrudgeBonus ?? 0;
  if (grudge > 0) dmg += grudge;
  const mul = getLabTuning().playerDmgMul ?? 1;
  if (mul > 1 && isAttack) dmg = Math.floor(dmg * mul);
  return dmg;
}

export function v2IncomingBonus(raw: number, b: Battle): number {
  if (!isLabV2()) return raw;
  return raw + (b.v2GrudgeBonus ?? 0);
}

export function onV2CardPlayed(b: Battle, defId: CardId, movedPlayer: boolean, hitFoe: boolean, adjacentHit: boolean): void {
  if (!isLabV2()) return;
  const f = b.v2Turn ?? emptyV2Turn(b);
  if (MOVE_CARD_IDS.includes(defId)) {
    f.moveCardPlayed = true;
    f.moveCharges = (f.moveCharges ?? 0) + 1;
  }
  if (PLANT_STAKE_CARD_IDS.includes(defId)) f.plantStakePlayed = true;
  if (ANTI_GUARD_CARD_IDS.includes(defId)) {
    f.antiGuardPlayed = true;
    f.antiGuardCharges = (f.antiGuardCharges ?? 0) + 1;
  }
  if (movedPlayer) {
    f.playerMoved = true;
    f.stoodStill = false;
  }
  if (hitFoe) f.hitFoeThisTurn = true;
  if (adjacentHit) f.adjacentAttackHit = true;
  b.v2Turn = f;
  b.v2BreakPreview = previewBrokenSegments(b);
  refreshBreakPromised(b);
}

export function onV2AttackPlayed(b: Battle): void {
  if (!isLabV2()) return;
  const f = b.v2Turn ?? emptyV2Turn(b);
  f.attackPlayed = true;
  b.v2Turn = f;
}

export function commitV2EndTurn(b: Battle): void {
  if (!isLabV2()) return;
  const f = b.v2Turn ?? emptyV2Turn(b);
  f.endTurnCommitted = true;
  f.endBlock = b.playerBlock;
  f.endEnergy = b.energy;
  f.endDist = Math.abs(b.player.pos - b.enemy.pos);
  f.endPos = b.player.pos;
  if (!f.playerMoved && b.player.pos === f.turnStartPos) f.stoodStill = true;
  b.v2Turn = f;
  b.v2BreakPreview = previewBrokenSegments(b);
  refreshBreakPromised(b);
}

export function previewBrokenSegments(b: Battle): number[] {
  if (!isLabV2()) return [];
  const queue = b.intents.length ? b.intents : [b.intent];
  const plan = planBreaks(b, queue, "preview");
  b.v2GrazePreview = [...plan.entries()].filter(([, t]) => t === "graze").map(([i]) => i);
  return [...plan.entries()].filter(([, t]) => t === "hard").map(([i]) => i);
}

/** §31.8 v3 软拆「让」：段仍结算但效果减半，不得势、不算破招、不能破眼。 */
export function applyGraze(b: Battle, intent: Intent, index: number): void {
  if (!isLabV2()) return;
  b.v2GrazedSegments = [...(b.v2GrazedSegments ?? []), index];
  b.log.push(`【让招】${intent.kind} 被让开一半`);
  b.journal.push({ side: "you", text: "让！" });
}

export function shouldBreakIntent(b: Battle, intent: Intent, _index: number, resolveCtx?: { bleedcutRaw?: number; bleedcutBlocked?: number }): boolean {
  if (!isLabV2()) return false;
  const flags = b.v2Turn ?? emptyV2Turn(b);
  return evalWeakness(intent, b, flags, "resolve", resolveCtx);
}

/** §31.13 反拆真伤 = 底数 + 场上角色兵器品阶（精3/玄4/神5 → 5/6/7）。 */
export function breakCounterDamage(b: Battle): number {
  const grade = gearById(battleMateGearId(b, b.active))?.grade ?? 3;
  return BREAK_COUNTER_BASE + grade;
}

/** §31.13 反拆/拆眼的真伤出口：打前排敌，能拆死人（自食其力击杀路径）。 */
export function counterHitFoe(b: Battle, n: number, label: string): void {
  if (!isLabV2() || n <= 0) return;
  const foe = b.enemy;
  if (!foe || foe.hp <= 0) return;
  foe.hp -= n;
  pushFx(b, "counter");
  b.log.push(label);
  if (foe.hp > 0) return;
  const live = (b.foes ?? [b.enemy]).filter((f) => f.hp > 0);
  if (live[0]) {
    b.enemy = live[0];
  } else {
    b.enemy.hp = 0;
    b.phase = "won";
    b.log.push(`${foe.name}被拆得散了架，败下。`);
  }
}

/**
 * §31.15 拆招战利品：硬拆在反打真伤之外，按「破法路径」再给一个方向的资源——
 * 拆招不只喂伤害：走位喂生存、反架喂运转、硬吃喂续航、桩拆喂劲力。
 */
export function breakLootFor(intent: Intent): BreakLoot | null {
  const w = weaknessForIntent(intent).kind;
  if (w === "moveCardPlayed" || w === "endDistGt1") return { kind: "block", n: 4, label: "让中带架" };
  if (w === "antiGuardPlayed") return { kind: "expose", n: 2, label: "看穿套路" };
  if (w === "bleedcutFullyBlocked") return { kind: "heal", n: 3, label: "铁扛回气" };
  if (w === "plantStakePlayed" || w === "stakeOnBoard") return { kind: "energy", n: 2, label: "借势回劲" };
  return null;
}

export function applyBreak(b: Battle, intent: Intent, index: number): void {
  if (!isLabV2()) return;
  b.v2BrokenSegments = [...(b.v2BrokenSegments ?? []), index];
  const kind = intent.kind;
  b.v2BreakByKind = { ...(b.v2BreakByKind ?? {}), [kind]: (b.v2BreakByKind?.[kind] ?? 0) + 1 };
  addQi(b, 1);
  pushFx(b, "break");
  b.log.push(`【拆招】${kind} 被破`);
  b.journal.push({ side: "you", text: "拆！" });
  // §31.13 以拆为杀：硬拆 = 反打真伤；一回合第 2 段起连环拆（+2 伤 +1 势）
  b.v2TurnBreakCount = (b.v2TurnBreakCount ?? 0) + 1;
  const chain = b.v2TurnBreakCount >= 2;
  const dmg = breakCounterDamage(b) + (chain ? BREAK_COUNTER_CHAIN : 0);
  if (chain) addQi(b, 1);
  counterHitFoe(b, dmg, `【反拆${chain ? "·连环" : ""}】借势回敬 ${dmg} 真伤`);
  // §31.15 战利品立刻落账——同队后手段还能吃到这份格挡/劲
  const loot = breakLootFor(intent);
  if (loot) applyBreakLoot(b, loot);
  tryAppendStressIntent(b, "break");
}

export function pushFx(b: Battle, kind: LabFxKind): void {
  if (!getLabTuning().v2Fx) return;
  b.v2FxQueue = [...(b.v2FxQueue ?? []), kind];
}

export function grudgeThreshold(enemyId: string): number {
  const def = ENEMIES[enemyId as keyof typeof ENEMIES];
  if (!def) return GRUDGE_NORMAL;
  if (enemyId === "lord" || enemyId === "usurper" || enemyId === "twin") return GRUDGE_BOSS;
  if (def.elite) return GRUDGE_ELITE;
  return GRUDGE_NORMAL;
}

export function tickGrudge(b: Battle): void {
  if (!isLabV2() || !getLabTuning().v2Grudge) return;
  const th = grudgeThreshold(b.enemyId);
  if (b.turn > th) {
    b.v2GrudgeBonus = (b.v2GrudgeBonus ?? 0) + 1;
    b.log.push(`鏖战：双方伤害 +${b.v2GrudgeBonus}`);
  }
}

export function applyPendingQi(b: Battle): void {
  if (!isLabV2() || !(b.v2PendingQi ?? 0)) return;
  addQi(b, b.v2PendingQi!);
  b.v2PendingQi = 0;
}

export function v2ResourceCheck(b: Battle, comboCost: number, flowCost: number, setupCost: number): boolean {
  if (!isLabV2()) return true;
  const q = b.qi ?? 0;
  if (comboCost > 0 && q < comboCost) return false;
  if (flowCost > 0 && q < flowCost) return false;
  if (setupCost > 0 && q < setupCost) return false;
  return true;
}

export function v2SpendResource(b: Battle, comboCost: number, flowCost: number, setupCost: number): void {
  if (!isLabV2()) return;
  const spend = comboCost + flowCost + setupCost;
  if (spend > 0) b.qi = Math.max(0, (b.qi ?? 0) - spend);
}

export function v2LinkedAttack(b: Battle): boolean {
  if (!isLabV2()) return b.combo > 0;
  return (b.qi ?? 0) > 0;
}

export function variantBreakCount(b: Battle, kind: string): number {
  return b.v2BreakByKind?.[kind] ?? 0;
}

export function shouldUseVariantPattern(b: Battle): boolean {
  if (!isLabV2() || !getLabTuning().v2VariantAi) return false;
  const isBoss = b.enemyId === "lord" || b.enemyId === "usurper" || b.enemyId === "twin";
  const total = Object.values(b.v2BreakByKind ?? {}).reduce<number>((s, n) => s + (n ?? 0), 0);
  if (isBoss && total >= BOSS_VARIANT_BREAK_THRESHOLD && (b.v2VariantStage ?? 0) < 1) return true;
  return false;
}

export function pickVariantIntent(b: Battle, fallback: Intent): Intent {
  const def = ENEMIES[b.enemyId];
  const alt = def.patternSets?.[1];
  if (alt?.length) {
    b.v2VariantStage = (b.v2VariantStage ?? 0) + 1;
    b.v2VariantTriggers = (b.v2VariantTriggers ?? 0) + 1;
    b.intentIndex = b.intentIndex % alt.length;
    b.log.push(`${b.enemy.name}变招！`);
    return alt[b.intentIndex]!;
  }
  const kinds = def.pattern.map((p) => p.kind);
  const broken = Object.entries(b.v2BreakByKind ?? {})
    .filter(([, n]) => (n ?? 0) >= VARIANT_BREAK_THRESHOLD)
    .map(([k]) => k);
  const pick = kinds.find((k) => !broken.includes(k));
  if (pick) {
    const found = def.pattern.find((p) => p.kind === pick);
    if (found) return found;
  }
  return fallback;
}

export function dangerCellsAll(b: Battle, dangerFor: (b: Battle, intent: Intent) => number[]): number[] {
  const queue = b.intents.length ? b.intents : [b.intent];
  const set = new Set<number>();
  for (const intent of queue) {
    for (const c of dangerFor(b, intent)) set.add(c);
  }
  return [...set];
}
