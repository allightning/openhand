import { S } from "../flow/shellState";
import { api } from "../flow/shellApi";
import { BREAK_MODE_OPEN } from "../labRuleset";
import { getLabTuning, setLabTuning } from "../labTuning";
import { type CompanionId } from "../../game/types";
import { clonePreset, endLabMode } from "../factory";
import { saveCustomPreset } from "../storage";
import { exitGauntletTuning } from "../gauntlet";
import { demoRewardOptions } from "../breakDemo";
import { createHallRun, hallCoursesIn, type HallBout, type HallCabinet, type HallCourseId } from "../trainingHall";
import { advanceCampaignAfterClear, markBreakCampaignCleared } from "../breakCampaign";

function bindDomPart3(): void {
S.root.querySelector("#save-preset")?.addEventListener("click", () => {
    api.syncDraft();
    saveCustomPreset({ ...clonePreset(S.draft), id: `custom-${Date.now()}`, name: `${S.draft.name}（自定义）` });
    api.render();
  });
  api.bindSlider("sl-deck-mult", "deckMultiplier", "val-deck-mult", Number);
  api.bindSlider("sl-deck-mult-pause", "deckMultiplier", "val-deck-mult-pause", Number);
  api.bindSlider("sl-enemy-hp-setup", "enemyHpMul", "val-enemy-hp-setup", Number);
  api.bindSlider("sl-enemy-seg-setup", "enemySegBonus", "val-enemy-seg-setup", Number);
  api.bindSlider("sl-enemy-stress-setup", "enemyStressCap", "val-enemy-stress-setup", Number);
  const enemyHpSetup = document.getElementById("sl-enemy-hp-setup") as HTMLInputElement | null;
  enemyHpSetup?.addEventListener("input", () => {
    const val = Number(enemyHpSetup.value);
    setLabTuning({ enemyHpMul: val });
    const label = document.getElementById("val-enemy-hp-setup");
    if (label) label.textContent = val.toFixed(2);
  });
  S.root.querySelector("#tog-grudge-setup")?.addEventListener("change", (e) => {
    setLabTuning({ v2Grudge: (e.target as HTMLInputElement).checked });
  });
  for (const [id, key] of [
    ["tog-v2", "rulesV2"],
    ["tog-fx", "v2Fx"],
    ["tog-variant", "v2VariantAi"],
    ["tog-grudge", "v2Grudge"],
    ["tog-combo", "rulesCombo"],
  ] as const) {
    S.root.querySelector(`#${id}`)?.addEventListener("change", (e) => {
      if (!getLabTuning().designerMode) return;
      setLabTuning({ [key]: (e.target as HTMLInputElement).checked });
      api.render();
    });
  }

  api.bindCardPanelEvents();
  S.root.querySelector("#start-battle")?.addEventListener("click", api.beginBattle);
  S.root.querySelector("#start-gauntlet")?.addEventListener("click", () => {
    S.gauntletPath = null;
    S.gauntletWantEndless = false;
    // 开踢 = 正式选线；新手关另有入口，不再塞进开踢
    S.gauntletScreen = "path";
    api.render();
  });
  S.root.querySelector("#hall-continue")?.addEventListener("click", () => {
    api.restoreClimbCamp();
  });
  S.root.querySelector("#start-gauntlet-endless")?.addEventListener("click", () => {
    S.gauntletPath = null;
    S.gauntletWantEndless = true;
    S.gauntletScreen = "path";
    api.render();
  });
  S.root.querySelector("#start-rookie-demo")?.addEventListener("click", () => {
    S.gauntletPath = null;
    api.startBreakDemo("rookie");
  });
  S.root.querySelector("#start-break-demo")?.addEventListener("click", () => {
    if (!BREAK_MODE_OPEN) return;
    api.enterMode("break");
    S.gauntletPath = null;
    S.gauntletScreen = "intro";
    api.render();
  });
  S.root.querySelector("#start-training-hall")?.addEventListener("click", () => {
    if (!BREAK_MODE_OPEN) return;
    api.enterMode("break");
    S.hallScreen = "catalog";
    S.hallRun = null;
    api.render();
  });
}
api.bindDomPart3 = bindDomPart3;

