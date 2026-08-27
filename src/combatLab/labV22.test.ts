import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { comboAssistMods } from "../game/comboAssist";
import { battleEquippedSchool } from "../game/equippedWeapon";
import { computeResonance, schoolTier } from "../game/labResonance";
import { setLabMode, setLabTuning } from "../game/labTuning";
import { cardSchool, canMateLearnSchool, stashOrTeach, wielderOf } from "../game/party";
import { makeRun } from "../game/run";
import { canPlay, playCard, swapFighter } from "../game/sim";
import { starterGear } from "../game/weapons";
import { isCardAllowedForWeapon } from "./cardUi";
import { computeAurasFromPreset } from "./setupUi";
import { startLabBattle } from "./factory";
import { BUILTIN_PRESETS } from "./presets";
import type { Battle, CardId, CompanionId } from "../game/types";

function v2Battle(preset: Parameters<typeof startLabBattle>[0]) {
  setLabMode(true);
  setLabTuning({ rulesV2: true });
  return startLabBattle(preset, true);
}

function withCard(b: Battle, id: CardId): Battle {
  return { ...b, hand: [{ uid: "t1", defId: id }], energy: 10 };
}

beforeEach(() => {
  setLabMode(true);
  setLabTuning({ rulesV2: true });
});

afterEach(() => {
  setLabMode(false);
});

describe("v2.2 第二武器 · 共鸣计数", () => {
  it("ladder follows equipped school when weapons change", () => {
    const preset = {
      ...BUILTIN_PRESETS[0]!,
      party: ["rail", "hermit", "watch"],
      fieldMate: "rail" as CompanionId,
      enemyId: "catcher" as const,
      mateWeapons: {
        rail: starterGear("saber"),
        hermit: starterGear("saber"),
        watch: starterGear("sword"),
      },
    };
    expect(computeAurasFromPreset(preset).schools.find((s) => s.school === "saber")?.tier).toBe(1);
    preset.mateWeapons.watch = starterGear("saber");
    expect(computeAurasFromPreset(preset).schools.find((s) => s.school === "saber")?.tier).toBe(2);
  });

  it("tier 2 when third mate equips same school", () => {
    const preset = {
      ...BUILTIN_PRESETS[0]!,
      party: ["rail", "hermit", "watch"],
      fieldMate: "rail" as CompanionId,
      enemyId: "catcher" as const,
      mateWeapons: {
        rail: starterGear("saber"),
        hermit: starterGear("saber"),
        watch: starterGear("sword"),
      },
    };
    expect(computeAurasFromPreset(preset).schools.find((s) => s.school === "saber")?.tier ?? 0).toBe(1);
    preset.mateWeapons.watch = starterGear("saber");
    expect(computeAurasFromPreset(preset).schools.find((s) => s.school === "saber")?.tier).toBe(2);
  });
});

describe("v2.2 第二武器 · 组合助战属性", () => {
  it("spear assist gives range+2; saber gives melee+3 when cross-school", () => {
    expect(comboAssistMods("spear", "palm")?.rangeBonus).toBe(2);
    expect(comboAssistMods("saber", "palm")?.meleeBonus).toBe(3);
  });

  it("same-school assist returns null (v2.5)", () => {
    expect(comboAssistMods("spear", "spear")).toBeNull();
  });

  it("assist mods follow equipped school not primary family", () => {
    let b = v2Battle({
      ...BUILTIN_PRESETS[0]!,
      party: ["guard", "rail"],
      fieldMate: "rail",
      enemyId: "catcher",
      mateWeapons: { guard: starterGear("spear"), rail: starterGear("palm") },
    });
    const field = battleEquippedSchool(b, "rail");
    const assist = battleEquippedSchool(b, "guard");
    expect(comboAssistMods(assist, field)?.rangeBonus).toBe(2);
    b = {
      ...b,
      labMateWeapons: { ...b.labMateWeapons, guard: starterGear("saber") },
    };
    expect(comboAssistMods(battleEquippedSchool(b, "guard"), field)?.meleeBonus).toBe(3);
  });
});

describe("v2.2 第二武器 · 谱系过滤", () => {
  it("recipe filter uses field mate equipped school", () => {
    const saber = starterGear("saber");
    const palm = starterGear("palm");
    expect(isCardAllowedForWeapon("cut", saber)).toBe(true);
    expect(isCardAllowedForWeapon("strike", saber)).toBe(false);
    expect(isCardAllowedForWeapon("strike", palm)).toBe(true);
  });

  it("swap filters hand by swapped-in mate equipped school", () => {
    let b = v2Battle({
      ...BUILTIN_PRESETS[0]!,
      party: ["rail", "hermit"],
      fieldMate: "rail",
      enemyId: "catcher",
      mateWeapons: {
        rail: starterGear("palm"),
        hermit: starterGear("staff"),
      },
    });
    b = swapFighter(b, "hermit");
    const school = battleEquippedSchool(b, "hermit");
    expect(school).toBe("staff");
    for (const c of b.hand) {
      const cs = cardSchool(c.defId);
      expect(cs === "any" || cs === school).toBe(true);
    }
  });
});

describe("v2.2 第二武器 · 谱袋教学", () => {
  it("secondary school cards route to mate with matching secondFamily", () => {
    let run = makeRun("breath", "rail");
    run.party = ["rail"];
    run.active = "rail";
    expect(canMateLearnSchool("rail", "saber")).toBe(true);
    expect(wielderOf(run, "saber")).toBe("rail");
    run = stashOrTeach(run, "cut");
    expect(run.deck).toContain("cut");
  });
});

describe("v2.2 第二武器 · 局内锁定", () => {
  it("cannot change equipped weapon mid-fight via preset fields", () => {
    let b = v2Battle({
      ...BUILTIN_PRESETS[0]!,
      party: ["rail", "hermit"],
      fieldMate: "rail",
      enemyId: "catcher",
      mateWeapons: { rail: starterGear("palm"), hermit: starterGear("saber") },
    });
    const before = b.labMateWeapons?.rail;
    b.labMateWeapons = { ...b.labMateWeapons, rail: starterGear("saber") };
    expect(battleEquippedSchool(b, "rail")).toBe("saber");
    b.labMateWeapons = { ...b.labMateWeapons, rail: before! };
    expect(battleEquippedSchool(b, "rail")).toBe("palm");
  });
});
