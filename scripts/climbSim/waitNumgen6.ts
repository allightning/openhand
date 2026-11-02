import { existsSync, readFileSync } from "fs";

const NUMGEN6 = "docs/combat/NUMGEN6_REPORT_20261102.md";
const MAX_MS = 6 * 60 * 60 * 1000;
const STEP_MS = 600_000;

export function numgen6Status(): { ready: boolean; note: string } {
  if (!existsSync(NUMGEN6)) return { ready: false, note: `${NUMGEN6} 还没有` };
  const text = readFileSync(NUMGEN6, "utf8");
  if (/等待超时/.test(text)) return { ready: false, note: `${NUMGEN6} 写了等待超时` };
  const ready = /全绿|exit 0|绿/.test(text);
  return { ready, note: ready ? `${NUMGEN6} 齐且绿` : `${NUMGEN6} 在但不算绿` };
}

export async function waitNumgen6(): Promise<{ ready: boolean; note: string }> {
  const start = Date.now();
  while (Date.now() - start < MAX_MS) {
    const st = numgen6Status();
    if (st.ready) return st;
    const left = MAX_MS - (Date.now() - start);
    if (left < STEP_MS) break;
    await new Promise((r) => setTimeout(r, STEP_MS));
  }
  const st = numgen6Status();
  if (st.ready) return st;
  return { ...st, note: `等待超时（最多 6 小时）。${st.note}` };
}
