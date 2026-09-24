import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { climbTestContext } from "./testContext";
import { setLabRuleset } from "./labRuleset";
import {
  applyGauntletReward,
  applySuperReward,
  buildGauntletPreset,
  createGauntletRun,
  equipStashTech,
  feedStashTech,
  grantTechToRun,
  rollSuperRewards,
  toggleGodUsing,
} from "./gauntlet";
import { climbCardFusable, climbTechSlotMax, fuseOwnedCard } from "./loadout";
import { startLabBattle } from "./factory";
import { endTurn, statusChips, techBonus } from "../game/sim";
import { techRankMul } from "../game/techRank";

beforeEach(() => setLabRuleset("climb"));
afterEach(() => setLabRuleset("break"));

describe("爬塔配装：合成 / 外功栏 / 神兵双路", () => {
  it("蓝外功栏 3/4/5", () => {
    expect(climbTechSlotMax(1)).toBe(3);
    expect(climbTechSlotMax(3)).toBe(3);
    expect(climbTechSlotMax(4)).toBe(4);
    expect(climbTechSlotMax(7)).toBe(4);
    expect(climbTechSlotMax(8)).toBe(5);
  });

  it("进退不可合成，攻击可合成两张换页", () => {
    expect(climbCardFusable("advance")).toBe(false);
    expect(climbCardFusable("strike")).toBe(true);
    let run = createGauntletRun("shaolin", "palm");
    run = { ...run, stashCards: ["strike", "strike"] };
    run = fuseOwnedCard(run, "strike");
    expect(run.stashCards?.filter((id) => id === "strike")).toHaveLength(0);
    expect([...run.deckRecipe, ...(run.stashCards ?? [])]).toContain("strike2");
  });

  it("同名外功进行囊，可喂养升档", () => {
    let run = createGauntletRun("shaolin", "palm");
    const mate = "rail";
    run = grantTechToRun(run, "piercingPalm", mate);
    run = grantTechToRun(run, "piercingPalm", mate);
    expect(run.mateTechs[mate]).toEqual(["piercingPalm"]);
    expect(run.stashTechs).toEqual(["piercingPalm"]);
    const idx = (run.stashTechs ?? []).indexOf("piercingPalm");
    run = feedStashTech(run, mate, idx);
    expect(run.stashTechs).toEqual([]);
    expect(run.mateTechRanks?.[mate]?.piercingPalm).toBe(2);
  });

  it("外功栏满进新功进行囊，可再装备", () => {
    let run = { ...createGauntletRun("shaolin", "palm"), stage: 2 };
    const mate = "rail";
    run = grantTechToRun(run, "piercingPalm", mate);
    run = grantTechToRun(run, "softPalm", mate);
    run = grantTechToRun(run, "nightStep", mate);
    run = grantTechToRun(run, "leftover", mate);
    expect(run.mateTechs[mate]).toHaveLength(3);
    expect(run.stashTechs).toContain("leftover");
    run = equipStashTech(run, mate, (run.stashTechs ?? []).indexOf("leftover"));
    expect(run.mateTechs[mate]).toHaveLength(3);
    run = { ...run, stage: 8 };
    run = equipStashTech(run, mate, (run.stashTechs ?? []).indexOf("leftover"));
    expect(run.mateTechs[mate]).toContain("leftover");
  });

  it("神兵主副分别获得，配装可切换 a-5 / b-5", () => {
    let run = createGauntletRun("bandit", "saber");
    const opts = rollSuperRewards(run);
    const main = opts.find((o) => o.id === "god-main")!;
    const sub = opts.find((o) => o.id === "god-sub")!;
    run = applySuperReward(run, main);
    expect(run.weaponId).toBe("saber-a-5");
    expect(run.godMain).toBe(true);
    run = applySuperReward(run, sub);
    expect(run.godSub).toBe(true);
    run = toggleGodUsing(run);
    expect(run.weaponId).toBe("saber-b-5");
    run = toggleGodUsing(run);
    expect(run.weaponId).toBe("saber-a-5");
  });

  it("投喂档位倍率 1/1.15/1.30，余劲按档携带", () => {
    expect(techRankMul(1)).toBe(1);
    expect(techRankMul(2)).toBeCloseTo(1.15);
    expect(techRankMul(3)).toBeCloseTo(1.3);
    const mate = "rail";
    const mk = (rank: number) => {
      let run = createGauntletRun("shaolin", "palm");
      run = grantTechToRun(run, "leftover", mate);
      run = { ...run, mateTechRanks: { [mate]: { leftover: rank } } };
      const b = startLabBattle(buildGauntletPreset(run), true, 1);
      b.energy = 8;
      b.energyMax = 20;
      return endTurn(b, climbTestContext()).energy;
    };
    expect(mk(3)).toBe(mk(1) + 2);
    const b2 = startLabBattle(
      buildGauntletPreset({
        ...grantTechToRun(createGauntletRun("shaolin", "palm"), "ironPalm", mate),
        mateTechRanks: { [mate]: { ironPalm: 2 } },
      }),
      true,
      1,
    );
    expect(techBonus(b2, "ironPalm", 6)).toBe(7);
    b2.youBleed = 3;
    b2.v2OffBalance = 2;
    b2.labMateMinds = { [mate]: ["springQi"] };
    const you = statusChips(b2, "you", climbTestContext());
    const foe = statusChips(b2, "foe", climbTestContext());
    expect(you.some((c) => c.name === "裂创" && c.value === "3")).toBe(true);
    expect(you.some((c) => c.key === "mind-springQi")).toBe(true);
    expect(foe.some((c) => c.name === "失衡")).toBe(false);
  });

  it("奖励外功走 grant 而非吞掉重复", () => {
    let run = createGauntletRun("shaolin", "palm");
    run = applyGauntletReward(run, { kind: "tech", id: "piercingPalm", title: "x", tip: "" });
    run = applyGauntletReward(run, { kind: "tech", id: "piercingPalm", title: "x", tip: "" });
    expect(run.stashTechs).toEqual(["piercingPalm", "piercingPalm"]);
    expect(run.mateTechs.rail ?? []).not.toContain("piercingPalm");
  });
});
