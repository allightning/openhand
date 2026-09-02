export function resolveTipText(dataTip: string | undefined, inlineTip: string | undefined): string {
  const fromData = dataTip?.trim();
  if (fromData) return fromData;
  return inlineTip?.trim() ?? "";
}

const DELAY_MS = 350;

let tipEl: HTMLDivElement | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let anchor: HTMLElement | null = null;

function ensureTip(): HTMLDivElement {
  if (!tipEl) {
    tipEl = document.createElement("div");
    tipEl.className = "lab-tip-float";
    tipEl.hidden = true;
    document.body.appendChild(tipEl);
  }
  return tipEl;
}

export function hideTip(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  anchor = null;
  if (tipEl) tipEl.hidden = true;
}

function showTip(el: HTMLElement, text: string): void {
  const tip = ensureTip();
  tip.textContent = text;
  tip.hidden = false;
  const r = el.getBoundingClientRect();
  const tw = tip.offsetWidth;
  let left = r.left + r.width / 2 - tw / 2;
  left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));
  let top = r.top - tip.offsetHeight - 8;
  if (top < 8) top = r.bottom + 8;
  tip.style.left = `${left}px`;
  tip.style.top = `${top}px`;
}

/** 状态、外功、换人、助战、技能牌、招式段：凡 data-tip 或内联 .status-tip 都挂浮动层。 */
export function collectTipHosts(root: ParentNode): HTMLElement[] {
  const hosts = new Set<HTMLElement>();
  for (const el of root.querySelectorAll<HTMLElement>("[data-tip]")) {
    hosts.add(el);
  }
  for (const tip of root.querySelectorAll<HTMLElement>(".status-tip")) {
    const host = tip.parentElement;
    if (host) hosts.add(host);
  }
  return [...hosts];
}

/** 浮动简介：data-tip 与 .status-tip 走同一层；title 作兜底，避免浮动层失败时问号无内容。 */
export function bindLabTooltips(root: HTMLElement): void {
  hideTip();
  for (const el of collectTipHosts(root)) {
    const inline = el.querySelector<HTMLElement>(":scope > .status-tip");
    const text = resolveTipText(el.dataset.tip, inline?.textContent ?? undefined);
    if (!text) {
      el.removeAttribute("title");
      continue;
    }
    el.setAttribute("title", text);
    const delay = el.closest(".gauntlet-overlay") ? 500 : DELAY_MS;
    el.addEventListener("mouseenter", () => {
      const again = resolveTipText(
        el.dataset.tip,
        el.querySelector<HTMLElement>(":scope > .status-tip")?.textContent ?? undefined,
      );
      if (!again) return;
      anchor = el;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (anchor === el) showTip(el, again);
      }, delay);
    });
    el.addEventListener("mouseleave", hideTip);
    el.addEventListener("click", hideTip);
  }
}

export function unbindLabTooltips(): void {
  hideTip();
}
