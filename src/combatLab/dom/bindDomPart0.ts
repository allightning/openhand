import { S } from "../flow/shellState";
import { api } from "../flow/shellApi";
import { setLabTuning } from "../labTuning";
import { type CompanionId } from "../../game/types";
import { clonePreset, endLabMode } from "../factory";
import { applyAutoLoadout, type AutoTechDepth, type AutoWeaponGrade } from "../autoLoadouts";
import { wikiPageCount, type WikiBook } from "../encyclopedia";
import { type PickFocus } from "../setupUi";
import { playSfx } from "../labAudio";
import { sfxSlot } from "../sfxMap";

function bindDomPart0(): void {
api.bindQiCommitEvents();
  S.root.querySelector("#lab-fullscreen")?.addEventListener("click", async () => {
    try {
      if (!document.fullscreenElement) {
        await S.root.requestFullscreen?.();
        S.labFullscreen = true;
      } else {
        await document.exitFullscreen?.();
        S.labFullscreen = false;
      }
    } catch {
      S.labFullscreen = !S.labFullscreen;
    }
    api.render();
  });
  document.onfullscreenchange = () => {
    S.labFullscreen = Boolean(document.fullscreenElement);
    S.root.classList.toggle("lab-fullscreen", S.labFullscreen);
    document.documentElement.classList.toggle("lab-fullscreen", S.labFullscreen);
  };

  S.root.querySelector("#lab-guide-open")?.addEventListener("click", () => {
    S.guideOpen = true;
    S.wikiOpen = null;
    S.wikiQuery = "";
    S.devPanelOpen = false;
    api.closeSettings();
    playSfx(sfxSlot("ink_ui"));
    api.render();
  });
  S.root.querySelector("#lab-codex-open")?.addEventListener("click", () => {
    S.wikiOpen = "ult";
    S.wikiPage = 0;
    S.wikiQuery = "";
    S.guideOpen = false;
    S.devPanelOpen = false;
    api.closeSettings();
    playSfx(sfxSlot("ink_ui"));
    api.render();
  });
  S.root.querySelector("#lab-dev-open")?.addEventListener("click", () => {
    S.devPanelOpen = true;
    S.guideOpen = false;
    api.closeSettings();
    playSfx(sfxSlot("ink_ui"));
    api.render();
  });
  S.root.querySelector("#lab-settings-open")?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const needRender = S.guideOpen || S.devPanelOpen || S.wikiOpen != null;
    S.guideOpen = false;
    S.devPanelOpen = false;
    S.wikiOpen = null;
    S.wikiQuery = "";
    playSfx(sfxSlot("ink_ui"));
    if (needRender) api.render();
    // 晚一帧挂设置层，避免与 render 抢同一次 DOM 刷新
    queueMicrotask(() => api.openSettings());
  });
  S.root.querySelector("#lab-guide-close")?.addEventListener("click", () => {
    S.guideOpen = false;
    api.render();
  });
  S.root.querySelector("#lab-guide-mask")?.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).id === "lab-guide-mask") {
      S.guideOpen = false;
      api.render();
    }
  });
}
api.bindDomPart0 = bindDomPart0;

