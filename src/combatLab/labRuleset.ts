export type LabRuleset = "classic" | "break";

const KEY = "openhand-lab-ruleset";

/** In-memory fallback for vitest / private mode (localStorage may be missing). */
let memory: LabRuleset | null = null;

export function getLabRuleset(): LabRuleset {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "classic" || v === "break") {
      memory = v;
      return v;
    }
  } catch {
    /* vitest / private mode */
  }
  return memory ?? "classic";
}

export function setLabRuleset(r: LabRuleset): void {
  memory = r;
  try {
    localStorage.setItem(KEY, r);
  } catch {
    /* ignore */
  }
}

export function isBreakAlign(): boolean {
  return getLabRuleset() === "break";
}
