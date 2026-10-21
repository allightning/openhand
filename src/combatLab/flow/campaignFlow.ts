import { S } from "./shellState";
import { api } from "./shellApi";
import { applyLabFightScale } from "../../game/sim";
import { setLabMode, setLabTuning } from "../labTuning";
import { endLabMode, startLabBattle } from "../factory";
import { shellRunContext } from "../shellContext";
import { startTelemetry } from "../telemetry";
import { enterGauntletTuning } from "../gauntlet";
import { applyCampaignBattle, buildCampaignPreset, campaignBadge, campaignStageCount, createBreakCampaignRun, createQiFightFromStage, currentCampaignStage, markBreakCampaignCleared, recordCampaignClear, syncCampaignLesson, tickCampaignAfterResolve } from "../breakCampaign";

function beginCampaignBattle(): void {
  if (!S.campaignRun) return;
  try {
    enterGauntletTuning();
    api.enterMode("break");
    setLabMode(true);
    setLabTuning({
      rulesV2: true,
      v2Fx: true,
      rulesCombo: false,
    });
    applyLabFightScale(shellRunContext());
    S.paused = false;
    S.hoverUid = null;
    S.weaponOpen = null;
    S.campaignRun = syncCampaignLesson({
      ...S.campaignRun,
      foeDebrief: null,
    });
    const preset = buildCampaignPreset(S.campaignRun);
    S.telemetry = startTelemetry({
      presetId: `break-campaign-${S.campaignRun.stageId}`,
      presetName: campaignBadge(S.campaignRun),
      enemyId: preset.enemyId,
      designerMode: false,
      startedAt: Date.now(),
    });
    S.battle = applyCampaignBattle(startLabBattle(preset, false, 1), S.campaignRun);
    S.qiFight = createQiFightFromStage(currentCampaignStage(S.campaignRun));
    S.phase = "battle";
    S.campaignScreen = null;
    S.campaignChapterDone = false;
    S.gauntletScreen = null;
    S.demoScreen = null;
    S.hallScreen = null;
    api.resetCombatPlayback();
    api.scheduleFoeFirstHold();
    api.render();
  } catch (err) {
    console.error("[break-campaign] beginCampaignBattle failed", err);
    S.gauntletError = `登门开战失败：${err instanceof Error ? err.message : String(err)}`;
    S.campaignScreen = "retry";
    S.phase = "setup";
    api.render();
  }
}
api.beginCampaignBattle = beginCampaignBattle;

function startBreakCampaign(): void {
  enterGauntletTuning();
  S.gauntletRun = null;
  S.gauntletScreen = null;
  S.breakDemoRun = null;
  S.demoScreen = null;
  S.hallRun = null;
  S.hallScreen = null;
  S.qiFight = null;
  api.enterMode("break");
  S.campaignRun = createBreakCampaignRun();
  S.campaignScreen = null;
  S.campaignChapterDone = false;
  S.gauntletScreen = null;
  S.demoScreen = null;
  S.hallScreen = null;
  S.breakDemoRun = null;
  S.hallRun = null;
  api.beginCampaignBattle();
}
api.startBreakCampaign = startBreakCampaign;

function finishCampaignBattle(outcome: "win" | "loss"): void {
  if (!S.campaignRun) return;
  if (outcome === "win") {
    const hp = S.qiFight?.playerHp ?? S.battle?.player.hp ?? S.campaignRun.hp;
    S.campaignRun = recordCampaignClear(
      S.campaignRun,
      S.campaignRun.sessionHardBreaks + S.campaignRun.sessionChases,
      hp,
    );
    S.campaignChapterDone = S.campaignRun.stageIndex >= campaignStageCount() - 1;
    S.battle = null;
    S.phase = "setup";
    endLabMode();
    S.campaignScreen = "cleared";
    if (S.campaignChapterDone) markBreakCampaignCleared();
    api.render();
    return;
  }
  if (!S.campaignRun.lastFailTip) {
    S.campaignRun = {
      ...S.campaignRun,
      lastFailTip: S.campaignRun.lastFailTip || "拆错或挨打——看本关目标再试。",
    };
  }
  S.battle = null;
  S.phase = "setup";
  endLabMode();
  S.campaignScreen = "retry";
  api.render();
}
api.finishCampaignBattle = finishCampaignBattle;

function finishCampaignFromTick(tick: ReturnType<typeof tickCampaignAfterResolve>): void {
  if (!S.campaignRun) return;
  S.campaignRun = tick.run;
  if (tick.kind === "win") {
    api.finishCampaignBattle("win");
    return;
  }
  if (tick.kind === "lose") {
    S.campaignRun = { ...S.campaignRun, lastFailTip: tick.tip };
    api.finishCampaignBattle("loss");
  }
}
api.finishCampaignFromTick = finishCampaignFromTick;
