import { constableInk, delayInk, ghostInk, lordInk, ropeInk, saberInk, stakeInk, twinInk } from "../art";
import { cardArt } from "../art/cardArt";
import { charArt, foeCharArt, hasCharArt, summonCharArt } from "../art/charArt";
import { combatBg, hasStand, stand } from "../art/portraits";
import { slashForFx, vfxUrl } from "../art/vfxArt";
import { artUrl } from "../art/artUrl";
import { weaponArtMarkup } from "../art/weaponArt";
import { battleEquippedSchool } from "../game/equippedWeapon";
import { breakMomentumRiderLabel } from "../game/labV2";
import { ENEMY_GEAR_GRADE_LABEL } from "../game/enemyGear";
import { labCard } from "../game/labContent";
import { ENEMIES, ENEMY_WEAPON, TECHNIQUES } from "../game/content";
import { cardDisplayText } from "../game/cardTextV2";
import { variantActiveLabel, variantBranch } from "../game/labV21";
import { ROLE_LABEL } from "../game/labV25Constants";
import { isLabV2 } from "../game/labTuning";
import { MOVE_CARD_IDS } from "../game/intentWeakness";
import { isBreakAlign, isBreakLesson } from "./labRuleset";
import { MATES, MATE_PASSIVE, WEAPON_NAME, schoolLabel } from "../game/party";
import { dangerCells, livingFoes, statusChips, yourPace, isComboUnlockCard } from "../game/sim";
import { BOARD_SIZE, type Battle, type EnemyId, type Preview } from "../game/types";
import { gearById, starterGear } from "../game/weapons";
import { escapeHtml } from "./setupUi";
import { techniqueTip } from "./breakAlign";
import { isHighStake, stakeHitsAt } from "../game/stake";
import { renderFxLayer, renderGrudgeBadge, renderFoeIntentStrip, threatCellsForHover } from "./labV2Ui";

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function mateArt(id: string, kind: string): string {
  const who = id === "hooker" ? "roper" : id;
  if (hasCharArt(who)) return charArt(who, kind);
  if (hasStand(who)) return stand(who, kind);
  return stand("rail", kind);
}

