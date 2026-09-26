import { MOVE_CARD_IDS } from "../game/intentWeakness";
import { previewCard } from "../game/sim";
import { shellRunContext } from "./shellContext";
import type { Battle, Preview } from "../game/types";

/** 落脚小人只跟位移牌悬停走：非位移、未悬停都不给预览。 */
export function moveGhostPreview(b: Battle, hoverUid: string | null): Preview | null {
  if (!hoverUid) return null;
  const inst = b.hand.find((c) => c.uid === hoverUid);
  if (!inst || !MOVE_CARD_IDS.includes(inst.defId)) return null;
  return previewCard(b, hoverUid, shellRunContext());
}
