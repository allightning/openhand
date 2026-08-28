import { constableInk, delayInk, ghostInk, lordInk, ropeInk, saberInk, stakeInk, twinInk } from "../art";
import { cardArt } from "../art/cardArt";
import { combatBg, hasStand, stand } from "../art/portraits";
import { weaponArtMarkup } from "../art/weaponArt";
import { battleEquippedSchool } from "../game/equippedWeapon";
import { CARDS, ENEMIES, ENEMY_WEAPON, TECHNIQUES } from "../game/content";
import { cardDisplayText } from "../game/cardTextV2";
import { variantActiveLabel, variantBranch } from "../game/labV21";
import { ROLE_LABEL } from "../game/labV25Constants";
import { isLabV2 } from "../game/labTuning";
import { isBreakAlign } from "./labRuleset";
import { MATES, MATE_PASSIVE, WEAPON_NAME, schoolLabel } from "../game/party";
import { dangerCells, livingFoes, statusChips, yourPace, isComboUnlockCard } from "../game/sim";
import { BOARD_SIZE, type Battle, type EnemyId, type Preview } from "../game/types";
import { gearById, starterGear } from "../game/weapons";
import { escapeHtml } from "./setupUi";
import { renderFxLayer, renderGrudgeBadge, renderFoeIntentStrip, threatCellsForHover } from "./labV2Ui";

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function mateArt(id: string, kind: string): string {
  const who = id === "hooker" ? "roper" : id;
  if (hasStand(who)) return stand(who, kind);
  return stand("rail", kind);
}

function foeArt(id: EnemyId, kind = "board"): string {
  if (hasStand(id)) return stand(id, kind);
  if (id === "escort") return saberInk();
  if (id === "piler") return stakeInk();
  if (id === "hauler") return ropeInk();
  if (id === "trapper") return stakeInk();
  if (id === "delay") return delayInk();
  if (id === "twin") return twinInk();
  if (id === "lord" || id === "usurper") return lordInk();
  return constableInk();
}

function foeWeaponId(id: EnemyId): string {
  const school = ENEMY_WEAPON[id];
  const hard =
    id === "lord" ||
    id === "usurper" ||
    id === "bandit" ||
    id === "nametaker" ||
    id === "stakeboss" ||
    id === "knotboss" ||
    id === "glasspin";
  return hard ? `${school}-6` : `${school}-3`;
}

function hpBar(current: number, max: number, extra = ""): string {
  const pct = Math.max(0, Math.round((current / Math.max(1, max)) * 100));
  return `<div class="bar hp ${extra}"><i style="width:${pct}%"></i><span class="bar-read">${current}/${max}</span></div>`;
}

function qiBar(current: number, max: number, regen?: number): string {
  const pct = Math.max(0, Math.round((current / Math.max(1, max)) * 100));
  const extra = regen != null ? ` · 回${regen}` : "";
  return `<div class="bar qi"><i style="width:${pct}%"></i><span class="bar-read">${current}/${max}${extra}</span></div>`;
}

function renderStatusCol(b: Battle, side: "you" | "foe"): string {
  const chips = statusChips(b, side);
  if (!chips.length) return `<div class="status-col ${side}-status empty" aria-hidden="true"></div>`;
  const rows = chips
    .map(
      (c) =>
        `<div class="status-chip"><b>${c.name}</b><em>${c.value}</em><span class="status-tip">${escapeHtml(c.tip)}</span></div>`,
    )
    .join("");
  return `<div class="status-col ${side}-status">${rows}</div>`;
}

function typeLabel(type: string): string {
  return type === "attack" ? "攻击" : "技能";
}

function mateSideTip(b: Battle): string {
  const m = MATES[b.active];
  const eq = battleEquippedSchool(b, b.active);
  const techs = b.techniques.map((id) => TECHNIQUES[id].name).join("、") || "无外功";
  return `${m.name} · ${m.title} · HP ${b.player.hp}/${b.player.maxHp} · 劲 ${b.energy}/${b.energyMax} · ${WEAPON_NAME[eq]} · ${ROLE_LABEL[m.role]} · 外功 ${techs}`;
}

