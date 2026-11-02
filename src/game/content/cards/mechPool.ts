import type { CardDef, CardId } from "../../types";
import { DART_CARDS } from "./dart";
import { STAFF_CHARGE_CARDS } from "./staffCharge";

export const MECH_CARDS: Partial<Record<CardId, CardDef>> = {
  ...STAFF_CHARGE_CARDS,
  ...DART_CARDS,
};
