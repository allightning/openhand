import { describe, expect, it } from "vitest";
import type { CompanionId } from "../../game/types";
import { createGauntletRun, gauntletFieldMate } from "../gauntlet";
import { mateDeck } from "../loadout";
import { paintShellLoadout } from "./shellLoadout";
import { applyHallSwap, renderWeaponSwap } from "./weaponSwap";

describe("馆间换装", () => {
  it("谱上的兵器能换，配装刷新并写出弹出张数", () => {
    const run = createGauntletRun("bandit", "saber");
    const mate = gauntletFieldMate(run.school);
    const before = mateDeck(run, mate);
    const next = applyHallSwap(run, mate, "palm", false);
    expect(next.weaponSwapNote).toMatch(/^已弹出 \d+ 张不符牌$/);
    expect(next.mateSchools?.[mate]).toBe("palm");
    expect(mateDeck(next, mate)).not.toEqual(before);
    expect(mateDeck(run, mate)).toEqual(before);
    const html = paintShellLoadout(next);
    expect(html).toContain('data-spectrum-source="field"');
    expect(html).toContain("当前 拳掌");
    expect(html).toContain(next.weaponSwapNote ?? "");
    expect(html).toContain('data-weapon-icon="palm"');
    expect(html).toContain("击退，连击");
  });

  it("战斗中换装被拒绝，按钮锁死", () => {
    const run = createGauntletRun("bandit", "saber");
    const mate = gauntletFieldMate(run.school);
    const denied = applyHallSwap(run, mate, "palm", true);
    expect(denied.weaponSwapNote).toBe("战斗中不能换装");
    expect(denied.mateSchools?.[mate]).toBeUndefined();
    expect(mateDeck(denied, mate)).toEqual(mateDeck(run, mate));
    const html = paintShellLoadout(run, undefined, "deck", null, true);
    expect(html).toContain('data-weapon-locked="battle"');
    expect(html).toMatch(/id="swap-palm"[^>]*disabled/);
    expect(html).toMatch(/id="swap-sword"[^>]*disabled/);
  });

  it("谱上没有这个人就占位", () => {
    const run = createGauntletRun("bandit", "saber");
    const html = renderWeaponSwap(run, "missing" as CompanionId, false);
    expect(html).toContain('data-spectrum-source="placeholder"');
    expect(html).toContain("武器谱还没写上");
    expect(html).toMatch(/<button[^>]*>换装<\/button>/);
    expect(html).toMatch(/<button[^>]*disabled/);
  });
});
