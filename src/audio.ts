const KEY = "openhand-ear";

export interface Ear {
  sfx: boolean;
  music: boolean;
}

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

function env(c: AudioContext, start: number, peak: number, attack: number, release: number): GainNode {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(peak, start + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, start + attack + release);
  return g;
}

function noise(c: AudioContext, dur: number): AudioBufferSourceNode {
  const n = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, n, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  return src;
}

export type SfxKind =
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
  | "foe";

export function playSfx(kind: SfxKind): void {
  if (!ear.sfx) return;
  const c = audio();
  if (!c) return;
  const t = c.currentTime;
  if (kind === "mend") wood(c, t, 0.06);
  else if (kind === "ward") wood(c, t);
  else if (kind === "qi") breath(c, t);
  else if (kind === "haste") {
    whoosh(c, t, 0.1);
    dust(c, t + 0.04);
  } else if (kind === "step") dust(c, t);
  else if (kind === "close") {
    whoosh(c, t, 0.1);
    dust(c, t + 0.04);
  } else if (kind === "wind") {
    whoosh(c, t, 0.14);
    thud(c, t + 0.05, 86);
  } else if (kind === "plant") {
    thud(c, t, 78);
    noiseBurst(c, t, 0.08, 0.045, 220);
  } else if (kind === "split") crack(c, t);
  else if (kind === "elbow") thud(c, t, 58);
  else if (kind === "hook") {
    whoosh(c, t, 0.12);
    thud(c, t + 0.07, 90);
  } else if (kind === "spear") {
    whoosh(c, t, 0.07);
    scrape(c, t + 0.02);
  } else if (kind === "sword") {
    scrape(c, t);
    thud(c, t + 0.03, 100);
  } else if (kind === "saber") {
    whoosh(c, t, 0.09);
    clang(c, t + 0.03);
  } else if (kind === "bleed") {
    scrape(c, t);
    thud(c, t + 0.04, 70);
  } else if (kind === "expose") {
    scrape(c, t);
    wood(c, t + 0.03, 0.04);
  } else if (kind === "thorns") {
    wood(c, t, 0.055);
    thud(c, t, 96);
  } else if (kind === "combo") {
    slap(c, t, 100);
    slap(c, t + 0.07, 86);
  } else if (kind === "foe") {
    thud(c, t, 64);
    whoosh(c, t, 0.08);
  } else {
    slap(c, t);
  }
}

export function playCardSfx(cardId: string): void {
  if (!ear.sfx) return;
  const c = audio();
  if (!c) return;
  const t = c.currentTime;
  const id = cardId.replace(/2$/, "");
  const up = cardId.endsWith("2");
  if (id === "strike") {
    slap(c, t, up ? 72 : 96);
    if (up) slap(c, t + 0.07, 82);
  } else if (id === "defend") wood(c, t, up ? 0.07 : 0.05);
  else if (id === "push") {
    whoosh(c, t, up ? 0.16 : 0.11);
    thud(c, t + 0.05, up ? 68 : 90);
  } else if (id === "charge") breath(c, t);
  else if (id === "advance") {
    dust(c, t);
    if (up) dust(c, t + 0.08);
  } else if (id === "mend") wood(c, t, up ? 0.07 : 0.05);
  else if (id === "cut") {
    whoosh(c, t, 0.08);
    clang(c, t + 0.03);
  } else if (id === "drawcut") {
    scrape(c, t);
    clang(c, t + 0.06);
  } else if (id === "thrust") {
    whoosh(c, t, 0.07);
    scrape(c, t + 0.02);
  } else if (id === "pierce") {
    scrape(c, t);
    thud(c, t + 0.03, 100);
  } else if (id === "elbow") thud(c, t, 56);
  else if (id === "hookpull") {
    whoosh(c, t, 0.13);
    thud(c, t + 0.08, 88);
  } else if (id === "backpalm") {
    noiseBurst(c, t, 0.05, 0.04, 380);
    thud(c, t, 120);
  } else if (id === "split") crack(c, t);
  else if (id === "close") {
    whoosh(c, t, 0.1);
    dust(c, t + 0.05);
  } else if (id === "sweep") {
    whoosh(c, t, 0.16);
    thud(c, t + 0.06, 80);
  } else if (id === "plant") {
    thud(c, t, 78);
    noiseBurst(c, t, 0.08, 0.04, 220);
  } else if (id === "bleedcut") {
    scrape(c, t);
    thud(c, t + 0.04, 70);
  } else if (id === "expose") {
    scrape(c, t);
    wood(c, t + 0.03, 0.04);
  } else if (id === "thorns") {
    wood(c, t, 0.055);
    thud(c, t, 96);
  } else if (id === "inbreath") breath(c, t);
  else if (id === "combo") {
    slap(c, t, 100);
    slap(c, t + 0.07, 84);
  } else if (id === "haste") {
    whoosh(c, t, 0.1);
    dust(c, t + 0.04);
  } else slap(c, t);
}

