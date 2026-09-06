/**
 * 气力承诺制 · 读招战役新核（气力取舍 × 七步石台）
 * 踢馆旧拆招不迁移。
 */

export const QI_BOARD = 7;

export type FoeMove = "sweep" | "pierce" | "crash" | "windup";
export type BreakStyle = "press" | "point" | "yield";
export type QiCardKind = "break" | "brace" | "dodge" | "attack" | "step";
export type QiCardId =
  | "break_press"
  | "break_point"
  | "break_yield"
  | "brace"
  | "dodge"
  | "step_back"
  | "step_fwd"
  | "atk1"
  | "atk2";

export type CommitTier = "hard" | "graze" | "dodge" | "miss" | "attack" | "ult";

export interface QiCardDef {
  id: QiCardId;
  name: string;
  kind: QiCardKind;
  cost: number;
  style?: BreakStyle;
  damage?: number;
  step?: number;
}

export const QI_CARDS: Record<QiCardId, QiCardDef> = {
  break_press: { id: "break_press", name: "拆·压", kind: "break", cost: 2, style: "press" },
  break_point: { id: "break_point", name: "拆·点", kind: "break", cost: 2, style: "point" },
  break_yield: { id: "break_yield", name: "拆·引", kind: "break", cost: 2, style: "yield" },
  brace: { id: "brace", name: "横拦·架", kind: "brace", cost: 1 },
  dodge: { id: "dodge", name: "退步·闪", kind: "dodge", cost: 1 },
  step_back: { id: "step_back", name: "撤步", kind: "step", cost: 1, step: -1 },
  step_fwd: { id: "step_fwd", name: "进步", kind: "step", cost: 1, step: 1 },
  atk1: { id: "atk1", name: "扫叶·攻", kind: "attack", cost: 1, damage: 3 },
  atk2: { id: "atk2", name: "进招·攻", kind: "attack", cost: 2, damage: 6 },
};

export const STARTER_DECK: QiCardId[] = [
  "break_press",
  "break_press",
  "break_point",
  "break_point",
  "break_yield",
  "brace",
  "dodge",
  "step_back",
  "step_fwd",
  "atk1",
  "atk1",
  "atk2",
];

export const MOVE_LABEL: Record<FoeMove, string> = {
  sweep: "扫",
  pierce: "刺",
  crash: "撞",
  windup: "蓄",
};

const COUNTER: Record<Exclude<FoeMove, "windup">, BreakStyle> = {
  sweep: "press",
  pierce: "point",
  crash: "yield",
};

export interface QiCommit {
  uid: string;
  cardId: QiCardId;
  tier: CommitTier;
}

export interface QiSegment {
  move: FoeMove;
  damage: number;
  /** 红格（0–6）。蓄力段可空。 */
  cell?: number;
  commit?: QiCommit;
}

export interface QiCardInst {
  uid: string;
  defId: QiCardId;
}

export interface QiRecap {
  ord: number;
  name: string;
  outcome: string;
}

export interface QiFight {
  playerHp: number;
  playerHpMax: number;
  enemyHp: number;
  enemyHpMax: number;
  qi: number;
  qiCap: number;
  banked: number;
  momentum: number;
  inkCells: number[];
  inkPending: number[];
  queue: QiSegment[];
  nextQueue: QiSegment[] | null;
  hand: QiCardInst[];
  lockedHand: QiCardId[] | null;
  draw: QiCardId[];
  discard: QiCardId[];
  selectedUid: string | null;
  passed: boolean;
  ultUsedThisTurn: boolean;
  pendingAttacks: number[];
  playerPos: number;
  enemyPos: number;
  windupArmed: boolean;
  turn: number;
  uidSeq: number;
  log: string[];
  lastRecap: QiRecap[];
  phase: "play" | "won" | "lost";
  loopQueue: boolean;
  queueTemplate: QiSegment[];
}

