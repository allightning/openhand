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

  it("门厅二分：踢馆主入口 + 读招战役可打，周挑战仍制作中", () => {
    const html = renderGauntletHome("");
    expect(html).toContain("gauntlet-home-compose");
    expect(html).toContain("gauntlet-home-mode-kick");
    expect(html).toContain("gauntlet-home-mode-read");
    expect(html).toContain("gauntlet-home-read-rail");
    expect(html).toContain("踢馆");
    expect(html).toContain("读招");
    expect(html).toContain("start-gauntlet");
    expect(html).toContain("start-gauntlet-endless");
    expect(html).toContain("start-break-campaign");
    expect(html).toContain("start-break-weekly");
    expect(html).toMatch(/即将开放/);
    expect(html).not.toMatch(/两种玩法/);
    expect(html).not.toContain("选线 · 构筑");
    expect(html).not.toContain("不破也能爬");
    expect(html).toContain("gauntlet-home-title");
    expect(html).not.toContain("gauntlet-best-card");
    expect(html).not.toContain("gauntlet-home-dual");
    expect(html).not.toMatch(/id="start-break-campaign"[^>]*disabled/);
    expect(html).toMatch(/id="start-break-weekly"[^>]*disabled/);
  });

  it("break mode shows separate newbie and formal start", () => {
    const html = renderGauntletHome("");
    expect(html).toContain("start-break-demo");
    expect(html).toContain("start-rookie-demo");
    expect(html).toContain("start-training-hall");
    expect(html).toContain("start-gauntlet");
    expect(html).toContain("start-gauntlet-endless");
    expect(html).toContain("无尽");
    expect(html).toContain("新手关");
    expect(html).toContain("训练馆");
    expect(html).toContain("开踢");
    expect(html).toContain("明手：七步石台");
    expect(html).toContain("hall-gate-kick");
    expect(html).toContain("gauntlet-home-continue");
    expect(html).toContain("gauntlet-home-endless");
    expect(html).toMatch(/id="hall-continue"[^>]*disabled/);
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
    expect(html).not.toContain("gauntlet-event-fx");
    expect(html).toContain("gauntlet-hint");
    expect(html).toMatch(/袋里多几文彩金|下一站酒楼多抽一张|下一馆多一名替补|换一份暗桩/);
  });

  it("同道遭遇三人立绘不共用占位图", () => {
    setLabRuleset("climb");
    const run = createGauntletRun("bandit", "saber");
    const html = renderGauntletEvent(run, "companion", rollEventChoices(run, "companion", () => 0));
    expect(html).not.toContain("twinpalm");
    const srcs = [...html.matchAll(/src="([^"]+)"/g)].map((m) => m[1]);
    expect(srcs.length).toBeGreaterThanOrEqual(3);
    expect(new Set(srcs).size).toBe(srcs.length);
  });

  it("续关与开踢分行；无档续关灰色，有档开踢改重新开局", () => {
    const none = renderGauntletHome("");
    expect(none).toMatch(/id="hall-continue"[^>]*disabled/);
    expect(none).toContain("开踢");
    expect(none).not.toContain("重新开局");
    const has = renderGauntletHome("", { replayLeft: 2, stage: 4, pot: 65 });
    expect(has).toContain("续关");
    expect(has).toContain("第 4 馆");
    expect(has).toContain("余 2");
    expect(has).toContain("重新开局");
    expect(has).not.toMatch(/id="hall-continue"[^>]*disabled/);
    expect(has.indexOf("hall-continue")).toBeLessThan(has.indexOf("start-gauntlet"));
  });

  it("选线文案是同道 3/7；无尽选线不走剧情歇脚", () => {
    const html = renderGauntletPathPick();
    expect(html).toContain("同道 3/7");
    expect(html).toContain("少林寺");
    expect(html).toContain("朝廷暗线");
    expect(html).toContain("gauntlet-path-pick");
    expect(html).not.toContain("同道 4/7");
    const tower = renderGauntletPathPick(true);
    expect(tower).toContain("爬塔打榜");
    expect(tower).toContain("不进城殿");
    expect(tower).not.toContain("同道 3/7");
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
