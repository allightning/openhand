import { CARDS, TECHNIQUES } from "../game/content";
import { STATUS_ENTRIES } from "../game/codex";
import { cardDisplayText, godSkillText, pathSkillText } from "../game/cardTextV2";
import { MATES, MATE_PASSIVE, WEAPON_NAME } from "../game/party";
import { schoolLabel } from "../game/party";
import type { CardId, CompanionId, TechniqueId, WeaponId } from "../game/types";
import { gearById, GOD_SKILL, PATH_SKILL, TIER_NAME } from "../game/weapons";
import { ALL_CARD_IDS, ALL_MATE_IDS, ALL_TECHNIQUE_IDS, ALL_WEAPON_IDS } from "./arsenal";
import { escapeHtml } from "./setupUi";

export type WikiBook = "weapons" | "techniques" | "cards" | "mates" | "status" | "resonance";

export const WIKI_BOOKS: { id: WikiBook; btn: string; title: string }[] = [
  { id: "weapons", btn: "兵刃", title: "兵刃图鉴" },
  { id: "techniques", btn: "外功", title: "外功图鉴" },
  { id: "cards", btn: "谱", title: "招式谱" },
  { id: "mates", btn: "人物", title: "人物志" },
  { id: "status", btn: "状态", title: "状态效果" },
  { id: "resonance", btn: "共鸣", title: "共鸣效果" },
];

const PAGE_SIZE: Record<WikiBook, number> = {
  weapons: 2,
  techniques: 2,
  cards: 6,
  mates: 2,
  status: 8,
  resonance: 6,
};

const SIDE_LABEL: Record<string, string> = {
  you: "己方",
  foe: "敌方",
  both: "双方",
  intent: "意图",
};

interface StatusGuideEntry {
  kicker: string;
  name: string;
  text: string;
}

interface ResonanceGuideEntry {
  school: WeaponId;
  name: string;
  text: string;
}

const STATUS_ALL: StatusGuideEntry[] = STATUS_ENTRIES.map((s) => ({
  kicker: SIDE_LABEL[s.side] ?? s.side,
  name: s.name,
  text: s.text,
}));

const RESONANCE_ALL: ResonanceGuideEntry[] = [
  { school: "palm", name: "入门（2同）", text: "全队拳掌 2 人：击退 +1。" },
  { school: "palm", name: "登堂（3同）", text: "全队拳掌 3 人：撞壁伤 +3。" },
  { school: "palm", name: "宗师（4同）", text: "全队拳掌 4 人：推撞成功回劲 +1。" },
  { school: "saber", name: "跨系组合", text: "助战属性仅跨系生效；同系解锁同门合击卡（§16.4）。" },
  { school: "sword", name: "百花齐放", text: "四系全异：先机 +1；助战耗劲 -1；首张组合卡 -1 劲（§17.3，需组合技开关）。" },
  { school: "staff", name: "三主角同框", text: "三主角任意两人在后场：开战势 +1（彩蛋，不占阶梯）。" },
];

function bookItems(book: WikiBook): unknown[] {
  if (book === "weapons") return ALL_WEAPON_IDS;
  if (book === "techniques") return ALL_TECHNIQUE_IDS;
  if (book === "cards") return ALL_CARD_IDS;
  if (book === "mates") return ALL_MATE_IDS;
  if (book === "status") return STATUS_ALL;
  return RESONANCE_ALL;
}

export function wikiPageSize(book: WikiBook): number {
  return PAGE_SIZE[book];
}

export function wikiPageCount(book: WikiBook): number {
  const n = bookItems(book).length;
  const size = wikiPageSize(book);
  return Math.max(1, Math.ceil(n / size));
}

function pageSlice(book: WikiBook, page: number): number {
  const max = wikiPageCount(book) - 1;
  return Math.max(0, Math.min(page, max));
}

function itemRange(book: WikiBook, page: number): { start: number; end: number } {
  const size = wikiPageSize(book);
  const start = pageSlice(book, page) * size;
  const items = bookItems(book);
  return { start, end: Math.min(items.length, start + size) };
}

