import { MATES, grantLabItem, breakStarterDeck, injectRogueBondCards, rogueLeadId, rogueCompanionTierForStage, rogueRosterByTier, rogueMate, climbVitals, isBreakAlign, withMateDeck, climbTechSlotMax, getGauntletFinalStage, maxCompanions, usesBanditStory } from "./gauntletKit";
import { GauntletRun, LifelineKind, GAUNTLET_PLAYER_HP_MUL } from "./gauntletModel";
import type { CompanionId, LabItemId, TechniqueId, WeaponId } from "../types";
import type { MindArtId } from "../mindArts";
import { gauntletFieldMate } from "./gauntletPorts";
import { runCompanions } from "./ladderRules";

export function peakPotAnchor(stage: number): number {
  const s = Math.max(1, stage);
  return Math.round(60 + 22 * s + 6 * s * s);
}

/** 复活费 = 峰值锚点 / 3；pot 低于此值 = 破产区，不可赊账复活。 */
export function reviveCost(stage: number): number {
  return Math.max(12, Math.floor(peakPotAnchor(stage) / 3));
}

const AID_ITEM_BY_SCHOOL: Record<WeaponId, LabItemId> = {
  sword: "aidSword",
  saber: "aidSaber",
  spear: "aidSpear",
  palm: "aidPalm",
  staff: "aidStaff",
  hook: "aidHook",
  dart: "aidHook",
};

export function canOfferLifeline(run: GauntletRun): boolean {
  return !run.bankruptUsed && run.pot >= reviveCost(run.stage);
}

/** 第二次馆败：带伤过馆，不另开亡命线。 */
export function canOfferScarPass(run: GauntletRun): boolean {
  return Boolean(run.bankruptUsed) && !run.scarPassUsed && (run.scars ?? 0) < 1 && run.stage < getGauntletFinalStage(run);
}

export function applyScarPass(run: GauntletRun): GauntletRun {
  const tax = Math.max(1, Math.round(run.pot * 0.2));
  const hpMax = scaledHpMax(run);
  return {
    ...run,
    pot: Math.max(0, run.pot - tax),
    stage: run.stage + 1,
    streak: 0,
    scars: (run.scars ?? 0) + 1,
    scarPassUsed: true,
    forceDangerNext: true,
    hp: Math.max(1, Math.floor(hpMax * 0.8)),
    hpMax,
    wager: null,
    lastPotText: `带伤过馆 -${tax}`,
  };
}

export function applyLifeline(run: GauntletRun, kind: LifelineKind, rng: () => number): GauntletRun {
  if (kind === "stat50") return { ...run, lifeline: kind, statBoostMul: 1.5 };
  if (kind === "divineWeapons") return { ...run, lifeline: kind, divineWeapons: true };
  if (kind === "aidPair") {
    const aid = AID_ITEM_BY_SCHOOL[run.school];
    const g = grantLabItem(run.items, run.itemCharges, aid, undefined, 3);
    if (!g) return { ...run, lifeline: kind };
    const equippedAids = [...(run.equippedAids ?? [])];
    if (!equippedAids.includes(aid)) equippedAids.push(aid);
    return { ...run, lifeline: kind, items: g.items, itemCharges: g.charges, equippedAids };
  }
  const taken = new Set(runCompanions(run));
  if (run.lifelineCompanion) taken.add(run.lifelineCompanion);
  const pool = rollCompanionChoices(run, rng).filter((id) => !taken.has(id));
  const pick = pool[0] ?? rollCompanionChoices(run, rng)[0]!;
  return { ...run, lifeline: kind, lifelineCompanion: pick };
}

/** 付复活费、标记已破产、满血回本馆（不赔光彩金）。 */
export function reviveGauntletRun(run: GauntletRun): GauntletRun | null {
  const cost = reviveCost(run.stage);
  if (run.bankruptUsed || run.pot < cost) return null;
  const hpMax = scaledHpMax(run);
  return {
    ...run,
    pot: run.pot - cost,
    hp: hpMax,
    hpMax,
    bankruptUsed: true,
    skipNextWager: true,
    wager: null,
    lastPotText: `赊账复活 -${cost}`,
  };
}

