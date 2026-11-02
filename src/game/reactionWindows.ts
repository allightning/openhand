import { boardLen } from "./board";
import { unitBackToWall } from "./rules/wallLinks";
import {
  CLIMB_FOE_BIND_STREAK,
  CLIMB_FOE_DISMANTLE_COST,
  CLIMB_FOE_DISMANTLE_MUL,
  CLIMB_FOE_READ_STREAK,
  CLIMB_FOE_WINDOW_CAP,
  CLIMB_PARRY_BLOCK_RATIO,
  CLIMB_PARRY_EVERY,
  CLIMB_PARRY_REFLECT_RATIO,
  CLIMB_SPEAR_REJECT_DIST,
  CLIMB_STAFF_PIERCE_NEW,
  CLIMB_STAFF_PIERCE_OLD,
  CLIMB_SWORD_CHAIN_CAP,
  CLIMB_WINDOW_BASE_HIT,
  CLIMB_WINDOW_FIGHT_CAP,
  CLIMB_WINDOW_HP_RATIO,
  CLIMB_WINDOW_QI_BIG,
  CLIMB_WINDOW_QI_SMALL,
} from "./climbCaps";
import type { Battle, CardDef, Intent, ReactionKind, ReactionWindow, WeaponId } from "./types";

export interface WindowTick {
  phase: "move" | "strike" | "recover" | "guard" | "windup";
  toward: boolean;
  fromDist: number;
  destDist: number;
  leftover: number;
  dir: number;
  intentKind: string;
  fromPos: number;
  damage?: number;
  heal?: number;
  qi?: number;
  blockAdd?: number;
  foeSchool?: WeaponId;
  feint?: boolean;
}

const STACK_SCHOOL: ReadonlySet<WeaponId> = new Set(["palm", "saber", "sword"]);

export interface WindowRow {
  kind: ReactionKind;
  school: WeaponId;
  cost: number;
  name: string;
  match: (b: Battle, t: WindowTick) => boolean;
}

function lowHp(b: Battle): boolean {
  return b.player.maxHp > 0 && b.player.hp / b.player.maxHp < CLIMB_WINDOW_HP_RATIO;
}

function backToWall(b: Battle): boolean {
  return unitBackToWall(b, b.player.pos);
}

function distOf(b: Battle): number {
  return Math.abs(b.player.pos - b.enemy.pos);
}

function placeEnemy(b: Battle, pos: number): void {
  b.enemy.pos = pos;
  const twin = b.foes?.find((f) => f.id === b.enemy.id);
  if (twin && twin !== b.enemy) twin.pos = pos;
}

export const WINDOWS: WindowRow[] = [
  {
    kind: "spearReverse",
    school: "spear",
    cost: CLIMB_WINDOW_QI_BIG,
    name: "回马枪",
    match: (b, t) =>
      t.phase === "move" &&
      t.toward &&
      t.destDist <= 2 &&
      (t.fromDist <= 2 || t.fromDist === 3) &&
      lowHp(b) &&
      backToWall(b),
  },
  {
    kind: "palmCut",
    school: "palm",
    cost: CLIMB_WINDOW_QI_BIG,
    name: "截拳",
    match: (_b, t) => t.phase === "windup" && t.fromDist <= 2,
  },
  {
    kind: "dartBreath",
    school: "dart",
    cost: CLIMB_WINDOW_QI_SMALL,
    name: "断息",
    match: (_b, t) => t.phase === "recover" && ((t.heal ?? 0) > 0 || (t.qi ?? 0) > 0),
  },
  {
    kind: "saberParry",
    school: "saber",
    cost: CLIMB_WINDOW_QI_SMALL,
    name: "弹反",
    match: (b, t) => t.phase === "strike" && t.fromDist <= 1 && (b.meleeHits ?? 0) === CLIMB_PARRY_EVERY - 1,
  },
  {
    kind: "swordSteal",
    school: "sword",
    cost: CLIMB_WINDOW_QI_SMALL,
    name: "偷势",
    match: (b, t) =>
      t.phase === "strike" &&
      t.fromDist <= 2 &&
      !!t.foeSchool &&
      STACK_SCHOOL.has(t.foeSchool) &&
      !b.stackedOnFoe &&
      !b.swordStealUsed,
  },
  {
    kind: "hookLimp",
    school: "hook",
    cost: CLIMB_WINDOW_QI_SMALL,
    name: "瘸跛",
    match: (_b, t) => t.phase === "move" && !t.toward && t.fromDist <= 2 && t.destDist > 2,
  },
  {
    kind: "staffPierce",
    school: "staff",
    cost: CLIMB_WINDOW_QI_BIG,
    name: "透棍",
    match: (b, t) =>
      t.phase === "guard" && !b.staffPierceUsed && b.enemyBlock > 0 && (t.blockAdd ?? 0) > 0,
  },
];

