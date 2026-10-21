import { S } from "../flow/shellState";
import { api } from "../flow/shellApi";
import { type CompanionId, type TechniqueId } from "../../game/types";
import { bindGauntletDevPanel } from "../devPanel";
import { applyCompanion, ladderEntryForRun, rollGauntletRewards, gauntletRewardTakeCount, applyBankerBoost, applyLifeline, reviveGauntletRun, applyScarPass, gauntletFieldMate, sellPriceFor, equipStashTech, feedStashTech, unequipTechToStash, equipStashMind, toggleGodUsing } from "../gauntlet";
import { applyEncounterChoice, applyFinale, type FinaleKind } from "../encounter";
import { applyStoryChoice, continueStoryTravel, dismissStoryOpening, usesBanditStory } from "../storyBeats";
import { fuseOwnedCard, moveDeckToStash, moveStashToDeck, sellStashCard } from "../loadout";

function bindDomPart9(): void {
S.root.querySelector("#gauntlet-open-loadout")?.addEventListener("click", () => {
    if (S.gauntletRun) S.loadoutFocusMate = gauntletFieldMate(S.gauntletRun.school);
    S.loadoutPage = "deck";
    S.loadoutPick = null;
    S.gauntletScreen = "loadout";
    api.render();
  });
  S.root.querySelector("#gauntlet-loadout-back")?.addEventListener("click", () => {
    S.loadoutPick = null;
    S.gauntletScreen = "reward";
    api.render();
  });
  for (const el of S.root.querySelectorAll<HTMLButtonElement>("[data-loadout-page]")) {
    el.addEventListener("click", () => {
      const raw = el.dataset.loadoutPage;
      S.loadoutPage = raw === "tech" || raw === "arts" ? "tech" : raw === "mind" ? "mind" : raw === "weapon" ? "weapon" : "deck";
      S.loadoutPick = null;
      api.render();
    });
  }
  for (const el of S.root.querySelectorAll<HTMLButtonElement>("[data-loadout-mate]")) {
    el.addEventListener("click", () => {
      S.loadoutFocusMate = el.dataset.loadoutMate as CompanionId;
      S.loadoutPick = null;
      api.render();
    });
  }
  const loadoutMate = () =>
    S.gauntletRun ? (S.loadoutFocusMate ?? gauntletFieldMate(S.gauntletRun.school)) : null;
  const applyLoadoutDrag = (from: string, drop: string) => {
    if (!S.gauntletRun) return;
    const mate = loadoutMate();
    if (!mate) return;
    const [zone, idxRaw] = from.split(":");
    const idx = Number(idxRaw);
    if (!Number.isFinite(idx)) return;
    if (drop === "board" && zone === "stash") {
      if (S.loadoutPage === "deck") S.gauntletRun = moveStashToDeck(S.gauntletRun, mate, idx);
      else if (S.loadoutPage === "tech") {
        const id = (S.gauntletRun.stashTechs ?? [])[idx];
        const learned = S.gauntletRun.mateTechs[mate] ?? [];
        if (id && learned.includes(id)) S.gauntletRun = feedStashTech(S.gauntletRun, mate, idx);
        else S.gauntletRun = equipStashTech(S.gauntletRun, mate, idx);
      } else if (S.loadoutPage === "mind") S.gauntletRun = equipStashMind(S.gauntletRun, mate, idx);
    } else if (drop === "stash" && zone === "board") {
      if (S.loadoutPage === "deck") S.gauntletRun = moveDeckToStash(S.gauntletRun, mate, idx);
      else if (S.loadoutPage === "tech") {
        const id = (S.gauntletRun.mateTechs[mate] ?? [])[idx];
        if (id) S.gauntletRun = unequipTechToStash(S.gauntletRun, mate, id);
      }
    } else if (drop === "sell" && zone === "stash" && S.loadoutPage === "deck") {
      S.gauntletRun = sellStashCard(S.gauntletRun, idx, sellPriceFor("card", S.gauntletRun.stage, ladderEntryForRun(S.gauntletRun).tier));
    } else if (drop === "craft" && zone === "stash") {
      if (S.loadoutPage === "deck") {
        const id = (S.gauntletRun.stashCards ?? [])[idx];
        if (id) S.gauntletRun = fuseOwnedCard(S.gauntletRun, id);
      } else if (S.loadoutPage === "tech") S.gauntletRun = feedStashTech(S.gauntletRun, mate, idx);
    }
    S.loadoutPick = null;
    api.render();
  };
  for (const el of S.root.querySelectorAll<HTMLElement>("[data-drag]")) {
    el.addEventListener("dragstart", (e) => {
      const dt = (e as DragEvent).dataTransfer;
      if (!dt) return;
      dt.setData("text/plain", el.dataset.drag ?? "");
      dt.effectAllowed = "move";
    });
  }
  for (const el of S.root.querySelectorAll<HTMLElement>("[data-drop]")) {
    el.addEventListener("dragover", (e) => {
      e.preventDefault();
      const dt = (e as DragEvent).dataTransfer;
      if (dt) dt.dropEffect = "move";
    });
    el.addEventListener("drop", (e) => {
      e.preventDefault();
      const from = (e as DragEvent).dataTransfer?.getData("text/plain") ?? "";
      const drop = el.dataset.drop ?? "";
      if (from && drop) applyLoadoutDrag(from, drop);
    });
  }
  for (const el of S.root.querySelectorAll<HTMLButtonElement>("[data-pick-zone]")) {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!S.gauntletRun) return;
      const zone = el.dataset.pickZone === "stash" ? "stash" : "board";
      const idx = Number(el.dataset.pickIdx);
      if (!Number.isFinite(idx)) return;
      const again = S.loadoutPick?.zone === zone && S.loadoutPick.idx === idx;
      if (!again) {
        S.loadoutPick = { zone, idx };
        api.render();
        return;
      }
      const mate = loadoutMate();
      if (!mate) return;
      if (el.dataset.equipIdx != null) S.gauntletRun = moveStashToDeck(S.gauntletRun, mate, Number(el.dataset.equipIdx));
      else if (el.dataset.unequipMate != null) {
        S.gauntletRun = moveDeckToStash(S.gauntletRun, el.dataset.unequipMate as import("../../game/types").CompanionId, Number(el.dataset.unequipIdx));
      } else if (el.dataset.equipTechIdx != null) S.gauntletRun = equipStashTech(S.gauntletRun, mate, Number(el.dataset.equipTechIdx));
      else if (el.dataset.feedTechIdx != null) S.gauntletRun = feedStashTech(S.gauntletRun, mate, Number(el.dataset.feedTechIdx));
      else if (el.dataset.unequipTech != null) S.gauntletRun = unequipTechToStash(S.gauntletRun, mate, el.dataset.unequipTech as TechniqueId);
      else if (el.dataset.equipMindIdx != null) S.gauntletRun = equipStashMind(S.gauntletRun, mate, Number(el.dataset.equipMindIdx));
      S.loadoutPick = null;
      api.render();
    });
  }
  S.root.querySelector("#gauntlet-stash-sell")?.addEventListener("click", () => {
    if (!S.gauntletRun || S.loadoutPage !== "deck" || S.loadoutPick?.zone !== "stash") return;
    S.gauntletRun = sellStashCard(S.gauntletRun, S.loadoutPick.idx, sellPriceFor("card", S.gauntletRun.stage, ladderEntryForRun(S.gauntletRun).tier));
    S.loadoutPick = null;
    api.render();
  });
  S.root.querySelector("#gauntlet-stash-craft")?.addEventListener("click", () => {
    if (!S.gauntletRun) return;
    const mate = loadoutMate();
    if (S.loadoutPage === "weapon") {
      S.gauntletRun = toggleGodUsing(S.gauntletRun);
      api.render();
      return;
    }
    if (S.loadoutPick?.zone !== "stash" || !mate) return;
    if (S.loadoutPage === "deck") {
      const id = (S.gauntletRun.stashCards ?? [])[S.loadoutPick.idx];
      if (id) S.gauntletRun = fuseOwnedCard(S.gauntletRun, id);
    } else if (S.loadoutPage === "tech") S.gauntletRun = feedStashTech(S.gauntletRun, mate, S.loadoutPick.idx);
    S.loadoutPick = null;
    api.render();
  });
}
api.bindDomPart9 = bindDomPart9;

