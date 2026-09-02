import { CARDS, ENEMIES, ENEMY_WEAPON, STARTER, enemyEnergyMax, enemyPace, isSparEnemy } from "./content";
import { labCard, labEnemy } from "./labContent";
import { sumMindArtBonuses } from "./mindArts";
import { MATE_PASSIVE, MATES, SCHOOL_REACH, WEAPON_NAME, WEAPON_PACE, cardSchool, deckFor, isLead } from "./party";
import { battleEquippedSchool, battleMateGearId } from "./equippedWeapon";
import {
  assistAttackBonus,
  assistOccupies,
  hitAssist,
  isComboRulesEnabled,
} from "./labAssist";
import {
  comboCardNotes,
  comboCardDamage,
  comboCardPull,
  comboPlayGate,
  isComboCard,
  markComboCardPlayed,
} from "./labCombo";
import { resonancePaceBonus, staffBlockRetain } from "./labResonance";
import { tickSignatureCooldown } from "./labSignature";
import { makeRun } from "./run";
import { isLabMode, isLabV2, labAiAllowsReaction, labPaceBias, resolveFightScale, getLabTuning } from "./labTuning";
import {
  drainPendingStress,
  enemyRoundBudgetCap,
  intentEnergyCost,
  intentFirePlan,
  isAttackIntent,
  isBossEnemy,
  isEliteEnemy,
  isHeavyIntent,
  stressMetaAt,
  stressTargetsAssist,
} from "./labEnemyStress";
import { chooseFromKit, followFromKit, profileFor, type KitCtx } from "./enemyKit";
import { SIGNATURE_BREAK, type EnemySigId } from "./enemySignatures";
import { enemyNickTax, enemyStrikeAtDist } from "./enemyGear";
import {
  simV2AfterEndTurnSetup,
  simV2BeforeEndTurn,
  simV2CanPlayResources,
  simV2ChooseIntent,
  simV2Init,
  simV2OnCard,
  simV2OnHitEnemy,
  simV2OnHitPlayer,
  simV2Incoming,
  simV2ApplyComboCard,
  simV2ApplyFinisher,
  simV2ApplyGather,
  simV2ApplySetup,
  simV2IsLinked,
  simV2ResolveIntentQueue,
  simV2SpendResources,
  simV2StartPlayerTurn,
  simV2StatusQi,
  simV2StrikeDamage,
} from "./simV2Hooks";
import { emptyV2Turn, pushFx, addQi, v2StrikeBonus, breakCounterDamage, grantBreakMomentum, applyBreakMomentumOnAttack } from "./labV2";
import { registerBreakLootApplier } from "./breakLootBus";
import { BREAK_COUNTER_CHAIN } from "./labV2Constants";
import { MOVE_CARD_IDS, planEyeIdx, registerThreatProvider, registerQueueThreatProvider } from "./intentWeakness";
import { SUMMON_DEFS } from "./labSummon";
import { addStake, adjacentStakePos, enemyPlantHits, playerPlantHits, removeStake, smashHitsForSchool, smashStake, stakeHitsAt } from "./stake";
import { isBreakAlign } from "../combatLab/labRuleset";
import {
  bleedTickDamage,
  clampHandCap,
  handRefillAmount,
  spearReachDamage,
  saberReachDamage,
  HAND_CAP_DEFAULT,
} from "../combatLab/rogueRoster";

const SPEAR_RULER_CAP = 6;

function spearRulerGain(dist: number): number {
  if (dist === 2) return 1;
  if (dist === 3) return 2;
  if (dist >= 4) return 3;
  return 0;
}

function pushCardPlayFx(b: Battle, def: CardDef): void {
  if (!isLabV2()) return;
  if ((def.damage ?? 0) > 0 || (def.nearBonus ?? 0) > 0 || (def.farBonus ?? 0) > 0) {
    pushFx(b, "cardHit");
    return;
  }
  if ((def.block ?? 0) > 0) {
    pushFx(b, "cardWard");
    return;
  }
  if ((def.heal ?? 0) > 0 || (def.regen ?? 0) > 0) {
    pushFx(b, "cardHeal");
    return;
  }
  if (def.steps) {
    pushFx(b, "cardStep");
    return;
  }
  if ((def.knock ?? 0) > 0 || (def.pullEnemy ?? 0) > 0) {
    pushFx(b, "cardKnock");
    return;
  }
  if (
    (def.bleed ?? 0) > 0 ||
    (def.expose ?? 0) > 0 ||
    (def.frail ?? 0) > 0 ||
    (def.foeStun ?? 0) > 0 ||
    (def.foeDisarm ?? 0) > 0 ||
    (def.mute ?? 0) > 0 ||
    (def.foeMute ?? 0) > 0
  ) {
    pushFx(b, "cardStatus");
  }
}

function addSpearRuler(b: Battle, n: number): void {
  if (n <= 0) return;
  b.v2SpearRuler = Math.min(SPEAR_RULER_CAP, (b.v2SpearRuler ?? 0) + n);
}

function spearBreakAttackBase(b: Battle, def: CardDef): number | null {
  if (!(isLabMode() && isBreakAlign())) return null;
  if (def.id !== "thrust" && def.id !== "spearLock") return null;
  const foe = targetFoe(b);
  const dist = foe ? Math.abs(b.player.pos - foe.pos) : 0;
  return spearReachDamage(dist);
}

function saberBreakAttackBase(b: Battle, def: CardDef): number | null {
  if (!(isLabMode() && isBreakAlign())) return null;
  if (def.type !== "attack") return null;
  return saberReachDamage(def.id, distTo(b));
}

// §31.9 破招计划器需要红格数据（sim 内部函数），注册注入避免循环依赖。
registerThreatProvider((b, intent) => dangerCellsForIntent(b, intent));
// §31.15 队列级投影提供者：破招判定的「开局面在不在圈里」也必须按逐段投影算。
registerQueueThreatProvider((b) => projectedQueueThreat(b));
// §31.15 拆招战利品落账（抽牌/劲力/回血在 sim，注入给 labV2.applyBreak 调用）。
registerBreakLootApplier((b, loot) => {
  if (loot.kind === "block") {
    b.playerBlock += loot.n;
    b.log.push(`【拆招·${loot.label}】格挡 +${loot.n}`);
  } else if (loot.kind === "expose") {
    b.expose += loot.n;
    b.log.push(`【拆招·${loot.label}】破绽 +${loot.n}（你的攻击更疼了）`);
  } else if (loot.kind === "heal") {
    const before = b.player.hp;
    b.player.hp = Math.min(b.player.maxHp, b.player.hp + loot.n);
    b.log.push(`【拆招·${loot.label}】气血 +${b.player.hp - before}`);
  } else if (loot.kind === "draw") {
    let n = 0;
    for (let i = 0; i < loot.n; i++) {
      if (drawOne(b)) n += 1;
    }
    if (loot.meleeBonus) b.labChaseMeleeBonus = (b.labChaseMeleeBonus ?? 0) + loot.meleeBonus;
    b.log.push(`【拆招·${loot.label}】抽 ${n}${loot.meleeBonus ? ` · 下刀贴身 +${loot.meleeBonus}` : ""}`);
  } else {
    const before = b.energy;
    b.energy = Math.min(b.energyMax, b.energy + loot.n);
    b.log.push(`【拆招·${loot.label}】劲力 +${b.energy - before}`);
  }
});
import {
  labV21AfterCard,
  labV21BlockAdjust,
  labV21EffectiveCost,
  labV21StrikeAdjust,
  ultimateGate,
} from "./labV21";
import {
  BOARD_SIZE,
  HAND_SIZE,
  WALL_DAMAGE,
  type Battle,
  type CardDef,
  type CardId,
  type CardInst,
  type CompanionId,
  type EnemyId,
  type FighterBag,
  type HeroId,
  type Intent,
  type Preview,
  type RiposteKind,
  type Run,
  type StatusChip,
  type TechniqueId,
  type Unit, WeaponId } from "./types";
import { gearById, pathSkillMods } from "./weapons";

let seq = 0;
let battleGearId: string | null = null;
/** Locked at makeBattle; Combat Lab may refresh via applyLabFightScale(). */
let fightScale = { hp: 1, dmg: 1, youDmg: 1 };

/** Combat Lab: apply slider changes without restarting the fight. */
export function applyLabFightScale(): void {
  fightScale = resolveFightScale();
}

export function syncBattleGear(b: Battle, mateId?: CompanionId): void {
  battleGearId = battleMateGearId(b, mateId ?? b.active);
}
/** Soft cap so AI turtle cannot freeze a fight behind endless 架势. */
const ENEMY_BLOCK_CAP = 20;

function uid(): string {
  seq += 1;
  return `c${seq}`;
}

function note(b: Battle, side: "you" | "foe", text: string): void {
  b.log.push(text);
  b.journal.push({ side, text });
}

function intentCost(intent: Intent): number {
  return intentEnergyCost(intent);
}

function card(defId: CardId): CardInst {
  return { uid: uid(), defId };
}

export function cloneBattle(b: Battle): Battle {
  const next = structuredClone(b);
  const match = next.foes?.find((f) => f.id === next.enemy.id) ?? next.foes?.[0];
  if (match) next.enemy = match;
  return next;
}

export function hasTech(b: Battle, id: TechniqueId): boolean {
  return b.techniques.includes(id);
}

function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function deal(deck: CardId[], ordered: boolean): { hand: CardInst[]; drawPile: CardInst[] } {
  const list = ordered ? [...deck] : shuffle(deck);
  const inst = list.map(card);
  return { hand: inst.slice(0, HAND_SIZE), drawPile: inst.slice(HAND_SIZE) };
}

function defaultRun(): Run {
  return makeRun("empty");
}

function foePack(id: EnemyId): Unit[] {
  const def = labEnemy(id);
  let hpMul = isLabMode() ? getLabTuning().enemyHpMul : 1;
  if (isLabMode() && isBossEnemy(id) && id === "lord") {
    hpMul *= 1.4;
  }
  const hp = Math.max(8, Math.round(def.hp * fightScale.hp * hpMul));
  const main: Unit = {
    id: def.id,
    name: def.name,
    title: def.title,
    hp,
    maxHp: hp,
    pos: def.pos,
  };
  if (id !== "twin") return [main];
  const twinHp = Math.max(8, Math.round(24 * fightScale.hp));
  return [
    { ...main, id: "twin", hp: twinHp, maxHp: twinHp, pos: 3 },
    { id: "shadow", name: "影", title: "镜中人", hp: twinHp, maxHp: twinHp, pos: 6 },
  ];
}

function parkFighter(b: Battle): FighterBag {
  return {
    id: b.active,
    hp: b.player.hp,
    maxHp: b.player.maxHp,
    hand: [...b.hand],
    drawPile: [...b.drawPile],
    discardPile: [...b.discardPile],
  };
}

function applyFighter(b: Battle, bag: FighterBag): void {
  const def = MATES[bag.id];
  b.active = bag.id;
  b.player = {
    ...b.player,
    id: "you",
    name: def.name,
    title: def.title,
    hp: bag.hp,
    maxHp: bag.maxHp,
  };
  b.hand = bag.hand;
  b.drawPile = bag.drawPile;
  b.discardPile = bag.discardPile;
}

export function makeBattle(
  enemyId: EnemyId,
  run: Run = defaultRun(),
  ordered = true,
  spar = false,
): Battle {
  seq = 0;
  fightScale = resolveFightScale();
  battleGearId = run.weapon ?? null;
  const def = labEnemy(enemyId);
  const active = run.active ?? "rail";
  const deck = deal(deckFor(run, active), ordered);
  const foes = foePack(enemyId);
  const mateHp = (id: CompanionId) =>
    isLead(run, id) ? run.hp : (run.companionHp[id] ?? MATES[id].hp);
  const mateMax = (id: CompanionId) => {
    const bonus = run.companionBonus?.[id]?.maxHp ?? 0;
    return (isLead(run, id) ? run.hpMax : MATES[id].hp) + bonus;
  };
  const bench: FighterBag[] = (run.party ?? ["rail"])
    .filter((id) => id !== active)
    .map((id) => {
      const packed = deal(deckFor(run, id), ordered);
      return {
        id,
        hp: mateHp(id),
        maxHp: mateMax(id),
        hand: packed.hand,
        drawPile: packed.drawPile,
        discardPile: [],
      };
    });
  const energyMax = enemyEnergyMax(enemyId);
  const gearQi = pathSkillMods(battleGearId).qiRegen ?? 0;
  const bonusQi = run.companionBonus?.[active]?.qiMax ?? 0;
  const battle: Battle = {
    player: {
      id: "you",
      name: MATES[active].name,
      title: MATES[active].title,
      hp: mateMax(active),
      maxHp: mateMax(active),
      pos: STARTER.playerPos,
    },
    enemy: foes[0],
    foes,
    enemyId,
      playerBlock: run.techniques.includes("nightStep") && !(isLabMode() && isBreakAlign()) ? 1 : 0,
      // §31.7 踢馆线劲力收敛：v1 的 10/8/4 在单人高压下等于"无限出牌"，拆招失去取舍。占位 6/5/3（甲方可调）。
      // §31.9 仙药加成：劲力上限随 playerEnergyBonus 抬高。
      ...(isLabMode() && getLabTuning().enemySegAll
        ? {
            energy: 5 + getLabTuning().playerEnergyBonus,
            energyMax: 6 + getLabTuning().playerEnergyBonus,
            energyRegen: 3 + gearQi,
          }
        : {
            energy: Math.min(STARTER.energy + bonusQi, (STARTER.energyStart ?? Math.min(5, STARTER.energy)) + bonusQi),
            energyMax: STARTER.energy + bonusQi,
            energyRegen: (STARTER.energyRegen ?? 3) + gearQi,
          }),
    nextDamage: 0,
    stakes: [],
    traps: [],
    techniques: [...run.techniques],
    hand: deck.hand,
    drawPile: deck.drawPile,
    discardPile: [],
    intent: def.pattern[0],
    intents: [def.pattern[0]],
    intentIndex: 0,
    enemyEnergy: Math.min(energyMax, Math.ceil(energyMax * 0.6)),
    enemyEnergyMax: energyMax,
    turn: 1,
    phase: "player",
    log: [def.pitch],
    journal: [{ side: "foe", text: def.pitch }],
    playedThisTurn: [],
    party: run.party ?? ["rail"],
    active,
    bench,
    swappedThisTurn: false,
    bleed: 0,
    thorns: 0,
    expose: 0,
    energyNext: 0,
    frail: 0,
    combo: 0,
    attacksThisTurn: 0,
    paceBoost:
      (run.companionBonus?.[active]?.pace ?? 0) + (run.flags.includes("heartAttack") ? 1 : 0) + labPaceBias(),
    foePace: enemyPace(enemyId),
    enemyBlock: 0,
    spar: false,
    flow: 0,
    setup: 0,
    echoNext: 0,
    retainTurns: 0,
    retainAmt: 0,
    mark: 0,
    lastPlay: null,
    youBleed: 0,
    youSeal: 0,
    youSlow: 0,
    youRiposte: null,
    foeRiposte: null,
    youRiposteTurns: 0,
    foeRiposteTurns: 0,
    foeDodge: 0,
    foeEndure: 0,
    pressedLast: 0,
    hero: (run.hero ?? "rail") as HeroId,
    movedFwd: false,
    movedBack: false,
    enteredMelee: false,
    youSway: 0,
    youGift: 0,
    youRegen: 0,
    youRegenTurns: 0,
    regenClock: 0,
    youMute: 0,
    foeMute: 0,
    youNoBag: 0,
    foeNoBag: 0,
    youHandTax: 0,
    foeHandTax: 0,
    youQiBurn: 0,
    foeQiBurn: 0,
    bagUsed: 0,
    orderedDeal: ordered,
  };
  setupBattle(battle);
  battle.spar = spar;
  simV2Init(battle);
  return battle;
}

export function makeTutorialBattle(): Battle {
  return makeBattle("catcher");
}

export function weaponPace(id: CompanionId): number {
  return WEAPON_PACE[MATES[id].weapon];
}

export function battlePace(b: Battle): number {
  const base = WEAPON_PACE[battleEquippedSchool(b, b.active)];
  return base + (isLabV2() ? resonancePaceBonus(b) : 0);
}

export function yourPace(b: Battle): number {
  return Math.max(1, battlePace(b) + b.paceBoost - b.youSlow);
}

export function seizeOpening(b: Battle): void {
  if (yourPace(b) >= b.foePace) return;
  note(b, "foe", `${b.enemy.name}手先到。`);
  resolveAllIntents(b);
  if (b.phase !== "player") return;
  rollIntent(b);
  note(b, "foe", `${b.enemy.name}亮招：${labelIntent(b.intent)}${b.intents.length > 1 ? `（后手 ${b.intents.length - 1}）` : ""}`);
}

function setupBattle(b: Battle): void {
  if (hasTech(b, "heelStake")) {
    const at = 1;
    if (!occupied(b, at)) addStake(b, at, 2);
  }
  hardenFoe(b);
  drawToHand(b);
  applyMateOpen(b);
  applyTechOpen(b);
  seedIntents(b);
  if (hasTech(b, "delayGuard") && b.intent.kind === "windup") {
    b.playerBlock += 3;
  }
  if (hasTech(b, "pikeBrace") && b.intent.kind === "windup") {
    b.playerBlock += 2;
  }
}

/** Tough outdoor / midboss hands: read the board, not just stack HP. */
function hardenFoe(b: Battle): void {
  const id = b.enemyId;
  const def = labEnemy(id);
  const block = (n: number) => Math.max(1, Math.round(n * fightScale.dmg));
  if (id === "bandit") {
    armRiposte(b, "foe", "slash");
    b.enemyBlock = block(12);
    b.foePace = Math.max(b.foePace, 8);
    b.intent = scaleIntent({ kind: "bleedcut", damage: 14, bleed: 3 });
    return;
  }
  if (def?.elite === "shatter") {
    b.enemyBlock = Math.max(b.enemyBlock, block(6));
    if (!b.foeRiposte) armRiposte(b, "foe", "bleed");
    return;
  }
  if (def?.elite === "stake" || def?.elite === "windup") {
    b.enemyBlock = Math.max(b.enemyBlock, block(8));
    if (!b.foeRiposte) armRiposte(b, "foe", weaponRiposte(id));
    return;
  }
  if (id === "brute" || id === "warden" || id === "raider" || id === "robber" || id === "thug" || id === "smuggler") {
    b.enemyBlock = Math.max(b.enemyBlock, block(6));
    if (!b.foeRiposte) armRiposte(b, "foe", weaponRiposte(id));
    return;
  }
  if (id === "escort" || id === "piler" || id === "delay" || id === "twin" || id === "lord" || id === "usurper" || id === "stakeboss" || id === "knotboss") {
    b.enemyBlock = Math.max(b.enemyBlock, block(8));
    if (!b.foeRiposte) armRiposte(b, "foe", weaponRiposte(id));
  }
  if (fightScale.dmg >= 1.4 && (id === "lord" || id === "usurper" || id === "twin")) {
    b.enemyBlock = Math.max(b.enemyBlock, block(14));
    b.foePace = Math.max(b.foePace, 9);
  }
}

function labelIntent(intent: Battle["intent"]): string {
  if (intent.kind === "strike") return `打击 ${intent.damage}`;
  if (intent.kind === "charge") return `冲锋 ${intent.steps} 步，撞上打 ${intent.damage}`;
  if (intent.kind === "pull") return `拉 ${intent.steps} 步`;
  if (intent.kind === "trap") return "脚下下机";
  if (intent.kind === "windup") return "蓄势";
  if (intent.kind === "lunge") return `抢步打 ${intent.damage}`;
  if (intent.kind === "swap") return "换位";
  if (intent.kind === "barrage") return `连打 ${intent.hits} 下，每下 ${intent.damage}`;
  if (intent.kind === "guard") return `卸力 架势 ${intent.block}`;
  if (intent.kind === "bleedcut") return `刀创 ${intent.damage}，叠裂创`;
  if (intent.kind === "counter") return `埋招 · ${riposteName(intent.form)}`;
  if (intent.kind === "mend") return `金创 回 ${intent.heal}`;
  if (intent.kind === "seal") return "封脉";
  if (intent.kind === "shatter") return `裂盾 ${intent.amount}`;
  if (intent.kind === "breathe") return `吐纳 回劲 ${intent.amount}`;
  if (intent.kind === "retreat") return `撤 ${intent.steps}`;
  if (intent.kind === "pestle") return `韦陀杵 ${intent.damage}`;
  if (intent.kind === "dust") return "迷眼";
  if (intent.kind === "shackle") return "锁链";
  if (intent.kind === "dodge") return "闪避";
  if (intent.kind === "endure") return "霸体";
  if (intent.kind === "sig") return SIGNATURE_BREAK[intent.id as EnemySigId]?.label ?? "绝招";
  return "身前落桩";
}

