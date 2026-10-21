import { type Battle, type CompanionId, type EnemyId, type LabItemId } from "../../game/types";
import { clonePreset } from "../factory";
import { BUILTIN_PRESETS } from "../presets";
import type { LabPhase, LabPreset, LabTelemetry } from "../types";
import { type AutoTechDepth, type AutoWeaponGrade } from "../autoLoadouts";
import { type WikiBook } from "../encyclopedia";
import { type PickFocus } from "../setupUi";
import { type RecapDisplay } from "../foePlayback";
import { type GauntletMarketOffer, type GauntletRewardOption, type GauntletRun, type GauntletScreen, type WagerKind, type WagerOffer } from "../gauntlet";
import { type GauntletPath } from "../gauntletPaths";
import { type EncounterChoice, type EncounterKind } from "../encounter";
import { type BreakDemoRun } from "../breakDemo";
import { type DemoShellScreen } from "../breakDemoUi";
import { type HallCabinet, type HallCourseId, type HallRun } from "../trainingHall";
import { type BreakCampaignRun } from "../breakCampaign";
import { type QiFight } from "../qiCommit";
import { type BattleSheetKind } from "../battleSheet";
import { type LoadoutPage, type LoadoutPick } from "../gauntletUi";

export const root = document.getElementById("app")!;

export let phase: LabPhase = "setup";

export let draft: LabPreset = clonePreset(BUILTIN_PRESETS[0]!);

export let battle: Battle | null = null;

export let telemetry: LabTelemetry | null = null;

export let hoverUid: string | null = null;

export let hoverIntentIdx: number | null = null;

export let paused = false;

export let turnStartedAt = 0;

export let turnTimer: number | null = null;

export let selectedDeckIdx: number | null = null;

export let flyInDeckIdx: number | null = null;

export let showBlockedCards = false;

export let pickFocus: PickFocus = "cards";

export let focusMate: CompanionId = draft.fieldMate;

export let wikiOpen: WikiBook | null = null;

export let wikiPage = 0;

export let wikiQuery = "";

export let guideOpen = false;

export let devPanelOpen = false;

export let audioPrevBattle: Battle | null = null;

export let labFullscreen = false;

export let autoLoadoutId = "t1-four-palm";

export let autoWeaponGrade: AutoWeaponGrade = 3;

export let autoTechDepth: AutoTechDepth = 1;

export let weaponOpen: string | null = null;

export let gauntletRun: GauntletRun | null = null;

export let gauntletScreen: GauntletScreen | null = null;

export let breakDemoRun: BreakDemoRun | null = null;

export let demoScreen: DemoShellScreen | "retry" | null = null;

export let demoMarketBought: Set<string> = new Set();

export let hallRun: HallRun | null = null;

export let hallScreen: "catalog" | "cleared" | "retry" | null = null;

export let campaignRun: BreakCampaignRun | null = null;

export let qiFight: QiFight | null = null;

export let campaignScreen: "cleared" | "retry" | null = null;

export let campaignChapterDone = false;

/** 敌招逐段播报中：锁操作，0.8s 一段 */
export let foePlaybackBusy = false;

export let foePlaybackTimer: number | null = null;

export let fxClearTimer: number | null = null;

/** 收势前意图快照，供逐段详细播报 */
export let foePlaybackIntents: import("../../game/types").Intent[] = [];

export const FX_HOLD_MS = 480;

/** 立绘逐步演出：windup / resolve 类名 */
export let foeSegAnim: "windup" | "break" | "hit" | "graze" | "miss" | "skip" | null = null;

export let foePlaybackSegIdx = -1;

export let foeFirstHoldTimer: number | null = null;

export let playbackShow: RecapDisplay | null = null;

export let playbackSegFate: Record<number, "gone" | "grey"> = {};

export let youPlayAnim: "swing" | "step" | "cast" | null = null;

export let youPlayAnimTimer: number | null = null;

/** 同一句播报被整页重绘时不要再跳一次 */
export let fxPaintSig = "";

export let pendingWin: { foughtStage: number; texts: string[] } | null = null;

export let routeBookOpen = false;

export let hallCab: HallCabinet = "break";

export let hallFocus: HallCourseId = "hard";

export let battleSheet: BattleSheetKind | null = null;

export let gauntletRewards: GauntletRewardOption[] = [];

export let gauntletRewardsAreSuper = false;

export let gauntletRewardTakes = 0;

export let gauntletCompanions: CompanionId[] = [];

export let gauntletBossRotation: EnemyId = "usurper";

export let gauntletPath: GauntletPath | null = null;

/** 门厅点「无尽」后，开踢时写入 run.endless */
export let gauntletWantEndless = false;

