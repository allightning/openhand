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
    midStrike: "follow2",
    midGuard: "defend2",
    midPush: "push2",
    lateAnvil: "elbow",
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

function wardDef(school: WeaponId): CardDef {
  const id = wardCardId(school);
  const extra: Record<
    WeaponId,
    Pick<CardDef, "name" | "text" | "block" | "knock" | "thorns" | "expose" | "energyNext" | "plant" | "frail">
  > = {
    palm: { name: "拳架", text: "格挡 6，击退 1。", block: 6, knock: 1 },
    saber: { name: "刀架", text: "格挡 6，反震 2。", block: 6, thorns: 2 },
    sword: { name: "剑架", text: "格挡 6，破绽 +1。", block: 6, expose: 1 },
    spear: { name: "枪架", text: "格挡 6，立刻回劲 1。", block: 6, energyNext: 1 },
    staff: { name: "棍架", text: "格挡 6。身前空则落桩。", block: 6, plant: true },
    hook: { name: "钩架", text: "格挡 6，滞手 +1。", block: 6, frail: 1 },
  };
  return {
    id,
    cost: 0,
    type: "skill",
    flavor: "本系卸法，先站住再打。",
    school,
    ...extra[school],
  };
}

function auraDef(school: WeaponId): CardDef {
  const id = auraCardId(school);
  const extra =
    school === "palm"
      ? { knock: 1, text: "【光环】打出后本场攻击 +3。击退 +1。同门·崩山。", name: "同门·崩山" as const }
      : school === "spear"
        ? { block: 4, text: "【光环】打出后本场攻击 +3。格挡 4。同门·丈八。", name: "同门·丈八" as const }
        : school === "saber"
          ? { bleed: 2, block: 4, text: "【光环】打出后本场攻击 +3。裂创 +2，格挡 4。同门·血饮。", name: "同门·血饮" as const }
          : school === "sword"
            ? { expose: 2, block: 6, text: "【光环】打出后本场攻击 +3。破绽 +2，格挡 6。同门·万脉。", name: "同门·万脉" as const }
            : school === "staff"
              ? { block: 12, plant: true as const, text: "【光环】打出后本场攻击 +3。格挡 12。同门·铁桩。", name: "同门·铁桩" as const }
              : { pullEnemy: 1, frail: 1, text: "【光环】打出后本场攻击 +3。拉近 1，滞手 +1。同门·天罗。", name: "同门·天罗" as const };
  const { name, ...rest } = extra;
  return {
    id,
    name,
    cost: 0,
    type: "skill",
    flavor: "三同系开战入手。打出后本场攻击 +3。",
    school,
    ...rest,
  };
}

const FUSION_PACK: Record<
  string,
  Pick<CardDef, "name" | "text" | "damage" | "block" | "heal" | "bleed" | "expose" | "knock" | "pullEnemy" | "energyNext" | "type" | "plant">
> = {
  "palm:saber": { name: "崩刃", type: "attack", damage: 8, knock: 1, bleed: 2, text: "伤 8，击退 1，裂创 +2。" },
  "palm:sword": { name: "崩锋", type: "attack", damage: 7, knock: 1, expose: 2, text: "伤 7，击退 1，破绽 +2。" },
  "palm:spear": { name: "送客枪", type: "attack", damage: 8, knock: 1, text: "伤 8，击退 1。推开后距≥3 再打更疼。" },
  "palm:staff": { name: "崩桩", type: "skill", block: 10, knock: 1, text: "格挡 10，击退 1。" },
  "palm:hook": { name: "崩拖", type: "attack", pullEnemy: 1, damage: 6, text: "伤 6，拉近 1。" },
  "saber:sword": { name: "放血刺", type: "attack", damage: 7, bleed: 2, text: "伤 7，裂创 +2。有破绽时更疼。" },
  "saber:spear": { name: "血尺", type: "attack", damage: 9, bleed: 1, text: "伤 9，裂创 +1。" },
  "saber:staff": { name: "血桩", type: "skill", block: 8, plant: true, text: "格挡 8。可落桩。" },
  "saber:hook": { name: "拖血", type: "attack", damage: 7, pullEnemy: 1, bleed: 2, text: "伤 7，拉近 1，裂创 +2。" },
  "sword:spear": { name: "回马刺", type: "attack", damage: 8, expose: 2, text: "伤 8，破绽 +2。" },
  "sword:staff": { name: "锋桩", type: "skill", block: 8, expose: 1, text: "格挡 8，破绽 +1。" },
  "sword:hook": { name: "锋丝", type: "skill", pullEnemy: 1, expose: 2, text: "拉近 1，破绽 +2。" },
  "spear:staff": { name: "桩后冷枪", type: "skill", block: 10, text: "格挡 10。本回远打更稳。" },
  "spear:hook": { name: "尺钩", type: "attack", damage: 8, pullEnemy: 1, text: "伤 8，拉近 1。" },
  "staff:hook": { name: "桩网", type: "skill", block: 9, pullEnemy: 1, text: "格挡 9，拉近 1。" },
};

