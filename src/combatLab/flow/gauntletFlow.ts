import { S } from "./shellState";
import { api } from "./shellApi";
import { setLabMode, setLabTuning } from "../labTuning";
import { MATES } from "../../game/party";
import { startLabBattle } from "../factory";
import { startTelemetry } from "../telemetry";
import { clearClimbContinue } from "../climbContinue";
import { applyStageTuning, buildGauntletPreset, buildSkirmishPreset, createGauntletRun, enterGauntletTuning, getGauntletFinalStage, isGauntletEndless, ladderEntryForRun, rollGauntletRewards, saveGauntletBest, gauntletRewardTakeCount, consumeFightStartMods, consumeCampMods, runCompanions, gauntletFieldMate, wagerOffers, wagerStakeMax } from "../gauntlet";
import { shouldShowFinale } from "../encounter";
import { queuePostCampBeat, usesBanditStory } from "../storyBeats";
import { combatBgPool, takeSceneBg } from "../sceneBg";
import { canStartBattle } from "../loadout";
import { shouldSkipWager } from "../breakOnboard";
import type { WeaponId } from "../../game/types";

function beginGauntletBattle(): void {
  if (!S.gauntletRun) return;
  try {
    const entry = ladderEntryForRun(S.gauntletRun);
    // §31.13 下注落锤：开擂前把选中的注写进 run，收馆结算
    const offer = S.wagerKind ? S.wagerOffersCache.find((o) => o.kind === S.wagerKind) : null;
    const stake = Math.min(S.wagerStake ?? 0, wagerStakeMax(S.gauntletRun.pot, S.gauntletRun.stage));
    if (!canStartBattle(S.gauntletRun)) {
      S.gauntletError = "出战牌包张数或道具格不合阶段上限，先去营地配装。";
      S.loadoutFocusMate = gauntletFieldMate(S.gauntletRun.school);
      S.gauntletScreen = "loadout";
      api.render();
      return;
    }
    const wager = offer && stake > 0 ? { kind: offer.kind, stake, target: offer.target, odds: offer.odds } : null;
    S.gauntletRun = {
      ...S.gauntletRun,
      pot: wager ? S.gauntletRun.pot - stake : S.gauntletRun.pot,
      wager,
      pendingOpenWager: false,
    };
    S.wagerKind = null;
    S.wagerStake = null;
    applyStageTuning(entry, S.gauntletRun);
    // §31.9 伙伴入伙后组合技/光环开启；仙药劲力上限随 run 走
    setLabTuning({
      rulesCombo: Boolean(runCompanions(S.gauntletRun).length || S.gauntletRun.lifelineCompanion),
      playerEnergyBonus: S.gauntletRun.bonusEnergyMax ?? 0,
      playerDmgMul: S.gauntletRun.statBoostMul ?? 1,
    });
    const painted = takeSceneBg(
      S.gauntletRun,
      `combat:${S.gauntletRun.path}:${S.gauntletRun.stage}`,
      combatBgPool(S.gauntletRun.path, S.gauntletRun.stage),
    );
    S.gauntletRun = painted.run;
    const preset = { ...buildGauntletPreset(S.gauntletRun), sceneBg: painted.url };
    S.draft = preset;
    setLabMode(true);
    S.battle = startLabBattle(preset, false, 1);
    S.gauntletRun = consumeFightStartMods(S.gauntletRun);
    S.telemetry = startTelemetry({
      presetId: `gauntlet-${S.gauntletRun.school}`,
      presetName: entry.label,
      enemyId: preset.enemyId,
      designerMode: false,
      startedAt: Date.now(),
    });
    S.phase = "battle";
    S.gauntletScreen = null;
    S.paused = false;
    S.hoverUid = null;
    S.hoverIntentIdx = null;
    S.weaponOpen = null;
    api.scheduleClimbBattleOpen();
    api.render();
  } catch (err) {
    console.error("[gauntlet] beginGauntletBattle failed", err);
    S.gauntletError = `开战失败：${err instanceof Error ? err.message : String(err)}`;
    S.gauntletScreen = "wager";
    api.render();
  }
}
api.beginGauntletBattle = beginGauntletBattle;

function beginSkirmishBattle(): void {
  if (!S.gauntletRun) return;
  try {
    S.gauntletRun = { ...S.gauntletRun, skirmishActive: true, wager: null };
    const entry = ladderEntryForRun({ ...S.gauntletRun, stage: 1 });
    applyStageTuning(entry, { pendingDmgMul: 0.65, forceDangerNext: false, scars: 0 });
    setLabTuning({
      rulesCombo: Boolean(runCompanions(S.gauntletRun).length || S.gauntletRun.lifelineCompanion),
      playerEnergyBonus: S.gauntletRun.bonusEnergyMax ?? 0,
      playerDmgMul: S.gauntletRun.statBoostMul ?? 1,
      enemyHpMul: 0.45,
    });
    const painted = takeSceneBg(
      S.gauntletRun,
      `skirmish:${S.gauntletRun.path}:${S.gauntletRun.stage}`,
      combatBgPool(S.gauntletRun.path, S.gauntletRun.stage),
    );
    S.gauntletRun = painted.run;
    const preset = { ...buildSkirmishPreset(S.gauntletRun), sceneBg: painted.url };
    S.draft = preset;
    setLabMode(true);
    S.battle = startLabBattle(preset, false, 1);
    const recruit = S.gauntletRun.pendingRecruit;
    if (S.battle && recruit && S.gauntletRun.pendingSkirmish === "duel") {
      S.battle.enemy.name = MATES[recruit]?.name ?? recruit;
      S.battle.enemy.title = "点到为止";
    } else if (S.battle && recruit && S.gauntletRun.pendingSkirmish === "save") {
      S.battle.enemy.title = `围住${MATES[recruit]?.name ?? "他"}的人`;
    }
    S.telemetry = startTelemetry({
      presetId: `skirmish-${S.gauntletRun.school}`,
      presetName: preset.name,
      enemyId: preset.enemyId,
      designerMode: false,
      startedAt: Date.now(),
    });
    S.phase = "battle";
    S.gauntletScreen = null;
    S.paused = false;
    S.hoverUid = null;
    S.hoverIntentIdx = null;
    S.weaponOpen = null;
    api.scheduleClimbBattleOpen();
    api.render();
  } catch (err) {
    console.error("[gauntlet] beginSkirmishBattle failed", err);
    S.gauntletError = `短战失败：${err instanceof Error ? err.message : String(err)}`;
    S.gauntletRun = { ...S.gauntletRun, skirmishActive: false, pendingSkirmish: undefined };
    S.gauntletScreen = "event";
    api.render();
  }
}
api.beginSkirmishBattle = beginSkirmishBattle;

