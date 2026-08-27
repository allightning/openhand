import { CARDS } from "../game/content";
import { tierFx } from "../game/labResonance";
import { MATES, WEAPON_NAME } from "../game/party";
import { gearById } from "../game/weapons";
import type { CompanionId } from "../game/types";
import { escapeAttr, escapeHtml } from "./setupUi";
import {
  GAUNTLET_HEAL_RATIO,
  GAUNTLET_MAX_STAGE,
  GAUNTLET_SCHOOL_LOADOUT,
  GAUNTLET_SCHOOLS,
  GAUNTLET_STARTERS,
  GAUNTLET_TIER_LABEL,
  GAUNTLET_START_POT,
  LIFELINE_DEFS,
  wagerStakeMax,
  basePot,
  ladderEntryForRun,
  loadGauntletBest,
  starterTip,
  wagerLabel,
  reviveCost,
  peakPotAnchor,
  type GauntletMarketOffer,
  type GauntletRewardOption,
  type GauntletRun,
  type LifelineKind,
  type WagerKind,
  type WagerOffer,
} from "./gauntlet";
import { GAUNTLET_PATH_BLURB, GAUNTLET_PATH_LABEL, type GauntletPath } from "./gauntletPaths";

export function renderGauntletEntryButton(): string {
  const best = loadGauntletBest();
  const bestLine = best
    ? `<small class="gauntlet-entry-best">最佳 ${best.streak} 馆 · 彩金 ${best.pot ?? 0} · 破招 ${best.breaks}</small>`
    : "";
  return `
    <button type="button" class="lab-btn gauntlet-entry-btn" id="start-gauntlet">连胜踢馆</button>
    ${bestLine}`;
}

