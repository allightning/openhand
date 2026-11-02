import type { GauntletRun } from "../../game/rules/gauntletModel";
import { applyOpenPick, dealOpenDeck } from "../../game/openRitual";
import { WEAPON_NAME } from "../../game/party";
import type { WeaponId } from "../../game/types";
import { gearById } from "../../game/weapons";
import { shellRunContext } from "../shellContext";
import { escapeHtml } from "../setupUi";
import { CORE_LINE } from "./weaponSwap";

/** 开局翻牌记在跑程上。 */
export type OpenRitual = GauntletRun;

const FLIP_CAP = 3;

export function openPageId(run: GauntletRun): string | undefined {
  const flag = [...(run.storyFlags ?? [])].reverse().find((f) => f.startsWith("s3page:"));
  return flag?.slice("s3page:".length);
}

function ritual(run: GauntletRun): OpenRitual {
  return run as OpenRitual;
}

function deckOf(run: OpenRitual): { schools: WeaponId[]; source: "field" | "placeholder" } {
  const given = run.openDeck?.filter((id): id is WeaponId => id in WEAPON_NAME);
  if (given && given.length) return { schools: given.slice(0, 7), source: "field" };
  return { schools: dealOpenDeck(() => 0), source: "placeholder" };
}

function faceOf(school: WeaponId): { name: string; source: "field" | "placeholder" } {
  const gear = gearById(`${school}-a-3`, shellRunContext());
  if (gear?.name) return { name: gear.name, source: "field" };
  return { name: WEAPON_NAME[school], source: "placeholder" };
}

export function flipOpenCard(run: GauntletRun, index: number): OpenRitual {
  const cur = ritual(run);
  const flipped = [...(cur.openFlipped ?? [])];
  if (index < 0 || flipped.includes(index) || flipped.length >= FLIP_CAP) return cur;
  return { ...cur, openFlipped: [...flipped, index] };
}

export function pickOpenCard(run: GauntletRun, index: number): OpenRitual {
  return applyOpenPick(run, index);
}

export function writeHeroName(run: GauntletRun, name: string): OpenRitual {
  return { ...ritual(run), heroName: name.trim() };
}

function cardButton(school: WeaponId, index: number, flipped: number[], pick: number | undefined, capFull: boolean): string {
  const open = flipped.includes(index);
  const chosen = pick === index;
  const locked = !open && capFull;
  if (!open) {
    return `<button type="button" class="lab-btn shell-open-card is-back" id="open-card-${index}" data-open-flip="${index}" data-open-school="${school}" data-open-face="back"${locked ? " disabled" : ""}>牌背</button>`;
  }
  const face = faceOf(school);
  return `<button type="button" class="lab-btn shell-open-card is-face${chosen ? " is-pick" : ""}" id="open-card-${index}" data-open-flip="${index}" data-open-pick="${index}" data-open-school="${school}" data-open-face="face" data-face-source="${face.source}"${chosen ? ` aria-current="true"` : ""}>
    <b>${escapeHtml(face.name)}</b>
    <em>${escapeHtml(WEAPON_NAME[school])}</em>
    <span>${escapeHtml(CORE_LINE[school])}</span>
  </button>`;
}

function renderFlip(run: OpenRitual, page: string): string {
  const { schools, source } = deckOf(run);
  const flipped = (run.openFlipped ?? []).filter((n) => n >= 0 && n < schools.length);
  const capFull = flipped.length >= FLIP_CAP;
  const pick = run.openPick;
  const cards = schools.map((school, i) => cardButton(school, i, flipped, pick, capFull)).join("");
  const chosen = pick != null && schools[pick] ? `选定 ${WEAPON_NAME[schools[pick]]}` : "";
  return `<section class="shell-open-flip" data-overlap-group="open-flip" data-open-page="${page}" data-open-source="${source}" data-open-n="${schools.length}" data-open-flipped="${flipped.length}">
    ${cards}
    <p class="shell-open-pick" data-open-chosen="${pick ?? ""}">${escapeHtml(chosen)}</p>
  </section>`;
}

function renderName(run: OpenRitual): string {
  const known = typeof run.heroName === "string";
  const value = known ? run.heroName ?? "" : "";
  return `<section class="shell-open-name" data-overlap-group="open-name" data-name-source="${known ? "field" : "placeholder"}">
    <label>名字 <input id="open-hero-name" value="${escapeHtml(value)}" /></label>
    <button type="button" class="lab-btn" id="open-name-keep">记下这个名字</button>
  </section>`;
}

export function renderOpenRitual(run: GauntletRun): string {
  const page = openPageId(run);
  if (page === "s3-open-a" || page === "s3-open-b") return renderFlip(ritual(run), page);
  if (page === "s3-open-name") return renderName(ritual(run));
  return "";
}
