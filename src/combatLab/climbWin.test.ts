import { beforeEach, describe, expect, it } from "vitest";
import { endTurn, isBattleWon, livingFoes } from "../game/sim";
import { setLabMode, setLabTuning } from "../game/labTuning";
import { startLabBattle } from "./factory";
import { buildGauntletPreset, createGauntletRun } from "./gauntlet";
import { setLabRuleset } from "./labRuleset";
import { skipFoeRecap } from "./foePlayback";

describe("最后一人倒下当场判胜", () => {
  beforeEach(() => {
    setLabRuleset("climb");
    setLabMode(true);
    setLabTuning({ rulesV2: true, v2Fx: false, v2VariantAi: false, enemyStressCap: 0 });
  });

  it("回敬打死最后一人后不再接下一段敌招", () => {
    let b = startLabBattle(buildGauntletPreset(createGauntletRun("bandit", "saber")), true, 1);
    b.gauntletWaveEnemy = undefined;
    b.gauntletWaveQueue = undefined;
    b.player.pos = 3;
    b.enemy.pos = 4;
    b.foes = [{ ...b.enemy, hp: 2, maxHp: 2, pos: 4 }];
    b.enemy = b.foes[0]!;
    b.thorns = 80;
    b.playerBlock = 0;
    b.intents = [
      { kind: "strike", damage: 3 },
      { kind: "strike", damage: 8 },
      { kind: "strike", damage: 8 },
    ];
    b.intent = b.intents[0]!;
    b.enemyEnergy = 20;
    const hpBefore = b.player.hp;
    b = endTurn(b);
    expect(livingFoes(b).length).toBe(0);
    expect(isBattleWon(b)).toBe(true);
    expect(skipFoeRecap(b)).toBe(true);
    expect(hpBefore - b.player.hp).toBeLessThan(16);
  });

  it("血已空仍点收势：不再兑死人招，直接判胜", () => {
    let b = startLabBattle(buildGauntletPreset(createGauntletRun("bandit", "saber")), true, 1);
    b.gauntletWaveEnemy = undefined;
    b.gauntletWaveQueue = undefined;
    b.foes = [{ ...b.enemy, hp: 0, maxHp: b.enemy.maxHp }];
    b.enemy = b.foes[0]!;
    b.phase = "player";
    b.intents = [
      { kind: "strike", damage: 9 },
      { kind: "strike", damage: 9 },
    ];
    b.intent = b.intents[0]!;
    const hpBefore = b.player.hp;
    expect(isBattleWon(b)).toBe(true);
    b = endTurn(b);
    expect(isBattleWon(b)).toBe(true);
    expect(b.player.hp).toBe(hpBefore);
  });
});
