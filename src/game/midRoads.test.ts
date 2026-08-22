import { describe, expect, it } from "vitest";
import { fordManBeat, hamPorterBeat, roadOfficialBeat } from "./midRoads";
import { questLog } from "./quest";
import { addFlag, makeRun } from "./run";
import { GENERATED_ENEMIES } from "./foeCatalog";

describe("hamPorterBeat", () => {
  it("offers clear or mute on the cable pile", () => {
    const ask = hamPorterBeat({ flags: [], pick: "ask" });
    expect(ask.flags).toContain("sideHamAsk");
    const expose = hamPorterBeat({ flags: ["sideHamAsk"], pick: "expose" });
    expect(expose.spar).toBe("mob_road_05");
    expect(expose.flags).toContain("sideHam");
    const mute = hamPorterBeat({ flags: ["sideHamAsk"], pick: "mute" });
    expect(mute.flags).toContain("sideHamMute");
  });
});

describe("fordManBeat", () => {
  it("splits wait vs force", () => {
    const wait = fordManBeat({ flags: ["sideRiver"], pick: "wait" });
    expect(wait.flags).toContain("sideRiverWait");
    const force = fordManBeat({ flags: [], pick: "force" });
    expect(force.spar).toBe("riverThug");
  });
});

describe("roadOfficialBeat", () => {
  it("tears the fake pass into a spar", () => {
    const tear = roadOfficialBeat({ flags: ["midRoadOfficial"], pick: "tear" });
    expect(tear?.spar).toBe("mob_yamenRunner_03");
    expect(tear?.flags).toContain("midRoadOfficialDone");
  });
});

describe("quest road hooks", () => {
  it("lists ham and fake-official sides", () => {
    expect(questLog(addFlag(makeRun("empty"), "sideHamAsk")).sides.some((q) => q.title.includes("缆堆"))).toBe(true);
    expect(questLog(addFlag(makeRun("empty"), "midRoadOfficial")).sides.some((q) => q.title.includes("假官"))).toBe(true);
  });
});

describe("more road elites", () => {
  it("stamps chuzhou and suqian road foes", () => {
    expect(GENERATED_ENEMIES.mob_road_08.elite).toBe("windup");
    expect(GENERATED_ENEMIES.mob_canal_05.elite).toBe("stake");
    expect(GENERATED_ENEMIES.mob_yamenRunner_03.title).toMatch(/假帖/);
  });
});
