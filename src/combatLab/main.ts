import { CARDS, ENEMIES, intentLabel } from "../game/content";
import {
  applyLabFightScale,
  battleHandCap,
  canEndPlayerTurn,
  endTurn,
  labCanCycle,
  labCycleCard,
  labDiscardCard,
  legalSummonCells,
  livingFoes,
  needsDiscardToHandCap,
  playCard,
  previewCard,
} from "../game/sim";
import { handRefillAmount } from "./rogueRoster";
import { isBreakAlign } from "./labRuleset";
import { getLabTuning, isLabV2, setLabMode, setLabTuning } from "../game/labTuning";
import { computeResonance, grantLabItem, itemChargeCount, labCanUseItem, useLabItem } from "../game/labV21";
import { isSummonItem } from "../game/labSummon";
import { canUseSignature, signatureActionCopy, useSignature } from "../game/labSignature";
import { LAB_ITEM_LABEL, LAB_ITEM_TIP } from "../game/labV21Constants";
import { canMateEquipGear } from "../game/equippedWeapon";
import { assistEnergyCost, callAssist, canCallAssist, isComboRulesEnabled } from "../game/labAssist";
import { MATES, ROLE_LABEL, WEAPON_NAME, WEAPON_PACE } from "../game/party";
import { type Battle, type CardId, type CompanionId, type EnemyId, type LabItemId, type TechniqueId } from "../game/types";
import { clonePreset, endLabMode, normalizePreset, primaryWeapon, startLabBattle } from "./factory";
import {
  labCanPlay,
  labCanSwap,
  labSwapCost,
  labSwapFighter,
} from "./labCombat";
import { BUILTIN_PRESETS } from "./presets";
import { tryAddMate, tryAddToRecipe, tryLearnTech, deckTypeLabel } from "./rules";
import {
  allPresets,
  getLastPresetId,
  pushReport,
  recentReports,
  saveCustomPreset,
  setLastPresetId,
} from "./storage";
import {
  balanceReport,
  balanceReportsByScenario,
  finishTelemetry,
  recordFoeTurn,
  recordPlayerTurn,
  startTelemetry,
} from "./telemetry";
import type { LabPhase, LabPreset, LabTelemetry } from "./types";
import { pruneDeckForWeapon } from "./cardUi";
import { applyAutoLoadout, type AutoTechDepth, type AutoWeaponGrade } from "./autoLoadouts";
import { bindGauntletDevPanel, renderDevPanelModal } from "./devPanel";
import { renderGuideSheet } from "./guide";
import { renderWikiSheet, wikiPageCount, type WikiBook } from "./encyclopedia";
import {
  escapeHtml,
  pickPanelTitle,
  renderDeckRecipeHtml,
  renderPickPanel,
  type PickFocus,
} from "./setupUi";
import { renderProdBattle, renderProdBoard } from "./prodBattleUi";
import { battleFxClasses, threatCellsForHover } from "./labV2Ui";
import { renderWeaponSheet } from "./weaponSheet";
import { bindLabTooltips } from "./labTooltip";
import {
  bgmPlaying,
  debugAudioState,
  ensureBgm,
  getBgmVolume,
  getSfxVolume,
  playFxSfx,
  playSfx,
  setBgmVolume,
  setSfxVolume,
  stopBgm,
  unlockAudio,
} from "./labAudio";
import { battleEquippedSchool } from "../game/equippedWeapon";
import { isBossEnemy } from "../game/labEnemyStress";
import {
  afterGauntletLoss,
  afterGauntletWin,
  applyStageTuning,
  buildGauntletPreset,
  buildSkirmishPreset,
  createGauntletRun,
  enterGauntletTuning,
  exitGauntletTuning,
  applyCompanion,
  applyGauntletReward,
  applySuperReward,
  resolveWager,
  settleHallPot,
  wagerBattleStats,
  rollCompanionChoices,
  rollSuperRewards,
  isMidtermSuperFought,
  getGauntletFinalStage,
  isGauntletEndless,
  ladderEntryForRun,
  nextBossId,
  rollGauntletRewards,
  saveGauntletBest,
  gauntletRewardTakeCount,
  buyMarketOffer,
  marketOffers,
  marketBuyCap,
  marketRefreshCost,
  applyBankerBoost,
  applyLifeline,
  reviveGauntletRun,
  consumeFightStartMods,
  consumeHallPotMods,
  consumeCampMods,
  applyScarPass,
  canOfferScarPass,
  canOfferLifeline,
  reviveCost,
  runCompanions,
  gauntletFieldMate,
  sellPriceFor,
  GAUNTLET_SCHOOL_LOADOUT,
  wagerOffers,
  wagerStakeMax,
  type GauntletMarketOffer,
  type GauntletRewardOption,
  type GauntletRun,
  type GauntletScreen,
  type WagerKind,
  type WagerOffer,
} from "./gauntlet";
import { isCompanionMilestone, maxCompanions, type GauntletPath } from "./gauntletPaths";
import {
  applyEncounterChoice,
  applyFinale,
  eventAfterFought,
  rollEventChoices,
  shouldShowFinale,
  type EncounterChoice,
  type EncounterKind,
  type FinaleKind,
} from "./encounter";
import { combatBgPool, overlayPoolFor, takeSceneBg, HOME_BG, staticOverlayBg } from "./sceneBg";
import { canStartBattle, moveDeckToStash, moveStashToDeck, sellStashCard } from "./loadout";
import { renderBreakIntro, shouldSkipWager } from "./breakOnboard";
import {
  advanceDemoAfterWin,
  applyBreakDemoBattle,
  syncBreakDemoBattle,
  afterDemoEndTurn,
  afterDemoPlayCard,
  afterDemoSwap,
  buildBreakDemoPreset,
  createBreakDemoRun,
  currentDemoLesson,
  demoAllowsCard,
  demoAllowsEndTurn,
  demoLessonDone,
  demoAllowsSwap,
  demoMarketOffers,
  demoRewardOptions,
  dismissDemoFoeDebrief,
  DEMO_FIST_MATE,
  markBreakDemoDone,
  markRookieDemoDone,
  lockDemoAfterFoeTurn,
  syncDemoLesson,
  type BreakDemoRun,
  type DemoStage,
} from "./breakDemo";
import { renderDemoShell, demoBadge, renderDemoFoeDebrief, type DemoShellScreen } from "./breakDemoUi";
import {
  afterHallEndTurn,
  afterHallPlayCard,
  afterHallSwap,
  applyHallBattle,
  buildHallPreset,
  createHallRun,
  currentHallLesson,
  dismissHallFoeDebrief,
  hallAllowsCard,
  hallAllowsEndTurn,
  hallAllowsSwap,
  hallCoursesIn,
  hallIsGuided,
  lockHallAfterFoeTurn,
  syncHallBattle,
  syncHallLesson,
  hallTitle,
  type HallBout,
  type HallCabinet,
  type HallCourseId,
  type HallRun,
} from "./trainingHall";
import { hallBadge, renderHallCleared, renderHallRetry, renderTrainingHallCatalog } from "./trainingHallUi";
import { renderBattleSheet, type BattleSheetKind } from "./battleSheet";
import {
  renderGauntletBadge,
  renderGauntletCompanionPick,
  renderGauntletBanker,
  renderGauntletLifeline,
  renderGauntletLoadout,
  renderGauntletHome,
  renderGauntletOverlay,
  renderGauntletResult,
  renderGauntletRewardPick,
  renderGauntletRewardTarget,
  renderGauntletPathPick,
  renderGauntletSchoolPick,
  renderGauntletWager,
  renderGauntletEvent,
  renderGauntletFinale,
  renderGauntletScar,
} from "./gauntletUi";
import type { WeaponId } from "../game/types";
import "../style.css";
import "./lab.css";
import "./gauntlet.css";

const root = document.getElementById("app")!;

function actionTipWrap(btnHtml: string, tip: string): string {
  return `<span class="lab-action-tip-wrap" data-tip="${escapeHtml(tip)}">${btnHtml}<span class="status-tip">${escapeHtml(tip)}</span></span>`;
}

let phase: LabPhase = "setup";
let draft: LabPreset = clonePreset(BUILTIN_PRESETS[0]!);
let battle: Battle | null = null;
let telemetry: LabTelemetry | null = null;
let hoverUid: string | null = null;
let hoverIntentIdx: number | null = null;
let paused = false;
let turnStartedAt = 0;
let turnTimer: number | null = null;
let selectedDeckIdx: number | null = null;
let flyInDeckIdx: number | null = null;
let showBlockedCards = false;
let pickFocus: PickFocus = "cards";
let focusMate: CompanionId = draft.fieldMate;
let wikiOpen: WikiBook | null = null;
let wikiPage = 0;
let guideOpen = false;
let devPanelOpen = false;
let audioPrevBattle: Battle | null = null;
let labFullscreen = false;
let autoLoadoutId = "t1-four-palm";
let autoWeaponGrade: AutoWeaponGrade = 3;
let autoTechDepth: AutoTechDepth = 1;
let weaponOpen: string | null = null;
let gauntletRun: GauntletRun | null = null;
let gauntletScreen: GauntletScreen | null = null;
let breakDemoRun: BreakDemoRun | null = null;
let demoScreen: DemoShellScreen | "retry" | null = null;
let demoMarketBought: Set<string> = new Set();
let hallRun: HallRun | null = null;
let hallScreen: "catalog" | "cleared" | "retry" | null = null;
let hallCab: HallCabinet = "break";
let hallFocus: HallCourseId = "hard";
let battleSheet: BattleSheetKind | null = null;
let gauntletRewards: GauntletRewardOption[] = [];
let gauntletRewardsAreSuper = false;
let gauntletRewardTakes = 0;
let gauntletCompanions: CompanionId[] = [];
let gauntletBossRotation: EnemyId = "usurper";
let gauntletPath: GauntletPath | null = null;
/** §31.13 下注屏选择状态 */
let wagerKind: WagerKind | null = null;
let wagerStake: number | null = null;
/** §31.14 当前下注屏摇出的盘口（屏显与落锤同一份，不能渲染一遍、结算再摇一遍）。 */
let wagerOffersCache: WagerOffer[] = [];
/** §31.16 本屏黑市摊（与奖励同批 roll 定，不随重渲染重滚）；已售槽位按 id 记。 */
let gauntletMarket: GauntletMarketOffer[] = [];
let gauntletMarketBought: Set<string> = new Set();
let gauntletMarketRefreshN = 0;
let loadoutFocusMate: CompanionId | null = null;
/** 结算屏是否挂着「赎身」分支——只有输馆能赎，见好就收不能。 */
let gauntletEndedByLoss = false;
let gauntletResultNote = "";
/** 选系/开踢失败时在屏上显示，避免静默无反应 */
let gauntletError = "";
/** §31.18 外功/心法待指定受益角色 */
let pendingReward: GauntletRewardOption | null = null;
let gauntletEventKind: EncounterKind | null = null;
let gauntletEventChoices: EncounterChoice[] = [];

/** 奖励屏三路（普通/超级/选完同道）都要支黑市摊，集中一处免得漏。 */
function rollGauntletMarket(): void {
  gauntletMarket = gauntletRun ? marketOffers(gauntletRun) : [];
  gauntletMarketBought = new Set();
  gauntletMarketRefreshN = 0;
}

function paintGauntletOverlay(
  screen: Parameters<typeof renderGauntletOverlay>[0],
  inner: string,
): string {
  if (!gauntletRun) return renderGauntletOverlay(screen, inner, staticOverlayBg(screen));
  const key =
    screen === "reward" || screen === "loadout" || screen === "wager" || screen === "rewardTarget"
      ? `camp:${gauntletRun.stage}`
      : screen === "event" || screen === "companion" || screen === "finale" || screen === "scar"
        ? `event:${gauntletRun.stage}:${screen}`
        : `lobby:${screen}`;
  const pool = overlayPoolFor(screen, gauntletRun.path);
  const t = takeSceneBg(gauntletRun, key, pool);
  gauntletRun = t.run;
  return renderGauntletOverlay(screen, inner, t.url);
}

function openGauntletCamp(foughtStage: number): void {
  if (!gauntletRun) return;
  if (isMidtermSuperFought(foughtStage)) {
    gauntletRewards = rollSuperRewards(gauntletRun);
    gauntletRewardsAreSuper = true;
  } else {
    gauntletRewards = rollGauntletRewards(gauntletRun);
    gauntletRewardsAreSuper = false;
  }
  gauntletRewardTakes = 0;
  rollGauntletMarket();
  gauntletScreen = "reward";
  render();
}
let discardMode = false;
let cycleMode = false;
/** §31.12 助战符点位模式：非空 = 等待点格落位。 */
let summonPending: LabItemId | null = null;

function syncDraft(): void {
  draft = normalizePreset(draft);
  if (!draft.party.includes(focusMate)) focusMate = draft.fieldMate;
}

function loadDraft(id: string): void {
  const found = allPresets().find((p) => p.id === id);
  if (found) {
    draft = clonePreset(found);
    const w = primaryWeapon(draft);
    draft.deckRecipe = pruneDeckForWeapon(draft.deckRecipe, w);
  }
  setLastPresetId(id);
  focusMate = draft.fieldMate;
  selectedDeckIdx = null;
  render();
}

