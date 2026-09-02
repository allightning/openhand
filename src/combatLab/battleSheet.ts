import { CARDS } from "../game/content";
import type { Battle } from "../game/types";
import { escapeHtml } from "./setupUi";

export type BattleSheetKind = "draw" | "journal";

export function renderBattleSheet(kind: BattleSheetKind, b: Battle): string {
  if (kind === "draw") {
    const counts = new Map<string, { name: string; text: string; n: number }>();
    for (const c of b.drawPile) {
      const def = CARDS[c.defId];
      const name = def?.name ?? c.defId;
      const prev = counts.get(c.defId);
      if (prev) prev.n += 1;
      else counts.set(c.defId, { name, text: def?.text ?? "", n: 1 });
    }
    const rows = [...counts.values()]
      .sort((a, b) => a.name.localeCompare(b.name, "zh"))
      .map(
        (row) =>
          `<li><b>${escapeHtml(row.name)}${row.n > 1 ? ` ×${row.n}` : ""}</b><span>${escapeHtml(row.text)}</span></li>`,
      )
      .join("");
    return sheet("残谱", `还剩 ${b.drawPile.length} 张`, rows || `<li>空袖。</li>`);
  }
  const rows = [...b.journal]
    .reverse()
    .slice(0, 48)
    .map(
      (j) =>
        `<li class="j-${j.side}"><b>${j.side === "you" ? "己" : "敌"}</b><span>${escapeHtml(j.text)}</span></li>`,
    )
    .join("");
  return sheet("战记", `${b.journal.length} 条 · 新的在上`, rows || `<li>尚无记录。</li>`);
}

function sheet(title: string, sub: string, rows: string): string {
  return `
    <div class="lab-overlay lab-pile-mask" id="pile-mask">
      <div class="lab-overlay-panel lab-pile-sheet" role="dialog" aria-labelledby="pile-sheet-title">
        <header class="hall-chrome">
          <button type="button" class="lab-btn hall-back" id="pile-sheet-close">收</button>
          <div class="hall-chrome-title">
            <h2 id="pile-sheet-title">${escapeHtml(title)}</h2>
            <p>${escapeHtml(sub)}</p>
          </div>
        </header>
        <ul class="lab-pile-list">${rows}</ul>
      </div>
    </div>`;
}
