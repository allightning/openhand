import { S } from "./shellState";
import { api } from "./shellApi";
import { isClimbQi } from "../../game/sim";
import { shellRunContext } from "../shellContext";
import { FOE_WINDUP_MS, filterEmptyRecap, foeSegGapMs, intentBarFate, outcomeToFxKind, recapDisplayAfter, recapDisplayStart } from "../foePlayback";
import { formatIntentBroadcast, formatIntentCue, foeStunCurtainMs, foeIntentIsStrike } from "../labV2Ui";
import { playFoeResolveSfx, playSfx } from "../labAudio";
import { schoolForGeneratedEnemy } from "../../game/enemyKit";
import { sfxSlot } from "../sfxMap";

/** 收势后按 recap 逐段播报：先起手（立绘+挥刀声），再结算（特效+结果声），总间隔约 1.2s */
function playFoeRecapThen(onDone: () => void, origin?: { playerPos: number; enemyPos: number }): void {
  api.clearFoePlaybackTimer();
  if (!S.battle) {
    S.foePlaybackBusy = false;
    onDone();
    return;
  }
  const recapAll = [...(S.battle.v2LastIntentRecap ?? [])];
  const keepEmpty = isClimbQi(shellRunContext());
  const recap = keepEmpty ? recapAll : filterEmptyRecap(recapAll);
  const recapIdx = keepEmpty
    ? recapAll.map((_, i) => i)
    : recapAll.map((r, i) => (r.outcome === "空" ? -1 : i)).filter((i) => i >= 0);
  const startPos = origin ??
    (S.playbackShow
      ? { playerPos: S.playbackShow.playerPos, enemyPos: S.playbackShow.enemyPos }
      : { playerPos: S.battle.player.pos, enemyPos: S.battle.enemy.pos });
  if (!recap.length) {
    S.foePlaybackBusy = false;
    S.foeSegAnim = null;
    S.foePlaybackSegIdx = -1;
    S.playbackShow = null;
    S.playbackSegFate = {};
    onDone();
    return;
  }
  S.foePlaybackBusy = true;
  S.playbackSegFate = {};
  S.playbackShow = recapDisplayStart(S.battle.player.hp, S.battle.playerBlock, recap, startPos.playerPos, startPos.enemyPos);
  let i = 0;
  const origAt = (n: number) => recapIdx[n] ?? n;
  const finishAll = (): void => {
    S.playbackShow = null;
    S.playbackSegFate = {};
    S.foePlaybackTimer = window.setTimeout(() => {
      S.foePlaybackTimer = null;
      S.foePlaybackBusy = false;
      S.foeSegAnim = null;
      S.foePlaybackSegIdx = -1;
      onDone();
    }, S.FX_HOLD_MS);
  };
  const resolveStep = (): void => {
    if (!S.battle) {
      S.foePlaybackBusy = false;
      S.foeSegAnim = null;
      S.foePlaybackSegIdx = -1;
      S.playbackShow = null;
      S.playbackSegFate = {};
      onDone();
      return;
    }
    const r = recap[i]!;
    const orig = origAt(i);
    const intent = S.foePlaybackIntents[orig];
    const strike = foeIntentIsStrike(intent);
    const kind = strike ? outcomeToFxKind(r.outcome) : r.outcome === "晕" ? "miss" : "skip";
    const anim =
      kind === "break"
        ? "break"
        : kind === "hit"
          ? "hit"
          : kind === "graze"
            ? "graze"
            : kind === "miss"
              ? "miss"
              : "skip";
    S.foeSegAnim = strike ? anim : "skip";
    S.foePlaybackSegIdx = orig;
    if (S.playbackShow) S.playbackShow = recapDisplayAfter(S.playbackShow, r, intent);
    S.battle = {
      ...S.battle,
      v2FxQueue: strike ? [kind] : [],
      lastHitRead: formatIntentBroadcast(intent, r.outcome, r.name, r),
    };
    playFoeResolveSfx(kind, api.climbBreakLight() ? "light" : "full", schoolForGeneratedEnemy(S.battle.enemyId));
    api.render();
    i += 1;
    const sealPrev = (): void => {
      const fate = intentBarFate(r.outcome);
      S.playbackSegFate = { ...S.playbackSegFate, [orig]: fate };
      if (fate === "gone") playSfx(sfxSlot("intent_gone"), 0.45);
    };
    if (i >= recap.length || (S.playbackShow && S.playbackShow.hp <= 0)) {
      sealPrev();
      finishAll();
      return;
    }
    S.foePlaybackTimer = window.setTimeout(() => {
      sealPrev();
      windupStep();
    }, Math.max(200, foeSegGapMs(r.outcome) - FOE_WINDUP_MS));
  };
  const windupStep = (): void => {
    if (!S.battle) {
      S.foePlaybackBusy = false;
      S.playbackShow = null;
      S.playbackSegFate = {};
      onDone();
      return;
    }
    const r = recap[i]!;
    const orig = origAt(i);
    const intent = S.foePlaybackIntents[orig];
    S.foeSegAnim = foeIntentIsStrike(intent) ? "windup" : "skip";
    S.foePlaybackSegIdx = orig;
    S.battle = {
      ...S.battle,
      v2FxQueue: [],
      lastHitRead: formatIntentCue(S.battle, intent, r.name),
    };
    // 出招挥空：应是 whiff。whiff 现挂打空，这里仍发 swing。
    if (foeIntentIsStrike(intent)) playSfx(sfxSlot("windup"), api.climbBreakLight() ? 0.55 : 0.85);
    api.render();
    S.foePlaybackTimer = window.setTimeout(resolveStep, FOE_WINDUP_MS);
  };
  const curtain = foeStunCurtainMs(recap);
  if (curtain > 0) {
    S.foeSegAnim = "skip";
    S.foePlaybackSegIdx = -1;
    S.battle = {
      ...S.battle,
      v2FxQueue: [],
      lastHitRead: "敌眩晕——本回合有段出不了手",
    };
    api.render();
    S.foePlaybackTimer = window.setTimeout(windupStep, curtain);
  } else {
    windupStep();
  }
}
api.playFoeRecapThen = playFoeRecapThen;
