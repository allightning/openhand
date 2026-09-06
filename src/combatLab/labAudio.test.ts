import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  BGM_PATH,
  BGM_PATHS,
  BGM_COMBAT_SEEK_SEC,
  BGM_FADE_IN_COMBAT_MS,
  BGM_FADE_TO_CAMP_MS,
  BGM_FADE_BETWEEN_HALL_MS,
  BGM_RESUME_SKIP_SEC,
  FX_SFX,
  HALL_PLAYLIST,
  SFX_PATH,
  STING_PATHS,
  bgmPlaying,
  combatBgmId,
  combatBgmTier,
  campBgmId,
  cycleHallTrack,
  bgmShouldRestart,
  ensureBgm,
  getBgmPlayback,
  getBgmPlayMode,
  getBgmVolume,
  getSfxVolume,
  hallPlaylistIndex,
  playFxSfx,
  playFoeResolveSfx,
  playSfx,
  playSting,
  preferredHallBgm,
  resetLabAudioForTest,
  seekBgm,
  setBgmPlayMode,
  setBgmVolume,
  setSfxVolume,
  stopBgm,
} from "./labAudio";

function stubStorage() {
  const map = new Map<string, string>();
  (globalThis as { localStorage?: Storage }).localStorage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    key: () => null,
    get length() {
      return map.size;
    },
  } as Storage;
  return map;
}