export function riposteName(kind: RiposteKind): string {
  if (kind === "slash") return "回刀";
  if (kind === "bleed") return "叠创";
  if (kind === "knock") return "让步";
  return "回架";
}

export function livingFoes(b: Battle): Unit[] {
  return (b.foes ?? [b.enemy]).filter((f) => f.hp > 0);
}

function syncFront(b: Battle): void {
  const live = livingFoes(b);
  if (live[0]) b.enemy = live[0];
}

function targetFoe(b: Battle): Unit | null {
  const live = livingFoes(b);
  if (!live.length) return null;
  const ahead = live.filter((f) => f.pos > b.player.pos).sort((a, c) => a.pos - c.pos);
  return ahead[0] ?? live[0];
}

export function occupied(b: Battle, pos: number, exceptId?: string, ignoreStakes = false): boolean {
  if (pos < 0 || pos >= BOARD_SIZE) return true;
  if (!ignoreStakes && b.stakes.includes(pos)) return true;
  if (assistOccupies(b, pos) && exceptId !== b.labAssistActive) return true;
  // §31.12 助战符召唤体也是实体——占格、挡路、当墙。
  if (isLabV2() && b.labSummon && b.labSummon.hp > 0 && b.labSummon.pos === pos) return true;
  if (b.player.pos === pos && b.player.id !== exceptId && b.player.hp > 0) return true;
  for (const f of livingFoes(b)) {
    if (f.pos === pos && f.id !== exceptId) return true;
  }
  return false;
}

function recycleDiscardIntoDraw(b: Battle): void {
  if (b.discardPile.length === 0) return;
  const recycled = b.discardPile.splice(0);
  b.drawPile = b.orderedDeal ? recycled : shuffle(recycled);
}

function drawOne(b: Battle): boolean {
  if (b.drawPile.length === 0) {
    if (b.discardPile.length === 0) return false;
    recycleDiscardIntoDraw(b);
  }
  const drawn = b.drawPile.shift();
  if (!drawn) return false;
  b.hand.push(drawn);
  return true;
}

/** @internal tests */
export function drawOneCard(b: Battle): boolean {
  return drawOne(b);
}

/** 超上限弃牌（不摸）。置换见 labCycleCard。 */
export function labDiscardCap(b: Battle): number {
  return Math.floor((b.v2Turn?.turnStartHand ?? b.hand.length) / 2);
}

export function labDiscardsLeft(b: Battle): number {
  return Math.max(0, 1 - (b.v2Turn?.cyclesUsed ?? 0));
}

export function labCanCycle(b: Battle): { ok: boolean; reason?: string } {
  if (!isLabV2()) return { ok: false, reason: "仅踢馆" };
  if (b.phase !== "player") return { ok: false, reason: "不是你的回合" };
  if (needsDiscardToHandCap(b)) return { ok: false, reason: "请先弃到上限再置换" };
  if (b.hand.length === 0) return { ok: false, reason: "没牌可换" };
  if ((b.v2Turn?.cyclesUsed ?? 0) >= 1) return { ok: false, reason: "本回已置换" };
  return { ok: true };
}

export function labCanDiscard(b: Battle): { ok: boolean; reason?: string } {
  if (needsDiscardToHandCap(b)) {
    if (b.phase !== "player") return { ok: false, reason: "不是你的回合" };
    if (b.hand.length === 0) return { ok: false, reason: "没牌可弃" };
    return { ok: true };
  }
  return labCanCycle(b);
}

export function labCycleCard(b: Battle, uid: string): Battle {
  const gate = labCanCycle(b);
  if (!gate.ok) return b;
  const idx = b.hand.findIndex((c) => c.uid === uid);
  if (idx < 0) return b;
  const [card] = b.hand.splice(idx, 1);
  b.discardPile.push(card);
  const f = b.v2Turn ?? emptyV2Turn(b);
  f.cyclesUsed = (f.cyclesUsed ?? 0) + 1;
  b.v2Turn = f;
  drawOne(b);
  b.log.push(`置换：弃 ${labCard(card.defId).name}，摸 1`);
  b.journal.push({ side: "you", text: `置换 ${labCard(card.defId).name}` });
  return b;
}

export function labDiscardCard(b: Battle, uid: string): Battle {
  const overCap = needsDiscardToHandCap(b);
  if (!overCap) return labCycleCard(b, uid);
  if (b.phase !== "player") return b;
  const idx = b.hand.findIndex((c) => c.uid === uid);
  if (idx < 0) return b;
  const [card] = b.hand.splice(idx, 1);
  b.discardPile.push(card);
  b.log.push(`弃 ${labCard(card.defId).name}（压到上限 ${handCap(b)}）`);
  b.journal.push({
    side: "you",
    text: `弃 ${labCard(card.defId).name} → 手牌 ${b.hand.length}/${handCap(b)}`,
  });
  return b;
}

function cardPlaySchoolGate(b: Battle, defId: CardId): { ok: boolean; reason?: string } {
  if (!isLabMode()) return { ok: true };
  const cs = cardSchool(defId);
  if (cs === "any") return { ok: true };
  const fieldSchool = battleEquippedSchool(b, b.active);
  if (cs === fieldSchool) return { ok: true };
  // §31.12 异系同行=组合技开闸（被动，人在后场即可）；v1 旧制仍走助战在场。
  if (isLabV2()) {
    const mate = b.bench.find((m) => m.hp > 0 && battleEquippedSchool(b, m.id) === cs);
    if (mate) return { ok: true };
  } else if (isComboRulesEnabled() && b.labAssistActive) {
    const assistSchool = battleEquippedSchool(b, b.labAssistActive);
    if (cs === assistSchool && assistSchool !== fieldSchool) return { ok: true };
  }
  return { ok: false, reason: `需${MATES[b.active].name}装备${cs}系，或后场有该系同行` };
}

export function isComboUnlockCard(b: Battle, defId: CardId): boolean {
  if (!isLabMode() || !isComboRulesEnabled() || !b.labAssistActive) return false;
  const cs = cardSchool(defId);
  if (cs === "any") return false;
  const fieldSchool = battleEquippedSchool(b, b.active);
  if (cs === fieldSchool) return false;
  return cs === battleEquippedSchool(b, b.labAssistActive);
}

function wallHit(b: Battle, cardWall?: number): number {
  const base = cardWall ?? WALL_DAMAGE;
  let dmg = hasTech(b, "hardWall") ? Math.max(12, base) : base;
  if (hasTech(b, "ironPalm")) dmg += 6;
  return dmg;
}

function knockDist(b: Battle, base: number): number {
  return base + (hasTech(b, "longPush") ? 1 : 0) + (hasTech(b, "piercingPalm") ? 1 : 0) + (hasTech(b, "heavyStaff") ? 1 : 0);
}

/** §31.19 分系外功的格挡加成：绵里针 / 剑幕 / 钩帘。 */
function techBlockBonus(b: Battle): number {
  let n = 0;
  if (hasTech(b, "softPalm")) n += 2;
  if (hasTech(b, "swordScreen") && !adjacent(b)) n += 3;
  if (hasTech(b, "hookVeil") && (b.foeDisarm ?? 0) > 0) n += 3;
  return n;
}

function breakTurnBonus(b: Battle): boolean {
  return (b.v2TurnBreakCount ?? 0) > 0;
}

function adjacent(b: Battle): boolean {
  const foe = targetFoe(b);
  if (!foe) return false;
  return Math.abs(b.player.pos - foe.pos) === 1;
}

function companionOn(b: Battle): boolean {
  return b.active !== b.hero;
}

function awayDir(from: number, to: number): 1 | -1 {
  return to >= from ? 1 : -1;
}

function towardDir(from: number, to: number): 1 | -1 {
  return to > from ? 1 : -1;
}

function noteStep(b: Battle, from: number, to: number): void {
  const foePos = b.enemy.pos;
  const dFrom = Math.abs(from - foePos);
  const dTo = Math.abs(to - foePos);
  if (dTo < dFrom) b.movedFwd = true;
  if (dTo > dFrom) b.movedBack = true;
  if (dFrom !== 1 && dTo === 1) b.enteredMelee = true;
}

function applyMateOpen(b: Battle): void {
  if (!companionOn(b)) return;
  if (b.active === "porter") {
    b.playerBlock += 1;
    b.log.push("稳肩，格挡 +1");
  }
  if (b.active === "boat" && !adjacent(b)) {
    b.playerBlock += 1;
    b.log.push("水步，格挡 +1");
  }
  if (b.active === "hermit" && b.stakes.length > 0) {
    b.playerBlock += 1;
    b.log.push("井根，格挡 +1");
  }
}

/** §31.19 分系外功的回合开局效果（桩甲等）。 */
function applyTechOpen(b: Battle): void {
  if (hasTech(b, "stakeArmor") && b.stakes.length > 0) {
    b.playerBlock += 2;
    b.log.push("桩甲，格挡 +2");
  }
}

/** §31.18 心法：收势时按「在场角色」的心法回血/回劲。 */
function applyMindOpen(b: Battle): void {
  const ids = b.labMateMinds?.[b.active];
  if (!ids?.length) return;
  const bonus = sumMindArtBonuses(ids);
  if (bonus.turnHeal > 0) {
    const n = healYou(b, bonus.turnHeal);
    if (n) b.log.push(`心法 回血 ${n}`);
  }
  if (bonus.turnEnergy > 0) {
    b.energyNext += bonus.turnEnergy;
    b.log.push(`心法 下回劲 +${bonus.turnEnergy}`);
  }
}

/** 换人后重绑心法带来的劲力上限/回劲（旧角色减去，新角色加上）。 */
export function rebindMindStats(b: Battle, prevActive: CompanionId): void {
  if (!b.labMateMinds) return;
  const prev = sumMindArtBonuses(b.labMateMinds[prevActive] ?? []);
  const cur = sumMindArtBonuses(b.labMateMinds[b.active] ?? []);
  const dMax = cur.energyMax - prev.energyMax;
  const dRegen = cur.turnEnergy - prev.turnEnergy;
  if (dMax !== 0) {
    b.energyMax = Math.max(1, b.energyMax + dMax);
    b.energy = Math.min(b.energy, b.energyMax);
  }
  if (dRegen !== 0) b.energyRegen = Math.max(0, b.energyRegen + dRegen);
}

function riposteDuration(hp: number, maxHp: number, paceLead: boolean, wounded: boolean): number {
  let t = hp * 2 > maxHp ? 4 : 2;
  if (hp * 4 <= maxHp) t = 1;
  if (paceLead) t += 1;
  if (wounded) t = Math.max(1, t - 1);
  return t;
}

function armRiposte(b: Battle, who: "you" | "foe", form: RiposteKind): void {
  if (who === "you") {
    b.youRiposte = form;
    b.youRiposteTurns = riposteDuration(b.player.hp, b.player.maxHp, yourPace(b) >= b.foePace, b.youBleed >= 4);
  } else {
    const foe = targetFoe(b) ?? b.enemy;
    b.foeRiposte = form;
    b.foeRiposteTurns = riposteDuration(foe.hp, foe.maxHp, b.foePace > yourPace(b), b.bleed >= 4);
  }
}

function tickRiposte(b: Battle, who: "you" | "foe"): void {
  if (who === "you") {
    if (!b.youRiposte) return;
    b.youRiposteTurns -= 1;
    if (b.youRiposteTurns <= 0) {
      b.youRiposte = null;
      b.youRiposteTurns = 0;
      b.log.push("埋招散了。");
    }
  } else {
    if (!b.foeRiposte) return;
    b.foeRiposteTurns -= 1;
    if (b.foeRiposteTurns <= 0) {
      b.foeRiposte = null;
      b.foeRiposteTurns = 0;
      b.log.push(`${b.enemy.name}袖里的招散了。`);
    }
  }
}

function healYou(b: Battle, n: number): number {
  const before = b.player.hp;
  b.player.hp = Math.min(b.player.maxHp, b.player.hp + n);
  return b.player.hp - before;
}

function handCap(b: Battle): number {
  const bonus = (b.v2HandCapBonus ?? 0) + (hasTech(b, "stackHand") ? 1 : 0);
  return clampHandCap(HAND_CAP_DEFAULT + bonus - (b.youHandTax ?? 0));
}

/** 对外：当前手牌上限（拆招开踢默认 5、硬顶 10）。 */
export function battleHandCap(b: Battle): number {
  return handCap(b);
}

/** 拆招开踢：手牌超过上限时须先点选弃到上限才能收势。 */
export function needsDiscardToHandCap(b: Battle): boolean {
  return isLabMode() && isBreakAlign() && b.hand.length > handCap(b);
}

export function canEndPlayerTurn(b: Battle): { ok: boolean; reason?: string } {
  if (b.phase !== "player") return { ok: false, reason: "现在不是你的回合" };
  if (needsDiscardToHandCap(b)) {
    return { ok: false, reason: `手牌 ${b.hand.length}/${handCap(b)}，请先弃到上限` };
  }
  return { ok: true };
}

let riposteDepth = 0;

function tryRiposte(b: Battle, owner: "you" | "foe"): string[] {
  if (riposteDepth >= 2) return [];
  const kind = owner === "you" ? b.youRiposte : b.foeRiposte;
  if (!kind) return [];
  if (owner === "you") {
    b.youRiposte = null;
    b.youRiposteTurns = 0;
  } else {
    b.foeRiposte = null;
    b.foeRiposteTurns = 0;
  }
  riposteDepth += 1;
  const who = owner === "you" ? "你" : b.enemy.name;
  const notes: string[] = [`${who}埋招发了 · ${riposteName(kind)}`];
  if (kind === "slash") {
    if (owner === "you") notes.push(...hitEnemy(b, 10, "回刀 ", false));
    else hitPlayer(b, 10, "回刀 ");
  } else if (kind === "bleed") {
    if (owner === "you") {
      b.bleed = Math.min(9, b.bleed + 4);
      notes.push(`裂创 ${b.bleed}`);
    } else {
      b.youBleed = Math.min(9, b.youBleed + 4);
      notes.push(`你裂创 ${b.youBleed}`);
    }
  } else if (kind === "knock") {
    if (owner === "you") notes.push(...knockAway(b, "enemy", 2));
    else notes.push(...knockAway(b, "player", 2));
  } else {
    if (owner === "you") {
      b.playerBlock += 10;
      notes.push("格挡 10");
      notes.push(...hitEnemy(b, 6, "回架 ", false));
    } else {
      const room = Math.max(0, ENEMY_BLOCK_CAP - b.enemyBlock);
      const add = Math.min(10, room);
      b.enemyBlock += add;
      if (add) notes.push(`${b.enemy.name}架住了 ${add}`);
      hitPlayer(b, 6, "回架 ");
    }
  }
  riposteDepth -= 1;
  return notes;
}

/**
 * §31.11 六系特色（甲方理念）：
 * 刀=埋招反击（上回合挨过打则爆发）/ 枪=远强近弱 / 剑=创伤叠层 /
 * 钩=缴械后好输出 / 棍=连击晕（在 postAttackHooks）/ 拳=震壁（在 knockAway）。
 */
function schoolIdentityMods(b: Battle, cardDef: CardDef | undefined, dmg: number): number {
  if (!cardDef || cardDef.type !== "attack") return dmg;
  const school = battleEquippedSchool(b, b.active);
  const d = Math.abs(b.player.pos - b.enemy.pos);
  if (school === "saber" && b.foeHitLastTurn) dmg += 4;
  if (hasTech(b, "saberGrudge") && b.foeHitLastTurn) {
    if (!(isLabMode() && isBreakAlign())) dmg += 2;
  }
  if (school === "spear" && !(isLabMode() && isBreakAlign())) dmg += d >= 2 ? 3 : -2;
  if (hasTech(b, "spearWind") && d >= 3) dmg += 3;
  if (school === "sword") dmg += Math.floor((b.bleed ?? 0) / 3);
  if (hasTech(b, "swordRain") && (b.bleed ?? 0) >= 3) dmg += 3;
  if (school === "hook" && (b.foeDisarm ?? 0) > 0) dmg += 3;
  return dmg;
}

function strikeDamage(b: Battle, base: number, forceMelee = false, cardDef?: CardDef): number {
  if (isLabV2()) {
    let dmg = simV2StrikeDamage(b, base);
    dmg = v2StrikeBonus(b, dmg, true);
    if (cardDef) {
      dmg = labV21StrikeAdjust(b, cardDef, dmg);
      const dist = Math.abs(b.player.pos - b.enemy.pos);
      dmg = assistAttackBonus(b, cardDef, dmg, dist);
    }
    dmg = schoolIdentityMods(b, cardDef, dmg);
    if (b.active === "ananhuo" && Math.abs(b.player.pos - b.enemy.pos) >= 2) dmg += 2;
    if (hasTech(b, "brightBlade") && (forceMelee || adjacent(b))) {
      if (!(isLabMode() && isBreakAlign()) || breakTurnBonus(b)) dmg += 3;
    }
    if (fightScale.youDmg !== 1) dmg = Math.max(1, Math.round(dmg * fightScale.youDmg));
    return Math.max(1, dmg);
  }
  let dmg = base + b.nextDamage + b.flow + b.mark;
  if (hasTech(b, "brightBlade") && (forceMelee || adjacent(b))) dmg += 3;
  if (b.youSway > 0) dmg = Math.max(1, dmg - 2);
  if (b.expose > 0) {
    dmg += 4;
    b.expose -= 1;
  }
  // 连势加伤在此结算；连势层数留给 hitEnemy 的 pathSkillMods（palm-b 连刃）再清。
  if (b.combo > 0) dmg += b.combo * 2;
  if (fightScale.youDmg !== 1) dmg = Math.max(1, Math.round(dmg * fightScale.youDmg));
  return dmg;
}

function intentThreat(b: Battle): number {
  const intent = b.intent;
  if (intent.kind === "strike" || intent.kind === "lunge") return intent.damage;
  if (intent.kind === "charge") return intent.damage;
  if (intent.kind === "barrage") return intent.damage * intent.hits;
  return 0;
}

