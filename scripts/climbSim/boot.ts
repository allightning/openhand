import { ENEMIES } from "../../src/game/content";
import type { GauntletRun } from "../../src/game/rules/gauntletModel";
import { ladderEntryForRun } from "../../src/game/rules/ladderRules";
import { applyStageTuning, buildGauntletPreset, createGauntletRun, enterGauntletTuning } from "../../src/combatLab/gauntlet";
import { runFromPreset } from "../../src/combatLab/factory";
import { setLabRuleset } from "../../src/combatLab/labRuleset";
import { getLabTuning, setLabMode, setLabTuning } from "../../src/combatLab/labTuning";
import { shellRunContext } from "../../src/combatLab/shellContext";
import type { ClimbKnobs } from "./knobs";
import { DEFAULT_KNOBS } from "./knobs";
import { mulberry32 } from "./rng";
import { SIM_PATH } from "./tiers";
import type { EnemyId, Run, WeaponId } from "../../src/game/types";
import type { RunContext } from "../../src/game/runContext";

export type OpenedHall = {
  enemyId: EnemyId;
  enemyName: string;
  rc: RunContext;
  run: Run;
  stage: number;
  waveEnemyId?: EnemyId;
  waveQueue?: EnemyId[];
};

let booted = false;

export function bootLab(): void {
  if (booted) return;
  setLabRuleset("climb");
  setLabMode(true);
  enterGauntletTuning();
  booted = true;
}

function applyKnobs(knobs: ClimbKnobs): void {
  const t = getLabTuning();
  setLabTuning({
    enemyHpMul: t.enemyHpMul * knobs.enemyHp,
    dmgCoef: t.dmgCoef * knobs.enemyDmg,
    playerDmgMul: knobs.playerDmg,
  });
}

export function freshRun(school: WeaponId, seed: number): GauntletRun {
  bootLab();
  return createGauntletRun(SIM_PATH, school, "usurper", { rng: mulberry32(seed) });
}

export function openHall(run: GauntletRun, stage: number, knobs: ClimbKnobs = DEFAULT_KNOBS, hp?: number): OpenedHall {
  bootLab();
  const staged = { ...run, stage, facedEnemies: run.facedEnemies ?? [] };
  applyStageTuning(ladderEntryForRun(staged), staged);
  applyKnobs(knobs);
  const preset = buildGauntletPreset(staged);
  const body = runFromPreset(preset);
  const hpMax = body.hpMax;
  const battleRun: Run = { ...body, hpMax, hp: Math.min(hp ?? hpMax, hpMax) };
  const enemyId = preset.enemyId;
  return {
    enemyId,
    enemyName: ENEMIES[enemyId]?.name ?? enemyId,
    rc: shellRunContext(),
    run: battleRun,
    stage,
    waveEnemyId: preset.waveEnemyId,
    waveQueue: preset.waveQueue,
  };
}