function finishGauntletRewardPick(): void {
  if (!S.gauntletRun) return;
  if (S.gauntletRewardsAreSuper) {
    S.gauntletRewardsAreSuper = false;
    S.gauntletRewards = rollGauntletRewards(S.gauntletRun, Math.random);
    S.gauntletRewardTakes = 0;
    S.gauntletScreen = "reward";
    api.render();
    return;
  }
  S.gauntletRewardTakes += 1;
  S.gauntletScreen = "reward";
  api.persistCampContinue();
  api.render();
}
api.finishGauntletRewardPick = finishGauntletRewardPick;

function leaveGauntletCamp(): void {
  if (!S.gauntletRun) return;
  const need = gauntletRewardTakeCount(S.gauntletRun);
  if (S.gauntletRewardsAreSuper && S.gauntletRewards.length) return;
  if (!S.gauntletRewardsAreSuper && S.gauntletRewardTakes < need && S.gauntletRewards.length) return;
  S.gauntletRewards = [];
  S.gauntletRewardsAreSuper = false;
  S.gauntletRewardTakes = 0;
  S.gauntletRun = consumeCampMods(S.gauntletRun);
  if (S.gauntletRun.streak >= getGauntletFinalStage(S.gauntletRun) && !isGauntletEndless(S.gauntletRun)) {
    S.gauntletEndedByLoss = false;
    S.gauntletResultNote = "通关 · 十程走完";
    saveGauntletBest(S.gauntletRun);
    S.gauntletScreen = "result";
    api.render();
    return;
  }
  if (shouldShowFinale(S.gauntletRun)) {
    S.gauntletScreen = "finale";
    api.render();
    return;
  }
  if (usesBanditStory(S.gauntletRun)) {
    const fought = Math.max(1, S.gauntletRun.stage - 1);
    S.gauntletRun = queuePostCampBeat(S.gauntletRun, fought, Math.random);
  }
  if (api.openBanditStoryScreen()) return;
  api.goToWagerOrBattle();
}
api.leaveGauntletCamp = leaveGauntletCamp;

/** 垫资后进赌馆；新手关/训练馆不走这条。 */
function goToWagerOrBattle(): void {
  if (!S.gauntletRun) return;
  S.wagerKind = null;
  S.wagerStake = null;
  if (S.gauntletRun.skipNextWager) {
    S.gauntletRun = { ...S.gauntletRun, skipNextWager: false, wager: null };
    S.gauntletScreen = null;
    api.beginGauntletBattle();
    return;
  }
  if (shouldSkipWager(S.gauntletRun.stage, S.gauntletRun)) {
    S.gauntletRun = { ...S.gauntletRun, pendingOpenWager: false, wager: null };
    S.gauntletScreen = null;
    api.beginGauntletBattle();
    return;
  }
  S.wagerOffersCache = wagerOffers(S.gauntletRun, Math.random);
  S.gauntletScreen = "wager";
  api.render();
}
api.goToWagerOrBattle = goToWagerOrBattle;

function startGauntletSchool(school: WeaponId): void {
  S.campaignRun = null;
  S.qiFight = null;
  S.campaignScreen = null;
  S.campaignChapterDone = false;
  S.breakDemoRun = null;
  S.demoScreen = null;
  S.hallRun = null;
  S.hallScreen = null;
  api.enterMode("climb");
  const path = S.gauntletPath ?? "bandit";
  S.gauntletPath = path;
  S.gauntletError = "";
  enterGauntletTuning();
  try {
    if (!S.gauntletWantEndless) clearClimbContinue();
    S.gauntletRun = createGauntletRun(path, school, S.gauntletBossRotation, { endless: S.gauntletWantEndless });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    S.gauntletError = `开程失败：${msg}`;
    console.error("[gauntlet] createGauntletRun failed", { path, school, err });
    api.render();
    return;
  }
  S.wagerKind = null;
  S.wagerStake = null;
  if (usesBanditStory(S.gauntletRun) && S.gauntletRun.storyPending === "opening") {
    S.gauntletScreen = "opening";
    api.render();
    return;
  }
  api.goToWagerOrBattle();
}
api.startGauntletSchool = startGauntletSchool;
