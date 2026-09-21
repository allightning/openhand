import { describe, expect, it } from "vitest";
import {
  foeSegGapMs,
  foeFirstHoldMs,
  outcomeToFxKind,
  recapDisplayAfter,
  recapDisplayStart,
  skipFoeRecap,
  filterEmptyRecap,
  climbPlaybackRecap,
  applyIntentMove,
  overlayRecapBattle,
  intentBarFate,
} from "./foePlayback";
import { isBattleWon } from "../game/sim";
import type { Battle } from "../game/types";

describe("敌招回放按段扣血", () => {
  it("从结算后的血加回总损失，再一段段扣", () => {
    const recap = [
      { ord: 1, name: "劈", outcome: "打", hpLost: 4, blockLost: 2 },
      { ord: 2, name: "劈", outcome: "打", hpLost: 3, blockLost: 0 },
    ];
    const start = recapDisplayStart(10, 1, recap, 2, 5);
    expect(start).toEqual({ hp: 17, block: 3, playerPos: 2, enemyPos: 5 });
    const mid = recapDisplayAfter(start, recap[0]!);
    expect(mid).toEqual({ hp: 13, block: 1, playerPos: 2, enemyPos: 5 });
    const end = recapDisplayAfter(mid, recap[1]!);
    expect(end).toEqual({ hp: 10, block: 1, playerPos: 2, enemyPos: 5 });
  });

  it("冲锋按段挪位，跳过的段不动", () => {
    expect(applyIntentMove(2, 5, { kind: "charge", damage: 8, steps: 2 }, "打")).toEqual({ playerPos: 2, enemyPos: 3 });
    expect(applyIntentMove(2, 5, { kind: "charge", damage: 8, steps: 2 }, "劲尽")).toEqual({ playerPos: 2, enemyPos: 5 });
    expect(intentBarFate("空")).toBe("grey");
    expect(intentBarFate("打")).toBe("gone");
    expect(intentBarFate("劲尽")).toBe("gone");
  });

  it("overlay 只改画面血位，不提前用终态", () => {
    const b = {
      player: { hp: 4, pos: 3 },
      playerBlock: 0,
      enemy: { id: "mob", pos: 6 },
      foes: [{ id: "mob", pos: 6 }],
    } as Battle;
    const shown = overlayRecapBattle(b, { hp: 12, block: 3, playerPos: 2, enemyPos: 5 });
    expect(shown.player.hp).toBe(12);
    expect(shown.player.pos).toBe(2);
    expect(shown.enemy.pos).toBe(5);
    expect(b.enemy.pos).toBe(6);
  });

  it("读招标空的段不进回放；爬塔灰留仍回放", () => {
    const recap = [
      { ord: 1, name: "劈", outcome: "空", hpLost: 0, blockLost: 0 },
      { ord: 2, name: "劈", outcome: "打", hpLost: 3, blockLost: 0 },
    ];
    expect(filterEmptyRecap(recap).map((r) => r.outcome)).toEqual(["打"]);
    expect(recap.map((r) => r.outcome)).toEqual(["空", "打"]);
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

  it("爬塔回放保留灰留并接结束/开始条", () => {
    const foe = [
      { ord: 1, name: "劈", outcome: "空", hpLost: 0, blockLost: 0 },
      { ord: 2, name: "劈", outcome: "打", hpLost: 3, blockLost: 0 },
    ];
    const b = {
      climbTurnTape: [
        { ord: 1, name: "结束", outcome: "裂创 无" },
        { ord: 2, name: "开始", outcome: "先机 8 vs 6（先手）" },
      ],
    } as Battle;
    const recap = climbPlaybackRecap(b, foe, true);
    expect(recap.map((r) => r.name)).toEqual(["劈", "劈", "结束", "开始"]);
    expect(recap[0]!.outcome).toBe("空");
    expect(climbPlaybackRecap(b, foe, false).map((r) => r.outcome)).toEqual(["打"]);
  });
});

describe("播报时序", () => {
  it("空段间隔短于打段", () => {
    expect(foeSegGapMs("打")).toBeGreaterThan(foeSegGapMs("空"));
    expect(outcomeToFxKind("破")).toBe("break");
    expect(foeFirstHoldMs([], true)).toBe(900);
  });
});
