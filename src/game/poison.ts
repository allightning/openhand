import { CLIMB_POISON_COAT, CLIMB_POISON_MIND_STACK, CLIMB_POISON_TECH_STACK } from "./climbCaps";
import type { Battle, LabItemId } from "./types";

/** 本场攻击会叠上的毒层。淬毒 + 毒经 + 毒功。 */
export function poisonOnHit(b: Battle): number {
  return (b.poisonCoat ?? 0) + (b.poisonMind ?? 0) + (b.poisonTech ?? 0);
}

export function grantPoisonItem(b: Battle, item: LabItemId): string[] {
  if (item === "cuandu") {
    b.poisonCoat = CLIMB_POISON_COAT;
    return [`淬毒 攻击附毒 ${CLIMB_POISON_COAT}`];
  }
  if (item === "dujing") {
    b.poisonMind = CLIMB_POISON_MIND_STACK;
    return [`毒经 攻击附毒 ${CLIMB_POISON_MIND_STACK}`];
  }
  if (item === "dugong") {
    b.poisonTech = CLIMB_POISON_TECH_STACK;
    return [`毒功 攻击附毒 ${CLIMB_POISON_TECH_STACK}`];
  }
  return [];
}

export function addPoison(b: Battle, n: number): void {
  if (n <= 0) return;
  b.foePoison = (b.foePoison ?? 0) + n;
}

/** 回合结束按层扣血，无视挡，层不掉。 */
export function tickPoison(b: Battle): number {
  const n = b.foePoison ?? 0;
  if (n <= 0) return 0;
  const foe = b.foes?.find((f) => f.id === b.enemy.id) ?? b.enemy;
  foe.hp -= n;
  if (foe !== b.enemy) b.enemy.hp = foe.hp;
  return n;
}
