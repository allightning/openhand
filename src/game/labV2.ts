import { ENEMIES } from "./content";
import { isLabV2, getLabTuning } from "./labTuning";
import {
  BOSS_VARIANT_BREAK_THRESHOLD,
  BREAK_COUNTER_BASE,
  BREAK_COUNTER_CHAIN,
  BREAK_MOMENTUM_CAP,
  GRUDGE_BOSS,
  GRUDGE_ELITE,
  GRUDGE_NORMAL,
  LAB_ENTRANCE_BONUS,
  QI_BURST_DMG,
  QI_MAX,
  VARIANT_BREAK_THRESHOLD,
} from "./labV2Constants";
import { evalWeakness, planBreaks, weaknessForIntent, MOVE_CARD_IDS, CHASE_CARD_IDS, PLANT_STAKE_CARD_IDS, ANTI_GUARD_CARD_IDS } from "./intentWeakness";
import { applyBreakLoot, type BreakLoot } from "./breakLootBus";
import { refreshBreakPromised } from "./labV21";
import { tryAppendStressIntent } from "./labEnemyStress";
import { battleEquippedSchool, battleMateGearId } from "./equippedWeapon";
import { gearById } from "./weapons";
import type { Battle, CardId, Intent, TechniqueId, V2TurnFlags, WeaponId } from "./types";
import { isBreakAlign } from "../combatLab/labRuleset";

function hasTech(b: Battle, id: TechniqueId): boolean {
  return b.techniques.includes(id);
}

export type LabFxKind =
  | "break"
  | "wall"
  | "kill"
  | "resonance"
  | "burst"
  | "swap"
  | "counter"
  | "eye"
  | "graze"
  | "miss"
  | "hit"
  | "skip"
  | "cardHit"
  | "cardWard"
  | "cardHeal"
  | "cardStep"
  | "cardKnock"
  | "cardStatus";

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
    chaseCardPlayed: false,
    hitStakeThisTurn: false,
    turnStartHand: b.hand?.length ?? 0,
    discardsUsed: 0,
    cyclesUsed: 0,
  };
}

