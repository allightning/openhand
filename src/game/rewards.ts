import { BASICS, CHAPTER_TECH, CHALLENGE, ENEMIES, UPGRADES, VERBS } from "./content";
import { addBag } from "./bag";
import type { BagGoodsId } from "./bag";
import { addPass, addYuanbao, rollSideLoot } from "./economy";
import { cardSchool, addCompanion, stashOrTeach, wielderOf } from "./party";
import { stageOfScene, stageSilver, type Stage } from "./progress";
import { addTechnique, replaceFirst } from "./run";
import type { CardId, ChapterId, CompanionId, EnemyId, Reward, Run, SaveFile, TechniqueId } from "./types";
import { gearById } from "./weapons";

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

/** 卡牌节奏：前期够用 → 中期殷实 → 后期丰富（不锁死张数）。 */
function runStage(run: Run): Stage {
  const n = run.beaten.length;
  if (n <= 3) return "early";
  if (n <= 11) return "mid";
  return "late";
}

function verbPool(stage: Stage): CardId[] {
  if (stage === "early") {
    return VERBS.filter((id) => !id.startsWith("mid") && !id.startsWith("late") && !/Mute|Bleed|Lock|Disarm|Leech|Pay|Flood|Fog|Tide|Anvil|Chain/.test(id));
  }
  if (stage === "mid") {
    return VERBS.filter((id) => !id.startsWith("late"));
  }
  return [...VERBS];
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

function replaceOptions(deck: CardId[], stage: Stage): Reward[] {
  const froms = unique(deck.filter((id) => BASICS.includes(id)));
  const tos = verbPool(stage).filter((id) => !deck.includes(id));
  const out: Reward[] = [];
  for (const from of froms) {
    for (const to of tos) {
      out.push({ kind: "replace", from, to });
    }
  }
  return out;
}

function addOptions(deck: CardId[], stage: Stage): Reward[] {
  return verbPool(stage)
    .filter((id) => !deck.includes(id))
    .map((id) => ({ kind: "add" as const, id }));
}

function chapterList(): ChapterId[] {
  return ["dock", "alley", "court", "isle"];
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
  if (reward.kind === "silver") return `s:${reward.amount}`;
  if (reward.kind === "yuanbao") return `y:${reward.amount}`;
  if (reward.kind === "pass") return `p:${reward.amount}`;
  if (reward.kind === "goods") return `g:${reward.id}`;
  if (reward.kind === "scrollBox") return "box";
  if (reward.kind === "gear") return `w:${reward.id}`;
  if (reward.kind === "mate") return `m:${reward.id}`;
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
  const stage = runStage(run);
  const remnant = source.type === "duel" ? ENEMIES[source.enemyId].remnant : undefined;
  const techs = techPool(run, save, remnant).map((id) => ({ kind: "technique" as const, id }));
  const upgrades = upgradeOptions(run.deck);
  const replaces = replaceOptions(run.deck, stage);
  const adds = addOptions(run.deck, stage);
  const used = new Set<string>();
  const picked: Reward[] = [];

  if (source.type === "chest") {
    // 宝箱优先残技；后期才掺新谱／残谱箱
    picked.push(...takeUnique(techs, 3, used));
    if (picked.length < 3 && stage === "late") {
      if (Math.random() < 0.5) picked.push({ kind: "scrollBox" });
      picked.push(...takeUnique(adds, 3 - picked.length, used));
    }
    if (picked.length < 3) picked.push(...takeUnique(upgrades, 3 - picked.length, used));
    if (picked.length < 3) picked.push(...takeUnique(replaces, 3 - picked.length, used));
    if (picked.length < 3) picked.push(...takeUnique(adds, 3 - picked.length, used));
    return picked.slice(0, 3);
  }

  const remnantReward = remnant && techs.find((t) => t.id === remnant);
  if (remnantReward) {
    const sure = source.type === "duel" && CHALLENGE.includes(source.enemyId);
    if (sure || Math.random() < 0.4) {
      used.add(keyOf(remnantReward));
      picked.push(remnantReward);
    }
  }

  // 阶段权重：前期改字/换页为主，中期新谱殷实，后期新谱+残谱箱丰富
  const buckets =
    stage === "early"
      ? shuffle([
          takeUnique(upgrades, 1, new Set()),
          takeUnique(replaces, 1, new Set()),
          takeUnique(techs, 1, new Set()),
        ]).flat()
      : stage === "mid"
        ? shuffle([
            takeUnique(adds, 1, new Set()),
            takeUnique(replaces, 1, new Set()),
            takeUnique(techs, 1, new Set()),
            takeUnique(upgrades, 1, new Set()),
          ]).flat()
        : shuffle([
            takeUnique(adds, 2, new Set()),
            takeUnique(techs, 1, new Set()),
            takeUnique(replaces, 1, new Set()),
          ]).flat();

  for (const r of buckets) {
    if (picked.length >= 3) break;
    const k = keyOf(r);
    if (used.has(k)) continue;
    used.add(k);
    picked.push(r);
  }

  if (stage === "late" && picked.length < 3 && Math.random() < 0.35) {
    picked.push({ kind: "scrollBox" });
  }
  if ((stage === "mid" || stage === "late") && picked.length < 3 && Math.random() < (stage === "late" ? 0.28 : 0.18)) {
    const school = run.weapon?.split("-")[0] ?? "palm";
    const grade = stage === "late" ? 3 : 2;
    const gid = `${school}-a-${grade}`;
    if (gearById(gid) && !used.has(`g:${gid}`)) {
      used.add(`g:${gid}`);
      picked.push({ kind: "gear", id: gid });
    }
  }
  if (picked.length < 3 && Math.random() < (stage === "early" ? 0.55 : 0.35)) {
    picked.push(...takeUnique(upgrades, 1, used));
  }
  if (picked.length < 3) picked.push(...takeUnique(replaces, 3 - picked.length, used));
  if (picked.length < 3) picked.push(...takeUnique(techs, 3 - picked.length, used));
  if (picked.length < 3) picked.push(...takeUnique(adds, 3 - picked.length, used));
  if (picked.length < 3) picked.push(...takeUnique(upgrades, 3 - picked.length, used));
  if (picked.length < 3) {
    const loot = rollSideLoot(run, run.scene ?? (run.chapter === "dock" ? "wharf" : run.chapter === "court" ? "bianjing" : "lane"));
    for (const r of loot) {
      if (picked.length >= 3) break;
      const k = keyOf(r);
      if (used.has(k)) continue;
      used.add(k);
      picked.push(r);
    }
  }
  if (picked.length < 3 && !used.has("s:4")) {
    used.add("s:4");
    picked.push({ kind: "silver", amount: stageSilver(stageOfScene(run.scene ?? "wharf"), 4) });
  }
  return picked.slice(0, 3);
}

export function applyReward(run: Run, reward: Reward): Run {
  const next = structuredClone(run);
  if (reward.kind === "silver") {
    next.silver = (next.silver ?? 0) + reward.amount;
    return next;
  }
  if (reward.kind === "yuanbao") return addYuanbao(next, reward.amount);
  if (reward.kind === "pass") return addPass(next, reward.amount);
  if (reward.kind === "goods") return addBag(next, reward.id as BagGoodsId, reward.n);
  if (reward.kind === "scrollBox") {
    // 残谱箱：抽一张未见过的技能进残卷
    const pool = VERBS.filter((id) => !next.deck.includes(id) && !next.scrolls.includes(id));
    if (!pool.length) {
      next.silver = (next.silver ?? 0) + 6;
      return next;
    }
    const pick = pool[Math.floor(Math.random() * pool.length)]!;
    next.scrolls = [...next.scrolls, pick];
    return next;
  }
  if (reward.kind === "gear") {
    const g = gearById(reward.id);
    if (!g || g.grade > 4) return next; // 最高玄，神兵不直接掉
    if (next.weapons.includes(reward.id)) {
      next.silver = (next.silver ?? 0) + Math.max(4, Math.floor(g.price / 4));
      return next;
    }
    next.weapons = [...next.weapons, reward.id];
    return next;
  }
  if (reward.kind === "mate") {
    return addCompanion(next, reward.id as CompanionId);
  }
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
