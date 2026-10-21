import type { EnemyDef as LegacyEnemy, Intent } from "../types";
import { CARDS, ENEMIES, ENEMY_WEAPON, TECHNIQUES } from "./legacy";
import { SIGNATURE_BREAK } from "../enemySignatures";
import type { EnemyKind, HookId, SchoolId } from "./hooks";
import { ENEMY_KINDS, isMechanismHook, uniqueHooks } from "./hooks";
import { splitByContract, validateRow, type Hold } from "./validate";

/** 与牌同构。cost 是档位：杂兵 1 / 精英 2 / 首领 3。 */
export interface EnemyDef {
  id: string;
  cost: number;
  school: SchoolId;
  kind: EnemyKind;
  effectHooks: HookId[];
  values: Record<string, number>;
  text: string;
}

/** 与 labEnemyStress 的首领 / 精英名单一致。测试对账，避免登记表反向依赖结算。 */
const BOSS_IDS = new Set(["lord", "usurper", "twin"]);
const ELITE_IDS = new Set(["bandit", "nametaker", "warden", "knotboss", "stakeboss", "brute", "twin"]);

const CARD_IDS = new Set<string>(Object.keys(CARDS));
const TECH_IDS = new Set<string>(Object.keys(TECHNIQUES));
const SIG_IDS = new Set<string>(Object.keys(SIGNATURE_BREAK));

function enemyKind(enemy: LegacyEnemy): EnemyKind {
  if (BOSS_IDS.has(enemy.id)) return "boss";
  if (ELITE_IDS.has(enemy.id) || enemy.elite) return "elite";
  return "mob";
}

function allIntents(enemy: { pattern: Intent[]; patternSets?: Intent[][] }): Intent[] {
  return [...enemy.pattern, ...(enemy.patternSets ?? []).flat()];
}

export function linkProblems(
  enemy: { remnant: string; pattern: Intent[]; patternSets?: Intent[][] },
  cards: ReadonlySet<string>,
  cardIds: readonly string[] = [],
): string[] {
  const problems: string[] = [];
  if (!TECH_IDS.has(enemy.remnant)) problems.push(`remnant:${enemy.remnant}`);
  for (const intent of allIntents(enemy)) {
    if (intent.kind === "sig" && !SIG_IDS.has(intent.id)) problems.push(`sig:${intent.id}`);
  }
  for (const id of cardIds) {
    if (!cards.has(id)) problems.push(`card:${id}`);
  }
  return problems;
}

function projectEnemy(enemy: LegacyEnemy): EnemyDef {
  const kind = enemyKind(enemy);
  const hooks: HookId[] = [];
  for (const intent of allIntents(enemy)) {
    if (isMechanismHook(intent.kind)) hooks.push(intent.kind);
  }
  const values: Record<string, number> = { hp: enemy.hp };
  if (typeof enemy.pace === "number") values.pace = enemy.pace;
  if (typeof enemy.reach === "number") values.reach = enemy.reach;
  const school = ENEMY_WEAPON[enemy.id] ?? "any";
  return {
    id: enemy.id,
    cost: kind === "boss" ? 3 : kind === "elite" ? 2 : 1,
    school,
    kind,
    effectHooks: uniqueHooks(hooks),
    values,
    text: enemy.skill || enemy.name,
  };
}

function enemyProblems(enemy: LegacyEnemy, row: EnemyDef): string[] {
  return [
    ...validateRow(row, { kinds: ENEMY_KINDS, requireDigit: false }),
    ...linkProblems(enemy, CARD_IDS),
  ];
}

const projected = Object.values(ENEMIES).map((enemy) => ({ enemy, row: projectEnemy(enemy) }));
const split = splitByContract(
  projected.map((item) => item.row),
  (row) => {
    const enemy = ENEMIES[row.id];
    return enemy ? enemyProblems(enemy, row) : ["id"];
  },
);

export const ENEMY_REGISTRY: Readonly<Record<string, EnemyDef>> = split.registry;
export const ENEMY_HOLDS: readonly Hold<EnemyDef>[] = split.holds;