/** Soft cap so AI turtle / riposte ward cannot freeze a fight. */
function hitEnemy(b: Battle, raw: number, verb: string, spendCharge = true): string[] {
  const foe = targetFoe(b);
  if (!foe) return ["没有目标"];
  if (b.foeDodgedHit || (b.foeDodge ?? 0) > 0) {
    if (!b.foeDodgedHit) b.foeDodge = Math.max(0, (b.foeDodge ?? 0) - 1);
    b.foeDodgedHit = true;
    b.foeSkipCc = true;
    b.lastHitRead = "闪避";
    return ["闪避"];
  }
  const gate = adjacentStakePos(b.player.pos, foe.pos, b.stakes);
  if (gate != null && raw > 0) {
    const n = smashHitsForSchool(battleEquippedSchool(b, b.active));
    const gone = smashStake(b, gate, n);
    if (b.v2Turn) b.v2Turn.hitStakeThisTurn = true;
    const line = gone ? "破桩" : `砸桩 · 还挡 ${stakeHitsAt(b, gate)}`;
    b.lastHitRead = line;
    return [line];
  }
  if ((b.foeEndure ?? 0) > 0) {
    b.foeEndure = Math.max(0, (b.foeEndure ?? 0) - 1);
    b.foeSkipCc = true;
  }
  if ((b.youDust ?? 0) > 0) {
    const mistDist = Math.abs(b.player.pos - foe.pos);
    b.youDust = 0;
    if (mistDist > 1) return ["迷眼：隔位打空"];
  }
  const gear = gearById(battleGearId);
  let dmg = raw + (gear?.damage ?? 0);
  const notes: string[] = [];
  const dist = Math.abs(b.player.pos - foe.pos);
  const mods = pathSkillMods(gear, {
    dist,
    combo: b.combo,
    paceAdvantage: battlePace(b) + b.paceBoost >= b.foePace,
    hasBlock: b.playerBlock > 0,
  });
  if (mods.damage) {
    dmg += mods.damage;
    if (mods.note) notes.push(mods.note);
  }
  if (mods.ward) b.playerBlock += mods.ward;
  if (mods.expose && raw > 0) {
    b.expose += mods.expose;
    notes.push("破绽露出");
  }
  if (!isLabV2() && b.combo > 0) b.combo = 0;
  if (b.active === "boqing" && b.enemyBlock > 0) {
    const pierce = Math.min(3, b.enemyBlock);
    b.enemyBlock -= pierce;
    if (pierce) notes.push(`裂甲破挡 ${pierce}`);
  }
  if (b.enemyBlock > 0) {
    const blocked = Math.min(b.enemyBlock, dmg);
    b.enemyBlock -= blocked;
    dmg -= blocked;
    if (blocked) notes.push(`他卸了 ${blocked}`);
  }
  foe.hp -= dmg;
  if (spendCharge) b.nextDamage = 0;
  notes.unshift(`${verb}${dmg}`);
  if (raw > 0 && dmg > 0 && b.active === "lvchifeng" && dist <= 1) {
    b.bleed = Math.min(9, (b.bleed ?? 0) + 1);
    notes.push("见血");
  }
  if (raw > 0 && dmg > 0 && b.active === "lishuangxing" && battleEquippedSchool(b, b.active) === "saber") {
    b.bleed = Math.min(9, (b.bleed ?? 0) + 1);
    notes.push("霜叠");
  }
  if (raw > 0 && dmg > 0) simV2OnHitEnemy(b, raw, dmg);
  if (raw > 0) notes.push(...tryRiposte(b, "foe"));
  if (mods.thorns && raw > 0 && b.playerBlock > 0) {
    const th = Math.min(3, mods.thorns);
    if (th > 0) {
      foe.hp -= th;
      notes.push(`刃反 ${th}`);
    }
  }
  if (foe.hp <= 0) {
    notes.push(`${foe.name}倒下`);
    if (raw > 0) pushFx(b, "kill");
  }
  b.lastHitRead = `伤${dmg}${notes.length ? ` · ${notes.join(" · ")}` : ""}`;
  syncFront(b);
  return notes;
}

function knockAway(b: Battle, who: "player" | "enemy", dist: number, wall?: number): string[] {
  if (who === "enemy" && b.foeSkipCc) return ["霸体：不受位移"];
  const notes: string[] = [];
  const unit = who === "player" ? b.player : (targetFoe(b) ?? b.enemy);
  const other = who === "player" ? (targetFoe(b) ?? b.enemy) : b.player;
  if (!unit) return ["没有目标"];
  const gearMods = who === "enemy" ? pathSkillMods(battleGearId) : {};
  const need = who === "enemy" ? knockDist(b, dist) + (gearMods.knockExtra ?? 0) : dist;
  const dir = awayDir(other.pos, unit.pos);
  let left = need;
  const from = unit.pos;
  while (left > 0 && unit.hp > 0) {
    const next = unit.pos + dir;
    if (next < 0 || next >= BOARD_SIZE) {
      let wh = wallHit(b, wall);
      if (who === "enemy" && (gearMods.wallBlock ?? 0) > 0) {
        wh += gearMods.wallBlock ?? 0;
        notes.push("墙劲");
      }
      // §31.11 拳系震壁：把敌打上墙 → 震壁 +6 且眩晕 1 段（拳的输出环境差，上墙是高收益兑现）
      if (who === "enemy" && isLabV2() && battleEquippedSchool(b, b.active) === "palm") {
        wh += 6;
        b.foeStun = (b.foeStun ?? 0) + 1;
        notes.push("震壁·敌晕 1 段");
      }
      unit.hp -= wh;
      notes.push(`撞壁 ${wh}`);
      if (who === "enemy") pushFx(b, "wall");
      if (who === "player" && unit.hp <= 0) collapseOrDeathSwap(b);
      break;
    }
    if (occupied(b, next, unit.id)) {
      // §31.12 助战符当墙：敌被推到召唤体身上 = 撞墙（拳系震壁连招的核心兑现）
      if (who === "enemy" && isLabV2() && b.labSummon && b.labSummon.hp > 0 && b.labSummon.pos === next) {
        let wh = wallHit(b, wall);
        if (battleEquippedSchool(b, b.active) === "palm") {
          wh += 6;
          b.foeStun = (b.foeStun ?? 0) + 1;
          notes.push("震壁·敌晕 1 段");
        }
        unit.hp -= wh;
        notes.push(`撞上${b.labSummon.name} ${wh}`);
        hitSummon(b, 2, "垫背 ");
        pushFx(b, "wall");
        if (unit.hp <= 0) notes.push(`${unit.name}倒下`);
        break;
      }
      // 多敌人时：被友军挡住则连带挤压（把友军也推一格，连锁反应）
      const blocker = livingFoes(b).find((f) => f.pos === next && f.id !== unit.id);
      if (who === "enemy" && blocker) {
        const blockDir = awayDir(unit.pos, blocker.pos);
        const blockNext = blocker.pos + blockDir;
        if (blockNext >= 0 && blockNext < BOARD_SIZE && !occupied(b, blockNext, blocker.id)) {
          blocker.pos = blockNext;
          notes.push(`连带 ${blocker.name} 退到第 ${blockNext + 1} 步`);
          unit.pos = next;
          left -= 1;
          continue;
        }
      }
      notes.push(b.stakes.includes(next) ? "桩挡住了" : "去路被占，停下");
      if (who === "enemy" && b.stakes.includes(next)) {
        unit.hp -= 4;
        notes.push("猎桩 4");
        if (unit.hp <= 0) notes.push(`${unit.name}倒下`);
      }
      break;
    }
    unit.pos = next;
    left -= 1;
  }
  if (who === "player" && unit.pos !== from) noteStep(b, from, unit.pos);
  if (left < need && left >= 0) notes.unshift(`击退至第 ${unit.pos + 1} 步`);
  if (unit.hp <= 0) notes.push(`${who === "player" ? "你" : unit.name}倒下`);
  syncFront(b);
  return notes;
}

function pushEnemy(b: Battle, dist: number, wall?: number): string[] {
  const notes = knockAway(b, "enemy", dist, wall);
  if (companionOn(b) && b.active === "rail" && notes.some((n) => n.includes("击退") || n.includes("撞壁"))) {
    b.playerBlock += 1;
    notes.push("门劲 格挡 +1");
  }
  return notes;
}

function pullUnit(
  b: Battle,
  who: "player" | "enemy",
  toward: "player" | "enemy",
  steps: number,
): string[] {
  if (who === "enemy" && b.foeSkipCc) return ["霸体：不受拉"];
  const unit = who === "player" ? b.player : (targetFoe(b) ?? b.enemy);
  const other = toward === "player" ? b.player : (targetFoe(b) ?? b.enemy);
  const notes: string[] = [];
  let left = steps;
  while (left > 0 && unit.hp > 0) {
    const dir = other.pos > unit.pos ? 1 : other.pos < unit.pos ? -1 : 0;
    if (dir === 0) break;
    const next = unit.pos + dir;
    if (next === other.pos || occupied(b, next, unit.id)) {
      if (who === "enemy" && b.stakes.includes(next)) {
        unit.hp -= 4;
        notes.push("猎桩 4");
        syncFront(b);
      }
      break;
    }
    unit.pos = next;
    left -= 1;
  }
  if (left < steps) notes.push(`${who === "player" ? "你" : unit.name}被拉至第 ${unit.pos + 1} 步`);
  if (who === "enemy" && left < steps) {
    const mods = pathSkillMods(battleGearId);
    if (mods.pullDmg) {
      unit.hp -= mods.pullDmg;
      notes.push(`钩伤 ${mods.pullDmg}`);
    }
    if (hasTech(b, "barbedHook")) {
      unit.hp -= 3;
      notes.push("倒刺 3");
    }
    if (mods.pullStrip && b.enemyBlock > 0) {
      const strip = Math.min(b.enemyBlock, mods.pullStrip + 2);
      b.enemyBlock -= strip;
      notes.push(`抽架 ${strip}`);
    }
  }
  syncFront(b);
  return notes;
}

function movePlayer(b: Battle, dir: 1 | -1, steps: number, ignoreStakes: boolean): string[] {
  const notes: string[] = [];
  let moved = 0;
  const from = b.player.pos;
  for (let i = 0; i < steps; i++) {
    const next = b.player.pos + dir;
    if (occupied(b, next, b.player.id, ignoreStakes)) break;
    b.player.pos = next;
    moved += 1;
  }
  if (moved > 0) {
    noteStep(b, from, b.player.pos);
    const closer = Math.abs(b.player.pos - b.enemy.pos) < Math.abs(from - b.enemy.pos);
    notes.push(`${closer ? "前进" : "后退"}至第 ${b.player.pos + 1} 步`);
  }
  return notes;
}

function pathClear(b: Battle, from: number, to: number): boolean {
  if (to < 0 || to >= BOARD_SIZE) return false;
  if (occupied(b, to, b.player.id)) return false;
  const dir = to > from ? 1 : -1;
  for (let p = from + dir; p !== to; p += dir) {
    if (occupied(b, p, b.player.id)) return false;
  }
  return true;
}

