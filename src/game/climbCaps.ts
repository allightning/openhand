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
/** 一手伤当量锚。档 1 回劲 × 5 伤必须等于本值。 */
export const CLIMB_CHARGE_HAND_EQ = 25;
/** 档 1 回劲。黄。2026-11-02 主窗：4→5。生成器审计读这个数，不另写一份。 */
export const CLIMB_REGEN_T1 = 5;
/** 蓄力手 2 费挡 12 相对一手的净损失。 */
export const CLIMB_CHARGE_NET_LOSS = 15;
/** 蓄力利息。默认 25%/手，标黄。 */
export const CLIMB_CHARGE_INTEREST = 0.25;
/** 飞刀钉帽（占位）。 */
export const CLIMB_PIN_CAP = 6;
/** 灼烧格回合结束扣血。2026-11-14 投放拍定（馆 3/6/8），数值维持。 */
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
// 破挡 / 反应窗流构筑件（2026-11-14 拍定，通用薄专精厚：通用件数值低于专精件，偏弱只动价格与获取口）
/** 破甲心法：攻击穿挡。天花板 2，锚 = 剑破绽穿 4（CLIMB_EXPOSE_THROUGH_BLOCK）。 */
export const CLIMB_PIERCE_BLOCK_MIND = 2;
/** 裂石外功：出招时敌挡达到门禁，先削这么多挡，每招一次；与柏青裂甲同位相加。 */
export const CLIMB_SHRED_BLOCK = 3;
/** 裂石门禁：敌挡 ≥ 此数才触发。不许放宽。 */
export const CLIMB_SHRED_BLOCK_GATE = 6;
/** 听劲外功：反应窗思考时间 +秒。 */
export const CLIMB_WINDOW_THINK_BONUS = 2;
/** 抢半招外功：反应窗兑现伤害加成。平直判定，不吃档位放大。 */
export const CLIMB_WINDOW_PAYOFF_BONUS = 0.5;
/** 明镜心法 / 醒神丸：反应窗每场帽 +N。 */
export const CLIMB_WINDOW_CAP_BONUS = 1;
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
/** 座前敌窗每场帽。黄。精英沿用 CLIMB_FOE_WINDOW_CAP。 */
export const CLIMB_FOE_WINDOW_CAP_SEAT = 2;
/** 敌窗接招概率。黄。刺客 > 教头 > 游走 > 莽夫 / 乌龟。 */
export const CLIMB_FOE_P_ASSASSIN = 0.8;
export const CLIMB_FOE_P_COACH = 0.6;
export const CLIMB_FOE_P_SKIRMISH = 0.4;
export const CLIMB_FOE_P_BRUTE = 0.2;
export const CLIMB_FOE_P_TURTLE = 0.2;
/** 拆招回敬。黄。 */
export const CLIMB_FOE_RIPOSTE = 3;
/** 读破后该牌伤害系数。黄。 */
export const CLIMB_FOE_READ_MUL = 0.7;
/** 缠手削掉的剩招段。黄。 */
export const CLIMB_FOE_BIND_CUT = 1;
/** 馆 2 起，接力上场的第二人及以后，意图段数乘这个数，向下取整，保底 1。不改敌血、敌伤。2026-11-14 用户拍定转正。 */
export const CLIMB_RELAY_SEG_MUL = 0.5;
/** 血线换势：敌血首次跌破这个比例就换谱。黄。 */
export const CLIMB_STANCE_SHIFT_HP = 0.5;
/** 连续这么多手敌我距离没缩短，下一队进势段加码。黄。 */
export const CLIMB_APPROACH_STALL = 2;
/** 加码时多排的进势段数。黄。 */
export const CLIMB_APPROACH_EXTRA = 1;
/** 牌意档张数。10 档沿用 CLIMB_TRIPLE_NEED。 */
export const CLIMB_TIER_LOW = 4;
export const CLIMB_TIER_MID = 7;

