import type { WeaponId } from "./types";
import { WEAPON_NAME } from "./party";

/** 凡良精玄神 — five combat gear tiers. */
export type WeaponTier = "fan" | "liang" | "jing" | "xuan" | "shen";

export const TIER_NAME: Record<WeaponTier, string> = {
  fan: "凡",
  liang: "良",
  jing: "精",
  xuan: "玄",
  shen: "神",
};

export const TIER_RANK: Record<WeaponTier, number> = {
  fan: 1,
  liang: 2,
  jing: 3,
  xuan: 4,
  shen: 5,
};

export type WeaponPath = "a" | "b";

/** Secondary attrs unlock from 精. */
export interface GearSecondary {
  /** Extra block on defend-like plays */
  ward?: number;
  /** Extra knock on push/pull */
  knock?: number;
  /** Start-of-turn qi regen bonus */
  qiRegen?: number;
  /** Combo payoff bonus damage */
  comboPay?: number;
  /** Bleed on hit */
  bleed?: number;
  /** Expose on hit */
  expose?: number;
}

export interface GearWeapon {
  id: string;
  school: WeaponId;
  path: WeaponPath;
  /** 1–5 maps to 凡…神 */
  grade: number;
  tier: WeaponTier;
  name: string;
  damage: number;
  knock: number;
  ward: number;
  secondary: GearSecondary;
  /** Passive rule from 精; god skill name from 神 */
  skill: string | null;
  godSkill: string | null;
  price: number;
  tip: string;
}

const SCHOOLS: WeaponId[] = ["palm", "saber", "spear", "sword", "staff", "hook"];

const PATH_NAME: Record<WeaponId, Record<WeaponPath, string>> = {
  palm: { a: "破门", b: "连环" },
  saber: { a: "砍门", b: "快刀" },
  spear: { a: "锁步", b: "点穴" },
  sword: { a: "刺点", b: "格反" },
  staff: { a: "定桩", b: "扫位" },
  hook: { a: "拉近", b: "缴械" },
};

const TIER_OF: WeaponTier[] = ["fan", "liang", "jing", "xuan", "shen"];

const NAMES: Record<WeaponId, Record<WeaponPath, string[]>> = {
  palm: {
    a: ["粗布拳套", "铁钉拳套", "破门拳套", "裂石拳套", "明手神套"],
    b: ["软布缠手", "连珠套", "连环拳套", "叠浪套", "连明神套"],
  },
  saber: {
    a: ["柴刀", "码头砍刀", "破浪刀", "斩名刀", "轨刃·神兵"],
    b: ["片刀", "柳叶刀", "迅刀", "影刀", "快轨·神兵"],
  },
  spear: {
    a: ["竹矛", "铁枪", "穿潮枪", "镇海枪", "锡杖神枪"],
    b: ["点竿", "细枪", "封手枪", "判官枪", "谶枪·神兵"],
  },
  sword: {
    a: ["木剑", "青锋", "照影剑", "镜心剑", "谶剑·神兵"],
    b: ["竹剑", "护手剑", "还刺剑", "镜格剑", "守谶·神兵"],
  },
  staff: {
    a: ["木棍", "齐眉棍", "开路棍", "定潮棍", "工兵神棍"],
    b: ["藤条", "拨棍", "拦路棍", "搅潮棍", "工扫神棍"],
  },
  hook: {
    a: ["绳钩", "铁钩", "拖尸钩", "沉渊钩", "纤力神钩"],
    b: ["软索", "卸钩", "夺兵钩", "断兵钩", "纤缴神钩"],
  },
};

export const PATH_SKILL: Record<string, string> = {
  "palm-a": "推中墙外，格挡+1",
  "palm-b": "连势有层时伤+1（仍要先付连势代价）",
  "saber-a": "贴身（距1）伤+1",
  "saber-b": "先机高于敌时伤+1",
  "spear-a": "命中后敌少移1（本息）",
  "spear-b": "破绽+1（有上限）",
  "sword-a": "点穴叠层时抽1（限1）",
  "sword-b": "有格挡时反震+1",
  "staff-a": "格挡牌额外+1架",
  "staff-b": "扫类多推1",
  "hook-a": "拉近成功伤+1",
  "hook-b": "拉近时卸敌架1",
};

