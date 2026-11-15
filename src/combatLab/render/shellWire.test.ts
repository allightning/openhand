import { describe, expect, it } from "vitest";
import { windowThinkBonusSec } from "../../game/reactionWindows";
import { catalogSkill } from "../codexCatalog";
import { renderGauntletEvent, renderGauntletWager } from "../gauntletUi";
import { buildGauntletPreset, createGauntletRun, wagerOffers } from "../gauntlet";
import { startLabBattle } from "../factory";
import { setLabRuleset } from "../labRuleset";
import { setLabMode } from "../labTuning";
import { renderProdBattle } from "../prodBattleUi";
import { renderShellHall, type ShellHallView } from "./shellHall";
import type { Battle } from "../../game/types";

function opened(stage: number): Battle {
  setLabRuleset("climb");
  setLabMode(true);
  const run = { ...createGauntletRun("bandit", "saber"), stage };
  return startLabBattle(buildGauntletPreset(run), true, 1);
}

function page(b: Battle): string {
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
    phaseBanner: "",
    fxClass: "",
    pauseOverlay: "",
    toolbarExtra: "",
    weaponSheetHtml: "",
    gauntletStage: b.labGauntletStage ?? 1,
  });
}

function hall(stage: number): string {
  const view: ShellHallView = {
    continueInfo: { replayLeft: 2, stage, pot: 40 },
    team: [],
    breakOpen: false,
    demoDone: false,
    rookieDone: false,
    bestLine: "",
    routes: ["江湖"],
  };
  return renderShellHall(view);
}

describe("听劲倒计时", () => {
  it("有听劲时圆窗秒数加上 windowThinkBonusSec，按钮仍是 3/5/10", () => {
    const b = opened(1);
    b.holdReaction = true;
    b.reactionWindow = { kind: "spearReverse", cost: 2, leftover: 1, dir: -1, intentKind: "advance" };
    const plain = page(b);
    expect(plain).toContain('data-react-sec="5"');
    expect(plain).toContain('data-react-sec-source="placeholder"');
    b.techniques = [...b.techniques, "tingjin"];
    const bonus = windowThinkBonusSec(b);
    expect(bonus).toBeGreaterThan(0);
    const html = page(b);
    expect(html).toContain(`data-react-sec="${5 + bonus}"`);
    expect(html).toContain(`--react-sec:${5 + bonus}s`);
    expect(html).toContain('data-react-sec-source="field"');
    expect(html).toContain('data-react-sec="3"');
    expect(html).toContain('data-react-sec="10"');
    expect(html).toContain('id="react-sec-5"');
  });

  it("图鉴听劲文案带秒数", () => {
    const entry = catalogSkill().find((row) => row.id === "tingjin");
    expect(entry?.name).toBe("听劲");
    expect(entry?.text).toMatch(/反应窗的思考时间 \+\d+ 秒/);
  });
});

describe("馆开局投放", () => {
  it("第 3 馆进馆带灼烧格", () => {
    const b = opened(3);
    expect(b.envTag).toBe("burn");
    expect(b.burnCells?.length).toBeGreaterThan(0);
    const html = page(b);
    expect(html).toContain('data-env="burn"');
    expect(html).toContain('data-env-source="tag"');
    expect(hall(3)).toContain('data-hall-env="burn"');
    expect(hall(3)).toContain("灼烧格。这一馆石台上有格子在冒烟。");
    const run = { ...createGauntletRun("bandit", "saber"), stage: 3 };
    const event = renderGauntletEvent(run, "inn", []);
    expect(event).toContain('data-hall-env="burn"');
    expect(event).toContain("灼烧格。这一馆石台上有格子在冒烟。");
  });

  it("第 5 馆进馆带无墙场", () => {
    const b = opened(5);
    expect(b.envTag).toBe("nowall");
    expect(b.wallEnds).toBe("none");
    const html = page(b);
    expect(html).toContain('data-env="nowall"');
    expect(html).toContain('data-wall="none"');
    const run = { ...createGauntletRun("bandit", "saber"), stage: 5 };
    const wager = renderGauntletWager(run, wagerOffers(run, () => 0), null, null);
    expect(wager).toContain('data-hall-env="nowall"');
    expect(wager).toContain("无墙场。这一馆格后没有墙。");
  });

  it("第 1 馆没有词条", () => {
    const b = opened(1);
    expect(b.envTag).toBeUndefined();
    expect(page(b)).toContain('data-env-source="none"');
    expect(hall(1)).not.toContain("data-hall-env");
    expect(hall(1)).not.toContain("灼烧格");
    expect(hall(1)).not.toContain("无墙场");
  });
});
