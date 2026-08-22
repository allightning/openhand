import { CARDS, ENEMIES, ENEMY_ENERGY, ENEMY_WEAPON, STARTER, enemyEnergyMax, enemyPace, isSparEnemy } from "./content";
import { MATE_PASSIVE, MATES, WEAPON_PACE, cardSchool, deckFor, isLead } from "./party";
import { makeRun } from "./run";
import { difficultyScale, getDifficulty } from "./settings";
import {
  BOARD_SIZE,
  HAND_SIZE,
  WALL_DAMAGE,
  type Battle,
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
  type Unit,
} from "./types";
import { gearById, pathSkillMods } from "./weapons";

let seq = 0;
let battleGearId: string | null = null;
/** Locked at makeBattle so mid-fight setting changes don't warp numbers. */
let fightScale = { hp: 1, dmg: 1, youDmg: 1 };
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
  if (intent.kind === "barrage" || intent.kind === "charge") return 2;
  if (intent.kind === "mend" || intent.kind === "breathe") return 2;
  return 1;
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
  const def = ENEMIES[id];
  const hp = Math.max(8, Math.round(def.hp * fightScale.hp));
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
  fightScale = difficultyScale(getDifficulty());
  battleGearId = run.weapon ?? null;
  const def = ENEMIES[enemyId];
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
      hp: mateHp(active),
      maxHp: mateMax(active),
      pos: STARTER.playerPos,
    },
    enemy: foes[0],
    foes,
    enemyId,
    playerBlock: run.techniques.includes("nightStep") ? 1 : 0,
    energy: Math.min(STARTER.energy + bonusQi, (STARTER.energyStart ?? Math.min(5, STARTER.energy)) + bonusQi),
    energyMax: STARTER.energy + bonusQi,
    energyRegen: (STARTER.energyRegen ?? 3) + gearQi,
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
    paceBoost: run.companionBonus?.[active]?.pace ?? 0,
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
  };
  setupBattle(battle);
  seizeOpening(battle);
  battle.spar = spar;
  return battle;
}

export function makeTutorialBattle(): Battle {
  return makeBattle("catcher");
}

export function weaponPace(id: CompanionId): number {
  return WEAPON_PACE[MATES[id].weapon];
}

export function yourPace(b: Battle): number {
  return Math.max(1, weaponPace(b.active) + b.paceBoost - b.youSlow);
}

function seizeOpening(b: Battle): void {
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
    if (!occupied(b, at)) b.stakes.push(at);
  }
  hardenFoe(b);
  drawToHand(b);
  applyMateOpen(b);
  seedIntents(b);
  if (hasTech(b, "delayGuard") && b.intent.kind === "windup") {
    b.playerBlock += 3;
  }
}

/** Tough outdoor / midboss hands: read the board, not just stack HP. */
function hardenFoe(b: Battle): void {
  const id = b.enemyId;
  const def = ENEMIES[id];
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
  if (b.player.pos === pos && b.player.id !== exceptId && b.player.hp > 0) return true;
  for (const f of livingFoes(b)) {
    if (f.pos === pos && f.id !== exceptId) return true;
  }
  return false;
}

function drawOne(b: Battle): boolean {
  if (b.drawPile.length === 0) {
    if (b.discardPile.length === 0) return false;
    b.drawPile = b.discardPile.splice(0);
  }
  const drawn = b.drawPile.shift();
  if (!drawn) return false;
  b.hand.push(drawn);
  return true;
}

function wallHit(b: Battle, cardWall?: number): number {
  const base = cardWall ?? WALL_DAMAGE;
  return hasTech(b, "hardWall") ? Math.max(12, base) : base;
}

