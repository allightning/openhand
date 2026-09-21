import { artUrl } from "../art/artUrl";

/**
 * 战斗音效 / BGM 管理。
 * 素材：public/art/audio/（见 docs/combat/ART_PIPELINE.md）。
 * 版权来源只写本注释 / handoff，局内不堆说明。曲库为仓库内委托/自制文件，非抓取流媒体。
 *
 * 铁律：同一时间只播一首「音乐」（BGM 或胜负短句）。切曲先停再播，不做双文件交叉叠播。
 * SFX 是短一次性，可与音乐并行，也可彼此叠（拟声点，不是第二首 BGM）。
 *
 * 音量 0-100 持久化到 localStorage；Audio 在 node 测试环境不存在时全部降级为 no-op。
 *
 * 衔接策略：战斗曲首进跳过前奏；同档再进从离开点 +RESUME_SKIP；
 * 进战淡入短、回营淡入长。胜负短句：先杀 BGM，短句结束（或离开结算屏 stopSting）再接营地曲。
 */

export type SfxId = "swing" | "clash" | "page" | "drop";

export const SFX_PATH: Record<SfxId, string> = {
  swing: "art/audio/sfx/swing.mp3",
  clash: "art/audio/sfx/clash.wav",
  page: "art/audio/sfx/page.wav",
  drop: "art/audio/sfx/drop.mp3",
};

/** 循环 BGM 曲目。 */
export type BgmId =
  | "hall"
  | "hall_b"
  | "hall_c"
  | "hall_voice"
  | "break"
  | "break_voice"
  | "jianghu_normal"
  | "jianghu_elite"
  | "jianghu_boss"
  | "jianghu_gym"
  | "jianghu_elite_gym"
  | "jianghu_voice"
  | "shaolin_normal"
  | "shaolin_elite"
  | "shaolin_boss"
  | "shaolin_gym"
  | "shaolin_elite_gym"
  | "shaolin_voice"
  | "court_normal"
  | "court_elite"
  | "court_boss"
  | "court_gym"
  | "court_lite"
  | "court_voice";

export type StingId = "win" | "lose";

export type GauntletBgmPath = "shaolin" | "bandit" | "court";
export type CombatBgmTier = "normal" | "elite" | "boss";

export const BGM_PATHS: Record<BgmId, string> = {
  hall: "art/audio/bgm/hall_a.mp3",
  hall_b: "art/audio/bgm/hall_b.mp3",
  hall_c: "art/audio/bgm/hall_c.mp3",
  hall_voice: "art/audio/bgm/hall_voice.mp3",
  break: "art/audio/bgm/break_campaign.mp3",
  break_voice: "art/audio/bgm/break_voice.mp3",
  jianghu_normal: "art/audio/bgm/jianghu_normal.mp3",
  jianghu_elite: "art/audio/bgm/jianghu_elite.mp3",
  jianghu_boss: "art/audio/bgm/jianghu_boss.mp3",
  jianghu_gym: "art/audio/bgm/jianghu_gym.mp3",
  jianghu_elite_gym: "art/audio/bgm/jianghu_elite_gym.mp3",
  jianghu_voice: "art/audio/bgm/jianghu_voice.mp3",
  shaolin_normal: "art/audio/bgm/shaolin_normal.mp3",
  shaolin_elite: "art/audio/bgm/shaolin_elite.mp3",
  shaolin_boss: "art/audio/bgm/shaolin_boss.mp3",
  shaolin_gym: "art/audio/bgm/shaolin_gym.mp3",
  shaolin_elite_gym: "art/audio/bgm/shaolin_elite_gym.mp3",
  shaolin_voice: "art/audio/bgm/shaolin_voice.mp3",
  court_normal: "art/audio/bgm/court_normal.mp3",
  court_elite: "art/audio/bgm/court_elite.mp3",
  court_boss: "art/audio/bgm/court_boss.mp3",
  court_gym: "art/audio/bgm/court_gym.mp3",
  court_lite: "art/audio/bgm/court_lite.mp3",
  court_voice: "art/audio/bgm/court_voice.mp3",
};

