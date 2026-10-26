import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
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
  debugStrikeVoices,
  stopSting,
  preferredHallBgm,
  resetLabAudioForTest,
  seekBgm,
  setBgmPlayMode,
  setBgmVolume,
  setSfxVolume,
  stopBgm,
  debugMusicLane,
} from "./labAudio";
import {
  BOARD_SFX_KEYS,
  cardPlaySfxKey,
  climbBeatSfxKey,
  DART_SFX_KEYS,
  FX_KEY,
  hitKeyForSchool,
  P0_SFX_KEYS,
  P1_SFX_KEYS,
  RESERVED_SFX_KEYS,
  riderSfxKeys,
  SFX_MAP,
  SHELL_SFX_KEYS,
  sfxSlot,
  STAFF_CHARGE_SFX_KEYS,
} from "./sfxMap";
import { FOE_WINDUP_MS } from "./foePlayback";

type FakeAudio = {
  src: string;
  volume: number;
  paused: boolean;
  onended: (() => void) | null;
};

function installFakeAudio(): { spawned: FakeAudio[]; restore: () => void } {
  const spawned: FakeAudio[] = [];
  class FakeAudioImpl {
    src = "";
    volume = 1;
    loop = false;
    paused = true;
    currentTime = 0;
    duration = 180;
    readyState = 4;
    dataset: Record<string, string> = {};
    onended: (() => void) | null = null;
    constructor(src?: string) {
      this.src = src ?? "";
      spawned.push(this);
    }
    play() {
      this.paused = false;
      return Promise.resolve();
    }
    pause() {
      this.paused = true;
    }
    load() {}
    removeAttribute(name: string) {
      if (name === "src") this.src = "";
    }
    getAttribute(name: string) {
      return name === "src" ? this.src : null;
    }
    addEventListener() {}
  }
  const prev = (globalThis as { Audio?: unknown }).Audio;
  (globalThis as { Audio: typeof FakeAudioImpl }).Audio = FakeAudioImpl;
  vi.useFakeTimers();
  return {
    spawned,
    restore() {
      resetLabAudioForTest();
      vi.useRealTimers();
      if (prev) (globalThis as { Audio: unknown }).Audio = prev;
      else delete (globalThis as { Audio?: unknown }).Audio;
    },
  };
}

