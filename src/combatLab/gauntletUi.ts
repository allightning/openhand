import { CARDS, ENEMIES } from "../game/content";
import { tierFx } from "../game/labResonance";
import { MATES, ROLE_LABEL, WEAPON_NAME } from "../game/party";
import { gearById } from "../game/weapons";
import type { CompanionId } from "../game/types";
import { escapeAttr, escapeHtml } from "./setupUi";
import {
  GAUNTLET_SCHOOL_LOADOUT,
  GAUNTLET_SCHOOLS,
  GAUNTLET_TIER_LABEL,
  GAUNTLET_START_POT,
  LIFELINE_DEFS,
  isGauntletEndless,
  wagerStakeMax,
  basePot,
  ladderEntryForRun,
  loadGauntletBest,
  starterTip,
  wagerLabel,
  reviveCost,
  peakPotAnchor,
  gauntletRewardTakeCount,
  marketBuyCap,
  marketRefreshCost,
  sellPriceFor,
  gauntletFieldMate,
  runCompanions,
  intelReport,
  type GauntletMarketOffer,
  type GauntletRewardOption,
  type GauntletRun,
  type LifelineKind,
  type WagerKind,
  type WagerOffer,
  type GauntletLadderEntry,
} from "./gauntlet";
import { GAUNTLET_PATH_BLURB, GAUNTLET_PATH_LABEL, getGauntletFinalStage, type GauntletPath } from "./gauntletPaths";
import { isBreakAlign } from "./labRuleset";
import { isBreakDemoDone, isRookieDemoDone } from "./breakDemo";
import { breakStarterDeck, rogueLeadId, rogueMate } from "./rogueRoster";
import { campBattleCardHtml, companionPortraitHtml, companionSkillLine } from "./rewardArt";
import { campPlaceName } from "./sceneBg";
import { FINALE_CHOICES, encounterEffectLine, encounterOutcomeTag, eventLead, finaleEffectLine, type EncounterChoice, type EncounterKind } from "./encounter";
import { canStartBattle, deckBounds, fieldDeck, mateDeck } from "./loadout";

export function renderGauntletEntryButton(): string {
  const best = loadGauntletBest();
  const bestLine = best
    ? `<small class="gauntlet-entry-best">最佳 ${best.streak} 馆 · 彩金 ${best.pot ?? 0}</small>`
    : "";
  return `
    <button type="button" class="lab-btn gauntlet-entry-btn" id="start-gauntlet">连胜踢馆</button>
    ${bestLine}`;
}

/** 踢馆主页：正经门厅。实验台只走顶栏按钮。 */
export function renderGauntletHome(_devPanelHtml = ""): string {
  const best = loadGauntletBest();
  const bestCard = best
    ? `<div class="gauntlet-best-card" data-tip="存在本机 localStorage">
        <span class="gauntlet-best-title">本机最佳</span>
        <b>第 ${best.streak} 馆</b>
        <span>彩金 ${best.pot ?? 0}</span>
      </div>`
    : `<div class="gauntlet-best-card empty"><span class="gauntlet-best-title">本机最佳</span><b>虚位以待</b><span>踢赢第一馆就上榜</span></div>`;
  const demoDone = isBreakDemoDone();
  const rookieDone = isRookieDemoDone();
  const startBlock = `<div class="gauntlet-home-cta-col">
        <div class="gauntlet-home-gates">
        <button type="button" class="hall-gate hall-gate-kick ${demoDone ? "primary" : ""}" id="start-gauntlet"
          data-tip="正式踢馆：选线 · 选兵器 · 垫资 · 下注托管">
          <em>正赛主线</em>
          <b>开 踢</b>
          <span>十馆 · 彩金</span>
        </button>
        <div class="gauntlet-home-lessons">
        <button type="button" class="hall-gate ${rookieDone ? "" : "primary"}" id="start-rookie-demo"
          data-tip="${rookieDone ? "再练：出刀 / 格挡 / 走动 / 营地" : "四局：出刀 → 格挡 → 走动 → 营地。不教破招。"}">
          <em>低阶</em>
          <b>${rookieDone ? "再练低阶" : "低阶入门"}</b>
          <span>四局 · 不教破招</span>
        </button>
        <button type="button" class="hall-gate ${rookieDone && !demoDone ? "primary" : ""}" id="start-break-demo"
          data-tip="${demoDone ? "再练：硬破 / 充能 / 让 / 破架 / 破眼 / 换人" : "六局：硬破 → 充能 → 让 → 破架 → 破眼 → 换人"}">
          <em>高阶</em>
          <b>${demoDone ? "再学新手关" : "新手关"}</b>
          <span>六局锁牌学破招</span>
        </button>
        <button type="button" class="hall-gate" id="start-training-hall"
          data-tip="专项课：每课先引导再自由训练，不走彩金">
          <em>回炉</em>
          <b>训练馆</b>
          <span>兵器课 · 营地课</span>
        </button>
        </div>
      </div>
      <p class="gauntlet-home-cta-hint">${demoDone ? "入门完成 · 开踢、训练馆或再练" : rookieDone ? "低阶过了就可以开踢；高阶课选练" : "建议先低阶入门，再开踢"}</p>
      </div>`;
  return `
    <div class="gauntlet-shell gauntlet-home ritual-screen">
      <header class="gauntlet-head gauntlet-home-head">
        <h2>明手：七步石台</h2>
        <p>十馆爬塔。站位、兵器、选路是正事。</p>
      </header>
      <div class="gauntlet-home-stage">
        ${startBlock}
        ${bestCard}
      </div>
    </div>`;
}

