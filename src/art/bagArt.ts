/** 行囊货色贴图 — AI 图标在 /art/bag/{id}.png；缺图时回落近似色块图。 */
import type { BagGoodsId } from "../game/bag";

const FALLBACK: Partial<Record<BagGoodsId, string>> = {
  forgeIron: "copper",
  forgeCoal: "charcoal",
  forgeOil: "tonic",
};

export function bagArtSrc(id: BagGoodsId | string): string {
  const file = FALLBACK[id as BagGoodsId] ?? id;
  return `/art/bag/${file}.png`;
}

export function bagArtMarkup(id: BagGoodsId | string, cls = ""): string {
  return `<img class="bag-art${cls ? ` ${cls}` : ""}" src="${bagArtSrc(id)}" alt="" draggable="false" />`;
}
