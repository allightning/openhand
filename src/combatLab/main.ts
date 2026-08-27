import { CARDS, ENEMIES, intentLabel } from "../game/content";
import {
  applyLabFightScale,
  endTurn,
  labCanDiscard,
  labDiscardCard,
  labDiscardsLeft,
  legalSummonCells,
  livingFoes,
  playCard,
  previewCard,
} from "../game/sim";
import { getLabTuning, isLabV2, setLabMode, setLabTuning } from "../game/labTuning";
import { computeResonance, labCanUseItem, useLabItem } from "../game/labV21";
import { isSummonItem } from "../game/labSummon";
import { canUseSignature, signatureDef, useSignature } from "../game/labSignature";
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
import { renderGauntletDevPanel, bindGauntletDevPanel, renderDevPanelModal } from "./devPanel";
import { renderGuideSheet } from "./guide";
import { renderWikiNavButtons, renderWikiSheet, wikiPageCount, type WikiBook } from "./encyclopedia";
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
import { battleEquippedSchool } from "../game/equippedWeapon";
import { isBossEnemy } from "../game/labEnemyStress";
import {
  afterGauntletLoss,
  afterGauntletWin,
  applyStageTuning,
  basePot,
  buildGauntletPreset,
  createGauntletRun,
  enterGauntletTuning,
  exitGauntletTuning,
  applyCompanion,
  applyGauntletReward,
  applySuperReward,
  resolveWager,
  rollCompanionChoices,
  rollSuperRewards,
  GAUNTLET_MAX_STAGE,
  ladderEntryForRun,
  nextBossId,
  rollGauntletRewards,
  saveGauntletBest,
  buyMarketOffer,
  marketOffers,
  applyBankerBoost,
  applyLifeline,
  reviveGauntletRun,
  canOfferLifeline,
  reviveCost,
  wagerOffers,
  wagerStakeMax,
  type GauntletMarketOffer,
  type GauntletRewardOption,
  type GauntletRun,
  type GauntletScreen,
  type WagerKind,
  type WagerOffer,
} from "./gauntlet";
import { isCompanionMilestone, type GauntletPath } from "./gauntletPaths";
import {
  renderGauntletBadge,
  renderGauntletCompanionPick,
  renderGauntletBanker,
  renderGauntletLifeline,
  renderGauntletHome,
  renderGauntletOverlay,
  renderGauntletResult,
  renderGauntletRewardPick,
  renderGauntletRewardTarget,
  renderGauntletPathPick,
  renderGauntletSchoolPick,
  renderGauntletWager,
} from "./gauntletUi";
import type { WeaponId } from "../game/types";
import "../style.css";
import "./lab.css";
import "./gauntlet.css";

const root = document.getElementById("app")!;

function actionTipWrap(btnHtml: string, tip: string): string {
  return `<span class="lab-action-tip-wrap">${btnHtml}<span class="status-tip">${escapeHtml(tip)}</span></span>`;
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
let labFullscreen = false;
let autoLoadoutId = "t1-four-palm";
let autoWeaponGrade: AutoWeaponGrade = 3;
let autoTechDepth: AutoTechDepth = 1;
let weaponOpen: string | null = null;
let gauntletRun: GauntletRun | null = null;
let gauntletScreen: GauntletScreen | null = null;
let gauntletRewards: GauntletRewardOption[] = [];
let gauntletRewardsAreSuper = false;
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
/** 结算屏是否挂着「赎身」分支——只有输馆能赎，见好就收不能。 */
let gauntletEndedByLoss = false;
let gauntletResultNote = "";
/** 选系/开踢失败时在屏上显示，避免静默无反应 */
let gauntletError = "";
/** §31.18 外功/心法待指定受益角色 */
let pendingReward: GauntletRewardOption | null = null;

/** 奖励屏三路（普通/超级/选完同道）都要支黑市摊，集中一处免得漏。 */
function rollGauntletMarket(): void {
  gauntletMarket = gauntletRun ? marketOffers(gauntletRun) : [];
  gauntletMarketBought = new Set();
}
let discardMode = false;
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
  return parts.join("");
}

