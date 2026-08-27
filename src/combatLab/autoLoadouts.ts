import { ALL_MATE_IDS, ALL_TECHNIQUE_IDS } from "./arsenal";
import { CARDS } from "../game/content";
import { cardSchool, MATES } from "../game/party";
import { schoolFromGearId } from "../game/equippedWeapon";
import { classifyPartyComposition } from "../game/labResonance";
import type { PartyComposition } from "../game/labV25Constants";
import type { CardId, CompanionId, LabItemId, TechniqueId, WeaponId } from "../game/types";
import { GEAR_WEAPONS, starterGear, type WeaponPath } from "../game/weapons";
import { isCardAllowedForWeapon } from "./cardUi";
import { normalizePreset } from "./draft";
import { quotaCheck } from "./rules";
import type { LabPreset } from "./types";

/** 精 / 玄 / 神 */
export type AutoWeaponGrade = 3 | 4 | 5;

export const AUTO_WEAPON_GRADES: { grade: AutoWeaponGrade; label: string }[] = [
  { grade: 3, label: "精" },
  { grade: 4, label: "玄" },
  { grade: 5, label: "神" },
];

/** 每人学几门外功（种类已固定，深度由你定）。0 = 不学（踢馆起手无外功，靠战间奖励长出来）。 */
export type AutoTechDepth = 0 | 1 | 2 | 3;

export const AUTO_TECH_DEPTHS: { depth: AutoTechDepth; label: string }[] = [
  { depth: 1, label: "一门" },
  { depth: 2, label: "二门" },
  { depth: 3, label: "三门" },
];

export interface MateWeaponSpec {
  school: WeaponId;
  path: WeaponPath;
}

export interface AutoLoadoutDef {
  id: string;
  name: string;
  blurb: string;
  /** §27.2 五画像分类 */
  portrait: PartyComposition;
  fieldMate: CompanionId;
  party: CompanionId[];
  /** 显式装备系+路线（含副系） */
  weapons: Partial<Record<CompanionId, MateWeaponSpec>>;
  deckRecipe: CardId[];
  mateTechPool: Partial<Record<CompanionId, TechniqueId[]>>;
  labItems: [LabItemId, LabItemId];
}

const COMBO_CARDS: CardId[] = [
  "comboPalm",
  "comboSaber",
  "comboSpear",
  "comboSword",
  "comboStaff",
  "comboHook",
];

