import { describe, expect, it } from "vitest";
import {
  campHeraldBeat,
  eunuchBeat,
  judgePurgeBeat,
  riverBladeBeat,
  worksmanBeat,
} from "./midBeats";
import { hubPuzzlesOpen } from "./puzzles";
import { questLog } from "./quest";
import { addFlag, makeRun } from "./run";

describe("hubPuzzlesOpen", () => {
  it("stays closed until village paperwork", () => {
    expect(hubPuzzlesOpen([])).toBe(false);
    expect(hubPuzzlesOpen(["branded"])).toBe(true);
    expect(hubPuzzlesOpen(["booksOk"])).toBe(true);
    expect(hubPuzzlesOpen(["knotOk"])).toBe(true);
  });
});

describe("midBeats", () => {
  it("lets rail straighten or bend the Jiankang door", () => {
    const open = riverBladeBeat({ flags: [], hero: "rail", pick: "door" });
    expect(open.choices?.some((c) => c.id === "straight")).toBe(true);
    const ok = riverBladeBeat({ flags: [], hero: "rail", pick: "straight" });
    expect(ok.flags).toContain("midDoorTrue");
    const bent = riverBladeBeat({ flags: [], hero: "rail", pick: "bent" });
    expect(bent.flags).toContain("midDoorBent");
    expect(bent.spar).toBe("thug");
  });

  it("splits purge into wash vs move pages", () => {
    const wash = judgePurgeBeat({ flags: ["caseRebel"], pick: "wash" });
    expect(wash.flags).toEqual(expect.arrayContaining(["purgeReady", "purgeWash", "roadUsurp"]));
    const move = judgePurgeBeat({ flags: ["caseRebel"], pick: "move" });
    expect(move.flags).toEqual(expect.arrayContaining(["purgeReady", "purgeMove", "roadUsurp"]));
  });

  it("makes grain proof optional for sapper grace", () => {
    const proof = worksmanBeat({ flags: [], pick: "proof" });
    expect(proof.flags).toEqual(expect.arrayContaining(["graceKnown", "midGrainProof"]));
    const hear = worksmanBeat({ flags: [], pick: "hear" });
    expect(hear.flags).toContain("graceKnown");
    expect(hear.flags).not.toContain("midGrainProof");
  });

  it("offers dark vs open aid at the eunuch", () => {
    const dark = eunuchBeat({ flags: [], hero: "sapper", pick: "dark" });
    expect(dark.flags).toEqual(expect.arrayContaining(["traitorSeen", "aidDark", "roadUsurp"]));
    const leave = eunuchBeat({ flags: ["midEunuchAsked"], hero: "sapper", pick: "leave" });
    expect(leave.flags).toContain("traitorSeen");
    expect(leave.flags ?? []).not.toContain("roadUsurp");
  });

  it("asks camp stance before the usurper", () => {
    const refuse = campHeraldBeat({ flags: [], hero: "rail", pick: "refuse" });
    expect(refuse.flags).toContain("campRefuse");
    const shadow = campHeraldBeat({ flags: [], hero: "sapper", pick: "shadow" });
    expect(shadow.flags).toContain("campShadow");
  });
});

describe("quest mid gates", () => {
  it("holds rail at Jiankang door after rebel rumor", () => {
    const run = addFlag(addFlag(makeRun("empty", "rail"), "mainOpen"), "heardRebel");
    expect(questLog(run).main.title).toMatch(/朱雀航/);
  });

  it("points seer purge at wash-or-move wording", () => {
    const run = {
      ...addFlag(makeRun("empty", "seer"), "caseRebel"),
      beaten: ["inkhand" as const],
    };
    expect(questLog(run).main.guide).toMatch(/洗城|挪页/);
  });
});