function applyCard(b: Battle, defId: CardId): string[] {
  const def = labCard(defId);
  const notes: string[] = [];

  if (defId === "strike" || defId === "strike2" || defId === "elbow") {
    const notes = hitEnemy(b, strikeDamage(b, def.damage ?? 0, false, def), def.name + " ");
    if (defId === "strike2") notes.push(...pushEnemy(b, def.knock ?? 1));
    if (defId === "elbow" && adjacent(b)) {
      b.bleed = Math.min(9, b.bleed + 1);
      notes.push(`裂创 ${b.bleed}`);
    }
    return notes;
  }

  if (defId === "drawcut") {
    const melee = adjacent(b) || hasTech(b, "closeCut");
    const table = saberBreakAttackBase(b, def);
    const base = table ?? (melee ? 8 : 4);
    const notes = hitEnemy(b, strikeDamage(b, base, melee, def), melee ? "抽刀 " : "抽刀远 ");
    if (melee && !b.foeDodgedHit) {
      b.bleed = Math.min(9, b.bleed + 1);
      notes.push(`裂创 ${b.bleed}`);
    }
    return notes;
  }

  if (defId === "defend" || defId === "defend2") {
    let block = def.block ?? 0;
    if (hasTech(b, "throne") && (b.player.pos === 0 || b.player.pos === BOARD_SIZE - 1)) block += 4;
    block += techBlockBonus(b);
    b.playerBlock += block;
    notes.push(`格挡 ${block}`);
    if (defId === "defend2" && drawOne(b)) notes.push("抽 1");
    return notes;
  }

  if (defId === "backpalm") {
    const foe = targetFoe(b) ?? b.enemy;
    notes.push(...movePlayer(b, awayDir(foe.pos, b.player.pos), 1, false));
    if (notes.length === 0) notes.push("身后无路");
    let block = def.block ?? 0;
    if (hasTech(b, "throne") && (b.player.pos === 0 || b.player.pos === BOARD_SIZE - 1)) block += 4;
    block += techBlockBonus(b);
    b.playerBlock += block;
    notes.push(`格挡 ${block}`);
    return notes;
  }

  // §31.15 撤步：各系通用的退步答案（退步掌是拳系带架版本，这张是白身 0 费退 2）
  if (defId === "retreat") {
    const foe = targetFoe(b) ?? b.enemy;
    notes.push(...movePlayer(b, awayDir(foe.pos, b.player.pos), 2, false));
    if (notes.length === 0) notes.push("身后无路");
    return notes;
  }

  if (defId === "charge" || defId === "charge2") {
    const bonus = def.chargeBonus ?? 4;
    b.nextDamage += bonus;
    notes.push(`下一招伤害 +${bonus}`);
    // §31.12 各系起手都有蓄劲——让它顺手攒 1 势，任何系都有稳定的攒势手段（不只靠解禁丹）。
    if (isLabV2()) notes.push(...simV2ApplyGather(b, 1));
    return notes;
  }

  if (defId === "advance" || defId === "advance2") {
    const ignore = hasTech(b, "ghostStep");
    const steps = (def.steps ?? 1) + (hasTech(b, "longMarch") ? 1 : 0);
    const foe = targetFoe(b) ?? b.enemy;
    const dir = towardDir(b.player.pos, foe.pos);
    const front = b.player.pos + dir;
    if (hasTech(b, "bodyCheck") && front === foe.pos) {
      notes.push(...hitEnemy(b, 6, "对撞 ", false));
    } else {
      const moved = movePlayer(b, dir, steps, ignore);
      if (moved.length === 0 && hasTech(b, "backstep")) {
        notes.push(...movePlayer(b, awayDir(foe.pos, b.player.pos), 1, ignore));
      }
      if (notes.length === 0 && moved.length === 0) notes.push("身前无路");
      else notes.push(...moved);
    }
    // 踢馆：进步/纵步耗 1 劲换位置并抽 1，增加手牌周转
    if (isLabV2() && (defId === "advance" || defId === "advance2") && drawOne(b)) notes.push("抽 1");
    if (!isLabV2() && drawOne(b)) notes.push("抽 1");
    return notes;
  }

  if (defId === "push" || defId === "push2" || defId === "sweep") {
    notes.push(...pushEnemy(b, def.knock ?? 1, def.wall));
    if (defId === "sweep" && !isLabV2() && drawOne(b)) notes.push("抽 1");
    return notes;
  }

  if (defId === "split") {
    const foe = targetFoe(b) ?? b.enemy;
    const dir = towardDir(b.player.pos, foe.pos);
    const front = b.player.pos + dir;
    const i = b.stakes.indexOf(front);
    if (i >= 0) {
      removeStake(b, front);
      if (b.v2Turn) b.v2Turn.hitStakeThisTurn = true;
      notes.push("桩裂了");
      return notes;
    }
    const ahead =
      dir > 0
        ? b.stakes.filter((p) => p > b.player.pos).sort((a, c) => a - c)[0]
        : b.stakes.filter((p) => p < b.player.pos).sort((a, c) => c - a)[0];
    if (ahead !== undefined) {
      removeStake(b, ahead);
      if (b.v2Turn) b.v2Turn.hitStakeThisTurn = true;
      notes.push("桩裂了");
      return notes;
    }
    return hitEnemy(b, strikeDamage(b, def.damage ?? 7, false, def), "裂桩 ");
  }

  if (defId === "close") {
    const foe = targetFoe(b);
    if (!foe) {
      notes.push("没有目标");
      return notes;
    }
    const dir = towardDir(b.player.pos, foe.pos);
    const target = foe.pos - dir;
    const from = b.player.pos;
    if (target === b.player.pos) {
      notes.push("已经贴着");
      return notes;
    }
    if (pathClear(b, b.player.pos, target)) {
      b.player.pos = target;
      noteStep(b, from, target);
      notes.push(`贴至第 ${b.player.pos + 1} 步`);
    } else {
      notes.push("去路被占");
    }
    return notes;
  }

  if (defId === "mend" || defId === "mend2") {
    const n = def.heal ?? 5;
    const before = b.player.hp;
    b.player.hp = Math.min(b.player.maxHp, b.player.hp + n);
    notes.push(`回 ${b.player.hp - before}`);
    if (def.clearBleed && b.bleed > 0) {
      b.bleed = 0;
      notes.push("裂创清了");
    }
    return notes;
  }

  if (defId === "cut") {
    const melee = adjacent(b);
    const table = saberBreakAttackBase(b, def);
    const bonus = melee ? (def.nearBonus ?? 0) : 0;
    const base = table ?? (def.damage ?? 0) + bonus;
    const notes = hitEnemy(b, strikeDamage(b, base, melee, def), def.name + " ");
    if (melee && !b.foeDodgedHit) {
      b.bleed = Math.min(9, b.bleed + (def.bleed ?? 1));
      notes.push(`裂创 ${b.bleed}`);
    }
    return notes;
  }

  if (defId === "thrust") {
    const foe = targetFoe(b);
    const dist = foe ? Math.abs(b.player.pos - foe.pos) : 0;
    const table = spearBreakAttackBase(b, def);
    const bonus = table == null && dist >= 2 ? (def.farBonus ?? 0) : 0;
    const base = table ?? (def.damage ?? 0) + bonus;
    const notes = hitEnemy(b, strikeDamage(b, base, false, def), def.name + " ");
    if (table != null) addSpearRuler(b, spearRulerGain(dist));
    return notes;
  }

  if (defId === "pierce") {
    notes.push(...hitEnemy(b, strikeDamage(b, def.damage ?? 0, false, def), def.name + " ", false));
    notes.push(...pushEnemy(b, def.knock ?? 1));
    b.nextDamage = 0;
    return notes;
  }

  if (defId === "plant") {
    const foe = targetFoe(b) ?? b.enemy;
    const at = b.player.pos + towardDir(b.player.pos, foe.pos);
    if (at >= 0 && at < BOARD_SIZE && !occupied(b, at)) {
      addStake(b, at, playerPlantHits(battleEquippedSchool(b, b.active)));
      notes.push(`桩落在第 ${at + 1} 步`);
    } else notes.push("身前落不下");
    return notes;
  }

  if (defId === "hookpull") {
    notes.push(...pullUnit(b, "enemy", "player", def.pullEnemy ?? 2));
    notes.push(...hitEnemy(b, strikeDamage(b, def.damage ?? 0, false, def), def.name + " "));
    if (companionOn(b) && b.active === "hooker") {
      b.nextDamage += 3;
      notes.push("缆手 下一掌 +3");
    }
    return notes;
  }

  if (defId === "bleedcut") {
    notes.push(...hitEnemy(b, strikeDamage(b, def.damage ?? 0, false, def), def.name + " "));
    b.bleed = Math.min(9, b.bleed + (def.bleed ?? 3));
    notes.push(`裂创 ${b.bleed}`);
    return notes;
  }

  if (defId === "expose") {
    b.expose += def.expose ?? 2;
    b.frail += def.frail ?? 0;
    notes.push(`破绽 ${b.expose}`);
    if (b.frail) notes.push(`滞手 ${b.frail}`);
    if (drawOne(b)) notes.push("抽 1");
    return notes;
  }

  if (defId === "thorns") {
    b.playerBlock += def.block ?? 0;
    b.thorns += def.thorns ?? 0;
    notes.push(`格挡 ${def.block ?? 0}`);
    notes.push(`反震 ${b.thorns}`);
    return notes;
  }

  if (defId === "inbreath") {
    b.energyNext += def.energyNext ?? 2;
    notes.push(`下回劲力 +${b.energyNext}`);
    if (drawOne(b)) notes.push("抽 1");
    return notes;
  }

  if (defId === "combo") {
    if (isLabV2()) return simV2ApplyComboCard(b, defId, def.stackTaxHp);
    if ((def.stackTaxHp ?? 0) > 0) {
      b.player.hp = Math.max(1, b.player.hp - (def.stackTaxHp ?? 0));
      notes.push(`付血 ${def.stackTaxHp}`);
    }
    b.combo += 1;
    notes.push(`连势 ${b.combo}`);
    return notes;
  }

  if (defId === "follow" || defId === "follow2") {
    const linked = b.attacksThisTurn > 0;
    const base = defId === "follow2" ? (linked ? 8 : 4) : linked ? 6 : 3;
    notes.push(...hitEnemy(b, strikeDamage(b, base), linked ? "追掌 " : "虚掌 "));
    if (linked) {
      b.bleed = Math.min(9, b.bleed + 1);
      notes.push(`裂创 ${b.bleed}`);
    }
    if (!linked) notes.push("没接上");
    return notes;
  }

  if (defId === "twinpalm") {
    const first = strikeDamage(b, 4);
    notes.push(...hitEnemy(b, first, "一掌 ", true));
    if (livingFoes(b).length) notes.push(...hitEnemy(b, 4, "二掌 ", false));
    return notes;
  }

  if (defId === "brace") {
    const block = (def.block ?? 6) + techBlockBonus(b);
    b.playerBlock += block;
    notes.push(`格挡 ${block}`);
    if (drawOne(b)) notes.push("抽 1");
    return notes;
  }

  if (defId === "chain" || defId === "chain2") {
    const linked = simV2IsLinked(b);
    const base = defId === "chain2" ? (linked ? 11 : 7) : linked ? 9 : 5;
    notes.push(...hitEnemy(b, strikeDamage(b, base), linked ? "连环 " : "单掌 "));
    if (linked && drawOne(b)) notes.push("抽 1");
    return notes;
  }

  if (defId === "haste" || defId === "haste2") {
    b.paceBoost += def.pace ?? 3;
    notes.push(`先机 ${yourPace(b)}`);
    if (drawOne(b)) notes.push("抽 1");
    return notes;
  }

  if (defId === "gather" || defId === "gather2") {
    if (isLabV2()) {
      notes.push(...simV2ApplyGather(b, def.flow ?? 1));
      if (drawOne(b)) notes.push("抽 1");
      return notes;
    }
    b.flow = Math.min(3, b.flow + (def.flow ?? 1));
    notes.push(`气脉 ${b.flow}`);
    if (drawOne(b)) notes.push("抽 1");
    return notes;
  }

  if (defId === "setup") {
    if (isLabV2()) {
      notes.push(...simV2ApplySetup(b, def.setupGain ?? 1));
      if (drawOne(b)) notes.push("抽 1");
      return notes;
    }
    b.setup += def.setupGain ?? 1;
    notes.push(`铺势 ${b.setup}`);
    if (drawOne(b)) notes.push("抽 1");
    return notes;
  }

  if (defId === "finisher" || defId === "finisher2") {
    if (isLabV2()) {
      const { base, notes: qn } = simV2ApplyFinisher(b, defId, def.damage ?? 4);
      notes.push(...qn);
      notes.push(...hitEnemy(b, strikeDamage(b, base), qn.length ? "势爆 " : "空爆 "));
      return notes;
    }
    const stacks = b.setup;
    const per = defId === "finisher2" ? 6 : 5;
    const base = (def.damage ?? 4) + stacks * per;
    b.setup = 0;
    notes.push(...hitEnemy(b, strikeDamage(b, base), stacks ? "收势 " : "空收 "));
    if (stacks) notes.push(`吃掉铺势 ${stacks}`);
    else notes.push("没铺上");
    return notes;
  }

  if (defId === "weave") {
    if (b.lastPlay === "attack") {
      b.playerBlock += 8;
      b.combo += 1;
      notes.push("格挡 8");
      notes.push(`连势 ${b.combo}`);
    } else {
      b.nextDamage += 3;
      notes.push("蓄劲 +3");
      if (!b.lastPlay) notes.push("没接攻");
    }
    // §31.11 减费手段：搓手是 0 费润滑，本回合下一张牌耗劲 -1
    if (def.costDiscountNext) {
      b.costDiscountNext = (b.costDiscountNext ?? 0) + def.costDiscountNext;
      notes.push(`下张牌耗劲 -${def.costDiscountNext}`);
    }
    return notes;
  }

  if (defId === "echo") {
    b.echoNext += def.echo ?? 6;
    notes.push(`尾劲下回 +${b.echoNext}`);
    return notes;
  }

  if (defId === "ironform") {
    const block = (def.block ?? 10) + techBlockBonus(b);
    b.playerBlock += block;
    b.retainTurns = Math.max(b.retainTurns, def.retainTurns ?? 2);
    b.retainAmt = Math.max(b.retainAmt, def.retainAmt ?? 6);
    notes.push(`格挡 ${block}`);
    notes.push(`铁布留 ${b.retainAmt} · ${b.retainTurns} 回`);
    return notes;
  }

  if (defId === "marking") {
    b.mark = Math.min(5, b.mark + (def.mark ?? 2));
    notes.push(...hitEnemy(b, strikeDamage(b, def.damage ?? 4, false, def), def.name + " "));
    notes.push(`点穴 ${b.mark}`);
    return notes;
  }

  if (defId === "rift") {
    let base = def.damage ?? 5;
    if (b.mark > 0) {
      b.mark -= 1;
      base += 6;
      notes.push(...hitEnemy(b, strikeDamage(b, base), "开缝 "));
      notes.push(`吃印剩 ${b.mark}`);
      b.bleed = Math.min(9, b.bleed + 1);
      notes.push(`裂创 ${b.bleed}`);
      if (drawOne(b)) notes.push("抽 1");
    } else {
      notes.push(...hitEnemy(b, strikeDamage(b, base), "虚缝 "));
      notes.push("没印");
    }
    return notes;
  }

  if (defId === "mirror") {
    const threat = Math.min(14, intentThreat(b));
    if (threat <= 0) {
      notes.push("他这一息没打量");
      return notes;
    }
    b.playerBlock += threat;
    notes.push(`对招卸 ${threat}`);
    return notes;
  }

  if (defId === "layer") {
    const linked = b.attacksThisTurn > 0;
    notes.push(...hitEnemy(b, strikeDamage(b, def.damage ?? 3, false, def), linked ? "叠掌 " : "单叠 "));
    if (linked) {
      b.bleed = Math.min(9, b.bleed + 2);
      b.combo += 1;
      notes.push(`裂创 ${b.bleed}`);
      notes.push(`连势 ${b.combo}`);
    } else notes.push("没叠上");
    return notes;
  }

  if (defId === "tide") {
    b.energyNext += def.energyNext ?? 1;
    notes.push(`下回劲力 +${b.energyNext}`);
    if (b.flow > 0 && drawOne(b)) notes.push("抽 1");
    else if (b.flow <= 0) notes.push("无气脉");
    return notes;
  }

  if (defId === "burySlash" || defId === "buryBleed" || defId === "buryKnock" || defId === "buryWard") {
    const form = def.riposte ?? "slash";
    armRiposte(b, "you", form);
    notes.push(`埋下${riposteName(form)} · ${b.youRiposteTurns} 回`);
    return notes;
  }

  if (defId === "salve") {
    const n = def.heal ?? 6;
    notes.push(`回 ${healYou(b, n)}`);
    if (b.youBleed > 0) {
      b.youBleed = 0;
      notes.push("裂创止了");
    }
    return notes;
  }

  if (defId === "unbind") {
    if (b.youSeal > 0 || b.youSlow > 0) {
      b.youSeal = 0;
      b.youSlow = 0;
      notes.push("脉通了");
    } else notes.push("脉本来就通");
    if (drawOne(b)) notes.push("抽 1");
    return notes;
  }

  if (defId === "sidestep") {
    const foe = targetFoe(b);
    if (!foe) {
      notes.push("没有目标");
      return notes;
    }
    if (!adjacent(b)) {
      notes.push("隔得太远，换不了");
      return notes;
    }
    const from = b.player.pos;
    const p = b.player.pos;
    b.player.pos = foe.pos;
    foe.pos = p;
    noteStep(b, from, b.player.pos);
    notes.push(`换至第 ${b.player.pos + 1} 步`);
    if (yourPace(b) >= b.foePace) {
      if (drawOne(b)) notes.push("抽 1");
    } else {
      b.youSway = Math.max(b.youSway, 1);
      notes.push("乱步 1");
    }
    return notes;
  }

  if (defId === "suture") {
    b.youRegen = def.regen ?? 2;
    b.youRegenTurns = def.regenTurns ?? 4;
    b.regenClock = 0;
    notes.push(`缝创 ${b.youRegenTurns} 回`);
    return notes;
  }

  if (defId === "cauterize") {
    const pay = Math.min(def.payHp ?? 4, Math.max(0, b.player.hp - 1));
    b.player.hp -= pay;
    notes.push(`自损 ${pay}`);
    if (b.youBleed > 0) {
      b.youBleed = 0;
      notes.push("裂创烙住了");
    }
    if (b.youSeal > 0 || b.youSlow > 0) {
      b.youSeal = 0;
      b.youSlow = 0;
      notes.push("脉也通了");
    }
    return notes;
  }

  if (defId === "bindwound") {
    if (b.setup > 0) {
      b.setup -= 1;
      notes.push(`回 ${healYou(b, 7)}`);
      if (b.youBleed > 0) {
        b.youBleed = 0;
        notes.push("裂创收了");
      }
      notes.push(`铺势剩 ${b.setup}`);
    } else notes.push(`回 ${healYou(b, def.heal ?? 2)}`);
    return notes;
  }

  if (defId === "comboTax") {
    const pay = Math.min(def.stackTaxHp ?? 2, Math.max(0, b.player.hp - 1));
    b.player.hp -= pay;
    b.combo += 1;
    notes.push(`付血 ${pay}`);
    notes.push(`连势 ${b.combo}`);
    if (drawOne(b)) notes.push("抽 1");
    return notes;
  }

  if (defId === "comboPay" || defId === "lateChain") {
    notes.push(...hitEnemy(b, strikeDamage(b, def.damage ?? 10, false, def), def.name + " "));
    if (defId === "lateChain" && drawOne(b)) notes.push("抽 1");
    return notes;
  }

  if (defId === "qiFlood" || defId === "lateLeech") {
    const gain = def.energyNext ?? 3;
    b.energy = Math.min(b.energyMax, b.energy + gain);
    notes.push(`回劲 ${gain} → ${b.energy}`);
    if (def.foeQiBurn) {
      b.foeQiBurn = Math.max(b.foeQiBurn, def.foeQiBurn);
      notes.push(`敌扣劲 ${b.foeQiBurn}`);
    }
    return notes;
  }

  if (defId === "lateTide") {
    b.flow = 3;
    notes.push("气脉 3");
    if (drawOne(b)) notes.push("抽 1");
    if (drawOne(b)) notes.push("抽 1");
    return notes;
  }

  if (defId === "venomFog") {
    b.bleed = Math.min(9, b.bleed + (def.bleed ?? 3));
    b.youBleed = Math.min(9, b.youBleed + 1);
    notes.push(`敌裂创 ${b.bleed}`);
    notes.push(`你裂创 ${b.youBleed}`);
    return notes;
  }

  // §16.4 同门合击卡
  if (isComboCard(defId)) {
    markComboCardPlayed(b, defId);
    notes.push(...comboCardNotes(b, defId));
    const dmg = comboCardDamage(b, defId);
    notes.push(...hitEnemy(b, strikeDamage(b, dmg, false, def), "合击 "));
    comboCardPull(b, defId);
    if (def.block) {
      b.playerBlock += def.block;
      notes.push(`格挡 ${def.block}`);
    }
    return notes;
  }

  // Generic expansion: damage / block / knock / status packs
  const spearBase = spearBreakAttackBase(b, def);
  const saberBase = saberBreakAttackBase(b, def);
  const tableBase = spearBase ?? saberBase;
  if (def.damage || tableBase != null) {
    notes.push(...hitEnemy(b, strikeDamage(b, tableBase ?? def.damage ?? 0, false, def), def.name + " "));
    if (spearBase != null) {
      const foe = targetFoe(b);
      addSpearRuler(b, spearRulerGain(foe ? Math.abs(b.player.pos - foe.pos) : 0));
    }
  }
  if (def.block) {
    const rawBlock = def.block + (pathSkillMods(battleGearId).blockExtra ?? 0) + techBlockBonus(b);
    const block = isLabV2() ? labV21BlockAdjust(b, def, rawBlock) : rawBlock;
    b.playerBlock += block;
    notes.push(`格挡 ${block}`);
  }
  if (def.heal) notes.push(`回 ${healYou(b, def.heal)}`);
  if (def.id === "auraSpear") {
    addSpearRuler(b, 1);
    notes.push("标尺 +1");
  }
  if (def.energyNext) {
    b.energy = Math.min(b.energyMax, b.energy + def.energyNext);
    notes.push(`回劲 ${def.energyNext}`);
  }
  if (def.steps) {
    const foe = targetFoe(b) ?? b.enemy;
    const ignore = hasTech(b, "ghostStep");
    const n = Math.abs(def.steps);
    const dir = def.steps > 0 ? towardDir(b.player.pos, foe.pos) : awayDir(foe.pos, b.player.pos);
    const moved = movePlayer(b, dir, n, ignore);
    if (moved.length === 0) notes.push(def.steps > 0 ? "身前无路" : "身后无路");
    else notes.push(...moved);
  }
  if (def.knock && !b.foeSkipCc) notes.push(...pushEnemy(b, def.knock, def.wall));
  if (def.pullEnemy && !b.foeSkipCc) {
    const before = Math.abs(b.player.pos - b.enemy.pos);
    notes.push(...pullUnit(b, "enemy", "player", def.pullEnemy));
    if (b.active === "chenchenlan" && Math.abs(b.player.pos - b.enemy.pos) < before) {
      b.foeDisarm = Math.max(b.foeDisarm ?? 0, 1);
      notes.push("缴手：短缴械");
    }
  }
  if (def.bleed && !b.foeDodgedHit) {
    b.bleed = Math.min(9, b.bleed + def.bleed);
    notes.push(`裂创 ${b.bleed}`);
  }
  if (def.expose) {
    b.expose += def.expose;
    notes.push(`破绽 ${b.expose}`);
  }
  if (isBreakAlign() && defId === "ultSaber" && (b.bleed ?? 0) > 0) {
    const tick = bleedTickDamage(b.bleed);
    const foe = livingFoes(b)[0];
    if (foe && tick > 0) {
      foe.hp -= tick;
      notes.push(`血祭 ${tick}`);
      syncFront(b);
    }
    b.bleed = Math.max(0, b.bleed - 1);
    notes.push(`流血 ${b.bleed}`);
  }
  if (def.frail) {
    b.frail += def.frail;
    notes.push(`滞手 ${b.frail}`);
  }
  if (def.thorns) {
    b.thorns += def.thorns;
    notes.push(`反震 ${b.thorns}`);
  }
  if (def.flow) {
    b.flow = Math.min(3, b.flow + def.flow);
    notes.push(`气脉 ${b.flow}`);
  }
  if (def.setupGain) {
    b.setup += def.setupGain;
    notes.push(`铺势 ${b.setup}`);
  }
  if (def.retainAmt && def.retainTurns) {
    b.retainAmt = Math.max(b.retainAmt, def.retainAmt);
    b.retainTurns = Math.max(b.retainTurns, def.retainTurns);
    notes.push(`铁布 ${b.retainAmt}/${b.retainTurns}`);
  }
  if (def.qiRegenSelf) {
    b.energyRegen += def.qiRegenSelf;
    notes.push(`回劲+${def.qiRegenSelf}/息`);
  }
  if (def.foeMute) {
    b.foeMute = Math.max(b.foeMute, def.foeMute);
    notes.push(`敌禁技 ${b.foeMute}`);
  }
  if (def.foeDisarm) {
    b.foeDisarm = Math.max(b.foeDisarm ?? 0, def.foeDisarm);
    notes.push(`敌缴械 ${b.foeDisarm} 息（攻击减半）`);
  }
  if (def.foeStun && !b.foeSkipCc) {
    b.foeStun = (b.foeStun ?? 0) + def.foeStun;
    notes.push(`敌眩晕 ${def.foeStun} 段`);
  }
  if (def.costDiscountNext) {
    b.costDiscountNext = (b.costDiscountNext ?? 0) + def.costDiscountNext;
    notes.push(`下张牌耗劲 -${def.costDiscountNext}`);
  }
  if (def.noBag) {
    b.youNoBag = Math.max(b.youNoBag, def.noBag);
    notes.push(`你禁药 ${b.youNoBag}`);
  }
  if (def.foeNoBag) {
    b.foeNoBag = Math.max(b.foeNoBag, def.foeNoBag);
    notes.push(`敌禁药 ${b.foeNoBag}`);
  }
  if (def.foeHandTax) {
    b.foeHandTax = Math.max(b.foeHandTax, def.foeHandTax);
    notes.push(`敌削手 ${b.foeHandTax}`);
  }
  if (def.foeQiBurn) {
    b.foeQiBurn = Math.max(b.foeQiBurn, def.foeQiBurn);
    notes.push(`敌扣劲 ${b.foeQiBurn}`);
  }
  if (def.mute) {
    b.youMute = Math.max(b.youMute, def.mute);
    notes.push(`禁技 ${b.youMute}`);
  }
  if (defId === "qiPulse" && drawOne(b)) notes.push("抽 1");
  if (defId === "setupTax" && drawOne(b)) notes.push("抽 1");
  if (String(defId).startsWith("status") && drawOne(b)) notes.push("抽 1");
  if (/^ward(Palm|Saber|Sword|Spear|Staff|Hook)2$/.test(String(defId)) && drawOne(b)) notes.push("抽 1");
  if (notes.length) return notes;

  notes.push("没有这一招");
  return notes;
}

/** §31.17 踢馆轮番：前排倒下后替补入场，重新规划敌招。 */
function tryGauntletWaveSpawn(b: Battle): boolean {
  const waveId = b.gauntletWaveEnemy;
  if (!waveId || livingFoes(b).length > 0) return false;
  const queue = b.gauntletWaveQueue ?? [];
  b.gauntletWaveEnemy = queue[0];
  b.gauntletWaveQueue = queue.length > 1 ? queue.slice(1) : undefined;
  const def = labEnemy(waveId);
  let hpMul = isLabMode() ? getLabTuning().enemyHpMul : 1;
  const hp = Math.max(8, Math.round(def.hp * hpMul));
  const unit: Unit = {
    id: def.id,
    name: def.name,
    title: def.title,
    hp,
    maxHp: hp,
    pos: def.pos,
  };
  b.foes = [unit];
  b.enemy = unit;
  b.enemyId = waveId;
  // 拆势真伤等路径可能已误标 won：替补上场必须回到可操作
  if (b.phase !== "player" && b.phase !== "lost") b.phase = "player";
  b.log.push(`【轮番】${unit.name}接力上场！`);
  b.journal.push({ side: "foe", text: `${unit.name}接力上场` });
  applyLabEnemyKit(b, "extra");
  return true;
}

/** 踢馆线：牌/结算把敌打死后，若还有替补则立即换人；不点收势也看到新人。 */
function checkWin(b: Battle): void {
  if (livingFoes(b).length === 0) {
    if (tryGauntletWaveSpawn(b)) return;
    b.enemy.hp = 0;
    b.phase = "won";
    b.log.push(`${b.enemy.name}败下。`);
  }
}

/** 多敌同时倒下/前排倒下：把活着的拉到前面，触发替补。 */
function ensureFoeAlive(b: Battle): void {
  if (b.phase !== "player") return;
  syncFront(b);
  checkWin(b);
}

export function canPlay(b: Battle, uid: string): { ok: boolean; reason?: string } {
  if (b.phase !== "player") return { ok: false, reason: "现在不是你的回合" };
  const inst = b.hand.find((c) => c.uid === uid);
  if (!inst) return { ok: false, reason: "不在手牌里" };
  const def = labCard(inst.defId);
  if (!def) return { ok: false, reason: "残谱缺损" };
  if (def.type === "skill" && b.youMute > 0) return { ok: false, reason: "禁技：这一息打不出技能" };
  const need = isLabV2() ? labV21EffectiveCost(b, def) : def.cost + (def.stackTaxQi ?? 0);
  if (b.energy < need) return { ok: false, reason: "劲力不足" };
  const schoolGate = cardPlaySchoolGate(b, inst.defId);
  if (!schoolGate.ok) return schoolGate;
  if (b.labHallLaw === "noMove" && (MOVE_CARD_IDS as CardId[]).includes(inst.defId)) {
    return { ok: false, reason: "本馆禁位移" };
  }
  if (b.labHallLaw === "mustMelee" && def.type === "attack") {
    const foe = targetFoe(b);
    const dist = foe ? Math.abs(foe.pos - b.player.pos) : 0;
    if (foe && dist !== 1) return { ok: false, reason: "本馆必须贴身" };
  }
  // §31.11 攻击距离闸（踢馆线）：攻击牌要求敌在兵刃距离内——拳 1 / 刀剑钩 2 / 枪棍 3。
  // 牌面有系别的按牌面兵刃算（助战开闸时，是助战者持自己的兵刃递招）；通用牌按场上所执。
  // 组合技例外：助战者自己会上前递招。
  if (isLabMode() && def.type === "attack" && !isComboCard(inst.defId)) {
    const cardSch = cardSchool(inst.defId);
    const school = cardSch === "any" ? battleEquippedSchool(b, b.active) : cardSch;
    const foe = targetFoe(b);
    const dist = foe ? Math.abs(foe.pos - b.player.pos) : 0;
    if (foe && isBreakAlign() && school === "spear") {
      if (spearReachDamage(dist) == null) {
        return { ok: false, reason: `贴身使不开枪（需 2–4 格，敌在 ${dist} 格）` };
      }
    } else if (foe && dist > SCHOOL_REACH[school]) {
      const reach = SCHOOL_REACH[school];
      return { ok: false, reason: `够不着（${WEAPON_NAME[school]}打到 ${reach} 格，敌在 ${dist} 格）` };
    }
  }
  if (isLabV2()) {
    const ug = ultimateGate(b, def);
    if (!ug.ok) return { ok: false, reason: ug.reason };
    const cg = comboPlayGate(b, inst.defId);
    if (!cg.ok) return { ok: false, reason: cg.reason };
    if (!simV2CanPlayResources(b, def.comboCost ?? 0, def.flowCost ?? 0, def.setupCost ?? 0))
      return { ok: false, reason: "势不够" };
  } else {
    if ((def.comboCost ?? 0) > 0 && b.combo < (def.comboCost ?? 0)) return { ok: false, reason: "连势不够" };
    if ((def.flowCost ?? 0) > 0 && b.flow < (def.flowCost ?? 0)) return { ok: false, reason: "气脉不够" };
    if ((def.setupCost ?? 0) > 0 && b.setup < (def.setupCost ?? 0)) return { ok: false, reason: "铺势不够" };
  }
  return { ok: true };
}

