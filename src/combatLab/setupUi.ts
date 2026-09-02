import { ENEMIES, TECHNIQUES } from "../game/content";
import { gearIdsForMateSchools, schoolFromGearId } from "../game/equippedWeapon";
import { computeResonance, type ResonanceStatus } from "../game/labResonance";
import { getLabTuning } from "../game/labTuning";
import { MATES, ROLE_LABEL, WEAPON_NAME } from "../game/party";
import type { CardId, CompanionId, EnemyId, TechniqueId } from "../game/types";
import { gearById, TIER_NAME } from "../game/weapons";
import { ALL_CARD_IDS, ALL_MATE_IDS, ALL_TECHNIQUE_IDS, ALL_WEAPON_IDS } from "./arsenal";
import {
  AUTO_LOADOUTS,
  AUTO_TECH_DEPTHS,
  AUTO_WEAPON_GRADES,
  type AutoTechDepth,
  type AutoWeaponGrade,
} from "./autoLoadouts";
import { primaryWeapon } from "./draft";
import {
  deckTypeLabel,
  LAB_DECK_MULT_MAX,
  LAB_DECK_MULT_MIN,
  LAB_PARTY_CAP,
  LAB_TECH_CAP,
  quotaCheck,
} from "./rules";
import type { LabPreset } from "./types";
import { isCardAllowedForWeapon, presetTypeClass, renderMiniCard } from "./cardUi";
import { renderClanBar } from "./cardClans";

export type PickFocus = "enemy" | "cards" | "mates" | "weapon" | "tech";

export function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

function mateTechList(p: LabPreset, id: CompanionId): TechniqueId[] {
  return p.mateTechs[id] ?? [];
}

function weaponsForMate(mateId: CompanionId): { main: string[]; alt: string[] } {
  return gearIdsForMateSchools(mateId, ALL_WEAPON_IDS);
}

export function computeAurasFromPreset(draft: LabPreset): ResonanceStatus {
  const mock = {
    active: draft.fieldMate,
    party: draft.party,
    bench: draft.party
      .filter((id) => id !== draft.fieldMate)
      .map((id) => ({ id, hp: 1, maxHp: 1, hand: [], drawPile: [], discardPile: [] })),
    labMateWeapons: draft.mateWeapons,
  } as import("../game/types").Battle;
  return computeResonance(mock);
}

export function pickPanelTitle(focus: PickFocus, mateId: CompanionId): string {
  if (focus === "enemy") return "选敌";
  if (focus === "cards") return "加谱";
  if (focus === "mates") return "同行";
  if (focus === "weapon") return `兵器 · ${MATES[mateId].name}`;
  return `外功 · ${MATES[mateId].name}`;
}

export function renderDeckRecipeHtml(
  draft: LabPreset,
  selectedIdx: number | null,
  flyInIdx: number | null,
): string {
  const weapon = primaryWeapon(draft);
  const chips = draft.deckRecipe
    .map((id, i) =>
      renderMiniCard(id, weapon, {
        deckIdx: i,
        selected: selectedIdx === i,
        flyIn: flyInIdx === i,
        showBlocked: true,
      }),
    )
    .join("");
  return chips || '<span class="lab-deck-empty">点此处选谱，右栏加入配方</span>';
}

export function renderArsenalHtml(draft: LabPreset, showBlocked: boolean): string {
  const weapon = primaryWeapon(draft);
  const inRecipe = new Set(draft.deckRecipe);
  const list = ALL_CARD_IDS.filter((id) => isCardAllowedForWeapon(id, weapon) || showBlocked);
  const cards = list
    .map((id) => {
      const dup = inRecipe.has(id);
      return renderMiniCard(id, weapon, {
        addBtn: !dup,
        showBlocked: showBlocked,
        selected: dup,
      });
    })
    .filter(Boolean)
    .join("");
  return `<div class="lab-arsenal-grid" id="arsenal-grid">${cards}</div>`;
}

function renderEnemyPick(draft: LabPreset): string {
  return Object.values(ENEMIES)
    .map((e) => {
      const on = draft.enemyId === e.id ? "active" : "";
      return `<button type="button" class="lab-pick-item enemy ${on}" data-pick-enemy="${e.id}">
        <b>${escapeHtml(e.name)}</b>
        <small>${escapeHtml(e.title)} · 气血 ${e.hp}</small>
      </button>`;
    })
    .join("");
}

