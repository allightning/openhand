/**
 * 已拍机制 × 导出函数。对照文档：铁律、RULES、REACTION_WINDOWS、
 * WEAPON_PROFICIENCY、BONDS、ROLE_TASK。不改旋钮，不碰 src。
 */
export type Cover = "export" | "partial" | "docs-only";

export type CoverageRow = {
  id: string;
  name: string;
  spec: string;
  cover: Cover;
  exports: string[];
  gap: string;
};

export const COVERAGE: CoverageRow[] = [
  {
    id: "win-spear",
    name: "反应窗 · 回马枪",
    spec: "REACTION_WINDOWS / RULES；血<50% + 背墙，拒 3 格",
    cover: "export",
    exports: [
      "WINDOWS（spearReverse）",
      "matchWindow",
      "openWindow",
      "takeWindow",
      "answerReaction",
      "openSpearReverseWindow",
      "takeSpearReverse",
    ],
    gap: "新参走 takeWindow。openSpearReverseWindow / takeSpearReverse 是旧口（停 2 格）。holdReaction 才暂停。",
  },
  {
    id: "win-palm",
    name: "反应窗 · 截拳",
    spec: "REACTION_WINDOWS；敌蓄力 + 距 ≤2",
    cover: "export",
    exports: ["WINDOWS（palmCut）", "matchWindow", "openWindow", "takeWindow"],
    gap: "表已有行。夜校策略不按窗种估值，只看 leftover×8 + 冲锋伤。",
  },
  {
    id: "win-dart",
    name: "反应窗 · 断息",
    spec: "REACTION_WINDOWS；敌回复 / 回蓝",
    cover: "export",
    exports: ["WINDOWS（dartBreath）", "matchWindow", "openWindow", "takeWindow"],
    gap: "同截拳。飞刀未进武器轴时夜校摸到代表牌也打不出，窗对照更空。",
  },
  {
    id: "win-saber",
    name: "反应窗 · 弹反",
    spec: "REACTION_WINDOWS；贴脸第 3 段",
    cover: "export",
    exports: ["WINDOWS（saberParry）", "matchWindow", "openWindow", "takeWindow"],
    gap: "同截拳。",
  },
  {
    id: "win-sword",
    name: "反应窗 · 偷势",
    spec: "REACTION_WINDOWS；射程内叠层系、我尚未叠层",
    cover: "export",
    exports: ["WINDOWS（swordSteal）", "matchWindow", "openWindow", "takeWindow"],
    gap: "同截拳。",
  },
  {
    id: "win-hook",
    name: "反应窗 · 瘸跛",
    spec: "REACTION_WINDOWS；敌从 ≤2 格外撤",
    cover: "export",
    exports: ["WINDOWS（hookLimp）", "matchWindow", "openWindow", "takeWindow"],
    gap: "同截拳。瘸跛+缴械吸血档未单独导出。",
  },
  {
    id: "win-staff",
    name: "反应窗 · 透棍",
    spec: "REACTION_WINDOWS；敌已有挡再加挡",
    cover: "export",
    exports: ["WINDOWS（staffPierce）", "matchWindow", "openWindow", "takeWindow"],
    gap: "同截拳。",
  },
  {
    id: "win-foe",
    name: "反应窗 · 敌方三件",
    spec: "拆招 / 缠手 / 读破；精英 6 馆起或座前，教头",
    cover: "partial",
    exports: ["noteFoeWindow", "buildFoeKit（coach 才挂 foeWindows）"],
    gap: "挂在教头原型。玩家侧没有对等的导出策略。",
  },
  {
    id: "piler",
    name: "职业 · 桩师",
    spec: "铁律：落桩挡路 → 进阶裂桩爆炸；ROLE_TASK",
    cover: "export",
    exports: ["fieldProfession", "advanceProfession", "addStake", "smashStake"],
    gap: "run.professions 不写就没有职业。进阶后走原裂桩爆炸。沈夯头衔仍叫桩师，和职业 id staker 不是同一层。",
  },
  {
    id: "seer",
    name: "职业 · 相士",
    spec: "ROLE_TASK：开战风声；每程 1 次记亮招；主动看破还原虚招",
    cover: "export",
    exports: ["openRumor", "markEnemyOpen", "seeThrough", "advanceProfession"],
    gap: "同伴 id seer（镜亭）不是职业。职业挂 run.professions[场上] = diviner。",
  },
  {
    id: "gambler",
    name: "职业 · 赌徒",
    spec: "ROLE_TASK：回合开始加注近乎对半；主动出千必正",
    cover: "export",
    exports: ["rollWager", "cheatWager", "advanceProfession"],
    gap: "馆间赌馆仍走 wagerRules，和职业加注不是同一口。",
  },
  {
    id: "bond",
    name: "缘分",
    spec: "BONDS：8 对 / 6 群像 / 2 旧怨；初识→同路→生死；连携改生成物",
    cover: "partial",
    exports: [
      "PAIR_BONDS",
      "GROUP_BONDS",
      "GRUDGE_BONDS",
      "acquaintHeal",
      "grudgeQi",
      "bleedCapBonus",
      "bleedStackBonus",
      "fuseForSwap",
    ],
    gap: "温补 / 医杀 / 夜霜 / 刀社已进结算。其余初识在表上，ROLE2 才逐条接线。bondSlot 仍返回 null。",
  },
  {
    id: "swap-weapon",
    name: "换武器",
    spec: "WEAPON_PROFICIENCY：仅馆间；弹出不符卡；基础卡 6 张保底",
    cover: "export",
    exports: ["swapHallWeapon", "WEAPON_SPECTRUM", "BASIC_KIT", "canWear", "spectrumOf"],
    gap: "战斗中 fighting=true 拒绝。旧口 battleEquippedSchool 仍是兵器档。",
  },
  {
    id: "reveal",
    name: "亮招",
    spec: "过招 L3 / 页 9：stanceRevealN 按段解锁；情报可买前几段",
    cover: "partial",
    exports: ["noteSegmentRead", "publishStance", "buildStanceBoard", "markEnemyOpen", "renderRevealRow"],
    gap: "相士 markEnemyOpen 可把整手写成亮招。没有黑市「买亮招档」导出。",
  },
  {
    id: "feint",
    name: "虚招",
    spec: "页 9：标签假、出手才真；完全同形；虚段不触发反应窗",
    cover: "partial",
    exports: ["segmentFeint", "buildStanceBoard（feint[]）", "matchWindow（tick.feint → null）", "seeThrough"],
    gap: "feintMask 开战从配牌抄。相士进阶后 seeThrough 开 feintOpen，当手虚招不再挡窗。",
  },
];

export function coverageMd(): string {
  const lines = [
    "| 机制 | 规格 | 覆盖 | 导出函数 | 缺口 |",
    "|---|---|---|---|---|",
  ];
  for (const row of COVERAGE) {
    const cover = row.cover === "export" ? "有导出" : row.cover === "partial" ? "部分导出" : "只在文档";
    const fn = row.exports.length ? row.exports.map((s) => `\`${s}\``).join("、") : "—";
    lines.push(`| ${row.name} | ${row.spec} | ${cover} | ${fn} | ${row.gap} |`);
  }
  return lines.join("\n");
}
