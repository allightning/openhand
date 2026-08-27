/**
 * 资源索引。
 * - portrait / dialogue bust：可用 stand 立绘
 * - npc map（局内小人）：只能用 /art/sprites/sprite-*.png，严禁 stand
 */
import { standSrc, standFile } from "../art/portraits";
import { spriteSrc } from "../map/tileset";

export type SpriteCategory = "portrait" | "npc" | "furnish";

/** 局内模型 —— 绝对禁止返回 /art/stand/ */
export function getNpcMapSrc(npcId: string): string {
  const src = spriteSrc(npcId);
  if (src.includes("/art/stand/")) {
    throw new Error(`禁止用立绘作局内模型: ${npcId} -> ${src}`);
  }
  return src;
}

/** 对话栏头像 —— 可用 stand */
export function getPortraitSrc(npcId: string): string {
  return standSrc(npcId, true);
}

export function getPortraitKey(npcId: string): string {
  return standFile(npcId);
}

export function getSprite(category: SpriteCategory, id: string): string {
  if (category === "portrait") return getPortraitSrc(id);
  if (category === "npc") return getNpcMapSrc(id);
  return `/art/objs/obj-${id}.png`;
}
