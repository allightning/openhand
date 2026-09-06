import { artUrl } from "./artUrl";

/** 刀光特效（透明底黑墨）。来源：样式图提取后去底，见 scripts/extract_slash.py。 */
export type VfxId = "slash_arc" | "slash_line";

export function vfxUrl(id: VfxId): string {
  return artUrl(`art/vfx/${id}.png`);
}

/**
 * 战斗演出 → 刀光挂在「挨打的那一侧」。
 * 敌打我 / 让刀 / 撞墙 → 己位；拆/反打/斩杀/己方出手 → 敌位。
 */
export function slashForFx(fx: string | undefined, side: "you" | "foe"): VfxId | null {
  if (!fx) return null;
  if (side === "you" && (fx === "hit" || fx === "graze" || fx === "wall")) return "slash_line";
  if (side === "foe" && fx === "kill") return "slash_arc";
  if (side === "foe" && (fx === "break" || fx === "counter" || fx === "cardHit")) return "slash_line";
  return null;
}
