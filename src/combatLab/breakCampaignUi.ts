import { escapeHtml } from "./setupUi";
import {
  CAMPAIGN_STAGES,
  campaignBadge,
  campaignGoalLine,
  currentCampaignStage,
  type BreakCampaignRun,
  type CampaignStage,
} from "./breakCampaign";

function courseHead(stage: CampaignStage): string {
  return stage.tier === "advanced" ? "进修" : "下一课";
}

export function renderCampaignCleared(run: BreakCampaignRun, chapterDone: boolean): string {
  const stage = currentCampaignStage(run);
  if (chapterDone) {
    return `
      <div class="gauntlet-shell hall-settle work-screen">
        <header class="hall-chrome">
          <button type="button" class="lab-btn hall-back" id="campaign-back-home">回门厅</button>
          <div class="hall-chrome-title">
            <h2>自我修行 · 练完</h2>
            <p>硬拆累计 ${run.totalHardBreaks}。课表练完。</p>
          </div>
        </header>
        <div class="hall-settle-actions">
          <button type="button" class="lab-btn primary large" id="campaign-back-home">回门厅</button>
          <button type="button" class="lab-btn" id="campaign-restart">再练一遍</button>
        </div>
      </div>`;
  }
  const next = CAMPAIGN_STAGES[run.stageIndex + 1];
  const nextLabel = next ? escapeHtml(next.title) : "练完";
  const nextHead = next ? courseHead(next) : "练完";
  return `
    <div class="gauntlet-shell hall-settle work-screen">
      <header class="hall-chrome">
        <button type="button" class="lab-btn hall-back" id="campaign-back-home">回门厅</button>
        <div class="hall-chrome-title">
          <h2>${escapeHtml(stage.title)} · 过了</h2>
          <p>${escapeHtml(campaignGoalLine(run))}${next ? ` · ${nextHead}：${nextLabel}` : ""}</p>
        </div>
      </header>
      <div class="hall-settle-actions">
        <button type="button" class="lab-btn primary large" id="campaign-next">${nextHead} · ${nextLabel}</button>
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
          <p class="hall-detail-blurb">这一课：${escapeHtml(campaignGoalLine(run))} · ${escapeHtml(campaignBadge(run))}</p>
        </div>
      </header>
      <div class="hall-settle-actions">
        <button type="button" class="lab-btn primary large" id="campaign-retry">再练这一课</button>
        <button type="button" class="lab-btn" data-campaign-home>回门厅</button>
      </div>
    </div>`;
}