function renderMatePick(draft: LabPreset, focusMate: CompanionId): string {
  return ALL_MATE_IDS.map((id) => {
    const m = MATES[id];
    const inParty = draft.party.includes(id);
    const isField = draft.fieldMate === id;
    const focused = focusMate === id;
    return `<button type="button" class="lab-pick-item mate ${inParty ? "in-party" : ""} ${isField ? "on-field" : ""} ${focused ? "focused" : ""}" data-pick-mate="${id}">
      <b>${escapeHtml(m.name)}</b>
      <small>${escapeHtml(m.title)} · ${WEAPON_NAME[m.weapon]}</small>
    </button>`;
  }).join("");
}

function renderWeaponPick(draft: LabPreset, mateId: CompanionId): string {
  const current = draft.mateWeapons[mateId] ?? "";
  const m = MATES[mateId];
  const { main, alt } = weaponsForMate(mateId);
  const renderGroup = (label: string, ids: string[]) =>
    ids
      .map((wid) => {
        const g = gearById(wid);
        if (!g) return "";
        const on = current === wid ? "active" : "";
        return `<button type="button" class="lab-pick-item weapon ${on}" data-pick-weapon="${wid}" data-weapon-mate="${mateId}">
        <b>${escapeHtml(g.name)}</b>
        <small>${TIER_NAME[g.tier]}${g.grade} · 伤+${g.damage} 架+${g.ward}</small>
      </button>`;
      })
      .join("");
  return `
    <div class="lab-weapon-pick-groups">
      <p class="lab-weapon-pick-kicker">主 · ${WEAPON_NAME[m.weapon]}</p>
      <div class="lab-pick-grid">${renderGroup("main", main) || "<span class='muted'>无</span>"}</div>
      <p class="lab-weapon-pick-kicker">副 · ${WEAPON_NAME[m.secondFamily]}</p>
      <div class="lab-pick-grid">${renderGroup("alt", alt) || "<span class='muted'>无</span>"}</div>
    </div>`;
}

function renderTechPick(draft: LabPreset, mateId: CompanionId): string {
  const have = mateTechList(draft, mateId);
  const remain = LAB_TECH_CAP - have.length;
  return ALL_TECHNIQUE_IDS.map((id) => {
    const t = TECHNIQUES[id];
    const learned = have.includes(id);
    const full = remain <= 0 && !learned;
    return `<button type="button" class="lab-pick-item tech ${learned ? "learned active" : ""}" data-pick-tech="${id}" data-tech-mate="${mateId}" data-tip="${escapeHtml(t.text)}" ${full && !learned ? "disabled" : ""}>
      <b>${escapeHtml(t.name)}</b>
      <small>${escapeHtml(t.text)}</small>
    </button>`;
  }).join("");
}

export function renderPickPanel(
  draft: LabPreset,
  focus: PickFocus,
  focusMate: CompanionId,
  showBlocked: boolean,
): string {
  let body = "";
  let extra = "";

  if (focus === "enemy") {
    body = `<div class="lab-pick-list">${renderEnemyPick(draft)}</div>`;
  } else if (focus === "cards") {
    extra = `
      <label class="lab-check lab-show-blocked">
        <input type="checkbox" id="show-blocked" ${showBlocked ? "checked" : ""}/>
        <span class="lab-check-box"></span>
        <span>显示他门谱</span>
      </label>`;
    body = `<div class="lab-scroll lab-arsenal-scroll" id="arsenal-slot">${renderArsenalHtml(draft, showBlocked)}</div>`;
  } else if (focus === "mates") {
    body = `<div class="lab-pick-list">${renderMatePick(draft, focusMate)}</div>`;
    if (draft.party.includes(focusMate)) {
      extra = `<div class="lab-pick-actions">
        ${draft.fieldMate !== focusMate ? `<button type="button" class="lab-btn tiny" data-set-field="${focusMate}">设为场上</button>` : ""}
        ${draft.party.length > 1 && draft.fieldMate !== focusMate ? `<button type="button" class="lab-btn tiny" data-drop-mate="${focusMate}">移出同行</button>` : ""}
      </div>`;
    }
  } else if (focus === "weapon") {
    body = `<div class="lab-pick-list">${renderWeaponPick(draft, focusMate)}</div>`;
  } else {
    const have = mateTechList(draft, focusMate);
    extra =
      have.length > 0
        ? `<div class="lab-pick-actions">${have
            .map(
              (tid) =>
                `<span class="lab-tech-chip" data-tip="${escapeHtml(TECHNIQUES[tid].text)}">${escapeHtml(TECHNIQUES[tid].name)}<button type="button" class="lab-tech-forget" data-forget-tech="${tid}" data-tech-mate="${focusMate}" aria-label="遗忘">×</button></span>`,
            )
            .join("")}</div>`
        : "";
    body = `<div class="lab-pick-list">${renderTechPick(draft, focusMate)}</div>`;
  }

  return `${extra}${body}`;
}

