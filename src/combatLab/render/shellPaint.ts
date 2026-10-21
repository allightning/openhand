import { S } from "../flow/shellState";
import { api } from "../flow/shellApi";
import { legalSummonCells, previewCard } from "../../game/sim";
import { shellRunContext } from "../shellContext";
import { recentReports } from "../storage";
import { balanceReport, balanceReportsByScenario } from "../telemetry";
import { renderProdBoard, renderHoverPreview } from "../prodBattleUi";
import { renderChromeActionsHtml, renderHeaderHtml, renderReportHtml, renderShellOverlays, type ShellExitMode, type ShellHeaderSub } from "../render/shellFrames";
import { overlayRecapBattle } from "../foePlayback";
import { threatCellsForHover } from "../labV2Ui";
import { GAUNTLET_PATH_LABEL } from "../gauntletPaths";
import { overlayPoolFor, takeSceneBg, staticOverlayBg } from "../sceneBg";
import { renderGauntletOverlay } from "../gauntletUi";

function paintGauntletOverlay(
  screen: Parameters<typeof renderGauntletOverlay>[0],
  inner: string,
): string {
  if (!S.gauntletRun) return renderGauntletOverlay(screen, inner, staticOverlayBg(screen));
  const placeStage =
    screen === "wager" || screen === "lifeline" || screen === "finale" || screen === "scar" || screen === "opening"
      ? S.gauntletRun.stage
      : Math.max(1, S.gauntletRun.stage - (screen === "path" || screen === "pick" || screen === "banker" || screen === "intro" ? 0 : 1));
  const key = `${screen}:${S.gauntletRun.path}:${placeStage}`;
  const pool = overlayPoolFor(screen, S.gauntletRun.path, S.gauntletEventKind ?? undefined, placeStage);
  const t = takeSceneBg(S.gauntletRun, key, pool);
  S.gauntletRun = t.run;
  return renderGauntletOverlay(screen, inner, t.url);
}
api.paintGauntletOverlay = paintGauntletOverlay;

function shellExitMode(): ShellExitMode {
  if (S.breakDemoRun) return "demo";
  if (S.hallRun) return "hall";
  if (S.campaignRun) return "campaign";
  if (S.gauntletRun) return "gauntlet";
  return null;
}
api.shellExitMode = shellExitMode;

function headerSub(): ShellHeaderSub {
  if (S.breakDemoRun) return "demo";
  if (S.hallRun) return "hall";
  if (S.campaignRun) return "campaign";
  return "road";
}
api.headerSub = headerSub;

function renderOverlays(): string {
  return renderShellOverlays({
    guideOpen: S.guideOpen,
    wiki: S.wikiOpen ? { book: S.wikiOpen, page: S.wikiPage, query: S.wikiQuery } : null,
    devPanelOpen: S.devPanelOpen,
    battleSheet: S.battleSheet && S.battle ? { kind: S.battleSheet, battle: S.battle } : null,
    route:
      S.routeBookOpen && S.gauntletRun
        ? { log: S.gauntletRun.routeLog ?? [], pathLabel: GAUNTLET_PATH_LABEL[S.gauntletRun.path] }
        : null,
  });
}
api.renderOverlays = renderOverlays;

function renderChromeActions(): string {
  return renderChromeActionsHtml({ fullscreen: S.labFullscreen, phase: S.phase, exitMode: api.shellExitMode() });
}
api.renderChromeActions = renderChromeActions;

function renderHeader(): string {
  return renderHeaderHtml({ phase: S.phase, sub: api.headerSub(), chrome: api.renderChromeActions() });
}
api.renderHeader = renderHeader;

function labShell(): { content: HTMLElement; overlays: HTMLElement } {
  let content = S.root.querySelector<HTMLElement>("#lab-content");
  let overlays = S.root.querySelector<HTMLElement>("#lab-overlay-mount");
  if (!content || !overlays) {
    S.root.replaceChildren();
    content = document.createElement("div");
    content.id = "lab-content";
    overlays = document.createElement("div");
    overlays.id = "lab-overlay-mount";
    S.root.append(content, overlays);
  }
  return { content, overlays };
}
api.labShell = labShell;

function renderReport(): string {
  const report = S.telemetry ? balanceReport(S.telemetry) : "无数据";
  const scenarioBlock = balanceReportsByScenario(recentReports());
  const history = recentReports()
    .slice(0, 5)
    .map((r, i) => `<button type="button" class="lab-btn" data-report-idx="${i}">${r.meta.presetName} · ${r.outcome ?? "?"}</button>`)
    .join(" ");
  return renderReportHtml(api.renderHeader(), report, scenarioBlock, history);
}
api.renderReport = renderReport;

function paintHoverBoard(): void {
  if (S.phase !== "battle" || !S.battle) return;
  let b = S.battle;
  if (S.playbackShow) b = overlayRecapBattle(b, S.playbackShow);
  // 悬停任意牌：全量预演同时驱动棋盘落点小人与底部预演条
  const prev = S.hoverUid ? previewCard(b, S.hoverUid, shellRunContext()) : null;
  const pslot = S.root.querySelector("#preview-slot");
  if (pslot) pslot.outerHTML = renderHoverPreview(b, prev);
  const slot = S.root.querySelector("#strip");
  if (!slot) return;
  slot.innerHTML = renderProdBoard(
    b,
    prev,
    threatCellsForHover(b, S.hoverIntentIdx),
    S.summonPending && S.battle ? legalSummonCells(S.battle, shellRunContext()) : [],
    {
      youAnim: S.youPlayAnim
        ? `board-anim-${S.youPlayAnim === "swing" ? "hit" : S.youPlayAnim === "step" ? "windup" : "break"}`
        : undefined,
      foeAnim: S.youPlayAnim === "swing" ? "board-anim-hit" : S.foeSegAnim ? `board-anim-${S.foeSegAnim}` : undefined,
      slashTick: S.youPlayAnim === "swing" ? 1 : S.foePlaybackSegIdx >= 0 ? S.foePlaybackSegIdx : 0,
    },
  );
}
api.paintHoverBoard = paintHoverBoard;