/** §31.13 下注屏：过馆后、下一馆开擂前。§31.14 盘口由调用方一次摇好传入（屏显与落锤必须同一份）。 */
export function renderGauntletWager(run: GauntletRun, offers: WagerOffer[], selKind: WagerKind | null, selStake: number | null): string {
  const entry = ladderEntryForRun(run);
  const cards = offers
    .map((o) => {
      const active = selKind === o.kind ? "active" : "";
      return `
      <button type="button" class="gauntlet-reward-card gauntlet-wager-card ${active}" data-wager-kind="${o.kind}" data-tip="${escapeAttr(o.tip)}">
        <em>${escapeAttr(wagerLabel(o.kind))} · 赔 ×${o.odds}</em>
        <b>${escapeHtml(o.title)}</b>
        <p class="gauntlet-reward-desc">${escapeHtml(o.tip)}</p>
      </button>`;
    })
    .join("");
  // §31.15 注额：比例快捷键（25/50/75/全押，按当前彩金折算，同值去重留高档）+ 自定义填额 + 庄垫兜底
  const quick: { val: number; label: string }[] = [];
  const cap = wagerStakeMax(run.pot, run.stage);
  if (cap > 0) {
    for (const [frac, label] of [[1, "全押"], [0.75, "75%"], [0.5, "50%"], [0.25, "25%"]] as const) {
      const val = Math.max(1, Math.round(cap * frac));
      if (!quick.some((q) => q.val === val)) quick.push({ val, label });
    }
  }
  const chips = quick.map(
    ({ val, label }) =>
      `<button type="button" class="gauntlet-stake-chip ${selStake === val ? "active" : ""}" data-wager-stake="${val}">${label} · ${val}</button>`,
  );
  const customMax = cap;
  const customActive = selStake != null && !quick.some((q) => q.val === selStake);
  const custom = `<span class="gauntlet-stake-custom ${customActive ? "active" : ""}" data-tip="填 1~${customMax}：回车落注。再点其他比例可改。"><input id="wager-custom" type="number" min="1" max="${customMax}" step="1" value="${selStake ?? ""}" placeholder="自定义" /></span>`;
  const stakeChips = chips.join("") + custom;
  const revive = reviveCost(run.stage);
  const canFight = selKind != null && selStake != null && selStake > 0;
  const foeCount = 1 + (entry.extraEnemyIds?.length ?? 0);
  const foeNames = [entry.enemyId, ...(entry.extraEnemyIds ?? [])]
    .map((id) => ENEMIES[id]?.name ?? id)
    .join("、");
  const tierLabel = GAUNTLET_TIER_LABEL[entry.tier];
  const intel = intelReport(run);
  const nextInfo =
    isBreakAlign() && run.stage <= 2
      ? `下一馆：${foeNames} · ${foeCount}人 · 难度 ${tierLabel} · 血量 ×${entry.hpMul.toFixed(2)} · ${run.stage === 1 ? "入门：看红格、走开或卸力" : "入门：格挡能扛一段"}`
      : `下一馆：${foeNames} · ${foeCount}人 · 难度 ${tierLabel} · 血量 ×${entry.hpMul.toFixed(2)}`;
  const nextLine = intel ? `${nextInfo} · 暗桩：${intel}` : nextInfo;
  const fightLabel = canFight ? "下 注 开 打" : selKind == null ? "先 选 盘 口" : "再 落 注 额";
  const wagerTitle = isBreakAlign() ? "赌馆" : `${escapeHtml(entry.label)} · 开擂前`;
  const wagerPager = isBreakAlign() ? `<p class="gauntlet-pager">赌馆 · 2 / 2</p>` : "";
  return `
    <div class="gauntlet-shell gauntlet-wager">
      <header class="gauntlet-head">
        <h2>${wagerTitle}</h2>
        ${wagerPager}
        <p class="gauntlet-reward-sub" data-tip="复活费 ${revive}（峰值锚 ${peakPotAnchor(run.stage)} 的 1/3）；彩金低于此不可赊账。">
          连胜 ${run.streak} · 彩金 <b class="gauntlet-pot">${run.pot}</b>${run.bankruptUsed ? " · 已用过赊账" : ""}
        </p>
        <p class="gauntlet-next-info">${escapeHtml(nextLine)}</p>
      </header>
      <div class="gauntlet-wager-row">${cards}</div>
      <div class="gauntlet-stake-row"><span class="gauntlet-stake-label">注额</span>${stakeChips}</div>
      <div class="gauntlet-wager-actions">
        <button type="button" class="lab-btn primary large" id="wager-fight" ${canFight ? "" : "disabled"}>${fightLabel}</button>
        <button type="button" class="lab-btn" id="wager-skip">不押 · 直接打</button>
      </div>
    </div>`;
}

