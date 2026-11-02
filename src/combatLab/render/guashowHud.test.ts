import { afterEach, describe, expect, it } from "vitest";
import type { Battle } from "../../game/types";
import { renderProdBattle } from "../prodBattleUi";
import { setLabRuleset } from "../labRuleset";
import { setLabMode } from "../labTuning";
import { buildGauntletPreset, createGauntletRun } from "../gauntlet";
import { startLabBattle } from "../factory";
import { paintShellLoadout } from "./shellLoadout";
import type { GuashowFields } from "./guashowHud";

function battle(): Battle & GuashowFields {
  setLabRuleset("climb");
  setLabMode(true);
  return startLabBattle(buildGauntletPreset(createGauntletRun("bandit", "saber")), true, 1);
}

/** 测试改了意图、没重发 stanceBoard 时，把已发布的板清掉，画面才按新队列占位。 */
function useIntents(b: Battle, intents: Battle["intents"]): void {
  b.intents = intents;
  b.intent = intents[0]!;
  b.stanceBoard = undefined;
  b.feintMask = undefined;
}

function page(b: Battle, extra: { foeResolving?: boolean; foePlaybackSegIdx?: number; phaseBanner?: string } = {}): string {
  return renderProdBattle({
    b,
    prev: null,
    hoverUid: null,
    hoverIntentIdx: null,
    weaponId: "saber-a-3",
    canPlay: () => ({ ok: true }),
    actionRowHtml: "",
    entranceNote: "",
    freshNote: "",
    phaseBanner: extra.phaseBanner ?? "",
    fxClass: "",
    pauseOverlay: "",
    toolbarExtra: "",
    weaponSheetHtml: "",
    gauntletStage: 1,
    foeResolving: extra.foeResolving,
    foePlaybackSegIdx: extra.foePlaybackSegIdx,
  });
}

function slice(html: string, attr: string): string {
  const at = html.indexOf(attr);
  expect(at, attr).toBeGreaterThan(-1);
  return html.slice(at, at + 900);
}

afterEach(() => {
  setLabRuleset("climb");
  setLabMode(false);
});

describe("意图聚合条", () => {
  it("占位聚成伤势 ×2 · 进势 ×1，不挂招名", () => {
    const b = battle();
    useIntents(b, [
      { kind: "strike", damage: 11 },
      { kind: "strike", damage: 11 },
      { kind: "advance", steps: 1 },
    ]);
    const html = page(b);
    const agg = slice(html, 'data-stance-source="placeholder"');
    expect(agg).toContain("伤势");
    expect(agg).toContain("×2");
    expect(agg).toContain("进势");
    expect(agg).toContain("×1");
    expect(agg).not.toContain("11");
    expect(html).not.toContain("他在运气");
  });

  it("蓄势写他在运气，诡势只留未知标记", () => {
    const b = battle();
    useIntents(b, [{ kind: "windup" }, { kind: "pull", steps: 1 }]);
    const html = page(b);
    expect(html).toContain("他在运气");
    const trick = html.slice(html.indexOf('data-stance="sly"'), html.indexOf('data-stance="sly"') + 280);
    expect(trick).toContain("诡势");
    expect(trick).toContain("lab-stance-unknown");
    expect(trick).not.toContain("pull");
  });

  it("有聚合字段就按字段画，不再用占位分类", () => {
    const b = battle();
    useIntents(b, [{ kind: "strike", damage: 4 }]);
    b.stanceBoard = [
      { stance: "back", key: "retreat", feint: false },
      { stance: "back", key: "retreat", feint: false },
      { stance: "back", key: "retreat", feint: false },
    ];
    const html = page(b);
    expect(html).toContain('data-stance-source="field"');
    const yieldChip = html.slice(html.indexOf('data-stance="back"'), html.indexOf('data-stance="back"') + 220);
    expect(yieldChip).toContain("×3");
  });

  it("打完的段从条上减掉，亮招行留原段序", () => {
    const b = battle();
    useIntents(b, [
      { kind: "strike", damage: 6 },
      { kind: "strike", damage: 7 },
      { kind: "guard", block: 4 },
    ]);
    const html = page(b, { foeResolving: true, foePlaybackSegIdx: 1 });
    expect(html).not.toMatch(/data-intent-idx="0"/);
    expect(html).toMatch(/data-intent-idx="1"/);
    expect(html).toContain('data-hide-before="1"');
    const hurt = html.slice(html.indexOf('data-stance="hurt"'), html.indexOf('data-stance="hurt"') + 220);
    expect(hurt).toContain("×1");
  });
});

describe("亮招、虚招、读懂", () => {
  it("解锁段数按段亮类型，后面保持问号", () => {
    const b = battle();
    useIntents(b, [
      { kind: "strike", damage: 3 },
      { kind: "advance", steps: 1 },
      { kind: "guard", block: 2 },
    ]);
    b.stanceRevealN = 1;
    const html = page(b);
    expect(html).toContain('data-reveal-source="field"');
    expect(html).toMatch(/data-intent-idx="0"[^>]*>伤势</);
    expect(html).toMatch(/data-intent-idx="1"[^>]*>\?</);
    expect(html).toMatch(/data-intent-idx="2"[^>]*>\?</);
  });

  it("没解锁字段时整行是问号", () => {
    const b = battle();
    useIntents(b, [{ kind: "strike", damage: 3 }]);
    b.stanceRevealN = undefined;
    const html = page(b);
    expect(html).toContain('data-reveal-source="placeholder"');
    expect(html).toMatch(/data-intent-idx="0"[^>]*>\?</);
  });

  it("亮虚招有真架势就翻开，没有就占位", () => {
    const open = battle();
    useIntents(open, [{ kind: "pull", steps: 2 }]);
    open.stanceBoard = [{ stance: "hurt", key: "strike", feint: true }];
    open.feintShown = true;
    const flipped = page(open);
    expect(flipped).toContain("is-feint-flip");
    expect(flipped).toContain('data-feint-source="field"');
    expect(flipped).toMatch(/data-intent-idx="0"[^>]*>伤势</);

    const missing = battle();
    useIntents(missing, [{ kind: "pull", steps: 2 }]);
    missing.feintShown = true;
    const held = page(missing);
    expect(held).toContain('data-feint-source="placeholder"');
    expect(held).toContain("?→真");
  });

  it("读懂的名字进播报，没有名单就占位", () => {
    const named = battle();
    named.readMoves = ["strike"];
    expect(page(named)).toContain('<b class="lab-read-name">打击</b>');

    const bare = battle();
    expect(page(bare)).toContain('data-read-source="placeholder"');
  });
});

