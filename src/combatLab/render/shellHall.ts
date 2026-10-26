import { readClimbContinue } from "../climbContinue";
import { gauntletFieldMate, loadGauntletBest, runCompanions, type GauntletRun } from "../gauntlet";
import { GAUNTLET_PATH_LABEL } from "../gauntletPaths";
import { BREAK_MODE_OPEN } from "../labRuleset";
import { mateDeck } from "../loadout";
import { isBreakDemoDone, isRookieDemoDone } from "../breakDemo";
import { MATES, WEAPON_NAME } from "../../game/party";
import type { CompanionId } from "../../game/types";
import { escapeAttr, escapeHtml } from "../setupUi";

export interface ShellHallMate {
  name: string;
  line: string;
}

export interface ShellContinue {
  replayLeft: number;
  stage: number;
  pot: number;
}

export interface ShellHallView {
  continueInfo: ShellContinue | null;
  team: ShellHallMate[];
  breakOpen: boolean;
  demoDone: boolean;
  rookieDone: boolean;
  bestLine: string;
  routes: string[];
}

function teamFromRun(run: GauntletRun): ShellHallMate[] {
  const hero = gauntletFieldMate(run.school);
  const ids = [hero, ...runCompanions(run).filter((id) => id !== hero)];
  return ids.map((id) => mateLine(run, id));
}

function mateLine(run: GauntletRun, id: CompanionId): ShellHallMate {
  const mate = MATES[id];
  const name = mate?.name ?? id;
  const weapon = mate ? WEAPON_NAME[mate.weapon] : "";
  const n = mateDeck(run, id).length;
  return { name, line: weapon ? `${weapon} · 出战 ${n} 张` : `出战 ${n} 张` };
}

