import { describe, expect, it } from "vitest";
import {
  bianDrumBeat,
  bianGrainDoorBeat,
  bianNamelessBeat,
  campLieutenantBeat,
  caseSideQuests,
  caseWrongPageBeat,
  endingLead,
  endingSummary,
  gruelCookBeat,
  herbDocCaseBeat,
  saltClerkBeat,
  silkDebtBeat,
  throneTeaBeat,
} from "./midCases";

describe("saltClerkBeat", () => {
  it("exposes ledger or takes mute silver", () => {
    const ask = saltClerkBeat({ flags: [], pick: "ask" });
    expect(ask.flags).toContain("midSaltAsk");
    const expose = saltClerkBeat({ flags: ["midSaltAsk"], pick: "expose" });
    expect(expose.flags).toEqual(expect.arrayContaining(["midSaltLedger", "midSaltAsk"]));
    expect(expose.flags ?? []).not.toContain("roadUsurp");
    expect(expose.spar).toBe("mob_canal_03");
    const mute = saltClerkBeat({ flags: ["midSaltAsk"], pick: "bribe" });
    expect(mute.flags).toContain("midSaltMute");
  });
});

describe("silkDebtBeat", () => {
  it("restores or sells the escaped name", () => {
    const restore = silkDebtBeat({ flags: ["midSilkAsk"], pick: "restore" });
    expect(restore.flags).toContain("midSilkDebt");
    const sell = silkDebtBeat({ flags: ["midSilkAsk"], pick: "sell" });
    expect(sell.flags).toEqual(expect.arrayContaining(["midSilkSell", "midSilkSold"]));
  });
});

describe("gruelCookBeat", () => {
  it("feeds gruel or spars for the blade path", () => {
    const feed = gruelCookBeat({ flags: [], pick: "feed" });
    expect(feed.flags).toContain("midSuqianGruel");
    const blade = gruelCookBeat({ flags: ["midSuqianOpen"], pick: "blade" });
    expect(blade.flags).toContain("midSuqianBlade");
    expect(blade.spar).toBe("mob_canal_05");
  });

  it("soft-fails after too many fights without closing", () => {
    const late = gruelCookBeat({
      flags: ["midSuqianOpen"],
      beaten: ["a", "b", "c", "d", "e", "f"],
    });
    expect(late.flags).toContain("midSuqianFail");
  });
});

describe("herbDocCaseBeat", () => {
  it("marks correct or wrong批红", () => {
    const ok = herbDocCaseBeat({ flags: ["midHerbAsk"], pick: "right" });
    expect(ok.flags).toContain("midHerbPage");
    const bad = herbDocCaseBeat({ flags: ["midHerbAsk"], pick: "wrong" });
    expect(bad.flags).toContain("midHerbWrong");
  });
});

describe("throneTeaBeat", () => {
  it("supports true / doubt / abandon", () => {
    const ask = throneTeaBeat({ flags: [], pick: "ask" });
    expect(ask.flags).toContain("throneTrue");
    const doubt = throneTeaBeat({ flags: ["throneTrue"], hero: "rail", pick: "doubt" });
    expect(doubt.flags).toContain("viewThroneDoubt");
    const abandon = throneTeaBeat({ flags: ["throneTrue"], pick: "abandon" });
    expect(abandon.flags).toContain("throneAbandon");
  });
});

describe("caseWrongPageBeat", () => {
  it("soft-fails with midCaseSlip", () => {
    const slip = caseWrongPageBeat({ flags: [], pick: "slip" });
    expect(slip.flags).toContain("midCaseSlip");
  });
});

describe("bian recognitions", () => {
  it("sets grain / drum / nameless flags", () => {
    expect(bianGrainDoorBeat({ flags: [], pick: "look" }).flags).toEqual(
      expect.arrayContaining(["midBianGrain", "midGrainProof"]),
    );
    expect(bianDrumBeat({ flags: [], pick: "listen" }).flags).toContain("midBianDrum");
    expect(bianNamelessBeat({ flags: [], pick: "ask" }).flags).toContain("midBianName");
  });
});

describe("campLieutenantBeat", () => {
  it("echoes camp stance flags", () => {
    expect(campLieutenantBeat({ flags: ["campJoin"] }).said).toMatch(/半旗|旗/);
    expect(campLieutenantBeat({ flags: ["campShadow"] }).said).toMatch(/影子/);
    expect(campLieutenantBeat({ flags: ["campRefuse"] }).said).toMatch(/拒/);
  });
});

describe("endingSummary + caseSideQuests", () => {
  it("summarizes a few mid choices", () => {
    const lines = endingSummary(
      ["midSaltLedger", "midSilkDebt", "throneAbandon", "campRefuse", "midHerbPage"],
      "rail",
    );
    expect(lines.length).toBeGreaterThanOrEqual(2);
    expect(lines.length).toBeLessThanOrEqual(3);
  });

  it("pins hero-signature hooks in the ending slip", () => {
    const rail = endingSummary(["midDoorTrue", "midSaltMute", "campRefuse"], "rail");
    expect(rail.some((l) => l.includes("踹正"))).toBe(true);
    const seer = endingSummary(["purgeWash", "midSilkDebt", "campJoin"], "seer");
    expect(seer.some((l) => l.includes("洗城"))).toBe(true);
    const sapper = endingSummary(["aidDark", "midSuqianGruel", "campShadow"], "sapper");
    expect(sapper.some((l) => l.includes("暗助"))).toBe(true);
  });

  it("writes distinct ending leads per hero choice", () => {
    expect(endingLead("seer", ["purgeMove"])).toMatch(/挪页/);
    expect(endingLead("seer", ["purgeWash"])).toMatch(/洗城/);
    expect(endingLead("seer", [])).not.toMatch(/挪页令兑了/);
    expect(endingLead("sapper", ["aidOpen"])).toMatch(/嚷/);
    expect(endingLead("rail", ["midDoorBent"])).toMatch(/踹歪/);
  });

  it("lists open case side quests", () => {
    const sides = caseSideQuests({
      flags: ["midSaltAsk", "midSuqianOpen", "midHerbAsk"],
      beaten: [],
    });
    expect(sides.some((s) => s.title.includes("伪盐"))).toBe(true);
    expect(sides.some((s) => s.title.includes("粥"))).toBe(true);
    expect(sides.some((s) => s.title.includes("批红"))).toBe(true);
  });

  it("guides dig case and incomplete bian triad", () => {
    expect(
      caseSideQuests({ flags: ["caseSuspect"], beaten: [] }).some((s) => s.title.includes("谋逆")),
    ).toBe(true);
    const triad = caseSideQuests({
      flags: ["graceKnown", "midBianGrain", "midGrainProof"],
      beaten: [],
    });
    expect(triad.some((s) => s.title.includes("三认"))).toBe(true);
    expect(triad.find((s) => s.title.includes("三认"))?.blurb).toMatch(/鼓|无名/);
  });
});
