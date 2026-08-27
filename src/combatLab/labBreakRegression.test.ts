import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { DEFAULT_WEAKNESS, evalWeakness, MOVE_CARD_IDS } from "../game/intentWeakness";
import {
  commitV2EndTurn,
  emptyV2Turn,
  previewBrokenSegments,
  shouldBreakIntent,
} from "../game/labV2";
import { setLabMode, setLabTuning } from "../game/labTuning";
import type { Battle, Intent, V2TurnFlags } from "../game/types";
import { startLabBattle } from "./factory";
import { BUILTIN_PRESETS } from "./presets";

function v2Battle(): Battle {
  setLabMode(true);
  setLabTuning({ rulesV2: true, v2Fx: false });
  return startLabBattle({ ...BUILTIN_PRESETS[0]!, enemyId: "catcher" }, true);
}

function flags(b: Battle, patch: Partial<V2TurnFlags> = {}): V2TurnFlags {
  return { ...emptyV2Turn(b), ...patch };
}

/** §4.3 全表 16 意图 — 每型正/反例 + D4 预览/结算一致（bleedcut 除外）。 */
const INTENT_KINDS = Object.keys(DEFAULT_WEAKNESS) as Intent["kind"][];

beforeEach(() => setLabMode(true));
afterEach(() => setLabMode(false));

describe("§4.3 DEFAULT_WEAKNESS 全表映射", () => {
  it("covers all 16 intent kinds", () => {
    expect(INTENT_KINDS).toHaveLength(16);
    for (const kind of INTENT_KINDS) {
      expect(DEFAULT_WEAKNESS[kind]?.kind).toBeTruthy();
    }
  });
});

describe("§4.3 破绽条件 · 正例", () => {
  const positive: Array<{
    name: string;
    intent: Intent;
    setup: (b: Battle, f: V2TurnFlags) => void;
    phase?: "preview" | "resolve";
    resolveCtx?: { bleedcutRaw?: number; bleedcutBlocked?: number };
  }> = [
    { name: "strike·位移牌", intent: { kind: "strike", damage: 10 }, setup: (_, f) => { f.moveCardPlayed = true; } },
    { name: "charge·场上有桩", intent: { kind: "charge", damage: 8, steps: 2 }, setup: (b) => { b.stakes = [3]; } },
    {
      name: "charge·收势未动",
      intent: { kind: "charge", damage: 8, steps: 2 },
      setup: (_, f) => { f.stoodStill = true; f.endTurnCommitted = true; },
    },
    { name: "stake·分桩", intent: { kind: "stake" }, setup: (_, f) => { f.plantStakePlayed = true; } },
    { name: "pull·贴身攻", intent: { kind: "pull", steps: 1 }, setup: (_, f) => { f.adjacentAttackHit = true; } },
    { name: "trap·未踩格", intent: { kind: "trap" }, setup: (b) => { b.traps = [4]; b.player.pos = 2; } },
    { name: "windup·本回命中", intent: { kind: "windup" }, setup: (_, f) => { f.hitFoeThisTurn = true; } },
    {
      name: "lunge·收势远距",
      intent: { kind: "lunge", damage: 12 },
      setup: (b, f) => { f.endTurnCommitted = true; f.endDist = 3; b.player.pos = 0; b.enemy.pos = 3; },
    },
    {
      name: "swap·收势有格挡",
      intent: { kind: "swap" },
      setup: (b, f) => { f.endTurnCommitted = true; f.endBlock = 5; b.playerBlock = 5; },
    },
    {
      name: "barrage·格挡≥8",
      intent: { kind: "barrage", damage: 4, hits: 3 },
      setup: (_, f) => { f.endTurnCommitted = true; f.endBlock = 8; },
    },
    { name: "guard·破盾牌", intent: { kind: "guard", block: 8 }, setup: (_, f) => { f.antiGuardPlayed = true; } },
    {
      name: "bleedcut·全格挡",
      intent: { kind: "bleedcut", damage: 10, bleed: 2 },
      setup: () => {},
      phase: "resolve",
      resolveCtx: { bleedcutRaw: 10, bleedcutBlocked: 10 },
    },
    { name: "counter·未攻击", intent: { kind: "counter", form: "slash" }, setup: (_, f) => { f.attackPlayed = false; } },
    { name: "mend·点穴≥2", intent: { kind: "mend", heal: 8 }, setup: (b) => { b.mark = 2; } },
    {
      name: "seal·收势劲≥3",
      intent: { kind: "seal" },
      setup: (b, f) => { f.endTurnCommitted = true; f.endEnergy = 4; b.energy = 4; },
    },
    {
      name: "shatter·收势无格挡",
      intent: { kind: "shatter", amount: 12 },
      setup: (_, f) => { f.endTurnCommitted = true; f.endBlock = 0; },
    },
    { name: "breathe·贴身攻", intent: { kind: "breathe", amount: 6 }, setup: (_, f) => { f.adjacentAttackHit = true; } },
  ];

  for (const row of positive) {
    it(row.name, () => {
      const b = v2Battle();
      const f = flags(b);
      row.setup(b, f);
      const phase = row.phase ?? "preview";
      expect(evalWeakness(row.intent, b, f, phase, row.resolveCtx)).toBe(true);
    });
  }
});

