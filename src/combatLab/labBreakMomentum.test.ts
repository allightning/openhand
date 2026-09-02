import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setLabMode, setLabTuning } from "../game/labTuning";
import { BREAK_COUNTER_CHAIN, EYE_COUNTER_DMG } from "../game/labV2Constants";
import { breakCounterDamage } from "../game/labV2";
import { endTurn, playCard } from "../game/sim";
import type { Battle, CardId } from "../game/types";
import { startLabBattle } from "./factory";
import { buildGauntletPreset, createGauntletRun } from "./gauntlet";
import { setLabRuleset } from "./labRuleset";
import type { WeaponId } from "../game/types";

function v2Battle(school: WeaponId = "palm"): Battle {
  const b = startLabBattle(buildGauntletPreset(createGauntletRun("shaolin", school)), true, 1);
  b.player.pos = 1;
  b.enemy.pos = 4;
  return b;
}

/** 位移硬拆一段打击（各系都能打「撤步」；拳用退步掌）。 */
function hardBreakByMove(school: WeaponId): Battle {
  let b = v2Battle(school);
  b.player.pos = 4;
  b.enemy.pos = 5;
  b.v2Turn = { ...b.v2Turn!, turnStartPos: 4 };
  b.v2EyeIdx = -1;
  b.intents = [{ kind: "strike", damage: 8 }];
  const move: CardId = school === "palm" ? "backpalm" : "retreat";
  b.hand = [{ uid: "m1", defId: move }];
  b.energy = 8;
  b = playCard(b, "m1");
  return endTurn(b);
}

function playAttack(b: Battle, id: CardId, playerPos: number, enemyPos: number): Battle {
  b.hand = [{ uid: "a1", defId: id }];
  b.energy = 8;
  b.player.pos = playerPos;
  b.enemy.pos = enemyPos;
  return playCard(b, "a1");
}

beforeEach(() => {
  setLabRuleset("break");
  setLabMode(true);
  setLabTuning({ rulesV2: true, v2Fx: false, enemySegBonus: 0, v2VariantAi: false, enemyStressCap: 0 });
});
afterEach(() => {
  setLabTuning({ rulesV2: false, v2VariantAi: true });
  setLabMode(false);
});

describe("拆势：硬拆叠层，攻击才结算", () => {
  it("硬拆不扣血，叠 1 层拆势", () => {
    let b = v2Battle("sword");
    b.player.pos = 3;
    b.enemy.pos = 5;
    b.intents = [{ kind: "guard", block: 8 }];
    b.hand = [{ uid: "g1", defId: "expose" }];
    b.energy = 8;
    const hp = b.enemy.hp;
    b = playCard(b, "g1");
    b = endTurn(b);
    expect(b.v2BreakCount ?? 0).toBe(1);
    expect(b.v2BreakMomentum ?? 0).toBe(1);
    expect(b.enemy.hp).toBe(hp);
    expect(b.qi ?? 0).toBe(1);
  });

  it("下一张攻击吃掉一层：真伤入账", () => {
    let b = hardBreakByMove("saber");
    const hp = b.enemy.hp;
    const pool = b.v2BreakMomentumTrue ?? 0;
    expect(pool).toBe(breakCounterDamage(b));
    b = playAttack(b, "cut", 3, 5);
    expect(b.v2BreakMomentum ?? 0).toBe(0);
    expect(b.enemy.hp).toBeLessThan(hp);
    expect(hp - b.enemy.hp).toBeGreaterThanOrEqual(pool);
    expect(b.log.join()).toMatch(/拆势打出/);
  });

  it("连环拆叠两层，收势后仍在", () => {
    let b = v2Battle("sword");
    b.player.pos = 3;
    b.enemy.pos = 5;
    b.intents = [
      { kind: "guard", block: 8 },
      { kind: "guard", block: 6 },
    ];
    b.hand = [
      { uid: "g1", defId: "expose" },
      { uid: "g2", defId: "marking" },
    ];
    b.energy = 8;
    b = playCard(b, "g1");
    b = playCard(b, "g2");
    const hp = b.enemy.hp;
    b = endTurn(b);
    expect(b.v2BreakMomentum ?? 0).toBe(2);
    expect(b.enemy.hp).toBe(hp);
    const per = breakCounterDamage(b);
    expect(b.v2BreakMomentumTrue ?? 0).toBe(per + per + BREAK_COUNTER_CHAIN);
  });

  it("破眼：失衡仍给，真伤并入拆势池", () => {
    let b = v2Battle();
    b.player.pos = 4;
    b.enemy.pos = 5;
    b.v2Turn = { ...b.v2Turn!, turnStartPos: 4 };
    b.intents = [
      { kind: "strike", damage: 8 },
      { kind: "strike", damage: 9 },
    ];
    b.v2EyeIdx = 0;
    b.hand = [{ uid: "m1", defId: "backpalm" }];
    b.energy = 6;
    const hp = b.enemy.hp;
    b = playCard(b, "m1");
    b = endTurn(b);
    expect(b.v2OffBalance ?? 0).toBeGreaterThan(0);
    expect(b.enemy.hp).toBe(hp);
    expect(b.v2BreakMomentum ?? 0).toBe(1);
    expect(b.v2BreakMomentumTrue ?? 0).toBe(breakCounterDamage(b) + EYE_COUNTER_DMG);
  });
});

describe("拆势六系", () => {
  it("刀：贴身拆势再叠裂创", () => {
    let b = hardBreakByMove("saber");
    const bleed = b.bleed ?? 0;
    b = playAttack(b, "cut", 4, 5);
    expect(b.bleed).toBeGreaterThan(bleed);
    expect(b.log.join()).toMatch(/裂创/);
  });

  it("拳：拆势打出击退", () => {
    let b = hardBreakByMove("palm");
    const pos = 5;
    b.enemy.pos = pos;
    b = playAttack(b, "strike", 4, pos);
    expect(b.enemy.pos).not.toBe(pos);
    expect(b.log.join()).toMatch(/击退/);
  });

  it("剑：拆势打出破绽", () => {
    let b = hardBreakByMove("sword");
    const ex = b.expose;
    b = playAttack(b, "pierce", 3, 5);
    expect(b.expose).toBeGreaterThan(ex);
  });

  it("枪：远距拆势加力", () => {
    let b = hardBreakByMove("spear");
    const hp = b.enemy.hp;
    const pool = b.v2BreakMomentumTrue ?? 0;
    b = playAttack(b, "thrust", 2, 5);
    expect(hp - b.enemy.hp).toBeGreaterThanOrEqual(pool + 3);
  });

  it("棍：拆势打出眩晕", () => {
    let b = hardBreakByMove("staff");
    b = playAttack(b, "bleedcut", 3, 5);
    expect(b.foeStun ?? 0).toBeGreaterThanOrEqual(1);
  });

  it("钩：拆势打出缴械", () => {
    let b = hardBreakByMove("hook");
    b = playAttack(b, "hookDisarm", 3, 5);
    expect(b.foeDisarm ?? 0).toBeGreaterThanOrEqual(1);
  });
});
