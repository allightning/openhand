import { describe, expect, it } from "vitest";
import {
  echoMonkBeat,
  forgeCoachBeat,
  forgeWrightBeat,
  maskHawkerBeat,
  maskStallBeat,
  sealClerkPuzzleBeat,
  sealHintBeat,
  tideBrokerBeat,
  tidePoetBeat,
} from "./midPuzzles";
import { activePuzzleSides } from "./puzzles";
import { GENERATED_ELITE_IDS, GENERATED_ENEMIES } from "./foeCatalog";
import { ENEMIES, enemyEnergyMax } from "./content";

describe("tide multi-step", () => {
  it("walks poet → broker → poet open", () => {
    const ask = tidePoetBeat({ flags: [], pick: "ask" });
    expect(ask.flags).toContain("pzTide1");
    const take = tidePoetBeat({ flags: ["pzTide1"], pick: "tideTake" });
    expect(take.flags).toEqual(expect.arrayContaining(["pzTidePage"]));
    const match = tideBrokerBeat({ flags: ["pzTide1", "pzTidePage"], pick: "tideOk" });
    expect(match?.flags).toContain("pzTideMatch");
    const open = tidePoetBeat({ flags: ["pzTide1", "pzTidePage", "pzTideMatch"], pick: "tideOpenOk" });
    expect(open.flags).toEqual(expect.arrayContaining(["pzTideDone", "yamenPay8"]));
  });

  it("blocks broker until page is held", () => {
    expect(tideBrokerBeat({ flags: ["pzTide1"], pick: "tideTable" })).toBeNull();
  });
});

describe("echo three knocks", () => {
  it("requires gate → altar → hall", () => {
    const gate = echoMonkBeat({ flags: ["pzEcho1"], pick: "knockGate" });
    expect(gate.flags).toContain("pzEchoGate");
    const altar = echoMonkBeat({ flags: ["pzEcho1", "pzEchoGate"], pick: "knockAltar" });
    expect(altar.flags).toContain("pzEchoAltar");
    const hall = echoMonkBeat({ flags: ["pzEcho1", "pzEchoGate", "pzEchoAltar"], pick: "knockHall" });
    expect(hall.flags).toEqual(expect.arrayContaining(["pzEchoDone"]));
  });

  it("spars on out-of-order hall", () => {
    const bad = echoMonkBeat({ flags: ["pzEcho1"], pick: "knockHall" });
    expect(bad.flags).toContain("pzEchoFail");
    expect(bad.spar).toBe("thug");
  });
});

describe("seal hint gate", () => {
  it("refuses open without hint then accepts after", () => {
    const start = sealClerkPuzzleBeat({ flags: [], pick: "seal" });
    expect(start?.flags).toContain("pzSeal1");
    const early = sealClerkPuzzleBeat({ flags: ["pzSeal1"], pick: "sealOk" });
    expect(early?.flags).toContain("pzSeal1");
    expect(early?.flags ?? []).not.toContain("pzSealDone");
    const hint = sealHintBeat({ flags: ["pzSeal1"], pick: "hint" });
    expect(hint?.flags).toContain("pzSealHint");
    const ok = sealClerkPuzzleBeat({ flags: ["pzSeal1", "pzSealHint"], pick: "sealOk" });
    expect(ok?.flags).toEqual(expect.arrayContaining(["pzSealDone", "yamenPay9"]));
  });
});

