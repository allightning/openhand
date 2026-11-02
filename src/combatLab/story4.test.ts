import { describe, expect, it } from "vitest";
import type { Battle } from "../game/types";
import { buildGauntletPreset, createGauntletRun } from "./gauntlet";
import { startLabBattle } from "./factory";
import { setLabMode } from "./labTuning";
import { setLabRuleset } from "./labRuleset";
import { renderProdBattle } from "./prodBattleUi";
import type { GuashowFields } from "./render/guashowHud";
import {
  CARD_INTENT_LINES,
  FOE_WINDOW_LINES,
  STORY3_PAGES,
  cardIntentLine,
  latestFoeWindowLine,
} from "./storyBeats";

describe("播报文案", () => {
  it("敌窗三把占位键各一句，带数字占位", () => {
    expect(FOE_WINDOW_LINES.敌拆招).toMatch(/减半/);
    expect(FOE_WINDOW_LINES.敌拆招).toMatch(/X/);
    expect(FOE_WINDOW_LINES.敌缠手).toMatch(/作废/);
    expect(FOE_WINDOW_LINES.敌缠手).toMatch(/\?/);
    expect(FOE_WINDOW_LINES.敌读破).toMatch(/三成/);
    expect(FOE_WINDOW_LINES.敌读破).toMatch(/\?/);
    expect(latestFoeWindowLine(["普通一刀", "敌缠手", "伤 4"])).toBe(FOE_WINDOW_LINES.敌缠手);
    expect(latestFoeWindowLine(["摸 2 张"])).toBe("");
  });

  it("七系 4 档和 7 档各一句，10 档不另写", () => {
    for (const school of ["palm", "saber", "sword", "spear", "staff", "hook", "dart"]) {
      const row = CARD_INTENT_LINES[school]!;
      expect(row.four.length).toBeGreaterThan(12);
      expect(row.seven.length).toBeGreaterThan(12);
      expect(row.four + row.seven).toMatch(/[X?]/);
      expect(cardIntentLine(school, 4)).toBe(row.four);
      expect(cardIntentLine(school, 7)).toBe(row.seven);
      expect(cardIntentLine(school, 10)).toBe(row.seven);
      expect(cardIntentLine(school, 3)).toBe("");
    }
  });

  it("三门进阶页用收束句说明裂开、说在前面、换底", () => {
    const stake = STORY3_PAGES.find((p) => p.id === "s3-stake-advance")!;
    const read = STORY3_PAGES.find((p) => p.id === "s3-read-advance")!;
    const dice = STORY3_PAGES.find((p) => p.id === "s3-dice-advance")!;
    expect(stake.lead).toMatch(/木裂开的那一下/);
    expect(stake.lead).toMatch(/X/);
    expect(read.lead).toMatch(/说在刀的前面/);
    expect(read.lead).toMatch(/\?/);
    expect(dice.lead).toMatch(/盅底换过去/);
    expect(dice.lead).toMatch(/\?/);
    expect(`${stake.lead}${read.lead}${dice.lead}`).not.toMatch(/桩师|相士|赌徒|刺客/);
  });

  it("战斗页把占位键和达档句画出来", () => {
    setLabRuleset("climb");
    setLabMode(true);
    const b = startLabBattle(buildGauntletPreset(createGauntletRun("bandit", "saber")), true, 1) as Battle &
      GuashowFields;
    b.log = [...b.log, "敌拆招"];
    const html = renderProdBattle({
      b,
      prev: null,
      hoverUid: null,
      hoverIntentIdx: null,
      weaponId: "saber-a-3",
      canPlay: () => ({ ok: true }),
      actionRowHtml: "",
      entranceNote: "",
      freshNote: "",
      phaseBanner: "",
      fxClass: "",
      pauseOverlay: "",
      toolbarExtra: "",
      weaponSheetHtml: "",
      gauntletStage: 1,
      foeResolving: false,
    });
    expect(html).toContain(FOE_WINDOW_LINES.敌拆招);
    const saber = CARD_INTENT_LINES.saber!;
    expect(html.includes(saber.four) || html.includes(saber.seven)).toBe(true);
  });
});
