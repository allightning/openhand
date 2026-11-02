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

/** 单招流：抽堆/手牌只留这几张。 */
export function injectThinKit(b: Battle, ids: CardId[], seed: number): void {
  if (!ids.length) return;
  const pile: Battle["drawPile"] = [];
  let n = 0;
  for (const id of ids) {
    for (let c = 0; c < COPIES * 2; c++) {
      n += 1;
      pile.push({ uid: `n4thin${seed}-${n}`, defId: id });
    }
  }
  b.drawPile = pile;
  b.discardPile = [];
  b.hand = ids.slice(0, Math.min(5, ids.length)).map((id, i) => ({ uid: `n4thinh${seed}-${i}`, defId: id }));
}

/** 成长注入：在起手抽堆上加这几张，不换掉原配装。 */
export function injectExtraCards(b: Battle, ids: CardId[], seed: number): void {
  ids.forEach((id, i) => {
    b.drawPile.push({ uid: `n6g${seed}-${i}`, defId: id });
  });
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
