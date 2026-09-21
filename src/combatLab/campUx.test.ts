import { describe, expect, it } from "vitest";
import { setLabRuleset } from "./labRuleset";
import {
  applyCompanion,
  createGauntletRun,
  marketBuyCap,
  marketGradientMul,
  marketRefreshCost,
  wagerStakeCap,
} from "./gauntlet";
import { renderGauntletCompanionPick, renderGauntletLoadout, renderGauntletRewardPick, renderGauntletSettle } from "./gauntletUi";

describe("营地停留 / 黑市刷新 / 立绘", () => {
  it("领奖屏有继续按钮，未领完时禁用", () => {
    setLabRuleset("break");
    const run = { ...createGauntletRun("bandit", "palm"), pot: 80, hp: 30, stage: 2 };
    const html = renderGauntletRewardPick(
      run,
      [{ kind: "card", id: "strike", title: "直取", tip: "伤 5" }],
      [],
      new Set(),
      0,
    );
    expect(html).toContain("gauntlet-camp-continue");
    expect(html).toContain("gauntlet-camp-body");
    expect(html).toContain("gauntlet-camp-story");
    expect(html).toContain("路程小本");
    expect(html).toContain("州桥酒楼");
    expect(html).toMatch(/id="gauntlet-camp-continue"[^>]*disabled/);
    expect(html).toContain('class="card');
    expect(html).toMatch(/<p class="text">/);
  });

  it("黑市与免费奖励都是局内卡牌样式；馆 10 购满上限放开", () => {
    expect(marketBuyCap(2)).toBe(4);
    expect(marketBuyCap(10)).toBe(99);
    expect(marketRefreshCost({ pot: 100, stage: 2 })).toBeGreaterThanOrEqual(6);
    expect(marketGradientMul(4)).toBeGreaterThan(marketGradientMul(3));
    expect(marketGradientMul(8)).toBeGreaterThan(marketGradientMul(7));
    expect(wagerStakeCap(4)).toBe(120);
    const run = { ...createGauntletRun("bandit", "palm"), pot: 80, hp: 20, stage: 2 };
    const html = renderGauntletRewardPick(
      run,
      [],
      [{ id: "heal", kind: "heal", price: 12, title: "金创药", tip: "现在回 8 点血。这馆打完再回 8 点。" }],
      new Set(),
      2,
    );
    expect(html).toContain('data-market-id="heal"');
    expect(html).toContain('class="card');
    expect(html).toContain("金创药");
    expect(html).toContain("现在回 8 点血");
    expect(html).toContain("12 彩金");
    expect(html).toContain("card-art");
    expect(html).not.toContain("gauntlet-kind-svg");
    expect(html).toContain("刷新货架");
    expect(html).toMatch(/gauntlet-camp-foot[\s\S]*id="gauntlet-market-refresh"/);
    expect(html).not.toMatch(/id="gauntlet-camp-continue"[^>]*disabled/);
  });

  it("选同道有立绘与技能", () => {
    setLabRuleset("break");
    const run = createGauntletRun("bandit", "saber");
    const html = renderGauntletCompanionPick(run, ["baimenghe", "wenrensheng"]);
    expect(html).toContain("gauntlet-comp-art");
    expect(html).toContain("温掌");
  });

  it("配装屏：谱/外功/心法/武器并列，行囊在底栏，角色在左栏", () => {
    setLabRuleset("break");
    let run = createGauntletRun("bandit", "saber");
    run = applyCompanion(run, "baimenghe");
    run = { ...run, stashCards: ["strike"] };
    const html = renderGauntletLoadout(run);
    expect(html).toContain("work-screen");
    expect(html).toContain("gauntlet-loadout-rail");
    expect(html).toContain("gauntlet-loadout-back");
    expect(html).toContain("gauntlet-loadout-stash");
    expect(html).toContain("gauntlet-comp-art");
    expect(html).toContain("data-loadout-mate");
    expect(html).toContain("data-unequip-mate");
    expect(html).toContain('class="card');
    expect(html).toContain("card-art");
    expect(html).toContain("data-equip-idx");
    expect(html).toContain("gauntlet-stash-sell");
    expect(html).toContain("gauntlet-stash-craft");
    expect(html).toContain("换页");
    expect(html).toMatch(/gauntlet-loadout-main[\s\S]*gauntlet-loadout-stash/);
    expect(html).toContain("gauntlet-loadout-mate is-empty");
    expect(html).toContain("data-loadout-page");
    expect(html).toContain('data-loadout-page="deck"');
    expect(html).toContain('data-loadout-page="tech"');
    expect(html).toContain('data-loadout-page="mind"');
    expect(html).toContain('data-loadout-page="weapon"');
    expect(html).not.toContain("gauntlet-loadout-portrait");
    expect(html).not.toContain("配装 ·");
    expect(html).not.toMatch(/<h3>行囊<\/h3>/);
    expect(html).toMatch(/id="gauntlet-loadout-back"[\s\S]*gauntlet-loadout-stash/);
    expect(html).toContain('data-sfx="ui-click"');
    const tech = renderGauntletLoadout(run, undefined, "tech");
    expect(tech).toContain("叠功");
    const mind = renderGauntletLoadout(run, undefined, "mind");
    expect(mind).toMatch(/合成/);
    expect(mind).toMatch(/id="gauntlet-stash-craft"[^>]*disabled/);
    const weapon = renderGauntletLoadout(run, undefined, "weapon");
    expect(weapon).toContain("淬刃");
    expect(weapon).toContain("gauntlet-loadout-weapon");
  });

  it("告捷结清写在笺头里，不飘在底图上", () => {
    const run = { ...createGauntletRun("bandit", "palm"), pot: 107, stage: 2 };
    const html = renderGauntletSettle(run, ["底彩 +22"]);
    expect(html).toContain("本馆告捷");
    expect(html).toContain("州桥");
    expect(html).toMatch(/gauntlet-head[\s\S]*底彩 \+22/);
    expect(html).toMatch(/gauntlet-head[\s\S]*现有彩金/);
    expect(html).toContain("gauntlet-settle-take");
  });
});
