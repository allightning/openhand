import { playCardSfx, playSfx, type SfxKind } from "./audio";

export type FxKind = SfxKind;

interface Particle {
  mode: "mote" | "ring" | "slash" | "arc" | "flash";
  x: number;
  y: number;
  x2: number;
  y2: number;
  cx: number;
  cy: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  glow: number;
  grow: number;
}

const particles: Particle[] = [];
let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let raf = 0;
let dpr = 1;

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
  return ctx;
}

function add(p: Omit<Particle, "max" | "grow" | "x2" | "y2" | "mode" | "cx" | "cy"> & Partial<Particle>): void {
  particles.push({
    mode: "mote",
    x2: p.x,
    y2: p.y,
    cx: p.x,
    cy: p.y,
    grow: 0,
    ...p,
    max: p.max ?? p.life,
  });
}

const FX: Record<string, FxKind> = {
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
};

export function fxKind(cardId: string): FxKind {
  const id = cardId.replace(/2$/, "");
  return FX[id] ?? "palm";
}

function center(el: Element | null): { x: number; y: number } | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function foePoint(): { x: number; y: number } | null {
  return (
    center(document.querySelector(".fy-stand-wrap.foe")) ??
    center(document.querySelector(".fighter.foe-side")) ??
    center(document.querySelector(".fig.foe, .fig-lg.foe"))
  );
}

function youPoint(): { x: number; y: number } | null {
  return (
    center(document.querySelector(".fy-stand-wrap.you")) ??
    center(document.querySelector(".fighter.you-side")) ??
    center(document.querySelector(".fig.you, .fig-lg.you"))
  );
}

