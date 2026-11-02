import type { CardDef } from "../../types";

/** 棍蓄力代表牌。不进 CARD_REGISTRY。 */
export const STAFF_CHARGE_CARDS: Record<string, CardDef> = {
  staffSettle: {
    id: "staffSettle",
    name: "沉肩",
    cost: 2,
    type: "skill",
    school: "staff",
    text: "格挡 12。蓄力 +1，不攻击。",
    flavor: "棍横在肩上。这一手只加层。",
    block: 12,
    chargeGain: 1,
  },
  staffPrime: {
    id: "staffPrime",
    name: "压棍",
    cost: 1,
    type: "skill",
    school: "staff",
    text: "格挡 6。蓄力 +1，不攻击。",
    flavor: "棍尖点地。层先叠上。",
    block: 6,
    chargeGain: 1,
  },
  staffBurst: {
    id: "staffBurst",
    name: "开棍",
    cost: 3,
    type: "attack",
    school: "staff",
    text: "消费全部蓄力层打高伤。1 层 44。",
    flavor: "层数兑完。棍扫出去。",
    chargeBurst: true,
  },
};