describe("反应窗圆窗", () => {
  it("场上有窗就画圆窗，默认 5 秒，档是 3/5/10", () => {
    const b = battle();
    b.holdReaction = true;
    b.reactionWindow = { kind: "spearReverse", cost: 2, leftover: 1, dir: -1, intentKind: "advance" };
    const html = page(b);
    expect(html).toContain("is-react-hold");
    expect(html).toContain("回马枪");
    expect(html).toContain('data-react="take">回马<');
    expect(html).toContain('data-react="drop">放过<');
    expect(html).toContain("耗蓝 2");
    expect(html).toContain('data-react-sec="5"');
    expect(html).toContain('data-react-sec-source="placeholder"');
    expect(html).toContain('data-react-sec="3"');
    expect(html).toContain('data-react-sec="10"');
    expect(html).not.toContain("lab-board-shake");
  });

  it("设置档写在场上就用那一档", () => {
    const b = battle();
    b.reactionWindow = { kind: "spearReverse", cost: 1, leftover: 1, dir: 1, intentKind: "lunge" };
    b.reactionSec = 10;
    const html = page(b);
    expect(html).toContain('data-react-sec="10"');
    expect(html).toContain('data-react-sec-source="field"');
  });

  it("成功才硬停敌位移并震石台，窗关掉", () => {
    const b = battle();
    b.reactionWindow = { kind: "spearReverse", cost: 2, leftover: 0, dir: -1, intentKind: "charge" };
    b.reactionLanded = true;
    const html = page(b);
    expect(html).toContain("lab-react-halt");
    expect(html).toContain("lab-board-shake");
    expect(html).not.toContain("lab-react-round");
    expect(html).not.toContain("is-react-hold");
  });
});

describe("环境实样式", () => {
  it("envTag 接到四套 class", () => {
    const burn = battle();
    burn.envTag = "burn";
    burn.burnCells = [2];
    const burnHtml = page(burn);
    expect(burnHtml).toContain('data-env="burn"');
    expect(burnHtml).toContain('data-env-source="tag"');
    expect(burnHtml).toContain("env-burn");
    expect(burnHtml).toMatch(/class="[^"]*env-burn-stand[^"]*" data-pos="2"/);

    const wall = battle();
    wall.envTag = "nowall";
    expect(page(wall)).toContain("env-nowall");

    const end = battle();
    end.envTag = "gap_end";
    expect(page(end)).toContain("env-gap-end");

    const mid = battle();
    mid.envTag = "gap_mid";
    expect(page(mid)).toContain("env-gap-mid");
  });

  it("灼烧跳血只在回合结束，出招回放不加", () => {
    const b = battle();
    b.envTag = "burn";
    b.burnCells = [1];
    b.climbPhaseLabel = "【结束】裂创";
    expect(page(b)).toContain("env-burn-due");
    expect(page(b, { foeResolving: true, foePlaybackSegIdx: 0 })).not.toContain("env-burn-due");
  });
});

describe("蓄力、钉、双形态、牌意", () => {
  it("层数和爆发就绪、钉层、飞刀形态、4/7/10", () => {
    const b = battle();
    b.chargeStacks = 6;
    b.foePin = 2;
    b.dartFormNow = "melee";
    b.cardIntent = 7;
    const html = page(b);
    expect(html).toContain('data-stacks="6"');
    expect(html).toContain('data-ready="1"');
    expect(html).toContain("爆发就绪");
    expect(html).toContain('data-pin="2"');
    expect(html).toContain("钉 ×2");
    expect(html).toContain('data-dart-form="field"');
    expect(html).toContain('class="lab-dart-melee is-on"');
    expect(html).toContain('data-card-intent="field"');
    expect(html).toMatch(/data-tier="4" class="is-met"/);
    expect(html).toMatch(/data-tier="7" class="is-met"/);
    expect(html).toMatch(/data-tier="10" class=""/);
  });

  it("这些字段没写时占位，不编一个层数", () => {
    const html = page(battle());
    expect(html).toContain('data-stacks="0"');
    expect(html).toContain('data-ready="0"');
    expect(html).not.toContain("爆发就绪");
    expect(html).toContain('data-pin-chip');
    expect(html).toContain('data-dart-form="placeholder"');
    expect(html).toContain('data-card-intent="placeholder"');
    expect(html).not.toContain("is-met");
  });

  it("配装屏也有 4/7/10", () => {
    const html = paintShellLoadout(createGauntletRun("bandit", "saber"));
    expect(html).toContain('data-card-intent="placeholder"');
    expect(html).toContain('data-tier="4"');
    expect(html).toContain('data-tier="7"');
    expect(html).toContain('data-tier="10"');
  });
});
