import { describe, expect, it } from "vitest";
import { MATES, MATE_OFFER, WEAPON_NAME, WEAPON_PACE, addCompanion, deckFor, grantChapterTwo, healRun, mateJoinReady, noteFall, reviveHp, schoolLabel, stashOrTeach } from "./party";
import { makeRun } from "./run";
import { makeBattle, swapFighter } from "./sim";

describe("party and weapons", () => {
  it("keeps six weapons with distinct verbs", () => {
    expect(Object.keys(WEAPON_NAME).sort()).toEqual(["hook", "palm", "saber", "spear", "staff", "sword"]);
    expect(new Set(Object.values(MATES).map((m) => m.weapon)).size).toBe(6);
    expect(WEAPON_PACE.sword).toBeGreaterThan(WEAPON_PACE.spear);
    expect(WEAPON_PACE.saber).toBeGreaterThan(WEAPON_PACE.staff);
    expect(MATES.porter.bio?.length).toBeGreaterThan(4);
    expect(MATES.rail.bio?.length).toBeGreaterThan(4);
  });

  it("revives at full after spending a life", () => {
    expect(reviveHp(28)).toBe(28);
    expect(reviveHp(32)).toBe(32);
  });

  it("ends the petition when lives hit zero", () => {
    expect(noteFall(2, 3).over).toBe(false);
    expect(noteFall(2, 3).said).toMatch(/还剩/);
    expect(noteFall(0, 3).over).toBe(true);
    expect(noteFall(0, 3).said).toMatch(/命数尽/);
  });

  it("recruits without duplicating", () => {
    let run = addCompanion(makeRun("empty"), "porter");
    expect(run.party).toEqual(["rail", "porter"]);
    run = addCompanion(run, "porter");
    expect(run.party).toEqual(["rail", "porter"]);
  });

  it("gates companion joins by hero offer order", () => {
    const seer = makeRun("empty", "seer");
    expect(mateJoinReady(seer, "scribe")).toBe(true);
    expect(mateJoinReady(seer, "porter")).toBe(false);
    expect(MATE_OFFER.sapper[0]).toBe("hooker");
    expect(MATE_OFFER.rail[0]).toBe("porter");
  });

  it("gives the next mate in hero offer order at chapter two", () => {
    const run = grantChapterTwo(makeRun("empty"));
    expect(run.party).toContain("porter");
    const seer = grantChapterTwo(makeRun("empty", "seer"));
    expect(seer.party).toContain("scribe");
  });

  it("heals everyone a little at a rest", () => {
    let run = addCompanion(makeRun("empty"), "porter");
    run = { ...run, hp: 10, companionHp: { rail: 10, porter: 10 } };
    run = healRun(run, 8);
    expect(run.hp).toBe(18);
    expect(run.companionHp.porter).toBe(18);
  });
});

describe("swap and packs", () => {
  it("lets a second fighter take the floor for one energy", () => {
    const run = addCompanion(makeRun("empty"), "porter");
    let b = makeBattle("catcher", run, true);
    expect(b.active).toBe("rail");
    expect(b.bench.some((m) => m.id === "porter")).toBe(true);
    b = swapFighter(b, "porter");
    expect(b.active).toBe("porter");
    expect(b.energy).toBe(7);
    expect(b.player.name).toBe("韩铁");
    expect(b.hand.some((c) => c.defId === "plant")).toBe(true);
  });

  it("lets the hermit take the floor with a palm kit", () => {
    const run = addCompanion(makeRun("empty"), "hermit");
    let b = makeBattle("catcher", run, true);
    b = swapFighter(b, "hermit");
    expect(b.player.name).toBe("井清源");
    expect(b.hand.some((c) => c.defId === "elbow")).toBe(true);
  });

  it("puts a second body on the twin's stone", () => {
    const b = makeBattle("twin");
    expect(b.foes).toHaveLength(2);
    expect(b.foes.filter((f) => f.hp > 0)).toHaveLength(2);
  });
});

describe("weapon scrolls", () => {
  it("marks generic cards as 通用", () => {
    expect(schoolLabel("defend")).toBe("通用");
    expect(schoolLabel("mend")).toBe("通用");
    expect(schoolLabel("sidestep")).toBe("通用");
    expect(schoolLabel("cut")).toBe("刀");
    expect(schoolLabel("strike")).toBe("拳掌");
  });

  it("stashes a saber page until a saber hand joins", () => {
    let run = stashOrTeach(makeRun("empty"), "cut");
    expect(run.scrolls).toEqual(["cut"]);
    expect(run.deck.includes("cut")).toBe(false);
    run = addCompanion(run, "watch");
    expect(run.scrolls).toEqual([]);
    expect(run.mateDecks.watch).toContain("cut");
    expect(deckFor(run, "watch")).toContain("cut");
    expect(deckFor(run, "rail")).not.toContain("cut");
  });

  it("puts a generic page on the rail", () => {
    const run = stashOrTeach(makeRun("empty"), "mend");
    expect(run.scrolls).toEqual([]);
    expect(run.deck.filter((id) => id === "mend").length).toBe(
      makeRun("empty").deck.filter((id) => id === "mend").length + 1,
    );
  });
});
