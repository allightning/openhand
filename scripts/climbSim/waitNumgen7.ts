import { existsSync, readFileSync } from "fs";

const NUMGEN7 = "docs/combat/NUMGEN7_REPORT_20261102.md";
const MAX_MS = 6 * 60 * 60 * 1000;
const STEP_MS = 600_000;

export function numgen7Status(): { ready: boolean; note: string } {
  if (!existsSync(NUMGEN7)) return { ready: false, note: `${NUMGEN7} 还没有` };
  const text = readFileSync(NUMGEN7, "utf8");
  if (/等待超时/.test(text)) return { ready: false, note: `${NUMGEN7} 写了等待超时` };
  const ready = /全绿|exit 0|绿/.test(text);
  return { ready, note: ready ? `${NUMGEN7} 齐且绿` : `${NUMGEN7} 在但不算绿` };
}

export async function waitNumgen7(): Promise<{ ready: boolean; note: string }> {
  const start = Date.now();
  while (Date.now() - start < MAX_MS) {
    const st = numgen7Status();
    if (st.ready) return st;
    const left = MAX_MS - (Date.now() - start);
    if (left < STEP_MS) break;
    await new Promise((r) => setTimeout(r, STEP_MS));
  }
  const st = numgen7Status();
  if (st.ready) return st;
  return { ...st, note: `等待超时（最多 6 小时）。${st.note}` };
}