describe("§4.3 破绽条件 · 反例", () => {
  const negative: Array<{ name: string; intent: Intent; setup: (b: Battle, f: V2TurnFlags) => void }> = [
    { name: "strike·无位移", intent: { kind: "strike", damage: 10 }, setup: () => {} },
    { name: "charge·无桩且移动", intent: { kind: "charge", damage: 8, steps: 2 }, setup: (_, f) => { f.stoodStill = false; f.endTurnCommitted = true; } },
    { name: "stake·未分桩", intent: { kind: "stake" }, setup: () => {} },
    { name: "pull·未贴身攻", intent: { kind: "pull", steps: 1 }, setup: () => {} },
    { name: "trap·踩中", intent: { kind: "trap" }, setup: (b) => { b.traps = [2]; b.player.pos = 2; } },
    { name: "windup·未命中", intent: { kind: "windup" }, setup: () => {} },
    {
      name: "lunge·贴身收势",
      intent: { kind: "lunge", damage: 12 },
      setup: (b, f) => { f.endTurnCommitted = true; f.endDist = 1; b.player.pos = 2; b.enemy.pos = 3; },
    },
    {
      name: "swap·收势无格挡",
      intent: { kind: "swap" },
      setup: (_, f) => { f.endTurnCommitted = true; f.endBlock = 0; },
    },
    {
      name: "barrage·格挡不足",
      intent: { kind: "barrage", damage: 4, hits: 3 },
      setup: (_, f) => { f.endTurnCommitted = true; f.endBlock = 5; },
    },
    { name: "guard·未破盾", intent: { kind: "guard", block: 8 }, setup: () => {} },
    { name: "bleedcut·预览永假", intent: { kind: "bleedcut", damage: 10, bleed: 2 }, setup: () => {} },
    { name: "counter·已攻击", intent: { kind: "counter", form: "slash" }, setup: (_, f) => { f.attackPlayed = true; } },
    { name: "mend·点穴不足", intent: { kind: "mend", heal: 8 }, setup: (b) => { b.mark = 1; } },
    {
      name: "seal·劲不足",
      intent: { kind: "seal" },
      setup: (_, f) => { f.endTurnCommitted = true; f.endEnergy = 2; },
    },
    {
      name: "shatter·仍有格挡",
      intent: { kind: "shatter", amount: 12 },
      setup: (_, f) => { f.endTurnCommitted = true; f.endBlock = 4; },
    },
    { name: "breathe·未贴身攻", intent: { kind: "breathe", amount: 6 }, setup: () => {} },
  ];

  for (const row of negative) {
    it(row.name, () => {
      const b = v2Battle();
      const f = flags(b);
      row.setup(b, f);
      expect(evalWeakness(row.intent, b, f, "preview")).toBe(false);
    });
  }
});