function previewMatchesPlay(b: Battle, uid: string, after: Battle): boolean {
  const prev = previewCard(b, uid);
  return (
    after.enemy.hp === prev.enemyHp &&
    after.enemy.pos === prev.enemyPos &&
    after.player.hp === prev.playerHp &&
    after.player.pos === prev.playerPos
  );
}

function detectStallTurn(b: Battle): number | undefined {
  const elite = ENEMIES[b.enemyId]?.elite;
  const limit =
    b.enemyId === "lord" || b.enemyId === "usurper" || b.enemyId === "twin" ? 16 : elite ? 12 : 8;
  if (b.turn > limit) return b.turn;
  return undefined;
}

function renderOverlays(): string {
  const parts: string[] = [];
  if (guideOpen) parts.push(renderGuideSheet());
  if (wikiOpen) parts.push(renderWikiSheet(wikiOpen, wikiPage));
  if (devPanelOpen) parts.push(renderDevPanelModal());
  if (battleSheet && battle) parts.push(renderBattleSheet(battleSheet, battle));
  return parts.join("");
}

/**
 * 设置面板挂在 body 下的独立宿主，不随 render() 重建：
 * 战斗中敌人行动/回合计时都会触发 render，若面板在 root 内，拖动滑条会被重建打断。
 */
let settingsHost: HTMLElement | null = null;
let sfxPreviewAt = 0;

function renderSettingsSheet(): string {
  return `<div class="lab-overlay lab-settings-mask" id="lab-settings-mask">
    <div class="lab-overlay-panel lab-settings-panel" role="dialog" aria-label="设置">
      <h3>设置</h3>
      <div class="lab-slider-row"><label><span>音效音量</span><span id="val-sfx">${getSfxVolume()}</span></label>
        <input type="range" id="sl-sfx" min="0" max="100" step="1" value="${getSfxVolume()}"/></div>
      <div class="lab-slider-row"><label><span>乐音音量</span><span id="val-bgm">${getBgmVolume()}</span></label>
        <input type="range" id="sl-bgm" min="0" max="100" step="1" value="${getBgmVolume()}"/></div>
      <button type="button" class="lab-btn primary" id="lab-settings-close">好了</button>
    </div>
  </div>`;
}

function openSettings(): void {
  closeSettings();
  settingsHost = document.createElement("div");
  settingsHost.id = "lab-settings-root";
  settingsHost.innerHTML = renderSettingsSheet();
  document.body.appendChild(settingsHost);

  settingsHost.querySelector("#lab-settings-close")?.addEventListener("click", closeSettings);
  settingsHost.querySelector("#lab-settings-mask")?.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).id === "lab-settings-mask") closeSettings();
  });

  const slSfx = settingsHost.querySelector<HTMLInputElement>("#sl-sfx");
  slSfx?.addEventListener("input", () => {
    const v = Number(slSfx.value);
    setSfxVolume(v);
    const label = settingsHost?.querySelector("#val-sfx");
    if (label) label.textContent = String(v);
    const now = Date.now();
    if (now - sfxPreviewAt > 180) {
      sfxPreviewAt = now;
      playSfx("drop");
    }
  });

  const slBgm = settingsHost.querySelector<HTMLInputElement>("#sl-bgm");
  slBgm?.addEventListener("input", () => {
    const v = Number(slBgm.value);
    setBgmVolume(v);
    const label = settingsHost?.querySelector("#val-bgm");
    if (label) label.textContent = String(v);
    if (!bgmPlaying()) ensureBgm();
  });
}

function closeSettings(): void {
  if (!settingsHost) return;
  settingsHost.remove();
  settingsHost = null;
  syncBgmWithScreen();
}

/** 战斗状态差分 → 音效。fx 队列只追加，长度/末项变化即新演出；受击 HP 差分兜底（攻击音效在出牌点已播）。 */
function syncBattleAudio(next: Battle | null): void {
  const prev = audioPrevBattle;
  audioPrevBattle = next;
  if (!next || !prev || prev === next) return;
  const fx = next.v2FxQueue ?? [];
  const pfx = prev.v2FxQueue ?? [];
  if (fx.length > pfx.length) {
    for (let i = pfx.length; i < fx.length; i++) playFxSfx(fx[i]);
    return;
  }
  if (next.player.hp < prev.player.hp) playSfx("clash");
}

function renderHeader(): string {
  const fsLabel = labFullscreen ? "退出全屏" : "全屏";
  const inGauntlet = gauntletRun != null || breakDemoRun != null || hallRun != null;
  const subLine = breakDemoRun
    ? "训练营 ·"
    : hallRun
      ? "训练馆 ·"
      : "十馆肉鸽 · 破招是上限不是通关门槛 ·";
  const backBtn =
    phase === "battle" && inGauntlet
      ? `<button type="button" class="lab-btn" id="gauntlet-exit-battle">${breakDemoRun ? "退出示范" : hallRun ? "退出训练馆" : "退出踢馆"}</button>`
      : phase !== "setup" && !inGauntlet
        ? `<button type="button" class="lab-btn" id="lab-back-setup">回装配</button>`
        : "";
  return `
    <header class="lab-header ${phase === "battle" ? "lab-header-battle" : ""}">
      <div class="lab-title-block">
        <h1>连胜踢馆</h1>
        <p class="lab-sub">${subLine} <span class="lab-build-tag">第十二版</span></p>
      </div>
      <div class="lab-actions">
        <button type="button" class="lab-btn lab-guide-btn" id="lab-guide-open">攻略</button>
        <button type="button" class="lab-btn" id="lab-settings-open">设置</button>
        <button type="button" class="lab-btn" id="lab-dev-open">实验台</button>
        <button type="button" class="lab-btn" id="lab-fullscreen">${fsLabel}</button>
        ${backBtn}
      </div>
    </header>`;
}

function renderSetup(): string {
  syncDraft();
  if (gauntletScreen === "intro") {
    return `${renderHeader()}${renderGauntletOverlay("intro", renderBreakIntro())}`;
  }
  if (hallScreen === "catalog") {
    return `${renderHeader()}${renderGauntletOverlay("pick", renderTrainingHallCatalog(hallCab, hallFocus))}`;
  }
  if (hallScreen === "cleared" && hallRun) {
    return `${renderHeader()}${renderGauntletOverlay("result", renderHallCleared(hallRun), staticOverlayBg("result"))}`;
  }
  if (hallScreen === "retry" && hallRun) {
    return `${renderHeader()}${renderGauntletOverlay("result", renderHallRetry(hallRun), staticOverlayBg("result"))}`;
  }
  if (demoScreen && breakDemoRun) {
    if (demoScreen === "retry") {
      return `${renderHeader()}${renderGauntletOverlay(
        "result",
        `<div class="gauntlet-shell"><header class="gauntlet-head"><h2>本局未过</h2><p>示范可重打，不扣正式进度。</p></header>
        <div class="gauntlet-wager-actions">
          <button type="button" class="lab-btn primary large" id="demo-retry">再试本局</button>
          <button type="button" class="lab-btn" id="demo-abort">退出示范</button>
        </div></div>`,
        staticOverlayBg("result"),
      )}`;
    }
    return `${renderHeader()}${renderGauntletOverlay(demoScreen, renderDemoShell(demoScreen, breakDemoRun, demoMarketBought))}`;
  }
  if (gauntletScreen === "path") {
    return `${renderHeader()}${paintGauntletOverlay("path", renderGauntletPathPick())}`;
  }
  if (gauntletScreen === "pick") {
    return `${renderHeader()}${paintGauntletOverlay("pick", renderGauntletSchoolPick(gauntletPath ?? "bandit", gauntletError))}`;
  }
  if (gauntletScreen === "event" && gauntletRun && gauntletEventKind) {
    return `${renderHeader()}${paintGauntletOverlay("event", renderGauntletEvent(gauntletRun, gauntletEventKind, gauntletEventChoices))}`;
  }
  if (gauntletScreen === "finale" && gauntletRun) {
    return `${renderHeader()}${paintGauntletOverlay("finale", renderGauntletFinale(gauntletRun))}`;
  }
  if (gauntletScreen === "scar" && gauntletRun) {
    return `${renderHeader()}${paintGauntletOverlay("scar", renderGauntletScar(gauntletRun))}`;
  }
  if (gauntletScreen === "companion" && gauntletRun) {
    return `${renderHeader()}${paintGauntletOverlay("companion", renderGauntletCompanionPick(gauntletRun, gauntletCompanions))}`;
  }
  if (gauntletScreen === "reward" && gauntletRun) {
    return `${renderHeader()}${paintGauntletOverlay("reward", renderGauntletRewardPick(gauntletRun, gauntletRewards, gauntletMarket, gauntletMarketBought, gauntletRewardTakes, gauntletMarketRefreshN, gauntletRewardsAreSuper))}`;
  }
  if (gauntletScreen === "loadout" && gauntletRun) {
    return `${renderHeader()}${paintGauntletOverlay("loadout", renderGauntletLoadout(gauntletRun, loadoutFocusMate ?? undefined))}`;
  }
  if (gauntletScreen === "banker" && gauntletRun) {
    return `${renderHeader()}${paintGauntletOverlay("banker", renderGauntletBanker())}`;
  }
  if (gauntletScreen === "lifeline" && gauntletRun) {
    return `${renderHeader()}${paintGauntletOverlay("lifeline", renderGauntletLifeline(gauntletRun))}`;
  }
  if (gauntletScreen === "wager" && gauntletRun) {
    return `${renderHeader()}${paintGauntletOverlay("wager", renderGauntletWager(gauntletRun, wagerOffersCache, wagerKind, wagerStake))}`;
  }
  if (gauntletScreen === "rewardTarget" && gauntletRun && pendingReward) {
    const members = [GAUNTLET_SCHOOL_LOADOUT[gauntletRun.school].fieldMate, ...runCompanions(gauntletRun)];
    return `${renderHeader()}${paintGauntletOverlay("rewardTarget", renderGauntletRewardTarget(gauntletRun, pendingReward.title, members))}`;
  }
  if (gauntletScreen === "result" && gauntletRun) {
    const elapsed = Math.max(0, Math.round((Date.now() - gauntletRun.startedAt) / 1000));
    const note =
      gauntletResultNote ||
      (gauntletRun.bankruptUsed ? "本局已用过赊账" : gauntletRun.pot < reviveCost(gauntletRun.stage) ? "彩金不足破产线" : "");
    return `${renderHeader()}${paintGauntletOverlay("result", renderGauntletResult(gauntletRun, elapsed, note))}`;
  }
  return `${renderHeader()}${renderGauntletOverlay("intro", renderGauntletHome(), `/${HOME_BG}`)}`;
}

function renderSliders(enabled: boolean): string {
  const t = getLabTuning();
  const dis = enabled ? "" : "disabled";
  const breakRow = `<div class="lab-slider-row"><label><span>破招窗口（遗留）</span><span id="val-break">${t.breakWindow}</span></label>
      <input type="range" id="sl-break" min="0" max="100" step="5" value="${t.breakWindow}" ${dis}/></div>`;
  return `
    <p class="muted lab-pause-mode">肉鸽踢馆调参</p>
    <div class="lab-slider-row"><label><span>伤害系数</span><span id="val-dmg">${t.dmgCoef.toFixed(2)}</span></label>
      <input type="range" id="sl-dmg" min="0.25" max="2" step="0.05" value="${t.dmgCoef}" ${dis}/></div>
    ${breakRow}
    <div class="lab-slider-row"><label><span>先机偏置</span><span id="val-pace">${t.paceBias}</span></label>
      <input type="range" id="sl-pace" min="-3" max="5" step="1" value="${t.paceBias}" ${dis}/></div>
    <div class="lab-slider-row"><label><span>AI读招激进度</span><span id="val-ai">${t.aiAggression}</span></label>
      <input type="range" id="sl-ai" min="0" max="100" step="5" value="${t.aiAggression}" ${dis}/></div>
    <div class="lab-slider-row"><label><span>单回合时限(秒)</span><span id="val-limit">${t.turnLimitSec}</span></label>
      <input type="range" id="sl-limit" min="0" max="120" step="5" value="${t.turnLimitSec}" ${dis}/></div>
    <div class="lab-slider-row"><label><span>牌堆乘数</span><span id="val-deck-mult-pause">${t.deckMultiplier}</span></label>
      <input type="range" id="sl-deck-mult-pause" min="1" max="10" step="1" value="${t.deckMultiplier}" ${dis}/></div>
    <div class="lab-slider-row"><label><span>敌气血倍率</span><span id="val-enemy-hp">${t.enemyHpMul.toFixed(2)}</span></label>
      <input type="range" id="sl-enemy-hp" min="1" max="2.5" step="0.05" value="${t.enemyHpMul}" ${dis}/></div>
    <div class="lab-slider-row"><label><span>敌段加成</span><span id="val-enemy-seg">${t.enemySegBonus}</span></label>
      <input type="range" id="sl-enemy-seg" min="0" max="3" step="1" value="${t.enemySegBonus}" ${dis}/></div>
    <div class="lab-slider-row"><label><span>应激上限（含破招应激）</span><span id="val-enemy-stress">${t.enemyStressCap}</span></label>
      <input type="range" id="sl-enemy-stress" min="0" max="5" step="1" value="${t.enemyStressCap}" ${dis}/></div>
    <div class="lab-v2-toggles">
      <label class="lab-check"><input type="checkbox" id="tog-v2" ${t.rulesV2 ? "checked" : ""} ${dis}/><span>v2 规则</span></label>
      <label class="lab-check"><input type="checkbox" id="tog-fx" ${t.v2Fx ? "checked" : ""} ${dis}/><span>演出</span></label>
      <label class="lab-check"><input type="checkbox" id="tog-variant" ${t.v2VariantAi ? "checked" : ""} ${dis}/><span>变招</span></label>
      <label class="lab-check"><input type="checkbox" id="tog-grudge" ${t.v2Grudge ? "checked" : ""} ${dis}/><span>鏖战</span></label>
      <label class="lab-check"><input type="checkbox" id="tog-combo" ${t.rulesCombo ? "checked" : ""} ${dis}/><span>组合技 §16</span></label>
    </div>`;
}

