import { S } from "../flow/shellState";
import { api } from "../flow/shellApi";
import { intentLabel } from "../../game/content";
import { canEndPlayerTurn, endTurn, refreshFoeIntentsIfPending, applyPendingStatusTicks, applyClimbPhaseBeat, peekClimbPhaseQueue, labCanCycle, labEnterDiscardPhase, labCanComboReplay, labComboReplay, isClimbQi, isBattleWon, seizeOpening } from "../../game/sim";
import { isBreakAlign } from "../labRuleset";
import { shellRunContext } from "../shellContext";
import { recordFoeTurn, recordPlayerTurn } from "../telemetry";
import { CLIMB_PHASE_BEAT_MS, filterEmptyRecap, recapDisplayStart, skipFoeRecap } from "../foePlayback";
import { playSfx } from "../labAudio";
import { climbBeatSfxKey, sfxSlot } from "../sfxMap";
import { syncBreakDemoBattle, afterDemoEndTurn, demoAllowsEndTurn, demoLessonDone, lockDemoAfterFoeTurn } from "../breakDemo";
import { afterHallEndTurn, hallAllowsEndTurn, hallIsGuided, lockHallAfterFoeTurn, syncHallBattle } from "../trainingHall";
import { campaignAllowsEndTurn, readCampaignResolveStats, refreshCampaignIntents, syncCampaignBattle, tickCampaignAfterResolve } from "../breakCampaign";

function bindDomPart15(): void {
S.root.querySelector("#btn-discard")?.addEventListener("click", () => {
    if (!S.battle || S.battle.phase !== "player" || S.paused) return;
    if (isClimbQi(shellRunContext())) {
      S.battle = labEnterDiscardPhase(S.battle, shellRunContext());
      S.discardMode = true;
      S.cycleMode = false;
      api.render();
      return;
    }
    S.discardMode = !S.discardMode;
    S.cycleMode = false;
    api.render();
  });
  S.root.querySelector("#btn-cycle")?.addEventListener("click", () => {
    if (!S.battle || S.battle.phase !== "player" || S.paused) return;
    if (!labCanCycle(S.battle, shellRunContext()).ok && !S.cycleMode) return;
    S.cycleMode = !S.cycleMode;
    S.discardMode = false;
    api.render();
  });
  S.root.querySelector("#btn-combo-replay")?.addEventListener("click", () => {
    if (!S.battle || S.battle.phase !== "player" || S.paused || S.foePlaybackBusy) return;
    if (!labCanComboReplay(S.battle, shellRunContext()).ok) return;
    S.battle = labComboReplay(S.battle, shellRunContext());
    playSfx(sfxSlot("combo_replay"));
    api.render();
  });
}
api.bindDomPart15 = bindDomPart15;

