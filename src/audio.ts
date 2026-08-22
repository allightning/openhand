/**
 * 明手 · Web Audio 合成音效体系（水墨武侠调性）
 * — 无外部音频文件、无额外依赖；音量峰值约 0.02–0.04，单音 ≤1s。
 * — 对外：playSfx / playCardSfx / cueMusic / getEar / setEar（调用方无需改动）
 */

const KEY = "openhand-ear";

export interface Ear {
  sfx: boolean;
  music: boolean;
}

/** 完整音效枚举：含旧 kind（兼容 fx/main）与扩展 kind。 */
export type SfxKind =
  // —— 旧兼容（fx.ts / main.ts）——
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
  // —— 武器族 ——
  | "cut"
  | "drawcut"
  | "thrust"
  | "pierce"
  | "dart"
  | "needle"
  | "shuriken"
  // —— 防御 / 状态 ——
  | "block"
  | "parry"
  | "inbreath"
  | "charge"
  | "playerHit"
  | "enemyHit"
  | "playerDeath"
  | "enemyDeath"
  // —— 交互 / 环境 ——
  | "pickup"
  | "doorOpen"
  | "doorClose"
  | "market"
  | "wild"
  // —— UI ——
  | "cardPlay"
  | "upgrade"
  | "menuClick";

export type SfxGroup = "weapon" | "defense" | "status" | "hit" | "env" | "ui";

const GROUP_OF: Record<SfxKind, SfxGroup> = {
  palm: "weapon",
  saber: "weapon",
  spear: "weapon",
  sword: "weapon",
  hook: "weapon",
  cut: "weapon",
  drawcut: "weapon",
  thrust: "weapon",
  pierce: "weapon",
  plant: "weapon",
  elbow: "weapon",
  split: "weapon",
  dart: "weapon",
  needle: "weapon",
  shuriken: "weapon",
  wind: "weapon",
  close: "weapon",
  bleed: "weapon",
  expose: "weapon",
  combo: "weapon",
  haste: "weapon",
  step: "weapon",
  ward: "defense",
  block: "defense",
  parry: "defense",
  thorns: "defense",
  mend: "status",
  qi: "status",
  inbreath: "status",
  charge: "status",
  foe: "hit",
  playerHit: "hit",
  enemyHit: "hit",
  playerDeath: "hit",
  enemyDeath: "hit",
  pickup: "ui",
  doorOpen: "env",
  doorClose: "env",
  market: "env",
  wild: "env",
  cardPlay: "ui",
  upgrade: "ui",
  menuClick: "ui",
};

/** 分组相对增益（乘在 0.02–0.04 峰值上，环境更低）。 */
const GROUP_GAIN: Record<SfxGroup, number> = {
  weapon: 1,
  defense: 0.95,
  status: 0.9,
  hit: 1,
  env: 0.45,
  ui: 0.85,
};

let ear: Ear = { sfx: true, music: true };
let ctx: AudioContext | null = null;
let musicGain: GainNode | null = null;
let musicNodes: AudioNode[] = [];
let musicTimer = 0;
let scene: "title" | "map" | "combat" | "off" = "off";

function loadEar(): Ear {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { sfx: true, music: true };
    const parsed = JSON.parse(raw) as Ear;
    return { sfx: parsed.sfx !== false, music: parsed.music !== false };
  } catch {
    return { sfx: true, music: true };
  }
}

ear = typeof localStorage !== "undefined" ? loadEar() : { sfx: true, music: true };

function saveEar(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(ear));
  } catch {
    /* ignore */
  }
}

export function getEar(): Ear {
  return { ...ear };
}

export function setEar(patch: Partial<Ear>): Ear {
  ear = { ...ear, ...patch };
  saveEar();
  if (!ear.music) stopMusic();
  else if (scene !== "off") cueMusic(scene);
  return getEar();
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** 峰值钳制到武侠克制区间（环境可更低）。 */
function peak(base: number, group: SfxGroup): number {
  const g = base * GROUP_GAIN[group];
  if (group === "env") return Math.min(0.015, Math.max(0.006, g));
  return Math.min(0.04, Math.max(0.02, g));
}

function envGain(c: AudioContext, start: number, p: number, attack: number, release: number): GainNode {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, p), start + Math.max(0.004, attack));
  g.gain.exponentialRampToValueAtTime(0.0001, start + attack + release);
  return g;
}