export function renderGauntletPathPick(): string {
  const paths: GauntletPath[] = ["shaolin", "bandit", "court"];
  const final = getGauntletFinalStage();
  const mid = Math.ceil(final / 2);
  const meta = isBreakAlign()
    ? `${final} 馆 · 前两关入门 · 同道 3/7 · 期末第 ${final} 馆`
    : `${final} 关 · 期中第 ${mid} 关 · 期末第 ${final} 关 · 可无尽`;
  const cards = paths
    .map(
      (path) => `
      <button type="button" class="gauntlet-path-card" data-gauntlet-path="${path}" data-tip="${escapeAttr(GAUNTLET_PATH_BLURB[path])}">
        <b>${escapeHtml(GAUNTLET_PATH_LABEL[path])}</b>
        <em>${escapeHtml(GAUNTLET_PATH_BLURB[path])}</em>
        <span class="gauntlet-school-meta">${meta}</span>
      </button>`,
    )
    .join("");
  return `
    <div class="gauntlet-shell gauntlet-pick gauntlet-path-pick work-screen">
      <header class="hall-chrome">
        <button type="button" class="lab-btn hall-back" id="gauntlet-exit-path">回门厅</button>
        <div class="hall-chrome-title">
          <h2>选踢馆线</h2>
          <p>三条线数值相近，敌人主题与招式不同。</p>
        </div>
      </header>
      <div class="gauntlet-school-row">${cards}</div>
    </div>`;
}

export function renderGauntletSchoolPick(path: GauntletPath, error = ""): string {
  const cards = GAUNTLET_SCHOOLS.map((school) => {
    const cfg = GAUNTLET_SCHOOL_LOADOUT[school];
    const mate = rogueLeadId(school);
    const deck = breakStarterDeck(school);
    const counts = new Map<string, number>();
    for (const id of deck) counts.set(id, (counts.get(id) ?? 0) + 1);
    const preview = [...counts.entries()]
      .map(([id, n]) => {
        const c = CARDS[id as keyof typeof CARDS];
        return `<span class="gauntlet-preview-chip">${escapeHtml(c.name)}${n > 1 ? `×${n}` : ""}</span>`;
      })
      .join("");
    const tip = starterTip(school);
    return `
      <button type="button" class="gauntlet-school-card" data-gauntlet-school="${school}" data-tip="${escapeAttr(tip)}">
        <b>${escapeHtml(WEAPON_NAME[school])}</b>
        <em>${escapeHtml(cfg.label)} · ${escapeHtml(MATES[mate as CompanionId].name)}</em>
        <span class="gauntlet-preview-row">${preview}</span>
        <span class="gauntlet-school-meta">起手 ${deck.length} 张</span>
      </button>`;
  }).join("");

  return `
    <div class="gauntlet-shell gauntlet-pick work-screen">
      <header class="hall-chrome">
        <button type="button" class="lab-btn hall-back" id="gauntlet-exit-pick">回选线</button>
        <div class="hall-chrome-title">
          <h2>起手脚 · ${escapeHtml(GAUNTLET_PATH_LABEL[path])}</h2>
          <p>选一门起脚踢馆。单人单刀，连赢拿战利品。</p>
        </div>
      </header>
      ${error ? `<p class="gauntlet-error-banner" role="alert">${escapeHtml(error)}</p>` : ""}
      <div class="gauntlet-school-row">${cards}</div>
    </div>`;
}

