import { STATUS_ENTRIES } from "../game/codex";
import { MATES, MATE_PASSIVE, WEAPON_NAME, WEAPON_PACE, SCHOOL_REACH, ROLE_LABEL } from "../game/party";
import type { CompanionId } from "../game/types";
import { ALL_MATE_IDS } from "./arsenal";
import { searchCatalog, type CodexEntry, type CodexKind } from "./codexCatalog";
import { climbVitals, climbMateTier } from "./climbVitals";
import { rogueMate } from "./rogueRoster";
import { escapeHtml } from "./setupUi";

export type WikiBook = "ult" | "skill" | "gear" | "status" | "mates";

export const WIKI_BOOKS: { id: WikiBook; btn: string; title: string }[] = [
  { id: "ult", btn: "绝", title: "绝招图鉴" },
  { id: "skill", btn: "技", title: "技法图鉴" },
  { id: "gear", btn: "兵", title: "兵刃图鉴" },
  { id: "status", btn: "状态", title: "状态效果" },
  { id: "mates", btn: "人物", title: "人物志" },
];

const PAGE_SIZE: Record<WikiBook, number> = {
  ult: 6,
  skill: 6,
  gear: 4,
  status: 8,
  mates: 2,
};

const SIDE_LABEL: Record<string, string> = {
  you: "己方",
  foe: "敌方",
  both: "双方",
  intent: "意图",
};

function asKind(book: WikiBook): CodexKind | null {
  if (book === "ult" || book === "skill" || book === "gear") return book;
  return null;
}

function bookItems(book: WikiBook, query: string): unknown[] {
  const kind = asKind(book);
  if (kind) return searchCatalog(kind, query);
  if (book === "status") {
    const q = query.trim().toLowerCase();
    const all = STATUS_ENTRIES.map((s) => ({
      kicker: SIDE_LABEL[s.side] ?? s.side,
      name: s.name,
      text: s.text,
      id: s.id,
    }));
    if (!q) return all;
    return all.filter((s) => `${s.id} ${s.name} ${s.text} ${s.kicker}`.toLowerCase().includes(q));
  }
  const mates = ALL_MATE_IDS.map((id) => MATES[id as CompanionId]);
  const q = query.trim().toLowerCase();
  if (!q) return mates;
  return mates.filter((m) => `${m.id} ${m.name} ${m.title} ${m.bio ?? ""}`.toLowerCase().includes(q));
}

export function wikiPageSize(book: WikiBook): number {
  return PAGE_SIZE[book];
}

export function wikiPageCount(book: WikiBook, query = ""): number {
  const n = bookItems(book, query).length;
  return Math.max(1, Math.ceil(n / wikiPageSize(book)));
}

function pageSlice(book: WikiBook, page: number, query: string): number {
  return Math.max(0, Math.min(page, wikiPageCount(book, query) - 1));
}

function itemRange(book: WikiBook, page: number, query: string): { start: number; end: number } {
  const size = wikiPageSize(book);
  const start = pageSlice(book, page, query) * size;
  const items = bookItems(book, query);
  return { start, end: Math.min(items.length, start + size) };
}

function relatedHtml(related: CodexEntry["related"]): string {
  if (!related.length) return "";
  const bits = related.map((r) => escapeHtml(r.name)).join("、");
  return `<p class="lab-wiki-related"><b>本系招式</b>${bits}</p>`;
}

function renderCodexEntry(e: CodexEntry): string {
  return `
    <article class="lab-wiki-entry ${e.kind} fill" data-codex-id="${escapeHtml(e.id)}">
      <div class="lab-wiki-kicker">${escapeHtml(e.kicker)}</div>
      <h3>${escapeHtml(e.name)}</h3>
      <p class="lab-wiki-lead">${escapeHtml(e.text).replace(/\n/g, "<br/>")}</p>
      ${e.flavor ? `<p class="lab-wiki-flavor">${escapeHtml(e.flavor)}</p>` : ""}
      ${relatedHtml(e.related)}
    </article>`;
}

function renderMateEntry(id: CompanionId): string {
  const m = MATES[id];
  const passive = MATE_PASSIVE[id];
  const vitals = climbVitals(id);
  const tier = climbMateTier(id);
  const rogue = rogueMate(id);
  const pace = WEAPON_PACE[m.weapon] + (rogue?.paceBonus ?? 0);
  const reach = SCHOOL_REACH[m.weapon];
  return `
    <article class="lab-wiki-entry mate fill">
      <div class="lab-wiki-kicker">${escapeHtml(m.title)} · ${WEAPON_NAME[m.weapon]} · ${ROLE_LABEL[m.role]} · ${tier}档</div>
      <h3>${escapeHtml(m.name)}</h3>
      <p class="lab-wiki-lead">${escapeHtml(m.bio ?? m.title)}</p>
      <dl class="lab-wiki-stats compact">
        <div><dt>气血</dt><dd>${vitals.hp}</dd></div>
        <div><dt>劲力</dt><dd>${vitals.energyMax}（开局 ${vitals.energyStart} · 收势回 ${vitals.energyRegen}）</dd></div>
        <div><dt>先机</dt><dd>${pace}</dd></div>
        <div><dt>兵刃距离</dt><dd>${reach} 格</dd></div>
        ${rogue ? `<div><dt>入队技能</dt><dd>${escapeHtml(rogue.skillName)} — ${escapeHtml(rogue.skillText)}</dd></div>` : ""}
        ${passive ? `<div class="lab-wiki-passive"><dt>被动</dt><dd>${escapeHtml(passive.name)} — ${escapeHtml(passive.text)}</dd></div>` : ""}
      </dl>
    </article>`;
}

