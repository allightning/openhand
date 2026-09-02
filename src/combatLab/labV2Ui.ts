import { ENEMIES, intentShortName, intentTip } from "../game/content";
import { foeIntentAlias } from "../game/enemyKit";
import { intentFirePlan, stressMetaAt } from "../game/labEnemyStress";
import { weaknessTip } from "../game/intentWeakness";
import { breakCounterDamage, breakLootFor } from "../game/labV2";
import { isLabV2 } from "../game/labTuning";
import { isBreakAlign, isBreakLesson } from "./labRuleset";
import { MATES } from "../game/party";
import { dangerCellsForIntent, intentIncoming, livingFoes, projectedQueueThreat } from "../game/sim";
import type { Battle, Intent, Unit } from "../game/types";
import { escapeHtml } from "./setupUi";

/** 意图条只显示一个数：伤用实收总量；架势/回血等用自身值。 */
function intentOneNumber(b: Battle, intent: Intent): { text: string; modified: boolean; tipExtra: string } {
  const inc = intentIncoming(b, intent);
  if (intent.kind === "barrage") {
    const hits = intent.hits ?? 1;
    const per = inc.total > 0 ? inc.total : intent.damage ?? 0;
    const total = per * hits;
    const modified = inc.total > 0 && inc.total !== (intent.damage ?? 0);
    return {
      text: String(total),
      modified,
      tipExtra: modified
        ? `\n实收合计 ${total}（${per}×${hits}）= ${inc.parts.join(" · ")}×${hits}`
        : `\n合计 ${total}（每下 ${intent.damage} × ${hits} 下）`,
    };
  }
  if (intent.kind === "guard") return { text: String(intent.block), modified: false, tipExtra: "" };
  if (intent.kind === "mend") return { text: `+${intent.heal}`, modified: false, tipExtra: "" };
  if (intent.kind === "breathe") return { text: `+${intent.amount}`, modified: false, tipExtra: "" };
  if (intent.kind === "shatter") return { text: String(intent.amount), modified: false, tipExtra: "" };
  if (intent.kind === "pull" || intent.kind === "charge") {
    if (intent.kind === "charge") {
      const modified = inc.total > 0 && inc.total !== (intent.damage ?? 0);
      return {
        text: String(inc.total || intent.damage),
        modified,
        tipExtra: modified ? `\n实收 ${inc.total} = ${inc.parts.join(" · ")}` : `\n冲 ${intent.steps} 步`,
      };
    }
    return { text: String(intent.steps), modified: false, tipExtra: "" };
  }
  if ("damage" in intent && (intent.damage ?? 0) > 0) {
    const raw = intent.damage ?? 0;
    const modified = inc.total > 0 && inc.total !== raw;
    return {
      text: String(inc.total || raw),
      modified,
      tipExtra: modified ? `\n实收 ${inc.total} = ${inc.parts.join(" · ")}` : "",
    };
  }
  return { text: "", modified: false, tipExtra: "" };
}

/**
 * 玩家回合：用预览档位（将破/将让/将打/将空）。经典只标打/空/跳过。
 */
