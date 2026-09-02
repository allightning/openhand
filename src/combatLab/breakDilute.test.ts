import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CARDS } from "../game/content";
import { setLabMode } from "../game/labTuning";
import { playCard } from "../game/sim";
import { mindTip, techniqueTip } from "./breakAlign";
import { startLabBattle } from "./factory";
import { BREAK_REWARD_WEIGHTS } from "./breakAlign";
import {
  buildGauntletPreset,
  createGauntletRun,
  marketPrice,
  peakPotAnchor,
  resolveWager,
  rollGauntletRewards,
  wagerOffers,
  wagerStakeMax,
} from "./gauntlet";
import { setLabRuleset } from "./labRuleset";
import { renderFoeIntentStrip, renderFxLayer } from "./labV2Ui";

describe("肉鸽拆招降权", () => {
  beforeEach(() => {
    setLabRuleset("break");
    setLabMode(true);
  });
  afterEach(() => setLabMode(false));

  it("注额帽：馆 1=30、2=50、3=70、4=120、7 后每馆 +100", () => {
    expect(wagerStakeMax(60, 1)).toBe(30);
    expect(wagerStakeMax(20, 1)).toBe(20);
    expect(wagerStakeMax(400, 2)).toBe(50);
    expect(wagerStakeMax(400, 3)).toBe(70);
    expect(wagerStakeMax(400, 4)).toBe(120);
    expect(wagerStakeMax(400, 5)).toBe(170);
    expect(wagerStakeMax(999, 7)).toBe(270);
    expect(wagerStakeMax(999, 8)).toBe(370);
    expect(wagerStakeMax(999, 10)).toBe(570);
  });

  it("峰值锚二次：馆 10 远小于指数上亿", () => {
    expect(peakPotAnchor(1)).toBe(88);
    expect(peakPotAnchor(10)).toBeLessThan(2000);
    expect(peakPotAnchor(10)).toBeGreaterThan(peakPotAnchor(5));
  });

  it("黑市不跟池：彩金再多金创也不涨", () => {
    expect(marketPrice("heal", 1, "easy", 16)).toBeLessThanOrEqual(16);
    expect(marketPrice("heal", 1, "easy", 400)).toBe(marketPrice("heal", 1, "easy", 16));
  });

  it("馆 1 不开连破/破眼；完璧 1.5、连破 2.5", () => {
    const early = { ...createGauntletRun("bandit", "palm"), items: ["jinchuang" as const], stage: 1 };
    for (let i = 0; i < 48; i++) {
      const kinds = wagerOffers(early, () => (i * 0.017) % 1).map((o) => o.kind);
      expect(kinds).not.toContain("chain");
      expect(kinds).not.toContain("eye");
    }
    const late = { ...early, stage: 5 };
    for (let i = 0; i < 80; i++) {
      const kinds = wagerOffers(late, () => (i * 0.013) % 1).map((o) => o.kind);
      expect(kinds).not.toContain("chain");
      expect(kinds).not.toContain("eye");
    }
    const clean = wagerOffers(early, () => 0).find((o) => o.kind === "clean") ?? wagerOffers(early).find((o) => o.kind === "clean");
    // 馆 1 池里必能摇到完璧或堆挡这类低倍
    let easyOdds = 0;
    for (let i = 0; i < 40; i++) {
      for (const o of wagerOffers(early, () => (i * 0.03) % 1)) {
        if (o.kind === "clean" || o.kind === "guard") easyOdds = o.odds;
      }
    }
    expect(easyOdds).toBe(1.5);
    expect(clean === undefined || clean.odds === 1.5).toBe(true);
  });

  it("完璧/血战/赤手不再额外要硬拆段数", () => {
    const run = { ...createGauntletRun("bandit", "palm"), pot: 50, wager: { kind: "clean" as const, stake: 10, target: 75, odds: 1.5 } };
    expect(resolveWager(run, { breaks: 0, turns: 8, hpEndRatio: 0.8, won: true, eyes: 0, itemsUsed: false }).won).toBe(true);
    expect(
      resolveWager(
        { ...run, wager: { kind: "blood", stake: 10, target: 35, odds: 3 } },
        { breaks: 0, turns: 8, hpEndRatio: 0.3, won: true, eyes: 0, itemsUsed: false },
      ).won,
    ).toBe(true);
  });

  it("新盘：不贴身 / 堆挡 / 本系刀", () => {
    const base = { breaks: 0, turns: 5, hpEndRatio: 0.9, won: true, eyes: 0, itemsUsed: false };
    const rangeRun = { ...createGauntletRun("bandit", "palm"), wager: { kind: "range" as const, stake: 10, target: 2, odds: 3 } };
    expect(resolveWager(rangeRun, { ...base, endDist: 2 }).won).toBe(true);
    expect(resolveWager(rangeRun, { ...base, endDist: 1 }).won).toBe(false);
    const guardRun = { ...rangeRun, wager: { kind: "guard" as const, stake: 10, target: 8, odds: 1.5 } };
    expect(resolveWager(guardRun, { ...base, endBlock: 8 }).won).toBe(true);
    expect(resolveWager(guardRun, { ...base, endBlock: 3 }).won).toBe(false);
    const schoolRun = { ...rangeRun, wager: { kind: "school" as const, stake: 10, target: 1, odds: 2 } };
    expect(resolveWager(schoolRun, { ...base, schoolPure: true }).won).toBe(true);
    expect(resolveWager(schoolRun, { ...base, schoolPure: false }).won).toBe(false);
  });

  it("心法/外功展示不再写硬拆套话", () => {
    expect(mindTip("springQi")).not.toMatch(/拆/);
    expect(techniqueTip("keepGuard")).not.toMatch(/硬拆/);
  });

  it("营地权重谱牌高于心法；馆 1 至少一张谱", () => {
    expect(BREAK_REWARD_WEIGHTS.card).toBeGreaterThan(BREAK_REWARD_WEIGHTS.mind);
    const run = { ...createGauntletRun("shaolin", "palm"), stage: 2 };
    let sawCard = false;
    for (let i = 0; i < 24; i++) {
      const opts = rollGauntletRewards(run, () => (i * 0.041) % 1);
      if (opts.some((o) => o.kind === "card")) sawCard = true;
    }
    expect(sawCard).toBe(true);
  });

  it("正式开踢意图条不刷将破/将让", () => {
    const b = startLabBattle(buildGauntletPreset(createGauntletRun("shaolin", "palm")), false, 1);
    const strip = renderFoeIntentStrip(b, null);
    expect(strip).toContain("打/空/跳过");
    expect(strip).not.toMatch(/将破|将让|将追/);
    expect(strip).not.toContain("lab-recap-chip");
  });

  it("打牌有独立演出", () => {
    const run = createGauntletRun("shaolin", "palm");
    const b = startLabBattle(buildGauntletPreset(run), false, 1);
    b.energy = 6;
    b.hand = [{ uid: "d", defId: "defend" }];
    const after = playCard(b, "d");
    expect(after.v2FxQueue?.some((k) => k === "cardWard" || k === "cardHeal" || k === "cardHit")).toBe(true);
    expect(renderFxLayer(after).length).toBeGreaterThan(0);
    expect(CARDS.defend.block).toBeGreaterThan(0);
  });
});
