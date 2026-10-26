import { S } from "../flow/shellState";
import { api } from "../flow/shellApi";
import { shellRunContext } from "../shellContext";
import { grantLabItem } from "../../game/labV21";
import { type CompanionId, type LabItemId } from "../../game/types";
import { endLabMode } from "../factory";
import { playSfx, stopSting } from "../labAudio";
import { sfxSlot } from "../sfxMap";
import { afterGauntletLoss, applyGauntletReward, applySuperReward, settleHallPot, wagerBattleStats, getGauntletFinalStage, nextBossId, saveGauntletBest, gauntletRewardTakeCount, buyMarketOffer, marketOffers, marketBuyCap, marketRefreshCost, wagerStakeMax, type WagerKind } from "../gauntlet";
import { demoMarketOffers } from "../breakDemo";

function bindDomPart6(): void {
for (const el of S.root.querySelectorAll<HTMLButtonElement>("[data-demo-market]")) {
    el.addEventListener("click", () => {
      if (!S.breakDemoRun) return;
      const id = el.dataset.demoMarket as LabItemId;
      const offer = demoMarketOffers(S.breakDemoRun.pot).find((o) => o.id === id);
      if (!offer || S.demoMarketBought.has(id) || S.breakDemoRun.pot < offer.price) return;
      const g = grantLabItem(S.breakDemoRun.items, S.breakDemoRun.itemCharges, offer.id, undefined, 2);
      if (!g) return;
      S.breakDemoRun = {
        ...S.breakDemoRun,
        pot: S.breakDemoRun.pot - offer.price,
        items: g.items,
        itemCharges: g.charges,
      };
      S.demoMarketBought.add(id);
      api.render();
    });
  }
  S.root.querySelector("#demo-market-continue")?.addEventListener("click", () => {
    api.afterDemoMarketContinue();
  });
  S.root.querySelector("#demo-graduate-go")?.addEventListener("click", () => {
    api.graduateDemoToHome();
  });
  S.root.querySelector("#gauntlet-exit-path")?.addEventListener("click", () => {
    S.gauntletPath = null;
    S.gauntletScreen = null;
    api.render();
  });
  S.root.querySelector("#gauntlet-exit-pick")?.addEventListener("click", () => {
    S.gauntletScreen = "path";
    S.gauntletError = "";
    api.render();
  });
  S.root.querySelector("#gauntlet-exit-result")?.addEventListener("click", api.exitGauntlet);
  S.root.querySelector("#gauntlet-exit-battle")?.addEventListener("click", () => {
    if (S.breakDemoRun) {
      S.battle = null;
      S.phase = "setup";
      S.demoScreen = "retry";
      endLabMode();
      api.render();
      return;
    }
    if (S.gauntletRun && S.battle) {
      // §31.13 中途退场 = 输馆：注飞、底彩无
      const breaks = S.battle.v2BreakCount ?? 0;
      const settled = settleHallPot(S.gauntletRun, { ...wagerBattleStats(S.battle, false), hpEndRatio: 0 }, false);
      S.gauntletRun = { ...afterGauntletLoss({ ...S.gauntletRun, pot: settled.pot, items: [...(S.battle.labItems ?? [])], itemCharges: { ...(S.battle.labItemCharges ?? {}) } }, breaks), wager: null, lastPotText: settled.texts.filter(Boolean).join(" · ") };
      saveGauntletBest(S.gauntletRun);
      S.gauntletBossRotation = nextBossId(S.gauntletRun.bossId);
      S.gauntletEndedByLoss = true; // 中途退场也算输馆，有彩金就能赎
    }
    S.battle = null;
    S.phase = "setup";
    S.gauntletScreen = "result";
    api.render();
  });
}
api.bindDomPart6 = bindDomPart6;

