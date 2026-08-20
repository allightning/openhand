import { describe, expect, it } from "vitest";
import { ENEMIES } from "./content";
import { applyReward, rollRewards } from "./rewards";
import { emptySave, makeRun } from "./run";
import { addCompanion } from "./party";

describe("rewards", () => {
  it("applies an upgrade by replacing one copy", () => {
    const run = makeRun("empty");
    const strikes = run.deck.filter((id) => id === "strike").length;
    const next = applyReward(run, { kind: "upgrade", from: "strike", to: "strike2" });
    expect(next.deck.filter((id) => id === "strike2")).toHaveLength(1);
    expect(next.deck.filter((id) => id === "strike")).toHaveLength(strikes - 1);
    expect(next.deck).toHaveLength(run.deck.length);
  });

  it("applies a technique without touching the deck", () => {
    const run = makeRun("empty");
    const next = applyReward(run, { kind: "technique", id: "longPush" });
    expect(next.techniques).toEqual(["longPush"]);
    expect(next.deck).toEqual(run.deck);
  });

  it("rolls three unique picks after a duel", () => {
    const run = makeRun("empty");
    const picks = rollRewards(run, emptySave(), { type: "duel", enemyId: "catcher" });
    expect(picks.length).toBe(3);
    const keys = picks.map((r) => JSON.stringify(r));
    expect(new Set(keys).size).toBe(3);
  });

  it("chest offers techniques first", () => {
    const run = makeRun("empty");
    const picks = rollRewards(run, emptySave(), { type: "chest" });
    expect(picks.length).toBe(3);
    expect(picks.every((r) => r.kind === "technique")).toBe(true);
  });

  it("does not offer a remnant already owned", () => {
    let run = makeRun("empty");
    run = applyReward(run, { kind: "technique", id: ENEMIES.catcher.remnant });
    const picks = rollRewards(run, emptySave(), { type: "duel", enemyId: "catcher" });
    const remnants = picks.filter((r) => r.kind === "technique" && r.id === "brightBlade");
    expect(remnants).toHaveLength(0);
  });

  it("stashes a saber page instead of swapping a palm card", () => {
    const run = makeRun("empty");
    const next = applyReward(run, { kind: "replace", from: "strike", to: "cut" });
    expect(next.scrolls).toEqual(["cut"]);
    expect(next.deck.filter((id) => id === "strike")).toEqual(run.deck.filter((id) => id === "strike"));
    expect(next.deck.includes("cut")).toBe(false);
  });

  it("always offers a challenge remnant after a kill", () => {
    const run = makeRun("empty");
    const picks = rollRewards(run, emptySave(), { type: "duel", enemyId: "bandit" });
    expect(picks.some((r) => r.kind === "technique" && r.id === "hardWall")).toBe(true);
    expect(ENEMIES.raider.remnant).toBe("longPush");
    expect(ENEMIES.robber.remnant).toBe("shortCharge");
  });

  it("teaches a stashed saber page when a saber hand is already in the party", () => {
    const run = addCompanion(makeRun("empty"), "watch");
    const next = applyReward(run, { kind: "add", id: "cut" });
    expect(next.scrolls).toEqual([]);
    expect(next.mateDecks.watch).toContain("cut");
    expect(next.deck.includes("cut")).toBe(false);
  });
});
