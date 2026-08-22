/**
 * 明手 · Canvas 2D 水墨武侠特效（二次重做：大气锋利）
 *
 * 实际六兵刃（src/game/weapons.ts SCHOOLS）：
 *   palm 拳掌｜saber 刀｜spear 枪矛｜sword 剑｜staff 棍棒｜hook 钩
 * （用户假设的「暗器」为晚期卡牌族，非六兵刃；dart/needle/shuriken 仍保留多点齐发）
 *
 * 修正1 尺寸×2.5｜修正2 书法笔锋+飞白｜修正3 主体0.25–0.4s + 余韵 → 总≤0.85s
 * 禁 glow/blur/渐变/arc；硬边 fillRect + lineTo；色池固定
 * 对外：playCardFx / playIntentFx / playSceneFx / clearFx / fxKind
 */

import { playCardSfx, playSfx } from "./audio";

// ─── 色池（固定）───
const INK_CHAR = "#0a0a0a";
const INK_HEAVY = "#1a1410";
const INK_DEEP = "#2d2520";
const INK_MID = "#4a3f35";
const INK_LIGHT = "#6b5e52";
const BLOOD = "#8b2a24";
const EARTH = "#5a4030";
const SAND = "#cbb896";
const IRON = "#696969";
const CYAN = "#7a9e9f";
const WARM = "#fff8e7";
const EMBER = "#ff6b35";
const SPARK = "#ffa500";

const MAX_PARTICLES = 60;
/** 修正3：总时长上限 0.85s @60fps */
const LIFE_CAP = 51;

export type FxGroup = "weapon" | "defense" | "status" | "hit" | "movement" | "env";

export enum FxBrew {
  PalmQi = "palmQi",
  HeavySaber = "heavySaber",
  LightSword = "lightSword",
  StaffSweep = "staffSweep",
  SpearPierce = "spearPierce",
  HookPull = "hookPull",
  DartFan = "dartFan",
  WindPush = "windPush",
  ElbowSmash = "elbowSmash",
  SplitCrack = "splitCrack",
  BlockSparks = "blockSparks",
  ParryFlash = "parryFlash",
  WardRing = "wardRing",
  QiGather = "qiGather",
  MendRise = "mendRise",
  BleedSpray = "bleedSpray",
  ExposeMark = "exposeMark",
  ThornsSpike = "thornsSpike",
  ComboFlick = "comboFlick",
  HasteTrail = "hasteTrail",
  StepDust = "stepDust",
  MoveDust = "moveDust",
  PlayerHit = "playerHit",
  EnemyHit = "enemyHit",
  PlayerDeath = "playerDeath",
  EnemyDeath = "enemyDeath",
  Pickup = "pickup",
  DoorOpen = "doorOpen",
  DoorClose = "doorClose",
  Fire = "fire",
  Water = "water",
  CardPlay = "cardPlay",
  Upgrade = "upgrade",
  Market = "market",
  Wild = "wild",
  Needle = "needle",
  Shuriken = "shuriken",
}

export type FxKind =
  | "palm"
  | "saber"
  | "spear"
  | "sword"
  | "hook"
  | "ward"
  | "mend"
  | "qi"
  | "step"
  | "wind"
  | "plant"
  | "bleed"
  | "expose"
  | "thorns"
  | "combo"
  | "haste"
  | "elbow"
  | "split"
  | "close"
  | "foe"
  | "cut"
  | "drawcut"
  | "thrust"
  | "pierce"
  | "dart"
  | "needle"
  | "shuriken"
  | "block"
  | "parry"
  | "inbreath"
  | "charge"
  | "playerHit"
  | "enemyHit"
  | "playerDeath"
  | "enemyDeath"
  | "pickup"
  | "doorOpen"
  | "doorClose"
  | "fire"
  | "water"
  | "moveDust"
  | "cardPlay";

export type SceneFxKind =
  | "pickup"
  | "doorOpen"
  | "doorClose"
  | "fire"
  | "water"
  | "moveDust"
  | "market"
  | "wild"
  | "playerHit"
  | "enemyHit"
  | "playerDeath"
  | "enemyDeath"
  | "cardPlay"
  | "upgrade";

type Pt = { x: number; y: number };

type Mode = "mote" | "slash" | "ring" | "flash" | "star" | "palm";

interface Particle {
  mode: Mode;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  grav: number;
  pts: Pt[];
  /** 笔锋峰值线宽（修正2） */
  peakW: number;
  reveal: number;
  revealSpd: number;
  sides: number;
  radius: number;
  baseR: number;
  rVel: number;
  jit: number[];
  pulse: number;
  pulseT: number;
  /** 飞白标记：slash 收笔后补点 */
  feibai: boolean;
}

const particles: Particle[] = [];
let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let raf = 0;
let dpr = 1;
/** 修正1：震屏幅度（px） */
let shakeLeft = 0;
let shakeAmp = 0;

const CARD_FX: Record<string, FxKind> = {
  strike: "palm",
  elbow: "elbow",
  cut: "saber",
  drawcut: "saber",
  thrust: "spear",
  pierce: "sword",
  hookpull: "hook",
  defend: "ward",
  backpalm: "ward",
  mend: "mend",
  charge: "qi",
  inbreath: "qi",
  advance: "step",
  close: "close",
  push: "wind",
  sweep: "wind",
  plant: "plant",
  split: "split",
  bleedcut: "bleed",
  expose: "expose",
  thorns: "thorns",
  combo: "combo",
  haste: "haste",
  gather: "qi",
  setup: "combo",
  finisher: "palm",
  weave: "ward",
  echo: "qi",
  ironform: "thorns",
  marking: "expose",
  rift: "saber",
  mirror: "ward",
  layer: "palm",
  tide: "qi",
  burySlash: "saber",
  buryBleed: "bleed",
  buryKnock: "wind",
  buryWard: "ward",
  salve: "mend",
  unbind: "qi",
  sidestep: "step",
  suture: "mend",
  cauterize: "bleed",
  bindwound: "mend",
  saberBleed: "saber",
  spearLock: "spear",
  swordMute: "sword",
  staffBind: "plant",
  hookDisarm: "hook",
  handCut: "dart",
  lateHand: "dart",
  pouchSeal: "needle",
  latePouch: "needle",
  venomFog: "dart",
  midStrike: "palm",
  midGuard: "ward",
  midPush: "wind",
  lateAnvil: "elbow",
  lateTide: "qi",
  lateMirror: "ward",
  lateChain: "combo",
  lateWard: "ward",
  lateBleed: "bleed",
  lateMute: "sword",
  lateLeech: "qi",
  twinpalm: "palm",
  follow: "palm",
  brace: "ward",
  chain: "combo",
  qiPulse: "qi",
  qiFlood: "qi",
  palmSeal: "palm",
  jinwuToken: "ward",
  peonyBrew: "mend",
  drunkFist: "palm",
};

