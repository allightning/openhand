import { describe, expect, it } from "vitest";
import { weaponArt, weaponSrc } from "./weaponArt";
import { GEAR_WEAPONS } from "../game/weapons";
import { martialOffers, MARTIAL_LESSONS } from "../game/lessons";

describe("weapon art", () => {
  it("uses a school plate for every named gear weapon", () => {
    expect(GEAR_WEAPONS.length).toBe(60);
    for (const g of GEAR_WEAPONS) {
      const html = weaponArt(g.id);
      expect(html).toContain("weapon-art");
      expect(html).toContain(weaponSrc(g.school));
      expect(html).toContain(g.name);
      expect(html).toContain(`>${g.grade}<`);
    }
  });
});

describe("martial lessons", () => {
  it("hides already owned techniques from the catalog", () => {
    const all = martialOffers([]);
    expect(all.length).toBe(MARTIAL_LESSONS.length);
    const rest = martialOffers(["longPush", "backstep"]);
    expect(rest.every((l) => l.id !== "longPush" && l.id !== "backstep")).toBe(true);
  });
});
