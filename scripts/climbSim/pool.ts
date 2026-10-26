import { boardLen } from "../../src/game/board";
import { CARDS } from "../../src/game/content";
import { BOARD_SIZE, CLIMB_BOARD_SIZE } from "../../src/game/types";

let seenBoard = 0;

export function noteBoard(b: { boardSize?: number }): void {
  if (!seenBoard) seenBoard = boardLen(b);
}

/** 对局实际板长，旁边写两个常量，9 格窗改了能看出来。 */
export function boardStamp(): string {
  const n = seenBoard || CLIMB_BOARD_SIZE;
  return `对局${n}（BOARD_SIZE ${BOARD_SIZE} / CLIMB_BOARD_SIZE ${CLIMB_BOARD_SIZE}）`;
}

/** 卡池指纹。卡池窗改表后，这个串会变，重跑即可。 */
export function poolStamp(): string {
  const ids = Object.keys(CARDS).sort();
  let cost = 0;
  for (const id of ids) cost += CARDS[id as keyof typeof CARDS]?.cost ?? 0;
  return `${ids.length}张/费和${cost}`;
}