export function initV2Battle(b: Battle): void {
  b.qi = b.qi ?? 0;
  b.v2Turn = emptyV2Turn(b);
  if (isBreakAlign() && hasTech(b, "nightStep")) {
    b.v2Turn.moveCharges = (b.v2Turn.moveCharges ?? 0) + 1;
  }
  b.v2BrokenSegments = [];
  b.v2BreakPreview = [];
  b.v2BreakByKind = {};
  b.v2VariantStage = 0;
  b.v2GrudgeBonus = 0;
  b.v2PendingQi = 0;
  b.v2FxQueue = [];
  b.labEntranceActive = false;
  b.labEntranceUsed = false;
  if (isBreakAlign() && b.active === "wenrensheng") {
    b.v2SwordChain = Math.max(b.v2SwordChain ?? 0, 1);
  }
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
  if (isAttack && (b.labChaseMeleeBonus ?? 0) > 0) {
    const dist = Math.abs(b.player.pos - b.enemy.pos);
    if (dist <= 1) {
      dmg += b.labChaseMeleeBonus!;
      b.labChaseMeleeBonus = 0;
    }
  }
  if (isBreakAlign() && isAttack && battleEquippedSchool(b, b.active) === "sword") {
    const n = b.v2SwordChain ?? 0;
    if (n > 0) {
      dmg += 2 * n;
      b.v2SwordChain = Math.floor(n / 2);
    }
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
  if (CHASE_CARD_IDS.includes(defId)) f.chaseCardPlayed = true;
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
  if (!isLabV2() || !isBreakAlign()) {
    b.v2GrazePreview = [];
    return [];
  }
  const queue = b.intents.length ? b.intents : [b.intent];
  const plan = planBreaks(b, queue, "preview");
  b.v2GrazePreview = [...plan.entries()].filter(([, t]) => t === "graze").map(([i]) => i);
  return [...plan.entries()].filter(([, t]) => t === "hard").map(([i]) => i);
}

/** §31.8 v3 软拆「让」：段仍结算但效果减半，不得势、不算破招、不能破眼。 */
export function applyGraze(b: Battle, intent: Intent, index: number): void {
  if (!isLabV2() || !isBreakAlign()) return;
  b.v2GrazedSegments = [...(b.v2GrazedSegments ?? []), index];
  pushFx(b, "graze");
  b.log.push(`【让招】${intent.kind} 被让开一半`);
  b.journal.push({ side: "you", text: "让！" });
  if (hasTech(b, "rebound")) {
    counterHitFoe(b, 2, "【回桩·让】反震 2");
  }
}

export function shouldBreakIntent(b: Battle, intent: Intent, _index: number, resolveCtx?: { bleedcutRaw?: number; bleedcutBlocked?: number }): boolean {
  if (!isLabV2() || !isBreakAlign()) return false;
  const flags = b.v2Turn ?? emptyV2Turn(b);
  return evalWeakness(intent, b, flags, "resolve", resolveCtx);
}

/** §31.13 反拆真伤 = 底数 + 场上角色兵器品阶（精3/玄4/神5 → 5/6/7）。 */
export function breakCounterDamage(b: Battle): number {
  const grade = gearById(battleMateGearId(b, b.active))?.grade ?? 3;
  return BREAK_COUNTER_BASE + grade;
}

/** 硬拆成功：叠一层拆势（不扣血）。连环/破招针加在真伤池里。 */
export function grantBreakMomentum(b: Battle, extraTrue = 0): void {
  if (!isLabV2() || !isBreakAlign()) return;
  const add = breakCounterDamage(b) + extraTrue;
  const stacks = b.v2BreakMomentum ?? 0;
  if (stacks < BREAK_MOMENTUM_CAP) b.v2BreakMomentum = stacks + 1;
  b.v2BreakMomentumTrue = (b.v2BreakMomentumTrue ?? 0) + add;
  b.log.push(`【拆势】+1（下一次攻击带真伤 ${add}）`);
  b.journal.push({ side: "you", text: `拆势 ${b.v2BreakMomentum ?? 0} 层` });
}

/** 破眼等：只加真伤池，不加层。 */
export function addBreakMomentumTrue(b: Battle, n: number, why: string): void {
  if (!isLabV2() || !isBreakAlign() || n <= 0) return;
  b.v2BreakMomentumTrue = (b.v2BreakMomentumTrue ?? 0) + n;
  b.log.push(`${why}：拆势加力 ${n}`);
}

export function breakMomentumRiderLabel(school: WeaponId): string {
  if (school === "saber") return "裂创";
  if (school === "palm") return "击退";
  if (school === "sword") return "破绽";
  if (school === "spear") return "远打";
  if (school === "staff") return "眩晕";
  return "缴械";
}

/** 打出攻击牌时吃 1 层拆势。knock>0 时由 sim 做击退。 */
export function applyBreakMomentumOnAttack(b: Battle): { notes: string[]; knock: number } {
  const stacks = b.v2BreakMomentum ?? 0;
  if (!isLabV2() || !isBreakAlign() || stacks <= 0) return { notes: [], knock: 0 };
  const pool = b.v2BreakMomentumTrue ?? 0;
  let take = Math.ceil(pool / stacks);
  b.v2BreakMomentum = stacks - 1;
  b.v2BreakMomentumTrue = Math.max(0, pool - take);
  if ((b.v2BreakMomentum ?? 0) <= 0) b.v2BreakMomentumTrue = 0;
  const school = battleEquippedSchool(b, b.active);
  const dist = Math.abs(b.player.pos - b.enemy.pos);
  const bits: string[] = [];
  let knock = 0;
  if (school === "saber") {
    if (dist <= 1) {
      take += 2;
      b.bleed = Math.min(isBreakAlign() ? 4 : 9, (b.bleed ?? 0) + 1);
      bits.push(`裂创 ${b.bleed}`);
    }
  } else if (school === "palm") {
    knock = 1;
    bits.push("击退");
  } else if (school === "sword") {
    b.expose += 1;
    bits.push("破绽 +1");
  } else if (school === "spear") {
    if (dist >= 2) {
      take += 3;
      bits.push("远打");
    }
  } else if (school === "staff") {
    b.foeStun = (b.foeStun ?? 0) + 1;
    bits.push("眩晕");
  } else if (school === "hook") {
    b.foeDisarm = (b.foeDisarm ?? 0) + 1;
    bits.push("缴械");
  }
  counterHitFoe(b, take, `【拆势打出】真伤 ${take}${bits.length ? ` · ${bits.join(" · ")}` : ""}`);
  return { notes: [`拆势打出 · 真伤 ${take}${bits.length ? ` · ${bits.join(" · ")}` : ""}`], knock };
}

/** §31.13 真伤出口：打前排敌（拆势打出 / 让震）。
 * 击杀只扣血，不在这里判胜——交给 sim.checkWin / tryGauntletWaveSpawn，
 * 否则会先 phase=won 再轮番上场，留下「有敌人但不能操作」软锁。 */
export function counterHitFoe(b: Battle, n: number, label: string): void {
  if (!isLabV2() || n <= 0) return;
  const foe = b.enemy;
  if (!foe || foe.hp <= 0) return;
  foe.hp -= n;
  // 真伤必须可见：写入状态栏字段，避免只出现在日志里
  b.v2LastTrueDamage = n;
  b.v2LastTrueDamageSrc = /拆势/.test(label) ? "拆势" : /拆眼/.test(label) ? "拆眼" : /让/.test(label) ? "让震" : "反拆";
  pushFx(b, "counter");
  b.log.push(label);
  b.journal.push({ side: "you", text: `${b.v2LastTrueDamageSrc}真伤 ${n}（无视格挡）` });
  b.lastHitRead = [b.lastHitRead, `${b.v2LastTrueDamageSrc}真伤${n}`].filter(Boolean).join(" · ");
  if (foe.hp > 0) return;
  const live = (b.foes ?? [b.enemy]).filter((f) => f.hp > 0);
  if (live[0]) b.enemy = live[0];
}

/**
 * §31.15 拆招战利品：硬拆在反打真伤之外，按「破法路径」再给一个方向的资源——
 * 拆招不只喂伤害：走位喂生存、反架喂运转、硬吃喂续航、桩拆喂劲力。
 */
export function breakLootFor(intent: Intent): BreakLoot | null {
  const w = weaknessForIntent(intent).kind;
  if (w === "chaseClosed") return { kind: "block", n: 2, label: "追上", meleeBonus: 2 };
  if (w === "moveCardPlayed" || w === "endDistGt1" || w === "endNotAdjacent") return { kind: "block", n: 2, label: "让中带架" };
  if (w === "antiGuardPlayed") return { kind: "expose", n: 1, label: "看穿套路" };
  if (w === "bleedcutFullyBlocked") return { kind: "heal", n: 2, label: "铁扛回气" };
  if (w === "plantStakePlayed" || w === "stakeOnBoard") return { kind: "energy", n: 1, label: "借势回劲" };
  if (w === "adjacentAttackHit" || w === "hitFoeThisTurn") return { kind: "block", n: 1, label: "跟上" };
  return null;
}

export function applyBreak(b: Battle, intent: Intent, index: number): void {
  if (!isLabV2() || !isBreakAlign()) return;
  b.v2BrokenSegments = [...(b.v2BrokenSegments ?? []), index];
  const kind = intent.kind;
  b.v2BreakByKind = { ...(b.v2BreakByKind ?? {}), [kind]: (b.v2BreakByKind?.[kind] ?? 0) + 1 };
  addQi(b, 1);
  if (b.labComboPillActive) addQi(b, 1);
  pushFx(b, "break");
  b.log.push(intent.kind === "retreat" ? "【破招】追上" : `【破招】${kind} 被破`);
  b.journal.push({ side: "you", text: intent.kind === "retreat" ? "追！" : "破！" });
  // §31.13 以拆为杀：硬拆 = 拆势（下一击兑现）；一回合第 2 段起连环拆（真伤池 +2 +1 势）
  b.v2TurnBreakCount = (b.v2TurnBreakCount ?? 0) + 1;
  const chain = b.v2TurnBreakCount >= 2;
  let extra = chain ? BREAK_COUNTER_CHAIN : 0;
  if ((b.labNextBreakBonus ?? 0) > 0) {
    extra += b.labNextBreakBonus!;
    b.labNextBreakBonus = 0;
    b.log.push("破招针：拆势加力");
  }
  if (hasTech(b, "saberGrudge") && b.foeHitLastTurn) {
    extra += 2;
  }
  if (chain) addQi(b, 1);
  grantBreakMomentum(b, extra);
  if (battleEquippedSchool(b, b.active) === "spear") {
    const dist = Math.abs(b.player.pos - b.enemy.pos);
    if (dist > 1) {
      b.v2SpearRuler = Math.min(6, (b.v2SpearRuler ?? 0) + 2);
      b.log.push("标尺 +2（硬拆离格）");
    }
  }
  if (battleEquippedSchool(b, b.active) === "sword") {
    b.v2SwordChain = Math.min(8, (b.v2SwordChain ?? 0) + 1);
  }
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