function snapshot(b: Battle, notes: string[], legal: boolean, reason?: string): Preview {
  return {
    playerHp: b.player.hp,
    playerBlock: b.playerBlock,
    enemyHp: Math.max(0, b.enemy.hp),
    enemyBlock: b.enemyBlock,
    enemyPos: b.enemy.pos,
    playerPos: b.player.pos,
    nextDamage: b.nextDamage,
    stakes: [...b.stakes],
    traps: [...b.traps],
    enemyDies: b.enemy.hp <= 0,
    notes,
    legal,
    reason,
  };
}

function applyPlayedAttackMomentum(b: Battle, defId: CardId, notes: string[]): void {
  if (labCard(defId).type !== "attack") return;
  const extra = applyBreakMomentumOnAttack(b);
  notes.push(...extra.notes);
  if (extra.notes.length) {
    b.lastHitRead = [b.lastHitRead, ...extra.notes].filter(Boolean).join(" · ");
  }
  if (extra.knock > 0) notes.push(...pushEnemy(b, extra.knock));
}

export function previewCard(b: Battle, uid: string): Preview {
  const gate = canPlay(b, uid);
  const inst = b.hand.find((c) => c.uid === uid);
  if (!inst) return snapshot(b, [], false, gate.reason);
  const next = cloneBattle(b);
  const notes = applyCard(next, inst.defId);
  applyPlayedAttackMomentum(next, inst.defId, notes);
  return snapshot(next, notes, gate.ok, gate.reason);
}

export function playCard(b: Battle, uid: string): Battle {
  const inst0 = b.hand.find((c) => c.uid === uid);
  const def0 = inst0 ? labCard(inst0.defId) : undefined;
  const gate = canPlay(b, uid);
  if (!gate.ok) {
    if (isLabV2() && def0?.ultimate) {
      b.v2UltGateAttempts = (b.v2UltGateAttempts ?? 0) + 1;
      b.v2UltGateBlocks = (b.v2UltGateBlocks ?? 0) + 1;
    }
    return b;
  }
  const next = cloneBattle(b);
  next.foeSkipCc = false;
  next.foeDodgedHit = false;
  const inst = next.hand.find((c) => c.uid === uid);
  if (!inst) return b;
  const def = labCard(inst.defId);
  if (isLabV2() && def.ultimate) next.v2UltGateAttempts = (next.v2UltGateAttempts ?? 0) + 1;
  if (isComboUnlockCard(next, inst.defId)) {
    next.v2ComboUnlockPlays = (next.v2ComboUnlockPlays ?? 0) + 1;
  }
  if (isLabMode()) next.v2PlayerActions = (next.v2PlayerActions ?? 0) + 1;
  const notes = applyCard(next, inst.defId);
  pushCardPlayFx(next, def);
  applyPlayedAttackMomentum(next, inst.defId, notes);
  const spend = isLabV2() ? labV21EffectiveCost(next, def) : def.cost + (def.stackTaxQi ?? 0);
  next.energy -= spend;
  if (isLabV2()) simV2SpendResources(next, def.comboCost ?? 0, def.flowCost ?? 0, def.setupCost ?? 0);
  else {
    if (def.comboCost) next.combo = Math.max(0, next.combo - def.comboCost);
    if (def.flowCost) next.flow = Math.max(0, next.flow - def.flowCost);
    if (def.setupCost) next.setup = Math.max(0, next.setup - def.setupCost);
  }
  if (def.type === "attack") {
    next.attacksThisTurn += 1;
    next.v2AttackPlays = (next.v2AttackPlays ?? 0) + 1;
    const field = battleEquippedSchool(next, next.active);
    const cs = cardSchool(inst.defId);
    if (cs !== "any" && cs !== field) next.v2OffSchoolAtk = (next.v2OffSchoolAtk ?? 0) + 1;
    // §31.11 棍系连击眩晕：本回合每第 3 张攻击，敌晕 1 段（踢馆线）。
    if (isLabV2() && battleEquippedSchool(next, next.active) === "staff" && next.attacksThisTurn % 3 === 0 && !next.foeSkipCc) {
      next.foeStun = (next.foeStun ?? 0) + 1;
      next.journal.push({ side: "you", text: "连击成势——敌眩晕 1 段" });
    }
  }
  // §31.11 减费手段：搓手等「下张牌耗劲 -N」在此兑现
  if ((next.costDiscountNext ?? 0) > 0 && def.id !== "weave") next.costDiscountNext = 0;
  if (def.type === "skill" && (next.youSkillTax ?? 0) > 0) next.youSkillTax = 0;
  next.lastPlay = def.type;
  const still = next.hand.findIndex((c) => c.uid === uid);
  if (still >= 0) {
    next.hand.splice(still, 1);
    next.discardPile.push(inst);
  }
  next.playedThisTurn.push(def.name);
  const hitFoe = notes.some((n) => /\d/.test(n) && (n.includes("掌") || n.includes("伤") || n.includes("刺") || n.includes("砍")));
  simV2OnCard(next, inst.defId, notes, hitFoe);
  labV21AfterCard(next, inst.defId);
  note(next, "you", `${def.name}：${notes.join("，") || "无效果"}`);
  checkWin(next);
  return next;
}

function drawToHand(b: Battle): void {
  while (b.hand.length < handCap(b)) {
    if (!drawOne(b)) break;
  }
}

/** 收势后回补：拆招开踢摸 ⌈上限/2⌉；其它模式补满上限。 */
function drawRefill(b: Battle): void {
  if (isLabMode() && isBreakAlign()) {
    const n = handRefillAmount(handCap(b));
    for (let i = 0; i < n; i++) {
      if (!drawOne(b)) break;
    }
    return;
  }
  drawToHand(b);
}

function hitPlayer(b: Battle, raw: number, verb: string): void {
  const idx = b.v2ResolveIntentIdx ?? 0;
  if (stressMetaAt(b, idx) && b.labAssistActive && stressTargetsAssist(b)) {
    hitAssist(b, raw, verb);
    return;
  }
  // §31.11 缴械：敌攻击伤害减半（钩系施加）
  if ((b.foeDisarm ?? 0) > 0) raw = Math.max(1, Math.floor(raw / 2));
  const cut = b.frail > 0 ? 3 : 0;
  const sway = b.youSway > 0 ? 3 : 0;
  const gift = b.youGift > 0 ? 4 : 0;
  if (b.youGift > 0) b.youGift = 0;
  const extraThorn = companionOn(b) && b.active === "sapper" && b.playerBlock > 0 ? 2 : 0;
  const incoming = Math.max(1, simV2Incoming(raw, b) - cut + sway + gift - (b.active === "zhangshoushan" && b.stakes.length > 0 ? 2 : 0));
  const blocked = Math.min(b.playerBlock, incoming);
  const taken = incoming - blocked;
  b.playerBlock -= blocked;
  b.player.hp -= taken;
  if (taken > 0) b.labFoeTurnPlayerHit = true;
  simV2OnHitPlayer(b, taken);
  const line =
    taken === 0
      ? `${b.enemy.name}${verb}${incoming}，全部卸掉。`
      : `${b.enemy.name}${verb}${incoming}。格挡 ${blocked}，你受 ${taken}。`;
  note(b, "foe", line);
  if (raw > 0 && (b.thorns > 0 || extraThorn > 0 || hasTech(b, "rebound"))) {
    const back = b.thorns + extraThorn + (hasTech(b, "rebound") ? 3 : 0);
    if (back > 0) {
      const notes = hitEnemy(b, back, "回敬 ", false);
      note(b, "you", notes.join("，"));
      checkWin(b);
    }
  }
  if (raw > 0) {
    const back = tryRiposte(b, "you");
    if (back.length) {
      note(b, "you", back.join("，"));
      checkWin(b);
    }
  }
  if (b.player.hp <= 0) collapseOrDeathSwap(b);
}

/**
 * §31.12 败判看全队（踢馆线）：场上队员倒下时，后场还有活人则队友抢上，
 * 全员阵亡才算输。阵亡者本场出局（不回后场）；顶上者不享登场奖励（倒下是代价）。
 */
function collapseOrDeathSwap(b: Battle): void {
  if (b.player.hp > 0) return;
  b.player.hp = 0;
  if (isLabMode()) {
    const mate = b.bench.find((m) => m.hp > 0);
    if (mate) {
      const fallen = b.player.name;
      const prevActive = b.active;
      b.bench = b.bench.filter((m) => m.id !== mate.id);
      applyFighter(b, mate);
      b.playerBlock = 0;
      battleGearId = battleMateGearId(b, mate.id);
      if (b.labMateTechs?.[mate.id]?.length) b.techniques = [...b.labMateTechs[mate.id]!];
      rebindMindStats(b, prevActive);
      b.log.push(`${fallen} 倒下，${b.player.name} 抢入场内顶上！`);
      note(b, "you", `${fallen} 倒了——${b.player.name} 顶上！`);
      pushFx(b, "swap");
      return;
    }
  }
  b.phase = "lost";
  note(b, "you", "你倒了。");
}

/* ------------------------------------------------------------------ */
/* §31.12 助战符：一次性召唤的客座好手（与同行分家）。实体一格、一回合、上场放一手本系绝活。 */

/** 合法落点：全场任意空格（放敌身后当墙，是拳系连招的核心用法）。 */
export function legalSummonCells(b: Battle): number[] {
  const out: number[] = [];
  for (let i = 0; i < BOARD_SIZE; i++) if (!occupied(b, i)) out.push(i);
  return out;
}

/** 召唤：功力（HP）随主角兵刃品阶，不带武器技能。 */
export function summonAssist(b: Battle, school: WeaponId, pos: number): Battle {
  if (!isLabV2() || b.phase !== "player") return b;
  if (b.labSummon && b.labSummon.hp > 0) return b;
  if (!legalSummonCells(b).includes(pos)) return b;
  const def = SUMMON_DEFS[school];
  const gear = gearById(battleMateGearId(b, b.active));
  const grade = gear?.grade ?? 3;
  const maxHp = def.hp(grade);
  const next = cloneBattle(b);
  next.labSummon = { school, name: def.name, pos, hp: maxHp, maxHp, taunt: school === "palm" };
  next.log.push(`${def.name}（${def.title}）站上第 ${pos + 1} 步。`);
  next.journal.push({ side: "you", text: `${def.name} 上场 · ${def.skill}` });
  if (school === "saber") {
    next.expose += 2;
    next.log.push(`${def.name}掠影剜出破绽 +2。`);
  } else if (school === "sword") {
    next.bleed = Math.min(9, next.bleed + 3);
    next.log.push(`${def.name}一剑三创：敌裂创 ${next.bleed}。`);
  } else if (school === "spear") {
    const dir = next.enemy.pos > next.player.pos ? 1 : -1;
    const to = next.enemy.pos + dir;
    if (to >= 0 && to < BOARD_SIZE && !occupied(next, to, next.enemy.id)) {
      next.enemy.pos = to;
      syncFront(next);
      next.log.push(`${def.name}一枪挑退，敌退到第 ${to + 1} 步。`);
    } else {
      next.log.push(`${def.name}挺枪逼位，敌没退路。`);
    }
  } else if (school === "staff") {
    next.foeStun = (next.foeStun ?? 0) + 1;
    next.log.push(`${def.name}禅杖顿地：敌眩晕 1 段。`);
  } else if (school === "hook") {
    next.foeDisarm = (next.foeDisarm ?? 0) + 2;
    next.log.push(`${def.name}链钩一绞：敌缴械 2 息。`);
  }
  pushFx(next, "resonance");
  return next;
}

/** 召唤体承伤。 */
export function hitSummon(b: Battle, raw: number, verb: string): void {
  const s = b.labSummon;
  if (!s) return;
  const incoming = Math.max(1, simV2Incoming(raw, b));
  s.hp = Math.max(0, s.hp - incoming);
  b.labFoeTurnAssistHit = true;
  b.log.push(`${s.name}${verb}${incoming}（助战 ${s.hp}/${s.maxHp}）`);
  if (s.hp <= 0) {
    b.log.push(`${s.name} 散了。`);
    b.journal.push({ side: "foe", text: `${s.name} 被打散` });
    b.labSummon = null;
  }
}

/** §31.12 助战入拆招：召唤体替你化掉的攻击段，算你拆（得势 +1、计入已拆、§31.13 同吃反拆真伤）。 */
function summonBreakCredit(b: Battle, what: string): void {
  b.v2BreakCount = (b.v2BreakCount ?? 0) + 1;
  addQi(b, 1);
  pushFx(b, "break");
  b.journal.push({ side: "you", text: `拆！${what}` });
  b.log.push(`【拆】${what}`);
  b.v2TurnBreakCount = (b.v2TurnBreakCount ?? 0) + 1;
  const chain = b.v2TurnBreakCount >= 2;
  let extra = chain ? BREAK_COUNTER_CHAIN : 0;
  if (chain) addQi(b, 1);
  grantBreakMomentum(b, extra);
}

/** 玩家回合开始时召唤体离场（一回合约定）。 */
export function dismissSummonAtTurnStart(b: Battle): void {
  if (!b.labSummon) return;
  b.log.push(`${b.labSummon.name} 拱手走了。`);
  b.labSummon = null;
}

export function chargeSteps(b: Battle): number {
  if (b.intent.kind !== "charge") return 0;
  const steps = b.intent.steps - (hasTech(b, "shortCharge") ? 1 : 0);
  return Math.max(1, steps);
}

export function chargePath(b: Battle): number[] {
  if (b.intent.kind !== "charge") return [];
  const path: number[] = [];
  let pos = b.enemy.pos;
  const steps = chargeSteps(b);
  const dir = towardDir(pos, b.player.pos);
  for (let i = 0; i < steps; i++) {
    const next = pos + dir;
    if (next < 0 || next >= BOARD_SIZE) break;
    if (next === b.player.pos) {
      path.push(next);
      break;
    }
    if (occupied(b, next, b.enemy.id)) break;
    pos = next;
    path.push(pos);
  }
  return path;
}

function dangerCellsForIntentOnly(b: Battle, intent: Intent): number[] {
  // §31.9 打击/抢步的红格锁定在「回合开始你站的那一格/那一条线」——出红格才算拆，红圈不再追着你跑。
  const lockPos = isLabV2() ? (b.v2Turn?.turnStartPos ?? b.player.pos) : b.player.pos;
  if (intent.kind === "strike") {
    // §31.14 打击红格 = 身前兵刃覆盖（身后打不到；显示与结算同一公式）
    if (isLabV2()) return facingReachCells(b.enemy.pos, lockPos, enemyReach(b));
    return [lockPos];
  }
  if (intent.kind === "charge") {
    const saved = b.intent;
    b.intent = intent;
    const path = chargePath(b);
    b.intent = saved;
    // §31.12 红格必须覆盖所有能打到你的格子：冲锋终点（或原地）的兵刃覆盖圈也算——
    // 否则「红格不在我这儿却被打到」（终点贴脸判定在结算里是有的，显示上漏了）。
    if (isLabV2()) {
      const end = path.length ? path[path.length - 1]! : b.enemy.pos;
      const set = new Set(path);
      for (const c of facingReachCells(end, lockPos, enemyReach(b))) set.add(c);
      return [...set];
    }
    return path;
  }
  if (intent.kind === "stake") {
    const dir = awayDir(b.player.pos, b.enemy.pos);
    return [b.enemy.pos + dir];
  }
  if (intent.kind === "trap") return [b.player.pos];
  if (intent.kind === "lunge") {
    if (!isLabV2()) {
      const dir = towardDir(b.enemy.pos, lockPos);
      const step = b.enemy.pos + dir;
      if (Math.abs(b.enemy.pos - lockPos) === 1 || step === lockPos) return [lockPos];
      return step >= 0 && step < BOARD_SIZE ? [step] : [];
    }
    // §31.12 抢步红格 = 落点身前兵刃覆盖（身后打不到）
    let land = b.enemy.pos;
    if (Math.abs(b.enemy.pos - lockPos) > 1) {
      const step = b.enemy.pos + towardDir(b.enemy.pos, lockPos);
      if (step >= 0 && step < BOARD_SIZE && !occupied(b, step, b.enemy.id)) land = step;
    }
    return facingReachCells(land, lockPos, enemyReach(b));
  }
  if (intent.kind === "pull") {
    const cells: number[] = [];
    let pos = b.player.pos;
    for (let i = 0; i < intent.steps; i++) {
      const dir = b.enemy.pos > pos ? 1 : -1;
      const next = pos + dir;
      if (next === b.enemy.pos || occupied(b, next, b.player.id)) break;
      pos = next;
      cells.push(pos);
    }
    return cells;
  }
  if (intent.kind === "swap" && adjacent(b)) return [b.player.pos, b.enemy.pos];
  if (intent.kind === "barrage") {
    // §31.14 连打：红格 = 身前兵刃覆盖（收势跑出圈 / 到身后 = 全落空）
    if (isLabV2()) return facingReachCells(b.enemy.pos, lockPos, enemyReach(b));
    return [b.player.pos];
  }
  if (intent.kind === "bleedcut" || intent.kind === "seal" || intent.kind === "shatter") return [b.player.pos];
  if (intent.kind === "pestle" || (intent.kind === "sig" && (intent.damage ?? 0) > 0)) {
    if (isLabV2()) return facingReachCells(b.enemy.pos, lockPos, enemyReach(b));
    return [lockPos];
  }
  if (intent.kind === "retreat") {
    const land = retreatLandPos(b, intent.steps);
    return chaseCellsFromLand(land);
  }
  return [];
}

export function dangerCellsForIntent(b: Battle, intent: Intent): number[] {
  const saved = b.intent;
  b.intent = intent;
  const cells = dangerCellsForIntentOnly(b, intent);
  b.intent = saved;
  return cells;
}

export function dangerCells(b: Battle): number[] {
  if (isLabV2()) return [...new Set(projectedQueueThreat(b).flat())];
  return dangerCellsForIntentOnly(b, b.intent);
}

/**
 * §31.15 队列级威胁投影：逐段推进敌位投影，后手段的红格按先手落位后的位置画。
 * 之前每段都按初始位算——「抢步+抢步」第二段显示的红格比实际落点短一步，
 * 你站在显示的红格外照样挨打（截图反馈的根因）。显示、破招判定、结算现在同一条投影链。
 */
export function projectedQueueThreat(b: Battle): number[][] {
  const queue = b.intents.length ? b.intents : [b.intent];
  const out: number[][] = [];
  const savedPos = b.enemy.pos;
  try {
    for (const intent of queue) {
      out.push(dangerCellsForIntentOnly(b, intent));
      advanceThreatProjection(b, intent);
    }
  } finally {
    b.enemy.pos = savedPos;
  }
  return out;
}