function bindDomPart16(): void {
S.root.querySelector("#btn-end")?.addEventListener("click", () => {
    if (!S.battle || S.battle.phase !== "player" || S.paused || S.foePlaybackBusy) return;
    if (!S.campaignRun && isBattleWon(S.battle)) {
      api.endBattle("win");
      return;
    }
    if (!canEndPlayerTurn(S.battle, shellRunContext()).ok) return;
    if (S.breakDemoRun && !demoAllowsEndTurn(S.breakDemoRun)) return;
    if (S.hallRun && !hallAllowsEndTurn(S.hallRun)) return;
    if (S.campaignRun && !campaignAllowsEndTurn(S.campaignRun)) return;
    S.foePlaybackBusy = true;
    S.discardMode = false;
    S.cycleMode = false;
    const ms = Math.round(performance.now() - S.turnStartedAt);
    if (S.telemetry) S.telemetry = recordPlayerTurn(S.telemetry, S.battle, "收势", ms, true);
    playSfx(sfxSlot("end_turn"));
    const campBreaksBefore = S.campaignRun ? (S.battle.v2BreakCount ?? 0) : 0;
    S.foePlaybackIntents = S.battle.intents.length ? S.battle.intents.map((x) => ({ ...x })) : [{ ...S.battle.intent }];
    const origin = { playerPos: S.battle.player.pos, enemyPos: S.battle.enemy.pos };
    // 先兑完整队、暂不刷下一手；播报完再亮下回合全套意图。有窗就停在这一帧，等玩家点。
    if (isClimbQi(shellRunContext())) S.battle.holdReaction = true;
    S.battle = endTurn(S.battle, shellRunContext(), { deferIntentRefresh: true, deferStatusTicks: !isBreakAlign() });
    if (!S.campaignRun && skipFoeRecap(S.battle)) {
      api.endBattle("win");
      return;
    }
    if (S.telemetry) S.telemetry = recordFoeTurn(S.telemetry, S.battle, intentLabel(S.battle.intent));
    if (S.breakDemoRun) {
      const you = S.battle.player.pos;
      const foe = S.battle.enemy.pos;
      S.breakDemoRun = afterDemoEndTurn(S.breakDemoRun);
      if (!demoLessonDone(S.breakDemoRun)) lockDemoAfterFoeTurn(S.battle, you, foe);
      S.battle = syncBreakDemoBattle(S.battle, S.breakDemoRun);
    }
    if (S.hallRun && hallIsGuided(S.hallRun)) {
      const you = S.battle.player.pos;
      const foe = S.battle.enemy.pos;
      S.hallRun = afterHallEndTurn(S.hallRun);
      lockHallAfterFoeTurn(S.battle, S.hallRun, you, foe);
      S.battle = syncHallBattle(S.battle, S.hallRun);
    }
    const afterPlayback = (): void => {
      if (!S.battle) return;
      // playFoeRecapThen 会先放开 busy；爬塔尾部仍锁手，直到【中期】出牌
      if (isClimbQi(shellRunContext())) S.foePlaybackBusy = true;

      const unlockMid = (): void => {
        if (!S.battle) return;
        if (isClimbQi(shellRunContext()) && S.battle.climbNeedFoeOpenPlayback) {
          S.battle = { ...S.battle, climbNeedFoeOpenPlayback: false, climbPhaseLabel: "【开始】敌招", lastHitRead: "【开始】兑他整条意图" };
          const origin = { playerPos: S.battle.player.pos, enemyPos: S.battle.enemy.pos };
          S.foePlaybackBusy = true;
          S.foePlaybackIntents = S.battle.intents.length ? S.battle.intents.map((x) => ({ ...x })) : [{ ...S.battle.intent }];
          S.battle.holdReaction = true;
          seizeOpening(S.battle, shellRunContext());
          const playThisOpen = (): void => {
            if (!S.battle) return;
            const recap = [...(S.battle.v2LastIntentRecap ?? [])];
            S.playbackSegFate = {};
            S.playbackShow = recapDisplayStart(
              S.battle.player.hp,
              S.battle.playerBlock,
              isClimbQi(shellRunContext()) ? recap : filterEmptyRecap(recap),
              origin.playerPos,
              origin.enemyPos,
            );
            api.render();
            api.playFoeRecapThen(() => {
              if (!S.battle) return;
              if (S.battle.player.hp <= 0) {
                S.foePlaybackBusy = false;
                api.endBattle("loss");
                return;
              }
              S.battle = { ...S.battle, climbPhaseLabel: undefined, lastHitRead: "" };
              unlockMidAfterFoeOpen();
            }, origin);
          };
          if (api.deferUntilReact(playThisOpen)) return;
          playThisOpen();
          return;
        }
        unlockMidAfterFoeOpen();
      };

      const unlockMidAfterFoeOpen = (): void => {
        if (!S.battle) return;
        if (S.campaignRun) {
          const stats = readCampaignResolveStats(S.battle, campBreaksBefore);
          const tick = tickCampaignAfterResolve(S.campaignRun, stats);
          if (tick.kind === "win" || tick.kind === "lose") {
            S.foePlaybackBusy = false;
            api.finishCampaignFromTick(tick);
            return;
          }
          S.campaignRun = tick.run;
          refreshCampaignIntents(S.battle, S.campaignRun);
          S.battle = syncCampaignBattle(S.battle, S.campaignRun);
        }
        if (S.battle.player.hp <= 0) {
          S.foePlaybackBusy = false;
          api.endBattle("loss");
          return;
        }
        if (!S.campaignRun && isBattleWon(S.battle)) {
          S.foePlaybackBusy = false;
          api.endBattle("win");
          return;
        }
        if ((S.battle.youStun ?? 0) > 0) {
          S.battle = { ...S.battle, lastHitRead: "你眩晕——这一回合打不出攻击" };
        }
        S.battle = {
          ...S.battle,
          climbPhaseLabel: isClimbQi(shellRunContext()) ? undefined : S.battle.climbPhaseLabel,
          lastHitRead: (S.battle.youStun ?? 0) > 0 ? S.battle.lastHitRead : "",
        };
        S.foePlaybackBusy = false;
        api.resetTurnTimer();
        api.render();
      };

      const playClimbBeatsThenUnlock = (): void => {
        if (!S.battle) return;
        if (!peekClimbPhaseQueue(S.battle).length) {
          unlockMid();
          return;
        }
        const beat = applyClimbPhaseBeat(S.battle, shellRunContext());
        S.battle = beat.battle;
        const beatKey =
          beat.skip || beat.step == null ? null : climbBeatSfxKey(beat.step, beat.read ?? "");
        if (beatKey) playSfx(sfxSlot(beatKey));
        if (S.battle.player.hp <= 0) {
          S.foePlaybackBusy = false;
          api.endBattle("loss");
          return;
        }
        if (!S.campaignRun && isBattleWon(S.battle)) {
          S.foePlaybackBusy = false;
          api.endBattle("win");
          return;
        }
        if (beat.skip) {
          playClimbBeatsThenUnlock();
          return;
        }
        api.render();
        window.setTimeout(playClimbBeatsThenUnlock, CLIMB_PHASE_BEAT_MS);
      };

      if (isClimbQi(shellRunContext()) && peekClimbPhaseQueue(S.battle).length) {
        playClimbBeatsThenUnlock();
        return;
      }

      // 非爬塔 / 无队列：沿用原裂创补丁 + 亮招
      if (S.battle.v2PendingStatusTicks) {
        const hadBleed = (S.battle.bleed ?? 0) > 0 || (S.battle.youBleed ?? 0) > 0;
        S.battle = applyPendingStatusTicks(S.battle, shellRunContext());
        if (hadBleed) playSfx(sfxSlot("bleed_tick"));
        api.render();
        window.setTimeout(() => {
          if (!S.battle) return;
          S.battle = refreshFoeIntentsIfPending(S.battle, shellRunContext());
          unlockMid();
        }, 520);
        return;
      }
      S.battle = refreshFoeIntentsIfPending(S.battle, shellRunContext());
      unlockMid();
    };
    const playResolved = (): void => {
    if (isClimbQi(shellRunContext()) && S.battle) {
      S.battle = { ...S.battle, climbPhaseLabel: "【结束】敌招", lastHitRead: "【结束】兑他整条意图" };
      const recap = [...(S.battle.v2LastIntentRecap ?? [])];
      S.playbackSegFate = {};
      S.playbackShow = recapDisplayStart(
        S.battle.player.hp,
        S.battle.playerBlock,
        recap,
        origin.playerPos,
        origin.enemyPos,
      );
      api.render();
      window.setTimeout(() => api.playFoeRecapThen(afterPlayback, origin), 1800);
      return;
    }
    api.playFoeRecapThen(afterPlayback, origin);
    };
    if (api.deferUntilReact(playResolved)) return;
    playResolved();
  });
}
api.bindDomPart16 = bindDomPart16;
