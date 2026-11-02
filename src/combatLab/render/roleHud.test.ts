import { describe, expect, it } from "vitest";
import { buildGauntletPreset, createGauntletRun } from "../gauntlet";
import { startLabBattle } from "../factory";
import { setLabMode } from "../labTuning";
import { setLabRuleset } from "../labRuleset";
import { renderProdBattle } from "../prodBattleUi";
import { applyProfAct } from "./roleHud";
import type { Battle } from "../../game/types";

function battle(): Battle {
  setLabRuleset("climb");
  setLabMode(true);
  return startLabBattle(buildGauntletPreset(createGauntletRun("bandit", "saber")), true, 1);
}

function page(b: Battle): string {
  return renderProdBattle({
    b,
    prev: null,
    hoverUid: null,
    hoverIntentIdx: null,
    weaponId: "saber-a-3",
    canPlay: () => ({ ok: true }),
    actionRowHtml: `<button class="fy-btn" id="btn-end">收势</button>`,
    entranceNote: "",
    freshNote: "",
    fxClass: "",
    pauseOverlay: "",
    toolbarExtra: "",
    weaponSheetHtml: "",
    gauntletStage: 1,
  });
}

describe("缘分与职业", () => {
  it("同队缘分带阶段，旧怨是红 chip，没人同队就占位", () => {
    const bare = page(battle());
    expect(bare).toContain('data-bond-source="placeholder"');
    expect(bare).not.toContain("data-grudge=");

    const b = battle();
    b.party = ["watch", "lishuangxing", "baimenghe"];
    b.bondStages = { "lishuangxing|watch": "road" };
    const html = page(b);
    expect(html).toContain('data-bond="nightfrost" data-bond-stage="road"');
    expect(html).toContain("夜霜 · 同路");
    expect(html).toContain('data-grudge="healerkill"');
    expect(html).toContain("医杀");
    expect(html).toContain("lab-grudge-chip");
  });

  it("职业钮按可用态亮灭，点下去走已有主动技", () => {
    const idle = battle();
    const dim = page(idle);
    expect(dim).toContain('data-prof-source="placeholder"');
    expect(dim).toMatch(/id="prof-advance"[^>]*disabled/);
    expect(dim).toMatch(/id="prof-see"[^>]*disabled/);
    expect(dim).toMatch(/id="prof-cheat"[^>]*disabled/);
    expect(applyProfAct(idle, "advance")).toBe("");

    const staker = battle();
    staker.professions = { [staker.active]: "staker" };
    expect(page(staker)).toMatch(/class="fy-btn is-on"[^>]*id="prof-advance"/);
    expect(applyProfAct(staker, "advance")).toBe("裂桩可爆");
    expect(staker.profAdvanced).toBe(true);
    expect(page(staker)).toMatch(/id="prof-advance"[^>]*disabled/);

    const diviner = battle();
    diviner.professions = { [diviner.active]: "diviner" };
    diviner.profAdvanced = true;
    expect(page(diviner)).toMatch(/class="fy-btn is-on"[^>]*id="prof-see"/);
    expect(applyProfAct(diviner, "see")).toBe("本回合虚招还原");
    expect(diviner.feintOpen).toBe(true);
    expect(page(diviner)).toMatch(/id="prof-see"[^>]*disabled/);

    const gambler = battle();
    gambler.professions = { [gambler.active]: "gambler" };
    expect(page(gambler)).toMatch(/id="prof-cheat"[^>]*disabled/);
    gambler.profAdvanced = true;
    expect(applyProfAct(gambler, "cheat")).toBe("这次加注必赚");
    expect(gambler.wagerCheat).toBe(true);
    expect(page(gambler)).toMatch(/id="prof-cheat"[^>]*disabled/);
  });

  it("毒层没字段就占位，写了层数就显示", () => {
    const bare = battle();
    expect(page(bare)).toContain('data-poison-source="placeholder"');
    expect(page(bare)).toContain("毒 —");
    const marked = battle();
    marked.foePoison = 2;
    const html = page(marked);
    expect(html).toContain('data-poison-source="field"');
    expect(html).toContain("毒 ×2");
  });
});
