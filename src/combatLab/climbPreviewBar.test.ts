import { afterEach, describe, expect, it } from "vitest";
import { labCard } from "../game/labContent";
import { climbTestContext } from "./testContext";
import { labV21EffectiveCost } from "../game/labV21";
import { setLabMode } from "./labTuning";
import { previewCard } from "../game/sim";
import { startLabBattle } from "./factory";
import { buildGauntletPreset, createGauntletRun } from "./gauntlet";
import { setLabRuleset } from "./labRuleset";
import { renderHoverPreview, renderProdBattle } from "./prodBattleUi";

/** 卡面角标恢复显示耗蓝 + 底部悬停预演条亮实际效果。 */
describe("预演条与耗蓝角标", () => {
  afterEach(() => {
    setLabRuleset("climb");
    setLabMode(false);
  });

  function climbBattle() {
    setLabRuleset("climb");
    setLabMode(true);
    const run = createGauntletRun("bandit", "saber");
    return startLabBattle(buildGauntletPreset(run), true, 1);
  }

  it("卡面左上角显示耗蓝，劲力通栏已移除", () => {
    const b = climbBattle();
    const html = renderProdBattle({
      b,
      prev: null,
      hoverUid: null,
      hoverIntentIdx: null,
      weaponId: "saber-a-3",
      canPlay: () => ({ ok: true }),
      actionRowHtml: "",
      entranceNote: "",
      freshNote: "",
      fxClass: "",
      pauseOverlay: "",
      toolbarExtra: "",
      weaponSheetHtml: "",
      gauntletStage: 1,
    });
    expect(html).not.toContain("card-qi-cost");
    expect(html).toContain('id="preview-slot"');
    for (const c of b.hand) {
      const def = labCard(c.defId, climbTestContext());
      expect(html).toContain(`<span class="cost">${labV21EffectiveCost(b, def, climbTestContext())}</span>`);
    }
  });

  it("无悬停时预演条留空，不常驻态势行", () => {
    const b = climbBattle();
    const html = renderHoverPreview(b, null);
    expect(html).toContain('id="preview-slot"');
    expect(html).toContain("preview idle");
    expect(html).not.toContain("劲力");
  });

  it("悬停攻击牌：预演条只亮牌效短句，不写双方血量", () => {
    const b = climbBattle();
    b.enemy.pos = 2; // 拉近到刀程内
    const atk = b.hand.find((c) => {
      const def = labCard(c.defId, climbTestContext());
      return def.type === "attack" && (def.damage ?? 0) > 0 && previewCard(b, c.uid, climbTestContext()).legal;
    });
    expect(atk).toBeTruthy();
    const prev = previewCard(b, atk!.uid, climbTestContext());
    expect(prev.legal).toBe(true);
    expect(prev.enemyHp).toBeLessThan(b.enemy.hp);
    const html = renderHoverPreview(b, prev);
    expect(html).toContain("preview live");
    expect(html).not.toContain(`你 ${prev.playerHp} 血`);
    expect(html).not.toContain(`${prev.enemyHp} 血`);
    expect(html).toContain("（构成");
    expect(html).not.toContain("流血");
    expect(html).not.toMatch(/（构成[^）]*裂创/);
  });

  it("劲力不足时悬停亮原因（bad 态）", () => {
    const b = climbBattle();
    const atk = b.hand.find((c) => labCard(c.defId, climbTestContext()).type === "attack");
    expect(atk).toBeTruthy();
    const broke = { ...b, energy: 0 };
    const prev = previewCard(broke, atk!.uid, climbTestContext());
    expect(prev.legal).toBe(false);
    const html = renderHoverPreview(broke, prev);
    expect(html).toContain("preview bad");
    expect(html).toContain(prev.reason ?? "现在不能打出");
  });

  it("够不着时悬停亮距离原因（bad 态）", () => {
    const b = climbBattle(); // 敌在 4 格，刀程 2
    const atk = b.hand.find((c) => labCard(c.defId, climbTestContext()).type === "attack");
    expect(atk).toBeTruthy();
    const prev = previewCard(b, atk!.uid, climbTestContext());
    expect(prev.legal).toBe(false);
    const html = renderHoverPreview(b, prev);
    expect(html).toContain("preview bad");
    expect(html).toContain("够不着");
  });

  it("攻击牌 tooltip 含伤害构成", () => {
    const b = climbBattle();
    b.enemy.pos = 2;
    const html = renderProdBattle({
      b,
      prev: null,
      hoverUid: null,
      hoverIntentIdx: null,
      weaponId: "saber-a-3",
      canPlay: () => ({ ok: true }),
      actionRowHtml: "",
      entranceNote: "",
      freshNote: "",
      fxClass: "",
      pauseOverlay: "",
      toolbarExtra: "",
      weaponSheetHtml: "",
      gauntletStage: 1,
    });
    expect(html).toContain("构成");
  });

  it("构成合计与预演掉血对不上时标「待 · 核玩」", () => {
    const b = climbBattle();
    const html = renderHoverPreview(b, {
      legal: true,
      notes: ["斩 4"],
      breakdown: "构成 99：+99 牌面",
      breakdownRiders: ["裂创 +2"],
      playerHp: b.player.hp,
      playerBlock: b.playerBlock,
      enemyHp: b.enemy.hp - 4,
      enemyBlock: b.enemyBlock,
      enemyPos: b.enemy.pos,
      enemyDies: false,
      playerPos: b.player.pos,
      nextDamage: 0,
      stakes: [],
      traps: [],
    });
    expect(html).toContain("（构成 99：");
    expect(html).toContain("裂创 +2");
    expect(html).toContain("待 · 核玩");
  });

  it("石台七格，红格与圈用 class 标", () => {
    const b = climbBattle();
    const html = renderProdBattle({
      b,
      prev: null,
      hoverUid: null,
      hoverIntentIdx: null,
      weaponId: "saber-a-3",
      canPlay: () => ({ ok: true }),
      actionRowHtml: `<span class="lab-action-group lab-action-end"><button class="endturn fy-btn" id="btn-end" data-sfx="end-turn">收势</button></span>`,
      entranceNote: "",
      freshNote: "",
      fxClass: "",
      pauseOverlay: "",
      toolbarExtra: "",
      chromeHtml: `<div class="lab-actions"><button type="button" class="lab-btn" id="lab-guide-open">攻略</button></div>`,
      weaponSheetHtml: "",
      gauntletStage: 1,
    });
    expect(html.match(/data-pos="/g)?.length).toBe(7);
    expect(html).toContain('id="btn-end"');
    expect(html).toContain('data-sfx="end-turn"');
    expect(html).toMatch(/data-pos="0"/);
    expect(html).toMatch(/data-pos="6"/);
    expect(html).toMatch(/class="cell[^"]*(?:red|reach)/);
    expect(html).toContain("lab-combat-top");
    expect(html).toContain("七步石台");
    expect(html).not.toContain("lab-mode-badge");
    expect(html).toMatch(/lab-action-row[\s\S]*lab-hand-row/);
    const previewAt = html.indexOf('id="preview-slot"');
    const footerAt = html.indexOf("lab-action-band");
    expect(previewAt).toBeGreaterThan(-1);
    expect(footerAt).toBeGreaterThan(previewAt);
    expect(html).toContain("lab-phase-slot");
    expect(html).not.toContain("残谱");
    expect(html).not.toContain('data-pile="draw"');
    expect(html).toContain("lab-guide-open");
    expect(html).toContain("you-status");
  });
});
