import type { Battle } from "../game/types";
import { isBattleWon } from "../game/sim";

export type RecapSeg = {
  ord: number;
  name: string;
  outcome: string;
  hpLost?: number;
  blockLost?: number;
};

export type RecapDisplay = { hp: number; block: number };

/** 结算已一次性兑完：回放前把血/挡加回去，再按段扣。 */
export function recapDisplayStart(finalHp: number, finalBlock: number, recap: RecapSeg[]): RecapDisplay {
  let hp = finalHp;
  let block = finalBlock;
  for (const r of recap) {
    hp += r.hpLost ?? 0;
    block += r.blockLost ?? 0;
  }
  return { hp, block };
}

export function recapDisplayAfter(cur: RecapDisplay, seg: RecapSeg): RecapDisplay {
  return {
    hp: Math.max(0, cur.hp - (seg.hpLost ?? 0)),
    block: Math.max(0, cur.block - (seg.blockLost ?? 0)),
  };
}

/** 场上已无活人且无替补：不要再播死人招。 */
export function skipFoeRecap(b: Battle): boolean {
  return isBattleWon(b);
}
