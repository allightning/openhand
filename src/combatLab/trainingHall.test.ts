import { describe, expect, it } from "vitest";
import { startLabBattle } from "./factory";
import { setLabMode, setLabTuning } from "../game/labTuning";
import { setLabRuleset } from "./labRuleset";
import {
  HALL_COURSES,
  applyHallBattle,
  buildHallPreset,
  createHallRun,
  hallAllowsCard,
  hallAllowsEndTurn,
  hallCourse,
  hallIsGuided,
  hallCoursesIn,
} from "./trainingHall";
import { renderTrainingHallCatalog } from "./trainingHallUi";

describe("training hall", () => {
  it("has break and weapon cabinets, each course is two bouts", () => {
    expect(hallCoursesIn("break").length).toBeGreaterThanOrEqual(7);
    expect(hallCoursesIn("weapon").length).toBeGreaterThanOrEqual(6);
    expect(hallCoursesIn("camp").length).toBe(3);
    expect(HALL_COURSES.every((c) => c.title && c.drillCoach)).toBe(true);
    expect(hallCourse("chase")?.title).toMatch(/追/);
    expect(hallCourse("chase")?.intents?.some((i) => i.kind === "retreat")).toBe(true);
  });

  it("guide bout locks cards; drill bout does not", () => {
    const guide = createHallRun("hard", 1);
    expect(hallIsGuided(guide)).toBe(true);
    expect(hallAllowsCard(guide, "retreat")).toBe(true);
    expect(hallAllowsCard(guide, "cut")).toBe(false);
    // 收势常亮：引导局任何一步都能主动结束回合
    expect(hallAllowsEndTurn(guide)).toBe(true);

    const drill = createHallRun("hard", 2);
    expect(hallIsGuided(drill)).toBe(false);
    expect(hallAllowsCard(drill, "cut")).toBe(true);
    expect(hallAllowsCard(drill, "retreat")).toBe(true);
    expect(hallAllowsEndTurn(drill)).toBe(true);
  });

  it("guide hard-break deals only the scripted retreat", () => {
    setLabRuleset("break");
    setLabMode(true);
    setLabTuning({ rulesV2: true, v2Fx: true });
    const run = createHallRun("hard", 1);
    const b = applyHallBattle(startLabBattle(buildHallPreset(run), true, 1), run);
    expect(b.hand.map((c) => c.defId)).toEqual(["retreat"]);
  });

  it("catalog pins back home, cabinet tabs, and a focused lesson", () => {
    const html = renderTrainingHallCatalog("break", "hard");
    expect(html).toContain("id=\"hall-back-home\"");
    expect(html).toContain("hall-chrome");
    expect(html).toContain("data-hall-cab=\"break\"");
    expect(html).toContain("data-hall-cab=\"weapon\"");
    expect(html).toContain("data-hall-cab=\"camp\"");
    expect(html).toContain("data-hall-focus=\"hard\"");
    expect(html).toContain("data-hall-start=\"hard\"");
    expect(html).toContain("hall-rail");
    expect(html).toContain("hall-detail");
  });

  it("weapon cabinet focuses the requested course", () => {
    const html = renderTrainingHallCatalog("weapon", "saber");
    expect(html).toContain("兵器柜");
    expect(html).toContain("data-hall-start=\"saber\"");
    expect(html).toContain('class="hall-rail-item active" data-hall-focus="saber"');
  });

  it("drill keeps a real hand, not a one-card script", () => {
    setLabRuleset("break");
    setLabMode(true);
    setLabTuning({ rulesV2: true, v2Fx: true });
    const run = createHallRun("hard", 2);
    const b = applyHallBattle(startLabBattle(buildHallPreset(run), true, 1), run);
    expect(b.hand.length).toBeGreaterThan(1);
  });
});
