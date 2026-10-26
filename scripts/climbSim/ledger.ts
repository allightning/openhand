import { climbEnemyPaceBonus } from "../../src/game/climbCaps";
import type { FightWatchEvent } from "./fightWatch";

const HALLS = 10;

export type Tot = {
  bleedAdded: number;
  bleedTick: number;
  exposeAdded: number;
  exposeHits: number;
  maxBleed: number;
  chargePlays: number;
  hastePlays: number;
  stepSaberPlays: number;
  pinPlays: number;
  hands: number;
  behind: number;
  behindBonus: number;
  foeFirst: number;
  hpBehind: number;
  hpAhead: number;
  ahead: number;
  opens: number;
  openBehind: number;
  openBehindBonus: number;
  openYour: number;
  openFoe: number;
};

export type PaceRow = { hands: number; behind: number; behindBonus: number; foeFirst: number };

export type Bag = {
  all: Tot;
  wins: Tot;
  bySchool: Record<string, { all: Tot; wins: Tot }>;
  pace: PaceRow[];
  foeHpSum: number[];
  foeHpN: number[];
  distSum: number[];
  distN: number[];
  boards: number[];
};

type Buf = {
  tot: Tot;
  pace: PaceRow[];
  foeHp: number;
  foeStage: number;
  dist: number;
  board: number;
  open: boolean;
};

export type Ledger = {
  note: (event: FightWatchEvent) => void;
  endFight: (sample: "fresh" | "climb", school: string, win: boolean) => void;
  fresh: Bag;
  climb: Bag;
};

function zeros(n: number): number[] {
  return Array.from({ length: n }, () => 0);
}

export function emptyTot(): Tot {
  return {
    bleedAdded: 0,
    bleedTick: 0,
    exposeAdded: 0,
    exposeHits: 0,
    maxBleed: 0,
    chargePlays: 0,
    hastePlays: 0,
    stepSaberPlays: 0,
    pinPlays: 0,
    hands: 0,
    behind: 0,
    behindBonus: 0,
    foeFirst: 0,
    hpBehind: 0,
    hpAhead: 0,
    ahead: 0,
    opens: 0,
    openBehind: 0,
    openBehindBonus: 0,
    openYour: 0,
    openFoe: 0,
  };
}

function emptyPace(): PaceRow[] {
  return Array.from({ length: HALLS }, () => ({ hands: 0, behind: 0, behindBonus: 0, foeFirst: 0 }));
}

function emptyBag(): Bag {
  return {
    all: emptyTot(),
    wins: emptyTot(),
    bySchool: {},
    pace: emptyPace(),
    foeHpSum: zeros(HALLS),
    foeHpN: zeros(HALLS),
    distSum: zeros(HALLS),
    distN: zeros(HALLS),
    boards: [],
  };
}

function emptyBuf(): Buf {
  return { tot: emptyTot(), pace: emptyPace(), foeHp: 0, foeStage: 0, dist: 0, board: 0, open: false };
}

function addTot(into: Tot, row: Tot): void {
  into.bleedAdded += row.bleedAdded;
  into.bleedTick += row.bleedTick;
  into.exposeAdded += row.exposeAdded;
  into.exposeHits += row.exposeHits;
  into.maxBleed = Math.max(into.maxBleed, row.maxBleed);
  into.chargePlays += row.chargePlays;
  into.hastePlays += row.hastePlays;
  into.stepSaberPlays += row.stepSaberPlays;
  into.pinPlays += row.pinPlays;
  into.hands += row.hands;
  into.behind += row.behind;
  into.behindBonus += row.behindBonus;
  into.foeFirst += row.foeFirst;
  into.hpBehind += row.hpBehind;
  into.hpAhead += row.hpAhead;
  into.ahead += row.ahead;
  into.opens += row.opens;
  into.openBehind += row.openBehind;
  into.openBehindBonus += row.openBehindBonus;
  into.openYour += row.openYour;
  into.openFoe += row.openFoe;
}

function addPace(into: PaceRow[], row: PaceRow[]): void {
  for (let i = 0; i < HALLS; i++) {
    into[i]!.hands += row[i]!.hands;
    into[i]!.behind += row[i]!.behind;
    into[i]!.behindBonus += row[i]!.behindBonus;
    into[i]!.foeFirst += row[i]!.foeFirst;
  }
}

