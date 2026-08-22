export type Difficulty = "easy" | "normal" | "hard";
export type DisplayMode = "windowed" | "browser" | "fullscreen";

export interface GameSettings {
  difficulty: Difficulty;
  display: DisplayMode;
}

const KEY = "openhand-settings";

const DEFAULTS: GameSettings = { difficulty: "normal", display: "browser" };

let settings: GameSettings = { ...DEFAULTS };

function load(): GameSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    const difficulty =
      parsed.difficulty === "easy" || parsed.difficulty === "hard" || parsed.difficulty === "normal"
        ? parsed.difficulty
        : "normal";
    const display =
      parsed.display === "windowed" || parsed.display === "fullscreen" || parsed.display === "browser"
        ? parsed.display
        : "browser";
    return { difficulty, display };
  } catch {
    return { ...DEFAULTS };
  }
}

if (typeof localStorage !== "undefined") settings = load();

function save(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* ignore quota */
  }
}

export function getSettings(): GameSettings {
  return { ...settings };
}

export function setSettings(patch: Partial<GameSettings>): GameSettings {
  settings = { ...settings, ...patch };
  save();
  return getSettings();
}

export function getDifficulty(): Difficulty {
  return settings.difficulty;
}

export function getDisplayMode(): DisplayMode {
  return settings.display;
}

export function applyDisplayMode(mode: DisplayMode = getDisplayMode()): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.display = mode;
  const rootEl = document.getElementById("app");
  if (rootEl) rootEl.dataset.display = mode;
  if (mode === "fullscreen") {
    void document.documentElement.requestFullscreen?.().catch(() => undefined);
  } else if (document.fullscreenElement) {
    void document.exitFullscreen?.().catch(() => undefined);
  }
}

export function difficultyScale(d: Difficulty = getDifficulty()): {
  hp: number;
  dmg: number;
  youDmg: number;
} {
  if (d === "easy") return { hp: 0.52, dmg: 0.42, youDmg: 1.18 };
  if (d === "hard") return { hp: 1.72, dmg: 1.62, youDmg: 0.72 };
  return { hp: 1, dmg: 1, youDmg: 1 };
}

export const DIFFICULTY_META: Record<Difficulty, { name: string; blurb: string }> = {
  easy: { name: "闲步", blurb: "敌人血薄手轻，你的刀更沉。图个痛快。" },
  normal: { name: "港律", blurb: "本港规矩。要算步，但不至于步步死局。" },
  hard: { name: "死战", blurb: "无外功、无好兵器很难过。漏算一步就倒。" },
};

export const DISPLAY_META: Record<DisplayMode, { name: string; blurb: string }> = {
  windowed: { name: "窗口", blurb: "固定比例，像桌面小窗。" },
  browser: { name: "铺满页", blurb: "占满浏览器内容区。" },
  fullscreen: { name: "全屏", blurb: "整屏游玩，底栏可加高。" },
};
