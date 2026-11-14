import { existsSync, readdirSync, readFileSync } from "fs";

const DIR = "docs/combat";
const MAX_MS = 6 * 60 * 60 * 1000;
const STEP_MS = 60_000;

function reportPath(): string | null {
  const named = `${DIR}/MECH5_REPORT_20261102.md`;
  if (existsSync(named)) return named;
  if (!existsSync(DIR)) return null;
  const hit = readdirSync(DIR)
    .filter((f) => /^MECH5_REPORT.*\.md$/.test(f))
    .sort()
    .at(-1);
  return hit ? `${DIR}/${hit}` : null;
}

export function mech5Status(): { ready: boolean; note: string; path: string | null } {
  const path = reportPath();
  if (!path) return { ready: false, note: "docs/combat/MECH5_REPORT*.md 还没有", path: null };
  const text = readFileSync(path, "utf8");
  if (/等待超时/.test(text)) return { ready: false, note: `${path} 写了等待超时`, path };
  const ready = /全绿|exit 0|绿/.test(text);
  return { ready, note: ready ? `${path} 齐且绿` : `${path} 在但不算绿`, path };
}

export async function waitMech5(): Promise<{ ready: boolean; note: string; path: string | null }> {
  const start = Date.now();
  while (Date.now() - start < MAX_MS) {
    const st = mech5Status();
    if (st.ready) return st;
    const left = MAX_MS - (Date.now() - start);
    if (left < STEP_MS) break;
    await new Promise((r) => setTimeout(r, Math.min(STEP_MS, left)));
  }
  const st = mech5Status();
  if (st.ready) return st;
  return { ...st, note: `等待超时（最多 6 小时）。${st.note}` };
}
