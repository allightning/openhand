import { S } from "./shellState";
import { api } from "./shellApi";
import { setLabMode, setLabTuning } from "../labTuning";
import { type CardId, type CompanionId } from "../../game/types";
import { endLabMode, startLabBattle } from "../factory";
import { startTelemetry } from "../telemetry";
import { enterGauntletTuning, exitGauntletTuning } from "../gauntlet";
import { advanceDemoAfterWin, applyBreakDemoBattle, buildBreakDemoPreset, createBreakDemoRun, markBreakDemoDone, markRookieDemoDone, syncDemoLesson, type DemoStage } from "../breakDemo";

function beginDemoBattle(): void {
  if (!S.breakDemoRun) return;
  try {
    enterGauntletTuning();
    setLabTuning({
      rulesCombo: Boolean(S.breakDemoRun.companion),
      playerEnergyBonus: 0,
      playerDmgMul: 1,
      enemyHpMul: 0.85,
      enemySegBonus: 0,
      dmgCoef: 1,
      v2Grudge: false,
    });
    S.breakDemoRun = syncDemoLesson({
      ...S.breakDemoRun,
      lessonStep: 0,
      foeDebrief: null,
      swapTaught: S.breakDemoRun.stage === 6 ? false : S.breakDemoRun.swapTaught,
    });
    const preset = buildBreakDemoPreset(S.breakDemoRun);
    S.draft = preset;
    setLabMode(true);
    S.battle = applyBreakDemoBattle(startLabBattle(preset, false, 1), S.breakDemoRun);
    S.telemetry = startTelemetry({
      presetId: `break-demo-${S.breakDemoRun.stage}`,
      presetName: preset.name,
      enemyId: preset.enemyId,
      designerMode: false,
      startedAt: Date.now(),
    });
    S.phase = "battle";
    S.gauntletScreen = null;
    S.demoScreen = null;
    S.paused = false;
    S.hoverUid = null;
    S.hoverIntentIdx = null;
    S.weaponOpen = null;
    api.resetCombatPlayback();
    api.scheduleFoeFirstHold();
    api.render();
  } catch (err) {
    console.error("[break-demo] beginDemoBattle failed", err);
    S.gauntletError = `示范开战失败：${err instanceof Error ? err.message : String(err)}`;
    S.demoScreen = "retry";
    S.phase = "setup";
    api.render();
  }
}
api.beginDemoBattle = beginDemoBattle;

function startBreakDemo(track: "rookie" | "break" = "break"): void {
  enterGauntletTuning();
  S.breakDemoRun = createBreakDemoRun(track);
  S.demoMarketBought = new Set();
  S.demoScreen = null;
  S.gauntletScreen = null;
  api.beginDemoBattle();
}
api.startBreakDemo = startBreakDemo;

function finishDemoBattle(outcome: "win" | "loss"): void {
  if (!S.breakDemoRun || !S.battle) return;
  const breaks = S.battle.v2BreakCount ?? 0;
  S.breakDemoRun = {
    ...S.breakDemoRun,
    items: [...(S.battle.labItems ?? [])],
    itemCharges: { ...(S.battle.labItemCharges ?? {}) },
  };
  if (outcome === "win") {
    S.breakDemoRun = advanceDemoAfterWin(S.breakDemoRun, breaks, S.battle.player.hp);
    S.battle = null;
    S.phase = "setup";
    S.demoScreen = "reward";
    S.demoMarketBought = new Set();
    endLabMode();
    api.render();
    return;
  }
  S.battle = null;
  S.phase = "setup";
  S.demoScreen = "retry";
  endLabMode();
  api.render();
}
api.finishDemoBattle = finishDemoBattle;

function afterDemoRewardPicked(cardId: CardId): void {
  if (!S.breakDemoRun) return;
  S.breakDemoRun = {
    ...S.breakDemoRun,
    deckRecipe: [...S.breakDemoRun.deckRecipe, cardId],
  };
  if (S.breakDemoRun.stage === 4 && !S.breakDemoRun.companion) {
    S.demoScreen = "companion";
  } else {
    S.demoScreen = "market";
  }
  api.render();
}
api.afterDemoRewardPicked = afterDemoRewardPicked;

function afterDemoCompanion(id: CompanionId): void {
  if (!S.breakDemoRun) return;
  S.breakDemoRun = { ...S.breakDemoRun, companion: id };
  S.demoScreen = "market";
  api.render();
}
api.afterDemoCompanion = afterDemoCompanion;

function afterDemoMarketContinue(): void {
  if (!S.breakDemoRun) return;
  const last = (S.breakDemoRun.track ?? "break") === "rookie" ? 4 : 6;
  if (S.breakDemoRun.stage >= last) {
    S.demoScreen = "graduate";
    api.render();
    return;
  }
  const next = (S.breakDemoRun.stage + 1) as DemoStage;
  S.breakDemoRun = syncDemoLesson({
    ...S.breakDemoRun,
    stage: next,
    lessonStep: 0,
    foeDebrief: null,
      swapTaught: next === 6 ? false : S.breakDemoRun.swapTaught,
  });
  S.demoMarketBought = new Set();
  api.beginDemoBattle();
}
api.afterDemoMarketContinue = afterDemoMarketContinue;

function graduateDemoToHome(): void {
  if ((S.breakDemoRun?.track ?? "break") === "rookie") markRookieDemoDone();
  else markBreakDemoDone();
  S.breakDemoRun = null;
  S.demoScreen = null;
  S.demoMarketBought = new Set();
  S.gauntletScreen = null;
  S.gauntletPath = null;
  exitGauntletTuning();
  endLabMode();
  api.render();
}
api.graduateDemoToHome = graduateDemoToHome;
