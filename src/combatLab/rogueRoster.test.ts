import { describe, expect, it } from "vitest";
import {
  HAND_CAP_DEFAULT,
  HAND_CAP_HARD_MAX,
  bleedTickDamage,
  clampHandCap,
  handRefillAmount,
  rollRogueCompanionChoices,
  rogueCompanionTierForStage,
  rogueLeadId,
  rogueRosterByTier,
  spearReachDamage,
  ROGUE_ROSTER,
  breakStarterDeck,
  breakWaveExtraCount,
  rogueBondCards,
} from "./rogueRoster";
import { breakCardUpgrade, fusionCardId } from "../game/rogueCards";
import { CARDS } from "../game/content";

describe("ROGUE_GRADIENT 花名册", () => {
  it("共 18 人：每档 6，六系各一档一人", () => {
    expect(ROGUE_ROSTER).toHaveLength(18);
    expect(rogueRosterByTier(1)).toHaveLength(6);
    expect(rogueRosterByTier(2)).toHaveLength(6);
    expect(rogueRosterByTier(3)).toHaveLength(6);
    for (const school of ["saber", "palm", "sword", "spear", "staff", "hook"] as const) {
      expect(rogueRosterByTier(1).some((m) => m.weapon === school)).toBe(true);
      expect(rogueRosterByTier(2).some((m) => m.weapon === school)).toBe(true);
      expect(rogueRosterByTier(3).some((m) => m.weapon === school)).toBe(true);
    }
  });

  it("刀一档是沈夜行 watch；属性三档递增", () => {
    expect(rogueLeadId("saber")).toBe("watch");
    const lead = rogueRosterByTier(1).find((m) => m.id === "watch")!;
    expect(lead.name).toBe("沈夜行");
    expect(lead.hp).toBe(42);
    expect(rogueRosterByTier(2)[0]!.hp).toBe(52);
    expect(rogueRosterByTier(3)[0]!.hp).toBe(64);
  });

  it("3/7 馆对应二/三档；6 抽 4 排除已在队", () => {
    expect(rogueCompanionTierForStage(3)).toBe(2);
    expect(rogueCompanionTierForStage(7)).toBe(3);
    expect(rogueCompanionTierForStage(4)).toBeNull();
    const taken = new Set([rogueLeadId("saber"), "lvchifeng"] as const);
    const picks = rollRogueCompanionChoices(2, taken, () => 0);
    expect(picks).toHaveLength(4);
    expect(picks).not.toContain("lvchifeng");
    expect(picks).not.toContain("watch");
  });
});

describe("ROGUE_GRADIENT 手牌 / 流血 / 枪距", () => {
  it("收势回补 ⌈上限/2⌉，上限硬顶 10", () => {
    expect(handRefillAmount(5)).toBe(3);
    expect(handRefillAmount(7)).toBe(4);
    expect(handRefillAmount(10)).toBe(5);
    expect(clampHandCap(HAND_CAP_DEFAULT + 99)).toBe(HAND_CAP_HARD_MAX);
  });

  it("流血奇数跳：1→1，2→3，3→5", () => {
    expect(bleedTickDamage(0)).toBe(0);
    expect(bleedTickDamage(1)).toBe(1);
    expect(bleedTickDamage(2)).toBe(3);
    expect(bleedTickDamage(3)).toBe(5);
    expect(bleedTickDamage(4)).toBe(7);
  });

  it("枪：1 格打不出；2/3/4 伤 3/5/8", () => {
    expect(spearReachDamage(1)).toBeNull();
    expect(spearReachDamage(0)).toBeNull();
    expect(spearReachDamage(2)).toBe(3);
    expect(spearReachDamage(3)).toBe(5);
    expect(spearReachDamage(4)).toBe(8);
    expect(spearReachDamage(5)).toBe(8);
  });
});

describe("ROGUE_GRADIENT 起手/光环/轮番", () => {
  it("每系起手 10 张：四攻 + 卸力本系架 + 进步撤步 + 吐纳纳息", () => {
    for (const school of ["saber", "palm", "sword", "spear", "staff", "hook"] as const) {
      const deck = breakStarterDeck(school);
      expect(deck).toHaveLength(10);
      expect(deck).toContain("direct");
      expect(deck).toContain("defend");
      expect(deck).toContain("advance");
      expect(deck).toContain("retreat");
      expect(deck).toContain("mend");
      expect(deck).toContain("inbreath");
      expect(new Set(deck).size).toBe(10);
    }
  });

  it("馆阶轮番人数：1–3 单、4–7 双、8–9 三、10 四", () => {
    expect(breakWaveExtraCount(1)).toBe(0);
    expect(breakWaveExtraCount(3)).toBe(0);
    expect(breakWaveExtraCount(4)).toBe(1);
    expect(breakWaveExtraCount(7)).toBe(1);
    expect(breakWaveExtraCount(8)).toBe(2);
    expect(breakWaveExtraCount(9)).toBe(2);
    expect(breakWaveExtraCount(10)).toBe(3);
  });

  it("刀×拳融合是次绝招，不是 4 格挡废牌", () => {
    const id = fusionCardId("saber", "palm");
    const def = CARDS[id];
    expect(def.cost).toBeGreaterThanOrEqual(2);
    expect((def.damage ?? 0) + (def.block ?? 0)).toBeGreaterThanOrEqual(8);
    expect(def.text).not.toMatch(/^格挡 4/);
  });

  it("同系注入光环卡，异系注入一对融合卡", () => {
    const same = rogueBondCards("saber", ["saber", "saber"]);
    expect(same).toContain("auraSaber");
    const cross = rogueBondCards("saber", ["saber", "palm"]);
    expect(cross.some((id) => String(id).startsWith("fuse"))).toBe(true);
    expect(cross).toHaveLength(2);
  });

  it("换页表有本系架，没有进步→纵步", () => {
    expect(breakCardUpgrade("advance")).toBeUndefined();
    expect(breakCardUpgrade("retreat")).toBeUndefined();
    expect(breakCardUpgrade("defend")).toBe("defend2");
    expect(breakCardUpgrade("wardSaber")).toBe("wardSaber2");
  });
});