function tone(
  c: AudioContext,
  start: number,
  freq: number,
  peak: number,
  type: OscillatorType,
  attack: number,
  release: number,
): void {
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  const g = env(c, start, peak, attack, release);
  o.connect(g);
  g.connect(c.destination);
  o.start(start);
  o.stop(start + attack + release + 0.02);
}

function noiseBurst(c: AudioContext, start: number, dur: number, peak: number, cutoff: number): void {
  const src = noise(c, dur);
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = cutoff;
  const g = env(c, start, peak, 0.008, dur);
  src.connect(f);
  f.connect(g);
  g.connect(c.destination);
  src.start(start);
  src.stop(start + dur + 0.02);
}

function whoosh(c: AudioContext, start: number, dur: number): void {
  const src = noise(c, dur);
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.setValueAtTime(280, start);
  f.frequency.exponentialRampToValueAtTime(900, start + dur * 0.35);
  f.frequency.exponentialRampToValueAtTime(220, start + dur);
  const g = env(c, start, 0.06, 0.02, dur);
  src.connect(f);
  f.connect(g);
  g.connect(c.destination);
  src.start(start);
  src.stop(start + dur + 0.02);
}

function thud(c: AudioContext, start: number, freq: number): void {
  const o = c.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(freq, start);
  o.frequency.exponentialRampToValueAtTime(40, start + 0.12);
  const g = env(c, start, 0.16, 0.004, 0.14);
  o.connect(g);
  g.connect(c.destination);
  o.start(start);
  o.stop(start + 0.18);
}

function slap(c: AudioContext, start: number, freq = 92): void {
  thud(c, start, freq);
  noiseBurst(c, start, 0.045, 0.06, 380);
}

function wood(c: AudioContext, start: number, peak = 0.05): void {
  noiseBurst(c, start, 0.06, peak, 900);
  tone(c, start, 196, 0.045, "triangle", 0.004, 0.07);
}

function clang(c: AudioContext, start: number): void {
  tone(c, start, 520, 0.045, "triangle", 0.003, 0.07);
  noiseBurst(c, start, 0.05, 0.045, 1100);
}

function dust(c: AudioContext, start: number): void {
  noiseBurst(c, start, 0.07, 0.04, 240);
}

function crack(c: AudioContext, start: number): void {
  thud(c, start, 68);
  noiseBurst(c, start, 0.07, 0.05, 420);
}

function scrape(c: AudioContext, start: number): void {
  const src = noise(c, 0.1);
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.setValueAtTime(480, start);
  f.frequency.exponentialRampToValueAtTime(1400, start + 0.08);
  const g = env(c, start, 0.055, 0.01, 0.09);
  src.connect(f);
  f.connect(g);
  g.connect(c.destination);
  src.start(start);
  src.stop(start + 0.12);
}

function breath(c: AudioContext, start: number): void {
  whoosh(c, start, 0.18);
  tone(c, start + 0.03, 110, 0.04, "sine", 0.05, 0.16);
}

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
  musicGain.gain.value = next === "combat" ? 0.035 : 0.028;
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
    g.gain.value = 0.012;
    o.connect(g);
    g.connect(musicGain);
    const now = ctx.currentTime;
    o.start(now);
    o.stop(now + 0.42);
    musicNodes.push(o, g);
    i += 1;
  };
  tick();
  musicTimer = window.setInterval(tick, next === "combat" ? 640 : 900);
}
