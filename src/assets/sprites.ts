/**
 * 预生成 PNG 索引。运行时只引用路径，禁止 ctx/svg 画 NPC。
 * 资源位于 public/art/stand 与 public/art/sprites。
 */
import { standSrc, standFile, hasStand } from "../art/portraits";
import { npcById } from "../map/npc";

export type SpriteCategory = "portrait" | "npc" | "furnish";

/** 场景小人：优先 stand 板（与对话头像同源，风格统一） */
export function getNpcMapSrc(npcId: string): string {
  if (hasStand(npcId) || npcById(npcId)) return standSrc(npcId, true);
  return "/art/stand/alley.png";
}

export function getPortraitSrc(npcId: string): string {
  return standSrc(npcId, true);
}

export function getPortraitKey(npcId: string): string {
  return standFile(npcId);
}

export function getSprite(category: SpriteCategory, id: string): string {
  if (category === "portrait" || category === "npc") return getNpcMapSrc(id);
  return `/art/objs/obj-${id}.png`;
}
