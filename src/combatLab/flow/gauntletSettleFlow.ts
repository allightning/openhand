import { S } from "./shellState";
import { api } from "./shellApi";
import { stopSting } from "../labAudio";
import { afterGauntletLoss, afterGauntletWin, applyCompanion, settleHallPot, wagerBattleStats, rollCompanionChoices, getGauntletFinalStage, nextBossId, saveGauntletBest, consumeHallPotMods, canOfferScarPass, canOfferLifeline, reviveCost, runCompanions } from "../gauntlet";
import { isCompanionMilestone, maxCompanions } from "../gauntletPaths";
import { eventAfterFought, rollEventChoices } from "../encounter";
import { continueStoryTravel, rollStoryChoices, usesBanditStory } from "../storyBeats";

function finishGauntletBattle(outcome: "win" | "loss"): void {
  if (!S.gauntletRun || !S.battle) return;
  if (S.gauntletRun.skirmishActive) {
    const fought = Math.max(1, S.gauntletRun.stage - 1);
    const recruit = S.gauntletRun.pendingRecruit;
    const side = S.gauntletRun.pendingSkirmish === "side";
    const sideLabel = S.gauntletRun.pendingSideLabel;
    S.gauntletRun = {
      ...S.gauntletRun,
      skirmishActive: false,
      pendingSkirmish: undefined,
      pendingRecruit: undefined,
      pendingSideLabel: undefined,
    };
    S.battle = null;
    S.phase = "setup";
    if (outcome === "win" && recruit) S.gauntletRun = applyCompanion(S.gauntletRun, recruit);
    if (outcome === "win" && side) {
      S.gauntletRun = {
        ...S.gauntletRun,
        pot: S.gauntletRun.pot + 22,
        pendingRewardBonus: (S.gauntletRun.pendingRewardBonus ?? 0) + 1,
        lastPotText: `支线 ${sideLabel ?? ""} 告捷 +22`,
      };
    } else if (outcome !== "win" && side) {
      S.gauntletRun = {
        ...S.gauntletRun,
        pot: Math.max(0, S.gauntletRun.pot - 10),
        lastPotText: `支线 ${sideLabel ?? ""} 失利 −10`,
      };
    }
    api.openGauntletCamp(fought);
    return;
  }
  const breaks = S.battle.v2BreakCount ?? 0;
  const stats = wagerBattleStats(S.battle, outcome === "win");
  if (outcome !== "win") stats.hpEndRatio = 0;
  const settled = settleHallPot(S.gauntletRun, stats, outcome === "win");
  const pot = settled.pot;
  const texts = settled.texts;
  if (outcome === "win") {
    const foughtStage = S.gauntletRun.stage;
    const enemyFought = S.draft.enemyId;
    S.gauntletRun = {
      ...afterGauntletWin({ ...S.gauntletRun, pot, items: [...(S.battle.labItems ?? [])], itemCharges: { ...(S.battle.labItemCharges ?? {}) } }, breaks, S.battle.player.hp, S.battle.player.maxHp, enemyFought),
      wager: null,
      lastPotText: texts.filter(Boolean).join(" · "),
    };
    S.gauntletRun = consumeHallPotMods(S.gauntletRun);
    S.battle = null;
    S.phase = "setup";
    S.pendingWin = { foughtStage, texts };
    S.gauntletScreen = "settle";
    api.render();
    return;
  }
  S.gauntletRun = { ...afterGauntletLoss({ ...S.gauntletRun, pot, items: [...(S.battle.labItems ?? [])], itemCharges: { ...(S.battle.labItemCharges ?? {}) } }, breaks), wager: null, lastPotText: texts.filter(Boolean).join(" · ") };
  S.battle = null;
  S.phase = "setup";
  if (canOfferLifeline(S.gauntletRun)) {
    S.gauntletScreen = "lifeline";
    S.gauntletResultNote = "";
    api.render();
    return;
  }
  if (canOfferScarPass(S.gauntletRun)) {
    S.gauntletScreen = "scar";
    S.gauntletResultNote = "";
    api.render();
    return;
  }
  S.gauntletEndedByLoss = true;
  S.gauntletResultNote = S.gauntletRun.bankruptUsed
    ? "本局已用过赊账，行路结束"
    : `彩金 ${S.gauntletRun.pot} 低于破产线 ${reviveCost(S.gauntletRun.stage)}，无法赊账`;
  saveGauntletBest(S.gauntletRun);
  S.gauntletBossRotation = nextBossId(S.gauntletRun.bossId);
  S.gauntletScreen = "result";
  api.render();
}
api.finishGauntletBattle = finishGauntletBattle;

function continueAfterWinSettle(): void {
  stopSting();
  if (!S.gauntletRun || !S.pendingWin) return;
  const foughtStage = S.pendingWin.foughtStage;
  S.pendingWin = null;
  if (usesBanditStory(S.gauntletRun)) {
    api.openGauntletCamp(foughtStage);
    return;
  }
  const kind = eventAfterFought(foughtStage, getGauntletFinalStage(S.gauntletRun));
  if (kind && !S.gauntletRun.endless) {
    S.gauntletEventKind = kind;
    S.gauntletEventChoices = rollEventChoices(S.gauntletRun, kind, Math.random);
    S.gauntletScreen = "event";
    api.render();
    return;
  }
  if (isCompanionMilestone(foughtStage) && runCompanions(S.gauntletRun).length < maxCompanions(foughtStage) && !S.gauntletRun.skipCompanionPick) {
    S.gauntletCompanions = rollCompanionChoices(S.gauntletRun, Math.random);
    S.gauntletScreen = "companion";
    api.render();
    return;
  }
  api.openGauntletCamp(foughtStage);
}
api.continueAfterWinSettle = continueAfterWinSettle;

function openBanditStoryScreen(): boolean {
  if (!S.gauntletRun || !usesBanditStory(S.gauntletRun)) return false;
  const pending = S.gauntletRun.storyPending;
  if (pending === "choice" || pending === "followup") {
    const choices = rollStoryChoices(S.gauntletRun);
    if (choices.length === 0) {
      S.gauntletRun = { ...S.gauntletRun, storyPending: "rest" };
      return false;
    }
    S.gauntletEventKind = "story";
    S.gauntletEventChoices = choices;
    S.gauntletScreen = "event";
    api.render();
    return true;
  }
  if (pending === "stall" || pending === "market" || pending === "ambush") {
    S.gauntletEventKind = pending;
    S.gauntletEventChoices = rollEventChoices(S.gauntletRun, pending, Math.random);
    S.gauntletScreen = "event";
    api.render();
    return true;
  }
  if (pending === "travel") {
    S.gauntletRun = continueStoryTravel(S.gauntletRun);
    return false;
  }
  if (pending === "opening") {
    S.gauntletScreen = "opening";
    api.render();
    return true;
  }
  return false;
}
api.openBanditStoryScreen = openBanditStoryScreen;