export const GOD_SKILL: Record<string, string> = {
  "palm-a": "连环震步：本息每段连势额外推1",
  "palm-b": "叠浪三连：连势≥2时本息第三击免费",
  "saber-a": "破门三斩：贴身三连，第三段伤翻倍",
  "saber-b": "快刀两断：先机领先时抽1并回1劲",
  "spear-a": "锁喉连点：命中封敌技1息",
  "spear-b": "点穴三封：点穴满3时敌手牌上限-1",
  "sword-a": "照影二连：攻击后可再打一张0耗技能",
  "sword-b": "格反还刺：反震触发时回2劲",
  "staff-a": "定桩回架：开局铁布+2，持续1息",
  "staff-b": "扫位千斤：扫中多人时伤+3",
  "hook-a": "纤力回拖：拉近成功回2劲",
  "hook-b": "缴兵入怀：缴械成功抽2",
};

function secondaryFor(school: WeaponId, path: WeaponPath, grade: number): GearSecondary {
  if (grade < 3) return {};
  const t = grade - 2;
  if (school === "palm") return path === "a" ? { knock: t, ward: Math.floor(t / 2) } : { comboPay: t, qiRegen: Math.floor(t / 2) };
  if (school === "saber") return path === "a" ? { bleed: t, ward: Math.floor(t / 2) } : { comboPay: t, bleed: Math.floor(t / 2) };
  if (school === "spear") return path === "a" ? { expose: t, knock: Math.floor(t / 2) } : { expose: t, qiRegen: Math.floor(t / 2) };
  if (school === "sword") return path === "a" ? { expose: t, qiRegen: Math.floor(t / 2) } : { ward: t, comboPay: Math.floor(t / 2) };
  if (school === "staff") return path === "a" ? { ward: t, knock: Math.floor(t / 2) } : { knock: t, ward: Math.floor(t / 2) };
  return path === "a" ? { knock: t, qiRegen: Math.floor(t / 2) } : { expose: t, comboPay: Math.floor(t / 2) };
}

function buildAll(): GearWeapon[] {
  const out: GearWeapon[] = [];
  for (const school of SCHOOLS) {
    for (const path of ["a", "b"] as WeaponPath[]) {
      for (let g = 1; g <= 5; g++) {
        const tier = TIER_OF[g - 1];
        const damage = g - 1 + (g >= 4 ? g - 3 : 0);
        const knock =
          school === "palm" || school === "staff" || school === "hook" ? Math.floor((g - 1) / 2) : 0;
        const ward = school === "staff" || school === "saber" ? Math.floor((g - 1) / 2) : 0;
        const secondary = secondaryFor(school, path, g);
        const skill = g >= 3 ? `${school}-${path}` : null;
        const godSkill = g >= 5 ? GOD_SKILL[`${school}-${path}`] ?? null : null;
        const price = 6 + g * g * 4 + (path === "b" ? 3 : 0) + (g >= 5 ? 40 : 0);
        const name = NAMES[school][path][g - 1];
        const tipParts = [
          `${WEAPON_NAME[school]}·${PATH_NAME[school][path]}`,
          TIER_NAME[tier],
          `伤+${damage}`,
        ];
        if (skill) tipParts.push(PATH_SKILL[skill] ?? skill);
        if (godSkill) tipParts.push(godSkill);
        out.push({
          id: `${school}-${path}-${g}`,
          school,
          path,
          grade: g,
          tier,
          name,
          damage,
          knock,
          ward,
          secondary,
          skill,
          godSkill,
          price,
          tip: tipParts.join(" · "),
        });
      }
    }
  }
  return out;
}

export const GEAR_WEAPONS: GearWeapon[] = buildAll();

export function nextGrade(id: string): string | null {
  const g = gearById(id);
  if (!g || g.grade >= 5) return null;
  return `${g.school}-${g.path}-${g.grade + 1}`;
}

export function gearById(id: string | null | undefined): GearWeapon | null {
  if (!id) return null;
  const hit = GEAR_WEAPONS.find((g) => g.id === id);
  if (hit) return hit;
  // legacy palm-3 or palm-a-7 → clamp into 1–5
  const m = /^([a-z]+)-(?:([ab])-)?(\d+)$/.exec(id);
  if (!m) return null;
  const school = m[1] as WeaponId;
  const path = (m[2] as WeaponPath | undefined) ?? "a";
  const raw = Number(m[3]);
  const grade = Math.min(5, Math.max(1, raw <= 5 ? raw : Math.ceil(raw / 2)));
  return GEAR_WEAPONS.find((g) => g.school === school && g.path === path && g.grade === grade) ?? null;
}