/** 踢馆双方加血、伤害系数不变：拉长回合。 */
export function scaledHpMax(run: GauntletRun): number {
  if (!isBreakAlign()) {
    const mate = gauntletFieldMate(run.school);
    const vitals = climbVitals(mate).hp;
    const mul = run.statBoostMul > 1 ? run.statBoostMul : 1;
    // run.hpMax 可能已被复活写成加乘后的值；加乘只做一次。
    let unboosted = Math.max(vitals, run.hpMax);
    if (mul > 1 && run.hpMax >= Math.floor(vitals * mul)) {
      unboosted = Math.max(vitals, Math.round(run.hpMax / mul));
    }
    return Math.floor(unboosted * mul);
  }
  const base = Math.round(Math.max(MATES[gauntletFieldMate(run.school)].hp, 42) * GAUNTLET_PLAYER_HP_MUL);
  const raw = Math.max(base, run.hpMax);
  return run.statBoostMul > 1 ? Math.floor(raw * run.statBoostMul) : raw;
}

export function grantTechToRun(run: GauntletRun, id: TechniqueId, mate: CompanionId): GauntletRun {
  const owned = run.mateTechs[mate] ?? [];
  const field = gauntletFieldMate(run.school);
  const withTech = (next: GauntletRun, list: TechniqueId[]): GauntletRun =>
    mate === field ? { ...next, techniques: list } : next;
  if (owned.includes(id)) return { ...run, stashTechs: [...(run.stashTechs ?? []), id] };
  const cap = isBreakAlign() ? 3 : climbTechSlotMax(run.stage);
  if (owned.length >= cap) return { ...run, stashTechs: [...(run.stashTechs ?? []), id] };
  const list = [...owned, id];
  return withTech({ ...run, mateTechs: { ...run.mateTechs, [mate]: list } }, list);
}

export function grantMindToRun(run: GauntletRun, id: MindArtId, mate: CompanionId): GauntletRun {
  const owned = run.mateMindArts[mate] ?? [];
  if (owned.includes(id)) return { ...run, stashMinds: [...(run.stashMinds ?? []), id] };
  return { ...run, mateMindArts: { ...run.mateMindArts, [mate]: [...owned, id] } };
}

export function equipStashTech(run: GauntletRun, mate: CompanionId, stashIdx: number): GauntletRun {
  const stash = [...(run.stashTechs ?? [])];
  const id = stash[stashIdx];
  if (!id) return run;
  const owned = run.mateTechs[mate] ?? [];
  if (owned.includes(id)) return run;
  const cap = isBreakAlign() ? 3 : climbTechSlotMax(run.stage);
  if (owned.length >= cap) return run;
  stash.splice(stashIdx, 1);
  const list = [...owned, id];
  const field = gauntletFieldMate(run.school);
  return {
    ...run,
    stashTechs: stash,
    mateTechs: { ...run.mateTechs, [mate]: list },
    techniques: mate === field ? list : run.techniques,
  };
}

export function feedStashTech(run: GauntletRun, mate: CompanionId, stashIdx: number): GauntletRun {
  const stash = [...(run.stashTechs ?? [])];
  const id = stash[stashIdx];
  if (!id) return run;
  const owned = run.mateTechs[mate] ?? [];
  if (!owned.includes(id)) return run;
  const ranks = { ...(run.mateTechRanks ?? {}) };
  const mine = { ...(ranks[mate] ?? {}) };
  const cur = Math.min(3, Math.max(1, mine[id] ?? 1));
  if (cur >= 3) return run;
  stash.splice(stashIdx, 1);
  mine[id] = cur + 1;
  ranks[mate] = mine;
  return { ...run, stashTechs: stash, mateTechRanks: ranks };
}

export function unequipTechToStash(run: GauntletRun, mate: CompanionId, techId: TechniqueId): GauntletRun {
  const owned = (run.mateTechs[mate] ?? []).filter((t) => t !== techId);
  const ranks = { ...(run.mateTechRanks ?? {}) };
  const mine = { ...(ranks[mate] ?? {}) };
  delete mine[techId];
  ranks[mate] = mine;
  return {
    ...run,
    mateTechs: { ...run.mateTechs, [mate]: owned },
    mateTechRanks: ranks,
    stashTechs: [...(run.stashTechs ?? []), techId],
    techniques: mate === gauntletFieldMate(run.school) ? owned : run.techniques,
  };
}

export function equipStashMind(run: GauntletRun, mate: CompanionId, stashIdx: number): GauntletRun {
  const stash = [...(run.stashMinds ?? [])];
  const id = stash[stashIdx];
  if (!id) return run;
  const owned = run.mateMindArts[mate] ?? [];
  if (owned.includes(id)) return run;
  stash.splice(stashIdx, 1);
  return { ...run, stashMinds: stash, mateMindArts: { ...run.mateMindArts, [mate]: [...owned, id] } };
}

