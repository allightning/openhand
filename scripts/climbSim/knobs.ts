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
};

export const KNOB_VERSION = "1.0";

export const DEFAULT_KNOBS: ClimbKnobs = {
  exchange: 1,
  enemyHp: 1,
  enemyDmg: 1,
  playerDmg: 1,
  energyRegen: 1,
};

export function knobLabel(k: ClimbKnobs): string {
  return `汇率${k.exchange} 敌血${k.enemyHp} 敌伤${k.enemyDmg} 我伤${k.playerDmg} 回劲${k.energyRegen}`;
}
