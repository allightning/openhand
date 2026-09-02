import type { EnemyId, Intent, TechniqueId, WeaponId } from "./types";
import { enemyGear, enemyGradeForStage, enemyStrikeAtDist, type EnemyGearGrade } from "./enemyGear";
import { SIGNATURE_BREAK, type EnemySigId } from "./enemySignatures";
import { getLabTuning } from "./labTuning";

export type EnergyArchive = "short" | "steady" | "burst" | "turtle";

export interface EnergySpec {
  archive: EnergyArchive;
  max: number;
  start: number;
  breathe: number;
}

export interface FoeIdentity {
  school: WeaponId;
  name?: string;
  remnant?: TechniqueId;
  path?: "shaolin" | "jianghu" | "court";
  sigs?: EnemySigId[];
}

export interface EnemyProfile {
  school: WeaponId;
  grade: EnemyGearGrade;
  remnant: TechniqueId;
  energy: EnergySpec;
  opener: Intent[];
  heavy?: Intent;
  sigs: EnemySigId[];
  name?: string;
}

const REMNANT: Record<WeaponId, TechniqueId> = {
  staff: "hardWall",
  hook: "tether",
  sword: "delayGuard",
  saber: "rebound",
  spear: "leftover",
  palm: "leftover",
};

/** 踢馆具名绑死：名字、兵刃、残谱、特色招。 */
export const GAUNTLET_FOE_IDENTITY: Record<string, FoeIdentity> = {
  mob_monk_01: { school: "palm", name: "山门沙弥", path: "shaolin" },
  mob_monk_02: { school: "staff", name: "巡寺棍僧", path: "shaolin", remnant: "hardWall" },
  mob_monk_03: { school: "saber", name: "戒刀僧", path: "shaolin" },
  mob_monk_04: { school: "palm", name: "拳僧", path: "shaolin" },
  mob_monk_05: { school: "staff", name: "护寺武僧", path: "shaolin", sigs: ["vajra-ward", "staff-circle", "flower-seal"] },
  mob_monk_06: { school: "palm", name: "罗汉堂前", path: "shaolin" },
  mob_monk_07: { school: "saber", name: "刀僧", path: "shaolin" },
  mob_monk_08: { school: "staff", name: "罗汉", path: "shaolin", sigs: ["luohan-array", "vajra-ward", "flower-seal"] },
  mob_monk_09: { school: "palm", name: "护寺拳", path: "shaolin" },
  mob_monk_10: { school: "staff", name: "棍阵僧", path: "shaolin" },
  mob_monk_11: { school: "palm", name: "拳阵僧", path: "shaolin" },
  mob_monk_12: { school: "staff", name: "伏魔杖僧", path: "shaolin", sigs: ["staff-circle"] },
  mob_monk_13: { school: "palm", name: "罗汉续", path: "shaolin" },
  mob_monk_14: { school: "staff", name: "方丈前", path: "shaolin" },
  mob_monk_15: { school: "saber", name: "戒刀续", path: "shaolin" },
  mob_road_01: { school: "saber", name: "剪径", path: "jianghu" },
  mob_road_02: { school: "saber", name: "坡蹲", path: "jianghu" },
  mob_road_05: { school: "saber", name: "蓄势路匪", path: "jianghu", sigs: ["chaos-cut"] },
  mob_road_06: { school: "saber", name: "伏草客", path: "jianghu" },
  mob_road_08: { school: "saber", name: "坡蹲头目", path: "jianghu" },
  mob_road_09: { school: "hook", name: "夜路钩", path: "jianghu" },
  mob_road_10: { school: "spear", name: "荒丘枪", path: "jianghu" },
  mob_escortBand_01: { school: "hook", name: "截镖", path: "jianghu" },
  mob_escortBand_02: { school: "saber", name: "裂旗劫手", path: "jianghu", sigs: ["chaos-cut", "oil", "snare"] },
  mob_escortBand_03: { school: "hook", name: "同道再聚", path: "jianghu", sigs: ["snare", "oil", "chaos-cut"] },
  mob_escortBand_04: { school: "saber", name: "岸匪", path: "jianghu" },
  mob_escortBand_05: { school: "spear", name: "水匪哨", path: "jianghu" },
  mob_canal_01: { school: "spear", name: "纤手", path: "jianghu" },
  mob_canal_02: { school: "hook", name: "舱刀", path: "jianghu" },
  mob_canal_03: { school: "hook", name: "闸口舱刀", path: "jianghu" },
  mob_canal_04: { school: "spear", name: "河霸枪", path: "jianghu" },
  mob_canal_05: { school: "saber", name: "贴岸闲刀", path: "jianghu" },
  mob_yamenRunner_01: { school: "palm", name: "皂隶", path: "court" },
  mob_yamenRunner_02: { school: "saber", name: "快班", path: "court" },
  mob_yamenRunner_03: { school: "saber", name: "假帖皂隶", path: "court" },
  mob_yamenRunner_04: { school: "palm", name: "锁链手", path: "court" },
  mob_yamenRunner_05: { school: "saber", name: "杖手", path: "court" },
  mob_yamenRunner_07: { school: "palm", name: "门卒", path: "court" },
  mob_court_02: { school: "saber", name: "内侍刀", path: "court" },
  mob_court_03: { school: "sword", name: "影卫", path: "court" },
  mob_court_04: { school: "sword", name: "锦衣", path: "court", sigs: ["jinyi-lock", "court-cane", "death-grant"] },
  mob_court_05: { school: "saber", name: "绣春", path: "court" },
  mob_court_06: { school: "sword", name: "门下暗", path: "court" },
  mob_court_07: { school: "sword", name: "案卷刺客", path: "court", sigs: ["death-grant", "jinyi-lock", "grant-kill"] },
  mob_court_08: { school: "saber", name: "夜封刀", path: "court" },
  mob_court_09: { school: "sword", name: "暗桩剑", path: "court" },
  mob_court_11: { school: "sword", name: "锦衣哨", path: "court" },
};