function noiseBuf(c: AudioContext, dur: number): AudioBufferSourceNode {
  const n = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, n, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  return src;
}

function tone(
  c: AudioContext,
  start: number,
  freq: number,
  p: number,
  type: OscillatorType,
  attack: number,
  release: number,
  dest: AudioNode = c.destination,
): void {
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  const g = envGain(c, start, p, attack, release);
  o.connect(g);
  g.connect(dest);
  o.start(start);
  o.stop(start + attack + release + 0.02);
}

function noiseBurst(
  c: AudioContext,
  start: number,
  dur: number,
  p: number,
  cutoff: number,
  q = 1.2,
  dest: AudioNode = c.destination,
): void {
  const src = noiseBuf(c, dur);
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = cutoff;
  f.Q.value = q;
  const g = envGain(c, start, p, 0.008, dur);
  src.connect(f);
  f.connect(g);
  g.connect(dest);
  src.start(start);
  src.stop(start + dur + 0.02);
}

function whoosh(
  c: AudioContext,
  start: number,
  dur: number,
  p: number,
  f0: number,
  f1: number,
  dest: AudioNode = c.destination,
): void {
  const src = noiseBuf(c, dur);
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.Q.value = 0.9;
  f.frequency.setValueAtTime(f0, start);
  f.frequency.exponentialRampToValueAtTime(f1, start + dur * 0.4);
  f.frequency.exponentialRampToValueAtTime(Math.max(80, f0 * 0.7), start + dur);
  const g = envGain(c, start, p, 0.02, dur);
  src.connect(f);
  f.connect(g);
  g.connect(dest);
  src.start(start);
  src.stop(start + dur + 0.02);
}

function thud(c: AudioContext, start: number, freq: number, p: number, dest: AudioNode = c.destination): void {
  const o = c.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(freq, start);
  o.frequency.exponentialRampToValueAtTime(Math.max(28, freq * 0.35), start + 0.14);
  const g = envGain(c, start, p, 0.004, 0.16);
  o.connect(g);
  g.connect(dest);
  o.start(start);
  o.stop(start + 0.2);
}

function softLp(c: AudioContext, cutoff: number): BiquadFilterNode {
  const f = c.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = cutoff;
  f.Q.value = 0.7;
  return f;
}

// ═══════════════════════════════════════════
// 武器 · 重刀（草莽破门）
// ═══════════════════════════════════════════

function sfxHeavySaber(c: AudioContext, t: number, heavy: boolean): void {
  const g = "weapon" as const;
  whoosh(c, t, heavy ? 0.18 : 0.12, peak(0.028, g), 220, 620);
  tone(c, t + 0.04, heavy ? 180 : 210, peak(0.026, g), "triangle", 0.004, 0.09);
  noiseBurst(c, t + 0.05, heavy ? 0.08 : 0.055, peak(0.03, g), heavy ? 900 : 1100, 1.4);
  thud(c, t + 0.06, heavy ? 62 : 78, peak(0.034, g));
  if (heavy) noiseBurst(c, t + 0.14, 0.06, peak(0.024, g), 480, 0.8);
}

function sfxDrawCut(c: AudioContext, t: number, heavy: boolean): void {
  const g = "weapon" as const;
  whoosh(c, t, 0.1, peak(0.024, g), 300, 880);
  noiseBurst(c, t + 0.03, 0.07, peak(0.028, g), 1400, 1.6);
  tone(c, t + 0.04, 320, peak(0.022, g), "triangle", 0.003, 0.06);
  thud(c, t + 0.07, 70, peak(0.03, g));
  if (heavy) whoosh(c, t + 0.1, 0.08, peak(0.022, g), 400, 700);
}

// ═══════════════════════════════════════════
// 武器 · 轻剑（镜花水月）
// ═══════════════════════════════════════════

function sfxLightSword(c: AudioContext, t: number, pierce: boolean): void {
  const g = "weapon" as const;
  whoosh(c, t, pierce ? 0.09 : 0.07, peak(0.026, g), pierce ? 480 : 380, pierce ? 1600 : 1200);
  const src = noiseBuf(c, 0.1);
  const f = softLp(c, pierce ? 2200 : 1800);
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(600, t);
  bp.frequency.exponentialRampToValueAtTime(pierce ? 2400 : 1800, t + 0.07);
  bp.Q.value = 2.2;
  const gn = envGain(c, t, peak(0.028, g), 0.01, 0.09);
  src.connect(bp);
  bp.connect(f);
  f.connect(gn);
  gn.connect(c.destination);
  src.start(t);
  src.stop(t + 0.12);
  tone(c, t + 0.02, pierce ? 880 : 720, peak(0.022, g), "sine", 0.003, 0.05);
  if (pierce) thud(c, t + 0.04, 110, peak(0.024, g));
}

