export type LabRuleset = "break";

const KEY = "openhand-lab-ruleset";

/** 产品只留肉鸽踢馆。旧 localStorage `classic` 读到也当 break。 */
export function getLabRuleset(): LabRuleset {
  try {
    localStorage.setItem(KEY, "break");
  } catch {
    /* vitest / private mode */
  }
  return "break";
}

/** 保留调用点；对战版已删除，写入一律 break。 */
export function setLabRuleset(_r?: string): void {
  try {
    localStorage.setItem(KEY, "break");
  } catch {
    /* ignore */
  }
}

export function isBreakAlign(): boolean {
  return true;
}

/** 学堂/新手关才铺将破将让；正式开踢只留打/空/跳过。 */
export function isBreakLesson(b: { labBreakLesson?: boolean }): boolean {
  return Boolean(b.labBreakLesson);
}
