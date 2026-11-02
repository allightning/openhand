import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { renderProdBattle } from "./prodBattleUi";
import { setLabMode } from "./labTuning";
import { setLabRuleset } from "./labRuleset";
import { buildGauntletPreset, createGauntletRun } from "./gauntlet";
import { startLabBattle } from "./factory";
import { rollEventChoices } from "./encounter";
import { renderGauntletEvent, renderGauntletLifeline, renderGauntletPathPick } from "./gauntletUi";
import { renderShellCodex, codexFieldGaps } from "./render/shellCodex";
import { renderShellDeath } from "./render/shellDeath";
import { renderShellEvent } from "./render/shellEvent";
import { renderShellHall, renderShellPath, type ShellHallView } from "./render/shellHall";
import { paintShellLoadout, readPoolCards, renderShellPool } from "./render/shellLoadout";
import { renderOpenRitual } from "./render/openFlip";
import { armOpeningRitual } from "./storyBeats";
import { renderShellSettings } from "./render/shellChrome";

const CSS = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "lab.css"), "utf8");

type Box = { name: string; x: number; y: number; w: number; h: number };

/** 两盒有正面积相交才算叠。贴边不算。 */
export function boxesOverlap(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/** 从左往右排，放不下就换行。这是无浏览器时的按钮网格。 */
export function flowBoxes(names: string[], w: number, h: number, container: number, gap: number): Box[] {
  const boxes: Box[] = [];
  let x = 0;
  let y = 0;
  for (const name of names) {
    if (boxes.length && x + w > container) {
      x = 0;
      y += h + gap;
    }
    boxes.push({ name, x, y, w, h });
    x += w + gap;
  }
  return boxes;
}

function assertClear(boxes: Box[]): void {
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      expect(boxesOverlap(boxes[i]!, boxes[j]!), `${boxes[i]!.name} 叠 ${boxes[j]!.name}`).toBe(false);
    }
  }
}

function cssVar(name: string): number {
  const m = CSS.match(new RegExp(`${name}:\\s*(\\d+)px`));
  if (!m) throw new Error(`缺少 ${name}`);
  return Number(m[1]);
}

/** 手牌规则里的 margin-left。负值就是叠牌。 */
function cardMarginLeft(css: string): number[] {
  const found: number[] = [];
  for (const block of css.split("}")) {
    if (!block.includes(".hand .card")) continue;
    const m = block.match(/margin-left:\s*(-?\d+)(px)?/);
    if (m) found.push(Number(m[1]));
  }
  return found;
}

function between(html: string, startToken: string, endToken: string): string {
  const at = html.indexOf(startToken);
  expect(at, startToken).toBeGreaterThan(-1);
  const next = html.indexOf(endToken, at + startToken.length);
  expect(next, endToken).toBeGreaterThan(at);
  return html.slice(at, next);
}

function buttonNames(region: string, group?: string): string[] {
  const names: string[] = [];
  for (const m of region.matchAll(/<button\b[^>]*>/g)) {
    if (group && !m[0].includes(`data-overlap-group="${group}"`)) continue;
    const id = m[0].match(/id="([^"]+)"/);
    const cls = m[0].match(/class="([^"]+)"/);
    names.push(id?.[1] ?? cls?.[1] ?? "button");
  }
  return names;
}

afterEach(() => {
  setLabRuleset("climb");
  setLabMode(false);
});