function bindDomPart1(): void {
S.root.querySelector("#lab-dev-close")?.addEventListener("click", () => {
    S.devPanelOpen = false;
    api.render();
  });
  S.root.querySelector("#lab-dev-mask")?.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).id === "lab-dev-mask") {
      S.devPanelOpen = false;
      api.render();
    }
  });

  for (const el of S.root.querySelectorAll<HTMLButtonElement>("[data-wiki-open]")) {
    el.addEventListener("click", () => {
      S.wikiOpen = el.dataset.wikiOpen as WikiBook;
      S.wikiPage = 0;
      S.wikiQuery = "";
      S.guideOpen = false;
      S.devPanelOpen = false;
      playSfx(sfxSlot("ink_ui"));
      api.render();
    });
  }
  for (const el of S.root.querySelectorAll<HTMLButtonElement>("[data-wiki-book]")) {
    el.addEventListener("click", () => {
      S.wikiOpen = el.dataset.wikiBook as WikiBook;
      S.wikiPage = 0;
      api.render();
    });
  }
  S.root.querySelector("#lab-wiki-close")?.addEventListener("click", () => {
    S.wikiOpen = null;
    S.wikiQuery = "";
    api.render();
  });
  S.root.querySelector("#lab-wiki-mask")?.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).id === "lab-wiki-mask") {
      S.wikiOpen = null;
      S.wikiQuery = "";
      api.render();
    }
  });
  const wikiSearch = S.root.querySelector<HTMLInputElement>("#lab-wiki-search");
  wikiSearch?.addEventListener("input", () => {
    S.wikiQuery = wikiSearch.value;
    S.wikiPage = 0;
    const caret = wikiSearch.selectionStart ?? S.wikiQuery.length;
    api.render();
    const again = S.root.querySelector<HTMLInputElement>("#lab-wiki-search");
    if (again) {
      again.focus();
      again.setSelectionRange(caret, caret);
    }
  });
  wikiSearch?.addEventListener("keydown", (e) => {
    e.stopPropagation();
  });
  S.root.querySelector("[data-wiki-prev]")?.addEventListener("click", () => {
    if (S.wikiOpen) S.wikiPage = Math.max(0, S.wikiPage - 1);
    api.render();
  });
  S.root.querySelector("[data-wiki-next]")?.addEventListener("click", () => {
    if (S.wikiOpen) S.wikiPage = Math.min(wikiPageCount(S.wikiOpen, S.wikiQuery) - 1, S.wikiPage + 1);
    api.render();
  });
}
api.bindDomPart1 = bindDomPart1;

function bindDomPart2(): void {
for (const el of S.root.querySelectorAll<HTMLButtonElement>("[data-pile]")) {
    el.addEventListener("click", () => {
      const which = el.dataset.pile;
      S.battleSheet = which === "draw" ? "draw" : which === "discard" ? "journal" : null;
      playSfx(sfxSlot("draw_card"));
      api.render();
    });
  }
  S.root.querySelector("#pile-sheet-close")?.addEventListener("click", () => {
    S.battleSheet = null;
    api.render();
  });
  S.root.querySelector("#pile-mask")?.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).id === "pile-mask") {
      S.battleSheet = null;
      api.render();
    }
  });

  S.root.querySelector("#auto-loadout-team")?.addEventListener("change", (e) => {
    S.autoLoadoutId = (e.target as HTMLSelectElement).value;
  });
  S.root.querySelector("#auto-weapon-grade")?.addEventListener("change", (e) => {
    S.autoWeaponGrade = Number((e.target as HTMLSelectElement).value) as AutoWeaponGrade;
  });
  S.root.querySelector("#auto-tech-depth")?.addEventListener("change", (e) => {
    S.autoTechDepth = Number((e.target as HTMLSelectElement).value) as AutoTechDepth;
  });
  S.root.querySelector("#apply-auto-loadout")?.addEventListener("click", () => {
    S.draft = clonePreset(
      applyAutoLoadout(S.autoLoadoutId, S.autoWeaponGrade, S.autoTechDepth, {
        enemyId: S.draft.enemyId,
        extraFoeIds: S.draft.extraFoeIds,
      }),
    );
    S.focusMate = S.draft.fieldMate;
    S.pickFocus = "cards";
    S.selectedDeckIdx = null;
    api.render();
  });

  for (const el of S.root.querySelectorAll<HTMLButtonElement>("[data-pick-focus]")) {
    el.addEventListener("click", () => {
      S.pickFocus = el.dataset.pickFocus as PickFocus;
      if (el.dataset.focusMate) S.focusMate = el.dataset.focusMate as CompanionId;
      api.render();
    });
  }

  api.bindPickPanelEvents();

  S.root.querySelector("#lab-exit")?.addEventListener("click", () => {
    endLabMode();
    window.location.href = "./index.html";
  });
  S.root.querySelector("#lab-back-setup")?.addEventListener("click", () => {
    S.phase = "setup";
    S.battle = null;
    endLabMode();
    api.render();
  });
  S.root.querySelector("#lab-new")?.addEventListener("click", () => {
    S.phase = "setup";
    api.render();
  });
  for (const el of S.root.querySelectorAll<HTMLButtonElement>("[data-mode]")) {
    el.addEventListener("click", () => {
      setLabTuning({ designerMode: el.dataset.mode === "designer" });
      api.render();
    });
  }
  for (const el of S.root.querySelectorAll<HTMLButtonElement>("[data-preset]")) {
    el.addEventListener("click", () => api.loadDraft(el.dataset.preset!));
  }
}
api.bindDomPart2 = bindDomPart2;
