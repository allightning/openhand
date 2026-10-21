import type { GauntletBest, GauntletRun } from "../game/rules/gauntletModel";

export const GAUNTLET_BEST_KEY = "openhand-gauntlet-best";
export const GAUNTLET_ENDLESS_BEST_KEY = "openhand-gauntlet-endless-best";

export function loadGauntletBest(endless = false): GauntletBest | null {
  try {
    const raw = localStorage.getItem(endless ? GAUNTLET_ENDLESS_BEST_KEY : GAUNTLET_BEST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GauntletBest;
    if (typeof parsed.streak !== "number" || typeof parsed.breaks !== "number") return null;
    return { streak: parsed.streak, breaks: parsed.breaks, pot: typeof parsed.pot === "number" ? parsed.pot : 0 };
  } catch {
    return null;
  }
}

export function isBetterBest(next: GauntletBest, cur: GauntletBest | null): boolean {
  if (!cur) return true;
  if (next.streak !== cur.streak) return next.streak > cur.streak;
  if (next.pot !== cur.pot) return next.pot > cur.pot;
  return next.breaks > cur.breaks;
}

export function saveGauntletBest(run: Pick<GauntletRun, "endless" | "streak" | "totalBreaks" | "pot">): GauntletBest | null {
  const endless = Boolean(run.endless);
  const cur = loadGauntletBest(endless);
  const next: GauntletBest = { streak: run.streak, breaks: run.totalBreaks, pot: run.pot };
  if (isBetterBest(next, cur)) {
    localStorage.setItem(endless ? GAUNTLET_ENDLESS_BEST_KEY : GAUNTLET_BEST_KEY, JSON.stringify(next));
    return next;
  }
  return cur;
}
