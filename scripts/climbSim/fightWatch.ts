import { livingFoes, yourPace } from "../../src/game/sim";
import type { Battle } from "../../src/game/types";
import type { OpenedHall } from "./boot";

export type FightWatchEvent =
  | {
      kind: "open";
      stage: number;
      board: number;
      dist: number;
      yourPace: number;
      foePace: number;
      foeId: string;
      playerHp: number;
      foeHp: number;
    }
  | {
      kind: "play";
      id: string;
      dBleed: number;
      dExpose: number;
      bleed: number;
      exposeHits: number;
    }
  | {
      kind: "hand";
      stage: number;
      hands: number;
      empty: boolean;
      yourPace: number;
      foePace: number;
      hpLoss: number;
      tick: number;
      foeFirst: boolean;
    };

/** 只读对局。回调不得改 battle。不传则与原来逐拍相同。 */
export type FightWatch = (event: FightWatchEvent) => void;

function exposeHitsIn(lines: string[]): number {
  let n = 0;
  for (const line of lines) {
    const found = line.match(/破绽穿挡/g);
    if (found) n += found.length;
  }
  return n;
}

export function notePlay(
  watch: FightWatch | undefined,
  bleed0: number,
  expose0: number,
  log0: number,
  after: Battle,
  id: string,
): void {
  if (!watch) return;
  const lines = after.log.slice(log0);
  watch({
    kind: "play",
    id,
    dBleed: after.bleed - bleed0,
    dExpose: after.expose - expose0,
    bleed: after.bleed,
    exposeHits: exposeHitsIn(lines),
  });
}

function scanResolve(lines: string[]): { tick: number; foeFirst: boolean } {
  let tick = 0;
  let foeFirst = false;
  for (const line of lines) {
    if (line.includes("手先到")) foeFirst = true;
    const m = /^裂创 (\d+)$/.exec(line);
    if (m) tick += Number(m[1]);
  }
  return { tick, foeFirst };
}

export function emitOpen(watch: FightWatch | undefined, b: Battle, opened: OpenedHall): void {
  if (!watch) return;
  const foe = livingFoes(b)[0];
  watch({
    kind: "open",
    stage: opened.stage,
    board: b.boardSize ?? 0,
    dist: foe ? Math.abs(foe.pos - b.player.pos) : -1,
    yourPace: yourPace(b, opened.rc),
    foePace: b.foePace,
    foeId: opened.enemyId,
    playerHp: b.player.hp,
    foeHp: foe?.hp ?? 0,
  });
}

export function emitHand(
  watch: FightWatch | undefined,
  opened: OpenedHall,
  hands: number,
  empty: boolean,
  paceY: number,
  paceF: number,
  hpAt: number,
  after: Battle,
  logAt: number,
): void {
  if (!watch) return;
  const scanned = scanResolve(after.log.slice(logAt));
  watch({
    kind: "hand",
    stage: opened.stage,
    hands,
    empty,
    yourPace: paceY,
    foePace: paceF,
    hpLoss: Math.max(0, hpAt - after.player.hp),
    tick: scanned.tick,
    foeFirst: scanned.foeFirst,
  });
}
