import { renderBattleSheet, type BattleSheetKind } from "../battleSheet";
import { renderRouteBook, type RouteLogEntry } from "../climbPlaces";
import { renderDevPanelModal } from "../devPanel";
import { renderWikiSheet, type WikiBook } from "../encyclopedia";
import { renderGuideSheet } from "../guide";
import type { Battle } from "../../game/types";
import { escapeHtml } from "../setupUi";

export type ShellExitMode = "demo" | "hall" | "campaign" | "gauntlet" | null;
export type ShellHeaderSub = "demo" | "hall" | "campaign" | "road";

/** 顶栏系统钮。入参已经算好，函数内不读壳层变量。 */
export function renderChromeActionsHtml(o: {
  fullscreen: boolean;
  phase: string;
  exitMode: ShellExitMode;
}): string {
  const fsLabel = o.fullscreen ? "退出全屏" : "全屏";
  const inRun = o.exitMode != null;
  const exitLabel =
    o.exitMode === "demo"
      ? "退出示范"
      : o.exitMode === "hall"
        ? "退出训练馆"
        : o.exitMode === "campaign"
          ? "退出登门"
          : "退出行路";
  const backBtn =
    o.phase === "battle" && inRun
      ? `<button type="button" class="lab-btn" id="gauntlet-exit-battle">${exitLabel}</button>`
      : o.phase !== "setup" && !inRun
        ? `<button type="button" class="lab-btn" id="lab-back-setup">回装配</button>`
        : "";
  return `<div class="lab-actions">
        <button type="button" class="lab-btn lab-guide-btn" id="lab-guide-open">攻略</button>
        <button type="button" class="lab-btn" id="lab-codex-open">图鉴</button>
        <button type="button" class="lab-btn" id="lab-settings-open">设置</button>
        <button type="button" class="lab-btn" id="lab-dev-open">实验台</button>
        <button type="button" class="lab-btn" id="lab-fullscreen">${fsLabel}</button>
        ${backBtn}
      </div>`;
}

/** 非战斗页顶栏。战斗页返回空串，避免和石台顶栏叠两层。 */
export function renderHeaderHtml(o: { phase: string; sub: ShellHeaderSub; chrome: string }): string {
  if (o.phase === "battle") return "";
  const subLine =
    o.sub === "demo" ? "训练营 ·" : o.sub === "hall" ? "训练馆 ·" : o.sub === "campaign" ? "登门 ·" : "行路 · 石台两种玩法 ·";
  return `
    <header class="lab-header">
      <div class="lab-title-block">
        <h1>明手</h1>
        <p class="lab-sub">${subLine} <span class="lab-build-tag">第十二版</span></p>
      </div>
      ${o.chrome}
    </header>`;
}

/** 攻略 / 图鉴 / 实验台 / 路书。开关由壳层传入。 */
export function renderShellOverlays(o: {
  guideOpen: boolean;
  wiki: { book: WikiBook; page: number; query: string } | null;
  devPanelOpen: boolean;
  battleSheet: { kind: BattleSheetKind; battle: Battle } | null;
  route: { log: RouteLogEntry[]; pathLabel: string } | null;
}): string {
  const parts: string[] = [];
  if (o.guideOpen) parts.push(renderGuideSheet());
  if (o.wiki) parts.push(renderWikiSheet(o.wiki.book, o.wiki.page, o.wiki.query));
  if (o.devPanelOpen) parts.push(renderDevPanelModal());
  if (o.battleSheet) parts.push(renderBattleSheet(o.battleSheet.kind, o.battleSheet.battle));
  if (o.route) parts.push(renderRouteBook(o.route.log, o.route.pathLabel));
  return parts.join("");
}

/** 埋点屏。报告正文由壳层算好再送进来。 */
export function renderReportHtml(header: string, report: string, scenario: string, historyHtml: string): string {
  return `
    ${header}
    <div class="lab-report">
      <h2>埋点 / 平衡报告</h2>
      <pre id="report-text">${escapeHtml(report)}</pre>
      <h3>分场景汇总</h3>
      <pre class="lab-scenario-reports">${escapeHtml(scenario)}</pre>
      <div style="margin:0.75rem 0;display:flex;gap:0.35rem;flex-wrap:wrap;">${historyHtml}</div>
      <button type="button" class="lab-btn primary" id="lab-new">再开一局</button>
    </div>`;
}
