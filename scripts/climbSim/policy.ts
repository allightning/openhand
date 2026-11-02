import type { RunContext } from "../../src/game/runContext";
import { canPlay } from "../../src/game/sim";
import type { Battle, WeaponId } from "../../src/game/types";
import { FLAGS_OFF, type SimFlags } from "./flags";
import { canPlayAttack, canPlayMove } from "./hand";
import { shouldTakeReaction } from "./reactPolicy";

export type Policy = {
  id: string;
  label: string;
  school: WeaponId | "mix";
  flags: SimFlags;
  pick: (b: Battle, rc: RunContext, rng: () => number) => string | null;
  react: (b: Battle, rc: RunContext) => boolean;
};

function withFlags(row: Omit<Policy, "flags" | "react">, flags: SimFlags = FLAGS_OFF): Policy {
  return {
    ...row,
    flags,
    react: (b, rc) => shouldTakeReaction(b, rc, flags.react),
  };
}

/** P1 度量尺：打得中的攻击优先，其次位移，否则收势。 */
export const greedyPolicy: Policy = withFlags({
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
});

/** 对照：合法牌里均匀抽一张。种子进策略 rng，不碰 Math.random。 */
export const randomPolicy: Policy = withFlags({
  id: "random",
  label: "随机合法",
  school: "mix",
  pick(b, rc, rng) {
    const legal = b.hand.filter((card) => canPlay(b, card.uid, rc).ok);
    if (!legal.length) return null;
    const i = Math.floor(rng() * legal.length);
    return legal[i]!.uid;
  },
});
