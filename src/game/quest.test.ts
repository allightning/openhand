import { describe, expect, it } from "vitest";
import { questLog } from "./quest";
import { addCompanion } from "./party";
import { addFlag, makeRun } from "./run";
import type { EnemyId } from "./types";

describe("quest log", () => {
  it("starts by asking you to step outside", () => {
    const log = questLog(makeRun("empty"));
    expect(log.main.title).toBe("门外有人");
    expect(log.main.guide.length).toBeGreaterThan(4);
  });

  it("opens rail侠 after the first boss, brand is only a side", () => {
    const run = addFlag(makeRun("empty"), "mainOpen");
    const log = questLog(run);
    expect(log.main.title).toBe("行侠港律");
    expect(log.sides.some((q) => q.title.includes("过帖") || q.title.includes("烫"))).toBe(true);
  });

  it("keeps brand off the main title when you only hold the iron", () => {
    const run = addFlag({ ...makeRun("empty"), items: ["brand"] }, "mainOpen");
    expect(questLog(run).main.title).not.toMatch(/烫印|取印/);
    expect(questLog(run).sides.some((q) => q.title.includes("烫"))).toBe(true);
  });

  it("lists a side hunt only after you take it from someone", () => {
    expect(questLog(addFlag(makeRun("empty"), "metFisher")).sides.filter((q) => q.title.includes("井"))).toEqual([]);
    expect(questLog(addFlag(makeRun("empty"), "sideWell")).sides.some((q) => q.title.includes("井"))).toBe(true);
  });

  it("asks for the hermit once the well is open", () => {
    let run = addFlag(addFlag(makeRun("empty"), "sideWell"), "wellOpen");
    expect(questLog(run).sides.some((q) => q.title.includes("潮窟"))).toBe(true);
    run = addCompanion(run, "hermit");
    expect(questLog(run).sides.some((q) => q.title.includes("潮窟"))).toBe(false);
  });

  it("lists the short escort while cargo is out", () => {
    expect(questLog(addFlag(makeRun("empty"), "escortJob")).sides.map((q) => q.title)).toContain("短镖·码头车夫");
    expect(
      questLog(addFlag(addFlag(makeRun("empty"), "escortJob"), "escortDone")).sides.map((q) => q.title),
    ).not.toContain("短镖·码头车夫");
  });

  it("lists yamen jobs with a place to go", () => {
    const salt = questLog(addFlag(makeRun("empty"), "yamenSalt")).sides.find((q) => q.title === "缉盐差");
    expect(salt?.guide).toMatch(/西仓/);
    const after = questLog({ ...addFlag(makeRun("empty"), "yamenSalt"), beaten: ["smuggler"] }).sides.find(
      (q) => q.title === "缉盐差",
    );
    expect(after?.guide).toMatch(/衙门/);
    expect(questLog(addFlag(makeRun("empty"), "yamenBandit")).sides.some((q) => q.title === "清匪帖")).toBe(true);
    expect(
      questLog(addFlag(addFlag(makeRun("empty"), "yamenBandit"), "yamenBanditDone")).sides.some((q) => q.title === "清匪帖"),
    ).toBe(false);
  });

  it("opens a different first line for the other two names", () => {
    expect(questLog(makeRun("empty", "seer")).main.title).toBe("案下有手");
    expect(questLog(makeRun("empty", "sapper")).main.title).toBe("厂里那根桩");
  });

  it("forks three heroes before the usurper camp", () => {
    expect(questLog(addFlag(addFlag(makeRun("empty"), "mainOpen"), "heardRebel")).main.title).toMatch(/朱雀航|临安|风声/);
    expect(
      questLog(addFlag(addFlag(addFlag(makeRun("empty"), "mainOpen"), "heardRebel"), "midDoorTrue")).main.title,
    ).toMatch(/临安|钱塘/);
    const seer = { ...addFlag(makeRun("empty", "seer"), "caseRebel"), beaten: ["inkhand"] as EnemyId[] };
    expect(questLog(seer).main.title).toMatch(/清党|请令/);
    const sapper = {
      ...addFlag(makeRun("empty", "sapper"), "graceKnown"),
      beaten: ["stakeboss", "knotboss"] as EnemyId[],
    };
    expect(questLog(sapper).main.title).toMatch(/奸臣/);
  });

  it("does not soft-lock main when roadUsurp arrives early", () => {
    const rail = addFlag(
      addFlag(
        addFlag(addFlag(makeRun("empty", "rail"), "mainOpen"), "heardRebel"),
        "midDoorTrue",
      ),
      "roadUsurp",
    );
    expect(questLog(rail).main.title).toMatch(/帐外|替天/);
    const seer = {
      ...addFlag(addFlag(makeRun("empty", "seer"), "caseRebel"), "roadUsurp"),
      beaten: ["inkhand"] as EnemyId[],
    };
    expect(questLog(seer).main.guide).toMatch(/洛司|汴营/);
  });

  it("shows ending titles after usurper falls", () => {
    expect(questLog({ ...makeRun("empty", "rail"), beaten: ["usurper"] }).main.title).toMatch(/隐/);
    expect(questLog({ ...makeRun("empty", "seer"), beaten: ["usurper"] }).main.title).toMatch(/将军/);
    expect(questLog({ ...makeRun("empty", "sapper"), beaten: ["usurper"] }).main.title).toMatch(/小官/);
  });

  it("lists puzzle sides while start flags are set and clears on Done", () => {
    const echo = questLog(addFlag(makeRun("empty"), "pzEcho1")).sides.find((q) => q.title.includes("钟序"));
    expect(echo?.guide).toMatch(/恩僧|山门/);
    expect(
      questLog(addFlag(addFlag(makeRun("empty"), "pzEcho1"), "pzEchoDone")).sides.some((q) =>
        q.title.includes("钟序"),
      ),
    ).toBe(false);
    expect(questLog(addFlag(makeRun("empty"), "pzTide1")).sides.some((q) => q.title.includes("潮册"))).toBe(true);
    expect(
      questLog(addFlag(addFlag(makeRun("empty"), "pzTide1"), "pzTidePage")).sides.find((q) => q.guide.includes("颜牙"))
        ?.guide,
    ).toMatch(/颜牙/);
    expect(questLog(addFlag(makeRun("empty"), "pzSeal1")).sides.some((q) => q.guide.includes("暗示") || q.title.includes("印"))).toBe(true);
    expect(questLog(addFlag(makeRun("empty"), "pzLantern1")).sides.some((q) => q.title.includes("灯") || q.guide.includes("灯"))).toBe(true);
    expect(questLog(addFlag(makeRun("empty"), "pzMask1")).sides.some((q) => q.title.includes("假面"))).toBe(true);
    expect(questLog(addFlag(makeRun("empty"), "pzBlood1")).sides.some((q) => q.title.includes("拓碑") || q.title.includes("血"))).toBe(true);
    expect(questLog(addFlag(makeRun("empty"), "pzForge1")).sides.some((q) => q.title.includes("认火"))).toBe(true);
    expect(questLog(addFlag(makeRun("empty"), "pzDebt1")).sides.some((q) => q.title.includes("债"))).toBe(true);
  });

  it("lists blade upgrade tip after branded", () => {
    const log = questLog(addFlag(makeRun("empty"), "branded"));
    expect(log.sides.some((q) => q.title.includes("刃"))).toBe(true);
  });

  it("guides inn deepen, blade recruit, and eunuch sticky", () => {
    expect(questLog(addFlag(makeRun("empty"), "sideRoadInn")).sides.some((q) => q.title.includes("驿站"))).toBe(
      true,
    );
    const door = addFlag(addFlag(makeRun("empty"), "midDoorTrue"), "branded");
    expect(questLog(door).sides.some((q) => q.title.includes("航下") || q.guide.includes("江晚涛"))).toBe(true);
    const eunuch = addFlag(addFlag(makeRun("empty", "sapper"), "midEunuchAsked"), "branded");
    expect(questLog(eunuch).sides.some((q) => q.title.includes("宦门"))).toBe(true);
  });
});
