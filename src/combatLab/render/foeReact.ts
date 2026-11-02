import type { Battle } from "../../game/types";
import { escapeHtml } from "../setupUi";

const FOE_NAME: Record<string, string> = {
  dismantle: "拆招",
  bind: "缠手",
  read: "读破",
};

const RING = 327;

export function foeReactView(b: Battle): { html: string; note: string; source: "field" | "none" } {
  const mark = b.foeReact;
  if (!mark) return { html: "", note: "", source: "none" };
  const name = FOE_NAME[mark.kind] ?? "敌窗";
  const html = `<div class="lab-react-round is-foe" data-foe-react="1" data-foe-react-source="field" data-foe-instant="1" role="dialog" aria-label="敌">
    <svg class="lab-react-ring" viewBox="0 0 120 120" style="--react-sec:0s" aria-hidden="true"><circle cx="60" cy="60" r="52" class="lab-react-track"/><circle cx="60" cy="60" r="52" class="lab-react-arc is-full" stroke-dasharray="${RING}"/></svg>
    <p class="lab-react-name"><b>敌</b><em>${escapeHtml(name)}</em></p>
  </div>`;
  return { html, note: mark.note, source: "field" };
}
