import { existsSync, readFileSync } from "fs";

const ROLE2 = "docs/combat/ROLE2_REPORT_20261102.md";
const MAX_MS = 6 * 60 * 60 * 1000;
const STEP_MS = 600_000;

export function role2Status(): { ready: boolean; poison: boolean; note: string } {
  if (!existsSync(ROLE2)) return { ready: false, poison: false, note: `${ROLE2} 还没有` };
  const text = readFileSync(ROLE2, "utf8");
  if (/等待超时/.test(text)) return { ready: false, poison: false, note: `${ROLE2} 写了等待超时` };
  const ready = /全绿|exit 0|绿/.test(text);
  const poison = /P3|毒结算|poison\.ts|淬毒/.test(text);
  return { ready, poison, note: ready ? `${ROLE2} 齐且绿${poison ? "，含毒结算" : ""}` : `${ROLE2} 在但不算绿` };
}

export async function waitRole2(): Promise<{ ready: boolean; poison: boolean; note: string }> {
  const start = Date.now();
  while (Date.now() - start < MAX_MS) {
    const st = role2Status();
    if (st.ready) return st;
    const left = MAX_MS - (Date.now() - start);
    if (left < STEP_MS) break;
    await new Promise((r) => setTimeout(r, STEP_MS));
  }
  const st = role2Status();
  if (st.ready) return st;
  return { ...st, note: `等待超时（最多 6 小时）。${st.note}` };
}