export function toggleGodUsing(run: GauntletRun): GauntletRun {
  if (!run.godMain || !run.godSub) return run;
  const next = run.godUsing === "sub" ? "main" : "sub";
  const wid = `${run.school}-${next === "sub" ? "b" : "a"}-5`;
  const mate = gauntletFieldMate(run.school);
  return { ...run, godUsing: next, weaponId: wid, mateWeapons: { ...(run.mateWeapons ?? {}), [mate]: wid } };
}

const RIVAL_WEAPON: Record<WeaponId, WeaponId> = {
  saber: "staff",
  staff: "saber",
  palm: "sword",
  sword: "palm",
  spear: "hook",
  hook: "spear",
  dart: "staff",
};

export function relatedCompanionIds(run: GauntletRun, pool: CompanionId[]): CompanionId[] {
  const first = runCompanions(run)[0];
  if (!first) return pool;
  const w = MATES[first]?.weapon;
  if (!w) return pool;
  const rival = RIVAL_WEAPON[w];
  const same = pool.filter((id) => MATES[id]?.weapon === w);
  const riv = pool.filter((id) => MATES[id]?.weapon === rival);
  const rest = pool.filter((id) => MATES[id]?.weapon !== w && MATES[id]?.weapon !== rival);
  return [...same, ...riv, ...rest];
}

export function rollCompanionChoices(run: GauntletRun, rng: () => number): CompanionId[] {
  const fought = Math.max(1, run.stage - 1);
  const tier = rogueCompanionTierForStage(fought) ?? (run.companions?.length ? 3 : 2);
  const field = rogueLeadId(run.school);
  const taken = new Set<CompanionId>([field, ...runCompanions(run)]);
  let raw = rogueRosterByTier(tier)
    .map((m) => m.id)
    .filter((id) => !taken.has(id));
  const pool = isBreakAlign() ? relatedCompanionIds(run, raw) : raw;
  const out: CompanionId[] = [];
  const bag = [...pool];
  while (out.length < 4 && bag.length) {
    const idx = Math.floor(rng() * bag.length);
    out.push(bag.splice(idx, 1)[0]!);
  }
  return out;
}

/** 江湖线关闭陌生人四选一：只能从 castDraw 或 seenStoryIds 里已见过的人里选。 */
export function banditCompanionChoices(run: GauntletRun, rng: () => number): CompanionId[] {
  const base = rollCompanionChoices(run, rng);
  if (!usesBanditStory(run) || !run.castDraw) return base;
  // 江湖线：开场抽进 castDraw 的 5 人算作「见过」；后续剧情选项写入 seenStoryIds
  const seen = new Set<CompanionId>([...(run.castDraw ?? []), ...(run.seenStoryIds ?? [])]);
  return base.filter((id) => seen.has(id));
}

function companionStartMinds(school: WeaponId, tier: number): MindArtId[] {
  const schoolMind: Record<WeaponId, MindArtId> = {
    saber: "saberEdge",
    palm: "palmMeridian",
    sword: "swordMirror",
    spear: "spearStride",
    staff: "staffRoot",
    hook: "hookTide",
    dart: "staffRoot",
  };
  if (tier <= 1) return [];
  if (tier === 2) return [schoolMind[school]];
  return ["ironBreath", schoolMind[school]];
}

export function applyCompanion(run: GauntletRun, mateId: CompanionId): GauntletRun {
  const cur = runCompanions(run);
  if (cur.includes(mateId)) return { ...run, companion: cur[0], companions: cur };
  const maxMate = maxCompanions(run.stage);
  const next = [...cur, mateId].slice(0, maxMate);
  const schools = [run.school, ...next.map((id) => MATES[id].weapon)];
  let nextRun = { ...run, companion: next[0], companions: next };
  const theirs = injectRogueBondCards(breakStarterDeck(MATES[mateId].weapon), MATES[mateId].weapon, schools);
  nextRun = withMateDeck(nextRun, mateId, theirs);
  const tier = rogueMate(mateId)?.tier ?? 1;
  const minds = companionStartMinds(MATES[mateId].weapon, tier);
  if (minds.length) {
    nextRun = { ...nextRun, mateMindArts: { ...nextRun.mateMindArts, [mateId]: minds } };
  }
  return nextRun;
}
