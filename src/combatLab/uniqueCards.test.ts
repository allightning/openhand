import { describe, expect, it, beforeEach } from "vitest";
import { breakTestContext } from "./testContext";
import { CARDS } from "../game/content";
import { playCard } from "../game/sim";
import { setLabMode } from "./labTuning";
import { setLabRuleset } from "./labRuleset";
import { applyGauntletReward, breakRewardCardPool, buildGauntletPreset, createGauntletRun } from "./gauntlet";
import { grantCardToLoadout } from "./loadout";
import { startLabBattle } from "./factory";

describe("谱可重复至 3 + 换页机制仍在", () => {
  beforeEach(() => {
    setLabRuleset("break");
    setLabMode(true);
  });

  it("起手牌 id 互不重复", () => {
    const run = createGauntletRun("bandit", "saber");
    expect(new Set(run.deckRecipe).size).toBe(run.deckRecipe.length);
  });

  it("已有谱再发同一张可叠到 3 张", () => {
    let run = { ...createGauntletRun("bandit", "saber"), stage: 8 };
    expect(run.deckRecipe.filter((id) => id === "defend").length).toBe(1);
    run = grantCardToLoadout(run, "defend");
    expect(run.deckRecipe.filter((id) => id === "defend").length).toBe(2);
    run = grantCardToLoadout(run, "defend");
    expect(run.deckRecipe.filter((id) => id === "defend").length).toBe(3);
  });

  it("奖励池仍含已拥有的 id（可重复摸）", () => {
    let run = createGauntletRun("bandit", "saber");
    run = grantCardToLoadout(run, "saberBleed");
    const pool = breakRewardCardPool(run);
    expect(pool).toContain("saberBleed");
    expect(pool.length).toBeGreaterThanOrEqual(3);
  });

  it("apply 谱奖励可塞进第二张拖刀创", () => {
    let run = createGauntletRun("bandit", "saber");
    run = applyGauntletReward(run, { kind: "card", id: "saberBleed", title: "拖刀创", tip: "" });
    run = applyGauntletReward(run, { kind: "card", id: "saberBleed", title: "拖刀创", tip: "" });
    const ids = [...run.deckRecipe, ...(run.stashCards ?? [])];
    expect(ids.filter((id) => id === "saberBleed").length).toBe(2);
  });

  it("卸力换页会抽牌，吐纳换页清裂创，开山掌会击退", () => {
    expect(CARDS.defend2.text).toMatch(/抽/);
    expect(CARDS.mend2.clearBleed).toBe(true);
    expect(CARDS.strike2.knock).toBe(1);

    const b = startLabBattle(buildGauntletPreset(createGauntletRun("shaolin", "palm")), true, 1);
    b.player.pos = 2;
    b.enemy.pos = 3;
    b.energy = 6;
    b.bleed = 3;
    b.hand = [
      { uid: "d2", defId: "defend2" },
      { uid: "m2", defId: "mend2" },
      { uid: "s2", defId: "strike2" },
    ];
    const handN = b.hand.length;
    const afterDef = playCard(b, "d2", breakTestContext());
    expect(afterDef.hand.length).toBeGreaterThanOrEqual(handN); // 打出一张再抽，至少不净减

    afterDef.hand = [{ uid: "m2", defId: "mend2" }];
    afterDef.energy = 6;
    const afterMend = playCard(afterDef, "m2", breakTestContext());
    expect(afterMend.bleed).toBe(0);

    afterMend.hand = [{ uid: "s2", defId: "strike2" }];
    afterMend.energy = 6;
    const pos = afterMend.enemy.pos;
    const afterStrike = playCard(afterMend, "s2", breakTestContext());
    expect(afterStrike.enemy.pos).not.toBe(pos);
  });
});