function segmentTier(
  b: Battle,
  intent: Intent,
  i: number,
  broken: Set<number>,
  preview: Set<number>,
  grazed: Set<number>,
  grazePreview: Set<number>,
  cellsArr: number[],
  skip: boolean,
): { code: "" | "破" | "让" | "空" | "打" | "跳过" | "追" | "放"; pending: boolean } {
  if (skip) return { code: "跳过", pending: true };
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
  const rawDmg = "damage" in intent ? (intent.damage ?? 0) : 0;
  if (rawDmg <= 0) return { code: "", pending: false };
  const endPos = b.v2Turn?.endPos ?? b.player.pos;
  const startPos = b.v2Turn?.turnStartPos ?? b.player.pos;
  // 开局就不在红格 → 空；收势仍在红格 → 打
  if (!cellsArr.includes(startPos)) return { code: "空", pending: true };
  if (cellsArr.includes(endPos)) return { code: "打", pending: true };
  return { code: "空", pending: true };
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
): string {
  const stress = stressMetaAt(b, i);
  const breakMode = isBreakLesson(b);
  const isEye = breakMode && i === eyeIdx && eyeIdx >= 0;
  const cellsArr = projectedCells ?? dangerCellsForIntent(b, intent);
  const num = intentOneNumber(b, intent);
  const skip = Boolean(fire?.skip);
  const cost = fire?.cost ?? 1;
  const tier = segmentTier(b, intent, i, broken, preview, grazed, grazePreview, cellsArr, skip);
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
    breakMode && tier.code === "追" ? "will-break" : "",
    breakMode && tier.code === "放" ? "unreachable" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const cells = cellsArr.join(",");
  const landText = cellsArr.length
    ? `${breakMode && intent.kind === "retreat" ? "追圈" : "落"}${cellsArr.map((c) => c + 1).join("/")}`
    : "";
  const wTip = breakMode ? weaknessTip(intent) : "";
  const missTip = unreachable ? (breakMode ? "\n这段打不着你（空）——不算拆" : "\n这段打不着你（空）") : "";
  const skipTip = skip ? `\n劲不够（要 ${cost}，现 ${b.enemyEnergy}）→ 跳过，不出` : "";
  const loot = breakMode ? breakLootFor(intent) : null;
  const lootText = loot
    ? ` · ${loot.label}${
        loot.kind === "block"
          ? ` 架+${loot.n}`
          : loot.kind === "heal"
            ? ` 血+${loot.n}`
            : loot.kind === "expose"
              ? ` 破绽+${loot.n}`
              : loot.kind === "draw"
                ? ` 抽${loot.n}${loot.meleeBonus ? ` 贴身+${loot.meleeBonus}` : ""}`
                : ` 劲+${loot.n}`
      }`
    : "";
  const counterTip =
    !breakMode || unreachable || skip || tier.code === "放"
      ? ""
      : `\n硬拆得拆势（下一刀真伤 ${breakCounterDamage(b)}）${lootText}`;
  const tierTip =
    tier.code === "跳过"
      ? "\n收势后：这段劲不够，跳过"
      : tier.code === "追"
        ? tier.pending
          ? "\n收势后：本段将被追上（他仍撤，你得拆势）"
          : "\n本段已被追上"
        : tier.code === "放"
          ? "\n没追：他照撤，不算拆"
          : tier.code === "破"
        ? tier.pending
          ? "\n收势后：本段将被硬拆（拆势+势）"
          : "\n本段已被硬拆"
        : tier.code === "让"
          ? tier.pending
            ? "\n收势后：本段将被让（半效）"
            : "\n本段已被让"
          : tier.code === "空"
            ? "\n本段打空"
            : tier.code === "打"
              ? "\n收势后：本段会照打到你"
              : "";
  const tip = `${isEye ? "【招眼】硬拆它：套路崩塌 + 拆势加力，他失衡\n" : ""}${stress ? `${stress.label} · ` : ""}第 ${i + 1} 段 · ${intentTip(intent)}${num.tipExtra}\n耗劲 ${cost}${landText ? ` · ${landText}` : ""}${skipTip}${missTip}${tierTip}${wTip ? `\n破法：${wTip}` : ""}${counterTip}`;
  const tierCls =
    tier.code === "破" || tier.code === "追"
      ? "hard"
      : tier.code === "让"
        ? "graze"
        : tier.code === "空" || tier.code === "跳过" || tier.code === "放"
          ? "miss"
          : tier.code === "打"
            ? "hit"
            : "";
  const tierText = tier.code
    ? breakMode && tier.pending && (tier.code === "破" || tier.code === "让" || tier.code === "追")
      ? `将${tier.code}`
      : tier.code
    : "";
  const badge = `${tierText ? `<span class="lab-tier-badge lab-tier-${tierCls}">${tierText}</span>` : ""}${stress ? `<span class="lab-stress-badge">应</span>` : ""}${isEye ? `<span class="lab-eye-badge">眼</span>` : ""}`;
  const iname = foeIntentAlias(b.enemyId, intent) ?? intentShortName(intent);
  const em = num.text ? `<em class="${num.modified ? "dmg-mod" : ""}">${num.text}</em>` : "";
  const meta = `<span class="lab-seg-meta">${landText ? `<span class="lab-seg-land">${landText}</span>` : ""}<span class="lab-seg-cost">劲${cost}</span></span>`;
  return `<button type="button" class="${cls}" data-intent-idx="${i}" data-threat="${cells}" data-tip="${escapeHtml(tip)}" aria-label="第${i + 1}段 ${iname} ${num.text} 劲${cost}${skip ? " 跳过" : ""}">
    <span class="lab-seg-ord">${i + 1}</span>${badge}<b>${iname}</b>${em}${meta}<span class="status-tip">${escapeHtml(tip)}</span>
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
): string {
  const fire = intentFirePlan(b.enemyEnergy, queue);
  const cards = queue
    .map((intent, i) =>
      segmentHtml(b, intent, i, broken, preview, grazed, grazePreview, hoverIdx, currentIdx, eyeIdx, projected?.[i], fire[i]),
    )
    .join("");
  return `<div class="lab-intent-row" data-foe-count="${foeCount}"><span class="lab-intent-label">${foe.name}</span>${cards}</div>`;
}

function recapChipClass(outcome: string): string {
  if (outcome === "破" || outcome === "追") return "hard";
  if (outcome === "让") return "graze";
  if (outcome === "空" || outcome === "劲尽" || outcome === "晕" || outcome === "散" || outcome === "放") return "miss";
  if (outcome === "打") return "hit";
  return "misc";
}

function renderLastRecap(b: Battle): string {
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
export function renderFoeIntentStrip(b: Battle, hoverIdx: number | null): string {
  if (!isLabV2()) return `<div class="lab-intent-slot empty" aria-hidden="true"></div>`;
  const broken = new Set(b.v2BrokenSegments ?? []);
  const preview = new Set(b.v2BreakPreview ?? []);
  const grazed = new Set(b.v2GrazedSegments ?? []);
  const grazePreview = new Set(b.v2GrazePreview ?? []);
  const live = livingFoes(b);
  const currentIdx = b.intentIndex ?? 0;
  const breakCount = b.v2BreakCount ?? 0;
  const offBalance = (b.v2OffBalance ?? 0) > 0;
  const turnBreaks = b.v2TurnBreakCount ?? 0;
  const grazedCount = (b.v2GrazedSegments ?? []).length;
  const qi = b.qi ?? 0;
  const breakMode = isBreakLesson(b);
  const head = breakMode
    ? `<div class="lab-intent-bandhead"><span>左→右依次出招 · 破/让/追/放/空/打/跳过 · 落点与耗劲写在段上</span>${offBalance ? `<span class="lab-offbalance">他失衡了 · 承伤 ×2</span>` : ""}<span class="lab-break-count">充能 ${b.v2Turn?.moveCharges ?? 0} · 已硬拆 ${breakCount}${turnBreaks > 0 ? `（本回合 +${turnBreaks}）` : ""} · 已让 ${grazedCount} · 势 ${qi} · 敌劲 ${b.enemyEnergy}/${b.enemyEnergyMax}</span></div>`
    : `<div class="lab-intent-bandhead lab-intent-compact"><span>敌招一览（左→右）· 打/空/跳过</span>${offBalance ? `<span class="lab-offbalance">他失衡了 · 承伤 ×2</span>` : ""}</div>`;
  const eyeIdx = breakMode ? (b.v2EyeIdx ?? -1) : -1;
  const mainQueue = b.intents.length ? b.intents : [b.intent];
  const eyeIntent = eyeIdx >= 0 ? mainQueue[eyeIdx] : null;
  const eyeHint =
    breakMode && eyeIntent && !preview.has(eyeIdx) && !broken.has(eyeIdx)
      ? `<div class="lab-eye-hint">眼在第 ${eyeIdx + 1} 段「${foeIntentAlias(b.enemyId, eyeIntent) ?? intentShortName(eyeIntent)}」——${weaknessTip(eyeIntent)}。硬拆它，整套跟着崩。</div>`
      : "";
  const recap = breakMode ? renderLastRecap(b) : "";
  const projected = projectedQueueThreat(b);
  if (live.length <= 1) {
    const queue = mainQueue;
    return `<div class="lab-intent-slot">${head}${recap}${eyeHint}<div class="lab-intent-timeline foe-inline">${timelineRow(b, b.enemy, queue, hoverIdx, broken, preview, grazed, grazePreview, currentIdx, eyeIdx, live.length, projected)}</div></div>`;
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
    );
  });
  return `<div class="lab-intent-slot">${head}${recap}${eyeHint}<div class="lab-intent-timeline foe-inline">${rows.join("")}</div></div>`;
}

/** @deprecated 顶部敌情带已废弃，保留供测试引用。 */
export function renderIntentTimeline(b: Battle, hoverIdx: number | null): string {
  return renderFoeIntentStrip(b, hoverIdx);
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
  const extra = b.lastHitRead
    ? `<div class="lab-fx-pop lab-fx-read">${escapeHtml(b.lastHitRead)}</div>`
    : "";
  const pops = fx
    .map((kind, i) => `<div class="lab-fx-pop lab-fx-${kind}" style="--i:${i}">${map[kind] ?? kind}</div>`)
    .join("");
  if (!pops && !extra) return "";
  return `<div class="lab-fx-stack">${pops}${extra}</div>`;
}

export function battleFxClasses(b: Battle): string {
  const fx = b.v2FxQueue ?? [];
  const last = fx[fx.length - 1];
  if (last === "wall") return "shake";
  if (last === "kill") return "slow-mo";
  return "";
}
