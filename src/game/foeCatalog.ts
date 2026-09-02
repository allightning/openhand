import type { EnemyDef, EnemyId, Intent, WeaponId } from "./types";
import { GAUNTLET_FOE_IDENTITY, kitCatalogPattern, schoolForGeneratedEnemy } from "./enemyKit";

const FAMILIES: {
  key: string;
  title: string;
  names: string[];
  hp: number;
  pace: number;
  pattern: Intent[];
  pitch: string;
  count: number;
}[] = [
  {
    key: "road",
    title: "路匪",
    names: ["剪径", "坡蹲", "伏草", "拦轿", "摸包", "黑布", "短刀客", "索命", "夜影", "荒丘"],
    hp: 32,
    pace: 5,
    pattern: [
      { kind: "strike", damage: 10 },
      { kind: "lunge", damage: 12 },
      { kind: "guard", block: 4 },
      { kind: "breathe", amount: 3 },
    ],
    pitch: "官道旁跳出人来。要银，或者要命。",
    count: 18,
  },
  {
    key: "escortBand",
    title: "劫镖",
    names: ["截镖", "拆箱", "换帖", "假旗", "断缆", "卡口", "水匪哨", "岸匪", "夜劫", "明抢"],
    hp: 38,
    pace: 4,
    pattern: [
      { kind: "charge", damage: 11, steps: 1 },
      { kind: "strike", damage: 12 },
      { kind: "guard", block: 6 },
      { kind: "bleedcut", damage: 8, bleed: 2 },
      { kind: "trap" },
    ],
    pitch: "镖旗一歪，人就围上来了。",
    count: 14,
  },
  {
    key: "yamenRunner",
    title: "差役",
    names: ["快班", "皂隶", "捕快副", "锁链手", "杖手", "门卒", "夜巡", "案前刀", "押解", "堂鼓"],
    hp: 36,
    pace: 4,
    pattern: [
      { kind: "strike", damage: 11 },
      { kind: "guard", block: 6 },
      { kind: "breathe", amount: 3 },
      { kind: "pull", steps: 1 },
    ],
    pitch: "官府的人认帖，也认刀。",
    count: 12,
  },
  {
    key: "monk",
    title: "僧兵",
    names: ["罗汉甲", "罗汉乙", "罗汉丙", "罗汉丁", "棍僧", "拳僧", "刀僧", "禅杖", "护寺", "戒刀"],
    hp: 42,
    pace: 5,
    pattern: [
      { kind: "strike", damage: 12 },
      { kind: "stake" },
      { kind: "barrage", damage: 5, hits: 3 },
      { kind: "guard", block: 8 },
      { kind: "breathe", amount: 4 },
    ],
    pitch: "寺里的规矩：过阵的人，先过招。",
    count: 20,
  },
  {
    key: "canal",
    title: "漕帮",
    names: ["纤手", "舱刀", "盐牙打手", "船帮", "闸口匪", "仓管恶", "河霸", "趸匪", "潮口刀", "缆手恶"],
    hp: 40,
    pace: 4,
    pattern: [
      { kind: "pull", steps: 2 },
      { kind: "strike", damage: 13 },
      { kind: "guard", block: 6 },
      { kind: "bleedcut", damage: 9, bleed: 2 },
    ],
    pitch: "运河上的人，认帮不认官。",
    count: 14,
  },
  {
    key: "court",
    title: "宫廷暗桩",
    names: ["影卫", "内侍刀", "禁军探", "锦衣哨", "绣春", "门下暗", "案卷刺客", "夜封", "夺名走卒", "殿前替"],
    hp: 48,
    pace: 6,
    pattern: [
      { kind: "lunge", damage: 14 },
      { kind: "swap" },
      { kind: "seal" },
      { kind: "bleedcut", damage: 10, bleed: 3 },
      { kind: "guard", block: 5 },
    ],
    pitch: "宫墙内的刀，不写在册上。",
    count: 12,
  },
  {
    key: "rebel",
    title: "乱军",
    names: ["叛卒", "夺玺走卒", "营门刀", "旗手恶", "火药手", "夜袭", "断粮匪", "哗变", "伪符使", "营啸"],
    hp: 44,
    pace: 5,
    pattern: [
      { kind: "charge", damage: 13, steps: 2 },
      { kind: "guard", block: 7 },
      { kind: "strike", damage: 14 },
      { kind: "breathe", amount: 3 },
      { kind: "barrage", damage: 6, hits: 2 },
    ],
    pitch: "营里起了啸声。刀光比灯笼亮。",
    count: 12,
  },
  {
    key: "side",
    title: "支线恶客",
    names: ["赌棚打手", "医馆恶霸", "茶棚赖", "当铺护柜", "武馆踢馆", "客栈劫财", "庙会剪绺", "戏台闹事", "井边勒索", "渡口讹银"],
    hp: 34,
    pace: 5,
    pattern: [
      { kind: "strike", damage: 10 },
      { kind: "guard", block: 5 },
      { kind: "breathe", amount: 3 },
      { kind: "lunge", damage: 11 },
    ],
    pitch: "琐事也能动刀。刀不认事大。",
    count: 16,
  },
];

