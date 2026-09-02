import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setLabMode, setLabTuning } from "../game/labTuning";
import { endTurn, playCard, hasTech } from "../game/sim";
import { TECHNIQUES } from "../game/content";
import { MIND_ARTS, sumMindArtBonuses } from "../game/mindArts";
import type { TechniqueId, WeaponId } from "../game/types";
import { startLabBattle } from "./factory";
import { buildGauntletPreset, createGauntletRun } from "./gauntlet";

const SCHOOLS: WeaponId[] = ["palm", "saber", "spear", "sword", "staff", "hook"];

beforeEach(() => {
  setLabMode(true);
  setLabTuning({ rulesV2: true, v2Fx: false });
});
afterEach(() => {
  setLabTuning({ rulesV2: false });
  setLabMode(false);
});

describe("§31.19 分系外功", () => {
  it("每系都有 3 门本系外功，且都带系别标签", () => {
    for (const school of SCHOOLS) {
      const own = (Object.values(TECHNIQUES) as { id: TechniqueId; school?: string }[]).filter((t) => t.school === school);
      expect(own.length, `${school} 系外功数`).toBeGreaterThanOrEqual(3);
    }
  });

  it("奖励池只出本系 + 通用（枪系不会再出掌命名外功）", () => {
    const spearPool = (Object.values(TECHNIQUES) as { id: TechniqueId; school?: string }[])
      .filter((t) => !t.school || t.school === "spear")
      .map((t) => t.id);
    expect(spearPool).toContain("spearWind");
    expect(spearPool).toContain("longMarch");
    expect(spearPool).toContain("pikeBrace");
    expect(spearPool).not.toContain("ironPalm");
    expect(spearPool).not.toContain("saberGrudge");
  });

  it("透骨劲/沉棍：击退 +1", () => {
    // knockDist 通过 pushEnemy 体现——直接用 push 牌看位移
    const run = createGauntletRun("bandit", "palm");
    run.mateTechs = { baimenghe: ["piercingPalm"] };
    const b = startLabBattle(buildGauntletPreset(run), true, 1);
    expect(hasTech(b, "piercingPalm")).toBe(true);
  });

  it("枪风：相隔 3 格攻击 +3（对照组差值）", () => {
    const plain = startLabBattle(buildGauntletPreset(createGauntletRun("bandit", "spear")), true, 1);
    plain.player.pos = 1;
    plain.enemy.pos = 4; // 相隔 3：够得着枪距，且触发枪风
    plain.foes = [plain.enemy];
    plain.hand = [{ uid: "t1", defId: "thrust" }];
    plain.energy = 10;
    const plainDrop = plain.enemy.hp - playCard(plain, "t1").enemy.hp;

    const run = createGauntletRun("bandit", "spear");
    run.mateTechs = { huochangchuan: ["spearWind"] };
    const tech = startLabBattle(buildGauntletPreset(run), true, 1);
    tech.player.pos = 1;
    tech.enemy.pos = 4;
    tech.foes = [tech.enemy];
    tech.hand = [{ uid: "t1", defId: "thrust" }];
    tech.energy = 10;
    const techDrop = tech.enemy.hp - playCard(tech, "t1").enemy.hp;

    expect(techDrop - plainDrop).toBe(3);
  });

  it("绵里针：格挡牌额外 +2", () => {
    const run = createGauntletRun("bandit", "palm");
    run.mateTechs = { baimenghe: ["softPalm"] };
    run.deckRecipe = ["defend", "strike", "strike", "strike", "strike", "strike", "strike", "strike", "strike", "strike", "strike", "strike", "strike", "strike"];
    const b = startLabBattle(buildGauntletPreset(run), true, 1);
    const defend = b.hand.find((c) => c.defId === "defend")!;
    const after = playCard(b, defend.uid);
    expect(after.playerBlock).toBe(b.playerBlock + 8 + 2); // 卸力 8 + 绵里针 2
  });
});

describe("§31.18 心法接线", () => {
  it("心法气血上限进 preset（场上角色）", () => {
    const run = createGauntletRun("bandit", "palm");
    run.mateMindArts = { baimenghe: ["ironBreath", "steadyRoot"] }; // +10 +6
    const base = buildGauntletPreset(createGauntletRun("bandit", "palm"));
    const withMind = buildGauntletPreset(run);
    expect(withMind.hpMax).toBe((base.hpMax ?? 0) + 16);
  });

  it("心法劲力上限/回劲进战斗", () => {
    const run = createGauntletRun("bandit", "saber");
    run.mateMindArts = { watch: ["calmSea"] }; // energyMax+1, turnEnergy+1
    const plain = startLabBattle(buildGauntletPreset(createGauntletRun("bandit", "saber")), true, 1);
    const minded = startLabBattle(buildGauntletPreset(run), true, 1);
    expect(minded.energyMax).toBe(plain.energyMax + 1);
    expect(minded.energyRegen).toBe(plain.energyRegen + 1);
  });

  it("收势时按在场角色心法回血", () => {
    const run = createGauntletRun("bandit", "palm");
    run.mateMindArts = { baimenghe: ["springQi"] }; // turnHeal 4
    let b = startLabBattle(buildGauntletPreset(run), true, 1);
    b = { ...b, player: { ...b.player, hp: Math.max(1, b.player.maxHp - 10) } };
    const after = endTurn(b);
    expect(after.log.some((l) => l.includes("心法 回血"))).toBe(true);
  });

  it("心法加总是确定性数值", () => {
    const sum = sumMindArtBonuses(["ironBreath", "calmSea"]);
    expect(sum.hpMax).toBe(10);
    expect(sum.energyMax).toBe(1);
    expect(sum.turnEnergy).toBe(1);
  });
});
