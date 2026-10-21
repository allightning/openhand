import { S } from "../flow/shellState";
import { api } from "../flow/shellApi";
import { hallUsesQiCommit, hallCampaignShell } from "../trainingHall";
import { currentCampaignStage, readQiResolveStats, tickCampaignAfterResolve } from "../breakCampaign";
import { assignToSegment, playAttackFree, playPass, playPeek, playStep, playUlt, resolveTurn, selectCard, QI_CARDS } from "../qiCommit";

function bindQiCommitEvents(): void {
  const hallQi = Boolean(S.hallRun && S.qiFight && hallUsesQiCommit(S.hallRun.courseId));
  if (!S.qiFight || (!S.campaignRun && !hallQi)) return;
  const paint = (): void => {
    api.render();
  };
  for (const el of S.root.querySelectorAll<HTMLButtonElement>("[data-qi-card]")) {
    el.addEventListener("click", () => {
      if (!S.qiFight) return;
      const uid = el.dataset.qiCard!;
      const card = S.qiFight.hand.find((c) => c.uid === uid);
      if (card && QI_CARDS[card.defId].kind === "step") {
        try {
          S.qiFight = playStep(selectCard(S.qiFight, uid));
        } catch {
          return;
        }
        paint();
        return;
      }
      S.qiFight = selectCard(S.qiFight, uid);
      paint();
    });
  }
  for (const el of S.root.querySelectorAll<HTMLButtonElement>("[data-qi-seg]")) {
    el.addEventListener("click", () => {
      if (!S.qiFight) return;
      try {
        S.qiFight = assignToSegment(S.qiFight, Number(el.dataset.qiSeg));
      } catch {
        return;
      }
      paint();
    });
  }
  S.root.querySelector("#qi-pass")?.addEventListener("click", () => {
    if (!S.qiFight) return;
    try {
      S.qiFight = playPass(S.qiFight);
    } catch {
      return;
    }
    paint();
  });
  S.root.querySelector("#qi-peek")?.addEventListener("click", () => {
    if (!S.qiFight) return;
    try {
      S.qiFight = playPeek(S.qiFight);
    } catch {
      return;
    }
    paint();
  });
  S.root.querySelector("#qi-atk-free")?.addEventListener("click", () => {
    if (!S.qiFight) return;
    try {
      S.qiFight = playAttackFree(S.qiFight);
    } catch {
      return;
    }
    paint();
  });
  S.root.querySelector("#qi-ult")?.addEventListener("click", () => {
    if (!S.qiFight) return;
    const idx = S.qiFight.queue.findIndex((s) => !s.commit);
    if (idx < 0) return;
    try {
      S.qiFight = playUlt(S.qiFight, idx);
    } catch {
      return;
    }
    paint();
  });
  S.root.querySelector("#qi-end")?.addEventListener("click", () => {
    if (!S.qiFight) return;
    S.qiFight = resolveTurn(S.qiFight);
    if (S.battle) {
      S.battle = {
        ...S.battle,
        player: { ...S.battle.player, hp: S.qiFight.playerHp },
        enemy: { ...S.battle.enemy, hp: S.qiFight.enemyHp },
      };
    }
    if (S.hallRun && hallUsesQiCommit(S.hallRun.courseId)) {
      if (S.hallRun.bout === 2) {
        if (S.qiFight.phase === "won") {
          api.finishHallBattle("win");
          return;
        }
        if (S.qiFight.phase === "lost") {
          api.finishHallBattle("loss");
          return;
        }
        paint();
        return;
      }
      if (S.qiFight.phase === "lost") {
        api.finishHallBattle("loss");
        return;
      }
      const tickRun = S.hallRun.qiTick ?? hallCampaignShell(S.hallRun);
      if (!tickRun) {
        paint();
        return;
      }
      const tick = tickCampaignAfterResolve(tickRun, readQiResolveStats(S.qiFight));
      S.hallRun = { ...S.hallRun, qiTick: tick.run };
      if (tick.kind === "win") {
        api.finishHallBattle("win");
        return;
      }
      if (tick.kind === "lose") {
        api.finishHallBattle("loss");
        return;
      }
      paint();
      return;
    }
    if (!S.campaignRun) return;
    if (S.qiFight.phase === "lost") {
      api.finishCampaignFromTick({
        kind: "lose",
        tip: currentCampaignStage(S.campaignRun).failTip,
        run: { ...S.campaignRun, lastFailTip: currentCampaignStage(S.campaignRun).failTip },
      });
      return;
    }
    const tick = tickCampaignAfterResolve(S.campaignRun, readQiResolveStats(S.qiFight));
    if (tick.kind === "win" || tick.kind === "lose") {
      api.finishCampaignFromTick(tick);
      return;
    }
    S.campaignRun = tick.run;
    paint();
  });
}
api.bindQiCommitEvents = bindQiCommitEvents;
