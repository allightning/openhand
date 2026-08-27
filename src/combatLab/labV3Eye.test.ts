import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { setLabMode, setLabTuning } from "../game/labTuning";
import { commitV2EndTurn, emptyV2Turn } from "../game/labV2";
import { planEyeIdx } from "../game/intentWeakness";
import { simV2ResolveIntentQueue, simV2StrikeDamage } from "../game/simV2Hooks";
import type { Battle, Intent } from "../game/types";
import { startLabBattle } from "./factory";
import { BUILTIN_PRESETS } from "./presets";

function v2Battle(): Battle {
  setLabMode(true);
  setLabTuning({ rulesV2: true, v2Fx: false, v2VariantAi: true });
  return startLabBattle({ ...BUILTIN_PRESETS[0]!, enemyId: "catcher" }, true);
}

beforeEach(() => setLabMode(true));
afterEach(() => setLabMode(false));

describe("§31.8 v3 招眼/破让分级", () => {
  it("招眼 = 队列中第一个可硬拆的攻击段", () => {
    expect(planEyeIdx([{ kind: "strike", damage: 10 }, { kind: "lunge", damage: 12 }])).toBe(0);
    expect(planEyeIdx([{ kind: "lunge", damage: 12 }, { kind: "strike", damage: 10 }])).toBe(1);
    expect(planEyeIdx([{ kind: "lunge", damage: 12 }, { kind: "lunge", damage: 12 }])).toBe(-1);
    expect(planEyeIdx([{ kind: "guard", block: 8 }, { kind: "strike", damage: 10 }])).toBe(1);
  });

  it("硬拆招眼：后续段全崩、失衡一窗、额外得势", () => {
    const b = v2Battle();
    const queue: Intent[] = [
      { kind: "strike", damage: 10 },
      { kind: "lunge", damage: 12 },
      { kind: "lunge", damage: 12 },
    ];
    b.intents = queue;
    b.v2EyeIdx = planEyeIdx(queue);
    expect(b.v2EyeIdx).toBe(0);
    // §31.14 打击红格 = 兵刃圈（敌 4 覆盖 3-5）：开局站 3 在圈里，收势撤到 1 出圈 = 拆
    b.enemy.pos = 4;
    b.player.pos = 3;
    b.v2Turn = { ...emptyV2Turn(b), moveCardPlayed: true, moveCharges: 1 };
    b.player.pos = 1; // 走出红圈
    commitV2EndTurn(b);
    const resolved: Intent[] = [];
    simV2ResolveIntentQueue(b, (intent) => resolved.push(intent));
    expect(resolved).toHaveLength(0); // 眼被拆，两段抢步跟着散
    expect(b.v2BrokenSegments).toEqual([0]);
    expect(b.v2OffBalance).toBe(2);
    expect(b.qi).toBe(3); // 硬拆 +1，破眼 +2
  });

  it("拆非眼段不崩套路", () => {
    const b = v2Battle();
    const queue: Intent[] = [
      { kind: "strike", damage: 10 }, // 招眼（索引 0）
      { kind: "guard", block: 8 },
    ];
    b.intents = queue;
    b.v2EyeIdx = planEyeIdx(queue);
    expect(b.v2EyeIdx).toBe(0);
    // 只有破架充能：拆的是第 1 段（非眼），第 0 段照打、不崩、不失衡
    b.v2Turn = { ...emptyV2Turn(b), antiGuardPlayed: true, antiGuardCharges: 1 };
    commitV2EndTurn(b);
    const resolved: Intent[] = [];
    simV2ResolveIntentQueue(b, (intent) => resolved.push(intent));
    expect(resolved.map((i) => i.kind)).toEqual(["strike"]);
    expect(b.v2BrokenSegments).toEqual([1]);
    expect(b.v2OffBalance ?? 0).toBe(0);
  });

  it("软拆「让」：段仍结算但伤害减半、不得势", () => {
    const b = v2Battle();
    const queue: Intent[] = [{ kind: "lunge", damage: 12 }];
    b.intents = queue;
    b.v2EyeIdx = -1;
    // §31.14 抢步锁定格 3（敌贴脸，落点即 4，覆盖 3-5）：开局在圈里，收势撤出且没位移牌 = 让
    b.player.pos = 3;
    b.enemy.pos = 4;
    b.v2Turn = emptyV2Turn(b);
    b.player.pos = 1;
    commitV2EndTurn(b);
    const resolved: Intent[] = [];
    simV2ResolveIntentQueue(b, (intent) => resolved.push(intent));
    expect(resolved).toHaveLength(1);
    expect("damage" in resolved[0]! ? resolved[0]!.damage : -1).toBe(6); // 12 减半
    expect(b.v2GrazedSegments).toEqual([0]);
    expect(b.v2BrokenSegments ?? []).toEqual([]);
    expect(b.qi ?? 0).toBe(0);
  });

  it("失衡窗内打击 ×2（§31.13 处决窗）", () => {
    const b = v2Battle();
    b.v2OffBalance = 1;
    expect(simV2StrikeDamage(b, 10)).toBe(20);
    expect(simV2StrikeDamage(b, 7)).toBe(14);
    b.v2OffBalance = 0;
    expect(simV2StrikeDamage(b, 10)).toBe(10);
  });
});