export function gearForSchool(school: WeaponId, path?: WeaponPath): GearWeapon[] {
  return GEAR_WEAPONS.filter((g) => g.school === school && (path ? g.path === path : true));
}

export function starterGear(school: WeaponId): string {
  return `${school}-a-1`;
}

export function shopStock(scene: string, silver: number): GearWeapon[] {
  const sceneBoost =
    scene === "shaolin" || scene === "luohan" || scene === "bianjing" || scene === "linan" || scene === "luoyang"
      ? 1
      : scene === "yangzhou" || scene === "jiankang" || scene === "suzhou" || scene === "huainan"
        ? 0
        : -1;
  const maxGrade = Math.min(5, (silver >= 120 ? 5 : silver >= 60 ? 4 : silver >= 30 ? 3 : 2) + sceneBoost);
  const minGrade = 1;
  const pool = GEAR_WEAPONS.filter((g) => g.grade >= minGrade && g.grade <= Math.max(2, maxGrade));
  if (scene === "martial" || scene === "wine") {
    return pool.filter((g) => g.school === "palm" || g.school === "saber" || g.school === "staff").slice(0, 8);
  }
  if (scene === "pawn") return pool.filter((g) => g.grade <= 2).slice(0, 6);
  if (scene === "docks" || scene === "pier") {
    return pool.filter((g) => g.school === "hook" || g.school === "spear").slice(0, 6);
  }
  if (scene === "shaolin" || scene === "luohan") {
    return pool.filter((g) => g.grade >= 3).slice(0, 8);
  }
  if (scene === "yangzhou" || scene === "suzhou" || scene === "jiankang") {
    return pool.filter((g) => g.grade >= 2).slice(0, 8);
  }
  return pool.slice(0, 8);
}

export type PathSkillCtx = {
  dist?: number;
  combo?: number;
  paceAdvantage?: boolean;
  hasBlock?: boolean;
};

export function pathSkillMods(
  idOrGear: string | GearWeapon | null | undefined,
  ctx?: PathSkillCtx,
): {
  wallBlock?: number;
  comboDmg?: number;
  nearDmg?: number;
  paceDmg?: number;
  expose?: number;
  thorns?: number;
  blockExtra?: number;
  knockExtra?: number;
  pullDmg?: number;
  pullStrip?: number;
  qiRegen?: number;
  /** Resolved hit bonus for this strike. */
  damage?: number;
  ward?: number;
  note?: string;
} {
  const g = typeof idOrGear === "object" && idOrGear ? idOrGear : gearById(idOrGear ?? null);
  if (!g?.skill) return { qiRegen: g?.secondary.qiRegen };
  const sec = g.secondary;
  const base =
    g.skill === "palm-a"
      ? { wallBlock: 1 }
      : g.skill === "palm-b"
        ? { comboDmg: 1 + (sec.comboPay ?? 0) }
        : g.skill === "saber-a"
          ? { nearDmg: 1 }
          : g.skill === "saber-b"
            ? { paceDmg: 1 }
            : g.skill === "spear-b"
              ? { expose: 1 }
              : g.skill === "sword-b"
                ? { thorns: 1 }
                : g.skill === "staff-a"
                  ? { blockExtra: 1 }
                  : g.skill === "staff-b"
                    ? { knockExtra: 1 }
                    : g.skill === "hook-a"
                      ? { pullDmg: 1 }
                      : g.skill === "hook-b"
                        ? { pullStrip: 1 }
                        : {};
  let damage = 0;
  const notes: string[] = [];
  if (ctx) {
    if (base.nearDmg && (ctx.dist ?? 99) <= 1) {
      damage += base.nearDmg;
      notes.push("近刃");
    }
    if (base.comboDmg && (ctx.combo ?? 0) > 0) {
      damage += base.comboDmg;
      notes.push("连刃");
    }
    if (base.paceDmg && ctx.paceAdvantage) {
      damage += base.paceDmg;
      notes.push("抢先");
    }
  }
  const ward = sec.ward || undefined;
  return {
    ...base,
    qiRegen: sec.qiRegen,
    damage: damage || undefined,
    ward,
    note: notes.length ? notes.join("·") : undefined,
  };
}