export function clearFx(): void {
  particles.length = 0;
  if (raf) {
    cancelAnimationFrame(raf);
    raf = 0;
  }
  if (!canvas || !ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function kick(): void {
  if (!raf) raf = requestAnimationFrame(tick);
}

export function playCardFx(cardId: string, origin: DOMRect): void {
  if (!ensure()) return;
  const id = cardId.replace(/2$/, "");
  const from = { x: origin.left + origin.width / 2, y: origin.top + origin.height / 2 };
  const foe = foePoint() ?? from;
  const you = youPoint() ?? from;
  playCardSfx(cardId);
  if (id === "strike") palmHit(from, foe, cardId.endsWith("2") ? 3 : 2);
  else if (id === "elbow") elbowHit(you, foe);
  else if (id === "cut") saberCut(from, foe, 3);
  else if (id === "drawcut") drawCut(you, foe);
  else if (id === "thrust") spearThrust(from, foe);
  else if (id === "pierce") swordPierce(from, foe);
  else if (id === "hookpull") hookPull(foe, you);
  else if (id === "defend") wardShield(you, cardId.endsWith("2") ? 28 : 20);
  else if (id === "backpalm") backWard(you);
  else if (id === "mend") healGreen(you, cardId.endsWith("2") ? 8 : 5);
  else if (id === "charge") gatherQi(you, "#5a4030");
  else if (id === "inbreath") gatherQi(you, "#8b2a24");
  else if (id === "advance") stepDust(you, 1);
  else if (id === "close") dashClose(you, foe);
  else if (id === "push") shoveWind(from, foe, cardId.endsWith("2") ? 3 : 2);
  else if (id === "sweep") sweepArc(you, foe);
  else if (id === "plant") plantStamp(you);
  else if (id === "split") splitCrack(foe);
  else if (id === "bleedcut") bleedSlash(from, foe);
  else if (id === "expose") exposeCrack(foe);
  else if (id === "thorns") thornWard(you);
  else if (id === "combo") comboSpark(you);
  else if (id === "haste") hasteLines(you);
  else palmHit(from, foe, 2);
  kick();
}

export function playIntentFx(kind: string): void {
  if (!ensure()) return;
  const foe = foePoint();
  const you = youPoint();
  if (!foe || !you) return;
  playSfx("foe");
  if (kind === "charge" || kind === "lunge" || kind === "barrage") shoveWind(foe, you, 2);
  else if (kind === "pull") hookPull(you, foe);
  else if (kind === "trap" || kind === "stake") plantStamp(foe);
  else if (kind === "windup" || kind === "guard" || kind === "counter" || kind === "seal") gatherQi(foe, "#c43a32");
  else if (kind === "bleedcut") saberCut(foe, you, 2);
  else if (kind === "mend") healGreen(foe, 6);
  else saberCut(foe, you, 2);
  kick();
}

function mote(x: number, y: number, vx: number, vy: number, size: number, color: string, life: number, glow: number): void {
  add({ mode: "mote", x, y, vx, vy, size, color, life, glow });
}

function ring(x: number, y: number, size: number, color: string, life: number, glow: number, grow: number): void {
  add({ mode: "ring", x, y, vx: 0, vy: 0, size, color, life, glow, grow });
}

function slash(x: number, y: number, x2: number, y2: number, width: number, color: string, life: number): void {
  add({ mode: "slash", x, y, x2, y2, vx: 0, vy: 0, size: width, color, life, glow: width * 3 });
}

function curve(x: number, y: number, x2: number, y2: number, cx: number, cy: number, width: number, color: string, life: number): void {
  add({ mode: "arc", x, y, x2, y2, cx, cy, vx: 0, vy: 0, size: width, color, life, glow: width * 2.4 });
}

function flash(x: number, y: number, size: number, color: string, life: number): void {
  add({ mode: "flash", x, y, vx: 0, vy: 0, size, color, life, glow: size * 1.6 });
}

function shake(): void {
  const el = document.querySelector(".fy-combat");
  if (!el) return;
  el.classList.remove("hit-shake");
  void (el as HTMLElement).offsetWidth;
  el.classList.add("hit-shake");
  window.setTimeout(() => el.classList.remove("hit-shake"), 180);
}

function crescent(at: { x: number; y: number }, ang: number, span: number, color: string, width: number): void {
  const hx = Math.cos(ang) * span * 0.5;
  const hy = Math.sin(ang) * span * 0.5;
  const nx = Math.cos(ang + Math.PI / 2) * (8 + span * 0.1);
  const ny = Math.sin(ang + Math.PI / 2) * (8 + span * 0.1);
  curve(at.x - hx, at.y - hy, at.x + hx, at.y + hy, at.x + nx, at.y + ny - 6, width, color, 10);
}

function blades(at: { x: number; y: number }, n: number, color: string): void {
  for (let i = 0; i < n; i++) {
    const ang = -0.95 + i * 0.38 + (Math.random() - 0.5) * 0.1;
    crescent(at, ang, 58 + i * 14, color, 4.4 - i * 0.55);
  }
}

function dust(at: { x: number; y: number }, n: number): void {
  for (let i = 0; i < n; i++) {
    mote(at.x, at.y + 14, (Math.random() - 0.5) * 3.6, 0.2 + Math.random() * 1.1, 3.4, i % 2 ? "#cbb896" : "#8a7d68", 16, 0);
  }
}

function impact(at: { x: number; y: number }, heavy = false): void {
  flash(at.x, at.y, heavy ? 28 : 18, "#8b2a24", 8);
  ring(at.x, at.y, heavy ? 20 : 13, "#1a1410", 13, 0, 2.1);
  dust(at, heavy ? 14 : 9);
  shake();
}

function palmHit(_from: { x: number; y: number }, to: { x: number; y: number }, n: number): void {
  const span = 72 + n * 16;
  crescent({ x: to.x, y: to.y }, 0.04, span, "#1a1410", 8.2);
  crescent({ x: to.x, y: to.y + 10 }, -0.05, span * 0.84, "#8b2a24", 6.4);
  ring(to.x, to.y, 18 + n * 7, "#1a1410", 15, 0, 2.6);
  ring(to.x, to.y, 11 + n * 5, "#8b2a24", 13, 0, 2);
  flash(to.x, to.y, 26 + n * 5, "#8b2a24", 9);
  dust(to, 12 + n * 3);
  shake();
}

function elbowHit(_from: { x: number; y: number }, to: { x: number; y: number }): void {
  ring(to.x, to.y, 22, "#1a1410", 12, 0, 1.8);
  impact(to, true);
}

function saberCut(_from: { x: number; y: number }, to: { x: number; y: number }, n: number): void {
  blades(to, n, "#1a1410");
  crescent(to, -0.55, 72, "#8b2a24", 3.2);
  dust(to, 10);
  shake();
}

function drawCut(from: { x: number; y: number }, to: { x: number; y: number }): void {
  crescent(from, -0.9, 38, "#5a4030", 3);
  blades(to, 2, "#1a1410");
  impact(to);
}

function spearThrust(_from: { x: number; y: number }, to: { x: number; y: number }): void {
  slash(to.x - 28, to.y - 10, to.x + 26, to.y + 6, 3.6, "#1a1410", 11);
  slash(to.x - 24, to.y - 6, to.x + 22, to.y + 10, 2.2, "#8b2a24", 10);
  dust(to, 7);
  shake();
}

function swordPierce(_from: { x: number; y: number }, to: { x: number; y: number }): void {
  slash(to.x - 18, to.y - 32, to.x + 22, to.y + 26, 3.2, "#1a1410", 12);
  slash(to.x - 14, to.y - 26, to.x + 18, to.y + 22, 2, "#8b2a24", 10);
  dust(to, 7);
  shake();
}

function hookPull(from: { x: number; y: number }, to: { x: number; y: number }): void {
  curve(from.x, from.y - 6, to.x, to.y, (from.x + to.x) / 2, Math.min(from.y, to.y) - 18, 2.2, "#5a4030", 12);
  dust(from, 4);
}

function wardShield(at: { x: number; y: number }, size: number): void {
  ring(at.x, at.y, size, "#5a4030", 20, 0, 1.6);
  ring(at.x, at.y, size * 0.62, "#cbb896", 16, 0, 1.2);
  dust(at, 8);
}

function backWard(at: { x: number; y: number }): void {
  ring(at.x, at.y, 18, "#5a4030", 14, 0, 1.4);
  stepDust(at, -1);
}

function healGreen(at: { x: number; y: number }, amount: number): void {
  ring(at.x, at.y + 8, 12, "#8b2a24", 20, 0, 1.5);
  for (let i = 0; i < 6 + amount; i++) {
    mote(at.x + (Math.random() - 0.5) * 18, at.y + 18, (Math.random() - 0.5) * 0.3, -1.4 - Math.random(), 3.2, i % 2 ? "#cbb896" : "#8b2a24", 24, 0);
  }
}

function gatherQi(at: { x: number; y: number }, color: string): void {
  ring(at.x, at.y + 16, 10, color, 20, 0, 1.3);
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI * 2 * i) / 8;
    mote(at.x + Math.cos(a) * 34, at.y + 20 + Math.sin(a) * 12, -Math.cos(a) * 0.9, -1.1, 3.4, color, 18, 0);
  }
}

