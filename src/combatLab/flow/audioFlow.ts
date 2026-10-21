import { S } from "./shellState";
import { api } from "./shellApi";
import { type Battle } from "../../game/types";
import { shellRunContext } from "../shellContext";
import { BGM_CAMP_VOL_SCALE, BGM_FADE_IN_COMBAT_MS, BGM_FADE_TO_CAMP_MS, BGM_FADE_BETWEEN_HALL_MS, campBgmId, combatBgmId, ensureBgm, playFxSfx, playSfx } from "../labAudio";
import { battleEquippedSchool } from "../../game/equippedWeapon";
import { schoolForGeneratedEnemy } from "../../game/enemyKit";
import { hitKeyForSchool, sfxSlot } from "../sfxMap";
import { ladderEntryForRun } from "../gauntlet";

/** 战斗状态差分 → 音效。fx 队列只追加，长度/末项变化即新演出；受击 HP 差分兜底（攻击音效在出牌点已播）。 */
function syncBattleAudio(next: Battle | null): void {
  const prev = S.audioPrevBattle;
  S.audioPrevBattle = next;
  if (!next || !prev || prev === next) return;
  // 敌招逐步回放时由 playFoeRecapThen 点名播，避免叠响
  if (S.foePlaybackBusy) return;
  const fx = next.v2FxQueue ?? [];
  const pfx = prev.v2FxQueue ?? [];
  if (fx.length > pfx.length) {
    const school = battleEquippedSchool(next, next.active, shellRunContext());
    for (let i = pfx.length; i < fx.length; i++) playFxSfx(fx[i], school);
    return;
  }
  if (next.player.hp < prev.player.hp) playSfx(sfxSlot(hitKeyForSchool(schoolForGeneratedEnemy(next.enemyId))));
}
api.syncBattleAudio = syncBattleAudio;

function syncBgmWithScreen(): void {
  // 教学弹窗只挡交互，phase 仍是 battle/lounge，不得因此 stopBgm。
  const scene: "battle" | "lounge" = S.phase === "battle" ? "battle" : "lounge";
  const prev = S.lastBgmScene;
  const crossed = prev != null && prev !== scene;
  const leavingBattle = prev === "battle";
  S.lastBgmScene = scene;

  if (S.phase === "battle") {
    const hallFade = crossed ? BGM_FADE_BETWEEN_HALL_MS : BGM_FADE_IN_COMBAT_MS;
    if (S.campaignRun) {
      ensureBgm("break", { volScale: 1, fadeMs: hallFade, forceCrossfade: crossed });
      return;
    }
    if (S.gauntletRun) {
      const entry = ladderEntryForRun(S.gauntletRun);
      ensureBgm(combatBgmId(S.gauntletRun.path, S.gauntletRun.stage, entry.tier), {
        volScale: 1,
        fadeMs: hallFade,
        forceCrossfade: crossed,
      });
      return;
    }
    ensureBgm("jianghu_normal", { volScale: 1, fadeMs: hallFade, forceCrossfade: crossed });
    return;
  }

  // 门厅/垫资/下注/营地同一首就接着放，不要 seek 回 0、不要交叉淡入。
  ensureBgm(campBgmId(S.gauntletRun?.path), {
    volScale: BGM_CAMP_VOL_SCALE,
    seekSec: leavingBattle ? null : undefined,
    fadeMs: leavingBattle ? BGM_FADE_TO_CAMP_MS : 0,
    forceCrossfade: false,
  });
}
api.syncBgmWithScreen = syncBgmWithScreen;

function settleFxIfReplay(): void {
  const pop = S.root.querySelector(".lab-fx-pop");
  if (!pop) {
    S.fxPaintSig = "";
    return;
  }
  const sig = `${pop.className.replace(/\s*lab-fx-settled\b/g, "")}|${pop.textContent ?? ""}`;
  if (sig === S.fxPaintSig) pop.classList.add("lab-fx-settled");
  else S.fxPaintSig = sig;
}
api.settleFxIfReplay = settleFxIfReplay;