function foeSideTip(b: Battle, foeHp: number, foeMax: number): string {
  const def = ENEMIES[b.enemyId];
  return `${def.name} · ${def.title} · HP ${foeHp}/${foeMax} · 敌劲 ${b.enemyEnergy}/${b.enemyEnergyMax} · ${WEAPON_NAME[ENEMY_WEAPON[b.enemyId]]}`;
}

export function renderProdBoard(
  b: Battle,
  prev: Preview | null,
  threatHighlight: number[] = [],
  summonPickCells: number[] = [],
): string {
  const danger = dangerCells(b);
  // §31.10 兵刃威胁圈：敌当前位置 ±reach 的格常亮淡红——「退一步是否还挨刀」一眼可查。
  const reach = ENEMIES[b.enemyId]?.reach ?? 1;
  const reachCells: number[] = [];
  for (const f of livingFoes(b)) {
    for (let d = 1; d <= reach; d++) {
      if (f.pos - d >= 0) reachCells.push(f.pos - d);
      if (f.pos + d < BOARD_SIZE) reachCells.push(f.pos + d);
    }
  }
  const summon = isLabV2() ? b.labSummon : null;
  return Array.from({ length: BOARD_SIZE }, (_, i) => {
    const isPlayer = b.player.hp > 0 && b.player.pos === i;
    const isEnemy = livingFoes(b).some((f) => f.pos === i);
    const isSummon = Boolean(summon && summon.hp > 0 && summon.pos === i);
    const ghostEnemy = Boolean(prev && prev.legal && prev.enemyPos === i && prev.enemyPos !== b.enemy.pos);
    const ghostYou = Boolean(prev && prev.legal && prev.playerPos === i && prev.playerPos !== b.player.pos);
    const pickable = summonPickCells.includes(i);
    const classes = [
      "cell",
      danger.includes(i) ? "red" : "",
      !danger.includes(i) && reachCells.includes(i) && !isEnemy ? "reach" : "",
      threatHighlight.includes(i) ? "threat-hot" : "",
      i === BOARD_SIZE - 1 ? "wall" : "",
      ghostEnemy || ghostYou ? "ghost" : "",
      b.stakes.includes(i) ? "staked" : "",
      b.traps.includes(i) ? "trapped" : "",
      pickable ? "summon-pick" : "",
    ]
      .filter(Boolean)
      .join(" ");

    let body = `<em>${i + 1}</em>`;
    if (b.traps.includes(i) && !isEnemy && !isPlayer) body += `<div class="fig trap"><span>机</span></div>`;
    if (b.stakes.includes(i) && !isEnemy && !isPlayer) body += `<div class="fig stake"><span>桩</span></div>`;
    if (isPlayer) {
      body += `<div class="fig you">${mateArt(b.active, "board")}<span>${b.player.name}</span></div>`;
    } else if (isSummon && summon) {
      // §31.12 助战符召唤体：客座好手，一回合即走
      const smTip = `${summon.name} · 助战 ${summon.hp}/${summon.maxHp}${summon.taunt ? " · 吸仇中（敌下段攻击打他，算你拆）" : ""} · 你下回合开始时离场`;
      body += `<div class="fig summon"><span class="summon-glyph">${escapeHtml(summon.name)}<em>助</em><i>${summon.hp}</i></span><span class="status-tip">${escapeAttr(smTip)}</span></div>`;
    } else if (b.labAssistActive && b.labAssistPos === i) {
      body += `<div class="fig assist">${mateArt(b.labAssistActive, "board")}<span>${MATES[b.labAssistActive].name}<em>助</em></span></div>`;
    } else if (isEnemy) {
      const foe = livingFoes(b).find((f) => f.pos === i)!;
      const artId = (foe.id === "shadow" ? "twin" : foe.id === "twin" ? "twin" : b.enemyId) as EnemyId;
      body += `<div class="fig foe">${foeArt(artId, "board")}<span>${foe.name}</span></div>`;
    } else if (ghostEnemy) {
      body += `<div class="fig ghost">${ghostInk()}<span>将被推到这</span></div>`;
    } else if (ghostYou) {
      body += `<div class="fig ghost">${ghostInk()}<span>落脚</span></div>`;
    } else if (i === BOARD_SIZE - 1) {
      body += `<span class="wall-label">壁</span>`;
    }
    return `<div class="${classes}" data-pos="${i}">${body}</div>`;
  }).join("");
}

