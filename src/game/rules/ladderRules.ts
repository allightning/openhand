import { gauntletPorts } from "./gauntletPorts";
import { ENEMIES, GAUNTLET_FOE_IDENTITY, pathLadder, getGauntletFinalStage } from "./gauntletKit";
import { GauntletRun, GauntletLadderEntry, GauntletPath } from "./gauntletModel";
import type { CompanionId, EnemyId, WeaponId } from "../types";

function earlyLadder(): GauntletLadderEntry[] {
  return pathLadder("bandit").slice(0, 7);
}

export function ladderEntry(stage: number, path: GauntletPath = "bandit", final = gauntletPorts().finalStage): GauntletLadderEntry {
  const ladder = pathLadder(path);
  const maxLadderStage = ladder[ladder.length - 1]!.stage;
  // 期末馆：无论 ladder 里该 stage 原本是什么，都使用最后一条（极端）作为期末
  if (stage === final) {
    const last = ladder[ladder.length - 1]!;
    return { ...last, stage };
  }
  const hit = ladder.find((e) => e.stage === stage);
  if (hit) return hit;
  // 长行路：在 ladder 最大馆序与期末之间插馆，从末尾往前复用 8/9 档压力
  if (stage > maxLadderStage && stage < final) {
    const distanceFromFinal = final - stage;
    const sourceIndex = Math.max(0, ladder.length - 1 - distanceFromFinal);
    const source = ladder[sourceIndex]!;
    return { ...source, stage };
  }
  if (stage > final) {
    const k = stage - final;
    const last = ladder[ladder.length - 1]!;
    return {
      ...last,
      stage,
      label: `第${stage}关·回头`,
      hpMul: last.hpMul + 0.15 * k,
      segBonus: Math.min(last.segBonus + Math.ceil(k / 2), 8),
      dmgCoef: Math.min(last.dmgCoef + 0.05 * k, 2.3),
    };
  }
  throw new Error(`未知踢馆馆序：${stage}`);
}

export function ladderEntryForRun(run: GauntletRun, stage = run.stage): GauntletLadderEntry {
  return ladderEntry(stage, run.path, getGauntletFinalStage(run));
}

export function resolveStageEnemy(entry: GauntletLadderEntry, bossId: EnemyId, faced: EnemyId[] = [], final = gauntletPorts().finalStage): EnemyId {
  if (entry.stage === final) return bossId;
  if (entry.stage > final) {
    return (entry.stage - final) % 2 === 1 ? nextBossId(bossId) : bossId;
  }
  if (!faced.includes(entry.enemyId)) return entry.enemyId;
  const pool = earlyLadder().map((e) => e.enemyId).filter((id) => !faced.includes(id));
  return pool[0] ?? entry.enemyId;
}

/** §31.17 轮番替补：第 2 馆起可能有第二名敌人，打倒前排后接力（拉长单馆，少堆海绵血）。 */
export function waveEnemyForStage(run: GauntletRun, entry: GauntletLadderEntry, primary: EnemyId): EnemyId | undefined {
  if (entry.stage < 2) return undefined;
  const pool = earlyLadder().filter((e) => e.stage <= entry.stage)
    .map((e) => e.enemyId)
    .filter((id) => id !== primary && !run.facedEnemies.includes(id));
  if (!pool.length) return undefined;
  return pool[(run.stage + primary.length) % pool.length];
}

/** Active permanent companions (excludes lifeline temp). */
export function runCompanions(run: GauntletRun): CompanionId[] {
  if (run.companions?.length) return [...run.companions];
  return run.companion ? [run.companion] : [];
}

export function duelEnemyForSchool(school: WeaponId): EnemyId {
  if (school === "palm") return "mob_monk_01";
  if (school === "staff") return "mob_monk_02";
  if (school === "saber") return "mob_road_01";
  if (school === "spear") return "mob_canal_01";
  if (school === "hook") return "mob_escortBand_03";
  return "mob_court_03";
}

export function upcomingFoeNames(run: GauntletRun, n = 2): Array<{ stage: number; name: string }> {
  const out: Array<{ stage: number; name: string }> = [];
  const final = getGauntletFinalStage(run);
  const cap = run.endless ? run.stage + n : final;
  for (let s = run.stage; s < run.stage + n && s <= cap; s++) {
    const entry = ladderEntryForRun(run, s);
    const id = resolveStageEnemy(entry, run.bossId, run.facedEnemies, final);
    const name = GAUNTLET_FOE_IDENTITY[id]?.name ?? ENEMIES[id]?.name ?? id;
    out.push({ stage: s, name });
  }
  return out;
}

export function intelReport(run: GauntletRun): string {
  if (!run.pendingIntel) return "";
  return upcomingFoeNames(run, 2)
    .map((r) => `第${r.stage}馆 ${r.name}`)
    .join(" · ");
}

export function afterGauntletWin(
  run: GauntletRun,
  breaksThisBattle: number,
  _hpLeft: number,
  hpMax: number,
  enemyId: EnemyId,
): GauntletRun {
  const healed = hpMax;
  const completed = run.stage;
  const faced = run.facedEnemies.includes(enemyId) ? run.facedEnemies : [...run.facedEnemies, enemyId];
  return {
    ...run,
    streak: completed,
    stage: completed + 1,
    totalBreaks: run.totalBreaks + breaksThisBattle,
    hp: healed,
    hpMax,
    facedEnemies: faced,
  };
}

export function afterGauntletLoss(run: GauntletRun, breaksThisBattle: number): GauntletRun {
  return {
    ...run,
    streak: Math.max(0, run.stage - 1),
    totalBreaks: run.totalBreaks + breaksThisBattle,
  };
}

export function consumeFightStartMods(run: GauntletRun): GauntletRun {
  return {
    ...run,
    pendingExtraWaves: 0,
    pendingDmgMul: undefined,
    pendingHallLaw: undefined,
    pendingGuestEnemyId: undefined,
  };
}

export function consumeHallPotMods(run: GauntletRun): GauntletRun {
  return { ...run, pendingBasePotMul: undefined };
}

export function consumeCampMods(run: GauntletRun): GauntletRun {
  return { ...run, pendingRewardBonus: 0, pendingSkipMarket: false, pendingOpenMarket: false };
}

export function nextBossId(prev: EnemyId): EnemyId {
  return prev === "usurper" ? "lord" : "usurper";
}