/** §31.13 踢馆主页：实验台的主界面就是产品界面——先看榜，再开踢。 */
export function renderGauntletHome(devPanelHtml: string): string {
  const best = loadGauntletBest();
  const bestCard = best
    ? `<div class="gauntlet-best-card" data-tip="存在本机 localStorage">
        <span class="gauntlet-best-title">本机最佳</span>
        <b>第 ${best.streak} 馆</b>
        <span>彩金 ${best.pot ?? 0} · 破招 ${best.breaks}</span>
      </div>`
    : `<div class="gauntlet-best-card empty"><span class="gauntlet-best-title">本机最佳</span><b>虚位以待</b><span>踢赢第一馆就上榜</span></div>`;
  return `
    <div class="gauntlet-shell gauntlet-home">
      <header class="gauntlet-head gauntlet-home-head">
        <h2>连胜踢馆</h2>
        <p>七步石台，敌招全亮。读懂它、拆掉它、反打它——拆就是打。<br/>过一馆有一馆的彩金；敢下注，赢得更多。输一场，连胜清零。</p>
      </header>
      <div class="gauntlet-home-mid">
        <button type="button" class="lab-btn primary large gauntlet-home-start" id="start-gauntlet">开 踢</button>
        ${bestCard}
      </div>
      <div class="gauntlet-home-rules">
        <span data-tip="敌招意图全亮；硬拆一段 = 那段作废 + 反打真伤">拆招四档：破 / 让 / 空 / 打</span>
        <span data-tip="破眼被拆：套路崩塌，失衡承伤×2">破眼 = 处决窗</span>
        <span data-tip="开擂前下注；六种盘口每场随机开三">下注 = 翻倍</span>
        <span data-tip="整局仅 1 次赊账；付复活费（非全赔）+ 救命奖励三选一">破产 = 赊账一次</span>
        <span data-tip="第 1 馆选庄家垫资 ×2 或 ×3">首馆垫资</span>
        <span data-tip="彩金 &lt; 复活费 → 破产区，直接出局">破产线 = 峰值/3</span>
      </div>
      <details class="gauntlet-dev-details">
        <summary>实验台 · 踢馆调参（开发者）</summary>
        ${devPanelHtml}
      </details>
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
  if (run.pot > 0) {
    for (const [frac, label] of [[1, "全押"], [0.75, "75%"], [0.5, "50%"], [0.25, "25%"]] as const) {
      const val = Math.max(1, Math.round(run.pot * frac));
      if (!quick.some((q) => q.val === val)) quick.push({ val, label });
    }
  }
  const chips = quick.map(
    ({ val, label }) =>
      `<button type="button" class="gauntlet-stake-chip ${selStake === val ? "active" : ""}" data-wager-stake="${val}">${label} · ${val}</button>`,
  );
  const customMax = wagerStakeMax(run.pot);
  const customActive = selStake != null && !quick.some((q) => q.val === selStake);
  const custom = `<span class="gauntlet-stake-custom ${customActive ? "active" : ""}" data-tip="填 1~${customMax}：回车落注。"><input id="wager-custom" type="number" min="1" max="${customMax}" step="1" value="${selStake ?? ""}" placeholder="自定义" /></span>`;
  const stakeChips = chips.join("") + custom;
  const revive = reviveCost(run.stage);
  const canFight = selKind != null && selStake != null && selStake > 0;
  return `
    <div class="gauntlet-shell gauntlet-wager">
      <header class="gauntlet-head">
        <h2>${escapeHtml(entry.label)} · 开擂前</h2>
        <p class="gauntlet-reward-sub" data-tip="复活费 ${revive}（峰值锚 ${peakPotAnchor(run.stage)} 的 1/3）；彩金低于此不可赊账。">
          连胜 ${run.streak} · 彩金 <b class="gauntlet-pot">${run.pot}</b> · 破招 ${run.totalBreaks}${run.bankruptUsed ? " · 已用过赊账" : ""}
        </p>
      </header>
      <div class="gauntlet-wager-row">${cards}</div>
      <div class="gauntlet-stake-row"><span class="gauntlet-stake-label">注额</span>${stakeChips}</div>
      <div class="gauntlet-wager-actions">
        <button type="button" class="lab-btn primary large" id="wager-fight" ${canFight ? "" : "disabled"}>下 注 开 打</button>
        <button type="button" class="lab-btn" id="wager-skip">不押 · 直接打</button>
      </div>
    </div>`;
}

export function renderGauntletPathPick(): string {
  const paths: GauntletPath[] = ["shaolin", "bandit", "court"];
  const cards = paths
    .map(
      (path) => `
      <button type="button" class="gauntlet-path-card" data-gauntlet-path="${path}" data-tip="${escapeAttr(GAUNTLET_PATH_BLURB[path])}">
        <b>${escapeHtml(GAUNTLET_PATH_LABEL[path])}</b>
        <em>${escapeHtml(GAUNTLET_PATH_BLURB[path])}</em>
        <span class="gauntlet-school-meta">15 关 · 期中第 7 关 · 期末第 15 关</span>
      </button>`,
    )
    .join("");
  return `
    <div class="gauntlet-shell gauntlet-pick gauntlet-path-pick">
      <header class="gauntlet-head">
        <h2>选踢馆线</h2>
        <p>三条线数值相近，敌人主题与招式不同。选一条再定起手脚。</p>
        <button type="button" class="lab-btn" id="gauntlet-exit-path">返回门厅</button>
      </header>
      <div class="gauntlet-school-row">${cards}</div>
    </div>`;
}

export function renderGauntletSchoolPick(path: GauntletPath, error = ""): string {
  const cards = GAUNTLET_SCHOOLS.map((school) => {
    const cfg = GAUNTLET_SCHOOL_LOADOUT[school];
    const deck = GAUNTLET_STARTERS[school];
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
        <em>${escapeHtml(cfg.label)} · ${escapeHtml(MATES[cfg.fieldMate as CompanionId].name)}</em>
        <span class="gauntlet-preview-row">${preview}</span>
        <span class="gauntlet-school-meta">起手 ${deck.length} 张</span>
      </button>`;
  }).join("");

  return `
    <div class="gauntlet-shell gauntlet-pick">
      <header class="gauntlet-head">
        <h2>连胜踢馆 · ${escapeHtml(GAUNTLET_PATH_LABEL[path])}</h2>
        <p>选一门起脚踢馆。单人单刀，连赢拿战利品；输一场连胜清零。</p>
        ${error ? `<p class="gauntlet-error-banner" role="alert">${escapeHtml(error)}</p>` : ""}
        <button type="button" class="lab-btn" id="gauntlet-exit-pick">返回选线</button>
      </header>
      <div class="gauntlet-school-row">${cards}</div>
    </div>`;
}

