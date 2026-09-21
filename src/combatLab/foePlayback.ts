import type { Battle, Intent } from "../game/types";
import { BOARD_SIZE } from "../game/types";
import { isBattleWon } from "../game/sim";

export type RecapSeg = {
  ord: number;
  name: string;
  outcome: string;
  hpLost?: number;
  blockLost?: number;
};

export type RecapDisplay = {
  hp: number;
  block: number;
  playerPos: number;
  enemyPos: number;
};

export type IntentBarFate = "gone" | "grey";

/** 敌招逐段播报间隔（ms） */
export const FOE_SEG_GAP_MS = 1500;
export const FOE_SEG_GAP_EMPTY_MS = 450;
export const FOE_WINDUP_MS = 420;
/** 敌先机开局：先亮场再动手 */
export const FOE_FIRST_HOLD_MS = 1500;
export const FOE_FIRST_HOLD_EMPTY_MS = 600;
/** 爬塔开局/结束：每一拍播报停留 */
export const CLIMB_PHASE_BEAT_MS = 2200;

export function foeSegGapMs(outcome: string): number {
  if (outcome === "打") return FOE_SEG_GAP_MS;
  if (outcome === "破" || outcome === "追" || outcome === "让") return 900;
  return FOE_SEG_GAP_EMPTY_MS;
}

export function foeFirstHoldMs(recap: { outcome: string }[], climbOpen: boolean): number {
  if (climbOpen) return 900;
  if (recap.length && recap.every((r) => r.outcome !== "打")) return FOE_FIRST_HOLD_EMPTY_MS;
  return FOE_FIRST_HOLD_MS;
}

/** 播报结果 → 特效/音效种类 */
export function outcomeToFxKind(outcome: string): string {
  if (outcome === "破" || outcome === "追") return "break";
  if (outcome === "让") return "graze";
  if (outcome === "空" || outcome === "放" || outcome === "躲") return "miss";
  if (outcome === "打") return "hit";
  if (outcome === "劲尽" || outcome === "晕" || outcome === "散") return "miss";
  return "hit";
}

/** 打完拿掉；距离不够 / 位移被挡灰留。晕跳过、劲尽跳过都拿掉。 */
export function intentBarFate(outcome: string): IntentBarFate {
  if (outcome === "空" || outcome === "放" || outcome === "躲") return "grey";
  return "gone";
}

function clampCell(pos: number): number {
  return Math.max(0, Math.min(BOARD_SIZE - 1, pos));
}

/** 表现层按段挪位：跟结算同方向，不改 sim。跳过的段不动。 */
export function applyIntentMove(
  playerPos: number,
  enemyPos: number,
  intent: Intent | undefined,
  outcome: string,
): { playerPos: number; enemyPos: number } {
  if (!intent) return { playerPos, enemyPos };
  if (outcome === "劲尽" || outcome === "晕" || outcome === "散" || outcome === "跳过") {
    return { playerPos, enemyPos };
  }
  const toward = enemyPos < playerPos ? 1 : enemyPos > playerPos ? -1 : 0;
  const away = toward === 0 ? 1 : -toward;
  if (intent.kind === "charge") {
    let pos = enemyPos;
    for (let i = 0; i < intent.steps; i++) {
      const next = pos + toward;
      if (next < 0 || next >= BOARD_SIZE || next === playerPos) break;
      pos = next;
    }
    return { playerPos, enemyPos: pos };
  }
  if (intent.kind === "retreat") {
    let pos = enemyPos;
    for (let i = 0; i < intent.steps; i++) {
      const next = pos + away;
      if (next < 0 || next >= BOARD_SIZE || next === playerPos) break;
      pos = next;
    }
    return { playerPos, enemyPos: pos };
  }
  if (intent.kind === "lunge") {
    if (Math.abs(enemyPos - playerPos) > 1 && toward !== 0) {
      const next = clampCell(enemyPos + toward);
      if (next !== playerPos) return { playerPos, enemyPos: next };
    }
    return { playerPos, enemyPos };
  }
  if (intent.kind === "advance") {
    let pos = enemyPos;
    for (let i = 0; i < intent.steps; i++) {
      const next = pos + toward;
      if (next < 0 || next >= BOARD_SIZE || next === playerPos) break;
      pos = next;
    }
    return { playerPos, enemyPos: pos };
  }
  if (intent.kind === "pull") {
    let pos = playerPos;
    for (let i = 0; i < intent.steps; i++) {
      const dir = pos < enemyPos ? 1 : pos > enemyPos ? -1 : 0;
      if (dir === 0) break;
      const next = pos + dir;
      if (next === enemyPos) break;
      pos = next;
    }
    return { playerPos: pos, enemyPos };
  }
  if (intent.kind === "swap") {
    if (Math.abs(enemyPos - playerPos) <= 1) return { playerPos: enemyPos, enemyPos: playerPos };
    if (toward !== 0) {
      const next = clampCell(enemyPos + toward);
      if (next !== playerPos) return { playerPos, enemyPos: next };
    }
  }
  return { playerPos, enemyPos };
}

/** 结算已一次性兑完：回放前把血/挡加回去，人先放回收势/亮招时的格。 */
export function recapDisplayStart(
  finalHp: number,
  finalBlock: number,
  recap: RecapSeg[],
  playerPos: number,
  enemyPos: number,
): RecapDisplay {
  let hp = finalHp;
  let block = finalBlock;
  for (const r of recap) {
    hp += r.hpLost ?? 0;
    block += r.blockLost ?? 0;
  }
  return { hp, block, playerPos, enemyPos };
}

export function recapDisplayAfter(cur: RecapDisplay, seg: RecapSeg, intent?: Intent): RecapDisplay {
  const moved = applyIntentMove(cur.playerPos, cur.enemyPos, intent, seg.outcome);
  return {
    hp: Math.max(0, cur.hp - (seg.hpLost ?? 0)),
    block: Math.max(0, cur.block - (seg.blockLost ?? 0)),
    playerPos: moved.playerPos,
    enemyPos: moved.enemyPos,
  };
}

/** 回放中画面用人/血/挡的段快照，不提前跳终态。 */
export function overlayRecapBattle(b: Battle, show: RecapDisplay): Battle {
  const enemy = { ...b.enemy, pos: show.enemyPos };
  const foes = (b.foes ?? []).map((f) => (f.id === b.enemy.id ? { ...f, pos: show.enemyPos } : f));
  return {
    ...b,
    player: { ...b.player, hp: show.hp, pos: show.playerPos },
    playerBlock: show.block,
    enemy,
    foes: foes.length ? foes : b.foes,
  };
}

export function filterEmptyRecap<T extends { outcome: string }>(recap: T[]): T[] {
  return recap.filter((r) => r.outcome !== "空");
}

/** 场上已无活人且无替补：不要再播死人招。 */
export function skipFoeRecap(b: Battle): boolean {
  return isBattleWon(b);
}

/**
 * 爬塔回放：灰留（空）默认保留给玩家看「这段没打上」；
 * 敌招段后接本手结束/下手开始条（climbTurnTape）。
 */
export function climbPlaybackRecap(
  b: Battle,
  foeSegs: RecapSeg[],
  keepEmpty: boolean,
): RecapSeg[] {
  const foe = keepEmpty ? [...foeSegs] : filterEmptyRecap(foeSegs);
  if (!keepEmpty) return foe;
  const tape = (b.climbTurnTape ?? []).map((t, i) => ({
    ord: t.ord ?? foe.length + i + 1,
    name: t.name,
    outcome: t.outcome,
    hpLost: t.hpLost,
    blockLost: t.blockLost,
  }));
  return [...foe, ...tape];
}
