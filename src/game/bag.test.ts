import { describe, expect, it } from "vitest";
import {
  addBag,
  BAG_NAME,
  bagCount,
  bringStashIntoRun,
  buyClinic,
  canCraft,
  collectCraft,
  packDisplayStacks,
  PAWN_PRICE,
  sellBag,
  startCraft,
  syncBagCurrency,
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
    let run = addBag(addBag(makeRun("iron"), "herb", 2), "hide", 0);
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
    if (used.ok) expect(used.run.hp).toBe(14);
  });

  it("names forge mats and currency goods", () => {
    expect(BAG_NAME.forgeIron).toBe("生铁");
    expect(BAG_NAME.forgeCoal).toBe("焦炭");
    expect(BAG_NAME.forgeOil).toBe("淬油");
    expect(BAG_NAME.tongbaoCoin).toBe("通宝");
    expect(BAG_NAME.roadPassToken).toBe("文牒");
    expect(PAWN_PRICE.forgeIron).toBeGreaterThan(0);
  });

  it("syncs tongbao and passes into bag stacks", () => {
    let save = emptySave();
    save = { ...save, tongbao: 2 };
    let run = syncBagCurrency({ ...makeRun("empty"), passes: 3 }, save);
    expect(bagCount(run, "tongbaoCoin")).toBe(2);
    expect(bagCount(run, "roadPassToken")).toBe(3);
    const shown = packDisplayStacks(run, save);
    expect(shown.some((s) => s.id === "tongbaoCoin" && s.n === 2)).toBe(true);
    expect(shown.some((s) => s.id === "roadPassToken" && s.n === 3)).toBe(true);
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
