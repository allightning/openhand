import type { Battle } from "../../game/types";
import { foeStanceShiftLine, foeVariantRumor, foeWindowLine } from "../storyBeats";
import { escapeHtml } from "../setupUi";

export type ShiftKind = "" | "turtle" | "skirmish" | "fallback";

export function stanceShiftKey(line: string): string | undefined {
  const text = line.trim();
  if (!text.startsWith("foeStanceShift")) return undefined;
  if (text === "foeStanceShift" || text.startsWith("foeStanceShift:")) return text;
  const from = /([A-Za-z]+)→/.exec(text)?.[1] ?? "";
  if (from === "turtle") return "foeStanceShift:turtle";
  if (from === "skirmish" || from === "wander") return "foeStanceShift:skirmish";
  return "foeStanceShift";
}

function shiftKind(key: string): ShiftKind {
  if (key === "foeStanceShift:turtle") return "turtle";
  if (key === "foeStanceShift:skirmish" || key === "foeStanceShift:wander") return "skirmish";
  return "fallback";
}

/** 最近八条播报。敌窗键和换势键都换成白描，靠后的那条优先。 */
export function recentBroadcast(log: string[] | undefined): { text: string; shift: ShiftKind } {
  const tail = (log ?? []).slice(-8);
  for (let i = tail.length - 1; i >= 0; i--) {
    const raw = tail[i] ?? "";
    const win = foeWindowLine(raw);
    if (win) return { text: win, shift: "" };
    const key = stanceShiftKey(raw);
    const line = key ? foeStanceShiftLine(key) : undefined;
    if (line && key) return { text: line, shift: shiftKind(key) };
  }
  return { text: "", shift: "" };
}

export function variantRumorKey(variant: string | undefined): string | undefined {
  if (!variant) return undefined;
  const tail = variant.includes(":") ? variant.slice(variant.lastIndexOf(":") + 1) : variant;
  if (tail === "wander" || tail.startsWith("wander") || tail.startsWith("skirmish")) return "foeVariant:skirmish";
  if (tail.startsWith("turtle")) return "foeVariant:turtle";
  if (tail.startsWith("brute")) return "foeVariant:brute";
  return undefined;
}

export function renderFoeRumor(b: Battle): string {
  const bought = (b as Battle & { intelTier?: string }).intelTier ?? "";
  const tier = bought === "detail" || bought === "core" ? bought : "";
  const key = variantRumorKey(b.foeVariant);
  const line = key ? foeVariantRumor(key) : undefined;
  const source = line ? "field" : "placeholder";
  const hidden = line ? "" : " hidden";
  return `<p class="lab-foe-rumor" data-intel-slot="rumor" data-foe-rumor-source="${source}" data-bought-tier="${escapeHtml(tier)}"${hidden}>${line ? escapeHtml(line) : ""}</p>`;
}

export function rematchOpenMark(flags: string[] | undefined): { open: "" | "seat" | "elite"; source: "field" | "placeholder" } {
  const list = flags ?? [];
  if (!list.includes("s2page:s2-revive-rematch")) return { open: "", source: "placeholder" };
  if (list.includes("rematch-seat")) return { open: "seat", source: "field" };
  if (list.includes("rematch-elite")) return { open: "elite", source: "field" };
  return { open: "", source: "placeholder" };
}