function renderHeader(): string {
  const fsLabel = labFullscreen ? "退出全屏" : "全屏";
  const inGauntlet = gauntletRun != null;
  const backBtn =
    phase === "battle" && inGauntlet
      ? `<button type="button" class="lab-btn" id="gauntlet-exit-battle">退出踢馆</button>`
      : phase !== "setup" && !inGauntlet
        ? `<button type="button" class="lab-btn" id="lab-back-setup">回装配</button>`
        : "";
  return `
    <header class="lab-header ${phase === "battle" ? "lab-header-battle" : ""}">
      <div class="lab-title-block">
        <h1>连胜踢馆</h1>
        <p class="lab-sub">拆就是打 · 敢押敢赢 · 战斗线专测 · <span class="lab-build-tag">build path-v1</span></p>
      </div>
      <div class="lab-actions">
        <button type="button" class="lab-btn lab-guide-btn" id="lab-guide-open">攻略</button>
        <button type="button" class="lab-btn" id="lab-dev-open">实验台</button>
        <div class="lab-wiki-nav">${renderWikiNavButtons()}</div>
        <button type="button" class="lab-btn" id="lab-fullscreen">${fsLabel}</button>
        ${backBtn}
      </div>
    </header>`;
}

function renderSetup(): string {
  syncDraft();
  if (gauntletScreen === "path") {
    return `${renderHeader()}${renderGauntletOverlay("path", renderGauntletPathPick())}`;
  }
  if (gauntletScreen === "pick") {
    return `${renderHeader()}${renderGauntletOverlay("pick", renderGauntletSchoolPick(gauntletPath ?? "bandit", gauntletError))}`;
  }
  if (gauntletScreen === "companion" && gauntletRun) {
    return `${renderHeader()}${renderGauntletOverlay("companion", renderGauntletCompanionPick(gauntletRun, gauntletCompanions))}`;
  }
  if (gauntletScreen === "reward" && gauntletRun) {
    return `${renderHeader()}${renderGauntletOverlay("reward", renderGauntletRewardPick(gauntletRun, gauntletRewards, gauntletMarket, gauntletMarketBought))}`;
  }
  if (gauntletScreen === "banker" && gauntletRun) {
    return `${renderHeader()}${renderGauntletOverlay("banker", renderGauntletBanker())}`;
  }
  if (gauntletScreen === "lifeline" && gauntletRun) {
    return `${renderHeader()}${renderGauntletOverlay("lifeline", renderGauntletLifeline(gauntletRun))}`;
  }
  if (gauntletScreen === "wager" && gauntletRun) {
    return `${renderHeader()}${renderGauntletOverlay("wager", renderGauntletWager(gauntletRun, wagerOffersCache, wagerKind, wagerStake))}`;
  }
  if (gauntletScreen === "rewardTarget" && gauntletRun && pendingReward) {
    const members = gauntletRun.companion
      ? [GAUNTLET_SCHOOL_LOADOUT[gauntletRun.school].fieldMate, gauntletRun.companion]
      : [GAUNTLET_SCHOOL_LOADOUT[gauntletRun.school].fieldMate];
    return `${renderHeader()}${renderGauntletOverlay("rewardTarget", renderGauntletRewardTarget(gauntletRun, pendingReward.title, members))}`;
  }
  if (gauntletScreen === "result" && gauntletRun) {
    const elapsed = Math.max(0, Math.round((Date.now() - gauntletRun.startedAt) / 1000));
    const note =
      gauntletResultNote ||
      (gauntletRun.bankruptUsed ? "本局已用过赊账" : gauntletRun.pot < reviveCost(gauntletRun.stage) ? "彩金不足破产线" : "");
    return `${renderHeader()}${renderGauntletOverlay("result", renderGauntletResult(gauntletRun, elapsed, note))}`;
  }
  return `${renderHeader()}${renderGauntletHome(renderGauntletDevPanel())}`;
}

