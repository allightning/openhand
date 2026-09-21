import { ENEMIES, intentShortName } from "../game/content";
import { foeIntentAlias } from "../game/enemyKit";
import { intentFirePlan, stressMetaAt } from "../game/labEnemyStress";
import { previewIntentSegments, type IntentSegmentPreview } from "../game/intentPreview";
import { isLabV2 } from "../game/labTuning";
import { isBreakAlign, isBreakLesson } from "./labRuleset";
import { MATES } from "../game/party";
import { dangerCellsForIntent, intentIncoming, livingFoes, projectedQueueThreat } from "../game/sim";
import type { Battle, Intent, Unit } from "../game/types";
import { escapeHtml } from "./setupUi";

/** 意图条效果数：一律带阿拉伯数字（架/回/进撤/伤）。 */
function intentOneNumber(b: Battle, intent: Intent, segPreview?: IntentSegmentPreview): { text: string; modified: boolean; tipExtra: string } {
  const inc = intentIncoming(b, intent);
  if (intent.kind === "advance") return { text: `进${intent.steps}`, modified: false, tipExtra: "" };
  if (segPreview?.tierCode === "空" && (intent.kind === "lunge" || intent.kind === "charge")) {
    const steps = intent.kind === "charge" ? intent.steps : 1;
    return { text: `进${steps}`, modified: false, tipExtra: "" };
  }
  if (intent.kind === "barrage") {
    const hits = intent.hits ?? 1;
    const per = inc.total > 0 ? inc.total : intent.damage ?? 0;
    const total = per * hits;
    const modified = inc.total > 0 && inc.total !== (intent.damage ?? 0);
    return { text: `${total}×${hits}`, modified, tipExtra: "" };
  }
  if (intent.kind === "guard") return { text: String(intent.block), modified: false, tipExtra: "" };
  if (intent.kind === "mend") return { text: `+${intent.heal}`, modified: false, tipExtra: "" };
  if (intent.kind === "breathe") return { text: `+${intent.amount}`, modified: false, tipExtra: "" };
  if (intent.kind === "shatter") return { text: String(intent.amount), modified: false, tipExtra: "" };
  if (intent.kind === "retreat") return { text: `撤${intent.steps}`, modified: false, tipExtra: "" };
  if (intent.kind === "pull") return { text: `拉${intent.steps}`, modified: false, tipExtra: "" };
  if (intent.kind === "charge") {
    const dmg = inc.total || intent.damage;
    const modified = inc.total > 0 && inc.total !== intent.damage;
    return { text: `${dmg}/${intent.steps}`, modified, tipExtra: "" };
  }
  if (intent.kind === "bleedcut") {
    const raw = intent.damage;
    const modified = inc.total > 0 && inc.total !== raw;
    return { text: `${inc.total || raw}+${intent.bleed}`, modified, tipExtra: "" };
  }
  if (intent.kind === "stake") return { text: "1", modified: false, tipExtra: "" };
  if (intent.kind === "trap") return { text: "1", modified: false, tipExtra: "" };
  if (intent.kind === "windup") return { text: "1", modified: false, tipExtra: "" };
  if (intent.kind === "swap") return { text: "1", modified: false, tipExtra: "" };
  if (intent.kind === "dodge") return { text: "1", modified: false, tipExtra: "" };
  if (intent.kind === "endure") return { text: "1", modified: false, tipExtra: "" };
  if (intent.kind === "dust") return { text: "1", modified: false, tipExtra: "" };
  if (intent.kind === "shackle") return { text: "1", modified: false, tipExtra: "" };
  if (intent.kind === "seal") return { text: "1", modified: false, tipExtra: "" };
  if (intent.kind === "counter") return { text: "1", modified: false, tipExtra: "" };
  if (intent.kind === "sig") {
    const dmg = intent.damage ?? 0;
    return { text: dmg > 0 ? String(dmg) : "1", modified: false, tipExtra: "" };
  }
  if ("damage" in intent && (intent.damage ?? 0) > 0) {
    const raw = intent.damage ?? 0;
    const modified = inc.total > 0 && inc.total !== raw;
    return { text: String(inc.total || raw), modified, tipExtra: "" };
  }
  return { text: "0", modified: false, tipExtra: "" };
}