function sfxSpear(c: AudioContext, t: number): void {
  const g = "weapon" as const;
  whoosh(c, t, 0.08, peak(0.025, g), 340, 1100);
  noiseBurst(c, t + 0.025, 0.06, peak(0.027, g), 1300, 1.8);
  thud(c, t + 0.04, 96, peak(0.028, g));
}

// ═══════════════════════════════════════════
// 武器 · 棍棒 / 掌肘（工兵扎实）
// ═══════════════════════════════════════════

function sfxStaffPlant(c: AudioContext, t: number): void {
  const g = "weapon" as const;
  thud(c, t, 72, peak(0.034, g));
  noiseBurst(c, t, 0.09, peak(0.028, g), 240, 0.7);
  tone(c, t + 0.01, 140, peak(0.022, g), "triangle", 0.006, 0.1);
}

function sfxElbow(c: AudioContext, t: number): void {
  const g = "weapon" as const;
  thud(c, t, 54, peak(0.036, g));
  noiseBurst(c, t, 0.06, peak(0.03, g), 320, 0.9);
}

function sfxSplit(c: AudioContext, t: number): void {
  const g = "weapon" as const;
  thud(c, t, 64, peak(0.032, g));
  noiseBurst(c, t, 0.08, peak(0.03, g), 420, 1.1);
  tone(c, t + 0.03, 98, peak(0.022, g), "sine", 0.004, 0.08);
}

function sfxPalm(c: AudioContext, t: number, heavy: boolean): void {
  const g = "weapon" as const;
  thud(c, t, heavy ? 68 : 92, peak(heavy ? 0.034 : 0.03, g));
  noiseBurst(c, t, heavy ? 0.06 : 0.045, peak(0.028, g), 360, 1);
  if (heavy) thud(c, t + 0.07, 78, peak(0.026, g));
}

function sfxHook(c: AudioContext, t: number): void {
  const g = "weapon" as const;
  whoosh(c, t, 0.13, peak(0.026, g), 260, 700);
  thud(c, t + 0.07, 86, peak(0.03, g));
}

function sfxWindPush(c: AudioContext, t: number, heavy: boolean): void {
  const g = "weapon" as const;
  whoosh(c, t, heavy ? 0.16 : 0.11, peak(0.028, g), 200, 780);
  thud(c, t + 0.05, heavy ? 66 : 88, peak(0.03, g));
}

// ═══════════════════════════════════════════
// 武器 · 暗器
// ═══════════════════════════════════════════

function sfxDart(c: AudioContext, t: number): void {
  const g = "weapon" as const;
  whoosh(c, t, 0.07, peak(0.026, g), 700, 2200);
  tone(c, t, 1480, peak(0.024, g), "sine", 0.002, 0.04);
  noiseBurst(c, t + 0.03, 0.04, peak(0.022, g), 2400, 2.5);
}

function sfxNeedle(c: AudioContext, t: number): void {
  const g = "weapon" as const;
  tone(c, t, 1760, peak(0.022, g), "sine", 0.002, 0.035);
  whoosh(c, t, 0.055, peak(0.024, g), 900, 2800);
}

function sfxShuriken(c: AudioContext, t: number): void {
  const g = "weapon" as const;
  whoosh(c, t, 0.08, peak(0.027, g), 600, 2000);
  noiseBurst(c, t + 0.02, 0.05, peak(0.024, g), 1800, 2);
  tone(c, t + 0.04, 990, peak(0.02, g), "triangle", 0.002, 0.04);
}

// ═══════════════════════════════════════════
// 防御 / 状态
// ═══════════════════════════════════════════

function sfxBlock(c: AudioContext, t: number): void {
  const g = "defense" as const;
  tone(c, t, 420, peak(0.03, g), "triangle", 0.003, 0.05);
  noiseBurst(c, t, 0.05, peak(0.028, g), 1000, 1.5);
  tone(c, t + 0.04, 280, peak(0.02, g), "sine", 0.004, 0.07);
}

