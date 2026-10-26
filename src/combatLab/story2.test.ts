import { describe, expect, it } from "vitest";
import { createGauntletRun } from "./gauntlet";
import { readEnvTag } from "./gauntletPaths";
import {
  STORY2_PAGES,
  applyStoryChoice,
  offerStory2Page,
  rollStoryChoices,
  storyEventLead,
} from "./storyBeats";

const MATES = [
  "watch",
  "baimenghe",
  "wenrensheng",
  "huochangchuan",
  "shiwanshan",
  "moqiwan",
  "lvchifeng",
  "zhounuanxiang",
  "boqing",
  "ananhuo",
  "zhangshoushan",
  "chenchenlan",
  "lishuangxing",
  "fubishan",
  "duguposui",
  "gongsunsizhang",
  "fengtang",
  "ouyangyingou",
] as const;

function sentences(s: string): string[] {
  return s
    .replace(/\*\*/g, "")
    .split("。")
    .map((x) => x.trim())
    .filter(Boolean);
}

describe("叙事 2.1", () => {
  it("18 人各有遇人与同路后，正文不标伙伴", () => {
    for (const id of MATES) {
      const meet = STORY2_PAGES.find((p) => p.id === `s2-${id}-meet`);
      const road = STORY2_PAGES.find((p) => p.id === `s2-${id}-road`);
      expect(meet?.pack, id).toBe("meet");
      expect(road?.pack, id).toBe("road");
      expect(meet?.mateId).toBe(id);
      expect(road?.mateId).toBe(id);
      const blob = `${meet?.lead}${road?.lead}${meet?.choices.map((c) => c.blurb).join("")}`;
      expect(blob, id).not.toMatch(/伙伴|路人|入伙/);
    }
    expect(STORY2_PAGES.filter((p) => p.pack === "meet")).toHaveLength(18);
    expect(STORY2_PAGES.filter((p) => p.pack === "road")).toHaveLength(18);
  });

  it("赌馆 4、黑市 3、复活 2、分叉 3，句长与占位", () => {
    expect(STORY2_PAGES.filter((p) => p.pack === "wager")).toHaveLength(4);
    expect(STORY2_PAGES.filter((p) => p.pack === "market")).toHaveLength(3);
    expect(STORY2_PAGES.filter((p) => p.pack === "revive")).toHaveLength(2);
    expect(STORY2_PAGES.filter((p) => p.pack === "fork")).toHaveLength(3);
    for (const page of STORY2_PAGES) {
      const lead = sentences(page.lead);
      expect(lead.length, page.id).toBeGreaterThanOrEqual(6);
      expect(lead.length, page.id).toBeLessThanOrEqual(10);
      expect(lead.filter((s) => s.length < 12), page.id).toEqual([]);
      expect(page.choices.length, page.id).toBeGreaterThanOrEqual(2);
      expect(page.choices.length, page.id).toBeLessThanOrEqual(3);
      for (const c of page.choices) {
        expect(c.blurb, c.id).toMatch(/[X?]|80%|彩金不动|禁注|黑市关着|下场照旧/);
        expect(c.blurb, c.id).not.toMatch(/伙伴/);
      }
    }
  });

  it("遇人留下才进同路后；不选则整页不出现", () => {
    const run = offerStory2Page(createGauntletRun("bandit", "saber"), "s2-watch-meet");
    expect(storyEventLead(run)).toContain("沈夜行");
    expect(rollStoryChoices(run).some((c) => c.openWager)).toBe(false);
    const stay = rollStoryChoices(run).find((c) => c.id === "s2-watch-stay")!;
    const next = applyStoryChoice(run, stay);
    expect(storyEventLead(next)).toContain("墙缝");
    expect(next.storyPending).toBe("choice");
  });

  it("三条分叉至少让人、敌、赌馆、黑市里的两样不同", () => {
    for (const id of ["s2-fork-burn", "s2-fork-wall", "s2-fork-gap"]) {
      const page = STORY2_PAGES.find((p) => p.id === id)!;
      const flags = page.choices.map((c) =>
        [c.openWager ? "wager" : "", c.openMarket ? "market" : "", c.skipMarket ? "no-market" : "", c.blurb.includes("多 X") ? "enemy" : ""].join(""),
      );
      expect(new Set(flags).size, id).toBe(3);
    }
    const run = offerStory2Page(createGauntletRun("bandit", "palm"), "s2-fork-burn");
    const wager = rollStoryChoices(run).find((c) => c.id === "s2-fork-burn-wager")!;
    const after = applyStoryChoice(run, wager);
    expect(after.pendingOpenWager).toBe(true);
    expect(readEnvTag(after.storyFlags)).toBe("burn");
    const shed = applyStoryChoice(
      run,
      rollStoryChoices(run).find((c) => c.id === "s2-fork-burn-shed")!,
    );
    expect(shed.pendingOpenWager).toBeFalsy();
    expect(storyEventLead(shed)).toContain("周暖香");
    const wall = offerStory2Page(createGauntletRun("bandit", "hook"), "s2-fork-wall");
    const cut = applyStoryChoice(wall, rollStoryChoices(wall).find((c) => c.id === "s2-fork-wall-cut")!);
    expect(readEnvTag(cut.storyFlags)).toBeUndefined();
    expect(cut.pendingSkipMarket).toBe(true);
  });
});
