export type LabRuleset = "climb" | "break";

const KEY = "openhand-lab-ruleset";
let current: LabRuleset = "climb";

export function getLabRuleset(): LabRuleset {
  try {
    const v = globalThis.localStorage?.getItem(KEY);
    if (v === "break") current = "break";
    else if (v === "climb" || v === "classic") current = "climb";
  } catch {
    /* vitest / private mode */
  }
  return current;
}

export function setLabRuleset(r?: string): void {
  current = r === "break" ? "break" : "climb";
  try {
    globalThis.localStorage?.setItem(KEY, current);
  } catch {
    /* ignore */
  }
}

/** 读招战役 / 训练馆 / 示范：气力承诺或旧空间拆招。踢馆爬塔为 false。 */
export function isBreakAlign(): boolean {
  return getLabRuleset() === "break";
}

/** 学堂/新手关才铺将破将让；正式开踢只留打/空/跳过。 */
export function isBreakLesson(b: { labBreakLesson?: boolean }): boolean {
  return Boolean(b.labBreakLesson);
}
