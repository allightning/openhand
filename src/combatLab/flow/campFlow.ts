import { S } from "./shellState";
import { api } from "./shellApi";
import { clonePreset, normalizePreset, primaryWeapon } from "../factory";
import { allPresets, setLastPresetId } from "../storage";
import { pruneDeckForWeapon } from "../cardUi";
import { consumeClimbContinue, touchClimbCamp } from "../climbContinue";
import { enterGauntletTuning, rollSuperRewards, isMidtermSuperFought, rollGauntletRewards, marketOffers } from "../gauntlet";
import { climbPlace, upsertRouteLog } from "../climbPlaces";

/** 奖励屏三路（普通/超级/选完同道）都要支黑市摊，集中一处免得漏。 */
function rollGauntletMarket(): void {
  S.gauntletMarket = S.gauntletRun ? marketOffers(S.gauntletRun, Math.random) : [];
  S.gauntletMarketBought = new Set();
  S.gauntletMarketRefreshN = 0;
}
api.rollGauntletMarket = rollGauntletMarket;

function persistCampContinue(): void {
  if (!S.gauntletRun || S.gauntletRun.endless) return;
  touchClimbCamp({
    run: S.gauntletRun,
    rewards: S.gauntletRewards,
    market: S.gauntletMarket,
    marketBought: [...S.gauntletMarketBought],
    rewardTakes: S.gauntletRewardTakes,
    marketRefreshN: S.gauntletMarketRefreshN,
    rewardsAreSuper: S.gauntletRewardsAreSuper,
  });
}
api.persistCampContinue = persistCampContinue;

function restoreClimbCamp(): boolean {
  const snap = consumeClimbContinue();
  if (!snap) return false;
  S.campaignRun = null;
  S.qiFight = null;
  api.enterMode("climb");
  enterGauntletTuning();
  S.gauntletRun = snap.run;
  S.gauntletPath = snap.run.path;
  S.gauntletRewards = snap.rewards;
  S.gauntletMarket = snap.market;
  S.gauntletMarketBought = new Set(snap.marketBought);
  S.gauntletRewardTakes = snap.rewardTakes;
  S.gauntletMarketRefreshN = snap.marketRefreshN;
  S.gauntletRewardsAreSuper = snap.rewardsAreSuper;
  S.gauntletScreen = "reward";
  S.battle = null;
  S.phase = "setup";
  api.render();
  return true;
}
api.restoreClimbCamp = restoreClimbCamp;

function stampRoutePlace(foughtStage: number): void {
  if (!S.gauntletRun) return;
  const loc = climbPlace(S.gauntletRun.path, foughtStage);
  S.gauntletRun = {
    ...S.gauntletRun,
    routeLog: upsertRouteLog(S.gauntletRun.routeLog, {
      stage: foughtStage,
      placeId: loc.id,
      placeName: loc.name,
      rest: loc.rest,
      note: S.gauntletRun.lastEncounterNote,
    }),
  };
}
api.stampRoutePlace = stampRoutePlace;

function openGauntletCamp(foughtStage: number): void {
  if (!S.gauntletRun) return;
  // 不在此 stopSting：支线/直进营地也要先听完胜负短句，再由 ensureBgm 接营地曲。
  // 离开告捷笺才 stopSting（continueAfterWinSettle / 出门厅）。
  api.stampRoutePlace(foughtStage);
  if (isMidtermSuperFought(foughtStage)) {
    S.gauntletRewards = rollSuperRewards(S.gauntletRun);
    S.gauntletRewardsAreSuper = true;
  } else {
    S.gauntletRewards = rollGauntletRewards(S.gauntletRun, Math.random);
    S.gauntletRewardsAreSuper = false;
  }
  S.gauntletRewardTakes = 0;
  api.rollGauntletMarket();
  S.gauntletScreen = "reward";
  api.persistCampContinue();
  api.render();
}
api.openGauntletCamp = openGauntletCamp;

function syncDraft(): void {
  S.draft = normalizePreset(S.draft);
  if (!S.draft.party.includes(S.focusMate)) S.focusMate = S.draft.fieldMate;
}
api.syncDraft = syncDraft;

function loadDraft(id: string): void {
  const found = allPresets().find((p) => p.id === id);
  if (found) {
    S.draft = clonePreset(found);
    const w = primaryWeapon(S.draft);
    S.draft.deckRecipe = pruneDeckForWeapon(S.draft.deckRecipe, w);
  }
  setLastPresetId(id);
  S.focusMate = S.draft.fieldMate;
  S.selectedDeckIdx = null;
  api.render();
}
api.loadDraft = loadDraft;
