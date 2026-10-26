import { S } from "../flow/shellState";
import { api } from "../flow/shellApi";
import { CARDS } from "../../game/content";
import { labCanCycle, labCycleCard, labDiscardCard, isClimbQi, isBattleWon, needsDiscardToHandCap, playCard } from "../../game/sim";
import { getLabTuning, isLabV2, setLabTuning } from "../labTuning";
import { useLabItem } from "../../game/labV21";
import { isSummonItem } from "../../game/labSummon";
import { useSignature } from "../../game/labSignature";
import { callAssist } from "../../game/labAssist";
import { type CompanionId, type LabItemId } from "../../game/types";
import { shellRunContext } from "../shellContext";
import { labCanPlay, labSwapFighter } from "../labCombat";
import { recordPlayerTurn } from "../telemetry";
import { playSfx } from "../labAudio";
import { cardPlaySfxKey, riderSfxKeys, sfxSlot } from "../sfxMap";
import { syncBreakDemoBattle, afterDemoPlayCard, afterDemoSwap, demoAllowsCard, demoAllowsSwap } from "../breakDemo";
import { afterHallPlayCard, afterHallSwap, hallAllowsCard, hallAllowsSwap, hallIsGuided, syncHallBattle } from "../trainingHall";
import { afterCampaignPlayCard, afterCampaignSwap, campaignAllowsCard, campaignAllowsSwap, syncCampaignBattle } from "../breakCampaign";

function bindDomPart12(): void {
api.bindSlider("sl-enemy-seg", "enemySegBonus", "val-enemy-seg", Number);
  api.bindSlider("sl-enemy-stress", "enemyStressCap", "val-enemy-stress", Number);
  const enemyHpEl = document.getElementById("sl-enemy-hp") as HTMLInputElement | null;
  enemyHpEl?.addEventListener("input", () => {
    if (!getLabTuning().designerMode) return;
    const val = Number(enemyHpEl.value);
    setLabTuning({ enemyHpMul: val });
    const label = document.getElementById("val-enemy-hp");
    if (label) label.textContent = val.toFixed(2);
  });
  const paceEl = document.getElementById("sl-pace") as HTMLInputElement | null;
  paceEl?.addEventListener("input", () => {
    if (!getLabTuning().designerMode) return;
    const oldBias = getLabTuning().paceBias;
    const val = Number(paceEl.value);
    setLabTuning({ paceBias: val });
    if (S.battle) S.battle = { ...S.battle, paceBoost: S.battle.paceBoost - oldBias + val };
    const label = document.getElementById("val-pace");
    if (label) label.textContent = String(val);
  });
}
api.bindDomPart12 = bindDomPart12;