function renderAutoLoadoutBar(
  selectedId: string,
  weaponGrade: AutoWeaponGrade,
  techDepth: AutoTechDepth,
): string {
  const gradeOpts = AUTO_WEAPON_GRADES.map(
    (g) => `<option value="${g.grade}" ${weaponGrade === g.grade ? "selected" : ""}>${g.label}</option>`,
  ).join("");
  const depthOpts = AUTO_TECH_DEPTHS.map(
    (d) => `<option value="${d.depth}" ${techDepth === d.depth ? "selected" : ""}>${d.label}</option>`,
  ).join("");
  const teamOpts = AUTO_LOADOUTS.map(
    (t) => `<option value="${t.id}" ${selectedId === t.id ? "selected" : ""}>${escapeHtml(t.name)}</option>`,
  ).join("");

  return `
    <div class="lab-auto-bar">
      <span class="lab-auto-label">一键配装</span>
      <label>队伍<select class="lab-select compact" id="auto-loadout-team">${teamOpts}</select></label>
      <label>兵器<select class="lab-select compact" id="auto-weapon-grade">${gradeOpts}</select></label>
      <label>外功<select class="lab-select compact" id="auto-tech-depth">${depthOpts}</select></label>
      <button type="button" class="lab-btn primary" id="apply-auto-loadout">填入中间</button>
    </div>`;
}

function renderMateRow(draft: LabPreset, id: CompanionId, focus: PickFocus, focusMate: CompanionId): string {
  const m = MATES[id];
  const techs = mateTechList(draft, id);
  const weaponId = draft.mateWeapons[id] ?? "";
  const weaponName = gearById(weaponId)?.name ?? "选兵器";
  const equippedSchool = schoolFromGearId(weaponId, m.weapon);
  const isField = draft.fieldMate === id;
  const mateFocused = focus === "mates" && focusMate === id;
  const weaponFocused = focus === "weapon" && focusMate === id;
  const techFocused = focus === "tech" && focusMate === id;

  const techLabel =
    techs.length > 0
      ? techs.map((tid) => TECHNIQUES[tid].name).join(" · ")
      : `外功空 ${techs.length}/${LAB_TECH_CAP}`;

  return `
    <div class="lab-mate-row ${isField ? "on-field" : ""} ${mateFocused ? "focus-mate" : ""}" data-mate-card="${id}">
      <button type="button" class="lab-mate-head" data-pick-focus="mates" data-focus-mate="${id}">
        <span class="lab-mate-status">${isField ? "场上" : "后场"}</span>
        <b>${escapeHtml(m.name)}</b>
        <small>${ROLE_LABEL[m.role]} · 助战${ROLE_LABEL[m.assist ?? m.role]} · ${WEAPON_NAME[equippedSchool]} · 主${WEAPON_NAME[m.weapon]}/副${WEAPON_NAME[m.secondFamily]}</small>
      </button>
      <div class="lab-mate-slots">
        <button type="button" class="lab-slot-chip weapon ${weaponFocused ? "active" : ""}" data-pick-focus="weapon" data-focus-mate="${id}">${escapeHtml(weaponName)}</button>
        <button type="button" class="lab-slot-chip tech ${techFocused ? "active" : ""}" data-pick-focus="tech" data-focus-mate="${id}">${escapeHtml(techLabel)}</button>
      </div>
    </div>`;
}

