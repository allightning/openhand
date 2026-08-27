import { CARDS, ENEMIES, TECHNIQUES } from "../game/content";
import { getLabTuning, resetLabTuning, setLabTuning } from "../game/labTuning";
import {
  getContentOverrides,
  resetContentOverrides,
  setContentOverride,
} from "../game/labContentOverrides";
import { MATE_PASSIVE, MATES } from "../game/party";
import { gearById } from "../game/weapons";
import type { CardId, CompanionId, EnemyId, TechniqueId } from "../game/types";
import {
  ALL_CARD_IDS,
  ALL_ENEMY_IDS,
  ALL_MATE_IDS,
  ALL_TECHNIQUE_IDS,
  ALL_WEAPON_IDS,
} from "./arsenal";
import { peakPotAnchor, reviveCost } from "./gauntlet";
import { escapeHtml } from "./setupUi";

export type DevTab = "combat" | "enemy" | "weapon" | "card" | "tech" | "mate";

let activeTab: DevTab = "combat";
let pickEnemy: EnemyId = "catcher";
let pickWeapon = ALL_WEAPON_IDS[0] ?? "palm-a-3";
let pickCard: CardId = "strike";
let pickTech: TechniqueId = "leftover";
let pickMate: CompanionId = "rail";
let devStage = 4;

