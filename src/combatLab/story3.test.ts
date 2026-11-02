import { describe, expect, it } from "vitest";
import { createGauntletRun } from "./gauntlet";
import {
  BOND_STAGE_LINES,
  INTEL_SAMPLES,
  STORY2_PAGES,
  STORY3_PAGES,
  applyStoryChoice,
  offerStory3Page,
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

  it("旧怨两个选项都伤人，医杀可以两边都留", () => {
    const heal = STORY3_PAGES.find((p) => p.id === "s3-grudge-heal")!;
    expect(heal.choices).toHaveLength(3);
    expect(heal.choices.every((c) => c.blurb.includes("?"))).toBe(true);
    const sword = STORY3_PAGES.find((p) => p.id === "s3-grudge-sword")!;
    expect(sword.choices.some((c) => c.sideSkirmish)).toBe(true);
  });
});
