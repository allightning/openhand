/**
 * 拆招开踢：起手劈掌 / 本系架、同系光环卡、异系融合卡。
 * 见 docs/combat/ROGUE_GRADIENT.md §5–§6。
 */
import type { CardId, RogueCardId, WeaponId } from "./types";
import { CARDS } from "./content/legacy";

export const ROGUE_SCHOOLS: WeaponId[] = ["palm", "saber", "sword", "spear", "staff", "hook"];

const SCHOOL_CAP: Record<WeaponId, Capitalize<WeaponId>> = {
  palm: "Palm",
  saber: "Saber",
  sword: "Sword",
  spear: "Spear",
  staff: "Staff",
  hook: "Hook",
};

export function wardCardId(school: WeaponId): RogueCardId {
  return `ward${SCHOOL_CAP[school]}`;
}

export function wardUpgradeId(school: WeaponId): string {
  return `ward${SCHOOL_CAP[school]}2`;
}

export function auraCardId(school: WeaponId): RogueCardId {
  return `aura${SCHOOL_CAP[school]}`;
}

export function fusionCardId(main: WeaponId, sub: WeaponId): RogueCardId {
  const ia = ROGUE_SCHOOLS.indexOf(main);
  const ib = ROGUE_SCHOOLS.indexOf(sub);
  const [x, y] = ia < ib ? [main, sub] : [sub, main];
  return `fuse${SCHOOL_CAP[x]}${SCHOOL_CAP[y]}`;
}

const LEGACY_CARD_ID: Record<string, CardId> = (() => {
  const out: Record<string, CardId> = {
    lateHand: "handCut",
    midGuard: "defend2",
    midPush: "push2",
    lateAnvil: "elbow",
    midStrike: "strike",
    flowTax: "gather",
    setupTax: "setup",
  };
  for (const s of ROGUE_SCHOOLS) {
    out[wardUpgradeId(s)] = wardCardId(s);
  }
  for (let i = 0; i < ROGUE_SCHOOLS.length; i++) {
    for (let j = i + 1; j < ROGUE_SCHOOLS.length; j++) {
      const a = ROGUE_SCHOOLS[i]!;
      const b = ROGUE_SCHOOLS[j]!;
      const canon = fusionCardId(a, b);
      out[`fuse${SCHOOL_CAP[b]}${SCHOOL_CAP[a]}`] = canon;
    }
  }
  return out;
})();

/** 旧档换名复制 id → 现行牌。 */
export function remapLegacyCardId(id: string): CardId {
  return (LEGACY_CARD_ID[id] ?? id) as CardId;
}

export function isRogueCardId(id: string): id is RogueCardId {
  return (
    id === "direct" ||
    id.startsWith("ward") ||
    id.startsWith("aura") ||
    id.startsWith("fuse") ||
    id.startsWith("hit") ||
    id.startsWith("status") ||
    id.startsWith("step")
  );
}

export function hitCardId(school: WeaponId): RogueCardId {
  return `hit${SCHOOL_CAP[school]}`;
}

export function statusCardId(school: WeaponId): RogueCardId {
  return `status${SCHOOL_CAP[school]}`;
}

export function statusCardId2(school: WeaponId): RogueCardId {
  return `status${SCHOOL_CAP[school]}2`;
}

export function stepCardId(school: WeaponId): RogueCardId {
  return `step${SCHOOL_CAP[school]}`;
}

export function pairFusionId(a: WeaponId, b: WeaponId): RogueCardId | null {
  if (a === b) return null;
  const ia = ROGUE_SCHOOLS.indexOf(a);
  const ib = ROGUE_SCHOOLS.indexOf(b);
  const [x, y] = ia < ib ? [a, b] : [b, a];
  return fusionCardId(x, y);
}

export const SCHOOL_MAIN_ATTACK: Record<WeaponId, CardId> = {
  saber: "cut",
  palm: "strike",
  sword: "pierce",
  spear: "thrust",
  staff: "split",
  hook: "hookpull",
};

export const SCHOOL_ULTIMATE: Record<WeaponId, CardId> = {
  saber: "ultSaber",
  palm: "ultPalm",
  sword: "ultSword",
  spear: "ultSpear",
  staff: "ultStaff",
  hook: "ultHook",
};

/** 换页：替换牌面，永不把进步/撤步换成 ±2。 */
export const BREAK_CARD_UPGRADES: Partial<Record<CardId, CardId>> = {
  defend: "defend2",
  mend: "mend2",
  strike: "strike2",
  finisher: "finisher2",
  drawcut: "burySlash",
  saberBleed: "buryBleed",
  push: "push2",
  elbow: "palmSeal",
  marking: "swordMute",
  bleedcut: "staffBind",
  hookDisarm: "close",
};