export interface CreateQiFightOpts {
  playerHp: number;
  enemyHp: number;
  hand?: QiCardId[];
  queue: QiSegment[];
  nextQueue?: QiSegment[];
  qi?: number;
  momentum?: number;
  playerPos?: number;
  enemyPos?: number;
  deck?: QiCardId[];
  /** 脚本队列用尽后按模板循环（终局试刃） */
  loopQueue?: boolean;
}

export function threatCell(seg: QiSegment): number | null {
  if (seg.move === "windup") return null;
  return seg.cell ?? null;
}

function clampCell(n: number): number {
  return Math.max(0, Math.min(QI_BOARD - 1, n));
}

function stampSeg(s: QiSegment, fallback: number): QiSegment {
  if (s.move === "windup") return { ...s };
  return { ...s, cell: s.cell ?? fallback };
}

function stripCommit(s: QiSegment): QiSegment {
  return { move: s.move, damage: s.damage, cell: s.cell };
}

function nextUid(f: QiFight, tag: string): string {
  f.uidSeq += 1;
  return `qi-${tag}-${f.uidSeq}`;
}

function deal(ids: QiCardId[], f: QiFight): QiCardInst[] {
  return ids.map((id) => ({ uid: nextUid(f, id), defId: id }));
}

export function counters(style: BreakStyle, move: FoeMove): boolean {
  if (move === "windup") return false;
  return COUNTER[move] === style;
}

export function attackBonus(momentum: number): number {
  return momentum >= 3 ? 1 : 0;
}

export function refillQi(momentum: number, banked: number, cap = 5): number {
  return Math.min(cap, 3 + (momentum >= 5 ? 1 : 0) + banked);
}

export function createQiFight(opts: CreateQiFightOpts): QiFight {
  const locked = opts.hand ? [...opts.hand] : null;
  const playerPos = clampCell(opts.playerPos ?? 3);
  const f: QiFight = {
    playerHp: opts.playerHp,
    playerHpMax: opts.playerHp,
    enemyHp: opts.enemyHp,
    enemyHpMax: opts.enemyHp,
    qi: opts.qi ?? 3,
    qiCap: 5,
    banked: 0,
    momentum: opts.momentum ?? 0,
    inkCells: [],
    inkPending: [],
    playerPos,
    enemyPos: clampCell(opts.enemyPos ?? 5),
    queue: opts.queue.map((s) => stampSeg(s, playerPos)),
    nextQueue: opts.nextQueue ? opts.nextQueue.map((s) => stampSeg(s, playerPos)) : null,
    hand: [],
    lockedHand: locked,
    draw: [...(opts.deck ?? STARTER_DECK)],
    discard: [],
    selectedUid: null,
    passed: false,
    ultUsedThisTurn: false,
    pendingAttacks: [],
    windupArmed: false,
    turn: 1,
    uidSeq: 0,
    log: [],
    lastRecap: [],
    phase: "play",
    loopQueue: Boolean(opts.loopQueue),
    queueTemplate: opts.queue.map((s) => stampSeg(s, playerPos)).map(stripCommit),
  };
  f.hand = deal(locked ?? opts.hand ?? f.draw.splice(0, 4), f);
  if (!locked && !opts.hand) {
    /* already drew from deck */
  } else if (!locked) {
    /* explicit hand, leave deck intact */
  }
  return f;
}

function cardOf(f: QiFight, uid: string): QiCardInst {
  const c = f.hand.find((x) => x.uid === uid);
  if (!c) throw new Error("手牌里没有这张");
  return c;
}

export function selectCard(f: QiFight, uid: string): QiFight {
  cardOf(f, uid);
  return { ...f, selectedUid: uid };
}

function spendAndRemove(f: QiFight, uid: string, cost: number): { next: QiFight; card: QiCardInst } {
  if (f.qi < cost) throw new Error("气力不够");
  const card = cardOf(f, uid);
  return {
    card,
    next: {
      ...f,
      qi: f.qi - cost,
      hand: f.hand.filter((x) => x.uid !== uid),
      discard: [...f.discard, card.defId],
      selectedUid: null,
    },
  };
}