/** 普/精档 A 播完接 B，再回 A。Boss / 门厅单曲循环。 */
export const BGM_CHAIN: Partial<Record<BgmId, string[]>> = {
  jianghu_normal: ["art/audio/bgm/jianghu_normal.mp3", "art/audio/bgm/jianghu_normal_b.mp3"],
  jianghu_elite: ["art/audio/bgm/jianghu_elite.mp3", "art/audio/bgm/jianghu_elite_b.mp3"],
  shaolin_normal: ["art/audio/bgm/shaolin_normal.mp3", "art/audio/bgm/shaolin_normal_b.mp3"],
  shaolin_elite: ["art/audio/bgm/shaolin_elite.mp3", "art/audio/bgm/shaolin_elite_b.mp3"],
  court_normal: ["art/audio/bgm/court_normal.mp3", "art/audio/bgm/court_normal_b.mp3"],
  court_elite: ["art/audio/bgm/court_elite.mp3", "art/audio/bgm/court_elite_b.mp3"],
};

export const STING_PATHS: Record<StingId, string> = {
  win: "art/audio/bgm/sting_win.mp3",
  lose: "art/audio/bgm/sting_lose.mp3",
};

/** 设置歌单：原局内曲 + 截图馆曲都要；只去掉门厅甲=丁重复。 */
export const HALL_PLAYLIST: { id: BgmId; label: string }[] = [
  { id: "hall", label: "门厅 · 甲" },
  { id: "hall_b", label: "门厅 · 乙" },
  { id: "hall_c", label: "门厅 · 丙" },
  { id: "hall_voice", label: "门厅 · 和声" },
  { id: "jianghu_normal", label: "江湖 · 普" },
  { id: "jianghu_elite", label: "江湖 · 精" },
  { id: "jianghu_boss", label: "江湖 · 座" },
  { id: "jianghu_gym", label: "江湖 · 普馆" },
  { id: "jianghu_elite_gym", label: "江湖 · 精馆" },
  { id: "jianghu_voice", label: "江湖 · 座·和声" },
  { id: "shaolin_normal", label: "少林 · 普" },
  { id: "shaolin_elite", label: "少林 · 精" },
  { id: "shaolin_boss", label: "少林 · 座" },
  { id: "shaolin_gym", label: "少林 · 普馆" },
  { id: "shaolin_elite_gym", label: "少林 · 精馆" },
  { id: "shaolin_voice", label: "少林 · 座·和声" },
  { id: "court_normal", label: "朝廷 · 普" },
  { id: "court_elite", label: "朝廷 · 精" },
  { id: "court_boss", label: "朝廷 · 座" },
  { id: "court_gym", label: "朝廷 · 普馆" },
  { id: "court_lite", label: "朝廷 · 精简" },
  { id: "court_voice", label: "朝廷 · 座·和声" },
  { id: "break", label: "登门" },
  { id: "break_voice", label: "登门 · 和声" },
];

export const BGM_LABEL: Partial<Record<BgmId, string>> = Object.fromEntries(
  HALL_PLAYLIST.map((x) => [x.id, x.label]),
);

/** 战斗曲默认跳过前奏秒数（短局 30s 内要听到主节奏）。门厅为 0。 */
export const BGM_COMBAT_SEEK_SEC: Partial<Record<BgmId, number>> = {
  break: 14,
  jianghu_normal: 18,
  jianghu_elite: 16,
  jianghu_boss: 20,
  shaolin_normal: 18,
  shaolin_elite: 16,
  shaolin_boss: 22,
  court_normal: 18,
  court_elite: 16,
  court_boss: 20,
};

/** 营地/遭遇相对用户 BGM 音量的倍率（略降，让操作更清）。 */
export const BGM_CAMP_VOL_SCALE = 0.72;
/** @deprecated 用进战/回营分档；保留兼容旧调用。 */
export const BGM_FADE_MS = 1000;
/** 进入战斗：短促压上 */
export const BGM_FADE_IN_COMBAT_MS = 1000;
/** 出战斗回门厅/营地：轻声拉长 */
export const BGM_FADE_TO_CAMP_MS = 1800;
/** 馆间（战斗↔营地）同曲也交叉淡入淡出 */
export const BGM_FADE_BETWEEN_HALL_MS = 2000;
/** 同档再进战斗：从离开进度再跳过这么多秒，避免复读同一段 */
export const BGM_RESUME_SKIP_SEC = 10;

/** @deprecated 兼容旧测试；默认门厅 */
export const BGM_PATH = BGM_PATHS.hall;

