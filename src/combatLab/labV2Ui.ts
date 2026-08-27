import { ENEMIES, intentLabel, intentTip } from "../game/content";
import { stressMetaAt } from "../game/labEnemyStress";
import { weaknessTip } from "../game/intentWeakness";
import { breakCounterDamage, breakLootFor } from "../game/labV2";
import { isLabV2 } from "../game/labTuning";
import { MATES } from "../game/party";
import { dangerCellsForIntent, intentIncoming, livingFoes, projectedQueueThreat } from "../game/sim";
import type { Battle, Intent, Unit } from "../game/types";
import { escapeHtml } from "./setupUi";

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
): string {
  const stress = stressMetaAt(b, i);
  const isEye = i === eyeIdx && eyeIdx >= 0;
  // §31.12 显示最终实收伤害（含鏖战/缴械/滞手等），有加成时高亮并在悬停里给拆解
  const inc = intentIncoming(b, intent);
  const rawDmg = "damage" in intent ? (intent.damage ?? 0) : 0;
  const modified = inc.total > 0 && inc.total !== rawDmg;
  // §31.15 有投影用投影（逐段敌位推进），无投影退回静态
  const cellsArr = projectedCells ?? dangerCellsForIntent(b, intent);
  // §31.14 全意图解析第一问：「这段能不能打到我」——够不着你的段直接标出来
  const unreachable = rawDmg > 0 && !cellsArr.includes(b.player.pos);
  const tierLabel = broken.has(i)
    ? "破"
    : grazed.has(i)
      ? "让"
      : unreachable
        ? "空"
        : rawDmg > 0 && cellsArr.includes(b.player.pos)
          ? "打"
          : "";
  const cls = [
    "lab-intent-seg",
    broken.has(i) ? "broken" : "",
    grazed.has(i) ? "grazed" : "",
    preview.has(i) ? "will-break" : "",
    grazePreview.has(i) && !preview.has(i) ? "will-graze" : "",
    hoverIdx === i ? "hot" : "",
    i === currentIdx ? "current" : "",
    stress ? "stress" : "",
    isEye ? "eye" : "",
    unreachable ? "unreachable" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const nums =
    intent.kind === "strike" || intent.kind === "lunge" || intent.kind === "charge"
      ? `${inc.total}`
      : intent.kind === "guard"
        ? `架${intent.block}`
        : intent.kind === "barrage"
          ? `${intent.damage}×${intent.hits}`
          : "";
  const cells = cellsArr.join(",");
  const wTip = weaknessTip(intent);
  const incTip = modified ? `\n实收 ${inc.total} = ${inc.parts.join(" · ")}` : "";
  const missTip = unreachable ? "\n他这一手够不着你现在的位置——不用管，它自己会打空" : "";
  // §31.15 战利品预告：拆它不只反打，还有路径资源（喂生存/运转/续航/劲力）
  const loot = breakLootFor(intent);
  const lootText = loot
    ? ` · ${loot.label}${loot.kind === "block" ? ` 架+${loot.n}` : loot.kind === "heal" ? ` 血+${loot.n}` : loot.kind === "expose" ? ` 破绽+${loot.n}` : ` 劲+${loot.n}`}`
    : "";
  const counterTip = unreachable ? "" : `\n硬拆反打 ${breakCounterDamage(b)} 真伤${lootText}（一回合连拆第 2 段起 +2 并 +1 势）`;
  const tip = `${isEye ? "【招眼】硬拆它：整套套路崩塌 + 重创 6 真伤，他失衡（承伤 ×2，一窗）\n" : ""}${stress ? `${stress.label} · ` : ""}${intentTip(intent)}${incTip}${missTip}${wTip ? `\n破法：${wTip}` : ""}${counterTip}`;
  const badge = `${tierLabel ? `<span class="lab-tier-badge lab-tier-${tierLabel === "破" ? "hard" : tierLabel === "让" ? "graze" : tierLabel === "空" ? "miss" : "hit"}">${tierLabel}</span>` : ""}${stress ? `<span class="lab-stress-badge">应</span>` : ""}${isEye ? `<span class="lab-eye-badge">眼</span>` : ""}${unreachable ? `<span class="lab-miss-badge">够不着</span>` : ""}`;
  return `<button type="button" class="${cls}" data-intent-idx="${i}" data-threat="${cells}">
    ${badge}<b>${intentLabel(intent)}</b><em class="${modified ? "dmg-mod" : ""}">${nums}</em><span class="status-tip">${escapeHtml(tip)}</span>
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
  projected?: number[][],
): string {
  const cards = queue
    .map((intent, i) => segmentHtml(b, intent, i, broken, preview, grazed, grazePreview, hoverIdx, currentIdx, eyeIdx, projected?.[i]))
    .join("");
  return `<div class="lab-intent-row"><span class="lab-intent-label">${foe.name}</span>${cards}</div>`;
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
  const head = `<div class="lab-intent-bandhead"><span>破=硬拆全免 · 让=半效 · 空=打不着 · 打=照打</span>${offBalance ? `<span class="lab-offbalance">他失衡了 · 承伤 ×2</span>` : ""}${breakCount > 0 ? `<span class="lab-break-count">已拆 ${breakCount}</span>` : ""}</div>`;
  const eyeIdx = b.v2EyeIdx ?? -1;
  // §31.14 拆招教学行：不用悬停也知道「眼在哪、怎么拆」——先降低理解门槛
  const mainQueue = b.intents.length ? b.intents : [b.intent];
  const eyeIntent = eyeIdx >= 0 ? mainQueue[eyeIdx] : null;
  const eyeHint =
    eyeIntent && !broken.has(eyeIdx)
      ? `<div class="lab-eye-hint">眼在第 ${eyeIdx + 1} 段「${intentLabel(eyeIntent)}」——${weaknessTip(eyeIntent)}。拆掉它，整套套路跟着崩。</div>`
      : "";
  // §31.15 主队列逐段投影一次算清（后手段红格按先手落位后的敌位画）
  const projected = projectedQueueThreat(b);
  if (live.length <= 1) {
    const queue = mainQueue;
    return `<div class="lab-intent-slot">${head}${eyeHint}<div class="lab-intent-timeline foe-inline">${timelineRow(b, b.enemy, queue, hoverIdx, broken, preview, grazed, grazePreview, currentIdx, eyeIdx, projected)}</div></div>`;
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
      row === 0 ? projected : undefined,
    );
  });
  return `<div class="lab-intent-slot">${head}${eyeHint}<div class="lab-intent-timeline foe-inline">${rows.join("")}</div></div>`;
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
  // §31.15 悬停高亮也走投影链（与条上的段红格一致）
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
  const fx = b.v2FxQueue ?? [];
  if (!fx.length) return "";
  const last = fx[fx.length - 1]!;
  const map: Record<string, string> = {
    break: "拆！",
    wall: "震",
    kill: "斩",
    resonance: resonanceLabel(b),
    burst: "势爆",
    counter: "反拆",
  };
  return `<div class="lab-fx-pop lab-fx-${last}">${map[last] ?? last}</div>`;
}

export function battleFxClasses(b: Battle): string {
  const fx = b.v2FxQueue ?? [];
  const last = fx[fx.length - 1];
  if (last === "wall") return "shake";
  if (last === "kill") return "slow-mo";
  return "";
}
