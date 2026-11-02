/**
 * 行路模拟旋钮。数值框架：
 * https://app.notion.com/p/400427beba9c810696c6d0057a419b13
 *
 * 默认全 1.0。乘进馆调参，不改牌面、费用、摸牌张数。
 * exchange 没有结算口，本包只记账，不乘进伤害。
 */
export type ClimbKnobs = {
  exchange: number;
  enemyHp: number;
  enemyDmg: number;
  playerDmg: number;
  energyRegen: number;
  /** 敌窗触发倍率。缺省 1。置 0 = 关窗。不进 DEFAULT_KNOBS。 */
  foeWindowP?: number;
};

export const KNOB_VERSION = "1.0";

export const DEFAULT_KNOBS: ClimbKnobs = {
  exchange: 1,
  enemyHp: 1,
  enemyDmg: 1,
  playerDmg: 1,
  energyRegen: 1,
};

/** 馆段敌伤 / 我伤。敌伤默认等于现行馆梯 dmgCoef，我伤默认 1。改这张表才改模拟，不改馆梯原值。 */
export const STAGE_DMG: { stage: number; enemy: number; player: number }[] = [
  { stage: 1, enemy: 1.18, player: 1 },
  { stage: 2, enemy: 1.32, player: 1 },
  { stage: 3, enemy: 1.5, player: 1 },
  { stage: 4, enemy: 1.7, player: 1 },
  { stage: 5, enemy: 1.9, player: 1 },
  { stage: 6, enemy: 2.1, player: 1 },
  { stage: 7, enemy: 2.4, player: 1 },
  { stage: 8, enemy: 2.2, player: 1 },
  { stage: 9, enemy: 2.4, player: 1 },
  { stage: 10, enemy: 2.6, player: 1 },
];

/** 相对馆梯的倍率。默认表与梯一致时，敌伤倍率是 1，我伤是 1。 */
export function stageDmgAdjust(stage: number, ladderEnemy: number): { enemy: number; player: number } {
  const row = STAGE_DMG.find((item) => item.stage === stage);
  if (!row || ladderEnemy === 0) return { enemy: 1, player: 1 };
  return { enemy: row.enemy / ladderEnemy, player: row.player };
}

export function knobLabel(k: ClimbKnobs): string {
  return `汇率${k.exchange} 敌血${k.enemyHp} 敌伤${k.enemyDmg} 我伤${k.playerDmg} 回劲${k.energyRegen}`;
}