function syncBgmWithScreen(): void {
  if (phase === "battle") ensureBgm();
  else stopBgm();
}

function render(): void {
  setLabMode(phase === "battle" || gauntletRun != null);
  document.documentElement.classList.toggle("lab-fullscreen", labFullscreen);
  root.classList.toggle("lab-fullscreen", labFullscreen);
  syncBgmWithScreen();
  syncBattleAudio(phase === "battle" ? battle : null);
  const overlays = renderOverlays();
  if (phase === "setup") root.innerHTML = renderSetup() + overlays;
  else if (phase === "battle") root.innerHTML = renderBattle() + overlays;
  else root.innerHTML = renderReport() + overlays;
  bindEvents();
  if (phase === "battle" && battle?.v2FxQueue?.length) {
    window.setTimeout(() => {
      if (battle?.v2FxQueue?.length) {
        battle = { ...battle, v2FxQueue: [] };
        render();
      }
    }, 450);
  }
  resetTurnTimer();
}

function exitGauntlet(): void {
  gauntletRun = null;
  gauntletScreen = null;
  breakDemoRun = null;
  demoScreen = null;
  hallRun = null;
  hallScreen = null;
  battleSheet = null;
  demoMarketBought = new Set();
  gauntletPath = null;
  gauntletRewards = [];
  gauntletRewardsAreSuper = false;
  gauntletCompanions = [];
  wagerKind = null;
  wagerStake = null;
  gauntletMarket = [];
  gauntletMarketBought = new Set();
  gauntletEndedByLoss = false;
  gauntletResultNote = "";
  battle = null;
  phase = "setup";
  paused = false;
  hoverUid = null;
  weaponOpen = null;
  exitGauntletTuning();
  endLabMode();
  render();
}

function beginHallBattle(): void {
  if (!hallRun) return;
  try {
    enterGauntletTuning();
    setLabTuning({
      rulesV2: true,
      v2Fx: true,
      rulesCombo: Boolean(hallRun.companion),
      playerEnergyBonus: 0,
      playerDmgMul: 1,
      enemyHpMul: 0.85,
      enemySegBonus: 0,
      dmgCoef: 1,
      v2Grudge: false,
    });
    hallRun = syncHallLesson({ ...hallRun, lessonStep: hallRun.bout === 1 ? 0 : hallRun.lessonStep, foeDebrief: null });
    const preset = buildHallPreset(hallRun);
    draft = clonePreset(preset);
    setLabMode(true);
    battle = applyHallBattle(startLabBattle(preset, false, 1), hallRun);
    telemetry = startTelemetry({
      presetId: `hall-${hallRun.courseId}-${hallRun.bout}`,
      presetName: hallTitle(hallRun),
      enemyId: preset.enemyId,
      designerMode: false,
      startedAt: Date.now(),
    });
    phase = "battle";
    hallScreen = null;
    paused = false;
    hoverUid = null;
    hoverIntentIdx = null;
    weaponOpen = null;
    render();
  } catch (err) {
    console.error("[training-hall] beginHallBattle failed", err);
    hallScreen = "catalog";
    render();
  }
}

function beginDemoBattle(): void {
  if (!breakDemoRun) return;
  try {
    enterGauntletTuning();
    setLabTuning({
      rulesCombo: Boolean(breakDemoRun.companion),
      playerEnergyBonus: 0,
      playerDmgMul: 1,
      enemyHpMul: 0.85,
      enemySegBonus: 0,
      dmgCoef: 1,
      v2Grudge: false,
    });
    breakDemoRun = syncDemoLesson({
      ...breakDemoRun,
      lessonStep: 0,
      foeDebrief: null,
      swapTaught: breakDemoRun.stage === 6 ? false : breakDemoRun.swapTaught,
    });
    const preset = buildBreakDemoPreset(breakDemoRun);
    draft = preset;
    setLabMode(true);
    battle = applyBreakDemoBattle(startLabBattle(preset, false, 1), breakDemoRun);
    telemetry = startTelemetry({
      presetId: `break-demo-${breakDemoRun.stage}`,
      presetName: preset.name,
      enemyId: preset.enemyId,
      designerMode: false,
      startedAt: Date.now(),
    });
    phase = "battle";
    gauntletScreen = null;
    demoScreen = null;
    paused = false;
    hoverUid = null;
    hoverIntentIdx = null;
    weaponOpen = null;
    render();
  } catch (err) {
    console.error("[break-demo] beginDemoBattle failed", err);
    gauntletError = `示范开战失败：${err instanceof Error ? err.message : String(err)}`;
    demoScreen = "retry";
    phase = "setup";
    render();
  }
}

function startBreakDemo(track: "rookie" | "break" = "break"): void {
  enterGauntletTuning();
  breakDemoRun = createBreakDemoRun(track);
  demoMarketBought = new Set();
  demoScreen = null;
  gauntletScreen = null;
  beginDemoBattle();
}

function finishHallBattle(outcome: "win" | "loss"): void {
  if (!hallRun || !battle) return;
  battle = null;
  phase = "setup";
  endLabMode();
  hallScreen = outcome === "win" ? "cleared" : "retry";
  render();
}

function finishDemoBattle(outcome: "win" | "loss"): void {
  if (!breakDemoRun || !battle) return;
  const breaks = battle.v2BreakCount ?? 0;
  breakDemoRun = {
    ...breakDemoRun,
    items: [...(battle.labItems ?? [])],
    itemCharges: { ...(battle.labItemCharges ?? {}) },
  };
  if (outcome === "win") {
    breakDemoRun = advanceDemoAfterWin(breakDemoRun, breaks, battle.player.hp);
    battle = null;
    phase = "setup";
    demoScreen = "reward";
    demoMarketBought = new Set();
    endLabMode();
    render();
    return;
  }
  battle = null;
  phase = "setup";
  demoScreen = "retry";
  endLabMode();
  render();
}

function afterDemoRewardPicked(cardId: CardId): void {
  if (!breakDemoRun) return;
  breakDemoRun = {
    ...breakDemoRun,
    deckRecipe: [...breakDemoRun.deckRecipe, cardId],
  };
  if (breakDemoRun.stage === 4 && !breakDemoRun.companion) {
    demoScreen = "companion";
  } else {
    demoScreen = "market";
  }
  render();
}

function afterDemoCompanion(id: CompanionId): void {
  if (!breakDemoRun) return;
  breakDemoRun = { ...breakDemoRun, companion: id };
  demoScreen = "market";
  render();
}

function afterDemoMarketContinue(): void {
  if (!breakDemoRun) return;
  const last = (breakDemoRun.track ?? "break") === "rookie" ? 4 : 6;
  if (breakDemoRun.stage >= last) {
    demoScreen = "graduate";
    render();
    return;
  }
  const next = (breakDemoRun.stage + 1) as DemoStage;
  breakDemoRun = syncDemoLesson({
    ...breakDemoRun,
    stage: next,
    lessonStep: 0,
    foeDebrief: null,
      swapTaught: next === 6 ? false : breakDemoRun.swapTaught,
  });
  demoMarketBought = new Set();
  beginDemoBattle();
}

function graduateDemoToHome(): void {
  if ((breakDemoRun?.track ?? "break") === "rookie") markRookieDemoDone();
  else markBreakDemoDone();
  breakDemoRun = null;
  demoScreen = null;
  demoMarketBought = new Set();
  gauntletScreen = null;
  gauntletPath = null;
  exitGauntletTuning();
  endLabMode();
  render();
}

function beginGauntletBattle(): void {
  if (!gauntletRun) return;
  try {
    const entry = ladderEntryForRun(gauntletRun);
    // §31.13 下注落锤：开擂前把选中的注写进 run，收馆结算
    const offer = wagerKind ? wagerOffersCache.find((o) => o.kind === wagerKind) : null;
    const stake = Math.min(wagerStake ?? 0, wagerStakeMax(gauntletRun.pot, gauntletRun.stage));
    if (!canStartBattle(gauntletRun)) {
      gauntletError = "出战牌包张数或道具格不合阶段上限，先去营地配装。";
      loadoutFocusMate = gauntletFieldMate(gauntletRun.school);
      gauntletScreen = "loadout";
      render();
      return;
    }
    const wager = offer && stake > 0 ? { kind: offer.kind, stake, target: offer.target, odds: offer.odds } : null;
    gauntletRun = {
      ...gauntletRun,
      pot: wager ? gauntletRun.pot - stake : gauntletRun.pot,
      wager,
    };
    wagerKind = null;
    wagerStake = null;
    applyStageTuning(entry, gauntletRun);
    // §31.9 伙伴入伙后组合技/光环开启；仙药劲力上限随 run 走
    setLabTuning({
      rulesCombo: Boolean(runCompanions(gauntletRun).length || gauntletRun.lifelineCompanion),
      playerEnergyBonus: gauntletRun.bonusEnergyMax ?? 0,
      playerDmgMul: gauntletRun.statBoostMul ?? 1,
    });
    const painted = takeSceneBg(
      gauntletRun,
      `combat:${gauntletRun.path}:${gauntletRun.stage}`,
      combatBgPool(gauntletRun.path, gauntletRun.stage),
    );
    gauntletRun = painted.run;
    const preset = { ...buildGauntletPreset(gauntletRun), sceneBg: painted.url };
    draft = preset;
    setLabMode(true);
    battle = startLabBattle(preset, false, 1);
    gauntletRun = consumeFightStartMods(gauntletRun);
    telemetry = startTelemetry({
      presetId: `gauntlet-${gauntletRun.school}`,
      presetName: entry.label,
      enemyId: preset.enemyId,
      designerMode: false,
      startedAt: Date.now(),
    });
    phase = "battle";
    gauntletScreen = null;
    paused = false;
    hoverUid = null;
    hoverIntentIdx = null;
    weaponOpen = null;
    render();
  } catch (err) {
    console.error("[gauntlet] beginGauntletBattle failed", err);
    gauntletError = `开战失败：${err instanceof Error ? err.message : String(err)}`;
    gauntletScreen = "wager";
    render();
  }
}

function beginSkirmishBattle(): void {
  if (!gauntletRun) return;
  try {
    gauntletRun = { ...gauntletRun, skirmishActive: true, wager: null };
    const entry = ladderEntryForRun({ ...gauntletRun, stage: 1 });
    applyStageTuning(entry, { pendingDmgMul: 0.65, forceDangerNext: false, scars: 0 });
    setLabTuning({
      rulesCombo: Boolean(runCompanions(gauntletRun).length || gauntletRun.lifelineCompanion),
      playerEnergyBonus: gauntletRun.bonusEnergyMax ?? 0,
      playerDmgMul: gauntletRun.statBoostMul ?? 1,
      enemyHpMul: 0.45,
    });
    const painted = takeSceneBg(
      gauntletRun,
      `skirmish:${gauntletRun.path}:${gauntletRun.stage}`,
      combatBgPool(gauntletRun.path, gauntletRun.stage),
    );
    gauntletRun = painted.run;
    const preset = { ...buildSkirmishPreset(gauntletRun), sceneBg: painted.url };
    draft = preset;
    setLabMode(true);
    battle = startLabBattle(preset, false, 1);
    const recruit = gauntletRun.pendingRecruit;
    if (battle && recruit && gauntletRun.pendingSkirmish === "duel") {
      battle.enemy.name = MATES[recruit]?.name ?? recruit;
      battle.enemy.title = "点到为止";
    } else if (battle && recruit && gauntletRun.pendingSkirmish === "save") {
      battle.enemy.title = `围住${MATES[recruit]?.name ?? "他"}的人`;
    }
    telemetry = startTelemetry({
      presetId: `skirmish-${gauntletRun.school}`,
      presetName: preset.name,
      enemyId: preset.enemyId,
      designerMode: false,
      startedAt: Date.now(),
    });
    phase = "battle";
    gauntletScreen = null;
    paused = false;
    hoverUid = null;
    hoverIntentIdx = null;
    weaponOpen = null;
    render();
  } catch (err) {
    console.error("[gauntlet] beginSkirmishBattle failed", err);
    gauntletError = `短战失败：${err instanceof Error ? err.message : String(err)}`;
    gauntletRun = { ...gauntletRun, skirmishActive: false, pendingSkirmish: undefined };
    gauntletScreen = "event";
    render();
  }
}

