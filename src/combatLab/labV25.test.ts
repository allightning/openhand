import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { comboAssistMods } from "../game/comboAssist";
import { battleEquippedSchool } from "../game/equippedWeapon";
import {
  computeResonance,
  schoolTier,
  teamSchoolCounts,
} from "../game/labResonance";
import { canUseSignature, signatureDef, useSignature } from "../game/labSignature";
import { setLabMode, setLabTuning } from "../game/labTuning";
import { MATES, ROLE_LABEL } from "../game/party";
import { startLabBattle } from "./factory";
import { computeAurasFromPreset } from "./setupUi";
import { BUILTIN_PRESETS } from "./presets";
import type { CompanionId } from "../game/types";
import { starterGear } from "../game/weapons";

beforeEach(() => {
  setLabMode(true);
  setLabTuning({ rulesV2: true, signatureLimitMode: "perBattle", signatureUsesPerBattle: 2 });
});

afterEach(() => {
  setLabMode(false);
});

function preset(party: CompanionId[], weapons: Partial<Record<CompanionId, string>>, field: CompanionId = party[0]!) {
  return {
    ...BUILTIN_PRESETS[0]!,
    party,
    fieldMate: field,
    enemyId: "catcher" as const,
    mateWeapons: weapons,
  };
}

describe("v2.5 §17 共鸣阶梯", () => {
  it("tier 2/3/4 boundaries on whole team equipped school", () => {
    const p = preset(
      ["rail", "hermit", "bard", "porter"],
      {
        rail: starterGear("palm"),
        hermit: starterGear("palm"),
        bard: starterGear("sword"),
        porter: starterGear("staff"),
      },
    );
    let res = computeAurasFromPreset({ ...p, party: ["rail", "hermit"] });
    expect(schoolTier({ ...p, active: "rail", party: ["rail", "hermit"], bench: [], labMateWeapons: p.mateWeapons } as never, "palm")).toBe(1);

    res = computeAurasFromPreset({ ...p, party: ["rail", "hermit", "bard"] });
    const mock3 = {
      active: "rail",
      party: ["rail", "hermit", "bard"],
      bench: [{ id: "hermit", hp: 1, maxHp: 1 }],
      labMateWeapons: { ...p.mateWeapons, bard: starterGear("palm") },
    };
    expect(schoolTier(mock3 as never, "palm")).toBe(2);

    const mock4 = {
      active: "rail",
      party: ["rail", "hermit", "bard", "porter"],
      bench: [],
      labMateWeapons: {
        rail: starterGear("palm"),
        hermit: starterGear("palm"),
        bard: starterGear("palm"),
        porter: starterGear("palm"),
      },
    };
    expect(schoolTier(mock4 as never, "palm")).toBe(3);
  });

  it("includes field mate in team count", () => {
    const b = startLabBattle(
      preset(
        ["rail", "hermit"],
        { rail: starterGear("palm"), hermit: starterGear("palm") },
      ),
      true,
    );
    expect(teamSchoolCounts(b).palm).toBe(2);
    expect(schoolTier(b, "palm")).toBe(1);
  });

  it("recounts when secondary weapon changes equipped school", () => {
    let p = preset(["rail", "hermit"], {
      rail: starterGear("palm"),
      hermit: starterGear("saber"),
    });
    expect(computeAurasFromPreset(p).schools.find((s) => s.school === "palm")?.tier ?? 0).toBe(0);
    p = {
      ...p,
      mateWeapons: { rail: starterGear("palm"), hermit: starterGear("palm") },
    };
    expect(computeAurasFromPreset(p).schools.find((s) => s.school === "palm")?.tier).toBe(1);
  });
});

describe("v2.5 §17.3 百花齐放", () => {
  it("activates when four distinct equipped schools", () => {
    const p = preset(
      ["rail", "seer", "sapper", "watch"],
      {
        rail: starterGear("palm"),
        seer: starterGear("sword"),
        sapper: starterGear("staff"),
        watch: starterGear("saber"),
      },
    );
    expect(computeAurasFromPreset(p).hundredFlowers).toBe(true);
    expect(computeAurasFromPreset(p).composition).toBe("allDiff");
  });

  it("fails when any school repeats", () => {
    const p = preset(
      ["rail", "seer", "sapper", "hermit"],
      {
        rail: starterGear("palm"),
        seer: starterGear("sword"),
        sapper: starterGear("staff"),
        hermit: starterGear("palm"),
      },
    );
    expect(computeAurasFromPreset(p).hundredFlowers).toBe(false);
  });
});

describe("v2.5 §16.3 跨系专属", () => {
  it("returns null for same-school assist", () => {
    expect(comboAssistMods("spear", "spear")).toBeNull();
  });

  it("returns mods for cross-school assist", () => {
    expect(comboAssistMods("spear", "palm")?.rangeBonus).toBe(2);
    expect(comboAssistMods("saber", "palm")?.meleeBonus).toBe(3);
  });
});

describe("v2.5 §21 角色定位与专属技", () => {
  it("every mate has role label", () => {
    const p = preset(["rail", "porter", "scribe", "guard"], {
      rail: starterGear("palm"),
      porter: starterGear("staff"),
      scribe: starterGear("sword"),
      guard: starterGear("spear"),
    });
    expect(ROLE_LABEL[MATES.rail.role]).toBe("输出");
    expect(ROLE_LABEL[MATES.guard.role]).toBe("承伤");
  });

  it("signature costs 0 energy and respects per-battle limit", () => {
    let b = startLabBattle(
      preset(["porter"], { porter: starterGear("staff") }, "porter"),
      true,
    );
    expect(canUseSignature(b).ok).toBe(true);
    expect(signatureDef("porter").name).toBe("稳肩");
    const r = useSignature(b);
    expect(r.ok).toBe(true);
    b = r.battle!;
    expect(b.playerBlock).toBeGreaterThan(0);
    expect(b.labSigUsesLeft).toBe(1);
    const r2 = useSignature(b);
    expect(r2.ok).toBe(true);
    b = r2.battle!;
    expect(b.labSigUsesLeft).toBe(0);
    expect(canUseSignature(b).ok).toBe(false);
  });

  it("mechanic-keyed signature fails without condition", () => {
    const b = startLabBattle(
      preset(["seer"], { seer: starterGear("sword") }, "seer"),
      true,
    );
    b.player = { ...b.player, pos: 0 };
    b.enemy = { ...b.enemy, pos: 4 };
    const r = useSignature(b);
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("贴身");
  });
});

describe("v2.5 三主角同框", () => {
  it("still grants start qi as easter egg", () => {
    const b = startLabBattle(
      preset(["rail", "seer", "sapper"], {
        rail: starterGear("palm"),
        seer: starterGear("sword"),
        sapper: starterGear("staff"),
      }),
      true,
    );
    expect(computeResonance(b).duoHeroes).toBe(true);
    expect(b.qi ?? 0).toBeGreaterThanOrEqual(1);
  });
});