const AUTO_LOADOUT_DEFS: AutoLoadoutDef[] = [
  {
    id: "t1-four-palm",
    name: "四门排山",
    blurb: "4同·掌 · 推撞发动机+势循环",
    portrait: "4same",
    fieldMate: "rail",
    party: ["rail", "hermit", "bard", "hooker"],
    weapons: {
      rail: { school: "palm", path: "a" },
      hermit: { school: "palm", path: "a" },
      bard: { school: "palm", path: "b" },
      hooker: { school: "palm", path: "a" },
    },
    deckRecipe: [
      "strike",
      "strike2",
      "push",
      "push2",
      "elbow",
      "backpalm",
      "layer",
      "weave",
      "palmSeal",
      "setup",
      "finisher",
      "comboPalm",
      "defend",
      "advance",
      "sidestep",
      "mend",
      "sweep",
      "charge",
      "brace",
      "qiFlood",
    ],
    mateTechPool: {
      rail: ["longPush", "stackHand", "backstep", "ironPalm", "softPalm", "piercingPalm"],
      hermit: ["hardWall", "keepGuard"],
      bard: ["backstep", "stackHand"],
      hooker: ["bodyCheck", "longPush"],
    },
    labItems: ["huiqi", "jinchuang"],
  },
  {
    id: "t2-four-staff",
    name: "玄甲桩城",
    blurb: "4同·棍 · 龟爆·格挡不清空",
    portrait: "4same",
    fieldMate: "sapper",
    party: ["sapper", "porter", "pilgrim", "hermit"],
    weapons: {
      sapper: { school: "staff", path: "a" },
      porter: { school: "staff", path: "a" },
      pilgrim: { school: "staff", path: "a" },
      hermit: { school: "staff", path: "a" },
    },
    deckRecipe: [
      "split",
      "plant",
      "bleedcut",
      "thorns",
      "ironform",
      "staffBind",
      "comboStaff",
      "defend",
      "defend2",
      "midGuard",
      "lateWard",
      "lateMirror",
      "mirror",
      "jinwuToken",
      "mend",
      "mend2",
      "suture",
      "burySlash",
      "buryBleed",
      "ultIronWall",
    ],
    mateTechPool: {
      sapper: ["keepGuard", "rebound", "stakeArmor", "heavyStaff"],
      porter: ["throne", "nightStep"],
      pilgrim: ["rebound", "delayGuard"],
      hermit: ["nightStep", "keepGuard"],
    },
    labItems: ["lianhuan", "jinchuang"],
  },
  {
    id: "t3-three-saber-hook",
    name: "刀口引线",
    blurb: "3+1·刀+钩 · 贴身裂创爆发",
    portrait: "3plus1",
    fieldMate: "watch",
    party: ["watch", "salter", "blade", "weaver"],
    weapons: {
      watch: { school: "saber", path: "a" },
      salter: { school: "saber", path: "a" },
      blade: { school: "saber", path: "b" },
      weaver: { school: "hook", path: "a" },
    },
    deckRecipe: [
      "cut",
      "drawcut",
      "rift",
      "saberBleed",
      "comboSaber",
      "hookpull",
      "hookDisarm",
      "close",
      "advance",
      "haste",
      "follow",
      "follow2",
      "charge",
      "charge2",
      "lateBleed",
      "venomFog",
      "cauterize",
      "defend",
      "mend",
      "varBackwater",
    ],
    mateTechPool: {
      watch: ["closeCut", "brightBlade", "saberGrudge"],
      salter: ["brightBlade", "leftover"],
      blade: ["leftover", "tether"],
      weaver: ["trapWard", "shortCharge"],
    },
    labItems: ["xiujian", "jinchuang"],
  },
  {
    id: "t4-two-sword-spear",
    name: "映月穿潮",
    blurb: "2+2·剑+枪 · 破绽封禁消耗（平衡锚）",
    portrait: "2plus2",
    fieldMate: "seer",
    party: ["seer", "scribe", "guard", "pilgrim"],
    weapons: {
      seer: { school: "sword", path: "a" },
      scribe: { school: "sword", path: "a" },
      guard: { school: "spear", path: "a" },
      pilgrim: { school: "spear", path: "b" },
    },
    deckRecipe: [
      "pierce",
      "expose",
      "marking",
      "swordMute",
      "comboSword",
      "thrust",
      "spearLock",
      "comboSpear",
      "haste",
      "haste2",
      "skillLock",
      "handCut",
      "lateMute",
      "lateHand",
      "unbind",
      "mirror",
      "advance",
      "defend",
      "ultQiBurst",
      "qiLeech",
    ],
    mateTechPool: {
      seer: ["ghostStep", "delayGuard", "swordRain", "swordScreen", "flowSword"],
      scribe: ["delayGuard", "ghostStep"],
      guard: ["shortCharge", "throne", "spearWind", "longMarch", "pikeBrace"],
      pilgrim: ["heelStake", "nightStep"],
    },
    labItems: ["pojin", "huiqi"],
  },
  {
    id: "t5-hook-saber-spear",
    name: "缆起刀落",
    blurb: "2+1+1·钩+刀+枪 · 拔河调度",
    portrait: "2plus1plus1",
    fieldMate: "hooker",
    party: ["hooker", "weaver", "boat", "guard"],
    weapons: {
      hooker: { school: "hook", path: "a" },
      weaver: { school: "hook", path: "b" },
      boat: { school: "saber", path: "b" },
      guard: { school: "spear", path: "a" },
    },
    deckRecipe: [
      "hookpull",
      "hookDisarm",
      "comboHook",
      "cut",
      "drawcut",
      "saberBleed",
      "thrust",
      "spearLock",
      "advance",
      "sidestep",
      "sweep",
      "midPush",
      "close",
      "defend",
      "brace",
      "mend",
      "haste",
      "follow",
      "ironPulse",
      "qiFlood",
    ],
    mateTechPool: {
      hooker: ["tether", "longPush", "barbedHook", "hookVeil"],
      weaver: ["trapWard", "nightStep"],
      boat: ["closeCut", "backstep"],
      guard: ["keepGuard", "shortCharge"],
    },
    labItems: ["xiujian", "huiqi"],
  },
  {
    id: "t6-all-diff",
    name: "百花齐放",
    blurb: "全异 · 组合技机关枪",
    portrait: "allDiff",
    fieldMate: "rail",
    party: ["rail", "blade", "pilgrim", "hooker"],
    weapons: {
      rail: { school: "palm", path: "a" },
      blade: { school: "saber", path: "b" },
      pilgrim: { school: "spear", path: "b" },
      hooker: { school: "hook", path: "a" },
    },
    deckRecipe: [
      "strike2",
      "push",
      "push2",
      "elbow",
      "backpalm",
      "palmSeal",
      "finisher",
      "layer",
      "cut",
      "rift",
      "thrust",
      "spearLock",
      "hookpull",
      "hookDisarm",
      "advance",
      "close",
      "charge",
      "defend",
      "mend",
      "qiFlood",
    ],
    mateTechPool: {
      rail: ["stackHand", "longPush"],
      blade: ["brightBlade", "leftover"],
      pilgrim: ["heelStake", "delayGuard"],
      hooker: ["bodyCheck", "tether"],
    },
    labItems: ["lianhuan", "huiqi"],
  },
  {
    id: "t7-four-saber",
    name: "夜刀四栈",
    blurb: "4同·刀 · 快刀先机+连势",
    portrait: "4same",
    fieldMate: "watch",
    party: ["watch", "salter", "blade", "rail"],
    weapons: {
      watch: { school: "saber", path: "a" },
      salter: { school: "saber", path: "a" },
      blade: { school: "saber", path: "b" },
      rail: { school: "saber", path: "b" },
    },
    deckRecipe: [
      "cut",
      "drawcut",
      "rift",
      "saberBleed",
      "comboSaber",
      "close",
      "haste",
      "haste2",
      "advance",
      "follow",
      "follow2",
      "charge",
      "charge2",
      "combo",
      "comboPay",
      "chain",
      "midStrike",
      "lateBleed",
      "defend",
      "mend",
    ],
    mateTechPool: {
      watch: ["brightBlade", "leftover"],
      salter: ["leftover", "brightBlade"],
      blade: ["closeCut", "leftover"],
      rail: ["stackHand", "bodyCheck"],
    },
    labItems: ["lianhuan", "xiujian"],
  },
  {
    id: "t8-three-spear-palm",
    name: "三枪挑帘",
    blurb: "3+1·枪+掌 · 距控风筝+气脉长线",
    portrait: "3plus1",
    fieldMate: "guard",
    party: ["guard", "porter", "salter", "bard"],
    weapons: {
      guard: { school: "spear", path: "a" },
      porter: { school: "spear", path: "a" },
      salter: { school: "spear", path: "b" },
      bard: { school: "palm", path: "b" },
    },
    deckRecipe: [
      "thrust",
      "spearLock",
      "comboSpear",
      "push",
      "backpalm",
      "haste",
      "haste2",
      "advance2",
      "mirror",
      "defend",
      "defend2",
      "midGuard",
      "charge",
      "inbreath",
      "qiPulse",
      "qiFlood",
      "mend",
      "gather",
      "gather2",
      "suture",
    ],
    mateTechPool: {
      guard: ["shortCharge", "throne"],
      porter: ["throne", "nightStep"],
      salter: ["brightBlade", "leftover"],
      bard: ["backstep", "stackHand"],
    },
    labItems: ["huiqi", "jinchuang"],
  },
  {
    id: "t9-palm-saber",
    name: "贴山靠",
    blurb: "2+2·掌+刀 · 推进怀·贴身收",
    portrait: "2plus2",
    fieldMate: "rail",
    party: ["rail", "hermit", "watch", "blade"],
    weapons: {
      rail: { school: "palm", path: "a" },
      hermit: { school: "palm", path: "a" },
      watch: { school: "saber", path: "a" },
      blade: { school: "saber", path: "a" },
    },
    deckRecipe: [
      "strike",
      "strike2",
      "push",
      "elbow",
      "backpalm",
      "layer",
      "palmSeal",
      "finisher",
      "cut",
      "drawcut",
      "rift",
      "saberBleed",
      "close",
      "advance",
      "follow",
      "charge",
      "defend",
      "mend",
      "sweep",
      "haste",
    ],
    mateTechPool: {
      rail: ["longPush", "bodyCheck"],
      hermit: ["hardWall", "keepGuard"],
      watch: ["closeCut", "brightBlade"],
      blade: ["brightBlade", "leftover"],
    },
    labItems: ["lianhuan", "jinchuang"],
  },
  {
    id: "t10-sword-palm-staff",
    name: "三尺令",
    blurb: "2+1+1·剑+掌+棍 · 铁桶控制",
    portrait: "2plus1plus1",
    fieldMate: "seer",
    party: ["seer", "scribe", "bard", "sapper"],
    weapons: {
      seer: { school: "sword", path: "b" },
      scribe: { school: "sword", path: "a" },
      bard: { school: "palm", path: "b" },
      sapper: { school: "staff", path: "a" },
    },
    deckRecipe: [
      "pierce",
      "expose",
      "marking",
      "swordMute",
      "comboSword",
      "strike2",
      "push",
      "backpalm",
      "plant",
      "thorns",
      "ironform",
      "mirror",
      "buryWard",
      "buryKnock",
      "defend",
      "defend2",
      "skillLock",
      "unbind",
      "mend",
      "ultIronWall",
    ],
    mateTechPool: {
      seer: ["delayGuard", "ghostStep"],
      scribe: ["ghostStep", "delayGuard"],
      bard: ["backstep", "stackHand"],
      sapper: ["keepGuard", "throne"],
    },
    labItems: ["pojin", "jinchuang"],
  },
  {
    id: "t11-all-diff-fast",
    name: "四面荷",
    blurb: "全异 · 百花速攻",
    portrait: "allDiff",
    fieldMate: "salter",
    party: ["salter", "seer", "sapper", "guard"],
    weapons: {
      salter: { school: "saber", path: "b" },
      seer: { school: "sword", path: "a" },
      sapper: { school: "staff", path: "a" },
      guard: { school: "spear", path: "a" },
    },
    deckRecipe: [
      "cut",
      "drawcut",
      "rift",
      "saberBleed",
      "comboSaber",
      "expose",
      "pierce",
      "thorns",
      "plant",
      "thrust",
      "spearLock",
      "haste",
      "haste2",
      "advance",
      "close",
      "charge",
      "echo",
      "defend",
      "mend",
      "qiFlood",
    ],
    mateTechPool: {
      salter: ["brightBlade", "leftover"],
      seer: ["ghostStep", "delayGuard"],
      sapper: ["rebound", "keepGuard"],
      guard: ["heelStake", "shortCharge"],
    },
    labItems: ["xiujian", "huiqi"],
  },
  {
    id: "t12-trio-heroes",
    name: "同船渡",
    blurb: "全异+三主角同框 · 彩蛋双光环",
    portrait: "allDiff",
    fieldMate: "rail",
    party: ["rail", "seer", "sapper", "watch"],
    weapons: {
      rail: { school: "palm", path: "a" },
      seer: { school: "sword", path: "b" },
      sapper: { school: "staff", path: "a" },
      watch: { school: "saber", path: "a" },
    },
    deckRecipe: [
      "push",
      "push2",
      "elbow",
      "backpalm",
      "palmSeal",
      "strike",
      "strike2",
      "layer",
      "expose",
      "swordMute",
      "plant",
      "ironform",
      "cut",
      "drawcut",
      "advance",
      "charge",
      "defend",
      "mend",
      "haste",
      "ultQiBurst",
    ],
    mateTechPool: {
      rail: ["stackHand", "longPush"],
      seer: ["delayGuard", "ghostStep"],
      sapper: ["keepGuard", "nightStep"],
      watch: ["closeCut", "brightBlade"],
    },
    labItems: ["lianhuan", "jinchuang"],
  },
];