export function assignToSegment(f: QiFight, segIdx: number): QiFight {
  if (f.selectedUid == null) throw new Error("先选一张牌");
  const seg = f.queue[segIdx];
  if (!seg) throw new Error("没有这段");
  if (seg.commit) throw new Error("已落子");
  const def = QI_CARDS[cardOf(f, f.selectedUid).defId];
  if (def.kind === "step") throw new Error("位移牌点牌即走，不用点来招");
  if (seg.move === "windup" && (def.kind === "break" || def.kind === "brace")) {
    throw new Error("蓄力段不能拆不能架");
  }
  const red = threatCell(seg);
  if ((def.kind === "break" || def.kind === "brace" || def.kind === "dodge") && red != null && f.playerPos !== red) {
    throw new Error("不在红格，拆/架/闪够不着");
  }
  const { next, card } = spendAndRemove(f, f.selectedUid, def.cost);
  const queue = next.queue.map((s) => ({ ...s, commit: s.commit ? { ...s.commit } : undefined }));
  const target = queue[segIdx]!;
  if (def.kind === "break") {
    const ok = counters(def.style!, target.move);
    target.commit = { uid: card.uid, cardId: card.defId, tier: ok ? "hard" : "miss" };
    const inkPending = ok && red != null ? [...next.inkPending, red] : next.inkPending;
    return {
      ...next,
      queue,
      qi: ok ? next.qi + 1 : next.qi,
      momentum: ok ? next.momentum + 1 : next.momentum,
      inkPending,
      log: [...next.log, ok ? `硬拆 ${MOVE_LABEL[target.move]}` : `拆空 ${MOVE_LABEL[target.move]}`],
    };
  }
  if (def.kind === "brace") {
    target.commit = { uid: card.uid, cardId: card.defId, tier: "graze" };
    return { ...next, queue, log: [...next.log, `架 ${MOVE_LABEL[target.move]}`] };
  }
  if (def.kind === "dodge") {
    target.commit = { uid: card.uid, cardId: card.defId, tier: "dodge" };
    return { ...next, queue, log: [...next.log, `闪 ${MOVE_LABEL[target.move]}`] };
  }
  target.commit = { uid: card.uid, cardId: card.defId, tier: "attack" };
  return { ...next, queue, log: [...next.log, `攻 ${MOVE_LABEL[target.move]}`] };
}

export function playAttackFree(f: QiFight): QiFight {
  if (f.selectedUid == null) throw new Error("先选一张牌");
  const def = QI_CARDS[cardOf(f, f.selectedUid).defId];
  if (def.kind !== "attack") throw new Error("这张不是攻");
  const { next, card } = spendAndRemove(f, f.selectedUid, def.cost);
  const dmg = def.damage ?? 0;
  return {
    ...next,
    pendingAttacks: [...next.pendingAttacks, dmg],
    log: [...next.log, `${QI_CARDS[card.defId].name} 直取 ${dmg}（收势按气势加算）`],
  };
}

export function playStep(f: QiFight): QiFight {
  if (f.selectedUid == null) throw new Error("先选一张牌");
  const def = QI_CARDS[cardOf(f, f.selectedUid).defId];
  if (def.kind !== "step") throw new Error("这张不是位移");
  const { next, card } = spendAndRemove(f, f.selectedUid, def.cost);
  const playerPos = clampCell(next.playerPos + (def.step ?? 0));
  return {
    ...next,
    playerPos,
    log: [...next.log, `${QI_CARDS[card.defId].name} → ${playerPos + 1} 格`],
  };
}

export function playPass(f: QiFight): QiFight {
  if (f.passed) throw new Error("本回合已过");
  return { ...f, passed: true, banked: f.banked + 1, log: [...f.log, "过 · 存 1 气"] };
}

