import type { RunContext } from "../../src/game/runContext";
import { canPlay } from "../../src/game/sim";
import type { Battle, WeaponId } from "../../src/game/types";
import { canPlayAttack, canPlayMove } from "./hand";

export type Policy = {
  id: string;
  label: string;
  school: WeaponId | "mix";
  pick: (b: Battle, rc: RunContext, rng: () => number) => string | null;
};

/** P1 度量尺：打得中的攻击优先，其次位移，否则收势。 */
export const greedyPolicy: Policy = {
  id: "greedy",
  label: "先攻后移",
  school: "mix",
  pick(b, rc) {
    for (const card of b.hand) {
      if (canPlayAttack(b, card, rc)) return card.uid;
    }
    for (const card of b.hand) {
      if (canPlayMove(b, card, rc)) return card.uid;
    }
    return null;
  },
};

/** 对照：合法牌里均匀抽一张。种子进策略 rng，不碰 Math.random。 */
export const randomPolicy: Policy = {
  id: "random",
  label: "随机合法",
  school: "mix",
  pick(b, rc, rng) {
    const legal = b.hand.filter((card) => canPlay(b, card.uid, rc).ok);
    if (!legal.length) return null;
    const i = Math.floor(rng() * legal.length);
    return legal[i]!.uid;
  },
};
