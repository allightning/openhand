import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { CARDS } from "../game/content";
import {
  assistEnergyCost,
  callAssist,
  canCallAssist,
  isComboRulesEnabled,
  pickAssistPos,
  retreatAssistIfDown,
} from "../game/labAssist";
import {
  comboCardSchool,
  comboPlayGate,
  isComboCard,
} from "../game/labCombo";
import { comboAssistMods } from "../game/comboAssist";
import { setLabMode, setLabTuning } from "../game/labTuning";
import { canPlay, playCard } from "../game/sim";
import { startLabBattle } from "./factory";
import { BUILTIN_PRESETS } from "./presets";

function comboBattle() {
  setLabMode(true);
  setLabTuning({ rulesV2: true, rulesCombo: true, v2Fx: false });
  return startLabBattle(
    {
      ...BUILTIN_PRESETS[0]!,
      party: ["rail", "hermit"],
      fieldMate: "rail",
      deckRecipe: ["strike", "comboPalm", "defend"],
      enemyId: "catcher",
    },
    true,
  );
}

beforeEach(() => setLabMode(true));
afterEach(() => setLabMode(false));

describe("§16 labTuning 总开关", () => {
  it("rulesCombo off keeps v2.5 baseline", () => {
    setLabTuning({ rulesV2: true, rulesCombo: false });
    expect(isComboRulesEnabled()).toBe(false);
    setLabMode(true);
    const b = startLabBattle({ ...BUILTIN_PRESETS[0]!, enemyId: "catcher" }, true);
    expect(canCallAssist(b).ok).toBe(false);
  });

  it("rulesCombo on enables assist", () => {
    setLabTuning({ rulesV2: true, rulesCombo: true });
    expect(isComboRulesEnabled()).toBe(true);
  });
});

describe("§16.1 助战占格", () => {
  it("places assist on adjacent free cell", () => {
    let b = comboBattle();
    b.energy = 5;
    b.player.pos = 2;
    expect(pickAssistPos(b)).toBe(1);
    b = callAssist(b, "hermit");
    expect(b.labAssistActive).toBe("hermit");
    expect(b.labAssistPos).toBe(1);
    expect(b.labAssistCalls).toBe(1);
  });

  it("blocks swap same turn as assist intent", () => {
    const b = comboBattle();
    b.swappedThisTurn = true;
    expect(canCallAssist(b, "hermit").ok).toBe(false);
  });

  it("百花减助战耗劲", () => {
    let b = comboBattle();
    b.v2HundredFlowers = true;
    expect(assistEnergyCost(b)).toBe(1);
  });
});

describe("§16.3 跨系专属", () => {
  it("same school returns null", () => {
    expect(comboAssistMods("palm", "palm")).toBeNull();
  });

  it("cross school palm+spear range", () => {
    expect(comboAssistMods("spear", "palm")?.rangeBonus).toBe(2);
  });
});

describe("§16.4 同门合击卡", () => {
  it("six school combo cards registered", () => {
    for (const id of ["comboPalm", "comboSaber", "comboSpear", "comboSword", "comboStaff", "comboHook"] as const) {
      expect(isComboCard(id)).toBe(true);
      expect(CARDS[id].requiresAssist).toBe(true);
      expect(comboCardSchool(id)).toBeTruthy();
    }
  });

  it("§31.12 v2 组合技看后场异系同行：无对应系同行则锁住", () => {
    const b = comboBattle();
    // rail(拳) 在场，后场换成 watch(刀)：拳系组合卡无人可合
    b.bench = [{ id: "watch", hp: 20, maxHp: 20, hand: [], drawPile: [], discardPile: [] }];
    expect(comboPlayGate(b, "comboPalm").ok).toBe(false);
    b.hand.push({ uid: "t-x", defId: "comboPalm" });
    expect(canPlay(b, "t-x").ok).toBe(false);
  });

  it("§31.12 v2 组合技：后场有该系同行即可打（不需叫上场）", () => {
    const b = comboBattle();
    b.energy = 5;
    // 后场 hermit 是拳系 → comboPalm 直接可打
    expect(b.bench.some((m) => m.id === "hermit")).toBe(true);
    b.hand.push({ uid: "t-combo", defId: "comboPalm" });
    expect(comboPlayGate(b, "comboPalm").ok).toBe(true);
    expect(canPlay(b, "t-combo").ok).toBe(true);
  });
});

describe("§16.2 濒死退场", () => {
  it("retreats at 0 hp", () => {
    let b = comboBattle();
    b.labAssistActive = "hermit";
    b.bench = [{ id: "hermit", hp: 0, maxHp: 20 }];
    b = retreatAssistIfDown(b);
    expect(b.labAssistBanned).toBe(true);
  });
});

describe("§17.3 百花首张组合卡减劲", () => {
  it("first combo card costs 1 less", () => {
    let b = comboBattle();
    b.v2HundredFlowers = true;
    b.energy = 2;
    b = callAssist(b, "hermit");
    b.hand.push({ uid: "t-combo2", defId: "comboPalm" });
    expect(canPlay(b, "t-combo2").ok).toBe(true);
    b = playCard(b, "t-combo2");
    expect(b.labComboCardPlayedThisTurn).toBe(true);
    expect(b.labComboCardsPlayed).toBe(1);
  });
});
