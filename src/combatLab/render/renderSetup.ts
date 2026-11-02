import { S } from "../flow/shellState";
import { api } from "../flow/shellApi";
import { peekClimbContinue } from "../climbContinue";
import { reviveCost, runCompanions, GAUNTLET_SCHOOL_LOADOUT } from "../gauntlet";
import { HOME_BG, staticOverlayBg } from "../sceneBg";
import { renderBreakIntro } from "../breakOnboard";
import { renderDemoShell } from "../breakDemoUi";
import { renderHallCleared, renderHallRetry, renderTrainingHallCatalog } from "../trainingHallUi";
import { renderCampaignCleared, renderCampaignRetry } from "../breakCampaignUi";
import { renderGauntletCompanionPick, renderGauntletBanker, renderGauntletLifeline, renderGauntletOverlay, renderGauntletResult, renderGauntletRewardPick, renderGauntletRewardTarget, renderGauntletPathPick, renderGauntletSchoolPick, renderGauntletWager, renderGauntletEvent, renderGauntletOpening, renderGauntletFinale, renderGauntletScar, renderGauntletSettle } from "../gauntletUi";
import { renderOpenRitual } from "./openFlip";
import { renderShellDeath } from "./shellDeath";
import { renderShellEvent } from "./shellEvent";
import { paintShellHall, renderShellPath } from "./shellHall";
import { paintShellLoadout } from "./shellLoadout";

