/**
 * 拆招开踢：起手直取/本系架、同系光环卡、异系融合卡。
 * 见 docs/combat/ROGUE_GRADIENT.md §5–§6。
 */
import type { CardDef, CardId, RogueCardId, WeaponId } from "./types";

export const ROGUE_SCHOOLS: WeaponId[] = ["palm", "saber", "sword", "spear", "staff", "hook"];

const SCHOOL_CAP: Record<WeaponId, Capitalize<WeaponId>> = {
  palm: "Palm",
  saber: "Saber",
  sword: "Sword",
  spear: "Spear",
  staff: "Staff",
  hook: "Hook",
};

const SCHOOL_HAN: Record<WeaponId, string> = {
  palm: "拳",
  saber: "刀",
  sword: "剑",
  spear: "枪",
  staff: "棍",
  hook: "钩",
};

export function wardCardId(school: WeaponId): RogueCardId {
  return `ward${SCHOOL_CAP[school]}`;
}

export function wardUpgradeId(school: WeaponId): RogueCardId {
  return `ward${SCHOOL_CAP[school]}2`;
}

export function auraCardId(school: WeaponId): RogueCardId {
  return `aura${SCHOOL_CAP[school]}`;
}

export function fusionCardId(main: WeaponId, sub: WeaponId): RogueCardId {
  return `fuse${SCHOOL_CAP[main]}${SCHOOL_CAP[sub]}`;
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

export function stepCardId(school: WeaponId): RogueCardId {
  return `step${SCHOOL_CAP[school]}`;
}

function wardDef(school: WeaponId): CardDef {
  const id = wardCardId(school);
  return {
    id,
    name: `${SCHOOL_HAN[school]}架`,
    cost: 0,
    type: "skill",
    text: "获得 6 点格挡。",
    flavor: "本系卸法，先站住再打。",
    block: 6,
    school,
  };
}

function wardUpgradeDef(school: WeaponId): CardDef {
  const id = wardUpgradeId(school);
  return {
    id,
    name: `${SCHOOL_HAN[school]}架·换页`,
    cost: 1,
    type: "skill",
    text: "获得 9 点格挡，抽 1。本系架换页，位移仍是 ±1。",
    flavor: "架子换一页，挡完还能摸一张。",
    block: 9,
    school,
  };
}

function auraDef(school: WeaponId): CardDef {
  const id = auraCardId(school);
  const extra =
    school === "palm"
      ? { heal: 5, energyNext: 1, text: "回复 5。下回劲 +1。同门气势。" }
      : school === "spear"
        ? { block: 6, text: "格挡 6。标尺 +1。同门气势。" }
        : school === "saber"
          ? { block: 6, flow: 4, text: "格挡 6。本回合势伤 +4。同门气势。" }
          : school === "sword"
            ? { expose: 2, block: 4, text: "格挡 4。敌破绽 +2。同门气势。" }
            : school === "staff"
              ? { block: 9, text: "格挡 9。同门桩气。" }
              : { heal: 4, frail: 1, text: "回复 4。滞手 +1。同门气势。" };
  return {
    id,
    name: `同门·${SCHOOL_HAN[school]}`,
    cost: 1,
    type: "skill",
    flavor: "同系在场才有的次一等绝招，不是废格挡。",
    school,
    ...extra,
  };
}

function fusionBurst(main: WeaponId, sub: WeaponId): Pick<CardDef, "text" | "damage" | "block" | "heal" | "bleed" | "expose" | "knock" | "pullEnemy" | "energyNext"> {
  const key = `${main}:${sub}`;
  const table: Record<string, Pick<CardDef, "text" | "damage" | "block" | "heal" | "bleed" | "expose" | "knock" | "pullEnemy" | "energyNext">> = {
    "saber:palm": { damage: 9, energyNext: 1, text: "伤 9。下回劲 +1。次绝招。" },
    "saber:sword": { damage: 8, bleed: 2, text: "伤 8，裂创 +2。次绝招。" },
    "saber:spear": { damage: 10, bleed: 1, text: "伤 10，裂创 +1。次绝招。" },
    "saber:staff": { damage: 8, block: 6, text: "伤 8，格挡 6。次绝招。" },
    "saber:hook": { damage: 8, pullEnemy: 1, text: "伤 8，拉近 1。次绝招。" },
    "palm:sword": { damage: 10, heal: 4, text: "伤 10，回 4 血。次绝招。" },
    "palm:spear": { damage: 9, knock: 1, text: "伤 9，击退 1。次绝招。" },
    "palm:staff": { damage: 9, block: 8, text: "伤 9，格挡 8。次绝招。" },
    "palm:hook": { damage: 10, heal: 3, text: "伤 10，回 3 血。次绝招。" },
    "sword:spear": { damage: 9, expose: 1, text: "伤 9，破绽 +1。次绝招。" },
    "sword:staff": { damage: 10, block: 5, expose: 1, text: "伤 10，格挡 5，破绽 +1。次绝招。" },
    "sword:hook": { damage: 11, expose: 1, text: "伤 11，破绽 +1。次绝招。" },
    "spear:staff": { damage: 9, block: 4, text: "伤 9，格挡 4。次绝招。" },
    "spear:hook": { damage: 9, pullEnemy: 1, text: "伤 9，拉近 1。次绝招。" },
    "staff:hook": { damage: 10, block: 7, text: "伤 10，格挡 7。次绝招。" },
  };
  return table[key] ?? { damage: 11, text: "伤 11。次绝招。" };
}

function fusionDef(main: WeaponId, sub: WeaponId): CardDef {
  const id = fusionCardId(main, sub);
  const pack = fusionBurst(main, sub);
  return {
    id,
    name: `${SCHOOL_HAN[main]}×${SCHOOL_HAN[sub]}合`,
    cost: 2,
    type: "attack",
    flavor: "异系合招，次一等绝招。",
    school: sub,
    ...pack,
  };
}

function hitDef(school: WeaponId): CardDef {
  const id = hitCardId(school);
  const pack: Record<WeaponId, Pick<CardDef, "name" | "text" | "flavor" | "damage" | "knock" | "bleed" | "expose" | "pullEnemy">> = {
    palm: { name: "崩拳", text: "造成 6 点伤害并击退 1。", flavor: "短拳砸实，把人掀开半步。", damage: 6, knock: 1 },
    saber: { name: "抹刀", text: "造成 6 点伤害，裂创 +1。", flavor: "不是斩，是拖口子。", damage: 6, bleed: 1 },
    sword: { name: "点刺", text: "造成 5 点伤害，破绽 +1。", flavor: "剑尖只取脉口。", damage: 5, expose: 1 },
    spear: { name: "攒枪", text: "造成 7 点伤害。", flavor: "枪杆一抖，点子叠上去。", damage: 7 },
    staff: { name: "扫堂", text: "造成 6 点伤害。", flavor: "棍梢扫地，先断步再砸人。", damage: 6 },
    hook: { name: "绊脚", text: "造成 5 点伤害并拉近 1。", flavor: "钩子不求穿喉，先绊住。", damage: 5, pullEnemy: 1 },
  };
  return { id, cost: school === "palm" || school === "saber" || school === "hook" ? 2 : 1, type: "attack", school, ...pack[school] };
}

function statusDef(school: WeaponId): CardDef {
  const id = statusCardId(school);
  const pack: Record<WeaponId, Pick<CardDef, "name" | "text" | "flavor" | "heal" | "block" | "expose" | "energyNext" | "frail">> = {
    palm: { name: "温气", text: "回复 4 点生命。抽 1。", flavor: "掌心一捂，血气回笼。", heal: 4 },
    saber: { name: "刀势", text: "获得 5 点格挡。抽 1。", flavor: "刀背一横，先把这一息挡住。", block: 5 },
    sword: { name: "凝锋", text: "格挡 3。敌破绽 +1。", flavor: "剑意一收，他身上就多一口。", block: 3, expose: 1 },
    spear: { name: "丈量", text: "格挡 4。回劲 1。", flavor: "先把距离量明白。", block: 4, energyNext: 1 },
    staff: { name: "桩气", text: "获得 7 点格挡。抽 1。", flavor: "人桩先立住。", block: 7 },
    hook: { name: "缠丝", text: "格挡 3。滞手 +1。", flavor: "钩丝绕腕，他下一招发不干脆。", block: 3, frail: 1 },
  };
  return { id, cost: school === "staff" ? 2 : 1, type: "skill", school, ...pack[school] };
}

function stepDef(school: WeaponId): CardDef {
  const id = stepCardId(school);
  const pack: Record<WeaponId, Pick<CardDef, "name" | "text" | "flavor" | "steps" | "block">> = {
    palm: { name: "进步掌", text: "前进 1 格，获得 2 点格挡。", flavor: "掌随身进，不是空进步。", steps: 1, block: 2 },
    saber: { name: "刀步", text: "前进 1 格。", flavor: "刀要贴上，步先到。", steps: 1 },
    sword: { name: "剑圈", text: "后退 1 格。", flavor: "剑走圆，人让半步。", steps: -1 },
    spear: { name: "枪退", text: "后退 1 格。", flavor: "枪要留杆，先把距离还回来。", steps: -1 },
    staff: { name: "棍门", text: "前进 1 格，获得 3 点格挡。", flavor: "棍一横就是门。", steps: 1, block: 3 },
    hook: { name: "钩步", text: "前进 1 格。", flavor: "钩要够着，人得先凑上去。", steps: 1 },
  };
  return { id, cost: 1, type: "skill", school, ...pack[school] };
}

function fusionSubDef(main: WeaponId, sub: WeaponId): CardDef {
  const id = fusionCardId(sub, main);
  const pack = fusionBurst(sub, main);
  return {
    id,
    name: `${SCHOOL_HAN[sub]}×${SCHOOL_HAN[main]}副`,
    cost: 2,
    type: "attack",
    flavor: "副路合招，次一等绝招。",
    school: sub,
    ...pack,
  };
}

function buildRogueCardDefs(): Record<RogueCardId, CardDef> {
  const out = {} as Record<RogueCardId, CardDef>;
  out.direct = {
    id: "direct",
    name: "直取",
    cost: 1,
    type: "attack",
    text: "造成 5 点伤害。",
    flavor: "不讲门派，先打到人。",
    damage: 5,
    school: "any",
  };
  for (const s of ROGUE_SCHOOLS) {
    out[wardCardId(s)] = wardDef(s);
    out[wardUpgradeId(s)] = wardUpgradeDef(s);
    out[auraCardId(s)] = auraDef(s);
    out[hitCardId(s)] = hitDef(s);
    out[statusCardId(s)] = statusDef(s);
    out[stepCardId(s)] = stepDef(s);
  }
  for (let i = 0; i < ROGUE_SCHOOLS.length; i++) {
    for (let j = i + 1; j < ROGUE_SCHOOLS.length; j++) {
      const a = ROGUE_SCHOOLS[i]!;
      const b = ROGUE_SCHOOLS[j]!;
      out[fusionCardId(a, b)] = fusionDef(a, b);
      out[fusionCardId(b, a)] = fusionSubDef(a, b);
    }
  }
  return out;
}

export const ROGUE_CARD_DEFS: Record<RogueCardId, CardDef> = buildRogueCardDefs();

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
  haste: "haste2",
  follow: "follow2",
  gather: "gather2",
  finisher: "finisher2",
  wardPalm: "wardPalm2",
  wardSaber: "wardSaber2",
  wardSword: "wardSword2",
  wardSpear: "wardSpear2",
  wardStaff: "wardStaff2",
  wardHook: "wardHook2",
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
export const SCHOOL_SCHOOL_STEP: Record<WeaponId, CardId> = {
  palm: "stepPalm",
  saber: "stepSaber",
  sword: "stepSword",
  spear: "stepSpear",
  staff: "stepStaff",
  hook: "stepHook",
};

/**
 * 拆招起手 10 张：四张攻击 + 卸力 + 本系架 + 进步/撤步 + 吐纳/纳息。
 * 不含 ±2、光环、组合、绝招。
 */
export function breakStarterDeck(school: WeaponId): CardId[] {
  const sub = SCHOOL_SUB_ATTACK[school][0];
  return [
    "direct",
    SCHOOL_MAIN_ATTACK[school],
    SCHOOL_EXTRA_HIT[school],
    ...(sub ? [sub] : []),
    "defend",
    wardCardId(school),
    "advance",
    "retreat",
    "mend",
    "inbreath",
  ];
}

const FUSION_CAP = 4;

/** 同系光环卡 1 张；每个异系同伴 2 张融合卡。融合牌最多 4。 */
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
    out.push(fusionCardId(leadSchool, s), fusionCardId(s, leadSchool));
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
