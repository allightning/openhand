import { describe, expect, it } from "vitest";
import { buildGauntletPreset, createGauntletRun } from "../gauntlet";
import { startLabBattle } from "../factory";
import { setLabMode } from "../labTuning";
import { setLabRuleset } from "../labRuleset";
import { renderProdBattle } from "../prodBattleUi";
import { renderShellEvent } from "./shellEvent";
import { renderGauntletEvent } from "../gauntletUi";
import { FOE_STANCE_SHIFT_LINES, FOE_VARIANT_RUMORS, offerStory2Page, rollStoryChoices } from "../storyBeats";
import type { Battle } from "../../game/types";

function page(b: Battle): string {
  setLabRuleset("climb");
  setLabMode(true);
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

function battle(): Battle {
  setLabRuleset("climb");
  setLabMode(true);
  return startLabBattle(buildGauntletPreset(createGauntletRun("bandit", "saber")), true, 1);
}

describe("血线换势播报", () => {
  it("龟、游走、wander 和其余来路换成 story5 的句子", () => {
    const turtle = battle();
    turtle.log = ["foeStanceShift 血线 50% turtle→brute"];
    const turtleHtml = page(turtle);
    expect(turtleHtml).toContain('data-stance-shift="turtle"');
    expect(turtleHtml).toContain(FOE_STANCE_SHIFT_LINES["foeStanceShift:turtle"]);

    const roam = battle();
    roam.log = ["foeStanceShift 血线 50% skirmish→brute"];
    expect(page(roam)).toContain(FOE_STANCE_SHIFT_LINES["foeStanceShift:skirmish"]);
    expect(page(roam)).toContain('data-stance-shift="skirmish"');

    const wander = battle();
    wander.log = ["foeStanceShift 血线 50% wander→brute"];
    expect(page(wander)).toContain(FOE_STANCE_SHIFT_LINES["foeStanceShift:skirmish"]);

    const keyed = battle();
    keyed.log = ["foeStanceShift:turtle"];
    expect(page(keyed)).toContain('data-stance-shift="turtle"');

    const plain = battle();
    plain.log = ["foeStanceShift 血线 50% coach→coach"];
    const plainHtml = page(plain);
    expect(plainHtml).toContain('data-stance-shift="fallback"');
    expect(plainHtml).toContain(FOE_STANCE_SHIFT_LINES.foeStanceShift);
  });

  it("八条以前的换势键不再换成句子", () => {
    const b = battle();
    b.log = ["foeStanceShift:turtle", ...Array.from({ length: 8 }, () => "摸 1")];
    expect(page(b)).not.toContain("data-stance-shift");
    expect(page(b)).not.toContain("他肩上的守势收下去");
  });
});

describe("风声", () => {
  it("带着谱就能读，买了底细也不改亮招位", () => {
    const bare = battle();
    expect(page(bare)).toContain('data-foe-rumor-source="placeholder"');
    expect(page(bare)).not.toContain("听说他这局");

    const open = battle();
    open.foeVariant = "mob_road_01:turtle-shell";
    const html = page(open);
    expect(html).toContain('data-intel-slot="rumor"');
    expect(html).toContain('data-foe-rumor-source="field"');
    expect(html).toContain(FOE_VARIANT_RUMORS["foeVariant:turtle"]);
    expect(html).toContain('data-bought-tier=""');

    const bought = battle();
    bought.foeVariant = "mob_road_01:skirmish-lane";
    bought.stanceRevealN = 1;
    (bought as Battle & { intelTier?: string }).intelTier = "detail";
    const marked = page(bought);
    expect(marked).toContain(FOE_VARIANT_RUMORS["foeVariant:skirmish"]);
    expect(marked).toContain('data-bought-tier="detail"');
    expect(marked).toContain('data-reveal-source="field"');

    const brute = battle();
    brute.foeVariant = "seat:brute-press";
    expect(page(brute)).toContain(FOE_VARIANT_RUMORS["foeVariant:brute"]);
    const wander = battle();
    wander.foeVariant = "seat:wander";
    expect(page(wander)).toContain(FOE_VARIANT_RUMORS["foeVariant:skirmish"]);
  });
});

describe("重打开场", () => {
  it("座前优先，句子在原来的正文前面", () => {
    setLabRuleset("climb");
    setLabMode(true);
    const base = offerStory2Page(createGauntletRun("bandit", "saber"), "s2-revive-rematch");
    const plain = renderShellEvent(renderGauntletEvent(base, "story", rollStoryChoices(base)));
    expect(plain).toContain('data-rematch-source="placeholder"');
    expect(plain).toContain("你站回空地中央");
    expect(plain).not.toContain("袖口还留着");
    expect(plain).not.toContain("座前的人记得");

    const eliteRun = { ...base, storyFlags: [...(base.storyFlags ?? []), "rematch-elite"] };
    const elite = renderShellEvent(renderGauntletEvent(eliteRun, "story", rollStoryChoices(eliteRun)));
    expect(elite).toContain('data-rematch-open="elite"');
    expect(elite.indexOf("袖口还留着")).toBeLessThan(elite.indexOf("你站回空地中央"));

    const both = {
      ...base,
      storyFlags: [...(base.storyFlags ?? []), "rematch-elite", "rematch-seat"],
    };
    const seat = renderShellEvent(renderGauntletEvent(both, "story", rollStoryChoices(both)));
    expect(seat).toContain('data-rematch-open="seat"');
    expect(seat).toContain('data-rematch-source="field"');
    expect(seat.indexOf("座前的人记得")).toBeLessThan(seat.indexOf("你站回空地中央"));
    expect(seat).not.toContain("袖口还留着");
  });
});
