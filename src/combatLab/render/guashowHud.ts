import { CLIMB_CHARGE_CAP, CLIMB_PIN_CAP } from "../climbCaps";
import { battleEquippedSchool } from "../../game/equippedWeapon";
import { buildStanceBoard, STANCE_LABEL } from "../../game/intentStance";
import { cardSchool, WEAPON_NAME } from "../../game/party";
import type { Battle, Intent, ReactionWindow, StanceId, StanceSeg } from "../../game/types";
import { shellRunContext } from "../shellContext";
import { cardIntentLine, latestFoeWindowLine } from "../storyBeats";
import { escapeHtml } from "../setupUi";

const STANCE_ORDER: StanceId[] = ["hurt", "press", "back", "hold", "wind", "sly"];

/** 秒数、成功演出、牌意、当前刀形态还没有对局字段。只给画面读。 */
export type GuashowFields = {
  reactionSec?: number;
  reactionLanded?: boolean;
  cardIntent?: number;
  dartFormNow?: "melee" | "ranged";
};

const REACT_NAME: Record<string, string> = {
  spearReverse: "回马枪",
  palmCut: "截拳",
  dartBreath: "断息",
  saberParry: "弹反",
  swordSteal: "偷势",
  hookLimp: "瘸跛",
  staffPierce: "透棍",
};

/** 圆窗上的选择。枪的按钮写「回马」，圈内仍是全名。 */
const REACT_CHOICE: Record<string, string> = {
  spearReverse: "回马",
  palmCut: "截拳",
  dartBreath: "断息",
  saberParry: "弹反",
  swordSteal: "偷势",
  hookLimp: "瘸跛",
  staffPierce: "透棍",
};

/** 读懂键没有伤数字。动词跟结算播报的前半，不另编。 */
const MOVE_NAME: Record<string, string> = {
  strike: "打击",
  charge: "冲锋",
  pull: "拉近",
  trap: "下机",
  windup: "蓄势",
  lunge: "抢步",
  advance: "逼近",
  swap: "换位",
  barrage: "连打",
  guard: "卸力",
  bleedcut: "刀创",
  counter: "埋招",
  mend: "金创",
  seal: "封脉",
  shatter: "裂盾",
  breathe: "吐纳",
  retreat: "撤步",
  pestle: "韦陀杵",
  dust: "迷眼",
  shackle: "锁链",
  dodge: "闪避",
  endure: "霸体",
  stake: "落桩",
  sig: "绝招",
};
const REACT_SECS = [3, 5, 10] as const;
const INTENT_TIERS = [4, 7, 10] as const;
const RING = 327;

function fields(b: Battle): GuashowFields {
  return b as Battle & GuashowFields;
}

function queueOf(b: Battle): Intent[] {
  if (b.intents.length) return b.intents;
  return b.intent ? [b.intent] : [];
}

type Live = { index: number; stance: StanceId; shown: StanceId; feint: boolean; grey: boolean };

function boardOf(b: Battle): { rows: StanceSeg[]; source: "field" | "placeholder" } {
  if (b.stanceBoard?.length) return { rows: b.stanceBoard, source: "field" };
  return { rows: buildStanceBoard(queueOf(b), b.feintMask), source: "placeholder" };
}

function liveSegs(b: Battle, hideBefore: number, fate?: Record<number, "gone" | "grey">): { segs: Live[]; source: "field" | "placeholder" } {
  const board = boardOf(b);
  const openFeint = b.feintShown === true;
  const segs = board.rows
    .map((row, index) => ({
      index,
      stance: row.stance,
      shown: row.feint && !openFeint ? "sly" : row.stance,
      feint: row.feint,
      grey: fate?.[index] === "grey",
    }))
    .filter((seg) => seg.index >= hideBefore && fate?.[seg.index] !== "gone");
  return { segs, source: board.source };
}

function countsFrom(segs: Live[]): Record<StanceId, number> {
  const counts: Record<StanceId, number> = { hurt: 0, press: 0, back: 0, hold: 0, wind: 0, sly: 0 };
  for (const seg of segs) counts[seg.shown] += 1;
  return counts;
}

