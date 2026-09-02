import { escapeHtml } from "./setupUi";
import {
  HALL_COURSES,
  hallCoursesIn,
  hallTitle,
  type HallCabinet,
  type HallCourse,
  type HallCourseId,
  type HallRun,
} from "./trainingHall";

export function renderTrainingHallCatalog(
  cab: HallCabinet = "break",
  focusId?: HallCourseId,
): string {
  const courses = hallCoursesIn(cab);
  const focus = courses.find((c) => c.id === focusId) ?? courses[0]!;
  const rail = courses.map((c) => railItem(c, c.id === focus.id)).join("");
  return `
    <div class="gauntlet-shell hall-catalog work-screen">
      <header class="hall-chrome">
        <button type="button" class="lab-btn hall-back" id="hall-back-home">回门厅</button>
        <div class="hall-chrome-title">
          <h2>训练馆</h2>
          <p>引导锁牌 · 训练自由打 · 不走彩金</p>
        </div>
        <nav class="hall-cab-tabs" aria-label="柜">
          <button type="button" class="lab-btn ${cab === "break" ? "active" : ""}" data-hall-cab="break">破招</button>
          <button type="button" class="lab-btn ${cab === "weapon" ? "active" : ""}" data-hall-cab="weapon">兵器</button>
          <button type="button" class="lab-btn ${cab === "camp" ? "active" : ""}" data-hall-cab="camp">营地</button>
        </nav>
      </header>
      <div class="hall-body">
        <aside class="hall-rail">${rail}</aside>
        <section class="hall-detail">
          <p class="hall-detail-kicker">${cab === "break" ? "破招柜" : cab === "camp" ? "营地柜" : "兵器柜"}</p>
          <h3>${escapeHtml(focus.title)}</h3>
          <p class="hall-detail-blurb">${escapeHtml(focus.blurb)}</p>
          <div class="hall-detail-btns">
            <button type="button" class="lab-btn large" data-hall-start="${focus.id}" data-hall-bout="1">引导</button>
            <button type="button" class="lab-btn primary large" data-hall-start="${focus.id}" data-hall-bout="2">训练</button>
          </div>
        </section>
      </div>
    </div>`;
}

function railItem(c: HallCourse, active: boolean): string {
  return `
    <button type="button" class="hall-rail-item ${active ? "active" : ""}" data-hall-focus="${c.id}">
      <b>${escapeHtml(c.title)}</b>
    </button>`;
}

export function renderHallCleared(run: HallRun): string {
  const guided = run.bout === 1;
  return `
    <div class="gauntlet-shell hall-settle work-screen">
      <header class="hall-chrome">
        <button type="button" class="lab-btn hall-back" id="hall-back-catalog">回目录</button>
        <div class="hall-chrome-title">
          <h2>${escapeHtml(hallTitle(run))} · 过了</h2>
          <p>${guided ? "引导打完。训练关不锁牌。" : "训练过了。可再打，或换一课。"}</p>
        </div>
      </header>
      <div class="hall-settle-actions">
        ${guided ? `<button type="button" class="lab-btn primary large" id="hall-goto-drill">去训练关</button>` : `<button type="button" class="lab-btn primary large" id="hall-retry">再打训练</button>`}
        ${guided ? `<button type="button" class="lab-btn" id="hall-retry">再打引导</button>` : `<button type="button" class="lab-btn" id="hall-goto-guide">再打引导</button>`}
      </div>
    </div>`;
}

export function renderHallRetry(run: HallRun): string {
  return `
    <div class="gauntlet-shell hall-settle work-screen">
      <header class="hall-chrome">
        <button type="button" class="lab-btn hall-back" id="hall-back-catalog">回目录</button>
        <div class="hall-chrome-title">
          <h2>${escapeHtml(hallTitle(run))} · 未过</h2>
          <p>训练馆可重打，不扣正式进度。</p>
        </div>
      </header>
      <div class="hall-settle-actions">
        <button type="button" class="lab-btn primary large" id="hall-retry">再试本关</button>
      </div>
    </div>`;
}

export function hallBadge(run: HallRun): string {
  return `<span class="gauntlet-badge" data-tip="训练馆">${escapeHtml(hallTitle(run))}</span>`;
}

export { HALL_COURSES };