/** 播报用：从意图抽出「动词 + 数字」，没有意图时退回 outcome 原字。 */
function broadcastEffect(intent: Intent | undefined, outcome: string): string {
  if (!intent) return outcome;
  const dmg = "damage" in intent ? Number(intent.damage) : undefined;
  const steps = "steps" in intent && typeof intent.steps === "number" ? intent.steps : undefined;

  if (outcome === "打" && dmg != null && dmg > 0) return `打 ${dmg}`;
  if (outcome === "让") {
    if (intent.kind === "guard") return `让 · 架 ${Math.max(1, Math.floor(intent.block / 2))}`;
    if (intent.kind === "mend") return `让 · 回 ${Math.max(1, Math.floor(intent.heal / 2))}`;
    if (dmg != null && dmg > 0) return `让 ${Math.max(1, Math.ceil(dmg / 2))}`;
    if (steps != null) return `让 · ${intent.kind === "pull" ? "拉" : "撤"}${steps}`;
    return `让 · ${stripEffectFallback(intent)}`;
  }
  if (outcome === "破") {
    if (intent.kind === "guard") return `破 · 架${intent.block}`;
    if (intent.kind === "mend") return `破 · 回${intent.heal}`;
    if (intent.kind === "breathe") return `破 · 劲${intent.amount}`;
    if (dmg != null && dmg > 0) return `破 ${dmg}`;
    if (steps != null) return `破 · ${intent.kind === "pull" ? "拉" : intent.kind === "charge" ? "进" : "撤"}${steps}`;
    return `破 · ${stripEffectFallback(intent)}`;
  }
  if (outcome === "追") return steps != null ? `追 · 撤${steps}` : "追";
  if (outcome === "放") return steps != null ? `放 · 撤${steps}` : `放 · ${stripEffectFallback(intent)}`;
  if (outcome === "空") {
    if (intent.kind === "guard") return `空 · 架${intent.block}`;
    if (intent.kind === "mend") return `空 · 回${intent.heal}`;
    if (intent.kind === "breathe") return `空 · 劲${intent.amount}`;
    if (steps != null) {
      const lab = intent.kind === "pull" ? "拉" : intent.kind === "charge" ? "进" : "撤";
      return `空 · ${lab}${steps}`;
    }
    if (dmg != null && dmg > 0) return `空 · ${dmg}`;
    return `空 · ${stripEffectFallback(intent)}`;
  }
  if (outcome === "劲尽") return "劲尽";
  if (outcome === "晕" || outcome === "散") return outcome;

  // 正常出招：架 / 回 / 劲 / 出 …
  if (intent.kind === "guard") return `架 ${intent.block}`;
  if (intent.kind === "mend") return `回 ${intent.heal}`;
  if (intent.kind === "breathe") return `劲+${intent.amount}`;
  if (intent.kind === "shatter") return `震 ${intent.amount}`;
  if (intent.kind === "retreat") return `撤${intent.steps}`;
  if (intent.kind === "pull") return `拉${intent.steps}`;
  if (intent.kind === "charge") return steps != null ? `${outcome} · 进${steps}${dmg ? ` · ${dmg}` : ""}` : outcome;
  if (intent.kind === "stake") return "桩 1";
  if (intent.kind === "trap") return "机 1";
  if (intent.kind === "counter") return "埋 1";
  if (intent.kind === "windup") return "蓄 1";
  if (intent.kind === "dodge") return "闪 1";
  if (intent.kind === "endure") return "霸 1";
  if (intent.kind === "seal") return "封 1";
  if (intent.kind === "dust") return "迷 1";
  if (intent.kind === "shackle") return "锁 1";
  if (intent.kind === "swap") return "换 1";
  if (dmg != null && dmg > 0) return `${outcome} ${dmg}`;
  return `${outcome} · ${stripEffectFallback(intent)}`;
}

function stripEffectFallback(intent: Intent): string {
  if (intent.kind === "guard") return String(intent.block);
  if (intent.kind === "mend") return `+${intent.heal}`;
  if (intent.kind === "breathe") return `+${intent.amount}`;
  if (intent.kind === "shatter") return String(intent.amount);
  if ("steps" in intent && typeof intent.steps === "number") return String(intent.steps);
  if ("damage" in intent && (intent.damage ?? 0) > 0) return String(intent.damage);
  if ("block" in intent && typeof intent.block === "number") return String(intent.block);
  if ("heal" in intent && typeof intent.heal === "number") return String(intent.heal);
  if ("amount" in intent && typeof intent.amount === "number") return String(intent.amount);
  return "1";
}

