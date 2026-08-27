import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { canCallAssist, retreatAssistIfDown } from "../game/labAssist";
import { simV2OnHitPlayer } from "../game/simV2Hooks";
import { setLabMode, setLabTuning } from "../game/labTuning";
import { balanceReport, startTelemetry } from "./telemetry";
import { startLabBattle } from "./factory";
import { BUILTIN_PRESETS } from "./presets";
import type { Battle } from "../game/types";

function v2Battle() {
  setLabMode(true);
  setLabTuning({ rulesV2: true });
  return startLabBattle({ ...BUILTIN_PRESETS[0]!, enemyId: "catcher" }, true);
}

beforeEach(() => {
  setLabMode(true);
  setLabTuning({ rulesV2: true });
});

afterEach(() => {
  setLabMode(false);
});

describe("v2.3 §16.2 助战濒死", () => {
  it("retreats assist at 0 hp and bans further assists", () => {
    let b: Battle = {
      ...v2Battle(),
      labAssistActive: "hermit",
      bench: [{ id: "hermit", hp: 0, maxHp: 20 }],
      journal: [],
    };
    b = retreatAssistIfDown(b);
    expect(b.labAssistActive).toBeUndefined();
    expect(b.labAssistBanned).toBe(true);
    expect(canCallAssist(b).ok).toBe(false);
  });
});

describe("v2.3 §24 埋点清单", () => {
  it("balance report includes audit table", () => {
    const tel = startTelemetry({
      presetId: "t",
      presetName: "test",
      designerMode: true,
      startedAt: Date.now(),
    });
    expect(balanceReport(tel)).toContain("§24 死穴审计");
    expect(balanceReport(tel)).toContain("绝招卡手率");
  });

  it("init audit counters on lab battle start", () => {
    const b = v2Battle();
    expect(b.v2QiTurnSamples).toBe(0);
    expect(b.v2SecondaryWeaponEquip).toBeDefined();
    expect(b.labAssistBanned).toBe(false);
  });
});

describe("v2.3 §2.2 势穿盾", () => {
  it("simV2OnHitPlayer ignores zero pierce", () => {
    const b = v2Battle();
    b.qi = 3;
    simV2OnHitPlayer(b, 0);
    expect(b.qi).toBe(3);
  });
});