function finishGauntletRewardPick(): void {
  if (!gauntletRun) return;
  if (gauntletRewardsAreSuper) {
    gauntletRewardsAreSuper = false;
    gauntletRewards = rollGauntletRewards(gauntletRun);
    gauntletRewardTakes = 0;
    gauntletScreen = "reward";
    render();
    return;
  }
  gauntletRewardTakes += 1;
  gauntletScreen = "reward";
  render();
}

function leaveGauntletCamp(): void {
  if (!gauntletRun) return;
  const need = gauntletRewardTakeCount(gauntletRun);
  if (gauntletRewardsAreSuper && gauntletRewards.length) return;
  if (!gauntletRewardsAreSuper && gauntletRewardTakes < need && gauntletRewards.length) return;
  gauntletRewards = [];
  gauntletRewardsAreSuper = false;
  gauntletRewardTakes = 0;
  gauntletRun = consumeCampMods(gauntletRun);
  if (gauntletRun.streak >= getGauntletFinalStage() && !isGauntletEndless()) {
    gauntletEndedByLoss = false;
    gauntletResultNote = "通关 · 拆招短局结业";
    saveGauntletBest(gauntletRun);
    gauntletScreen = "result";
    render();
    return;
  }
  if (shouldShowFinale(gauntletRun)) {
    gauntletScreen = "finale";
    render();
    return;
  }
  goToWagerOrBattle();
}

/** 垫资后进赌馆；新手关/训练馆不走这条。 */
function goToWagerOrBattle(): void {
  if (!gauntletRun) return;
  wagerKind = null;
  wagerStake = null;
  if (gauntletRun.skipNextWager) {
    gauntletRun = { ...gauntletRun, skipNextWager: false, wager: null };
    gauntletScreen = null;
    beginGauntletBattle();
    return;
  }
  if (shouldSkipWager(gauntletRun.stage)) {
    gauntletScreen = null;
    beginGauntletBattle();
    return;
  }
  wagerOffersCache = wagerOffers(gauntletRun);
  gauntletScreen = "wager";
  render();
}

function startGauntletSchool(school: WeaponId): void {
  const path = gauntletPath ?? "bandit";
  gauntletPath = path;
  gauntletError = "";
  enterGauntletTuning();
  try {
    gauntletRun = createGauntletRun(path, school, gauntletBossRotation);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    gauntletError = `开踢失败：${msg}`;
    console.error("[gauntlet] createGauntletRun failed", { path, school, err });
    render();
    return;
  }
  wagerKind = null;
  wagerStake = null;
  gauntletScreen = "banker";
  render();
}

function finishGauntletBattle(outcome: "win" | "loss"): void {
  if (!gauntletRun || !battle) return;
  if (gauntletRun.skirmishActive) {
    const fought = Math.max(1, gauntletRun.stage - 1);
    const recruit = gauntletRun.pendingRecruit;
    gauntletRun = { ...gauntletRun, skirmishActive: false, pendingSkirmish: undefined, pendingRecruit: undefined };
    battle = null;
    phase = "setup";
    if (outcome === "win" && recruit) gauntletRun = applyCompanion(gauntletRun, recruit);
    openGauntletCamp(fought);
    return;
  }
  const breaks = battle.v2BreakCount ?? 0;
  const stats = wagerBattleStats(battle, outcome === "win");
  if (outcome !== "win") stats.hpEndRatio = 0;
  const settled = settleHallPot(gauntletRun, stats, outcome === "win");
  const pot = settled.pot;
  const texts = settled.texts;
  if (outcome === "win") {
    const foughtStage = gauntletRun.stage;
    const enemyFought = draft.enemyId;
    gauntletRun = {
      ...afterGauntletWin({ ...gauntletRun, pot, items: [...(battle.labItems ?? [])], itemCharges: { ...(battle.labItemCharges ?? {}) } }, breaks, battle.player.hp, battle.player.maxHp, enemyFought),
      wager: null,
      lastPotText: texts.filter(Boolean).join(" · "),
    };
    gauntletRun = consumeHallPotMods(gauntletRun);
    battle = null;
    phase = "setup";
    const kind = eventAfterFought(foughtStage);
    if (kind) {
      gauntletEventKind = kind;
      gauntletEventChoices = rollEventChoices(gauntletRun, kind);
      gauntletScreen = "event";
      render();
      return;
    }
    if (isCompanionMilestone(foughtStage) && runCompanions(gauntletRun).length < maxCompanions() && !gauntletRun.skipCompanionPick) {
      gauntletCompanions = rollCompanionChoices(gauntletRun);
      gauntletScreen = "companion";
      render();
      return;
    }
    openGauntletCamp(foughtStage);
    return;
  }
  gauntletRun = { ...afterGauntletLoss({ ...gauntletRun, pot, items: [...(battle.labItems ?? [])], itemCharges: { ...(battle.labItemCharges ?? {}) } }, breaks), wager: null, lastPotText: texts.filter(Boolean).join(" · ") };
  battle = null;
  phase = "setup";
  if (canOfferLifeline(gauntletRun)) {
    gauntletScreen = "lifeline";
    gauntletResultNote = "";
    render();
    return;
  }
  if (canOfferScarPass(gauntletRun)) {
    gauntletScreen = "scar";
    gauntletResultNote = "";
    render();
    return;
  }
  gauntletEndedByLoss = true;
  gauntletResultNote = gauntletRun.bankruptUsed
    ? "本局已用过赊账，踢馆结束"
    : `彩金 ${gauntletRun.pot} 低于破产线 ${reviveCost(gauntletRun.stage)}，无法赊账`;
  saveGauntletBest(gauntletRun);
  gauntletBossRotation = nextBossId(gauntletRun.bossId);
  gauntletScreen = "result";
  render();
}

function renderBattle(): string {
  if (!battle) return renderSetup();
  const b = battle;
  const inDemo = breakDemoRun != null;
  const inHall = hallRun != null;
  const inHallGuide = Boolean(hallRun && hallIsGuided(hallRun));
  const inGauntlet = gauntletRun != null;
  const prev = hoverUid ? previewCard(b, hoverUid) : null;
  const swapCost = labSwapCost();
  const partyMode = inDemo
    ? Boolean(breakDemoRun!.companion)
    : inHall
      ? Boolean(hallRun!.companion)
      : !inGauntlet || Boolean(runCompanions(gauntletRun!).length || gauntletRun?.lifelineCompanion);
  const hallSwapStep = inHallGuide && currentHallLesson(hallRun!)?.kind === "swap" && hallRun!.foeDebrief == null;
  const swapTeach =
    (inDemo && breakDemoRun!.foeDebrief == null && currentDemoLesson(breakDemoRun!).kind === "swap") ||
    hallSwapStep;
  const endTeach =
    (inDemo && currentDemoLesson(breakDemoRun!).kind === "end" && !breakDemoRun!.foeDebrief) ||
    (inHallGuide && currentHallLesson(hallRun!)?.kind === "end" && !hallRun!.foeDebrief);
  const swaps = !partyMode
    ? ""
    : b.bench
        .map((m) => {
          const baseGate = labCanSwap(b, m.id);
          const demoOk = inDemo
            ? demoAllowsSwap(breakDemoRun!, m.id)
            : inHallGuide
              ? hallAllowsSwap(hallRun!, m.id)
              : true;
          const gate = !demoOk
            ? { ok: false as const, reason: "本步请换同伴上场" }
            : baseGate;
          const def = MATES[m.id];
          const school = battleEquippedSchool(b, m.id);
          const teachTarget =
            (inDemo ? breakDemoRun?.companion : inHallGuide ? hallRun?.companion : null) ?? DEMO_FIST_MATE;
          const teachFist = swapTeach && m.id === teachTarget;
          const tip = gate.ok
            ? isLabV2()
              ? `换人·${def.name} · ${WEAPON_NAME[school]} · 先机 ${WEAPON_PACE[school]} · 气血 ${m.hp} · 耗 ${swapCost} 劲 · 登场势`
              : `换人·${def.name} · 耗 ${swapCost} 劲 · 落后一回合`
            : gate.reason ?? "不可换人";
          const teachTip = teachFist ? "示范：点这里换同伴上场" : tip;
          return `<button type="button" class="swap-btn lab-swap-btn ${teachFist ? "demo-swap-teach" : ""}" data-swap="${m.id}" data-tip="${escapeHtml(teachTip)}" ${gate.ok ? "" : "disabled"}><b>换人·${def.name}</b><small>${WEAPON_NAME[school]} · 先机 ${WEAPON_PACE[school]} · ${m.hp}</small><span class="status-tip">${escapeHtml(teachTip)}</span></button>`;
        })
        .join("");
  const assistCost = assistEnergyCost(b);
  const fieldSchool = battleEquippedSchool(b, b.active);
  // §31.12 助战与同行分家：v2 不再有「叫队友上场」的助战按钮（助战=助战符，同行=换人/光环/组合技）
  const assists =
    partyMode && isComboRulesEnabled() && !isLabV2()
      ? b.bench
          .map((m) => {
            const gate = canCallAssist(b, m.id);
            const def = MATES[m.id];
            const assistSchool = battleEquippedSchool(b, m.id);
            const cross = assistSchool !== fieldSchool;
            const comboMark = cross ? `<span class="lab-combo-mark">合</span>` : "";
            const tip = gate.ok
              ? `助战·${def.name} · ${WEAPON_NAME[assistSchool]} · ${ROLE_LABEL[def.assist ?? def.role]} · 耗 ${assistCost} 劲${cross ? " · 跨系开闸" : ""}`
              : gate.reason ?? "不可助战";
            return `<button type="button" class="assist-btn lab-assist-btn" data-assist="${m.id}" data-tip="${escapeHtml(tip)}" ${gate.ok ? "" : "disabled"}>${comboMark}<b>助战·${def.name}</b><small>耗 ${assistCost} 劲 · ${m.hp}</small><span class="status-tip">${escapeHtml(tip)}</span></button>`;
          })
          .join("")
      : "";
  const assistBadge =
    !inGauntlet && !isLabV2() && b.labAssistActive && isComboRulesEnabled()
      ? (() => {
          const id = b.labAssistActive!;
          const segs = Math.max(1, (b.intents?.length ?? 1) - (b.v2ResolveIntentIdx ?? 0));
          const tip = `助战中：${MATES[id].name} · 敌段余 ${segs}`;
          return `<span class="lab-assist-active-badge" data-tip="${escapeHtml(tip)}">助战中：${MATES[id].name} · 剩${segs}段<span class="status-tip">${escapeHtml(tip)}</span></span>`;
        })()
      : "";
  const res = computeResonance(b);
  const schoolChips = inGauntlet
    ? ""
    : res.schools
        .filter((s) => s.tier > 0)
        .map((s) => {
          const target = s.tier >= 3 ? 4 : s.tier === 2 ? 4 : 3;
          const next =
            s.toNext > 0 ? ` · 距${s.tier === 1 ? "登堂" : "宗师"} ×${s.toNext}` : "";
          const tip = `${WEAPON_NAME[s.school]} · ${s.tierName}：${s.activeLabel || "已激活"}${next}`;
          return `<span class="lab-aura-chip" data-tip="${escapeHtml(tip)}">${escapeHtml(WEAPON_NAME[s.school])} ${s.count}/${target} · ${s.tierName}已激活${escapeHtml(next)}<span class="status-tip">${escapeHtml(tip)}</span></span>`;
        })
        .join("");
  const flower =
    !inGauntlet && res.hundredFlowers
      ? `<span class="lab-aura-chip lab-aura-flowers" data-tip="四系各异 · 先机+1 · 助战耗劲-1 · 首张组合卡-1劲">百花齐放<span class="status-tip">四系各异 · 先机+1 · 助战耗劲-1 · 首张组合卡-1劲</span></span>`
      : "";
  const sig = signatureActionCopy(b.active);
  const sigGate = canUseSignature(b);
  const sigBtn =
    isLabV2() && sig
      ? actionTipWrap(
          `<button type="button" class="fy-btn lab-sig-btn" id="lab-signature" ${sigGate.ok ? "" : "disabled"}>${escapeHtml(sig.name)}</button>`,
          sigGate.ok ? sig.text : (sigGate.reason ?? "不可用"),
        )
      : "";
  const itemBtns = (b.labItems ?? [])
    .map((id) => {
      const gate = labCanUseItem(b, id);
          const n = itemChargeCount(b, id);
          const tip = gate.ok ? (LAB_ITEM_TIP[id] ?? LAB_ITEM_LABEL[id] ?? id) : (gate.reason ?? "不可用");
          return actionTipWrap(
            `<button type="button" class="fy-btn lab-item-btn" data-item="${id}" ${gate.ok ? "" : "disabled"}>${escapeHtml(LAB_ITEM_LABEL[id] ?? id)} ×${n}</button>`,
            tip,
          );
    })
    .join("");
  const itemRow = [sigBtn, itemBtns].filter(Boolean).length
    ? `<span class="lab-action-group lab-action-items">${sigBtn}${itemBtns}</span>`
    : sigBtn
      ? `<span class="lab-action-group lab-action-items">${sigBtn}</span>`
      : "";
  const auraBlock =
    schoolChips || flower
      ? `<span class="lab-action-group lab-action-aura">${schoolChips}${flower}</span>`
      : "";
  const abortBtn = `<button type="button" class="fy-btn" id="btn-abort">中止报告</button>`;
  const overCap = needsDiscardToHandCap(b);
  const handCap = battleHandCap(b);
  const refillN = handRefillAmount(handCap);
  const discardBtn = overCap
    ? actionTipWrap(
        `<button type="button" class="fy-btn lab-discard-toggle ${discardMode ? "on" : ""}" id="btn-discard">弃牌 ${b.hand.length}/${handCap}</button>`,
        `手牌超过上限 ${handCap}：先点「弃牌」再点要丢掉的牌（不摸）。弃到上限后才能收势。`,
      )
    : "";
  const cycleGate = labCanCycle(b);
  const cycleBtn =
    isLabV2() && !overCap
      ? actionTipWrap(
          `<button type="button" class="fy-btn lab-discard-toggle ${cycleMode ? "on" : ""}" id="btn-cycle" ${cycleGate.ok || cycleMode ? "" : "disabled"}>置换</button>`,
          cycleGate.ok || cycleMode ? "角色技：弃 1 张摸 1 张。每回一次。" : (cycleGate.reason ?? "本回已置换"),
        )
      : "";
  const canEnd =
    b.phase === "player" &&
    canEndPlayerTurn(b).ok &&
    (!inDemo || demoAllowsEndTurn(breakDemoRun!)) &&
    (!inHallGuide || hallAllowsEndTurn(hallRun!));
  const endBtnClass = `endturn fy-btn ${endTeach ? "demo-end-teach" : ""}`;
  const endTip = overCap
    ? `手牌 ${b.hand.length}/${handCap}，请先弃到上限再收势`
    : endTeach
      ? "本步：点收势，系统结算敌招并讲解"
      : isBreakAlign()
        ? `结束本回合：敌行动后摸 ${refillN} 张（上限 ${handCap}）`
        : "结束本回合：敌按意图行动，然后抽牌。";
  const handCapChip = isBreakAlign()
    ? `<span class="lab-hand-cap" data-tip="手牌上限；收势摸 ⌈上限/2⌉；超过须先弃">手牌 ${b.hand.length}/${handCap} · 收势摸 ${refillN}</span>`
    : "";
  const actionRowHtml = inGauntlet || inDemo || inHall
    ? `
    ${partyMode ? `<span class="lab-action-group lab-action-swap">${swaps || `<span class="lab-action-muted" data-tip="后场无人可换">无后场</span>`}</span>` : ""}
    ${partyMode && assists ? `<span class="lab-action-group lab-action-assist">${assists}</span>` : ""}
    ${partyMode ? assistBadge : ""}
    ${itemRow}
    <span class="lab-action-group lab-action-end">
      ${handCapChip}
      ${discardBtn}
      ${cycleBtn}
      ${actionTipWrap(`<button class="${endBtnClass}" id="btn-end" ${canEnd ? "" : "disabled"}>收势</button>`, endTip)}
      ${abortBtn}
    </span>`
    : `
    <span class="lab-action-group lab-action-swap">${swaps || `<span class="lab-action-muted" data-tip="后场无人可换">无后场</span>`}</span>
    ${assists ? `<span class="lab-action-group lab-action-assist">${assists}</span>` : ""}
    ${assistBadge}
    ${auraBlock}
    ${itemRow}
    <span class="lab-action-group lab-action-end">
      ${handCapChip}
      ${discardBtn}
      ${cycleBtn}
      ${actionTipWrap(`<button class="endturn fy-btn" id="btn-end" ${b.phase === "player" && canEndPlayerTurn(b).ok ? "" : "disabled"}>收势</button>`, endTip)}
      ${abortBtn}
    </span>`;
  const entranceNote = summonPending
    ? `<p class="lab-entrance-note summon-hint">点一个空格让${escapeHtml(LAB_ITEM_LABEL[summonPending] ?? "助战")}落位（放敌身后可当墙）；Esc 取消</p>`
    : b.labEntranceActive && !b.labEntranceUsed
      ? `<p class="lab-entrance-note">登场势 — 首张攻击 +2</p>`
      : "";
  const summonPickCells = summonPending && battle ? legalSummonCells(battle) : [];
  const freshNote = !isLabV2() && b.labFreshSwap ? `<p class="lab-fresh-swap">刚换上场 — 本回合不能出招</p>` : "";
  const tuning = getLabTuning();
  const pausePanel = paused
    ? `<div class="lab-overlay" id="lab-overlay">
        <div class="lab-overlay-panel">
          <h3>实时调参 ${tuning.designerMode ? "" : "（玩家模式已锁定）"}</h3>
          ${renderSliders(tuning.designerMode)}
          <button type="button" class="lab-btn primary" id="lab-resume">继续战斗</button>
        </div>
      </div>`
    : "";
  const debriefOverlay =
    breakDemoRun?.foeDebrief != null
      ? renderDemoFoeDebrief(breakDemoRun.foeDebrief)
      : hallRun?.foeDebrief != null
        ? renderDemoFoeDebrief(hallRun.foeDebrief)
        : "";
  return `${renderHeader()}${renderProdBattle({
    b,
    prev,
    hoverUid,
    hoverIntentIdx,
    weaponId: primaryWeapon(draft),
    canPlay: (uid) => {
      const base = labCanPlay(b, uid);
      if (!base.ok) return base;
      const card = b.hand.find((c) => c.uid === uid);
      if (!card) return base;
      if (breakDemoRun && !demoAllowsCard(breakDemoRun, card.defId)) {
        return { ok: false, reason: "本步请打高亮牌（系统指定）" };
      }
      if (inHallGuide && !hallAllowsCard(hallRun!, card.defId)) {
        return { ok: false, reason: "本步请打高亮牌（系统指定）" };
      }
      return base;
    },
    discardMode: discardMode || cycleMode,
    summonPickCells,
    actionRowHtml,
    entranceNote,
    freshNote,
    fxClass: battleFxClasses(b),
    pauseOverlay: `${pausePanel}${debriefOverlay}`,
    toolbarExtra: breakDemoRun
      ? demoBadge(breakDemoRun.stage, breakDemoRun.track ?? "break")
      : hallRun
        ? hallBadge(hallRun)
        : gauntletRun
          ? renderGauntletBadge(gauntletRun)
          : "",
    gauntletStage: breakDemoRun?.stage ?? hallRun?.bout ?? gauntletRun?.stage,
    demoGuide: breakDemoRun
      ? {
          cardIds: breakDemoRun.guideCardIds,
          coach: breakDemoRun.guideCoach,
          teach: breakDemoRun.teachBanner,
          stage: breakDemoRun.stage,
          lockOthers: currentDemoLesson(breakDemoRun).kind === "play",
        }
      : hallRun
        ? {
            cardIds: hallRun.guideCardIds,
            coach: hallRun.guideCoach,
            teach: hallRun.teachBanner,
            stage: hallRun.bout,
            lockOthers: inHallGuide && currentHallLesson(hallRun)?.kind === "play",
          }
        : undefined,
    weaponSheetHtml: weaponOpen ? renderWeaponSheet(weaponOpen) : "",
  })}`;
}