export function playUlt(f: QiFight, segIdx: number): QiFight {
  if (f.momentum < 8) throw new Error("气势未满 8");
  if (f.ultUsedThisTurn) throw new Error("本回合已用绝式");
  const seg = f.queue[segIdx];
  if (!seg) throw new Error("没有这段");
  if (seg.commit) throw new Error("已落子");
  const queue = f.queue.map((s) => ({ ...s, commit: s.commit ? { ...s.commit } : undefined }));
  queue[segIdx]!.commit = { uid: "ult", cardId: "atk2", tier: "ult" };
  return {
    ...f,
    queue,
    ultUsedThisTurn: true,
    log: [...f.log, `绝式 · ${MOVE_LABEL[seg.move]}`],
  };
}

function hitPlayer(f: QiFight, dmg: number): QiFight {
  if (dmg <= 0) return f;
  return { ...f, playerHp: Math.max(0, f.playerHp - dmg), momentum: 0 };
}

function hitEnemy(f: QiFight, dmg: number): QiFight {
  if (dmg <= 0) return f;
  return { ...f, enemyHp: Math.max(0, f.enemyHp - dmg) };
}

function beginNextTurn(f: QiFight): QiFight {
  const armed = f.windupArmed;
  const scripted = f.nextQueue && f.nextQueue.length > 0 ? f.nextQueue : null;
  const source = scripted ?? (f.loopQueue ? f.queueTemplate : []);
  const template = scripted ? scripted.map(stripCommit) : f.queueTemplate;
  let queue: QiSegment[] = source.map((s) =>
    stampSeg(
      {
        move: s.move,
        damage: armed && s.move !== "windup" ? s.damage + 2 : s.damage,
        cell: s.cell,
      },
      f.playerPos,
    ),
  );
  if (armed) {
    queue = [...queue, { move: "crash", damage: 6, cell: f.playerPos }];
  }
  let draw = [...f.draw];
  let discard = [...f.discard];
  let hand: QiCardInst[];
  const shell: QiFight = { ...f, uidSeq: f.uidSeq, hand: [], draw, discard };
  if (f.lockedHand) {
    hand = deal(f.lockedHand, shell);
  } else {
    if (draw.length < 4) {
      draw = [...draw, ...discard];
      discard = [];
    }
    const dealt = draw.splice(0, 4);
    shell.draw = draw;
    shell.discard = discard;
    hand = deal(dealt, shell);
  }
  return {
    ...shell,
    qi: refillQi(f.momentum, f.banked, f.qiCap),
    banked: 0,
    hand,
    draw: shell.draw,
    discard: shell.discard,
    queue,
    nextQueue: null,
    queueTemplate: template,
    selectedUid: null,
    passed: false,
    ultUsedThisTurn: false,
    pendingAttacks: [],
    windupArmed: false,
    turn: f.turn + 1,
    phase: f.playerHp <= 0 ? "lost" : f.enemyHp <= 0 ? "won" : "play",
  };
}