function bindDomPart7(): void {
S.root.querySelector("#gauntlet-retry")?.addEventListener("click", () => {
    if (!S.gauntletRun) return;
    stopSting();
    S.routeBookOpen = false;
    const school = S.gauntletRun.school;
    const path = S.gauntletRun.path;
    S.gauntletRun = null;
    S.gauntletScreen = "pick";
    S.gauntletPath = path;
    S.gauntletRewards = [];
    S.gauntletEndedByLoss = false;
    api.startGauntletSchool(school);
  });
  for (const el of S.root.querySelectorAll<HTMLButtonElement>("[data-reward-idx]")) {
    el.addEventListener("click", () => {
      if (!S.gauntletRun) return;
      const idx = Number(el.dataset.rewardIdx);
      const opt = S.gauntletRewards[idx];
      if (!opt) return;
      if (!S.gauntletRewardsAreSuper && S.gauntletRewardTakes >= gauntletRewardTakeCount(S.gauntletRun)) return;
      if (!S.gauntletRewardsAreSuper && (opt.kind === "tech" || opt.kind === "mind") && shellRunContext().ruleset.mode === "break") {
        S.pendingReward = opt;
        S.gauntletScreen = "rewardTarget";
        api.render();
        return;
      }
      S.gauntletRun = S.gauntletRewardsAreSuper ? applySuperReward(S.gauntletRun, opt) : applyGauntletReward(S.gauntletRun, opt);
      S.gauntletRewards = S.gauntletRewards.filter((_, i) => i !== idx);
      api.finishGauntletRewardPick();
    });
  }
  for (const el of S.root.querySelectorAll<HTMLButtonElement>("[data-target-mate]")) {
    el.addEventListener("click", () => {
      if (!S.gauntletRun || !S.pendingReward) return;
      const mateId = el.dataset.targetMate as CompanionId;
      const picked = S.pendingReward;
      S.gauntletRun = applyGauntletReward(S.gauntletRun, { ...picked, targetMate: mateId });
      S.pendingReward = null;
      S.gauntletRewards = S.gauntletRewards.filter((o) => !(o.kind === picked.kind && o.id === picked.id));
      api.finishGauntletRewardPick();
    });
  }
  // §31.13 下注屏交互
  for (const el of S.root.querySelectorAll<HTMLButtonElement>("[data-wager-kind]")) {
    el.addEventListener("click", () => {
      S.wagerKind = S.wagerKind === el.dataset.wagerKind ? null : (el.dataset.wagerKind as WagerKind);
      api.render();
    });
  }
  for (const el of S.root.querySelectorAll<HTMLButtonElement>("[data-wager-stake]")) {
    el.addEventListener("click", () => {
      if (!S.gauntletRun) return;
      const raw = el.dataset.wagerStake!;
      const val = raw === "all" ? wagerStakeMax(S.gauntletRun.pot, S.gauntletRun.stage) : Number(raw);
      S.wagerStake = S.wagerStake === val ? null : val;
      api.render();
    });
  }
  // §31.15 自定义注额：change 或回车落注（input 过程不渲染，免得打着字被重绘打断）
  const wagerCustom = S.root.querySelector<HTMLInputElement>("#wager-custom");
  const commitWagerCustom = () => {
    if (!S.gauntletRun || !wagerCustom) return;
    const v = Math.floor(Number(wagerCustom.value));
    if (!Number.isFinite(v) || v <= 0) {
      S.wagerStake = null;
    } else {
      S.wagerStake = Math.min(v, wagerStakeMax(S.gauntletRun.pot, S.gauntletRun.stage));
    }
    api.render();
  };
  wagerCustom?.addEventListener("change", commitWagerCustom);
  wagerCustom?.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") {
      ev.preventDefault();
      commitWagerCustom();
    }
  });
}
api.bindDomPart7 = bindDomPart7;

function bindDomPart8(): void {
S.root.querySelector("#wager-fight")?.addEventListener("click", () => {
    if (!S.gauntletRun || !S.wagerKind || !S.wagerStake) {
      console.warn("[wager] blocked", { run: !!S.gauntletRun, kind: S.wagerKind, stake: S.wagerStake });
      return;
    }
    playSfx(sfxSlot("ui_confirm"));
    S.gauntletScreen = null;
    api.beginGauntletBattle();
  });
  S.root.querySelector("#wager-skip")?.addEventListener("click", () => {
    if (!S.gauntletRun) return;
    S.wagerKind = null;
    S.wagerStake = null;
    S.gauntletScreen = null;
    api.beginGauntletBattle();
  });
  S.root.querySelector("#gauntlet-cashout")?.addEventListener("click", () => {
    // §31.13 见好就收：带着彩金上榜走人
    if (!S.gauntletRun) return;
    saveGauntletBest(S.gauntletRun);
    S.gauntletBossRotation = nextBossId(S.gauntletRun.bossId);
    S.gauntletEndedByLoss = false;
    S.gauntletScreen = "result";
    api.render();
  });
  // §31.16 黑市：买下即生效，同槽不售二回；彩金花光别的摊自动灰
  for (const el of S.root.querySelectorAll<HTMLButtonElement>("[data-market-id]")) {
    el.addEventListener("click", () => {
      if (!S.gauntletRun) return;
      const id = el.dataset.marketId ?? "";
      const offer = S.gauntletMarket.find((o) => o.id === id);
      if (!offer || S.gauntletMarketBought.has(id)) return;
      if (S.gauntletMarketBought.size >= marketBuyCap(S.gauntletRun.stage, getGauntletFinalStage(S.gauntletRun))) return;
      const next = buyMarketOffer(S.gauntletRun, offer);
      if (!next) return;
      playSfx(sfxSlot("ui_confirm"));
      S.gauntletRun = next;
      S.gauntletMarketBought = new Set(S.gauntletMarketBought).add(id);
      api.persistCampContinue();
      api.render();
    });
  }
  S.root.querySelector("#gauntlet-market-refresh")?.addEventListener("click", () => {
    if (!S.gauntletRun) return;
    const cost = marketRefreshCost(S.gauntletRun, S.gauntletMarketRefreshN);
    if (S.gauntletRun.pot < cost) return;
    S.gauntletRun = { ...S.gauntletRun, pot: S.gauntletRun.pot - cost };
    S.gauntletMarket = marketOffers(S.gauntletRun, Math.random);
    S.gauntletMarketBought = new Set();
    S.gauntletMarketRefreshN += 1;
    api.persistCampContinue();
    api.render();
  });
  S.root.querySelector("#gauntlet-settle-take")?.addEventListener("click", () => api.continueAfterWinSettle());
  S.root.querySelector("#route-book-open")?.addEventListener("click", () => {
    S.routeBookOpen = true;
    api.render();
  });
  S.root.querySelector("#route-book-close")?.addEventListener("click", () => {
    S.routeBookOpen = false;
    api.render();
  });
  S.root.querySelector("#route-book-mask")?.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).id === "route-book-mask") {
      S.routeBookOpen = false;
      api.render();
    }
  });
  S.root.querySelector("#gauntlet-camp-continue")?.addEventListener("click", () => {
    api.leaveGauntletCamp();
  });
}
api.bindDomPart8 = bindDomPart8;