function renderSliders(enabled: boolean): string {
  const t = getLabTuning();
  const dis = enabled ? "" : "disabled";
  return `
    <div class="lab-slider-row"><label><span>伤害系数</span><span id="val-dmg">${t.dmgCoef.toFixed(2)}</span></label>
      <input type="range" id="sl-dmg" min="0.25" max="2" step="0.05" value="${t.dmgCoef}" ${dis}/></div>
    <div class="lab-slider-row"><label><span>破招窗口</span><span id="val-break">${t.breakWindow}</span></label>
      <input type="range" id="sl-break" min="0" max="100" step="5" value="${t.breakWindow}" ${dis}/></div>
    <div class="lab-slider-row"><label><span>先机偏置</span><span id="val-pace">${t.paceBias}</span></label>
      <input type="range" id="sl-pace" min="-3" max="5" step="1" value="${t.paceBias}" ${dis}/></div>
    <div class="lab-slider-row"><label><span>AI读招激进度</span><span id="val-ai">${t.aiAggression}</span></label>
      <input type="range" id="sl-ai" min="0" max="100" step="5" value="${t.aiAggression}" ${dis}/></div>
    <div class="lab-slider-row"><label><span>单回合时限(秒)</span><span id="val-limit">${t.turnLimitSec}</span></label>
      <input type="range" id="sl-limit" min="0" max="120" step="5" value="${t.turnLimitSec}" ${dis}/></div>
    <div class="lab-slider-row"><label><span>牌堆乘数</span><span id="val-deck-mult-pause">${t.deckMultiplier}</span></label>
      <input type="range" id="sl-deck-mult-pause" min="1" max="10" step="1" value="${t.deckMultiplier}" ${dis}/></div>
    <div class="lab-slider-row"><label><span>敌 HP 倍率</span><span id="val-enemy-hp">${t.enemyHpMul.toFixed(2)}</span></label>
      <input type="range" id="sl-enemy-hp" min="1" max="2.5" step="0.05" value="${t.enemyHpMul}" ${dis}/></div>
    <div class="lab-slider-row"><label><span>敌段加成</span><span id="val-enemy-seg">${t.enemySegBonus}</span></label>
      <input type="range" id="sl-enemy-seg" min="0" max="3" step="1" value="${t.enemySegBonus}" ${dis}/></div>
    <div class="lab-slider-row"><label><span>应激上限</span><span id="val-enemy-stress">${t.enemyStressCap}</span></label>
      <input type="range" id="sl-enemy-stress" min="0" max="5" step="1" value="${t.enemyStressCap}" ${dis}/></div>
    <div class="lab-v2-toggles">
      <label class="lab-check"><input type="checkbox" id="tog-v2" ${t.rulesV2 ? "checked" : ""} ${dis}/><span>v2 规则</span></label>
      <label class="lab-check"><input type="checkbox" id="tog-fx" ${t.v2Fx ? "checked" : ""} ${dis}/><span>演出</span></label>
      <label class="lab-check"><input type="checkbox" id="tog-variant" ${t.v2VariantAi ? "checked" : ""} ${dis}/><span>变招</span></label>
      <label class="lab-check"><input type="checkbox" id="tog-grudge" ${t.v2Grudge ? "checked" : ""} ${dis}/><span>鏖战</span></label>
      <label class="lab-check"><input type="checkbox" id="tog-combo" ${t.rulesCombo ? "checked" : ""} ${dis}/><span>组合技 §16</span></label>
    </div>`;
}

