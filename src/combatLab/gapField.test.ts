import { describe, expect, it } from "vitest";
import { solidEdge } from "../game/board";
import { makeRun } from "../game/run";
import { gapFieldFor } from "../game/rules/envTags";
import { addStake } from "../game/stake";
import { canPlay, endTurn, makeBattle, playCard } from "../game/sim";
import { unitBackToWall } from "../game/rules/wallLinks";
import type { CardId } from "../game/types";
import { climbTestContext, makeTestContext } from "./testContext";

const rc = climbTestContext();

function play(id: CardId) {
  return (b: ReturnType<typeof makeBattle>) => {
    b.hand.push({ uid: id, defId: id });
    b.energy = Math.max(b.energy, 8);
    return playCard(b, id, rc);
  };
}

describe("缺格结算", () => {
  it("末端跟墙同侧，中间是中格", () => {
    expect(gapFieldFor("gap_end", 9, "high")).toEqual([8]);
    expect(gapFieldFor("gap_end", 9, "low")).toEqual([0]);
    expect(gapFieldFor("gap_end", 9)).toEqual([8]);
    expect(gapFieldFor("gap_mid", 9)).toEqual([4]);
    expect(gapFieldFor("burn", 9)).toBeUndefined();
    expect(gapFieldFor("nowall", 9)).toBeUndefined();
  });

  it("开局不站上缺格", () => {
    const run = makeRun("empty");
    run.envTag = "gap_end";
    run.wallSide = "low";
    const b = makeBattle("catcher", rc, run, true);
    expect(b.gapCells).toEqual([0]);
    expect(b.player.pos).toBe(1);
    expect(b.enemy.pos).not.toBe(0);
  });

  it("一步落在缺格上就停在旁边的实格", () => {
    const run = makeRun("empty");
    const b = makeBattle("catcher", rc, run, true);
    b.gapCells = [3];
    b.player.pos = 2;
    b.enemy.pos = 6;
    b.hand.push({ uid: "advance", defId: "advance" });
    expect(canPlay(b, "advance", rc).reason).toBe("缺格，停在第 3 步");
    b.player.pos = 6;
    b.enemy.pos = 2;
    b.intents = [{ kind: "advance", steps: 1 }];
    b.intent = b.intents[0]!;
    b.enemyEnergy = 8;
    const after = endTurn(b, rc);
    expect(after.enemy.pos).toBe(2);
    expect(after.log.join(" ")).toContain("缺格，停在第 3 步");
  });

  it("两步能跨过中间缺格落到对岸", () => {
    const run = makeRun("empty");
    const b = makeBattle("catcher", rc, run, true);
    b.gapCells = [2];
    b.player.pos = 1;
    b.enemy.pos = 6;
    const after = play("advance2")(b);
    expect(after.player.pos).toBe(3);
    expect(after.log.join(" ")).toContain("跨过缺格，落在第 4 步");
    expect(after.log.join(" ")).not.toContain("撞壁");
  });

  it("末端缺格时墙在最后一块实板后，推上去撞壁", () => {
    const off = makeTestContext({ mode: "climb", lab: false });
    const run = makeRun("empty");
    run.wallSide = "high";
    const b = makeBattle("catcher", off, run, true);
    b.gapCells = [8];
    b.wallEnds = "high";
    b.player.pos = 5;
    b.enemy.pos = 7;
    expect(unitBackToWall(b, 7)).toBe(true);
    expect(solidEdge(9, "high", [8])).toBe(7);
    const hp = b.enemy.hp;
    b.hand = [{ uid: "push", defId: "push" }];
    b.energy = 8;
    const after = playCard(b, "push", off);
    expect(after.enemy.pos).toBe(7);
    expect(after.enemy.hp).toBeLessThan(hp);
    expect(after.log.join(" ")).toContain("撞壁");
  });

  it("桩不落在缺格", () => {
    const run = makeRun("empty");
    const b = makeBattle("catcher", rc, run, true);
    b.gapCells = [4];
    b.player.pos = 3;
    b.enemy.pos = 5;
    expect(addStake(b, 4, 1, rc)).toBe(false);
    expect(b.stakes).not.toContain(4);
    const off = makeTestContext({ mode: "climb", lab: false });
    const loose = makeBattle("catcher", off, makeRun("empty"), true);
    loose.gapCells = [4];
    loose.player.pos = 3;
    loose.enemy.pos = 5;
    loose.hand = [{ uid: "plant", defId: "plant" }];
    loose.energy = 8;
    const after = playCard(loose, "plant", off);
    expect(after.stakes).not.toContain(4);
    expect(after.log.join(" ")).toContain("缺格，桩落不下");
  });
});