export function renderGauntletBadge(run: GauntletRun): string {
  const entry = ladderEntryForRun(run);
  const final = getGauntletFinalStage();
  const w = run.wager;
  const wager = w ? ` · 已押「${wagerLabel(w.kind)}」${w.stake}` : "";
  const stageTag = isBreakAlign()
    ? `第 ${run.stage}/${final} 馆`
    : `第 ${run.stage}/${final} 馆`;
  const tip = `${stageTag} · ${entry.label} · 彩金 ${run.pot}${w ? `\n本馆注：${wagerLabel(w.kind)} 押 ${w.stake}（赔 ×${w.odds}）` : ""}`;
  const scar = (run.scars ?? 0) > 0 ? " · 带伤" : "";
  return `<span class="gauntlet-badge" data-tip="${escapeAttr(tip)}">${escapeHtml(stageTag)} · ${escapeHtml(entry.label)} · 彩金 <b class="gauntlet-pot">${run.pot}</b>${wager}${scar}</span>`;
}

export function renderGauntletRewardPick(
  run: GauntletRun,
  options: GauntletRewardOption[],
  market: GauntletMarketOffer[] = [],
  marketBought: ReadonlySet<string> = new Set(),
  taken = 0,
  refreshIndex = 0,
  superPick = false,
): string {
  const takeNeed = superPick ? 1 : gauntletRewardTakeCount(run);
  const picksDone = taken >= takeNeed || options.length === 0;
  const cards = options
    .map((o, i) =>
      campBattleCardHtml({
        kind: o.kind,
        id: o.id,
        title: o.title,
        text: o.tip,
        tip: o.tip,
        attrs: `data-reward-idx="${i}"`,
      }),
    )
    .join("");
  const buyCap = marketBuyCap(run.stage);
  const boughtN = marketBought.size;
  const capHit = boughtN >= buyCap;
  const stall = market
    .map((o) => {
      const bought = marketBought.has(o.id);
      const afford = run.pot >= o.price;
      const blocked = capHit && !bought;
      const capTip = blocked ? "（本摊买满，花钱刷新或进下一馆）" : "";
      const tip = bought ? "已入手" : `${o.tip}${afford ? "" : "（彩金不够）"}${capTip}`;
      return campBattleCardHtml({
        kind: o.kind,
        id: o.id,
        title: o.title,
        text: o.tip,
        tip,
        attrs: `data-market-id="${escapeAttr(o.id)}"`,
        extraClass: bought ? "sold" : !afford || blocked ? "poor" : "",
        disabled: bought || !afford || blocked,
        priceLabel: bought ? "已收" : `${o.price} 彩金`,
      });
    })
    .join("");
  const refreshCost = marketRefreshCost(run, refreshIndex);
  const canRefresh = run.pot >= refreshCost;
  const capLine = run.stage >= 10 ? "第十馆前不限购，可把彩金花光" : `本摊最多买 ${buyCap} 件（已买 ${boughtN}）`;
  const marketRow =
    market.length > 0
      ? `<div class="gauntlet-market">
        <h3>顺路黑市 · 彩金换实在</h3>
        <p class="gauntlet-reward-sub" data-tip="${escapeAttr(capLine)}">${escapeHtml(capLine)}</p>
        <div class="gauntlet-market-row">${stall}</div>
        <div class="gauntlet-market-actions">
          <button type="button" class="lab-btn" id="gauntlet-market-refresh" data-tip="花彩金重摆一摊货" ${canRefresh ? "" : "disabled"}>刷新货架 · ${refreshCost} 彩金</button>
        </div>
      </div>`
      : "";
  const cleared = ladderEntryForRun(run, Math.max(1, run.stage - 1));
  const next = ladderEntryForRun(run);
  const pickLine = superPick
    ? " · 先三选一（神兵/仙药/助战符），选完还有本轮免费奖励"
    : takeNeed > 1
      ? ` · ${options.length} 选 ${takeNeed}（已领 ${taken}）`
      : "";
  const potLine = run.lastPotText ? ` · ${run.lastPotText}` : "";
  const cashout =
    isGauntletEndless() && run.stage > getGauntletFinalStage()
      ? `<button type="button" class="lab-btn gauntlet-cashout" id="gauntlet-cashout" data-tip="见好就收：带着 ${run.pot} 彩金上榜走人（再继续，输了就清零）">见好就收 · 揣走 ${run.pot} 彩金</button>`
      : "";
  const place = campPlaceName(run.path);
  const campTitle = isBreakAlign() ? place.title : `${escapeHtml(cleared.label)} 告捷`;
  const pager = isBreakAlign() ? `<p class="gauntlet-pager">${place.pager}</p>` : "";
  const subHead = isBreakAlign()
    ? `${escapeHtml(cleared.label)} 告捷 · 连胜 ${run.streak} · 彩金 <b class="gauntlet-pot">${run.pot}</b>${escapeHtml(potLine)}${escapeHtml(pickLine)}`
    : `连胜 ${run.streak} · 彩金 <b class="gauntlet-pot">${run.pot}</b>${escapeHtml(potLine)}${escapeHtml(pickLine)} · 下一战 ${escapeHtml(next.label)}（${GAUNTLET_TIER_LABEL[next.tier]}）`;
  const packOk = canStartBattle(run);
  const bounds = deckBounds(run.stage);
  const n = fieldDeck(run).length;
  const continueBtn = `<button type="button" class="lab-btn primary large" id="gauntlet-camp-continue" data-tip="确认离开营地，进入下注或下一馆" ${picksDone && packOk ? "" : "disabled"}>${!picksDone ? `先领完免费奖励（${taken}/${takeNeed}）` : packOk ? "继续下一程" : `出战牌 ${n} 张，须 ${bounds.min}～${bounds.max}`}</button>`;
  const loadoutBtn = `<button type="button" class="lab-btn large" id="gauntlet-open-loadout" data-tip="每人牌包、仓库、半价卖掉多余的">配装 · ${n}/${bounds.max}</button>`;
  return `
    <div class="gauntlet-shell gauntlet-reward work-screen">
      <header class="gauntlet-head">
        <h2>${campTitle}</h2>
        ${pager}
        <p class="gauntlet-reward-sub" data-tip="每场开战气血劲力拉满；道具次数不回。">
          ${subHead}
        </p>
        ${intelReport(run) ? `<p class="gauntlet-event-lead">暗桩：${escapeHtml(intelReport(run))}</p>` : ""}
      </header>
      <div class="gauntlet-reward-row">${cards || `<p class="gauntlet-reward-sub">免费奖励已领完，黑市仍可买。</p>`}</div>
      ${marketRow}
      <div class="gauntlet-camp-foot">${loadoutBtn}${continueBtn}${cashout}</div>
    </div>`;
}

