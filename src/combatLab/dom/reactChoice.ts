import { answerReaction } from "../../game/sim";
import type { Battle, RunContext } from "../../game/types";
import type { GuashowFields } from "../render/guashowHud";

export type ReactBattle = Battle & GuashowFields;

const SECS = [3, 5, 10] as const;
export type ReactSec = (typeof SECS)[number];

export function isReactSec(n: number): n is ReactSec {
  return n === 3 || n === 5 || n === 10;
}

/** 本局圆窗思考秒数。不进结算。 */
export function writeReactSec(b: ReactBattle, sec: ReactSec): ReactBattle {
  return { ...b, reactionSec: sec };
}

/**
 * 点「回马」take=true，点「放过」take=false。
 * 成功 = 选了打、窗被结算收掉。劲不够时窗还在，不算成功。
 */
export function applyReactChoice(b: ReactBattle, take: boolean, rc: RunContext): ReactBattle {
  const sec = b.reactionSec;
  const had = Boolean(b.reactionWindow);
  const next = answerReaction(b, take, rc) as ReactBattle;
  if (isReactSec(sec ?? 0)) next.reactionSec = sec;
  if (take && had && !next.reactionWindow) next.reactionLanded = true;
  return next;
}
