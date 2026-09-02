import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  BGM_PATH,
  FX_SFX,
  SFX_PATH,
  bgmPlaying,
  ensureBgm,
  getBgmVolume,
  getSfxVolume,
  playFxSfx,
  playSfx,
  resetLabAudioForTest,
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

  it("四种音效与 BGM 素材路径齐备", () => {
    expect(Object.keys(SFX_PATH).sort()).toEqual(["clash", "drop", "page", "swing"]);
    for (const p of Object.values(SFX_PATH)) expect(p).toMatch(/^art\/audio\/sfx\//);
    expect(BGM_PATH).toBe("art/audio/bgm/battle_main.mp3");
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

  it("node 环境无 Audio：播放与 BGM 全部静默降级", () => {
    expect(() => {
      playSfx("swing");
      playFxSfx("break");
      playFxSfx(undefined);
      ensureBgm();
      stopBgm();
    }).not.toThrow();
    expect(bgmPlaying()).toBe(false);
  });
});
