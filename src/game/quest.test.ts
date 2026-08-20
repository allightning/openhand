import { describe, expect, it } from "vitest";
import { questLog } from "./quest";
import { addCompanion } from "./party";
import { addFlag, makeRun } from "./run";

describe("quest log", () => {
  it("starts by asking you to step outside", () => {
    expect(questLog(makeRun("empty")).main).toBe("门外有人");
    expect(questLog(makeRun("empty")).sides).toEqual([]);
  });

  it("opens the main line after the first boss", () => {
    const run = addFlag(makeRun("empty"), "mainOpen");
    expect(questLog(run).main).toBe("西仓取印");
  });

  it("moves the main line after the brand is taken", () => {
    const run = addFlag({ ...makeRun("empty"), items: ["brand"] }, "mainOpen");
    expect(questLog(run).main).toBe("天井烫印");
  });

  it("lists a side hunt only after you take it from someone", () => {
    expect(questLog(addFlag(makeRun("empty"), "metFisher")).sides).toEqual([]);
    expect(questLog(addFlag(makeRun("empty"), "sideWell")).sides.some((line) => line.includes("井"))).toBe(true);
  });

  it("asks for the hermit once the well is open", () => {
    let run = addFlag(addFlag(makeRun("empty"), "sideWell"), "wellOpen");
    expect(questLog(run).sides.some((line) => line.includes("潮窟"))).toBe(true);
    run = addCompanion(run, "hermit");
    expect(questLog(run).sides.some((line) => line.includes("潮窟"))).toBe(false);
  });

  it("opens a different first line for the other two names", () => {
    expect(questLog(makeRun("empty", "seer")).main).toBe("案下有手");
    expect(questLog(makeRun("empty", "sapper")).main).toBe("厂里那根桩");
  });
});