function stepDust(at: { x: number; y: number }, dir: number): void {
  for (let i = 0; i < 6; i++) {
    mote(at.x, at.y + 40, (Math.random() - 0.5) * 2 + dir * 1.1, -0.2, 2.6, "#cbb896", 14, 0);
  }
}

function dashClose(from: { x: number; y: number }, to: { x: number; y: number }): void {
  stepDust(from, 1);
  stepDust(to, 1);
}

function shoveWind(_from: { x: number; y: number }, to: { x: number; y: number }, n: number): void {
  crescent({ x: to.x, y: to.y }, 0.05, 62 + n * 10, "#1a1410", 5);
  crescent({ x: to.x, y: to.y + 10 }, 0.12, 48 + n * 6, "#8b2a24", 3.6);
  dust(to, 8 + n);
  shake();
}

function sweepArc(_from: { x: number; y: number }, to: { x: number; y: number }): void {
  crescent({ x: to.x, y: to.y + 22 }, 0.12, 96, "#1a1410", 5.2);
  crescent({ x: to.x, y: to.y + 28 }, 0.04, 76, "#8b2a24", 3.8);
  dust({ x: to.x, y: to.y + 28 }, 10);
  shake();
}

function plantStamp(at: { x: number; y: number }): void {
  slash(at.x, at.y + 8, at.x, at.y + 40, 3, "#5a4030", 12);
  dust({ x: at.x, y: at.y + 36 }, 7);
}