function stanceLine(b: Battle): string {
  const live = livingFoes(b);
  const foe = live[0] ?? b.enemy;
  const block = ` / 格挡 ${b.playerBlock}`;
  const foeBlock = b.enemyBlock > 0 ? ` / 架势 ${b.enemyBlock}` : "";
  return `你 ${b.player.hp} 血${block}　·　${foe.name} ${foe.hp} 血${foeBlock}　·　第 ${foe.pos + 1} 步`;
}

const MOVE_CHARGE_CARDS = new Set(["advance", "advance2", "sweep", "retreat", "sidestep"]);

function renderBreakChargeHud(b: Battle): string {
  if (!isBreakAlign() || !isLabV2()) return "";
  const move = b.v2Turn?.moveCharges ?? 0;
  const anti = b.v2Turn?.antiGuardCharges ?? 0;
  const maxShow = 5;
  const pips = Array.from({ length: maxShow }, (_, i) =>
    `<span class="lab-charge-pip ${i < move ? "on" : ""}"></span>`,
  ).join("");
  const tip = "位移牌 +1 拆招充能；硬拆一段打击类消耗 1。破架类牌 +1，拆架势段消耗 1。";
  return `<div class="lab-break-charge" data-tip="${escapeAttr(tip)}">
    <span class="lab-break-charge-label">拆招充能</span>
    <span class="lab-break-charge-pips">${pips}</span>
    <span class="lab-break-charge-num">${move}</span>
    ${anti > 0 ? `<span class="lab-break-anti">破架 ${anti}</span>` : ""}
  </div>`;
}

function renderBreakTeachingBanner(stage: number | undefined): string {
  if (!isBreakAlign() || !stage || stage > 2) return "";
  const copy =
    stage === 1
      ? "入门馆：位移牌 +1 拆招充能。收势时离开红格 = 硬拆（耗 1 充能），那段全免并反打真伤。"
      : "入门馆：格挡够高 = 让拆（半效）。带「眼」的段硬拆 → 套路崩塌 + 失衡承伤×2。";
  return `<div class="lab-break-teach">${escapeHtml(copy)}</div>`;
}

function labCoachText(b: Battle, prev: Preview | null, gauntletStage?: number): string {
  if (isBreakAlign() && gauntletStage === 1 && !prev) {
    return "先看意图条，再打位移牌攒拆招充能。离开红格收势 = 硬拆。";
  }
  if (isBreakAlign() && gauntletStage === 2 && !prev) {
    return "卸力够高可让拆；找带「眼」的段，硬拆它整套崩。";
  }
  if (prev && prev.legal && prev.enemyDies) return "他要撑不住了。";
  if (b.energy === 0) return isBreakAlign() ? "劲尽了。收势，看他下一招——想想怎么拆。" : "劲尽了。收势，看他下一招。";
  const intent = b.intent;
  if (isLabV2() && (b.qi ?? 0) > 0) {
    return isBreakAlign()
      ? `势 ${b.qi}。硬拆叠势后爆打，或先拆再收势反打。`
      : `势 ${b.qi}。积势还是爆势，这一息要想清。`;
  }
  if (isBreakAlign() && isLabV2()) {
    const charges = b.v2Turn?.moveCharges ?? 0;
    if (charges > 0) return `拆招充能 ${charges}。悬停意图段看破法，硬拆高伤段。`;
    return "打位移牌攒充能，或卸力让拆。红格是他要落的步。";
  }
  if (intent.kind === "strike") return "红格是他要落的步。卸力，或进步躲开。";
  if (intent.kind === "charge") return "他要冲过来。让开红格，或用推宫撞他。";
  if (intent.kind === "guard") return "他架着。破架或推开再出掌。";
  return ENEMIES[b.enemyId].pitch;
}

