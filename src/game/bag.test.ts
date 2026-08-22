import { describe, expect, it } from "vitest";
import {
  addBag,
  bagCount,
  bringStashIntoRun,
  buyClinic,
  canCraft,
  collectCraft,
  sellBag,
  startCraft,
  takeBag,
  useBattleGood,
  useSalveMap,
} from "./bag";
import { makeBattle } from "./sim";
import { emptySave, makeRun } from "./run";

describe("bag economy", () => {
  it("stacks goods and sells at the pawn", () => {
    let run = addBag(makeRun("empty"), "hide", 2);
    expect(bagCount(run, "hide")).toBe(2);
    const sold = sellBag(run, "hide", 1);
    expect(sold.ok).toBe(true);
    if (sold.ok) {
      expect(sold.silver).toBe(6);
      expect(bagCount(sold.run, "hide")).toBe(1);
      expect(sold.run.silver).toBe((run.silver ?? 0) + 6);
    }
  });

  it("crafts salve after the short oven wait", () => {
    let run = addBag(addBag(makeRun("empty"), "herb", 2), "hide", 0);
    expect(canCraft(run, "salve")).toBeNull();
    const started = startCraft(run, "salve", 1_000);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    run = started.run;
    expect(collectCraft(run, 1_000 + 10_000).gained).toBeNull();
    const done = collectCraft(run, 1_000 + 90_000);
    expect(done.gained).toBe("伤药 ×1");
    expect(bagCount(done.run, "salve")).toBe(1);
  });

  it("keeps battle goods weak and once per fight", () => {
    let run = addBag(makeRun("empty"), "dart", 2);
    let b = makeBattle("catcher", run);
    const first = useBattleGood(b, run, "dart");
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.battle.enemy.hp).toBe(b.enemy.hp - 5);
    const second = useBattleGood(first.battle, first.run, "dart");
    expect(second.ok).toBe(false);
  });

  it("heals lightly with salve on the map", () => {
    let run = { ...addBag(makeRun("empty"), "salve", 1), hp: 10 };
    const used = useSalveMap(run);
    expect(used.ok).toBe(true);
    if (used.ok) expect(used.run.hp).toBe(18);
  });

  it("buys clinic goods and brings stash into a new run", () => {
    let run = makeRun("empty");
    const bought = buyClinic({ ...run, silver: 20 }, "salve");
    expect(bought.ok).toBe(true);
    let save = emptySave();
    save = { ...save, stash: [{ id: "powder", n: 3 }, { id: "tonic", n: 4 }] };
    const brought = bringStashIntoRun(makeRun("empty"), save);
    expect(bagCount(brought.run, "powder") + bagCount(brought.run, "tonic")).toBeLessThanOrEqual(6);
  });

  it("refuses take when empty", () => {
    expect(takeBag(makeRun("empty"), "herb", 1)).toBeNull();
  });
});