function scaleIntent(intent: Intent): Intent {
  const bump = (n: number) => Math.max(1, Math.round(n * 1.18));
  if ("damage" in intent && typeof intent.damage === "number") {
    return { ...intent, damage: bump(intent.damage) };
  }
  if (intent.kind === "guard" && typeof intent.block === "number") {
    return { ...intent, block: bump(intent.block) };
  }
  return intent;
}

/** 中路/案上会撞到的可辨认精英：蓄势 / 裂盾创 / 桩控 */
const ELITE_STAMPS: Record<
  string,
  { title: string; elite: NonNullable<EnemyDef["elite"]>; pattern: Intent[]; remnant: EnemyDef["remnant"]; hpMul: number }
> = {
  mob_road_05: {
    title: "蓄势路匪",
    elite: "windup",
    remnant: "delayGuard",
    hpMul: 1.22,
    pattern: [{ kind: "windup" }, { kind: "strike", damage: 22 }, { kind: "guard", block: 10 }],
  },
  mob_canal_03: {
    title: "闸口舱刀",
    elite: "stake",
    remnant: "tether",
    hpMul: 1.28,
    pattern: [
      { kind: "pull", steps: 2 },
      { kind: "stake" },
      { kind: "bleedcut", damage: 12, bleed: 3 },
      { kind: "guard", block: 8 },
    ],
  },
  mob_escortBand_02: {
    title: "裂旗劫手",
    elite: "shatter",
    remnant: "rebound",
    hpMul: 1.25,
    pattern: [
      { kind: "shatter", amount: 10 },
      { kind: "bleedcut", damage: 11, bleed: 3 },
      { kind: "charge", damage: 14, steps: 1 },
      { kind: "barrage", damage: 6, hits: 3 },
    ],
  },
  mob_road_08: {
    title: "坡蹲头目",
    elite: "windup",
    remnant: "delayGuard",
    hpMul: 1.2,
    pattern: [{ kind: "windup" }, { kind: "lunge", damage: 18 }, { kind: "guard", block: 9 }, { kind: "strike", damage: 14 }],
  },
  mob_canal_05: {
    title: "贴岸闲刀",
    elite: "stake",
    remnant: "tether",
    hpMul: 1.22,
    pattern: [
      { kind: "pull", steps: 2 },
      { kind: "bleedcut", damage: 11, bleed: 3 },
      { kind: "stake" },
      { kind: "guard", block: 7 },
    ],
  },
  mob_yamenRunner_03: {
    title: "假帖皂隶",
    elite: "shatter",
    remnant: "leftover",
    hpMul: 1.24,
    pattern: [
      { kind: "shatter", amount: 9 },
      { kind: "strike", damage: 13 },
      { kind: "pull", steps: 1 },
      { kind: "guard", block: 8 },
    ],
  },
  mob_canal_04: {
    title: "集上秤匪",
    elite: "shatter",
    remnant: "tether",
    hpMul: 1.18,
    pattern: [
      { kind: "shatter", amount: 8 },
      { kind: "bleedcut", damage: 10, bleed: 2 },
      { kind: "pull", steps: 1 },
      { kind: "barrage", damage: 5, hits: 3 },
    ],
  },
};