function renderPreview(b: Battle, prev: Preview | null): string {
  // §31.12 预演条双态：不选牌 = 上轮敌招回顾（血不能扣得不明不白）；选牌 = 这张牌的预演。
  if (!prev) {
    const recap = isLabV2() ? (b.v2LastFoeTurn ?? []).filter((l) => l !== "你收势。") : [];
    if (recap.length) {
      const shown = recap.slice(-4);
      const more = recap.length > shown.length ? `…共 ${recap.length} 件 · ` : "";
      return `<div class="preview idle recap"><b>上轮</b> ${more}${shown.map(escapeHtml).join("　·　")}</div>`;
    }
    return `<div class="preview idle">看他的招，想你的牌。　·　${stanceLine(b)}</div>`;
  }
  if (!prev.legal) {
    return `<div class="preview bad">${escapeHtml(prev.reason ?? "现在不能打出")}　·　${stanceLine(b)}</div>`;
  }
  const foeBlock = prev.enemyBlock > 0 ? ` / 架势 ${prev.enemyBlock}` : "";
  const bits = [
    ...prev.notes,
    `你 ${prev.playerHp} 血 / 格挡 ${prev.playerBlock}`,
    prev.enemyDies
      ? `${b.enemy.name}倒下`
      : `${b.enemy.name} ${prev.enemyHp} 血${foeBlock} · 第 ${prev.enemyPos + 1} 步`,
  ];
  return `<div class="preview live">${bits.join("  ·  ")}</div>`;
}

function weaponPlate(id: string, side: "you" | "foe"): string {
  const g = gearById(id);
  const tip = g ? `${g.name} · ${g.tip}（点开细看）` : "兵刃";
  return weaponArtMarkup(id, { button: true }).replace(
    'class="weapon-plate"',
    `class="weapon-plate lab-weapon-open" data-weapon-open="${id}" data-tip="${escapeAttr(tip)}"`,
  );
}

export interface ProdBattleOpts {
  b: Battle;
  prev: Preview | null;
  hoverUid: string | null;
  hoverIntentIdx: number | null;
  weaponId: string;
  canPlay: (uid: string) => { ok: boolean; reason?: string };
  /** §31.10 弃牌模式：手牌不因劲力不足而禁用（弃牌不耗劲）。 */
  discardMode?: boolean;
  /** §31.12 助战符点位模式：可落点格高亮。 */
  summonPickCells?: number[];
  actionRowHtml: string;
  entranceNote: string;
  freshNote: string;
  fxClass: string;
  pauseOverlay: string;
  toolbarExtra: string;
  weaponSheetHtml: string;
  /** 踢馆当前馆序（拆招版 1–2 关教学用）。 */
  gauntletStage?: number;
}

