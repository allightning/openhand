import { applyAutoLoadout } from "./autoLoadouts";
import { BREAK_REWARD_WEIGHTS, itemTip, mindTip, techniqueTip } from "./breakAlign";
import { climbVitals } from "./climbVitals";
import { normalizePreset } from "./draft";
import { GAUNTLET_FINAL_STAGE, GAUNTLET_MIDTERM_STAGE, getGauntletFinalStage, ladderEnvTag, maxCompanions, pathLadder, readEnvTag } from "./gauntletPaths";
import { DEFAULT_LAB_TUNING, getLabTuning, setLabTuning, type LabTuning } from "./labTuning";
import { isBreakAlign } from "./labRuleset";
import { fieldDeck, gearSlotMax, grantCardToLoadout, isAidItem, ownedCardIds, replaceOwnedCard, withMateDeck, climbTechSlotMax } from "./loadout";
import { expandDeckRecipe } from "./rules";
import { shellRunContext } from "./shellContext";
import { dealStoryCast, personHome, usesBanditStory } from "./storyBeats";
import type { LabPreset } from "./types";
import { hallEnemyHitMul } from "../game/climbCaps";
import { sumMindArtBonuses } from "../game/mindArts";
import { MATES, WEAPON_NAME } from "../game/party";
import { breakStarterDeck } from "../game/rogueRoster";
import type { CompanionId, EnemyId, TechniqueId, WeaponId } from "../game/types";
import { gearById } from "../game/weapons";
import {
  GAUNTLET_PLAYER_HP_MUL,
  GAUNTLET_SCHOOL_LOADOUT,
  GAUNTLET_START_POT,
  GAUNTLET_TIER_LABEL,
  type GauntletLadderEntry,
  type GauntletPath,
  type GauntletRewardOption,
  type GauntletRun,
} from "../game/rules/gauntletModel";
import { installGauntletPorts, gauntletFieldMate } from "../game/rules/gauntletPorts";
import { duelEnemyForSchool, ladderEntryForRun, resolveStageEnemy, runCompanions, waveEnemyForStage } from "../game/rules/ladderRules";
import { scaledHpMax } from "../game/rules/lifelineRules";
import { applySuperRewardRule } from "../game/rules/rewardRoll";

installGauntletPorts({
  isBreakAlign,
  runContext: shellRunContext,
  itemTip,
  mindTip,
  techniqueTip,
  grantCardToLoadout,
  ownedCardIds,
  replaceOwnedCard,
  withMateDeck,
  climbTechSlotMax,
  pathLadder,
  getGauntletFinalStage,
  maxCompanions,
  expandDeckRecipe,
  usesBanditStory,
  rewardWeights: BREAK_REWARD_WEIGHTS,
  finalStage: GAUNTLET_FINAL_STAGE,
  midtermStage: GAUNTLET_MIDTERM_STAGE,
});

export * from "../game/rules/gauntletModel";
export * from "../game/rules/marketRules";
export * from "../game/rules/wagerRules";
export * from "../game/rules/rewardRules";
export * from "../game/rules/rewardRoll";
export * from "../game/rules/lifelineRules";
export * from "../game/rules/ladderRules";
export * from "./persist";
export { gauntletFieldMate };

export const GAUNTLET_MAX_STAGE = GAUNTLET_FINAL_STAGE;
export { getGauntletFinalStage };

export function applySuperReward(run: GauntletRun, opt: GauntletRewardOption, rng?: () => number): GauntletRun {
  return applySuperRewardRule(run, opt, rng ?? Math.random);
}

export type GauntletScreen =
  | "intro"
  | "path"
  | "pick"
  | "banker"
  | "reward"
  | "result"
  | "companion"
  | "wager"
  | "lifeline"
  | "loadout"
  | "rewardTarget"
  | "event"
  | "finale"
  | "scar"
  | "settle"
  | "opening";

let savedTuning: LabTuning | null = null;

export function isGauntletTuningLocked(): boolean {
  return savedTuning != null;
}

/** G2：进入踢馆时快照并强制覆盖；退出时恢复。 */
export function enterGauntletTuning(): void {
  if (!savedTuning) savedTuning = { ...getLabTuning() };
  setLabTuning({
    rulesCombo: false,
    deckMultiplier: 3,
    designerMode: false,
    rulesV2: true,
    v2Fx: true,
    v2VariantAi: true,
    enemySegAll: true,
  });
}

export function exitGauntletTuning(): void {
  if (savedTuning) {
    setLabTuning(savedTuning);
    savedTuning = null;
  }
}

