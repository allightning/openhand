/** Weapon 立绘 — AI ink plates per school (like character stands), named in UI. */

import { gearById, type GearWeapon } from "../game/weapons";
import { WEAPON_NAME } from "../game/party";
import type { WeaponId } from "../game/types";
import { artUrl } from "./artUrl";

const SCHOOL_FILE: Record<WeaponId, string> = {
  palm: "palm",
  saber: "saber",
  spear: "spear",
  sword: "sword",
  staff: "staff",
  hook: "hook",
};

export function weaponSrc(school: WeaponId): string {
  return artUrl(`art/weapons/${SCHOOL_FILE[school]}.png`);
}

/** Tall plate: PNG 立绘 + grade seal. Readable at a glance. */
export function weaponArt(id: string | null | undefined): string {
  const g = gearById(id);
  if (!g) {
    return `<span class="weapon-art weapon-art-empty" aria-hidden="true"></span>`;
  }
  return `<img class="weapon-art" src="${weaponSrc(g.school)}" alt="${g.name}" draggable="false"><em class="weapon-grade">${g.grade}</em>`;
}

export function weaponArtMarkup(id: string | null | undefined, opts?: { title?: string; button?: boolean }): string {
  const g = gearById(id);
  const tip = opts?.title ?? (g ? `${g.name} · ${g.tip}` : "");
  const art = weaponArt(id);
  const caption = g ? `<b class="weapon-caption">${g.name}</b>` : "";
  if (opts?.button && g) {
    return `<button type="button" class="weapon-plate" data-weapon="${g.id}" title="${g.name}（点开细看）" aria-label="${g.name}">${art}${caption}</button>`;
  }
  return `<span class="weapon-art-wrap" title="${tip}">${art}${caption}</span>`;
}

export function weaponDetail(id: string): { name: string; school: string; tip: string; text: string } | null {
  const g = gearById(id);
  if (!g) return null;
  const bits = [
    `伤 +${g.damage}`,
    g.knock ? `推 +${g.knock}` : "",
    g.ward ? `架 +${g.ward}` : "",
    g.skill ? g.skill : "",
  ].filter(Boolean);
  return {
    name: g.name,
    school: WEAPON_NAME[g.school],
    tip: g.tip,
    text: `${WEAPON_NAME[g.school]} · ${g.grade} 成。${bits.join(" · ")}。${g.skill ? `埋招「${g.skill}」。` : "尚无埋招。"}`,
  };
}

/** @deprecated kept for tests that once asserted SVG; school plate path. */
export function weaponSchoolFile(g: GearWeapon): string {
  return SCHOOL_FILE[g.school];
}
