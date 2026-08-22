export type Difficulty = "easy" | "normal" | "hard";

export interface GameSettings {
  difficulty: Difficulty;
}

const KEY = "openhand-settings";

const DEFAULTS: GameSettings = { difficulty: "normal" };

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
    return { difficulty };
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

export function difficultyScale(d: Difficulty = getDifficulty()): {
  hp: number;
  dmg: number;
  youDmg: number;
} {
  // easy：少算也能爽过；hard：薄装难硬闯，要外功/兵器与算招
  if (d === "easy") return { hp: 0.52, dmg: 0.42, youDmg: 1.18 };
  if (d === "hard") return { hp: 1.72, dmg: 1.62, youDmg: 0.72 };
  return { hp: 1, dmg: 1, youDmg: 1 };
}

export const DIFFICULTY_META: Record<Difficulty, { name: string; blurb: string }> = {
  easy: { name: "闲步", blurb: "敌人血薄手轻，你的刀更沉。图个痛快。" },
  normal: { name: "港律", blurb: "本港规矩。要算步，但不至于步步死局。" },
  hard: { name: "死战", blurb: "无外功、无好兵器很难过。漏算一步就倒。" },
};
