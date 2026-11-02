import { battleEquippedSchool } from "../../src/game/equippedWeapon";
import { MOVE_CARD_IDS } from "../../src/game/intentWeakness";
import { labCard } from "../../src/game/labContent";
import { SCHOOL_REACH, cardSchool } from "../../src/game/party";
import { dartFormAllows } from "../../src/game/rules/dartPin";
import type { RunContext } from "../../src/game/runContext";
import { spearReachDamage } from "../../src/game/rogueRoster";
import { canPlay, livingFoes } from "../../src/game/sim";
import type { Battle, CardId, CardInst } from "../../src/game/types";

const MOVE_IDS = new Set<string>([...MOVE_CARD_IDS, "dartStep"]);

export function foeDist(b: Battle): number | null {
  const foe = livingFoes(b)[0];
  if (!foe) return null;
  return Math.abs(foe.pos - b.player.pos);
}

export function isMoveCard(id: string): boolean {
  return MOVE_IDS.has(id);
}

export function attackCanHit(b: Battle, defId: CardId, rc: RunContext): boolean {
  const def = labCard(defId, rc);
  if (def.type !== "attack") return false;
  const dist = foeDist(b);
  if (dist == null) return false;
  const cardSch = cardSchool(defId);
  const school = cardSch === "any" ? battleEquippedSchool(b, b.active, rc) : cardSch;
  if (school === "spear") return spearReachDamage(dist) != null;
  if (school === "dart") return dartFormAllows(def.dartForm, dist);
  return dist <= SCHOOL_REACH[school];
}

export function canPlayMove(b: Battle, card: CardInst, rc: RunContext): boolean {
  return isMoveCard(card.defId) && canPlay(b, card.uid, rc).ok;
}

export function canPlayAttack(b: Battle, card: CardInst, rc: RunContext): boolean {
  return attackCanHit(b, card.defId, rc) && canPlay(b, card.uid, rc).ok;
}

/** 这一手没有打得中的攻击，也没有位移可出。 */
export function handIsEmpty(b: Battle, rc: RunContext): boolean {
  let attack = false;
  let move = false;
  for (const card of b.hand) {
    if (canPlayAttack(b, card, rc)) attack = true;
    if (canPlayMove(b, card, rc)) move = true;
  }
  return !attack && !move;
}