const FAMILY_SCHOOL: Record<string, WeaponId[]> = {
  monk: ["staff", "palm", "saber"],
  road: ["saber"],
  escortBand: ["hook", "saber"],
  canal: ["spear", "hook"],
  yamenRunner: ["palm", "saber"],
  court: ["sword", "saber"],
  rebel: ["saber", "spear"],
  side: ["palm", "saber"],
};

export function familyKeyFromEnemyId(id: string): string | null {
  const m = /^mob_([a-zA-Z]+)_/.exec(id);
  return m?.[1] ?? (id.startsWith("luohan_") ? "monk" : null);
}

export function schoolForGeneratedEnemy(id: string, indexInFamily = 0): WeaponId {
  const named = GAUNTLET_FOE_IDENTITY[id];
  if (named) return named.school;
  const fam = familyKeyFromEnemyId(id);
  const pool = fam ? FAMILY_SCHOOL[fam] : undefined;
  if (pool?.length) return pool[indexInFamily % pool.length]!;
  const cycle: WeaponId[] = ["palm", "saber", "spear", "sword", "staff", "hook"];
  return cycle[indexInFamily % cycle.length]!;
}

function energySpec(stage: number, school: WeaponId): EnergySpec {
  if (school === "staff") {
    if (stage <= 2) return { archive: "steady", max: 6, start: 5, breathe: 3 };
    return { archive: "steady", max: 8, start: 6, breathe: 3 };
  }
  if (stage <= 2) return { archive: "short", max: 6, start: 4, breathe: 3 };
  if (stage >= 7 && (school === "saber" || school === "palm")) {
    return { archive: "burst", max: 10, start: 8, breathe: 2 };
  }
  if (stage >= 5 && school === "saber") return { archive: "burst", max: 10, start: 8, breathe: 2 };
  return { archive: "steady", max: 8, start: stage >= 4 ? 6 : 5, breathe: 3 };
}