function statusCapLine(text: string): string {
  const caps = [
    ...[...text.matchAll(/上限\s*(\d+)/g)].map((m) => m[1]),
    ...[...text.matchAll(/帽\s*(\d+)/g)].map((m) => m[1]),
  ];
  if (!caps.length) return "";
  return `<p class="lab-wiki-nums">上限 / 帽 ${[...new Set(caps)].join(" / ")}</p>`;
}

function renderStatusEntry(entry: { kicker: string; name: string; text: string }): string {
  return `
    <article class="lab-wiki-entry guide status fill">
      <div class="lab-wiki-kicker">${escapeHtml(entry.kicker)}</div>
      <h3>${escapeHtml(entry.name)}</h3>
      <p class="lab-wiki-lead">${escapeHtml(entry.text)}</p>
      ${statusCapLine(entry.text)}
    </article>`;
}

function gridClass(book: WikiBook): string {
  if (book === "ult" || book === "skill") return "lab-wiki-grid cards-6 fill-grid";
  if (book === "status") return "lab-wiki-grid status fill-grid";
  if (book === "gear") return "lab-wiki-grid duo fill-grid";
  return "lab-wiki-grid duo fill-grid";
}

export function renderWikiBody(book: WikiBook, page: number, query = ""): string {
  const items = bookItems(book, query);
  const { start, end } = itemRange(book, page, query);
  const chunks: string[] = [];
  for (let i = start; i < end; i++) {
    if (asKind(book)) chunks.push(renderCodexEntry(items[i] as CodexEntry));
    else if (book === "status") chunks.push(renderStatusEntry(items[i] as { kicker: string; name: string; text: string }));
    else chunks.push(renderMateEntry((items[i] as { id: CompanionId }).id));
  }
  if (!chunks.length) chunks.push(`<p class="lab-wiki-empty">没有匹配「${escapeHtml(query)}」的条目。</p>`);
  return `<div class="${gridClass(book)}">${chunks.join("")}</div>`;
}

export function renderWikiSheet(book: WikiBook, page: number, query = ""): string {
  const meta = WIKI_BOOKS.find((b) => b.id === book)!;
  const totalPages = wikiPageCount(book, query);
  const cur = pageSlice(book, page, query);
  const { start, end } = itemRange(book, cur, query);
  const itemTotal = bookItems(book, query).length;
  const sub = itemTotal ? `第 ${start + 1}${end > start + 1 ? `–${end}` : ""} 条 · 共 ${itemTotal} 条` : "无匹配";

  return `
    <div class="lab-wiki-mask" id="lab-wiki-mask">
      <div class="lab-wiki-panel lab-iron-sheet">
        <header class="lab-wiki-head">
          <div class="lab-wiki-tabs">
            ${WIKI_BOOKS.map(
              (b) =>
                `<button type="button" class="lab-wiki-tab ${b.id === book ? "active" : ""}" data-wiki-book="${b.id}" data-sfx="ui-click">${b.btn}</button>`,
            ).join("")}
          </div>
          <div class="lab-wiki-head-tools">
            <input type="search" class="lab-wiki-search" id="lab-wiki-search" placeholder="搜名称或 id" value="${escapeHtml(query)}" autocomplete="off" />
            <button type="button" class="lab-wiki-close" id="lab-wiki-close" data-sfx="ui-click" aria-label="关闭">×</button>
          </div>
        </header>
        <div class="lab-wiki-body">
          <div class="lab-wiki-title-row">
            <h2 class="lab-wiki-title">${meta.title}</h2>
            <span class="lab-wiki-sub">${sub}</span>
          </div>
          ${renderWikiBody(book, cur, query)}
        </div>
        <footer class="lab-wiki-foot">
          <button type="button" class="lab-btn" data-wiki-prev data-sfx="ui-click" ${cur <= 0 ? "disabled" : ""}>‹ 上一页</button>
          <span class="lab-wiki-page">${cur + 1} / ${totalPages}</span>
          <button type="button" class="lab-btn" data-wiki-next data-sfx="ui-click" ${cur >= totalPages - 1 ? "disabled" : ""}>下一页 ›</button>
        </footer>
      </div>
    </div>`;
}

export function renderWikiNavButtons(): string {
  return WIKI_BOOKS.map((b) => `<button type="button" class="lab-btn lab-wiki-open" data-wiki-open="${b.id}">${b.btn}</button>`).join("");
}