const SFX_KEY = "openhand-lab-sfx-vol";
const BGM_KEY = "openhand-lab-bgm-vol";
const HALL_PICK_KEY = "openhand-lab-hall-pick";
const BGM_MODE_KEY = "openhand-lab-bgm-mode";
const DEFAULT_SFX = 80;
const DEFAULT_BGM = 55;

/** v2 演出事件 → 音效。 */
export const FX_SFX: Record<string, SfxId> = {
  break: "clash",
  counter: "clash",
  wall: "clash",
  graze: "clash",
  hit: "clash",
  miss: "drop",
  skip: "drop",
  kill: "swing",
  burst: "swing",
  resonance: "drop",
};

export type BgmPlayMode = "single" | "random" | "sequence";

export type EnsureBgmOpts = {
  /** 相对用户设定的音量倍率（营地 0.72，战斗 1） */
  volScale?: number;
  /** 强制跳到某秒；战斗默认用 BGM_COMBAT_SEEK_SEC；门厅 0 */
  seekSec?: number | null;
  /** 淡入淡出时长 ms；0=硬切 */
  fadeMs?: number;
  /** 切场景标记。同曲仍不重开（铁律不叠两首，也不拿它做双文件交叉淡入）。 */
  forceCrossfade?: boolean;
  /** true：同曲也重开 */
  forceRestart?: boolean;
};

function clampVol(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function readVol(key: string, fallback: number): number {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    if (raw == null) return fallback;
    const n = Number(raw);
    return Number.isFinite(n) ? clampVol(n) : fallback;
  } catch {
    return fallback;
  }
}

function writeVol(key: string, v: number): void {
  try {
    globalThis.localStorage?.setItem(key, String(clampVol(v)));
  } catch {
    /* node / 隐私模式 */
  }
}

export function getSfxVolume(): number {
  return readVol(SFX_KEY, DEFAULT_SFX);
}

export function getBgmVolume(): number {
  return readVol(BGM_KEY, DEFAULT_BGM);
}

let bgm: HTMLAudioElement | null = null;
let bgmWanted = false;
let bgmTrack: BgmId = "hall";
let bgmVolScale = 1;
let fadeTimer: ReturnType<typeof setInterval> | null = null;
const fadingOut: HTMLAudioElement[] = [];
const liveStings: HTMLAudioElement[] = [];
/** 同档连战：回营地再进战斗时从离开处续播，短局拼出完整听感。 */
let combatResume: { track: BgmId; t: number } | null = null;
/** 门厅曲目在 HALL_PLAYLIST 中的下标（持久化）。 */
let hallPickIndex = 0;
let playMode: BgmPlayMode = "sequence";
let userPaused = false;
let advancingPlaylist = false;
/** 换曲时先把旧曲杀干净再起新曲，避免门厅+战斗叠播。 */
let bgmHandoff: {
  track: BgmId;
  volScale: number;
  seekSec: number;
  fadeInMs: number;
  resumeJump: boolean;
} | null = null;
/** 短句占用音乐席时，ensureBgm 只记账，等短句结束再起。 */
let pendingAfterSting: {
  track: BgmId;
  volScale: number;
  seekSec: number;
  fadeMs: number;
  forceRestart: boolean;
  resumeJump: boolean;
} | null = null;

function readPlayMode(): BgmPlayMode {
  try {
    const v = globalThis.localStorage?.getItem(BGM_MODE_KEY);
    if (v === "single" || v === "random" || v === "sequence") return v;
  } catch {
    /* ignore */
  }
  return "sequence";
}

export function getBgmPlayMode(): BgmPlayMode {
  return playMode;
}

export function setBgmPlayMode(mode: BgmPlayMode): void {
  playMode = mode;
  try {
    globalThis.localStorage?.setItem(BGM_MODE_KEY, mode);
  } catch {
    /* ignore */
  }
  if (bgm) attachBgmChain(bgm, bgmTrack);
}

function nextPlaylistIndex(from: number): number {
  const n = HALL_PLAYLIST.length;
  if (n <= 0) return 0;
  if (playMode === "random" && n > 1) {
    let i = from;
    let guard = 0;
    while (i === from && guard < 8) {
      i = Math.floor(Math.random() * n);
      guard += 1;
    }
    return i;
  }
  return (from + 1) % n;
}

playMode = readPlayMode();