export function renderProdBattle(opts: ProdBattleOpts): string {
  const {
    b,
    prev,
    hoverUid,
    hoverIntentIdx,
    weaponId,
    canPlay,
    discardMode,
    summonPickCells,
    actionRowHtml,
    entranceNote,
    freshNote,
    fxClass,
    pauseOverlay,
    toolbarExtra,
    weaponSheetHtml,
    gauntletStage,
  } = opts;
  const breakAlign = isBreakAlign();
  const mate = MATES[b.active];
  const live = livingFoes(b);
  const foeHp = live.reduce((s, f) => s + f.hp, 0);
  const foeMax = live.reduce((s, f) => s + f.maxHp, 0) || b.enemy.maxHp;
  // 多敌人时血条分开算：主敌 + 每个额外敌人各自一条
  const foeBars = live.length > 1
    ? live.map((f) => `<div class="lab-foe-hp-row"><span>${f.name}</span>${hpBar(f.hp, f.maxHp)}</div>`).join("")
    : hpBar(foeHp, foeMax);
  const threatHighlight = threatCellsForHover(b, hoverIntentIdx);
  const gearId = weaponId || starterGear(mate.weapon);
  const eqSchool = battleEquippedSchool(b, b.active);
  const techList =
    b.techniques.length > 0
      ? `<div class="tech-list">${b.techniques
          .map((id) => {
            const t = TECHNIQUES[id];
            return `<span class="tech-chip">${t.name}<span class="status-tip">${escapeHtml(t.text)}</span></span>`;
          })
          .join("")}</div>`
      : `<div class="tech-list empty" aria-hidden="true"></div>`;

  const hand = b.hand
    .map((c, idx) => {
      const def = CARDS[c.defId];
      const gate = discardMode ? { ok: true as const } : canPlay(c.uid);
      const active = hoverUid === c.uid;
      const vBranch = isLabV2() ? variantBranch(def, b) : null;
      const vLabel = vBranch ? variantActiveLabel(def, b) : null;
      const vClass = vBranch ? `variant-on variant-${vBranch}` : def.variant ? "variant-idle" : "";
      const comboUnlock = isComboUnlockCard(b, c.defId) && gate.ok;
      const comboBadge = comboUnlock ? `<span class="combo-unlock-badge">合</span>` : "";
      const vBadge = vLabel ? `<span class="variant-badge">${escapeHtml(vLabel)}</span>` : "";
      const chargeCard = breakAlign && MOVE_CHARGE_CARDS.has(def.id) ? "break-charge-card" : "";
      return `
        <button class="card ${def.type} ${active ? "hot" : ""} ${gate.ok ? "" : "dead"} ${comboUnlock ? "combo-unlock" : ""} ${vClass} ${chargeCard}"
          data-uid="${c.uid}" style="--i:${idx}" ${gate.ok ? "" : "disabled"}>
          <span class="cost">${def.cost}</span>
          ${comboBadge}${vBadge}
          <div class="art">${cardArt(def.id)}</div>
          <div class="banner">${typeLabel(def.type)} · ${schoolLabel(c.defId)}${def.tags?.includes("组合") ? " · 组合" : ""}</div>
          <h3>${def.name}</h3>
          <p class="text">${escapeHtml(cardDisplayText(def, { breakAlign }))}</p>
          <p class="flavor">${gate.ok ? def.flavor : gate.reason ?? def.flavor}</p>
          <span class="hotkey">${idx + 1}</span>
        </button>`;
    })
    .join("");

  const youTip = mateSideTip(b);
  const foeTip = foeSideTip(b, foeHp, foeMax);
  const passive = MATE_PASSIVE[b.active] ? ` · ${MATE_PASSIVE[b.active]}` : "";

  return `
    <div class="lab-battle-shell ${fxClass}">
      ${renderGrudgeBadge(b)}
      ${renderFxLayer(b)}
      <section class="combat fy-combat ink-combat lab-prod-combat" style="background-image:url('${combatBg("wharf")}')">
        <header class="fy-top lab-combat-top">
          <div class="fy-place">
            <em>Combat Lab</em>
            <b>${breakAlign ? "拆招试炼" : "对战踢馆"}</b>
          </div>
          <h1 class="fy-ink">七步石台</h1>
          <div class="fy-stats lab-combat-tools">
            ${toolbarExtra}
            ${breakAlign ? `<span class="fy-btn lab-mode-badge" data-tip="拆招版：硬拆反打 · 10馆短局 · 核心产品测">拆招版</span>` : `<span class="fy-btn lab-mode-badge classic" data-tip="对战版：15馆爬塔 · 肉鸽 build · 拆招为辅">对战版</span>`}
            <span class="fy-btn hp" data-tip="当前回合">回合 ${b.turn}</span>
            <span class="fy-btn" data-tip="先机对比">先机 ${yourPace(b)}/${b.foePace}</span>
          </div>
        </header>

        <div class="lab-battlefield-band">
          <div class="arena">
            <aside class="fighter you-side">
              <div class="lab-aside-head" aria-hidden="true"></div>
              <div class="lab-stand-slot" data-tip="${escapeAttr(youTip)}">
                <div class="fy-stand-wrap you ink-frame">${mateArt(b.active, "side")}</div>
              </div>
              <div class="lab-name-slot" data-tip="${escapeAttr(youTip + passive)}">
                <b>${mate.name}</b>
                <span>${mate.title} · ${WEAPON_NAME[eqSchool]}</span>
              </div>
              <div class="lab-bar-slot">${hpBar(b.player.hp, b.player.maxHp)}</div>
              <div class="lab-bar-slot">${qiBar(b.energy, b.energyMax, b.energyRegen)}</div>
              <div class="lab-bar-slot">${renderBreakChargeHud(b)}</div>
              <div class="lab-aside-extra">
                <div class="lab-tech-slot">${techList}</div>
                ${entranceNote}${freshNote}
              </div>
            </aside>

            <div class="stage-core">
              ${renderBreakTeachingBanner(gauntletStage)}
              <div class="lab-intent-band">${renderFoeIntentStrip(b, hoverIntentIdx)}</div>
              <div class="strip" id="strip">${renderProdBoard(b, prev, threatHighlight, summonPickCells ?? [])}</div>
              <div class="coach" id="coach">${labCoachText(b, prev, gauntletStage)}</div>
            </div>

            <aside class="fighter foe-side">
              <div class="lab-aside-head" aria-hidden="true"></div>
              <div class="lab-stand-slot" data-tip="${escapeAttr(foeTip)}">
                <div class="fy-stand-wrap foe ink-frame">${foeArt(b.enemyId, "side")}</div>
              </div>
              <div class="lab-name-slot" data-tip="${escapeAttr(foeTip)}">
                <b>${b.enemy.name}${live.length > 1 ? ` · ${live.length}人` : ""}</b>
                <span>${b.enemy.title} · ${WEAPON_NAME[ENEMY_WEAPON[b.enemyId]]}</span>
                ${live.length > 1 ? `<span class="lab-foe-count">场上 ${live.length} 敌</span>` : ""}
              </div>
              <div class="lab-bar-slot">${foeBars}</div>
              <div class="lab-bar-slot">${qiBar(b.enemyEnergy, b.enemyEnergyMax)}</div>
            </aside>
          </div>
        </div>

        <footer class="lab-action-band bottombar">
          <div class="lab-action-row">${actionRowHtml}</div>
          <div class="lab-hand-row">
            <div class="draw-col lab-pile-col">
              ${weaponPlate(gearId, "you")}
              <button type="button" class="pile-card" data-pile="draw" data-tip="抽牌堆 · 残谱 ${b.drawPile.length} 张">
                <em>残谱</em>
                <b>${b.drawPile.length}</b>
              </button>
            </div>
            ${renderStatusCol(b, "you")}
            <div class="hand-scroll"><div class="hand" id="hand">${hand}</div></div>
            ${renderStatusCol(b, "foe")}
            <div class="foe-col lab-pile-col">
              ${weaponPlate(foeWeaponId(b.enemyId), "foe")}
              <button type="button" class="pile-card discard" data-pile="discard" data-tip="战记 ${b.journal.length} 条">
                <em>战记</em>
                <b>${b.journal.length}</b>
              </button>
            </div>
          </div>
          <div id="preview-slot">${renderPreview(b, prev)}</div>
        </footer>
      </section>
      ${weaponSheetHtml}
      ${pauseOverlay}
    </div>`;
}
