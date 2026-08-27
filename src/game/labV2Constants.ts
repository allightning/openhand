/** Combat v2 placeholder constants — balance later via Lab sliders. */

export const QI_MAX = 5;
export const QI_BURST_DMG = 3;
export const LAB_ENTRANCE_BONUS = 2;

export const GRUDGE_NORMAL = 12;
export const GRUDGE_ELITE = 14;
export const GRUDGE_BOSS = 16;

export const VARIANT_BREAK_THRESHOLD = 2;
export const BOSS_VARIANT_BREAK_THRESHOLD = 3;

/** §31.13 拆招 v4「以拆为杀」：硬拆反打真伤 = 底数 + 兵器品阶（精3/玄4/神5 → 5/6/7）。 */
export const BREAK_COUNTER_BASE = 2;
/** 连环拆：一回合第 2 段起的硬拆，反打 +2 且额外 +1 势。 */
export const BREAK_COUNTER_CHAIN = 2;
/** 拆眼重创：招眼崩塌时追加真伤。 */
export const EYE_COUNTER_DMG = 6;
/** 失衡承伤倍率（原 ×1.5 → v4 ×2，破眼=爆发处决窗）。 */
export const OFFBALANCE_MULT = 2;