function knockDist(b: Battle, base: number): number {
  return base + (hasTech(b, "longPush") ? 1 : 0);
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
  const extra = companionOn(b) && b.active === "watch" ? 1 : 0;
  return Math.max(2, HAND_SIZE + (hasTech(b, "stackHand") ? 1 : 0) + extra - (b.youHandTax ?? 0));
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

function strikeDamage(b: Battle, base: number, forceMelee = false): number {
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
  const gear = gearById(battleGearId);
  let dmg = raw + (gear?.damage ?? 0);
  const notes: string[] = [];
  const dist = Math.abs(b.player.pos - foe.pos);
  const mods = pathSkillMods(gear, {
    dist,
    combo: b.combo,
    paceAdvantage: WEAPON_PACE[MATES[b.active]?.weapon ?? "palm"] + b.paceBoost >= b.foePace,
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
  if (b.combo > 0) b.combo = 0;
  if (b.enemyBlock > 0) {
    const blocked = Math.min(b.enemyBlock, dmg);
    b.enemyBlock -= blocked;
    dmg -= blocked;
    if (blocked) notes.push(`他卸了 ${blocked}`);
  }
  foe.hp -= dmg;
  if (spendCharge) b.nextDamage = 0;
  notes.unshift(`${verb}${dmg}`);
  if (raw > 0) notes.push(...tryRiposte(b, "foe"));
  if (mods.thorns && raw > 0 && b.playerBlock > 0) {
    const th = Math.min(3, mods.thorns);
    if (th > 0) {
      foe.hp -= th;
      notes.push(`刃反 ${th}`);
    }
  }
  if (foe.hp <= 0) notes.push(`${foe.name}倒下`);
  syncFront(b);
  return notes;
}

function knockAway(b: Battle, who: "player" | "enemy", dist: number, wall?: number): string[] {
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
      unit.hp -= wh;
      notes.push(`撞壁 ${wh}`);
      break;
    }
    if (occupied(b, next, unit.id)) {
      notes.push(b.stakes.includes(next) ? "桩挡住了" : "去路被占，停下");
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
  const unit = who === "player" ? b.player : (targetFoe(b) ?? b.enemy);
  const other = toward === "player" ? b.player : (targetFoe(b) ?? b.enemy);
  const notes: string[] = [];
  let left = steps;
  while (left > 0 && unit.hp > 0) {
    const dir = other.pos > unit.pos ? 1 : other.pos < unit.pos ? -1 : 0;
    if (dir === 0) break;
    const next = unit.pos + dir;
    if (next === other.pos || occupied(b, next, unit.id)) break;
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
  const def = CARDS[defId];
  const notes: string[] = [];

  if (defId === "strike" || defId === "strike2" || defId === "elbow") {
    const notes = hitEnemy(b, strikeDamage(b, def.damage ?? 0), def.name + " ");
    if (defId === "elbow" && adjacent(b)) {
      b.bleed = Math.min(9, b.bleed + 1);
      notes.push(`裂创 ${b.bleed}`);
    }
    return notes;
  }

  if (defId === "drawcut") {
    const melee = adjacent(b) || hasTech(b, "closeCut");
    const base = melee ? 9 : 4;
    const notes = hitEnemy(b, strikeDamage(b, base, melee), melee ? "抽刀 " : "抽刀远 ");
    if (melee) {
      b.bleed = Math.min(9, b.bleed + 1);
      notes.push(`裂创 ${b.bleed}`);
    }
    return notes;
  }

  if (defId === "defend" || defId === "defend2") {
    let block = def.block ?? 0;
    if (hasTech(b, "throne") && (b.player.pos === 0 || b.player.pos === BOARD_SIZE - 1)) block += 4;
    b.playerBlock += block;
    notes.push(`格挡 ${block}`);
    return notes;
  }

  if (defId === "backpalm") {
    const foe = targetFoe(b) ?? b.enemy;
    notes.push(...movePlayer(b, awayDir(foe.pos, b.player.pos), 1, false));
    if (notes.length === 0) notes.push("身后无路");
    let block = def.block ?? 0;
    if (hasTech(b, "throne") && (b.player.pos === 0 || b.player.pos === BOARD_SIZE - 1)) block += 4;
    b.playerBlock += block;
    notes.push(`格挡 ${block}`);
    return notes;
  }

  if (defId === "charge" || defId === "charge2") {
    const bonus = def.chargeBonus ?? 4;
    b.nextDamage += bonus;
    notes.push(`下一招伤害 +${bonus}`);
    return notes;
  }

  if (defId === "advance" || defId === "advance2") {
    const ignore = hasTech(b, "ghostStep");
    const steps = def.steps ?? 1;
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
    if (drawOne(b)) notes.push("抽 1");
    return notes;
  }

  if (defId === "push" || defId === "push2" || defId === "sweep") {
    notes.push(...pushEnemy(b, def.knock ?? 1, def.wall));
    if (defId === "sweep" && drawOne(b)) notes.push("抽 1");
    return notes;
  }

  if (defId === "split") {
    const foe = targetFoe(b) ?? b.enemy;
    const dir = towardDir(b.player.pos, foe.pos);
    const front = b.player.pos + dir;
    const i = b.stakes.indexOf(front);
    if (i >= 0) {
      b.stakes.splice(i, 1);
      notes.push("桩裂了");
      return notes;
    }
    const ahead =
      dir > 0
        ? b.stakes.filter((p) => p > b.player.pos).sort((a, c) => a - c)[0]
        : b.stakes.filter((p) => p < b.player.pos).sort((a, c) => c - a)[0];
    if (ahead !== undefined) {
      b.stakes.splice(b.stakes.indexOf(ahead), 1);
      notes.push("桩裂了");
      return notes;
    }
    return hitEnemy(b, strikeDamage(b, def.damage ?? 7), "裂桩 ");
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
    return notes;
  }

  if (defId === "cut") {
    const melee = adjacent(b);
    const bonus = melee ? (def.nearBonus ?? 0) : 0;
    const notes = hitEnemy(b, strikeDamage(b, (def.damage ?? 0) + bonus, melee), def.name + " ");
    if (melee) {
      b.bleed = Math.min(9, b.bleed + (def.bleed ?? 1));
      notes.push(`裂创 ${b.bleed}`);
    }
    return notes;
  }

  if (defId === "thrust") {
    const foe = targetFoe(b);
    const dist = foe ? Math.abs(b.player.pos - foe.pos) : 0;
    const bonus = dist >= 2 ? (def.farBonus ?? 0) : 0;
    return hitEnemy(b, strikeDamage(b, (def.damage ?? 0) + bonus), def.name + " ");
  }

  if (defId === "pierce") {
    notes.push(...hitEnemy(b, strikeDamage(b, def.damage ?? 0), def.name + " ", false));
    notes.push(...pushEnemy(b, def.knock ?? 1));
    b.nextDamage = 0;
    return notes;
  }

  if (defId === "plant") {
    const foe = targetFoe(b) ?? b.enemy;
    const at = b.player.pos + towardDir(b.player.pos, foe.pos);
    if (at >= 0 && at < BOARD_SIZE && !occupied(b, at)) {
      b.stakes.push(at);
      notes.push(`桩落在第 ${at + 1} 步`);
    } else notes.push("身前落不下");
    return notes;
  }

  if (defId === "hookpull") {
    notes.push(...pullUnit(b, "enemy", "player", def.pullEnemy ?? 2));
    notes.push(...hitEnemy(b, strikeDamage(b, def.damage ?? 0), def.name + " "));
    if (companionOn(b) && b.active === "hooker") {
      b.nextDamage += 2;
      notes.push("缆手 下一掌 +2");
    }
    return notes;
  }

  if (defId === "bleedcut") {
    notes.push(...hitEnemy(b, strikeDamage(b, def.damage ?? 0), def.name + " "));
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
    b.playerBlock += def.block ?? 6;
    notes.push(`格挡 ${def.block ?? 6}`);
    if (drawOne(b)) notes.push("抽 1");
    return notes;
  }

  if (defId === "chain" || defId === "chain2") {
    const linked = b.combo > 0;
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
    b.flow = Math.min(3, b.flow + (def.flow ?? 1));
    notes.push(`气脉 ${b.flow}`);
    if (drawOne(b)) notes.push("抽 1");
    return notes;
  }

  if (defId === "setup") {
    b.setup += def.setupGain ?? 1;
    notes.push(`铺势 ${b.setup}`);
    if (drawOne(b)) notes.push("抽 1");
    return notes;
  }

  if (defId === "finisher" || defId === "finisher2") {
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
    return notes;
  }

  if (defId === "echo") {
    b.echoNext += def.echo ?? 6;
    notes.push(`尾劲下回 +${b.echoNext}`);
    return notes;
  }

  if (defId === "ironform") {
    const block = def.block ?? 10;
    b.playerBlock += block;
    b.retainTurns = Math.max(b.retainTurns, def.retainTurns ?? 2);
    b.retainAmt = Math.max(b.retainAmt, def.retainAmt ?? 6);
    notes.push(`格挡 ${block}`);
    notes.push(`铁布留 ${b.retainAmt} · ${b.retainTurns} 回`);
    return notes;
  }

  if (defId === "marking") {
    b.mark = Math.min(5, b.mark + (def.mark ?? 2));
    notes.push(...hitEnemy(b, strikeDamage(b, def.damage ?? 4), def.name + " "));
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
    notes.push(...hitEnemy(b, strikeDamage(b, def.damage ?? 3), linked ? "叠掌 " : "单叠 "));
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
    notes.push(...hitEnemy(b, strikeDamage(b, def.damage ?? 10), def.name + " "));
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

  // Generic expansion: damage / block / knock / status packs
  if (def.damage) notes.push(...hitEnemy(b, strikeDamage(b, def.damage), def.name + " "));
  if (def.block) {
    b.playerBlock += def.block + (pathSkillMods(battleGearId).blockExtra ?? 0);
    notes.push(`格挡 ${def.block}`);
  }
  if (def.knock) notes.push(...pushEnemy(b, def.knock, def.wall));
  if (def.pullEnemy) notes.push(...pullUnit(b, "enemy", "player", def.pullEnemy));
  if (def.bleed) {
    b.bleed = Math.min(9, b.bleed + def.bleed);
    notes.push(`裂创 ${b.bleed}`);
  }
  if (def.expose) {
    b.expose += def.expose;
    notes.push(`破绽 ${b.expose}`);
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
  if (notes.length) return notes;

  notes.push("没有这一招");
  return notes;
}

function checkWin(b: Battle): void {
  if (livingFoes(b).length === 0) {
    b.enemy.hp = 0;
    b.phase = "won";
    b.log.push(`${b.enemy.name}败下。`);
  }
}

export function canPlay(b: Battle, uid: string): { ok: boolean; reason?: string } {
  if (b.phase !== "player") return { ok: false, reason: "现在不是你的回合" };
  const inst = b.hand.find((c) => c.uid === uid);
  if (!inst) return { ok: false, reason: "不在手牌里" };
  const def = CARDS[inst.defId];
  if (!def) return { ok: false, reason: "残谱缺损" };
  if (def.type === "skill" && b.youMute > 0) return { ok: false, reason: "禁技：这一息打不出技能" };
  const need = def.cost + (def.stackTaxQi ?? 0);
  if (b.energy < need) return { ok: false, reason: "劲力不足" };
  if ((def.comboCost ?? 0) > 0 && b.combo < (def.comboCost ?? 0)) return { ok: false, reason: "连势不够" };
  if ((def.flowCost ?? 0) > 0 && b.flow < (def.flowCost ?? 0)) return { ok: false, reason: "气脉不够" };
  if ((def.setupCost ?? 0) > 0 && b.setup < (def.setupCost ?? 0)) return { ok: false, reason: "铺势不够" };
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

export function previewCard(b: Battle, uid: string): Preview {
  const gate = canPlay(b, uid);
  const inst = b.hand.find((c) => c.uid === uid);
  if (!inst) return snapshot(b, [], false, gate.reason);
  const next = cloneBattle(b);
  const notes = applyCard(next, inst.defId);
  return snapshot(next, notes, gate.ok, gate.reason);
}

export function playCard(b: Battle, uid: string): Battle {
  const gate = canPlay(b, uid);
  if (!gate.ok) return b;
  const next = cloneBattle(b);
  const inst = next.hand.find((c) => c.uid === uid);
  if (!inst) return b;
  const def = CARDS[inst.defId];
  const notes = applyCard(next, inst.defId);
  const spend = def.cost + (def.stackTaxQi ?? 0);
  next.energy -= spend;
  if (def.comboCost) next.combo = Math.max(0, next.combo - def.comboCost);
  if (def.flowCost) next.flow = Math.max(0, next.flow - def.flowCost);
  if (def.setupCost) next.setup = Math.max(0, next.setup - def.setupCost);
  if (def.type === "attack") next.attacksThisTurn += 1;
  next.lastPlay = def.type;
  const still = next.hand.findIndex((c) => c.uid === uid);
  if (still >= 0) {
    next.hand.splice(still, 1);
    next.discardPile.push(inst);
  }
  next.playedThisTurn.push(def.name);
  note(next, "you", `${def.name}：${notes.join("，") || "无效果"}`);
  checkWin(next);
  return next;
}

function drawToHand(b: Battle): void {
  while (b.hand.length < handCap(b)) {
    if (!drawOne(b)) break;
  }
}

function hitPlayer(b: Battle, raw: number, verb: string): void {
  const cut = b.frail > 0 ? 3 : 0;
  const sway = b.youSway > 0 ? 3 : 0;
  const gift = b.youGift > 0 ? 4 : 0;
  if (b.youGift > 0) b.youGift = 0;
  const extraThorn = companionOn(b) && b.active === "sapper" && b.playerBlock > 0 ? 1 : 0;
  const incoming = Math.max(1, raw - cut + sway + gift);
  const blocked = Math.min(b.playerBlock, incoming);
  const taken = incoming - blocked;
  b.playerBlock -= blocked;
  b.player.hp -= taken;
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
  if (b.player.hp <= 0) {
    b.player.hp = 0;
    b.phase = "lost";
    note(b, "you", "你倒了。");
  }
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

export function dangerCells(b: Battle): number[] {
  const intent = b.intent;
  if (intent.kind === "strike") return [b.player.pos];
  if (intent.kind === "charge") return chargePath(b);
  if (intent.kind === "stake") {
    const dir = awayDir(b.player.pos, b.enemy.pos);
    return [b.enemy.pos + dir];
  }
  if (intent.kind === "trap") return [b.player.pos];
  if (intent.kind === "lunge") {
    const dir = towardDir(b.enemy.pos, b.player.pos);
    const step = b.enemy.pos + dir;
    if (adjacent(b) || step === b.player.pos) return [b.player.pos];
    return step >= 0 && step < BOARD_SIZE ? [step] : [];
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
  if (intent.kind === "barrage") return [b.player.pos];
  if (intent.kind === "bleedcut" || intent.kind === "seal" || intent.kind === "shatter") return [b.player.pos];
  return [];
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
    if (occupied(b, next, b.enemy.id)) break;
    b.enemy.pos = next;
  }
  if (!hits && Math.abs(b.enemy.pos - b.player.pos) === 1) hits = true;
  if (hits) hitPlayer(b, damage, "冲锋 ");
  else b.log.push(`${b.enemy.name}冲过去了。`);
}

function resolveStake(b: Battle): void {
  const dir = awayDir(b.player.pos, b.enemy.pos);
  const at = b.enemy.pos + dir;
  if (at >= 0 && at < BOARD_SIZE && !occupied(b, at, b.enemy.id)) {
    b.stakes.push(at);
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
  if (!adjacent(b)) {
    const next = b.enemy.pos + towardDir(b.enemy.pos, b.player.pos);
    if (next >= 0 && next < BOARD_SIZE && !occupied(b, next, b.enemy.id)) b.enemy.pos = next;
  }
  if (adjacent(b) || b.enemy.pos === b.player.pos) hitPlayer(b, damage, "抢步 ");
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
  if (intent.kind === "strike") hitPlayer(b, intent.damage, "劈 ");
  else if (intent.kind === "charge") resolveCharge(b, intent.damage);
  else if (intent.kind === "stake") resolveStake(b);
  else if (intent.kind === "pull") {
    const notes = pullUnit(b, "player", "enemy", intent.steps);
    note(b, "foe", notes[0] ?? `${b.enemy.name}缆没拉住。`);
  } else if (intent.kind === "trap") resolveTrap(b);
  else if (intent.kind === "windup") note(b, "foe", `${b.enemy.name}在蓄。`);
  else if (intent.kind === "lunge") resolveLunge(b, intent.damage);
  else if (intent.kind === "barrage") {
    for (let i = 0; i < intent.hits; i++) {
      if (b.phase !== "player") break;
      hitPlayer(b, intent.damage, `连打${i + 1} `);
    }
  } else if (intent.kind === "guard") {
    const before = b.enemyBlock;
    b.enemyBlock = Math.min(ENEMY_BLOCK_CAP, b.enemyBlock + intent.block);
    const gained = b.enemyBlock - before;
    note(b, "foe", `${b.enemy.name}架住了 ${gained}${b.enemyBlock >= ENEMY_BLOCK_CAP ? "（已顶满）" : ""}。`);
  } else if (intent.kind === "bleedcut") {
    hitPlayer(b, intent.damage, "刀创 ");
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
    b.youSlow = Math.max(b.youSlow, 2);
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
  } else resolveSwap(b);
}

function distTo(b: Battle): number {
  const foe = targetFoe(b);
  if (!foe) return 0;
  return Math.abs(b.player.pos - foe.pos);
}

function weaponRiposte(id: EnemyId): RiposteKind {
  const w = ENEMY_WEAPON[id];
  if (w === "staff") return "ward";
  if (w === "hook") return "knock";
  if (w === "sword") return "bleed";
  return "slash";
}

function reactToPlayer(b: Battle): Intent | null {
  const def = ENEMIES[b.enemyId];
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
  if (foe.hp * 3 <= foe.maxHp && b.bleed >= 2) return { kind: "mend", heal: 10 };
  if (b.youRiposte && d <= 2) {
    if (w === "hook") return { kind: "pull", steps: 2 };
    if (w === "staff") return { kind: "stake" };
    if (w === "sword") return { kind: "seal" };
    return { kind: "guard", block: 10 };
  }
  if (b.bleed >= 5) return { kind: "mend", heal: 10 };
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
  return scaleIntent(pickIntent(b));
}

function pickIntent(b: Battle): Intent {
  const def = ENEMIES[b.enemyId];
  const d = distTo(b);
  if (def.id === "delay") {
    b.intentIndex = (b.intentIndex + 1) % def.pattern.length;
    return def.pattern[b.intentIndex];
  }
  if (!isSparEnemy(def.id)) {
    const reacted = reactToPlayer(b);
    if (reacted) return reacted;
  }
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

function followIntent(b: Battle, prior: Intent): Intent {
  const d = distTo(b);
  let next: Intent;
  if (prior.kind === "windup") next = { kind: "strike", damage: 16 };
  else if (prior.kind === "stake") next = { kind: "strike", damage: 14 };
  else if (prior.kind === "guard") next = d === 1 ? { kind: "strike", damage: 14 } : { kind: "lunge", damage: 12 };
  else if (prior.kind === "breathe") next = { kind: "guard", block: 8 };
  else if (prior.kind === "mend") next = d === 1 ? { kind: "guard", block: 8 } : { kind: "lunge", damage: 12 };
  else if (prior.kind === "shatter") next = d === 1 ? { kind: "strike", damage: 15 } : { kind: "lunge", damage: 13 };
  else if (prior.kind === "charge" || prior.kind === "pull") next = { kind: "strike", damage: 12 };
  else if (prior.kind === "strike" || prior.kind === "lunge" || prior.kind === "barrage") {
    // 打完一轮后常接卸力/吐纳，避免只会砍
    if (b.turn % 3 === 0) next = { kind: "breathe", amount: 3 };
    else if (b.enemyBlock < 6) next = { kind: "guard", block: 8 };
    else if (d === 1) next = { kind: "strike", damage: 12 };
    else next = { kind: "guard", block: 6 };
  } else if (d === 1) next = { kind: "strike", damage: 12 };
  else if (d >= 3) next = { kind: "lunge", damage: 11 };
  else next = { kind: "guard", block: 6 };
  return scaleIntent(next);
}

function planFromFirst(b: Battle, first: Intent): void {
  const planned: Intent[] = [first];
  // 意图条数按旧「敌手预算」(1–4)，与蓝条上限脱钩
  const budgetCap = ENEMY_ENERGY[b.enemyId] ?? 2;
  let budget = Math.max(0, budgetCap - intentCost(first));
  let last = first;
  let guard = 0;
  while (budget > 0 && guard < 6) {
    guard += 1;
    const next = followIntent(b, last);
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
  b.intents = planned;
  b.intent = planned[0];
}

function rollIntent(b: Battle): void {
  planFromFirst(b, chooseIntent(b));
}

function seedIntents(b: Battle): void {
  const def = ENEMIES[b.enemyId];
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
  const weapon = MATES[id].weapon;
  const dumped = next.hand.filter((c) => {
    const school = cardSchool(c.defId);
    return school !== "any" && school !== weapon;
  });
  if (dumped.length) {
    next.hand = next.hand.filter((c) => {
      const school = cardSchool(c.defId);
      return school === "any" || school === weapon;
    });
    next.discardPile.push(...dumped);
    for (let i = 0; i < dumped.length; i++) drawOne(next);
    next.log.push(`${MATES[id].name}替上。先机 ${yourPace(next)}。异谱 ${dumped.length} 张落地，补了同等。`);
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
  const next = cloneBattle(b);
  const carry = hasTech(next, "leftover") ? Math.min(1, next.energy) : 0;
  next.log.push("你收势。");
  if (companionOn(next) && next.active === "seer" && next.energy === 0) {
    next.energyNext += 1;
    next.log.push("余墨，下回劲力 +1");
  }
  if (companionOn(next) && next.active === "pilgrim" && next.attacksThisTurn === 0) {
    const n = healYou(next, 1);
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
  applyTether(next);
  springTraps(next);
  if (next.phase !== "player") return next;
  resolveAllIntents(next);
  if (next.phase !== "player") return next;
  for (const extra of livingFoes(next).filter((f) => f.id !== next.enemy.id)) {
    actAlly(next, extra);
    if (next.phase !== "player") return next;
  }
  if (next.bleed > 0) {
    const foe = livingFoes(next)[0];
    if (foe) {
      foe.hp -= next.bleed;
      note(next, "you", `裂创 ${next.bleed}`);
      syncFront(next);
      if (foe.hp <= 0) checkWin(next);
    }
  }
  if (next.youBleed > 0 && next.phase === "player") {
    const taken = next.youBleed;
    const blocked = Math.min(next.playerBlock, taken);
    next.playerBlock -= blocked;
    next.player.hp -= taken - blocked;
    note(
      next,
      "foe",
      blocked === taken ? `裂创 ${taken}，全部卸掉。` : `你裂创 ${taken}。`,
    );
    if (next.player.hp <= 0) {
      next.player.hp = 0;
      next.phase = "lost";
      note(next, "you", "你倒了。");
    }
  }
  if (next.phase !== "player") return next;
  if (next.youSway > 0) next.youSway -= 1;
  tickRiposte(next, "you");
  tickRiposte(next, "foe");
  next.movedFwd = false;
  next.movedBack = false;
  next.enteredMelee = false;
  next.turn += 1;
  const kept = hasTech(next, "keepGuard") ? Math.min(4, next.playerBlock) : 0;
  let retained = 0;
  if (next.retainTurns > 0 && next.retainAmt > 0) {
    retained = next.retainAmt;
    next.retainTurns -= 1;
    note(next, "you", `铁布开局 ${retained}`);
  }
  next.playerBlock = Math.max(kept, retained);
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
  applyMateOpen(next);
  drawToHand(next);
  rollIntent(next);
  if (hasTech(next, "delayGuard") && next.intent.kind === "windup") {
    next.playerBlock += 3;
    note(next, "you", "等手，卸了这一息。");
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
    push("thorns", "反震", b.thorns, "他打你时，你按这个数回敬。");
    push("combo", "连势", b.combo, "下一掌更重，或让连环接上。");
    push("flow", "气脉", b.flow, "本场攻击各加这么多。最多 3。");
    push("setup", "铺势", b.setup, "收势掌按层数加伤，然后清掉。");
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
    if (b.foeMute > 0) push("mute", "禁技", b.foeMute, "他暂时打不出技能意图强化。");
    if (b.foeNoBag > 0) push("nobag", "封囊", b.foeNoBag, "他袋里的药/暗器用不上（对你亦同规则）。");
    if (b.foeHandTax > 0) push("handtax", "削谱", b.foeHandTax, "压迫他的节奏。");
    if (b.foeQiBurn > 0) push("qiburn", "扣劲", b.foeQiBurn, "他回劲变慢。");
  }
  return chips;
}