export function resolveTurn(f: QiFight): QiFight {
  const momAtCommit = f.momentum;
  let cur: QiFight = {
    ...f,
    queue: f.queue.map((s) => ({ ...s, commit: s.commit ? { ...s.commit } : undefined })),
    lastRecap: [],
    windupArmed: false,
  };
  const recap: QiRecap[] = [];

  for (let i = 0; i < cur.queue.length; i++) {
    const seg = cur.queue[i]!;
    const name = MOVE_LABEL[seg.move];

    const red = threatCell(seg);
    if (red != null && cur.inkCells.includes(red)) {
      cur = { ...cur, momentum: cur.momentum + 1, inkPending: [...cur.inkPending, red] };
      recap.push({ ord: i + 1, name, outcome: "墨" });
      continue;
    }

    if (seg.move === "windup") {
      if (seg.commit?.tier === "attack") {
        const def = QI_CARDS[seg.commit.cardId];
        const dmg = ((def.damage ?? 0) + attackBonus(cur.momentum)) * 2;
        cur = hitEnemy(cur, dmg);
        recap.push({ ord: i + 1, name, outcome: "断" });
      } else {
        cur = { ...cur, windupArmed: true };
        recap.push({ ord: i + 1, name, outcome: "蓄" });
      }
      continue;
    }

    const tier = seg.commit?.tier;
    if (!tier && red != null && cur.playerPos !== red) {
      recap.push({ ord: i + 1, name, outcome: "空" });
      continue;
    }
    if (tier === "hard") {
      recap.push({ ord: i + 1, name, outcome: "破" });
      continue;
    }
    if (tier === "ult") {
      cur = hitEnemy(cur, 12);
      recap.push({ ord: i + 1, name, outcome: "绝" });
      continue;
    }
    if (tier === "dodge") {
      recap.push({ ord: i + 1, name, outcome: "闪" });
      continue;
    }
    if (tier === "graze") {
      const taken = Math.max(0, seg.damage - 3);
      if (taken > 0) cur = { ...cur, playerHp: Math.max(0, cur.playerHp - taken) };
      recap.push({ ord: i + 1, name, outcome: "擦" });
      continue;
    }
    if (tier === "attack") {
      const def = QI_CARDS[seg.commit!.cardId];
      cur = hitEnemy(cur, (def.damage ?? 0) + attackBonus(cur.momentum));
      cur = hitPlayer(cur, seg.damage);
      recap.push({ ord: i + 1, name, outcome: "打" });
      continue;
    }
    if (tier === "miss") {
      cur = hitPlayer(cur, seg.damage);
      recap.push({ ord: i + 1, name, outcome: "打" });
      continue;
    }
    cur = hitPlayer(cur, seg.damage);
    recap.push({ ord: i + 1, name, outcome: "打" });
  }

  for (const base of cur.pendingAttacks) {
    cur = hitEnemy(cur, base + attackBonus(Math.max(momAtCommit, cur.momentum)));
  }

  cur = {
    ...cur,
    lastRecap: recap,
    inkCells: [...new Set(cur.inkPending)],
    inkPending: [],
    log: [...cur.log, ...recap.map((r) => `${r.name}${r.outcome}`)],
  };
  if (cur.playerHp <= 0) return { ...cur, phase: "lost" };
  if (cur.enemyHp <= 0) return { ...cur, phase: "won", lastRecap: recap };
  return beginNextTurn(cur);
}

export function qiCoachLine(f: QiFight): string {
  const onRed = f.queue.filter((s) => threatCell(s) === f.playerPos);
  if (f.queue.length === 0) {
    return "他这拍没有来招。点「扫叶·攻」，再点「攻·直取」砍血，然后收势。气力每拍回 3。";
  }
  const ink = f.inkCells.map((c) => `${c + 1}格`).join("、");
  const inkBit = ink
    ? `墨痕在 ${ink}：他再打这些格会自动破（气势也 +1）。`
    : "硬拆会在红格留下墨痕。";
  const momBit =
    f.momentum >= 3
      ? `气势 ${f.momentum}：直取收势 +1。`
      : `气势 ${f.momentum}/3 后直取才加伤。`;
  if (onRed.length) {
    const names = onRed.map((s) => MOVE_LABEL[s.move]).join("、");
    return `气力 ${f.qi}。你站在红格，${names} 会打中你。拆/架/闪，或撤步/进步走开。${inkBit}${momBit}`;
  }
  return `气力 ${f.qi}。你不在红格，来招会打空。要硬拆须先走进红格。${inkBit}${momBit}`;
}

export function qiCardTip(id: QiCardId): string {
  const d = QI_CARDS[id];
  if (d.kind === "break") return `费${d.cost} · 须站红格 · 克则硬拆返 1 气，墨痕落该格`;
  if (d.kind === "brace") return `费${d.cost} · 须站红格 · 该段伤害 -3`;
  if (d.kind === "dodge") return `费${d.cost} · 须站红格 · 完全躲开该段`;
  if (d.kind === "step") return `费${d.cost} · 点牌即走一格 · 离开红格则来招打空`;
  return `费${d.cost} · 打 ${d.damage} 伤；点蓄力段 ×2；气势▲3 收势时 +1`;
}
