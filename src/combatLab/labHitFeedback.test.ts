import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setLabMode, setLabTuning } from "../game/labTuning";
import { applyBreak, applyGraze, applyBreakMomentumOnAttack } from "../game/labV2";
import { breakTestContext } from "../game/testContext";
import { endTurn, playCard, refreshFoeIntentsIfPending } from "../game/sim";
import type { Battle } from "../game/types";
import { startLabBattle } from "./factory";
import { buildGauntletPreset, createGauntletRun } from "./gauntlet";
import { setLabRuleset } from "./labRuleset";
import { renderFxLayer, renderFoeIntentStrip, formatIntentBroadcast, formatCombatRead } from "./labV2Ui";
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
    applyBreak(b, b.intents[0]!, 0, breakTestContext());
    expect(b.v2FxQueue).toContain("break");
    expect(renderFxLayer(b)).toContain("拆！");
  });

  it("让 → 飘字让", () => {
    const b = battle();
    b.intents = [{ kind: "strike", damage: 10 }];
    applyGraze(b, b.intents[0]!, 0, breakTestContext());
    expect(b.v2FxQueue).toContain("graze");
    expect(renderFxLayer(b)).toContain("让");
  });

  it("拆势打出 → 飘字拆势", () => {
    const b = battle();
    b.v2BreakMomentum = 1;
    b.v2BreakMomentumTrue = 6;
    b.enemy.pos = b.player.pos + 1;
    applyBreakMomentumOnAttack(b, breakTestContext());
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
    expect(b.v2LastIntentRecap?.some((r) => (r.hpLost ?? 0) > 0)).toBe(true);
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

  it("飘字只亮最新一条，下一条顶替上一条", () => {
    const b = battle();
    b.v2FxQueue = ["break", "graze", "hit"];
    const layer = renderFxLayer(b);
    expect(layer).toContain("打");
    expect(layer).not.toContain("拆！");
    expect(layer).not.toContain(">让<");
    expect(layer.match(/lab-fx-pop/g)?.length).toBe(1);
    expect(layer).toContain("lab-fx-plate");
  });

  it("上息回顾改由播报承担，意图条不再叠 recap 条", () => {
    const b = battle();
    b.v2LastIntentRecap = [
      { ord: 1, name: "劈", outcome: "破" },
      { ord: 2, name: "劈", outcome: "让" },
      { ord: 3, name: "劈", outcome: "空" },
      { ord: 4, name: "劈", outcome: "打" },
      { ord: 5, name: "劈", outcome: "劲尽" },
    ];
    const strip = renderFoeIntentStrip(b, null);
    expect(strip).not.toContain("lab-recap-chip");
    expect(strip).toContain("敌招");
  });

  it("播报文案带名称与数值（含进撤/架/回）", () => {
    expect(formatIntentBroadcast({ kind: "strike", damage: 8 }, "打", "扑刀")).toBe("扑刀 · 打 8");
    expect(formatIntentBroadcast({ kind: "retreat", steps: 1 }, "追", "抽步")).toBe("抽步 · 追 · 撤1");
    expect(formatIntentBroadcast({ kind: "retreat", steps: 2 }, "放", "抽步")).toBe("抽步 · 放 · 撤2");
    expect(formatIntentBroadcast({ kind: "charge", damage: 9, steps: 2 }, "打", "冲锋")).toBe("冲锋 · 打 9 · 进2");
    expect(formatIntentBroadcast({ kind: "stake" }, "桩", "立桩")).toBe("立桩 · 桩 1");
    expect(formatIntentBroadcast({ kind: "mend", heal: 6 }, "回", "金创")).toBe("金创 · 回 6");
    expect(formatIntentBroadcast({ kind: "guard", block: 8 }, "架", "卸力")).toBe("卸力 · 架 8");
    expect(formatIntentBroadcast({ kind: "breathe", amount: 3 }, "劲", "吐纳")).toBe("吐纳 · 劲+3");
    expect(formatIntentBroadcast({ kind: "lunge", damage: 9 }, "破", "抢路")).toBe("抢路 · 破 9");
    expect(formatIntentBroadcast({ kind: "strike", damage: 8 }, "打", "扑刀", { hpLost: 3, blockLost: 5 })).toBe(
      "扑刀 · 打 8 · 挡5 · 半挡 · 入血3",
    );
    expect(formatIntentBroadcast({ kind: "strike", damage: 8 }, "打", "扑刀", { hpLost: 0, blockLost: 8 })).toBe(
      "扑刀 · 打 8 · 挡8 · 全挡",
    );
  });

  it("出刀播报：全挡只标全挡，穿挡才标穿挡", () => {
    const blocked = battle();
    blocked.lastHitRead = "伤0 · 伤0 · 他卸了 8";
    blocked.enemyBlock = 0;
    expect(formatCombatRead(blocked)).toMatch(/伤0/);
    expect(formatCombatRead(blocked)).toMatch(/挡8/);
    expect(formatCombatRead(blocked)).toMatch(/全挡/);
    expect(formatCombatRead(blocked)).not.toMatch(/破盾|穿挡/);
    expect(formatCombatRead(blocked)).not.toMatch(/他卸了/);

    const pierce = battle();
    pierce.lastHitRead = "伤5 · 他卸了 3";
    pierce.enemyBlock = 0;
    expect(formatCombatRead(pierce)).toMatch(/穿挡/);
    expect(formatCombatRead(pierce)).not.toMatch(/全挡/);
  });

  it("readout sits in mid gutter between strip and charge", () => {
    const b = battle();
    b.labBreakLesson = true;
    const page = html(b);
    const strip = page.indexOf('id="strip"');
    const gutter = page.indexOf("lab-mid-gutter");
    const readout = page.indexOf("lab-readout-rail");
    const charge = page.indexOf("lab-break-charge-rail");
    expect(strip).toBeGreaterThan(-1);
    expect(gutter).toBeGreaterThan(strip);
    expect(readout).toBeGreaterThan(gutter);
    expect(charge).toBeGreaterThan(readout);
  });

  it("默认中轴不念教练经", () => {
    const b = battle();
    b.v2LastIntentRecap = [{ ord: 1, name: "劈", outcome: "空" }];
    expect(html(b)).toMatch(/coach-empty|coach" hidden/);
  });

  it("状态与武器同排，不叠在武器底下", () => {
    const page = html(battle());
    const draw = /<div class="draw-col lab-pile-col">([\s\S]*?)<div class="hand-scroll">/.exec(page)?.[1] ?? "";
    const foe = /<div class="foe-col lab-pile-col">([\s\S]*?)<\/div>\s*<\/div>\s*<\/footer>/.exec(page)?.[1] ?? "";
    expect(draw).toMatch(/weapon-plate/);
    expect(draw).toMatch(/status-col/);
    expect(draw.indexOf("weapon-plate")).toBeLessThan(draw.indexOf("status-col"));
    expect(draw).not.toMatch(/weapon-plate[\s\S]*status-col[\s\S]*weapon-plate/);
    expect(foe).toMatch(/weapon-plate/);
    expect(foe).toMatch(/status-col/);
  });
});

describe("意图条：招名 / 效果 / 劲尽", () => {
  it("每段必有招名与数值效果，进撤明示", () => {
    const b = battle();
    b.enemyEnergy = 8;
    b.intents = [
      { kind: "strike", damage: 8 },
      { kind: "guard", block: 6 },
      { kind: "breathe", amount: 3 },
      { kind: "retreat", steps: 1 },
      { kind: "charge", damage: 7, steps: 2 },
    ];
    const strip = renderFoeIntentStrip(b, null);
    expect(strip).toContain("扑刀 · 8");
    expect(strip).toContain("卸力 · 架6");
    expect(strip).toContain("吐纳 · 劲+3");
    expect(strip).toContain("撤1");
    expect(strip).toMatch(/进2/);
    expect(strip).not.toMatch(/落\d/);
    expect(strip).not.toMatch(/lab-seg-meta/);
  });

  it("劲不够的段标劲尽，不标打", () => {
    const b = battle();
    b.player.pos = 3;
    b.enemy.pos = 4;
    b.v2Turn = { ...b.v2Turn!, turnStartPos: 3, endPos: 3 };
    b.enemyEnergy = 0;
    b.intents = [{ kind: "strike", damage: 8 }];
    const strip = renderFoeIntentStrip(b, null);
    expect(strip).toContain("劲尽");
    expect(strip).not.toContain("跳过");
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

  it("deferIntentRefresh：兑完整队暂不刷下一手，refresh 后才亮新队列", () => {
    let b = battle();
    b.player.pos = 1;
    b.enemy.pos = 4;
    b.enemyEnergy = 4;
    const locked = [
      { kind: "strike" as const, damage: 6 },
      { kind: "guard" as const, block: 6 },
    ];
    b.intents = locked.map((x) => ({ ...x }));
    b.intent = b.intents[0]!;
    b = endTurn(b, { deferIntentRefresh: true });
    expect(b.v2PendingIntentRefresh).toBe(true);
    expect(b.intents).toHaveLength(2);
    expect(b.intents[0]).toMatchObject({ kind: "strike", damage: 6 });
    expect(b.intents[1]).toMatchObject({ kind: "guard", block: 6 });
    expect(b.v2LastIntentRecap?.length).toBeGreaterThanOrEqual(2);
    b = refreshFoeIntentsIfPending(b);
    expect(b.v2PendingIntentRefresh).toBeFalsy();
    expect(b.intents.length).toBeGreaterThanOrEqual(1);
  });

  it("回放时打完的段不留在意图条上", () => {
    const b = battle();
    b.intents = [
      { kind: "strike", damage: 6 },
      { kind: "strike", damage: 7 },
      { kind: "guard", block: 4 },
    ];
    const html = renderProdBattle({
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
      foeResolving: true,
      foePlaybackSegIdx: 1,
    });
    expect(html).not.toMatch(/data-intent-idx="0"/);
    expect(html).toMatch(/data-intent-idx="1"/);
    expect(html).toMatch(/data-hide-before="1"/);
  });
});
