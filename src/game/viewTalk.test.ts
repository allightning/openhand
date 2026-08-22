import { describe, expect, it } from "vitest";
import { innkeepBeat, storymanBeat, taxGuestBeat } from "./viewTalk";
import { throneTeaBeat } from "./midCases";

describe("viewTalk", () => {
  it("splits innkeep worldview by hero", () => {
    const rail = innkeepBeat({ flags: [], hero: "rail", pick: "view" });
    const seer = innkeepBeat({ flags: [], hero: "seer", pick: "view" });
    const sapper = innkeepBeat({ flags: [], hero: "sapper", pick: "view" });
    expect(rail.said).toMatch(/门/);
    expect(seer.said).toMatch(/册/);
    expect(sapper.said).toMatch(/桩|粮|饭/);
    expect(rail.said).not.toBe(seer.said);
  });

  it("lets storyman doubt branch keep throneTrue", () => {
    const v = storymanBeat({ flags: ["throneTrue"], hero: "rail", pick: "doubt" });
    expect(v.flags).toContain("throneTrue");
    expect(v.said).toMatch(/假话|踹/);
  });

  it("lets throne tea abandon the bowl", () => {
    const v = throneTeaBeat({ flags: ["throneTrue"], pick: "abandon" });
    expect(v.flags).toContain("throneAbandon");
  });

  it("opens tax guest with choices", () => {
    const open = taxGuestBeat({ flags: [], hero: "seer" });
    expect(open.choices?.length).toBeGreaterThan(0);
  });
});