describe("labAudio", () => {
  beforeEach(() => {
    stubStorage();
    resetLabAudioForTest();
  });
  afterEach(() => {
    delete (globalThis as { localStorage?: Storage }).localStorage;
  });

  it("音量默认值：音效 80 / BGM 55", () => {
    expect(getSfxVolume()).toBe(80);
    expect(getBgmVolume()).toBe(55);
  });

  it("音量持久化并可读取", () => {
    setSfxVolume(30);
    setBgmVolume(70);
    expect(getSfxVolume()).toBe(30);
    expect(getBgmVolume()).toBe(70);
  });

  it("音量夹取在 0-100", () => {
    setSfxVolume(-5);
    setBgmVolume(260);
    expect(getSfxVolume()).toBe(0);
    expect(getBgmVolume()).toBe(100);
  });

  it("音效与多曲 BGM / 短句路径齐备", () => {
    expect(Object.keys(SFX_PATH).sort()).toEqual(["clash", "drop", "page", "swing"]);
    for (const p of Object.values(SFX_PATH)) expect(p).toMatch(/^art\/audio\/sfx\//);
    expect(BGM_PATH).toBe(BGM_PATHS.hall);
    expect(BGM_PATHS.hall_voice).toContain("hall_voice");
    expect(BGM_PATHS.jianghu_gym).toContain("jianghu_gym");
    expect("hall_d" in BGM_PATHS).toBe(false);
    for (const p of Object.values(BGM_PATHS)) expect(p).toMatch(/^art\/audio\/bgm\//);
    expect(STING_PATHS.win).toBe("art/audio/bgm/sting_win.mp3");
    expect(STING_PATHS.lose).toBe("art/audio/bgm/sting_lose.mp3");
  });

  it("馆序档位：易→普，中硬极→精，末馆→Boss；下注/营地跟门厅曲", () => {
    expect(combatBgmTier(1, "easy")).toBe("normal");
    expect(combatBgmTier(3, "mid")).toBe("elite");
    expect(combatBgmTier(7, "extreme")).toBe("elite");
    expect(combatBgmTier(10, "extreme")).toBe("boss");
    expect(combatBgmId("bandit", 1, "easy")).toBe("jianghu_normal");
    expect(combatBgmId("shaolin", 7, "extreme")).toBe("shaolin_elite");
    expect(combatBgmId("court", 10, "extreme")).toBe("court_boss");
    expect(campBgmId("bandit")).toBe("hall");
    expect(campBgmId("shaolin")).toBe("hall");
    expect(campBgmId("court")).toBe("hall");
  });

  it("战斗曲默认跳过前奏秒数，门厅为 0；进出淡入与续播跳点定规", () => {
    expect(BGM_COMBAT_SEEK_SEC.jianghu_normal).toBeGreaterThan(10);
    expect(BGM_COMBAT_SEEK_SEC.hall ?? 0).toBe(0);
    expect(BGM_FADE_IN_COMBAT_MS).toBe(1000);
    expect(BGM_FADE_TO_CAMP_MS).toBeLessThanOrEqual(2000);
    expect(BGM_FADE_BETWEEN_HALL_MS).toBe(2000);
    expect(BGM_RESUME_SKIP_SEC).toBe(10);
  });

  it("歌单两套都要：局内曲 + 截图馆曲，无门厅丁", () => {
    expect(BGM_PATHS.hall).toContain("hall_a");
    expect(BGM_PATHS.hall_b).toContain("hall_b");
    expect(BGM_PATHS.hall_c).toContain("hall_c");
    expect(HALL_PLAYLIST.filter((x) => x.id.startsWith("hall")).map((x) => x.id)).toEqual([
      "hall",
      "hall_b",
      "hall_c",
      "hall_voice",
    ]);
    const ids = HALL_PLAYLIST.map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("jianghu_gym");
    expect(ids).toContain("jianghu_normal");
    expect(ids).toContain("break");
    expect(ids).toContain("break_voice");
    expect(ids).not.toContain("hall_d");
    expect(HALL_PLAYLIST.map((x) => x.label)).toContain("江湖 · 普");
    expect(HALL_PLAYLIST.map((x) => x.label)).toContain("江湖 · 普馆");
    expect(HALL_PLAYLIST.map((x) => x.label)).toContain("读招 · 和声");
  });

  it("演出事件映射：拆招/受击→碰剑，斩杀/势爆→挥刀，水滴不作攻击音", () => {
    expect(FX_SFX.break).toBe("clash");
    expect(FX_SFX.counter).toBe("clash");
    expect(FX_SFX.wall).toBe("clash");
    expect(FX_SFX.graze).toBe("clash");
    expect(FX_SFX.hit).toBe("clash");
    expect(FX_SFX.miss).toBe("drop");
    expect(FX_SFX.skip).toBe("drop");
    expect(FX_SFX.kill).toBe("swing");
    expect(FX_SFX.burst).toBe("swing");
    expect(Object.values(FX_SFX)).not.toContain("page");
  });

  it("门厅曲单：默认首曲 hall，上下曲循环并持久化", () => {
    expect(HALL_PLAYLIST.length).toBeGreaterThanOrEqual(2);
    expect(preferredHallBgm()).toBe("hall");
    expect(hallPlaylistIndex()).toBe(0);
    const next = cycleHallTrack(1);
    expect(next.index).toBe(1);
    expect(preferredHallBgm()).toBe(HALL_PLAYLIST[1]!.id);
    expect(next.label.length).toBeGreaterThan(0);
    const back = cycleHallTrack(-1);
    expect(back.id).toBe("hall");
    expect(preferredHallBgm()).toBe("hall");
    // wrap
    const last = cycleHallTrack(-1);
    expect(last.index).toBe(HALL_PLAYLIST.length - 1);
    const pb = getBgmPlayback();
    expect(pb.hallCount).toBe(HALL_PLAYLIST.length);
    expect(pb.hallIndex).toBe(last.index);
    seekBgm(12);
    expect(getBgmPlayback().current).toBeGreaterThanOrEqual(0);
    setBgmPlayMode("single");
    expect(getBgmPlayMode()).toBe("single");
    setBgmPlayMode("random");
    expect(getBgmPlayMode()).toBe("random");
    setBgmPlayMode("sequence");
    expect(getBgmPlayMode()).toBe("sequence");
  });

  it("同曲不重开：门厅进下注就算 forceCrossfade 也不切", () => {
    expect(bgmShouldRestart("hall", "hall", { forceCrossfade: true })).toBe(false);
    expect(bgmShouldRestart("hall", "hall", {})).toBe(false);
    expect(bgmShouldRestart("hall", "jianghu_normal", {})).toBe(true);
    expect(bgmShouldRestart("jianghu_normal", "hall", {})).toBe(true);
    expect(bgmShouldRestart("hall", "hall", { forceRestart: true })).toBe(true);
    expect(bgmShouldRestart("hall", "hall", { resumeJump: true })).toBe(true);
    expect(bgmShouldRestart(null, "hall", {})).toBe(true);
  });
});