export function renderGauntletBanker(): string {
  return `
    <div class="gauntlet-shell gauntlet-banker">
      <header class="gauntlet-head">
        <h2>庄家垫资 · 仅首馆一次</h2>
        <p>起步彩金 ${GAUNTLET_START_POT}，选庄家垫资倍数（本局起始钱包）。</p>
      </header>
      <div class="gauntlet-wager-row">
        <button type="button" class="gauntlet-reward-card" data-banker-mult="2" data-tip="起始 ${GAUNTLET_START_POT * 2} 彩金">
          <em>垫资 ×2</em><b>${GAUNTLET_START_POT * 2} 彩金</b>
        </button>
        <button type="button" class="gauntlet-reward-card" data-banker-mult="3" data-tip="起始 ${GAUNTLET_START_POT * 3} 彩金（推荐敢押）">
          <em>垫资 ×3</em><b>${GAUNTLET_START_POT * 3} 彩金</b>
        </button>
      </div>
    </div>`;
}

export function renderGauntletLifeline(run: GauntletRun): string {
  const cost = reviveCost(run.stage);
  const cards = (Object.keys(LIFELINE_DEFS) as LifelineKind[])
    .map((kind) => {
      const d = LIFELINE_DEFS[kind];
      return `<button type="button" class="gauntlet-reward-card" data-lifeline="${kind}" data-tip="${escapeAttr(d.tip)}">
        <em>救命 · 本局有效</em><b>${escapeHtml(d.title)}</b><p class="gauntlet-reward-desc">${escapeHtml(d.tip)}</p>
      </button>`;
    })
    .join("");
  return `
    <div class="gauntlet-shell gauntlet-lifeline">
      <header class="gauntlet-head">
        <h2>赊账一次 · 选救命路</h2>
        <p>付复活费 <b>${cost}</b> 彩金（非全赔），满血重打本馆。整局仅此一次。</p>
      </header>
      <div class="gauntlet-wager-row">${cards}</div>
    </div>`;
}