export function renderStanceAgg(
  b: Battle,
  hideBefore = 0,
  fate?: Record<number, "gone" | "grey">,
): string {
  const { segs, source } = liveSegs(b, hideBefore, fate);
  const counts = countsFrom(segs);
  const grey = new Set(segs.filter((seg) => seg.grey).map((seg) => seg.shown));
  const chips = STANCE_ORDER.map((id) => {
    const n = counts[id];
    const breath = id === "wind" && n > 0 ? `<em class="lab-stance-breath">他在运气</em>` : "";
    const unknown = id === "sly" ? `<em class="lab-stance-unknown">?</em>` : "";
    const ash = grey.has(id) ? `<em class="lab-stance-grey">灰</em>` : "";
    return `<span class="lab-stance-chip lab-intent-seg${n > 0 ? " is-live" : " is-zero"}" data-stance="${id}"><i class="lab-stance-ico" data-ico="${id}" aria-hidden="true"></i><span class="lab-stance-name">${STANCE_LABEL[id]}</span><b>×${n}</b>${breath}${unknown}${ash}</span>`;
  }).join("");
  return `<div class="lab-stance-agg" data-overlap-group="stance-agg" data-stance-source="${source}">${chips}</div>`;
}

function moveName(key: string): string {
  if (key.startsWith("sig:")) return MOVE_NAME.sig ?? key;
  return MOVE_NAME[key] ?? key;
}

export function renderRevealRow(
  b: Battle,
  hideBefore = 0,
  fate?: Record<number, "gone" | "grey">,
): string {
  const unlocked = Number.isInteger(b.stanceRevealN) ? Math.max(0, b.stanceRevealN ?? 0) : null;
  const { segs } = liveSegs(b, hideBefore, fate);
  const feintKnown = segs.some((seg) => seg.feint);
  const parts = segs.map((seg) => {
    const flip = b.feintShown === true && seg.feint;
    const open = flip || (unlocked != null && seg.index < unlocked);
    const label = open ? STANCE_LABEL[flip ? seg.stance : seg.shown] : "?";
    return `<span class="lab-reveal-seg${seg.grey ? " is-grey" : ""}${flip ? " is-feint-flip" : ""}" data-intent-idx="${seg.index}" data-stance="${seg.shown}">${label}</span>`;
  });
  const hold = b.feintShown === true && !feintKnown ? `<span class="lab-feint-hold">?→真</span>` : "";
  const feint = b.feintShown === true ? (feintKnown ? "field" : "placeholder") : "off";
  const body = parts.join(`<span class="lab-reveal-arrow" aria-hidden="true">→</span>`);
  return `<div class="lab-reveal-row${b.feintShown ? " is-feint-flip" : ""}" data-reveal-source="${unlocked == null ? "placeholder" : "field"}" data-feint-source="${feint}" data-hide-before="${hideBefore}">${body}${hold}</div>`;
}

export function renderReadNames(b: Battle): string {
  const names = b.readMoves?.filter((name) => typeof name === "string" && name.length > 0);
  if (!names?.length) {
    return `<span class="lab-read-names" data-read-source="placeholder" hidden></span>`;
  }
  const body = names.map((name) => `<b class="lab-read-name">${escapeHtml(moveName(name))}</b>`).join("");
  return `<span class="lab-read-names" data-read-source="field">${body}</span>`;
}

function reactSeconds(b: Battle): { sec: 3 | 5 | 10; source: "field" | "placeholder" } {
  const raw = fields(b).reactionSec;
  if (raw === 3 || raw === 5 || raw === 10) return { sec: raw, source: "field" };
  return { sec: 5, source: "placeholder" };
}

function reactTitle(w: ReactionWindow): string {
  return REACT_NAME[w.kind] ?? w.kind;
}

