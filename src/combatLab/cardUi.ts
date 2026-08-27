import { CARDS } from "../game/content";
import { WEAPON_NAME, WEAPON_VERB, cardSchool, schoolLabel } from "../game/party";
import type { CardId, WeaponId } from "../game/types";
import {
  GOD_SKILL,
  PATH_SKILL,
  TIER_NAME,
  gearById,
  type GearSecondary,
} from "../game/weapons";

export function weaponSchool(weaponId: string): WeaponId | null {
  return gearById(weaponId)?.school ?? null;
}

/** 通用谱 + 当前兵器门派谱可装。 */
export function isCardAllowedForWeapon(cardId: CardId, weaponId: string): boolean {
  const school = weaponSchool(weaponId);
  if (!school) return true;
  const cs = cardSchool(cardId);
  return cs === "any" || cs === school;
}

export function pruneDeckForWeapon(deck: CardId[], weaponId: string): CardId[] {
  return deck.filter((id) => isCardAllowedForWeapon(id, weaponId));
}

const SCHOOLS: WeaponId[] = ["palm", "saber", "spear", "sword", "staff", "hook"];

export function renderSchoolAllowBar(weaponId: string): string {
  const active = weaponSchool(weaponId);
  const chips = [
    `<span class="lab-school-chip any on">通用</span>`,
    ...SCHOOLS.map((s) => {
      const on = active === s;
      return `<span class="lab-school-chip ${on ? "on" : "off"}">${WEAPON_NAME[s]}</span>`;
    }),
  ].join("");
  const name = active ? WEAPON_NAME[active] : "—";
  return `
    <div class="lab-weapon-allow">
      <b>可装配：通用 + ${escapeHtml(name)}谱</b>
      <div class="lab-school-chips">${chips}</div>
      <p class="lab-weapon-allow-note">他门攻击谱不可加入牌组；切换兵器会自动移除非本门牌。</p>
    </div>`;
}

/** Spatial / timing cards — D2 算招核心，卡面暖橙细边。 */
export function isSpatialCard(id: CardId): boolean {
  const def = CARDS[id];
  const text = def.text;
  if (def.knock || def.steps || def.pullEnemy || def.plant || def.chargeBonus) return true;
  if (text.includes("推") || text.includes("拉") || text.includes("近") || text.includes("退")) return true;
  if (text.includes("相邻") || text.includes("隔") || text.includes("步") || text.includes("撞壁")) return true;
  if (text.includes("桩") || text.includes("机") || text.includes("换位")) return true;
  if (def.nearBonus || def.farBonus || def.weave || def.layer || def.mirror) return true;
  return false;
}

export function presetTypeClass(tags: string[]): string {
  if (tags.some((t) => t.includes("教程") || t.includes("新手") || t.includes("教学"))) return "type-tutorial";
  if (tags.some((t) => t.includes("Boss"))) return "type-boss";
  if (tags.some((t) => t.includes("精英") || t.includes("读招"))) return "type-elite";
  if (tags.some((t) => t.includes("空间") || t.includes("连携") || t.includes("多敌") || t.includes("先机"))) return "type-space";
  if (tags.some((t) => t.includes("对照"))) return "type-compare";
  return "type-default";
}

