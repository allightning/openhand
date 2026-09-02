import { CARDS, intentShortName } from "./content";
import { isLabV2, getLabTuning } from "./labTuning";
import { VARIANT_BREAK_THRESHOLD } from "./labV2Constants";
import { initLabV21Battle, refreshBreakPromised } from "./labV21";
import { planBreaks, queuedThreatCells } from "./intentWeakness";
import { isBreakAlign } from "../combatLab/labRuleset";
import {
  addQi,
  applyBreak,
  applyGraze,
  applyPendingQi,
  addBreakMomentumTrue,
  clearQi,
  commitV2EndTurn,
  emptyV2Turn,
  initV2Battle,
  onV2AttackPlayed,
  onV2CardPlayed,
  pickVariantIntent,
  pushFx,
  shouldUseVariantPattern,
  tickGrudge,
  v2IncomingBonus,
  v2LinkedAttack,
  v2ResourceCheck,
  v2SpendResource,
  v2StrikeBonus,
} from "./labV2";
import { EYE_COUNTER_DMG, OFFBALANCE_MULT, QI_BURST_DMG } from "./labV2Constants";
import { dismissAssistAtTurnStart, syncDoubleHitTelemetry } from "./labAssist";
import { tryAppendStressIntent, intentEnergyCost } from "./labEnemyStress";
import type { Battle, CardId, Intent } from "./types";

export function simV2Init(b: Battle): void {
  if (isLabV2()) {
    initV2Battle(b);
    initLabV21Battle(b);
  }
}

export function simV2StartPlayerTurn(b: Battle): void {
  if (!isLabV2()) return;
  dismissAssistAtTurnStart(b);
  applyPendingQi(b);
  b.v2Turn = emptyV2Turn(b);
  b.v2BrokenSegments = [];
  b.v2BreakPreview = [];
  b.v2GrazedSegments = [];
  b.v2GrazePreview = [];
  if ((b.v2OffBalance ?? 0) > 0) b.v2OffBalance = (b.v2OffBalance ?? 0) - 1;
  b.labEntranceUsed = false;
  b.labItemUsedThisTurn = false;
  b.labUnlockUltimate = false;
  b.labComboPillActive = false;
  b.labAssistCalledThisTurn = false;
  b.labComboCardPlayedThisTurn = false;
  b.v2AuraQiBonusUsed = false;
  b.v2BrokeLastFoeTurn = (b.v2TurnBreakCount ?? 0) > 0;
  b.v2TurnBreakCount = 0;
  refreshBreakPromised(b);
}

export function simV2BeforeEndTurn(b: Battle): void {
  if (!isLabV2()) return;
  commitV2EndTurn(b);
}

export function simV2AfterEndTurnSetup(b: Battle): void {
  if (!isLabV2()) return;
  tickGrudge(b);
}

export function simV2StrikeDamage(b: Battle, base: number): number {
  if (!isLabV2()) return base;
  let dmg = base + b.nextDamage + b.mark;
  if (b.expose > 0) {
    dmg += 4;
    b.expose -= 1;
  }
  if (b.youSway > 0) dmg = Math.max(1, dmg - 2);
  // §31.13 v4 失衡：招眼被破后的处决窗（×1.5 → ×2）
  if ((b.v2OffBalance ?? 0) > 0) dmg = Math.ceil(dmg * OFFBALANCE_MULT);
  return dmg;
}

export function simV2CanPlayResources(
  b: Battle,
  comboCost: number,
  flowCost: number,
  setupCost: number,
): boolean {
  if (!isLabV2()) return true;
  return v2ResourceCheck(b, comboCost, flowCost, setupCost);
}

export function simV2SpendResources(b: Battle, comboCost: number, flowCost: number, setupCost: number): void {
  if (!isLabV2()) return;
  v2SpendResource(b, comboCost, flowCost, setupCost);
}

export function simV2OnCard(b: Battle, defId: CardId, notes: string[], hitEnemy: boolean): void {
  if (!isLabV2()) return;
  const def = CARDS[defId];
  const moved = notes.some((n) => n.includes("步") || n.includes("换位") || n.includes("推") || n.includes("拉"));
  const adj = Math.abs(b.player.pos - b.enemy.pos) === 1;
  onV2CardPlayed(b, defId, moved, hitEnemy, hitEnemy && adj);
  if (def.type === "attack") onV2AttackPlayed(b);
}

export function simV2OnHitEnemy(b: Battle, raw: number, dealt: number): void {
  if (!isLabV2() || raw <= 0 || dealt <= 0) return;
  // §31.13 以拆为杀：命中不再白给势——势只从「读懂对面」来（拆招/破眼/蓄劲/连珠丸）。
  if (b.labComboPillActive) addQi(b, 1);
  b.v2QiPeak = Math.max(b.v2QiPeak ?? 0, b.qi ?? 0);
}

