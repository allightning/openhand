import { describe, expect, it } from "vitest";
import { CLIMB_STANCE_SHIFT_HP } from "../game/climbCaps";
import { buildFoeKit, foeKitSeed, foeWindowChance, kitRng } from "../game/foeArchetype";
import { aggregateStances, publishStance, stanceLine } from "../game/intentStance";
import { makeRun } from "../game/run";
import { makeBattle, playCard } from "../game/sim";
import { climbTestContext } from "./testContext";

const rc = climbTestContext();

describe("一敌多谱", () => {
  it("精英变体按种子确定，换盐可以换一套", () => {
    const input = { stage: 6, enemyId: "mob_road_01", round: 2, salt: 4, elite: true };
    const seed = foeKitSeed(2, "mob_road_01", 4);
    const a = buildFoeKit(input, kitRng(seed));
    const b = buildFoeKit(input, kitRng(seed));
    expect(a.foeVariant).toBe(b.foeVariant);
    expect(a.cards).toEqual(b.cards);
    expect(a.foeVariant).toMatch(/^mob_road_01:/);
    const seen = new Set<string>();
    for (let salt = 0; salt < 12; salt++) {
      const kit = buildFoeKit({ ...input, salt }, kitRng(foeKitSeed(2, "mob_road_01", salt)));
      if (kit.foeVariant) seen.add(kit.foeVariant);
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it("馆 1–3 杂兵没有变体", () => {
    for (const stage of [1, 2, 3]) {
      const kit = buildFoeKit(
        { stage, enemyId: "catcher", round: 1, salt: 3, elite: false },
        kitRng(foeKitSeed(1, "catcher", 3)),
      );
      expect(kit.foeVariant).toBeUndefined();
      expect(["brute", "turtle"]).toContain(kit.archetype);
    }
  });
});

describe("血线换势", () => {
  it("跌破一次就换谱，架势构成变，再打不换第二次", () => {
    const run = makeRun("empty");
    const b = makeBattle("catcher", rc, run, true);
    b.labGauntletStage = 6;
    b.foeArchetype = "turtle";
    b.energy = 20;
    b.player.pos = 0;
    b.enemy.pos = 1;
    b.enemy.maxHp = 100;
    b.enemy.hp = Math.ceil(100 * CLIMB_STANCE_SHIFT_HP);
    if (b.foes[0]) {
      b.foes[0].maxHp = 100;
      b.foes[0].hp = b.enemy.hp;
    }
    b.intents = [
      { kind: "guard", block: 6 },
      { kind: "guard", block: 8 },
      { kind: "mend", heal: 4 },
      { kind: "endure" },
    ];
    b.intent = b.intents[0]!;
    b.feintMask = [false, false, false, false];
    publishStance(b);
    const before = stanceLine(aggregateStances(b.stanceBoard ?? []));
    b.hand = [{ uid: "st", defId: "strike" }, { uid: "st2", defId: "strike" }];
    const once = playCard(b, "st", rc);
    const after = stanceLine(aggregateStances(once.stanceBoard ?? []));
    expect(once.log.join(" ")).toContain("foeStanceShift");
    expect(once.foeArchetype).toBe("brute");
    expect(after).not.toBe(before);
    expect(foeWindowChance(once.foeArchetype)).toBe(foeWindowChance("brute"));
    const twice = playCard(once, "st2", rc);
    const marks = twice.log.filter((line) => line.includes("foeStanceShift"));
    expect(marks).toHaveLength(1);
    expect(twice.foeArchetype).toBe("brute");
  });
});
