import { S } from "./shellState";
import { api } from "./shellApi";
import { ENEMIES } from "../../game/content";
import { isClimbQi, previewCard } from "../../game/sim";
import { getLabTuning, setLabMode, setLabTuning } from "../labTuning";
import { type Battle } from "../../game/types";
import { endLabMode, startLabBattle } from "../factory";
import { shellRunContext } from "../shellContext";
import { pushReport } from "../storage";
import { finishTelemetry, startTelemetry } from "../telemetry";
import type { LabTelemetry } from "../types";
import { playSting } from "../labAudio";
import { isBossEnemy } from "../../game/labEnemyStress";

function previewMatchesPlay(b: Battle, uid: string, after: Battle): boolean {
  const prev = previewCard(b, uid, shellRunContext());
  return (
    after.enemy.hp === prev.enemyHp &&
    after.enemy.pos === prev.enemyPos &&
    after.player.hp === prev.playerHp &&
    after.player.pos === prev.playerPos
  );
}
api.previewMatchesPlay = previewMatchesPlay;

function detectStallTurn(b: Battle): number | undefined {
  const elite = ENEMIES[b.enemyId]?.elite;
  const limit =
    b.enemyId === "lord" || b.enemyId === "usurper" || b.enemyId === "twin" ? 16 : elite ? 12 : 8;
  if (b.turn > limit) return b.turn;
  return undefined;
}
api.detectStallTurn = detectStallTurn;

function resetTurnTimer(): void {
  if (S.turnTimer != null) window.clearInterval(S.turnTimer);
  S.turnTimer = null;
  if (S.phase !== "battle" || !S.battle || S.battle.phase !== "player") return;
  S.turnStartedAt = performance.now();
  const limit = getLabTuning().turnLimitSec;
  if (limit <= 0) return;
  S.turnTimer = window.setInterval(() => {
    const elapsed = (performance.now() - S.turnStartedAt) / 1000;
    if (elapsed >= limit && !S.paused) {
      S.paused = true;
      api.render();
    }
  }, 500);
}
api.resetTurnTimer = resetTurnTimer;

function beginBattle(): void {
  api.syncDraft();
  if (isBossEnemy(S.draft.enemyId)) {
    setLabTuning({ v2Grudge: true });
  }
  setLabMode(true);
  S.battle = startLabBattle(S.draft);
  S.telemetry = startTelemetry({
    presetId: S.draft.id,
    presetName: S.draft.name,
    enemyId: S.draft.enemyId,
    designerMode: getLabTuning().designerMode,
    startedAt: Date.now(),
  });
  S.phase = "battle";
  S.paused = false;
  S.hoverUid = null;
  S.weaponOpen = null;
  if (isClimbQi(shellRunContext())) api.scheduleClimbBattleOpen();
  else {
    api.resetCombatPlayback();
    api.scheduleFoeFirstHold();
  }
  api.render();
}
api.beginBattle = beginBattle;

function endBattle(outcome: LabTelemetry["outcome"]): void {
  if (outcome === "win" || outcome === "loss") playSting(outcome === "win" ? "win" : "lose");
  if (S.telemetry && S.battle) {
    S.telemetry = finishTelemetry(S.telemetry, outcome, api.detectStallTurn(S.battle), S.battle);
    pushReport(S.telemetry);
  }
  if (S.gauntletRun) {
    if (outcome === "win") api.finishGauntletBattle("win");
    else api.finishGauntletBattle("loss");
    return;
  }
  if (S.breakDemoRun) {
    if (outcome === "win") api.finishDemoBattle("win");
    else api.finishDemoBattle("loss");
    return;
  }
  if (S.hallRun) {
    if (outcome === "win") api.finishHallBattle("win");
    else api.finishHallBattle("loss");
    return;
  }
  if (S.campaignRun) {
    if (outcome === "win") api.finishCampaignBattle("win");
    else api.finishCampaignBattle("loss");
    return;
  }
  S.phase = "report";
  S.battle = null;
  endLabMode();
  api.render();
}
api.endBattle = endBattle;