export const AUTO_LOADOUTS = AUTO_LOADOUT_DEFS;

export function weaponIdForMate(
  _mateId: CompanionId,
  grade: AutoWeaponGrade,
  school: WeaponId,
  path: WeaponPath,
): string {
  const hit = GEAR_WEAPONS.find((g) => g.school === school && g.path === path && g.grade === grade);
  return hit?.id ?? `${school}-${path}-${grade}`;
}

export function applyAutoLoadout(
  loadoutId: string,
  weaponGrade: AutoWeaponGrade,
  techDepth: AutoTechDepth,
  base?: Partial<LabPreset>,
): LabPreset {
  const def = AUTO_LOADOUT_DEFS.find((d) => d.id === loadoutId);
  if (!def) throw new Error(`未知配装：${loadoutId}`);

  const mateWeapons: Partial<Record<CompanionId, string>> = {};
  const mateTechs: Partial<Record<CompanionId, TechniqueId[]>> = {};

  for (const id of def.party) {
    const spec = def.weapons[id] ?? { school: MATES[id].weapon, path: "a" as WeaponPath };
    mateWeapons[id] = weaponIdForMate(id, weaponGrade, spec.school, spec.path);
    const pool = def.mateTechPool[id] ?? [];
    mateTechs[id] = pool.slice(0, techDepth);
  }

  return normalizePreset({
    id: def.id,
    name: def.name,
    blurb: def.blurb,
    tags: ["一键配装", `${AUTO_WEAPON_GRADES.find((g) => g.grade === weaponGrade)?.label ?? ""}品`, def.portrait],
    enemyId: base?.enemyId ?? "catcher",
    party: [...def.party],
    fieldMate: def.fieldMate,
    deckRecipe: [...def.deckRecipe],
    mateWeapons,
    mateTechs,
    labItems: [...def.labItems],
    extraFoeIds: base?.extraFoeIds,
    hp: base?.hp,
    hpMax: base?.hpMax,
  });
}