function dmg(school: WeaponId, grade: EnemyGearGrade, dist: number): number {
  return enemyStrikeAtDist(school, grade, dist);
}

function kitMoves(school: WeaponId, grade: EnemyGearGrade, stage: number, path?: FoeIdentity["path"]): Intent[] {
  const s1 = dmg(school, grade, 1);
  const s2 = dmg(school, grade, 2);
  const narrow = stage <= 2;
  const mid = stage >= 3;
  const heavyOk = stage >= 5;
  const retreat: Intent = { kind: "retreat", steps: stage >= 5 ? 2 : 1 };
  if (school === "staff") {
    const base: Intent[] = [
      { kind: "strike", damage: s1 },
      { kind: "stake" },
      { kind: "pestle", damage: s1 + 4 },
      { kind: "guard", block: 6 + (grade === "jing" ? 0 : 2) },
    ];
    if (!narrow) base.push({ kind: "breathe", amount: 4 });
    if (mid) base.push({ kind: "endure" });
    if (stage >= 5) base.push(retreat);
    return base;
  }
  if (school === "palm") {
    const base: Intent[] = [
      { kind: "strike", damage: s1 },
      { kind: "lunge", damage: s2 },
      { kind: "breathe", amount: 3 },
      retreat,
    ];
    if (mid) base.push({ kind: "barrage", damage: Math.max(3, Math.floor(s1 / 2)), hits: 3 });
    if (mid && path === "shaolin") base.push({ kind: "endure" });
    return base;
  }
  if (school === "saber") {
    const base: Intent[] = [
      { kind: "strike", damage: s2 },
      { kind: "bleedcut", damage: s2, bleed: 2 },
      { kind: "breathe", amount: 3 },
    ];
    if (narrow) return [base[0]!, { kind: "lunge", damage: s2 }, retreat, base[2]!];
    base.push(retreat, { kind: "lunge", damage: s2 });
    if (path === "jianghu" && mid) base.push({ kind: "dust" });
    if (mid) base.push({ kind: "dodge" });
    return base;
  }
  if (school === "sword") {
    const base: Intent[] = [
      { kind: "strike", damage: s2 },
      { kind: "seal" },
      { kind: "guard", block: 6 },
    ];
    if (narrow) return [base[0]!, { kind: "lunge", damage: s2 }, retreat, { kind: "breathe", amount: 3 }];
    base.push({ kind: "swap" }, retreat);
    if (mid) base.push({ kind: "shackle" }, { kind: "windup" });
    if (mid) base.push({ kind: "dodge" });
    return base;
  }
  if (school === "spear") {
    const base: Intent[] = [
      { kind: "lunge", damage: s2 },
      { kind: "strike", damage: s1 },
      { kind: "breathe", amount: 3 },
      retreat,
    ];
    if (heavyOk) base.push({ kind: "charge", damage: s2, steps: 2 });
    if (mid) base.push({ kind: "dodge" });
    return base;
  }
  const hook: Intent[] = [
    { kind: "pull", steps: 1 },
    { kind: "strike", damage: s2 },
    { kind: "breathe", amount: 3 },
    retreat,
  ];
  if (narrow) return hook;
  hook.push({ kind: "shatter", amount: 6 });
  if (path === "jianghu" && mid) hook.push({ kind: "dust" });
  return hook;
}

export function profileFor(
  id: EnemyId,
  stage: number,
  role: "main" | "extra" = "main",
  mode: "break" | "classic" = "break",
): EnemyProfile {
  const ident = GAUNTLET_FOE_IDENTITY[id];
  const school = schoolForGeneratedEnemy(id);
  const grade = enemyGradeForStage(stage, role, mode);
  const remnant = ident?.remnant ?? REMNANT[school];
  const energy = energySpec(stage, school);
  const opener = kitMoves(school, grade, stage, ident?.path);
  const heavy = opener.find((i) => i.kind === "barrage" || i.kind === "charge" || i.kind === "pestle");
  const sigs = stage >= 7 ? (ident?.sigs ?? []) : stage >= 5 ? (ident?.sigs ?? []).slice(0, 1) : [];
  return {
    school,
    grade,
    remnant,
    energy,
    opener,
    heavy,
    sigs,
    name: ident?.name,
  };
}