function renderReport(): string {
  const report = telemetry ? balanceReport(telemetry) : "无数据";
  const scenarioBlock = balanceReportsByScenario(recentReports());
  const history = recentReports()
    .slice(0, 5)
    .map((r, i) => `<button type="button" class="lab-btn" data-report-idx="${i}">${r.meta.presetName} · ${r.outcome ?? "?"}</button>`)
    .join(" ");
  return `
    ${renderHeader()}
    <div class="lab-report">
      <h2>埋点 / 平衡报告</h2>
      <pre id="report-text">${escapeHtml(report)}</pre>
      <h3>分场景汇总</h3>
      <pre class="lab-scenario-reports">${escapeHtml(scenarioBlock)}</pre>
      <div style="margin:0.75rem 0;display:flex;gap:0.35rem;flex-wrap:wrap;">${history}</div>
      <button type="button" class="lab-btn primary" id="lab-new">再开一局</button>
    </div>`;
}

function resetTurnTimer(): void {
  if (turnTimer != null) window.clearInterval(turnTimer);
  turnTimer = null;
  if (phase !== "battle" || !battle || battle.phase !== "player") return;
  turnStartedAt = performance.now();
  const limit = getLabTuning().turnLimitSec;
  if (limit <= 0) return;
  turnTimer = window.setInterval(() => {
    const elapsed = (performance.now() - turnStartedAt) / 1000;
    if (elapsed >= limit && !paused) {
      paused = true;
      render();
    }
  }, 500);
}

function beginBattle(): void {
  syncDraft();
  if (isBossEnemy(draft.enemyId)) {
    setLabTuning({ v2Grudge: true });
  }
  setLabMode(true);
  battle = startLabBattle(draft);
  telemetry = startTelemetry({
    presetId: draft.id,
    presetName: draft.name,
    enemyId: draft.enemyId,
    designerMode: getLabTuning().designerMode,
    startedAt: Date.now(),
  });
  phase = "battle";
  paused = false;
  hoverUid = null;
  weaponOpen = null;
  render();
}

function endBattle(outcome: LabTelemetry["outcome"]): void {
  if (telemetry && battle) {
    telemetry = finishTelemetry(telemetry, outcome, detectStallTurn(battle), battle);
    pushReport(telemetry);
  }
  if (gauntletRun) {
    if (outcome === "win") finishGauntletBattle("win");
    else finishGauntletBattle("loss");
    return;
  }
  if (breakDemoRun) {
    if (outcome === "win") finishDemoBattle("win");
    else finishDemoBattle("loss");
    return;
  }
  if (hallRun) {
    if (outcome === "win") finishHallBattle("win");
    else finishHallBattle("loss");
    return;
  }
  phase = "report";
  battle = null;
  endLabMode();
  render();
}

function bindSlider(id: string, key: keyof ReturnType<typeof getLabTuning>, valId: string, parse: (v: string) => number): void {
  const el = document.getElementById(id) as HTMLInputElement | null;
  el?.addEventListener("input", () => {
    if (!getLabTuning().designerMode && id.startsWith("sl-") && !id.includes("deck-mult")) return;
    const val = parse(el.value);
    setLabTuning({ [key]: val });
    if (key === "dmgCoef") applyLabFightScale();
    const label = document.getElementById(valId);
    if (label) label.textContent = key === "dmgCoef" ? val.toFixed(2) : String(val);
    if (key === "deckMultiplier" && phase === "setup") {
      const count = root.querySelector(".lab-recipe-count");
      if (count) {
        const mult = getLabTuning().deckMultiplier;
        count.textContent = `${deckTypeLabel(draft.deckRecipe, mult)} · ${draft.deckRecipe.length}/20`;
      }
    }
  });
}

function refreshSetupPanels(): void {
  syncDraft();
  const deck = root.querySelector("#deck-zone");
  if (deck) deck.innerHTML = renderDeckRecipeHtml(draft, selectedDeckIdx, flyInDeckIdx);
  const pickBody = root.querySelector("#pick-panel-body");
  if (pickBody) pickBody.innerHTML = renderPickPanel(draft, pickFocus, focusMate, showBlockedCards);
  const pickTitle = root.querySelector("#pick-panel-title");
  if (pickTitle) pickTitle.textContent = pickPanelTitle(pickFocus, focusMate);
  bindCardPanelEvents();
  bindPickPanelEvents();
}

function bindPickPanelEvents(): void {
  root.querySelector("#show-blocked")?.addEventListener("change", (e) => {
    showBlockedCards = (e.target as HTMLInputElement).checked;
    refreshSetupPanels();
  });
  for (const el of root.querySelectorAll<HTMLButtonElement>("[data-pick-enemy]")) {
    el.addEventListener("click", () => {
      draft.enemyId = el.dataset.pickEnemy as EnemyId;
      if (isBossEnemy(draft.enemyId)) setLabTuning({ v2Grudge: true });
      render();
    });
  }
  for (const el of root.querySelectorAll<HTMLButtonElement>("[data-pick-mate]")) {
    el.addEventListener("click", () => {
      const id = el.dataset.pickMate as CompanionId;
      focusMate = id;
      if (draft.party.includes(id)) {
        pickFocus = "mates";
        render();
        return;
      }
      const gate = tryAddMate(draft.party, id);
      if (!gate.ok) return;
      draft.party = gate.party;
      pickFocus = "mates";
      render();
    });
  }
  for (const el of root.querySelectorAll<HTMLButtonElement>("[data-pick-weapon]")) {
    el.addEventListener("click", () => {
      const mateId = el.dataset.weaponMate as CompanionId;
      const wid = el.dataset.pickWeapon!;
      if (!canMateEquipGear(mateId, wid)) return;
      draft.mateWeapons[mateId] = wid;
      if (mateId === draft.fieldMate) {
        draft.deckRecipe = pruneDeckForWeapon(draft.deckRecipe, wid);
      }
      render();
    });
  }
  for (const el of root.querySelectorAll<HTMLButtonElement>("[data-pick-tech]")) {
    el.addEventListener("click", () => {
      const mateId = el.dataset.techMate as CompanionId;
      const id = el.dataset.pickTech as TechniqueId;
      const have = draft.mateTechs[mateId] ?? [];
      if (have.includes(id)) {
        draft.mateTechs[mateId] = have.filter((t) => t !== id);
        render();
        return;
      }
      const gate = tryLearnTech(have, id);
      if (!gate.ok) return;
      draft.mateTechs[mateId] = gate.list;
      render();
    });
  }
  for (const el of root.querySelectorAll<HTMLButtonElement>("[data-forget-tech], .lab-tech-forget")) {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      const mateId = el.dataset.techMate as CompanionId;
      const techId = el.dataset.forgetTech as TechniqueId;
      draft.mateTechs[mateId] = (draft.mateTechs[mateId] ?? []).filter((t) => t !== techId);
      render();
    });
  }
  for (const el of root.querySelectorAll<HTMLButtonElement>("[data-set-field]")) {
    el.addEventListener("click", () => {
      draft.fieldMate = el.dataset.setField as CompanionId;
      focusMate = draft.fieldMate;
      render();
    });
  }
  for (const el of root.querySelectorAll<HTMLButtonElement>("[data-drop-mate]")) {
    el.addEventListener("click", () => {
      const id = el.dataset.dropMate as CompanionId;
      draft.party = draft.party.filter((m) => m !== id);
      delete draft.mateTechs[id];
      delete draft.mateWeapons[id];
      if (draft.fieldMate === id) draft.fieldMate = draft.party[0]!;
      focusMate = draft.fieldMate;
      render();
    });
  }
}