export function renderGauntletBadge(run: GauntletRun): string {
  const entry = ladderEntryForRun(run);
  const w = run.wager;
  const wager = w ? ` · 已押「${wagerLabel(w.kind)}」${w.stake}` : "";
  const tip = `${entry.label} · 彩金 ${run.pot} · 累计破招 ${run.totalBreaks}${w ? `\n本馆注：${wagerLabel(w.kind)} 押 ${w.stake}（赔 ×${w.odds}）` : ""}`;
  return `<span class="gauntlet-badge" data-tip="${escapeAttr(tip)}">${escapeHtml(entry.label)} · 彩金 <b class="gauntlet-pot">${run.pot}</b> · 破招 ${run.totalBreaks}${wager}</span>`;
}

const REWARD_KIND_LABEL: Record<GauntletRewardOption["kind"], string> = {
  card: "残谱",
  tech: "外功",
  mind: "心法",
  item: "道具",
  aid: "助战",
  forge: "淬刃",
  elixir: "仙药",
  aidPair: "助战符",
};

export function renderGauntletRewardPick(
  run: GauntletRun,
  options: GauntletRewardOption[],
  market: GauntletMarketOffer[] = [],
  marketBought: ReadonlySet<string> = new Set(),
): string {
  const cards = options
    .map(
      (o, i) => `
      <button type="button" class="gauntlet-reward-card" data-reward-idx="${i}" data-tip="${escapeAttr(o.tip)}">
        <em>${REWARD_KIND_LABEL[o.kind]}</em>
        <b>${escapeHtml(o.title)}</b>
        <p class="gauntlet-reward-desc">${escapeHtml(o.tip)}</p>
      </button>`,
    )
    .join("");
  // §31.16 黑市：免费战利品照拿，花钱的路另摆一摊——彩金自此能换战力
  const stall = market
    .map((o) => {
      const bought = marketBought.has(o.id);
      const afford = run.pot >= o.price;
      const cls = bought ? " sold" : afford ? "" : " poor";
      const tip = bought ? "已入手" : `${o.tip}${afford ? "" : "（彩金不够）"}`;
      return `<button type="button" class="gauntlet-market-card${cls}" data-market-id="${escapeAttr(o.id)}" data-tip="${escapeAttr(tip)}" ${bought || !afford ? "disabled" : ""}>
        <b>${escapeHtml(o.title)}</b><span class="gauntlet-market-price">${bought ? "已收" : `${o.price} 彩金`}</span>
      </button>`;
    })
    .join("");
  const marketRow = market.length > 0 ? `<div class="gauntlet-market"><h3>顺路黑市 · 彩金换实在</h3><div class="gauntlet-market-row">${stall}</div></div>` : "";
  // 注意：领奖屏显示时 stage 已 +1——表头是「刚打过的馆」，下一战才是当前 stage
  const cleared = ladderEntryForRun(run, Math.max(1, run.stage - 1));
  const next = ladderEntryForRun(run);
  const potLine = run.lastPotText ? ` · ${run.lastPotText}` : "";
  const cashout =
    run.stage > GAUNTLET_MAX_STAGE
      ? `<button type="button" class="lab-btn gauntlet-cashout" id="gauntlet-cashout" data-tip="见好就收：带着 ${run.pot} 彩金上榜走人（再继续，输了就清零）">见好就收 · 揣走 ${run.pot} 彩金</button>`
      : "";
  return `
    <div class="gauntlet-shell gauntlet-reward">
      <header class="gauntlet-head">
        <h2>${escapeHtml(cleared.label)} 告捷</h2>
        <p class="gauntlet-reward-sub" data-tip="战后回血 ${Math.round(GAUNTLET_HEAL_RATIO * 100)}% 最大气血；劲力回满；势清零。">
          连胜 ${run.streak} · 彩金 <b class="gauntlet-pot">${run.pot}</b> · 破招 ${run.totalBreaks}${escapeHtml(potLine)} · 下一战 ${escapeHtml(next.label)}（${GAUNTLET_TIER_LABEL[next.tier]}）
        </p>
      </header>
      <div class="gauntlet-reward-row">${cards}</div>
      ${marketRow}
      ${cashout}
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
        <div class="gauntlet-result-breaks" data-tip="全场累计破招数">破招 ${run.totalBreaks} 次</div>
      </div>
      ${bankruptNote ? `<div class="gauntlet-result-potline">${escapeHtml(bankruptNote)}</div>` : ""}
      ${potLine}
      <div class="gauntlet-result-meta">
        <span data-tip="从选系到结算">用时 ${timeStr}</span>
        <span data-tip="localStorage · openhand-gauntlet-best">历史最佳 ${best ? `${best.streak} 馆 / 彩金 ${best.pot ?? 0} / 破招 ${best.breaks}` : "—"}</span>
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
        <p class="gauntlet-reward-desc">${escapeHtml(m.title)} · ${WEAPON_NAME[m.weapon]} · HP ${m.hp}</p>
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

export function renderGauntletOverlay(screen: "path" | "pick" | "banker" | "reward" | "result" | "companion" | "wager" | "lifeline" | "rewardTarget", inner: string): string {
  return `<div class="gauntlet-overlay" data-gauntlet-screen="${screen}">${inner}</div>`;
}

/** §31.9 第 4 馆后：随机三位同道三选一入伙（组合技/光环随之上场）。 */
export function renderGauntletCompanionPick(run: GauntletRun, choices: CompanionId[]): string {
  const cards = choices
    .map((id, i) => {
      const m = MATES[id];
      // §31.12 同系=光环，异系=组合技——选伙伴时就写明白这两条路的分别收益
      const cross = m.weapon !== run.school;
      const auraFx = tierFx(m.weapon, 1);
      const pathTag = cross
        ? `<em class="gauntlet-path-tag cross">异系 · 组合技</em>`
        : `<em class="gauntlet-path-tag same">同系 · 共鸣光环</em>`;
      const pathLine = cross
        ? `组合技解禁：${WEAPON_NAME[m.weapon]}×${WEAPON_NAME[run.school]} 跨系组合卡入牌库，双人可换可合`
        : `${WEAPON_NAME[m.weapon]}光环激活（双人档）：${auraFx?.label ?? ""}，全队生效`;
      const tip = `${m.name} · ${m.title}\n系别 ${WEAPON_NAME[m.weapon]} · 定位 ${m.role} · HP ${m.hp}\n${m.bio}\n${cross ? "异系同行：组合技解禁，可换人。" : `同系同行：${WEAPON_NAME[m.weapon]}光环双人档激活（${auraFx?.label ?? ""}），可换人。`}`;
      return `
      <button type="button" class="gauntlet-reward-card gauntlet-companion-card" data-companion-idx="${i}" data-tip="${escapeAttr(tip)}">
        ${pathTag}
        <b>${escapeHtml(m.name)} · ${escapeHtml(m.title ?? "")}</b>
        <p class="gauntlet-reward-desc">${escapeHtml(WEAPON_NAME[m.weapon])} · ${escapeHtml(m.role)} · HP ${m.hp}</p>
        <p class="gauntlet-reward-desc gauntlet-path-line">${escapeHtml(pathLine)}</p>
      </button>`;
    })
    .join("");
  return `
    <div class="gauntlet-shell gauntlet-companion">
      <header class="gauntlet-head">
        <h2>第4馆 告捷 · 同道来投</h2>
        <p class="gauntlet-reward-sub">连胜 ${run.streak} · 破招 ${run.totalBreaks} · 同系得光环，异系得组合技——你自己配</p>
      </header>
      <div class="gauntlet-reward-row">${cards}</div>
    </div>`;
}