function bindDomPart13(): void {
for (const el of S.root.querySelectorAll<HTMLButtonElement>(".card[data-uid]")) {
    el.addEventListener("mouseenter", () => {
      S.hoverUid = el.dataset.uid ?? null;
      for (const c of S.root.querySelectorAll<HTMLButtonElement>(".card[data-uid]")) {
        c.classList.toggle("hot", c.dataset.uid === S.hoverUid);
      }
      api.paintHoverBoard();
    });
    el.addEventListener("mouseleave", () => {
      S.hoverUid = null;
      el.classList.remove("hot");
      api.paintHoverBoard();
    });
    el.addEventListener("click", () => {
      if (!S.battle || S.battle.phase !== "player" || S.paused || S.foePlaybackBusy) return;
      const uid = el.dataset.uid!;
      // 弃牌/置换：须先点按钮，超上限不会自动改点牌为弃牌
      if ((S.discardMode || S.battle.climbDiscardPhase) && (isClimbQi(shellRunContext()) || needsDiscardToHandCap(S.battle, shellRunContext()))) {
        const had = S.battle.hand.some((c) => c.uid === uid);
        S.battle = labDiscardCard(S.battle, uid, shellRunContext());
        if (had && !S.battle.hand.some((c) => c.uid === uid)) playSfx(sfxSlot("discard"));
        if (!isClimbQi(shellRunContext()) && !needsDiscardToHandCap(S.battle, shellRunContext())) S.discardMode = false;
        api.render();
        return;
      }
      if (S.cycleMode) {
        const dGate = labCanCycle(S.battle, shellRunContext());
        if (!dGate.ok) return;
        const had = S.battle.hand.some((c) => c.uid === uid);
        S.battle = labCycleCard(S.battle, uid, shellRunContext());
        if (had && !S.battle.hand.some((c) => c.uid === uid)) playSfx(sfxSlot("cycle_card"));
        S.cycleMode = false;
        api.render();
        return;
      }
      const gate = labCanPlay(S.battle, uid, shellRunContext());
      if (!gate.ok) return;
      if (S.breakDemoRun) {
        const cardCheck = S.battle.hand.find((c) => c.uid === uid);
        if (cardCheck && !demoAllowsCard(S.breakDemoRun, cardCheck.defId)) return;
      }
      if (S.hallRun && hallIsGuided(S.hallRun)) {
        const cardCheck = S.battle.hand.find((c) => c.uid === uid);
        if (cardCheck && !hallAllowsCard(S.hallRun, cardCheck.defId)) return;
      }
      if (S.campaignRun) {
        const cardCheck = S.battle.hand.find((c) => c.uid === uid);
        if (cardCheck && !campaignAllowsCard(S.campaignRun, cardCheck.defId)) return;
      }
      const card = S.battle.hand.find((c) => c.uid === uid);
      const ms = Math.round(performance.now() - S.turnStartedAt);
      const before = S.battle;
      const after = playCard(S.battle, uid, shellRunContext());
      if (card) {
        const cardKey = cardPlaySfxKey(CARDS[card.defId]);
        playSfx(sfxSlot(cardKey));
        for (const key of riderSfxKeys(before, after)) {
          if (key !== cardKey) playSfx(sfxSlot(key));
        }
      }
      const matched = api.previewMatchesPlay(before, uid, after);
      S.battle = after;
      if (S.battle.v2FxQueue && S.battle.v2FxQueue.length > 1) {
        S.battle = { ...S.battle, v2FxQueue: [S.battle.v2FxQueue[S.battle.v2FxQueue.length - 1]!] };
      }
      if (S.breakDemoRun && card) {
        S.breakDemoRun = afterDemoPlayCard(S.breakDemoRun, card.defId);
        S.battle = syncBreakDemoBattle(S.battle, S.breakDemoRun);
      }
      if (S.hallRun && card && hallIsGuided(S.hallRun)) {
        S.hallRun = afterHallPlayCard(S.hallRun, card.defId);
        S.battle = syncHallBattle(S.battle, S.hallRun);
      }
      if (S.campaignRun && card) {
        S.campaignRun = afterCampaignPlayCard(S.campaignRun, card.defId);
        // 不 sync 手牌——每拍开局才重发窄牌
      }
      if (S.telemetry) {
        S.telemetry = recordPlayerTurn(
          S.telemetry,
          after,
          card ? CARDS[card.defId].name : uid,
          ms,
          matched,
          card?.defId,
        );
      }
      S.hoverUid = null;
      if (card) {
        const def = CARDS[card.defId];
        S.youPlayAnim = def?.type === "attack" ? "swing" : def?.steps ? "step" : "cast";
        if (S.youPlayAnimTimer != null) window.clearTimeout(S.youPlayAnimTimer);
        S.youPlayAnimTimer = window.setTimeout(() => {
          S.youPlayAnim = null;
          S.youPlayAnimTimer = null;
          if (S.phase === "battle") api.paintHoverBoard();
        }, 420);
      }
      // 敌全灭即胜——不管教案走到哪一步。否则 checkWin 已把 phase 置 "won"，
      // 收势闸（phase==="player"）会把玩家永久锁死在场上。
      // 读招谜题例外：过关只看破法谓词，不靠击杀。
      if (!S.campaignRun && isBattleWon(after)) {
        api.endBattle("win");
        return;
      }
      if (after.player.hp <= 0) {
        api.endBattle("loss");
        return;
      }
      api.resetTurnTimer();
      api.render();
    });
  }
}
api.bindDomPart13 = bindDomPart13;

