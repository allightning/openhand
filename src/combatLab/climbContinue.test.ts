import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createGauntletRun } from "./gauntlet";
import {
  CLIMB_CONTINUE_REPLAYS,
  clearClimbContinue,
  consumeClimbContinue,
  peekClimbContinue,
  touchClimbCamp,
} from "./climbContinue";

function stubStorage() {
  const map = new Map<string, string>();
  (globalThis as { localStorage?: Storage }).localStorage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    key: () => null,
    get length() {
      return map.size;
    },
  } as Storage;
}

function payload(run = createGauntletRun("bandit", "palm")) {
  return {
    run,
    rewards: [{ kind: "card" as const, id: "strike", title: "直取", tip: "伤" }],
    market: [],
    marketBought: [] as string[],
    rewardTakes: 0,
    marketRefreshN: 0,
    rewardsAreSuper: false,
  };
}

describe("营地续关", () => {
  beforeEach(() => {
    stubStorage();
    clearClimbContinue();
  });
  afterEach(() => {
    clearClimbContinue();
    delete (globalThis as { localStorage?: Storage }).localStorage;
  });

  it("记下后可续关 2 次，奖励不丢", () => {
    const run = createGauntletRun("bandit", "palm");
    touchClimbCamp(payload(run));
    expect(peekClimbContinue()?.replayLeft).toBe(CLIMB_CONTINUE_REPLAYS);
    const a = consumeClimbContinue();
    expect(a?.rewards[0]?.id).toBe("strike");
    expect(a?.replayLeft).toBe(1);
    expect(peekClimbContinue()?.replayLeft).toBe(1);
    const b = consumeClimbContinue();
    expect(b?.replayLeft).toBe(0);
    expect(consumeClimbContinue()).toBeNull();
    expect(peekClimbContinue()).toBeNull();
  });

  it("无尽不写档", () => {
    const run = { ...createGauntletRun("bandit", "palm"), endless: true };
    touchClimbCamp(payload(run));
    expect(peekClimbContinue()).toBeNull();
  });

  it("同一馆再记不刷新次数", () => {
    const run = createGauntletRun("bandit", "palm");
    touchClimbCamp(payload(run));
    consumeClimbContinue();
    touchClimbCamp(payload(run));
    expect(peekClimbContinue()?.replayLeft).toBe(1);
  });

  it("耗尽后同一馆购买/刷新不再补满", () => {
    const run = createGauntletRun("bandit", "palm");
    touchClimbCamp(payload(run));
    consumeClimbContinue();
    consumeClimbContinue();
    expect(peekClimbContinue()).toBeNull();
    // 模拟营地购买后再次保存：同一馆不得重置为 2
    touchClimbCamp(payload(run));
    expect(peekClimbContinue()).toBeNull();
    expect(consumeClimbContinue()).toBeNull();
  });
});
