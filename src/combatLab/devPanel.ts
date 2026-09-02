import { cardStatLine } from "../game/cardTextV2";
import { CARDS, ENEMIES, TECHNIQUES } from "../game/content";
import {
  ENEMY_GEAR_GRADE_LABEL,
  enemyGear,
  enemyGradeForStage,
  enemyStrikeAtDist,
  type EnemyGearGrade,
} from "../game/enemyGear";
import { GAUNTLET_FOE_IDENTITY, profileFor, schoolForGeneratedEnemy } from "../game/enemyKit";
import { getLabTuning, resetLabTuning, setLabTuning } from "../game/labTuning";
import {
  getContentOverrides,
  resetContentOverrides,
  setContentOverride,
} from "../game/labContentOverrides";
import { MATE_PASSIVE, MATES, WEAPON_NAME } from "../game/party";
import { gearById } from "../game/weapons";
import type { CardId, CompanionId, EnemyId, TechniqueId, WeaponId } from "../game/types";
import {
  ALL_CARD_IDS,
  ALL_ENEMY_IDS,
  ALL_MATE_IDS,
  ALL_TECHNIQUE_IDS,
  ALL_WEAPON_IDS,
} from "./arsenal";
import { peakPotAnchor, reviveCost } from "./gauntlet";
import { getGauntletFinalStage } from "./gauntletPaths";
import { isBreakAlign } from "./labRuleset";
import { escapeHtml } from "./setupUi";

export type DevTab = "combat" | "enemy" | "foeGear" | "weapon" | "card" | "tech" | "mate";

let activeTab: DevTab = "combat";
let pickEnemy: EnemyId = "mob_monk_02";
let pickWeapon = ALL_WEAPON_IDS[0] ?? "palm-a-3";
let pickFoeSchool: WeaponId = "saber";
let pickFoeGrade: EnemyGearGrade = "jing";
let pickCard: CardId = "strike";
let pickTech: TechniqueId = "leftover";
let pickMate: CompanionId = "rail";
let devStage = 4;

/** 草稿：键为表单元素 id（不含 #），值为原始字符串。 */
let draftValues: Record<string, string> = {};
/** 最近一次已提交的覆盖快照，供恢复上一步。 */
let lastSnapshot: ReturnType<typeof getContentOverrides> | null = null;

/** 测试 / 外部：切实验台当前页与选中项。 */
export function setDevPanelState(patch: {
  tab?: DevTab;
  enemy?: EnemyId;
  stage?: number;
  foeSchool?: WeaponId;
  foeGrade?: EnemyGearGrade;
}): void {
  if (patch.tab) activeTab = patch.tab;
  if (patch.enemy) pickEnemy = patch.enemy;
  if (patch.stage != null) devStage = patch.stage;
  if (patch.foeSchool) pickFoeSchool = patch.foeSchool;
  if (patch.foeGrade) pickFoeGrade = patch.foeGrade;
}

function numInput(id: string, label: string, value: number | undefined, min: number, max: number, step = 1): string {
  const draft = draftValues[id];
  const v = draft ?? (value != null ? String(value) : "");
  return `<label class="lab-dev-field">${escapeHtml(label)}
    <input type="number" id="${id}" min="${min}" max="${max}" step="${step}" value="${escapeHtml(v)}" placeholder="默认"/>
  </label>`;
}

function textInput(id: string, label: string, value: string | undefined, placeholder: string, wide = false): string {
  const draft = draftValues[id] ?? value ?? "";
  return `<label class="lab-dev-field${wide ? " wide" : ""}">${escapeHtml(label)}
    <textarea id="${id}" rows="2" placeholder="${escapeHtml(placeholder)}">${escapeHtml(draft)}</textarea>
  </label>`;
}

function slider(
  id: string,
  label: string,
  valId: string,
  value: number,
  min: number,
  max: number,
  step: number,
  fmt: (v: number) => string = String,
): string {
  return `<label class="lab-slider-inline">${escapeHtml(label)} <span id="${valId}">${fmt(value)}</span>
    <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${value}"/>
  </label>`;
}

