import { S } from "../flow/shellState";
import { api } from "../flow/shellApi";
import { applyLabFightScale } from "../../game/sim";
import { getLabTuning, setLabTuning } from "../labTuning";
import { canMateEquipGear } from "../../game/equippedWeapon";
import { type CardId, type CompanionId, type EnemyId, type TechniqueId } from "../../game/types";
import { primaryWeapon } from "../factory";
import { shellRunContext } from "../shellContext";
import { tryAddMate, tryAddToRecipe, tryLearnTech, deckTypeLabel } from "../rules";
import { pruneDeckForWeapon } from "../cardUi";
import { pickPanelTitle, renderDeckRecipeHtml, renderPickPanel } from "../setupUi";
import { isBossEnemy } from "../../game/labEnemyStress";

function bindSlider(id: string, key: keyof ReturnType<typeof getLabTuning>, valId: string, parse: (v: string) => number): void {
  const el = document.getElementById(id) as HTMLInputElement | null;
  el?.addEventListener("input", () => {
    if (!getLabTuning().designerMode && id.startsWith("sl-") && !id.includes("deck-mult")) return;
    const val = parse(el.value);
    setLabTuning({ [key]: val });
    if (key === "dmgCoef") applyLabFightScale(shellRunContext());
    const label = document.getElementById(valId);
    if (label) label.textContent = key === "dmgCoef" ? val.toFixed(2) : String(val);
    if (key === "deckMultiplier" && S.phase === "setup") {
      const count = S.root.querySelector(".lab-recipe-count");
      if (count) {
        const mult = getLabTuning().deckMultiplier;
        count.textContent = `${deckTypeLabel(S.draft.deckRecipe, mult)} · ${S.draft.deckRecipe.length}/20`;
      }
    }
  });
}
api.bindSlider = bindSlider;

function refreshSetupPanels(): void {
  api.syncDraft();
  const deck = S.root.querySelector("#deck-zone");
  if (deck) deck.innerHTML = renderDeckRecipeHtml(S.draft, S.selectedDeckIdx, S.flyInDeckIdx);
  const pickBody = S.root.querySelector("#pick-panel-body");
  if (pickBody) pickBody.innerHTML = renderPickPanel(S.draft, S.pickFocus, S.focusMate, S.showBlockedCards);
  const pickTitle = S.root.querySelector("#pick-panel-title");
  if (pickTitle) pickTitle.textContent = pickPanelTitle(S.pickFocus, S.focusMate);
  api.bindCardPanelEvents();
  api.bindPickPanelEvents();
}
api.refreshSetupPanels = refreshSetupPanels;

function bindPickPanelEvents(): void {
  S.root.querySelector("#show-blocked")?.addEventListener("change", (e) => {
    S.showBlockedCards = (e.target as HTMLInputElement).checked;
    api.refreshSetupPanels();
  });
  for (const el of S.root.querySelectorAll<HTMLButtonElement>("[data-pick-enemy]")) {
    el.addEventListener("click", () => {
      S.draft.enemyId = el.dataset.pickEnemy as EnemyId;
      if (isBossEnemy(S.draft.enemyId)) setLabTuning({ v2Grudge: true });
      api.render();
    });
  }
  for (const el of S.root.querySelectorAll<HTMLButtonElement>("[data-pick-mate]")) {
    el.addEventListener("click", () => {
      const id = el.dataset.pickMate as CompanionId;
      S.focusMate = id;
      if (S.draft.party.includes(id)) {
        S.pickFocus = "mates";
        api.render();
        return;
      }
      const gate = tryAddMate(S.draft.party, id);
      if (!gate.ok) return;
      S.draft.party = gate.party;
      S.pickFocus = "mates";
      api.render();
    });
  }
  for (const el of S.root.querySelectorAll<HTMLButtonElement>("[data-pick-weapon]")) {
    el.addEventListener("click", () => {
      const mateId = el.dataset.weaponMate as CompanionId;
      const wid = el.dataset.pickWeapon!;
      if (!canMateEquipGear(mateId, wid, shellRunContext())) return;
      S.draft.mateWeapons[mateId] = wid;
      if (mateId === S.draft.fieldMate) {
        S.draft.deckRecipe = pruneDeckForWeapon(S.draft.deckRecipe, wid);
      }
      api.render();
    });
  }
  for (const el of S.root.querySelectorAll<HTMLButtonElement>("[data-pick-tech]")) {
    el.addEventListener("click", () => {
      const mateId = el.dataset.techMate as CompanionId;
      const id = el.dataset.pickTech as TechniqueId;
      const have = S.draft.mateTechs[mateId] ?? [];
      if (have.includes(id)) {
        S.draft.mateTechs[mateId] = have.filter((t) => t !== id);
        api.render();
        return;
      }
      const gate = tryLearnTech(have, id);
      if (!gate.ok) return;
      S.draft.mateTechs[mateId] = gate.list;
      api.render();
    });
  }
  for (const el of S.root.querySelectorAll<HTMLButtonElement>("[data-forget-tech], .lab-tech-forget")) {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      const mateId = el.dataset.techMate as CompanionId;
      const techId = el.dataset.forgetTech as TechniqueId;
      S.draft.mateTechs[mateId] = (S.draft.mateTechs[mateId] ?? []).filter((t) => t !== techId);
      api.render();
    });
  }
  for (const el of S.root.querySelectorAll<HTMLButtonElement>("[data-set-field]")) {
    el.addEventListener("click", () => {
      S.draft.fieldMate = el.dataset.setField as CompanionId;
      S.focusMate = S.draft.fieldMate;
      api.render();
    });
  }
  for (const el of S.root.querySelectorAll<HTMLButtonElement>("[data-drop-mate]")) {
    el.addEventListener("click", () => {
      const id = el.dataset.dropMate as CompanionId;
      S.draft.party = S.draft.party.filter((m) => m !== id);
      delete S.draft.mateTechs[id];
      delete S.draft.mateWeapons[id];
      if (S.draft.fieldMate === id) S.draft.fieldMate = S.draft.party[0]!;
      S.focusMate = S.draft.fieldMate;
      api.render();
    });
  }
}
api.bindPickPanelEvents = bindPickPanelEvents;

function bindCardPanelEvents(): void {
  for (const el of S.root.querySelectorAll<HTMLButtonElement>("[data-add-card]:not([disabled])")) {
    el.addEventListener("click", () => {
      const id = el.dataset.addCard as CardId;
      const weapon = primaryWeapon(S.draft);
      const gate = tryAddToRecipe(S.draft.deckRecipe, id, weapon);
      if (!gate.ok) return;
      S.flyInDeckIdx = gate.recipe.length - 1;
      S.draft.deckRecipe = gate.recipe;
      api.refreshSetupPanels();
      window.setTimeout(() => {
        S.flyInDeckIdx = null;
        api.refreshSetupPanels();
      }, 420);
    });
  }
  for (const el of S.root.querySelectorAll<HTMLElement>(".lab-mini-card[data-deck-idx]")) {
    el.addEventListener("click", () => {
      const idx = Number(el.dataset.deckIdx);
      if (S.selectedDeckIdx === idx) {
        S.draft.deckRecipe = S.draft.deckRecipe.filter((_, i) => i !== idx);
        S.selectedDeckIdx = null;
      } else S.selectedDeckIdx = idx;
      api.refreshSetupPanels();
    });
  }
}
api.bindCardPanelEvents = bindCardPanelEvents;
