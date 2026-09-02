import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { labCard } from "../game/labContent";
import { getContentOverrides, resetContentOverrides } from "../game/labContentOverrides";
import { setLabMode } from "../game/labTuning";
import {
  confirmDevEntityOverride,
  isDevFormDirty,
  recordDevDraft,
  renderDevPanelModal,
  resetDevDrafts,
  setDevPanelState,
} from "./devPanel";
import { setLabRuleset } from "./labRuleset";

describe("实验台确认修改", () => {
  beforeEach(() => {
    setLabMode(true);
    setLabRuleset("break");
    resetContentOverrides();
    resetDevDrafts();
    setDevPanelState({ tab: "card" });
  });
  afterEach(() => {
    resetContentOverrides();
    resetDevDrafts();
    setLabMode(false);
  });

  it("草稿键是输入 id（dev-card-cost），不是 #dev-card-cost", () => {
    recordDevDraft("dev-card-cost", "4");
    expect(isDevFormDirty()).toBe(true);
  });

  it("有草稿时确认按钮可点；确认后覆盖进实验室并改 labCard", () => {
    recordDevDraft("dev-card-cost", "4");
    recordDevDraft("dev-card-dmg", "9");
    const html = renderDevPanelModal();
    expect(html).toContain("生效");
    expect(html).not.toMatch(/id="dev-confirm"[^>]*\bdisabled\b/);

    confirmDevEntityOverride();
    expect(getContentOverrides().cards.strike?.cost).toBe(4);
    expect(getContentOverrides().cards.strike?.damage).toBe(9);
    expect(labCard("strike").cost).toBe(4);
    expect(labCard("strike").damage).toBe(9);
  });
});