/** 草稿：键为表单元素 id（不含 #），值为原始字符串。 */
let draftValues: Record<string, string> = {};
/** 最近一次已提交的覆盖快照，供恢复上一步。 */
let lastSnapshot: ReturnType<typeof getContentOverrides> | null = null;

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
  return `
    <div class="lab-dev-section">
      <h4>全局战斗</h4>
      <div class="lab-dev-grid">
        ${slider("sl-dmg-dev", "伤害系数", "val-dmg-dev", t.dmgCoef, 0.25, 2, 0.05, (v) => v.toFixed(2))}
        ${slider("sl-break-dev", "破招窗口", "val-break-dev", t.breakWindow, 0, 100, 5)}
        ${slider("sl-pace-dev", "先机偏置", "val-pace-dev", t.paceBias, -3, 5, 1)}
        ${slider("sl-ai-dev", "AI激进度", "val-ai-dev", t.aiAggression, 0, 100, 5)}
        ${slider("sl-deck-mult-dev", "牌堆乘数", "val-deck-mult-dev", t.deckMultiplier, 1, 10, 1)}
        ${slider("sl-player-dmg-dev", "玩家伤倍", "val-player-dmg-dev", t.playerDmgMul, 0.5, 2.5, 0.05, (v) => v.toFixed(2))}
        ${slider("sl-energy-bonus-dev", "劲力上限+", "val-energy-bonus-dev", t.playerEnergyBonus, 0, 6, 1)}
      </div>
    </div>
    <div class="lab-dev-section">
      <h4>敌人压力</h4>
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
        <label class="lab-check"><input type="checkbox" id="tog-combo-dev" ${t.rulesCombo ? "checked" : ""}/><span>组合技</span></label>
        <label class="lab-check"><input type="checkbox" id="tog-seg-all-dev" ${t.enemySegAll ? "checked" : ""}/><span>全员加段</span></label>
        <label class="lab-check"><input type="checkbox" id="tog-fx-dev" ${t.v2Fx ? "checked" : ""}/><span>演出</span></label>
      </div>
    </div>
    <div class="lab-dev-section lab-dev-econ">
      <h4>经济标尺</h4>
      <label>馆序 <input type="number" id="dev-stage" min="1" max="20" value="${devStage}" class="gauntlet-stake-custom"/></label>
      <span>峰值锚 <b id="dev-peak">${peak}</b> · 复活费 <b id="dev-revive">${revive}</b></span>
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

function formDirty(id: string): boolean {
  const keys = draftKeysForTab();
  return keys.some((k) => (draftValues[`#dev-${k}`] ?? "") !== "");
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
  const options = ALL_ENEMY_IDS.map((id) => ({ value: id, label: `${ENEMIES[id].name} · ${ENEMIES[id].title}` }));
  return `
    ${renderPicker("enemy", pickEnemy, options)}
    <p class="lab-dev-base muted">默认 HP ${base.hp} · 位 ${base.pos} · 距 ${base.reach ?? 1}</p>
    <div class="lab-dev-grid">
      ${numInput("dev-enemy-hp", "气血", ov.hp, 1, 999)}
      ${numInput("dev-enemy-pos", "站位", ov.pos, 0, 6)}
      ${numInput("dev-enemy-reach", "攻击距离", ov.reach, 1, 4)}
      ${numInput("dev-enemy-pace", "先机", ov.pace, -2, 5)}
    </div>
    ${entityActionBar(pickEnemy, Object.keys(ov).length > 0)}`;
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
  const options = ALL_CARD_IDS.map((id) => ({ value: id, label: `${CARDS[id].name} (${id})` }));
  return `
    ${renderPicker("card", pickCard, options)}
    <p class="lab-dev-base muted">${escapeHtml(base.text)}</p>
    <div class="lab-dev-grid">
      ${numInput("dev-card-cost", "劲", ov.cost, 0, 9)}
      ${numInput("dev-card-dmg", "伤害", ov.damage, 0, 99)}
      ${numInput("dev-card-block", "格挡", ov.block, 0, 99)}
      ${numInput("dev-card-knock", "推", ov.knock, 0, 10)}
      ${numInput("dev-card-wall", "撞壁", ov.wall, 0, 30)}
      ${numInput("dev-card-steps", "步数", ov.steps, 0, 4)}
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
  if (activeTab === "weapon") return renderWeaponEditor();
  if (activeTab === "card") return renderCardEditor();
  if (activeTab === "tech") return renderTechEditor();
  if (activeTab === "mate") return renderMateEditor();
  return "";
}

const TABS: { id: DevTab; label: string }[] = [
  { id: "combat", label: "战斗" },
  { id: "enemy", label: "敌人" },
  { id: "weapon", label: "兵刃" },
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

function readNum(el: HTMLInputElement | HTMLTextAreaElement | null): number | undefined {
  if (!el || el.value === "") return undefined;
  const n = Number(el.value);
  return Number.isFinite(n) ? n : undefined;
}

function readStr(el: HTMLInputElement | HTMLTextAreaElement | null): string | undefined {
  const v = el?.value?.trim();
  return v || undefined;
}

function collectEntityPatch(): Record<string, unknown> {
  const g = (id: string) => document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | null;
  if (activeTab === "enemy") {
    return {
      hp: readNum(g("dev-enemy-hp")),
      pos: readNum(g("dev-enemy-pos")),
      reach: readNum(g("dev-enemy-reach")),
      pace: readNum(g("dev-enemy-pace")),
    };
  }
  if (activeTab === "weapon") {
    return { damage: readNum(g("dev-weapon-dmg")), knock: readNum(g("dev-weapon-knock")), ward: readNum(g("dev-weapon-ward")) };
  }
  if (activeTab === "card") {
    return {
      cost: readNum(g("dev-card-cost")),
      damage: readNum(g("dev-card-dmg")),
      block: readNum(g("dev-card-block")),
      knock: readNum(g("dev-card-knock")),
      wall: readNum(g("dev-card-wall")),
      steps: readNum(g("dev-card-steps")),
    };
  }
  if (activeTab === "tech") {
    const name = readStr(g("dev-tech-name"));
    const text = readStr(g("dev-tech-text"));
    return { ...(name ? { name } : {}), ...(text ? { text } : {}) };
  }
  const hp = readNum(g("dev-mate-hp"));
  const pname = readStr(g("dev-mate-passive-name"));
  const ptext = readStr(g("dev-mate-passive-text"));
  return {
    ...(hp != null ? { hp } : {}),
    ...(pname || ptext ? { passive: { name: pname ?? "", text: ptext ?? "" } } : {}),
  };
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
    devStage = Number((root.querySelector("#dev-stage") as HTMLInputElement).value) || 1;
    const peakEl = root.querySelector("#dev-peak");
    const revEl = root.querySelector("#dev-revive");
    if (peakEl) peakEl.textContent = String(peakPotAnchor(devStage));
    if (revEl) revEl.textContent = String(reviveCost(devStage));
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
      <div class="lab-wiki-panel lab-dev-modal">
        <header class="lab-wiki-head">
          <h2 class="lab-guide-title">实验台 · 数值调参</h2>
          <button type="button" class="lab-wiki-close" id="lab-dev-close" aria-label="关闭">×</button>
        </header>
        ${renderGauntletDevPanel()}
      </div>
    </div>`;
}