export function simV2OnHitPlayer(b: Battle, hpDamage: number): void {
  /** §2.2 v2.3：仅「穿盾」实际气血受损清零势；格挡完全吸收则保留。 */
  if (!isLabV2() || hpDamage <= 0) return;
  b.v2TurnDamageSum = (b.v2TurnDamageSum ?? 0) + hpDamage;
  b.v2TurnDamageSamples = (b.v2TurnDamageSamples ?? 0) + 1;
  // §31.11 刀系埋招前置：记下「敌上回合真的打到你了」
  b.foeHitLastTurn = true;
  clearQi(b);
  b.v2QiClearCount = (b.v2QiClearCount ?? 0) + 1;
}

export function simV2Incoming(raw: number, b: Battle): number {
  return isLabV2() ? v2IncomingBonus(raw, b) : raw;
}

export function simV2ApplyComboCard(b: Battle, defId: CardId, stackTaxHp?: number): string[] {
  const notes: string[] = [];
  if ((stackTaxHp ?? 0) > 0) {
    b.player.hp = Math.max(1, b.player.hp - (stackTaxHp ?? 0));
    notes.push(`付血 ${stackTaxHp}`);
  }
  addQi(b, defId === "combo" || defId === "chain" ? 2 : 1, (t) => notes.push(t));
  return notes;
}

export function simV2ApplyGather(b: Battle, n: number): string[] {
  addQi(b, n);
  return [`势 ${b.qi}`];
}

export function simV2ApplySetup(b: Battle, n: number): string[] {
  b.v2PendingQi = (b.v2PendingQi ?? 0) + n;
  return [`下回势 +${n}`];
}

export function simV2ApplyFinisher(b: Battle, _defId: string, baseDmg: number): { base: number; notes: string[] } {
  const q = b.qi ?? 0;
  const per = QI_BURST_DMG;
  const base = baseDmg + q * per;
  const notes = [`势爆 ${q}→+${q * per}`];
  if (q >= 3) tryAppendStressIntent(b, "burst");
  if (q >= 4) pushFx(b, "burst");
  b.qi = 0;
  return { base, notes };
}

export function simV2Linked(): boolean {
  return isLabV2();
}

export function simV2IsLinked(b: Battle): boolean {
  return isLabV2() ? v2LinkedAttack(b) : b.combo > 0;
}

export function simV2EntranceBonus(b: Battle, base: number, isAttack: boolean): number {
  return isLabV2() ? v2StrikeBonus(b, base, isAttack) : base;
}