/** §31.13 下注屏选择状态 */
export let wagerKind: WagerKind | null = null;

export let wagerStake: number | null = null;

/** §31.14 当前下注屏摇出的盘口（屏显与落锤同一份，不能渲染一遍、结算再摇一遍）。 */
export let wagerOffersCache: WagerOffer[] = [];

/** §31.16 本屏黑市摊（与奖励同批 roll 定，不随重渲染重滚）；已售槽位按 id 记。 */
export let gauntletMarket: GauntletMarketOffer[] = [];

export let gauntletMarketBought: Set<string> = new Set();

export let gauntletMarketRefreshN = 0;

export let loadoutFocusMate: CompanionId | null = null;

export let loadoutPage: LoadoutPage = "deck";

export let loadoutPick: LoadoutPick = null;

/** 结算屏是否挂着「赎身」分支——只有输馆能赎，见好就收不能。 */
export let gauntletEndedByLoss = false;

export let gauntletResultNote = "";

/** 选系/开踢失败时在屏上显示，避免静默无反应 */
export let gauntletError = "";

/** §31.18 外功/心法待指定受益角色 */
export let pendingReward: GauntletRewardOption | null = null;

export let gauntletEventKind: EncounterKind | null = null;

export let gauntletEventChoices: EncounterChoice[] = [];

export let discardMode = false;

export let cycleMode = false;

/** §31.12 助战符点位模式：非空 = 等待点格落位。 */
export let summonPending: LabItemId | null = null;

/**
 * 设置面板挂在 body 下的独立宿主，不随 render() 重建：
 * 战斗中敌人行动/回合计时都会触发 render，若面板在 root 内，拖动滑条会被重建打断。
 */
export let settingsHost: HTMLElement | null = null;

export let sfxPreviewAt = 0;

export let settingsBgmPoll: ReturnType<typeof setInterval> | null = null;

export let settingsSeekDragging = false;

/** 胜/负短句去重：同一结算屏不因重渲反复播。现行短句已停用。 */

export let lastBgmScene: "battle" | "lounge" | null = null;