export function kitCatalogPattern(id: string, indexInFamily: number): Intent[] {
  const school = schoolForGeneratedEnemy(id, indexInFamily);
  return kitMoves(school, "jing", 3, GAUNTLET_FOE_IDENTITY[id]?.path);
}

export interface KitCtx {
  dist: number;
  reach: number;
  energy: number;
  energyMax: number;
  hpRatio: number;
  enemyBlock: number;
  stage: number;
  school: WeaponId;
  playerSchool: WeaponId;
  turn: number;
  foeAtEdge: boolean;
  playerAtEdge: boolean;
  stakes: number;
  grade: EnemyGearGrade;
  opener: Intent[];
  sigs: EnemySigId[];
}

export function followFromKit(ctx: KitCtx, prior: Intent): Intent {
  const inReach = ctx.dist <= ctx.reach;
  const lowEnergy = ctx.energy <= Math.floor(ctx.energyMax / 3);
  const retreatSteps = ctx.stage >= 5 ? 2 : 1;
  const retreat: Intent = { kind: "retreat", steps: retreatSteps };
  const lunge: Intent = { kind: "lunge", damage: enemyStrikeAtDist(ctx.school, ctx.grade, Math.min(2, ctx.dist)) };
  const strike: Intent = { kind: "strike", damage: enemyStrikeAtDist(ctx.school, ctx.grade, Math.max(1, ctx.dist)) };

  if (lowEnergy) {
    const agg = getLabTuning().aiAggression;
    if (ctx.stage >= 4 && inReach && agg >= 50) {
      if (ctx.school === "saber" && ctx.dist <= 2) {
        return { kind: "bleedcut", damage: enemyStrikeAtDist("saber", ctx.grade, 2), bleed: 2 };
      }
      return strike;
    }
    return { kind: "breathe", amount: ctx.school === "staff" ? 4 : 3 };
  }

  const readYou = ctx.stage >= 3;
  if (prior.kind === "pull") return inReach ? strike : lunge;
  if (prior.kind === "stake") {
    if (ctx.school === "staff" && ctx.stakes > 0) return { kind: "pestle", damage: strike.kind === "strike" ? strike.damage + 4 : 12 };
    return inReach ? strike : lunge;
  }
  if (prior.kind === "windup") return { kind: "strike", damage: enemyStrikeAtDist(ctx.school, ctx.grade, 1) + 6 };
  if (prior.kind === "retreat" || prior.kind === "lunge") return inReach ? strike : lunge;
  if (prior.kind === "breathe") return inReach ? strike : lunge;
  if (prior.kind === "guard") return inReach ? strike : lunge;
  if (prior.kind === "dodge" || prior.kind === "endure") return inReach ? strike : lunge;
  if (prior.kind === "dust" || prior.kind === "shackle") return inReach ? strike : lunge;

  if (readYou && ctx.stage >= 3 && inReach && ctx.playerSchool === "saber" && ctx.turn % 3 === 0 && prior.kind !== "dodge") {
    return { kind: "dodge" };
  }
  if (readYou && ctx.stage >= 3 && (ctx.school === "staff" || ctx.school === "palm") && ctx.turn % 4 === 1 && prior.kind !== "endure") {
    return { kind: "endure" };
  }

  if (readYou && ctx.hpRatio < 0.28 && ctx.stage >= 6 && ctx.dist <= 2 && prior.kind !== "retreat") {
    return retreat;
  }
  if (readYou && (ctx.playerSchool === "spear" || ctx.playerSchool === "staff") && ctx.dist > 1) {
    return lunge;
  }
  if (ctx.stage >= 5 && ctx.foeAtEdge && ctx.dist <= 2 && prior.kind !== "swap") {
    return { kind: "swap" };
  }
  if (!inReach) return ctx.stage <= 2 ? lunge : retreat;
  if (ctx.school === "saber" && ctx.dist <= 2) return { kind: "bleedcut", damage: enemyStrikeAtDist("saber", ctx.grade, 2), bleed: 2 };
  if (ctx.school === "palm" && ctx.turn % 2 === 0) {
    return { kind: "barrage", damage: Math.max(3, Math.floor(enemyStrikeAtDist("palm", ctx.grade, 1) / 2)), hits: 3 };
  }
  return strike;
}