function renderSetup(): string {
  api.syncDraft();
  if (S.gauntletScreen === "intro") {
    return `${api.renderHeader()}${renderGauntletOverlay("intro", renderBreakIntro())}`;
  }
  if (S.hallScreen === "catalog") {
    return `${api.renderHeader()}${renderGauntletOverlay("pick", renderTrainingHallCatalog(S.hallCab, S.hallFocus))}`;
  }
  if (S.hallScreen === "cleared" && S.hallRun) {
    return `${api.renderHeader()}${renderGauntletOverlay("result", renderHallCleared(S.hallRun), staticOverlayBg("result"))}`;
  }
  if (S.hallScreen === "retry" && S.hallRun) {
    return `${api.renderHeader()}${renderGauntletOverlay("result", renderHallRetry(S.hallRun), staticOverlayBg("result"))}`;
  }
  if (S.campaignScreen === "cleared" && S.campaignRun) {
    return `${api.renderHeader()}${renderGauntletOverlay("result", renderCampaignCleared(S.campaignRun, S.campaignChapterDone), staticOverlayBg("result"))}`;
  }
  if (S.campaignScreen === "retry" && S.campaignRun) {
    return `${api.renderHeader()}${renderGauntletOverlay("result", renderCampaignRetry(S.campaignRun), staticOverlayBg("result"))}`;
  }
  if (S.demoScreen && S.breakDemoRun) {
    if (S.demoScreen === "retry") {
      return `${api.renderHeader()}${renderGauntletOverlay(
        "result",
        `<div class="gauntlet-shell"><header class="gauntlet-head"><h2>本局未过</h2><p>示范可重打，不扣正式进度。</p></header>
        <div class="gauntlet-wager-actions">
          <button type="button" class="lab-btn primary large" id="demo-retry">再试本局</button>
          <button type="button" class="lab-btn" id="demo-abort">退出示范</button>
        </div></div>`,
        staticOverlayBg("result"),
      )}`;
    }
    return `${api.renderHeader()}${renderGauntletOverlay(S.demoScreen, renderDemoShell(S.demoScreen, S.breakDemoRun, S.demoMarketBought))}`;
  }
  if (S.gauntletScreen === "path") {
    return `${api.renderHeader()}${api.paintGauntletOverlay("path", renderShellPath(renderGauntletPathPick(S.gauntletWantEndless, S.gauntletRun ?? undefined)))}`;
  }
  if (S.gauntletScreen === "pick") {
    return `${api.renderHeader()}${api.paintGauntletOverlay("pick", renderGauntletSchoolPick(S.gauntletPath ?? "bandit", S.gauntletError))}`;
  }
  if (S.gauntletScreen === "settle" && S.gauntletRun && S.pendingWin) {
    return `${api.renderHeader()}${api.paintGauntletOverlay("settle", renderGauntletSettle(S.gauntletRun, S.pendingWin.texts))}`;
  }
  if (S.gauntletScreen === "opening" && S.gauntletRun) {
    return `${api.renderHeader()}${api.paintGauntletOverlay("opening", renderGauntletOpening(S.gauntletRun))}`;
  }
  if (S.gauntletScreen === "event" && S.gauntletRun && S.gauntletEventKind) {
    return `${api.renderHeader()}${api.paintGauntletOverlay("event", renderShellEvent(renderGauntletEvent(S.gauntletRun, S.gauntletEventKind, S.gauntletEventChoices)) + renderOpenRitual(S.gauntletRun))}`;
  }
  if (S.gauntletScreen === "finale" && S.gauntletRun) {
    return `${api.renderHeader()}${api.paintGauntletOverlay("finale", renderGauntletFinale(S.gauntletRun))}`;
  }
  if (S.gauntletScreen === "scar" && S.gauntletRun) {
    return `${api.renderHeader()}${api.paintGauntletOverlay("scar", renderGauntletScar(S.gauntletRun))}`;
  }
  if (S.gauntletScreen === "companion" && S.gauntletRun) {
    return `${api.renderHeader()}${api.paintGauntletOverlay("companion", renderGauntletCompanionPick(S.gauntletRun, S.gauntletCompanions))}`;
  }
  if (S.gauntletScreen === "reward" && S.gauntletRun) {
    return `${api.renderHeader()}${api.paintGauntletOverlay("reward", renderGauntletRewardPick(S.gauntletRun, S.gauntletRewards, S.gauntletMarket, S.gauntletMarketBought, S.gauntletRewardTakes, S.gauntletMarketRefreshN, S.gauntletRewardsAreSuper))}`;
  }
  if (S.gauntletScreen === "loadout" && S.gauntletRun) {
    return `${api.renderHeader()}${api.paintGauntletOverlay("loadout", paintShellLoadout(S.gauntletRun, S.loadoutFocusMate ?? undefined, S.loadoutPage, S.loadoutPick))}`;
  }
  if (S.gauntletScreen === "banker" && S.gauntletRun) {
    return `${api.renderHeader()}${api.paintGauntletOverlay("banker", renderGauntletBanker())}`;
  }
  if (S.gauntletScreen === "lifeline" && S.gauntletRun) {
    return `${api.renderHeader()}${api.paintGauntletOverlay("lifeline", renderShellDeath(renderGauntletLifeline(S.gauntletRun), "lifeline", true))}`;
  }
  if (S.gauntletScreen === "wager" && S.gauntletRun) {
    return `${api.renderHeader()}${api.paintGauntletOverlay("wager", renderGauntletWager(S.gauntletRun, S.wagerOffersCache, S.wagerKind, S.wagerStake))}`;
  }
  if (S.gauntletScreen === "rewardTarget" && S.gauntletRun && S.pendingReward) {
    const members = [GAUNTLET_SCHOOL_LOADOUT[S.gauntletRun.school].fieldMate, ...runCompanions(S.gauntletRun)];
    return `${api.renderHeader()}${api.paintGauntletOverlay("rewardTarget", renderGauntletRewardTarget(S.gauntletRun, S.pendingReward.title, members))}`;
  }
  if (S.gauntletScreen === "result" && S.gauntletRun) {
    const elapsed = Math.max(0, Math.round((Date.now() - S.gauntletRun.startedAt) / 1000));
    const note = S.gauntletEndedByLoss
      ? S.gauntletResultNote ||
        (S.gauntletRun.bankruptUsed ? "本局已用过赊账" : S.gauntletRun.pot < reviveCost(S.gauntletRun.stage) ? "彩金不足破产线" : "")
      : S.gauntletResultNote;
    return `${api.renderHeader()}${api.paintGauntletOverlay("result", renderShellDeath(renderGauntletResult(S.gauntletRun, elapsed, note), "result", S.gauntletEndedByLoss))}`;
  }
  return `${api.renderHeader()}${renderGauntletOverlay("intro", paintShellHall(peekClimbContinue()), `/${HOME_BG}`)}`;
}
api.renderSetup = renderSetup;
