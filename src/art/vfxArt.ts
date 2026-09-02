import { artUrl } from "./artUrl";

/** 刀光特效（黑底白墨，screen 混合）。来源：样式图提取，见 scripts/extract_slash.py。 */
export type VfxId = "slash_arc" | "slash_line";

export function vfxUrl(id: VfxId): string {
  return artUrl(`art/vfx/${id}.png`);
}

/** 战斗演出事件 → 站位上的刀光层。kill/break/counter 落敌位，wall 落己位。 */
export function slashForFx(fx: string | undefined, side: "you" | "foe"): VfxId | null {
  if (!fx) return null;
  if (side === "foe" && fx === "kill") return "slash_arc";
  if (side === "foe" && (fx === "break" || fx === "counter" || fx === "cardHit")) return "slash_line";
  if (side === "you" && fx === "wall") return "slash_line";
  return null;
}
