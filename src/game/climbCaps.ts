/** 爬塔试玩默认（Notion 待定页 2026-09-17）。改数字先改本文件。引擎层常量，产品壳经 `combatLab/climbCaps.ts` re-export。 */

export const CLIMB_BLOCK_CAP = 12;
export const CLIMB_BLEED_CAP = 6;
export const CLIMB_EXPOSE_CAP = 4;
export const CLIMB_SWORD_CHAIN_CAP = 6;
export const CLIMB_COMBO_CAP = 6;
export const CLIMB_ENDURE_CAP = 3;
export const CLIMB_STAKE_CAP = 2;
export const CLIMB_STUN_N = 1;
export const CLIMB_COMBO_REPLAY_COST = 2;
export const CLIMB_DUST_MIN_HALL = 6;
export const CLIMB_HALL_COUNT_DEFAULT = 10;
export const CLIMB_GUARD_WAGER = 10;
export const CLIMB_SPEAR_CUT_QI = 3;
/** 噬血普通档。三重上位（瘸跛）仍是 50%。 */
export const CLIMB_LIFESTEAL_PCT = 0.4;
/** 预演：破绽在卸力之后另加的伤害。 */
export const CLIMB_EXPOSE_THROUGH_BLOCK = 4;
export const CLIMB_UNSEAT_PACE = 1;
export const CLIMB_POOL_COPIES = 3;
/** 我裂桩爆炸：双方各吃这么多伤。 */
export const CLIMB_STAKE_BLAST_DMG = 4;
/** 敌裂桩：你立刻拿到这么多格挡。 */
export const CLIMB_STAKE_BREAK_BLOCK = 4;

/** 棍蓄力层帽（占位）。 */
export const CLIMB_CHARGE_CAP = 6;
/** 一手伤当量锚。 */
export const CLIMB_CHARGE_HAND_EQ = 25;
/** 蓄力手 2 费挡 12 相对一手的净损失。 */
export const CLIMB_CHARGE_NET_LOSS = 15;
/** 蓄力利息。默认 25%/手，标黄。 */
export const CLIMB_CHARGE_INTEREST = 0.25;
/** 飞刀钉帽（占位）。 */
export const CLIMB_PIN_CAP = 6;
/** 灼烧格回合结束扣血（占位）。 */
export const CLIMB_BURN_DMG = 4;
/** 反应窗大窗耗蓝（回马 / 截拳 / 透棍）。黄。 */
export const CLIMB_WINDOW_QI_BIG = 2;
/** 反应窗小窗耗蓝（弹反 / 偷势 / 瘸跛 / 断息）。黄。 */
export const CLIMB_WINDOW_QI_SMALL = 1;
/** 枪回马枪耗蓝。与大窗同值。 */
export const CLIMB_SPEAR_REVERSE_QI = CLIMB_WINDOW_QI_BIG;
/** 玩家反应窗每场次数。 */
export const CLIMB_WINDOW_FIGHT_CAP = 2;
/** 回马：我方血低于此比例。 */
export const CLIMB_WINDOW_HP_RATIO = 0.5;
/** 回马拒敌距离。 */
export const CLIMB_SPEAR_REJECT_DIST = 3;
/** 截拳贴脸基础伤（1 费标尺）。 */
export const CLIMB_WINDOW_BASE_HIT = 5;
/** 弹反：格挡比例 / 回敬比例。 */
export const CLIMB_PARRY_BLOCK_RATIO = 0.5;
export const CLIMB_PARRY_REFLECT_RATIO = 0.5;
/** 弹反：每受击这么多段里的最后一段。 */
export const CLIMB_PARRY_EVERY = 3;
/** 瘸跛 + 缴械：接下来这么多次攻击吸血。 */
export const CLIMB_LIMP_LEECH = 0.5;
export const CLIMB_LIMP_LEECH_HITS = 2;
/** 透棍真伤：已有挡 × 此数 + 新增挡 × 此数。 */
export const CLIMB_STAFF_PIERCE_OLD = 0.5;
export const CLIMB_STAFF_PIERCE_NEW = 1;
/** 破防：敌蓝归零后当手受击加成。 */
export const CLIMB_BREAK_HURT = 0.25;
/** 敌方反应窗每场次数。 */
export const CLIMB_FOE_WINDOW_CAP = 1;
export const CLIMB_FOE_WINDOW_HALL = 6;
/** 敌配牌张数。 */
export const CLIMB_FOE_DECK_MIN = 6;
export const CLIMB_FOE_DECK_MAX = 10;
/** 牌库成长：前期 / 中期 / 座前。 */
export const CLIMB_FOE_GROW_EARLY = 0;
export const CLIMB_FOE_GROW_MID = 1;
export const CLIMB_FOE_GROW_SEAT = 2;
/** 敌方拆招：绝招费门槛，降效比例。 */
export const CLIMB_FOE_DISMANTLE_COST = 4;
export const CLIMB_FOE_DISMANTLE_MUL = 0.5;
/** 敌方缠手 / 读破：同系或同招连出次数。 */
export const CLIMB_FOE_BIND_STREAK = 3;
export const CLIMB_FOE_READ_STREAK = 3;
/** 棍撞墙晕段。 */
export const CLIMB_STAFF_WALL_STUN = 1;

