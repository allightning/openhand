import { describe, expect, it, beforeEach } from "vitest";
import { setLabRuleset } from "./labRuleset";
import {
  afterGauntletWin,
  basePot,
  bleedRemainingPot,
  createGauntletRun,
  marketPrice,
  marketRefreshCost,
  resolveWager,
  reviveGauntletRun,
  settleHallPot,
  wagerOffers,
  wagerStakeMax,
  WAGER_BLEED_RATE,
} from "./gauntlet";
import { canStartBattle, deckBounds, fieldDeck, grantCardToLoadout, gearSlotMax } from "./loadout";
import { foeIntentAlias } from "../game/enemyKit";

describe("下一波草案", () => {
  beforeEach(() => setLabRuleset("break"));

  it("出血税 10%，至少 1", () => {
    expect(WAGER_BLEED_RATE).toBe(0.1);
    expect(bleedRemainingPot(100)).toEqual({ pot: 90, tax: 10 });
    expect(bleedRemainingPot(1).tax).toBe(1);
  });

  it("托管后赢注返还 注×赔率，飞注 0；输馆抽税且无底彩", () => {
    const run = {
      ...createGauntletRun("bandit", "palm"),
      pot: 30,
      wager: { kind: "clean" as const, stake: 20, target: 75, odds: 1.5 },
    };
    const win = resolveWager(run, { breaks: 0, turns: 4, hpEndRatio: 0.8, won: true, eyes: 0, itemsUsed: false });
    expect(win.payout).toBe(30);
    const hallWin = settleHallPot(run, { breaks: 0, turns: 4, hpEndRatio: 0.8, won: true, eyes: 0, itemsUsed: false }, true);
    expect(hallWin.pot).toBe(30 + 30 + basePot(1));
    const hallLose = settleHallPot(run, { breaks: 0, turns: 4, hpEndRatio: 0, won: false, eyes: 0, itemsUsed: false }, false);
    expect(hallLose.pot).toBe(27);
    expect(hallLose.texts.some((t) => t.includes("出血"))).toBe(true);
  });

  it("不下注底彩刚够一件最便宜货；枪队不开不贴身", () => {
    const B = basePot(1);
    expect(marketPrice("heal", 1, "easy")).toBeLessThanOrEqual(B);
    expect(marketPrice("heal", 1, "easy")).toBeGreaterThanOrEqual(Math.round(0.9 * B) - 1);
    const spear = createGauntletRun("bandit", "spear");
    for (let i = 0; i < 40; i++) {
      expect(wagerOffers({ ...spear, items: ["jinchuang"] }, () => (i * 0.07) % 1).some((o) => o.kind === "range")).toBe(false);
    }
  });

  it("刷新同摊递增加价，不跟彩金池", () => {
    const a = marketRefreshCost({ pot: 20, stage: 2 }, 0);
    const b = marketRefreshCost({ pot: 999, stage: 2 }, 0);
    expect(a).toBe(b);
    expect(marketRefreshCost({ pot: 20, stage: 2 }, 1)).toBeGreaterThan(a);
  });

  it("复活标记跳过下注；开战满血", () => {
    const rich = { ...createGauntletRun("bandit", "palm"), pot: 80, hp: 10 };
    const r = reviveGauntletRun(rich)!;
    expect(r.skipNextWager).toBe(true);
    expect(r.hp).toBe(r.hpMax);
    const won = afterGauntletWin(rich, 0, 3, 40, "mob_road_01");
    expect(won.hp).toBe(40);
  });

  it("馆 1–2 牌 8～10；注额帽仍在", () => {
    expect(deckBounds(1)).toEqual({ min: 8, max: 10 });
    expect(deckBounds(4)).toEqual({ min: 10, max: 12 });
    expect(deckBounds(8)).toEqual({ min: 12, max: 15 });
    expect(gearSlotMax(1)).toBe(1);
    expect(gearSlotMax(8)).toBe(3);
    const run = createGauntletRun("bandit", "palm");
    expect(fieldDeck(run)).toHaveLength(10);
    expect(canStartBattle(run)).toBe(true);
    expect(wagerStakeMax(400, 1)).toBe(30);
    let stuffed = run;
    for (const id of ["elbow", "push", "palmSeal", "rift", "sidestep"] as const) {
      stuffed = grantCardToLoadout(stuffed, id);
    }
    expect((stuffed.stashCards ?? []).length).toBeGreaterThan(0);
  });

  it("江湖刀敌打击不叫打击", () => {
    expect(foeIntentAlias("mob_road_01", { kind: "strike", damage: 7 })).toBe("扑刀");
  });

  it("盘口默认不开连破/破眼", () => {
    const late = { ...createGauntletRun("bandit", "palm"), items: ["jinchuang" as const], stage: 5 };
    for (let i = 0; i < 80; i++) {
      const kinds = wagerOffers(late, () => (i * 0.013) % 1).map((o) => o.kind);
      expect(kinds).not.toContain("chain");
      expect(kinds).not.toContain("eye");
    }
  });
});
