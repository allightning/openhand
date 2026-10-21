import { S } from "../flow/shellState";
import { api } from "../flow/shellApi";
import { battleHandCap, canEndPlayerTurn, labCanCycle, labCanComboReplay, isClimbQi, legalSummonCells, needsDiscardToHandCap, previewCard } from "../../game/sim";
import { handRefillAmount } from "../rogueRoster";
import { getLabTuning, isLabV2 } from "../labTuning";
import { computeResonance, itemChargeCount, labCanUseItem } from "../../game/labV21";
import { canUseSignature, signatureActionCopy } from "../../game/labSignature";
import { LAB_ITEM_LABEL, LAB_ITEM_TIP } from "../../game/labV21Constants";
import { assistEnergyCost, canCallAssist, isComboRulesEnabled } from "../../game/labAssist";
import { MATES, ROLE_LABEL, WEAPON_NAME, WEAPON_PACE } from "../../game/party";
import { shellRunContext } from "../shellContext";
import { labCanSwap, labSwapCost } from "../labCombat";
import { escapeHtml } from "../setupUi";
import { actionTipWrap, renderSliders } from "../render/shellChrome";
import { overlayRecapBattle } from "../foePlayback";
import { battleEquippedSchool } from "../../game/equippedWeapon";
import { runCompanions } from "../gauntlet";
import { currentDemoLesson, demoAllowsEndTurn, demoAllowsSwap, DEMO_FIST_MATE } from "../breakDemo";
import { renderDemoFoeDebrief } from "../breakDemoUi";
import { currentHallLesson, hallAllowsEndTurn, hallAllowsSwap, hallIsGuided, hallUsesQiCommit, hallCampaignShell } from "../trainingHall";
import { campaignAllowsEndTurn, campaignAllowsSwap, campaignLessonDone, currentCampaignLesson } from "../breakCampaign";
import { renderQiCommitBattle } from "../qiCommitUi";
import { renderBattleProd } from "./battleFrame";

