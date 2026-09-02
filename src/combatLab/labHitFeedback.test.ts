import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setLabMode, setLabTuning } from "../game/labTuning";
import { applyBreak, applyGraze, applyBreakMomentumOnAttack } from "../game/labV2";
import { endTurn, playCard } from "../game/sim";
import type { Battle } from "../game/types";
import { startLabBattle } from "./factory";
import { buildGauntletPreset, createGauntletRun } from "./gauntlet";
import { setLabRuleset } from "./labRuleset";
import { renderFxLayer, renderFoeIntentStrip } from "./labV2Ui";
import { renderProdBattle } from "./prodBattleUi";

function battle(): Battle {
  const b = startLabBattle(buildGauntletPreset(createGauntletRun("bandit", "palm")), true, 1);
  b.labBreakLesson = true;
  b.player.pos = 1;
  b.enemy.pos = 4;
  return b;
}

function html(b: Battle): string {
  return renderProdBattle({
    b,
    prev: null,
    hoverUid: null,
    hoverIntentIdx: null,
    weaponId: "palm-a-1",
    canPlay: () => ({ ok: true }),
    actionRowHtml: "",
    entranceNote: "",
    freshNote: "",
    fxClass: "",
    pauseOverlay: "",
    toolbarExtra: "",
    weaponSheetHtml: "",
    gauntletStage: 3,
  });
}

beforeEach(() => {
  setLabRuleset("break");
  setLabMode(true);
  setLabTuning({ rulesV2: true, v2Fx: true, enemySegBonus: 0, v2VariantAi: false, enemyStressCap: 0 });
});
afterEach(() => setLabMode(false));

describe("打击反馈：拆/让/空/打/拆势/劲尽", () => {
  it("硬拆 → 飘字拆 + 上息破", () => {
    const b = battle();
    b.intents = [{ kind: "strike", damage: 8 }];
    applyBreak(b, b.intents[0]!, 0);
    expect(b.v2FxQueue).toContain("break");
    expect(renderFxLayer(b)).toContain("拆！");
  });

  it("让 → 飘字让", () => {
    const b = battle();
    b.intents = [{ kind: "strike", damage: 10 }];
    applyGraze(b, b.intents[0]!, 0);
    expect(b.v2FxQueue).toContain("graze");
    expect(renderFxLayer(b)).toContain("让");
  });

  it("拆势打出 → 飘字拆势", () => {
    const b = battle();
    b.v2BreakMomentum = 1;
    b.v2BreakMomentumTrue = 6;
    b.enemy.pos = b.player.pos + 1;
    applyBreakMomentumOnAttack(b);
    expect(b.v2FxQueue).toContain("counter");
    expect(renderFxLayer(b)).toContain("拆势");
  });

  it("开局不在红格：收势标空，飘字空，血不动", () => {
    let b = battle();
    b.player.pos = 0;
    b.enemy.pos = 5;
    b.v2Turn = { ...b.v2Turn!, turnStartPos: 0, endPos: 0 };
    b.intents = [{ kind: "strike", damage: 12 }];
    const hp = b.player.hp;
    b = endTurn(b);
    expect(b.player.hp).toBe(hp);
    expect(b.v2LastIntentRecap?.some((r) => r.outcome === "空")).toBe(true);
    expect(b.v2FxQueue).toContain("miss");
    expect(renderFoeIntentStrip(b, null)).toMatch(/空/);
    expect(renderFxLayer(b)).toContain("空");
  });

  it("仍在红格：收势标打，飘字打，挨实", () => {
    let b = battle();
    b.player.pos = 3;
    b.enemy.pos = 4;
    b.v2Turn = { ...b.v2Turn!, turnStartPos: 3, endPos: 3, moveCharges: 0 };
    b.intents = [{ kind: "strike", damage: 8 }];
    const hp = b.player.hp;
    b = endTurn(b);
    expect(b.player.hp).toBeLessThan(hp);
    expect(b.v2LastIntentRecap?.some((r) => r.outcome === "打")).toBe(true);
    expect(b.v2FxQueue).toContain("hit");
    expect(renderFxLayer(b)).toContain("打");
  });

  it("敌劲不够：标劲尽，段不出，血不动", () => {
    let b = battle();
    b.player.pos = 3;
    b.enemy.pos = 4;
    b.enemyEnergy = 0;
    b.v2Turn = { ...b.v2Turn!, turnStartPos: 3, endPos: 3 };
    b.intents = [{ kind: "strike", damage: 8 }];
    const hp = b.player.hp;
    b = endTurn(b);
    expect(b.player.hp).toBe(hp);
    expect(b.v2LastIntentRecap?.some((r) => r.outcome === "劲尽")).toBe(true);
    expect(b.v2FxQueue).toContain("skip");
    expect(renderFxLayer(b)).toContain("劲尽");
  });

  it("出刀飘字带实伤读数，不只一个「攻」", () => {
    const b = battle();
    b.player.pos = 3;
    b.enemy.pos = 4;
    b.energy = 6;
    b.hand = [{ uid: "h1", defId: "strike" }];
    const after = playCard(b, "h1");
    expect(after.lastHitRead).toMatch(/伤/);
    expect(renderFxLayer(after)).toMatch(/伤/);
  });

  it("多段飘字叠出，不只留最后一条", () => {
    const b = battle();
    b.v2FxQueue = ["break", "graze", "hit"];
    const layer = renderFxLayer(b);
    expect(layer).toContain("拆！");
    expect(layer).toContain("让");
    expect(layer).toContain("打");
    expect(layer.match(/lab-fx-pop/g)?.length).toBe(3);
  });

  it("上息段章带破/让/空/打/劲尽", () => {
    const b = battle();
    b.v2LastIntentRecap = [
      { ord: 1, name: "劈", outcome: "破" },
      { ord: 2, name: "劈", outcome: "让" },
      { ord: 3, name: "劈", outcome: "空" },
      { ord: 4, name: "劈", outcome: "打" },
      { ord: 5, name: "劈", outcome: "劲尽" },
    ];
    const strip = renderFoeIntentStrip(b, null);
    expect(strip).toContain("lab-recap-chip");
    expect(strip).toContain("破");
    expect(strip).toContain("让");
    expect(strip).toContain("空");
    expect(strip).toContain("打");
    expect(strip).toContain("劲尽");
  });

  it("打空后教练不靠血条也能说清", () => {
    const b = battle();
    b.v2LastIntentRecap = [{ ord: 1, name: "劈", outcome: "空" }];
    expect(html(b)).toMatch(/id="coach">[^<]*打空/);
  });
});

