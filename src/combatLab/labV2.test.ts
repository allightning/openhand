import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { ENEMIES } from "../game/content";
import { setLabMode, setLabTuning } from "../game/labTuning";
import { addQi, clearQi, commitV2EndTurn, emptyV2Turn, previewBrokenSegments } from "../game/labV2";
import { QI_MAX, QI_BURST_DMG, GRUDGE_NORMAL } from "../game/labV2Constants";
import { simV2ChooseIntent, simV2OnHitPlayer } from "../game/simV2Hooks";
import { evalWeakness } from "../game/intentWeakness";
import {
  canPlay,
  cloneBattle,
  endTurn,
  makeBattle,
  playCard,
  previewCard,
} from "../game/sim";
import { makeRun } from "../game/run";
import { startLabBattle } from "./factory";
import { labSwapFighter } from "./labCombat";
import { computeAuras } from "../game/labV21";
import { BUILTIN_PRESETS } from "./presets";

function v2Battle(enemyId: "catcher" | "escort" = "catcher") {
  setLabMode(true);
  setLabTuning({ rulesV2: true, v2Fx: false, v2VariantAi: true, v2Grudge: true });
  return startLabBattle({ ...BUILTIN_PRESETS[0]!, enemyId }, true);
}

beforeEach(() => {
  setLabMode(true);
  setLabTuning({ rulesV2: true });
});

afterEach(() => {
  setLabMode(false);
});

describe("Combat v2 势", () => {
  it("adds qi up to cap", () => {
    const b = v2Battle();
    addQi(b, 3);
    expect(b.qi).toBe(3);
    addQi(b, 99);
    expect(b.qi).toBe(QI_MAX);
  });

  it("clears qi on pierce only (§2.2 v2.3)", () => {
    const b = v2Battle();
    b.qi = 4;
    simV2OnHitPlayer(b, 0);
    expect(b.qi).toBe(4);
    simV2OnHitPlayer(b, 2);
    expect(b.qi).toBe(0);
    expect(b.v2QiClearCount).toBe(1);
  });

  it("clears qi helper", () => {
    const b = v2Battle();
    b.qi = 4;
    clearQi(b);
    expect(b.qi).toBe(0);
  });

  it("setup delays qi to next turn", () => {
    let b = v2Battle();
    b.v2PendingQi = 2;
    b.v2Turn = emptyV2Turn(b);
    b = endTurn(b);
    expect(b.qi).toBeGreaterThanOrEqual(2);
  });

  it("finisher consumes qi for burst", () => {
    let b = v2Battle();
    b.qi = 3;
    const fin = b.hand.find((c) => c.defId === "finisher" || c.defId === "setup");
    if (!fin) {
      b.qi = 2;
      const gather = b.hand.find((c) => c.defId === "gather" || c.defId === "combo");
      if (gather) b = playCard(b, gather.uid);
    }
    b.qi = 3;
    const f = b.hand.find((c) => c.defId === "finisher");
    if (!f) return;
    const prev = previewCard(b, f.uid);
    b = playCard(b, f.uid);
    expect(b.qi).toBe(0);
    expect(prev.legal).toBe(true);
  });

  it("gather maps to qi in v2", () => {
    let b = v2Battle();
    const g = b.hand.find((c) => c.defId === "gather");
    if (!g) return;
    b = playCard(b, g.uid);
    expect(b.qi).toBeGreaterThan(0);
  });
});

