import { cardArt } from "../art/cardArt";
import { charArt, hasCharArt } from "../art/charArt";
import { cardDisplayText } from "../game/cardTextV2";
import { CARDS } from "../game/content";
import { MATE_PASSIVE, MATES, schoolLabel } from "../game/party";
import type { CardId, CompanionId } from "../game/types";
import { rogueMate } from "./rogueRoster";
import { isBreakAlign } from "./labRuleset";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}

/** 非谱类奖励用水墨卡面，不再用几何图标。 */
const KIND_ART: Record<string, string> = {
  tech: "expose",
  mind: "inbreath",
  item: "plant",
  aid: "twinpalm",
  aidPair: "combo",
  forge: "ironform",
  upgrade: "advance",
  elixir: "mend",
  heal: "salve",
  card: "strike",
};

const KIND_BANNER: Record<string, string> = {
  card: "残谱",
  tech: "外功",
  mind: "心法",
  item: "道具",
  aid: "助战",
  aidPair: "助战符",
  forge: "淬刃",
  upgrade: "换页",
  elixir: "仙药",
  heal: "金创",
};

function typeLabel(type: string): string {
  return type === "attack" ? "攻击" : "技能";
}

function stripOfferPrefix(title: string): string {
  return title.replace(/^(谱|货|外功|淬刃|心法|道具|助战|仙药|金创)\s*[·・]\s*/, "");
}

export function payloadCardId(id: string): CardId | null {
  const raw = id.startsWith("card:") ? id.slice(5) : id;
  return CARDS[raw as CardId] ? (raw as CardId) : null;
}

export type CampCardOpts = {
  kind: string;
  id: string;
  title: string;
  text: string;
  attrs: string;
  extraClass?: string;
  disabled?: boolean;
  /** 黑市：右下角彩金；免费奖励可省略。 */
  priceLabel?: string;
  tip?: string;
};

/** 与局内手牌同一套结构：劲力角标、水墨立绘、类型条、牌名、效果、风味。 */
export function campBattleCardHtml(opts: CampCardOpts): string {
  const cardId = payloadCardId(opts.id);
  const def = cardId ? CARDS[cardId] : null;
  const type = def?.type === "attack" ? "attack" : "skill";
  const banner = def
    ? `${typeLabel(def.type)} · ${schoolLabel(cardId!)}${def.tags?.includes("组合") ? " · 组合" : ""}`
    : (KIND_BANNER[opts.kind] ?? "营地");
  const name = def?.name ?? stripOfferPrefix(opts.title);
  const text = def ? cardDisplayText(def, { breakAlign: isBreakAlign() }) : opts.text;
  const flavor = def?.flavor ?? "";
  const art = cardArt(def?.id ?? KIND_ART[opts.kind] ?? "strike");
  const cost = def ? `<span class="cost">${def.cost}</span>` : "";
  const dead = opts.disabled ? "dead" : "";
  const tip = opts.tip ?? [name, banner, text, flavor, opts.priceLabel].filter(Boolean).join("\n");
  return `<button type="button" class="card ${type} gauntlet-camp-card ${opts.extraClass ?? ""} ${dead}" ${opts.attrs} data-tip="${escapeAttr(tip)}" ${opts.disabled ? "disabled" : ""}>
    ${cost}
    <div class="art">${art}</div>
    <div class="banner">${escapeHtml(banner)}</div>
    <h3>${escapeHtml(name)}</h3>
    <p class="text">${escapeHtml(text)}</p>
    ${flavor ? `<p class="flavor">${escapeHtml(flavor)}</p>` : ""}
    ${opts.priceLabel ? `<span class="hotkey">${escapeHtml(opts.priceLabel)}</span>` : ""}
  </button>`;
}

export function companionPortraitHtml(id: CompanionId): string {
  if (hasCharArt(id)) return `<div class="gauntlet-comp-art">${charArt(id, "full")}</div>`;
  return `<div class="gauntlet-comp-art gauntlet-comp-fallback"><div class="art">${cardArt("twinpalm")}</div></div>`;
}

export function companionSkillLine(id: CompanionId): string {
  const rogue = rogueMate(id);
  if (rogue) return `${rogue.skillName}：${rogue.skillText}`;
  const p = MATE_PASSIVE[id];
  if (p) return `${p.name}：${p.text}`;
  return MATES[id]?.bio ?? "";
}