/** 与 resolveLunge/resolveCharge/resolveSwap 的走位同公式（只挪投影、不出伤）。 */
function advanceThreatProjection(b: Battle, intent: Intent): void {
  if (!isLabV2()) return;
  if (intent.kind === "lunge") {
    const lockPos = b.v2Turn?.turnStartPos ?? b.player.pos;
    if (Math.abs(b.enemy.pos - lockPos) > 1) {
      const step = b.enemy.pos + towardDir(b.enemy.pos, lockPos);
      if (step >= 0 && step < BOARD_SIZE && !occupied(b, step, b.enemy.id)) b.enemy.pos = step;
    }
  } else if (intent.kind === "charge") {
    const steps = chargeSteps(b);
    const dir = towardDir(b.enemy.pos, b.player.pos);
    for (let i = 0; i < steps; i++) {
      const next = b.enemy.pos + dir;
      if (next < 0 || next >= BOARD_SIZE) break;
      if (next === b.player.pos || occupied(b, next, b.enemy.id)) break;
      b.enemy.pos = next;
    }
  } else if (intent.kind === "swap" && !adjacent(b)) {
    // 非贴脸的换位 = 近一步；贴脸互换取决于你收势位，不可预演（罕见，按不挪处理）
    const next = b.enemy.pos + towardDir(b.enemy.pos, b.player.pos);
    if (next >= 0 && next < BOARD_SIZE && !occupied(b, next, b.enemy.id)) b.enemy.pos = next;
  } else if (intent.kind === "retreat") {
    b.enemy.pos = retreatLandPos(b, intent.steps);
  }
}

function retreatLandPos(b: Battle, steps: number): number {
  const dir = awayDir(b.player.pos, b.enemy.pos);
  let pos = b.enemy.pos;
  for (let i = 0; i < steps; i++) {
    const next = pos + dir;
    if (next < 0 || next >= BOARD_SIZE || occupied(b, next, b.enemy.id)) break;
    pos = next;
  }
  return pos;
}

function chaseCellsFromLand(land: number): number[] {
  const cells: number[] = [];
  for (const c of [land - 1, land + 1]) {
    if (c >= 0 && c < BOARD_SIZE) cells.push(c);
  }
  return cells;
}

/**
 * §31.12 意图条显示「最终实收伤害」，预览=结算（D4 延伸到数字）：
 * 与 hitPlayer 同一套算法——缴械减半 → 鏖战加伤 → 滞手/醉态/礼数。
 * 返回 total 与逐项拆解，UI 显示 total，悬停给 parts。
 */
export function intentIncoming(b: Battle, intent: Intent): { total: number; parts: string[] } {
  if (!("damage" in intent) || !(intent.damage ?? 0)) return { total: 0, parts: [] };
  let raw = intent.damage ?? 0;
  const parts: string[] = [`基础 ${raw}`];
  if ((b.foeDisarm ?? 0) > 0) {
    raw = Math.max(1, Math.floor(raw / 2));
    parts.push(`缴械减半 → ${raw}`);
  }
  const grudge = isLabV2() ? (b.v2GrudgeBonus ?? 0) : 0;
  if (grudge) parts.push(`鏖战 +${grudge}`);
  let total = raw + grudge;
  if (b.frail > 0) {
    total -= 3;
    parts.push("滞手 -3");
  }
  if (b.youSway > 0) {
    total += 3;
    parts.push("醉态 +3");
  }
  if (b.youGift > 0) {
    total += 4;
    parts.push("礼数 +4");
  }
  return { total: Math.max(1, total), parts };
}

function resolveCharge(b: Battle, damage: number): void {
  const steps = chargeSteps(b);
  const dir = towardDir(b.enemy.pos, b.player.pos);
  let hits = false;
  for (let i = 0; i < steps; i++) {
    const next = b.enemy.pos + dir;
    if (next < 0 || next >= BOARD_SIZE) break;
    if (next === b.player.pos) {
      hits = true;
      break;
    }
    if (isComboRulesEnabled() && b.labAssistPos != null && next === b.labAssistPos) {
      hitAssist(b, damage, "冲锋 ");
      hits = true;
      break;
    }
    // §31.12 召唤体挡冲锋 = 身位卡断，算拆。
    if (isLabV2() && b.labSummon && b.labSummon.hp > 0 && next === b.labSummon.pos) {
      summonBreakCredit(b, `${b.labSummon.name} 身位卡断冲锋`);
      hitSummon(b, damage, "冲锋 ");
      hits = true;
      break;
    }
    if (occupied(b, next, b.enemy.id)) break;
    b.enemy.pos = next;
  }
  // §31.12 终点贴脸：身前兵刃覆盖才算撞上（身后打不到）
  if (!hits && isLabV2() && enemyCanHitPlayerPos(b, b.player.pos)) hits = true;
  else if (!hits && !isLabV2() && Math.abs(b.enemy.pos - b.player.pos) <= 1) hits = true;
  if (hits) hitPlayer(b, damage, "冲锋 ");
  else b.log.push(`${b.enemy.name}冲过去了。`);
}

function resolveStake(b: Battle): void {
  const dir = awayDir(b.player.pos, b.enemy.pos);
  const at = b.enemy.pos + dir;
  if (at >= 0 && at < BOARD_SIZE && !occupied(b, at, b.enemy.id)) {
    const school = ENEMY_WEAPON[b.enemyId];
    addStake(b, at, enemyPlantHits(school, b.labEnemyGrade));
    b.log.push(`${b.enemy.name}落了一根桩。`);
    return;
  }
  b.log.push(`${b.enemy.name}桩没落下。`);
}

function resolveTrap(b: Battle): void {
  const at = b.player.pos;
  if (!b.traps.includes(at)) b.traps.push(at);
  b.log.push(`${b.enemy.name}在第 ${at + 1} 步下了机。`);
}

function resolveLunge(b: Battle, damage: number): void {
  if (isLabV2()) {
    // §31.14 抢步扑的是「回合开始你站的那条线」（锁定招），与红格同一公式：
    // 落点 = 朝锁定格进一步；命中 = 你的收势格在落点的兵刃圈内。你挪走了，他就扑空。
    const lockPos = b.v2Turn?.turnStartPos ?? b.player.pos;
    if (Math.abs(b.enemy.pos - lockPos) > 1) {
      const step = b.enemy.pos + towardDir(b.enemy.pos, lockPos);
      if (step >= 0 && step < BOARD_SIZE && !occupied(b, step, b.enemy.id)) b.enemy.pos = step;
    }
    if (enemyCanHitPlayerPos(b, b.player.pos)) hitPlayer(b, damage, "抢步 ");
    else b.log.push(`${b.enemy.name}抢了个空。`);
    return;
  }
  if (!adjacent(b)) {
    const next = b.enemy.pos + towardDir(b.enemy.pos, b.player.pos);
    if (next >= 0 && next < BOARD_SIZE && !occupied(b, next, b.enemy.id)) b.enemy.pos = next;
  }
  if (Math.abs(b.enemy.pos - b.player.pos) <= 1) hitPlayer(b, damage, "抢步 ");
  else b.log.push(`${b.enemy.name}抢空了。`);
}

function resolveSwap(b: Battle): void {
  if (!adjacent(b)) {
    const next = b.enemy.pos + towardDir(b.enemy.pos, b.player.pos);
    if (next >= 0 && next < BOARD_SIZE && !occupied(b, next, b.enemy.id)) {
      b.enemy.pos = next;
      b.log.push(`${b.enemy.name}近了一步。`);
      return;
    }
    b.log.push(`${b.enemy.name}换不了。`);
    return;
  }
  const p = b.player.pos;
  b.player.pos = b.enemy.pos;
  b.enemy.pos = p;
  b.log.push(`${b.enemy.name}和你换了位置。`);
}

function resolveAllIntents(b: Battle): void {
  if (isLabV2()) {
    simV2ResolveIntentQueue(b, (intent, idx) => {
      // §31.12 拳助嘲讽：在场时敌第一段攻击只认铁牛——替你挡下且算你拆。
      const sm = b.labSummon;
      if (sm && sm.hp > 0 && sm.taunt && "damage" in intent && (intent.damage ?? 0) > 0) {
        sm.taunt = false;
        summonBreakCredit(b, `${sm.name} 吸仇挡下${intent.damage}`);
        hitSummon(b, intent.damage ?? 0, "挡 ");
        return;
      }
      // §31.9 死士符：替玩家挡下本回合第一段攻击并反扑 8。
      if (b.labDeathSquad && "damage" in intent && (intent.damage ?? 0) > 0) {
        b.labDeathSquad = false;
        note(b, "you", `死士挡下${intent.damage}，反扑 8`);
        hitEnemy(b, 8, "死士反扑 ");
        return;
      }
      b.v2ResolveIntentIdx = idx;
      b.enemyEnergy = Math.max(0, b.enemyEnergy - intentCost(intent));
      if (idx > 0) note(b, "foe", `${b.enemy.name}接招：${labelIntent(intent)}`);
      resolveIntent(b);
    });
    // 死士在场但没挡到招：收势前主动出手一次。
    if (b.labDeathSquad && b.phase === "player") {
      b.labDeathSquad = false;
      note(b, "you", "死士抢出一拳");
      hitEnemy(b, 8, "死士 ");
    }
    b.labDeathSquad = false;
    return;
  }
  const queue = b.intents.length ? [...b.intents] : [b.intent];
  for (let i = 0; i < queue.length; i++) {
    if (b.phase !== "player") break;
    b.intent = queue[i];
    b.enemyEnergy = Math.max(0, b.enemyEnergy - intentCost(queue[i]));
    if (i > 0) note(b, "foe", `${b.enemy.name}接招：${labelIntent(queue[i])}`);
    resolveIntent(b);
  }
}

function resolveIntent(b: Battle): void {
  const intent = b.intent;
  if (intent.kind === "strike") {
    // §31.14 打击按身前兵刃结算：够不着或在身后 = 劈空（与红格同一公式）
    if (isLabV2() && !enemyCanHitPlayerPos(b, b.player.pos)) {
      b.log.push(`${b.enemy.name}劈了个空。`);
      b.journal.push({ side: "you", text: "他劈空了" });
    } else {
      hitPlayer(b, intent.damage, "劈 ");
      applyEnemyOnHitRiders(b);
    }
  } else if (intent.kind === "charge") resolveCharge(b, intent.damage);
  else if (intent.kind === "stake") {
    resolveStake(b);
    if (b.labEnemyGrade && ENEMY_WEAPON[b.enemyId] === "staff") {
      const extra = b.labEnemyGrade === "shen" ? 4 : b.labEnemyGrade === "xuan" ? 3 : 2;
      b.enemyBlock = Math.min(24, b.enemyBlock + extra);
      note(b, "foe", `${b.enemy.name}借桩加挡 ${extra}。`);
    }
  } else if (intent.kind === "pull") {
    const notes = pullUnit(b, "player", "enemy", intent.steps);
    note(b, "foe", notes[0] ?? `${b.enemy.name}缆没拉住。`);
    if (b.labEnemyGrade && ENEMY_WEAPON[b.enemyId] === "hook" && b.hand.length) {
      const n = b.labEnemyGrade === "shen" ? 2 : 1;
      for (let i = 0; i < n && b.hand.length; i++) {
        const card = b.hand.splice(Math.floor(Math.random() * b.hand.length), 1)[0];
        if (card) b.discardPile.push(card);
      }
      note(b, "foe", `${b.enemy.name}绊钩卸了你的牌。`);
    }
  } else if (intent.kind === "trap") resolveTrap(b);
  else if (intent.kind === "windup") note(b, "foe", `${b.enemy.name}在蓄。`);
  else if (intent.kind === "lunge") resolveLunge(b, intent.damage);
  else if (intent.kind === "barrage") {
    // §31.14 连打守身前兵刃：跑出圈或到身后 = 全落空
    if (isLabV2() && !enemyCanHitPlayerPos(b, b.player.pos)) {
      b.log.push(`${b.enemy.name}连打够不着你，全落空。`);
      b.journal.push({ side: "you", text: "连打落空" });
    } else {
      for (let i = 0; i < intent.hits; i++) {
        if (b.phase !== "player") break;
        hitPlayer(b, intent.damage, `连打${i + 1} `);
      }
    }
  } else if (intent.kind === "guard") {
    const before = b.enemyBlock;
    b.enemyBlock = Math.min(ENEMY_BLOCK_CAP, b.enemyBlock + intent.block);
    const gained = b.enemyBlock - before;
    note(b, "foe", `${b.enemy.name}架住了 ${gained}${b.enemyBlock >= ENEMY_BLOCK_CAP ? "（已顶满）" : ""}。`);
  } else if (intent.kind === "bleedcut") {
    hitPlayer(b, intent.damage, "刀创 ");
    applyEnemyOnHitRiders(b);
    if (b.phase === "player") {
      b.youBleed = Math.min(9, b.youBleed + intent.bleed);
      note(b, "foe", `你裂创 ${b.youBleed}`);
    }
  } else if (intent.kind === "counter") {
    armRiposte(b, "foe", intent.form);
    note(b, "foe", `${b.enemy.name}埋下${riposteName(intent.form)} · ${b.foeRiposteTurns} 回。`);
  } else if (intent.kind === "mend") {
    const foe = targetFoe(b) ?? b.enemy;
    const before = foe.hp;
    foe.hp = Math.min(foe.maxHp, foe.hp + intent.heal);
    b.bleed = 0;
    syncFront(b);
    note(b, "foe", `${b.enemy.name}金创回 ${foe.hp - before}，创口收了。`);
  } else if (intent.kind === "seal") {
    b.youSeal += 1;
    const slow = b.labEnemyGrade && ENEMY_WEAPON[b.enemyId] === "sword" ? 3 : 2;
    b.youSlow = Math.max(b.youSlow, slow);
    note(b, "foe", `${b.enemy.name}点了你的脉。封脉 ${b.youSeal}，滞步 ${b.youSlow}。`);
  } else if (intent.kind === "breathe") {
    const before = b.enemyEnergy;
    b.enemyEnergy = Math.min(b.enemyEnergyMax, b.enemyEnergy + intent.amount);
    note(b, "foe", `${b.enemy.name}吐纳，敌劲 ${before}→${b.enemyEnergy}。`);
  } else if (intent.kind === "shatter") {
    const before = b.playerBlock;
    b.playerBlock = Math.max(0, b.playerBlock - intent.amount);
    const cut = before - b.playerBlock;
    note(b, "foe", cut > 0 ? `${b.enemy.name}裂盾 ${cut}。` : `${b.enemy.name}裂盾，架势已空。`);
  } else if (intent.kind === "retreat") {
    resolveRetreat(b, intent.steps);
  } else if (intent.kind === "pestle") {
    if (isLabV2() && !enemyCanHitPlayerPos(b, b.player.pos)) {
      b.log.push(`${b.enemy.name}韦陀杵打空。`);
    } else {
      hitPlayer(b, intent.damage, "韦陀杵 ");
      if (!(b.v2BrokenSegments ?? []).includes(b.v2ResolveIntentIdx ?? -1)) {
        b.foeStun = (b.foeStun ?? 0) + 1;
        note(b, "foe", `${b.enemy.name}杵中，你眩了 1 段。`);
      }
    }
  } else if (intent.kind === "dust") {
    b.youDust = 1;
    note(b, "foe", `${b.enemy.name}迷了你的眼。下一段攻击须贴身。`);
  } else if (intent.kind === "shackle") {
    if (Math.abs(b.player.pos - b.enemy.pos) <= 1) {
      b.youSlow = Math.max(b.youSlow, 1);
      note(b, "foe", `${b.enemy.name}锁链套上，你滞步。`);
    } else {
      note(b, "foe", `${b.enemy.name}锁链没套住。`);
    }
  } else if (intent.kind === "dodge") {
    b.foeDodge = 1;
    note(b, "foe", `${b.enemy.name}闪身，下一记卡面伤会落空。`);
  } else if (intent.kind === "endure") {
    b.foeEndure = 1;
    note(b, "foe", `${b.enemy.name}沉腰霸体，下一记打得动但推不动。`);
  } else if (intent.kind === "sig") {
    resolveSignature(b, intent.id);
  } else resolveSwap(b);
}

function resolveRetreat(b: Battle, steps: number): void {
  const dir = awayDir(b.player.pos, b.enemy.pos);
  let moved = 0;
  for (let i = 0; i < steps; i++) {
    const next = b.enemy.pos + dir;
    if (next < 0 || next >= BOARD_SIZE || occupied(b, next, b.enemy.id)) break;
    b.enemy.pos = next;
    moved += 1;
  }
  note(b, "foe", moved ? `${b.enemy.name}撤了 ${moved} 格。` : `${b.enemy.name}无路可撤。`);
}

function resolveSignature(b: Battle, id: string): void {
  const sig = SIGNATURE_BREAK[id as EnemySigId];
  const label = sig?.label ?? "绝招";
  if (id === "luohan-array" || id === "staff-circle") {
    resolveStake(b);
    if (id === "luohan-array") resolveStake(b);
    if (id === "staff-circle") {
      const extra = b.enemy.pos + towardDir(b.enemy.pos, b.player.pos);
      if (extra >= 0 && extra < BOARD_SIZE && !b.stakes.includes(extra)) {
        addStake(b, extra, enemyPlantHits(ENEMY_WEAPON[b.enemyId], b.labEnemyGrade));
      }
    }
    note(b, "foe", `${b.enemy.name}使出${label}。`);
    return;
  }
  if (id === "vajra-ward") {
    b.enemyBlock = Math.min(24, b.enemyBlock + 12);
    b.thorns = Math.max(b.thorns, 3);
    note(b, "foe", `${b.enemy.name}金刚罩，挡 12。`);
    return;
  }
  if (id === "flower-seal") {
    b.youMute = Math.max(b.youMute, 1);
    b.youNoBag = Math.max(b.youNoBag ?? 0, 1);
    note(b, "foe", `${b.enemy.name}拈花，你这一息抽不出牌。`);
    return;
  }
  if (id === "snare") {
    b.youSlow = Math.max(b.youSlow, 1);
    note(b, "foe", `${b.enemy.name}绊索，你滞步。`);
    return;
  }
  if (id === "oil") {
    resolveTrap(b);
    note(b, "foe", `${b.enemy.name}泼了火油。`);
    return;
  }
  if (id === "chaos-cut" || id === "night-veil") {
    const dmg = sig?.intent.kind === "sig" ? (sig.intent.damage ?? 6) : 6;
    for (let i = 0; i < 3; i++) hitPlayer(b, Math.max(3, Math.floor(dmg / 2)), `${label}${i + 1} `);
    b.youSkillTax = (b.youSkillTax ?? 0) + enemyNickTax(b.labEnemyGrade ?? "jing");
    return;
  }
  if (id === "jinyi-lock") {
    if (Math.abs(b.player.pos - b.enemy.pos) <= 1) {
      b.youMute = Math.max(b.youMute, 1);
      note(b, "foe", `${b.enemy.name}锦衣锁喉，禁技。`);
    }
    return;
  }
  if (id === "court-cane" || id === "death-grant" || id === "grant-kill") {
    const dmg = sig?.intent.kind === "sig" ? (sig.intent.damage ?? 14) : 14;
    const trueHit = id !== "court-cane" && (b.youSeal ?? 0) >= 2;
    if (trueHit) {
      b.player.hp = Math.max(0, b.player.hp - dmg);
      note(b, "foe", `${b.enemy.name}${label}真伤 ${dmg}。`);
    } else hitPlayer(b, dmg, `${label} `);
  }
}

function distTo(b: Battle): number {
  const foe = targetFoe(b);
  if (!foe) return 0;
  return Math.abs(b.player.pos - foe.pos);
}

function applyEnemyOnHitRiders(b: Battle): void {
  if (b.labEnemyGrade == null) return;
  const w = ENEMY_WEAPON[b.enemyId];
  if (w === "saber") {
    b.youSkillTax = (b.youSkillTax ?? 0) + enemyNickTax(b.labEnemyGrade);
  }
  if (w === "palm") {
    const notes = knockAway(b, "player", 1);
    if (notes.length) note(b, "foe", notes[0]!);
    if (b.labEnemyGrade === "shen") b.enemyBlock = Math.min(24, b.enemyBlock + 2);
  }
}

function usesGeneratedKit(id: string): boolean {
  return id.startsWith("mob_") || id.startsWith("luohan_");
}

function kitCtx(b: Battle): KitCtx {
  const stage = b.labGauntletStage ?? 1;
  const profile = profileFor(b.enemyId, stage, b.labEnemyKitRole ?? "main");
  const edge = (pos: number) => pos === 0 || pos === BOARD_SIZE - 1;
  return {
    dist: distTo(b),
    reach: enemyReach(b),
    energy: b.enemyEnergy,
    energyMax: b.enemyEnergyMax,
    hpRatio: b.enemy.hp / Math.max(1, b.enemy.maxHp),
    enemyBlock: b.enemyBlock,
    stage,
    school: profile.school,
    playerSchool: battleEquippedSchool(b, b.active),
    turn: b.turn,
    foeAtEdge: edge(b.enemy.pos),
    playerAtEdge: edge(b.player.pos),
    stakes: b.stakes.length,
    grade: profile.grade,
    opener: profile.opener,
    sigs: profile.sigs,
  };
}