export function renderGauntletResult(run: GauntletRun, elapsedSec: number, bankruptNote = ""): string {
  const best = loadGauntletBest();
  const mins = Math.floor(elapsedSec / 60);
  const secs = elapsedSec % 60;
  const timeStr = mins > 0 ? `${mins} 分 ${secs} 秒` : `${secs} 秒`;
  const newBest = best && best.streak === run.streak && best.pot === run.pot && best.breaks === run.totalBreaks;
  const potLine = run.lastPotText ? `<div class="gauntlet-result-potline">${escapeHtml(run.lastPotText)}</div>` : "";
  return `
    <div class="gauntlet-shell gauntlet-result">
      <header class="gauntlet-head">
        <h2>踢馆结算${newBest ? " · 新纪录" : ""}</h2>
      </header>
      <div class="gauntlet-result-hero">
        <div class="gauntlet-result-streak" data-tip="本局连踢馆数（输前累计）">${run.streak}</div>
        <div class="gauntlet-result-streak-label">连胜馆数</div>
        <div class="gauntlet-result-pot" data-tip="本局最终彩金（过馆底彩 + 赌注盈亏）">彩金 ${run.pot}</div>
      </div>
      ${bankruptNote ? `<div class="gauntlet-result-potline">${escapeHtml(bankruptNote)}</div>` : ""}
      ${potLine}
      <div class="gauntlet-result-meta">
        <span data-tip="从选系到结算">用时 ${timeStr}</span>
        <span data-tip="localStorage · openhand-gauntlet-best">历史最佳 ${best ? `${best.streak} 馆 / 彩金 ${best.pot ?? 0}` : "—"}</span>
        <span data-tip="${escapeAttr(WEAPON_NAME[run.school])} 系起手脚">系别 ${escapeHtml(WEAPON_NAME[run.school])}</span>
        <span data-tip="本局兵刃最终品阶">兵器 ${escapeHtml(gearById(run.weaponId)?.name ?? run.weaponId)}</span>
      </div>
      <div class="gauntlet-result-actions">
        <button type="button" class="lab-btn primary large" id="gauntlet-retry">再来一局</button>
        <button type="button" class="lab-btn" id="gauntlet-exit-result">回踢馆门厅</button>
      </div>
    </div>`;
}

export function renderGauntletRewardTarget(
  run: GauntletRun,
  rewardTitle: string,
  members: CompanionId[],
): string {
  const rows = members
    .map((id) => {
      const m = MATES[id];
      return `<button type="button" class="gauntlet-reward-card" data-target-mate="${id}">
        <b>${escapeHtml(m.name)}</b>
        <p class="gauntlet-reward-desc">${escapeHtml(m.title)} · ${WEAPON_NAME[m.weapon]} · 气血 ${m.hp}</p>
      </button>`;
    })
    .join("");
  return `
    <div class="gauntlet-shell gauntlet-reward-target">
      <header class="gauntlet-head">
        <h2>选受益角色 · ${escapeHtml(rewardTitle)}</h2>
        <p class="gauntlet-reward-sub">外功 / 心法只给指定一人，不是全队。</p>
      </header>
      <div class="gauntlet-reward-row">${rows}</div>
    </div>`;
}

export function renderGauntletLoadout(run: GauntletRun, focusMate?: CompanionId): string {
  const bounds = deckBounds(run.stage);
  const hero = gauntletFieldMate(run.school);
  const mates = [hero, ...runCompanions(run).filter((id) => id !== hero)];
  const focus = focusMate && mates.includes(focusMate) ? focusMate : hero;
  const sell = sellPriceFor("card", run.stage, ladderEntryForRun(run).tier);
  const packOk = canStartBattle(run);
  const fieldN = fieldDeck(run).length;
  const focusDeck = mateDeck(run, focus);
  const atMin = focusDeck.length <= bounds.min;
  const atMax = focusDeck.length >= bounds.max;
  const stash = run.stashCards ?? [];
  const mateRail = mates
    .map((id) => {
      const deck = mateDeck(run, id);
      const m = MATES[id];
      const on = id === focus ? "on" : "";
      const lead = id === hero ? "主角" : "同道";
      return `<button type="button" class="gauntlet-loadout-mate ${on}" data-loadout-mate="${id}" data-tip="${escapeAttr(`${m?.name ?? id} · ${lead} · ${deck.length}/${bounds.max}`)}">
        ${companionPortraitHtml(id)}
        <b>${escapeHtml(m?.name ?? id)}</b>
        <span>${lead} · ${deck.length}/${bounds.max}</span>
      </button>`;
    })
    .join("");
  const deckHtml = focusDeck
    .map((cid, i) =>
      campBattleCardHtml({
        kind: "card",
        id: cid,
        title: CARDS[cid]?.name ?? cid,
        text: CARDS[cid]?.text ?? "",
        attrs: `data-unequip-mate="${focus}" data-unequip-idx="${i}"`,
        extraClass: "gauntlet-loadout-card",
        disabled: atMin,
        tip: atMin ? `出战至少 ${bounds.min} 张，卸不下` : undefined,
      }),
    )
    .join("");
  const stashHtml = stash
    .map((cid, i) => {
      const card = campBattleCardHtml({
        kind: "card",
        id: cid,
        title: CARDS[cid]?.name ?? cid,
        text: CARDS[cid]?.text ?? "",
        attrs: `data-equip-idx="${i}"`,
        extraClass: "gauntlet-loadout-card",
        disabled: atMax,
        tip: atMax ? `${MATES[focus]?.name ?? ""} 牌包已满` : `装给 ${MATES[focus]?.name ?? ""}`,
      });
      return `<div class="gauntlet-stash-slot">${card}<button type="button" class="lab-btn gauntlet-stash-sell" data-sell-idx="${i}">卖 ${sell}</button></div>`;
    })
    .join("");
  const warn = packOk
    ? ""
    : `<p class="gauntlet-loadout-warn">主角出战 ${fieldN} 张，须 ${bounds.min}～${bounds.max}</p>`;
  return `
    <div class="gauntlet-shell gauntlet-loadout work-screen">
      <aside class="gauntlet-loadout-rail gauntlet-loadout-mates">
        <button type="button" class="lab-btn primary" id="gauntlet-loadout-back">回营地</button>
        ${mateRail}
      </aside>
      <div class="gauntlet-loadout-main">
        <header class="gauntlet-loadout-head">
          <h2>配装 · ${escapeHtml(MATES[focus]?.name ?? "")}</h2>
          <p>点牌卸进仓库 · 点仓库装给左侧所选 · 半价卖 · 彩金 <b class="gauntlet-pot">${run.pot}</b></p>
          ${warn}
        </header>
        <div class="gauntlet-loadout-deck">${deckHtml || `<p class="gauntlet-reward-sub">（空）</p>`}</div>
      </div>
      <aside class="gauntlet-loadout-rail gauntlet-loadout-stash">
        <h3>仓库</h3>
        <div class="gauntlet-loadout-stash-list">${stashHtml || `<p class="gauntlet-reward-sub">（空）</p>`}</div>
      </aside>
    </div>`;
}