function renderCombatTab(): string {
  const t = getLabTuning();
  const peak = peakPotAnchor(devStage);
  const revive = reviveCost(devStage);
  const breakMode = isBreakAlign();
  const final = getGauntletFinalStage();
  const modeBanner = breakMode
    ? `<p class="lab-dev-mode-banner break">当前 <b>肉鸽踢馆</b> · 10 馆 · 硬拆/让/追/眼生效（不拆也能爬）· 品阶 1–2 精 / 3–6 玄 / 7+ 神</p>`
    : `<p class="lab-dev-mode-banner classic">当前 <b>对战版</b> · 15 馆 · <b>无拆招</b>（条上只打/空/跳过）· 品阶 1–4 精 / 5–12 玄 / 13+ 神 · 用来对照拆招</p>`;
  const breakSlider = breakMode
    ? slider("sl-break-dev", "破招窗口（遗留旋钮）", "val-break-dev", t.breakWindow, 0, 100, 5)
    : "";
  const stressTip = breakMode
    ? "应激含破招应激；馆 1–2 阶梯常把帽压到 0。"
    : "对战版：拆招应激不挂；势爆/助战/特色招应激仍可按帽生效。";
  const comboTip = breakMode ? "开踢禁组合技（融合卡替代）；此钮主要影响非开踢局。" : "经典可开组合技（同道后）。";
  return `
    ${modeBanner}
    <div class="lab-dev-section">
      <h4>全局战斗</h4>
      <div class="lab-dev-grid">
        ${slider("sl-dmg-dev", "伤害系数", "val-dmg-dev", t.dmgCoef, 0.25, 2, 0.05, (v) => v.toFixed(2))}
        ${breakSlider}
        ${slider("sl-pace-dev", "先机偏置", "val-pace-dev", t.paceBias, -3, 5, 1)}
        ${slider("sl-ai-dev", "AI激进度", "val-ai-dev", t.aiAggression, 0, 100, 5)}
        ${slider("sl-deck-mult-dev", "牌堆乘数", "val-deck-mult-dev", t.deckMultiplier, 1, 10, 1)}
        ${slider("sl-player-dmg-dev", "玩家伤倍", "val-player-dmg-dev", t.playerDmgMul, 0.5, 2.5, 0.05, (v) => v.toFixed(2))}
        ${slider("sl-energy-bonus-dev", "劲力上限+", "val-energy-bonus-dev", t.playerEnergyBonus, 0, 6, 1)}
      </div>
    </div>
    <div class="lab-dev-section">
      <h4>敌人压力</h4>
      <p class="muted lab-dev-hint">${escapeHtml(stressTip)}</p>
      <div class="lab-dev-grid">
        ${slider("sl-enemy-hp-setup", "HP×", "val-enemy-hp-setup", t.enemyHpMul, 0.5, 4, 0.05, (v) => v.toFixed(2))}
        ${slider("sl-enemy-seg-setup", "段+", "val-enemy-seg-setup", t.enemySegBonus, 0, 8, 1)}
        ${slider("sl-enemy-stress-setup", "应激上限", "val-enemy-stress-setup", t.enemyStressCap, 0, 6, 1)}
        ${slider("sl-cap-dev", "单回合总督%", "val-cap-dev", t.enemyTurnCapRatio, 0.2, 0.95, 0.05, (v) => String(Math.round(v * 100)))}
      </div>
      <div class="lab-dev-toggles">
        <label class="lab-check"><input type="checkbox" id="tog-v2-dev" ${t.rulesV2 ? "checked" : ""}/><span>v2规则</span></label>
        <label class="lab-check"><input type="checkbox" id="tog-grudge-setup" ${t.v2Grudge ? "checked" : ""}/><span>鏖战</span></label>
        <label class="lab-check"><input type="checkbox" id="tog-variant-dev" ${t.v2VariantAi ? "checked" : ""}/><span>变招</span></label>
        <label class="lab-check" title="${escapeHtml(comboTip)}"><input type="checkbox" id="tog-combo-dev" ${t.rulesCombo ? "checked" : ""}/><span>组合技</span></label>
        <label class="lab-check"><input type="checkbox" id="tog-seg-all-dev" ${t.enemySegAll ? "checked" : ""}/><span>全员加段</span></label>
        <label class="lab-check"><input type="checkbox" id="tog-fx-dev" ${t.v2Fx ? "checked" : ""}/><span>演出</span></label>
      </div>
    </div>
    <div class="lab-dev-section lab-dev-econ">
      <h4>经济标尺 · 本模式 ${final} 馆</h4>
      <label>馆序 <input type="number" id="dev-stage" min="1" max="${final}" value="${Math.min(devStage, final)}" class="gauntlet-stake-custom"/></label>
      <span>峰值锚 <b id="dev-peak">${peak}</b> · 复活费 <b id="dev-revive">${revive}</b></span>
      <p class="muted lab-dev-hint">馆序也驱动下方「敌人」页的套件/品阶预览。</p>
    </div>
    <div class="lab-dev-actions">
      <button type="button" class="lab-btn" id="dev-reset-tuning">重置战斗旋钮</button>
    </div>`;
}

