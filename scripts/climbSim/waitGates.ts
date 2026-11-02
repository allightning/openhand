import { existsSync, readFileSync } from "fs";

const GUASHOW = "docs/combat/GUASHOW_REPORT_20261102.md";
const NUMGEN2 = "docs/combat/NUMGEN2_REPORT_20261102.md";
const MAX_MS = 6 * 60 * 60 * 1000;
const STEP_MS = 600_000;

function green(path: string): { ok: boolean; why: string } {
  if (!existsSync(path)) return { ok: false, why: `${path} 还没有` };
  const text = readFileSync(path, "utf8");
  if (/等待超时/.test(text)) return { ok: false, why: `${path} 写了等待超时` };
  const ok = /全绿|exit 0|typecheck:combat.*0|绿/.test(text) && !/开工红|仍红/.test(text.slice(0, 800));
  if (!ok) return { ok: false, why: `${path} 在但不算绿` };
  return { ok: true, why: `${path} 齐且绿` };
}

export function gateStatus(): { ready: boolean; note: string } {
  const a = green(GUASHOW);
  const b = green(NUMGEN2);
  const ready = a.ok && b.ok;
  return { ready, note: `${a.why}。${b.why}。` };
}

export async function waitGates(now = Date.now()): Promise<{ ready: boolean; note: string; waitedMs: number }> {
  const start = now;
  while (Date.now() - start < MAX_MS) {
    const st = gateStatus();
    if (st.ready) return { ready: true, note: `W1/W2 齐绿。${st.note}`, waitedMs: Date.now() - start };
    const left = MAX_MS - (Date.now() - start);
    if (left < STEP_MS) break;
    await new Promise((r) => setTimeout(r, STEP_MS));
  }
  const st = gateStatus();
  if (st.ready) return { ready: true, note: `W1/W2 齐绿。${st.note}`, waitedMs: Date.now() - start };
  return { ready: false, note: `等待超时（最多 6 小时）。先交 P1。${st.note}`, waitedMs: Date.now() - start };
}
