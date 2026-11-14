import { describe, expect, it } from "vitest";
import { createGauntletRun } from "./gauntlet";
import {
  FOE_STANCE_SHIFT_LINES,
  FOE_VARIANT_RUMORS,
  REMATCH_OPEN_LINES,
  foeStanceShiftLine,
  foeVariantRumor,
  latestFoeWindowLine,
  offerStory2Page,
  storyEventLead,
} from "./storyBeats";

describe("活对手文案", () => {
  it("换势键：龟、游走各一句，其余走 fallback，不写他急了", () => {
    const blob = Object.values(FOE_STANCE_SHIFT_LINES).join("");
    expect(blob).not.toContain("他急了");
    expect(FOE_STANCE_SHIFT_LINES["foeStanceShift:turtle"]).toMatch(/守势/);
    expect(FOE_STANCE_SHIFT_LINES["foeStanceShift:turtle"]).toMatch(/进势/);
    expect(FOE_STANCE_SHIFT_LINES["foeStanceShift:turtle"]).toMatch(/X/);
    expect(FOE_STANCE_SHIFT_LINES["foeStanceShift:skirmish"]).toMatch(/进势/);
    expect(FOE_STANCE_SHIFT_LINES["foeStanceShift:skirmish"]).toMatch(/\?/);
    expect(foeStanceShiftLine("foeStanceShift:wander")).toBe(FOE_STANCE_SHIFT_LINES["foeStanceShift:skirmish"]);
    expect(foeStanceShiftLine("foeStanceShift")).toBe(FOE_STANCE_SHIFT_LINES.foeStanceShift);
    expect(foeStanceShiftLine("foeStanceShift:coach")).toBe(FOE_STANCE_SHIFT_LINES.foeStanceShift);
    expect(latestFoeWindowLine(["摸 2 张", "foeStanceShift:turtle"])).toContain("守势");
  });

  it("一敌多谱的风声不带数字", () => {
    for (const key of ["foeVariant:brute", "foeVariant:turtle", "foeVariant:skirmish"] as const) {
      const line = FOE_VARIANT_RUMORS[key];
      expect(line.startsWith("听说他这局")).toBe(true);
      expect(line).not.toMatch(/[0-9X?％%]/);
      expect(foeVariantRumor(key)).toBe(line);
    }
    expect(foeVariantRumor("foeVariant:wander")).toBe(FOE_VARIANT_RUMORS["foeVariant:skirmish"]);
  });

  it("重打开场差分挂在 s2-revive-rematch", () => {
    expect(REMATCH_OPEN_LINES["s2-revive-rematch:elite"]).toMatch(/认出/);
    expect(REMATCH_OPEN_LINES["s2-revive-rematch:elite"]).toMatch(/\?/);
    expect(REMATCH_OPEN_LINES["s2-revive-rematch:seat"]).toMatch(/记得/);
    expect(REMATCH_OPEN_LINES["s2-revive-rematch:seat"]).toMatch(/X/);
    const run = offerStory2Page(createGauntletRun("bandit", "saber"), "s2-revive-rematch");
    expect(storyEventLead(run)).not.toContain("袖口还留着");
    const elite = storyEventLead({ ...run, storyFlags: [...(run.storyFlags ?? []), "rematch-elite"] });
    expect(elite.startsWith(REMATCH_OPEN_LINES["s2-revive-rematch:elite"])).toBe(true);
    const seat = storyEventLead({ ...run, storyFlags: [...(run.storyFlags ?? []), "rematch-seat"] });
    expect(seat.startsWith(REMATCH_OPEN_LINES["s2-revive-rematch:seat"])).toBe(true);
  });
});