function pairKey(a: WeaponId, b: WeaponId): string {
  const ia = ROGUE_SCHOOLS.indexOf(a);
  const ib = ROGUE_SCHOOLS.indexOf(b);
  return ia < ib ? `${a}:${b}` : `${b}:${a}`;
}

export function pairFusionId(a: WeaponId, b: WeaponId): RogueCardId | null {
  if (a === b) return null;
  const ia = ROGUE_SCHOOLS.indexOf(a);
  const ib = ROGUE_SCHOOLS.indexOf(b);
  const [x, y] = ia < ib ? [a, b] : [b, a];
  return fusionCardId(x, y);
}

function fusionBurst(main: WeaponId, sub: WeaponId): (typeof FUSION_PACK)[string] {
  return FUSION_PACK[pairKey(main, sub)] ?? { name: "合", type: "attack", damage: 8, text: "伤 8。" };
}

function fusionDef(main: WeaponId, sub: WeaponId): CardDef {
  const id = fusionCardId(main, sub);
  const pack = fusionBurst(main, sub);
  const { name, type, ...rest } = pack;
  return {
    id,
    name,
    cost: 1,
    type: type === "skill" ? "skill" : "attack",
    flavor: "异系连携，换人时入手。",
    school: sub,
    ...rest,
  };
}

function hitDef(school: WeaponId): CardDef {
  const id = hitCardId(school);
  const pack: Record<WeaponId, Pick<CardDef, "name" | "text" | "flavor" | "damage" | "knock" | "bleed" | "expose" | "pullEnemy" | "foeStun">> = {
    palm: { name: "崩拳", text: "造成 6 点伤害并击退 1。", flavor: "短拳砸实，把人掀开半步。", damage: 6, knock: 1 },
    saber: { name: "抹刀", text: "造成 6 点伤害，裂创 +1。", flavor: "不是斩，是拖口子。", damage: 6, bleed: 1 },
    sword: { name: "点刺", text: "造成 5 点伤害，破绽 +1。", flavor: "剑尖只取脉口。", damage: 5, expose: 1 },
    spear: { name: "攒枪", text: "造成 7 点伤害，破绽 +1。", flavor: "枪杆一抖，点子叠上去。", damage: 7, expose: 1 },
    staff: { name: "扫堂", text: "造成 6 点伤害并击退 1，眩晕 1 段。", flavor: "棍梢扫地，先断步再砸人。", damage: 6, knock: 1, foeStun: 1 },
    hook: { name: "绊脚", text: "造成 5 点伤害并拉近 1。", flavor: "钩子不求穿喉，先绊住。", damage: 5, pullEnemy: 1 },
  };
  return { id, cost: school === "palm" || school === "saber" || school === "hook" ? 2 : 1, type: "attack", school, ...pack[school] };
}

function statusDef(school: WeaponId): CardDef {
  const id = statusCardId(school);
  const pack: Record<WeaponId, Pick<CardDef, "name" | "text" | "flavor" | "heal" | "block" | "expose" | "energyNext" | "frail" | "bleed" | "plant">> = {
    palm: { name: "温气", text: "回复 4 点生命。抽 1。", flavor: "掌心一捂，血气回笼。", heal: 4 },
    saber: { name: "刀势", text: "获得 5 点格挡。裂创 +1。抽 1。", flavor: "刀背一横，先开口子再挡。", block: 5, bleed: 1 },
    sword: { name: "凝锋", text: "格挡 3。敌破绽 +1。", flavor: "剑意一收，他身上就多一口。", block: 3, expose: 1 },
    spear: { name: "丈量", text: "格挡 4。回劲 1。", flavor: "先把距离量明白。", block: 4, energyNext: 1 },
    staff: { name: "桩气", text: "获得 7 点格挡。身前空则落桩。抽 1。", flavor: "人桩先立住。", block: 7, plant: true },
    hook: { name: "缠丝", text: "格挡 3。滞手 +1。", flavor: "钩丝绕腕，他下一招发不干脆。", block: 3, frail: 1 },
  };
  return { id, cost: school === "staff" ? 2 : 1, type: "skill", school, ...pack[school] };
}