function remnantFor(id: string, famKey: string, school: WeaponId): EnemyDef["remnant"] {
  const ident = GAUNTLET_FOE_IDENTITY[id];
  if (ident?.remnant) return ident.remnant;
  if (school === "staff") return "hardWall";
  if (school === "hook") return "tether";
  if (school === "sword") return "delayGuard";
  if (school === "saber") return "rebound";
  if (famKey === "canal") return "tether";
  if (famKey === "escortBand") return "rebound";
  if (famKey === "court") return "delayGuard";
  return "leftover";
}

function build(): Record<string, EnemyDef> {
  const out: Record<string, EnemyDef> = {};
  for (const fam of FAMILIES) {
    for (let i = 0; i < fam.count; i++) {
      const id = `mob_${fam.key}_${String(i + 1).padStart(2, "0")}` as EnemyId;
      const ident = GAUNTLET_FOE_IDENTITY[id];
      const school = schoolForGeneratedEnemy(id, i);
      const name = ident?.name ?? fam.names[i % fam.names.length] + (i >= fam.names.length ? `·${i + 1}` : "");
      const hp = Math.round((fam.hp + (i % 5) * 2) * 1.18);
      out[id] = {
        id,
        name,
        title: fam.title,
        hp,
        pos: 4 + (i % 2),
        skill: fam.title,
        pitch: fam.pitch,
        remnant: remnantFor(id, fam.key, school),
        pattern: kitCatalogPattern(id, i).map((p) => scaleIntent(p)),
        pace: fam.pace,
      };
    }
  }
  // 十八罗汉具名挑战（难度递升）
  for (let i = 1; i <= 18; i++) {
    const id = `luohan_${String(i).padStart(2, "0")}` as EnemyId;
    const raw: Intent[] =
      i <= 6
        ? [
            { kind: "strike", damage: 10 + i },
            { kind: "guard", block: 4 + Math.floor(i / 2) },
            { kind: "breathe", amount: 3 },
          ]
        : i <= 12
          ? [
              { kind: "barrage", damage: 5, hits: 2 + (i % 2) },
              { kind: "guard", block: 8 },
              { kind: "strike", damage: 12 + i },
              { kind: "stake" },
            ]
          : [
              { kind: "charge", damage: 14 + i, steps: 1 },
              { kind: "breathe", amount: 4 },
              { kind: "bleedcut", damage: 10, bleed: 2 },
              { kind: "barrage", damage: 6, hits: 3 },
              { kind: "guard", block: 10 },
            ];
    out[id] = {
      id,
      name: `罗汉${["一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八"][i - 1]}`,
      title: i <= 6 ? "外院罗汉" : i <= 12 ? "戒坛罗汉" : "大雄罗汉",
      hp: Math.round((36 + i * 4) * 1.18),
      pos: 5,
      skill: "罗汉阵",
      remnant: i >= 15 ? "throne" : i >= 8 ? "hardWall" : "leftover",
      pattern: raw.map((p) => scaleIntent(p)),
      pitch: `罗汉阵第 ${i} 关。过了，才算进得了后殿。`,
      pace: 4 + Math.floor(i / 4),
    };
  }
  for (const [id, stamp] of Object.entries(ELITE_STAMPS)) {
    const base = out[id];
    if (!base) continue;
    out[id] = {
      ...base,
      title: stamp.title,
      elite: stamp.elite,
      remnant: stamp.remnant,
      hp: Math.round(base.hp * stamp.hpMul),
      pattern: stamp.pattern.map((p) => scaleIntent(p)),
      pitch: `${base.pitch} 这人招式不寻常。`,
      skill: stamp.title,
    };
  }
  return out;
}

export const GENERATED_ENEMIES: Record<string, EnemyDef> = build();

export const GENERATED_ELITE_IDS = Object.keys(ELITE_STAMPS);

export const GENERATED_ELITE_ENERGY: Record<string, number> = Object.fromEntries(
  GENERATED_ELITE_IDS.map((id) => [id, 3]),
);

export const GENERATED_ENEMY_WEAPON: Record<string, WeaponId> = Object.fromEntries(
  Object.keys(GENERATED_ENEMIES).map((id, i) => {
    const fam = /^mob_([a-zA-Z]+)_\d+$/.exec(id);
    const idx = fam ? Number(id.slice(id.lastIndexOf("_") + 1)) - 1 : i;
    return [id, schoolForGeneratedEnemy(id, idx)];
  }),
);

export function generatedEnemyCount(): number {
  return Object.keys(GENERATED_ENEMIES).length;
}