function renderWeaponEntry(idx: number): string {
  const id = ALL_WEAPON_IDS[idx]!;
  const g = gearById(id);
  if (!g) return "";
  const pathKey = `${g.school}-${g.path}`;
  const pathSkill = PATH_SKILL[pathKey] ? pathSkillText(pathKey) : "";
  const godKey = g.godSkill ? `${g.school}-${g.path}` : "";
  const godText = g.godSkill && GOD_SKILL[godKey] ? godSkillText(godKey) : g.godSkill ?? "";
  const sec = g.secondary;
  const secBits = [
    sec.ward ? `架+${sec.ward}` : "",
    sec.knock ? `推+${sec.knock}` : "",
    sec.qiRegen ? `回劲+${sec.qiRegen}` : "",
    sec.comboPay ? `势兑+${sec.comboPay}` : "",
    sec.bleed ? `创+${sec.bleed}` : "",
    sec.expose ? `破绽+${sec.expose}` : "",
  ].filter(Boolean);
  return `
    <article class="lab-wiki-entry weapon fill">
      <div class="lab-wiki-kicker">${WEAPON_NAME[g.school]} · ${g.path === "a" ? "甲路" : "乙路"} · ${TIER_NAME[g.tier]}${g.grade}成</div>
      <h3>${escapeHtml(g.name)}</h3>
      <p class="lab-wiki-lead">${escapeHtml(g.tip)}</p>
      <dl class="lab-wiki-stats compact">
        <div><dt>伤</dt><dd>+${g.damage}</dd></div>
        <div><dt>推</dt><dd>+${g.knock}</dd></div>
        <div><dt>架</dt><dd>+${g.ward}</dd></div>
        ${secBits.length ? `<div><dt>精附</dt><dd>${secBits.join(" · ")}</dd></div>` : ""}
      </dl>
      ${pathSkill ? `<p class="lab-wiki-block"><b>路线</b>${escapeHtml(pathSkill)}</p>` : ""}
      ${godText ? `<p class="lab-wiki-block"><b>神技</b>${escapeHtml(godText)}</p>` : ""}
    </article>`;
}

function renderTechEntry(idx: number): string {
  const id = ALL_TECHNIQUE_IDS[idx]! as TechniqueId;
  const t = TECHNIQUES[id];
  return `
    <article class="lab-wiki-entry tech fill">
      <div class="lab-wiki-kicker">外功</div>
      <h3>${escapeHtml(t.name)}</h3>
      <p class="lab-wiki-lead">${escapeHtml(t.text)}</p>
      ${t.flavor ? `<p class="lab-wiki-flavor">${escapeHtml(t.flavor)}</p>` : ""}
    </article>`;
}

function renderCardEntry(idx: number): string {
  const id = ALL_CARD_IDS[idx]! as CardId;
  const c = CARDS[id];
  const text = cardDisplayText(c);
  return `
    <article class="lab-wiki-entry card fill">
      <div class="lab-wiki-kicker">${c.type === "attack" ? "攻" : "技"} · ${schoolLabel(id)} · ${c.cost}劲</div>
      <h3>${escapeHtml(c.name)}</h3>
      <p class="lab-wiki-lead">${escapeHtml(text)}</p>
      ${c.flavor ? `<p class="lab-wiki-flavor">${escapeHtml(c.flavor)}</p>` : ""}
    </article>`;
}

function renderMateEntry(idx: number): string {
  const id = ALL_MATE_IDS[idx]! as CompanionId;
  const m = MATES[id];
  const passive = MATE_PASSIVE[id];
  return `
    <article class="lab-wiki-entry mate fill">
      <div class="lab-wiki-kicker">${escapeHtml(m.title)} · ${WEAPON_NAME[m.weapon]}</div>
      <h3>${escapeHtml(m.name)}</h3>
      <p class="lab-wiki-lead">${escapeHtml(m.bio ?? m.title)}</p>
      <dl class="lab-wiki-stats compact">
        <div><dt>气血</dt><dd>${m.hp}</dd></div>
        ${passive ? `<div class="lab-wiki-passive"><dt>被动</dt><dd>${escapeHtml(passive.name)} — ${escapeHtml(passive.text)}</dd></div>` : ""}
      </dl>
    </article>`;
}

