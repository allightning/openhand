import { searchCatalog } from "../codexCatalog";
import { renderWikiSheet, type WikiBook } from "../encyclopedia";
import { emphasizeNumbers } from "./shellText";

const GAPS = [
  "图鉴册没有敌人。分册是绝、技、兵、状态、人物。",
];

export function codexFieldGaps(): string[] {
  const entries = [...searchCatalog("ult", ""), ...searchCatalog("skill", ""), ...searchCatalog("gear", "")];
  const noRarity = entries.filter((entry) => !entry.rarityLabel).length;
  const noFlavor = entries.filter((entry) => !entry.flavor).length;
  const noRelated = entries.filter((entry) => entry.related.length === 0).length;
  return [
    ...GAPS,
    `rarityLabel 空着 ${noRarity} 条，共 ${entries.length} 条。外功、心法、符、道具、兵刃经常不写。`,
    `flavor 空着 ${noFlavor} 条。`,
    `related 空着 ${noRelated} 条。`,
  ];
}

function liftRarity(html: string): string {
  return html.replace(/<article\b([^>]*)>([\s\S]*?)<\/article>/g, (full, attrs: string, inner: string) => {
    const found = inner.match(/品相：([^<\n]+)/);
    if (!found) return full;
    const label = found[1].replace(/<[^>]+>/g, "").trim();
    if (!label) return full;
    return `<article${attrs} data-rarity-label="${label}"><em class="shell-rarity">${label}</em>${inner}</article>`;
  });
}

export function renderShellCodex(book: WikiBook, page: number, query = ""): string {
  const html = renderWikiSheet(book, page, query)
    .replace('class="lab-wiki-panel lab-iron-sheet"', 'class="lab-wiki-panel lab-iron-sheet shell-codex" data-shell="codex"')
    .replace('class="lab-wiki-tabs"', 'class="lab-wiki-tabs" data-overlap-group="codex-tabs"')
    .replace('class="lab-wiki-head-tools"', 'class="lab-wiki-head-tools" data-overlap-group="codex-tools"')
    .replace('class="lab-wiki-foot"', 'class="lab-wiki-foot" data-overlap-group="codex-foot"')
    .replace('class="lab-wiki-empty"', 'class="lab-wiki-empty shell-empty"');
  return liftRarity(emphasizeNumbers(html));
}