function sfxParry(c: AudioContext, t: number): void {
  const g = "defense" as const;
  tone(c, t, 560, peak(0.028, g), "triangle", 0.002, 0.04);
  tone(c, t + 0.03, 380, peak(0.022, g), "sine", 0.003, 0.06);
  noiseBurst(c, t, 0.04, peak(0.024, g), 1400, 2);
}

function sfxWard(c: AudioContext, t: number): void {
  const g = "defense" as const;
  noiseBurst(c, t, 0.07, peak(0.026, g), 880, 1);
  tone(c, t, 196, peak(0.024, g), "triangle", 0.005, 0.09);
}

function sfxThorns(c: AudioContext, t: number): void {
  const g = "defense" as const;
  noiseBurst(c, t, 0.06, peak(0.026, g), 720, 1.2);
  thud(c, t, 92, peak(0.028, g));
}

function sfxQi(c: AudioContext, t: number, deep: boolean): void {
  const g = "status" as const;
  whoosh(c, t, deep ? 0.22 : 0.16, peak(0.024, g), 140, 420);
  tone(c, t + 0.04, deep ? 92 : 110, peak(0.026, g), "sine", 0.06, deep ? 0.22 : 0.16);
  if (deep) tone(c, t + 0.08, 138, peak(0.02, g), "sine", 0.05, 0.18);
}

function sfxMend(c: AudioContext, t: number): void {
  const g = "status" as const;
  noiseBurst(c, t, 0.07, peak(0.024, g), 760, 0.9);
  tone(c, t, 220, peak(0.026, g), "sine", 0.02, 0.14);
  tone(c, t + 0.05, 330, peak(0.02, g), "sine", 0.015, 0.1);
}

function sfxBleed(c: AudioContext, t: number): void {
  const g = "weapon" as const;
  noiseBurst(c, t, 0.08, peak(0.026, g), 520, 1.3);
  thud(c, t + 0.04, 68, peak(0.028, g));
}

function sfxExpose(c: AudioContext, t: number): void {
  const g = "weapon" as const;
  noiseBurst(c, t, 0.07, peak(0.024, g), 1100, 1.6);
  tone(c, t + 0.03, 240, peak(0.022, g), "triangle", 0.004, 0.07);
}

function sfxCombo(c: AudioContext, t: number): void {
  const g = "weapon" as const;
  thud(c, t, 100, peak(0.028, g));
  noiseBurst(c, t, 0.04, peak(0.024, g), 400, 1);
  thud(c, t + 0.07, 84, peak(0.026, g));
}

function sfxHaste(c: AudioContext, t: number): void {
  const g = "weapon" as const;
  whoosh(c, t, 0.1, peak(0.026, g), 320, 900);
  noiseBurst(c, t + 0.04, 0.06, peak(0.022, g), 260, 0.8);
}

function sfxStep(c: AudioContext, t: number): void {
  const g = "weapon" as const;
  noiseBurst(c, t, 0.07, peak(0.024, g), 220, 0.7);
}

function sfxClose(c: AudioContext, t: number): void {
  const g = "weapon" as const;
  whoosh(c, t, 0.1, peak(0.026, g), 280, 750);
  noiseBurst(c, t + 0.04, 0.06, peak(0.022, g), 240, 0.8);
}

// ═══════════════════════════════════════════
// 受击 / 死亡
// ═══════════════════════════════════════════

function sfxPlayerHit(c: AudioContext, t: number): void {
  const g = "hit" as const;
  thud(c, t, 58, peak(0.034, g));
  noiseBurst(c, t, 0.07, peak(0.028, g), 300, 0.9);
  whoosh(c, t + 0.02, 0.08, peak(0.02, g), 160, 300);
}

function sfxEnemyHit(c: AudioContext, t: number): void {
  const g = "hit" as const;
  thud(c, t, 72, peak(0.032, g));
  whoosh(c, t, 0.08, peak(0.026, g), 240, 500);
}

function sfxPlayerDeath(c: AudioContext, t: number): void {
  const g = "hit" as const;
  whoosh(c, t, 0.35, peak(0.028, g), 200, 80);
  tone(c, t, 110, peak(0.03, g), "sine", 0.08, 0.45);
  tone(c, t + 0.12, 72, peak(0.022, g), "sine", 0.1, 0.4);
}

