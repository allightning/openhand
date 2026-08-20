import { describe, expect, it } from "vitest";
import { MATES, WEAPON_NAME, WEAPON_PACE, addCompanion, deckFor, grantChapterTwo, healRun, noteFall, reviveHp, schoolLabel, stashOrTeach } from "./party";
import { makeRun } from "./run";
import { makeBattle, swapFighter } from "./sim";

describe("party and weapons", () => {
  it("keeps six weapons with distinct verbs", () => {
    expect(Object.keys(WEAPON_NAME).sort()).toEqual(["hook", "palm", "saber", "spear", "staff", "sword"]);
    expect(new Set(Object.values(MATES).map((m) => m.weapon)).size).toBe(6);
    expect(WEAPON_PACE.sword).toBeGreaterThan(WEAPON_PACE.spear);
    expect(WEAPON_PACE.saber).toBeGreaterThan(WEAPON_PACE.staff);
  });

  it("revives at about a tenth of life", () => {
    expect(reviveHp(28)).toBe(3);
    expect(reviveHp(32)).toBe(3);
  });

  it("ends the petition after three falls", () => {
    expect(noteFall(1).over).toBe(false);
    expect(noteFall(1).said).toMatch(/两回/);
    expect(noteFall(2).said).toMatch(/一回/);
    expect(noteFall(3).over).toBe(true);
    expect(noteFall(3).said).toMatch(/三次/);
  });

  it("recruits without duplicating", () => {
    let run = addCompanion(makeRun("empty"), "porter");
    expect(run.party).toEqual(["rail", "porter"]);
    run = addCompanion(run, "porter");
    expect(run.party).toEqual(["rail", "porter"]);
  });

  it("gives the boat at the start of the second chapter", () => {
    const run = grantChapterTwo(makeRun("empty"));
    expect(run.party).toContain("boat");
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
    expect(b.energy).toBe(2);
    expect(b.player.name).toBe("杠七");
    expect(b.hand.some((c) => c.defId === "plant")).toBe(true);
  });

  it("lets the hermit take the floor with a palm kit", () => {
    const run = addCompanion(makeRun("empty"), "hermit");
    let b = makeBattle("catcher", run, true);
    b = swapFighter(b, "hermit");
    expect(b.player.name).toBe("井叟");
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