export function createGauntletRun(
  path: GauntletPath,
  school: WeaponId,
  bossId: EnemyId = "usurper",
  opts?: { endless?: boolean; rng?: () => number },
): GauntletRun {
  const cfg = GAUNTLET_SCHOOL_LOADOUT[school];
  const base = applyAutoLoadout(cfg.loadoutId, 3, 0);
  const mate = gauntletFieldMate(school);
  const rosterHp = MATES[mate]?.hp ?? 42;
  const hpMax = isBreakAlign()
    ? Math.round(Math.max(base.hpMax ?? rosterHp, rosterHp) * GAUNTLET_PLAYER_HP_MUL)
    : climbVitals(mate).hp;
  const recipe = [...breakStarterDeck(school)];
  const rng = opts?.rng ?? Math.random;
  const story = path === "bandit" && !opts?.endless ? dealStoryCast(rng) : undefined;
  return {
    path,
    school,
    stage: 1,
    streak: 0,
    totalBreaks: 0,
    deckRecipe: recipe,
    mateDecks: { [mate]: [...recipe] },
    stashCards: [],
    techniques: [],
    mateTechs: { [mate]: [] },
    mateTechRanks: {},
    stashTechs: [],
    stashMinds: [],
    mateMindArts: { [mate]: [] },
    items: [],
    itemCharges: {},
    hp: hpMax,
    hpMax,
    startedAt: Date.now(),
    weaponId: `${school}-a-${isBreakAlign() ? 1 : 3}`,
    mateWeapons: { [mate]: `${school}-a-${isBreakAlign() ? 1 : 3}` },
    godMain: false,
    godSub: false,
    godUsing: "main",
    bossId,
    pot: GAUNTLET_START_POT,
    wager: null,
    bankruptUsed: false,
    facedEnemies: [],
    companions: [],
    statBoostMul: 1,
    divineWeapons: false,
    scars: 0,
    seenEvents: [],
    bgUses: {},
    bgAssign: {},
    endless: opts?.endless ? true : undefined,
    sideBranchAt: {},
    routeLog: [],
    routeLength: 10,
    skipCompanionPick: story ? true : undefined,
    openingId: story?.openingId,
    castDraw: story?.castDraw,
    storyPending: story ? "opening" : undefined,
    storyPlace: story ? personHome(story.openingId) : undefined,
    storyGuest: story?.openingId,
    gambleCount: story ? 0 : undefined,
    seenStoryIds: story ? [] : undefined,
    bankerChosen: true,
  };
}

export function buildGauntletPreset(run: GauntletRun): LabPreset {
  const entry = ladderEntryForRun(run);
  const cfg = GAUNTLET_SCHOOL_LOADOUT[run.school];
  const final = getGauntletFinalStage(run);
  const enemyId = resolveStageEnemy(entry, run.bossId, run.facedEnemies, final);
  const extras = entry.extraEnemyIds ? [...entry.extraEnemyIds] : [];
  const used = new Set<EnemyId>([enemyId, ...extras, ...run.facedEnemies]);
  const pool = pathLadder(run.path)
    .map((e) => e.enemyId)
    .filter((id) => !used.has(id));
  const waveDelta = run.pendingExtraWaves ?? 0;
  if (waveDelta > 0) {
    for (let i = 0; i < waveDelta; i++) {
      const id = pool[i];
      if (id) extras.push(id);
    }
  } else if (waveDelta < 0) {
    extras.splice(Math.max(0, extras.length + waveDelta));
  }
  const guest = run.pendingGuestEnemyId;
  if (guest && guest !== enemyId && !extras.includes(guest)) extras.unshift(guest);
  let waveEnemyId: EnemyId | undefined;
  let waveQueue: EnemyId[] | undefined;
  if (extras.length) {
    waveEnemyId = extras[0];
    waveQueue = extras.length > 1 ? extras.slice(1) : undefined;
  } else if (!isBreakAlign()) {
    waveEnemyId = waveEnemyForStage(run, entry, enemyId);
  }
  const base = applyAutoLoadout(cfg.loadoutId, 3, 0, { enemyId });
  const mate = gauntletFieldMate(run.school);
  const weapon = run.divineWeapons
    ? `${run.school}-${run.godUsing === "sub" ? "b" : "a"}-5`
    : (run.weaponId ?? base.mateWeapons?.[mate] ?? `${run.school}-a-${isBreakAlign() ? 1 : 3}`);
  const companions = runCompanions(run);
  const party: CompanionId[] = [mate, ...companions];
  if (run.lifelineCompanion && !party.includes(run.lifelineCompanion)) {
    party.push(run.lifelineCompanion);
  }
  const mateWeapons: Record<string, string> = {
    [mate]: run.divineWeapons ? weapon : (run.weaponId ?? run.mateWeapons?.[mate] ?? weapon),
  };
  const grade = run.divineWeapons ? 5 : Math.min(gearById(weapon, shellRunContext())?.grade ?? 3, 4);
  for (const id of party) {
    if (id === mate) continue;
    mateWeapons[id] = run.divineWeapons
      ? `${MATES[id].weapon}-a-5`
      : (run.mateWeapons?.[id] ?? `${MATES[id].weapon}-a-${grade}`);
  }
  const mateTechs: Record<string, TechniqueId[]> = {};
  for (const id of party) {
    const from = run.mateTechs[id] ?? (id === mate ? run.techniques : []) ?? [];
    mateTechs[id] = [...from];
  }
  const mindHp = sumMindArtBonuses(run.mateMindArts[mate] ?? []).hpMax;
  const hpMax = scaledHpMax(run) + mindHp;
  return normalizePreset({
    id: `gauntlet-${run.school}-${run.stage}`,
    name: `${entry.label}（${GAUNTLET_TIER_LABEL[entry.tier]}）`,
    blurb: `行路 · ${WEAPON_NAME[run.school]}`,
    tags: ["行路", run.school],
    enemyId,
    waveEnemyId,
    waveQueue,
    extraFoeIds: undefined,
    party,
    fieldMate: mate,
    deckRecipe: [...fieldDeck(run)],
    heroName: run.heroName,
    mateDeckRecipes: run.mateDecks,
    mateWeapons,
    mateTechs,
    mateTechRanks: run.mateTechRanks ? structuredClone(run.mateTechRanks) : undefined,
    mateMinds: { ...run.mateMindArts },
    labItems: [
      ...(run.equippedItems ?? run.items.filter((id) => !isAidItem(id))),
      ...((run.equippedAids && run.equippedAids.length) ? run.equippedAids : run.items.filter(isAidItem)),
    ].slice(0, gearSlotMax(run.stage) * 2),
    labItemCharges: { ...(run.itemCharges ?? {}) },
    hp: hpMax,
    hpMax,
    statBoostMul: run.statBoostMul,
    gauntletStage: run.stage,
    hallLaw: run.pendingHallLaw,
    envTag: ladderEnvTag(run.path, run.stage) ?? readEnvTag(run.storyFlags),
  });
}

