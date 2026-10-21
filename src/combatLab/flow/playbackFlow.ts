import { S } from "./shellState";
import { api } from "./shellApi";
import { isClimbQi, seizeOpening, yourPace } from "../../game/sim";
import { shellRunContext } from "../shellContext";
import { CLIMB_PHASE_BEAT_MS, foeFirstHoldMs } from "../foePlayback";

function clearFoeFirstHold(): void {
  if (S.foeFirstHoldTimer != null) {
    window.clearTimeout(S.foeFirstHoldTimer);
    S.foeFirstHoldTimer = null;
  }
}
api.clearFoeFirstHold = clearFoeFirstHold;

/** 开战 / 换局：清掉上局残留的锁手与定时器，避免「敌方出招」卡死。 */
function resetCombatPlayback(): void {
  api.clearFoeFirstHold();
  api.clearFoePlaybackTimer();
  if (S.fxClearTimer != null) {
    window.clearTimeout(S.fxClearTimer);
    S.fxClearTimer = null;
  }
  S.foePlaybackBusy = false;
  S.foeSegAnim = null;
  S.foePlaybackSegIdx = -1;
  S.playbackShow = null;
  S.playbackSegFate = {};
  S.foePlaybackIntents = [];
}
api.resetCombatPlayback = resetCombatPlayback;

/** 爬塔开局：场上摸牌 →（有则）后场摸牌 → 亮招 → 先机决定是否敌先。 */
function scheduleClimbBattleOpen(): void {
  api.resetCombatPlayback();
  if (!S.battle || !isClimbQi(shellRunContext())) {
    api.scheduleFoeFirstHold();
    return;
  }
  S.foePlaybackBusy = true;
  const logs = [...(S.battle.log ?? [])];
  const fieldLine =
    [...logs].reverse().find((l) => /【开局】/.test(l) && /摸 \d+ 张/.test(l) && !l.includes("后场")) ??
    [...logs].reverse().find((l) => /摸 \d+ 张/.test(l) && !l.includes("后场"));
  const benchLine = [...logs].reverse().find((l) => /【开局】/.test(l) && l.includes("后场") && /摸 \d+/.test(l));

  const afterField = (): void => {
    if (!S.battle || S.phase !== "battle") {
      S.foePlaybackBusy = false;
      return;
    }
    if (benchLine) {
      S.battle = {
        ...S.battle,
        climbPhaseLabel: "【开始】后场摸牌",
        lastHitRead: benchLine,
      };
      api.render();
      window.setTimeout(afterBench, CLIMB_PHASE_BEAT_MS);
      return;
    }
    afterBench();
  };

  const afterBench = (): void => {
    if (!S.battle || S.phase !== "battle") {
      S.foePlaybackBusy = false;
      return;
    }
    S.battle = {
      ...S.battle,
      climbPhaseLabel: "【开始】亮招",
      lastHitRead: `${S.battle.enemy.name}亮招`,
    };
    api.render();
    window.setTimeout(() => {
      if (!S.battle || S.phase !== "battle") {
        S.foePlaybackBusy = false;
        return;
      }
      S.battle = { ...S.battle, climbPhaseLabel: undefined, lastHitRead: "" };
      if (yourPace(S.battle, shellRunContext()) < S.battle.foePace) {
        api.scheduleFoeFirstHold();
        api.render();
        return;
      }
      S.foePlaybackBusy = false;
      api.resetTurnTimer();
      api.render();
    }, CLIMB_PHASE_BEAT_MS);
  };

  S.battle = {
    ...S.battle,
    climbPhaseLabel: "【开始】摸牌",
    lastHitRead: fieldLine ?? "【开始】摸牌",
  };
  api.render();
  window.setTimeout(afterField, CLIMB_PHASE_BEAT_MS);
}
api.scheduleClimbBattleOpen = scheduleClimbBattleOpen;

/** 敌先机：先让意图条露出来，再按收势同一套兑一条、播一条。 */
function scheduleFoeFirstHold(): void {
  api.clearFoeFirstHold();
  if (!S.battle || yourPace(S.battle, shellRunContext()) >= S.battle.foePace) {
    S.foePlaybackBusy = false;
    return;
  }
  S.foePlaybackBusy = true;
  const climbOpen = shellRunContext().ruleset.mode !== "break";
  if (!climbOpen) {
    S.battle = {
      ...S.battle,
      climbPhaseLabel: undefined,
      lastHitRead: `${S.battle.enemy.name}先出手……`,
    };
  } else {
    S.battle = {
      ...S.battle,
      climbPhaseLabel: "【开始】敌招",
      lastHitRead: "【开始】兑他整条意图",
    };
  }
  const holdMs = foeFirstHoldMs([], climbOpen);
  S.foeFirstHoldTimer = window.setTimeout(() => {
    S.foeFirstHoldTimer = null;
    if (!S.battle || S.phase !== "battle") {
      S.foePlaybackBusy = false;
      return;
    }
    S.foePlaybackIntents = S.battle.intents.length ? S.battle.intents.map((x) => ({ ...x })) : [{ ...S.battle.intent }];
    const origin = { playerPos: S.battle.player.pos, enemyPos: S.battle.enemy.pos };
    seizeOpening(S.battle, shellRunContext());
    api.playFoeRecapThen(() => {
      if (!S.battle) return;
      if (S.battle.player.hp <= 0) {
        api.endBattle("loss");
        return;
      }
      S.battle = { ...S.battle, climbPhaseLabel: undefined, lastHitRead: "" };
      S.foePlaybackBusy = false;
      api.resetTurnTimer();
      api.render();
    }, origin);
  }, holdMs);
}
api.scheduleFoeFirstHold = scheduleFoeFirstHold;

/** 肉鸽爬塔：破招播报保留，声效/气势压低；读招战役 / 训练馆仍用满分量。 */
function climbBreakLight(): boolean {
  return S.gauntletRun != null && S.campaignRun == null && S.breakDemoRun == null && S.hallRun == null;
}
api.climbBreakLight = climbBreakLight;

function clearFoePlaybackTimer(): void {
  if (S.foePlaybackTimer != null) {
    window.clearTimeout(S.foePlaybackTimer);
    S.foePlaybackTimer = null;
  }
}
api.clearFoePlaybackTimer = clearFoePlaybackTimer;

function scheduleFxClear(ms = S.FX_HOLD_MS): void {
  if (S.fxClearTimer != null) window.clearTimeout(S.fxClearTimer);
  S.fxClearTimer = window.setTimeout(() => {
    S.fxClearTimer = null;
    if (S.foePlaybackBusy || !S.battle) return;
    if ((S.battle.v2FxQueue?.length ?? 0) > 0 || S.battle.lastHitRead) {
      S.battle = { ...S.battle, v2FxQueue: [], lastHitRead: undefined };
      api.render();
    }
  }, ms);
}
api.scheduleFxClear = scheduleFxClear;