export const S = {
  get root() { return root; },
  get phase() { return phase; }, set phase(v: typeof phase) { phase = v; },
  get draft() { return draft; }, set draft(v: typeof draft) { draft = v; },
  get battle() { return battle; }, set battle(v: typeof battle) { battle = v; },
  get telemetry() { return telemetry; }, set telemetry(v: typeof telemetry) { telemetry = v; },
  get hoverUid() { return hoverUid; }, set hoverUid(v: typeof hoverUid) { hoverUid = v; },
  get hoverIntentIdx() { return hoverIntentIdx; }, set hoverIntentIdx(v: typeof hoverIntentIdx) { hoverIntentIdx = v; },
  get paused() { return paused; }, set paused(v: typeof paused) { paused = v; },
  get turnStartedAt() { return turnStartedAt; }, set turnStartedAt(v: typeof turnStartedAt) { turnStartedAt = v; },
  get turnTimer() { return turnTimer; }, set turnTimer(v: typeof turnTimer) { turnTimer = v; },
  get selectedDeckIdx() { return selectedDeckIdx; }, set selectedDeckIdx(v: typeof selectedDeckIdx) { selectedDeckIdx = v; },
  get flyInDeckIdx() { return flyInDeckIdx; }, set flyInDeckIdx(v: typeof flyInDeckIdx) { flyInDeckIdx = v; },
  get showBlockedCards() { return showBlockedCards; }, set showBlockedCards(v: typeof showBlockedCards) { showBlockedCards = v; },
  get pickFocus() { return pickFocus; }, set pickFocus(v: typeof pickFocus) { pickFocus = v; },
  get focusMate() { return focusMate; }, set focusMate(v: typeof focusMate) { focusMate = v; },
  get wikiOpen() { return wikiOpen; }, set wikiOpen(v: typeof wikiOpen) { wikiOpen = v; },
  get wikiPage() { return wikiPage; }, set wikiPage(v: typeof wikiPage) { wikiPage = v; },
  get wikiQuery() { return wikiQuery; }, set wikiQuery(v: typeof wikiQuery) { wikiQuery = v; },
  get guideOpen() { return guideOpen; }, set guideOpen(v: typeof guideOpen) { guideOpen = v; },
  get devPanelOpen() { return devPanelOpen; }, set devPanelOpen(v: typeof devPanelOpen) { devPanelOpen = v; },
  get audioPrevBattle() { return audioPrevBattle; }, set audioPrevBattle(v: typeof audioPrevBattle) { audioPrevBattle = v; },
  get labFullscreen() { return labFullscreen; }, set labFullscreen(v: typeof labFullscreen) { labFullscreen = v; },
  get autoLoadoutId() { return autoLoadoutId; }, set autoLoadoutId(v: typeof autoLoadoutId) { autoLoadoutId = v; },
  get autoWeaponGrade() { return autoWeaponGrade; }, set autoWeaponGrade(v: typeof autoWeaponGrade) { autoWeaponGrade = v; },
  get autoTechDepth() { return autoTechDepth; }, set autoTechDepth(v: typeof autoTechDepth) { autoTechDepth = v; },
  get weaponOpen() { return weaponOpen; }, set weaponOpen(v: typeof weaponOpen) { weaponOpen = v; },
  get gauntletRun() { return gauntletRun; }, set gauntletRun(v: typeof gauntletRun) { gauntletRun = v; },
  get gauntletScreen() { return gauntletScreen; }, set gauntletScreen(v: typeof gauntletScreen) { gauntletScreen = v; },
  get breakDemoRun() { return breakDemoRun; }, set breakDemoRun(v: typeof breakDemoRun) { breakDemoRun = v; },
  get demoScreen() { return demoScreen; }, set demoScreen(v: typeof demoScreen) { demoScreen = v; },
  get demoMarketBought() { return demoMarketBought; }, set demoMarketBought(v: typeof demoMarketBought) { demoMarketBought = v; },
  get hallRun() { return hallRun; }, set hallRun(v: typeof hallRun) { hallRun = v; },
  get hallScreen() { return hallScreen; }, set hallScreen(v: typeof hallScreen) { hallScreen = v; },
  get campaignRun() { return campaignRun; }, set campaignRun(v: typeof campaignRun) { campaignRun = v; },
  get qiFight() { return qiFight; }, set qiFight(v: typeof qiFight) { qiFight = v; },
  get campaignScreen() { return campaignScreen; }, set campaignScreen(v: typeof campaignScreen) { campaignScreen = v; },
  get campaignChapterDone() { return campaignChapterDone; }, set campaignChapterDone(v: typeof campaignChapterDone) { campaignChapterDone = v; },
  get foePlaybackBusy() { return foePlaybackBusy; }, set foePlaybackBusy(v: typeof foePlaybackBusy) { foePlaybackBusy = v; },
  get foePlaybackTimer() { return foePlaybackTimer; }, set foePlaybackTimer(v: typeof foePlaybackTimer) { foePlaybackTimer = v; },
  get fxClearTimer() { return fxClearTimer; }, set fxClearTimer(v: typeof fxClearTimer) { fxClearTimer = v; },
  get foePlaybackIntents() { return foePlaybackIntents; }, set foePlaybackIntents(v: typeof foePlaybackIntents) { foePlaybackIntents = v; },
  get FX_HOLD_MS() { return FX_HOLD_MS; },
  get foeSegAnim() { return foeSegAnim; }, set foeSegAnim(v: typeof foeSegAnim) { foeSegAnim = v; },
  get foePlaybackSegIdx() { return foePlaybackSegIdx; }, set foePlaybackSegIdx(v: typeof foePlaybackSegIdx) { foePlaybackSegIdx = v; },
  get foeFirstHoldTimer() { return foeFirstHoldTimer; }, set foeFirstHoldTimer(v: typeof foeFirstHoldTimer) { foeFirstHoldTimer = v; },
  get playbackShow() { return playbackShow; }, set playbackShow(v: typeof playbackShow) { playbackShow = v; },
  get playbackSegFate() { return playbackSegFate; }, set playbackSegFate(v: typeof playbackSegFate) { playbackSegFate = v; },
  get youPlayAnim() { return youPlayAnim; }, set youPlayAnim(v: typeof youPlayAnim) { youPlayAnim = v; },
  get youPlayAnimTimer() { return youPlayAnimTimer; }, set youPlayAnimTimer(v: typeof youPlayAnimTimer) { youPlayAnimTimer = v; },
  get fxPaintSig() { return fxPaintSig; }, set fxPaintSig(v: typeof fxPaintSig) { fxPaintSig = v; },
  get pendingWin() { return pendingWin; }, set pendingWin(v: typeof pendingWin) { pendingWin = v; },
  get routeBookOpen() { return routeBookOpen; }, set routeBookOpen(v: typeof routeBookOpen) { routeBookOpen = v; },
  get hallCab() { return hallCab; }, set hallCab(v: typeof hallCab) { hallCab = v; },
  get hallFocus() { return hallFocus; }, set hallFocus(v: typeof hallFocus) { hallFocus = v; },
  get battleSheet() { return battleSheet; }, set battleSheet(v: typeof battleSheet) { battleSheet = v; },
  get gauntletRewards() { return gauntletRewards; }, set gauntletRewards(v: typeof gauntletRewards) { gauntletRewards = v; },
  get gauntletRewardsAreSuper() { return gauntletRewardsAreSuper; }, set gauntletRewardsAreSuper(v: typeof gauntletRewardsAreSuper) { gauntletRewardsAreSuper = v; },
  get gauntletRewardTakes() { return gauntletRewardTakes; }, set gauntletRewardTakes(v: typeof gauntletRewardTakes) { gauntletRewardTakes = v; },
  get gauntletCompanions() { return gauntletCompanions; }, set gauntletCompanions(v: typeof gauntletCompanions) { gauntletCompanions = v; },
  get gauntletBossRotation() { return gauntletBossRotation; }, set gauntletBossRotation(v: typeof gauntletBossRotation) { gauntletBossRotation = v; },
  get gauntletPath() { return gauntletPath; }, set gauntletPath(v: typeof gauntletPath) { gauntletPath = v; },
  get gauntletWantEndless() { return gauntletWantEndless; }, set gauntletWantEndless(v: typeof gauntletWantEndless) { gauntletWantEndless = v; },
  get wagerKind() { return wagerKind; }, set wagerKind(v: typeof wagerKind) { wagerKind = v; },
  get wagerStake() { return wagerStake; }, set wagerStake(v: typeof wagerStake) { wagerStake = v; },
  get wagerOffersCache() { return wagerOffersCache; }, set wagerOffersCache(v: typeof wagerOffersCache) { wagerOffersCache = v; },
  get gauntletMarket() { return gauntletMarket; }, set gauntletMarket(v: typeof gauntletMarket) { gauntletMarket = v; },
  get gauntletMarketBought() { return gauntletMarketBought; }, set gauntletMarketBought(v: typeof gauntletMarketBought) { gauntletMarketBought = v; },
  get gauntletMarketRefreshN() { return gauntletMarketRefreshN; }, set gauntletMarketRefreshN(v: typeof gauntletMarketRefreshN) { gauntletMarketRefreshN = v; },
  get loadoutFocusMate() { return loadoutFocusMate; }, set loadoutFocusMate(v: typeof loadoutFocusMate) { loadoutFocusMate = v; },
  get loadoutPage() { return loadoutPage; }, set loadoutPage(v: typeof loadoutPage) { loadoutPage = v; },
  get loadoutPick() { return loadoutPick; }, set loadoutPick(v: typeof loadoutPick) { loadoutPick = v; },
  get gauntletEndedByLoss() { return gauntletEndedByLoss; }, set gauntletEndedByLoss(v: typeof gauntletEndedByLoss) { gauntletEndedByLoss = v; },
  get gauntletResultNote() { return gauntletResultNote; }, set gauntletResultNote(v: typeof gauntletResultNote) { gauntletResultNote = v; },
  get gauntletError() { return gauntletError; }, set gauntletError(v: typeof gauntletError) { gauntletError = v; },
  get pendingReward() { return pendingReward; }, set pendingReward(v: typeof pendingReward) { pendingReward = v; },
  get gauntletEventKind() { return gauntletEventKind; }, set gauntletEventKind(v: typeof gauntletEventKind) { gauntletEventKind = v; },
  get gauntletEventChoices() { return gauntletEventChoices; }, set gauntletEventChoices(v: typeof gauntletEventChoices) { gauntletEventChoices = v; },
  get discardMode() { return discardMode; }, set discardMode(v: typeof discardMode) { discardMode = v; },
  get cycleMode() { return cycleMode; }, set cycleMode(v: typeof cycleMode) { cycleMode = v; },
  get summonPending() { return summonPending; }, set summonPending(v: typeof summonPending) { summonPending = v; },
  get settingsHost() { return settingsHost; }, set settingsHost(v: typeof settingsHost) { settingsHost = v; },
  get sfxPreviewAt() { return sfxPreviewAt; }, set sfxPreviewAt(v: typeof sfxPreviewAt) { sfxPreviewAt = v; },
  get settingsBgmPoll() { return settingsBgmPoll; }, set settingsBgmPoll(v: typeof settingsBgmPoll) { settingsBgmPoll = v; },
  get settingsSeekDragging() { return settingsSeekDragging; }, set settingsSeekDragging(v: typeof settingsSeekDragging) { settingsSeekDragging = v; },
  get lastBgmScene() { return lastBgmScene; }, set lastBgmScene(v: typeof lastBgmScene) { lastBgmScene = v; },
};