function sfxEnemyDeath(c: AudioContext, t: number): void {
  const g = "hit" as const;
  thud(c, t, 54, peak(0.034, g));
  noiseBurst(c, t + 0.04, 0.12, peak(0.026, g), 380, 0.6);
  whoosh(c, t + 0.06, 0.15, peak(0.02, g), 280, 120);
}

function sfxFoe(c: AudioContext, t: number): void {
  sfxEnemyHit(c, t);
}

// ═══════════════════════════════════════════
// 交互 / 环境 / UI
// ═══════════════════════════════════════════

function sfxPickup(c: AudioContext, t: number): void {
  const g = "ui" as const;
  tone(c, t, 660, peak(0.026, g), "sine", 0.004, 0.06);
  tone(c, t + 0.05, 880, peak(0.022, g), "sine", 0.004, 0.08);
}

function sfxDoorOpen(c: AudioContext, t: number): void {
  const g = "env" as const;
  noiseBurst(c, t, 0.12, peak(0.028, g), 420, 0.8);
  tone(c, t + 0.04, 160, peak(0.024, g), "triangle", 0.01, 0.1);
  thud(c, t + 0.1, 90, peak(0.022, g));
}

function sfxDoorClose(c: AudioContext, t: number): void {
  const g = "env" as const;
  thud(c, t, 100, peak(0.03, g));
  noiseBurst(c, t, 0.08, peak(0.024, g), 380, 0.9);
}

function sfxMarket(c: AudioContext, t: number): void {
  const g = "env" as const;
  // 克制底噪 + 两声短促「叫卖」泛音
  noiseBurst(c, t, 0.45, peak(0.012, g), 280, 0.5);
  tone(c, t + 0.12, 392, peak(0.01, g), "sine", 0.02, 0.08);
  tone(c, t + 0.28, 440, peak(0.009, g), "sine", 0.02, 0.07);
}

function sfxWild(c: AudioContext, t: number): void {
  const g = "env" as const;
  whoosh(c, t, 0.5, peak(0.012, g), 120, 280);
  tone(c, t + 0.2, 1180, peak(0.008, g), "sine", 0.01, 0.05);
  tone(c, t + 0.35, 1320, peak(0.007, g), "sine", 0.01, 0.04);
}

function sfxCardPlay(c: AudioContext, t: number): void {
  const g = "ui" as const;
  noiseBurst(c, t, 0.05, peak(0.024, g), 900, 1.2);
  whoosh(c, t, 0.06, peak(0.02, g), 400, 700);
}

function sfxUpgrade(c: AudioContext, t: number): void {
  const g = "ui" as const;
  tone(c, t, 523, peak(0.028, g), "sine", 0.01, 0.12);
  tone(c, t + 0.08, 659, peak(0.026, g), "sine", 0.01, 0.14);
  tone(c, t + 0.16, 784, peak(0.022, g), "sine", 0.01, 0.18);
}

function sfxMenuClick(c: AudioContext, t: number): void {
  const g = "ui" as const;
  tone(c, t, 480, peak(0.024, g), "sine", 0.003, 0.04);
  noiseBurst(c, t, 0.03, peak(0.02, g), 1200, 1.5);
}

// ═══════════════════════════════════════════
// 调度
// ═══════════════════════════════════════════