export function chooseFromKit(ctx: KitCtx): Intent {
  const inReach = ctx.dist <= ctx.reach;
  if (ctx.stage >= 7 && ctx.sigs.length && ctx.turn % 3 === 1) {
    const sig = SIGNATURE_BREAK[ctx.sigs[0]!];
    if (sig) return sig.intent;
  }
  const first = ctx.opener[0];
  if (first) {
    if (first.kind === "stake" && inReach && ctx.stage >= 2) {
      return { kind: "pestle", damage: enemyStrikeAtDist(ctx.school, ctx.grade, 1) + 4 };
    }
    if (first.kind === "breathe" && ctx.stage >= 3 && inReach) {
      return { kind: "strike", damage: enemyStrikeAtDist(ctx.school, ctx.grade, Math.max(1, ctx.dist)) };
    }
    if ((first.kind === "strike" || first.kind === "bleedcut" || first.kind === "barrage" || first.kind === "pestle") && ctx.dist > ctx.reach) {
      return { kind: "lunge", damage: enemyStrikeAtDist(ctx.school, ctx.grade, 2) };
    }
    return first;
  }
  return followFromKit(ctx, { kind: "breathe", amount: 3 });
}

const KIT_REACH: Record<WeaponId, number> = {
  palm: 1,
  saber: 2,
  sword: 2,
  hook: 2,
  spear: 3,
  staff: 3,
};

export function kitReach(school: WeaponId): number {
  return KIT_REACH[school];
}

export function enemyGearName(school: WeaponId, grade: EnemyGearGrade): string {
  return enemyGear(school, grade).name;
}

const PATH_INTENT_NAME: Record<string, Partial<Record<string, string>>> = {
  shaolin: { strike: "摩诃掌", barrage: "罗汉拳", guard: "金刚架", retreat: "抽身", lunge: "踏禅", pestle: "韦陀杵", endure: "金身" },
  jianghu: { strike: "扑刀", barrage: "乱刀", lunge: "抢路", retreat: "抽步", bleedcut: "开皮", pull: "套索", dodge: "闪身" },
  court: { strike: "衙役劈", lunge: "锁步", seal: "封帖", retreat: "退堂", shatter: "砸牌", guard: "官架", dodge: "侧步" },
};

const SCHOOL_STRIKE: Record<WeaponId, string> = {
  palm: "崩拳",
  saber: "劈刀",
  sword: "点刺",
  spear: "点枪",
  staff: "戳棍",
  hook: "刮钩",
};

/** 条上招式名：按路数/兵刃区分，避免所有人共用「打击」。 */
export function foeIntentAlias(enemyId: string, intent: Intent): string | null {
  if (intent.kind === "sig") return null;
  const ident = GAUNTLET_FOE_IDENTITY[enemyId];
  const fam = familyKeyFromEnemyId(enemyId);
  const path = ident?.path ?? (fam === "monk" ? "shaolin" : fam === "court" || fam === "yamenRunner" ? "court" : "jianghu");
  const fromPath = PATH_INTENT_NAME[path]?.[intent.kind];
  if (fromPath) return fromPath;
  if (intent.kind === "strike") {
    const school = ident?.school ?? schoolForGeneratedEnemy(enemyId);
    return SCHOOL_STRIKE[school] ?? null;
  }
  return null;
}
