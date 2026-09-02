import { escapeHtml } from "./setupUi";
import {
  companionWeaponLabel,
  demoMarketOffers,
  demoRewardOptions,
  demoStageTitle,
  DEMO_COMPANION_CHOICES,
  DEMO_FIST_MATE,
  type BreakDemoRun,
  type DemoFoeDebrief,
  type DemoStage,
} from "./breakDemo";

export function renderDemoReward(run: BreakDemoRun): string {
  const opts = demoRewardOptions(run.stage);
  const cards = opts
    .map(
      (o, i) => `
      <button type="button" class="gauntlet-reward-card" data-demo-reward="${i}" data-tip="${escapeHtml(o.tip)}">
        <em>残谱</em>
        <b>${escapeHtml(o.title)}</b>
        <p class="gauntlet-reward-desc">${escapeHtml(o.tip)}</p>
      </button>`,
    )
    .join("");
  return `
    <div class="gauntlet-shell">
      <header class="gauntlet-head">
        <h2>${escapeHtml(demoStageTitle(run.stage, run.track ?? "break"))} · 告捷</h2>
        <p>彩金 <b class="gauntlet-pot">${run.pot}</b> · 选一张</p>
      </header>
      <div class="gauntlet-reward-row">${cards}</div>
    </div>`;
}

export function renderDemoMarket(run: BreakDemoRun, bought: Set<string> = new Set()): string {
  const offers = demoMarketOffers(run.pot);
  const stall = offers
    .map((o) => {
      const sold = bought.has(o.id);
      const poor = run.pot < o.price;
      return `
      <button type="button" class="gauntlet-market-card" data-demo-market="${o.id}" data-tip="${escapeHtml(o.tip)}" ${sold || poor ? "disabled" : ""}>
        <b>${escapeHtml(o.title)}</b>
        <span class="gauntlet-market-price">${sold ? "已购" : `${o.price} 彩金`}</span>
      </button>`;
    })
    .join("");
  return `
    <div class="gauntlet-shell">
      <header class="gauntlet-head">
        <h2>黑市</h2>
        <p>彩金 <b class="gauntlet-pot">${run.pot}</b> · 可不买</p>
      </header>
      <div class="gauntlet-market-row">${stall || "<p>暂无货物</p>"}</div>
      <div class="gauntlet-wager-actions">
        <button type="button" class="lab-btn primary large" id="demo-market-continue">继续</button>
      </div>
    </div>`;
}

export function renderDemoCompanion(_run: BreakDemoRun): string {
  const cards = DEMO_COMPANION_CHOICES.map((id) => {
    const fist = id === DEMO_FIST_MATE;
    return `
      <button type="button" class="gauntlet-path-card ${fist ? "demo-fist-pick" : ""}" data-demo-companion="${id}" ${fist ? "" : "disabled"}
        data-tip="${fist ? "选拳，下一局换人" : "本关先选拳"}">
        <b>${escapeHtml(companionWeaponLabel(id))} · ${escapeHtml(id === "rail" ? "轨刃" : id === "guard" ? "西门远山" : "沈夯")}</b>
        <em>${fist ? "换人教学" : "锁拳"}</em>
        <span class="gauntlet-school-meta">${companionWeaponLabel(id)}系</span>
      </button>`;
  }).join("");
  return `
    <div class="gauntlet-shell">
      <header class="gauntlet-head">
        <h2>同道 · 选拳</h2>
        <p>三人三系。先选拳，下一局点换人。</p>
      </header>
      <div class="gauntlet-school-row">${cards}</div>
    </div>`;
}

export function renderDemoGraduate(run: BreakDemoRun): string {
  return `
    <div class="gauntlet-shell">
      <header class="gauntlet-head">
        <h2>训练营完成</h2>
        <p>硬拆、充能、让、破架、破眼、换人都过了一遍。<br/>回门厅后可再练，或开踢。</p>
        <p>硬拆 ${run.totalBreaks} · 彩金 ${run.pot}</p>
      </header>
      <div class="gauntlet-wager-actions">
        <button type="button" class="lab-btn primary large" id="demo-graduate-go">回门厅</button>
      </div>
    </div>`;
}

export type DemoShellScreen = "reward" | "market" | "companion" | "graduate";

export function renderDemoShell(screen: DemoShellScreen, run: BreakDemoRun, marketBought?: Set<string>): string {
  if (screen === "reward") return renderDemoReward(run);
  if (screen === "market") return renderDemoMarket(run, marketBought);
  if (screen === "companion") return renderDemoCompanion(run);
  return renderDemoGraduate(run);
}

export function demoBadge(stage: DemoStage, track: "rookie" | "break" = "break"): string {
  return `<span class="gauntlet-badge" data-tip="训练营">${escapeHtml(demoStageTitle(stage, track))}</span>`;
}

/** 收势后：系统讲解敌这一步在干什么、为什么、你对上了什么。 */
export function renderDemoFoeDebrief(d: DemoFoeDebrief): string {
  return `
    <div class="lab-overlay demo-foe-debrief" id="demo-foe-debrief">
      <div class="lab-overlay-panel demo-foe-debrief-panel">
        <em class="demo-foe-debrief-tag">这一步</em>
        <h3>${escapeHtml(d.title)}</h3>
        <p>${escapeHtml(d.body)}</p>
        <button type="button" class="lab-btn primary large" id="demo-foe-debrief-ok">继续</button>
      </div>
    </div>`;
}

