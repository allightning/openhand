import { describe, expect, it } from "vitest";
import { startLabBattle } from "./factory";
import { buildGauntletPreset, createGauntletRun } from "./gauntlet";
import { renderFoeIntentStrip } from "./labV2Ui";
import { renderProdBattle } from "./prodBattleUi";
import { getLabRuleset, setLabRuleset } from "./labRuleset";
import type { GauntletPath } from "./gauntletPaths";

/** 开战链路冒烟：preset → battle → 战斗 UI 渲染（防 timelineRow/live 类回归）。 */
describe("lab smoke · 能进战斗", () => {
  const paths: GauntletPath[] = ["shaolin", "bandit", "court"];
  const schools = ["palm", "saber", "sword", "spear", "staff", "hook"] as const;

  for (const mode of ["classic", "break"] as const) {
    it(`${mode}：各线 1 馆 + 双敌馆可渲染战斗 UI`, () => {
      setLabRuleset(mode);
      const maxStage = mode === "break" ? 10 : 15;
      for (const path of paths) {
        for (const stage of [1, 8]) {
          if (stage > maxStage) continue;
          const run = createGauntletRun(path, "palm");
          run.stage = stage;
          const preset = buildGauntletPreset(run);
          const b = startLabBattle(preset, false, 1);
          const intent = renderFoeIntentStrip(b, null);
          expect(intent.length).toBeGreaterThan(10);
          expect(intent).not.toContain("undefined");

          const html = renderProdBattle({
            b,
            prev: null,
            hoverUid: null,
            hoverIntentIdx: null,
            weaponId: preset.mateWeapons?.[preset.fieldMate] ?? "palm-a-3",
            canPlay: () => ({ ok: true }),
            actionRowHtml: "",
            entranceNote: "",
            freshNote: "",
            fxClass: "",
            pauseOverlay: "",
            toolbarExtra: "",
            weaponSheetHtml: "",
            gauntletStage: stage,
          });
          expect(html.length).toBeGreaterThan(100);
          expect(html).not.toContain("undefined");
          if (mode === "break") {
            expect(html).toContain("lab-break-charge");
            expect(html).toContain("拆招试炼");
            expect(intent).toContain("硬拆全免");
            if (stage === 1) expect(html).toContain("lab-break-teach");
          } else {
            expect(html).toContain("对战踢馆");
            expect(html).toContain("对战版");
            expect(intent).toContain("敌招一览");
            expect(intent).not.toContain("硬拆全免+反打");
          }
        }
      }
    });
  }

  it("默认模式为对战版", () => {
    setLabRuleset("classic");
    expect(getLabRuleset()).toBe("classic");
  });

  it("各武器系 1 馆可开战", () => {
    setLabRuleset("classic");
    for (const school of schools) {
      const run = createGauntletRun("bandit", school);
      const preset = buildGauntletPreset(run);
      const b = startLabBattle(preset, false, 1);
      expect(b.player.hp).toBeGreaterThan(0);
      expect(renderFoeIntentStrip(b, null)).toMatch(/lab-intent/);
    }
  });
});
