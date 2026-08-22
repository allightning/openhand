/**
 * 货币 / 丹药 / 锻材 / 阶段奖励骨架。
 * 银两 = 日常；元宝 = 中高阶；通宝 = 稀少（已在 bag/save）。
 *
 * 丹药三档（对齐兵器「凡良玄」口吻，三级够用）：
 * - 凡药：只回血，战场/掉落常见
 * - 良药：小幅永久加气血或劲力上限，选一名同行服用
 * - 玄药：大幅永久属性，须炼丹；材料多在中后期
 *
 * 锻材（精/玄/神兵器才要）：
 * - 精材、玄铁、神髓
 */
import type { BagGoodsId } from "./bag";
import { BAG_NAME, bagCount } from "./bag";
import { stageOfScene, stageSilver, type Stage } from "./progress";
import type { CompanionId, EnemyId, Reward, Run } from "./types";
import { gearById, nextGrade } from "./weapons";

export type PillTier = "fan" | "liang" | "xuan";

export const PILL_TIER_NAME: Record<PillTier, string> = {
  fan: "凡药",
  liang: "良药",
  xuan: "玄药",
};

export const PILL_TIER_TIP: Record<PillTier, string> = {
  fan: "敷伤回血。不改根基。",
  liang: "选一人服下，略增气血或劲力上限。",
  xuan: "须炼丹。大幅抬一人属性，为后期超模敌手备。",
};

/** 锻材三档 — 精/玄/神兵才吃。 */
export type ForgeMat = "forgeJing" | "forgeXuan" | "forgeShen";

export const FORGE_NAME: Record<ForgeMat, string> = {
  forgeJing: "精材",
  forgeXuan: "玄铁",
  forgeShen: "神髓",
};

export const FORGE_TIP: Record<ForgeMat, string> = {
  forgeJing: "锻精级兵器。铁匠铺认。",
  forgeXuan: "锻玄级兵器。中后期才多见。",
  forgeShen: "锻神兵。极稀，多在关底与大敌。",
};

/** 固定运镖目的地池 — 皆为图上可到之城/口。 */
export const ESCORT_DESTS = [
  { id: "huainan", name: "淮阴渡", via: ["wharf", "pier"] },
  { id: "yangzhou", name: "扬州", via: ["huainan"] },
  { id: "jiankang", name: "建康", via: ["yangzhou"] },
  { id: "gaoyou", name: "高邮", via: ["bianjing", "yangzhou"] },
  { id: "suzhousu", name: "宿州", via: ["bianjing"] },
  { id: "luoyang", name: "洛阳", via: ["bianjing"] },
] as const;

export type EscortDestId = (typeof ESCORT_DESTS)[number]["id"];

/** 运镖路上必打的强敌（绕不开）。 */
export const ESCORT_ELITES: EnemyId[] = [
  "bandit",
  "hillBandit",
  "riverThug",
  "brute",
  "warden",
  "escort",
];

export function pickEscortJob(seed = Math.random()): {
  dest: EscortDestId;
  name: string;
  elite: EnemyId;
} {
  const dest = ESCORT_DESTS[Math.floor(seed * ESCORT_DESTS.length) % ESCORT_DESTS.length]!;
  const elite = ESCORT_ELITES[Math.floor(seed * 997) % ESCORT_ELITES.length]!;
  return { dest: dest.id, name: dest.name, elite };
}

export interface CompanionBonus {
  maxHp?: number;
  qiMax?: number;
  pace?: number;
}

export function bonusOf(run: Run, id: string): CompanionBonus {
  return run.companionBonus?.[id] ?? {};
}

export function applyPillToMate(
  run: Run,
  mate: CompanionId,
  pill: "pillLiangHp" | "pillLiangQi" | "pillXuanHp" | "pillXuanQi" | "pillXuanPace",
): Run {
  const cur = { ...(run.companionBonus?.[mate] ?? {}) };
  if (pill === "pillLiangHp") cur.maxHp = (cur.maxHp ?? 0) + 2;
  if (pill === "pillLiangQi") cur.qiMax = (cur.qiMax ?? 0) + 1;
  if (pill === "pillXuanHp") cur.maxHp = (cur.maxHp ?? 0) + 6;
  if (pill === "pillXuanQi") cur.qiMax = (cur.qiMax ?? 0) + 2;
  if (pill === "pillXuanPace") cur.pace = (cur.pace ?? 0) + 1;
  const companionBonus = { ...(run.companionBonus ?? {}), [mate]: cur };
  // 当场也抬当前血上限感：若是主角，抬 run.hp 上限通过 battle 读取 bonus
  if (mate === run.hero || mate === run.active) {
    if (pill === "pillLiangHp" || pill === "pillXuanHp") {
      const add = pill === "pillXuanHp" ? 6 : 2;
      return { ...run, companionBonus, hp: run.hp + add };
    }
  }
  return { ...run, companionBonus };
}

/** 阶段掉落权重：银 / 元宝 / 凡药 / 良药材 / 锻材 / 残谱箱感（银+牌另算）。 */
export function stageLootWeights(stage: Stage): {
  silver: number;
  yuanbao: number;
  fanPill: number;
  liangPill: number;
  forgeJing: number;
  forgeXuan: number;
  forgeShen: number;
  forgeAlt: number;
  pass: number;
  scrollBox: number;
} {
  if (stage === "early") {
    return {
      silver: 0.5,
      yuanbao: 0.02,
      fanPill: 0.24,
      liangPill: 0.08,
      forgeJing: 0.06,
      forgeXuan: 0,
      forgeShen: 0,
      forgeAlt: 0.05,
      pass: 0.02,
      scrollBox: 0.03,
    };
  }
  if (stage === "mid") {
    return {
      silver: 0.3,
      yuanbao: 0.1,
      fanPill: 0.13,
      liangPill: 0.14,
      forgeJing: 0.12,
      forgeXuan: 0.05,
      forgeShen: 0,
      forgeAlt: 0.08,
      pass: 0.04,
      scrollBox: 0.04,
    };
  }
  return {
    silver: 0.2,
    yuanbao: 0.14,
    fanPill: 0.09,
    liangPill: 0.11,
    forgeJing: 0.1,
    forgeXuan: 0.09,
    forgeShen: 0.04,
    forgeAlt: 0.07,
    pass: 0.06,
    scrollBox: 0.1,
  };
}

