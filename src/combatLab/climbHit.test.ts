import { describe, expect, it } from "vitest";
import { CLIMB_USURPER_CATALOG_HP, climbHallGrowth, hallEnemyHitMul } from "../game/climbCaps";
import { GENERATED_ENEMIES, climbWaveBattleHp } from "../game/foeCatalog";

describe("第四刀敌伤查表", () => {
  it("按馆取值，馆 8–10 仍是 1", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => hallEnemyHitMul(s))).toEqual([
      0.3, 0.3, 0.3, 0.7, 0.85, 0.6, 0.85, 1, 1, 1,
    ]);
  });

  it("馆 4 起档 3、血 140；馆 3 仍是档 2", () => {
    expect(climbHallGrowth(3)).toEqual({ tier: 2, hp: 90, weaponGrade: 2 });
    expect(climbHallGrowth(4)).toEqual({ tier: 3, hp: 140, weaponGrade: 3 });
    expect(climbHallGrowth(10).weaponGrade).toBe(3);
  });

  it("馆 6 主敌目录血乘 0.85，纤手不超过主敌，馆 9 波次不收", () => {
    const main = GENERATED_ENEMIES.mob_escortBand_02!.hp;
    const wave = GENERATED_ENEMIES.mob_canal_01!.hp;
    const hall6 = Math.round(3.25 * 148) / 100;
    const hall9 = Math.round(3.7 * 148) / 100;
    const mainHp = Math.round(main * hall6);
    expect(climbWaveBattleHp("mob_canal_01", 6, wave, hall6)).toBeLessThanOrEqual(mainHp);
    expect(climbWaveBattleHp("mob_canal_01", 9, wave, hall9)).toBe(Math.max(8, Math.round(wave * hall9)));
  });

  it("夺玺者爬塔目录血对齐寨主 460", () => {
    const mul = Math.round(4.2 * 148) / 100;
    expect(Math.round(CLIMB_USURPER_CATALOG_HP * mul)).toBe(460);
  });
});