describe("意图条：落点 / 打空 / 耗劲 / 跳过", () => {
  it("每段常驻落点格与耗劲", () => {
    const b = battle();
    b.enemyEnergy = 6;
    b.intents = [
      { kind: "strike", damage: 8 },
      { kind: "guard", block: 6 },
      { kind: "breathe", amount: 3 },
    ];
    const strip = renderFoeIntentStrip(b, null);
    expect(strip).toMatch(/劲\s*1/);
    expect(strip).toMatch(/劲\s*2/);
    expect(strip).toMatch(/落\d/);
  });

  it("劲不够的段标跳过，不标打", () => {
    const b = battle();
    b.player.pos = 3;
    b.enemy.pos = 4;
    b.v2Turn = { ...b.v2Turn!, turnStartPos: 3, endPos: 3 };
    b.enemyEnergy = 0;
    b.intents = [{ kind: "strike", damage: 8 }];
    const strip = renderFoeIntentStrip(b, null);
    expect(strip).toContain("跳过");
    expect(strip).not.toMatch(/lab-tier-hit">打/);
  });

  it("吐纳/卸力/回血段能读出耗劲", () => {
    const b = battle();
    b.enemyEnergy = 4;
    b.intents = [
      { kind: "breathe", amount: 3 },
      { kind: "guard", block: 8 },
      { kind: "mend", heal: 6 },
    ];
    const strip = renderFoeIntentStrip(b, null);
    expect(strip).toContain("吐纳");
    expect(strip).toContain("卸力");
    expect(strip).toContain("金创");
    expect(strip).toMatch(/劲\s*2/);
    expect(strip).toMatch(/劲\s*1/);
  });
});