const SYNTH: Record<SfxKind, (c: AudioContext, t: number) => void> = {
  palm: (c, t) => sfxPalm(c, t, false),
  saber: (c, t) => sfxHeavySaber(c, t, false),
  spear: (c, t) => sfxSpear(c, t),
  sword: (c, t) => sfxLightSword(c, t, true),
  hook: (c, t) => sfxHook(c, t),
  cut: (c, t) => sfxHeavySaber(c, t, false),
  drawcut: (c, t) => sfxDrawCut(c, t, false),
  thrust: (c, t) => sfxSpear(c, t),
  pierce: (c, t) => sfxLightSword(c, t, true),
  plant: (c, t) => sfxStaffPlant(c, t),
  elbow: (c, t) => sfxElbow(c, t),
  split: (c, t) => sfxSplit(c, t),
  dart: (c, t) => sfxDart(c, t),
  needle: (c, t) => sfxNeedle(c, t),
  shuriken: (c, t) => sfxShuriken(c, t),
  ward: (c, t) => sfxWard(c, t),
  block: (c, t) => sfxBlock(c, t),
  parry: (c, t) => sfxParry(c, t),
  thorns: (c, t) => sfxThorns(c, t),
  mend: (c, t) => sfxMend(c, t),
  qi: (c, t) => sfxQi(c, t, false),
  inbreath: (c, t) => sfxQi(c, t, true),
  charge: (c, t) => sfxQi(c, t, false),
  wind: (c, t) => sfxWindPush(c, t, false),
  bleed: (c, t) => sfxBleed(c, t),
  expose: (c, t) => sfxExpose(c, t),
  combo: (c, t) => sfxCombo(c, t),
  haste: (c, t) => sfxHaste(c, t),
  step: (c, t) => sfxStep(c, t),
  close: (c, t) => sfxClose(c, t),
  foe: (c, t) => sfxFoe(c, t),
  playerHit: (c, t) => sfxPlayerHit(c, t),
  enemyHit: (c, t) => sfxEnemyHit(c, t),
  playerDeath: (c, t) => sfxPlayerDeath(c, t),
  enemyDeath: (c, t) => sfxEnemyDeath(c, t),
  pickup: (c, t) => sfxPickup(c, t),
  doorOpen: (c, t) => sfxDoorOpen(c, t),
  doorClose: (c, t) => sfxDoorClose(c, t),
  market: (c, t) => sfxMarket(c, t),
  wild: (c, t) => sfxWild(c, t),
  cardPlay: (c, t) => sfxCardPlay(c, t),
  upgrade: (c, t) => sfxUpgrade(c, t),
  menuClick: (c, t) => sfxMenuClick(c, t),
};

export function playSfx(kind: SfxKind): void {
  if (!ear.sfx) return;
  const c = audio();
  if (!c) return;
  const fn = SYNTH[kind];
  if (!fn) return;
  fn(c, c.currentTime);
}

/** 出牌音效：按卡牌族选武器音色；升级牌（*2）加一层细节。 */
export function playCardSfx(cardId: string): void {
  if (!ear.sfx) return;
  const c = audio();
  if (!c) return;
  const t = c.currentTime;
  const id = cardId.replace(/2$/, "");
  const up = cardId.endsWith("2");

  if (id === "strike" || id === "twinpalm" || id === "follow" || id === "layer" || id === "finisher" || id === "midStrike") {
    sfxPalm(c, t, up);
    playSoftCardPaper(c, t);
    return;
  }
  if (id === "cut" || id === "saberBleed" || id === "burySlash" || id === "rift") {
    sfxHeavySaber(c, t, up || id === "burySlash");
    playSoftCardPaper(c, t);
    return;
  }
  if (id === "drawcut") {
    sfxDrawCut(c, t, up);
    playSoftCardPaper(c, t);
    return;
  }
  if (id === "thrust" || id === "spearLock") {
    sfxSpear(c, t);
    if (up) noiseBurst(c, t + 0.08, 0.05, peak(0.022, "weapon"), 1200, 1.5);
    playSoftCardPaper(c, t);
    return;
  }
  if (id === "pierce" || id === "swordMute" || id === "lateMute") {
    sfxLightSword(c, t, true);
    playSoftCardPaper(c, t);
    return;
  }
  if (id === "plant" || id === "staffBind") {
    sfxStaffPlant(c, t);
    playSoftCardPaper(c, t);
    return;
  }
  if (id === "elbow") {
    sfxElbow(c, t);
    playSoftCardPaper(c, t);
    return;
  }
  if (id === "split") {
    sfxSplit(c, t);
    playSoftCardPaper(c, t);
    return;
  }
  if (id === "hookpull" || id === "hookDisarm") {
    sfxHook(c, t);
    playSoftCardPaper(c, t);
    return;
  }
  if (id === "push" || id === "sweep" || id === "midPush" || id === "longPush") {
    sfxWindPush(c, t, up);
    playSoftCardPaper(c, t);
    return;
  }
  if (id === "defend" || id === "backpalm" || id === "brace" || id === "midGuard" || id === "lateWard" || id === "buryWard") {
    sfxBlock(c, t);
    playSoftCardPaper(c, t);
    return;
  }
  if (id === "thorns" || id === "ironform" || id === "ironPulse") {
    sfxThorns(c, t);
    playSoftCardPaper(c, t);
    return;
  }
  if (id === "mend" || id === "salve" || id === "suture" || id === "bindwound") {
    sfxMend(c, t);
    playSoftCardPaper(c, t);
    return;
  }
  if (id === "charge" || id === "gather" || id === "qiPulse" || id === "qiFlood" || id === "tide" || id === "lateTide") {
    sfxQi(c, t, up || id === "qiFlood");
    playSoftCardPaper(c, t);
    return;
  }
  if (id === "inbreath") {
    sfxQi(c, t, true);
    playSoftCardPaper(c, t);
    return;
  }
  if (id === "advance" || id === "sidestep") {
    sfxStep(c, t);
    if (up) sfxStep(c, t + 0.08);
    playSoftCardPaper(c, t);
    return;
  }
  if (id === "close" || id === "haste") {
    if (id === "haste") sfxHaste(c, t);
    else sfxClose(c, t);
    playSoftCardPaper(c, t);
    return;
  }
  if (id === "bleedcut" || id === "buryBleed" || id === "lateBleed" || id === "cauterize") {
    sfxBleed(c, t);
    playSoftCardPaper(c, t);
    return;
  }
  if (id === "expose" || id === "marking") {
    sfxExpose(c, t);
    playSoftCardPaper(c, t);
    return;
  }
  if (id === "combo" || id === "chain" || id === "setup") {
    sfxCombo(c, t);
    playSoftCardPaper(c, t);
    return;
  }
  if (id === "handCut" || id === "lateHand" || id === "venomFog") {
    sfxDart(c, t);
    playSoftCardPaper(c, t);
    return;
  }
  if (id === "pouchSeal" || id === "latePouch" || id === "skillLock") {
    sfxNeedle(c, t);
    playSoftCardPaper(c, t);
    return;
  }
  // 默认：轻掌 + 翻牌纸声
  sfxPalm(c, t, false);
  playSoftCardPaper(c, t);
}

