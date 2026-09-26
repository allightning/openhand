import { afterEach, describe, expect, it } from "vitest";
import { CARDS } from "../game/content";
import { cardDisplayText } from "../game/cardTextV2";
import { climbTestContext } from "./testContext";
import { setLabMode, setLabTuning } from "./labTuning";
import { shouldSkipWager } from "./breakOnboard";
import { GUIDE_SECTIONS } from "./guide";
import { createGauntletRun, marketOffers, marketStallOf } from "./gauntlet";
import { pathLadder } from "./gauntletPaths";
import { renderGauntletHome, renderGauntletRewardPick } from "./gauntletUi";
import { setLabRuleset } from "./labRuleset";

const BREAK_TEACH = /让与破|来锋位移|硬拆|破眼|破招|拆势|「让」/;

describe("行路不再教破招", () => {
  afterEach(() => {
    setLabRuleset("climb");
    setLabMode(false);
    setLabTuning({ rulesV2: true });
  });

  it("三线馆名不写破招教案", () => {
    setLabRuleset("climb");
    for (const path of ["shaolin", "bandit", "court"] as const) {
      for (const entry of pathLadder(path)) {
        expect(entry.label).not.toMatch(BREAK_TEACH);
      }
    }
    expect(pathLadder("bandit")[1]?.label).toMatch(/坡蹲/);
  });

  it("行路牌面卸力/斩不写让与硬拆", () => {
    setLabRuleset("climb");
    setLabMode(true);
    setLabTuning({ rulesV2: true });
    expect(cardDisplayText(CARDS.defend, climbTestContext(), { breakAlign: false })).not.toMatch(BREAK_TEACH);
    expect(cardDisplayText(CARDS.cut, climbTestContext(), { breakAlign: false })).not.toMatch(BREAK_TEACH);
    expect(cardDisplayText(CARDS.brace, climbTestContext(), { breakAlign: false })).not.toMatch(BREAK_TEACH);
    expect(cardDisplayText(CARDS.defend, climbTestContext(), { breakAlign: false })).toMatch(/格挡/);
  });

  it("行路攻略不把每程下注和破招绑在一起", () => {
    const body = GUIDE_SECTIONS.flatMap((s) => s.body).join("\n");
    expect(body).not.toMatch(/每程：.*下注/);
    expect(body).not.toMatch(/不破也能走.*破招是高手/);
    expect(body).not.toMatch(/第一程(开战)?前可进赌馆/);
    expect(renderGauntletHome("")).not.toMatch(/垫资/);
  });
});

describe("行路赌馆 / 当铺 / 黑市", () => {
  afterEach(() => {
    setLabRuleset("climb");
  });

  it("行路默认不开赌馆，选项送来才开", () => {
    setLabRuleset("climb");
    expect(shouldSkipWager(1)).toBe(true);
    expect(shouldSkipWager(2)).toBe(true);
    expect(shouldSkipWager(6)).toBe(true);
    expect(shouldSkipWager(2, { pendingOpenWager: true })).toBe(false);
    setLabRuleset("break");
    expect(shouldSkipWager(2)).toBe(false);
  });

  it("营地当铺常驻、黑市另栏；跳过黑市仍留当铺", () => {
    setLabRuleset("climb");
    const run = { ...createGauntletRun("bandit", "saber"), pot: 80, hp: 20, stage: 4 };
    const market = marketOffers(run, () => 0);
    expect(market.some((o) => marketStallOf(o) === "pawn")).toBe(true);
    expect(market.some((o) => marketStallOf(o) === "black")).toBe(false);
    const html = renderGauntletRewardPick(run, [], market, new Set());
    expect(html).toContain("当铺");
    expect(html).not.toContain("黑市 · 跨阶货");
    expect(html).toContain("黑市今夜没开");

    const opened = marketOffers({ ...run, pendingOpenMarket: true }, () => 0);
    expect(opened.some((o) => marketStallOf(o) === "black")).toBe(true);
    const openHtml = renderGauntletRewardPick({ ...run, pendingOpenMarket: true }, [], opened, new Set());
    expect(openHtml).toContain("黑市 · 跨阶货");

    const skipped = marketOffers({ ...run, pendingSkipMarket: true }, () => 0);
    expect(skipped.every((o) => marketStallOf(o) === "pawn")).toBe(true);
    expect(skipped.some((o) => o.kind === "forge" || o.kind === "tech")).toBe(false);
    expect(skipped.some((o) => o.kind === "item" || o.kind === "heal" || o.kind === "card")).toBe(true);
  });
});