export function tickFromIntent(intent: Intent, dist: number, foeSchool?: WeaponId): WindowTick {
  const base = {
    toward: false,
    fromDist: dist,
    destDist: dist,
    leftover: 0,
    dir: 0,
    fromPos: 0,
    intentKind: intent.kind,
    foeSchool,
  };
  if (intent.kind === "mend") return { ...base, phase: "recover", heal: intent.heal };
  if (intent.kind === "breathe") return { ...base, phase: "recover", qi: intent.amount };
  if (intent.kind === "guard") return { ...base, phase: "guard", blockAdd: intent.block };
  if (intent.kind === "windup") return { ...base, phase: "windup" };
  if (intent.kind === "strike" || intent.kind === "barrage" || intent.kind === "bleedcut" || intent.kind === "pestle") {
    const damage = "damage" in intent ? intent.damage : 0;
    return { ...base, phase: "strike", damage };
  }
  return { ...base, phase: "move" };
}

export function matchWindow(b: Battle, school: WeaponId, tick: WindowTick): WindowRow | null {
  if (tick.feint) return null;
  if ((b.windowsUsed ?? 0) >= CLIMB_WINDOW_FIGHT_CAP) return null;
  if (b.reactionWindow) return null;
  return WINDOWS.find((row) => row.school === school && row.match(b, tick)) ?? null;
}

export function openWindow(b: Battle, row: WindowRow, tick: WindowTick): void {
  b.reactionWindow = {
    kind: row.kind,
    cost: row.cost,
    leftover: tick.leftover,
    dir: tick.dir,
    intentKind: tick.intentKind,
    anchor: tick.fromPos,
    ...(tick.damage != null ? { chargeDamage: tick.damage } : {}),
    ...((tick.heal ?? tick.qi ?? tick.blockAdd ?? tick.damage) != null
      ? { amount: tick.heal ?? tick.qi ?? tick.blockAdd ?? tick.damage }
      : {}),
  };
  b.log.push(`${row.name}判定窗`);
}

function pay(b: Battle, w: ReactionWindow): boolean {
  if (b.energy < w.cost) return false;
  b.energy -= w.cost;
  b.windowsUsed = (b.windowsUsed ?? 0) + 1;
  b.reactionWindow = undefined;
  return true;
}

function rejectAt(b: Battle, dist: number): void {
  const sign = b.enemy.pos >= b.player.pos ? 1 : -1;
  let pos = b.player.pos + sign * dist;
  const last = boardLen(b) - 1;
  if (pos < 0) pos = 0;
  if (pos > last) pos = last;
  if (pos === b.player.pos) pos = Math.min(last, Math.max(0, b.player.pos + sign));
  placeEnemy(b, pos);
}

