import { afterEach, describe, expect, it } from "vitest";
import { setLabMode } from "../game/labTuning";
import {
  canEndPlayerTurn,
  canPlay,
  endTurn,
  labCanCycle,
  labCycleCard,
  labDiscardCard,
  labEnterDiscardPhase,
  labCanComboReplay,
  labComboReplay,
  needsDiscardToHandCap,
  playCard,
} from "../game/sim";
import { addStake } from "../game/stake";
import { damageBreakdown } from "../game/damageBreakdown";
import { climbTestContext } from "../game/testContext";
import { labCard } from "../game/labContent";
import { startLabBattle } from "./factory";
import { applyAutoLoadout } from "./autoLoadouts";
import { buildGauntletPreset, createGauntletRun } from "./gauntlet";
import { setLabRuleset } from "./labRuleset";
import { CLIMB_BLOCK_CAP, CLIMB_GUARD_WAGER, CLIMB_SPEAR_CUT_QI, climbCycleCost, climbEnemyPaceBonus } from "./climbCaps";
import { handRefillAmount } from "./rogueRoster";

describe("爬塔试玩默认 2026-09-17", () => {
  afterEach(() => {
    setLabRuleset("climb");
    setLabMode(false);
  });

  function climbBattle() {
    setLabRuleset("climb");
    setLabMode(true);
    return startLabBattle(buildGauntletPreset(createGauntletRun("bandit", "saber")), true, 1);
  }

  it("开局场上摸 D=⌈上限/2⌉，光环可另入手", () => {
    const b = climbBattle();
    const D = handRefillAmount(5);
    const extra = b.hand.filter((c) => String(c.defId).startsWith("aura") || String(c.defId).startsWith("fuse")).length;
    expect(b.hand.length).toBe(D + extra);
    expect(D).toBe(3);
  });

  it("手牌超上限不能收势；弃牌常亮可弃到上限", () => {
    let b = climbBattle();
    b.hand = [
      ...b.hand,
      { uid: "x1", defId: "direct" },
      { uid: "x2", defId: "direct" },
      { uid: "x3", defId: "direct" },
    ];
    expect(needsDiscardToHandCap(b)).toBe(true);
    expect(canEndPlayerTurn(b).ok).toBe(false);
    b = labEnterDiscardPhase(b);
    expect(b.climbDiscardPhase).toBe(true);
    while (needsDiscardToHandCap(b) && b.hand[0]) b = labDiscardCard(b, b.hand[0].uid);
    expect(needsDiscardToHandCap(b)).toBe(false);
    expect(canEndPlayerTurn(b).ok).toBe(true);
  });

  it("置换花费 = 牌费 − 1，可连换", () => {
    let b = climbBattle();
    b.energy = 10;
    b.drawPile = [{ uid: "d1", defId: "direct" }, { uid: "d2", defId: "direct" }];
    const uid = b.hand[0]!.uid;
    const cost = climbCycleCost(labCard(b.hand[0]!.defId).cost);
    expect(labCanCycle(b).ok).toBe(true);
    const before = b.energy;
    b = labCycleCard(b, uid);
    expect(b.energy).toBe(before - cost);
    expect(labCanCycle(b).ok).toBe(true);
  });

  it("格挡收势不清，帽 12", () => {
    const b = climbBattle();
    b.playerBlock = 7;
    b.player.pos = 0;
    b.enemy.pos = 6;
    b.intents = [{ kind: "guard", block: 4 }];
    b.intent = b.intents[0]!;
    const after = endTurn(b, { deferIntentRefresh: true });
    expect(after.playerBlock).toBe(7);
    b.playerBlock = 20;
    const capped = endTurn(b, { deferIntentRefresh: true });
    expect(capped.playerBlock).toBe(CLIMB_BLOCK_CAP);
  });

  it("快刀领先 +2 不进构成", () => {
    const b = climbBattle();
    b.foePace = 1;
    b.paceBoost = 8;
    b.player.pos = 3;
    b.enemy.pos = 4;
    const def = labCard("hitSaber");
    const br = damageBreakdown(b, def, climbTestContext());
    expect(br.parts.some((p) => p.label === "快刀")).toBe(false);
  });

  it("馆阶先机加成与堆挡注", () => {
    expect(climbEnemyPaceBonus(1)).toBe(0);
    expect(climbEnemyPaceBonus(6)).toBe(1);
    expect(climbEnemyPaceBonus(9)).toBe(2);
    expect(CLIMB_GUARD_WAGER).toBe(10);
  });

  it("弃牌阶段不能出牌", () => {
    const b = climbBattle();
    b.energy = 20;
    const uid = b.hand[0]!.uid;
    labEnterDiscardPhase(b);
    expect(canPlay(b, uid).ok).toBe(false);
    expect(canPlay(b, uid).reason).toContain("弃牌");
  });

  it("断劲：同手两枪 3–4 格扣敌劲", () => {
    setLabRuleset("climb");
    setLabMode(true);
    const p = applyAutoLoadout("t8-three-spear-palm", 1, 1);
    let b = startLabBattle(p, true, 1);
    b.energy = 20;
    b.player.pos = 0;
    b.enemy.pos = 3;
    b.enemyEnergy = 10;
    b.hand = [
      { uid: "spk1", defId: "thrust" },
      { uid: "spk2", defId: "thrust" },
      ...b.hand,
    ];
    expect(canPlay(b, "spk1").ok).toBe(true);
    b = playCard(b, "spk1");
    expect(b.climbSpearRangeHits).toBe(1);
    b.energy = 20;
    b.player.pos = 0;
    b.enemy.pos = 4;
    const before = b.enemyEnergy;
    expect(canPlay(b, "spk2").ok).toBe(true);
    b = playCard(b, "spk2");
    expect(b.enemyEnergy).toBe(before - CLIMB_SPEAR_CUT_QI);
  });

  it("连击重放花 2 层", () => {
    setLabRuleset("climb");
    setLabMode(true);
    const p = applyAutoLoadout("t1-four-palm", 1, 1);
    let b = startLabBattle(p, true, 1);
    b.energy = 20;
    b.combo = 3;
    b.climbLastAttackId = "strike";
    b.player.pos = 3;
    b.enemy.pos = 4;
    expect(labCanComboReplay(b).ok).toBe(true);
    b = labComboReplay(b);
    // 花 2 → 1，重放命中再叠 +1 → 2
    expect(b.combo).toBe(2);
  });

  it("桩帽 2", () => {
    const b = climbBattle();
    expect(addStake(b, 1, 1)).toBe(true);
    expect(addStake(b, 2, 1)).toBe(true);
    expect(addStake(b, 3, 1)).toBe(false);
    expect(b.stakes).toHaveLength(2);
  });
});