/** 从 preset 装备推导五画像（§17.4 分类器核对用）。 */
export function presetPortrait(p: LabPreset): PartyComposition {
  const counts: number[] = [];
  const tally: Partial<Record<WeaponId, number>> = {};
  for (const id of p.party) {
    const school = schoolFromGearId(p.mateWeapons[id], MATES[id].weapon);
    tally[school] = (tally[school] ?? 0) + 1;
  }
  for (const n of Object.values(tally)) counts.push(n);
  return classifyPartyComposition(counts);
}

/** §27.4 覆盖断言 */
export function autoLoadoutCoverage(): {
  mates: number;
  techniques: number;
  items: number;
  comboCards: number;
  portraits: Record<PartyComposition, number>;
  ok: boolean;
} {
  const mates = new Set<CompanionId>();
  const techniques = new Set<TechniqueId>();
  const items = new Set<LabItemId>();
  const comboCards = new Set<CardId>();
  const portraits: Record<PartyComposition, number> = {
    "4same": 0,
    "3plus1": 0,
    "2plus2": 0,
    "2plus1plus1": 0,
    allDiff: 0,
  };

  for (const def of AUTO_LOADOUT_DEFS) {
    for (const id of def.party) mates.add(id);
    for (const tid of Object.values(def.mateTechPool).flat()) {
      if (tid) techniques.add(tid);
    }
    for (const item of def.labItems) items.add(item);
    for (const cid of def.deckRecipe) {
      if (COMBO_CARDS.includes(cid)) comboCards.add(cid);
    }
    portraits[def.portrait] += 1;
  }

  const portraitOk =
    portraits["4same"] === 3 &&
    portraits["3plus1"] === 2 &&
    portraits["2plus2"] === 2 &&
    portraits["2plus1plus1"] === 2 &&
    portraits.allDiff === 3;

  return {
    mates: mates.size,
    techniques: techniques.size,
    items: items.size,
    comboCards: comboCards.size,
    portraits,
    ok:
      mates.size === ALL_MATE_IDS.length &&
      techniques.size === ALL_TECHNIQUE_IDS.length &&
      items.size === 5 &&
      comboCards.size === COMBO_CARDS.length &&
      portraitOk,
  };
}

