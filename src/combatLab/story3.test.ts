import { describe, expect, it } from "vitest";
import { climbPlace, storyNodesAt } from "./climbPlaces";
import { createGauntletRun } from "./gauntlet";
import {
  BOND_STAGE_LINES,
  INTEL_SAMPLES,
  STORY2_PAGES,
  STORY3_PAGES,
  applyStoryChoice,
  offerStory3Page,
  queuePostCampBeat,
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

describe("叙事 3", () => {
  it("情报获取 8 条，内容范例各 2", () => {
    expect(STORY3_PAGES.filter((p) => p.id.startsWith("s3-tea-"))).toHaveLength(3);
    expect(STORY3_PAGES.filter((p) => p.id.startsWith("s3-slip-"))).toHaveLength(3);
    expect(STORY3_PAGES.filter((p) => p.id.startsWith("s3-fatal-"))).toHaveLength(2);
    for (const kind of ["feint", "rage", "coach"] as const) {
      expect(INTEL_SAMPLES.filter((s) => s.kind === kind)).toHaveLength(2);
    }
  });

  it("缘分 8 对、群像 6、旧怨 2，进阶提示三句", () => {
    expect(STORY3_PAGES.filter((p) => p.pack === "bond")).toHaveLength(8);
    expect(STORY3_PAGES.filter((p) => p.pack === "group")).toHaveLength(6);
    expect(STORY3_PAGES.filter((p) => p.pack === "grudge")).toHaveLength(2);
    expect(BOND_STAGE_LINES.meet.length).toBeGreaterThan(16);
    expect(BOND_STAGE_LINES.road).toMatch(/\?/);
    expect(BOND_STAGE_LINES.life.length).toBeGreaterThan(16);
  });

  it("职业不明说，进阶页在留下之后", () => {
    const job = STORY3_PAGES.filter((p) => p.pack === "job").map((p) => `${p.title}${p.lead}`);
    expect(job.join("")).not.toMatch(/桩师|相士|赌徒|刺客/);
    const run = offerStory3Page(createGauntletRun("bandit", "staff"), "s3-stake-a");
    const stay = rollStoryChoices(run).find((c) => c.id === "s3-stake-stay")!;
    const next = applyStoryChoice(run, stay);
    expect(storyEventLead(next)).toContain("裂");
    expect(next.storyPending).toBe("choice");
  });

  it("开局翻牌两版不进赌馆，第三程可以拒绝", () => {
    for (const id of ["s3-open-a", "s3-open-b", "s3-open-name"]) {
      const page = STORY3_PAGES.find((p) => p.id === id)!;
      expect(page.choices.some((c) => c.openWager)).toBe(false);
    }
    const gate = STORY3_PAGES.find((p) => p.id === "s3-open-job")!;
    expect(gate.choices).toHaveLength(4);
    expect(gate.choices.some((c) => c.id === "s3-open-job-no" && c.blurb.includes("?"))).toBe(true);
  });

  it("与已有 48 条 id 不撞，事页句长过关", () => {
    const oldIds = new Set(STORY2_PAGES.map((p) => p.id));
    expect(STORY2_PAGES).toHaveLength(48);
    expect(STORY3_PAGES.length).toBeGreaterThanOrEqual(39);
    for (const page of STORY3_PAGES) {
      expect(oldIds.has(page.id), page.id).toBe(false);
      const lead = sentences(page.lead);
      expect(lead.length, page.id).toBeGreaterThanOrEqual(6);
      expect(lead.length, page.id).toBeLessThanOrEqual(10);
      expect(lead.filter((s) => s.length < 12), page.id).toEqual([]);
      const max = page.id === "s3-open-job" ? 4 : 3;
      expect(page.choices.length, page.id).toBeGreaterThanOrEqual(2);
      expect(page.choices.length, page.id).toBeLessThanOrEqual(max);
      expect(`${page.lead}${page.choices.map((c) => c.blurb).join("")}`, page.id).not.toMatch(/伙伴|路人/);
    }
  });

  it("风声底细命门、八对、两怨、第三程职业挂在落脚上，第一程不开赌馆", () => {
    const wired = [2, 3, 4, 5, 6, 7, 8, 9].flatMap((stage) => [...storyNodesAt(stage)]);
    expect(storyNodesAt(1)).toEqual([]);
    expect(storyNodesAt(10)).toEqual([]);
    expect(wired).toHaveLength(19);
    expect(new Set(wired).size).toBe(19);
    for (const id of wired) expect(STORY3_PAGES.some((p) => p.id === id), id).toBe(true);
    for (const path of ["bandit", "shaolin", "court"] as const) {
      expect(climbPlace(path, 1).storyNodes).toBeUndefined();
      expect(climbPlace(path, 3).storyNodes).toEqual(["s3-open-job"]);
    }

    const fresh = { ...createGauntletRun("bandit", "saber"), storyPending: "rest" as const };
    const stage1 = queuePostCampBeat({ ...fresh, stage: 1 }, 1, () => 0);
    expect(stage1.storyFlags?.some((f) => f.startsWith("s3page:")) ?? false).toBe(false);
    expect(stage1.pendingOpenWager).toBeFalsy();

    const tea = queuePostCampBeat({ ...fresh, stage: 2 }, 1, () => 0);
    expect(tea.storyFlags).toContain("s3page:s3-tea-bowl");
    expect(tea.storyPending).toBe("choice");
    expect(rollStoryChoices(tea).some((c) => c.openWager)).toBe(false);
    const heard = applyStoryChoice(tea, rollStoryChoices(tea)[0]!, () => 0);
    expect(heard.pendingOpenWager).toBeFalsy();
    expect(heard.storyFlags?.some((f) => f.startsWith("s3page:"))).toBe(false);

    const job = queuePostCampBeat({ ...fresh, stage: 3 }, 2, () => 0);
    expect(job.storyFlags).toContain("s3page:s3-open-job");
    expect(rollStoryChoices(job).some((c) => c.id === "s3-open-job-no")).toBe(true);
    expect(job.pendingOpenWager).toBeFalsy();

    const again = queuePostCampBeat({ ...tea, storyPending: "rest" }, 1, () => 0);
    expect(again.storyFlags?.includes("s3page:s3-tea-bowl") ?? false).toBe(false);

    const fatal = queuePostCampBeat({ ...fresh, stage: 9 }, 8, () => 0.5);
    expect(fatal.storyFlags).toContain("s3page:s3-fatal-win");
    expect(fatal.pendingOpenWager).toBeFalsy();
    const push = rollStoryChoices(fatal).find((c) => c.id === "s3-fatal-again")!;
    const wager = applyStoryChoice(fatal, push, () => 0);
    expect(wager.stage).toBe(9);
    expect(wager.pendingOpenWager).toBe(true);
  });

  it("旧怨两个选项都伤人，医杀可以两边都留", () => {
    const heal = STORY3_PAGES.find((p) => p.id === "s3-grudge-heal")!;
    expect(heal.choices).toHaveLength(3);
    expect(heal.choices.every((c) => c.blurb.includes("?"))).toBe(true);
    const sword = STORY3_PAGES.find((p) => p.id === "s3-grudge-sword")!;
    expect(sword.choices.some((c) => c.sideSkirmish)).toBe(true);
  });
});
