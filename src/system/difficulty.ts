/**
 * 难度系统：开局选择 + 最多 3 次切换 + 缓升修正
 */
export type Difficulty = "easy" | "normal" | "hard";

export interface DifficultyState {
  difficulty: Difficulty;
  changes: number;
  lastChangeAt: number;
}

export const MAX_DIFFICULTY_CHANGES = 3;
export const CHANGE_COOLDOWN_MS = 10 * 60 * 1000;

export function canChangeDifficulty(state: DifficultyState, now = Date.now()): {
  ok: boolean;
  reason?: string;
} {
  if (state.changes >= MAX_DIFFICULTY_CHANGES) return { ok: false, reason: "难度切换次数已用尽" };
  if (now - state.lastChangeAt < CHANGE_COOLDOWN_MS) return { ok: false, reason: "切换冷却中" };
  return { ok: true };
}

export function applyDifficultyChange(
  state: DifficultyState,
  next: Difficulty,
  now = Date.now(),
): { state: DifficultyState; penalty: number; error?: string } {
  const gate = canChangeDifficulty(state, now);
  if (!gate.ok) return { state, penalty: 0, error: gate.reason };
  const down =
    (state.difficulty === "hard" && next !== "hard") ||
    (state.difficulty === "normal" && next === "easy");
  return {
    state: { difficulty: next, changes: state.changes + 1, lastChangeAt: now },
    penalty: down ? 0.1 : 0,
  };
}

/** 缓升波浪：单章增幅目标 <30% */
export function difficultyModifier(d: Difficulty, chapter: number): number {
  const base = d === "easy" ? 0.85 : d === "hard" ? 1.2 : 1;
  const wave = 1 + Math.min(0.28, chapter * 0.045) + Math.sin(chapter / 2) * 0.02;
  return base * wave;
}

export function validateDifficultyCurve(chapters: number[]): { ok: boolean; cliffs: string[] } {
  const cliffs: string[] = [];
  for (let i = 1; i < chapters.length; i++) {
    const prev = chapters[i - 1]!;
    const cur = chapters[i]!;
    if (prev <= 0) continue;
    const growth = (cur - prev) / prev;
    if (growth > 0.3) cliffs.push(`ch${i}->${i + 1} +${(growth * 100).toFixed(0)}%`);
  }
  return { ok: cliffs.length === 0, cliffs };
}
