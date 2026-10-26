import { CARDS } from "../../game/content";
import { CARD_REGISTRY } from "../../game/content/cards";
import { MATES } from "../../game/party";
import type { CompanionId } from "../../game/types";
import { gauntletFieldMate, type GauntletRun } from "../gauntlet";
import { renderGauntletLoadout, type LoadoutPage, type LoadoutPick } from "../gauntletUi";
import { mateDeck } from "../loadout";
import { escapeHtml } from "../setupUi";

export interface PoolCard {
  id: string;
  name: string;
  school: string;
  cost: number;
  rarity?: string;
}

const SCHOOL_ORDER = ["any", "palm", "saber", "sword", "spear", "staff", "hook"];

const SCHOOL_LABEL: Record<string, string> = {
  any: "通用",
  palm: "拳掌",
  saber: "刀",
  sword: "剑",
  spear: "枪",
  staff: "棍",
  hook: "钩",
};

const RARITY_LABEL: Record<string, string> = {
  common: "凡",
  adept: "精",
  supreme: "绝",
};

const RARITY_RANK: Record<string, number> = { supreme: 0, adept: 1, common: 2 };

const PAGE_LABEL: Record<LoadoutPage, string> = {
  deck: "谱",
  tech: "功法",
  mind: "心法",
  weapon: "武器",
};

export function readPoolCards(): PoolCard[] {
  const ids = Object.keys(CARD_REGISTRY);
  const source = ids.length ? ids : Object.keys(CARDS);
  return source.map((id) => {
    const row = CARD_REGISTRY[id];
    const face = CARDS[id as keyof typeof CARDS] as { name?: string; school?: string; cost?: number } | undefined;
    const rarity = row && typeof row.rarity === "string" ? row.rarity : undefined;
    return {
      id,
      name: face?.name ?? id,
      school: String(row?.school ?? face?.school ?? "any"),
      cost: Number(row?.cost ?? face?.cost ?? 0),
      rarity,
    };
  });
}

function schoolHeading(school: string): string {
  return SCHOOL_LABEL[school] ?? school;
}

function sortPool(cards: PoolCard[]): PoolCard[] {
  return [...cards].sort((a, b) => {
    const rank = (RARITY_RANK[a.rarity ?? ""] ?? 3) - (RARITY_RANK[b.rarity ?? ""] ?? 3);
    if (rank) return rank;
    if (a.cost !== b.cost) return a.cost - b.cost;
    return a.name.localeCompare(b.name, "zh");
  });
}

function poolCardHtml(card: PoolCard): string {
  const label = card.rarity ? RARITY_LABEL[card.rarity] : "";
  const mark = label ? ` data-rarity="${card.rarity}"` : "";
  const badge = label ? `<em class="shell-rarity">${label}</em>` : "";
  return `<li class="shell-pool-card"${mark} data-pool-id="${escapeHtml(card.id)}"><b>${escapeHtml(card.name)}</b>${badge}<span class="shell-cost">${card.cost}</span></li>`;
}

function poolGroups(cards: PoolCard[]): string {
  const groups = new Map<string, PoolCard[]>();
  for (const card of cards) {
    const list = groups.get(card.school) ?? [];
    list.push(card);
    groups.set(card.school, list);
  }
  const known = SCHOOL_ORDER.filter((key) => groups.has(key));
  const extra = [...groups.keys()].filter((key) => !SCHOOL_ORDER.includes(key)).sort();
  return [...known, ...extra]
    .map((key) => {
      const list = sortPool(groups.get(key) ?? []);
      const items = list.map(poolCardHtml).join("");
      return `<section class="shell-pool-school" data-school="${escapeHtml(key)}"><h4>${schoolHeading(key)} · ${list.length}</h4><ul class="shell-pool-row">${items}</ul></section>`;
    })
    .join("");
}

export function renderShellPool(cards: PoolCard[]): string {
  if (!cards.length) {
    return `<section class="shell-pool" data-shell="pool" aria-label="牌池"><h3>牌池</h3><p class="shell-empty">牌池是空的。</p></section>`;
  }
  const note = cards.some((card) => card.rarity) ? "" : `<p class="shell-pool-note">品相字段还没写上，先按系排。</p>`;
  return `<section class="shell-pool" data-shell="pool" aria-label="牌池"><h3>牌池 · ${cards.length}</h3>${note}${poolGroups(cards)}</section>`;
}

export function loadoutSummary(run: GauntletRun, focus: CompanionId | undefined, page: LoadoutPage): string {
  const id = focus ?? gauntletFieldMate(run.school);
  const name = MATES[id]?.name ?? id;
  if (page === "weapon") return `${name} · ${PAGE_LABEL[page]} · 兵刃在手`;
  const n =
    page === "deck" ? mateDeck(run, id).length : page === "tech" ? (run.mateTechs[id]?.length ?? 0) : (run.mateMindArts[id]?.length ?? 0);
  return `${name} · ${PAGE_LABEL[page]} · ${n} 张`;
}

export function renderShellLoadout(inner: string, pool: string, summary: string): string {
  const marked = inner
    .replace('class="gauntlet-loadout-tabs"', 'class="gauntlet-loadout-tabs" data-overlap-group="loadout-tabs"')
    .replace('class="gauntlet-loadout-ops"', 'class="gauntlet-loadout-ops" data-overlap-group="loadout-ops"')
    .replace(
      'class="gauntlet-loadout-rail gauntlet-loadout-mates"',
      'class="gauntlet-loadout-rail gauntlet-loadout-mates" data-overlap-group="loadout-mates"',
    );
  return `<div class="shell-loadout" data-shell="loadout">
    <p class="shell-kicker">配装</p>
    <p class="shell-loadout-summary">${escapeHtml(summary)}</p>
    ${marked}
    ${pool}
  </div>`;
}

export function paintShellLoadout(
  run: GauntletRun,
  focus?: CompanionId,
  page: LoadoutPage = "deck",
  pick: LoadoutPick = null,
): string {
  return renderShellLoadout(
    renderGauntletLoadout(run, focus, page, pick),
    renderShellPool(readPoolCards()),
    loadoutSummary(run, focus, page),
  );
}