function bindCardPanelEvents(): void {
  for (const el of root.querySelectorAll<HTMLButtonElement>("[data-add-card]:not([disabled])")) {
    el.addEventListener("click", () => {
      const id = el.dataset.addCard as CardId;
      const weapon = primaryWeapon(draft);
      const gate = tryAddToRecipe(draft.deckRecipe, id, weapon);
      if (!gate.ok) return;
      flyInDeckIdx = gate.recipe.length - 1;
      draft.deckRecipe = gate.recipe;
      refreshSetupPanels();
      window.setTimeout(() => {
        flyInDeckIdx = null;
        refreshSetupPanels();
      }, 420);
    });
  }
  for (const el of root.querySelectorAll<HTMLElement>(".lab-mini-card[data-deck-idx]")) {
    el.addEventListener("click", () => {
      const idx = Number(el.dataset.deckIdx);
      if (selectedDeckIdx === idx) {
        draft.deckRecipe = draft.deckRecipe.filter((_, i) => i !== idx);
        selectedDeckIdx = null;
      } else selectedDeckIdx = idx;
      refreshSetupPanels();
    });
  }
}

function bindEvents(): void {
  root.querySelector("#lab-fullscreen")?.addEventListener("click", async () => {
    try {
      if (!document.fullscreenElement) {
        await root.requestFullscreen?.();
        labFullscreen = true;
      } else {
        await document.exitFullscreen?.();
        labFullscreen = false;
      }
    } catch {
      labFullscreen = !labFullscreen;
    }
    render();
  });
  document.onfullscreenchange = () => {
    labFullscreen = Boolean(document.fullscreenElement);
    root.classList.toggle("lab-fullscreen", labFullscreen);
    document.documentElement.classList.toggle("lab-fullscreen", labFullscreen);
  };

  root.querySelector("#lab-guide-open")?.addEventListener("click", () => {
    guideOpen = true;
    wikiOpen = null;
    devPanelOpen = false;
    closeSettings();
    playSfx("page");
    render();
  });
  root.querySelector("#lab-dev-open")?.addEventListener("click", () => {
    devPanelOpen = true;
    guideOpen = false;
    closeSettings();
    playSfx("page");
    render();
  });
  root.querySelector("#lab-settings-open")?.addEventListener("click", () => {
    const needRender = guideOpen || devPanelOpen || wikiOpen != null;
    guideOpen = false;
    devPanelOpen = false;
    wikiOpen = null;
    playSfx("page");
    if (needRender) render();
    openSettings();
  });
  root.querySelector("#lab-guide-close")?.addEventListener("click", () => {
    guideOpen = false;
    render();
  });
  root.querySelector("#lab-guide-mask")?.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).id === "lab-guide-mask") {
      guideOpen = false;
      render();
    }
  });
  root.querySelector("#lab-dev-close")?.addEventListener("click", () => {
    devPanelOpen = false;
    render();
  });
  root.querySelector("#lab-dev-mask")?.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).id === "lab-dev-mask") {
      devPanelOpen = false;
      render();
    }
  });

  for (const el of root.querySelectorAll<HTMLButtonElement>("[data-wiki-open]")) {
    el.addEventListener("click", () => {
      wikiOpen = el.dataset.wikiOpen as WikiBook;
      wikiPage = 0;
      guideOpen = false;
      devPanelOpen = false;
      playSfx("page");
      render();
    });
  }
  for (const el of root.querySelectorAll<HTMLButtonElement>("[data-wiki-book]")) {
    el.addEventListener("click", () => {
      wikiOpen = el.dataset.wikiBook as WikiBook;
      wikiPage = 0;
      render();
    });
  }
  root.querySelector("#lab-wiki-close")?.addEventListener("click", () => {
    wikiOpen = null;
    render();
  });
  root.querySelector("#lab-wiki-mask")?.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).id === "lab-wiki-mask") {
      wikiOpen = null;
      render();
    }
  });
  root.querySelector("[data-wiki-prev]")?.addEventListener("click", () => {
    if (wikiOpen) wikiPage = Math.max(0, wikiPage - 1);
    render();
  });
  root.querySelector("[data-wiki-next]")?.addEventListener("click", () => {
    if (wikiOpen) wikiPage = Math.min(wikiPageCount(wikiOpen) - 1, wikiPage + 1);
    render();
  });
  for (const el of root.querySelectorAll<HTMLButtonElement>("[data-pile]")) {
    el.addEventListener("click", () => {
      const which = el.dataset.pile;
      battleSheet = which === "draw" ? "draw" : which === "discard" ? "journal" : null;
      playSfx("page");
      render();
    });
  }
  root.querySelector("#pile-sheet-close")?.addEventListener("click", () => {
    battleSheet = null;
    render();
  });
  root.querySelector("#pile-mask")?.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).id === "pile-mask") {
      battleSheet = null;
      render();
    }
  });

  root.querySelector("#auto-loadout-team")?.addEventListener("change", (e) => {
    autoLoadoutId = (e.target as HTMLSelectElement).value;
  });
  root.querySelector("#auto-weapon-grade")?.addEventListener("change", (e) => {
    autoWeaponGrade = Number((e.target as HTMLSelectElement).value) as AutoWeaponGrade;
  });
  root.querySelector("#auto-tech-depth")?.addEventListener("change", (e) => {
    autoTechDepth = Number((e.target as HTMLSelectElement).value) as AutoTechDepth;
  });
  root.querySelector("#apply-auto-loadout")?.addEventListener("click", () => {
    draft = clonePreset(
      applyAutoLoadout(autoLoadoutId, autoWeaponGrade, autoTechDepth, {
        enemyId: draft.enemyId,
        extraFoeIds: draft.extraFoeIds,
      }),
    );
    focusMate = draft.fieldMate;
    pickFocus = "cards";
    selectedDeckIdx = null;
    render();
  });

  for (const el of root.querySelectorAll<HTMLButtonElement>("[data-pick-focus]")) {
    el.addEventListener("click", () => {
      pickFocus = el.dataset.pickFocus as PickFocus;
      if (el.dataset.focusMate) focusMate = el.dataset.focusMate as CompanionId;
      render();
    });
  }

  bindPickPanelEvents();

  root.querySelector("#lab-exit")?.addEventListener("click", () => {
    endLabMode();
    window.location.href = "./index.html";
  });
  root.querySelector("#lab-back-setup")?.addEventListener("click", () => {
    phase = "setup";
    battle = null;
    endLabMode();
    render();
  });
  root.querySelector("#lab-new")?.addEventListener("click", () => {
    phase = "setup";
    render();
  });
  for (const el of root.querySelectorAll<HTMLButtonElement>("[data-mode]")) {
    el.addEventListener("click", () => {
      setLabTuning({ designerMode: el.dataset.mode === "designer" });
      render();
    });
  }
  for (const el of root.querySelectorAll<HTMLButtonElement>("[data-preset]")) {
    el.addEventListener("click", () => loadDraft(el.dataset.preset!));
  }
  root.querySelector("#save-preset")?.addEventListener("click", () => {
    syncDraft();
    saveCustomPreset({ ...clonePreset(draft), id: `custom-${Date.now()}`, name: `${draft.name}（自定义）` });
    render();
  });
  bindSlider("sl-deck-mult", "deckMultiplier", "val-deck-mult", Number);
  bindSlider("sl-deck-mult-pause", "deckMultiplier", "val-deck-mult-pause", Number);
  bindSlider("sl-enemy-hp-setup", "enemyHpMul", "val-enemy-hp-setup", Number);
  bindSlider("sl-enemy-seg-setup", "enemySegBonus", "val-enemy-seg-setup", Number);
  bindSlider("sl-enemy-stress-setup", "enemyStressCap", "val-enemy-stress-setup", Number);
  const enemyHpSetup = document.getElementById("sl-enemy-hp-setup") as HTMLInputElement | null;
  enemyHpSetup?.addEventListener("input", () => {
    const val = Number(enemyHpSetup.value);
    setLabTuning({ enemyHpMul: val });
    const label = document.getElementById("val-enemy-hp-setup");
    if (label) label.textContent = val.toFixed(2);
  });
  root.querySelector("#tog-grudge-setup")?.addEventListener("change", (e) => {
    setLabTuning({ v2Grudge: (e.target as HTMLInputElement).checked });
  });
  for (const [id, key] of [
    ["tog-v2", "rulesV2"],
    ["tog-fx", "v2Fx"],
    ["tog-variant", "v2VariantAi"],
    ["tog-grudge", "v2Grudge"],
    ["tog-combo", "rulesCombo"],
  ] as const) {
    root.querySelector(`#${id}`)?.addEventListener("change", (e) => {
      if (!getLabTuning().designerMode) return;
      setLabTuning({ [key]: (e.target as HTMLInputElement).checked });
      render();
    });
  }

  bindCardPanelEvents();
  root.querySelector("#start-battle")?.addEventListener("click", beginBattle);
  root.querySelector("#start-gauntlet")?.addEventListener("click", () => {
    gauntletPath = null;
    // 开踢 = 正式选线；新手关另有入口，不再塞进开踢
    gauntletScreen = "path";
    render();
  });
  root.querySelector("#start-rookie-demo")?.addEventListener("click", () => {
    if (!isBreakAlign()) return;
    gauntletPath = null;
    startBreakDemo("rookie");
  });
  root.querySelector("#start-break-demo")?.addEventListener("click", () => {
    if (!isBreakAlign()) return;
    gauntletPath = null;
    gauntletScreen = "intro";
    render();
  });
  root.querySelector("#start-training-hall")?.addEventListener("click", () => {
    if (!isBreakAlign()) return;
    hallScreen = "catalog";
    hallRun = null;
    render();
  });
  for (const el of root.querySelectorAll<HTMLButtonElement>("[data-hall-cab]")) {
    el.addEventListener("click", () => {
      const next = el.dataset.hallCab as HallCabinet;
      if (next !== "break" && next !== "weapon") return;
      hallCab = next;
      hallFocus = hallCoursesIn(hallCab)[0]!.id;
      render();
    });
  }
  for (const el of root.querySelectorAll<HTMLButtonElement>("[data-hall-focus]")) {
    el.addEventListener("click", () => {
      const id = el.dataset.hallFocus as HallCourseId;
      if (!id) return;
      hallFocus = id;
      render();
    });
  }
  root.querySelector("#hall-back-home")?.addEventListener("click", () => {
    hallScreen = null;
    hallRun = null;
    render();
  });
  root.querySelector("#hall-back-catalog")?.addEventListener("click", () => {
    hallScreen = "catalog";
    hallRun = null;
    battle = null;
    phase = "setup";
    endLabMode();
    exitGauntletTuning();
    render();
  });
  root.querySelector("#hall-retry")?.addEventListener("click", () => {
    if (!hallRun) return;
    hallScreen = null;
    beginHallBattle();
  });
  root.querySelector("#hall-goto-drill")?.addEventListener("click", () => {
    if (!hallRun) return;
    hallRun = createHallRun(hallRun.courseId, 2);
    hallScreen = null;
    beginHallBattle();
  });
  root.querySelector("#hall-goto-guide")?.addEventListener("click", () => {
    if (!hallRun) return;
    hallRun = createHallRun(hallRun.courseId, 1);
    hallScreen = null;
    beginHallBattle();
  });
  for (const el of root.querySelectorAll<HTMLButtonElement>("[data-hall-start]")) {
    el.addEventListener("click", () => {
      const id = el.dataset.hallStart as HallCourseId;
      const bout = Number(el.dataset.hallBout) as HallBout;
      if (!id || (bout !== 1 && bout !== 2)) return;
      hallRun = createHallRun(id, bout);
      beginHallBattle();
    });
  }
  root.querySelector("#break-intro-go")?.addEventListener("click", () => {
    startBreakDemo();
  });
  root.querySelector("#break-intro-back")?.addEventListener("click", () => {
    gauntletScreen = null;
    render();
  });
  root.querySelector("#demo-retry")?.addEventListener("click", () => {
    demoScreen = null;
    beginDemoBattle();
  });
  root.querySelector("#demo-abort")?.addEventListener("click", () => {
    exitGauntlet();
  });
  for (const el of root.querySelectorAll<HTMLButtonElement>("[data-demo-reward]")) {
    el.addEventListener("click", () => {
      if (!breakDemoRun) return;
      const idx = Number(el.dataset.demoReward);
      const opt = demoRewardOptions(breakDemoRun.stage)[idx];
      if (!opt) return;
      afterDemoRewardPicked(opt.id);
    });
  }
  for (const el of root.querySelectorAll<HTMLButtonElement>("[data-demo-companion]")) {
    el.addEventListener("click", () => {
      const id = el.dataset.demoCompanion as CompanionId;
      if (!id) return;
      afterDemoCompanion(id);
    });
  }
  for (const el of root.querySelectorAll<HTMLButtonElement>("[data-demo-market]")) {
    el.addEventListener("click", () => {
      if (!breakDemoRun) return;
      const id = el.dataset.demoMarket as LabItemId;
      const offer = demoMarketOffers(breakDemoRun.pot).find((o) => o.id === id);
      if (!offer || demoMarketBought.has(id) || breakDemoRun.pot < offer.price) return;
      const g = grantLabItem(breakDemoRun.items, breakDemoRun.itemCharges, offer.id, undefined, 2);
      if (!g) return;
      breakDemoRun = {
        ...breakDemoRun,
        pot: breakDemoRun.pot - offer.price,
        items: g.items,
        itemCharges: g.charges,
      };
      demoMarketBought.add(id);
      render();
    });
  }
  root.querySelector("#demo-market-continue")?.addEventListener("click", () => {
    afterDemoMarketContinue();
  });
  root.querySelector("#demo-graduate-go")?.addEventListener("click", () => {
    graduateDemoToHome();
  });
  root.querySelector("#gauntlet-exit-path")?.addEventListener("click", () => {
    gauntletPath = null;
    gauntletScreen = null;
    render();
  });
  root.querySelector("#gauntlet-exit-pick")?.addEventListener("click", () => {
    gauntletScreen = "path";
    gauntletError = "";
    render();
  });
  root.querySelector("#gauntlet-exit-result")?.addEventListener("click", exitGauntlet);
  root.querySelector("#gauntlet-exit-battle")?.addEventListener("click", () => {
    if (breakDemoRun) {
      battle = null;
      phase = "setup";
      demoScreen = "retry";
      endLabMode();
      render();
      return;
    }
    if (gauntletRun && battle) {
      // §31.13 中途退场 = 输馆：注飞、底彩无
      const breaks = battle.v2BreakCount ?? 0;
      const settled = settleHallPot(gauntletRun, { ...wagerBattleStats(battle, false), hpEndRatio: 0 }, false);
      gauntletRun = { ...afterGauntletLoss({ ...gauntletRun, pot: settled.pot, items: [...(battle.labItems ?? [])], itemCharges: { ...(battle.labItemCharges ?? {}) } }, breaks), wager: null, lastPotText: settled.texts.filter(Boolean).join(" · ") };
      saveGauntletBest(gauntletRun);
      gauntletBossRotation = nextBossId(gauntletRun.bossId);
      gauntletEndedByLoss = true; // 中途退场也算输馆，有彩金就能赎
    }
    battle = null;
    phase = "setup";
    gauntletScreen = "result";
    render();
  });
  root.querySelector("#gauntlet-retry")?.addEventListener("click", () => {
    if (!gauntletRun) return;
    const school = gauntletRun.school;
    const path = gauntletRun.path;
    gauntletRun = null;
    gauntletScreen = "pick";
    gauntletPath = path;
    gauntletRewards = [];
    gauntletEndedByLoss = false;
    startGauntletSchool(school);
  });
  for (const el of root.querySelectorAll<HTMLButtonElement>("[data-reward-idx]")) {
    el.addEventListener("click", () => {
      if (!gauntletRun) return;
      const idx = Number(el.dataset.rewardIdx);
      const opt = gauntletRewards[idx];
      if (!opt) return;
      if (!gauntletRewardsAreSuper && gauntletRewardTakes >= gauntletRewardTakeCount(gauntletRun)) return;
      if (!gauntletRewardsAreSuper && (opt.kind === "tech" || opt.kind === "mind")) {
        pendingReward = opt;
        gauntletScreen = "rewardTarget";
        render();
        return;
      }
      gauntletRun = gauntletRewardsAreSuper ? applySuperReward(gauntletRun, opt) : applyGauntletReward(gauntletRun, opt);
      gauntletRewards = gauntletRewards.filter((_, i) => i !== idx);
      finishGauntletRewardPick();
    });
  }
  for (const el of root.querySelectorAll<HTMLButtonElement>("[data-target-mate]")) {
    el.addEventListener("click", () => {
      if (!gauntletRun || !pendingReward) return;
      const mateId = el.dataset.targetMate as CompanionId;
      const picked = pendingReward;
      gauntletRun = applyGauntletReward(gauntletRun, { ...picked, targetMate: mateId });
      pendingReward = null;
      gauntletRewards = gauntletRewards.filter((o) => !(o.kind === picked.kind && o.id === picked.id));
      finishGauntletRewardPick();
    });
  }
  // §31.13 下注屏交互
  for (const el of root.querySelectorAll<HTMLButtonElement>("[data-wager-kind]")) {
    el.addEventListener("click", () => {
      wagerKind = wagerKind === el.dataset.wagerKind ? null : (el.dataset.wagerKind as WagerKind);
      render();
    });
  }
  for (const el of root.querySelectorAll<HTMLButtonElement>("[data-wager-stake]")) {
    el.addEventListener("click", () => {
      if (!gauntletRun) return;
      const raw = el.dataset.wagerStake!;
      const val = raw === "all" ? wagerStakeMax(gauntletRun.pot, gauntletRun.stage) : Number(raw);
      wagerStake = wagerStake === val ? null : val;
      render();
    });
  }
  // §31.15 自定义注额：change 或回车落注（input 过程不渲染，免得打着字被重绘打断）
  const wagerCustom = root.querySelector<HTMLInputElement>("#wager-custom");
  const commitWagerCustom = () => {
    if (!gauntletRun || !wagerCustom) return;
    const v = Math.floor(Number(wagerCustom.value));
    if (!Number.isFinite(v) || v <= 0) {
      wagerStake = null;
    } else {
      wagerStake = Math.min(v, wagerStakeMax(gauntletRun.pot, gauntletRun.stage));
    }
    render();
  };
  wagerCustom?.addEventListener("change", commitWagerCustom);
  wagerCustom?.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") {
      ev.preventDefault();
      commitWagerCustom();
    }
  });
  root.querySelector("#wager-fight")?.addEventListener("click", () => {
    if (!gauntletRun || !wagerKind || !wagerStake) {
      console.warn("[wager] blocked", { run: !!gauntletRun, kind: wagerKind, stake: wagerStake });
      return;
    }
    gauntletScreen = null;
    beginGauntletBattle();
  });
  root.querySelector("#wager-skip")?.addEventListener("click", () => {
    if (!gauntletRun) return;
    wagerKind = null;
    wagerStake = null;
    gauntletScreen = null;
    beginGauntletBattle();
  });
  root.querySelector("#gauntlet-cashout")?.addEventListener("click", () => {
    // §31.13 见好就收：带着彩金上榜走人
    if (!gauntletRun) return;
    saveGauntletBest(gauntletRun);
    gauntletBossRotation = nextBossId(gauntletRun.bossId);
    gauntletEndedByLoss = false;
    gauntletScreen = "result";
    render();
  });
  // §31.16 黑市：买下即生效，同槽不售二回；彩金花光别的摊自动灰
  for (const el of root.querySelectorAll<HTMLButtonElement>("[data-market-id]")) {
    el.addEventListener("click", () => {
      if (!gauntletRun) return;
      const id = el.dataset.marketId ?? "";
      const offer = gauntletMarket.find((o) => o.id === id);
      if (!offer || gauntletMarketBought.has(id)) return;
      if (gauntletMarketBought.size >= marketBuyCap(gauntletRun.stage)) return;
      const next = buyMarketOffer(gauntletRun, offer);
      if (!next) return;
      gauntletRun = next;
      gauntletMarketBought = new Set(gauntletMarketBought).add(id);
      render();
    });
  }
  root.querySelector("#gauntlet-market-refresh")?.addEventListener("click", () => {
    if (!gauntletRun) return;
    const cost = marketRefreshCost(gauntletRun, gauntletMarketRefreshN);
    if (gauntletRun.pot < cost) return;
    gauntletRun = { ...gauntletRun, pot: gauntletRun.pot - cost };
    gauntletMarket = marketOffers(gauntletRun);
    gauntletMarketBought = new Set();
    gauntletMarketRefreshN += 1;
    render();
  });
  root.querySelector("#gauntlet-camp-continue")?.addEventListener("click", () => {
    leaveGauntletCamp();
  });
  root.querySelector("#gauntlet-open-loadout")?.addEventListener("click", () => {
    if (gauntletRun) loadoutFocusMate = gauntletFieldMate(gauntletRun.school);
    gauntletScreen = "loadout";
    render();
  });
  root.querySelector("#gauntlet-loadout-back")?.addEventListener("click", () => {
    gauntletScreen = "reward";
    render();
  });
  for (const el of root.querySelectorAll<HTMLButtonElement>("[data-loadout-mate]")) {
    el.addEventListener("click", () => {
      loadoutFocusMate = el.dataset.loadoutMate as CompanionId;
      render();
    });
  }
  for (const el of root.querySelectorAll<HTMLButtonElement>("[data-equip-idx]")) {
    el.addEventListener("click", () => {
      if (!gauntletRun) return;
      const mate = loadoutFocusMate ?? gauntletFieldMate(gauntletRun.school);
      gauntletRun = moveStashToDeck(gauntletRun, mate, Number(el.dataset.equipIdx));
      render();
    });
  }
  for (const el of root.querySelectorAll<HTMLButtonElement>("[data-unequip-mate]")) {
    el.addEventListener("click", () => {
      if (!gauntletRun) return;
      const mate = el.dataset.unequipMate as import("../game/types").CompanionId;
      gauntletRun = moveDeckToStash(gauntletRun, mate, Number(el.dataset.unequipIdx));
      render();
    });
  }
  for (const el of root.querySelectorAll<HTMLButtonElement>("[data-sell-idx]")) {
    el.addEventListener("click", () => {
      if (!gauntletRun) return;
      gauntletRun = sellStashCard(gauntletRun, Number(el.dataset.sellIdx), sellPriceFor("card", gauntletRun.stage, ladderEntryForRun(gauntletRun).tier));
      render();
    });
  }
  bindGauntletDevPanel(root, () => render());
  for (const el of root.querySelectorAll<HTMLButtonElement>("[data-banker-mult]")) {
    el.addEventListener("click", () => {
      if (!gauntletRun) return;
      const mult = Number(el.dataset.bankerMult) as 2 | 3;
      gauntletRun = applyBankerBoost(gauntletRun, mult);
      goToWagerOrBattle();
    });
  }
  for (const el of root.querySelectorAll<HTMLButtonElement>("[data-lifeline]")) {
    el.addEventListener("click", () => {
      if (!gauntletRun) return;
      const kind = el.dataset.lifeline as import("./gauntlet").LifelineKind;
      gauntletRun = applyLifeline(gauntletRun, kind);
      const revived = reviveGauntletRun(gauntletRun);
      if (!revived) return;
      gauntletRun = revived;
      gauntletEndedByLoss = false;
      goToWagerOrBattle();
    });
  }
  for (const el of root.querySelectorAll<HTMLButtonElement>("[data-companion-idx]")) {
    el.addEventListener("click", () => {
      if (!gauntletRun) return;
      const idx = Number(el.dataset.companionIdx);
      const mateId = gauntletCompanions[idx];
      if (!mateId) return;
      gauntletRun = applyCompanion(gauntletRun, mateId);
      gauntletCompanions = [];
      gauntletRewards = rollGauntletRewards(gauntletRun);
      gauntletRewardsAreSuper = false;
      gauntletRewardTakes = 0;
      rollGauntletMarket();
      gauntletScreen = "reward";
      render();
    });
  }
  for (const el of root.querySelectorAll<HTMLButtonElement>("[data-event-idx]")) {
    el.addEventListener("click", () => {
      if (!gauntletRun || !gauntletEventKind) return;
      const choice = gauntletEventChoices[Number(el.dataset.eventIdx)];
      if (!choice) return;
      gauntletRun = applyEncounterChoice(gauntletRun, choice);
      gauntletEventKind = null;
      gauntletEventChoices = [];
      const fought = Math.max(1, gauntletRun.stage - 1);
      if (gauntletRun.pendingSkirmish) {
        beginSkirmishBattle();
        return;
      }
      if (choice.companionId && !choice.skirmish) {
        gauntletRun = { ...applyCompanion(gauntletRun, choice.companionId), pendingRecruit: undefined };
      }
      openGauntletCamp(fought);
    });
  }
  for (const el of root.querySelectorAll<HTMLButtonElement>("[data-finale]")) {
    el.addEventListener("click", () => {
      if (!gauntletRun) return;
      gauntletRun = applyFinale(gauntletRun, el.dataset.finale as FinaleKind);
      goToWagerOrBattle();
    });
  }
  root.querySelector("#gauntlet-scar-pass")?.addEventListener("click", () => {
    if (!gauntletRun) return;
    gauntletRun = applyScarPass(gauntletRun);
    gauntletEndedByLoss = false;
    openGauntletCamp(Math.max(1, gauntletRun.stage - 1));
  });
  root.querySelector("#lab-pause")?.addEventListener("click", () => {
    paused = !paused;
    render();
  });
  root.querySelector("#lab-resume")?.addEventListener("click", () => {
    paused = false;
    resetTurnTimer();
    render();
  });
  root.querySelector("#lab-overlay")?.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).id === "lab-overlay") {
      paused = false;
      render();
    }
  });
  bindSlider("sl-dmg", "dmgCoef", "val-dmg", Number);
  bindSlider("sl-break", "breakWindow", "val-break", Number);
  bindSlider("sl-ai", "aiAggression", "val-ai", Number);
  bindSlider("sl-limit", "turnLimitSec", "val-limit", Number);
  bindSlider("sl-enemy-hp", "enemyHpMul", "val-enemy-hp", Number);
  bindSlider("sl-enemy-seg", "enemySegBonus", "val-enemy-seg", Number);
  bindSlider("sl-enemy-stress", "enemyStressCap", "val-enemy-stress", Number);
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
    if (battle) battle = { ...battle, paceBoost: battle.paceBoost - oldBias + val };
    const label = document.getElementById("val-pace");
    if (label) label.textContent = String(val);
  });

  for (const el of root.querySelectorAll<HTMLButtonElement>(".card[data-uid]")) {
    el.addEventListener("mouseenter", () => {
      hoverUid = el.dataset.uid ?? null;
      for (const c of root.querySelectorAll<HTMLButtonElement>(".card[data-uid]")) {
        c.classList.toggle("hot", c.dataset.uid === hoverUid);
      }
    });
    el.addEventListener("mouseleave", () => {
      hoverUid = null;
      el.classList.remove("hot");
    });
    el.addEventListener("click", () => {
      if (!battle || battle.phase !== "player" || paused) return;
      const uid = el.dataset.uid!;
      // 弃牌/置换：须先点按钮，超上限不会自动改点牌为弃牌
      if (discardMode && needsDiscardToHandCap(battle)) {
        battle = labDiscardCard(battle, uid);
        if (!needsDiscardToHandCap(battle)) discardMode = false;
        render();
        return;
      }
      if (cycleMode) {
        const dGate = labCanCycle(battle);
        if (!dGate.ok) return;
        battle = labCycleCard(battle, uid);
        cycleMode = false;
        render();
        return;
      }
      const gate = labCanPlay(battle, uid);
      if (!gate.ok) return;
      if (breakDemoRun) {
        const cardCheck = battle.hand.find((c) => c.uid === uid);
        if (cardCheck && !demoAllowsCard(breakDemoRun, cardCheck.defId)) return;
      }
      if (hallRun && hallIsGuided(hallRun)) {
        const cardCheck = battle.hand.find((c) => c.uid === uid);
        if (cardCheck && !hallAllowsCard(hallRun, cardCheck.defId)) return;
      }
      const card = battle.hand.find((c) => c.uid === uid);
      const ms = Math.round(performance.now() - turnStartedAt);
      const before = battle;
      const after = playCard(battle, uid);
      if (card) playSfx(CARDS[card.defId]?.type === "attack" ? "swing" : "drop");
      const matched = previewMatchesPlay(before, uid, after);
      battle = after;
      if (breakDemoRun && card) {
        breakDemoRun = afterDemoPlayCard(breakDemoRun, card.defId);
        battle = syncBreakDemoBattle(battle, breakDemoRun);
      }
      if (hallRun && card && hallIsGuided(hallRun)) {
        hallRun = afterHallPlayCard(hallRun, card.defId);
        battle = syncHallBattle(battle, hallRun);
      }
      if (telemetry) {
        telemetry = recordPlayerTurn(
          telemetry,
          after,
          card ? CARDS[card.defId].name : uid,
          ms,
          matched,
          card?.defId,
        );
      }
      hoverUid = null;
      // 敌全灭即胜——不管教案走到哪一步。否则 checkWin 已把 phase 置 "won"，
      // 收势闸（phase==="player"）会把玩家永久锁死在场上。
      if (after.enemy.hp <= 0 || livingFoes(after).every((f) => f.hp <= 0)) {
        endBattle("win");
        return;
      }
      if (after.player.hp <= 0) {
        endBattle("loss");
        return;
      }
      resetTurnTimer();
      render();
    });
  }
  root.querySelector(".hand-scroll")?.addEventListener("mouseleave", () => {
    hoverUid = null;
    for (const c of root.querySelectorAll(".card.hot")) c.classList.remove("hot");
  });
  for (const el of root.querySelectorAll<HTMLButtonElement>("[data-swap]")) {
    el.addEventListener("click", () => {
      if (!battle) return;
      const id = el.dataset.swap as CompanionId;
      if (breakDemoRun && !demoAllowsSwap(breakDemoRun, id)) return;
      if (hallRun && !hallAllowsSwap(hallRun, id)) return;
      battle = labSwapFighter(battle, id);
      if (breakDemoRun) {
        breakDemoRun = afterDemoSwap(breakDemoRun, id);
        battle = syncBreakDemoBattle(battle, breakDemoRun);
      }
      if (hallRun && hallIsGuided(hallRun)) {
        hallRun = afterHallSwap(hallRun, id);
        battle = syncHallBattle(battle, hallRun);
      }
      render();
    });
  }
  for (const el of root.querySelectorAll<HTMLButtonElement>("[data-assist]")) {
    el.addEventListener("click", () => {
      if (!battle || battle.phase !== "player" || paused) return;
      battle = callAssist(battle, el.dataset.assist as CompanionId);
      render();
    });
  }
  for (const el of root.querySelectorAll<HTMLButtonElement>("[data-item]")) {
    el.addEventListener("click", () => {
      if (!battle || battle.phase !== "player" || paused) return;
      const itemId = el.dataset.item as LabItemId;
      // §31.12 助战符：先点符进点位模式，再点棋盘格落位
      if (isSummonItem(itemId) && isLabV2()) {
        summonPending = summonPending === itemId ? null : itemId;
        render();
        return;
      }
      const r = useLabItem(battle, itemId);
      if (!r.ok || !r.battle) return;
      battle = r.battle;
      render();
    });
  }
  // §31.12 点位模式：点格落位
  for (const el of root.querySelectorAll<HTMLElement>(".cell.summon-pick[data-pos]")) {
    el.addEventListener("click", () => {
      if (!battle || !summonPending || battle.phase !== "player" || paused) return;
      const pos = Number(el.dataset.pos);
      const r = useLabItem(battle, summonPending, pos);
      summonPending = null;
      if (!r.ok || !r.battle) return;
      battle = r.battle;
      render();
    });
  }
  root.querySelector("#lab-signature")?.addEventListener("click", () => {
    if (!battle || battle.phase !== "player" || paused) return;
    const r = useSignature(battle);
    if (!r.ok || !r.battle) return;
    battle = r.battle;
    render();
  });
  root.querySelector("#btn-discard")?.addEventListener("click", () => {
    if (!battle || battle.phase !== "player" || paused) return;
    discardMode = !discardMode;
    cycleMode = false;
    render();
  });
  root.querySelector("#btn-cycle")?.addEventListener("click", () => {
    if (!battle || battle.phase !== "player" || paused) return;
    if (!labCanCycle(battle).ok && !cycleMode) return;
    cycleMode = !cycleMode;
    discardMode = false;
    render();
  });
  root.querySelector("#btn-end")?.addEventListener("click", () => {
    if (!battle || battle.phase !== "player" || paused) return;
    if (!canEndPlayerTurn(battle).ok) return;
    if (breakDemoRun && !demoAllowsEndTurn(breakDemoRun)) return;
    if (hallRun && !hallAllowsEndTurn(hallRun)) return;
    discardMode = false;
    cycleMode = false;
    const ms = Math.round(performance.now() - turnStartedAt);
    if (telemetry) telemetry = recordPlayerTurn(telemetry, battle, "收势", ms, true);
    playSfx("drop");
    battle = endTurn(battle);
    if (telemetry) telemetry = recordFoeTurn(telemetry, battle, intentLabel(battle.intent));
    if (breakDemoRun) {
      const you = battle.player.pos;
      const foe = battle.enemy.pos;
      breakDemoRun = afterDemoEndTurn(breakDemoRun);
      // 教案走完后进入自由打：不再钉站位/锁敌招，让收尾战真打
      if (!demoLessonDone(breakDemoRun)) lockDemoAfterFoeTurn(battle, you, foe);
      battle = syncBreakDemoBattle(battle, breakDemoRun);
    }
    if (hallRun && hallIsGuided(hallRun)) {
      const you = battle.player.pos;
      const foe = battle.enemy.pos;
      hallRun = afterHallEndTurn(hallRun);
      lockHallAfterFoeTurn(battle, hallRun, you, foe);
      battle = syncHallBattle(battle, hallRun);
    }
    if (battle.player.hp <= 0) {
      endBattle("loss");
      return;
    }
    if (battle.enemy.hp <= 0 || livingFoes(battle).every((f) => f.hp <= 0)) {
      endBattle("win");
      return;
    }
    resetTurnTimer();
    render();
  });
  root.querySelector("#demo-foe-debrief-ok")?.addEventListener("click", () => {
    if (breakDemoRun && battle) {
      breakDemoRun = dismissDemoFoeDebrief(breakDemoRun);
      battle = syncBreakDemoBattle(battle, breakDemoRun);
      render();
      return;
    }
    if (hallRun && battle) {
      hallRun = dismissHallFoeDebrief(hallRun);
      battle = syncHallBattle(battle, hallRun);
      render();
    }
  });
  for (const el of root.querySelectorAll<HTMLButtonElement>(".lab-intent-seg[data-intent-idx]")) {
    el.addEventListener("mouseenter", () => {
      hoverIntentIdx = Number(el.dataset.intentIdx);
      const slot = root.querySelector("#strip");
      if (slot && battle) {
        const prev = hoverUid ? previewCard(battle, hoverUid) : null;
        slot.innerHTML = renderProdBoard(battle, prev, threatCellsForHover(battle, hoverIntentIdx));
      }
    });
    el.addEventListener("mouseleave", () => {
      hoverIntentIdx = null;
      const slot = root.querySelector("#strip");
      if (slot && battle) {
        const prev = hoverUid ? previewCard(battle, hoverUid) : null;
        slot.innerHTML = renderProdBoard(battle, prev, []);
      }
    });
  }
  root.querySelector("#btn-abort")?.addEventListener("click", () => endBattle("abort"));
  for (const el of root.querySelectorAll<HTMLElement>("[data-weapon-open]")) {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = (el as HTMLElement).dataset.weaponOpen!;
      weaponOpen = weaponOpen === id ? null : id;
      render();
    });
  }
  root.querySelector("#weapon-mask")?.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).id === "weapon-mask") {
      weaponOpen = null;
      render();
    }
  });
  root.querySelector("#weapon-sheet-close")?.addEventListener("click", () => {
    weaponOpen = null;
    render();
  });
  for (const el of root.querySelectorAll<HTMLButtonElement>("[data-report-idx]")) {
    el.addEventListener("click", () => {
      const idx = Number(el.dataset.reportIdx);
      const r = recentReports()[idx];
      if (r) {
        telemetry = r;
        render();
      }
    });
  }
  bindLabTooltips(root);
}