describe("§4.3 D4 · 预览与结算", () => {
  it("bleedcut 预览 false、结算 true（全格挡）", () => {
    const b = v2Battle();
    const intent: Intent = { kind: "bleedcut", damage: 8, bleed: 2 };
    const f = flags(b);
    expect(evalWeakness(intent, b, f, "preview")).toBe(false);
    expect(
      evalWeakness(intent, b, f, "resolve", { bleedcutRaw: 8, bleedcutBlocked: 8 }),
    ).toBe(true);
    expect(shouldBreakIntent(b, intent, 0, { bleedcutRaw: 8, bleedcutBlocked: 8 })).toBe(true);
  });

  it("§31.9/§31.14 空间版：预览=计划=结算语义（出红格+充能=破，出红格=让，架类耗破架充能）", () => {
    const b = v2Battle();
    b.intents = [
      { kind: "strike", damage: 10 },
      { kind: "lunge", damage: 12 },
      { kind: "guard", block: 8 },
    ];
    // §31.14 打击红格 = 兵刃圈（敌 4 覆盖 3-5）；开局站 3 = 在圈里，才谈得上拆
    b.player.pos = 3;
    b.enemy.pos = 4;
    b.v2Turn = flags(b, { moveCardPlayed: true, antiGuardPlayed: true, moveCharges: 1, antiGuardCharges: 1 });
    b.player.pos = 1; // 收势撤到第 1 格：打击圈（3-5）外；抢步锁定格 3（贴脸，落点 4，覆盖 3-5）也在圈外
    commitV2EndTurn(b);
    const preview = previewBrokenSegments(b);
    expect(preview).toContain(0); // strike 出红圈 + 位移充能 = 硬拆
    expect(preview).toContain(2); // guard 耗 1 破架充能
    expect(preview).not.toContain(1); // lunge 出圈但充能已被 strike 用掉 = 让
    expect(b.v2GrazePreview).toContain(1);
  });

  it("§31.9 还在红圈里：动了也不算拆", () => {
    const b = v2Battle();
    b.intents = [{ kind: "strike", damage: 10 }];
    b.player.pos = 0;
    b.enemy.pos = 3;
    b.v2Turn = flags(b, { moveCardPlayed: true, moveCharges: 1 });
    // 原地：收势位置 = 锁定格（0），在红圈里 → 不破，充能也不消耗
    commitV2EndTurn(b);
    expect(previewBrokenSegments(b)).toEqual([]);
  });

  it("§31.8 v3 充能稀缺：一张位移牌只够拆一段打击", () => {
    const b = v2Battle();
    b.intents = [
      { kind: "strike", damage: 10 },
      { kind: "strike", damage: 10 },
    ];
    // §31.14 敌 3 的打击圈覆盖 2-4：开局站 2 在圈里，收势撤到 0 出圈
    b.player.pos = 2;
    b.enemy.pos = 3;
    b.v2Turn = flags(b, { moveCardPlayed: true, moveCharges: 1 });
    b.player.pos = 0; // 出红圈
    commitV2EndTurn(b);
    expect(previewBrokenSegments(b)).toEqual([0]); // 充能只够第一段
    expect(b.v2GrazePreview).toEqual([1]); // 第二段挪开了但没牌兜底 = 让
  });

  it("§31.8 v3 纵步（advance2）也在位移破招名单内", () => {
    expect(MOVE_CARD_IDS).toContain("advance2");
  });

  it("charge 双路径 OR：桩 / 静立 任一满足", () => {
    const intent: Intent = { kind: "charge", damage: 8, steps: 2 };
    const b1 = v2Battle();
    b1.stakes = [4];
    expect(evalWeakness(intent, b1, flags(b1), "preview")).toBe(true);

    const b2 = v2Battle();
    const f2 = flags(b2, { stoodStill: true, endTurnCommitted: true });
    expect(evalWeakness(intent, b2, f2, "preview")).toBe(true);

    const b3 = v2Battle();
    expect(evalWeakness(intent, b3, flags(b3), "preview")).toBe(false);
  });
});