export function reactView(b: Battle): { html: string; hold: boolean; landed: boolean } {
  const landed = fields(b).reactionLanded === true;
  const hold = Boolean(b.reactionWindow) && !landed;
  if (!hold || !b.reactionWindow) return { html: "", hold: false, landed };
  const w = b.reactionWindow;
  const { sec, source } = reactSeconds(b);
  const secs = REACT_SECS.map(
    (n) =>
      `<button type="button" class="fy-btn" id="react-sec-${n}" data-react-sec="${n}"${n === sec ? ` aria-current="true"` : ""}>${n}</button>`,
  ).join("");
  const html = `<div class="lab-react-round" data-overlap-group="react-round" data-react-sec="${sec}" data-react-sec-source="${source}" role="dialog" aria-label="${escapeHtml(reactTitle(w))}">
    <svg class="lab-react-ring" viewBox="0 0 120 120" style="--react-sec:${sec}s" aria-hidden="true"><circle cx="60" cy="60" r="52" class="lab-react-track"/><circle cx="60" cy="60" r="52" class="lab-react-arc" stroke-dasharray="${RING}"/></svg>
    <p class="lab-react-name"><b>${escapeHtml(reactTitle(w))}</b><em>耗蓝 ${w.cost}</em></p>
    <div class="lab-react-actions"><button type="button" class="fy-btn" id="react-take" data-react="take">${escapeHtml(REACT_CHOICE[w.kind] ?? reactTitle(w))}</button><button type="button" class="fy-btn" id="react-drop" data-react="drop">放过</button></div>
    <div class="lab-react-secs">${secs}</div>
  </div>`;
  return { html, hold: true, landed: false };
}

export function envBurnDue(b: Battle, foeResolving: boolean): boolean {
  if (foeResolving) return false;
  return (b.climbPhaseLabel ?? "").includes("结束");
}

export function renderCardIntentMarks(value: number | undefined, label = ""): string {
  const known = Number.isInteger(value);
  const n = known ? Math.max(0, value ?? 0) : 0;
  const pips = INTENT_TIERS.map(
    (tier) => `<span data-tier="${tier}" class="${known && n >= tier ? "is-met" : ""}">${tier}</span>`,
  ).join("");
  const count = known ? `<b data-school-count="${n}">${label ? `${escapeHtml(label)} ` : ""}${n}</b>` : `<b data-school-count="" hidden>—</b>`;
  return `<div class="lab-intent-marks" data-card-intent="${known ? "field" : "placeholder"}" data-school-count="${known ? n : ""}" data-overlap-group="intent-marks">${count}${pips}</div>`;
}

function equippedIntent(b: Battle): { n: number; label: string; school: string } {
  const school = battleEquippedSchool(b, b.active, shellRunContext());
  const n = [...b.hand, ...b.drawPile, ...b.discardPile].filter((c) => cardSchool(c.defId) === school).length;
  return { n, label: WEAPON_NAME[school], school };
}

export function renderMechHud(b: Battle): string {
  const stacks = Math.max(0, Math.min(CLIMB_CHARGE_CAP, Math.floor(b.chargeStacks ?? 0)));
  const ready = stacks >= CLIMB_CHARGE_CAP;
  const pin = Math.max(0, Math.min(CLIMB_PIN_CAP, Math.floor(b.foePin ?? 0)));
  const form = fields(b).dartFormNow;
  const dartSchool = battleEquippedSchool(b, b.active, shellRunContext()) === "dart";
  const formKnown = form === "melee" || form === "ranged";
  const showForm = formKnown || dartSchool;
  const formSource = formKnown ? "field" : "placeholder";
  const near = form === "melee" ? " is-on" : "";
  const far = form === "ranged" ? " is-on" : "";
  const dart = `<span class="lab-dart-form" data-dart-form="${formSource}"${showForm ? "" : " hidden"}><i class="lab-dart-melee${near}">近</i><i class="lab-dart-ranged${far}">远</i></span>`;
  const charge = `<div class="lab-charge-bar" data-charge-bar data-stacks="${stacks}" data-ready="${ready ? "1" : "0"}"><i style="width:${Math.round((stacks / CLIMB_CHARGE_CAP) * 100)}%"></i><b>蓄力 ${stacks}</b>${ready ? `<em>爆发就绪</em>` : ""}</div>`;
  const nail = `<span class="lab-pin-chip" data-pin-chip data-pin="${pin}"${pin > 0 ? "" : " hidden"}>钉 ×${pin}</span>`;
  const intentNow = equippedIntent(b);
  const marks = renderCardIntentMarks(intentNow.n, intentNow.label);
  const intentLine = cardIntentLine(intentNow.school, intentNow.n);
  const intent = intentLine ? `<p class="lab-intent-line">${escapeHtml(intentLine)}</p>` : "";
  const windowLine = latestFoeWindowLine(b.log);
  const foeWin = windowLine ? `<p class="lab-foe-window-line">${escapeHtml(windowLine)}</p>` : "";
  return `<div class="lab-mech-hud"><div class="lab-charge-row" data-overlap-group="charge-row">${charge}${marks}</div>${nail}${dart}${intent}${foeWin}</div>`;
}