function renderPicker(tab: DevTab, id: string, options: { value: string; label: string }[]): string {
  const opts = options
    .map((o) => `<option value="${escapeHtml(o.value)}" ${o.value === id ? "selected" : ""}>${escapeHtml(o.label)}</option>`)
    .join("");
  return `<label class="lab-dev-pick">选择
    <select id="dev-pick-${tab}">${opts}</select>
  </label>`;
}

function entityActionBar(id: string, hasOverride: boolean): string {
  const snap = lastSnapshot as unknown as Record<string, Record<string, unknown>> | null;
  const undo = snap?.[bucketForTab()]?.[id] != null;
  return `
    <div class="lab-dev-actions">
      <button type="button" class="lab-btn primary" id="dev-confirm" ${hasOverride || formDirty(id) ? "" : "disabled"}>确认修改</button>
      <button type="button" class="lab-btn" id="dev-undo" ${undo ? "" : "disabled"}>恢复上一步</button>
    </div>`;
}

function formDirty(_id?: string): boolean {
  return draftKeysForTab().some((k) => {
    const v = draftValues[`dev-${k}`];
    return v != null && v !== "";
  });
}

export function recordDevDraft(id: string, value: string): void {
  draftValues[id] = value;
}

export function resetDevDrafts(): void {
  draftValues = {};
}

export function isDevFormDirty(): boolean {
  return formDirty();
}

export function confirmDevEntityOverride(): void {
  commitEntityOverride();
}

function bucketForTab(): "cards" | "enemies" | "weapons" | "techniques" | "mates" {
  if (activeTab === "enemy") return "enemies";
  if (activeTab === "weapon") return "weapons";
  if (activeTab === "card") return "cards";
  if (activeTab === "tech") return "techniques";
  return "mates";
}

function draftKeysForTab(): string[] {
  if (activeTab === "enemy") return ["enemy-hp", "enemy-pos", "enemy-reach", "enemy-pace"];
  if (activeTab === "weapon") return ["weapon-dmg", "weapon-knock", "weapon-ward"];
  if (activeTab === "card") return ["card-cost", "card-dmg", "card-block", "card-knock", "card-wall", "card-steps"];
  if (activeTab === "tech") return ["tech-name", "tech-text"];
  return ["mate-hp", "mate-passive-name", "mate-passive-text"];
}

function currentEntityId(): string {
  if (activeTab === "enemy") return pickEnemy;
  if (activeTab === "weapon") return pickWeapon;
  if (activeTab === "card") return pickCard;
  if (activeTab === "tech") return pickTech;
  return pickMate;
}