function bindDomPart10(): void {
bindGauntletDevPanel(S.root, () => api.render());
  const finishOpening = () => {
    if (!S.gauntletRun) return;
    S.gauntletRun = dismissStoryOpening(S.gauntletRun);
    api.goToWagerOrBattle();
  };
  S.root.querySelector("#story-opening-continue")?.addEventListener("click", finishOpening);
  S.root.querySelector("#story-opening-skip")?.addEventListener("click", finishOpening);
  S.root.querySelector("#story-travel-continue")?.addEventListener("click", () => {
    if (!S.gauntletRun) return;
    S.gauntletRun = continueStoryTravel(S.gauntletRun);
    S.gauntletEventKind = null;
    S.gauntletEventChoices = [];
    api.goToWagerOrBattle();
  });
  for (const el of S.root.querySelectorAll<HTMLButtonElement>("[data-banker-mult]")) {
    el.addEventListener("click", () => {
      if (!S.gauntletRun) return;
      const mult = Number(el.dataset.bankerMult) as 2 | 3;
      S.gauntletRun = applyBankerBoost(S.gauntletRun, mult);
      if (usesBanditStory(S.gauntletRun) && S.gauntletRun.storyPending === "opening") {
        S.gauntletScreen = "opening";
        api.render();
        return;
      }
      api.goToWagerOrBattle();
    });
  }
  for (const el of S.root.querySelectorAll<HTMLButtonElement>("[data-lifeline]")) {
    el.addEventListener("click", () => {
      if (!S.gauntletRun) return;
      const kind = el.dataset.lifeline as import("../gauntlet").LifelineKind;
      S.gauntletRun = applyLifeline(S.gauntletRun, kind, Math.random);
      const revived = reviveGauntletRun(S.gauntletRun);
      if (!revived) return;
      S.gauntletRun = revived;
      S.gauntletEndedByLoss = false;
      api.goToWagerOrBattle();
    });
  }
  for (const el of S.root.querySelectorAll<HTMLButtonElement>("[data-companion-idx]")) {
    el.addEventListener("click", () => {
      if (!S.gauntletRun) return;
      const idx = Number(el.dataset.companionIdx);
      const mateId = S.gauntletCompanions[idx];
      if (!mateId) return;
      S.gauntletRun = applyCompanion(S.gauntletRun, mateId);
      S.gauntletCompanions = [];
      S.gauntletRewards = rollGauntletRewards(S.gauntletRun, Math.random);
      S.gauntletRewardsAreSuper = false;
      S.gauntletRewardTakes = 0;
      api.rollGauntletMarket();
      S.gauntletScreen = "reward";
      api.persistCampContinue();
      api.render();
    });
  }
}
api.bindDomPart10 = bindDomPart10;

