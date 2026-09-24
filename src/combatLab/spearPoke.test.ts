import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { makeTestContext } from "../game/testContext";
import { setLabMode, setLabTuning } from "../game/labTuning";
import { canPlay, playCard } from "../game/sim";
import { startLabBattle } from "./factory";
import { buildGauntletPreset, createGauntletRun } from "./gauntlet";
import { setLabRuleset } from "./labRuleset";
import { spearReachDamage } from "./rogueRoster";

describe("枪贴身拨杆", () => {
  beforeEach(() => {
    setLabRuleset("break");
    setLabMode(true);
    setLabTuning({ rulesV2: true, v2Fx: false, enemySegBonus: 0, v2VariantAi: false, enemyStressCap: 0 });
  });
  afterEach(() => setLabMode(false));

  it("距伤表：1 格仍无远距档；2/3/4 为 3/5/8", () => {
    expect(spearReachDamage(1)).toBeNull();
    expect(spearReachDamage(2)).toBe(3);
    expect(spearReachDamage(3)).toBe(5);
    expect(spearReachDamage(4)).toBe(8);
  });

  it("贴身可出戳：低伤并击退 1，离开贴脸", () => {
    const run = createGauntletRun("bandit", "spear");
    let b = startLabBattle(buildGauntletPreset(run), true, 1);
    b.player.pos = 0;
    b.enemy.pos = 1;
    b.foes = [b.enemy];
    b.energy = 10;
    b.hand = [{ uid: "t1", defId: "thrust" }];
    expect(canPlay(b, "t1", makeTestContext({ mode: "break", lab: true, tuning: { rulesV2: true, v2Fx: false, enemySegBonus: 0, v2VariantAi: false, enemyStressCap: 0 } })).ok).toBe(true);
    const hp = b.enemy.hp;
    b = playCard(b, "t1", makeTestContext({ mode: "break", lab: true, tuning: { rulesV2: true, v2Fx: false, enemySegBonus: 0, v2VariantAi: false, enemyStressCap: 0 } }));
    expect(b.enemy.hp).toBeLessThan(hp);
    expect(b.enemy.hp).toBeGreaterThanOrEqual(hp - 6);
    expect(Math.abs(b.player.pos - b.enemy.pos)).toBeGreaterThanOrEqual(2);
  });

  it("距 3 仍按 5 档，不误用拨杆", () => {
    const run = createGauntletRun("bandit", "spear");
    let b = startLabBattle(buildGauntletPreset(run), true, 1);
    b.player.pos = 1;
    b.enemy.pos = 4;
    b.foes = [b.enemy];
    b.energy = 10;
    b.hand = [{ uid: "t1", defId: "thrust" }];
    const hp = b.enemy.hp;
    b = playCard(b, "t1", makeTestContext({ mode: "break", lab: true, tuning: { rulesV2: true, v2Fx: false, enemySegBonus: 0, v2VariantAi: false, enemyStressCap: 0 } }));
    expect(hp - b.enemy.hp).toBeGreaterThanOrEqual(5);
    expect(Math.abs(b.player.pos - b.enemy.pos)).toBe(3);
  });
});