function renderEnemyEditor(): string {
  const base = ENEMIES[pickEnemy];
  const ov = getContentOverrides().enemies[pickEnemy] ?? {};
  const gauntletIds = Object.keys(GAUNTLET_FOE_IDENTITY) as EnemyId[];
  const otherIds = ALL_ENEMY_IDS.filter((id) => !GAUNTLET_FOE_IDENTITY[id]);
  const pathTag = (id: EnemyId) => {
    const p = GAUNTLET_FOE_IDENTITY[id]?.path;
    if (p === "shaolin") return "少林";
    if (p === "jianghu") return "江湖";
    if (p === "court") return "朝廷";
    return "踢馆";
  };
  const options = [
    ...gauntletIds.map((id) => ({
      value: id,
      label: `[${pathTag(id)}] ${GAUNTLET_FOE_IDENTITY[id]?.name ?? ENEMIES[id].name} · ${WEAPON_NAME[schoolForGeneratedEnemy(id)]}`,
    })),
    ...otherIds.map((id) => ({ value: id, label: `${ENEMIES[id].name} · ${ENEMIES[id].title}` })),
  ];
  const mode = isBreakAlign() ? "break" : "classic";
  const kitId = GAUNTLET_FOE_IDENTITY[pickEnemy] ? pickEnemy : null;
  let kitHtml = "";
  if (kitId) {
    const profile = profileFor(kitId, Math.max(1, Math.min(devStage, getGauntletFinalStage())), "main", mode);
    const gear = enemyGear(profile.school, profile.grade);
    const opener = profile.opener.map((i) => i.kind).join(" · ");
    const sigs = profile.sigs.length ? profile.sigs.join(" · ") : "（本馆无）";
    const d1 = enemyStrikeAtDist(profile.school, profile.grade, 1);
    const d2 = enemyStrikeAtDist(profile.school, profile.grade, 2);
    kitHtml = `
      <div class="lab-dev-section lab-dev-kit">
        <h4>踢馆套件预览 · 馆 ${devStage}（${mode === "break" ? "拆招" : "对战"}）</h4>
        <p class="lab-dev-base">系 <b>${escapeHtml(WEAPON_NAME[profile.school])}</b> · 品阶 <b>${ENEMY_GEAR_GRADE_LABEL[profile.grade]}</b> · 敌兵刃 <b>${escapeHtml(gear.name)}</b></p>
        <p class="muted">条（opener）：${escapeHtml(opener || "—")}</p>
        <p class="muted">蓝条 ${profile.energy.archive} · 上限 ${profile.energy.max} / 起手 ${profile.energy.start} · 吐纳 ${profile.energy.breathe}</p>
        <p class="muted">打击距1=${d1} 距2=${d2}${profile.school === "saber" ? "（平砍同伤）" : ""} · 被动：${escapeHtml(gear.passive)}</p>
        <p class="muted">特色招：${escapeHtml(sigs)}</p>
        <p class="muted lab-dev-hint">开踢开战会挂 kit（需 labGauntletStage）；下方气血/站位覆盖仍作用于图鉴底数。</p>
      </div>`;
  } else {
    kitHtml = `<p class="muted lab-dev-hint">此 id 不在踢馆具名表——无套件/敌兵刃品阶预览。</p>`;
  }
  return `
    ${renderPicker("enemy", pickEnemy, options)}
    <p class="lab-dev-base muted">图鉴默认气血 ${base.hp} · 位 ${base.pos} · 距 ${base.reach ?? 1}</p>
    ${kitHtml}
    <div class="lab-dev-grid">
      ${numInput("dev-enemy-hp", "气血", ov.hp, 1, 999)}
      ${numInput("dev-enemy-pos", "站位", ov.pos, 0, 6)}
      ${numInput("dev-enemy-reach", "攻击距离", ov.reach, 1, 4)}
      ${numInput("dev-enemy-pace", "先机", ov.pace, -2, 5)}
    </div>
    ${entityActionBar(pickEnemy, Object.keys(ov).length > 0)}`;
}