function schoolBag(bag: Bag, school: string): { all: Tot; wins: Tot } {
  const hit = bag.bySchool[school] ?? { all: emptyTot(), wins: emptyTot() };
  bag.bySchool[school] = hit;
  return hit;
}

function onOpen(buf: Buf, e: Extract<FightWatchEvent, { kind: "open" }>): void {
  buf.open = true;
  buf.foeHp = e.foeHp;
  buf.foeStage = e.stage;
  buf.dist = e.dist;
  buf.board = e.board;
  buf.tot.opens += 1;
  buf.tot.openYour += e.yourPace;
  buf.tot.openFoe += e.foePace;
  if (e.yourPace < e.foePace) buf.tot.openBehind += 1;
  if (e.yourPace < e.foePace + climbEnemyPaceBonus(e.stage)) buf.tot.openBehindBonus += 1;
}

function onPlay(buf: Buf, e: Extract<FightWatchEvent, { kind: "play" }>): void {
  buf.tot.bleedAdded += Math.max(0, e.dBleed);
  buf.tot.exposeAdded += Math.max(0, e.dExpose + e.exposeHits);
  buf.tot.exposeHits += e.exposeHits;
  buf.tot.maxBleed = Math.max(buf.tot.maxBleed, e.bleed);
  if (e.id === "charge" || e.id === "charge2") buf.tot.chargePlays += 1;
  if (e.id === "haste") buf.tot.hastePlays += 1;
  if (e.id === "stepSaber") buf.tot.stepSaberPlays += 1;
  if (e.id.includes("dart") || e.id.includes("pin")) buf.tot.pinPlays += 1;
}

function onHand(buf: Buf, e: Extract<FightWatchEvent, { kind: "hand" }>): void {
  const behind = e.yourPace < e.foePace;
  const bonus = e.yourPace < e.foePace + climbEnemyPaceBonus(e.stage);
  const row = buf.pace[e.stage - 1];
  if (row) {
    row.hands += 1;
    if (behind) row.behind += 1;
    if (bonus) row.behindBonus += 1;
    if (e.foeFirst) row.foeFirst += 1;
  }
  buf.tot.hands += 1;
  buf.tot.bleedTick += e.tick;
  if (behind) {
    buf.tot.behind += 1;
    buf.tot.hpBehind += e.hpLoss;
  } else {
    buf.tot.ahead += 1;
    buf.tot.hpAhead += e.hpLoss;
  }
  if (bonus) buf.tot.behindBonus += 1;
  if (e.foeFirst) buf.tot.foeFirst += 1;
}

function commit(bag: Bag, school: string, buf: Buf, win: boolean): void {
  addTot(bag.all, buf.tot);
  addPace(bag.pace, buf.pace);
  const side = schoolBag(bag, school);
  addTot(side.all, buf.tot);
  if (win) {
    addTot(bag.wins, buf.tot);
    addTot(side.wins, buf.tot);
  }
  if (!buf.open) return;
  const i = buf.foeStage - 1;
  if (i < 0 || i >= HALLS) return;
  bag.foeHpSum[i] = (bag.foeHpSum[i] ?? 0) + buf.foeHp;
  bag.foeHpN[i] = (bag.foeHpN[i] ?? 0) + 1;
  if (buf.dist >= 0) {
    bag.distSum[i] = (bag.distSum[i] ?? 0) + buf.dist;
    bag.distN[i] = (bag.distN[i] ?? 0) + 1;
  }
  if (buf.board && !bag.boards.includes(buf.board)) bag.boards.push(buf.board);
}

export function createLedger(): Ledger {
  let buf = emptyBuf();
  const fresh = emptyBag();
  const climb = emptyBag();
  return {
    fresh,
    climb,
    note(event) {
      if (event.kind === "open") onOpen(buf, event);
      else if (event.kind === "play") onPlay(buf, event);
      else onHand(buf, event);
    },
    endFight(sample, school, win) {
      commit(sample === "fresh" ? fresh : climb, school, buf, win);
      buf = emptyBuf();
    },
  };
}