function bestLine(): string {
  const best = loadGauntletBest(false);
  const endless = loadGauntletBest(true);
  return [
    best ? `正赛第 ${best.streak} 馆 · 彩金 ${best.pot ?? 0}` : "",
    endless ? `无尽第 ${endless.streak} 馆 · 彩金 ${endless.pot ?? 0}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

export function paintShellHall(info: ShellContinue | null): string {
  const snap = info ? readClimbContinue() : null;
  return renderShellHall({
    continueInfo: info,
    team: snap ? teamFromRun(snap.run) : [],
    breakOpen: BREAK_MODE_OPEN,
    demoDone: BREAK_MODE_OPEN && isBreakDemoDone(),
    rookieDone: isRookieDemoDone(),
    bestLine: bestLine(),
    routes: Object.values(GAUNTLET_PATH_LABEL),
  });
}

function openButton(info: ShellContinue | null): string {
  const label = info ? "另开一局" : "开打";
  const tip = info ? "另开一局十程。上一歇营地仍可续关。" : "正式行路。选路线，选兵器，十程彩金。";
  return `<button type="button" class="hall-gate hall-gate-kick shell-btn${info ? "" : " primary"}" id="start-gauntlet" data-tip="${escapeAttr(tip)}"><b>${label}</b></button>`;
}

function continueButton(info: ShellContinue | null): string {
  if (info) {
    const tip = `回到上一歇营地。奖励与黑市不重摇。还可再进 ${info.replayLeft} 次。`;
    return `<button type="button" class="hall-gate hall-gate-kick primary shell-btn" id="hall-continue" data-tip="${escapeAttr(tip)}"><b>续关 · 第 ${info.stage} 馆 · 余 ${info.replayLeft}</b></button>`;
  }
  return `<button type="button" class="hall-gate hall-gate-kick hall-gate-idle shell-btn" id="hall-continue" disabled data-tip="打过一馆歇脚后，门厅可再进营地两次。"><b>续关</b></button>`;
}

function primarySlot(info: ShellContinue | null): string {
  const button = info ? continueButton(info) : openButton(info);
  return `<div data-overlap-group="hall-primary">${button}</div>`;
}

function routeButtons(view: ShellHallView): string {
  const low = view.rookieDone ? "再练低阶" : "低阶";
  const lowTip = view.rookieDone ? "再练：出刀，格挡，走动，营地" : "四局：出刀，格挡，走动，营地。";
  const names = view.routes.map((name) => `<li>${escapeHtml(name)}</li>`).join("");
  return `<section class="shell-hall-routes" aria-label="路线">
    <h3>路线</h3>
    <ul class="shell-route-names">${names}</ul>
    <p class="shell-hall-route-note">进了行路再挑一条。</p>
    <div data-overlap-group="hall-routes">
      ${view.continueInfo ? openButton(view.continueInfo) : continueButton(view.continueInfo)}
      <button type="button" class="hall-gate hall-gate-kick shell-btn" id="start-gauntlet-endless" data-tip="更楼行路。比程数，同程比彩金。"><b>无尽</b></button>
      <button type="button" class="hall-gate hall-gate-compact shell-btn${view.rookieDone ? "" : " primary"}" id="start-rookie-demo" data-tip="${escapeAttr(lowTip)}"><b>${low}</b></button>
    </div>
  </section>`;
}

function teamBlock(team: ShellHallMate[]): string {
  const body = team.length
    ? `<div class="shell-team-row">${team
        .map(
          (mate) =>
            `<article class="shell-team-card"><b>${escapeHtml(mate.name)}</b><span>${escapeHtml(mate.line)}</span></article>`,
        )
        .join("")}</div>`
    : `<p class="shell-empty">还没有记下的队伍。</p>`;
  return `<section class="shell-hall-team" aria-label="队伍"><h3>队伍</h3>${body}</section>`;
}

function readRail(view: ShellHallView): string {
  if (!view.breakOpen) return "";
  const lesson = view.demoDone ? "再学新手关" : "新手关";
  const lessonTip = view.demoDone ? "再练：硬破，充能，让，破架，破眼，换人" : "六局：硬破，充能，让，破架，破眼，换人";
  const lessonClass = view.rookieDone && !view.demoDone ? " primary" : "";
  return `<aside class="shell-hall-read" aria-label="登门">
    <h3>登门</h3>
    <div data-overlap-group="hall-read">
      <button type="button" class="hall-gate hall-gate-compact shell-btn primary" id="start-break-campaign" data-tip="九关短拍。打谱看目标。"><b>登门</b></button>
      <button type="button" class="hall-gate hall-gate-compact shell-btn${lessonClass}" id="start-break-demo" data-tip="${escapeAttr(lessonTip)}"><b>${lesson}</b></button>
      <button type="button" class="hall-gate hall-gate-compact shell-btn" id="start-training-hall" data-tip="专项课。每课先引导再自由训练。"><b>训练馆</b></button>
      <button type="button" class="hall-gate hall-gate-compact hall-gate-soon shell-btn" id="start-break-weekly" disabled data-tip="制作中。周种子关。"><b>周挑战</b><span>即将开放</span></button>
    </div>
  </aside>`;
}

export function renderShellHall(view: ShellHallView): string {
  const board = view.bestLine ? `<p class="shell-hall-board">${escapeHtml(view.bestLine)}</p>` : "";
  return `<div class="gauntlet-shell gauntlet-home ritual-screen shell-hall" data-shell="hall">
    <header class="shell-hall-hero">
      <p class="shell-kicker">门厅</p>
      <h2>明手</h2>
      <p class="shell-hall-lead">选路线，再开打。</p>
    </header>
    <section class="shell-hall-primary" aria-label="开打">${primarySlot(view.continueInfo)}</section>
    ${routeButtons(view)}
    ${teamBlock(view.team)}
    ${board}
    ${readRail(view)}
  </div>`;
}

export function renderShellPath(inner: string): string {
  const marked = inner.replace(
    'class="gauntlet-school-row"',
    'class="gauntlet-school-row" data-overlap-group="path-routes"',
  );
  return `<div class="shell-path" data-shell="path">${marked}</div>`;
}