export function rollSideLoot(_run: Run, scene: string): Reward[] {
  const stage = stageOfScene(scene);
  const w = stageLootWeights(stage);
  const roll = Math.random();
  let acc = 0;
  const hit = (p: number) => {
    acc += p;
    return roll < acc;
  };
  if (hit(w.silver)) return [{ kind: "silver", amount: stageSilver(stage, 3 + Math.floor(Math.random() * 4)) }];
  if (hit(w.yuanbao)) return [{ kind: "yuanbao", amount: 1 }];
  if (hit(w.fanPill)) return [{ kind: "goods", id: "pillFan", n: 1 }];
  if (hit(w.liangPill)) return [{ kind: "goods", id: Math.random() < 0.5 ? "pillLiangHp" : "pillLiangQi", n: 1 }];
  if (hit(w.forgeJing)) return [{ kind: "goods", id: "forgeJing", n: 1 }];
  if (hit(w.forgeXuan)) return [{ kind: "goods", id: "forgeXuan", n: 1 }];
  if (hit(w.forgeShen)) return [{ kind: "goods", id: "forgeShen", n: 1 }];
  if (hit(w.forgeAlt)) {
    const alt: BagGoodsId[] = ["forgeIron", "forgeCoal", "forgeOil"];
    return [{ kind: "goods", id: alt[Math.floor(Math.random() * alt.length)]!, n: 1 }];
  }
  if (hit(w.pass)) return [{ kind: "pass", amount: 1 }];
  if (hit(w.scrollBox)) return [{ kind: "scrollBox" }];
  return [{ kind: "silver", amount: stageSilver(stage, 2) }];
}

export function addYuanbao(run: Run, n: number): Run {
  return { ...run, yuanbao: (run.yuanbao ?? 0) + n };
}

export function addPass(run: Run, n: number): Run {
  return { ...run, passes: (run.passes ?? 0) + n };
}

/** 铁匠：精→神 锻造所需材料（主配方）。 */
export function forgeNeed(grade: number): Partial<Record<BagGoodsId, number>> | null {
  return forgeNeedOptions(grade)?.[0] ?? null;
}

/** 同成色可替代配方：生铁/焦炭顶赤铜，淬油顶一截精材。 */
export function forgeNeedOptions(grade: number): Partial<Record<BagGoodsId, number>>[] | null {
  if (grade === 3) {
    return [
      { forgeJing: 1, copper: 1 },
      { forgeJing: 1, forgeIron: 1 },
      { forgeJing: 1, forgeCoal: 1 },
    ];
  }
  if (grade === 4) {
    return [
      { forgeXuan: 1, forgeJing: 1 },
      { forgeXuan: 1, forgeOil: 1 },
    ];
  }
  if (grade === 5) return [{ forgeShen: 1, forgeXuan: 1 }];
  return null;
}

/** 按行囊现有货色挑一条能锻的配方；都不够则返回主配方供缺材提示。 */
export function matchForgeNeed(run: Run, grade: number): Partial<Record<BagGoodsId, number>> | null {
  const opts = forgeNeedOptions(grade);
  if (!opts?.length) return null;
  for (const need of opts) {
    const ok = (Object.entries(need) as [BagGoodsId, number][]).every(([k, n]) => bagCount(run, k) >= n);
    if (ok) return need;
  }
  return opts[0]!;
}

/**
 * 银淬 / 通宝锻 / 战场淬刃 / 差事赠刃：只推到「良」。
 * 精/玄/神必须走锻材炉，避免银两绕过材料闭环。
 */
export const SOFT_GRADE_CAP = 2;

export function softUpgradeTarget(weaponId: string): string | null {
  const g = gearById(weaponId);
  if (!g || g.grade >= SOFT_GRADE_CAP) return null;
  return nextGrade(weaponId);
}

export function softUpgradeBlockReason(weaponId: string): string {
  const g = gearById(weaponId);
  if (!g) return "认不出这柄刃。";
  if (g.grade >= 5) return "成色到顶了。砂坑也淬不动。";
  if (g.grade >= SOFT_GRADE_CAP) {
    return "精以上走锻材炉（精材→玄铁→神髓）。银两与通宝淬不到这一成。";
  }
  return "成色未动。";
}

/** 预估：早期几场+支线银 ≈ 够一次银淬与一次医馆；中期才摸精级店货。 */
export function economyLoopNote(grade: number, silver: number): string {
  const temperSilver = 8 + grade * 4;
  if (grade < SOFT_GRADE_CAP) {
    return silver >= temperSilver
      ? "可去武馆银淬，或砂坑通宝锻到良。"
      : `银淬约要 ${temperSilver} 两；先接衙门差或卖货。`;
  }
  if (grade < 5) {
    const need = forgeNeed(grade + 1);
    const mats = need
      ? Object.keys(need)
          .map((k) => BAG_NAME[k as BagGoodsId] ?? k)
          .join("·")
      : "锻材";
    return `下一成吃 ${mats}。武馆炉口或支线掉落。`;
  }
  return "兵刃已到神。养成到顶，策略仍占九成。";
}

