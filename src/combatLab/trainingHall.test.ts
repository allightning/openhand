import { describe, expect, it } from "vitest";
import {
  HALL_COURSES,
  createHallRun,
  hallAllowsCard,
  hallAllowsEndTurn,
  hallCourse,
  hallIsGuided,
  hallCoursesIn,
  hallQiFight,
  hallUsesQiCommit,
} from "./trainingHall";
import { renderTrainingHallCatalog } from "./trainingHallUi";

describe("training hall", () => {
  it("has break and weapon cabinets, each course is two bouts", () => {
    expect(hallCoursesIn("break").length).toBeGreaterThanOrEqual(7);
    expect(hallCoursesIn("weapon").length).toBeGreaterThanOrEqual(6);
    expect(hallCoursesIn("camp").length).toBe(3);
    expect(HALL_COURSES.every((c) => c.title && c.drillCoach)).toBe(true);
    expect(hallCourse("chase")?.title).toMatch(/过/);
    expect(hallCourse("hard")?.qiStage).toBe("R1");
    expect(hallUsesQiCommit("hard")).toBe(true);
    expect(hallUsesQiCommit("saber")).toBe(false);
  });

  it("guide bout locks cards; drill bout does not", () => {
    const guide = createHallRun("hard", 1);
    expect(hallIsGuided(guide)).toBe(true);
    expect(hallAllowsCard(guide, "break_point")).toBe(true);
    expect(hallAllowsCard(guide, "cut")).toBe(false);
    expect(hallAllowsEndTurn(guide)).toBe(true);

    const drill = createHallRun("hard", 2);
    expect(hallIsGuided(drill)).toBe(false);
    expect(hallAllowsCard(drill, "break_press")).toBe(true);
    expect(hallAllowsEndTurn(drill)).toBe(true);
  });

  it("guide 拆·点 only deals the stage hand", () => {
    const run = createHallRun("hard", 1);
    const f = hallQiFight(run);
    expect(f.hand.map((c) => c.defId)).toEqual(["break_point", "brace"]);
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
    expect(html).toContain("自我修行");
  });

  it("weapon cabinet focuses the requested course", () => {
    const html = renderTrainingHallCatalog("weapon", "saber");
    expect(html).toContain("兵器柜");
    expect(html).toContain("data-hall-start=\"saber\"");
    expect(html).toContain('class="hall-rail-item active" data-hall-focus="saber"');
  });

  it("drill 自我修行 draws from the starter deck", () => {
    const run = createHallRun("hard", 2);
    const f = hallQiFight(run);
    expect(f.hand.length).toBe(4);
    expect(f.lockedHand).toBeNull();
  });
});
