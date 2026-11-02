import { MECH_CARDS } from "../../src/game/content/cards/mechPool";
import type { Battle, CardId, WeaponId } from "../../src/game/types";
import type { SimFlags } from "./flags";

const STAFF_IDS: CardId[] = ["staffPrime", "staffSettle", "staffBurst"];
const DART_IDS: CardId[] = ["dartFlick", "dartCut", "dartThrow", "dartPin", "dartFan", "dartKeep", "dartStep"];
const COPIES = 3;

function put(b: Battle, id: CardId, uid: string): void {
  if (!MECH_CARDS[id]) return;
  b.drawPile.unshift({ uid, defId: id });
}

export function injectMechKit(b: Battle, school: WeaponId, flags: SimFlags, seed: number): void {
  const ids = school === "staff" && flags.charge !== "off" ? STAFF_IDS : school === "dart" && flags.dart !== "off" ? DART_IDS : [];
  if (!ids.length) return;
  let n = 0;
  for (const id of ids) {
    for (let c = 0; c < COPIES; c++) {
      n += 1;
      put(b, id, `n2${school}${seed}-${n}`);
    }
  }
  const lead = ids[0]!;
  if (b.hand.length) b.hand[b.hand.length - 1] = { uid: `n2h${seed}`, defId: lead };
}
