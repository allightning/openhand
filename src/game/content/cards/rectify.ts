/**
 * 卡池整改表。口径：docs/combat/CARD_POOL_PLAN_20261021.md。
 * Notion 逐张表本窗读不到，不另加稿面没有的调价。
 * ultSaber / ultSword 只调费，不改挂。
 */

export const DELETED_IDS = [
  "combo",
  "comboTax",
  "comboPay",
  "chain",
  "chain2",
  "lateChain",
  "weave",
  "salve",
  "follow2",
  "gather2",
  "tide",
  "bindwound",
  "lateMute",
  "latePouch",
  "lateMirror",
  "lateLeech",
  "ironPulse",
  "twinpalm",
  "follow",
  "charge2",
  "echo",
  "peonyBrew",
  "cauterize",
  "haste2",
] as const;

export const DELETED = new Set<string>(DELETED_IDS);

/** 通用 → 主语系 */
export const RETAG: Record<string, string> = {
  push: "palm",
  strike2: "palm",
  push2: "palm",
  sweep: "palm",
  pierce: "palm",
  buryKnock: "palm",
  cut: "saber",
  venomFog: "saber",
  lateBleed: "saber",
  buryBleed: "saber",
  direct: "sword",
  rift: "sword",
  thrust: "spear",
  plant: "staff",
  hookpull: "hook",
};

/** 交叉系里写明改挂的 6 张。 */
export const CROSS_MOVE: Record<string, string> = {
  bleedcut: "saber",
  spearLock: "sword",
  swordMute: "saber",
  drunkFist: "saber",
  hitSpear: "sword",
  hitStaff: "palm",
};

/** 两张绝招：改效果还是改挂，表上没拍。进 CARD_HOLDS，不改系。 */
export const CROSS_HOLD: Record<string, string> = {
  ultSaber: "交叉系未拍：击退是拳主语，刀绝招带击退。改效果或改挂，本包不自己拍。",
  ultSword: "交叉系未拍：裂创是刀主语，剑绝招带裂创。改效果或改挂，本包不自己拍。",
};

/** 稿 §4。已删的 weave / 牡丹酿 / 烙口不在这里调。 */
export const RECOST: Record<string, number> = {
  defend2: 2,
  advance2: 2,
  backpalm: 1,
  mend2: 2,
  gather: 2,
  setup: 2,
  ironform: 3,
  marking: 2,
  mirror: 2,
  burySlash: 2,
  buryBleed: 2,
  buryKnock: 2,
  buryWard: 2,
  sidestep: 2,
  retreat: 1,
  suture: 2,
  qiPulse: 2,
  qiFlood: 3,
  pouchSeal: 2,
  ultQiBurst: 4,
  ultIronWall: 4,
  ultSaber: 4,
  ultSword: 4,
  ultSpear: 4,
  ultStaff: 4,
  ultHook: 4,
  ultPalm: 4,
  comboSaber: 3,
  comboSpear: 3,
  comboSword: 3,
  comboStaff: 3,
  comboHook: 3,
  wardPalm: 1,
  auraPalm: 2,
  wardSaber: 1,
  auraSaber: 2,
  wardSword: 1,
  auraSword: 2,
  wardSpear: 1,
  auraSpear: 2,
  wardStaff: 1,
  auraStaff: 2,
  wardHook: 1,
  auraHook: 2,
};

export const TARGET_SCHOOL: Record<string, number> = {
  any: 43,
  palm: 16,
  saber: 17,
  sword: 15,
  spear: 11,
  staff: 14,
  hook: 15,
};