function statusDef2(school: WeaponId): CardDef {
  const id = statusCardId2(school);
  const pack: Record<
    WeaponId,
    Pick<CardDef, "name" | "text" | "flavor" | "heal" | "block" | "expose" | "energyNext" | "frail" | "bleed" | "pullEnemy">
  > = {
    palm: { name: "回笼", text: "回复 6 点生命。立刻回劲 2。", flavor: "掌心一捂，劲力跟着血气回来。", heal: 6, energyNext: 2 },
    saber: { name: "血口", text: "裂创 +2。格挡 3。", flavor: "刀口先开口子，再拿刀背挡一下。", bleed: 2, block: 3 },
    sword: { name: "锁脉", text: "敌破绽 +2。滞手 +1。", flavor: "剑意锁住脉口，他下一招发不干脆。", expose: 2, frail: 1 },
    spear: { name: "蓄杆", text: "格挡 5。立刻回劲 3。", flavor: "枪杆一沉，先把距离和劲攒住。", block: 5, energyNext: 3 },
    staff: { name: "铁桩", text: "获得 12 点格挡。", flavor: "人桩立住，这一息砸不垮。", block: 12 },
    hook: { name: "锁喉丝", text: "拉近 1。滞手 +2。", flavor: "钩丝绕喉，人过来、手也滞。", pullEnemy: 1, frail: 2 },
  };
  return { id, cost: school === "staff" || school === "spear" ? 2 : 1, type: "skill", school, ...pack[school] };
}

function stepDef(school: WeaponId): CardDef {
  const id = stepCardId(school);
  const pack: Record<WeaponId, Pick<CardDef, "name" | "text" | "flavor" | "steps" | "block" | "pace" | "expose" | "energyNext" | "pullEnemy">> = {
    palm: { name: "进步掌", text: "前进 1 格，获得 2 点格挡。", flavor: "掌随身进，不是空进步。", steps: 1, block: 2 },
    saber: { name: "刀步", text: "前进 1 格，先机 +2。", flavor: "刀要贴上，步先到。", steps: 1, pace: 2 },
    sword: { name: "剑圈", text: "后退 1 格，破绽 +1。", flavor: "剑走圆，人让半步。", steps: -1, expose: 1 },
    spear: { name: "枪退", text: "后退 1 格，立刻回劲 1。", flavor: "枪要留杆，先把距离还回来。", steps: -1, energyNext: 1 },
    staff: { name: "棍门", text: "前进 1 格，获得 3 点格挡。", flavor: "棍一横就是门。", steps: 1, block: 3 },
    hook: { name: "钩步", text: "前进 1 格，拉近 1。", flavor: "钩要够着，人得先凑上去。", steps: 1, pullEnemy: 1 },
  };
  return { id, cost: 1, type: "skill", school, ...pack[school] };
}

function buildRogueCardDefs(): Record<RogueCardId, CardDef> {
  const out = {} as Record<RogueCardId, CardDef>;
  out.direct = {
    id: "direct",
    name: "直取",
    cost: 1,
    type: "attack",
    text: "造成 4 点伤害，破绽 +1。",
    flavor: "不讲门派，先打开口子。",
    damage: 4,
    expose: 1,
    school: "any",
  };
  for (const s of ROGUE_SCHOOLS) {
    out[wardCardId(s)] = wardDef(s);
    out[auraCardId(s)] = auraDef(s);
    out[hitCardId(s)] = hitDef(s);
    out[statusCardId(s)] = statusDef(s);
    out[statusCardId2(s)] = statusDef2(s);
    out[stepCardId(s)] = stepDef(s);
  }
  for (let i = 0; i < ROGUE_SCHOOLS.length; i++) {
    for (let j = i + 1; j < ROGUE_SCHOOLS.length; j++) {
      const a = ROGUE_SCHOOLS[i]!;
      const b = ROGUE_SCHOOLS[j]!;
      out[fusionCardId(a, b)] = fusionDef(a, b);
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

/**
 * 拆招起手 10 张：四张攻击 + 卸力 + 本系架 + 进步/撤步 + 吐纳/纳息。
 * 不含 ±2、光环、组合、绝招。
 */
export function breakStarterDeck(school: WeaponId): CardId[] {
  const sub = SCHOOL_SUB_ATTACK[school][0];
  // 钩核靠拉近：起手多一张击退，贴墙时能把人推开。
  const stepOrPush: CardId = school === "hook" ? "push" : "advance";
  return [
    "direct",
    SCHOOL_MAIN_ATTACK[school],
    SCHOOL_EXTRA_HIT[school],
    ...(sub ? [sub] : []),
    "defend",
    wardCardId(school),
    stepOrPush,
    "retreat",
    "mend",
    "inbreath",
  ];
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
