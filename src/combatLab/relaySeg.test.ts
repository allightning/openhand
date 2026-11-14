import { afterEach, describe, expect, it } from "vitest";
import { CLIMB_RELAY_SEG_MUL } from "../game/climbCaps";
import { applyLabEnemyKit, setBattleRng } from "../game/sim";
import { buildGauntletPreset, createGauntletRun } from "./gauntlet";
import { setLabMode } from "./labTuning";
import { setLabRuleset } from "./labRuleset";
import { startLabBattle } from "./factory";
import { climbTestContext } from "./testContext";

function hall(stage: number) {
  setLabRuleset("climb");
  setLabMode(true);
  const run = { ...createGauntletRun("bandit", "saber", "usurper", { rng: () => 0.2 }), stage };
  return startLabBattle(buildGauntletPreset(run), true, 1);
}

afterEach(() => {
  setLabRuleset("climb");
  setLabMode(false);
});

describe("馆 2 起敌接力降节奏", () => {
  it("第二人及以后的意图段数减半，向下取整，保底 1，血不变", () => {
    const rc = climbTestContext();
    setBattleRng(() => 0.3);
    const front = hall(2);
    applyLabEnemyKit(front, rc, "main");
    const full = front.intents.length;
    const hp = front.enemy.hp;
    const maxHp = front.enemy.maxHp;
    setBattleRng(() => 0.3);
    const relay = hall(2);
    applyLabEnemyKit(relay, rc, "extra");
    expect(relay.intents.length).toBe(Math.max(1, Math.floor(full * CLIMB_RELAY_SEG_MUL)));
    expect(relay.intents.length).toBeLessThanOrEqual(full);
    expect(relay.enemy.hp).toBe(hp);
    expect(relay.enemy.maxHp).toBe(maxHp);
    setBattleRng(null);
  });

  it("馆 1 的替补不减段", () => {
    const rc = climbTestContext();
    setBattleRng(() => 0.3);
    const front = hall(1);
    applyLabEnemyKit(front, rc, "main");
    const full = front.intents.length;
    setBattleRng(() => 0.3);
    const relay = hall(1);
    applyLabEnemyKit(relay, rc, "extra");
    expect(relay.intents.length).toBe(full);
    setBattleRng(null);
  });
});
