import { CARDS, ENEMIES, STARTER, enemyPace } from "./content";
import { MATES, WEAPON_PACE, deckFor, isLead } from "./party";
import { makeRun } from "./run";
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
  type Intent,
  type Preview,
  type Run,
  type TechniqueId,
  type Unit,
} from "./types";

let seq = 0;
function uid(): string {
  seq += 1;
  return `c${seq}`;
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
  const main: Unit = {
    id: def.id,
    name: def.name,
    title: def.title,
    hp: def.hp,
    maxHp: def.hp,
    pos: def.pos,
  };
  if (id !== "twin") return [main];
  return [
    { ...main, id: "twin", hp: 24, maxHp: 24, pos: 3 },
    { id: "shadow", name: "影", title: "镜中人", hp: 24, maxHp: 24, pos: 6 },
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
  const def = ENEMIES[enemyId];
  const active = run.active ?? "rail";
  const deck = deal(deckFor(run, active), ordered);
  const foes = foePack(enemyId);
  const mateHp = (id: CompanionId) =>
    isLead(run, id) ? run.hp : (run.companionHp[id] ?? MATES[id].hp);
  const mateMax = (id: CompanionId) => (isLead(run, id) ? run.hpMax : MATES[id].hp);
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
    energy: STARTER.energy,
    energyMax: STARTER.energy,
    nextDamage: 0,
    stakes: [],
    traps: [],
    techniques: [...run.techniques],
    hand: deck.hand,
    drawPile: deck.drawPile,
    discardPile: [],
    intent: def.pattern[0],
    intentIndex: 0,
    turn: 1,
    phase: "player",
    log: [def.pitch],
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
    paceBoost: 0,
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
  return weaponPace(b.active) + b.paceBoost;
}

function seizeOpening(b: Battle): void {
  if (yourPace(b) >= b.foePace) return;
  b.log.push(`${b.enemy.name}手先到。`);
  resolveIntent(b);
  if (b.phase !== "player") return;
  rollIntent(b);
  b.log.push(`${b.enemy.name}：${labelIntent(b.intent)}`);
}

function setupBattle(b: Battle): void {
  if (hasTech(b, "heelStake")) {
    const at = 1;
    if (!occupied(b, at)) b.stakes.push(at);
  }
  if (hasTech(b, "stackHand")) drawOne(b);
  if (hasTech(b, "delayGuard") && b.intent.kind === "windup") {
    b.playerBlock += 3;
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
  if (intent.kind === "guard") return `架势 格挡 ${intent.block}`;
  return "身前落桩";
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

function handCap(b: Battle): number {
  return HAND_SIZE + (hasTech(b, "stackHand") ? 1 : 0);
}

function strikeDamage(b: Battle, base: number, forceMelee = false): number {
  let dmg = base + b.nextDamage + b.flow + b.mark;
  if (hasTech(b, "brightBlade") && (forceMelee || adjacent(b))) dmg += 3;
  if (b.expose > 0) {
    dmg += 4;
    b.expose -= 1;
  }
  if (b.combo > 0) {
    dmg += b.combo * 2;
    b.combo = 0;
  }
  return dmg;
}

function intentThreat(b: Battle): number {
  const intent = b.intent;
  if (intent.kind === "strike" || intent.kind === "lunge") return intent.damage;
  if (intent.kind === "charge") return intent.damage;
  if (intent.kind === "barrage") return intent.damage * intent.hits;
  return 0;
}

function hitEnemy(b: Battle, raw: number, verb: string, spendCharge = true): string[] {
  const foe = targetFoe(b);
  if (!foe) return ["没有目标"];
  let dmg = raw;
  const notes: string[] = [];
  if (b.enemyBlock > 0) {
    const blocked = Math.min(b.enemyBlock, dmg);
    b.enemyBlock -= blocked;
    dmg -= blocked;
    if (blocked) notes.push(`他卸了 ${blocked}`);
  }
  foe.hp -= dmg;
  if (spendCharge) b.nextDamage = 0;
  notes.unshift(`${verb}${dmg}`);
  if (foe.hp <= 0) notes.push(`${foe.name}倒下`);
  syncFront(b);
  return notes;
}

function pushEnemy(b: Battle, dist: number, wall?: number): string[] {
  const notes: string[] = [];
  const e = targetFoe(b);
  if (!e) return ["没有目标"];
  const need = knockDist(b, dist);
  let left = need;
  while (left > 0 && e.hp > 0) {
    const next = e.pos + 1;
    if (next >= BOARD_SIZE) {
      const wh = wallHit(b, wall);
      e.hp -= wh;
      notes.push(`撞壁 ${wh}`);
      break;
    }
    if (occupied(b, next, e.id)) {
      notes.push(b.stakes.includes(next) ? "桩挡住了" : "去路被占，停下");
      break;
    }
    e.pos = next;
    left -= 1;
  }
  if (left < need && left >= 0) notes.unshift(`击退至第 ${e.pos + 1} 步`);
  if (e.hp <= 0) notes.push(`${e.name}倒下`);
  syncFront(b);
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
  return notes;
}

function movePlayer(b: Battle, dir: 1 | -1, steps: number, ignoreStakes: boolean): string[] {
  const notes: string[] = [];
  let moved = 0;
  for (let i = 0; i < steps; i++) {
    const next = b.player.pos + dir;
    if (occupied(b, next, b.player.id, ignoreStakes)) break;
    b.player.pos = next;
    moved += 1;
  }
  if (moved > 0) notes.push(`${dir > 0 ? "前进" : "后退"}至第 ${b.player.pos + 1} 步`);
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
    return hitEnemy(b, strikeDamage(b, def.damage ?? 0), def.name + " ");
  }

  if (defId === "drawcut") {
    const melee = adjacent(b) || hasTech(b, "closeCut");
    const base = melee ? 9 : 4;
    return hitEnemy(b, strikeDamage(b, base, melee), melee ? "抽刀 " : "抽刀远 ");
  }

  if (defId === "defend" || defId === "defend2") {
    let block = def.block ?? 0;
    if (hasTech(b, "throne") && b.player.pos === 0) block += 4;
    b.playerBlock += block;
    notes.push(`格挡 ${block}`);
    return notes;
  }

  if (defId === "backpalm") {
    notes.push(...movePlayer(b, -1, 1, false));
    if (notes.length === 0) notes.push("身后无路");
    let block = def.block ?? 0;
    if (hasTech(b, "throne") && b.player.pos === 0) block += 4;
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
    const front = b.player.pos + 1;
    if (hasTech(b, "bodyCheck") && front === b.enemy.pos) {
      notes.push(...hitEnemy(b, 6, "对撞 ", false));
    } else {
      const moved = movePlayer(b, 1, steps, ignore);
      if (moved.length === 0 && hasTech(b, "backstep")) {
        notes.push(...movePlayer(b, -1, 1, ignore));
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
    const front = b.player.pos + 1;
    const i = b.stakes.indexOf(front);
    if (i >= 0) {
      b.stakes.splice(i, 1);
      notes.push("桩裂了");
      return notes;
    }
    const ahead = b.stakes.filter((p) => p > b.player.pos).sort((a, c) => a - c)[0];
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
    const target = foe.pos - 1;
    if (target === b.player.pos) {
      notes.push("已经贴着");
      return notes;
    }
    if (pathClear(b, b.player.pos, target)) {
      b.player.pos = target;
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
    const bonus = adjacent(b) ? (def.nearBonus ?? 0) : 0;
    return hitEnemy(b, strikeDamage(b, (def.damage ?? 0) + bonus, adjacent(b)), def.name + " ");
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
    const at = b.player.pos + 1;
    if (at < BOARD_SIZE && !occupied(b, at)) {
      b.stakes.push(at);
      notes.push(`桩落在第 ${at + 1} 步`);
    } else notes.push("身前落不下");
    return notes;
  }

  if (defId === "hookpull") {
    notes.push(...pullUnit(b, "enemy", "player", def.pullEnemy ?? 2));
    notes.push(...hitEnemy(b, strikeDamage(b, def.damage ?? 0), def.name + " "));
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
    b.combo += 1;
    notes.push(`连势 ${b.combo}`);
    return notes;
  }

  if (defId === "follow" || defId === "follow2") {
    const linked = b.attacksThisTurn > 0;
    const base = defId === "follow2" ? (linked ? 8 : 4) : linked ? 6 : 3;
    notes.push(...hitEnemy(b, strikeDamage(b, base), linked ? "追掌 " : "虚掌 "));
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
  if (b.energy < def.cost) return { ok: false, reason: "劲力不足" };
  return { ok: true };
}

function snapshot(b: Battle, notes: string[], legal: boolean, reason?: string): Preview {
  return {
    playerHp: b.player.hp,
    playerBlock: b.playerBlock,
    enemyHp: Math.max(0, b.enemy.hp),
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
  next.energy -= def.cost;
  if (def.type === "attack") next.attacksThisTurn += 1;
  next.lastPlay = def.type;
  const still = next.hand.findIndex((c) => c.uid === uid);
  if (still >= 0) {
    next.hand.splice(still, 1);
    next.discardPile.push(inst);
  }
  next.playedThisTurn.push(def.name);
  next.log.push(`${def.name}：${notes.join("，") || "无效果"}`);
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
  const incoming = Math.max(1, raw - cut);
  const blocked = Math.min(b.playerBlock, incoming);
  const taken = incoming - blocked;
  b.playerBlock -= blocked;
  b.player.hp -= taken;
  b.log.push(
    taken === 0
      ? `${b.enemy.name}${verb}${incoming}，全部卸掉。`
      : `${b.enemy.name}${verb}${incoming}。格挡 ${blocked}，你受 ${taken}。`,
  );
  if (raw > 0 && (b.thorns > 0 || hasTech(b, "rebound"))) {
    const back = b.thorns + (hasTech(b, "rebound") ? 3 : 0);
    if (back > 0) {
      const notes = hitEnemy(b, back, "回敬 ", false);
      b.log.push(notes.join("，"));
      checkWin(b);
    }
  }
  if (b.player.hp <= 0) {
    b.player.hp = 0;
    b.phase = "lost";
    b.log.push("你倒了。");
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
  for (let i = 0; i < steps; i++) {
    const next = pos - 1;
    if (next < 0) break;
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
  if (intent.kind === "stake") return [b.enemy.pos + 1];
  if (intent.kind === "trap") return [b.player.pos];
  if (intent.kind === "lunge") {
    const step = b.enemy.pos - 1;
    if (adjacent(b) || step === b.player.pos) return [b.player.pos];
    return step >= 0 ? [step] : [];
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
  return [];
}

function resolveCharge(b: Battle, damage: number): void {
  const steps = chargeSteps(b);
  let hits = false;
  for (let i = 0; i < steps; i++) {
    const next = b.enemy.pos - 1;
    if (next < 0) break;
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
  const at = b.enemy.pos + 1;
  if (at < BOARD_SIZE && !occupied(b, at, b.enemy.id)) {
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
    const next = b.enemy.pos - 1;
    if (next >= 0 && !occupied(b, next, b.enemy.id)) b.enemy.pos = next;
  }
  if (adjacent(b) || b.enemy.pos === b.player.pos) hitPlayer(b, damage, "抢步 ");
  else b.log.push(`${b.enemy.name}抢空了。`);
}

function resolveSwap(b: Battle): void {
  if (!adjacent(b)) {
    const next = b.enemy.pos - 1;
    if (next >= 0 && !occupied(b, next, b.enemy.id)) {
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

function resolveIntent(b: Battle): void {
  const intent = b.intent;
  if (intent.kind === "strike") hitPlayer(b, intent.damage, "劈 ");
  else if (intent.kind === "charge") resolveCharge(b, intent.damage);
  else if (intent.kind === "stake") resolveStake(b);
  else if (intent.kind === "pull") {
    const notes = pullUnit(b, "player", "enemy", intent.steps);
    b.log.push(notes[0] ?? `${b.enemy.name}缆没拉住。`);
  } else if (intent.kind === "trap") resolveTrap(b);
  else if (intent.kind === "windup") b.log.push(`${b.enemy.name}在蓄。`);
  else if (intent.kind === "lunge") resolveLunge(b, intent.damage);
  else if (intent.kind === "barrage") {
    for (let i = 0; i < intent.hits; i++) {
      if (b.phase !== "player") break;
      hitPlayer(b, intent.damage, `连打${i + 1} `);
    }
  } else if (intent.kind === "guard") {
    b.enemyBlock += intent.block;
    b.log.push(`${b.enemy.name}架住了 ${intent.block}。`);
  } else resolveSwap(b);
}

function distTo(b: Battle): number {
  const foe = targetFoe(b);
  if (!foe) return 0;
  return Math.abs(b.player.pos - foe.pos);
}

function chooseIntent(b: Battle): Intent {
  const def = ENEMIES[b.enemyId];
  const d = distTo(b);
  if (def.id === "delay") {
    b.intentIndex = (b.intentIndex + 1) % def.pattern.length;
    return def.pattern[b.intentIndex];
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
    if (d > 2) return { kind: "charge", damage: 17, steps: 2 };
    if (d === 1 && b.turn % 2 === 0) return { kind: "barrage", damage: 9, hits: 2 };
    return { kind: "strike", damage: 19 };
  }
  if (def.id === "smuggler" || def.id === "warden" || def.id === "nametaker") {
    const i = b.intentIndex % 3;
    b.intentIndex += 1;
    if (i === 0) return { kind: "guard", block: def.id === "smuggler" ? 12 : 10 };
    if (i === 1) return { kind: "windup" };
    return { kind: "strike", damage: def.id === "smuggler" ? 20 : 26 };
  }
  if (def.id === "raider" || def.id === "glasspin" || def.id === "cavehand") {
    if (d === 1) return { kind: "barrage", damage: 9, hits: 2 };
    if (d >= 3) return { kind: "lunge", damage: 16 };
    return { kind: "pull", steps: 2 };
  }
  if (def.id === "robber" || def.id === "thug") {
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
    hitPlayer(b, 12, `${unit.name}补了一刀，`);
    return;
  }
  const dir = b.player.pos > unit.pos ? 1 : -1;
  const next = unit.pos + dir;
  if (!occupied(b, next, unit.id)) {
    unit.pos = next;
    b.log.push(`${unit.name}近了一步。`);
  }
}

function rollIntent(b: Battle): void {
  b.intent = chooseIntent(b);
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
  next.log.push(`${MATES[id].name}替上。先机 ${yourPace(next)}。手里换了一套谱。`);
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
  applyTether(next);
  springTraps(next);
  if (next.phase !== "player") return next;
  resolveIntent(next);
  if (next.phase !== "player") return next;
  for (const extra of livingFoes(next).filter((f) => f.id !== next.enemy.id)) {
    actAlly(next, extra);
    if (next.phase !== "player") return next;
  }
  if (next.bleed > 0) {
    const foe = livingFoes(next)[0];
    if (foe) {
      foe.hp -= next.bleed;
      next.log.push(`裂创 ${next.bleed}`);
      syncFront(next);
      if (foe.hp <= 0) checkWin(next);
    }
  }
  if (next.phase !== "player") return next;
  next.turn += 1;
  const kept = hasTech(next, "keepGuard") ? Math.min(4, next.playerBlock) : 0;
  let retained = 0;
  if (next.retainTurns > 0 && next.retainAmt > 0) {
    retained = next.retainAmt;
    next.retainTurns -= 1;
    next.log.push(`铁布开局 ${retained}`);
  }
  next.playerBlock = Math.max(kept, retained);
  next.energy = next.energyMax + next.energyNext + carry;
  next.energyNext = 0;
  next.thorns = 0;
  next.frail = Math.max(0, next.frail - 1);
  next.nextDamage = next.echoNext;
  if (next.echoNext > 0) next.log.push(`尾劲入掌 +${next.echoNext}`);
  next.echoNext = 0;
  if (next.mark > 0) next.mark = Math.max(0, next.mark - 1);
  next.playedThisTurn = [];
  next.attacksThisTurn = 0;
  next.lastPlay = null;
  next.swappedThisTurn = false;
  drawToHand(next);
  rollIntent(next);
  if (hasTech(next, "delayGuard") && next.intent.kind === "windup") {
    next.playerBlock += 3;
    next.log.push("等手，卸了这一息。");
  }
  next.log.push(`${next.enemy.name}：${labelIntent(next.intent)}`);
  return next;
}
