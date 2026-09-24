import { afterEach, describe, expect, it } from "vitest";
import { contextNow } from "../game/runContext";
import { setLabMode } from "../game/labTuning";
import {
  applyClimbPhaseBeat,
  applyPendingStatusTicks,
  endTurn,
  peekClimbPhaseQueue,
} from "../game/sim";
import { startLabBattle } from "./factory";
import { buildGauntletPreset, createGauntletRun } from "./gauntlet";
import { setLabRuleset } from "./labRuleset";

describe("爬塔结束/开始逐拍", () => {
  afterEach(() => {
    setLabRuleset("climb");
    setLabMode(false);
  });

  function climbBattle() {
    setLabRuleset("climb");
    setLabMode(true);
    return startLabBattle(buildGauntletPreset(createGauntletRun("bandit", "saber")), true, 1);
  }

  it("defer 收势后裂创/回劲/摸牌不立刻落地，逐拍才结算", () => {
    let b = climbBattle();
    b.player.pos = 3;
    b.enemy.pos = 4;
    b.intents = [{ kind: "guard", block: 2 }];
    b.intent = b.intents[0]!;
    b.enemyEnergy = 0;
    b.bleed = 3;
    b.foeEndure = 2;
    const energyBefore = b.energy;
    const handBefore = b.hand.length;
    const foeHpBefore = b.enemy.hp;

    b = endTurn(b, contextNow(), { deferIntentRefresh: true, deferStatusTicks: true });
    expect(b.v2PendingStatusTicks).toBe(true);
    expect(peekClimbPhaseQueue(b)).toEqual(["bleed", "regen", "wage", "endure", "draw", "intents"]);
    expect(b.bleed).toBe(3);
    expect(b.enemy.hp).toBe(foeHpBefore);
    expect(b.energy).toBe(energyBefore);
    expect(b.hand.length).toBe(handBefore);
    expect(b.foeEndure).toBe(2);
    expect(b.v2PendingIntentRefresh).toBe(true);

    const bleed = applyClimbPhaseBeat(b, contextNow());
    expect(bleed.read).toMatch(/裂创/);
    expect(bleed.banner).toBe("【结束】裂创");
    b = bleed.battle;
    expect(b.bleed).toBe(3);
    expect(b.enemy.hp).toBe(foeHpBefore - 3);

    const regen = applyClimbPhaseBeat(b, contextNow());
    expect(regen.banner).toBe("【结束】回劲");
    b = regen.battle;
    expect(b.energy).toBeGreaterThan(energyBefore);

    const wage = applyClimbPhaseBeat(b, contextNow());
    expect(wage.banner).toBe("【结束】敌回劲");
    b = wage.battle;
    expect(b.enemyEnergy).toBeGreaterThan(0);

    const endure = applyClimbPhaseBeat(b, contextNow());
    expect(endure.banner).toBe("【结束】霸体");
    expect(endure.read).not.toMatch(/无/);
    b = endure.battle;
    expect(b.foeEndure).toBe(1);

    const draw = applyClimbPhaseBeat(b, contextNow());
    expect(draw.banner).toBe("【开始】摸牌");
    expect(draw.read).toMatch(/摸 \d+ 张/);
    expect(draw.read).not.toMatch(/后场/);
    b = draw.battle;
    expect(b.hand.length).not.toBe(handBefore);

    if (peekClimbPhaseQueue(b)[0] === "drawBench") {
      const bench = applyClimbPhaseBeat(b, contextNow());
      if (!bench.skip) {
        expect(bench.banner).toBe("【开始】后场摸牌");
        expect(bench.read).toMatch(/后场.*摸 \d+/);
      }
      b = bench.battle;
    }

    const intents = applyClimbPhaseBeat(b, contextNow());
    expect(intents.banner).toBe("【开始】亮招");
    expect(intents.read).not.toMatch(/后手隐/);
    b = intents.battle;
    expect(b.v2PendingIntentRefresh).toBeFalsy();
    expect(peekClimbPhaseQueue(b)).toEqual([]);
    expect(applyClimbPhaseBeat(b, contextNow()).done).toBe(true);
  });

  it("无裂创无霸体时不进队列，不播空拍", () => {
    let b = climbBattle();
    b.player.pos = 3;
    b.enemy.pos = 4;
    b.intents = [{ kind: "guard", block: 1 }];
    b.intent = b.intents[0]!;
    b.bleed = 0;
    b.youBleed = 0;
    b.foeEndure = 0;
    b.enemyEnergy = 0;
    b = endTurn(b, contextNow(), { deferIntentRefresh: true, deferStatusTicks: true });
    expect(peekClimbPhaseQueue(b)).toEqual(["regen", "wage", "draw", "intents"]);
    expect(peekClimbPhaseQueue(b)).not.toContain("bleed");
    expect(peekClimbPhaseQueue(b)).not.toContain("endure");
  });

  it("applyPendingStatusTicks 一次跑完剩余尾部（测试兼容）", () => {
    let b = climbBattle();
    b.player.pos = 3;
    b.enemy.pos = 4;
    b.intents = [{ kind: "guard", block: 1 }];
    b.intent = b.intents[0]!;
    b.bleed = 2;
    b = endTurn(b, contextNow(), { deferIntentRefresh: true, deferStatusTicks: true });
    const handBefore = b.hand.length;
    b = applyPendingStatusTicks(b, contextNow());
    expect(b.v2PendingStatusTicks).toBeFalsy();
    expect(peekClimbPhaseQueue(b)).toEqual([]);
    expect(b.bleed).toBe(2);
    expect(b.enemy.hp).toBeLessThan(b.enemy.maxHp);
    expect(b.hand.length).not.toBe(handBefore);
    expect(b.v2PendingIntentRefresh).toBeFalsy();
  });

  it("摸牌日志：场上与后场分两条，后场为零不写", () => {
    setLabRuleset("climb");
    setLabMode(true);
    const b = startLabBattle(buildGauntletPreset(createGauntletRun("bandit", "saber")), true, 1);
    const fieldNotes = b.log.filter((l) => /【开局】/.test(l) && /摸 \d+ 张/.test(l) && !l.includes("后场"));
    expect(fieldNotes.length).toBeGreaterThanOrEqual(1);
    expect(fieldNotes[0]).not.toMatch(/后场/);
    const benchNotes = b.log.filter((l) => /【开局】/.test(l) && l.includes("后场"));
    if (b.bench.length === 0) {
      expect(benchNotes).toEqual([]);
    }
  });

  it("亮招文案用共 N 段，不用后手隐", () => {
    let b = climbBattle();
    b.player.pos = 3;
    b.enemy.pos = 4;
    b.intents = [{ kind: "guard", block: 1 }];
    b.intent = b.intents[0]!;
    b.foePace = 1;
    b.paceBoost = 9;
    b = endTurn(b, contextNow(), { deferIntentRefresh: true, deferStatusTicks: true });
    while (peekClimbPhaseQueue(b).length) {
      b = applyClimbPhaseBeat(b, contextNow()).battle;
    }
    const line = [...b.log].reverse().find((l) => l.includes("亮招"));
    expect(line).toBeTruthy();
    expect(line!).not.toMatch(/后手隐/);
    if ((b.intents?.length ?? 0) > 1) {
      expect(line!).toMatch(/共 \d+ 段/);
    }
  });

  it("亮招后手只挂旗不静默兑招", () => {
    let b = climbBattle();
    b.player.pos = 3;
    b.enemy.pos = 4;
    b.intents = [{ kind: "guard", block: 1 }];
    b.intent = b.intents[0]!;
    b.foePace = 99;
    b.paceBoost = 0;
    b.youSlow = 0;
    const hp = b.player.hp;
    b = endTurn(b, contextNow(), { deferIntentRefresh: true, deferStatusTicks: true });
    while (peekClimbPhaseQueue(b).some((s) => s !== "intents")) {
      b = applyClimbPhaseBeat(b, contextNow()).battle;
    }
    expect(peekClimbPhaseQueue(b)).toEqual(["intents"]);
    const after = applyClimbPhaseBeat(b, contextNow());
    b = after.battle;
    expect(b.climbNeedFoeOpenPlayback).toBe(true);
    expect(b.climbEnemyActedThisRound).toBeFalsy();
    expect(b.player.hp).toBe(hp);
  });
});
