import { describe, expect, it } from "vitest";
import { routeEntryWithEnv, renderRouteBook } from "./climbPlaces";
import { ENV_TAG_APPEAR, ENV_TAG_LABEL, ladderEnvTag, readEnvTag } from "./gauntletPaths";
import { createGauntletRun } from "./gauntlet";
import {
  ENV_DEATH,
  ENV_FLASH,
  ENV_PAGES,
  ENV_STANCE,
  applyStoryChoice,
  offerEnvPage,
  rollStoryChoices,
  storyEventLead,
} from "./storyBeats";

function sentences(s: string): string[] {
  return s
    .replace(/\*\*/g, "")
    .split("。")
    .map((x) => x.trim())
    .filter(Boolean);
}

describe("环境词条事页", () => {
  it("九条：灼烧 3、无墙 3、缺格末端 2、缺格中间 1", () => {
    expect(ENV_PAGES).toHaveLength(9);
    expect(ENV_PAGES.filter((p) => p.tag === "burn")).toHaveLength(3);
    expect(ENV_PAGES.filter((p) => p.tag === "nowall")).toHaveLength(3);
    expect(ENV_PAGES.filter((p) => p.tag === "gap_end")).toHaveLength(2);
    expect(ENV_PAGES.filter((p) => p.tag === "gap_mid")).toHaveLength(1);
    expect(ENV_TAG_APPEAR).toBe("?");
    expect(ladderEnvTag("bandit", 1)).toBeUndefined();
  });

  it("每条 6 到 10 句，两到三个选项，数值是 X 或问号，不开赌馆", () => {
    for (const page of ENV_PAGES) {
      const lead = sentences(page.lead);
      expect(lead.length, page.id).toBeGreaterThanOrEqual(6);
      expect(lead.length, page.id).toBeLessThanOrEqual(10);
      expect(lead.filter((s) => s.length < 16), page.id).toEqual([]);
      expect(page.choices.length).toBeGreaterThanOrEqual(2);
      expect(page.choices.length).toBeLessThanOrEqual(3);
      for (const c of page.choices) {
        expect(c.blurb, c.id).toMatch(/[X?]/);
        expect(c.openWager, c.id).toBeUndefined();
        expect(c.stall, c.id).toBeUndefined();
        expect(c.blurb, c.id).not.toMatch(/伙伴/);
      }
    }
  });

  it("死亡评论、闪句、站位钩子成套", () => {
    for (const tag of ["burn", "nowall", "gap_end", "gap_mid"] as const) {
      expect(sentences(ENV_DEATH[tag]).length).toBeGreaterThanOrEqual(4);
      expect(ENV_DEATH[tag]).toMatch(/X/);
      expect(ENV_FLASH[tag]).toHaveLength(2);
      for (const line of ENV_FLASH[tag]) expect(line).toMatch(/X/);
    }
    expect(ENV_STANCE).toHaveLength(3);
    expect(ENV_STANCE.map((s) => s.id).join(" ")).not.toMatch(/\d+格/);
  });

  it("选项才打开下一页，并把词条名带到备注；离开则下一场不带", () => {
    const run = offerEnvPage(createGauntletRun("bandit", "saber"), "env-burn-1");
    expect(storyEventLead(run)).toContain("冒烟");
    const step = rollStoryChoices(run).find((c) => c.id === "env-burn-step")!;
    const next = applyStoryChoice(run, step);
    expect(readEnvTag(next.storyFlags)).toBe("burn");
    expect(next.lastEncounterNote).toContain(ENV_TAG_LABEL.burn);
    expect(rollStoryChoices(next).some((c) => c.id === "env-burn-kick")).toBe(true);
    const leave = applyStoryChoice(next, rollStoryChoices(next).find((c) => c.id === "env-burn-let")!);
    expect(readEnvTag(leave.storyFlags)).toBeUndefined();
    expect(leave.storyPending).toBe("rest");
  });

  it("路程小本写出词条名，不重复两遍", () => {
    const entry = routeEntryWithEnv(
      { stage: 3, placeId: "jh-liangshan", placeName: "梁山泊", rest: "茶棚", note: "踩上那一格" },
      "burn",
    );
    const html = renderRouteBook([entry], "江湖");
    expect(html).toContain("灼烧格");
    expect(html.split("灼烧格").length).toBe(2);
  });
});
