import { artUrl } from "../art/artUrl";

/**
 * 战斗音效 / BGM 管理。
 * 素材：public/art/audio/（耳聆网素材，命名见 docs/combat/ART_PIPELINE.md 入库规范）。
 * 音量 0-100 持久化到 localStorage；Audio 在 node 测试环境不存在时全部降级为 no-op。
 */

export type SfxId = "swing" | "clash" | "page" | "drop";

export const SFX_PATH: Record<SfxId, string> = {
  swing: "art/audio/sfx/swing.mp3",
  clash: "art/audio/sfx/clash.wav",
  page: "art/audio/sfx/page.wav",
  drop: "art/audio/sfx/drop.mp3",
};

export const BGM_PATH = "art/audio/bgm/battle_main.mp3";

const SFX_KEY = "openhand-lab-sfx-vol";
const BGM_KEY = "openhand-lab-bgm-vol";
const DEFAULT_SFX = 80;
const DEFAULT_BGM = 55;

/** v2 演出事件 → 音效。挥刀=攻击/击杀，碰剑=拆招/受击格挡，水滴=打空/劲尽/共鸣。势爆是攻击终结，也用挥刀。 */
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

function hasAudio(): boolean {
  return typeof Audio !== "undefined";
}

export function setSfxVolume(v: number): void {
  writeVol(SFX_KEY, v);
}

export function setBgmVolume(v: number): void {
  writeVol(BGM_KEY, v);
  if (bgm) bgm.volume = getBgmVolume() / 100;
}

/** 播一次音效；音量 0 或环境不支持时静默跳过。 */
export function playSfx(id: SfxId): void {
  if (!hasAudio() || getSfxVolume() <= 0) return;
  const node = new Audio(artUrl(SFX_PATH[id]));
  node.volume = getSfxVolume() / 100;
  void node.play().catch(() => {
    /* 自动播放限制：下一次用户手势后自然恢复 */
  });
}

/** 按 v2 演出队列播对应音效（只播最后一个，避免一帧连响）。 */
export function playFxSfx(fx: string | undefined): void {
  if (!fx) return;
  const id = FX_SFX[fx];
  if (id) playSfx(id);
}

/** 进入战斗：想播 BGM。浏览器要求用户手势，失败则等下次 pointerdown 补播。 */
export function ensureBgm(): void {
  bgmWanted = true;
  if (!hasAudio()) return;
  if (!bgm) {
    bgm = new Audio(artUrl(BGM_PATH));
    bgm.loop = true;
    bgm.volume = getBgmVolume() / 100;
  }
  if (bgm.paused) {
    void bgm.play().catch(() => {
      /* 等 unlockAudio */
    });
  }
}

export function stopBgm(): void {
  bgmWanted = false;
  if (bgm && !bgm.paused) bgm.pause();
}

export function bgmPlaying(): boolean {
  return bgm != null && !bgm.paused;
}

/** 调试快照：BGM 元素实际音量与播放态（设置排障用）。 */
export function debugAudioState(): { playing: boolean; elVolume: number | null; savedBgm: number; savedSfx: number } {
  return {
    playing: bgmPlaying(),
    elVolume: bgm ? bgm.volume : null,
    savedBgm: getBgmVolume(),
    savedSfx: getSfxVolume(),
  };
}

/** 挂在 main.ts 首次 pointerdown：补播被自动播放策略拦下的 BGM。 */
export function unlockAudio(): void {
  if (bgmWanted) ensureBgm();
}

/** 测试用：重置模块内 BGM 单例。 */
export function resetLabAudioForTest(): void {
  if (bgm) {
    bgm.pause();
    bgm = null;
  }
  bgmWanted = false;
}

/* 幽灵音乐保险：标签页藏起即暂停（回来自动续播），页面卸载即停。
   否则后台/关页后 BGM 仍会循环——用户关不掉。 */
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (!bgm) return;
    if (document.hidden) bgm.pause();
    else if (bgmWanted) void bgm.play().catch(() => {});
  });
}
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => stopBgm());
}