export function renderGauntletOverlay(
  screen:
    | "intro"
    | "path"
    | "pick"
    | "banker"
    | "reward"
    | "result"
    | "companion"
    | "wager"
    | "lifeline"
    | "loadout"
    | "rewardTarget"
    | "market"
    | "graduate"
    | "event"
    | "finale"
    | "scar",
  inner: string,
  bgUrl?: string,
): string {
  const bg = bgUrl ? ` style="--gauntlet-bg:url('${bgUrl}')"` : "";
  return `<div class="gauntlet-overlay" data-gauntlet-screen="${screen}"${bg}>${inner}</div>`;
}

/** 拆招：3/7 馆四选一；经典：三选一。同系光环卡自带 / 异系组合卡自带。 */
export function renderGauntletCompanionPick(run: GauntletRun, choices: CompanionId[]): string {
  const breakMode = isBreakAlign();
  const cards = choices
    .map((id, i) => {
      const m = MATES[id];
      const cross = m.weapon !== run.school;
      const auraFx = tierFx(m.weapon, 1);
      const pathTag = cross
        ? `<em class="gauntlet-path-tag cross">${breakMode ? "异系 · 组合卡自带" : "异系 · 组合技"}</em>`
        : `<em class="gauntlet-path-tag same">${breakMode ? "同系 · 光环卡自带" : "同系 · 共鸣光环"}</em>`;
      const pathLine = cross
        ? breakMode
          ? `换上后牌池自带 2 张组合状态卡（主融合+副融合），不需购买`
          : `组合技解禁：${WEAPON_NAME[m.weapon]}×${WEAPON_NAME[run.school]} 跨系组合卡入牌库，双人可换可合`
        : breakMode
          ? `${WEAPON_NAME[m.weapon]}光环 + 牌池自带光环状态卡（偏副机制）`
          : `${WEAPON_NAME[m.weapon]}光环激活（双人档）：${auraFx?.label ?? ""}，全队生效`;
      const rogue = rogueMate(id);
      const skill = companionSkillLine(id);
      const tip = `${m.name} · ${m.title}\n系别 ${WEAPON_NAME[m.weapon]} · 定位 ${ROLE_LABEL[m.role]} · 气血 ${m.hp}\n${skill}\n${m.bio}\n${pathLine}`;
      return `
      <button type="button" class="gauntlet-reward-card gauntlet-companion-card has-art" data-companion-idx="${i}" data-tip="${escapeAttr(tip)}">
        ${companionPortraitHtml(id)}
        ${pathTag}
        <b>${escapeHtml(m.name)} · ${escapeHtml(m.title ?? "")}</b>
        <p class="gauntlet-reward-desc gauntlet-comp-skill">${escapeHtml(skill)}</p>
        <p class="gauntlet-reward-desc">${escapeHtml(WEAPON_NAME[m.weapon])} · ${escapeHtml(ROLE_LABEL[m.role])} · 气血 ${m.hp}${rogue ? ` · ${escapeHtml(rogue.skillName)}` : ""}</p>
        <p class="gauntlet-reward-desc gauntlet-path-line">${escapeHtml(pathLine)}</p>
      </button>`;
    })
    .join("");
  const pickN = choices.length;
  return `
    <div class="gauntlet-shell gauntlet-companion">
      <header class="gauntlet-head">
        <h2>第${Math.max(1, run.stage - 1)}馆 告捷 · 同道来投</h2>
        <p class="gauntlet-reward-sub">连胜 ${run.streak} · 彩金 ${run.pot} · ${pickN} 选 1 · 同系光环卡 / 异系组合卡均自带进牌池</p>
      </header>
      <div class="gauntlet-reward-row">${cards}</div>
    </div>`;
}

