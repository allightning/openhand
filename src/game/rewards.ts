import { BASICS, CHAPTER_TECH, CHALLENGE, ENEMIES, UPGRADES, VERBS } from "./content";
import { cardSchool, stashOrTeach, wielderOf } from "./party";
import { addTechnique, replaceFirst } from "./run";
import type { CardId, ChapterId, EnemyId, Reward, Run, SaveFile, TechniqueId } from "./types";

function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function upgradeOptions(deck: CardId[]): Reward[] {
  const seen = new Set<CardId>();
  const out: Reward[] = [];
  for (const id of deck) {
    const to = UPGRADES[id];
    if (!to || seen.has(id)) continue;
    seen.add(id);
    out.push({ kind: "upgrade", from: id, to });
  }
  return out;
}

function replaceOptions(deck: CardId[]): Reward[] {
  const froms = unique(deck.filter((id) => BASICS.includes(id)));
  const tos = VERBS.filter((id) => !deck.includes(id));
  const out: Reward[] = [];
  for (const from of froms) {
    for (const to of tos) {
      out.push({ kind: "replace", from, to });
    }
  }
  return out;
}

function addOptions(deck: CardId[]): Reward[] {
  return VERBS.filter((id) => !deck.includes(id)).map((id) => ({ kind: "add" as const, id }));
}

function chapterList(): ChapterId[] {
  return ["dock", "alley", "court"];
}

function techPool(run: Run, save: SaveFile, remnant?: TechniqueId): TechniqueId[] {
  const owned = new Set(run.techniques);
  const pool: TechniqueId[] = [];
  for (const ch of chapterList()) {
    if (chapterList().indexOf(ch) > chapterList().indexOf(run.chapter)) continue;
    pool.push(...CHAPTER_TECH[ch]);
  }
  for (const id of save.seen) pool.push(ENEMIES[id].remnant);
  for (const id of run.beaten) pool.push(ENEMIES[id].remnant);
  if (remnant) pool.push(remnant);
  return unique(pool).filter((id) => !owned.has(id));
}

function keyOf(reward: Reward): string {
  if (reward.kind === "upgrade") return `u:${reward.from}`;
  if (reward.kind === "replace") return `r:${reward.to}`;
  if (reward.kind === "add") return `a:${reward.id}`;
  return `t:${reward.id}`;
}

function takeUnique(from: Reward[], n: number, used: Set<string>): Reward[] {
  const out: Reward[] = [];
  for (const r of shuffle(from)) {
    const k = keyOf(r);
    if (used.has(k)) continue;
    used.add(k);
    out.push(r);
    if (out.length >= n) break;
  }
  return out;
}

export function rollRewards(
  run: Run,
  save: SaveFile,
  source: { type: "duel"; enemyId: EnemyId } | { type: "chest" },
): Reward[] {
  const remnant = source.type === "duel" ? ENEMIES[source.enemyId].remnant : undefined;
  const techs = techPool(run, save, remnant).map((id) => ({ kind: "technique" as const, id }));
  const upgrades = upgradeOptions(run.deck);
  const replaces = replaceOptions(run.deck);
  const adds = addOptions(run.deck);
  const used = new Set<string>();
  const picked: Reward[] = [];

  if (source.type === "chest") {
    picked.push(...takeUnique(techs, 3, used));
    if (picked.length < 3) picked.push(...takeUnique(upgrades, 3 - picked.length, used));
    if (picked.length < 3) picked.push(...takeUnique(replaces, 3 - picked.length, used));
    return picked.slice(0, 3);
  }

  const remnantReward = remnant && techs.find((t) => t.id === remnant);
  if (remnantReward) {
    const sure = source.type === "duel" && CHALLENGE.includes(source.enemyId);
    if (sure || Math.random() < 0.7) {
      used.add(keyOf(remnantReward));
      picked.push(remnantReward);
    }
  }

  const buckets = shuffle([
    takeUnique(upgrades, 1, new Set()),
    takeUnique(replaces, 1, new Set()),
    takeUnique(techs, 1, new Set()),
  ]).flat();

  for (const r of buckets) {
    if (picked.length >= 3) break;
    const k = keyOf(r);
    if (used.has(k)) continue;
    used.add(k);
    picked.push(r);
  }

  if (picked.length < 3) picked.push(...takeUnique(techs, 3 - picked.length, used));
  if (picked.length < 3) picked.push(...takeUnique(upgrades, 3 - picked.length, used));
  if (picked.length < 3) picked.push(...takeUnique(replaces, 3 - picked.length, used));
  if (picked.length < 3) picked.push(...takeUnique(adds, 3 - picked.length, used));
  return picked.slice(0, 3);
}

export function applyReward(run: Run, reward: Reward): Run {
  const next = structuredClone(run);
  if (reward.kind === "upgrade") {
    next.deck = replaceFirst(next.deck, reward.from, reward.to);
    return next;
  }
  if (reward.kind === "replace") {
    const school = cardSchool(reward.to);
    if (school !== "any" && !wielderOf(next, school)) {
      next.scrolls = [...next.scrolls, reward.to];
      return next;
    }
    if (school !== "any" && school !== "palm") {
      return stashOrTeach(next, reward.to);
    }
    next.deck = replaceFirst(next.deck, reward.from, reward.to);
    return next;
  }
  if (reward.kind === "add") {
    return stashOrTeach(next, reward.id);
  }
  return addTechnique(next, reward.id);
}
