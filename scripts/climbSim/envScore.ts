import type { Battle, CardDef, CardId } from "../../src/game/types";
import { isMoveCard } from "./hand";

export function envAdj(b: Battle, id: CardId, def: CardDef): number {
  let n = 0;
  const burn = b.burnCells ?? [];
  if (b.envTag === "burn" && burn.includes(b.player.pos)) {
    if ((def.steps ?? 0) !== 0 || isMoveCard(id)) n += 48;
  }
  if (b.envTag === "nowall" && (def.knock ?? 0) > 0) n -= 28;
  return n;
}