function segmentTier(
  b: Battle,
  intent: Intent,
  i: number,
  broken: Set<number>,
  preview: Set<number>,
  grazed: Set<number>,
  grazePreview: Set<number>,
  segPreview: IntentSegmentPreview,
): { code: "" | "破" | "让" | "空" | "打" | "劲尽" | "晕" | "缴械" | "追" | "放"; pending: boolean } {
  if (segPreview.tierCode === "劲尽") return { code: "劲尽", pending: true };
  if (segPreview.tierCode === "晕") return { code: "晕", pending: true };
  if (segPreview.tierCode === "缴械") return { code: "缴械", pending: true };
  const breakMode = isBreakLesson(b);
  if (breakMode && intent.kind === "retreat") {
    if (broken.has(i) || preview.has(i)) return { code: "追", pending: preview.has(i) && !broken.has(i) };
    if (grazed.has(i) || grazePreview.has(i)) return { code: "让", pending: grazePreview.has(i) && !grazed.has(i) };
    return { code: "放", pending: true };
  }
  if (breakMode && broken.has(i)) return { code: "破", pending: false };
  if (breakMode && grazed.has(i)) return { code: "让", pending: false };
  if (breakMode && preview.has(i)) return { code: "破", pending: true };
  if (breakMode && grazePreview.has(i)) return { code: "让", pending: true };
  if (segPreview.tierCode === "空") return { code: "空", pending: true };
  if (segPreview.tierCode === "打") return { code: "打", pending: true };
  return { code: "", pending: false };
}

