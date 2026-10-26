import { afterEach, describe, expect, it } from "vitest";
import type { Battle } from "../game/types";
import { applyIntentMove, overlayRecapBattle } from "./foePlayback";
import { foldStatusChips, renderHoverPreview, renderProdBattle, renderProdBoard } from "./prodBattleUi";
import { setLabRuleset } from "./labRuleset";
import { setLabMode } from "./labTuning";
import { buildGauntletPreset, createGauntletRun } from "./gauntlet";
import { startLabBattle } from "./factory";

function climbBattle(): Battle {
  setLabRuleset("climb");
  setLabMode(true);
  return startLabBattle(buildGauntletPreset(createGauntletRun("bandit", "saber")), true, 1);
}

function page(b: Battle, phaseBanner = ""): string {
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
    phaseBanner,
    fxClass: "",
    pauseOverlay: "",
    toolbarExtra: "",
    weaponSheetHtml: "",
    gauntletStage: 1,
  });
}

function cellClass(html: string, pos: number): string {
  const m = html.match(new RegExp(`class="([^"]*)" data-pos="${pos}"`));
  return m?.[1] ?? "";
}

afterEach(() => {
  setLabRuleset("climb");
  setLabMode(false);
});

describe("行路 9 格与格后墙", () => {
  it("缺省行路是 9 格，格子不带 wall，壁在高侧外面", () => {
    const html = page(climbBattle());
    expect(html.match(/data-pos="/g)?.length).toBe(9);
    expect(html).toContain('data-board="9"');
    expect(html).toContain('data-wall="high"');
    expect(html).toContain("九步石台");
    expect(html).toContain("board-wall");
    const pos8 = html.indexOf('data-pos="8"');
    const wall = html.indexOf("board-wall");
    expect(pos8).toBeGreaterThan(-1);
    expect(wall).toBeGreaterThan(pos8);
    for (let i = 0; i < 9; i++) {
      expect(cellClass(html, i).split(/\s+/)).not.toContain("wall");
      expect(html).toContain(`data-pos="${i}" data-land="1"`);
    }
  });

  it("登门缺省仍是 7 格，末格带壁，没有格外墙标", () => {
    setLabRuleset("break");
    const html = page(startLabBattle(buildGauntletPreset(createGauntletRun("bandit", "saber")), true, 1));
    expect(html.match(/data-pos="/g)?.length).toBe(7);
    expect(html).toContain('data-board="7"');
    expect(html).toContain('data-wall="both"');
    expect(html).toContain("七步石台");
    expect(html).not.toContain("board-wall");
    expect(cellClass(html, 6).split(/\s+/)).toContain("wall");
    expect(html).toMatch(/data-pos="6" data-land="1"><em>7<\/em><span class="wall-label">壁<\/span>/);
  });

  it("写了 boardSize / wallEnds 就按字段画，不看缺省", () => {
    const b = climbBattle();
    Object.assign(b, { boardSize: 7, wallEnds: "both" });
    const html = page(b);
    expect(html).toContain('data-board="7"');
    expect(html).toContain('data-wall="both"');
    expect(html).not.toContain("board-wall");
    expect(cellClass(html, 6).split(/\s+/)).toContain("wall");
  });

  it("wallSide 低侧时墙标在第 1 格前面", () => {
    const b = climbBattle();
    Object.assign(b, { wallSide: "low" });
    const html = page(b);
    expect(html.indexOf("board-wall")).toBeLessThan(html.indexOf('data-pos="0"'));
    expect(html).toContain('data-wall-side="low"');
  });
});

describe("环境词条空样式", () => {
  it("灼烧、无墙、缺格只挂 class 和文案键", () => {
    const burn = climbBattle();
    Object.assign(burn, { boardEnv: "burn" });
    const burnHtml = page(burn);
    expect(burnHtml).toContain("env-burn");
    expect(burnHtml).toContain('data-env="burn"');
    expect(burnHtml).toContain('data-env-key="env.burn"');

    const bare = climbBattle();
    Object.assign(bare, { boardEnv: "nowall" });
    const bareHtml = page(bare);
    expect(bareHtml).toContain("board-wall is-broken");
    expect(bareHtml).toContain('data-env-key="env.nowall"');

    const end = climbBattle();
    Object.assign(end, { boardEnv: "gap-end" });
    const endHtml = renderProdBoard(end, null);
    expect(endHtml).toContain('data-pos="8" data-land="0"');
    expect(cellClass(endHtml, 8)).toContain("env-gap");

    const mid = climbBattle();
    Object.assign(mid, { boardEnv: "gap-mid" });
    const midHtml = renderProdBoard(mid, null);
    expect(cellClass(midHtml, 4)).toContain("env-gap");
    expect(midHtml).toContain('data-pos="4" data-land="0"');
  });

  it("缺格不画 ghost 落点", () => {
    const b = climbBattle();
    Object.assign(b, { boardEnv: "gap-end" });
    const html = renderProdBoard(b, {
      legal: true,
      notes: [],
      playerHp: b.player.hp,
      playerBlock: 0,
      enemyHp: b.enemy.hp,
      enemyBlock: 0,
      enemyPos: 8,
      enemyDies: false,
      playerPos: b.player.pos,
      nextDamage: 0,
      stakes: [],
      traps: [],
    });
    expect(cellClass(html, 8)).not.toContain("ghost");
  });
});

describe("HUD 占位", () => {
  it("阶段条空和有字都占同一槽", () => {
    const b = climbBattle();
    const idle = page(b, "");
    const live = page(b, `<p class="lab-phase-banner">【中期】你出牌</p>`);
    expect(idle).toContain('data-phase="idle"');
    expect(idle).toContain("lab-phase-banner is-idle");
    expect(live).toContain('data-phase="live"');
    expect(live).not.toContain("is-idle");
    expect(idle.match(/lab-phase-slot/g)?.length).toBe(live.match(/lab-phase-slot/g)?.length);
  });

  it("预演条把构成分到括号列", () => {
    const b = climbBattle();
    const html = renderHoverPreview(b, {
      legal: true,
      notes: ["斩 4"],
      breakdown: "构成 4：+4 牌面",
      playerHp: b.player.hp,
      playerBlock: 0,
      enemyHp: b.enemy.hp - 4,
      enemyBlock: 0,
      enemyPos: b.enemy.pos,
      enemyDies: false,
      playerPos: b.player.pos,
      nextDamage: 0,
      stakes: [],
      traps: [],
    });
    expect(html).toContain("preview-paren");
    expect(html).toContain("（构成 4：");
    expect(html).toContain("preview live");
  });

  it("chip 超过一串就收成还有，名字仍在 DOM", () => {
    const chips = Array.from({ length: 8 }, (_, i) => ({ name: `状${i}`, value: String(i) }));
    const folded = foldStatusChips(chips, 6);
    expect(folded.shown).toHaveLength(6);
    expect(folded.rest.map((c) => c.name).join(",")).toBe("状6,状7");
  });
});

describe("回放夹位", () => {
  it("没写 boardSize 时出界仍停在第 7 格；写了 9 才能走到第 9 格", () => {
    const held = applyIntentMove(0, 6, { kind: "retreat", steps: 3 }, "打");
    expect(held.enemyPos).toBe(6);
    const wide = applyIntentMove(0, 6, { kind: "retreat", steps: 3 }, "打", 9);
    expect(wide.enemyPos).toBe(8);
  });

  it("overlay 只在字段写了板长时记下夹位", () => {
    const b = climbBattle();
    delete b.boardSize;
    const show = { hp: 10, block: 0, playerPos: 0, enemyPos: 5 };
    overlayRecapBattle(b, show);
    expect(show.boardSize).toBeUndefined();
    b.boardSize = 9;
    overlayRecapBattle(b, show);
    expect(show.boardSize).toBe(9);
  });
});