export function applyLabEnemyKit(b: Battle, role: "main" | "extra" = "main"): void {
  if (!isLabMode()) return;
  if (!usesGeneratedKit(b.enemyId)) return;
  if (b.labGauntletStage == null) return;
  const stage = b.labGauntletStage;
  const mode = isBreakAlign() ? "break" : "classic";
  const profile = profileFor(b.enemyId, stage, role, mode);
  b.labEnemyKitRole = role;
  b.labEnemyGrade = profile.grade;
  b.enemyEnergyMax = profile.energy.max;
  b.enemyEnergy = Math.min(profile.energy.max, profile.energy.start);
  if (profile.name) {
    b.enemy.name = profile.name;
  }
  rollIntent(b);
}

function honestifyQueue(b: Battle, planned: Intent[]): Intent[] {
  if (!isLabMode() || (b.labGauntletStage ?? 1) < 5) return planned.slice();
  const fire = intentFirePlan(b.enemyEnergy, planned);
  return planned.map((it, i) => (fire[i]?.skip ? { kind: "guard" as const, block: 6 } : it));
}

function weaponRiposte(id: EnemyId): RiposteKind {
  const w = ENEMY_WEAPON[id];
  if (w === "staff") return "ward";
  if (w === "hook") return "knock";
  if (w === "sword") return "bleed";
  return "slash";
}

function reactToPlayer(b: Battle): Intent | null {
  const def = labEnemy(b.enemyId);
  const elite =
    b.enemyId === "bandit" ||
    b.enemyId === "brute" ||
    b.enemyId === "escort" ||
    b.enemyId === "piler" ||
    b.enemyId === "delay" ||
    Boolean(def?.elite);
  if (b.turn <= 1 && !elite) return null;
  // 蓄势精英首回合走 pattern（windup），别被反应打散
  if (b.turn <= 1 && def?.elite === "windup") return null;
  const d = distTo(b);
  const w = ENEMY_WEAPON[b.enemyId];
  const foe = targetFoe(b) ?? b.enemy;
  if (foe.hp * 3 <= foe.maxHp && b.bleed >= 2) {
    const mend = { kind: "mend" as const, heal: 10 };
    return labAiAllowsReaction("mend", true) ? mend : null;
  }
  if (b.youRiposte && d <= 2) {
    if (w === "hook") return { kind: "pull", steps: 2 };
    if (w === "staff") return { kind: "stake" };
    if (w === "sword") return { kind: "seal" };
    return { kind: "guard", block: 10 };
  }
  if (b.bleed >= 5 && labAiAllowsReaction("mend", true)) return { kind: "mend", heal: 10 };
  if (b.setup >= 2) {
    if (d === 1) return { kind: "barrage", damage: 10, hits: 2 };
    return { kind: "lunge", damage: 16 };
  }
  const edge = b.player.pos === 0 || b.player.pos === BOARD_SIZE - 1;
  const foeEdge = b.enemy.pos === 0 || b.enemy.pos === BOARD_SIZE - 1;
  if (d === 1 && edge && !foeEdge && b.turn % 2 === 0) return { kind: "swap" };
  if (b.retainTurns > 0 && d === 1) return { kind: "barrage", damage: 9, hits: 2 };
  // High flow used to force endless guard → infinite 架势, HP looked "stuck".
  // Answer pressure once, then hit back instead of turtling forever.
  if (b.flow >= 2) {
    if (b.enemyBlock < 8) return { kind: "guard", block: 10 };
    if (d === 1) return { kind: "barrage", damage: 9, hits: 2 };
    return { kind: "lunge", damage: 15 };
  }
  if (b.playerBlock >= 6) {
    if (w === "hook" || w === "palm") return { kind: "shatter", amount: 10 };
    if ((w === "saber" || w === "sword") && d === 1) return { kind: "bleedcut", damage: 11, bleed: 4 };
    if (d === 1) return { kind: "shatter", amount: 8 };
    return { kind: "shatter", amount: 6 };
  }
  if (b.pressedLast >= 2 && !b.foeRiposte) return { kind: "counter", form: weaponRiposte(b.enemyId) };
  if (b.youBleed >= 3 && d === 1) return { kind: "strike", damage: 18 };
  if (w === "saber" && d === 1 && b.turn % 3 === 0) return { kind: "bleedcut", damage: 11, bleed: 3 };
  if (w === "sword" && d <= 2 && b.turn % 3 === 0) return { kind: "seal" };
  if (w === "staff" && !b.foeRiposte && b.turn % 4 === 0) return { kind: "counter", form: "ward" };
  if (w === "hook" && d >= 2 && b.turn % 3 === 0) return { kind: "shatter", amount: 8 };
  // 常态：低血卸力/吐纳，低架势卸力，低敌劲吐纳
  if (foe.hp * 2 <= foe.maxHp && b.enemyBlock < 10) return { kind: "guard", block: 10 };
  if (b.enemyEnergy <= Math.floor(b.enemyEnergyMax / 3)) return { kind: "breathe", amount: 4 };
  if (b.enemyBlock < 4 && b.turn % 2 === 1) return { kind: "guard", block: 8 };
  if (b.turn % 4 === 0) return { kind: "breathe", amount: 3 };
  return null;
}

/** Scale foe intent numbers so UI and resolve stay in sync. */
function scaleIntent(intent: Intent): Intent {
  if (fightScale.dmg === 1) return intent;
  const d = (n: number) => Math.max(1, Math.round(n * fightScale.dmg));
  if (intent.kind === "strike") return { ...intent, damage: d(intent.damage) };
  if (intent.kind === "charge") return { ...intent, damage: d(intent.damage) };
  if (intent.kind === "lunge") return { ...intent, damage: d(intent.damage) };
  if (intent.kind === "barrage") return { ...intent, damage: d(intent.damage) };
  if (intent.kind === "bleedcut") return { ...intent, damage: d(intent.damage) };
  if (intent.kind === "guard") return { ...intent, block: d(intent.block) };
  if (intent.kind === "shatter") return { ...intent, amount: d(intent.amount) };
  return intent;
}

function chooseIntent(b: Battle): Intent {
  return simV2ChooseIntent(b, scaleIntent(pickIntent(b)));
}

function pickIntent(b: Battle): Intent {
  const def = labEnemy(b.enemyId);
  const d = distTo(b);
  if (def.id === "delay") {
    b.intentIndex = (b.intentIndex + 1) % def.pattern.length;
    return def.pattern[b.intentIndex];
  }
  if (!isSparEnemy(def.id)) {
    const reacted = reactToPlayer(b);
    if (reacted) {
      const defensive =
        reacted.kind === "guard" ||
        reacted.kind === "mend" ||
        reacted.kind === "breathe" ||
        reacted.kind === "counter";
      if (labAiAllowsReaction(reacted.kind, defensive)) return reacted;
    }
  }
  if (isLabMode() && usesGeneratedKit(def.id) && b.labEnemyGrade) return chooseFromKit(kitCtx(b));
  if (def.id === "catcher") {
    if (b.playerBlock >= 12 && d === 1) return { kind: "barrage", damage: 9, hits: 2 };
    if (b.playerBlock >= 8 && d > 1) return { kind: "lunge", damage: 15 };
    if (d >= 3) return { kind: "lunge", damage: 15 };
    if (d === 1 && b.turn % 2 === 0) return { kind: "barrage", damage: 8, hits: 2 };
    return { kind: "strike", damage: 18 };
  }
  if (def.id === "escort") {
    if (d === 1) return { kind: "barrage", damage: 9, hits: 2 };
    return { kind: "charge", damage: 18, steps: 3 };
  }
  if (def.id === "piler") {
    if (b.stakes.length === 0) return { kind: "stake" };
    if (d === 1 && b.playerBlock >= 10) return { kind: "barrage", damage: 8, hits: 2 };
    return { kind: "strike", damage: 19 };
  }
  if (def.id === "hauler") {
    if (d === 1) return { kind: "strike", damage: 18 };
    if (d >= 3) return { kind: "lunge", damage: 15 };
    return { kind: "pull", steps: 2 };
  }
  if (def.id === "trapper") {
    if (!b.traps.includes(b.player.pos)) return { kind: "trap" };
    if (d === 1) return { kind: "barrage", damage: 8, hits: 2 };
    return { kind: "strike", damage: 18 };
  }
  if (def.id === "alley") {
    if (d === 1) return { kind: "barrage", damage: 9, hits: 2 };
    return { kind: "lunge", damage: 18 };
  }
  if (def.id === "twin") {
    if (d === 1) return { kind: "swap" };
    return { kind: "lunge", damage: 16 };
  }
  if (def.id === "lord") {
    if (d >= 3) return { kind: "charge", damage: 17, steps: 2 };
    if (b.stakes.length === 0) return { kind: "stake" };
    if (b.playerBlock >= 10) return { kind: "barrage", damage: 9, hits: 2 };
    return { kind: "strike", damage: 22 };
  }
  if (def.id === "intruder" || def.id === "inkhand") {
    if (d >= 3) return { kind: "lunge", damage: 12 };
    if (d === 1 && b.turn % 2 === 0) return { kind: "barrage", damage: 7, hits: 2 };
    return { kind: "strike", damage: 13 };
  }
  if (def.id === "brute") {
    if (d >= 3) return { kind: "charge", damage: 17, steps: 2 };
    if (b.playerBlock >= 10) return { kind: "barrage", damage: 9, hits: 2 };
    return { kind: "strike", damage: 19 };
  }
  if (def.id === "bandit") {
    const foe = targetFoe(b) ?? b.enemy;
    if (foe.hp * 2 <= foe.maxHp && b.bleed >= 3) return { kind: "mend", heal: 12 };
    if (b.playerBlock >= 5) return { kind: "shatter", amount: 12 };
    if (!b.foeRiposte) return { kind: "counter", form: "slash" };
    if (d === 1) return { kind: "bleedcut", damage: 14, bleed: 4 };
    if (d > 2) return { kind: "charge", damage: 22, steps: 3 };
    return { kind: "barrage", damage: 11, hits: 3 };
  }
  if (def.id === "smuggler" || def.id === "warden" || def.id === "nametaker") {
    const i = b.intentIndex % 3;
    b.intentIndex += 1;
    if (i === 0) return { kind: "guard", block: def.id === "smuggler" ? 12 : 10 };
    if (i === 1) return { kind: "windup" };
    return { kind: "strike", damage: def.id === "smuggler" ? 20 : 26 };
  }
  if (def.id === "raider" || def.id === "glasspin" || def.id === "cavehand") {
    if (b.playerBlock >= 5) return { kind: "shatter", amount: 9 };
    if (d === 1) return { kind: "barrage", damage: 9, hits: 2 };
    if (d >= 3) return { kind: "lunge", damage: 16 };
    return { kind: "pull", steps: 2 };
  }
  if (def.id === "robber" || def.id === "thug") {
    if (b.playerBlock >= 4) return { kind: "shatter", amount: 8 };
    if (d === 1) return { kind: "barrage", damage: 8, hits: 2 };
    if (b.player.pos <= 1) return { kind: "guard", block: 8 };
    return { kind: "lunge", damage: 18 };
  }
  if (def.id === "stakeboss") {
    if (b.stakes.length < 2) return { kind: "stake" };
    if (d === 1) return { kind: "barrage", damage: 7, hits: 2 };
    return { kind: "strike", damage: 14 };
  }
  if (def.id === "knotboss") {
    if (d > 1) return { kind: "pull", steps: 2 };
    return { kind: "barrage", damage: 8, hits: 3 };
  }
  if (def.id === "bookcut") {
    if (d > 1) return { kind: "lunge", damage: 17 };
    return { kind: "barrage", damage: 8, hits: 2 };
  }
  if (def.id === "tutorPace") {
    if (d === 1) return { kind: "strike", damage: 10 };
    return { kind: "charge", damage: 10, steps: 2 };
  }
  if (def.id === "tutorWard" || def.id === "tutorEdge") {
    if (d >= 3) return { kind: "lunge", damage: 9 };
    return { kind: "strike", damage: def.id === "tutorWard" ? 11 : 10 };
  }
  b.intentIndex = (b.intentIndex + 1) % def.pattern.length;
  return def.pattern[b.intentIndex];
}

function actAlly(b: Battle, unit: Unit): void {
  if (unit.hp <= 0 || b.phase !== "player") return;
  // 眩晕对全场敌人生效：被晕的敌人跳过行动
  if ((b.foeStun ?? 0) > 0) {
    b.foeStun = (b.foeStun ?? 0) - 1;
    b.log.push(`【眩晕】${unit.name} 被打懵，没出出来`);
    b.journal.push({ side: "you", text: `${unit.name} 晕了` });
    return;
  }
  const d = Math.abs(unit.pos - b.player.pos);
  if (d === 1) {
    hitPlayer(b, Math.max(1, Math.round(12 * fightScale.dmg)), `${unit.name}补了一刀，`);
    return;
  }
  const dir = b.player.pos > unit.pos ? 1 : -1;
  const next = unit.pos + dir;
  if (!occupied(b, next, unit.id)) {
    unit.pos = next;
    b.log.push(`${unit.name}近了一步。`);
  }
}

/** §31.10 敌兵刃攻击距离：默认跟六系一致（拳1 / 刀剑钩2 / 枪棍3）；EnemyDef.reach 可覆盖。 */
export function enemyReach(b: Battle): number {
  const def = labEnemy(b.enemyId);
  if (def?.reach != null) return def.reach;
  const w = ENEMY_WEAPON[b.enemyId];
  return w ? SCHOOL_REACH[w] : 1;
}

/**
 * 身前兵刃覆盖：只朝「面向」一侧，身后打不到。
 * faceToward = 面向的目标格（通常是玩家回合开始锁定位）。
 */
export function facingReachCells(origin: number, faceToward: number, reach: number): number[] {
  const dir = faceToward > origin ? 1 : faceToward < origin ? -1 : 0;
  if (dir === 0 || reach <= 0) return [];
  const cells: number[] = [];
  for (let i = 1; i <= reach; i++) {
    const c = origin + dir * i;
    if (c < 0 || c >= BOARD_SIZE) break;
    cells.push(c);
  }
  return cells;
}

/** 敌当前能否打到某格：面向锁定线，身前 reach 内。 */
function enemyThreatCellsFrom(b: Battle, fromPos: number): number[] {
  const lock = isLabV2() ? (b.v2Turn?.turnStartPos ?? b.player.pos) : b.player.pos;
  return facingReachCells(fromPos, lock, enemyReach(b));
}

function enemyCanHitPlayerPos(b: Battle, atPos: number, fromPos = b.enemy.pos): boolean {
  return enemyThreatCellsFrom(b, fromPos).includes(atPos);
}

/** §31.10 贴身类攻击（够不着就不该出）。 */
function isMeleeIntent(intent: Intent): boolean {
  return (
    intent.kind === "strike" ||
    intent.kind === "barrage" ||
    intent.kind === "bleedcut" ||
    intent.kind === "seal" ||
    intent.kind === "shatter" ||
    intent.kind === "pestle"
  );
}

function followIntent(b: Battle, prior: Intent): Intent {
  if (isLabMode() && usesGeneratedKit(b.enemyId) && b.labEnemyGrade) {
    return scaleIntent(followFromKit(kitCtx(b), prior));
  }
  const d = distTo(b);
  // §31.10 距离感知与长兵器只在踢馆线生效；主线行为冻结（reach 视作 1）。
  const reach = isLabMode() ? enemyReach(b) : 1;
  const inReach = d <= reach;
  const approachOr = (melee: Intent): Intent => (isLabMode() && !inReach ? { kind: "lunge", damage: 12 } : melee);
  let next: Intent;
  if (prior.kind === "windup") next = approachOr({ kind: "strike", damage: 16 });
  else if (prior.kind === "stake") next = approachOr({ kind: "strike", damage: 14 });
  else if (prior.kind === "guard") next = inReach ? { kind: "strike", damage: 14 } : { kind: "lunge", damage: 12 };
  else if (prior.kind === "dodge" || prior.kind === "endure") next = inReach ? { kind: "strike", damage: 14 } : { kind: "lunge", damage: 12 };
  else if (prior.kind === "breathe") next = { kind: "guard", block: 8 };
  else if (prior.kind === "mend") next = inReach ? { kind: "guard", block: 8 } : { kind: "lunge", damage: 12 };
  else if (prior.kind === "shatter") next = inReach ? { kind: "strike", damage: 15 } : { kind: "lunge", damage: 13 };
  else if (prior.kind === "charge" || prior.kind === "pull") next = approachOr({ kind: "strike", damage: 12 });
  else if (prior.kind === "strike" || prior.kind === "lunge" || prior.kind === "barrage") {
    if (isLabMode() && isBreakAlign()) {
      if (b.enemyEnergy <= Math.floor(b.enemyEnergyMax / 3)) next = { kind: "breathe", amount: 3 };
      else if (b.turn % 2 === 0) next = { kind: "guard", block: 8 };
      else if (b.turn % 3 === 0 && b.enemy.hp < b.enemy.maxHp) next = { kind: "mend", heal: 6 };
      else next = inReach ? { kind: "strike", damage: 12 } : { kind: "lunge", damage: 12 };
    } else if (isLabMode() && getLabTuning().enemySegAll) {
      // §31.6 踢馆线：攻击段密度优先，水段（卸力/吐纳）只在固定节拍出现——拆招频率靠攻击段数量撑起来
      if (b.turn % 3 === 0 && b.enemyBlock < 6) next = { kind: "guard", block: 8 };
      else next = inReach ? { kind: "strike", damage: 12 } : { kind: "lunge", damage: 12 };
    } else if (b.turn % 3 === 0) next = { kind: "breathe", amount: 3 };
    else if (b.enemyBlock < 6) next = { kind: "guard", block: 8 };
    else if (inReach) next = { kind: "strike", damage: 12 };
    else next = { kind: "guard", block: 6 };
  } else if (inReach) next = { kind: "strike", damage: 12 };
  else if (d >= 3) next = { kind: "lunge", damage: 11 };
  // §31.10 踢馆线：隔 1 格（d=2 且够不着）不再缩架势，直接抢步逼近——「打不到就移动直到打到」
  else if (isLabMode()) next = { kind: "lunge", damage: 11 };
  else next = { kind: "guard", block: 6 };
  return scaleIntent(next);
}

/** §31.14 单回合攻击总伤总督（踢馆线）：不拆不躲全吃的伤害 ≤ 玩家气血上限 × ratio。
 * 保留最大的一段攻招（大招可读可拆），尾部攻招转成守势——段数不变，不再满血秒。 */
export function applyTurnDamageGovernor(b: Battle, queue: Intent[]): void {
  if (!isLabV2()) return;
  const ratio = getLabTuning().enemyTurnCapRatio;
  if (!ratio || ratio <= 0) return;
  const potential = (it: Intent): number => {
    if (it.kind === "barrage") return it.damage * it.hits;
    return "damage" in it ? (it.damage ?? 0) : 0;
  };
  const cap = Math.max(1, Math.round(b.player.maxHp * ratio));
  let total = 0;
  let keepIdx = -1;
  let keepVal = -1;
  queue.forEach((it, i) => {
    const p = potential(it);
    total += p;
    if (p > keepVal) {
      keepVal = p;
      keepIdx = i;
    }
  });
  if (total <= cap) return;
  let cooled = 0;
  // 先压普通攻击段，再压应激段（应激是「拼命」，最后才动它）
  for (let pass = 0; pass < 2 && total > cap; pass++) {
    for (let i = queue.length - 1; i >= 0 && total > cap; i--) {
      if (i === keepIdx) continue;
      const p = potential(queue[i]!);
      if (p <= 0) continue;
      if (pass === 0 && stressMetaAt(b, i)) continue;
      queue[i] = scaleIntent({ kind: "guard", block: 6 });
      total -= p;
      cooled += 1;
    }
  }
  if (cooled > 0) b.log.push(`【收势】他这一番排招太盛，转成 ${cooled} 手守势。`);
}

