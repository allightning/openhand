import { describe, expect, it } from "vitest";
import { recapDisplayAfter, recapDisplayStart, skipFoeRecap } from "./foePlayback";
import { isBattleWon } from "../game/sim";
import type { Battle } from "../game/types";

describe("敌招回放按段扣血", () => {
  it("从结算后的血加回总损失，再一段段扣", () => {
    const recap = [
      { ord: 1, name: "劈", outcome: "打", hpLost: 4, blockLost: 2 },
      { ord: 2, name: "劈", outcome: "打", hpLost: 3, blockLost: 0 },
    ];
    const start = recapDisplayStart(10, 1, recap);
    expect(start).toEqual({ hp: 17, block: 3 });
    const mid = recapDisplayAfter(start, recap[0]!);
    expect(mid).toEqual({ hp: 13, block: 1 });
    const end = recapDisplayAfter(mid, recap[1]!);
    expect(end).toEqual({ hp: 10, block: 1 });
  });

  it("最后一人倒下且无替补则跳过死人招回放", () => {
    const b = {
      phase: "won",
      player: { hp: 10 },
      enemy: { hp: 0 },
      foes: [{ hp: 0 }],
    } as Battle;
    expect(skipFoeRecap(b)).toBe(true);
    expect(isBattleWon(b)).toBe(true);
  });
});