function readHallPick(): number {
  try {
    const raw = globalThis.localStorage?.getItem(HALL_PICK_KEY);
    const n = raw == null ? 0 : Number(raw);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(HALL_PLAYLIST.length - 1, Math.round(n)));
  } catch {
    return 0;
  }
}

function writeHallPick(i: number): void {
  hallPickIndex = Math.max(0, Math.min(HALL_PLAYLIST.length - 1, i));
  try {
    globalThis.localStorage?.setItem(HALL_PICK_KEY, String(hallPickIndex));
  } catch {
    /* ignore */
  }
}

hallPickIndex = readHallPick();

/** 门厅/选线当前选用的曲。 */
export function preferredHallBgm(): BgmId {
  return HALL_PLAYLIST[hallPickIndex]?.id ?? "hall";
}

export function hallPlaylistIndex(): number {
  return hallPickIndex;
}

export function hallTrackLabel(id: BgmId = preferredHallBgm()): string {
  return BGM_LABEL[id] ?? HALL_PLAYLIST.find((x) => x.id === id)?.label ?? id;
}

function formatClock(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const s = Math.floor(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r < 10 ? "0" : ""}${r}`;
}

/** 当前播放进度（设置面板进度条用）。 */
export function getBgmPlayback(): {
  track: BgmId;
  label: string;
  current: number;
  duration: number;
  playing: boolean;
  currentText: string;
  durationText: string;
  hallIndex: number;
  hallCount: number;
  paused: boolean;
  playMode: BgmPlayMode;
} {
  const current = bgm && Number.isFinite(bgm.currentTime) ? bgm.currentTime : 0;
  const duration = bgm && Number.isFinite(bgm.duration) ? bgm.duration : 0;
  return {
    track: bgmTrack,
    label: hallTrackLabel(bgmTrack),
    current,
    duration,
    playing: bgmPlaying(),
    paused: userPaused,
    playMode,
    currentText: formatClock(current),
    durationText: formatClock(duration),
    hallIndex: hallPickIndex,
    hallCount: HALL_PLAYLIST.length,
  };
}

/** 拖动进度条：跳到指定秒。 */
export function seekBgm(sec: number): void {
  if (!bgm) return;
  try {
    const d = bgm.duration;
    let t = sec;
    if (Number.isFinite(d) && d > 0) t = Math.max(0, Math.min(d - 0.05, sec));
    else t = Math.max(0, sec);
    bgm.currentTime = t;
  } catch {
    /* ignore */
  }
}

/**
 * 门厅上下曲。试听时立刻切歌；写入偏好，回门厅时沿用。
 * @returns 当前选中项
 */
export function selectHallTrack(index: number, opts: { volScale?: number; fadeMs?: number } = {}): {
  id: BgmId;
  label: string;
  index: number;
} {
  writeHallPick(index);
  const pick = HALL_PLAYLIST[hallPickIndex]!;
  userPaused = false;
  ensureBgm(pick.id, {
    volScale: opts.volScale ?? BGM_CAMP_VOL_SCALE,
    seekSec: 0,
    fadeMs: opts.fadeMs ?? 400,
    forceRestart: true,
  });
  return { id: pick.id, label: pick.label, index: hallPickIndex };
}

export function pauseBgm(): void {
  userPaused = true;
  bgmWanted = false;
  try {
    bgm?.pause();
  } catch {
    /* ignore */
  }
}

export function resumeBgm(): void {
  userPaused = false;
  bgmWanted = true;
  if (!bgm) {
    ensureBgm(preferredHallBgm(), { volScale: BGM_CAMP_VOL_SCALE, fadeMs: 400 });
    return;
  }
  void bgm.play().catch(() => {});
}

export function toggleBgmPause(): boolean {
  if (userPaused || !bgmPlaying()) resumeBgm();
  else pauseBgm();
  return !userPaused;
}

export function cycleHallTrack(dir: 1 | -1, opts: { volScale?: number; fadeMs?: number } = {}): {
  id: BgmId;
  label: string;
  index: number;
} {
  const n = HALL_PLAYLIST.length;
  return selectHallTrack((hallPickIndex + dir + n) % n, opts);
}

function hasAudio(): boolean {
  return typeof Audio !== "undefined";
}

function clearFadeTimer(): void {
  if (fadeTimer != null) {
    clearInterval(fadeTimer);
    fadeTimer = null;
  }
}

/** 换曲/重入前硬停所有淡出残骸，避免多首 loop 叠在一起。 */
function reapFadingOut(): void {
  while (fadingOut.length) killAudioEl(fadingOut.pop() ?? null);
}

function audioElAlive(el: HTMLAudioElement | null | undefined): boolean {
  if (!el || el.paused) return false;
  const attr = typeof el.getAttribute === "function" ? el.getAttribute("src") : "";
  const src = attr || el.src || "";
  return src.length > 0;
}

/** 正在出声的音乐路数（BGM + 淡出残骸 + 短句）。铁律：≤1。SFX 不计。 */
export function debugMusicLane(): {
  bgmOn: boolean;
  stingCount: number;
  fadingCount: number;
  musicSources: number;
  pendingAfterSting: boolean;
  track: BgmId;
} {
  const bgmOn = audioElAlive(bgm);
  const stingCount = liveStings.filter((s) => audioElAlive(s)).length;
  const fadingCount = fadingOut.filter((s) => audioElAlive(s) && s.volume > 0.01).length;
  return {
    bgmOn,
    stingCount,
    fadingCount,
    musicSources: (bgmOn ? 1 : 0) + stingCount + fadingCount,
    pendingAfterSting: pendingAfterSting != null,
    track: bgmTrack,
  };
}

function beginTrack(track: BgmId, seekSec: number, volScale: number, fadeInMs: number, resumeJump: boolean): void {
  if (liveStings.length) return;
  reapFadingOut();
  if (bgm) {
    killAudioEl(bgm);
    bgm = null;
  }
  const gain = targetGain(volScale);
  const next = new Audio(artUrl(BGM_PATHS[track]));
  next.dataset.track = track;
  attachBgmChain(next, track);
  next.volume = 0;
  applySeek(next, seekSec);
  bgm = next;
  if (resumeJump) combatResume = null;
  void next.play().catch(() => {
    /* 等 unlockAudio */
  });
  fadeVolumes([{ el: next, to: gain }], fadeInMs);
}

function killAudioEl(el: HTMLAudioElement | null): void {
  if (!el) return;
  try {
    el.onended = null;
    el.pause();
    el.loop = false;
    el.removeAttribute("src");
    el.src = "";
    el.load();
  } catch {
    /* ignore */
  }
}

function targetGain(scale: number): number {
  return Math.min(1, Math.max(0, (getBgmVolume() / 100) * scale));
}

function defaultSeekFor(track: BgmId): number {
  return BGM_COMBAT_SEEK_SEC[track] ?? 0;
}

function applySeek(el: HTMLAudioElement, seekSec: number): void {
  if (seekSec < 0) return;
  const go = (): void => {
    try {
      const d = el.duration;
      if (!Number.isFinite(d) || d <= 4) return;
      let t = seekSec % d;
      if (t < 0) t += d;
      // 贴尾则落到默认入口，避免刚 loop 就掐掉
      if (t > d - 3) t = Math.min(defaultSeekFor((el.dataset.track as BgmId) || "hall"), d * 0.25);
      el.currentTime = t;
    } catch {
      /* ignore */
    }
  };
  if (el.readyState >= 1) go();
  else el.addEventListener("loadedmetadata", go, { once: true });
}

function fadeVolumes(steps: { el: HTMLAudioElement; to: number }[], ms: number, onDone?: () => void): void {
  const keep = new Set(steps.map((s) => s.el));
  for (let i = fadingOut.length - 1; i >= 0; i--) {
    const el = fadingOut[i]!;
    if (!keep.has(el)) {
      fadingOut.splice(i, 1);
      killAudioEl(el);
    }
  }
  clearFadeTimer();
  if (ms <= 0 || !hasAudio()) {
    for (const s of steps) s.el.volume = Math.min(1, Math.max(0, s.to));
    onDone?.();
    return;
  }
  const n = Math.max(6, Math.round(ms / 40));
  const from = steps.map((s) => s.el.volume);
  let i = 0;
  fadeTimer = setInterval(() => {
    i += 1;
    const t = i / n;
    for (let k = 0; k < steps.length; k++) {
      const a = from[k]!;
      const b = steps[k]!.to;
      steps[k]!.el.volume = Math.min(1, Math.max(0, a + (b - a) * t));
    }
    if (i >= n) {
      clearFadeTimer();
      onDone?.();
    }
  }, Math.max(16, Math.round(ms / n)));
}

export function setSfxVolume(v: number): void {
  writeVol(SFX_KEY, v);
}

export function setBgmVolume(v: number): void {
  writeVol(BGM_KEY, v);
  if (bgm) bgm.volume = targetGain(bgmVolScale);
}

/** 播一次音效；音量 0 或环境不支持时静默跳过。 */
export function playSfx(id: SfxId, volScale = 1): void {
  if (!hasAudio() || getSfxVolume() <= 0) return;
  const node = new Audio(artUrl(SFX_PATH[id]));
  node.volume = Math.min(1, Math.max(0, (getSfxVolume() / 100) * volScale));
  void node.play().catch(() => {
    /* 自动播放限制 */
  });
}

export function playFxSfx(fx: string | undefined): void {
  if (!fx) return;
  const id = FX_SFX[fx];
  if (id) playSfx(id);
}

/**
 * 敌招结算声：破/打/让/空分层。
 * weight=light：爬塔破招分量压低。
 */
export function playFoeResolveSfx(kind: string, weight: "full" | "light" = "full"): void {
  const soft = weight === "light" ? 0.55 : 1;
  if (kind === "break") {
    playSfx("clash", 1 * soft);
    if (weight === "full" && typeof window !== "undefined") {
      window.setTimeout(() => playSfx("swing", 0.45), 85);
    }
    return;
  }
  if (kind === "hit") {
    playSfx("clash", 1 * soft);
    return;
  }
  if (kind === "graze") {
    playSfx("clash", 0.62 * soft);
    return;
  }
  if (kind === "miss" || kind === "skip") {
    playSfx("drop", 0.75 * soft);
    return;
  }
  playFxSfx(kind);
}

/** 踢馆馆序 → 曲库档：普 / 精 / Boss。 */
export function combatBgmTier(stage: number, tier: string, finalStage = 10): CombatBgmTier {
  if (stage >= finalStage) return "boss";
  if (tier === "easy") return "normal";
  return "elite";
}

/** 路线 + 档 → BgmId。 */
export function combatBgmId(path: GauntletBgmPath, stage: number, tier: string, finalStage = 10): BgmId {
  const t = combatBgmTier(stage, tier, finalStage);
  const line = path === "shaolin" ? "shaolin" : path === "court" ? "court" : "jianghu";
  return `${line}_${t}` as BgmId;
}

const LOUNGE_TRACKS: BgmId[] = ["hall", "hall_b", "hall_c", "hall_voice"];

/** 下注/营地/门厅跟设置里点的曲；不要自动切成馆战循环。 */
export function campBgmId(_path?: GauntletBgmPath): BgmId {
  return preferredHallBgm();
}

function isHallTrack(track: BgmId): boolean {
  return LOUNGE_TRACKS.includes(track);
}

function attachBgmChain(el: HTMLAudioElement, track: BgmId): void {
  el.onended = null;
  const chain = BGM_CHAIN[track];
  const playlistOwned = HALL_PLAYLIST.some((x) => x.id === track);

  if (playMode === "single") {
    el.loop = true;
    return;
  }

  if (chain && chain.length >= 2) {
    el.loop = false;
    el.dataset.chainIdx = el.dataset.chainIdx ?? "0";
    el.onended = () => {
      if (userPaused || fadingOut.includes(el) || el !== bgm) return;
      const i = (Number(el.dataset.chainIdx ?? "0") + 1) % chain.length;
      el.dataset.chainIdx = String(i);
      el.src = artUrl(chain[i]!);
      el.loop = false;
      void el.play().catch(() => {});
    };
    return;
  }

  if (playlistOwned && (playMode === "sequence" || playMode === "random")) {
    el.loop = false;
    el.onended = () => {
      if (userPaused || fadingOut.includes(el) || el !== bgm || advancingPlaylist) return;
      advancingPlaylist = true;
      try {
        writeHallPick(nextPlaylistIndex(hallPickIndex));
        const pick = HALL_PLAYLIST[hallPickIndex]!;
        ensureBgm(pick.id, {
          volScale: bgmVolScale,
          seekSec: 0,
          fadeMs: 600,
          forceRestart: true,
        });
      } finally {
        advancingPlaylist = false;
      }
    };
    return;
  }

  el.loop = true;
}

/** 曲目没变就接着放。forceCrossfade / 从头 seek 都不能拿来重播同一首。 */
export function bgmShouldRestart(
  current: BgmId | null | undefined,
  next: BgmId,
  opts: { forceRestart?: boolean; resumeJump?: boolean; forceCrossfade?: boolean } = {},
): boolean {
  if (!current) return true;
  if (current === next) return Boolean(opts.forceRestart || opts.resumeJump);
  return true;
}

/**
 * 进入某曲循环。
 * - 门厅同曲续播不打断
 * - 进战斗：淡入短；有续播记忆则 seek=离开点+RESUME_SKIP，否则跳前奏
 * - 回门厅：淡入长；离开战斗曲时记下进度
 */
export function ensureBgm(track: BgmId = bgmTrack, opts: EnsureBgmOpts = {}): void {
  const volScale = opts.volScale ?? 1;
  const isCombatTrack = !isHallTrack(track);
  const fadeMs =
    opts.fadeMs ?? (isCombatTrack ? BGM_FADE_IN_COMBAT_MS : BGM_FADE_TO_CAMP_MS);
  const forceRestart = Boolean(opts.forceRestart);
  const forceCrossfade = Boolean(opts.forceCrossfade);

  // 离开战斗曲进门厅前：记下进度，方便同档下一馆 +10s 接入
  if (bgm && bgm.dataset.track && !isHallTrack(bgm.dataset.track as BgmId) && isHallTrack(track)) {
    try {
      const t = bgm.currentTime;
      if (Number.isFinite(t) && t > 1) {
        combatResume = { track: bgm.dataset.track as BgmId, t };
      }
    } catch {
      /* ignore */
    }
  }
  if (isCombatTrack && combatResume && combatResume.track !== track) {
    combatResume = null;
  }

  let seekSec: number;
  if (opts.seekSec === null) seekSec = 0;
  else if (opts.seekSec != null) seekSec = opts.seekSec;
  else if (isCombatTrack && combatResume && combatResume.track === track) {
    seekSec = combatResume.t + BGM_RESUME_SKIP_SEC;
  } else seekSec = defaultSeekFor(track);

  // 同档再进战斗：必须重新 seek（+10s），不能无缝续播同一点
  const resumeJump = isCombatTrack && combatResume != null && combatResume.track === track && opts.seekSec === undefined;

  bgmWanted = true;
  bgmTrack = track;
  bgmVolScale = volScale;
  if (userPaused) return;
  if (!hasAudio()) return;
  if (liveStings.length) {
    pendingAfterSting = { track, volScale, seekSec, fadeMs, forceRestart, resumeJump };
    return;
  }
  pendingAfterSting = null;

  const gain = targetGain(volScale);

  if (!bgm && fadingOut.length) {
    bgmHandoff = { track, volScale, seekSec, fadeInMs: fadeMs, resumeJump };
    return;
  }

  const playingTrack = (bgm?.dataset.track as BgmId | undefined) ?? null;
  if (bgm && !bgmShouldRestart(playingTrack, track, { forceRestart, resumeJump, forceCrossfade })) {
    if (bgm.paused) {
      void bgm.play().catch(() => {});
    }
    if (Math.abs(bgm.volume - gain) > 0.02) {
      if (fadingOut.length) {
        bgm.volume = gain;
      } else {
        fadeVolumes([{ el: bgm, to: gain }], Math.min(fadeMs, 600));
      }
    } else {
      bgm.volume = gain;
    }
    return;
  }

  const old = bgm;
  const switching = Boolean(old && bgmShouldRestart(old.dataset.track as BgmId, track, { forceRestart, resumeJump }));

  bgmHandoff = {
    track,
    volScale,
    seekSec,
    fadeInMs: fadeMs,
    resumeJump,
  };

  if (switching && old && fadeMs > 0) {
    old.onended = null;
    old.loop = false;
    if (!fadingOut.includes(old)) fadingOut.push(old);
    bgm = null;
    fadeVolumes([{ el: old, to: 0 }], fadeMs, () => {
      const i = fadingOut.indexOf(old);
      if (i >= 0) fadingOut.splice(i, 1);
      killAudioEl(old);
      const h = bgmHandoff;
      bgmHandoff = null;
      if (!h || !bgmWanted || userPaused) return;
      beginTrack(h.track, h.seekSec, h.volScale, Math.min(h.fadeInMs, 800), h.resumeJump);
    });
    return;
  }

  reapFadingOut();
  clearFadeTimer();
  if (old) killAudioEl(old);
  bgmHandoff = null;
  beginTrack(track, seekSec, volScale, fadeMs, resumeJump);
}

function dropSting(el: HTMLAudioElement): void {
  const i = liveStings.indexOf(el);
  if (i >= 0) liveStings.splice(i, 1);
  killAudioEl(el);
}

function resumeBgmAfterSting(): void {
  if (liveStings.length || userPaused) return;
  const pending = pendingAfterSting;
  pendingAfterSting = null;
  if (pending && bgmWanted) {
    ensureBgm(pending.track, {
      volScale: pending.volScale,
      seekSec: pending.seekSec,
      fadeMs: pending.fadeMs || BGM_FADE_TO_CAMP_MS,
      forceRestart: pending.forceRestart,
    });
    return;
  }
  if (bgmWanted) {
    ensureBgm(bgmTrack, { volScale: bgmVolScale, fadeMs: BGM_FADE_TO_CAMP_MS });
  }
}

/** 胜/负短句：先停循环曲，短句播完再接营地 BGM。期间不叠第二首。 */
export function playSting(id: StingId): void {
  if (!hasAudio()) return;
  bgmWanted = false;
  bgmHandoff = null;
  pendingAfterSting = null;
  clearFadeTimer();
  reapFadingOut();
  killAudioEl(bgm);
  bgm = null;
  stopSting();
  const el = new Audio(artUrl(STING_PATHS[id]));
  el.volume = Math.min(1, targetGain(1) * 1.05);
  liveStings.push(el);
  el.onended = () => {
    dropSting(el);
    resumeBgmAfterSting();
  };
  void el.play().catch(() => {
    dropSting(el);
    resumeBgmAfterSting();
  });
}

/** 胜/负短句离开结算屏即停，不跟 BGM 一起拖。营地曲由随后的 ensureBgm 或短句 onended 接上。 */
export function stopSting(): void {
  while (liveStings.length) killAudioEl(liveStings.pop() ?? null);
}

/** 彻底停 BGM（关页/退后台用）；不只 pause，避免幽灵循环。 */
export function stopBgm(): void {
  bgmWanted = false;
  bgmHandoff = null;
  pendingAfterSting = null;
  clearFadeTimer();
  reapFadingOut();
  killAudioEl(bgm);
  bgm = null;
  stopSting();
}

export function bgmPlaying(): boolean {
  return bgm != null && !bgm.paused;
}

export function currentBgmTrack(): BgmId {
  return bgmTrack;
}

export function debugAudioState(): {
  playing: boolean;
  elVolume: number | null;
  savedBgm: number;
  savedSfx: number;
  track: BgmId;
} {
  return {
    playing: bgmPlaying(),
    elVolume: bgm ? bgm.volume : null,
    savedBgm: getBgmVolume(),
    savedSfx: getSfxVolume(),
    track: bgmTrack,
  };
}

export function unlockAudio(): void {
  if (bgmWanted) ensureBgm(bgmTrack, { volScale: bgmVolScale, seekSec: null, fadeMs: 0 });
}

export function resetLabAudioForTest(): void {
  stopBgm();
  bgmTrack = "hall";
  bgmVolScale = 1;
  combatResume = null;
  hallPickIndex = 0;
  playMode = "sequence";
  userPaused = false;
  pendingAfterSting = null;
}

function hardSilence(): void {
  stopBgm();
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (bgm && !bgm.paused) bgm.pause();
      for (const s of liveStings) {
        try {
          s.pause();
        } catch {
          /* ignore */
        }
      }
    } else if (userPaused) {
      return;
    } else if (liveStings.length) {
      for (const s of liveStings) void s.play().catch(() => {});
    } else if (bgmWanted) {
      if (bgm) void bgm.play().catch(() => {});
      else ensureBgm(bgmTrack, { volScale: bgmVolScale, fadeMs: 400 });
    }
  });
}
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", hardSilence);
  window.addEventListener("beforeunload", hardSilence);
  window.addEventListener("freeze", hardSilence);
}