export function breakCardUpgrade(id: CardId): CardId | undefined {
  if (id === "advance" || id === "retreat" || id === "advance2") return undefined;
  return BREAK_CARD_UPGRADES[id];
}

/** 奖励池本系副攻（起手不含）。 */
export const SCHOOL_SUB_ATTACK: Record<WeaponId, CardId[]> = {
  saber: ["drawcut", "saberBleed", "rift"],
  palm: ["elbow", "push", "palmSeal"],
  sword: ["marking", "expose", "swordMute"],
  spear: ["spearLock"],
  staff: ["bleedcut", "plant", "staffBind"],
  hook: ["hookDisarm", "close"],
};

/** 六系各一张新增攻击 / 状态 / 本系进退（进奖励池与实验台）。 */
export const SCHOOL_EXTRA_HIT: Record<WeaponId, CardId> = {
  palm: "hitPalm",
  saber: "hitSaber",
  sword: "hitSword",
  spear: "hitSpear",
  staff: "hitStaff",
  hook: "hitHook",
};
export const SCHOOL_EXTRA_STATUS: Record<WeaponId, CardId> = {
  palm: "statusPalm",
  saber: "statusSaber",
  sword: "statusSword",
  spear: "statusSpear",
  staff: "statusStaff",
  hook: "statusHook",
};
export const SCHOOL_EXTRA_STATUS2: Record<WeaponId, CardId> = {
  palm: "statusPalm2",
  saber: "statusSaber2",
  sword: "statusSword2",
  spear: "statusSpear2",
  staff: "statusStaff2",
  hook: "statusHook2",
};
export const SCHOOL_SCHOOL_STEP: Record<WeaponId, CardId> = {
  palm: "stepPalm",
  saber: "stepSaber",
  sword: "stepSword",
  spear: "stepSpear",
  staff: "stepStaff",
  hook: "stepHook",
};

function cardOwned(school: WeaponId, id: CardId | undefined): id is CardId {
  if (!id || !CARDS[id]) return false;
  const ownedBy = CARDS[id].school ?? "any";
  return ownedBy === "any" || ownedBy === school;
}

const STARTER_FILL: CardId[] = [
  "push",
  "sweep",
  "pierce",
  "cut",
  "drawcut",
  "thrust",
  "hookpull",
  "split",
  "expose",
  "direct",
  "elbow",
  "strike",
  "defend",
  "mend",
  "advance",
  "retreat",
  "charge",
  "brace",
  "inbreath",
  "backpalm",
  "close",
  "sidestep",
  "setup",
  "haste",
];

/**
 * 起手 10 张。五系用劈掌，不用直取。钩用换位，不用击退。
 * 槽上的牌若已改挂到别系，换一张本系或通用牌，避免起手发不能打的牌。
 */
export function breakStarterDeck(school: WeaponId): CardId[] {
  const step: CardId = school === "hook" ? "sidestep" : "advance";
  const wanted: CardId[] = [
    "strike",
    SCHOOL_MAIN_ATTACK[school],
    SCHOOL_EXTRA_HIT[school],
    SCHOOL_SUB_ATTACK[school][0]!,
    "defend",
    wardCardId(school),
    step,
    "retreat",
    "mend",
    "inbreath",
  ];
  const deck: CardId[] = [];
  for (const id of [...wanted, ...STARTER_FILL]) {
    if (deck.length >= 10) break;
    if (!cardOwned(school, id) || deck.includes(id)) continue;
    deck.push(id);
  }
  return deck;
}

const FUSION_CAP = 4;

/** 同系光环卡 1 张；每个异系同伴 1 张融合卡（每对系只一张）。融合牌最多 4。 */
export function rogueBondCards(leadSchool: WeaponId, partySchools: WeaponId[]): CardId[] {
  const others = partySchools.filter((s) => s !== leadSchool);
  const same = partySchools.filter((s) => s === leadSchool).length;
  const out: CardId[] = [];
  if (same >= 2) out.push(auraCardId(leadSchool));
  const seen = new Set<WeaponId>();
  for (const s of others) {
    if (seen.has(s)) continue;
    seen.add(s);
    if (out.filter((id) => String(id).startsWith("fuse")).length >= FUSION_CAP) break;
    out.push(fusionCardId(leadSchool, s));
  }
  return out.slice(0, 1 + FUSION_CAP);
}

export function injectRogueBondCards(deck: CardId[], leadSchool: WeaponId, partySchools: WeaponId[]): CardId[] {
  const add = rogueBondCards(leadSchool, partySchools);
  const have = new Set(deck);
  const next = [...deck];
  for (const id of add) {
    if (!have.has(id)) {
      next.push(id);
      have.add(id);
    }
  }
  return next;
}