const EVENT_KIND_TITLE: Record<EncounterKind, string> = {
  inn: "客栈",
  fork: "前路分叉",
  companion: "同道遭遇",
  finaleHint: "终馆情报",
  ambush: "伏击",
  stall: "赌摊",
};

export function renderGauntletEvent(run: GauntletRun, kind: EncounterKind, choices: EncounterChoice[]): string {
  const cards = choices
    .map((c, i) => {
      const tag = encounterOutcomeTag(c);
      const fx = encounterEffectLine(c);
      const art = c.companionId ? companionPortraitHtml(c.companionId) : "";
      return `<button type="button" class="gauntlet-reward-card${c.companionId ? " gauntlet-companion-card has-art" : ""}" data-event-idx="${i}" data-tip="${escapeAttr(`${fx}\n${c.blurb}`)}">
        ${art}
        <em>${tag}</em><b>${escapeHtml(c.title)}</b>
        <p class="gauntlet-event-fx">${escapeHtml(fx)}</p>
        <p class="gauntlet-reward-desc">${escapeHtml(c.blurb)}</p>
      </button>`;
    })
    .join("");
  const lead = eventLead(run, kind);
  const intel = kind !== "companion" ? intelReport(run) : "";
  return `
    <div class="gauntlet-shell ritual-screen">
      <header class="gauntlet-head">
        <h2>${EVENT_KIND_TITLE[kind]}</h2>
        <p class="gauntlet-event-lead">${escapeHtml(lead)}</p>
        ${intel ? `<p class="gauntlet-event-lead">暗桩：${escapeHtml(intel)}</p>` : ""}
        <p>墨底是效果：绕道、彩金、入伙、下场人数。口味在下面。不占馆号。彩金 ${run.pot}</p>
      </header>
      <div class="gauntlet-wager-row">${cards}</div>
    </div>`;
}

export function renderGauntletFinale(run: GauntletRun): string {
  const cards = FINALE_CHOICES.map((c) => {
    const fx = finaleEffectLine(c.id, (run.scars ?? 0) > 0);
    return `<button type="button" class="gauntlet-reward-card" data-finale="${c.id}" data-tip="${escapeAttr(`${fx}\n${c.blurb}`)}">
      <em>终馆</em><b>${escapeHtml(c.title)}</b>
      <p class="gauntlet-event-fx">${escapeHtml(fx)}</p>
      <p class="gauntlet-reward-desc">${escapeHtml(c.blurb)}</p>
    </button>`;
  }).join("");
  return `
    <div class="gauntlet-shell ritual-screen">
      <header class="gauntlet-head">
        <h2>终馆抉择</h2>
        <p>改这一馆怎么打，馆号仍是 10。${(run.scars ?? 0) > 0 ? "你带着伤痕，人海更挤、私了彩金更薄。" : run.pendingIntel ? "暗桩把三条路说全了。" : "门口只留这三道口风。"}</p>
      </header>
      <div class="gauntlet-wager-row">${cards}</div>
    </div>`;
}

export function renderGauntletScar(run: GauntletRun): string {
  const tax = Math.max(1, Math.round(run.pot * 0.2));
  return `
    <div class="gauntlet-shell ritual-screen">
      <header class="gauntlet-head">
        <h2>带伤过馆</h2>
        <p>第二次倒了。馆序仍往上走，但不发底彩，再抽 20% 彩金（${tax}），并得伤痕。下一跳偏险。第三次倒才出局。</p>
      </header>
      <div class="gauntlet-wager-actions">
        <button type="button" class="lab-btn primary large" id="gauntlet-scar-pass">带伤往上爬</button>
      </div>
    </div>`;
}
