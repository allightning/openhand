import "../style.css";
import "./lab.css";
import "./gauntlet.css";
import { setLabRuleset } from "./labRuleset";
import { S } from "./flow/shellState";
import { api } from "./flow/shellApi";
import { clonePreset, primaryWeapon } from "./factory";
import { allPresets, getLastPresetId } from "./storage";
import { pruneDeckForWeapon } from "./cardUi";
import { bgmPlaying, debugAudioState, unlockAudio } from "./labAudio";
import { type GauntletPath } from "./gauntletPaths";
import type { WeaponId } from "../game/types";

import "./flow/playbackFlow";
import "./flow/foeRecapFlow";
import "./flow/campFlow";
import "./render/shellPaint";
import "./flow/battleFlow";
import "./flow/settingsFlow";
import "./flow/audioFlow";
import "./render/renderSetup";
import "./flow/screenFlow";
import "./flow/hallFlow";
import "./flow/demoFlow";
import "./flow/campaignFlow";
import "./flow/gauntletFlow";
import "./flow/gauntletSettleFlow";
import "./render/renderBattle";
import "./dom/bindSetup";
import "./dom/bindQi";
import "./dom/bindDomPart0";
import "./dom/bindDomPart1";
import "./dom/bindDomPart2";
import "./dom/bindDomPart3";
import "./dom/bindDomPart4";
import "./dom/bindDomPart5";
import "./dom/bindDomPart6";
import "./dom/bindDom";

api.enterMode = (r?: string): void => {
  setLabRuleset(r);
};

const last = getLastPresetId();

if (last) {
  const found = allPresets().find((p) => p.id === last);
  if (found) {
    S.draft = clonePreset(found);
    S.draft.deckRecipe = pruneDeckForWeapon(S.draft.deckRecipe, primaryWeapon(S.draft));
    S.focusMate = S.draft.fieldMate;
  }
}

document.documentElement.classList.add("lab-root");

S.root.classList.add("lab-root");

/** 踢馆选线/选系：事件委托，避免 innerHTML 重绘后漏绑点击。 */
S.root.addEventListener("click", (e) => {
  const t = e.target as HTMLElement;
  const pathBtn = t.closest<HTMLElement>("[data-gauntlet-path]");
  if (pathBtn?.dataset.gauntletPath) {
    S.gauntletPath = pathBtn.dataset.gauntletPath as GauntletPath;
    S.gauntletScreen = "pick";
    S.gauntletError = "";
    api.render();
    return;
  }
  const schoolBtn = t.closest<HTMLElement>("[data-gauntlet-school]");
  if (schoolBtn) {
    const school = schoolBtn.dataset.gauntletSchool as WeaponId | undefined;
    if (!school) return;
    api.startGauntletSchool(school);
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && S.phase === "battle" && S.summonPending) {
    S.summonPending = null;
    api.render();
    return;
  }
  if (e.key === "Escape" && S.phase === "battle" && S.weaponOpen) {
    S.weaponOpen = null;
    api.render();
  }
  if (e.key === "Escape" && S.settingsHost) {
    api.closeSettings();
  }
});

document.addEventListener("pointerdown", unlockAudio);

if (import.meta.env.DEV) {
  (window as unknown as { __labAudio?: unknown }).__labAudio = { bgmPlaying, debugAudioState };
}

api.render();