describe("Combat v2 破招", () => {
  it("breaks strike when move card played", () => {
    const b = v2Battle();
    b.intents = [{ kind: "strike", damage: 10 }];
    b.v2Turn = { ...emptyV2Turn(b), moveCardPlayed: true, endTurnCommitted: true, endBlock: 0, endEnergy: 5, endDist: 2 };
    expect(evalWeakness(b.intents[0]!, b, b.v2Turn!, "preview")).toBe(true);
  });

  it("does not break strike without move", () => {
    const b = v2Battle();
    b.intents = [{ kind: "strike", damage: 10 }];
    b.v2Turn = { ...emptyV2Turn(b), endTurnCommitted: true, endBlock: 0, endEnergy: 5, endDist: 2 };
    expect(evalWeakness(b.intents[0]!, b, b.v2Turn!, "preview")).toBe(false);
  });

  it("§31.8/§31.14 lunge 收势远距只是「让」（软拆半效），不算硬拆", () => {
    const b = v2Battle("escort");
    b.intents = [{ kind: "lunge", damage: 12 }];
    // §31.14 开局先在抢步圈里（敌贴脸 4，锁定格 3，落点覆盖 3-5），收势撤出且没位移牌 = 让
    b.player.pos = 3;
    b.enemy.pos = 4;
    b.v2Turn = emptyV2Turn(b);
    b.player.pos = 1;
    commitV2EndTurn(b);
    expect(previewBrokenSegments(b)).not.toContain(0);
    expect(b.v2GrazePreview).toContain(0);
  });

  for (const kind of ["windup", "guard", "mend"] as const) {
    it(`evaluates ${kind} weakness`, () => {
      const b = v2Battle();
      const intent =
        kind === "windup"
          ? { kind: "windup" as const }
          : kind === "guard"
            ? { kind: "guard" as const, block: 8 }
            : { kind: "mend" as const, heal: 8 };
      b.v2Turn = { ...emptyV2Turn(b), endTurnCommitted: true, endBlock: 0, endEnergy: 5, endDist: 2 };
      if (kind === "windup") b.v2Turn!.hitFoeThisTurn = true;
      if (kind === "guard") b.v2Turn!.antiGuardPlayed = true;
      if (kind === "mend") b.mark = 2;
      expect(evalWeakness(intent, b, b.v2Turn!, "preview")).toBe(true);
    });
  }
});

describe("Combat v2 换人", () => {
  it("allows play same turn after swap", () => {
    const preset = BUILTIN_PRESETS.find((p) => p.party.length >= 2)!;
    let b = startLabBattle(preset, true);
    const bench = b.bench[0]!.id;
    b = labSwapFighter(b, bench);
    expect(b.labFreshSwap).toBeFalsy();
    expect(b.labEntranceActive).toBe(true);
    const card = b.hand[0];
    if (card) expect(canPlay(b, card.uid).ok).toBe(true);
  });

  it("resonance tier 1 auto-applies with two same-school on team", () => {
    let b = startLabBattle(
      {
        ...BUILTIN_PRESETS[0]!,
        party: ["rail", "hermit"],
        fieldMate: "rail",
        enemyId: "catcher",
      },
      true,
    );
    const auras = computeAuras(b);
    expect(auras.basic).toBe(true);
    expect(auras.schools.find((s) => s.school === "palm")?.tier).toBe(1);
  });
});

describe("Combat v2 鏖战", () => {
  it("ramps damage after threshold", () => {
    let b = v2Battle();
    b.turn = GRUDGE_NORMAL + 1;
    b.v2GrudgeBonus = 0;
    b = endTurn(b);
    expect(b.v2GrudgeBonus).toBeGreaterThan(0);
  });
});

describe("Combat v2 变招", () => {
  it("boss has alternate pattern set", () => {
    expect(ENEMIES.lord.patternSets?.length).toBeGreaterThan(0);
  });

  it("deprioritizes kind broken twice", () => {
    const b = v2Battle();
    b.v2BreakByKind = { strike: 2 };
    const picked = { kind: "strike" as const, damage: 18 };
    const alt = simV2ChooseIntent(b, picked);
    expect(alt.kind).not.toBe("strike");
  });
});

describe("Combat v2 拆招练习房", () => {
  it("spawns catcher and escort", () => {
    const preset = BUILTIN_PRESETS.find((p) => p.id === "break-practice")!;
    const b = startLabBattle(preset, true);
    expect(b.foes.length).toBeGreaterThanOrEqual(2);
    expect(b.foes.some((f) => f.id === "catcher")).toBe(true);
    expect(b.foes.some((f) => f.id === "escort")).toBe(true);
  });
});

describe("Combat v2 三系统迁移", () => {
  it("combo card adds qi not combo layer", () => {
    let b = v2Battle();
    const c = b.hand.find((x) => x.defId === "combo");
    if (!c) return;
    b = playCard(b, c.uid);
    expect(b.qi).toBeGreaterThan(0);
    expect(b.combo).toBe(0);
  });
});
