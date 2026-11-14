import { CLIMB_PIERCE_BLOCK_MIND, CLIMB_SHRED_BLOCK, CLIMB_SHRED_BLOCK_GATE } from "../climbCaps";
import { sumMindArtBonuses } from "../mindArts";
import type { Battle } from "../types";

/**
 * 破挡构筑件（2026-11-14 拍定，通用薄专精厚）。
 * 破甲 = 心法穿挡；裂石 = 外功出招先削挡。数值只读 climbCaps，平直判定不吃档位放大。
 */

/** 破甲心法：当前上场人的攻击穿挡。穿 2 是天花板（锚 = 剑破绽穿 4），这里封顶。 */
export function mindPierceBlock(b: Battle): number {
  const minds = sumMindArtBonuses(b.labMateMinds?.[b.active] ?? []);
  return Math.min(CLIMB_PIERCE_BLOCK_MIND, minds.pierceBlock);
}

/**
 * 裂石外功：出招时敌挡 ≥ CLIMB_SHRED_BLOCK_GATE，先削 CLIMB_SHRED_BLOCK 点挡。
 * 每招一次（同招多段如二掌不重复）；门禁在出招时判定，与柏青裂甲同位相加。
 * 门禁不许放宽；偏弱只动价格与获取口。
 */
export function shredBlockOnStrike(b: Battle): string[] {
  if (!b.techniques.includes("lieshi")) return [];
  if ((b.enemyBlock ?? 0) < CLIMB_SHRED_BLOCK_GATE) return [];
  const key = `${b.turn}:${b.resolvingCard ?? ""}:${b.playedThisTurn.length}`;
  if (b.shredBlockKey === key) return [];
  b.shredBlockKey = key;
  const cut = Math.min(CLIMB_SHRED_BLOCK, b.enemyBlock);
  b.enemyBlock -= cut;
  return [`裂石碎挡 ${cut}`];
}