describe("按钮不重叠", () => {
  it("相交判断自己会红", () => {
    expect(boxesOverlap({ name: "a", x: 0, y: 0, w: 10, h: 10 }, { name: "b", x: 9, y: 9, w: 10, h: 10 })).toBe(true);
    expect(boxesOverlap({ name: "a", x: 0, y: 0, w: 10, h: 10 }, { name: "b", x: 10, y: 0, w: 10, h: 10 })).toBe(false);
  });

  it("手牌 margin-left 不能为负", () => {
    const margins = cardMarginLeft(CSS);
    expect(margins.length).toBeGreaterThan(0);
    for (const n of margins) expect(n).toBeGreaterThanOrEqual(0);
    expect(cssVar("--hud-card-overlap")).toBe(0);
  });

  it("收势、弃牌、置换、换人在动作行里换行不叠", () => {
    setLabRuleset("climb");
    setLabMode(true);
    const b = startLabBattle(buildGauntletPreset(createGauntletRun("bandit", "saber")), true, 1);
    const html = renderProdBattle({
      b,
      prev: null,
      hoverUid: null,
      hoverIntentIdx: null,
      weaponId: "saber-a-3",
      canPlay: () => ({ ok: true }),
      actionRowHtml: [
        `<button class="fy-btn" id="btn-discard">弃牌</button>`,
        `<button class="fy-btn" id="btn-cycle">置换</button>`,
        `<button class="swap-btn" id="btn-swap">换人</button>`,
        `<button class="endturn fy-btn" id="btn-end">收势</button>`,
      ].join(""),
      entranceNote: "",
      freshNote: "",
      fxClass: "",
      pauseOverlay: "",
      toolbarExtra: "",
      weaponSheetHtml: "",
      gauntletStage: 1,
    });
    const actions = buttonNames(between(html, 'data-overlap-group="actions"', 'data-overlap-group="hand-row"'));
    expect(actions).toEqual(["btn-discard", "btn-cycle", "btn-swap", "btn-end"]);
    const gap = cssVar("--hud-action-gap");
    const w = cssVar("--hud-action-btn-w");
    assertClear(flowBoxes(actions, w, 36, 960, gap));

    const hand = buttonNames(between(html, 'data-overlap-group="hand-row"', "</footer>"), "hand");
    expect(hand.length).toBe(b.hand.length);
    assertClear(flowBoxes(hand, cssVar("--hud-card-w"), 220, 4000, 0));

    const intents = [...between(html, 'data-overlap-group="intents"', 'data-overlap-group="footer"').matchAll(/class="[^"]*lab-intent-seg/g)];
    expect(intents.length).toBeGreaterThan(0);
    assertClear(flowBoxes(intents.map((_, i) => `seg-${i}`), cssVar("--hud-intent-w"), 40, 640, gap));
    expect(CSS).toMatch(/\.lab-intent-row\s*\{[^}]*flex-wrap:\s*wrap/);
    expect(CSS).toMatch(/\.lab-stance-agg,\s*\n\.lab-prod-combat \.lab-reveal-row[\s\S]*?flex-wrap:\s*wrap/);
  });

  it("聚合条六类和圆窗按钮各自换行，圆窗不撑阶段条", () => {
    setLabRuleset("climb");
    setLabMode(true);
    const b = startLabBattle(buildGauntletPreset(createGauntletRun("bandit", "saber")), true, 1);
    b.holdReaction = true;
    b.reactionWindow = { kind: "spearReverse", cost: 2, leftover: 1, dir: -1, intentKind: "advance" };
    const html = renderProdBattle({
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
    const chips = [...elementByAttr(html, 'data-overlap-group="stance-agg"').matchAll(/class="[^"]*lab-stance-chip/g)];
    expect(chips).toHaveLength(6);
    const gap = cssVar("--hud-action-gap");
    assertClear(flowBoxes(chips.map((_, i) => `stance-${i}`), cssVar("--hud-intent-w"), 40, 640, gap));
    const react = buttonNames(elementByAttr(html, 'data-overlap-group="react-round"'));
    expect(react).toEqual(["react-take", "react-drop", "react-sec-3", "react-sec-5", "react-sec-10"]);
    assertClear(flowBoxes(react, cssVar("--hud-action-btn-w"), 36, 176, gap));
    const actions = buttonNames(elementByAttr(html, 'data-overlap-group="actions"'));
    expect(actions).toEqual(["btn-end"]);
    expect(actions.some((name) => react.includes(name))).toBe(false);
    expect(CSS).toMatch(/\.lab-prod-combat \.lab-react-actions button,\s*\.lab-prod-combat \.lab-react-secs button\s*\{[^}]*position:\s*static/);
    expect(CSS).toMatch(/\.lab-prod-combat \.lab-react-round\s*\{[^}]*position:\s*absolute/);
    expect(CSS).toMatch(/\.lab-phase-slot\s*\{[^}]*height:\s*1\.7rem/);
    expect(html).toContain('data-phase="idle"');
  });

  it("缘分、职业钮、毒层和锁住的换装各自换行", () => {
    setLabRuleset("climb");
    setLabMode(true);
    const b = startLabBattle(buildGauntletPreset(createGauntletRun("bandit", "saber")), true, 1);
    b.party = ["watch", "lishuangxing", "baimenghe"];
    b.bondStages = { "lishuangxing|watch": "life" };
    b.professions = { [b.active]: "diviner" };
    b.profAdvanced = true;
    const html = renderProdBattle({
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
    const role = elementByAttr(html, 'data-overlap-group="role-hud"');
    expect(role).toContain("夜霜 · 生死");
    expect(role).toContain("医杀");
    expect(role).toContain('id="battle-weapon-swap"');
    expect(role).toMatch(/id="battle-weapon-swap"[^>]*disabled/);
    const names = buttonNames(role);
    expect(names).toEqual(["prof-advance", "prof-see", "prof-cheat", "battle-weapon-swap"]);
    assertClear(flowBoxes(names, cssVar("--hud-action-btn-w"), 36, 320, cssVar("--hud-action-gap")));
    expect(CSS).toMatch(/\.lab-prod-combat \.lab-role-hud button\s*\{[^}]*position:\s*static/);
  });

  it("敌窗靠右即刻走满，牌意三档贴在蓄力旁", () => {
    setLabRuleset("climb");
    setLabMode(true);
    const b = startLabBattle(buildGauntletPreset(createGauntletRun("bandit", "saber")), true, 1);
    b.foeReact = { kind: "dismantle", note: "敌拆招 伤害减半，回敬 3" };
    b.hand = Array.from({ length: 7 }, (_, i) => ({ uid: `cut-${i}`, defId: "cut" }));
    b.drawPile = [];
    b.discardPile = [];
    const html = renderProdBattle({
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
    const foe = elementByAttr(html, 'data-foe-react="1"');
    expect(foe).toContain("敌");
    expect(foe).toContain('data-foe-instant="1"');
    expect(foe).not.toContain("<button");
    expect(html).toContain("data-foe-note");
    expect(html).toContain('data-school-count="7"');
    expect(html).toMatch(/data-tier="4" class="is-met"/);
    expect(html).toMatch(/data-tier="7" class="is-met"/);
    expect(html).toMatch(/data-tier="10" class=""/);
    expect(html).toContain('data-overlap-group="charge-row"');
    const actions = between(html, 'data-overlap-group="actions"', 'data-overlap-group="hand-row"');
    expect(actions).not.toContain("data-foe-react");
    expect(CSS).toMatch(/\.lab-prod-combat \.lab-react-round\.is-foe\s*\{[^}]*right:\s*0\.4rem/);
    expect(CSS).toMatch(/\.lab-prod-combat \.lab-react-round\.is-foe \.lab-react-arc\s*\{[^}]*animation:\s*none/);
    expect(CSS).toMatch(/\.lab-prod-combat \.lab-charge-row\s*\{[^}]*position:\s*static/);
    expect(CSS).toMatch(/\.lab-prod-combat \.lab-intent-marks\s*\{[^}]*position:\s*static/);
    expect(CSS).toMatch(/\.lab-phase-slot\s*\{[^}]*height:\s*1\.7rem/);
  });

  it("动作钮不许用绝对定位叠在同一点", () => {
    expect(CSS).toMatch(/\.lab-prod-combat \.lab-action-row button\s*\{[^}]*position:\s*static/);
  });
});

function shellCss(): string {
  const at = CSS.indexOf("/* shell2");
  expect(at).toBeGreaterThan(-1);
  return CSS.slice(at);
}

function elementByAttr(html: string, attr: string): string {
  const at = html.indexOf(attr);
  expect(at, attr).toBeGreaterThan(-1);
  const start = html.lastIndexOf("<", at);
  const name = /^([a-z0-9]+)/i.exec(html.slice(start + 1))?.[1];
  expect(name, attr).toBeTruthy();
  const re = new RegExp(`<${name}\\b|</${name}>`, "g");
  re.lastIndex = start;
  let depth = 0;
  let found: RegExpExecArray | null;
  while ((found = re.exec(html))) {
    depth += found[0].startsWith("</") ? -1 : 1;
    if (depth === 0) return html.slice(start, found.index + found[0].length);
  }
  throw new Error(`未闭合 ${attr}`);
}

function assertFlow(html: string, attr: string): void {
  const names = buttonNames(elementByAttr(html, attr));
  expect(names.length, attr).toBeGreaterThan(0);
  const w = cssVar("--shell-btn-w");
  const gap = cssVar("--shell-gap");
  expect(640).toBeGreaterThanOrEqual(w);
  assertClear(flowBoxes(names, w, cssVar("--shell-btn-h"), 640, gap));
}

function hallView(over: Partial<ShellHallView> = {}): ShellHallView {
  return {
    continueInfo: null,
    team: [],
    breakOpen: true,
    demoDone: false,
    rookieDone: false,
    bestLine: "",
    routes: ["少林寺", "江湖", "朝廷暗线"],
    ...over,
  };
}

describe("六屏按钮不重叠", () => {
  it("壳层样式换行、不绝对定位、不负边距，也不写战斗板", () => {
    const css = shellCss();
    expect(css).toMatch(/flex-wrap:\s*wrap/);
    expect(css).toMatch(/position:\s*static/);
    expect(css).toMatch(/overflow-wrap:\s*anywhere/);
    expect(css).not.toMatch(/position:\s*absolute/);
    expect(css).not.toMatch(/margin-left:\s*-/);
    expect(css).not.toMatch(/\.lab-prod-combat|\.fy-btn|\.hand \.card|\.strip\b/);
  });

  it("门厅：开打、路线、队伍；空队伍与长名字", () => {
    const empty = renderShellHall(hallView());
    expect(empty).toContain('id="start-gauntlet"');
    expect(empty).toContain("开打");
    expect(empty).toContain("少林寺");
    expect(empty).toContain("江湖");
    expect(empty).toContain("朝廷暗线");
    expect(empty).toContain("还没有记下的队伍。");
    expect(empty).toMatch(/id="hall-continue"[^>]*disabled/);
    assertFlow(empty, 'data-overlap-group="hall-primary"');
    assertFlow(empty, 'data-overlap-group="hall-routes"');
    assertFlow(empty, 'data-overlap-group="hall-read"');

    const longName = "夜行".repeat(30);
    const crowded = renderShellHall(
      hallView({
        continueInfo: { replayLeft: 2, stage: 4, pot: 80 },
        team: [
          { name: longName, line: "刀 · 出战 12 张" },
          { name: "温掌", line: "拳掌 · 出战 8 张" },
          { name: "白孟鹤", line: "剑 · 出战 9 张" },
        ],
        bestLine: "正赛第 4 馆 · 彩金 80",
      }),
    );
    expect(crowded).toContain(longName);
    expect(crowded).toContain("另开一局");
    expect(crowded).not.toMatch(/id="hall-continue"[^>]*disabled/);
    assertFlow(crowded, 'data-shell="hall"');
  });

  it("路线屏三张路卡与回门厅不叠", () => {
    const html = renderShellPath(renderGauntletPathPick());
    expect(html).toContain('id="gauntlet-exit-path"');
    expect(html.match(/data-gauntlet-path="/g)?.length).toBe(3);
    assertFlow(html, 'data-overlap-group="path-routes"');
  });

  it("配装：按系分组，有品相就标，没有就只排系", () => {
    const empty = renderShellPool([]);
    expect(empty).toContain("牌池是空的。");
    const plain = renderShellPool([
      { id: "a", name: "直取", school: "saber", cost: 1 },
      { id: "b", name: "戳", school: "spear", cost: 2 },
    ]);
    expect(plain).toContain("先按系排");
    expect(plain.indexOf('data-school="saber"')).toBeLessThan(plain.indexOf('data-school="spear"'));
    expect(plain).not.toContain("data-rarity=");
    const longName = "横练".repeat(24);
    const marked = renderShellPool([
      { id: "c", name: longName, school: "palm", cost: 6, rarity: "supreme" },
      { id: "d", name: "格", school: "palm", cost: 1, rarity: "common" },
    ]);
    expect(marked).toContain(longName);
    expect(marked).toContain('data-rarity="supreme"');
    expect(marked).toContain("绝");
    expect(marked).not.toContain("先按系排");

    const run = createGauntletRun("bandit", "saber");
    const html = paintShellLoadout(run);
    expect(html).toContain('data-shell="loadout"');
    expect(html).toContain('id="gauntlet-loadout-back"');
    expect(html).toContain('data-loadout-page="deck"');
    expect(html).toContain('data-loadout-page="tech"');
    expect(html).toContain('data-loadout-page="mind"');
    expect(html).toContain('data-loadout-page="weapon"');
    expect(html).toContain('id="gauntlet-stash-sell"');
    expect(html).toContain('id="gauntlet-stash-craft"');
    const pool = readPoolCards();
    expect(pool.length).toBeGreaterThan(0);
    expect(html).toContain(`牌池 · ${pool.length}`);
    if (pool.some((card) => card.rarity)) expect(html).toContain("data-rarity=");
    else expect(html).toContain("先按系排");
    assertFlow(html, 'data-overlap-group="loadout-tabs"');
    assertFlow(html, 'data-overlap-group="loadout-ops"');
    assertFlow(html, 'data-overlap-group="loadout-mates"');
    expect(html).toContain('data-spectrum-source="field"');
    assertFlow(html, 'data-overlap-group="weapon-swap"');
    const locked = paintShellLoadout(run, undefined, "deck", null, true);
    expect(locked).toContain('data-weapon-locked="battle"');
    expect(locked).toMatch(/id="swap-palm"[^>]*disabled/);
  });

  it("图鉴：分册、空检索、长文滚动位；缺字段另列", () => {
    const html = renderShellCodex("skill", 0, "");
    expect(html).toContain('data-shell="codex"');
    expect(html).toContain('data-wiki-book="ult"');
    expect(html).toContain('data-wiki-book="skill"');
    expect(html).toContain('data-wiki-book="gear"');
    expect(html).toContain('data-wiki-book="status"');
    expect(html).toContain('data-wiki-book="mates"');
    expect(html).toContain('id="lab-wiki-search"');
    expect(html).toContain('id="lab-wiki-close"');
    assertFlow(html, 'data-overlap-group="codex-tabs"');
    assertFlow(html, 'data-overlap-group="codex-foot"');
    const missed = renderShellCodex("skill", 0, "zzzz-no-such-shell");
    expect(missed).toContain("shell-empty");
    const gaps = codexFieldGaps();
    expect(gaps.some((line) => line.includes("敌人"))).toBe(true);
    expect(gaps.some((line) => line.includes("没有 cost"))).toBe(false);
    expect(gaps.some((line) => line.includes("rarityLabel"))).toBe(true);
  });

  it("事页：选项数字提前，没有选项时留继续", () => {
    const choice = `<div class="gauntlet-wager-row"><button type="button" data-event-idx="0"><b>押注</b><p>彩金 +18，伤 4</p></button><button type="button" data-event-idx="1"><b>走开</b><p>彩金 0</p></button></div>`;
    const html = renderShellEvent(choice);
    expect(html).toContain('class="shell-mech"');
    expect(html).toContain(">18<");
    expect(html).toContain(">4<");
    assertFlow(html, 'data-overlap-group="event-choices"');
    const travel = `<div class="gauntlet-shell"><p class="gauntlet-event-lead">${"石板".repeat(40)}</p><div class="gauntlet-wager-actions"><button type="button" id="story-travel-continue">继续走</button></div></div>`;
    const empty = renderShellEvent(travel);
    expect(empty).toContain("shell-event-empty");
    expect(empty).toContain('id="story-travel-continue"');
    assertFlow(empty, 'data-overlap-group="event-go"');

    const run = createGauntletRun("bandit", "saber");
    const live = renderShellEvent(renderGauntletEvent(run, "inn", rollEventChoices(run, "inn", () => 0)));
    expect(live).toContain("data-event-idx");
    expect(live).toContain("shell-num");
    assertFlow(live, 'data-overlap-group="event-choices"');
  });

  it("死亡：评语在前，复活赛入口，空评语与长评语", () => {
    const bare = `<div class="gauntlet-shell gauntlet-result"><header class="gauntlet-head"><h2>行路结算</h2></header><div class="gauntlet-result-hero"><div class="gauntlet-result-streak">3</div></div><div class="gauntlet-result-actions"><button type="button" id="gauntlet-retry">再来一局</button><button type="button" id="gauntlet-exit-result">回门厅</button></div></div>`;
    const empty = renderShellDeath(bare, "result", true);
    expect(empty).toContain("死亡");
    expect(empty).toContain("这一馆没有另写评语。");
    expect(empty).toContain('id="gauntlet-retry"');
    expect(empty).toContain('id="gauntlet-exit-result"');
    assertFlow(empty, 'data-overlap-group="death-actions"');
    const note = "刀口".repeat(80);
    const long = renderShellDeath(bare.replace("<header", `<div class="gauntlet-result-potline">${note}</div><header`), "result", true);
    expect(long).toContain(note);
    expect(long).not.toContain("没有另写评语");
    const none = renderShellDeath(`<div class="gauntlet-shell gauntlet-lifeline"><div class="gauntlet-wager-row"></div></div>`, "lifeline", true);
    expect(none).toContain("复活赛");
    expect(none).toContain("这一局没有复活赛。");
    const live = renderShellDeath(renderGauntletLifeline(createGauntletRun("bandit", "saber")), "lifeline", true);
    expect(live.match(/data-lifeline="/g)?.length).toBeGreaterThan(0);
    assertFlow(live, 'data-overlap-group="death-revive"');
  });

  it("设置：音量、试听、歌单；空歌单与长曲名", () => {
    const base = {
      sfx: 40,
      bgm: 20,
      label: "厅",
      paused: true,
      mode: "sequence" as const,
      currentText: "0:00",
      durationText: "1:00",
      seekMax: 60,
      seekPos: 0,
    };
    const empty = renderShellSettings({ ...base, tracks: [] });
    expect(empty).toContain("音量");
    expect(empty).toContain("试听");
    expect(empty).toContain("歌单是空的。");
    expect(empty).toContain('id="sl-sfx"');
    expect(empty).toContain('id="sl-bgm"');
    expect(empty).toContain('id="lab-music-pause"');
    expect(empty).toContain('id="lab-settings-close"');
    expect(empty).not.toContain("data-hall-pick");
    assertFlow(empty, 'data-overlap-group="settings-audition"');
    assertFlow(empty, 'data-overlap-group="settings-modes"');
    assertFlow(empty, 'data-overlap-group="settings-close"');
    const title = "夜雨".repeat(40);
    const long = renderShellSettings({ ...base, label: title, tracks: [{ label: title, on: true }] });
    expect(long).toContain(title);
    assertFlow(long, 'data-overlap-group="settings-tracks"');
  });

  it("开局七张牌背换行，自取名一钮", () => {
    setLabRuleset("climb");
    setLabMode(true);
    const run = armOpeningRitual(createGauntletRun("bandit", "saber"), () => 0);
    const html = renderOpenRitual(run);
    expect(html).toContain('data-open-source="field"');
    expect(html.match(/data-open-face="back"/g)?.length).toBe(7);
    assertFlow(html, 'data-overlap-group="open-flip"');
    const named = renderOpenRitual({ ...run, storyFlags: ["s3page:s3-open-name"] });
    expect(named).toContain('data-name-source="placeholder"');
    assertFlow(named, 'data-overlap-group="open-name"');
    const css = shellCss();
    expect(css).toMatch(/\.shell-open-flip\s*\{[^}]*position:\s*static/);
    expect(css).toMatch(/\.shell-open-name\s*\{[^}]*position:\s*static/);
    expect(css).toMatch(/\.shell-open-card\s*\{[^}]*position:\s*static/);
  });
});
