import { describe, expect, it } from "vitest";
import { combatBg, standFile } from "./portraits";

describe("stand casting", () => {
  it("keeps the general plate on the gate lord, not the roadside watch", () => {
    expect(standFile("lord")).toBe("lord");
    expect(standFile("warden")).toBe("watch");
    expect(standFile("nametaker")).toBe("scribe");
  });

  it("gives dock and alley hands labor or night plates, not escorts", () => {
    expect(standFile("raider")).toBe("hauler");
    expect(standFile("thug")).toBe("alley");
    expect(standFile("intruder")).toBe("guest");
    expect(standFile("smuggler")).toBe("salt");
    expect(standFile("brute")).toBe("piler");
  });
});

describe("combat grounds", () => {
  it("picks a yard, harbor, or hold plate from the place, not one courtyard for all", () => {
    expect(combatBg("ridge")).toMatch(/combat-yard/);
    expect(combatBg("wharf")).toMatch(/combat-harbor/);
    expect(combatBg("lane")).toMatch(/combat-lane/);
    expect(combatBg("customs")).toMatch(/combat-court/);
    expect(combatBg("hold")).toMatch(/combat-hold/);
    expect(combatBg("hut")).toMatch(/combat-hold/);
  });
});
