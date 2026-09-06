import { CARDS } from "../game/content";
import type { Battle } from "../game/types";
import { escapeHtml } from "./setupUi";

export type BattleSheetKind = "draw" | "journal";

export function renderBattleSheet(kind: BattleSheetKind, b: Battle): string {
  if (kind === "draw") {
    const next = b.drawPile[0];
    const nextName = next ? (CARDS[next.defId]?.name ?? next.defId) : "无";
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
    return sheet("残谱", `还剩 ${b.drawPile.length} 张 · 下一张 ${nextName}`, rows || `<li>空袖。</li>`);
  }
  const atk = b.v2AttackPlays ?? 0;
  const brk = b.v2BreakCount ?? 0;
  const swaps = b.v2SwapCount ?? 0;
  const rows = [
    `<li><b>出刀</b><span>${atk} 张攻击牌</span></li>`,
    `<li><b>拆招</b><span>${brk} 段</span></li>`,
    `<li><b>换人</b><span>${swaps} 次</span></li>`,
    `<li><b>回合</b><span>第 ${b.turn} 息</span></li>`,
    `<li><b>气血</b><span>${b.player.hp} / ${b.player.maxHp}</span></li>`,
  ].join("");
  return sheet("本馆", "这一馆打到现在 · 刚打完的招看中轴播报", rows);
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
