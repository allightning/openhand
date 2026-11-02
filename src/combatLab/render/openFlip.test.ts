import { describe, expect, it } from "vitest";
import type { WeaponId } from "../../game/types";
import { buildGauntletPreset, createGauntletRun } from "../gauntlet";
import { setLabMode } from "../labTuning";
import { setLabRuleset } from "../labRuleset";
import { armOpeningRitual } from "../storyBeats";
import { startLabBattle } from "../factory";
import { renderProdBattle } from "../prodBattleUi";
import { flipOpenCard, pickOpenCard, renderOpenRitual, writeHeroName } from "./openFlip";
import { WEAPON_NAME } from "../../game/party";

function opened(rng: () => number) {
  setLabRuleset("climb");
  setLabMode(true);
  return armOpeningRitual(createGauntletRun("bandit", "saber"), rng);
}

describe("开局翻牌", () => {
  it("七张牌背，点开最多三张，牌面有名、系、核副", () => {
    let run = opened(() => 0);
    const backs = renderOpenRitual(run);
    const first = run.openDeck?.[0];
    expect(run.openDeck).toHaveLength(7);
    expect(new Set(run.openDeck).size).toBe(7);
    expect(first).toBe("saber");
    expect(backs).toContain('data-open-page="s3-open-a"');
    expect(backs).toContain('data-open-source="field"');
    expect(backs).toContain('data-open-n="7"');
    expect(backs.match(/data-open-face="back"/g)?.length).toBe(7);
    expect(backs).toContain(`data-open-school="${first}"`);
    for (let i = 0; i < 4; i++) run = flipOpenCard(run, i);
    expect(run.openFlipped).toEqual([0, 1, 2]);
    const faces = renderOpenRitual(run);
    expect(faces).toContain("贴身，裂创");
    expect(faces).toContain(`>${WEAPON_NAME[first!]}<`);
    expect(faces).toMatch(/id="open-card-3"[^>]*disabled/);
    run = pickOpenCard(run, 0);
    const picked = renderOpenRitual(run);
    expect(picked).toContain(`选定 ${WEAPON_NAME[first!]}`);
    expect(picked).toContain('aria-current="true"');
    expect(run.school).toBe(first);
    expect(run.weaponId).toBe(`${first}-a-3`);
    expect(run.deckRecipe.length).toBeGreaterThan(0);
    expect(pickOpenCard(run, 5).openPick).toBe(0);
  });

  it("另一入口从剑起，挂上牌序就改用字段", () => {
    const seeded = opened(() => 0.6);
    expect(seeded.storyFlags).toContain("s3page:s3-open-b");
    expect(seeded.openDeck?.[0]).toBe("palm");
    const b = renderOpenRitual(seeded);
    expect(b).toContain('data-open-page="s3-open-b"');
    expect(b).toContain('data-open-source="field"');
    expect(b).toContain('data-open-school="palm"');
    const given = opened(() => 0);
    given.openDeck = ["hook", "dart"] as WeaponId[];
    const html = renderOpenRitual(given);
    expect(html).toContain('data-open-source="field"');
    expect(html).toContain('data-open-n="2"');
    expect(html).toContain('data-open-school="hook"');
  });

  it("自取名没写就占位，写下之后用字段", () => {
    const run = opened(() => 0);
    run.storyFlags = [...(run.storyFlags ?? []), "s3page:s3-open-name"];
    const blank = renderOpenRitual(run);
    expect(blank).toContain('data-name-source="placeholder"');
    expect(blank).toContain('id="open-name-keep"');
    expect(blank).toContain("记下这个名字");
    const wrote = renderOpenRitual(writeHeroName(run, "阿青"));
    expect(wrote).toContain('data-name-source="field"');
    expect(wrote).toContain("阿青");
    const named = writeHeroName(opened(() => 0), "阿青");
    const battle = startLabBattle(buildGauntletPreset(named), true, 1);
    expect(battle.player.name).toBe("阿青");
  });
});

describe("敌窗", () => {
  it("foeReact 在就出圆窗，进度条不倒数，结果进播报", () => {
    setLabRuleset("climb");
    setLabMode(true);
    const b = startLabBattle(buildGauntletPreset(createGauntletRun("bandit", "saber")), true, 1);
    b.foeReact = { kind: "dismantle", note: "敌拆招 伤害减半，回敬 3" };
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
    expect(html).toContain('data-foe-react="1"');
    expect(html).toContain('data-foe-react-source="field"');
    expect(html).toContain('data-foe-instant="1"');
    expect(html).toContain(">敌<");
    expect(html).toContain(">拆招<");
    expect(html).toContain("data-foe-note");
    expect(html).toContain("敌拆招 伤害减半，回敬 3");
    const foe = html.slice(html.indexOf('data-foe-react="1"'), html.indexOf("</div>", html.indexOf('data-foe-react="1"')));
    expect(foe).not.toContain("<button");
  });

  it("没有 foeReact 不画圆窗，旧日志单独留着也不画", () => {
    setLabRuleset("climb");
    setLabMode(true);
    const b = startLabBattle(buildGauntletPreset(createGauntletRun("bandit", "saber")), true, 1);
    b.log = ["敌缠手", "伤 4"];
    const quiet = renderProdBattle({
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
    expect(quiet).not.toContain('data-foe-react="1"');
    b.foeReact = { kind: "bind", note: "敌缠手 位移作废，剩招 −1" };
    const hooked = renderProdBattle({
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
    expect(hooked).toContain('data-foe-react-source="field"');
    expect(hooked).toContain(">缠手<");
    expect(hooked).toContain("敌缠手 位移作废，剩招 −1");
  });
});