function renderFoeGearEditor(): string {
  const schools: WeaponId[] = ["palm", "saber", "sword", "spear", "staff", "hook"];
  const grades: EnemyGearGrade[] = ["jing", "xuan", "shen"];
  const schoolSel = schools
    .map((s) => `<option value="${s}" ${s === pickFoeSchool ? "selected" : ""}>${WEAPON_NAME[s]}</option>`)
    .join("");
  const gradeSel = grades
    .map((g) => `<option value="${g}" ${g === pickFoeGrade ? "selected" : ""}>${ENEMY_GEAR_GRADE_LABEL[g]}</option>`)
    .join("");
  const gear = enemyGear(pickFoeSchool, pickFoeGrade);
  const rows = grades
    .map((g) => {
      const eg = enemyGear(pickFoeSchool, g);
      const d1 = enemyStrikeAtDist(pickFoeSchool, g, 1);
      const d2 = enemyStrikeAtDist(pickFoeSchool, g, 2);
      return `<tr class="${g === pickFoeGrade ? "hot" : ""}"><td>${ENEMY_GEAR_GRADE_LABEL[g]}</td><td>${escapeHtml(eg.name)}</td><td>${d1}</td><td>${d2}</td><td>${escapeHtml(eg.godSkill ?? "—")}</td></tr>`;
    })
    .join("");
  return `
    <p class="muted lab-dev-hint">敌兵刃独立表，不复用玩家凡良精玄神。玩家刀 10/4；敌刀距 1–2 平砍。</p>
    <div class="lab-dev-grid">
      <label class="lab-dev-pick">系<select id="dev-pick-foe-school">${schoolSel}</select></label>
      <label class="lab-dev-pick">阶<select id="dev-pick-foe-grade">${gradeSel}</select></label>
    </div>
    <div class="lab-dev-section">
      <h4>${escapeHtml(gear.name)} · ${ENEMY_GEAR_GRADE_LABEL[gear.grade]}</h4>
      <p>${escapeHtml(gear.passive)}</p>
      <p class="muted">id <code>${escapeHtml(gear.id)}</code> · 基础打击 ${gear.strike}${gear.godSkill ? ` · 神技 ${escapeHtml(gear.godSkill)}` : ""}</p>
      <table class="lab-dev-table">
        <thead><tr><th>阶</th><th>名</th><th>距1</th><th>距2</th><th>神技</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function renderWeaponEditor(): string {
  const base = gearById(pickWeapon);
  if (!base) return "<p class='muted'>无效兵刃</p>";
  const ov = getContentOverrides().weapons[pickWeapon] ?? {};
  const options = ALL_WEAPON_IDS.map((id) => {
    const g = gearById(id);
    return { value: id, label: g ? `${g.name} (${id})` : id };
  });
  return `
    <p class="muted lab-dev-hint">玩家兵刃表。敌兵刃见「敌兵刃」页，互不覆盖。</p>
    ${renderPicker("weapon", pickWeapon, options)}
    <p class="lab-dev-base muted">默认 伤+${base.damage} · 推+${base.knock} · 架+${base.ward}</p>
    <div class="lab-dev-grid">
      ${numInput("dev-weapon-dmg", "伤害+", ov.damage, 0, 30)}
      ${numInput("dev-weapon-knock", "推+", ov.knock, 0, 10)}
      ${numInput("dev-weapon-ward", "架+", ov.ward, 0, 20)}
    </div>
    ${entityActionBar(pickWeapon, Object.keys(ov).length > 0)}`;
}

function renderCardEditor(): string {
  const base = CARDS[pickCard];
  const ov = getContentOverrides().cards[pickCard] ?? {};
  const live = { ...base, ...ov };
  const options = ALL_CARD_IDS.map((id) => ({ value: id, label: `${CARDS[id].name} (${id})` }));
  return `
    ${renderPicker("card", pickCard, options)}
    <p class="lab-dev-base muted">${escapeHtml(base.text)}</p>
    <p class="lab-dev-nums"><b>生效</b> ${escapeHtml(cardStatLine(live))}</p>
    <div class="lab-dev-grid">
      ${numInput("dev-card-cost", "劲", ov.cost ?? base.cost, 0, 9)}
      ${numInput("dev-card-dmg", "伤害", ov.damage ?? base.damage, 0, 99)}
      ${numInput("dev-card-block", "格挡", ov.block ?? base.block, 0, 99)}
      ${numInput("dev-card-knock", "推", ov.knock ?? base.knock, 0, 10)}
      ${numInput("dev-card-wall", "撞壁", ov.wall ?? base.wall, 0, 30)}
      ${numInput("dev-card-steps", "步数", ov.steps ?? base.steps, -2, 4)}
    </div>
    ${entityActionBar(pickCard, Object.keys(ov).length > 0)}`;
}

function renderTechEditor(): string {
  const base = TECHNIQUES[pickTech];
  const ov = getContentOverrides().techniques[pickTech] ?? {};
  const options = ALL_TECHNIQUE_IDS.map((id) => ({ value: id, label: TECHNIQUES[id].name }));
  return `
    ${renderPicker("tech", pickTech, options)}
    <p class="lab-dev-base muted">${escapeHtml(base.text)}</p>
    <div class="lab-dev-grid">
      ${textInput("dev-tech-name", "名称", ov.name, base.name)}
      ${textInput("dev-tech-text", "描述", ov.text, base.text, true)}
    </div>
    ${entityActionBar(pickTech, Object.keys(ov).length > 0)}`;
}

function renderMateEditor(): string {
  const base = MATES[pickMate];
  const passive = MATE_PASSIVE[pickMate];
  const ov = getContentOverrides().mates[pickMate] ?? {};
  const options = ALL_MATE_IDS.map((id) => ({ value: id, label: `${MATES[id].name} · ${MATES[id].title}` }));
  return `
    ${renderPicker("mate", pickMate, options)}
    <p class="lab-dev-base muted">${escapeHtml(base.bio ?? base.title)}${passive ? ` · 被动「${escapeHtml(passive.name)}」` : ""}</p>
    <div class="lab-dev-grid">
      ${numInput("dev-mate-hp", "气血", ov.hp, 8, 200)}
      ${textInput("dev-mate-passive-name", "被动名称", ov.passive?.name, passive?.name ?? "无")}
      ${textInput("dev-mate-passive-text", "被动描述", ov.passive?.text, passive?.text ?? "", true)}
    </div>
    ${entityActionBar(pickMate, Object.keys(ov).length > 0)}`;
}

function renderEntityPanel(): string {
  if (activeTab === "enemy") return renderEnemyEditor();
  if (activeTab === "foeGear") return renderFoeGearEditor();
  if (activeTab === "weapon") return renderWeaponEditor();
  if (activeTab === "card") return renderCardEditor();
  if (activeTab === "tech") return renderTechEditor();
  if (activeTab === "mate") return renderMateEditor();
  return "";
}

const TABS: { id: DevTab; label: string }[] = [
  { id: "combat", label: "战斗" },
  { id: "enemy", label: "敌人" },
  { id: "foeGear", label: "敌兵刃" },
  { id: "weapon", label: "玩家兵刃" },
  { id: "card", label: "招式" },
  { id: "tech", label: "外功" },
  { id: "mate", label: "角色" },
];

/** 踢馆实验台：全局旋钮 + 分实体数值覆盖（localStorage 持久化；确认后提交，可恢复上一步）。 */
export function renderGauntletDevPanel(): string {
  const tabs = TABS.map(
    (t) =>
      `<button type="button" class="lab-dev-tab ${activeTab === t.id ? "active" : ""}" data-dev-tab="${t.id}">${t.label}</button>`,
  ).join("");
  return `
    <div class="lab-gauntlet-dev">
      <p class="muted lab-dev-lead">改数值 → 点 <b>确认修改</b> 提交；<b>新开一局</b> 后敌人/牌/兵刃/角色覆盖生效。全局敌压即时生效。</p>
      <nav class="lab-dev-tabs">${tabs}</nav>
      <div class="lab-dev-panel" id="lab-dev-panel-body">
        ${activeTab === "combat" ? renderCombatTab() : renderEntityPanel()}
      </div>
      <div class="lab-dev-foot">
        <button type="button" class="lab-btn" id="dev-reset-all-overrides">清空全部数据覆盖</button>
      </div>
    </div>`;
}

const PATCH_KEY: Record<string, string> = {
  "enemy-hp": "hp",
  "enemy-pos": "pos",
  "enemy-reach": "reach",
  "enemy-pace": "pace",
  "weapon-dmg": "damage",
  "weapon-knock": "knock",
  "weapon-ward": "ward",
  "card-cost": "cost",
  "card-dmg": "damage",
  "card-block": "block",
  "card-knock": "knock",
  "card-wall": "wall",
  "card-steps": "steps",
  "tech-name": "name",
  "tech-text": "text",
  "mate-hp": "hp",
  "mate-passive-name": "passiveName",
  "mate-passive-text": "passiveText",
};

function collectEntityPatch(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const pname = draftValues["dev-mate-passive-name"];
  const ptext = draftValues["dev-mate-passive-text"];
  for (const k of draftKeysForTab()) {
    const raw = draftValues[`dev-${k}`];
    if (raw == null || raw === "") continue;
    const prop = PATCH_KEY[k];
    if (!prop) continue;
    if (prop === "name" || prop === "text" || prop === "passiveName" || prop === "passiveText") continue;
    const n = Number(raw);
    if (Number.isFinite(n)) out[prop] = n;
  }
  if (activeTab === "tech") {
    if (draftValues["dev-tech-name"]?.trim()) out.name = draftValues["dev-tech-name"].trim();
    if (draftValues["dev-tech-text"]?.trim()) out.text = draftValues["dev-tech-text"].trim();
  }
  if (activeTab === "mate" && (pname || ptext)) {
    out.passive = { name: (pname ?? "").trim(), text: (ptext ?? "").trim() };
  }
  return out;
}

function commitEntityOverride(): void {
  const id = currentEntityId();
  const bucket = bucketForTab();
  const patch = Object.fromEntries(Object.entries(collectEntityPatch()).filter(([, v]) => v != null));
  if (Object.keys(patch).length === 0) return;
  lastSnapshot = getContentOverrides();
  setContentOverride(bucket, id, patch as never);
  draftValues = {};
}

function undoLastOverride(): void {
  if (!lastSnapshot) return;
  const cur = getContentOverrides();
  const prev = lastSnapshot;
  lastSnapshot = cur;
  resetContentOverrides();
  for (const bucket of ["cards", "enemies", "weapons", "techniques", "mates"] as const) {
    for (const [id, patch] of Object.entries(prev[bucket])) {
      if (patch && typeof patch === "object") setContentOverride(bucket, id, patch as never);
    }
  }
  draftValues = {};
}

function bindSlider(
  root: ParentNode,
  sel: string,
  valSel: string,
  key: keyof ReturnType<typeof getLabTuning>,
  fmt: (v: number) => string = String,
): void {
  const el = root.querySelector<HTMLInputElement>(sel);
  el?.addEventListener("input", () => {
    const val = Number(el.value);
    setLabTuning({ [key]: val });
    const v = root.querySelector(valSel);
    if (v) v.textContent = fmt(val);
  });
}

export function bindGauntletDevPanel(root: ParentNode, onRerender?: () => void): void {
  for (const el of root.querySelectorAll<HTMLButtonElement>("[data-dev-tab]")) {
    el.addEventListener("click", () => {
      activeTab = el.dataset.devTab as DevTab;
      draftValues = {};
      onRerender?.();
    });
  }
  const pickers: [string, (v: string) => void][] = [
    ["#dev-pick-enemy", (v) => (pickEnemy = v as EnemyId)],
    ["#dev-pick-weapon", (v) => (pickWeapon = v)],
    ["#dev-pick-foe-school", (v) => (pickFoeSchool = v as WeaponId)],
    ["#dev-pick-foe-grade", (v) => (pickFoeGrade = v as EnemyGearGrade)],
    ["#dev-pick-card", (v) => (pickCard = v as CardId)],
    ["#dev-pick-tech", (v) => (pickTech = v as TechniqueId)],
    ["#dev-pick-mate", (v) => (pickMate = v as CompanionId)],
  ];
  for (const [sel, setter] of pickers) {
    root.querySelector(sel)?.addEventListener("change", (e) => {
      setter((e.target as HTMLSelectElement).value);
      draftValues = {};
      onRerender?.();
    });
  }

  // 草稿跟踪：实体表单输入先存内存，确认才提交
  const panel = root.querySelector(".lab-dev-panel");
  panel?.querySelectorAll("input, textarea, select").forEach((el) => {
    if (el.id?.startsWith("dev-") && !el.id.startsWith("dev-pick-") && el.id !== "dev-stage") {
      el.addEventListener("input", () => {
        draftValues[el.id] = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement ? el.value : "";
        const btn = panel.querySelector<HTMLButtonElement>("#dev-confirm");
        if (btn) btn.disabled = !formDirty();
      });
    }
  });

  bindSlider(root, "#sl-enemy-hp-setup", "#val-enemy-hp-setup", "enemyHpMul", (v) => v.toFixed(2));
  bindSlider(root, "#sl-enemy-seg-setup", "#val-enemy-seg-setup", "enemySegBonus");
  bindSlider(root, "#sl-enemy-stress-setup", "#val-enemy-stress-setup", "enemyStressCap");
  bindSlider(root, "#sl-dmg-dev", "#val-dmg-dev", "dmgCoef", (v) => v.toFixed(2));
  bindSlider(root, "#sl-break-dev", "#val-break-dev", "breakWindow");
  bindSlider(root, "#sl-pace-dev", "#val-pace-dev", "paceBias");
  bindSlider(root, "#sl-ai-dev", "#val-ai-dev", "aiAggression");
  bindSlider(root, "#sl-deck-mult-dev", "#val-deck-mult-dev", "deckMultiplier");
  bindSlider(root, "#sl-player-dmg-dev", "#val-player-dmg-dev", "playerDmgMul", (v) => v.toFixed(2));
  bindSlider(root, "#sl-energy-bonus-dev", "#val-energy-bonus-dev", "playerEnergyBonus");
  bindSlider(root, "#sl-cap-dev", "#val-cap-dev", "enemyTurnCapRatio", (v) => String(Math.round(v * 100)));

  root.querySelector("#tog-grudge-setup")?.addEventListener("change", (e) => {
    setLabTuning({ v2Grudge: (e.target as HTMLInputElement).checked });
  });
  root.querySelector("#tog-variant-dev")?.addEventListener("change", (e) => {
    setLabTuning({ v2VariantAi: (e.target as HTMLInputElement).checked });
  });
  root.querySelector("#tog-v2-dev")?.addEventListener("change", (e) => {
    setLabTuning({ rulesV2: (e.target as HTMLInputElement).checked });
  });
  root.querySelector("#tog-combo-dev")?.addEventListener("change", (e) => {
    setLabTuning({ rulesCombo: (e.target as HTMLInputElement).checked });
  });
  root.querySelector("#tog-seg-all-dev")?.addEventListener("change", (e) => {
    setLabTuning({ enemySegAll: (e.target as HTMLInputElement).checked });
  });
  root.querySelector("#tog-fx-dev")?.addEventListener("change", (e) => {
    setLabTuning({ v2Fx: (e.target as HTMLInputElement).checked });
  });

  root.querySelector("#dev-stage")?.addEventListener("change", () => {
    const final = getGauntletFinalStage();
    devStage = Math.max(1, Math.min(final, Number((root.querySelector("#dev-stage") as HTMLInputElement).value) || 1));
    const peakEl = root.querySelector("#dev-peak");
    const revEl = root.querySelector("#dev-revive");
    if (peakEl) peakEl.textContent = String(peakPotAnchor(devStage));
    if (revEl) revEl.textContent = String(reviveCost(devStage));
    if (activeTab === "enemy") onRerender?.();
  });

  root.querySelector("#dev-confirm")?.addEventListener("click", () => {
    commitEntityOverride();
    onRerender?.();
  });
  root.querySelector("#dev-undo")?.addEventListener("click", () => {
    undoLastOverride();
    onRerender?.();
  });
  root.querySelector("#dev-reset-tuning")?.addEventListener("click", () => {
    resetLabTuning();
    onRerender?.();
  });
  root.querySelector("#dev-reset-all-overrides")?.addEventListener("click", () => {
    lastSnapshot = getContentOverrides();
    resetContentOverrides();
    draftValues = {};
    onRerender?.();
  });
}

/** 顶栏实验台弹层 */
export function renderDevPanelModal(): string {
  return `
    <div class="lab-wiki-mask" id="lab-dev-mask">
      <div class="lab-wiki-panel lab-dev-modal lab-iron-sheet">
        <header class="lab-wiki-head">
          <h2 class="lab-guide-title">实验台 · 数值调参</h2>
          <button type="button" class="lab-wiki-close" id="lab-dev-close" aria-label="关闭">×</button>
        </header>
        ${renderGauntletDevPanel()}
      </div>
    </div>`;
}
