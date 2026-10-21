import { S } from "../flow/shellState";
import { api } from "../flow/shellApi";
import { previewCard } from "../../game/sim";
import type { Battle } from "../../game/types";
import { primaryWeapon } from "../factory";
import { shellRunContext } from "../shellContext";
import { labCanPlay } from "../labCombat";
import { renderProdBattle } from "../prodBattleUi";
import { battleFxClasses } from "../labV2Ui";
import { renderWeaponSheet } from "../weaponSheet";
import { currentDemoLesson, demoAllowsCard } from "../breakDemo";
import { demoBadge } from "../breakDemoUi";
import { currentHallLesson, hallAllowsCard } from "../trainingHall";
import { hallBadge } from "../trainingHallUi";
import { campaignAllowsCard, campaignBadge } from "../breakCampaign";
import { renderGauntletBadge, renderWagerPlate } from "../gauntletUi";

export function renderBattleProd(o: {
  b: Battle;
  prev: ReturnType<typeof previewCard> | null;
  inHallGuide: boolean;
  inCampaign: boolean;
  summonPickCells: number[];
  actionRowHtml: string;
  entranceNote: string;
  freshNote: string;
  phaseBanner: string;
  pausePanel: string;
  debriefOverlay: string;
}): string {
  const { b, prev, inHallGuide, inCampaign, summonPickCells, actionRowHtml, entranceNote, freshNote, phaseBanner, pausePanel, debriefOverlay } = o;
  return `${api.renderHeader()}${renderProdBattle({
    b,
    prev,
    hoverUid: S.hoverUid,
    hoverIntentIdx: S.hoverIntentIdx,
    weaponId: primaryWeapon(S.draft),
    canPlay: (uid) => {
      const base = labCanPlay(b, uid, shellRunContext());
      if (!base.ok) return base;
      const card = b.hand.find((c) => c.uid === uid);
      if (!card) return base;
      if (S.breakDemoRun && !demoAllowsCard(S.breakDemoRun, card.defId)) {
        return { ok: false, reason: "本步请打高亮牌（系统指定）" };
      }
      if (inHallGuide && !hallAllowsCard(S.hallRun!, card.defId)) {
        return { ok: false, reason: "本步请打高亮牌（系统指定）" };
      }
      if (inCampaign && !campaignAllowsCard(S.campaignRun!, card.defId)) {
        return { ok: false, reason: "本步请打高亮牌（系统指定）" };
      }
      return base;
    },
    discardMode: S.discardMode || S.cycleMode || Boolean(b.climbDiscardPhase),
    summonPickCells,
    actionRowHtml,
    entranceNote,
    freshNote,
    phaseBanner,
    fxClass: battleFxClasses(b),
    pauseOverlay: `${pausePanel}${debriefOverlay}`,
    toolbarExtra: S.breakDemoRun
      ? demoBadge(S.breakDemoRun.stage, S.breakDemoRun.track ?? "break")
      : S.hallRun
        ? hallBadge(S.hallRun)
        : S.campaignRun
          ? campaignBadge(S.campaignRun)
        : S.gauntletRun
          ? renderGauntletBadge(S.gauntletRun)
          : "",
    chromeHtml: api.renderChromeActions(),
    gauntletStage: S.breakDemoRun?.stage ?? S.hallRun?.bout ?? S.campaignRun?.stageIndex ?? S.gauntletRun?.stage,
    demoGuide: S.breakDemoRun
      ? {
          cardIds: S.breakDemoRun.guideCardIds,
          coach: S.breakDemoRun.guideCoach,
          teach: S.breakDemoRun.teachBanner,
          stage: S.breakDemoRun.stage,
          lockOthers: currentDemoLesson(S.breakDemoRun).kind === "play",
        }
      : S.hallRun
        ? {
            cardIds: S.hallRun.guideCardIds,
            coach: S.hallRun.guideCoach,
            teach: S.hallRun.teachBanner,
            stage: S.hallRun.bout,
            lockOthers: inHallGuide && currentHallLesson(S.hallRun)?.kind === "play",
          }
        : S.campaignRun
          ? {
              cardIds: S.campaignRun.guideCardIds,
              coach: "",
              teach: "",
              stage: S.campaignRun.stageIndex + 1,
              lockOthers: false,
            }
        : undefined,
    weaponSheetHtml: S.weaponOpen ? renderWeaponSheet(S.weaponOpen) : "",
    combatMode: S.campaignRun
      ? { label: "登门", tip: "硬核短拍：打谱看目标；对打破架势。不拆光攻赢不了。" }
      : S.breakDemoRun
        ? {
            label: (S.breakDemoRun.track ?? "break") === "rookie" ? "低阶入门" : "新手关",
            tip: "预习破招规则；正式硬核在登门。",
          }
        : S.hallRun
          ? { label: "训练馆", tip: "专项回炉；引导锁牌，训练自由打。" }
          : { label: "行路", tip: "不破也能走。登门另有硬核短拍入口。" },
    foeResolving: S.foePlaybackBusy,
    foeSegAnim: S.foeSegAnim,
    foePlaybackSegIdx: S.foePlaybackSegIdx,
    foeSegFate: S.playbackSegFate,
    youPlayAnim: S.youPlayAnim,
    wagerHud: S.gauntletRun ? renderWagerPlate(S.gauntletRun) : "",
  })}`;
}