function renderAuraPreview(draft: LabPreset): string {
  const res = computeAurasFromPreset(draft);
  const schoolChips = res.schools
    .filter((s) => s.tier > 0)
    .map((s) => {
      const target = s.tier >= 3 ? 4 : s.tier === 2 ? 4 : 3;
      const next =
        s.toNext > 0
          ? ` · 距${s.tier === 1 ? "登堂" : s.tier === 2 ? "宗师" : "下一档"} ×${s.toNext}`
          : "";
      const tip = `${WEAPON_NAME[s.school]} · ${s.tierName}：${s.activeLabel || "已激活"}${next}`;
      return `<span class="lab-aura-chip" data-tip="${escapeHtml(tip)}">${escapeHtml(WEAPON_NAME[s.school])} ${s.count}/${target} · ${s.tierName}已激活${next}<span class="status-tip">${escapeHtml(tip)}</span></span>`;
    })
    .join("");
  const flower = res.hundredFlowers
    ? `<span class="lab-aura-chip lab-aura-flowers" data-tip="四系各异 · 先机+1 · 助战耗劲-1 · 首张组合卡-1劲">百花齐放 · 先机+1<span class="status-tip">四系各异 · 先机+1 · 助战耗劲-1 · 首张组合卡-1劲</span></span>`
    : "";
  if (!schoolChips && !flower) {
    return `<p class="lab-aura-setup muted">构成光环：同系未达 2 人（按当前装备系全队计数）</p>`;
  }
  return `<div class="lab-aura-setup"><span class="lab-aura-setup-label">共鸣</span>${schoolChips}${flower}</div>`;
}

function renderPartyCenter(draft: LabPreset, focus: PickFocus, focusMate: CompanionId): string {
  const filled = draft.party.map((id) => renderMateRow(draft, id, focus, focusMate)).join("");
  return `<div class="lab-party-compact">${filled}</div>`;
}

function renderEnemyPressureSliders(): string {
  const t = getLabTuning();
  return `
    <div class="lab-enemy-pressure">
      <span class="lab-enemy-pressure-label">§29 敌压</span>
      <label class="lab-slider-inline">HP× <span id="val-enemy-hp-setup">${t.enemyHpMul.toFixed(2)}</span>
        <input type="range" id="sl-enemy-hp-setup" min="1" max="2.5" step="0.05" value="${t.enemyHpMul}"/>
      </label>
      <label class="lab-slider-inline">段+ <span id="val-enemy-seg-setup">${t.enemySegBonus}</span>
        <input type="range" id="sl-enemy-seg-setup" min="0" max="3" step="1" value="${t.enemySegBonus}"/>
      </label>
      <label class="lab-slider-inline">应激 <span id="val-enemy-stress-setup">${t.enemyStressCap}</span>
        <input type="range" id="sl-enemy-stress-setup" min="0" max="5" step="1" value="${t.enemyStressCap}"/>
      </label>
      <label class="lab-check"><input type="checkbox" id="tog-grudge-setup" ${t.v2Grudge ? "checked" : ""}/><span>鏖战</span></label>
    </div>`;
}

