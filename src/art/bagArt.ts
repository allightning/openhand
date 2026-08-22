/** 行囊货色贴图 — AI 图标在 /art/bag/{id}.png */
import type { BagGoodsId } from "../game/bag";

export function bagArtSrc(id: BagGoodsId | string): string {
  return `/art/bag/${id}.png`;
}

export function bagArtMarkup(id: BagGoodsId | string, cls = ""): string {
  return `<img class="bag-art${cls ? ` ${cls}` : ""}" src="${bagArtSrc(id)}" alt="" draggable="false" />`;
}