export function takeWindow(b: Battle): string[] {
  const w = b.reactionWindow;
  if (!w) return [];
  if (!pay(b, w)) return ["劲不够，窗没打出"];
  if (w.kind === "spearReverse") {
    rejectAt(b, CLIMB_SPEAR_REJECT_DIST);
    b.displaceSealed = true;
    return [`回马枪 耗劲 ${w.cost}，敌拒在 ${CLIMB_SPEAR_REJECT_DIST} 格`];
  }
  if (w.kind === "palmCut") {
    const d = distOf(b);
    if (d <= 1) {
      b.foeCharge = 0;
      b.enemy.hp -= CLIMB_WINDOW_BASE_HIT;
      return [`截拳 清蓄力，伤 ${CLIMB_WINDOW_BASE_HIT}`];
    }
    const dir = b.enemy.pos > b.player.pos ? 1 : -1;
    const next = b.player.pos + dir;
    if (next !== b.enemy.pos && next >= 0 && next < boardLen(b)) b.player.pos = next;
    return ["截拳 贴上去，这次蓄力没做成"];
  }
  if (w.kind === "dartBreath") {
    const n = w.amount ?? 0;
    b.enemy.hp -= n;
    if (w.intentKind === "breathe") b.enemyEnergy = Math.max(0, b.enemyEnergy - n);
    return [`断息 伤 ${n}`];
  }
  if (w.kind === "saberParry") {
    const raw = w.amount ?? w.chargeDamage ?? 0;
    const block = Math.round(raw * CLIMB_PARRY_BLOCK_RATIO);
    const back = Math.round(raw * CLIMB_PARRY_REFLECT_RATIO);
    b.playerBlock += block;
    b.enemy.hp -= back;
    b.meleeHits = 0;
    return [`弹反 格挡 ${block}，回敬 ${back}`];
  }
  if (w.kind === "swordSteal") {
    const gain = 1;
    b.v2SwordChain = Math.min(CLIMB_SWORD_CHAIN_CAP, (b.v2SwordChain ?? 0) + gain);
    b.swordStealUsed = true;
    b.skipFoeStack = true;
    return [`偷势 剑势 ${b.v2SwordChain}`];
  }
  if (w.kind === "hookLimp") {
    b.foeLimp = true;
    if (w.anchor != null) placeEnemy(b, w.anchor);
    return ["瘸跛 拉回"];
  }
  if (w.kind === "staffPierce") {
    const added = w.amount ?? 0;
    const dmg = Math.round(b.enemyBlock * CLIMB_STAFF_PIERCE_OLD + added * CLIMB_STAFF_PIERCE_NEW);
    b.enemyBlock += added;
    b.enemy.hp -= dmg;
    b.staffPierceUsed = true;
    return [`透棍 真伤 ${dmg}`];
  }
  return [];
}

/** 敌窗。没有 foeWindows 时原样返回。 */
export function noteFoeWindow(b: Battle, def: CardDef): string[] {
  const owned = b.foeWindows ?? [];
  if (owned.length === 0) return [];
  if ((b.foeWindowUsed ?? 0) >= CLIMB_FOE_WINDOW_CAP) return [];
  const notes: string[] = [];
  const spend = () => {
    b.foeWindowUsed = (b.foeWindowUsed ?? 0) + 1;
  };
  if (owned.includes("dismantle") && (def.cost ?? 0) >= CLIMB_FOE_DISMANTLE_COST && def.ultimate) {
    b.foeDismantleMul = CLIMB_FOE_DISMANTLE_MUL;
    if (b.intents.length > 0) b.intents = b.intents.slice(0, -1);
    spend();
    notes.push("敌拆招");
    return notes;
  }
  const school = def.school ?? "any";
  if (school !== "any" && school === b.foeSchoolId) b.foeSchoolStreak = (b.foeSchoolStreak ?? 0) + 1;
  else if (school !== "any") {
    b.foeSchoolId = school;
    b.foeSchoolStreak = 1;
  }
  if (owned.includes("bind") && (b.foeSchoolStreak ?? 0) >= CLIMB_FOE_BIND_STREAK) {
    b.intents = [{ kind: "advance", steps: 1 }, ...b.intents];
    spend();
    notes.push("敌缠手");
    return notes;
  }
  if (def.id === b.foeSameId) b.foeSameCount = (b.foeSameCount ?? 0) + 1;
  else {
    b.foeSameId = def.id;
    b.foeSameCount = 1;
  }
  if (owned.includes("read") && (b.foeSameCount ?? 0) >= CLIMB_FOE_READ_STREAK) {
    b.foeImmuneOnce = true;
    spend();
    notes.push("敌读破");
  }
  return notes;
}
