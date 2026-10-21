import { S } from "./shellState";
import { api } from "./shellApi";
import { setLabMode, setLabTuning } from "../labTuning";
import { clonePreset, endLabMode, startLabBattle } from "../factory";
import { startTelemetry } from "../telemetry";
import { enterGauntletTuning } from "../gauntlet";
import { applyHallBattle, buildHallPreset, syncHallLesson, hallTitle, hallQiFight, hallUsesQiCommit, hallCampaignShell } from "../trainingHall";

function beginHallBattle(): void {
  if (!S.hallRun) return;
  try {
    enterGauntletTuning();
    if (hallUsesQiCommit(S.hallRun.courseId)) {
      api.enterMode("break");
      setLabMode(true);
      S.hallRun = syncHallLesson({
        ...S.hallRun,
        lessonStep: S.hallRun.bout === 1 ? 0 : S.hallRun.lessonStep,
        foeDebrief: null,
        qiTick: hallCampaignShell(S.hallRun),
      });
      S.qiFight = hallQiFight(S.hallRun);
      S.battle = null;
      S.telemetry = startTelemetry({
        presetId: `hall-${S.hallRun.courseId}-${S.hallRun.bout}`,
        presetName: hallTitle(S.hallRun),
        enemyId: "mob_road_01",
        designerMode: false,
        startedAt: Date.now(),
      });
      S.phase = "battle";
      S.hallScreen = null;
      S.paused = false;
      S.hoverUid = null;
      S.hoverIntentIdx = null;
      S.weaponOpen = null;
      api.resetCombatPlayback();
      api.render();
      return;
    }
    setLabTuning({
      rulesV2: true,
      v2Fx: true,
      rulesCombo: Boolean(S.hallRun.companion),
      playerEnergyBonus: 0,
      playerDmgMul: 1,
      enemyHpMul: 0.85,
      enemySegBonus: 0,
      dmgCoef: 1,
      v2Grudge: false,
    });
    S.hallRun = syncHallLesson({ ...S.hallRun, lessonStep: S.hallRun.bout === 1 ? 0 : S.hallRun.lessonStep, foeDebrief: null });
    const preset = buildHallPreset(S.hallRun);
    S.draft = clonePreset(preset);
    setLabMode(true);
    S.battle = applyHallBattle(startLabBattle(preset, false, 1), S.hallRun);
    S.telemetry = startTelemetry({
      presetId: `hall-${S.hallRun.courseId}-${S.hallRun.bout}`,
      presetName: hallTitle(S.hallRun),
      enemyId: preset.enemyId,
      designerMode: false,
      startedAt: Date.now(),
    });
    S.phase = "battle";
    S.hallScreen = null;
    S.paused = false;
    S.hoverUid = null;
    S.hoverIntentIdx = null;
    S.weaponOpen = null;
    api.resetCombatPlayback();
    api.scheduleFoeFirstHold();
    api.render();
  } catch (err) {
    console.error("[training-hall] beginHallBattle failed", err);
    S.hallScreen = "catalog";
    api.render();
  }
}
api.beginHallBattle = beginHallBattle;

function finishHallBattle(outcome: "win" | "loss"): void {
  if (!S.hallRun) return;
  S.battle = null;
  S.qiFight = null;
  S.phase = "setup";
  endLabMode();
  S.hallScreen = outcome === "win" ? "cleared" : "retry";
  api.render();
}
api.finishHallBattle = finishHallBattle;