function splitCrack(at: { x: number; y: number }): void {
  slash(at.x, at.y - 16, at.x, at.y + 18, 3, "#1a1410", 11);
  slash(at.x - 8, at.y - 4, at.x + 10, at.y + 12, 1.8, "#5a4030", 10);
  impact(at);
}

function bleedSlash(_from: { x: number; y: number }, to: { x: number; y: number }): void {
  blades(to, 1, "#8b2a24");
  impact(to);
  for (let i = 0; i < 5; i++) mote(to.x, to.y, (Math.random() - 0.5) * 0.8, 1.2 + Math.random(), 2.2, "#8b2a24", 22, 0);
}

function exposeCrack(at: { x: number; y: number }): void {
  slash(at.x - 14, at.y - 16, at.x + 16, at.y + 12, 1.6, "#5a4030", 14);
  dust(at, 5);
}

function thornWard(at: { x: number; y: number }): void {
  ring(at.x, at.y, 11, "#5a4030", 16, 0, 1.1);
  for (let i = 0; i < 4; i++) {
    const a = (Math.PI * 2 * i) / 4 + 0.4;
    slash(at.x, at.y, at.x + Math.cos(a) * 22, at.y + Math.sin(a) * 22, 1.4, "#8b2a24", 10);
  }
}

function comboSpark(at: { x: number; y: number }): void {
  crescent(at, -0.6, 24, "#8b2a24", 2.4);
  crescent(at, 0.5, 22, "#1a1410", 2);
  dust(at, 4);
}

function hasteLines(at: { x: number; y: number }): void {
  crescent(at, -0.15, 40, "#5a4030", 2);
  crescent(at, 0.12, 32, "#8a7d68", 1.6);
  stepDust(at, 1);
}

function tick(): void {
  const c = ensure();
  raf = 0;
  if (!c || !canvas) return;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, canvas.width, canvas.height);
  c.lineCap = "round";
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= 1;
    p.x += p.vx;
    p.y += p.vy;
    p.x2 += p.vx;
    p.y2 += p.vy;
    if (p.mode === "mote") p.vy += 0.05;
    p.size += p.grow;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    const a = Math.max(0, p.life / p.max);
    c.globalAlpha = a;
    c.strokeStyle = p.color;
    c.fillStyle = p.color;
    if (p.mode === "slash") {
      c.lineWidth = Math.max(1.2, p.size * (0.45 + a * 0.7));
      c.beginPath();
      c.moveTo(p.x, p.y);
      c.lineTo(p.x2, p.y2);
      c.stroke();
    } else if (p.mode === "arc") {
      c.lineWidth = Math.max(1.6, p.size * (0.5 + a * 0.7));
      c.beginPath();
      c.moveTo(p.x, p.y);
      c.quadraticCurveTo(p.cx, p.cy, p.x2, p.y2);
      c.stroke();
    } else if (p.mode === "flash") {
      c.beginPath();
      c.ellipse(p.x, p.y, Math.max(2, p.size * a), Math.max(1.4, p.size * a * 0.7), -0.4, 0, Math.PI * 2);
      c.fill();
    } else if (p.mode === "ring") {
      c.lineWidth = 1.8 * a;
      c.beginPath();
      c.arc(p.x, p.y, Math.max(2, p.size), 0, Math.PI * 2);
      c.stroke();
    } else {
      c.beginPath();
      c.arc(p.x, p.y, Math.max(0.7, p.size * a), 0, Math.PI * 2);
      c.fill();
    }
  }
  c.globalAlpha = 1;
  if (particles.length) raf = requestAnimationFrame(tick);
}

if (typeof window !== "undefined") {
  window.addEventListener("resize", () => {
    if (canvas) ensure();
  });
}