/** 赢馆彩金。馆 1–10。10 馆以后每馆 +8。 */
export const CLIMB_HALL_POT = [0, 8, 9, 10, 12, 14, 16, 18, 20, 22, 40] as const;
/** 赌馆注码带。高潮（馆 ≥10）用 CLIMB_WAGER_CLIMAX。 */
export const CLIMB_WAGER_BAND_MIN = 0.1;
export const CLIMB_WAGER_BAND_MAX = 0.3;
export const CLIMB_WAGER_CLIMAX = 0.8;
/** 黑市凡 / 精 / 绝。 */
export const CLIMB_MARKET_COMMON = 8;
export const CLIMB_MARKET_ADEPT = 18;
export const CLIMB_MARKET_SUPREME = 40;
/** 情报：底细 / 命门，占当前彩金。 */
export const CLIMB_INTEL_DETAIL = 0.15;
export const CLIMB_INTEL_CORE = 0.3;
/** 毒：道具 / 心法 / 外功。货架还没有这三件。 */
export const CLIMB_POISON_ITEM = 6;
export const CLIMB_POISON_MIND = 20;
export const CLIMB_POISON_TECH = 36;
/** 身板轴。职业窗接线，结算不读。 */
export const CLIMB_BODY_QI_MAX = 2;
export const CLIMB_BODY_QI_REGEN = 1;
export const CLIMB_BODY_HP = 0.2;
export const CLIMB_BODY_OPEN_QI = 2;
/** 三重加成。基础帽不变。结算不读。 */
export const CLIMB_TRIPLE_BLEED_BONUS = 2;
export const CLIMB_TRIPLE_EXPOSE_BONUS = 2;
export const CLIMB_TRIPLE_CUT_QI = 1;
/** 钩拉近落点上限（格）。现牌都 ≤2。 */
export const CLIMB_PULL_MAX = 4;

export function climbHallPot(stage: number): number {
  const s = Math.max(1, Math.floor(stage));
  if (s < CLIMB_HALL_POT.length) return CLIMB_HALL_POT[s]!;
  return CLIMB_HALL_POT[10]! + 8 * (s - 10);
}

export function intelPrice(pot: number, tier: "detail" | "core"): number {
  const rate = tier === "core" ? CLIMB_INTEL_CORE : CLIMB_INTEL_DETAIL;
  return Math.max(1, Math.round(Math.max(0, pot) * rate));
}

/** EXCHANGE_V2 §4.3：爆发 = n × (25 + 15 × 0.25)。蓄 1 手 = 44。 */
export function climbChargeBurstEq(n: number): number {
  const stacks = Math.max(0, Math.min(CLIMB_CHARGE_CAP, Math.floor(n)));
  return Math.round(
    stacks * (CLIMB_CHARGE_HAND_EQ + CLIMB_CHARGE_NET_LOSS * (1 + CLIMB_CHARGE_INTEREST)),
  );
}

export function climbCycleCost(faceCost: number): number {
  return Math.max(0, faceCost - 1);
}

/** 馆阶加在图鉴底速上：前期常先手，后期枪棍更容易后手。 */
export function climbEnemyPaceBonus(stage: number): number {
  if (stage >= 9) return 2;
  if (stage >= 6) return 1;
  return 0;
}

export function climbDustAllowed(stage: number, elite: boolean): boolean {
  return stage >= CLIMB_DUST_MIN_HALL && elite;
}

/** 爬塔开战默认敌我间距（7 格盘）。前段更近，后期拉满。 */
export function climbOpeningDistance(stage: number, elite: boolean): number {
  if (elite || stage >= 8) return 5;
  if (stage >= 5) return 4;
  return 3;
}

/** 玩家在左、敌在右，间距 = dist。 */
export function climbOpeningPositions(dist: number): { playerPos: number; enemyPos: number } {
  const d = Math.max(1, Math.min(6, dist));
  const playerPos = Math.max(0, Math.floor((6 - d) / 2));
  return { playerPos, enemyPos: playerPos + d };
}
