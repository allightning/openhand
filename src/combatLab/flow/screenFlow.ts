import { S } from "./shellState";
import { api } from "./shellApi";
import { setLabMode } from "../labTuning";
import { endLabMode } from "../factory";
import { stopSting } from "../labAudio";
import { exitGauntletTuning } from "../gauntlet";

function render(): void {
  setLabMode(S.phase === "battle" || S.gauntletRun != null);
  document.documentElement.classList.toggle("lab-fullscreen", S.labFullscreen);
  S.root.classList.toggle("lab-fullscreen", S.labFullscreen);
  api.syncBgmWithScreen();
  api.syncBattleAudio(S.phase === "battle" ? S.battle : null);
  const overlayHtml = api.renderOverlays();
  const { content } = api.labShell();
  if (S.phase === "setup") content.innerHTML = api.renderSetup() + overlayHtml;
  else if (S.phase === "battle") content.innerHTML = api.renderBattle() + overlayHtml;
  else content.innerHTML = api.renderReport() + overlayHtml;
  api.bindEvents();
  api.settleFxIfReplay();
  if (S.phase === "battle" && S.battle?.v2FxQueue?.length && !S.foePlaybackBusy) {
    api.scheduleFxClear(S.FX_HOLD_MS);
  }
  api.resetTurnTimer();
}
api.render = render;

function exitGauntlet(): void {
  stopSting();
  S.routeBookOpen = false;
  S.gauntletRun = null;
  S.gauntletScreen = null;
  S.breakDemoRun = null;
  S.demoScreen = null;
  S.hallRun = null;
  S.hallScreen = null;
  S.campaignRun = null;
  S.qiFight = null;
  S.campaignScreen = null;
  S.campaignChapterDone = false;
  S.battleSheet = null;
  S.demoMarketBought = new Set();
  S.gauntletPath = null;
  S.gauntletWantEndless = false;
  S.gauntletRewards = [];
  S.gauntletRewardsAreSuper = false;
  S.gauntletCompanions = [];
  S.wagerKind = null;
  S.wagerStake = null;
  S.gauntletMarket = [];
  S.gauntletMarketBought = new Set();
  S.gauntletEndedByLoss = false;
  S.gauntletResultNote = "";
  S.battle = null;
  S.phase = "setup";
  S.paused = false;
  S.hoverUid = null;
  S.weaponOpen = null;
  exitGauntletTuning();
  endLabMode();
  api.render();
}
api.exitGauntlet = exitGauntlet;