function renderStatusEntry(entry: StatusGuideEntry): string {
  return `
    <article class="lab-wiki-entry guide status fill">
      <div class="lab-wiki-kicker">${escapeHtml(entry.kicker)}</div>
      <h3>${escapeHtml(entry.name)}</h3>
      <p class="lab-wiki-lead">${escapeHtml(entry.text)}</p>
    </article>`;
}

function renderResonanceEntry(entry: ResonanceGuideEntry): string {
  return `
    <article class="lab-wiki-entry guide resonance fill">
      <div class="lab-wiki-kicker">${WEAPON_NAME[entry.school]}</div>
      <h3>${escapeHtml(entry.name)}</h3>
      <p class="lab-wiki-lead">${escapeHtml(entry.text)}</p>
    </article>`;
}

function gridClass(book: WikiBook, count: number): string {
  if (book === "cards") return "lab-wiki-grid cards-6 fill-grid";
  if (book === "status") return "lab-wiki-grid status fill-grid";
  if (book === "resonance") return `lab-wiki-grid resonance fill-grid n-${count}`;
  return "lab-wiki-grid duo fill-grid";
}

export function renderWikiBody(book: WikiBook, page: number): string {
  const { start, end } = itemRange(book, page);
  const count = end - start;
  const chunks: string[] = [];
  for (let i = start; i < end; i++) {
    if (book === "weapons") chunks.push(renderWeaponEntry(i));
    else if (book === "techniques") chunks.push(renderTechEntry(i));
    else if (book === "cards") chunks.push(renderCardEntry(i));
    else if (book === "mates") chunks.push(renderMateEntry(i));
    else if (book === "status") chunks.push(renderStatusEntry(STATUS_ALL[i]!));
    else chunks.push(renderResonanceEntry(RESONANCE_ALL[i]!));
  }
  return `<div class="${gridClass(book, count)}">${chunks.join("")}</div>`;
}

export function renderWikiSheet(book: WikiBook, page: number): string {
  const meta = WIKI_BOOKS.find((b) => b.id === book)!;
  const totalPages = wikiPageCount(book);
  const cur = pageSlice(book, page);
  const { start, end } = itemRange(book, cur);
  const itemTotal = bookItems(book).length;
  const sub = `第 ${start + 1}${end > start + 1 ? `–${end}` : ""} 条 · 共 ${itemTotal} 条`;

  return `
    <div class="lab-wiki-mask" id="lab-wiki-mask">
      <div class="lab-wiki-panel lab-iron-sheet">
        <header class="lab-wiki-head">
          <div class="lab-wiki-tabs">
            ${WIKI_BOOKS.map(
              (b) =>
                `<button type="button" class="lab-wiki-tab ${b.id === book ? "active" : ""}" data-wiki-book="${b.id}">${b.btn}</button>`,
            ).join("")}
          </div>
          <button type="button" class="lab-wiki-close" id="lab-wiki-close" aria-label="关闭">×</button>
        </header>
        <div class="lab-wiki-body">
          <div class="lab-wiki-title-row">
            <h2 class="lab-wiki-title">${meta.title}</h2>
            <span class="lab-wiki-sub">${sub}</span>
          </div>
          ${renderWikiBody(book, cur)}
        </div>
        <footer class="lab-wiki-foot">
          <button type="button" class="lab-btn" data-wiki-prev ${cur <= 0 ? "disabled" : ""}>‹ 上一页</button>
          <span class="lab-wiki-page">${cur + 1} / ${totalPages}</span>
          <button type="button" class="lab-btn" data-wiki-next ${cur >= totalPages - 1 ? "disabled" : ""}>下一页 ›</button>
        </footer>
      </div>
    </div>`;
}

export function renderWikiNavButtons(): string {
  return WIKI_BOOKS.map((b) => `<button type="button" class="lab-btn lab-wiki-open" data-wiki-open="${b.id}">${b.btn}</button>`).join("");
}
