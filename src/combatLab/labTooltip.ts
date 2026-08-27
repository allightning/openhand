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

/** 浮动 tooltip：立绘/牌堆等；状态/外功/动作条用 inline `.status-tip`。 */
export function bindLabTooltips(root: HTMLElement): void {
  hideTip();
  root.querySelectorAll<HTMLElement>("[data-tip]:not(.card)").forEach((el) => {
    if (el.querySelector(".status-tip")) return;
    el.removeAttribute("title");
    const delay = el.closest(".gauntlet-overlay") ? 500 : DELAY_MS;
    el.addEventListener("mouseenter", () => {
      const text = el.dataset.tip?.trim();
      if (!text) return;
      anchor = el;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (anchor === el) showTip(el, text);
      }, delay);
    });
    el.addEventListener("mouseleave", hideTip);
    el.addEventListener("click", hideTip);
  });
  bindActionRowInlineTips(root);
}

/** 动作条 inline 简介：fixed 定位，不占布局、不被手牌层遮挡。 */
function bindActionRowInlineTips(root: HTMLElement): void {
  const row = root.querySelector(".lab-action-row");
  if (!row) return;
  for (const host of row.querySelectorAll<HTMLElement>(
    ".swap-btn, .assist-btn, .lab-action-tip-wrap, .lab-assist-active-badge, .lab-aura-chip",
  )) {
    const tip = host.querySelector<HTMLElement>(".status-tip");
    if (!tip) continue;
    const place = () => {
      const r = host.getBoundingClientRect();
      tip.style.setProperty("--lab-tip-x", `${r.left + r.width / 2}px`);
      tip.style.setProperty("--lab-tip-y", `${r.top - 6}px`);
    };
    host.addEventListener("mouseenter", place);
    host.addEventListener("focusin", place);
  }
}

export function unbindLabTooltips(): void {
  hideTip();
}