export function simV2ResolveIntentQueue(b: Battle, resolveOne: (intent: Intent, index: number) => void): void {
  b.labFoeTurnPlayerHit = false;
  b.labFoeTurnAssistHit = false;
  const queue = b.intents.length ? [...b.intents] : [b.intent];
  const projected = queuedThreatCells(b, queue);
  const breakMode = isBreakAlign();
  // §31.8 v3：破招计划一次算清（预览=结算），硬拆耗充能、软拆半效。经典只算打/空/跳过。
  const plan = breakMode ? planBreaks(b, queue, "resolve") : new Map<number, "hard" | "graze">();
  const eyeIdx = breakMode ? (b.v2EyeIdx ?? -1) : -1;
  let collapsed = false;
  const recap: { ord: number; name: string; outcome: string }[] = [];
  for (let i = 0; i < queue.length; i++) {
    if (b.phase !== "player") break;
    const intent = queue[i]!;
    b.v2ResolveIntentIdx = i;
    b.intent = intent;
    const name = intentShortName(intent);
    if (collapsed) {
      b.log.push(`【套路散】${intent.kind} 跟着招眼一起散了`);
      b.journal.push({ side: "you", text: "散！" });
      recap.push({ ord: i + 1, name, outcome: "散" });
      continue;
    }
    // §31.11 眩晕：跳过攻击段（棍连击/拳震壁/助战施加）。多敌人时眩晕只影响主敌队列。
    if ((b.foeStun ?? 0) > 0 && "damage" in intent && (intent.damage ?? 0) > 0) {
      b.foeStun = (b.foeStun ?? 0) - 1;
      b.log.push(`【眩晕】${intent.kind} 段被打懵，没出出来`);
      b.journal.push({ side: "you", text: "他晕了——这段空了" });
      recap.push({ ord: i + 1, name, outcome: "晕" });
      continue;
    }
    if (b.enemyEnergy < intentEnergyCost(intent)) {
      pushFx(b, "skip");
      b.log.push(`【劲尽】${intent.kind} 没劲，跳过`);
      b.journal.push({ side: "you", text: "劲尽" });
      recap.push({ ord: i + 1, name, outcome: "劲尽" });
      continue;
    }
    if (breakMode && intent.kind === "bleedcut") {
      // bleedcut 逐段动态判定（格挡在结算中消耗），不走计划器
      const raw = intent.damage ?? 0;
      const blocked = Math.min(b.playerBlock, raw);
      if (raw > 0 && blocked >= raw) {
        applyBreak(b, intent, i);
        b.v2BreakCount = (b.v2BreakCount ?? 0) + 1;
        recap.push({ ord: i + 1, name, outcome: "破" });
        if (i === eyeIdx && eyeIdx >= 0) collapsed = applyEyeCollapse(b);
      } else {
        resolveOne(intent, i);
        recap.push({ ord: i + 1, name, outcome: "打" });
        pushFx(b, "hit");
      }
      continue;
    }
    const tier = plan.get(i);
    if (breakMode && intent.kind === "retreat") {
      if (tier === "hard") {
        applyBreak(b, intent, i);
        b.v2BreakCount = (b.v2BreakCount ?? 0) + 1;
        resolveOne(intent, i);
        recap.push({ ord: i + 1, name, outcome: "追" });
        if (i === eyeIdx && eyeIdx >= 0) collapsed = applyEyeCollapse(b);
        continue;
      }
      if (tier === "graze") {
        applyGraze(b, intent, i);
        resolveOne(intent, i);
        recap.push({ ord: i + 1, name, outcome: "让" });
        continue;
      }
      resolveOne(intent, i);
      recap.push({ ord: i + 1, name, outcome: "放" });
      continue;
    }
    if (breakMode && tier === "hard") {
      applyBreak(b, intent, i);
      b.v2BreakCount = (b.v2BreakCount ?? 0) + 1;
      recap.push({ ord: i + 1, name, outcome: "破" });
      if (i === eyeIdx && eyeIdx >= 0) collapsed = applyEyeCollapse(b);
      continue;
    }
    if (breakMode && tier === "graze") {
      applyGraze(b, intent, i);
      const halved = { ...intent } as Intent;
      if ("damage" in halved && halved.damage !== undefined) halved.damage = Math.floor(halved.damage / 2);
      if ("block" in halved && halved.block !== undefined) halved.block = Math.floor(halved.block / 2);
      resolveOne(halved, i);
      recap.push({ ord: i + 1, name, outcome: "让" });
      continue;
    }
    resolveOne(intent, i);
    const dmg = "damage" in intent ? (intent.damage ?? 0) : 0;
    const startPos = b.v2Turn?.turnStartPos ?? b.player.pos;
    const cells = projected[i] ?? [];
    const outcome =
      intent.kind === "guard"
        ? "架"
        : dmg > 0
          ? cells.includes(startPos)
            ? "打"
            : "空"
          : "出";
    if (outcome === "打") pushFx(b, "hit");
    if (outcome === "空") pushFx(b, "miss");
    recap.push({ ord: i + 1, name, outcome });
  }
  b.v2LastIntentRecap = recap;
  syncDoubleHitTelemetry(b);
}

/** 招眼被硬拆：套路全崩 + 失衡一个行动窗（承伤 ×2）+ 额外 2 势 + 拆眼重创真伤。 */
function applyEyeCollapse(b: Battle): boolean {
  b.v2OffBalance = 2;
  b.v2EyeCount = (b.v2EyeCount ?? 0) + 1;
  addQi(b, 2);
  pushFx(b, "eye");
  b.log.push("【破眼】招眼被拆，套路散了——他失衡了（承伤 ×2）");
  b.journal.push({ side: "you", text: "破眼！" });
  addBreakMomentumTrue(b, EYE_COUNTER_DMG, "【破眼】");
  return true;
}

export function simV2ChooseIntent(b: Battle, picked: Intent): Intent {
  if (!isLabV2() || !getLabTuning().v2VariantAi) return picked;
  if (shouldUseVariantPattern(b)) return pickVariantIntent(b, picked);
  const broken = Object.entries(b.v2BreakByKind ?? {})
    .filter(([, n]) => (n ?? 0) >= VARIANT_BREAK_THRESHOLD)
    .map(([k]) => k);
  if (broken.includes(picked.kind)) return pickVariantIntent(b, picked);
  return picked;
}

export function simV2StatusQi(b: Battle): { show: boolean; value: number } {
  return { show: isLabV2(), value: b.qi ?? 0 };
}
