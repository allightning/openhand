import { describe, expect, it } from "vitest";
import { CARDS } from "../game/content";
import { signatureActionCopy } from "../game/labSignature";
import { MATES } from "../game/party";
import { livingFoes, playCard } from "../game/sim";
import { startLabBattle } from "./factory";
import { buildGauntletPreset, createGauntletRun } from "./gauntlet";
import { renderFoeIntentStrip } from "./labV2Ui";
import { renderProdBattle } from "./prodBattleUi";
import { renderDevPanelModal, setDevPanelState } from "./devPanel";
import { getLabRuleset, setLabRuleset } from "./labRuleset";
import type { GauntletPath } from "./gauntletPaths";

/** 开战链路冒烟：preset → battle → 战斗 UI 渲染（防 timelineRow/live 类回归）。 */
describe("lab smoke · 能进战斗", () => {
  const paths: GauntletPath[] = ["shaolin", "bandit", "court"];
  const schools = ["palm", "saber", "sword", "spear", "staff", "hook"] as const;

  for (const mode of ["break"] as const) {
    it(`各线 1 馆 + 双敌馆可渲染战斗 UI`, () => {
      setLabRuleset(mode);
      for (const path of paths) {
        for (const stage of [1, 8]) {
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
          expect(html).not.toContain("[object Object]");
          expect(html).toContain("lab-break-charge");
          expect(html).toContain("lab-charge-pip");
          expect(html).not.toMatch(/lab-break-charge-num">0</);
          expect(html).toContain("肉鸽踢馆");
          expect(intent).toContain("打/空/跳过");
          if (stage === 1) {
            expect(html).toContain("lab-break-teach");
            expect(html).toContain("has-teach");
          }
        }
      }
    });
  }

  it("第6关前排倒下 → 替补立即上场（不点收势也可继续打）", () => {
    setLabRuleset("break");
    const run = createGauntletRun("shaolin", "saber");
    run.stage = 6;
    const b = startLabBattle(buildGauntletPreset(run), false, 1);
    expect(b.gauntletWaveEnemy).toBeTruthy();
    b.enemy.hp = 0;
    // playCard 只读检查：拿一张合法攻击牌真的打出去
    let atk = b.hand.find((c) => {
      const def = CARDS[c.defId];
      return def?.type === "attack";
    });
    if (!atk) {
      b.hand.push({ uid: "atk-smoke", defId: "cut" });
      atk = b.hand.at(-1);
    }
    expect(atk).toBeTruthy();
    const after = playCard(b, atk!.uid);
    expect(after.phase).toBe("player");
    expect(livingFoes(after).length).toBeGreaterThan(0);
    expect(after.enemy.hp).toBeGreaterThan(0);
    // 替换后敌招已规划（下一手可收势）
    expect(after.intents.length).toBeGreaterThan(0);
  });

  it("实验台面板可渲染", () => {
    const html = renderDevPanelModal();
    expect(html).toContain("lab-iron-sheet");
    expect(html).toContain("实验台 · 数值调参");
  });

  it("实验台：肉鸽踢馆 10 馆、敌人页见套件/品阶", () => {
    setLabRuleset("break");
    setDevPanelState({ tab: "combat", stage: 4 });
    const breakCombat = renderDevPanelModal();
    expect(breakCombat).toMatch(/肉鸽踢馆/);
    expect(breakCombat).toContain('max="10"');
    expect(breakCombat).toContain("破招窗口");

    setDevPanelState({ tab: "enemy", enemy: "mob_monk_02", stage: 5 });
    const enemyPage = renderDevPanelModal();
    expect(enemyPage).toMatch(/巡寺棍僧|棍/);
    expect(enemyPage).toMatch(/品阶|玄|敌兵刃/);
    expect(enemyPage).toMatch(/套件|opener|落桩|stake|条/);

    setDevPanelState({ tab: "foeGear" });
    const foeGear = renderDevPanelModal();
    expect(foeGear).toMatch(/敌兵刃|平砍|短刀|罗汉手/);
    expect(foeGear).not.toContain("palm-a-3");
  });

  it("默认模式为肉鸽踢馆（ruleset break）", () => {
    setLabRuleset("break");
    expect(getLabRuleset()).toBe("break");
  });

  it("各武器系 1 馆可开战", () => {
    setLabRuleset("break");
    for (const school of schools) {
      const run = createGauntletRun("bandit", school);
      const preset = buildGauntletPreset(run);
      const b = startLabBattle(preset, false, 1);
      expect(b.player.hp).toBeGreaterThan(0);
      expect(renderFoeIntentStrip(b, null)).toMatch(/lab-intent/);
    }
  });

  it("拆招开踢六系都能渲战场：无签名技不读 .name（回归：只有刀能进）", () => {
    setLabRuleset("break");
    for (const school of schools) {
      const run = createGauntletRun("bandit", school);
      const preset = buildGauntletPreset(run);
      const b = startLabBattle(preset, false, 1);
      const copy = signatureActionCopy(b.active);
      if (school === "saber") {
        expect(copy?.name).toBe("贴刃");
      } else {
        expect(copy, `${school} ${b.active} 无主动技表项`).toBeNull();
      }
      const html = renderProdBattle({
        b,
        prev: null,
        hoverUid: null,
        hoverIntentIdx: null,
        weaponId: preset.mateWeapons?.[preset.fieldMate],
        canPlay: () => ({ ok: true }),
        actionRowHtml: copy ? copy.name : "",
        entranceNote: "",
        freshNote: "",
        fxClass: "",
        pauseOverlay: "",
        toolbarExtra: "",
        weaponSheetHtml: "",
        gauntletStage: 1,
      });
      expect(html.length).toBeGreaterThan(100);
      expect(html).toContain(MATES[b.active].name);
    }
  });
});