/** 牌组 20 张且每张谱与全队装备系并集相容。 */
export function validateLoadoutPreset(p: LabPreset): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (p.deckRecipe.length !== 20) reasons.push(`牌数 ${p.deckRecipe.length} ≠ 20`);
  if (new Set(p.deckRecipe).size !== p.deckRecipe.length) reasons.push("牌组有重复");
  if (!p.party.includes(p.fieldMate)) reasons.push("field 不在 party");

  const gears = p.party.map((id) => p.mateWeapons[id] ?? starterGear(MATES[id].weapon));
  const schools = new Set(p.party.map((id) => schoolFromGearId(p.mateWeapons[id], MATES[id].weapon)));

  for (const cid of p.deckRecipe) {
    if (!CARDS[cid]) reasons.push(`未知牌 ${cid}`);
    const school = cardSchool(cid);
    if (school !== "any" && !schools.has(school)) {
      reasons.push(`${cid} 系 ${school} 不在队伍装备系 ${[...schools].join("/")}`);
    }
    const allowed = gears.some((g) => isCardAllowedForWeapon(cid, g));
    if (!allowed) reasons.push(`${cid} 与当前兵器不兼容`);
  }

  for (const id of p.party) {
    const spec = AUTO_LOADOUT_DEFS.find((d) => d.id === p.id)?.weapons[id];
    if (spec) {
      const got = schoolFromGearId(p.mateWeapons[id], MATES[id].weapon);
      if (got !== spec.school) reasons.push(`${id} 装备系应为 ${spec.school} 实为 ${got}`);
    }
  }

  const fieldSchool = schoolFromGearId(p.mateWeapons[p.fieldMate], MATES[p.fieldMate].weapon);
  const quota = quotaCheck(p.deckRecipe, fieldSchool);
  if (!quota.ok) reasons.push(...quota.hints);

  return { ok: reasons.length === 0, reasons };
}
