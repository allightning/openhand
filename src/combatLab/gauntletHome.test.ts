import { describe, expect, it, beforeEach } from "vitest";
import { clearBreakDemoDone, markBreakDemoDone } from "./breakDemo";
import { renderGauntletEvent, renderGauntletHome, renderGauntletPathPick, renderGauntletRewardPick, renderGauntletWager } from "./gauntletUi";
import { rollEventChoices } from "./encounter";
import { createGauntletRun, wagerOffers } from "./gauntlet";
import { setLabRuleset } from "./labRuleset";

describe("gauntlet home entries", () => {
  beforeEach(() => {
    clearBreakDemoDone();
    setLabRuleset("break");
  });

  it("break mode shows separate newbie and formal start", () => {
    const html = renderGauntletHome("");
    expect(html).toContain("start-break-demo");
    expect(html).toContain("start-rookie-demo");
    expect(html).toContain("start-training-hall");
    expect(html).toContain("start-gauntlet");
    expect(html).toContain("新手关");
    expect(html).toContain("训练馆");
    expect(html).toContain("开 踢");
    expect(html).toContain("明手：七步石台");
    expect(html).toContain("hall-gate-kick");
    expect(html).toContain("gauntlet-home-lessons");
    expect(html).not.toContain("gauntlet-dev-details");
    expect(html).not.toContain("实验台 · 踢馆调参");
  });

  it("after demo done, still offers both entries", () => {
    markBreakDemoDone();
    const html = renderGauntletHome("");
    expect(html).toContain("再学新手关");
    expect(html).toContain("start-training-hall");
    expect(html).toContain("start-gauntlet");
  });

  it("客栈遭遇有路遇正文，不是只贴稳肥险", () => {
    const run = createGauntletRun("bandit", "saber");
    const html = renderGauntletEvent(run, "inn", rollEventChoices(run, "inn", () => 0));
    expect(html).toContain("gauntlet-event-lead");
    expect(html).toMatch(/掌柜|老周/);
    expect(html).not.toContain(">肥<");
    expect(html).toContain("gauntlet-event-fx");
    expect(html).toMatch(/彩金 \+|绕道|暗桩|营地多抽/);
  });

  it("选线文案是同道 3/7", () => {
    const html = renderGauntletPathPick();
    expect(html).toContain("同道 3/7");
    expect(html).toContain("少林寺");
    expect(html).toContain("朝廷暗线");
    expect(html).toContain("gauntlet-path-pick");
    expect(html).not.toContain("同道 4/7");
  });

  it("营地 / 赌馆两页", () => {
    const run = { ...createGauntletRun("bandit", "saber"), stage: 2, streak: 1 };
    const camp = renderGauntletRewardPick(run, []);
    expect(camp).toContain("歇脚");
    expect(camp).toContain("选完免费奖励后再点继续");
    const wager = renderGauntletWager(run, wagerOffers(run, () => 0), null, null);
    expect(wager).toContain("赌馆");
    expect(wager).toContain("赌馆 · 2 / 2");
  });
});