export function renderSetupBody(
  draft: LabPreset,
  opts: {
    presetsHtml: string;
    selectedDeckIdx: number | null;
    flyInDeckIdx: number | null;
    showBlockedCards: boolean;
    pickFocus: PickFocus;
    focusMate: CompanionId;
    autoLoadoutId: string;
    autoWeaponGrade: AutoWeaponGrade;
    autoTechDepth: AutoTechDepth;
    gauntletEntryHtml?: string;
  },
): string {
  const mult = getLabTuning().deckMultiplier;
  const deckChips = renderDeckRecipeHtml(draft, opts.selectedDeckIdx, opts.flyInDeckIdx);
  const enemy = ENEMIES[draft.enemyId];
  const cardsFocused = opts.pickFocus === "cards";
  const enemyFocused = opts.pickFocus === "enemy";
  const fieldGear = draft.mateWeapons[draft.fieldMate] ?? primaryWeapon(draft);
  const fieldSchool = schoolFromGearId(fieldGear, MATES[draft.fieldMate].weapon);
  const quota = quotaCheck(draft.deckRecipe, fieldSchool);
  const quotaHint = quota.ok
    ? `<span class="lab-quota-ok">配额 OK · field ${WEAPON_NAME[fieldSchool]} ${quota.schoolCount} · 通用 ${quota.anyCount}</span>`
    : `<span class="lab-quota-warn">配额提示：${escapeHtml(quota.hints.join("；"))}</span>`;

  return `
    <div class="lab-setup lab-setup-compact">
      <div class="lab-panel lab-panel-presets">
        <h2>预设</h2>
        <div class="lab-scroll lab-preset-list">${opts.presetsHtml}</div>
        <button type="button" class="lab-btn" id="save-preset">另存装配</button>
      </div>
      <div class="lab-panel lab-panel-main">
        ${renderAutoLoadoutBar(opts.autoLoadoutId, opts.autoWeaponGrade, opts.autoTechDepth)}
        ${renderEnemyPressureSliders()}
        ${renderAuraPreview(draft)}
        <div class="lab-setup-head">
          <h2>${escapeHtml(draft.name)}</h2>
          <div class="lab-recipe-meta">
            <span class="lab-recipe-count ${draft.deckRecipe.length >= 20 ? "full" : ""}">${deckTypeLabel(draft.deckRecipe, mult)} · ${draft.deckRecipe.length}/20</span>
            ${quotaHint}
            <label class="lab-slider-inline">乘数 <span id="val-deck-mult">${mult}</span>
              <input type="range" id="sl-deck-mult" min="${LAB_DECK_MULT_MIN}" max="${LAB_DECK_MULT_MAX}" step="1" value="${mult}"/>
            </label>
          </div>
        </div>
        <button type="button" class="lab-pick-target enemy ${enemyFocused ? "active" : ""}" data-pick-focus="enemy">
          <span class="lab-pick-label">对手</span>
          <b>${escapeHtml(enemy?.name ?? draft.enemyId)}</b>
          <small>${escapeHtml(enemy?.title ?? "")}</small>
        </button>
        <button type="button" class="lab-pick-target deck-head ${cardsFocused ? "active" : ""}" data-pick-focus="cards">
          <span class="lab-pick-label">谱配方</span>
          <small>点选后右栏加谱 · 点牌可移出</small>
        </button>
        <div class="lab-clan-bar">${renderClanBar(draft.deckRecipe)}</div>
        <div class="lab-deck" id="deck-zone">${deckChips}</div>
        <button type="button" class="lab-pick-target mates-head ${opts.pickFocus === "mates" ? "active" : ""}" data-pick-focus="mates" data-focus-mate="${opts.focusMate}">
          <span class="lab-pick-label">同行</span>
          <b>${draft.party.length}/${LAB_PARTY_CAP}</b>
          <small>点角色 · 兵器 · 外功分别改</small>
        </button>
        ${renderPartyCenter(draft, opts.pickFocus, opts.focusMate)}
        <div class="lab-start-row">
          ${opts.gauntletEntryHtml ?? ""}
          <button type="button" class="lab-btn primary large" id="start-battle">开战</button>
        </div>
      </div>
      <div class="lab-panel lab-panel-pick">
        <h2 id="pick-panel-title">${pickPanelTitle(opts.pickFocus, opts.focusMate)}</h2>
        <div id="pick-panel-body">${renderPickPanel(draft, opts.pickFocus, opts.focusMate, opts.showBlockedCards)}</div>
      </div>
    </div>`;
}

export function renderPresetButtons(draft: LabPreset, presets: LabPreset[]): string {
  return presets
    .map((p) => {
      const typeCls = presetTypeClass(p.tags);
      const on = p.id === draft.id ? "active" : "";
      return `<button type="button" class="lab-preset ${typeCls} ${on}" data-preset="${p.id}">
        <b>${escapeHtml(p.name)}</b>
        <small>${escapeHtml(p.blurb)}</small>
      </button>`;
    })
    .join("");
}

export function enemyOptions(draft: LabPreset): string {
  return Object.values(ENEMIES)
    .map((e) => `<option value="${e.id}" ${draft.enemyId === e.id ? "selected" : ""}>${e.name}</option>`)
    .join("");
}
