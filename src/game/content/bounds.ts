import {
  BREAK_EXPOSE_BEFORE_BLOCK,
  BREAK_SABER_ON_HIT,
  BREAK_SWORD_CHAIN_PER,
} from "../breakCaps";
import {
  CLIMB_BLEED_CAP,
  CLIMB_BLOCK_CAP,
  CLIMB_EXPOSE_CAP,
  CLIMB_STAKE_CAP,
  CLIMB_STUN_N,
} from "../climbCaps";

/** 有常量的数值键。没有对应常量的键（伤、治疗、击退）不另造区间。 */
export const VALUE_BOUNDS: Record<string, { min: number; max: number }> = {
  block: { min: 1, max: CLIMB_BLOCK_CAP },
  bleed: { min: 1, max: CLIMB_BLEED_CAP },
  expose: { min: 1, max: Math.min(CLIMB_EXPOSE_CAP, BREAK_EXPOSE_BEFORE_BLOCK) },
  foeStun: { min: 1, max: CLIMB_STUN_N },
  stake: { min: 1, max: CLIMB_STAKE_CAP },
  swordChain: { min: 1, max: BREAK_SWORD_CHAIN_PER },
  saberOnHit: { min: 1, max: BREAK_SABER_ON_HIT },
};
