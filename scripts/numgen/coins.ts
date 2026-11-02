/** EXCHANGE_V2_20261023 九币价。当量单位 = 伤。1 劲 = 5 伤。 */

export const QI_TO_DMG = 5;
export const BAND = 0.15;
export const WALL_TRIGGER = 0.6;
export const CHARGE_INTEREST = 0.25;

export const COIN = {
  dmg: 1,
  blockPer: 5 / 6,
  healPer: 5 / 4,
  moveQi: 0.4,
  ccQi: 1.5,
  stackDmg: 2,
  drawQi: 1,
  paceTempQi: 0.5,
  pacePermQi: 1.75,
  nailQi: 0.2,
} as const;

export const RULER_ATK: Record<number, number> = { 1: 5, 2: 10, 3: 15, 4: 20, 5: 25 };
export const RULER_BLK: Record<number, number> = { 1: 6, 2: 12, 3: 18, 4: 24, 5: 30 };

export function fairForCost(cost: number): number {
  return cost * QI_TO_DMG;
}

export function moveDmg(cells: number): number {
  return Math.abs(cells) * COIN.moveQi * QI_TO_DMG;
}

export function ccDmg(segs: number): number {
  return Math.abs(segs) * COIN.ccQi * QI_TO_DMG;
}
