import { escapeHtml } from "./setupUi";
import {
  CAMPAIGN_STAGES,
  campaignBadge,
  campaignGoalLine,
  currentCampaignStage,
  type BreakCampaignRun,
} from "./breakCampaign";

export function renderCampaignCleared(run: BreakCampaignRun, chapterDone: boolean): string {
  const stage = currentCampaignStage(run);
  if (chapterDone) {
    return `
      <div class="gauntlet-shell hall-settle work-screen">
        <header class="hall-chrome">
          <button type="button" class="lab-btn hall-back" id="campaign-back-home">回门厅</button>
          <div class="hall-chrome-title">
            <h2>读招战役 · 通关</h2>
            <p>硬拆累计 ${run.totalHardBreaks} · 硬核试玩通关。周挑战仍制作中。</p>
          </div>
        </header>
        <div class="hall-settle-actions">
          <button type="button" class="lab-btn primary large" id="campaign-back-home">回门厅</button>
          <button type="button" class="lab-btn" id="campaign-restart">再打一章</button>
        </div>
      </div>`;
  }
  const next = CAMPAIGN_STAGES[run.stageIndex + 1];
  const nextLabel = next ? escapeHtml(next.title) : "通关";
  return `
    <div class="gauntlet-shell hall-settle work-screen">
      <header class="hall-chrome">
        <button type="button" class="lab-btn hall-back" id="campaign-back-home">回门厅</button>
        <div class="hall-chrome-title">
          <h2>${escapeHtml(stage.title)} · 过了</h2>
          <p>${escapeHtml(campaignGoalLine(run))} 达标${next ? ` · 下一关：${nextLabel}` : ""}</p>
        </div>
      </header>
      <div class="hall-settle-actions">
        <button type="button" class="lab-btn primary large" id="campaign-next">下一关 · ${nextLabel}</button>
        <button type="button" class="lab-btn" data-campaign-home>回门厅</button>
      </div>
    </div>`;
}

export function renderCampaignRetry(run: BreakCampaignRun): string {
  const stage = currentCampaignStage(run);
  const tip = run.lastFailTip || stage.failTip;
  return `
    <div class="gauntlet-shell hall-settle work-screen">
      <header class="hall-chrome">
        <button type="button" class="lab-btn hall-back" id="campaign-back-home">回门厅</button>
        <div class="hall-chrome-title">
          <h2>${escapeHtml(stage.title)} · 未过</h2>
          <p>${escapeHtml(tip)}</p>
          <p class="hall-detail-blurb">通关条件：${escapeHtml(campaignGoalLine(run))} · ${escapeHtml(campaignBadge(run))}</p>
        </div>
      </header>
      <div class="hall-settle-actions">
        <button type="button" class="lab-btn primary large" id="campaign-retry">再试本关</button>
        <button type="button" class="lab-btn" data-campaign-home>回门厅</button>
      </div>
    </div>`;
}
