import { VALUE_BOUNDS } from "./bounds";
import { isMechanismHook, SCHOOLS } from "./hooks";

/** 四张注册表共用的字段。kind 的取值各表自己的枚举。 */
export interface ContractRow {
  id: string;
  cost: number;
  school: string;
  kind: string;
  effectHooks: readonly string[];
  values: Record<string, number>;
  text: string;
}

const SCHOOL_SET = new Set<string>(SCHOOLS);

export function validateRow(
  row: ContractRow,
  opt: { kinds: readonly string[]; requireDigit: boolean },
): string[] {
  const problems: string[] = [];
  if (!row.id || /\s/.test(row.id)) problems.push("id");
  if (!Number.isInteger(row.cost) || row.cost < 1) problems.push("cost");
  if (!SCHOOL_SET.has(row.school)) problems.push("school");
  if (!opt.kinds.includes(row.kind)) problems.push("kind");
  if (row.effectHooks.length === 0) problems.push("hook");
  for (const hook of row.effectHooks) {
    if (!isMechanismHook(hook)) problems.push(`hook:${hook}`);
  }
  for (const [key, n] of Object.entries(row.values)) {
    const bound = VALUE_BOUNDS[key];
    if (!Number.isFinite(n) || (bound && (n < bound.min || n > bound.max))) problems.push(`value:${key}`);
  }
  if (opt.requireDigit && !/[0-9]/.test(row.text)) problems.push("text");
  return problems;
}

export interface Hold<T> {
  row: T;
  problems: string[];
}

export function splitByContract<T extends { id: string }>(
  rows: readonly T[],
  problemsFor: (row: T) => string[],
): { registry: Record<string, T>; holds: Hold<T>[] } {
  const registry: Record<string, T> = {};
  const holds: Hold<T>[] = [];
  for (const row of rows) {
    const problems = problemsFor(row);
    if (problems.length > 0) holds.push({ row, problems });
    else registry[row.id] = row;
  }
  return { registry, holds };
}