export function fxKind(cardId: string): FxKind {
  const id = cardId.replace(/2$/, "");
  return CARD_FX[id] ?? "palm";
}

function ensure(): CanvasRenderingContext2D | null {
  if (!canvas) canvas = document.querySelector("#fx-layer");
  if (!canvas) return null;
  if (!ctx) ctx = canvas.getContext("2d");
  const w = window.innerWidth;
  const h = window.innerHeight;
  dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
  }
  ctx!.shadowBlur = 0;
  ctx!.shadowColor = "transparent";
  ctx!.filter = "none";
  ctx!.imageSmoothingEnabled = false;
  ctx!.globalAlpha = 1;
  ctx!.lineCap = "butt";
  ctx!.lineJoin = "miter";
  ctx!.miterLimit = 8;
  return ctx;
}

function lifeOf(n: number): number {
  return Math.min(LIFE_CAP, Math.max(3, Math.floor(n)));
}

function room(): number {
  return Math.max(0, MAX_PARTICLES - particles.length);
}

function add(partial: Partial<Particle> & Pick<Particle, "mode" | "x" | "y" | "life" | "size" | "color">): void {
  if (particles.length >= MAX_PARTICLES) particles.shift();
  const life = lifeOf(partial.life);
  particles.push({
    mode: partial.mode,
    x: partial.x,
    y: partial.y,
    vx: partial.vx ?? 0,
    vy: partial.vy ?? 0,
    life,
    max: partial.max ?? life,
    size: partial.size,
    color: partial.color,
    grav: partial.grav ?? 0,
    pts: partial.pts ?? [],
    peakW: partial.peakW ?? partial.size,
    reveal: partial.reveal ?? 1,
    revealSpd: partial.revealSpd ?? 0,
    sides: partial.sides ?? 0,
    radius: partial.radius ?? 0,
    baseR: partial.baseR ?? partial.radius ?? 0,
    rVel: partial.rVel ?? 0,
    jit: partial.jit ?? [],
    pulse: partial.pulse ?? 0,
    pulseT: partial.pulseT ?? 0,
    feibai: partial.feibai ?? false,
  });
}

