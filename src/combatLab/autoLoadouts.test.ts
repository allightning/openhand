import { describe, expect, it } from "vitest";
import { MATES } from "../game/party";
import { schoolFromGearId } from "../game/equippedWeapon";
import {
  AUTO_LOADOUTS,
  applyAutoLoadout,
  autoLoadoutCoverage,
  presetPortrait,
  validateLoadoutPreset,
  weaponIdForMate,
} from "./autoLoadouts";
import { ALL_TECHNIQUE_IDS } from "./arsenal";

describe("§27 配队库 v2 · 12 队", () => {
  it("has exactly 12 loadouts", () => {
    expect(AUTO_LOADOUTS).toHaveLength(12);
  });

  for (const def of AUTO_LOADOUTS) {
    it(`${def.id} normalize 合法`, () => {
      const p = applyAutoLoadout(def.id, 4, 3);
      expect(p.deckRecipe).toHaveLength(20);
      expect(p.party).toHaveLength(4);
      expect(p.party).toContain(p.fieldMate);
      expect(p.labItems).toHaveLength(2);
      expect(presetPortrait(p)).toBe(def.portrait);

      const v = validateLoadoutPreset(p);
      expect(v.ok, v.reasons.join("; ")).toBe(true);
    });

    it(`${def.id} 装备系写入 labMateWeapons`, () => {
      const p = applyAutoLoadout(def.id, 5, 1);
      for (const id of p.party) {
        const spec = def.weapons[id]!;
        expect(spec).toBeTruthy();
        const gear = p.mateWeapons[id]!;
        expect(gear).toBe(weaponIdForMate(id, 5, spec.school, spec.path));
        expect(schoolFromGearId(gear, MATES[id].weapon)).toBe(spec.school);
      }
    });
  }
});

describe("§27 autoLoadoutCoverage", () => {
  it("meets portrait / mate / tech / item / combo assertions", () => {
    const cov = autoLoadoutCoverage();
    expect(cov.mates).toBe(15);
    expect(cov.techniques).toBe(ALL_TECHNIQUE_IDS.length);
    expect(cov.items).toBe(5);
    expect(cov.comboCards).toBe(6);
    expect(cov.portraits).toEqual({
      "4same": 3,
      "3plus1": 2,
      "2plus2": 2,
      "2plus1plus1": 2,
      allDiff: 3,
    });
    expect(cov.ok).toBe(true);
  });
});

describe("§27 品阶/深度 slice", () => {
  it("tech depth slices from priority pool", () => {
    const p1 = applyAutoLoadout("t1-four-palm", 5, 1);
    expect(p1.mateTechs.rail).toEqual(["longPush"]);
    const p3 = applyAutoLoadout("t1-four-palm", 5, 3);
    expect(p3.mateTechs.rail).toEqual(["longPush", "stackHand", "backstep"]);
    expect(p3.mateWeapons.rail).toBe("palm-a-5");
  });
});