function bindDomPart11(): void {
for (const el of S.root.querySelectorAll<HTMLButtonElement>("[data-event-idx]")) {
    el.addEventListener("click", () => {
      if (!S.gauntletRun || !S.gauntletEventKind) return;
      const choice = S.gauntletEventChoices[Number(el.dataset.eventIdx)];
      if (!choice) return;
      S.gauntletRun = (usesBanditStory(S.gauntletRun) ? applyStoryChoice : applyEncounterChoice)(S.gauntletRun, choice, Math.random);
      S.gauntletEventKind = null;
      S.gauntletEventChoices = [];
      const fought = Math.max(1, S.gauntletRun.stage - 1);
      if (S.gauntletRun.pendingSkirmish) {
        api.beginSkirmishBattle();
        return;
      }
      if (choice.companionId && !choice.skirmish) {
        S.gauntletRun = { ...applyCompanion(S.gauntletRun, choice.companionId), pendingRecruit: undefined };
      }
      if (usesBanditStory(S.gauntletRun)) {
        if (S.gauntletRun.storyPending === "followup" || S.gauntletRun.storyPending === "choice") {
          api.openBanditStoryScreen();
          return;
        }
        if (choice.openMarket) {
          S.gauntletRewards = [];
          S.gauntletRewardsAreSuper = false;
          S.gauntletRewardTakes = gauntletRewardTakeCount(S.gauntletRun);
          api.rollGauntletMarket();
          S.gauntletScreen = "reward";
          api.persistCampContinue();
          api.render();
          return;
        }
        api.goToWagerOrBattle();
        return;
      }
      api.openGauntletCamp(fought);
    });
  }
  for (const el of S.root.querySelectorAll<HTMLButtonElement>("[data-finale]")) {
    el.addEventListener("click", () => {
      if (!S.gauntletRun) return;
      S.gauntletRun = applyFinale(S.gauntletRun, el.dataset.finale as FinaleKind);
      api.goToWagerOrBattle();
    });
  }
  S.root.querySelector("#gauntlet-scar-pass")?.addEventListener("click", () => {
    if (!S.gauntletRun) return;
    S.gauntletRun = applyScarPass(S.gauntletRun);
    S.gauntletEndedByLoss = false;
    api.openGauntletCamp(Math.max(1, S.gauntletRun.stage - 1));
  });
  S.root.querySelector("#lab-pause")?.addEventListener("click", () => {
    S.paused = !S.paused;
    api.render();
  });
  S.root.querySelector("#lab-resume")?.addEventListener("click", () => {
    S.paused = false;
    api.resetTurnTimer();
    api.render();
  });
  S.root.querySelector("#lab-overlay")?.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).id === "lab-overlay") {
      S.paused = false;
      api.render();
    }
  });
  api.bindSlider("sl-dmg", "dmgCoef", "val-dmg", Number);
  api.bindSlider("sl-break", "breakWindow", "val-break", Number);
  api.bindSlider("sl-ai", "aiAggression", "val-ai", Number);
  api.bindSlider("sl-limit", "turnLimitSec", "val-limit", Number);
  api.bindSlider("sl-enemy-hp", "enemyHpMul", "val-enemy-hp", Number);
}
api.bindDomPart11 = bindDomPart11;
