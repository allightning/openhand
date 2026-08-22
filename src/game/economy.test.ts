import { describe, expect, it } from "vitest";
import {
  applyPillToMate,
  forgeNeed,
  matchForgeNeed,
  pickEscortJob,
  PILL_TIER_NAME,
  softUpgradeBlockReason,
  softUpgradeTarget,
  stageLootWeights,
} from "./economy";
import { addBag } from "./bag";
import { makeRun } from "./run";
import { applyReward } from "./rewards";
import { starterGear } from "./weapons";

describe("economy", () => {
  it("names three pill tiers", () => {
    expect(PILL_TIER_NAME.fan).toBe("凡药");
    expect(PILL_TIER_NAME.liang).toBe("良药");
    expect(PILL_TIER_NAME.xuan).toBe("玄药");
  });

  it("picks reachable escort destinations with a forced elite", () => {
    const job = pickEscortJob(0.2);
    expect(job.name.length).toBeGreaterThan(1);
    expect(job.elite.length).toBeGreaterThan(1);
  });

  it("applies liang pill to one mate only", () => {
    let run = makeRun("iron", "rail");
    run = applyPillToMate(run, "rail", "pillLiangHp");
    expect(run.companionBonus?.rail?.maxHp).toBe(2);
    expect(run.companionBonus?.porter).toBeUndefined();
  });

  it("forges need materials from 精", () => {
    expect(forgeNeed(3)).toEqual({ forgeJing: 1, copper: 1 });
    expect(forgeNeed(2)).toBeNull();
  });

  it("accepts forge iron as copper alternative", () => {
    let run = addBag(addBag({ ...makeRun("empty"), bag: [] }, "forgeJing", 1), "forgeIron", 1);
    expect(matchForgeNeed(run, 3)).toEqual({ forgeJing: 1, forgeIron: 1 });
  });

  it("soft upgrades stop at 良", () => {
    const starter = starterGear("palm");
    expect(softUpgradeTarget(starter)).toBe("palm-a-2");
    expect(softUpgradeTarget("palm-a-2")).toBeNull();
    expect(softUpgradeBlockReason("palm-a-2")).toMatch(/锻材/);
  });

  it("weights mid loot toward yuanbao and forge more than early", () => {
    expect(stageLootWeights("mid").yuanbao).toBeGreaterThan(stageLootWeights("early").yuanbao);
    expect(stageLootWeights("late").forgeShen).toBeGreaterThan(0);
  });

  it("applies goods and yuanbao rewards", () => {
    let run = makeRun("iron");
    run = applyReward(run, { kind: "yuanbao", amount: 2 });
    run = applyReward(run, { kind: "goods", id: "forgeJing", n: 1 });
    expect(run.yuanbao).toBe(2);
    expect(run.bag?.some((s) => s.id === "forgeJing" && s.n === 1)).toBe(true);
  });
});