export function buildSkirmishPreset(run: GauntletRun): LabPreset {
  const recruit = run.pendingRecruit;
  const duel = run.pendingSkirmish === "duel" && recruit;
  const enemyId: EnemyId = duel
    ? duelEnemyForSchool(MATES[recruit]!.weapon)
    : run.path === "shaolin"
      ? "mob_monk_01"
      : run.path === "court"
        ? "mob_yamenRunner_01"
        : "mob_road_01";
  const who = recruit ? (MATES[recruit]?.name ?? "") : "";
  const side = run.pendingSkirmish === "side";
  const base = buildGauntletPreset({
    ...run,
    stage: Math.min(run.stage, 2),
    pendingExtraWaves: -99,
    pendingHallLaw: undefined,
    pendingDmgMul: 0.7,
    pendingGuestEnemyId: undefined,
  });
  return {
    ...base,
    id: `skirmish-${run.school}`,
    name: side
      ? `支线 · ${run.pendingSideLabel ?? "馆间"}`
      : duel
        ? `点到 · ${who}`
        : who
          ? `替${who}挡刀`
          : "路遇出手",
    blurb: side ? `馆间支线 ${run.pendingSideLabel ?? ""} · 不占脊骨馆号 · 禁注` : "短战 · 不占馆号 · 禁注",
    enemyId,
    waveEnemyId: undefined,
    waveQueue: undefined,
    extraFoeIds: undefined,
    hallLaw: undefined,
  };
}

export function applyStageTuning(entry: GauntletLadderEntry, run?: Pick<GauntletRun, "pendingDmgMul" | "forceDangerNext" | "scars">): void {
  // §31.14 总督按档：简单 45% / 中等 55% / 困难 65% / 极难 80%（单回合攻击总伤占你气血上限的比例）
  const capRatio = entry.tier === "easy" ? 0.45 : entry.tier === "mid" ? 0.55 : entry.tier === "hard" ? 0.65 : 0.8;
  const stressCap =
    isBreakAlign() && entry.stage <= 2 ? 0 : (entry.stressCap ?? DEFAULT_LAB_TUNING.enemyStressCap);
  const dmgMul = run?.pendingDmgMul ?? 1;
  const enemyHitMul = isBreakAlign() ? 1 : hallEnemyHitMul(entry.stage);
  setLabTuning({
    enemyHpMul: isBreakAlign() ? entry.hpMul : Math.round(entry.hpMul * 148) / 100,
    enemySegBonus: entry.segBonus,
    dmgCoef: Math.min(2.6, entry.dmgCoef * dmgMul),
    enemyHitMul,
    v2Grudge: Boolean(entry.forceGrudge || run?.forceDangerNext || (run?.scars ?? 0) > 0 && entry.tier === "extreme"),
    enemyTurnCapRatio: capRatio,
    enemyStressCap: stressCap,
  });
}