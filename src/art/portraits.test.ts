import { describe, expect, it } from "vitest";
import { combatBg, standFile } from "./portraits";

describe("stand casting", () => {
  it("keeps the general plate on the gate lord, not the roadside watch", () => {
    expect(standFile("lord")).toBe("lord");
    expect(standFile("warden")).toBe("escort");
    expect(standFile("nametaker")).toBe("lord");
  });

  it("gives dock and alley hands labor or night plates, not escorts", () => {
    expect(standFile("raider")).toBe("alley");
    expect(standFile("thug")).toBe("alley");
    expect(standFile("intruder")).toBe("guest");
    expect(standFile("smuggler")).toBe("salt");
    expect(standFile("brute")).toBe("hauler");
  });

  it("keeps party faces off road foes and strangers", () => {
    expect(standFile("seer")).not.toBe(standFile("inkhand"));
    expect(standFile("seer")).not.toBe(standFile("bookcut"));
    expect(standFile("sapper")).not.toBe(standFile("stakeboss"));
    expect(standFile("sapper")).not.toBe(standFile("brute"));
    expect(standFile("watch")).not.toBe(standFile("warden"));
    expect(standFile("watch")).not.toBe(standFile("warder"));
    expect(standFile("boat")).not.toBe(standFile("fisher"));
    expect(standFile("porter")).not.toBe(standFile("vendor"));
    expect(standFile("porter")).not.toBe(standFile("carter"));
    expect(standFile("hermit")).not.toBe(standFile("lamper"));
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