function render(): void {
  setLabMode(phase === "battle" || gauntletRun != null);
  document.documentElement.classList.toggle("lab-fullscreen", labFullscreen);
  root.classList.toggle("lab-fullscreen", labFullscreen);
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

function beginGauntletBattle(): void {
  if (!gauntletRun) return;
  const entry = ladderEntryForRun(gauntletRun);
  // §31.13 下注落锤：开擂前把选中的注写进 run，收馆结算
  const offer = wagerKind ? wagerOffersCache.find((o) => o.kind === wagerKind) : null;
  const stake = wagerStake ?? 0;
  gauntletRun = {
    ...gauntletRun,
    wager: offer && stake > 0 ? { kind: offer.kind, stake, target: offer.target, odds: offer.odds } : null,
  };
  wagerKind = null;
  wagerStake = null;
  applyStageTuning(entry);
  // §31.9 伙伴入伙后组合技/光环开启；仙药劲力上限随 run 走
  setLabTuning({
    rulesCombo: Boolean(gauntletRun.companion || gauntletRun.lifelineCompanion),
    playerEnergyBonus: gauntletRun.bonusEnergyMax ?? 0,
    playerDmgMul: gauntletRun.statBoostMul ?? 1,
  });
  const preset = buildGauntletPreset(gauntletRun);
  draft = preset;
  setLabMode(true);
  battle = startLabBattle(preset, false, 1);
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
  const breaks = battle.v2BreakCount ?? 0;
  // §31.13 赌注结算（赢馆才谈得上注赢；输馆注必飞）
  const stats = {
    breaks,
    turns: battle.turn,
    hpEndRatio: battle.player.maxHp > 0 ? battle.player.hp / battle.player.maxHp : 0,
    won: outcome === "win",
    eyes: battle.v2EyeCount ?? 0,
    itemsUsed: (battle.v2ItemUses ?? 0) > 0,
  };
  const texts: string[] = [];
  let pot = gauntletRun.pot;
  if (gauntletRun.wager) {
    const r = resolveWager(gauntletRun, stats);
    pot = Math.max(0, pot + r.payout);
    texts.push(r.text);
  }
  if (outcome === "win") {
    const foughtStage = gauntletRun.stage;
    const base = basePot(foughtStage);
    pot += base;
    texts.push(`底彩 +${base}`);
    const enemyFought = draft.enemyId;
    gauntletRun = {
      ...afterGauntletWin({ ...gauntletRun, pot }, breaks, battle.player.hp, battle.player.maxHp, enemyFought),
      wager: null,
      lastPotText: texts.filter(Boolean).join(" · "),
    };
    battle = null;
    phase = "setup";
    // 伙伴入伙：第 4/7/12 关后三选一（高一层奖励）
    if (isCompanionMilestone(foughtStage) && !gauntletRun.companion) {
      gauntletCompanions = rollCompanionChoices(gauntletRun);
      gauntletScreen = "companion";
      render();
      return;
    }
    if (foughtStage === 6 || foughtStage === GAUNTLET_MAX_STAGE) {
      gauntletRewards = rollSuperRewards(gauntletRun);
      gauntletRewardsAreSuper = true;
      rollGauntletMarket();
      gauntletScreen = "reward";
      render();
      return;
    }
    gauntletRewards = rollGauntletRewards(gauntletRun);
    gauntletRewardsAreSuper = false;
    rollGauntletMarket();
    gauntletScreen = "reward";
    render();
    return;
  }
  gauntletRun = { ...afterGauntletLoss({ ...gauntletRun, pot }, breaks), wager: null, lastPotText: texts.filter(Boolean).join(" · ") };
  battle = null;
  phase = "setup";
  if (canOfferLifeline(gauntletRun)) {
    gauntletScreen = "lifeline";
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
  const inGauntlet = gauntletRun != null;
  const prev = hoverUid ? previewCard(b, hoverUid) : null;
  const swapCost = labSwapCost();
  // §31.9 踢馆单人无后场；第 4 馆伙伴入伙后换人照常可用
  const partyMode = !inGauntlet || Boolean(gauntletRun?.companion || gauntletRun?.lifelineCompanion);
  const swaps = !partyMode
    ? ""
    : b.bench
        .map((m) => {
          const gate = labCanSwap(b, m.id);
          const def = MATES[m.id];
          const school = battleEquippedSchool(b, m.id);
          const tip = gate.ok
            ? isLabV2()
              ? `换人·${def.name} · ${WEAPON_NAME[school]} · 先机 ${WEAPON_PACE[school]} · HP ${m.hp} · 耗 ${swapCost} 劲 · 登场势`
              : `换人·${def.name} · 耗 ${swapCost} 劲 · 落后一回合`
            : gate.reason ?? "不可换人";
          return `<button type="button" class="swap-btn lab-swap-btn" data-swap="${m.id}" ${gate.ok ? "" : "disabled"}><b>换人·${def.name}</b><small>${WEAPON_NAME[school]} · 先机 ${WEAPON_PACE[school]} · ${m.hp}</small><span class="status-tip">${escapeHtml(tip)}</span></button>`;
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
            return `<button type="button" class="assist-btn lab-assist-btn" data-assist="${m.id}" ${gate.ok ? "" : "disabled"}>${comboMark}<b>助战·${def.name}</b><small>耗 ${assistCost} 劲 · ${m.hp}</small><span class="status-tip">${escapeHtml(tip)}</span></button>`;
          })
          .join("")
      : "";
  const assistBadge =
    !inGauntlet && !isLabV2() && b.labAssistActive && isComboRulesEnabled()
      ? (() => {
          const id = b.labAssistActive!;
          const segs = Math.max(1, (b.intents?.length ?? 1) - (b.v2ResolveIntentIdx ?? 0));
          const tip = `助战中：${MATES[id].name} · 敌段余 ${segs}`;
          return `<span class="lab-assist-active-badge">助战中：${MATES[id].name} · 剩${segs}段<span class="status-tip">${escapeHtml(tip)}</span></span>`;
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
          return `<span class="lab-aura-chip">${escapeHtml(WEAPON_NAME[s.school])} ${s.count}/${target} · ${s.tierName}已激活${escapeHtml(next)}<span class="status-tip">${escapeHtml(tip)}</span></span>`;
        })
        .join("");
  const flower =
    !inGauntlet && res.hundredFlowers
      ? `<span class="lab-aura-chip lab-aura-flowers">百花齐放<span class="status-tip">四系各异 · 先机+1 · 助战耗劲-1 · 首张组合卡-1劲</span></span>`
      : "";
  const sig = signatureDef(b.active);
  const sigGate = canUseSignature(b);
  const sigBtn = isLabV2()
    ? actionTipWrap(
        `<button type="button" class="fy-btn lab-sig-btn" id="lab-signature" ${sigGate.ok ? "" : "disabled"}>${escapeHtml(sig.name)}</button>`,
        sigGate.ok ? sig.text : (sigGate.reason ?? "不可用"),
      )
    : "";
  const itemBtns = (b.labItems ?? [])
    .map((id) => {
      const gate = labCanUseItem(b, id);
      const tip = gate.ok ? (LAB_ITEM_TIP[id] ?? LAB_ITEM_LABEL[id] ?? id) : (gate.reason ?? "不可用");
      return actionTipWrap(
        `<button type="button" class="fy-btn lab-item-btn" data-item="${id}" ${gate.ok ? "" : "disabled"}>${escapeHtml(LAB_ITEM_LABEL[id] ?? id)}</button>`,
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
  // §31.10 弃牌：每回合上限 floor(回合开始手牌/2)，弃 1 摸 1
  const discLeft = labDiscardsLeft(b);
  const discardBtn = isLabV2()
    ? actionTipWrap(
        `<button type="button" class="fy-btn lab-discard-toggle ${discardMode ? "on" : ""}" id="btn-discard" ${b.phase === "player" && discLeft > 0 ? "" : "disabled"}>弃牌 ${discLeft}</button>`,
        `弃牌模式：点后点手牌，弃 1 摸 1。本回合还可弃 ${discLeft} 张（上限 = 回合开始手牌数一半，向下取整）。`,
      )
    : "";
  const actionRowHtml = inGauntlet
    ? `
    ${partyMode ? `<span class="lab-action-group lab-action-swap">${swaps || `<span class="lab-action-muted">无后场</span>`}</span>` : ""}
    ${partyMode && assists ? `<span class="lab-action-group lab-action-assist">${assists}</span>` : ""}
    ${partyMode ? assistBadge : ""}
    ${itemRow}
    <span class="lab-action-group lab-action-end">
      ${discardBtn}
      ${actionTipWrap(`<button class="endturn fy-btn" id="btn-end" ${b.phase === "player" ? "" : "disabled"}>收势</button>`, "结束本回合：敌按意图行动，然后抽牌。")}
      ${abortBtn}
    </span>`
    : `
    <span class="lab-action-group lab-action-swap">${swaps || `<span class="lab-action-muted">无后场</span>`}</span>
    ${assists ? `<span class="lab-action-group lab-action-assist">${assists}</span>` : ""}
    ${assistBadge}
    ${auraBlock}
    ${itemRow}
    <span class="lab-action-group lab-action-end">
      ${discardBtn}
      ${actionTipWrap(`<button class="endturn fy-btn" id="btn-end" ${b.phase === "player" ? "" : "disabled"}>收势</button>`, "结束本回合：敌按意图行动，然后抽牌。")}
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
  return `${renderHeader()}${renderProdBattle({
    b,
    prev,
    hoverUid,
    hoverIntentIdx,
    weaponId: primaryWeapon(draft),
    canPlay: (uid) => labCanPlay(b, uid),
    discardMode,
    summonPickCells,
    actionRowHtml,
    entranceNote,
    freshNote,
    fxClass: battleFxClasses(b),
    pauseOverlay: pausePanel,
    toolbarExtra: gauntletRun ? renderGauntletBadge(gauntletRun) : "",
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
    render();
  });
  root.querySelector("#lab-dev-open")?.addEventListener("click", () => {
    devPanelOpen = true;
    guideOpen = false;
    render();
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
    gauntletScreen = "path";
    render();
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
    if (gauntletRun && battle) {
      // §31.13 中途退场 = 输馆：注飞、底彩无
      const breaks = battle.v2BreakCount ?? 0;
      let pot = gauntletRun.pot;
      const texts: string[] = [];
      if (gauntletRun.wager) {
        const r = resolveWager(gauntletRun, {
          breaks,
          turns: battle.turn,
          hpEndRatio: 0,
          won: false,
          eyes: battle.v2EyeCount ?? 0,
          itemsUsed: (battle.v2ItemUses ?? 0) > 0,
        });
        pot = Math.max(0, pot + r.payout);
        texts.push(r.text);
      }
      gauntletRun = { ...afterGauntletLoss({ ...gauntletRun, pot }, breaks), wager: null, lastPotText: texts.filter(Boolean).join(" · ") };
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
      if (!gauntletRewardsAreSuper && (opt.kind === "tech" || opt.kind === "mind")) {
        pendingReward = opt;
        gauntletScreen = "rewardTarget";
        render();
        return;
      }
      gauntletRun = gauntletRewardsAreSuper ? applySuperReward(gauntletRun, opt) : applyGauntletReward(gauntletRun, opt);
      gauntletRewards = [];
      gauntletRewardsAreSuper = false;
      wagerKind = null;
      wagerStake = null;
      wagerOffersCache = wagerOffers(gauntletRun);
      gauntletScreen = "wager";
      render();
    });
  }
  for (const el of root.querySelectorAll<HTMLButtonElement>("[data-target-mate]")) {
    el.addEventListener("click", () => {
      if (!gauntletRun || !pendingReward) return;
      const mateId = el.dataset.targetMate as CompanionId;
      gauntletRun = applyGauntletReward(gauntletRun, { ...pendingReward, targetMate: mateId });
      pendingReward = null;
      gauntletRewards = [];
      wagerKind = null;
      wagerStake = null;
      wagerOffersCache = wagerOffers(gauntletRun);
      gauntletScreen = "wager";
      render();
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
      const val = raw === "all" ? gauntletRun.pot : Number(raw);
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
      wagerStake = Math.min(v, wagerStakeMax(gauntletRun.pot));
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
    if (!gauntletRun || !wagerKind || !wagerStake) return;
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
      const next = buyMarketOffer(gauntletRun, offer);
      if (!next) return;
      gauntletRun = next;
      gauntletMarketBought = new Set(gauntletMarketBought).add(id);
      render();
    });
  }
  bindGauntletDevPanel(root, () => render());
  for (const el of root.querySelectorAll<HTMLButtonElement>("[data-banker-mult]")) {
    el.addEventListener("click", () => {
      if (!gauntletRun) return;
      const mult = Number(el.dataset.bankerMult) as 2 | 3;
      gauntletRun = applyBankerBoost(gauntletRun, mult);
      wagerOffersCache = wagerOffers(gauntletRun);
      gauntletScreen = "wager";
      render();
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
      wagerKind = null;
      wagerStake = null;
      wagerOffersCache = wagerOffers(gauntletRun);
      gauntletScreen = "wager";
      render();
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
      rollGauntletMarket();
      gauntletScreen = "reward";
      render();
    });
  }
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
    });
    el.addEventListener("mouseleave", () => {
      hoverUid = null;
    });
    el.addEventListener("click", () => {
      if (!battle || battle.phase !== "player" || paused) return;
      const uid = el.dataset.uid!;
      // §31.10 弃牌模式：点手牌 = 弃掉摸 1，不出牌
      if (discardMode) {
        const dGate = labCanDiscard(battle);
        if (!dGate.ok) return;
        battle = labDiscardCard(battle, uid);
        if (labDiscardsLeft(battle) <= 0) discardMode = false;
        render();
        return;
      }
      const gate = labCanPlay(battle, uid);
      if (!gate.ok) return;
      const card = battle.hand.find((c) => c.uid === uid);
      const ms = Math.round(performance.now() - turnStartedAt);
      const before = battle;
      const after = playCard(battle, uid);
      const matched = previewMatchesPlay(before, uid, after);
      battle = after;
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
  for (const el of root.querySelectorAll<HTMLButtonElement>("[data-swap]")) {
    el.addEventListener("click", () => {
      if (!battle) return;
      battle = labSwapFighter(battle, el.dataset.swap as CompanionId);
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
    render();
  });
  root.querySelector("#btn-end")?.addEventListener("click", () => {
    if (!battle || battle.phase !== "player" || paused) return;
    discardMode = false;
    const ms = Math.round(performance.now() - turnStartedAt);
    if (telemetry) telemetry = recordPlayerTurn(telemetry, battle, "收势", ms, true);
    battle = endTurn(battle);
    if (telemetry) telemetry = recordFoeTurn(telemetry, battle, intentLabel(battle.intent));
    if (battle.player.hp <= 0) {
      endBattle("loss");
      return;
    }
    if (battle.enemy.hp <= 0) {
      endBattle("win");
      return;
    }
    resetTurnTimer();
    render();
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
  if (phase === "battle" || phase === "setup") bindLabTooltips(root);
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
});
render();