const last = getLastPresetId();
if (last) {
  const found = allPresets().find((p) => p.id === last);
  if (found) {
    draft = clonePreset(found);
    draft.deckRecipe = pruneDeckForWeapon(draft.deckRecipe, primaryWeapon(draft));
    focusMate = draft.fieldMate;
  }
}

document.documentElement.classList.add("lab-root");
root.classList.add("lab-root");

/** 踢馆选线/选系：事件委托，避免 innerHTML 重绘后漏绑点击。 */
root.addEventListener("click", (e) => {
  const t = e.target as HTMLElement;
  const pathBtn = t.closest<HTMLElement>("[data-gauntlet-path]");
  if (pathBtn?.dataset.gauntletPath) {
    gauntletPath = pathBtn.dataset.gauntletPath as GauntletPath;
    gauntletScreen = "pick";
    gauntletError = "";
    render();
    return;
  }
  const schoolBtn = t.closest<HTMLElement>("[data-gauntlet-school]");
  if (schoolBtn) {
    const school = schoolBtn.dataset.gauntletSchool as WeaponId | undefined;
    if (!school) return;
    startGauntletSchool(school);
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && phase === "battle" && summonPending) {
    summonPending = null;
    render();
    return;
  }
  if (e.key === "Escape" && phase === "battle" && weaponOpen) {
    weaponOpen = null;
    render();
  }
  if (e.key === "Escape" && settingsHost) {
    closeSettings();
  }
});
document.addEventListener("pointerdown", unlockAudio);
if (import.meta.env.DEV) {
  (window as unknown as { __labAudio?: unknown }).__labAudio = { bgmPlaying, debugAudioState };
}
render();