function bindDomPart14(): void {
S.root.querySelector(".hand-scroll")?.addEventListener("mouseleave", () => {
    S.hoverUid = null;
    for (const c of S.root.querySelectorAll(".card.hot")) c.classList.remove("hot");
  });
  for (const el of S.root.querySelectorAll<HTMLButtonElement>("[data-swap]")) {
    el.addEventListener("click", () => {
      if (!S.battle || S.foePlaybackBusy) return;
      const id = el.dataset.swap as CompanionId;
      if (S.breakDemoRun && !demoAllowsSwap(S.breakDemoRun, id)) return;
      if (S.hallRun && !hallAllowsSwap(S.hallRun, id)) return;
      if (S.campaignRun && !campaignAllowsSwap(S.campaignRun, id)) return;
      const prevActive = S.battle.active;
      S.battle = labSwapFighter(S.battle, id);
      if (S.breakDemoRun) {
        S.breakDemoRun = afterDemoSwap(S.breakDemoRun, id);
        S.battle = syncBreakDemoBattle(S.battle, S.breakDemoRun);
      }
      if (S.hallRun && hallIsGuided(S.hallRun)) {
        S.hallRun = afterHallSwap(S.hallRun, id);
        S.battle = syncHallBattle(S.battle, S.hallRun);
      }
      if (S.campaignRun) {
        S.campaignRun = afterCampaignSwap(S.campaignRun);
        S.battle = syncCampaignBattle(S.battle, S.campaignRun);
      }
      if (S.battle.active !== prevActive) playSfx(sfxSlot("swap"));
      api.render();
    });
  }
  for (const el of S.root.querySelectorAll<HTMLButtonElement>("[data-assist]")) {
    el.addEventListener("click", () => {
      if (!S.battle || S.battle.phase !== "player" || S.paused) return;
      S.battle = callAssist(S.battle, el.dataset.assist as CompanionId, shellRunContext());
      api.render();
    });
  }
  for (const el of S.root.querySelectorAll<HTMLButtonElement>("[data-item]")) {
    el.addEventListener("click", () => {
      if (!S.battle || S.battle.phase !== "player" || S.paused) return;
      const itemId = el.dataset.item as LabItemId;
      // §31.12 助战符：先点符进点位模式，再点棋盘格落位
      if (isSummonItem(itemId) && isLabV2()) {
        S.summonPending = S.summonPending === itemId ? null : itemId;
        api.render();
        return;
      }
      const r = useLabItem(S.battle, itemId, shellRunContext());
      if (!r.ok || !r.battle) return;
      S.battle = r.battle;
      api.render();
    });
  }
  // §31.12 点位模式：点格落位
  for (const el of S.root.querySelectorAll<HTMLElement>(".cell.summon-pick[data-pos]")) {
    el.addEventListener("click", () => {
      if (!S.battle || !S.summonPending || S.battle.phase !== "player" || S.paused) return;
      const pos = Number(el.dataset.pos);
      const r = useLabItem(S.battle, S.summonPending, shellRunContext(), pos);
      S.summonPending = null;
      if (!r.ok || !r.battle) return;
      S.battle = r.battle;
      api.render();
    });
  }
  S.root.querySelector("#lab-signature")?.addEventListener("click", () => {
    if (!S.battle || S.battle.phase !== "player" || S.paused) return;
    const r = useSignature(S.battle, shellRunContext());
    if (!r.ok || !r.battle) return;
    S.battle = r.battle;
    api.render();
  });
}
api.bindDomPart14 = bindDomPart14;
