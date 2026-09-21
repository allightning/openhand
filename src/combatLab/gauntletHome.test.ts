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

  it("门厅以爬塔为主，读招轨手测打开", () => {
    const html = renderGauntletHome("");
    expect(html).toContain("gauntlet-home-compose");
    expect(html).toContain("gauntlet-home-mode-kick");
    expect(html).toContain("行路");
    expect(html).toContain("start-gauntlet");
    expect(html).toContain("start-gauntlet-endless");
    expect(html).toContain("start-break-campaign");
    expect(html).toContain("start-break-demo");
    expect(html).toContain("start-training-hall");
    expect(html).toContain("gauntlet-home-read-rail");
    expect(html).toContain("登门");
    expect(html).toContain("训练馆");
    expect(html).toContain("gauntlet-home-title");
    expect(html).not.toContain("gauntlet-best-card");
  });

  it("break mode 仍保留开程与无尽；登门轨手测打开", () => {
    const html = renderGauntletHome("");
    expect(html).toContain("start-break-demo");
    expect(html).toContain("start-rookie-demo");
    expect(html).toContain("start-training-hall");
    expect(html).toContain("start-gauntlet");
    expect(html).toContain("start-gauntlet-endless");
    expect(html).toContain("无尽");
    expect(html).toContain("开程");
    expect(html).toContain("明手：七步石台");
    expect(html).toContain("hall-gate-kick");
    expect(html).toContain("gauntlet-home-continue");
    expect(html).toContain("gauntlet-home-endless");
    expect(html).toMatch(/id="hall-continue"[^>]*disabled/);
    expect(html).not.toContain("gauntlet-dev-details");
    expect(html).not.toContain("实验台 · 踢馆调参");
  });

  it("after demo done, 读招轨仍在，开踢仍在", () => {
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
    expect(html).not.toContain("gauntlet-event-fx");
    expect(html).toContain("gauntlet-hint");
    expect(html).toMatch(/彩金 \+8|营地免费奖励多抽 1|多 1 名替补|下两馆人名/);
  });

  it("同道遭遇三人立绘不共用占位图", () => {
    setLabRuleset("climb");
    const run = { ...createGauntletRun("shaolin", "saber"), stage: 5 }; // 过第 4 馆后进里程碑
    const html = renderGauntletEvent(run, "companion", rollEventChoices(run, "companion", () => 0));
    expect(html).not.toContain("twinpalm");
    const srcs = [...html.matchAll(/src="([^"]+)"/g)].map((m) => m[1]);
    expect(srcs.length).toBeGreaterThanOrEqual(3);
    expect(new Set(srcs).size).toBe(srcs.length);
  });

  it("续关与开踢分行；无档续关灰色，有档开踢改重新开局", () => {
    const none = renderGauntletHome("");
    expect(none).toMatch(/id="hall-continue"[^>]*disabled/);
    expect(none).toContain("开程");
    expect(none).not.toContain("重新开局");
    const has = renderGauntletHome("", { replayLeft: 2, stage: 4, pot: 65 });
    expect(has).toContain("续关");
    expect(has).toContain("第 4 馆");
    expect(has).toContain("余 2");
    expect(has).toContain("重新开局");
    expect(has).not.toMatch(/id="hall-continue"[^>]*disabled/);
    expect(has.indexOf("hall-continue")).toBeLessThan(has.indexOf("start-gauntlet"));
  });

  it("选线文案是同道 4/7；无尽选线不走剧情歇脚", () => {
    const html = renderGauntletPathPick();
    expect(html).toContain("同道 4/7");
    expect(html).toContain("少林寺");
    expect(html).toContain("朝廷暗线");
    expect(html).toContain("gauntlet-path-pick");
    expect(html).not.toContain("同道 3/7");
    const tower = renderGauntletPathPick(true);
    expect(tower).toContain("行路打榜");
    expect(tower).toContain("不进城殿");
    expect(tower).not.toContain("同道 4/7");
  });

  it("营地 / 赌馆两页", () => {
    const run = { ...createGauntletRun("bandit", "saber"), stage: 2, streak: 1 };
    const camp = renderGauntletRewardPick(run, []);
    expect(camp).toContain("歇脚");
    expect(camp).toContain("选完免费奖励后再点继续");
    const wager = renderGauntletWager(run, wagerOffers(run, () => 0), null, null);
    expect(wager).toContain("赌馆");
    expect(wager).toContain("曹州");
    expect(wager).toContain("gauntlet-wager-dock");
    expect(wager).toContain("先选盘口再落注额");
  });
});