describe("mask hear-then-pick", () => {
  it("blocks true pick until three stalls heard", () => {
    const start = maskHawkerBeat({ flags: [], pick: "mask", hubOpen: true });
    expect(start?.flags).toContain("pzMask1");
    const early = maskHawkerBeat({ flags: ["pzMask1"], pick: "maskTrue", hubOpen: true });
    expect(early?.said).toMatch(/听全/);
    expect(early?.flags ?? []).not.toContain("pzMaskDone");
    const salt = maskStallBeat("salt", { flags: ["pzMask1"], pick: "maskHear" });
    expect(salt?.flags).toContain("pzMaskSalt");
    const silk = maskStallBeat("silk", { flags: ["pzMask1", "pzMaskSalt"], pick: "maskHear" });
    expect(silk?.flags).toContain("pzMaskSilk");
    const tea = maskStallBeat("tea", {
      flags: ["pzMask1", "pzMaskSalt", "pzMaskSilk"],
      pick: "maskHear",
    });
    expect(tea?.flags).toContain("pzMaskTea");
    const ok = maskHawkerBeat({
      flags: ["pzMask1", "pzMaskSalt", "pzMaskSilk", "pzMaskTea"],
      pick: "maskTrue",
      hubOpen: true,
    });
    expect(ok?.flags).toEqual(expect.arrayContaining(["pzMaskDone", "yamenPay7"]));
  });
});

describe("forge fire → mat → out", () => {
  it("walks coach → wright → coach out", () => {
    const fire = forgeCoachBeat({ flags: [], pick: "forgeOk", hubOpen: true });
    expect(fire?.flags).toEqual(expect.arrayContaining(["pzForgeFire", "pzForge1"]));
    const mat = forgeWrightBeat({ flags: ["pzForge1", "pzForgeFire"], pick: "forgeMat" });
    expect(mat?.flags).toContain("pzForgeMat");
    const out = forgeCoachBeat({
      flags: ["pzForge1", "pzForgeFire", "pzForgeMat"],
      pick: "forgeOutOk",
      hubOpen: true,
    });
    expect(out?.flags).toEqual(expect.arrayContaining(["pzForgeDone", "yamenPay7"]));
  });

  it("prompts wright only after fire is known", () => {
    expect(forgeWrightBeat({ flags: ["pzForge1"], pick: "forgeMat" })).toBeNull();
  });
});

describe("puzzle quest steps", () => {
  it("advances tide side titles", () => {
    expect(activePuzzleSides(["pzTide1"])[0]?.title).toMatch(/残页/);
    expect(activePuzzleSides(["pzTide1", "pzTidePage"])[0]?.guide).toMatch(/颜牙/);
    expect(activePuzzleSides(["pzTide1", "pzTidePage", "pzTideMatch"])[0]?.title).toMatch(/闸箱/);
  });

  it("advances mask and forge step titles", () => {
    expect(activePuzzleSides(["pzMask1"])[0]?.title).toMatch(/假面.*听三摊/);
    expect(
      activePuzzleSides(["pzMask1", "pzMaskSalt", "pzMaskSilk", "pzMaskTea"])[0]?.title,
    ).toMatch(/认真嘴/);
    expect(activePuzzleSides(["pzForge1"])[0]?.title).toMatch(/认火/);
    expect(activePuzzleSides(["pzForge1", "pzForgeFire"])[0]?.title).toMatch(/取料/);
    expect(activePuzzleSides(["pzForge1", "pzForgeFire", "pzForgeMat"])[0]?.title).toMatch(/出刃/);
  });
});

describe("generated elites", () => {
  it("stamps three mid-road elites with readable patterns", () => {
    expect(GENERATED_ELITE_IDS).toEqual(
      expect.arrayContaining(["mob_road_05", "mob_canal_03", "mob_escortBand_02"]),
    );
    const wind = GENERATED_ENEMIES.mob_road_05;
    expect(wind.elite).toBe("windup");
    expect(wind.pattern[0]?.kind).toBe("windup");
    expect(ENEMIES.mob_canal_03.elite).toBe("stake");
    expect(ENEMIES.mob_escortBand_02.pattern.some((p) => p.kind === "shatter")).toBe(true);
    expect(enemyEnergyMax("mob_road_05")).toBe(10);
    expect(enemyEnergyMax("mob_road_05")).toBeGreaterThan(enemyEnergyMax("mob_road_01"));
  });
});