/** 赌徒加注：正的回这么多劲；负的自伤这么多。 */
export const CLIMB_GAMBLE_WIN = 4;
export const CLIMB_GAMBLE_LOSS = 4;
/** 出千后奖励升一档。 */
export const CLIMB_GAMBLE_CHEAT = 6;
/** 温补初识：收势全队回血。 */
export const CLIMB_BOND_HEAL = 2;
/** 医杀初识：两人首手各少的劲。 */
export const CLIMB_BOND_GRUDGE_QI = 1;
/** 刀社初识：裂创帽加层。 */
export const CLIMB_BOND_BLEED_CAP = 1;
/** 门桩 / 桩门初识：桩挡次、蓄力叠层。 */
export const CLIMB_BOND_STAKE = 1;
export const CLIMB_BOND_CHARGE = 1;
/** 丝饮初识：噬血额外回血。 */
export const CLIMB_BOND_LEECH = 1;
/** 双尺 / 枪行初识：远档加伤。 */
export const CLIMB_BOND_FAR = 1;
/** 岁笙初识：剑势开场。争锋扣的也是这一档。 */
export const CLIMB_BOND_SWORD = 1;
/** 裂刃初识：首手撕挡。 */
export const CLIMB_BOND_TEAR = 2;
/** 壁岸初识：撞壁回血。 */
export const CLIMB_BOND_WALL = 1;
/** 掌春初识：收势回血。 */
export const CLIMB_BOND_HEAL_GROUP = 1;
/** 剑阁初识：破绽穿挡加伤。 */
export const CLIMB_BOND_EXPOSE = 1;
/** 钩行初识：缴械多留。 */
export const CLIMB_BOND_DISARM = 1;
/** 牌意 4 / 7 档效果。黄。不进牌面汇率。 */
export const CLIMB_BOND4_PALM_KNOCK = 1;
export const CLIMB_BOND7_PALM_REPLAY = 1;
export const CLIMB_BOND4_SABER_BLEED = 1;
export const CLIMB_BOND7_SABER_MELEE = 1;
export const CLIMB_BOND4_SWORD_OPEN = 1;
export const CLIMB_BOND7_SWORD_EXPOSE = 1;
export const CLIMB_BOND4_SPEAR_FAR = 1;
export const CLIMB_BOND7_SPEAR_NEXT = 2;
export const CLIMB_BOND4_STAFF_CHARGE = 1;
export const CLIMB_BOND7_STAFF_WALL = 2;
export const CLIMB_BOND4_HOOK_DISARM = 1;
export const CLIMB_BOND7_HOOK_LEECH = 0.1;
export const CLIMB_BOND7_HOOK_LEECH_CAP = 0.5;
export const CLIMB_BOND4_DART_PIN = 2;
export const CLIMB_BOND7_DART_PIN = 1;
/** 结算文件里的旧名。值就是上面的 CLIMB_BOND4_* / CLIMB_BOND7_*。 */
export const CLIMB_TIER_PALM_KNOCK = CLIMB_BOND4_PALM_KNOCK;
export const CLIMB_TIER_PALM_REPLAY = CLIMB_BOND7_PALM_REPLAY;
export const CLIMB_TIER_SABER_BLEED = CLIMB_BOND4_SABER_BLEED;
export const CLIMB_TIER_SABER_HIT = CLIMB_BOND7_SABER_MELEE;
export const CLIMB_TIER_SWORD_OPEN = CLIMB_BOND4_SWORD_OPEN;
export const CLIMB_TIER_SWORD_EXPOSE = CLIMB_BOND7_SWORD_EXPOSE;
export const CLIMB_TIER_SPEAR_FAR = CLIMB_BOND4_SPEAR_FAR;
export const CLIMB_TIER_SPEAR_CUT_HURT = CLIMB_BOND7_SPEAR_NEXT;
export const CLIMB_TIER_STAFF_OPEN = CLIMB_BOND4_STAFF_CHARGE;
export const CLIMB_TIER_STAFF_WALL = CLIMB_BOND7_STAFF_WALL;
export const CLIMB_TIER_HOOK_DISARM = CLIMB_BOND4_HOOK_DISARM;
export const CLIMB_TIER_HOOK_LEECH = CLIMB_BOND7_HOOK_LEECH;
export const CLIMB_TIER_HOOK_LEECH_CAP = CLIMB_BOND7_HOOK_LEECH_CAP;
export const CLIMB_TIER_DART_PIN_CAP = CLIMB_BOND4_DART_PIN;
export const CLIMB_TIER_DART_FAR_PIN = CLIMB_BOND7_DART_PIN;
/** 敌意图伤馆段系数。黄。只乘敌方，不乘玩家牌面。馆 7–10 可吃满。2026-11-02 第三刀：前 0.4→0.3，中 0.9→0.7。 */
export const CLIMB_ENEMY_HIT_EARLY = 0.3;
export const CLIMB_ENEMY_HIT_MID = 0.7;
export const CLIMB_ENEMY_HIT_LATE = 1;
/** 毒层：淬毒 / 毒经 / 毒功。黄。 */
export const CLIMB_POISON_COAT = 2;
export const CLIMB_POISON_MIND_STACK = 1;
export const CLIMB_POISON_TECH_STACK = 2;
/** 牌意达档张数。 */
export const CLIMB_TRIPLE_NEED = 10;
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
/** 毒：淬毒 / 毒经 / 毒功。这里是黑市标价；附毒层与回合结束结算在 poison.ts。 */
export const CLIMB_POISON_ITEM = 6;
export const CLIMB_POISON_MIND = 20;
export const CLIMB_POISON_TECH = 36;
/** 身板轴。爬塔花名册开战时读。 */
export const CLIMB_BODY_QI_MAX = 2;
export const CLIMB_BODY_QI_REGEN = 1;
export const CLIMB_BODY_HP = 0.2;
export const CLIMB_BODY_OPEN_QI = 2;
/** 三重加成。基础帽不变。 */
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
