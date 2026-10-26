import { emphasizeNumbers } from "./shellText";

function choiceNumbers(inner: string): string[] {
  const plain = inner.replace(/<[^>]+>/g, " ");
  return [...new Set([...plain.matchAll(/\d+/g)].map((m) => m[1]))].slice(0, 6);
}

function liftChoice(attrs: string, inner: string): string {
  const nums = choiceNumbers(inner);
  if (!nums.length) return `<button${attrs}>${inner}</button>`;
  const chips = nums.map((n) => `<b class="shell-num">${n}</b>`).join("");
  return `<button${attrs}><span class="shell-mech">${chips}</span>${inner}</button>`;
}

/** 选项上的数字提到按钮最前。正文里的数字保留。 */
export function renderShellEvent(inner: string): string {
  const lifted = emphasizeNumbers(inner).replace(
    /<button\b([^>]*\bdata-event-idx="\d+"[^>]*)>([\s\S]*?)<\/button>/g,
    (_, attrs: string, body: string) => liftChoice(attrs, body),
  );
  const marked = lifted
    .replace('class="gauntlet-wager-row"', 'class="gauntlet-wager-row" data-overlap-group="event-choices"')
    .replace('class="gauntlet-wager-actions"', 'class="gauntlet-wager-actions" data-overlap-group="event-go"');
  const empty = marked.includes("data-event-idx") ? "" : " shell-event-empty";
  return `<div class="shell-event${empty}" data-shell="event">${marked}</div>`;
}