function renderBattle(): string {
  if (S.campaignRun && S.qiFight && !S.gauntletRun) {
    return `${api.renderHeader()}${renderQiCommitBattle(S.qiFight, S.campaignRun)}`;
  }
  if (S.hallRun && S.qiFight && hallUsesQiCommit(S.hallRun.courseId) && !S.gauntletRun) {
    const shell = S.hallRun.qiTick ?? hallCampaignShell(S.hallRun);
    if (shell) return `${api.renderHeader()}${renderQiCommitBattle(S.qiFight, shell)}`;
  }
  if (!S.battle) return api.renderSetup();
  const inDemo = S.breakDemoRun != null;
  const inHall = S.hallRun != null;
  const inCampaign = S.campaignRun != null;
  const inHallGuide = Boolean(S.hallRun && hallIsGuided(S.hallRun));
  const inCampGuide = Boolean(S.campaignRun && !campaignLessonDone(S.campaignRun));
  const inGauntlet = S.gauntletRun != null;
  let b = S.battle;
  if (S.playbackShow) b = overlayRecapBattle(b, S.playbackShow);
  // 悬停任意牌都给全量预演：位移牌照旧画落脚小人，所有牌驱动底部预演条
  const prev = S.hoverUid ? previewCard(b, S.hoverUid, shellRunContext()) : null;
  const swapCost = labSwapCost();
  const partyMode = inDemo
    ? Boolean(S.breakDemoRun!.companion)
    : inHall
      ? Boolean(S.hallRun!.companion)
      : inCampaign
        ? false
      : !inGauntlet || Boolean(runCompanions(S.gauntletRun!).length || S.gauntletRun?.lifelineCompanion);
  const hallSwapStep = inHallGuide && currentHallLesson(S.hallRun!)?.kind === "swap" && S.hallRun!.foeDebrief == null;
  const campSwapStep =
    inCampGuide && currentCampaignLesson(S.campaignRun!).kind === "swap" && S.campaignRun!.foeDebrief == null;
  const swapTeach =
    (inDemo && S.breakDemoRun!.foeDebrief == null && currentDemoLesson(S.breakDemoRun!).kind === "swap") ||
    hallSwapStep ||
    campSwapStep;
  const endTeach =
    (inDemo && currentDemoLesson(S.breakDemoRun!).kind === "end" && !S.breakDemoRun!.foeDebrief) ||
    (inHallGuide && currentHallLesson(S.hallRun!)?.kind === "end" && !S.hallRun!.foeDebrief) ||
    (inCampGuide && currentCampaignLesson(S.campaignRun!).kind === "end" && !S.campaignRun!.foeDebrief);
  const swaps = !partyMode
    ? ""
    : b.bench
        .map((m) => {
          const baseGate = labCanSwap(b, m.id);
          const demoOk = inDemo
            ? demoAllowsSwap(S.breakDemoRun!, m.id)
            : inHallGuide
              ? hallAllowsSwap(S.hallRun!, m.id)
              : inCampGuide
                ? campaignAllowsSwap(S.campaignRun!, m.id)
              : true;
          const gate = !demoOk
            ? { ok: false as const, reason: "本步请换同伴上场" }
            : baseGate;
          const def = MATES[m.id];
          const school = battleEquippedSchool(b, m.id, shellRunContext());
          const teachTarget =
            (inDemo ? S.breakDemoRun?.companion : inHallGuide ? S.hallRun?.companion : null) ?? DEMO_FIST_MATE;
          const teachFist = swapTeach && m.id === teachTarget;
          const tip = gate.ok
            ? isLabV2()
              ? `换人·${def.name} · ${WEAPON_NAME[school]} · 先机 ${WEAPON_PACE[school]} · 气血 ${m.hp} · 耗 ${swapCost} 劲 · 登场势`
              : `换人·${def.name} · 耗 ${swapCost} 劲 · 落后一回合`
            : gate.reason ?? "不可换人";
          const teachTip = teachFist ? "示范：点这里换同伴上场" : tip;
          return `<button type="button" class="swap-btn lab-swap-btn ${teachFist ? "demo-swap-teach" : ""}" data-swap="${m.id}" data-tip="${escapeHtml(teachTip)}" ${gate.ok ? "" : "disabled"}><b>换人·${def.name}</b><small>${WEAPON_NAME[school]} · 先机 ${WEAPON_PACE[school]} · ${m.hp}</small><span class="status-tip">${escapeHtml(teachTip)}</span></button>`;
        })
        .join("");
  const assistCost = assistEnergyCost(b, shellRunContext());
  const fieldSchool = battleEquippedSchool(b, b.active, shellRunContext());
  // §31.12 助战与同行分家：v2 不再有「叫队友上场」的助战按钮（助战=助战符，同行=换人/光环/组合技）
  const assists =
    partyMode && isComboRulesEnabled(shellRunContext()) && !isLabV2()
      ? b.bench
          .map((m) => {
            const gate = canCallAssist(b, shellRunContext(), m.id);
            const def = MATES[m.id];
            const assistSchool = battleEquippedSchool(b, m.id, shellRunContext());
            const cross = assistSchool !== fieldSchool;
            const comboMark = cross ? `<span class="lab-combo-mark">合</span>` : "";
            const tip = gate.ok
              ? `助战·${def.name} · ${WEAPON_NAME[assistSchool]} · ${ROLE_LABEL[def.assist ?? def.role]} · 耗 ${assistCost} 劲${cross ? " · 跨系开闸" : ""}`
              : gate.reason ?? "不可助战";
            return `<button type="button" class="assist-btn lab-assist-btn" data-assist="${m.id}" data-tip="${escapeHtml(tip)}" ${gate.ok ? "" : "disabled"}>${comboMark}<b>助战·${def.name}</b><small>耗 ${assistCost} 劲 · ${m.hp}</small><span class="status-tip">${escapeHtml(tip)}</span></button>`;
          })
          .join("")
      : "";
  const assistBadge =
    !inGauntlet && !isLabV2() && b.labAssistActive && isComboRulesEnabled(shellRunContext())
      ? (() => {
          const id = b.labAssistActive!;
          const segs = Math.max(1, (b.intents?.length ?? 1) - (b.v2ResolveIntentIdx ?? 0));
          const tip = `助战中：${MATES[id].name} · 敌段余 ${segs}`;
          return `<span class="lab-assist-active-badge" data-tip="${escapeHtml(tip)}">助战中：${MATES[id].name} · 剩${segs}段<span class="status-tip">${escapeHtml(tip)}</span></span>`;
        })()
      : "";
  const res = computeResonance(b, shellRunContext());
  const schoolChips = inGauntlet
    ? ""
    : res.schools
        .filter((s) => s.tier > 0)
        .map((s) => {
          const target = s.tier >= 3 ? 4 : s.tier === 2 ? 4 : 3;
          const next =
            s.toNext > 0 ? ` · 距${s.tier === 1 ? "登堂" : "宗师"} ×${s.toNext}` : "";
          const tip = `${WEAPON_NAME[s.school]} · ${s.tierName}：${s.activeLabel || "已激活"}${next}`;
          return `<span class="lab-aura-chip" data-tip="${escapeHtml(tip)}">${escapeHtml(WEAPON_NAME[s.school])} ${s.count}/${target} · ${s.tierName}已激活${escapeHtml(next)}<span class="status-tip">${escapeHtml(tip)}</span></span>`;
        })
        .join("");
  const flower =
    !inGauntlet && res.hundredFlowers
      ? `<span class="lab-aura-chip lab-aura-flowers" data-tip="四系各异 · 先机+1 · 助战耗劲-1 · 首张组合卡-1劲">百花齐放<span class="status-tip">四系各异 · 先机+1 · 助战耗劲-1 · 首张组合卡-1劲</span></span>`
      : "";
  const sig = signatureActionCopy(b.active);
  const sigGate = canUseSignature(b, shellRunContext());
  const sigBtn =
    isLabV2() && sig
      ? actionTipWrap(
          `<button type="button" class="fy-btn lab-sig-btn" id="lab-signature" ${sigGate.ok ? "" : "disabled"}>${escapeHtml(sig.name)}</button>`,
          sigGate.ok ? sig.text : (sigGate.reason ?? "不可用"),
        )
      : "";
  const itemBtns = (b.labItems ?? [])
    .map((id) => {
      const gate = labCanUseItem(b, id, shellRunContext());
          const n = itemChargeCount(b, id);
          const tip = gate.ok ? (LAB_ITEM_TIP[id] ?? LAB_ITEM_LABEL[id] ?? id) : (gate.reason ?? "不可用");
          return actionTipWrap(
            `<button type="button" class="fy-btn lab-item-btn" data-item="${id}" ${gate.ok ? "" : "disabled"}>${escapeHtml(LAB_ITEM_LABEL[id] ?? id)} ×${n}</button>`,
            tip,
          );
    })
    .join("");
  const itemRow = [sigBtn, itemBtns].filter(Boolean).length
    ? `<span class="lab-action-group lab-action-items">${sigBtn}${itemBtns}</span>`
    : sigBtn
      ? `<span class="lab-action-group lab-action-items">${sigBtn}</span>`
      : "";
  const auraBlock =
    schoolChips || flower
      ? `<span class="lab-action-group lab-action-aura">${schoolChips}${flower}</span>`
      : "";
  const abortBtn = `<button type="button" class="fy-btn" id="btn-abort">中止报告</button>`;
  const overCap = needsDiscardToHandCap(b, shellRunContext());
  const handCap = battleHandCap(b);
  const refillN = handRefillAmount(handCap);
  const climb = isClimbQi(shellRunContext());
  const discardBtn =
    climb || overCap
      ? actionTipWrap(
          `<button type="button" class="fy-btn lab-discard-toggle ${S.discardMode || b.climbDiscardPhase ? "on" : ""}" id="btn-discard">弃牌 ${b.hand.length}/${handCap}</button>`,
          climb
            ? `点弃牌进入弃牌阶段：可弃任意张（含晕锁）。也可先打牌压张数。手牌 ≤ ${handCap} 才能收势。`
            : `手牌超过上限 ${handCap}：可打牌压张数，或点「弃牌」丢掉（不摸）。≤ 上限才能收势。`,
        )
      : "";
  const cycleGate = labCanCycle(b, shellRunContext());
  const cycleBtn =
    isLabV2() && !(overCap && !climb)
      ? actionTipWrap(
          `<button type="button" class="fy-btn lab-discard-toggle ${S.cycleMode ? "on" : ""}" id="btn-cycle" ${cycleGate.ok || S.cycleMode ? "" : "disabled"}>置换</button>`,
          climb
            ? cycleGate.ok || S.cycleMode
              ? "弃这张、摸 1。花费 = 牌费 − 1（1 费免费）。"
              : (cycleGate.reason ?? "不能置换")
            : cycleGate.ok || S.cycleMode
              ? "角色技：弃 1 张摸 1 张。每回一次。"
              : (cycleGate.reason ?? "本回已置换"),
        )
      : "";
  const comboGate = labCanComboReplay(b, shellRunContext());
  const comboBtn =
    climb && (comboGate.ok || (b.combo ?? 0) > 0)
      ? actionTipWrap(
          `<button type="button" class="fy-btn" id="btn-combo-replay" ${comboGate.ok ? "" : "disabled"}>连击重放</button>`,
          comboGate.ok
            ? `花 2 层连击，再打一次「${b.climbLastAttackId ? "上一张攻击" : ""}」。不耗劲、不耗手牌。`
            : (comboGate.reason ?? "不能重放"),
        )
      : "";
  const entranceNote = [
    S.summonPending
      ? `<p class="lab-entrance-note summon-hint">点一个空格让${escapeHtml(LAB_ITEM_LABEL[S.summonPending] ?? "助战")}落位（放敌身后可当墙）；Esc 取消</p>`
      : b.labEntranceActive && !b.labEntranceUsed
        ? `<p class="lab-entrance-note">登场势 — 首张攻击 +2</p>`
        : "",
  ]
    .filter(Boolean)
    .join("");
  const phaseBanner =
    climb && b.climbPhaseLabel
      ? `<p class="lab-phase-banner" data-tip="开始：摸牌→亮招。结束：敌招→裂创→回劲→敌回劲→霸体（有才播）。锁手至亮招结束。">${escapeHtml(b.climbPhaseLabel)}</p>`
      : "";
  const canEnd =
    b.phase === "player" &&
    canEndPlayerTurn(b, shellRunContext()).ok &&
    (!inDemo || demoAllowsEndTurn(S.breakDemoRun!)) &&
    (!inHallGuide || hallAllowsEndTurn(S.hallRun!)) &&
    (!inCampaign || campaignAllowsEndTurn(S.campaignRun!));
  const endBtnClass = `endturn fy-btn ${endTeach ? "demo-end-teach" : ""}`;
  const endTip = overCap
    ? `手牌 ${b.hand.length}/${handCap}：可先打牌压张数，或点「弃牌」丢掉多余的。≤${handCap} 才能收势`
    : endTeach
      ? "本步：点收势，系统结算敌招并讲解"
      : shellRunContext().ruleset.mode === "break"
        ? `结束本回合：敌行动后摸 ${refillN} 张（上限 ${handCap}）`
        : `结束出牌。场上摸 ${refillN}，后场每人摸 ${Math.max(0, refillN - 1)}。格挡不清。`;
  const handCapChip = `<span class="lab-hand-cap" data-tip="手牌上限；开始摸 ⌈上限/2⌉；超过可打牌或弃牌，收势须 ≤ 上限">手牌 ${b.hand.length}/${handCap} · 摸 ${refillN}</span>`;
  const actionRowHtml = inGauntlet || inDemo || inHall || inCampaign
    ? `
    ${partyMode ? `<span class="lab-action-group lab-action-swap">${swaps || `<span class="lab-action-muted" data-tip="后场无人可换">无后场</span>`}</span>` : ""}
    ${partyMode && assists ? `<span class="lab-action-group lab-action-assist">${assists}</span>` : ""}
    ${partyMode ? assistBadge : ""}
    ${itemRow}
    <span class="lab-action-group lab-action-end">
      ${handCapChip}
      ${discardBtn}
      ${cycleBtn}
      ${comboBtn}
      ${actionTipWrap(`<button class="${endBtnClass}" id="btn-end" data-sfx="end-turn" ${canEnd ? "" : "disabled"}>收势</button>`, endTip)}
      ${abortBtn}
    </span>`
    : `
    <span class="lab-action-group lab-action-swap">${swaps || `<span class="lab-action-muted" data-tip="后场无人可换">无后场</span>`}</span>
    ${assists ? `<span class="lab-action-group lab-action-assist">${assists}</span>` : ""}
    ${assistBadge}
    ${auraBlock}
    ${itemRow}
    <span class="lab-action-group lab-action-end">
      ${handCapChip}
      ${discardBtn}
      ${cycleBtn}
      ${comboBtn}
      ${actionTipWrap(`<button class="endturn fy-btn" id="btn-end" data-sfx="end-turn" ${b.phase === "player" && canEndPlayerTurn(b, shellRunContext()).ok ? "" : "disabled"}>收势</button>`, endTip)}
      ${abortBtn}
    </span>`;
  const summonPickCells = S.summonPending && S.battle ? legalSummonCells(S.battle, shellRunContext()) : [];
  const freshNote = !isLabV2() && b.labFreshSwap ? `<p class="lab-fresh-swap">刚换上场 — 本回合不能出招</p>` : "";
  const tuning = getLabTuning();
  const pausePanel = S.paused
    ? `<div class="lab-overlay" id="lab-overlay">
        <div class="lab-overlay-panel">
          <h3>实时调参 ${tuning.designerMode ? "" : "（玩家模式已锁定）"}</h3>
          ${renderSliders(tuning.designerMode)}
          <button type="button" class="lab-btn primary" id="lab-resume">继续战斗</button>
        </div>
      </div>`
    : "";
  const debriefOverlay =
    S.breakDemoRun?.foeDebrief != null
      ? renderDemoFoeDebrief(S.breakDemoRun.foeDebrief)
      : S.hallRun?.foeDebrief != null
        ? renderDemoFoeDebrief(S.hallRun.foeDebrief)
        : S.campaignRun?.foeDebrief != null
          ? renderDemoFoeDebrief(S.campaignRun.foeDebrief)
        : "";
  return renderBattleProd({ b, prev, inHallGuide, inCampaign, summonPickCells, actionRowHtml, entranceNote, freshNote, phaseBanner, pausePanel, debriefOverlay });
}
api.renderBattle = renderBattle;