function planFromFirst(b: Battle, first: Intent): void {
  // §31.10 够不着不出贴身招：起手段是近战攻击但距离不够 → 换成抢步逼近（踢馆线）。
  if (isLabMode() && isMeleeIntent(first) && distTo(b) > enemyReach(b)) {
    first = { kind: "lunge", damage: 11 };
  }
  const planned: Intent[] = [first];
  const budgetCap = enemyRoundBudgetCap(b);
  let budget = Math.max(0, budgetCap - intentCost(first));
  let last = first;
  let guard = 0;
  let heavyUsed = isHeavyIntent(first);
  while (budget > 0 && guard < 8) {
    guard += 1;
    let next = followIntent(b, last);
    if (isHeavyIntent(next)) {
      if (heavyUsed) {
        next = budget >= 1 ? { kind: "strike", damage: 11 } : { kind: "guard", block: 6 };
      } else {
        heavyUsed = true;
      }
    }
    const cost = intentCost(next);
    if (cost > budget) {
      if (budget >= 1) {
        planned.push({ kind: "guard", block: 6 });
        budget -= 1;
      }
      break;
    }
    planned.push(next);
    budget -= cost;
    last = next;
  }
  if (
    isLabMode() &&
    (isBossEnemy(b.enemyId) || isEliteEnemy(b.enemyId) || getLabTuning().enemySegAll) &&
    !planned.some(isAttackIntent) &&
    budgetCap >= 1
  ) {
    // §31.10 兜底攻击也守距离：够不着就抢步，不远距离空挥送拆。
    planned.push(scaleIntent(distTo(b) <= enemyReach(b) ? { kind: "strike", damage: 12 } : { kind: "lunge", damage: 12 }));
  }
  // §31.14 应激「下一手」入场：带着应签进队尾，吃同一个总督。
  if (isLabV2()) {
    // 队列重排，应签索引随旧队列作废——每手从空表重建
    b.v2StressMeta = [];
    const drained = drainPendingStress(b);
    if (drained.intents.length) {
      const meta: ReturnType<typeof stressMetaAt>[] = planned.map(() => null);
      for (let i = 0; i < drained.intents.length; i++) {
        planned.push(scaleIntent(drained.intents[i]!));
        meta.push(drained.metas[i]!);
      }
      b.v2StressMeta = meta;
    }
  }
  const honest = honestifyQueue(b, planned);
  if (isLabV2()) applyTurnDamageGovernor(b, honest);
  b.intents = honest.length ? honest : [{ kind: "guard", block: 6 }];
  b.intent = b.intents[0]!;
  if (isLabMode()) {
    b.v2FoeSegments = (b.v2FoeSegments ?? 0) + planned.length;
    // §31.8 v3：每手套路定招眼（起手第一个可硬拆的攻击段）。
    b.v2EyeIdx = isLabV2() && isBreakAlign() ? planEyeIdx(planned) : -1;
    if (b.labHallLaw === "earlyEye") b.v2EyeIdx = 0;
  }
}

function rollIntent(b: Battle): void {
  planFromFirst(b, chooseIntent(b));
}

function seedIntents(b: Battle): void {
  const def = labEnemy(b.enemyId);
  const first = scaleIntent(def.pattern[b.intentIndex % def.pattern.length]);
  planFromFirst(b, first);
}

export function canSwap(b: Battle, id: CompanionId): { ok: boolean; reason?: string } {
  if (b.phase !== "player") return { ok: false, reason: "现在不是你的回合" };
  if (id === b.active) return { ok: false, reason: "已经在场上" };
  if (b.swappedThisTurn) return { ok: false, reason: "这一息已经换过人" };
  if (b.energy < 1) return { ok: false, reason: "换人要留一劲" };
  if (!b.bench.some((m) => m.id === id)) return { ok: false, reason: "不在队里" };
  return { ok: true };
}

export function swapFighter(b: Battle, id: CompanionId): Battle {
  const gate = canSwap(b, id);
  if (!gate.ok) return b;
  const next = cloneBattle(b);
  const bag = next.bench.find((m) => m.id === id);
  if (!bag) return b;
  const parked = parkFighter(next);
  next.bench = next.bench.filter((m) => m.id !== id);
  next.bench.push(parked);
  applyFighter(next, bag);
  next.energy -= 1;
  next.swappedThisTurn = true;
  battleGearId = battleMateGearId(next, id);
  const weapon = battleEquippedSchool(next, id);
  const offSchool: CardInst[] = [];
  const keepSchool = (pile: CardInst[]) =>
    pile.filter((c) => {
      const school = cardSchool(c.defId);
      if (school === "any" || school === weapon) return true;
      offSchool.push(c);
      return false;
    });
  next.hand = keepSchool(next.hand);
  next.drawPile = keepSchool(next.drawPile);
  if (offSchool.length) next.discardPile.push(...offSchool);
  const cap = handCap(next);
  while (next.hand.length < cap && next.drawPile.length > 0) drawOne(next);
  if (offSchool.length) {
    next.log.push(`${MATES[id].name}替上。先机 ${yourPace(next)}。异谱 ${offSchool.length} 张落地，补了同等。`);
  } else {
    next.log.push(`${MATES[id].name}替上。先机 ${yourPace(next)}。手里换了一套谱。`);
  }
  return next;
}

function springTraps(b: Battle): void {
  if (!b.traps.includes(b.player.pos)) return;
  if (hasTech(b, "trapWard")) {
    b.log.push("机簧响了，你不在那儿。");
    return;
  }
  hitPlayer(b, 6, "机关 ");
}

function applyTether(b: Battle): void {
  if (!hasTech(b, "tether")) return;
  if (Math.abs(b.player.pos - b.enemy.pos) <= 2) return;
  const notes = pullUnit(b, "enemy", "player", 1);
  if (notes.length) b.log.push(`纤力：${notes[0]}`);
}

export function endTurn(b: Battle): Battle {
  if (b.phase !== "player") return b;
  if (!canEndPlayerTurn(b).ok) return b;
  const next = cloneBattle(b);
  if (isLabMode() && next.hand.length > 0 && next.hand.every((c) => !canPlay(next, c.uid).ok)) {
    next.v2DeadHandTurns = (next.v2DeadHandTurns ?? 0) + 1;
  }
  const carryRaw = (hasTech(next, "leftover") ? 1 : 0) + (hasTech(next, "flowSword") ? 1 : 0);
  const carryCap =
    isLabMode() && isBreakAlign() && (next.v2TurnBreakCount ?? 0) <= 0 ? 0 : carryRaw;
  const carry = carryCap > 0 ? Math.min(carryCap, next.energy) : 0;
  next.log.push("你收势。");
  if (companionOn(next) && next.active === "seer" && next.energy === 0) {
    next.energyNext += 1;
    next.log.push("余墨，下回劲力 +1");
  }
  if (companionOn(next) && next.active === "baimenghe" && next.attacksThisTurn === 0) {
    const n = healYou(next, 4);
    if (n) next.log.push(`温掌 回 ${n}`);
  }
  if (companionOn(next) && next.active === "zhounuanxiang" && next.playerBlock > 0) {
    const n = healYou(next, 6);
    if (n) next.log.push(`温补 回 ${n}`);
  }
  if (companionOn(next) && next.active === "pilgrim" && next.attacksThisTurn === 0) {
    const n = healYou(next, 3);
    if (n) next.log.push(`锡息 回 ${n}`);
  }
  if (next.movedFwd && next.movedBack) {
    next.youSway = Math.max(next.youSway, 2);
    next.log.push("乱步。进退同一息，步散了。");
  }
  if (next.enteredMelee && next.attacksThisTurn === 0) {
    next.youGift = 1;
    next.log.push("送手。贴上去却没出招。");
  }
  if (next.youRegenTurns > 0) {
    const n = healYou(next, next.youRegen);
    next.youRegenTurns -= 1;
    next.regenClock += 1;
    if (n) next.log.push(`缝创 回 ${n}`);
    if (next.regenClock % 2 === 0 && next.youBleed > 0) {
      next.youBleed -= 1;
      next.log.push(`缝创，裂创 ${next.youBleed}`);
    }
    if (next.youRegenTurns <= 0) {
      next.youRegen = 0;
      next.regenClock = 0;
    }
  }
  // §31.12 预演条「上轮回顾」：从纤力/机关起捕获敌回合全程日志。
  const foeTurnMark = isLabV2() ? next.log.length : -1;
  applyTether(next);
  springTraps(next);
  simV2BeforeEndTurn(next);
  if (next.phase !== "player") return next;
  // §31.11 刀系埋招前置只记「最近一轮敌出手」——结算前清，结算中由 simV2OnHitPlayer 重立。
  next.foeHitLastTurn = false;
  resolveAllIntents(next);
  if (next.phase !== "player") return next;
  for (const extra of livingFoes(next).filter((f) => f.id !== next.enemy.id)) {
    actAlly(next, extra);
    if (next.phase !== "player") return next;
  }
  if (next.bleed > 0) {
    const foe = livingFoes(next)[0];
    if (foe) {
      const tick =
        isLabMode() && isBreakAlign() ? bleedTickDamage(next.bleed) : next.bleed;
      foe.hp -= tick;
      note(next, "you", isLabMode() && isBreakAlign() ? `裂创跳 ${tick}（${next.bleed} 层）` : `裂创 ${next.bleed}`);
      syncFront(next);
      if (foe.hp <= 0) checkWin(next);
    }
  }
  if (next.youBleed > 0 && next.phase === "player") {
    const raw = next.youBleed;
    const blocked = Math.min(next.playerBlock, raw);
    const pierce = raw - blocked;
    next.playerBlock -= blocked;
    next.player.hp -= pierce;
    simV2OnHitPlayer(next, pierce);
    note(
      next,
      "foe",
      pierce === 0 ? `裂创 ${raw}，全部卸掉。` : blocked > 0 ? `你裂创 ${raw}。格挡 ${blocked}，你受 ${pierce}。` : `你裂创 ${raw}。`,
    );
    if (next.player.hp <= 0) collapseOrDeathSwap(next);
  }
  if (foeTurnMark >= 0) next.v2LastFoeTurn = next.log.slice(foeTurnMark);
  if (next.phase !== "player") return next;
  if (next.youSway > 0) next.youSway -= 1;
  tickRiposte(next, "you");
  tickRiposte(next, "foe");
  next.movedFwd = false;
  next.movedBack = false;
  next.enteredMelee = false;
  next.turn += 1;
  simV2AfterEndTurnSetup(next);
  tickSignatureCooldown(next);
  simV2StartPlayerTurn(next);
  dismissSummonAtTurnStart(next);
  if (isLabMode() && isBreakAlign() && Math.abs(next.player.pos - next.enemy.pos) <= 1) {
    if ((next.v2SpearRuler ?? 0) > 0) {
      next.v2SpearRuler = 0;
      note(next, "you", "贴身，标尺清零");
    }
  }
  const keepOk =
    hasTech(next, "keepGuard") &&
    (!(isLabMode() && isBreakAlign()) || (next.v2TurnBreakCount ?? 0) > 0 || (next.v2BreakCount ?? 0) > 0);
  const kept = keepOk ? Math.min(4, next.playerBlock) : 0;
  let retained = 0;
  if (next.retainTurns > 0 && next.retainAmt > 0) {
    retained = next.retainAmt;
    next.retainTurns -= 1;
    note(next, "you", `铁布开局 ${retained}`);
  }
  let block = Math.max(kept, retained);
  if (staffBlockRetain(next)) block = Math.max(block, next.playerBlock);
  next.playerBlock = block;
  const tax = next.youSeal;
  const regen = next.energyRegen + next.energyNext - (next.youQiBurn ?? 0);
  next.energy = Math.min(next.energyMax, Math.max(0, next.energy + regen + carry - tax));
  if (tax > 0) note(next, "foe", `封脉，劲力少 ${tax}`);
  if (regen !== 0 || carry) note(next, "you", `回劲 ${Math.max(0, regen + carry - tax)} → ${next.energy}/${next.energyMax}`);
  next.energyNext = 0;
  next.youSeal = Math.max(0, next.youSeal - 1);
  next.youMute = Math.max(0, (next.youMute ?? 0) - 1);
  next.youNoBag = Math.max(0, (next.youNoBag ?? 0) - 1);
  next.youHandTax = Math.max(0, (next.youHandTax ?? 0) - 1);
  next.youQiBurn = Math.max(0, (next.youQiBurn ?? 0) - 1);
  next.foeMute = Math.max(0, (next.foeMute ?? 0) - 1);
  next.foeDisarm = Math.max(0, (next.foeDisarm ?? 0) - 1);
  next.foeNoBag = Math.max(0, (next.foeNoBag ?? 0) - 1);
  next.foeHandTax = Math.max(0, (next.foeHandTax ?? 0) - 1);
  next.foeQiBurn = Math.max(0, (next.foeQiBurn ?? 0) - 1);
  const foeRegen = Math.max(1, Math.floor(next.enemyEnergyMax / 3)) - (next.foeQiBurn > 0 ? 1 : 0);
  next.enemyEnergy = Math.min(next.enemyEnergyMax, Math.max(0, next.enemyEnergy + foeRegen));
  next.thorns = 0;
  next.frail = Math.max(0, next.frail - 1);
  next.youSlow = Math.max(0, next.youSlow - 1);
  next.nextDamage = next.echoNext;
  if (next.echoNext > 0) note(next, "you", `尾劲入掌 +${next.echoNext}`);
  next.echoNext = 0;
  if (next.mark > 0) next.mark = Math.max(0, next.mark - 1);
  next.pressedLast = next.attacksThisTurn;
  next.playedThisTurn = [];
  next.attacksThisTurn = 0;
  next.lastPlay = null;
  next.swappedThisTurn = false;
  if (isLabMode() && !isLabV2()) next.labFreshSwap = false;
  applyMateOpen(next);
  applyTechOpen(next);
  applyMindOpen(next);
  drawRefill(next);
  // §31.10 弃牌上限按「补牌后的回合开始手牌」定——否则上回合打得越狠，下回合越没弃牌权（甲方实测「全局两次」的根因）。
  if (next.v2Turn) next.v2Turn.turnStartHand = next.hand.length;
  rollIntent(next);
  if (hasTech(next, "delayGuard") && next.intent.kind === "windup") {
    next.playerBlock += 3;
    note(next, "you", "等手，卸了这一息。");
  }
  if (hasTech(next, "pikeBrace") && next.intent.kind === "windup") {
    next.playerBlock += 2;
    note(next, "you", "拒马，枪尖朝外。");
  }
  note(
    next,
    "foe",
    `${next.enemy.name}亮招：${labelIntent(next.intent)}${next.intents.length > 1 ? `（后手隐 ${next.intents.length - 1}）` : ""}`,
  );
  return next;
}

export function statusChips(b: Battle, side: "you" | "foe"): StatusChip[] {
  const chips: StatusChip[] = [];
  const push = (key: string, name: string, value: string | number, tip: string) => {
    if (value === 0 || value === "") return;
    chips.push({ key, name, value: String(value), tip });
  };
  if (side === "you") {
    const passive = companionOn(b) ? MATE_PASSIVE[b.active] : undefined;
    if (passive) push("passive", passive.name, "开", passive.text);
    push("pace", "先机", `${yourPace(b)}${yourPace(b) >= b.foePace ? "（先手）" : "（后手）"}`, "比他快则你先出手。抢先会加，滞步会减。");
    push("block", "格挡", b.playerBlock, "这一息卸掉这么多伤害。收势清掉，铁布除外。");
    if ((b.v2BreakMomentum ?? 0) > 0) {
      push(
        "breakmom",
        "拆势",
        b.v2BreakMomentum!,
        "硬拆攒的下一击。打出攻击牌时吃掉 1 层，带无视架势的真伤和兵器系效果。",
      );
    }
    const qiSt = simV2StatusQi(b);
    if (qiSt.show) push("qi", "势", qiSt.value, `叠层输出资源，上限 ${5}。穿盾受损清零。`);
    else {
      push("combo", "连势", b.combo, "下一掌更重，或让连环接上。");
      push("flow", "气脉", b.flow, "本场攻击各加这么多。最多 3。");
      push("setup", "铺势", b.setup, "收势掌按层数加伤，然后清掉。");
    }
    push("thorns", "反震", b.thorns, "他打你时，你按这个数回敬。");
    if (b.retainTurns > 0) push("iron", "铁布", `${b.retainAmt}/${b.retainTurns}`, `再 ${b.retainTurns} 回开局各有 ${b.retainAmt} 格挡。`);
    push("echo", "尾劲", b.echoNext, "下回第一掌加这么多伤害。");
    push("qi", "纳息", b.energyNext, "下回额外多回这么多劲力。");
    push("regenQi", "回劲", b.energyRegen, "每收势回复的基础劲力。");
    if (b.youMute > 0) push("mute", "禁技", b.youMute, "这一息打不出技能牌。");
    if (b.youNoBag > 0) push("nobag", "封囊", b.youNoBag, "不能用伤药/暗器。");
    if (b.youHandTax > 0) push("handtax", "削谱", b.youHandTax, "手牌上限减少。");
    if (b.youQiBurn > 0) push("qiburn", "扣劲", b.youQiBurn, "回劲被克扣。");
    if (b.youRiposte) {
      push("bury", "埋招", `${riposteName(b.youRiposte)}·${b.youRiposteTurns}`, `再 ${b.youRiposteTurns} 回。挨打时按此反击。血过半更久，领先多撑 1 回，裂创深则短。`);
    }
    push("bleed", "裂创", b.youBleed, "每回收势按这个数掉血。金创、烙口、缝创可治。");
    push("seal", "封脉", b.youSeal, "下回少这么多劲力。通脉可解。");
    push("slow", "滞步", b.youSlow, "先机减这么多。通脉可解。");
    push("sway", "乱步", b.youSway, "输出少 2，挨打多 3。进退同一息，或换位时先机不够，会乱。");
    push("gift", "送手", b.youGift, "下一记挨打多 4。贴上去却没出招。");
    if (b.youRegenTurns > 0) {
      push("regen", "缝创", `${b.youRegen}/${b.youRegenTurns}`, `再 ${b.youRegenTurns} 回每回回 ${b.youRegen}。每两回裂创 -1。`);
    }
  } else {
    push("pace", "先机", `${b.foePace}${b.foePace > yourPace(b) ? "（先手）" : b.foePace === yourPace(b) ? "（并手）" : "（后手）"}`, "比你快则他先出手。");
    push("intent", "来招", labelIntent(b.intent), "这一息他打算这么做。红格是危险步。");
    push("block", "架势", b.enemyBlock, "打在他身上先吃掉这些。");
    if (b.flow >= 2) {
      push("flowwarn", "气脉", b.flow, "你气脉偏高时，他更爱卸力或连打。");
    }
    push("bleed", "裂创", b.bleed, "他每回收势按这个数掉血。");
    push("expose", "破绽", b.expose, "你的攻击各多吃一层破绽。");
    push("mark", "点穴", b.mark, "你的攻击加印，开缝能吃印。");
    push("frail", "滞手", b.frail, "他打你时少 3 点。每回减一层。");
    if (b.foeRiposte) {
      push("bury", "埋招", `${riposteName(b.foeRiposte)}·${b.foeRiposteTurns}`, `再 ${b.foeRiposteTurns} 回。你打他时，他按此反击。`);
    }
    if ((b.foeDodge ?? 0) > 0) push("dodge", "闪避", b.foeDodge, "你下一张攻击牌的卡面伤会落空。拆势真伤仍中。");
    if ((b.foeEndure ?? 0) > 0) push("endure", "霸体", b.foeEndure, "你下一张攻击仍能打伤，但击退、拉、眩晕无效。");
    if (b.foeMute > 0) push("mute", "禁技", b.foeMute, "他暂时打不出技能意图强化。");
    if ((b.foeStun ?? 0) > 0) push("stun", "眩晕", b.foeStun!, "他接下来 N 个攻击段出不来（棍连击/拳震壁）。");
    if ((b.foeDisarm ?? 0) > 0) push("disarm", "缴械", b.foeDisarm!, "他被摘了兵刃：攻击伤害减半（钩系）。");
    if (b.foeNoBag > 0) push("nobag", "封囊", b.foeNoBag, "他袋里的药/暗器用不上（对你亦同规则）。");
    if (b.foeHandTax > 0) push("handtax", "削谱", b.foeHandTax, "压迫他的节奏。");
    if (b.foeQiBurn > 0) push("qiburn", "扣劲", b.foeQiBurn, "他回劲变慢。");
  }
  return chips;
}