function playSoftCardPaper(c: AudioContext, t: number): void {
  noiseBurst(c, t, 0.04, peak(0.018, "ui"), 1000, 1.1);
}

export function sfxGroupOf(kind: SfxKind): SfxGroup {
  return GROUP_OF[kind];
}

// ═══════════════════════════════════════════
// 场上弦乐（保留三场景 cue，克制音量）
// ═══════════════════════════════════════════

function stopMusic(): void {
  if (musicTimer) {
    window.clearInterval(musicTimer);
    musicTimer = 0;
  }
  for (const n of musicNodes) {
    try {
      (n as OscillatorNode).stop?.();
    } catch {
      /* already stopped */
    }
    n.disconnect();
  }
  musicNodes = [];
  if (musicGain) {
    musicGain.disconnect();
    musicGain = null;
  }
}

function drone(c: AudioContext, freq: number, type: OscillatorType, dest: AudioNode): OscillatorNode {
  const o = c.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  o.connect(dest);
  o.start();
  musicNodes.push(o);
  return o;
}

export function cueMusic(next: "title" | "map" | "combat"): void {
  scene = next;
  if (!ear.music) {
    stopMusic();
    return;
  }
  const c = audio();
  if (!c) return;
  stopMusic();
  musicGain = c.createGain();
  musicGain.gain.value = next === "combat" ? 0.032 : 0.026;
  musicGain.connect(c.destination);
  if (next === "combat") {
    drone(c, 98, "sine", musicGain);
    drone(c, 146.8, "triangle", musicGain);
  } else if (next === "title") {
    drone(c, 130.8, "sine", musicGain);
    drone(c, 196, "sine", musicGain);
  } else {
    drone(c, 110, "sine", musicGain);
    drone(c, 164.8, "sine", musicGain);
  }
  const pent = next === "combat" ? [392, 440, 349, 294] : [330, 392, 440, 494];
  let i = 0;
  const tick = (): void => {
    if (!ear.music || !ctx || !musicGain) return;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = pent[i % pent.length];
    const g = ctx.createGain();
    g.gain.value = 0.011;
    o.connect(g);
    g.connect(musicGain);
    const now = ctx.currentTime;
    o.start(now);
    o.stop(now + 0.4);
    musicNodes.push(o, g);
    i += 1;
  };
  tick();
  musicTimer = window.setInterval(tick, next === "combat" ? 640 : 900);
}