function foeArt(id: EnemyId, kind = "board"): string {
  const ink = foeCharArt(id, kind);
  if (ink) return ink;
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

/** 最新一条演出事件对应的刀光层（随 fx 队列更新，动画结束自隐）。 */
function slashOverlay(b: Battle, side: "you" | "foe"): string {
  const fx = b.v2FxQueue ?? [];
  const vfx = slashForFx(fx[fx.length - 1], side);
  if (!vfx) return "";
  return `<img class="lab-slash-overlay" src="${vfxUrl(vfx)}" alt="" draggable="false">`;
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
        `<div class="status-chip" data-tip="${escapeAttr(c.tip)}"><b>${c.name}</b><em>${c.value}</em><span class="status-tip">${escapeHtml(c.tip)}</span></div>`,
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
  return `${m.name} · ${m.title} · 气血 ${b.player.hp}/${b.player.maxHp} · 劲 ${b.energy}/${b.energyMax} · ${WEAPON_NAME[eq]} · ${ROLE_LABEL[m.role]} · 外功 ${techs}`;
}

function foeSideTip(b: Battle, foeHp: number, foeMax: number): string {
  const def = ENEMIES[b.enemyId];
  return `${def.name} · ${def.title} · 气血 ${foeHp}/${foeMax} · 敌劲 ${b.enemyEnergy}/${b.enemyEnergyMax} · ${WEAPON_NAME[ENEMY_WEAPON[b.enemyId]]}`;
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
    if (b.stakes.includes(i) && !isEnemy && !isPlayer) {
      const high = isHighStake(b, i);
      const hits = stakeHitsAt(b, i);
      const src = artUrl(high ? "art/vfx/stake-high.png" : "art/vfx/stake-low.png");
      const tip = `${high ? "高阶桩" : "低阶桩"} · 还挡 ${hits} 次攻击`;
      body += `<div class="fig stake" data-tip="${escapeAttr(tip)}"><img src="${src}" alt="桩"><span>${high ? "高阶桩" : "桩"}·${hits}</span></div>`;
    }
    if (isPlayer) {
      const youFigTip = `${b.player.name} · 你的落脚`;
      body += `<div class="fig you" data-tip="${escapeAttr(youFigTip)}">${mateArt(b.active, "board")}<span>${b.player.name}</span></div>`;
    } else if (isSummon && summon) {
      // §31.12 助战符召唤体：客座好手，一回合即走
      const smTip = `${summon.name} · 助战 ${summon.hp}/${summon.maxHp}${summon.taunt ? " · 吸仇中（敌下段攻击打他，算你拆）" : ""} · 你下回合开始时离场`;
      body += `<div class="fig summon" data-tip="${escapeAttr(smTip)}">${summonCharArt(summon.school, "board")}<span>${escapeHtml(summon.name)}<em>助</em></span><span class="status-tip">${escapeHtml(smTip)}</span></div>`;
    } else if (b.labAssistActive && b.labAssistPos === i) {
      const asTip = `助战·${MATES[b.labAssistActive].name} · 客座上场，段尽离场`;
      body += `<div class="fig assist" data-tip="${escapeAttr(asTip)}">${mateArt(b.labAssistActive, "board")}<span>${MATES[b.labAssistActive].name}<em>助</em></span><span class="status-tip">${escapeHtml(asTip)}</span></div>`;
    } else if (isEnemy) {
      const foe = livingFoes(b).find((f) => f.pos === i)!;
      const artId = (foe.id === "shadow" ? "twin" : foe.id === "twin" ? "twin" : b.enemyId) as EnemyId;
      body += `<div class="fig foe" data-tip="${escapeAttr(`${foe.name} · 对手落脚`)}">${foeArt(artId, "board")}<span>${foe.name}</span></div>`;
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

const MOVE_CHARGE_CARDS = new Set<string>(MOVE_CARD_IDS);

function renderBreakChargeHud(b: Battle): string {
  if (!isBreakAlign() || !isLabV2()) return "";
  const move = b.v2Turn?.moveCharges ?? 0;
  const anti = b.v2Turn?.antiGuardCharges ?? 0;
  const maxShow = 5;
  const pips = Array.from({ length: maxShow }, (_, i) =>
    `<span class="lab-charge-pip ${i < move ? "on" : ""}"></span>`,
  ).join("");
  const tip = "位移牌攒一层。走开红格时用得上。";
  const overflow = move > maxShow ? `<span class="lab-break-charge-num">${move}</span>` : "";
  return `<div class="lab-break-charge" data-tip="${escapeAttr(tip)}">
    <span class="lab-break-charge-label">位移</span>
    <span class="lab-break-charge-pips">${pips}</span>
    ${overflow}
    ${anti > 0 ? `<span class="lab-break-anti">破架 ${anti}</span>` : ""}
  </div>`;
}

function renderBreakTeachingBanner(stage: number | undefined, override?: string): string {
  if (override) return `<div class="lab-break-teach">${escapeHtml(override)}</div>`;
  if (!isBreakAlign() || !stage || stage > 2) return "";
  const copy =
    stage === 1
      ? "红格是他要落的步。走开或卸力。刀贴身打得重，枪要拉开。"
      : "格挡能扛一段。先站稳，再找空档出刀。";
  return `<div class="lab-break-teach">${escapeHtml(copy)}</div>`;
}

function labCoachText(b: Battle, prev: Preview | null, gauntletStage?: number, coachOverride?: string): string {
  if (coachOverride) return coachOverride;
  const lesson = isBreakLesson(b);
  if (lesson && gauntletStage === 1) {
    if ((b.v2BreakCount ?? 0) >= 1 && !prev) return "这就是硬拆——他的招打空，你反打了。继续拆，或进攻收官。";
    if (!prev && (b.v2Turn?.moveCharges ?? 0) > 0) return "充能有了。确认已离开红格落点，点「收势」拆他的招。";
    if (!prev) return "你正站在他的落点上。打「撤步」离开红格攒充能——破招是躲开落点，不是迎上去。";
  }
  if (lesson && gauntletStage === 2 && !prev) {
    return "先卸力堆格挡「让」半伤；有充能再硬拆高伤段。";
  }
  if (lesson && !prev) {
    const outcomes = (b.v2LastIntentRecap ?? []).map((r) => r.outcome);
    if (outcomes.includes("劲尽")) return "他劲尽了，这段没出来。";
    if (outcomes.includes("追") && !outcomes.includes("破")) return "追上了。他仍撤，你得了拆势。";
    if (outcomes.includes("放") && !outcomes.includes("破") && !outcomes.includes("追")) return "没追：他撤了，不算拆。";
    if (outcomes.includes("空") && !outcomes.includes("破")) return "打空了——开局不在红格，不算拆。";
    if (outcomes.includes("让") && !outcomes.includes("破")) return "让开一半。高伤段再用充能硬拆。";
    if (outcomes.includes("打") && !outcomes.includes("破") && !outcomes.includes("让")) return "挨实了。下回合看红格再拆。";
  }
  if (isBreakAlign() && !lesson && !prev) {
    if (gauntletStage === 1) return "看红格落点。走开或堆挡。";
    if (gauntletStage === 2) return "格挡能扛一段。再找空档打他。";
    const outcomes = (b.v2LastIntentRecap ?? []).map((r) => r.outcome);
    if (outcomes.includes("劲尽")) return "他这段没出来。";
    if (outcomes.includes("空")) return "这段打空了。";
    if (outcomes.includes("打")) return "挨了一下。看下一段落点。";
  }
  if (prev && prev.legal && prev.enemyDies) return "他要撑不住了。";
  if (b.energy === 0) return lesson ? "劲尽了。收势，看他下一招——想想怎么拆。" : "劲尽了。收势，看他下一招。";
  const intent = b.intent;
  if (isLabV2() && (b.qi ?? 0) > 0 && !(lesson && (gauntletStage ?? 99) <= 2)) {
    return lesson
      ? `势 ${b.qi}。硬拆叠势后爆打，或先拆再收势反打。`
      : `势 ${b.qi}。积势还是爆势，这一息要想清。`;
  }
  if (lesson && isLabV2()) {
    const charges = b.v2Turn?.moveCharges ?? 0;
    if (charges > 0) return `位移 ${charges}。走开红格再收势。`;
    return "打位移牌攒充能，或卸力让拆。红格是他要落的步。";
  }
  if (intent.kind === "strike") return "红格是他要落的步。卸力，或进步躲开。";
  if (intent.kind === "charge") return "他要冲过来。让开红格，或用推宫撞他。";
  if (intent.kind === "guard") return "他架着。破架或推开再出掌。";
  return ENEMIES[b.enemyId].pitch;
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
  /** 示范闭环：高亮牌 + 覆盖教练/教学条。 */
  demoGuide?: {
    cardIds: string[];
    coach: string;
    teach: string;
    stage: number;
    /** 严格步：非引导牌显示禁用样式 */
    lockOthers?: boolean;
  };
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
    demoGuide,
  } = opts;
  const breakAlign = isBreakAlign();
  const guideSet = new Set(demoGuide?.cardIds ?? []);
  const teachStage = demoGuide?.stage ?? gauntletStage;
  const mate = MATES[b.active];
  const live = livingFoes(b);
  const foeHp = live.reduce((s, f) => s + f.hp, 0);
  const foeMax = live.reduce((s, f) => s + f.maxHp, 0) || b.enemy.maxHp;
  // 明示敌方人数：场上存活 + 踢馆轮番替补（§31.17）
  const queueN = b.gauntletWaveQueue?.length ?? 0;
  const foeRemain = live.length + (b.gauntletWaveEnemy ? 1 : 0) + queueN;
  const waiting = (b.gauntletWaveEnemy ? 1 : 0) + queueN;
  const foeRemainTip = waiting
    ? `场上 ${live.length} 人，打倒后还有 ${waiting} 人接力上场`
    : live.length > 1
      ? `场上共 ${live.length} 名敌人`
      : "敌方只剩这一人";
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
            if (!t) return "";
            const tip = techniqueTip(id);
            return `<span class="tech-chip" data-tip="${escapeAttr(tip)}">${escapeHtml(t.name)}<span class="status-tip">${escapeHtml(tip)}</span></span>`;
          })
          .join("")}</div>`
      : `<div class="tech-list empty" aria-hidden="true"></div>`;

  const hand = b.hand
    .map((c, idx) => {
      const def = labCard(c.defId);
      const gate = discardMode ? { ok: true as const } : canPlay(c.uid);
      const active = hoverUid === c.uid;
      const vBranch = isLabV2() ? variantBranch(def, b) : null;
      const vLabel = vBranch ? variantActiveLabel(def, b) : null;
      const vClass = vBranch ? `variant-on variant-${vBranch}` : def.variant ? "variant-idle" : "";
      const comboUnlock = isComboUnlockCard(b, c.defId) && gate.ok;
      const comboBadge = comboUnlock ? `<span class="combo-unlock-badge">合</span>` : "";
      const vBadge = vLabel ? `<span class="variant-badge">${escapeHtml(vLabel)}</span>` : "";
      const chargeCard = breakAlign && MOVE_CHARGE_CARDS.has(def.id) ? "break-charge-card" : "";
      const mom = (b.v2BreakMomentum ?? 0) > 0 && def.type === "attack";
      const momClass = mom ? "break-momentum" : "";
      const momBadge = mom
        ? `<span class="combo-unlock-badge break-mom">${escapeHtml(`拆势·${breakMomentumRiderLabel(battleEquippedSchool(b, b.active))}`)}</span>`
        : "";
      const guided = guideSet.has(def.id);
      const lockedOut = Boolean(demoGuide?.lockOthers && !guided && !discardMode);
      const playGate = lockedOut ? { ok: false as const, reason: "本步请打高亮牌" } : gate;
      const cardTip = [
        def.name,
        `${typeLabel(def.type)} · ${schoolLabel(c.defId)}${def.tags?.includes("组合") ? " · 组合" : ""}`,
        cardDisplayText(def, { breakAlign }),
        playGate.ok ? def.flavor : (playGate.reason ?? def.flavor),
      ]
        .filter(Boolean)
        .join("\n");
      const teachBadge =
        breakAlign &&
        ((demoGuide && guided) || (!demoGuide && teachStage === 1 && MOVE_CHARGE_CARDS.has(def.id)))
          ? `<span class="combo-unlock-badge teach-move">打</span>`
          : guided && demoGuide?.stage === 2
            ? `<span class="combo-unlock-badge teach-move">让</span>`
            : "";
      return `
        <button class="card ${def.type} ${active ? "hot" : ""} ${playGate.ok ? "" : "dead"} ${comboUnlock ? "combo-unlock" : ""} ${vClass} ${chargeCard} ${momClass} ${guided ? "demo-guide-card" : ""}"
          data-uid="${c.uid}" data-tip="${escapeAttr(cardTip)}" style="--i:${idx}" ${playGate.ok ? "" : "disabled"}>
          <span class="cost">${def.cost}</span>
          ${teachBadge}${comboBadge}${vBadge}${momBadge}
          <div class="art">${cardArt(def.id)}</div>
          <div class="banner">${typeLabel(def.type)} · ${schoolLabel(c.defId)}${def.tags?.includes("组合") ? " · 组合" : ""}</div>
          <h3>${def.name}</h3>
          <p class="text">${escapeHtml(cardDisplayText(def, { breakAlign }))}</p>
          <p class="flavor">${playGate.ok ? def.flavor : playGate.reason ?? def.flavor}</p>
          <span class="hotkey">${idx + 1}</span>
        </button>`;
    })
    .join("");

  const youTip = mateSideTip(b);
  const foeTip = foeSideTip(b, foeHp, foeMax);
  const matePassive = MATE_PASSIVE[b.active];
  const passive = matePassive ? ` · ${matePassive.name}：${matePassive.text}` : "";
  const teachHtml = renderBreakTeachingBanner(teachStage, demoGuide?.teach);
  const hasTeach = Boolean(teachHtml);

  return `
    <div class="lab-battle-shell ${fxClass}">
      ${renderGrudgeBadge(b)}
      ${renderFxLayer(b)}
      <section class="combat fy-combat ink-combat lab-prod-combat${hasTeach ? " has-teach" : ""}" style="background-image:url('${b.labSceneBg ?? combatBg("wharf")}')">
        <header class="fy-top lab-combat-top">
          <div class="fy-place">
            <b>肉鸽踢馆</b>
          </div>
          <h1 class="fy-ink">七步石台</h1>
          <div class="fy-stats lab-combat-tools">
            ${toolbarExtra}
            ${`<span class="fy-btn lab-mode-badge" data-tip="十馆爬塔。站位和兵器是正事。">肉鸽踢馆</span>`}
            <span class="fy-btn hp" data-tip="当前回合">回合 ${b.turn}</span>
            <span class="fy-btn" data-tip="先机对比">先机 ${yourPace(b)}/${b.foePace}</span>
          </div>
        </header>

        <div class="lab-battlefield-band">
          <div class="arena">
            <aside class="fighter you-side">
              <div class="lab-aside-head" aria-hidden="true"></div>
              <div class="lab-stand-slot" data-tip="${escapeAttr(youTip)}">
                <div class="fy-stand-wrap you ink-frame">${mateArt(b.active, "side")}${slashOverlay(b, "you")}</div>
              </div>
              <div class="lab-name-slot" data-tip="${escapeAttr(youTip + passive)}">
                <b>${mate.name}</b>
                <span>${mate.title} · ${WEAPON_NAME[eqSchool]}</span>
              </div>
              <div class="lab-bar-slot">${hpBar(b.player.hp, b.player.maxHp)}</div>
              <div class="lab-bar-slot">${qiBar(b.energy, b.energyMax, b.energyRegen)}</div>
              <div class="lab-aside-extra">
                <div class="lab-tech-slot">${techList}</div>
                ${entranceNote}${freshNote}
              </div>
            </aside>

            <div class="stage-core">
              <div class="lab-intent-band">${renderFoeIntentStrip(b, hoverIntentIdx)}</div>
              ${teachHtml}
              <div class="strip" id="strip">${renderProdBoard(b, prev, threatHighlight, summonPickCells ?? [])}</div>
              <div class="coach" id="coach">${labCoachText(b, prev, teachStage, demoGuide?.coach)}</div>
            </div>

            <aside class="fighter foe-side">
              <div class="lab-aside-head" aria-hidden="true"></div>
              <div class="lab-stand-slot" data-tip="${escapeAttr(foeTip)}">
                <div class="fy-stand-wrap foe ink-frame">${foeArt(b.enemyId, "side")}${slashOverlay(b, "foe")}</div>
              </div>
              <div class="lab-name-slot" data-tip="${escapeAttr(foeTip)}">
                <b>${b.enemy.name}${live.length > 1 ? ` · ${live.length}人` : ""}</b>
                <span>${b.labEnemyGrade ? `${ENEMY_GEAR_GRADE_LABEL[b.labEnemyGrade]} · ` : ""}${b.enemy.title} · ${WEAPON_NAME[ENEMY_WEAPON[b.enemyId]]}</span>
                <span class="lab-foe-count" data-tip="${escapeAttr(foeRemainTip)}">敌方剩 ${foeRemain} 人${waiting ? "（含替补）" : ""}</span>
              </div>
              <div class="lab-bar-slot">${foeBars}</div>
              <div class="lab-bar-slot">${qiBar(b.enemyEnergy, b.enemyEnergyMax)}</div>
            </aside>
          </div>
        </div>

        ${
          isBreakAlign() && isLabV2()
            ? `<div class="lab-break-charge-rail">${renderBreakChargeHud(b)}</div>`
            : ""
        }

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
        </footer>
      </section>
      ${weaponSheetHtml}
      ${pauseOverlay}
    </div>`;
}