export function renderMiniCard(
  id: CardId,
  weaponId: string,
  opts: {
    deckIdx?: number;
    addBtn?: boolean;
    selected?: boolean;
    flyIn?: boolean;
    showBlocked?: boolean;
  } = {},
): string {
  const def = CARDS[id];
  const spatial = isSpatialCard(id);
  const allowed = isCardAllowedForWeapon(id, weaponId);
  const cs = cardSchool(id);
  const blocked = !allowed;
  if (blocked && !opts.showBlocked) return "";

  const classes = [
    "lab-mini-card",
    spatial ? "spatial" : "numeric",
    opts.selected ? "selected" : "",
    opts.flyIn ? "fly-in" : "",
    blocked ? "blocked" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const tag = opts.addBtn ? "button" : "span";
  const schoolTag = cs !== "any" ? `<span class="lab-mini-school">${schoolLabel(id)}</span>` : "";
  const reason = blocked ? `不可装：${schoolLabel(id)}谱，当前兵器为${WEAPON_NAME[weaponSchool(weaponId)!]}` : def.text;
  const attrs = opts.addBtn
    ? `type="button" data-add-card="${id}" title="${escapeAttr(reason)}"${blocked ? " disabled" : ""}`
    : `data-deck-idx="${opts.deckIdx ?? 0}" data-card="${id}"`;
  return `<${tag} class="${classes}" ${attrs}>
    <span class="lab-mini-cost">${def.cost}</span>
    ${schoolTag}
    <span class="lab-mini-name">${escapeHtml(def.name)}</span>
  </${tag}>`;
}

function fmtSecondary(sec: GearSecondary): string {
  const parts: string[] = [];
  if (sec.ward) parts.push(`格挡+${sec.ward}`);
  if (sec.knock) parts.push(`推击+${sec.knock}`);
  if (sec.qiRegen) parts.push(`劲回+${sec.qiRegen}`);
  if (sec.comboPay) parts.push(`连势+${sec.comboPay}`);
  if (sec.bleed) parts.push(`裂创+${sec.bleed}`);
  if (sec.expose) parts.push(`破绽+${sec.expose}`);
  return parts.join(" · ");
}

/** 选中兵器时展示的路线技 / 神技说明。 */
export function renderWeaponHint(weaponId: string): string {
  const g = gearById(weaponId);
  if (!g) {
    return `<div class="lab-weapon-hint empty"><p>未选兵器</p></div>`;
  }
  const schoolLine = WEAPON_VERB[g.school] ?? "";
  const stats = [
    `伤 +${g.damage}`,
    g.knock ? `推 +${g.knock}` : "",
    g.ward ? `架 +${g.ward}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const skillKey = `${g.school}-${g.path}`;
  const pathSkillText = PATH_SKILL[skillKey] ?? "";
  const godText = g.godSkill ?? GOD_SKILL[skillKey] ?? "";
  const secText = fmtSecondary(g.secondary);
  const tierLabel = TIER_NAME[g.tier];

  let skillBlock = "";
  if (g.grade >= 3 && pathSkillText) {
    skillBlock = `
      <div class="lab-weapon-skill active">
        <em>路线技 · ${tierLabel}</em>
        <strong>${escapeHtml(pathSkillText)}</strong>
      </div>`;
  } else {
    skillBlock = `
      <div class="lab-weapon-skill pending">
        <em>路线技 · 精起解锁</em>
        <strong>${escapeHtml(pathSkillText || "选到精品以上可见完整路线技")}</strong>
      </div>`;
  }

  const godBlock =
    g.grade >= 5 && godText
      ? `<div class="lab-weapon-god"><em>神技</em><strong>${escapeHtml(godText)}</strong></div>`
      : g.grade < 5 && godText
        ? `<div class="lab-weapon-god locked"><em>神技 · 神品解锁</em><span>${escapeHtml(godText)}</span></div>`
        : "";

  const secBlock = secText
    ? `<div class="lab-weapon-extra"><em>精副属性</em><span>${escapeHtml(secText)}</span></div>`
    : "";

  return `
    <div class="lab-weapon-hint" id="weapon-hint">
      ${renderSchoolAllowBar(weaponId)}
      <div class="lab-weapon-hint-head">
        <b>${escapeHtml(g.name)}</b>
        <span class="lab-weapon-meta">${escapeHtml(WEAPON_NAME[g.school])} · ${tierLabel} · 伤推架见下</span>
      </div>
      <div class="lab-weapon-stats">${escapeHtml(stats)}</div>
      <p class="lab-weapon-verb">${escapeHtml(schoolLine)}</p>
      ${skillBlock}
      ${godBlock}
      ${secBlock}
    </div>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}