function bindDomPart4(): void {
S.root.querySelector("#start-break-campaign")?.addEventListener("click", () => {
    if (!BREAK_MODE_OPEN) return;
    api.startBreakCampaign();
  });
  S.root.querySelector("#campaign-retry")?.addEventListener("click", () => {
    if (!S.campaignRun) return;
    S.campaignScreen = null;
    S.campaignChapterDone = false;
    api.beginCampaignBattle();
  });
  S.root.querySelector("#campaign-next")?.addEventListener("click", () => {
    if (!S.campaignRun) return;
    const stepped = advanceCampaignAfterClear(S.campaignRun);
    if (stepped.done) {
      markBreakCampaignCleared();
      S.campaignChapterDone = true;
      S.campaignScreen = "cleared";
      api.render();
      return;
    }
    S.campaignRun = stepped.run;
    S.campaignScreen = null;
    S.campaignChapterDone = false;
    api.beginCampaignBattle();
  });
  S.root.querySelector("#campaign-restart")?.addEventListener("click", () => {
    api.startBreakCampaign();
  });
  S.root.querySelector("#campaign-back-home")?.addEventListener("click", () => {
    S.campaignRun = null;
    S.qiFight = null;
    S.campaignScreen = null;
    S.campaignChapterDone = false;
    S.battle = null;
    S.phase = "setup";
    endLabMode();
    exitGauntletTuning();
    api.render();
  });
  for (const el of S.root.querySelectorAll<HTMLButtonElement>("[data-campaign-home]")) {
    el.addEventListener("click", () => {
      S.campaignRun = null;
      S.campaignScreen = null;
      S.campaignChapterDone = false;
      S.battle = null;
      S.phase = "setup";
      endLabMode();
      exitGauntletTuning();
      api.render();
    });
  }
  for (const el of S.root.querySelectorAll<HTMLButtonElement>("[data-hall-cab]")) {
    el.addEventListener("click", () => {
      const next = el.dataset.hallCab as HallCabinet;
      if (next !== "break" && next !== "weapon") return;
      S.hallCab = next;
      S.hallFocus = hallCoursesIn(S.hallCab)[0]!.id;
      api.render();
    });
  }
  for (const el of S.root.querySelectorAll<HTMLButtonElement>("[data-hall-focus]")) {
    el.addEventListener("click", () => {
      const id = el.dataset.hallFocus as HallCourseId;
      if (!id) return;
      S.hallFocus = id;
      api.render();
    });
  }
}
api.bindDomPart4 = bindDomPart4;

function bindDomPart5(): void {
S.root.querySelector("#hall-back-home")?.addEventListener("click", () => {
    S.hallScreen = null;
    S.hallRun = null;
    api.render();
  });
  S.root.querySelector("#hall-back-catalog")?.addEventListener("click", () => {
    S.hallScreen = "catalog";
    S.hallRun = null;
    S.battle = null;
    S.phase = "setup";
    endLabMode();
    exitGauntletTuning();
    api.render();
  });
  S.root.querySelector("#hall-retry")?.addEventListener("click", () => {
    if (!S.hallRun) return;
    S.hallScreen = null;
    api.beginHallBattle();
  });
  S.root.querySelector("#hall-goto-drill")?.addEventListener("click", () => {
    if (!S.hallRun) return;
    S.hallRun = createHallRun(S.hallRun.courseId, 2);
    S.hallScreen = null;
    api.beginHallBattle();
  });
  S.root.querySelector("#hall-goto-guide")?.addEventListener("click", () => {
    if (!S.hallRun) return;
    S.hallRun = createHallRun(S.hallRun.courseId, 1);
    S.hallScreen = null;
    api.beginHallBattle();
  });
  for (const el of S.root.querySelectorAll<HTMLButtonElement>("[data-hall-start]")) {
    el.addEventListener("click", () => {
      const id = el.dataset.hallStart as HallCourseId;
      const bout = Number(el.dataset.hallBout) as HallBout;
      if (!id || (bout !== 1 && bout !== 2)) return;
      S.hallRun = createHallRun(id, bout);
      api.beginHallBattle();
    });
  }
  S.root.querySelector("#break-intro-go")?.addEventListener("click", () => {
    api.startBreakDemo();
  });
  S.root.querySelector("#break-intro-back")?.addEventListener("click", () => {
    S.gauntletScreen = null;
    api.render();
  });
  S.root.querySelector("#demo-retry")?.addEventListener("click", () => {
    S.demoScreen = null;
    api.beginDemoBattle();
  });
  S.root.querySelector("#demo-abort")?.addEventListener("click", () => {
    api.exitGauntlet();
  });
  for (const el of S.root.querySelectorAll<HTMLButtonElement>("[data-demo-reward]")) {
    el.addEventListener("click", () => {
      if (!S.breakDemoRun) return;
      const idx = Number(el.dataset.demoReward);
      const opt = demoRewardOptions(S.breakDemoRun.stage)[idx];
      if (!opt) return;
      api.afterDemoRewardPicked(opt.id);
    });
  }
  for (const el of S.root.querySelectorAll<HTMLButtonElement>("[data-demo-companion]")) {
    el.addEventListener("click", () => {
      const id = el.dataset.demoCompanion as CompanionId;
      if (!id) return;
      api.afterDemoCompanion(id);
    });
  }
}
api.bindDomPart5 = bindDomPart5;