function segmentHtml(
  b: Battle,
  intent: Intent,
  i: number,
  broken: Set<number>,
  preview: Set<number>,
  grazed: Set<number>,
  grazePreview: Set<number>,
  hoverIdx: number | null,
  currentIdx: number,
  eyeIdx: number,
  projectedCells?: number[],
  fire?: { cost: number; skip: boolean },
  segPreview?: IntentSegmentPreview,
): string {
  const stress = stressMetaAt(b, i);
  const breakMode = isBreakLesson(b);
  const isEye = breakMode && i === eyeIdx && eyeIdx >= 0;
  const previewRow =
    segPreview ??
    previewIntentSegments(b, [intent], [projectedCells ?? dangerCellsForIntent(b, intent)])[0]!;
  const cellsArr = previewRow.threatCells;
  const num = intentOneNumber(b, intent, previewRow);
  const skip = previewRow.tierCode === "劲尽";
  const cost = fire?.cost ?? 1;
  const tier = segmentTier(b, intent, i, broken, preview, grazed, grazePreview, previewRow);
  const unreachable = tier.code === "空";
  const cls = [
    "lab-intent-seg",
    breakMode && broken.has(i) ? "broken" : "",
    breakMode && grazed.has(i) ? "grazed" : "",
    breakMode && preview.has(i) ? "will-break" : "",
    breakMode && grazePreview.has(i) && !preview.has(i) ? "will-graze" : "",
    hoverIdx === i ? "hot" : "",
    i === currentIdx ? "current" : "",
    stress ? "stress" : "",
    isEye ? "eye" : "",
    unreachable ? "unreachable" : "",
    tier.code === "打" ? "will-hit" : "",
    skip ? "will-skip" : "",
    previewRow.fate === "gone" ? "resolved-gone" : "",
    breakMode && tier.code === "追" ? "will-break" : "",
    breakMode && tier.code === "放" ? "unreachable" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const cells = cellsArr.join(",");
  const iname = foeIntentAlias(b.enemyId, intent) ?? intentShortName(intent);
  const tierCls =
    tier.code === "破" || tier.code === "追"
      ? "hard"
      : tier.code === "让"
        ? "graze"
        : tier.code === "空" || tier.code === "劲尽" || tier.code === "晕" || tier.code === "缴械" || tier.code === "放"
          ? "miss"
          : tier.code === "打"
            ? "hit"
            : "";
  const tierText = tier.code
    ? tier.pending && (tier.code === "破" || tier.code === "让" || tier.code === "追" || tier.code === "空")
      ? `将${tier.code}`
      : tier.code
    : "";
  // 悬浮 / 可见：招名 · 数值（格挡/治疗写明动词+数）
  const tipEffect =
    intent.kind === "guard"
      ? `架${num.text}`
      : intent.kind === "mend"
        ? `回${String(intent.heal)}`
        : intent.kind === "breathe"
          ? `劲+${intent.amount}`
          : intent.kind === "shatter"
            ? `震${intent.amount}`
            : num.text;
  const tip = [iname, tipEffect].filter(Boolean).join(" · ");
  const badge = `${tierText ? `<span class="lab-tier-badge lab-tier-${tierCls}">${tierText}</span>` : ""}${stress ? `<span class="lab-stress-badge">应</span>` : ""}${isEye ? `<span class="lab-eye-badge">眼</span>` : ""}`;
  const em = `<em class="${num.modified ? "dmg-mod" : ""}">${escapeHtml(tipEffect)}</em>`;
  return `<button type="button" class="${cls}" data-intent-idx="${i}" data-threat="${cells}" data-tip="${escapeHtml(tip)}" aria-label="第${i + 1}段 ${iname} ${tipEffect} 劲${cost}${skip ? " 劲尽" : ""}">
    <span class="lab-seg-ord">${i + 1}</span>${badge}<b>${iname}</b>${em}<span class="status-tip">${escapeHtml(tip)}</span>
  </button>`;
}

function timelineRow(
  b: Battle,
  foe: Unit,
  queue: Intent[],
  hoverIdx: number | null,
  broken: Set<number>,
  preview: Set<number>,
  grazed: Set<number>,
  grazePreview: Set<number>,
  currentIdx: number,
  eyeIdx: number,
  foeCount: number,
  projected?: number[][],
  hideResolvedBefore = 0,
  segFate?: Record<number, "gone" | "grey">,
): string {
  const fire = intentFirePlan(b.enemyEnergy, queue);
  const threat = projected ?? projectedQueueThreat(b);
  const segPreviews = previewIntentSegments(b, queue, threat);
  const cards = queue
    .map((intent, i) => {
      if (segFate?.[i] === "gone") return "";
      if (!segFate && i < hideResolvedBefore) return "";
      const html = segmentHtml(
        b,
        intent,
        i,
        broken,
        preview,
        grazed,
        grazePreview,
        hoverIdx,
        currentIdx,
        eyeIdx,
        threat[i],
        fire[i],
        segPreviews[i],
      );
      if (segFate?.[i] === "grey") {
        return html.replace("lab-intent-seg", "lab-intent-seg unreachable resolved-stay");
      }
      return html;
    })
    .join("");
  return `<div class="lab-intent-row" data-foe-count="${foeCount}" data-hide-before="${hideResolvedBefore}"><span class="lab-intent-label">${foe.name}</span>${cards}</div>`;
}

export function foeIntentIsStrike(intent?: Intent): boolean {
  if (!intent) return false;
  return (
    intent.kind === "strike" ||
    intent.kind === "lunge" ||
    intent.kind === "charge" ||
    intent.kind === "barrage" ||
    intent.kind === "bleedcut" ||
    intent.kind === "pestle"
  );
}

export function foeStunCurtainMs(recap: { outcome: string }[]): number {
  return recap.some((r) => r.outcome === "晕") ? 2500 : 0;
}

function recapChipClass(outcome: string): string {
  if (outcome === "破" || outcome === "追") return "hard";
  if (outcome === "让") return "graze";
  // 劲尽/晕/散：演出上按「躲过/落空」一类，拆招反馈仍在敌回合逐段体现
  if (outcome === "空" || outcome === "劲尽" || outcome === "晕" || outcome === "散" || outcome === "放" || outcome === "躲") return "miss";
  if (outcome === "打") return "hit";
  return "misc";
}

export function renderLastRecap(b: Battle): string {
  const recap = b.v2LastIntentRecap;
  if (!recap?.length) return "";
  const parts = recap
    .map((r) => {
      const cls = recapChipClass(r.outcome);
      return `<span class="lab-recap-chip lab-tier-${cls}">${r.ord}.${escapeHtml(r.name)}→${escapeHtml(r.outcome)}</span>`;
    })
    .join("");
  return `<div class="lab-intent-recap" title="上一敌回合每段怎么结算">上息：${parts}</div>`;
}

/** §30.3 敌人 aside 内意图条（蓝条下方）。 */
export function renderFoeIntentStrip(
  b: Battle,
  hoverIdx: number | null,
  hideResolvedBefore = 0,
  segFate?: Record<number, "gone" | "grey">,
): string {
  if (!isLabV2()) return `<div class="lab-intent-slot empty" aria-hidden="true"></div>`;
  const broken = new Set(b.v2BrokenSegments ?? []);
  const preview = new Set(b.v2BreakPreview ?? []);
  const grazed = new Set(b.v2GrazedSegments ?? []);
  const grazePreview = new Set(b.v2GrazePreview ?? []);
  const live = livingFoes(b);
  // 兑完待刷 / 播报期：高亮落在刚结算的段序，避免意图条跳到「下一手」错位
  const currentIdx = b.v2PendingIntentRefresh
    ? (b.v2ResolveIntentIdx ?? Math.max(0, (b.intents?.length ?? 1) - 1))
    : (b.intentIndex ?? 0);
  const breakCount = b.v2BreakCount ?? 0;
  const offBalance = (b.v2OffBalance ?? 0) > 0;
  const breakMode = isBreakLesson(b);
  // 中轴只留意图本体；充能看下方条，不在此叠第二行账本
  const head = `<div class="lab-intent-bandhead lab-intent-compact"><span>敌招</span>${offBalance ? `<span class="lab-offbalance">失衡 · 承伤 ×2</span>` : ""}${breakMode && breakCount > 0 ? `<span class="lab-break-count">已硬拆 ${breakCount}</span>` : ""}</div>`;
  const eyeIdx = breakMode ? (b.v2EyeIdx ?? -1) : -1;
  const mainQueue = b.intents.length ? b.intents : [b.intent];
  // 眼标在段上已有；不再另起教学条。上息回顾改由石台下播报承担。
  const eyeHint = "";
  const recap = "";
  const projected = projectedQueueThreat(b);
  if (live.length <= 1) {
    const queue = mainQueue;
    return `<div class="lab-intent-slot">${head}${recap}${eyeHint}<div class="lab-intent-timeline foe-inline">${timelineRow(b, b.enemy, queue, hoverIdx, broken, preview, grazed, grazePreview, currentIdx, eyeIdx, live.length, projected, hideResolvedBefore, segFate)}</div></div>`;
  }
  const rows = live.map((foe, row) => {
    const queue =
      row === 0 || foe.id === b.enemy.id
        ? b.intents.length
          ? b.intents
          : [b.intent]
        : ENEMIES[foe.id as keyof typeof ENEMIES]?.pattern ?? [b.intent];
    return timelineRow(
      b,
      foe,
      queue,
      row === 0 ? hoverIdx : null,
      row === 0 ? broken : new Set(),
      row === 0 ? preview : new Set(),
      row === 0 ? grazed : new Set(),
      row === 0 ? grazePreview : new Set(),
      row === 0 ? currentIdx : 0,
      row === 0 ? eyeIdx : -1,
      live.length,
      row === 0 ? projected : undefined,
      hideResolvedBefore,
      segFate,
    );
  });
  return `<div class="lab-intent-slot">${head}${recap}${eyeHint}<div class="lab-intent-timeline foe-inline">${rows.join("")}</div></div>`;
}
export function threatCellsForHover(b: Battle, hoverIdx: number | null): number[] {
  if (!isLabV2() || hoverIdx === null) return [];
  const queue = b.intents.length ? b.intents : [b.intent];
  const intent = queue[hoverIdx];
  if (!intent) return [];
  return projectedQueueThreat(b)[hoverIdx] ?? [];
}

export function renderGrudgeBadge(b: Battle): string {
  if (!isLabV2() || !(b.v2GrudgeBonus ?? 0)) return "";
  return `<span class="lab-grudge-badge">鏖战 +${b.v2GrudgeBonus} 伤</span>`;
}

function resonanceLabel(b: Battle): string {
  const school = MATES[b.active].weapon;
  const mate = b.bench.find((m) => MATES[m.id].weapon === school);
  return mate ? `${b.player.name}·${MATES[mate.id].name}` : "共鸣";
}

export function formatIntentBroadcast(
  intent: Intent | undefined,
  outcome: string,
  name: string,
  recap?: { hpLost?: number; blockLost?: number },
): string {
  const effect = broadcastEffect(intent, outcome);
  const parts = [name, effect];
  if (
    intent?.kind === "charge" &&
    (outcome === "打" || outcome === "破" || outcome === "让") &&
    !effect.includes("进")
  ) {
    parts.push(`进${intent.steps}`);
  }
  const blocked = recap?.blockLost ?? 0;
  const hp = recap?.hpLost ?? 0;
  // 敌打你：挡后仍入血 = 半挡；全吃掉 = 全挡。你打穿他挡才写穿挡。
  if (blocked > 0 && hp > 0) parts.push(`挡${blocked}`, `半挡`, `入血${hp}`);
  else if (blocked > 0) parts.push(`挡${blocked}`, `全挡`);
  else if (hp > 0 && (outcome === "打" || outcome === "让" || outcome === "破")) parts.push(`入血${hp}`);
  return parts.join(" · ");
}

/** 把结算里的「他卸了」并进同一句；全挡与穿挡分开，互斥。 */
export function formatCombatRead(b: Battle): string {
  let s = (b.lastHitRead ?? "").trim();
  s = s.replace(/他卸了\s*(\d+)/g, "挡$1");
  s = s.replace(/伤(\d+)\s*·\s*伤\1\b/g, "伤$1");
  const blocked = /挡(\d+)/.exec(s);
  if (blocked) {
    const fullyBlocked = /伤0\b/.test(s);
    if (fullyBlocked && !s.includes("全挡")) s += " · 全挡";
    // 你打穿他挡并入血：标穿挡。全挡不再兼标破盾。
    if (!fullyBlocked && /伤([1-9]\d*)\b/.test(s) && !s.includes("穿挡") && !s.includes("破盾")) {
      s += " · 穿挡";
    }
  }
  if ((b.combo ?? 0) > 1 && !s.includes("连势")) s += ` · 连势${b.combo}`;
  return s.replace(/(?: · )+/g, " · ").replace(/^ · | · $/g, "");
}

/** 起手预告：招名 · 数值（尚未结算）。 */
export function formatIntentCue(b: Battle, intent: Intent | undefined, name: string): string {
  if (!intent) return name;
  return `${name} · ${intentOneNumber(b, intent).text}`;
}

export function renderFxLayer(b: Battle): string {
  const quiet = isBreakAlign() && !isBreakLesson(b);
  const fx = (b.v2FxQueue ?? []).filter((kind) => !quiet || !["break", "graze", "miss", "counter", "eye"].includes(kind));
  const map: Record<string, string> = {
    break: "拆！",
    graze: "让",
    miss: "空",
    hit: "打",
    skip: "劲尽",
    wall: "震",
    kill: "斩",
    resonance: resonanceLabel(b),
    burst: "势爆",
    counter: "拆势",
    cardHit: "攻",
    cardWard: "挡",
    cardHeal: "疗",
    cardStep: "步",
    cardKnock: "推",
    cardStatus: "势",
  };
  const kind = fx.length ? fx[fx.length - 1]! : null;
  const read = formatCombatRead(b);
  if (!kind && !read) {
    return `<div class="lab-fx-stack lab-fx-empty" aria-hidden="true"></div>`;
  }
  const label = read || (kind ? map[kind] ?? kind : "");
  const cls = kind ? `lab-fx-pop lab-fx-${kind}` : "lab-fx-pop lab-fx-read";
  return `<div class="lab-fx-stack"><div class="${cls} lab-fx-hold lab-fx-plate" style="--i:0">${escapeHtml(label)}</div></div>`;
}

export function battleFxClasses(b: Battle): string {
  const fx = b.v2FxQueue ?? [];
  const last = fx[fx.length - 1];
  if (last === "wall") return "shake";
  if (last === "kill") return "slow-mo";
  return "";
}