function rnd(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

function easeOutQuad(t: number): number {
  const u = Math.max(0, Math.min(1, t));
  return 1 - (1 - u) * (1 - u);
}

/** 修正3 末段更强定格感 */
function easeOutCubic(t: number): number {
  const u = Math.max(0, Math.min(1, t));
  // 与 easeOutQuad 混合：前半二次、后半三次，定格更狠
  return 0.35 * easeOutQuad(u) + 0.65 * (1 - Math.pow(1 - u, 3));
}

function center(el: Element | null): Pt | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function foePoint(): Pt | null {
  return (
    center(document.querySelector(".fy-stand-wrap.foe")) ??
    center(document.querySelector(".fighter.foe-side")) ??
    center(document.querySelector(".fig.foe, .fig-lg.foe"))
  );
}

function youPoint(): Pt | null {
  return (
    center(document.querySelector(".fy-stand-wrap.you")) ??
    center(document.querySelector(".fighter.you-side")) ??
    center(document.querySelector(".fig.you, .fig-lg.you"))
  );
}

function kick(): void {
  if (!raf) raf = requestAnimationFrame(tick);
}

export function clearFx(): void {
  particles.length = 0;
  shakeLeft = 0;
  shakeAmp = 0;
  if (raf) {
    cancelAnimationFrame(raf);
    raf = 0;
  }
  if (!canvas || !ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

/** 修正1：震屏 轻击 2–3 / 重击 4–6 */
function shake(px: number, ms = 220): void {
  shakeAmp = Math.max(shakeAmp, px);
  shakeLeft = Math.max(shakeLeft, Math.ceil(ms / 16));
  const el = document.querySelector(".fy-combat");
  if (!el) return;
  el.classList.remove("hit-shake");
  void (el as HTMLElement).offsetWidth;
  el.classList.add("hit-shake");
  window.setTimeout(() => el.classList.remove("hit-shake"), ms);
}

// ═══════════════════════════════════════════
// 原语（修正1 大尺寸 / 修正2 笔锋）
// ═══════════════════════════════════════════

/** mote：默认 4×4，主爆点 6×6（修正1） */
function mote(x: number, y: number, vx: number, vy: number, size: number, color: string, life: number, grav = 0.4): void {
  if (room() <= 0) return;
  add({
    mode: "mote",
    x: Math.round(x),
    y: Math.round(y),
    vx,
    vy,
    size: Math.max(3, Math.round(size)),
    color,
    life,
    grav,
  });
}

/** flash：8×8 起，重击 12×12；停留 2–3 帧（修正1/3） */
function flash(x: number, y: number, size: number, color: string, life = 3): void {
  if (room() <= 0) return;
  add({
    mode: "flash",
    x: Math.round(x),
    y: Math.round(y),
    size: Math.max(8, Math.round(size + rnd(-1, 1))),
    color,
    life: lifeOf(life),
  });
}

/** 枪尖星芒：4 条短线交叉（禁 arc） */
function starFlash(x: number, y: number, span: number, color: string, life = 3): void {
  if (room() <= 0) return;
  add({
    mode: "star",
    x: Math.round(x),
    y: Math.round(y),
    size: Math.round(span),
    color,
    life: lifeOf(life),
  });
}

/**
 * 修正2：书法笔锋 slash
 * — 锐角折点 ≤30° 抖动；线宽起细→中粗→收尖（peakW）
 * — 收笔飞白 3–4 点
 * 修正1：默认长度 100–180
 * 修正3：life ≈ 主体帧数，reveal 先快后慢
 */
function brushSlash(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  segs: number,
  peakW: number,
  color: string,
  life: number,
  withFeibai = true,
): void {
  if (room() <= 0) return;
  const pts: Pt[] = [{ x: x0, y: y0 }];
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  // 锐角折点：法线偏移 ≤ sin(30°)·段长
  for (let i = 1; i < segs; i++) {
    const t = i / segs;
    const side = rnd(-0.12, 0.12) * len; // ≈±7°–12° 量级，保持锐利
    pts.push({
      x: x0 + dx * t + nx * side,
      y: y0 + dy * t + ny * side,
    });
  }
  pts.push({ x: x1, y: y1 });
  add({
    mode: "slash",
    x: x0,
    y: y0,
    size: 1,
    peakW: Math.max(2, peakW),
    color,
    life,
    pts,
    reveal: 0,
    revealSpd: 1 / Math.max(8, life * 0.55),
    feibai: withFeibai,
  });
}

/** 不规则气圈（禁 arc）；半径修正1：60–90+ */
function jaggedRing(
  x: number,
  y: number,
  radius: number,
  sides: number,
  color: string,
  life: number,
  rVel: number,
  pulse = 0,
  dashed = false,
  lineW = 3,
): void {
  if (room() <= 0) return;
  const n = Math.max(8, Math.min(14, sides));
  const jit: number[] = [];
  for (let i = 0; i < n; i++) jit.push(rnd(-5, 5));
  add({
    mode: "ring",
    x,
    y,
    size: dashed ? 1 : lineW,
    color,
    life,
    radius,
    baseR: radius,
    rVel,
    sides: n,
    jit,
    pulse,
    pulseT: 0,
  });
}

function spray(at: Pt, n: number, color: string, speed: number, life: number, size: number, grav: number): void {
  const take = Math.min(n, room());
  for (let i = 0; i < take; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = speed * rnd(0.5, 1.2);
    mote(at.x, at.y, Math.cos(a) * s + rnd(-1.2, 1.2), Math.sin(a) * s - rnd(0.3, 1.5), size, color, life, grav);
  }
}

/** 掌印：5 块 6×6 拼简笔手掌（修正拳掌点睛） */
function palmStamp(at: Pt, color: string, outline?: string): void {
  if (room() <= 0) return;
  add({
    mode: "palm",
    x: Math.round(at.x),
    y: Math.round(at.y),
    size: 6,
    color,
    life: 4, // 闪 3–4 帧后碎裂
    peakW: outline ? 1 : 0,
  });
  // 轮廓用第二色描边块
  if (outline && room() > 0) {
    add({
      mode: "palm",
      x: Math.round(at.x),
      y: Math.round(at.y),
      size: 7,
      color: outline,
      life: 3,
      peakW: 0,
    });
  }
}

// ═══════════════════════════════════════════
// 六兵刃 Signature
// ═══════════════════════════════════════════

/**
 * 1. palm 拳掌 — 气劲爆发，无刃有形
 * 修正1：ring 60/80/100（升级 140）｜mote 4×4｜震屏 3–5
 * 修正3：主体 ~0.35s（21帧）+ 余韵
 */
function brewPalm(to: Pt, heavy: boolean): void {
  const layers = heavy ? 5 : 3;
  const maxR = heavy ? 140 : 100;
  for (let i = 0; i < layers; i++) {
    const r = (maxR * (0.55 + i * 0.15)) / (heavy ? 1 : 1);
    // 每层间隔 ~0.05s ≈ 3 帧，用 life 错开视觉
    jaggedRing(to.x, to.y, r * 0.55, 10 + i, WARM, 22 + i * 2, 0, 1, false, 3);
  }
  const n = heavy ? 20 : 12;
  for (let i = 0; i < Math.min(n, room()); i++) {
    const a = -0.7 + rnd(0, 1.4); // 扇形 ±40° 朝右前方（敌方）
    const s = 6 * rnd(0.7, 1.15);
    mote(to.x, to.y, Math.cos(a) * s, Math.sin(a) * s * 0.6, 4, CYAN, 24, 0.2);
  }
  palmStamp(to, WARM, heavy ? BLOOD : undefined);
  // 掌印碎裂余韵
  spray(to, heavy ? 10 : 6, INK_HEAVY, 2.5, 20, 4, 0.25);
  shake(heavy ? 5 : 3, 240);
}

/**
 * 2. saber 刀 — 厚重斜劈
 * 修正1：slash 140–180｜火星 4×4×20｜flash 12×12｜震屏 4–6
 * 修正2：peakW 5｜飞白 4 点
 * 修正3：主体 0.35s（21）+ 余韵 0.45s（27）
 */
function brewSaber(to: Pt, heavy: boolean): void {
  const len = rnd(140, heavy ? 180 : 160);
  const x0 = to.x + len * 0.45;
  const y0 = to.y - len * 0.4;
  const x1 = to.x - len * 0.45;
  const y1 = to.y + len * 0.4;
  brushSlash(x0, y0, x1, y1, 5, 5, IRON, 22, true);
  if (heavy) {
    // 升级：X 交叉第二刀
    brushSlash(to.x - len * 0.4, to.y - len * 0.35, to.x + len * 0.4, to.y + len * 0.35, 5, 4, INK_MID, 20, true);
  }
  const sparks = heavy ? 35 : 20;
  const take = Math.min(sparks, room());
  for (let i = 0; i < take; i++) {
    const t = i / Math.max(1, take - 1);
    const px = x0 + (x1 - x0) * t;
    const py = y0 + (y1 - y0) * t;
    mote(px, py, rnd(-2.5, 2.5), rnd(-3, 1), 4, EMBER, 27, 0.5);
  }
  flash((x0 + x1) / 2, (y0 + y1) / 2, 12, WARM, 3);
  shake(heavy ? 6 : 4, 260);
}

/**
 * 3. sword 剑 — 灵动弧光 + 剑气延伸
 * 修正1：弦长 120–160｜气流 3×3｜震屏 2–3
 * 修正3：主体 0.3s + 剑气 0.25s
 */
function brewSword(to: Pt, heavy: boolean): void {
  const span = rnd(120, heavy ? 160 : 145);
  const arcs = heavy ? 3 : 1;
  for (let k = 0; k < arcs; k++) {
    const a0 = -1.2 + k * 0.35;
    const a1 = a0 + rnd(1.75, 2.27); // 100–130°
    const segs = 11;
    const pts: Pt[] = [];
    const r = span * 0.55;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const a = a0 + (a1 - a0) * t;
      const jr = r + rnd(-4, 4);
      pts.push({ x: to.x + Math.cos(a) * jr, y: to.y + Math.sin(a) * jr * 0.72 });
    }
    if (room() > 0) {
      add({
        mode: "slash",
        x: pts[0]!.x,
        y: pts[0]!.y,
        size: 1,
        peakW: 3,
        color: CYAN,
        life: 18,
        pts,
        reveal: 0,
        revealSpd: 1 / 9,
        feibai: true,
      });
    }
  }
  const tip = { x: to.x + span * 0.35, y: to.y };
  const qiLen = heavy ? 120 : 80;
  brushSlash(tip.x, tip.y, tip.x + qiLen, tip.y + rnd(-8, 8), 4, 2, IRON, 15, false);
  const n = 15;
  for (let i = 0; i < Math.min(n, room()); i++) {
    mote(to.x + rnd(-20, 40), to.y + rnd(-30, 30), rnd(1, 3), rnd(-1.5, 1.5), 3, SAND, 24, 0.15);
  }
  shake(heavy ? 3 : 2, 180);
}

/**
 * 4. staff 棍棒 — 沉闷横扫 + 尘土
 * 修正1：横 slash 130｜peakW 6–8｜尘土 4×4×25｜闷斑 8×8｜震屏 4–5
 * 修正3：主体 0.4s + 余韵 0.5s
 */
function brewStaff(to: Pt, heavy: boolean): void {
  const len = 130;
  const ang = rnd(-0.17, 0.17); // ±10°
  const x0 = to.x - Math.cos(ang) * len * 0.5;
  const y0 = to.y - Math.sin(ang) * len * 0.5;
  const x1 = to.x + Math.cos(ang) * len * 0.5;
  const y1 = to.y + Math.sin(ang) * len * 0.5;
  brushSlash(x0, y0, x1, y1, 4, heavy ? 8 : 6, EARTH, 24, true);
  const dust = heavy ? 40 : 25;
  const take = Math.min(dust, room());
  for (let i = 0; i < take; i++) {
    const a = rnd(-0.4, 0.4) + (Math.random() < 0.5 ? Math.PI : 0);
    mote(to.x, to.y, Math.cos(a) * rnd(2, 5), Math.sin(a) * rnd(0.2, 1.5) + 0.5, 4, INK_MID, 30, 0.6);
  }
  if (heavy) spray(to, 12, INK_LIGHT, 1.8, 22, 3, 0.4); // 二次扬尘
  flash(to.x, to.y, 8, INK_HEAVY, 3); // 闷响斑，非亮色
  shake(heavy ? 5 : 4, 250);
}

/**
 * 5. spear 枪矛 — 直线贯穿
 * 修正1：超长 160–200｜线宽 2–3｜星芒 10×10｜震屏 3–4
 * 修正3：主体 0.28s + 余韵 0.35s
 */
function brewSpear(to: Pt, from: Pt, heavy: boolean): void {
  const len = rnd(160, heavy ? 200 : 180);
  const dx = to.x - from.x || 1;
  const dy = to.y - from.y;
  const L = Math.hypot(dx, dy) || 1;
  const ux = dx / L;
  const uy = dy / L;
  const x0 = to.x - ux * len * 0.85;
  const y0 = to.y - uy * len * 0.85;
  brushSlash(x0, y0, to.x, to.y, 3, heavy ? 3 : 2, IRON, 17, false);
  // 起点飞白 = 枪缨
  for (let i = 0; i < 3; i++) mote(x0 - ux * i * 3, y0 - uy * i * 3, -ux, -uy, 3, INK_CHAR, 12, 0.1);
  if (heavy) {
    brushSlash(x0 + uy * 4, y0 - ux * 4, to.x + uy * 4, to.y - ux * 4, 3, 2, INK_DEEP, 15, false);
  }
  for (let i = 0; i < Math.min(8, room()); i++) {
    const t = i / 8;
    mote(x0 + (to.x - x0) * t + uy * 5, y0 + (to.y - y0) * t - ux * 5, ux * 0.5, uy * 0.5, 3, CYAN, 21, 0.1);
  }
  starFlash(to.x, to.y, 10, WARM, 3);
  shake(heavy ? 4 : 3, 200);
}

/**
 * 6. hook 钩 — 勾拉弧线（项目第六兵刃，非暗器）
 * 气质：弯、拽、带势；主效勾弧 + 回拉尘
 * 修正1：弧长 ~120｜震屏 3
 * 修正3：0.32s + 余韵
 */
function brewHook(from: Pt, to: Pt, heavy: boolean): void {
  const mx = (from.x + to.x) / 2 + rnd(-18, 18);
  const my = Math.min(from.y, to.y) - rnd(28, 48);
  const pts: Pt[] = [
    { x: to.x, y: to.y },
    { x: mx + rnd(-8, 8), y: my },
    { x: mx + rnd(-6, 6), y: my + 12 },
    { x: from.x, y: from.y },
  ];
  // 锐角钩尖
  pts.splice(1, 0, { x: to.x - 18 + rnd(-4, 4), y: to.y - 22 + rnd(-4, 4) });
  if (room() > 0) {
    add({
      mode: "slash",
      x: pts[0]!.x,
      y: pts[0]!.y,
      size: 1,
      peakW: heavy ? 4 : 3,
      color: IRON,
      life: 20,
      pts,
      reveal: 0,
      revealSpd: 1 / 10,
      feibai: true,
    });
  }
  spray(to, heavy ? 14 : 10, SAND, 2.2, 22, 4, 0.35);
  flash(to.x, to.y, 8, WARM, 2);
  shake(heavy ? 4 : 3, 200);
}

/** 暗器卡牌族（非六兵刃）：多点齐发 */
function brewDart(to: Pt, heavy: boolean): void {
  const n = heavy ? 7 : 5;
  for (let i = 0; i < n; i++) {
    const a = -0.7 + (1.4 * i) / Math.max(1, n - 1);
    const len = rnd(50, 70);
    brushSlash(to.x - Math.cos(a) * len, to.y - Math.sin(a) * len * 0.5, to.x, to.y, 4, 1, IRON, 14, true);
    mote(to.x, to.y, Math.cos(a) * 2, Math.sin(a), 4, WARM, 18, 0.1);
  }
  for (let i = 0; i < Math.min(n, room()); i++) flash(to.x + rnd(-12, 12), to.y + rnd(-10, 10), 6, WARM, 2);
  shake(heavy ? 2 : 2, 140);
}

function brewNeedle(to: Pt): void {
  brushSlash(to.x - 55, to.y - 40, to.x + 20, to.y + 18, 5, 1, IRON, 14, true);
  flash(to.x, to.y, 8, CYAN, 2);
}

function brewShuriken(to: Pt): void {
  for (let i = 0; i < 4; i++) {
    const a = (Math.PI * 2 * i) / 4 + rnd(-0.15, 0.15);
    brushSlash(to.x, to.y, to.x + Math.cos(a) * 55, to.y + Math.sin(a) * 55, 4, 1, IRON, 14, true);
  }
  flash(to.x, to.y, 10, SPARK, 2);
}

function brewElbow(to: Pt): void {
  brewPalm(to, true);
  jaggedRing(to.x, to.y, 70, 10, INK_DEEP, 16, 1.2, 1, false, 3);
}

function brewSplit(to: Pt): void {
  brewStaff(to, false);
  brushSlash(to.x, to.y - 50, to.x + rnd(-8, 8), to.y + 55, 4, 4, INK_HEAVY, 18, true);
}

function brewWind(to: Pt, heavy: boolean): void {
  brushSlash(to.x - 70, to.y - 20, to.x + 75, to.y + 15, 5, 4, INK_HEAVY, 18, true);
  brushSlash(to.x - 50, to.y + 18, to.x + 60, to.y - 12, 4, 2, BLOOD, 16, false);
  spray(to, heavy ? 16 : 10, EARTH, 3, 20, 4, 0.35);
  shake(heavy ? 4 : 3, 200);
}

function brewBlock(at: Pt): void {
  spray(at, 20, SPARK, 3.5, 16, 4, 0.35);
  flash(at.x, at.y, 10, WARM, 3);
  shake(3, 160);
}

function brewParry(at: Pt): void {
  jaggedRing(at.x, at.y, 55, 11, SPARK, 14, 1.4, 1, false, 3);
  brewBlock(at);
}

function brewWard(at: Pt, big: boolean): void {
  jaggedRing(at.x, at.y, big ? 80 : 60, 11, EARTH, 20, 1.2, 1, false, 3);
  jaggedRing(at.x, at.y, big ? 50 : 36, 9, SAND, 16, 0.9, 1, false, 2);
  spray(at, 8, INK_MID, 1.8, 14, 4, 0.25);
}

function brewThorns(at: Pt): void {
  jaggedRing(at.x, at.y, 50, 10, EARTH, 16, 0.8, 0, false, 2);
  for (let i = 0; i < 4; i++) {
    const a = (Math.PI * 2 * i) / 4 + rnd(-0.15, 0.15);
    brushSlash(at.x, at.y, at.x + Math.cos(a) * 55, at.y + Math.sin(a) * 55, 4, 2, BLOOD, 14, true);
  }
}

function brewQi(at: Pt, deep: boolean): void {
  const n = 15;
  for (let i = 0; i < Math.min(n, room()); i++) {
    const a = (Math.PI * 2 * i) / n + rnd(-0.1, 0.1);
    const r = 55 + (deep ? 15 : 0);
    mote(at.x + Math.cos(a) * r, at.y + 12 + Math.sin(a) * r * 0.55, -Math.cos(a) * 2.2, -Math.sin(a) * 1.4 - 0.5, 4, WARM, 28, 0);
  }
  jaggedRing(at.x, at.y + 8, 90, 10, CYAN, 32, 0, 1, false, 3);
}

function brewMend(at: Pt): void {
  jaggedRing(at.x, at.y + 4, 45, 9, BLOOD, 22, 1.0, 1, false, 2);
  for (let i = 0; i < Math.min(12, room()); i++) {
    mote(at.x + rnd(-20, 20), at.y + 20, rnd(-0.4, 0.4), -1.8 - Math.random() * 0.5, 4, i % 2 ? SAND : BLOOD, 26, 0.05);
  }
}

function brewBleed(to: Pt): void {
  brushSlash(to.x - 60, to.y - 30, to.x + 55, to.y + 25, 5, 4, BLOOD, 18, true);
  spray(to, 18, BLOOD, 3.2, 24, 4, 0.45);
  flash(to.x, to.y, 10, BLOOD, 2);
  shake(4, 200);
}

function brewExpose(at: Pt): void {
  brushSlash(at.x - 40, at.y - 35, at.x + 45, at.y + 30, 5, 2, EARTH, 16, true);
  spray(at, 8, INK_MID, 1.6, 14, 3, 0.25);
}

function brewCombo(at: Pt): void {
  brushSlash(at.x - 35, at.y - 25, at.x + 40, at.y + 12, 4, 3, BLOOD, 14, true);
  brushSlash(at.x - 20, at.y + 18, at.x + 35, at.y - 20, 4, 2, INK_HEAVY, 12, false);
}

function brewHaste(at: Pt): void {
  for (let i = 0; i < Math.min(12, room()); i++) {
    if (i % 2 === 1) continue;
    mote(at.x - 10 - i * 8, at.y + 4, -1.4, rnd(-0.3, 0.3), 4, INK_HEAVY, 20, 0.05);
  }
  jaggedRing(at.x, at.y + 16, 60, 8, CYAN, 16, 0.7, 1, true, 2);
}

function brewClose(from: Pt, to: Pt): void {
  brewHaste(from);
  spray(to, 8, EARTH, 2, 14, 4, 0.3);
}

function brewStep(at: Pt): void {
  for (let i = 0; i < Math.min(8, room()); i++) {
    mote(at.x + rnd(-10, 10), at.y + 40, rnd(-1, 2), rnd(-0.3, 0.3), 4, SAND, 14, 0.25);
  }
}

function brewMoveDust(at: Pt): void {
  for (let i = 0; i < Math.min(6, room()); i++) {
    mote(at.x + rnd(-8, 8), at.y + 28, rnd(-1, 1), rnd(0, 0.5), 4, INK_LIGHT, 14, 0.25);
  }
}

function brewPlayerHit(at: Pt): void {
  spray(at, 30, BLOOD, 3.5, 24, 4, 0.45);
  shake(4, 220);
}

function brewEnemyHit(at: Pt): void {
  spray(at, 25, BLOOD, 3.0, 22, 4, 0.45);
  shake(3, 180);
}

function brewPlayerDeath(at: Pt): void {
  for (let i = 0; i < Math.min(30, room()); i++) {
    mote(at.x + rnd(-24, 24), at.y + rnd(-14, 14), rnd(-0.4, 0.4), 0.55 + Math.random() * 0.35, 5, INK_HEAVY, 42, 0.05);
  }
}

function brewEnemyDeath(at: Pt): void {
  spray(at, 28, BLOOD, 4.0, 27, 4, 0.4);
  flash(at.x, at.y, 12, BLOOD, 3);
}

function brewPickup(at: Pt): void {
  for (let i = 0; i < Math.min(10, room()); i++) {
    mote(at.x, at.y, rnd(-1, 1), -1.4 - Math.random() * 0.5, 4, SAND, 22, 0.05);
  }
  flash(at.x, at.y, 8, WARM, 2);
}

function brewDoorOpen(at: Pt): void {
  for (let i = 0; i < Math.min(16, room()); i++) {
    mote(at.x, at.y, (i % 2 ? 1 : -1) * (1.2 + Math.random()), rnd(-0.8, 0.3), 4, EARTH, 26, 0.2);
  }
}

function brewDoorClose(at: Pt): void {
  spray(at, 10, EARTH, 2, 16, 4, 0.35);
  flash(at.x, at.y + 10, 8, SAND, 2);
}

function brewFire(at: Pt): void {
  for (let i = 0; i < Math.min(8, room()); i++) {
    mote(at.x + rnd(-12, 12), at.y, rnd(-0.5, 0.5), -0.8 - Math.random() * 0.5, 4, i % 2 ? EMBER : SPARK, 30, 0);
  }
}

function brewWater(at: Pt): void {
  jaggedRing(at.x, at.y, 20, 8, CYAN, 40, 0.9, 0, true, 2);
  jaggedRing(at.x, at.y, 45, 10, CYAN, 36, 0.7, 0, true, 2);
}

function brewCardPlay(at: Pt): void {
  for (let i = 0; i < Math.min(6, room()); i++) {
    mote(at.x + rnd(-10, 10), at.y, rnd(-1.2, 1.2), rnd(-0.5, 0.2), 4, SAND, 12, 0.2);
  }
}

function brewUpgrade(at: Pt): void {
  jaggedRing(at.x, at.y, 55, 10, WARM, 22, 1.3, 1, false, 3);
  spray(at, 10, SPARK, 2.2, 16, 4, 0.25);
}

function brewFoeIntent(from: Pt, to: Pt, kind: string): void {
  if (kind === "charge" || kind === "lunge" || kind === "barrage") brewWind(to, false);
  else if (kind === "pull") brewHook(to, from, false);
  else if (kind === "trap" || kind === "stake") brewStaff(from, false);
  else if (kind === "windup" || kind === "guard" || kind === "counter" || kind === "seal") brewQi(from, false);
  else if (kind === "bleedcut") brewSaber(to, false);
  else if (kind === "mend") brewMend(from);
  else brewSaber(to, false);
}

/**
 * 六武器 Signature 对照表
 * | tag   | 主效           | 主色     | 尺寸要点              | 时长约   |
 * |-------|----------------|----------|-----------------------|----------|
 * | palm  | 同心气圈+掌印  | 暖白/淡青| ring60–140, mote4×4   | 0.35+余韵|
 * | saber | 巨斜劈+火星    | 铁灰/橙红| slash140–180, flash12 | 0.35+0.45|
 * | sword | 弯月弧+剑气    | 淡青/铁灰| 弦120–160, 剑气80–120 | 0.30+0.25|
 * | staff | 横扫+尘土      | 土褐/淡墨| slash130, peakW6–8    | 0.40+0.50|
 * | spear | 直线贯穿+星芒  | 铁灰/淡青| slash160–200          | 0.28+0.35|
 * | hook  | 勾拉弧+回拽    | 铁灰/米黄| 勾弧~120              | 0.32+余韵|
 * | dart* | 扇形短刃齐发   | 铁灰/暖白| 50–70×5–7（暗器卡）   | 0.22+0.30|
 */

export function playBrew(brew: FxBrew, at: Pt, heavy = false, from?: Pt): void {
  switch (brew) {
    case FxBrew.PalmQi:
      brewPalm(at, heavy);
      break;
    case FxBrew.HeavySaber:
      brewSaber(at, heavy);
      break;
    case FxBrew.LightSword:
      brewSword(at, heavy);
      break;
    case FxBrew.StaffSweep:
      brewStaff(at, heavy);
      break;
    case FxBrew.SpearPierce:
      brewSpear(at, from ?? { x: at.x - 120, y: at.y }, heavy);
      break;
    case FxBrew.HookPull:
      brewHook(from ?? at, at, heavy);
      break;
    case FxBrew.DartFan:
      brewDart(at, heavy);
      break;
    case FxBrew.WindPush:
      brewWind(at, heavy);
      break;
    case FxBrew.ElbowSmash:
      brewElbow(at);
      break;
    case FxBrew.SplitCrack:
      brewSplit(at);
      break;
    case FxBrew.BlockSparks:
      brewBlock(at);
      break;
    case FxBrew.ParryFlash:
      brewParry(at);
      break;
    case FxBrew.WardRing:
      brewWard(at, heavy);
      break;
    case FxBrew.QiGather:
      brewQi(at, heavy);
      break;
    case FxBrew.MendRise:
      brewMend(at);
      break;
    case FxBrew.BleedSpray:
      brewBleed(at);
      break;
    case FxBrew.ExposeMark:
      brewExpose(at);
      break;
    case FxBrew.ThornsSpike:
      brewThorns(at);
      break;
    case FxBrew.ComboFlick:
      brewCombo(at);
      break;
    case FxBrew.HasteTrail:
      brewHaste(at);
      break;
    case FxBrew.StepDust:
      brewStep(at);
      break;
    case FxBrew.MoveDust:
      brewMoveDust(at);
      break;
    case FxBrew.PlayerHit:
      brewPlayerHit(at);
      break;
    case FxBrew.EnemyHit:
      brewEnemyHit(at);
      break;
    case FxBrew.PlayerDeath:
      brewPlayerDeath(at);
      break;
    case FxBrew.EnemyDeath:
      brewEnemyDeath(at);
      break;
    case FxBrew.Pickup:
      brewPickup(at);
      break;
    case FxBrew.DoorOpen:
      brewDoorOpen(at);
      break;
    case FxBrew.DoorClose:
      brewDoorClose(at);
      break;
    case FxBrew.Fire:
      brewFire(at);
      break;
    case FxBrew.Water:
      brewWater(at);
      break;
    case FxBrew.CardPlay:
      brewCardPlay(at);
      break;
    case FxBrew.Upgrade:
      brewUpgrade(at);
      break;
    case FxBrew.Market:
      spray(at, 6, EARTH, 1.5, 12, 4, 0.25);
      break;
    case FxBrew.Wild:
      brewMoveDust(at);
      break;
    case FxBrew.Needle:
      brewNeedle(at);
      break;
    case FxBrew.Shuriken:
      brewShuriken(at);
      break;
  }
}

// ═══════════════════════════════════════════
// 对外接口
// ═══════════════════════════════════════════

export function playCardFx(cardId: string, origin: DOMRect): void {
  if (!ensure()) return;
  const id = cardId.replace(/2$/, "");
  const up = cardId.endsWith("2");
  const from = { x: origin.left + origin.width / 2, y: origin.top + origin.height / 2 };
  const foe = foePoint() ?? from;
  const you = youPoint() ?? from;
  playCardSfx(cardId);

  if (id === "strike" || id === "twinpalm" || id === "follow" || id === "layer" || id === "finisher" || id === "midStrike" || id === "palmSeal" || id === "drunkFist") {
    brewPalm(foe, up || id === "finisher");
  } else if (id === "elbow" || id === "lateAnvil") brewElbow(foe);
  else if (id === "cut" || id === "saberBleed" || id === "burySlash" || id === "rift") brewSaber(foe, up || id === "burySlash");
  else if (id === "drawcut") {
    brewSaber(you, false);
    brewSaber(foe, up);
  } else if (id === "thrust" || id === "spearLock") brewSpear(foe, you, up);
  else if (id === "pierce" || id === "swordMute" || id === "lateMute") brewSword(foe, up);
  else if (id === "hookpull" || id === "hookDisarm") brewHook(you, foe, up);
  else if (
    id === "defend" ||
    id === "backpalm" ||
    id === "brace" ||
    id === "midGuard" ||
    id === "lateWard" ||
    id === "buryWard" ||
    id === "weave" ||
    id === "mirror" ||
    id === "lateMirror" ||
    id === "jinwuToken"
  ) {
    brewWard(you, up);
  } else if (id === "thorns" || id === "ironform") brewThorns(you);
  else if (id === "mend" || id === "salve" || id === "suture" || id === "bindwound" || id === "peonyBrew") brewMend(you);
  else if (
    id === "charge" ||
    id === "gather" ||
    id === "qiPulse" ||
    id === "qiFlood" ||
    id === "tide" ||
    id === "lateTide" ||
    id === "echo" ||
    id === "unbind" ||
    id === "lateLeech"
  ) {
    brewQi(you, up || id === "qiFlood");
  } else if (id === "inbreath") brewQi(you, true);
  else if (id === "advance" || id === "sidestep") brewStep(you);
  else if (id === "close") brewClose(you, foe);
  else if (id === "haste") brewHaste(you);
  else if (id === "push" || id === "sweep" || id === "midPush" || id === "buryKnock") brewWind(foe, up);
  else if (id === "plant" || id === "staffBind") brewStaff(you, up);
  else if (id === "split") brewSplit(foe);
  else if (id === "bleedcut" || id === "buryBleed" || id === "lateBleed" || id === "cauterize") brewBleed(foe);
  else if (id === "expose" || id === "marking") brewExpose(foe);
  else if (id === "combo" || id === "chain" || id === "setup" || id === "lateChain") brewCombo(you);
  else if (id === "handCut" || id === "lateHand" || id === "venomFog") brewDart(foe, up);
  else if (id === "pouchSeal" || id === "latePouch") brewNeedle(foe);
  else if (id === "shuriken") brewShuriken(foe);
  else brewPalm(foe, false);

  kick();
}

export function playIntentFx(kind: string): void {
  if (!ensure()) return;
  const foe = foePoint();
  const you = youPoint();
  if (!foe || !you) return;
  playSfx("foe");
  brewFoeIntent(foe, you, kind);
  kick();
}

export function playSceneFx(kind: SceneFxKind | FxKind, at?: Pt): void {
  if (!ensure()) return;
  const pt = at ?? youPoint() ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  switch (kind) {
    case "pickup":
      playSfx("pickup");
      brewPickup(pt);
      break;
    case "doorOpen":
      playSfx("doorOpen");
      brewDoorOpen(pt);
      break;
    case "doorClose":
      playSfx("doorClose");
      brewDoorClose(pt);
      break;
    case "fire":
      brewFire(pt);
      break;
    case "water":
      brewWater(pt);
      break;
    case "moveDust":
      brewMoveDust(pt);
      break;
    case "playerHit":
      playSfx("playerHit");
      brewPlayerHit(pt);
      break;
    case "enemyHit":
      playSfx("enemyHit");
      brewEnemyHit(pt);
      break;
    case "playerDeath":
      playSfx("playerDeath");
      brewPlayerDeath(pt);
      break;
    case "enemyDeath":
      playSfx("enemyDeath");
      brewEnemyDeath(pt);
      break;
    case "cardPlay":
      playSfx("cardPlay");
      brewCardPlay(pt);
      break;
    case "upgrade":
      playSfx("upgrade");
      brewUpgrade(pt);
      break;
    case "block":
      playSfx("block");
      brewBlock(pt);
      break;
    case "parry":
      playSfx("parry");
      brewParry(pt);
      break;
    case "shuriken":
      brewShuriken(pt);
      break;
    case "dart":
      brewDart(pt, false);
      break;
    case "market":
      playSfx("market");
      spray(pt, 6, EARTH, 1.5, 12, 4, 0.25);
      break;
    case "wild":
      playSfx("wild");
      brewMoveDust(pt);
      break;
    default:
      break;
  }
  kick();
}

/** 修正2：按 t 计算笔锋线宽（起细→中粗→收尖） */
function brushWidth(t: number, peak: number): number {
  const u = Math.max(0, Math.min(1, t));
  const envelope = u < 0.5 ? u * 2 : (1 - u) * 2; // 三角包络 0→1→0
  return Math.max(1, 1 + (peak - 1) * envelope);
}

function tick(): void {
  const c = ensure();
  raf = 0;
  if (!c || !canvas) return;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
  c.shadowBlur = 0;
  c.filter = "none";
  c.globalAlpha = 1;
  c.lineCap = "butt";
  c.lineJoin = "miter";
  c.miterLimit = 8;
  c.imageSmoothingEnabled = false;

  // 修正1：震屏平移
  if (shakeLeft > 0) {
    const ox = (Math.random() - 0.5) * 2 * shakeAmp;
    const oy = (Math.random() - 0.5) * 2 * shakeAmp;
    c.translate(ox, oy);
    shakeLeft -= 1;
    if (shakeLeft <= 0) shakeAmp = 0;
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]!;
    p.life -= 1;

    if (p.mode === "mote") {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.grav;
      p.vx += rnd(-0.2, 0.2);
      // 修正3：easeOut 速度衰减
      p.vx *= 0.98;
      p.vy *= 0.99;
    } else if (p.mode === "slash") {
      if (p.reveal < 1) p.reveal = Math.min(1, p.reveal + p.revealSpd);
      // 收笔飞白：揭示完成瞬间补点
      if (p.feibai && p.reveal >= 1) {
        p.feibai = false;
        const last = p.pts[p.pts.length - 1]!;
        const prev = p.pts[p.pts.length - 2] ?? last;
        const dx = last.x - prev.x;
        const dy = last.y - prev.y;
        const L = Math.hypot(dx, dy) || 1;
        for (let f = 0; f < 4; f++) {
          mote(last.x + (dx / L) * f * 2, last.y + (dy / L) * f * 2, (dx / L) * 0.6, (dy / L) * 0.6, 2, p.color, 10, 0.1);
        }
      }
    } else if (p.mode === "ring") {
      if (p.pulse > 0) {
        p.pulseT += 1;
        const u = p.pulseT / Math.max(1, p.max);
        const wave = u < 0.4 ? easeOutCubic(u / 0.4) : 1 - easeOutCubic((u - 0.4) / 0.6);
        p.radius = p.baseR * (0.65 + wave * 1.5);
      } else {
        p.radius = p.baseR + p.rVel * (p.max - p.life);
      }
    } else if (p.mode === "palm" && p.life === 1) {
      // 掌印碎裂
      spray({ x: p.x, y: p.y }, 5, p.color, 2.5, 14, 4, 0.3);
    }

    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }

    c.strokeStyle = p.color;
    c.fillStyle = p.color;

    if (p.mode === "slash" && p.pts.length >= 2) {
      const shown = Math.max(2, Math.ceil(p.pts.length * easeOutCubic(p.reveal)));
      // 分段变线宽：硬边笔锋
      for (let k = 1; k < shown; k++) {
        const t = k / Math.max(1, p.pts.length - 1);
        c.lineWidth = brushWidth(t, p.peakW);
        c.beginPath();
        c.moveTo(Math.round(p.pts[k - 1]!.x), Math.round(p.pts[k - 1]!.y));
        c.lineTo(Math.round(p.pts[k]!.x), Math.round(p.pts[k]!.y));
        c.stroke();
      }
    } else if (p.mode === "ring" && p.sides >= 3) {
      c.lineWidth = Math.max(1, p.size);
      const dashed = p.size <= 1;
      c.beginPath();
      let started = false;
      for (let k = 0; k <= p.sides; k++) {
        const iSide = k % p.sides;
        if (dashed && iSide % 2 === 1) {
          started = false;
          continue;
        }
        const ang = (Math.PI * 2 * iSide) / p.sides + 0.12;
        const j = p.jit[iSide] ?? 0;
        const px = Math.round(p.x + Math.cos(ang) * p.radius + j);
        const py = Math.round(p.y + Math.sin(ang) * p.radius + (p.jit[(iSide + 3) % p.sides] ?? 0) * 0.4);
        if (!started) {
          c.moveTo(px, py);
          started = true;
        } else c.lineTo(px, py);
      }
      c.stroke();
    } else if (p.mode === "flash") {
      const s = Math.max(8, Math.round(p.size));
      c.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), s, s);
    } else if (p.mode === "star") {
      const s = Math.max(6, p.size);
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(p.x - s, p.y);
      c.lineTo(p.x + s, p.y);
      c.moveTo(p.x, p.y - s);
      c.lineTo(p.x, p.y + s);
      c.moveTo(p.x - s * 0.7, p.y - s * 0.7);
      c.lineTo(p.x + s * 0.7, p.y + s * 0.7);
      c.moveTo(p.x - s * 0.7, p.y + s * 0.7);
      c.lineTo(p.x + s * 0.7, p.y - s * 0.7);
      c.stroke();
    } else if (p.mode === "palm") {
      const s = Math.max(6, p.size);
      // 简笔掌：掌心 + 四指
      c.fillRect(Math.round(p.x - s), Math.round(p.y - s * 0.3), s * 2, s);
      c.fillRect(Math.round(p.x - s * 1.2), Math.round(p.y - s * 1.4), s * 0.55, s);
      c.fillRect(Math.round(p.x - s * 0.5), Math.round(p.y - s * 1.6), s * 0.55, s * 1.1);
      c.fillRect(Math.round(p.x + s * 0.2), Math.round(p.y - s * 1.5), s * 0.55, s);
      c.fillRect(Math.round(p.x + s * 0.85), Math.round(p.y - s * 1.2), s * 0.5, s * 0.9);
    } else if (p.mode === "mote") {
      const s = Math.max(3, Math.round(p.size));
      c.fillRect(Math.round(p.x), Math.round(p.y), s, s);
    }
  }

  if (particles.length || shakeLeft > 0) raf = requestAnimationFrame(tick);
}

if (typeof window !== "undefined") {
  window.addEventListener("resize", () => {
    if (canvas) ensure();
  });
}