function stepMusic(ms: number): void {
  for (let t = 0; t < ms; t += 20) {
    vi.advanceTimersByTime(20);
    expect(debugMusicLane().musicSources).toBeLessThanOrEqual(1);
  }
}

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
    expect(BGM_PATHS.hall).toContain("hall");
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
    expect(HALL_PLAYLIST.map((x) => x.label)).toContain("登门 · 和声");
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

  it("sfxMap 覆盖 P0 十二键，查表仍是原来的四个占位", () => {
    expect(P0_SFX_KEYS).toEqual([
      "fist_hit",
      "saber_hit",
      "sword_hit",
      "spear_hit",
      "staff_hit",
      "hook_hit",
      "clash_blade",
      "graze",
      "whiff",
      "block",
      "step",
      "end_turn",
    ]);
    expect(P1_SFX_KEYS).toEqual([
      "swap",
      "draw_card",
      "bleed_tick",
      "expose",
      "ward_gain",
      "ui_confirm",
      "intent_gone",
      "heal",
    ]);
    expect(P0_SFX_KEYS.length + P1_SFX_KEYS.length).toBe(20);
    const slots = ["swing", "clash", "page", "drop"];
    for (const key of P0_SFX_KEYS) expect(slots).toContain(SFX_MAP[key]);
    for (const key of P1_SFX_KEYS) expect(slots).toContain(SFX_MAP[key]);
    expect(sfxSlot("windup")).toBe("swing");
    expect(sfxSlot("whiff")).toBe("drop");
    expect(sfxSlot("end_turn")).toBe("drop");
    expect(sfxSlot("clash_blade")).toBe("clash");
    expect(sfxSlot("graze")).toBe("clash");
    expect(sfxSlot("block")).toBe("clash");
    expect(sfxSlot("step")).toBe("drop");
    expect(sfxSlot("ink_ui")).toBe("page");
    expect(sfxSlot("draw_card")).toBe("page");
    expect(sfxSlot("ui_confirm")).toBe("drop");
    for (const school of ["palm", "saber", "sword", "spear", "staff", "hook"] as const) {
      expect(sfxSlot(hitKeyForSchool(school))).toBe("clash");
    }
    expect(sfxSlot(cardPlaySfxKey({ type: "attack" }))).toBe("swing");
    expect(sfxSlot(cardPlaySfxKey({ type: "skill", steps: 1 }))).toBe("drop");
    expect(sfxSlot(cardPlaySfxKey({ type: "skill", heal: 4 }))).toBe("drop");
    expect(sfxSlot(cardPlaySfxKey({ type: "skill", block: 3 }))).toBe("drop");
    expect(sfxSlot(cardPlaySfxKey({ type: "skill" }))).toBe("drop");
    expect(sfxSlot(cardPlaySfxKey(undefined))).toBe("drop");
    expect(RESERVED_SFX_KEYS).toEqual([
      "qi_sever",
      "blood_drink",
      "stake_blast",
      "disarm",
      "combo_replay",
    ]);
    for (const key of RESERVED_SFX_KEYS) expect(slots).toContain(SFX_MAP[key]);
    expect(sfxSlot("combo_replay")).toBe("swing");
    expect(sfxSlot("stake_blast")).toBe("clash");
    expect(sfxSlot("qi_sever")).toBe("drop");
    expect(sfxSlot("blood_drink")).toBe("drop");
    expect(sfxSlot("disarm")).toBe("drop");
  });

  it("2026-10-23 新键都落四占位，印记与阶段拍对得上", () => {
    const slots = ["swing", "clash", "page", "drop"];
    const fresh = [
      ...DART_SFX_KEYS,
      ...STAFF_CHARGE_SFX_KEYS,
      ...BOARD_SFX_KEYS,
      ...SHELL_SFX_KEYS,
    ];
    expect(fresh).toHaveLength(17);
    for (const key of fresh) expect(slots).toContain(SFX_MAP[key]);
    expect(sfxSlot("dart_throw")).toBe("swing");
    expect(sfxSlot("dart_hit")).toBe("clash");
    expect(sfxSlot("dart_pin")).toBe("drop");
    expect(sfxSlot("dart_switch")).toBe("page");
    expect(sfxSlot("staff_burst")).toBe("swing");
    expect(sfxSlot("staff_push_wall")).toBe("clash");
    expect(sfxSlot("wall_slam")).toBe("clash");
    expect(sfxSlot("stake_shatter")).toBe("clash");
    expect(sfxSlot("stake_plant")).toBe("drop");
    expect(sfxSlot("intent_gone")).toBe("page");
    expect(FX_KEY.wall).toBe("wall_slam");
    expect(FX_KEY.swap).toBe("swap");
    expect(cardPlaySfxKey({ type: "skill", plant: true })).toBe("stake_plant");
    expect(cardPlaySfxKey({ type: "skill", expose: 2 })).toBe("expose");
    expect(cardPlaySfxKey({ type: "attack", expose: 1, plant: true })).toBe("windup");
    expect(cardPlaySfxKey({ type: "skill", block: 2, plant: true })).toBe("ward_gain");
    expect(riderSfxKeys({ log: ["旧"] }, { log: ["旧", "噬血 +2"] })).toEqual(["blood_drink"]);
    expect(riderSfxKeys({ log: [] }, { log: ["裂桩爆炸"] })).toEqual(["stake_blast"]);
    expect(riderSfxKeys({ log: [] }, { log: ["断劲 −3"] })).toEqual(["qi_sever"]);
    expect(riderSfxKeys({ log: [], foeDisarm: 0 }, { log: ["缴手：短缴械"], foeDisarm: 1 })).toEqual([
      "disarm",
    ]);
    expect(riderSfxKeys({ log: ["破绽 2"] }, { log: ["破绽 2", "命中"] })).toEqual([]);
    expect(climbBeatSfxKey("bleed", "裂创")).toBe("bleed_tick");
    expect(climbBeatSfxKey("draw", "摸 3 张")).toBe("draw_card");
    expect(climbBeatSfxKey("drawBench", "后场摸 2")).toBe("draw_card");
    expect(climbBeatSfxKey("wage", "断劲挂账")).toBe("qi_sever");
    expect(climbBeatSfxKey("wage", "敌回劲")).toBeNull();
    expect(climbBeatSfxKey("endure", "霸体 −1")).toBeNull();
    expect(climbBeatSfxKey("regen", "回劲")).toBeNull();
    expect(climbBeatSfxKey("intents", "亮招")).toBeNull();
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

  it("硬切换曲与短句期间音乐路数 ≤ 1，短句结束后才接营地曲", () => {
    const spawned: FakeAudio[] = [];
    class FakeAudio {
      src = "";
      volume = 1;
      loop = false;
      paused = true;
      currentTime = 0;
      duration = 180;
      readyState = 4;
      dataset: Record<string, string> = {};
      onended: (() => void) | null = null;
      constructor(src?: string) {
        this.src = src ?? "";
        spawned.push(this);
      }
      play() {
        this.paused = false;
        return Promise.resolve();
      }
      pause() {
        this.paused = true;
      }
      load() {}
      removeAttribute(name: string) {
        if (name === "src") this.src = "";
      }
      getAttribute(name: string) {
        return name === "src" ? this.src : null;
      }
      addEventListener() {}
    }
    const prev = (globalThis as { Audio?: unknown }).Audio;
    (globalThis as { Audio: typeof FakeAudio }).Audio = FakeAudio;
    try {
      ensureBgm("hall", { fadeMs: 0, seekSec: 0, volScale: 0.72 });
      expect(debugMusicLane().musicSources).toBe(1);
      expect(debugMusicLane().bgmOn).toBe(true);
      ensureBgm("jianghu_normal", { fadeMs: 0, volScale: 1 });
      expect(debugMusicLane().musicSources).toBe(1);
      expect(debugMusicLane().track).toBe("jianghu_normal");
      playSting("win");
      expect(debugMusicLane().bgmOn).toBe(false);
      expect(debugMusicLane().stingCount).toBe(1);
      expect(debugMusicLane().musicSources).toBe(1);
      ensureBgm("hall", { fadeMs: 0, volScale: 0.72, seekSec: 0 });
      expect(debugMusicLane().pendingAfterSting).toBe(true);
      expect(debugMusicLane().bgmOn).toBe(false);
      expect(debugMusicLane().stingCount).toBe(1);
      const sting = spawned.find((a) => a.src.includes("sting_win"));
      expect(sting).toBeTruthy();
      sting!.onended?.();
      expect(debugMusicLane().stingCount).toBe(0);
      expect(debugMusicLane().bgmOn).toBe(true);
      expect(debugMusicLane().track).toBe("hall");
      expect(debugMusicLane().musicSources).toBe(1);
    } finally {
      resetLabAudioForTest();
      if (prev) (globalThis as { Audio: unknown }).Audio = prev;
      else delete (globalThis as { Audio?: unknown }).Audio;
    }
  });

  it("切屏：门厅与战斗曲淡入淡出时音乐路数 ≤ 1", () => {
    const fake = installFakeAudio();
    try {
      ensureBgm("hall", { fadeMs: 0, seekSec: 0, volScale: 0.72 });
      expect(debugMusicLane().musicSources).toBe(1);
      ensureBgm("jianghu_normal", { fadeMs: BGM_FADE_IN_COMBAT_MS, volScale: 1, forceCrossfade: true });
      stepMusic(400);
      ensureBgm("break", { fadeMs: BGM_FADE_IN_COMBAT_MS, volScale: 1, forceCrossfade: true });
      stepMusic(BGM_FADE_IN_COMBAT_MS + 900);
      expect(debugMusicLane().track).toBe("break");
      expect(debugMusicLane().musicSources).toBe(1);
      expect(debugMusicLane().stingCount).toBe(0);
      ensureBgm("hall", {
        fadeMs: BGM_FADE_TO_CAMP_MS,
        volScale: 0.72,
        seekSec: null,
        forceCrossfade: false,
      });
      stepMusic(BGM_FADE_TO_CAMP_MS + 900);
      expect(debugMusicLane().track).toBe("hall");
      expect(debugMusicLane().bgmOn).toBe(true);
      expect(debugMusicLane().fadingCount).toBe(0);
      expect(debugMusicLane().musicSources).toBe(1);
    } finally {
      fake.restore();
    }
  });

  it("切模式：行路曲与登门曲互换时音乐路数 ≤ 1", () => {
    const fake = installFakeAudio();
    try {
      ensureBgm("jianghu_normal", { fadeMs: 0, volScale: 1 });
      expect(debugMusicLane().musicSources).toBe(1);
      ensureBgm("break", { fadeMs: BGM_FADE_IN_COMBAT_MS, volScale: 1 });
      stepMusic(BGM_FADE_IN_COMBAT_MS + 900);
      expect(debugMusicLane().track).toBe("break");
      expect(debugMusicLane().musicSources).toBe(1);
      ensureBgm("jianghu_normal", { fadeMs: BGM_FADE_IN_COMBAT_MS, volScale: 1 });
      stepMusic(BGM_FADE_IN_COMBAT_MS + 900);
      expect(debugMusicLane().track).toBe("jianghu_normal");
      expect(debugMusicLane().bgmOn).toBe(true);
      expect(debugMusicLane().fadingCount).toBe(0);
      expect(debugMusicLane().stingCount).toBe(0);
      expect(debugMusicLane().musicSources).toBe(1);
    } finally {
      fake.restore();
    }
  });

  it("死亡重开：负短句占席，短句结束或停掉后再起战斗曲，音乐路数 ≤ 1", () => {
    const fake = installFakeAudio();
    try {
      ensureBgm("jianghu_normal", { fadeMs: 0, volScale: 1 });
      playSting("lose");
      expect(debugMusicLane().bgmOn).toBe(false);
      expect(debugMusicLane().stingCount).toBe(1);
      expect(debugMusicLane().musicSources).toBe(1);
      ensureBgm("jianghu_normal", { fadeMs: BGM_FADE_IN_COMBAT_MS, volScale: 1 });
      expect(debugMusicLane().pendingAfterSting).toBe(true);
      expect(debugMusicLane().bgmOn).toBe(false);
      expect(debugMusicLane().musicSources).toBe(1);
      const sting = fake.spawned.find((a) => a.src.includes("sting_lose"));
      expect(sting).toBeTruthy();
      sting!.onended?.();
      stepMusic(BGM_FADE_IN_COMBAT_MS + 900);
      expect(debugMusicLane().stingCount).toBe(0);
      expect(debugMusicLane().pendingAfterSting).toBe(false);
      expect(debugMusicLane().track).toBe("jianghu_normal");
      expect(debugMusicLane().bgmOn).toBe(true);
      expect(debugMusicLane().musicSources).toBe(1);

      resetLabAudioForTest();
      ensureBgm("jianghu_normal", { fadeMs: 0, volScale: 1 });
      playSting("lose");
      stopSting();
      ensureBgm("break", { fadeMs: 0, volScale: 1 });
      expect(debugMusicLane().stingCount).toBe(0);
      expect(debugMusicLane().track).toBe("break");
      expect(debugMusicLane().bgmOn).toBe(true);
      expect(debugMusicLane().musicSources).toBe(1);
    } finally {
      fake.restore();
    }
  });

  it("段与段不叠两声打击：空段、拆招下一段会掐掉上一声，同一段的挥空和结算留下", () => {
    const fake = installFakeAudio();
    const prevWindow = (globalThis as { window?: unknown }).window;
    (globalThis as { window: unknown }).window = globalThis;
    try {
      const dropAt = fake.spawned.length;
      playSfx("drop");
      vi.advanceTimersByTime(200);
      playSfx("swing");
      expect(fake.spawned[dropAt]!.paused).toBe(true);
      expect(debugStrikeVoices().alive).toBe(1);

      resetLabAudioForTest();
      playSfx("swing");
      vi.advanceTimersByTime(FOE_WINDUP_MS);
      playFoeResolveSfx("hit", "full", "saber");
      expect(debugStrikeVoices().alive).toBe(2);

      resetLabAudioForTest();
      const breakAt = fake.spawned.length;
      playSfx("swing");
      vi.advanceTimersByTime(FOE_WINDUP_MS);
      playFoeResolveSfx("break", "full", "saber");
      vi.advanceTimersByTime(85);
      const broke = fake.spawned.slice(breakAt);
      expect(broke).toHaveLength(3);
      expect(broke[0]!.paused).toBe(true);
      expect(broke[1]!.paused).toBe(false);
      expect(broke[1]!.src).toContain("clash");
      expect(broke[2]!.paused).toBe(false);
      expect(broke[2]!.src).toContain("swing");
      vi.advanceTimersByTime(480 - 85);
      playSfx("swing");
      expect(broke[1]!.paused).toBe(true);
      expect(broke[2]!.paused).toBe(true);
      expect(debugStrikeVoices().alive).toBe(1);

      resetLabAudioForTest();
      const skipAt = fake.spawned.length;
      playFoeResolveSfx("skip");
      vi.advanceTimersByTime(620);
      playFoeResolveSfx("skip");
      expect(fake.spawned[skipAt]!.paused).toBe(true);
      expect(debugStrikeVoices().alive).toBe(1);

      resetLabAudioForTest();
      playSfx("clash");
      playSfx("page");
      expect(debugStrikeVoices().alive).toBe(1);
    } finally {
      fake.restore();
      if (prevWindow === undefined) delete (globalThis as { window?: unknown }).window;
      else (globalThis as { window: unknown }).window = prevWindow;
    }
  });
});
