import { ENEMIES } from "../../src/game/content";
import type { GauntletRun } from "../../src/game/rules/gauntletModel";
import { ladderEntryForRun } from "../../src/game/rules/ladderRules";
import { applyStageTuning, buildGauntletPreset, createGauntletRun, enterGauntletTuning } from "../../src/combatLab/gauntlet";
import { runFromPreset } from "../../src/combatLab/factory";
import { setLabRuleset } from "../../src/combatLab/labRuleset";
import { getLabTuning, setLabMode, setLabTuning } from "../../src/combatLab/labTuning";
import { shellRunContext } from "../../src/combatLab/shellContext";
import type { ClimbKnobs } from "./knobs";
import { DEFAULT_KNOBS, stageDmgAdjust } from "./knobs";
import { mulberry32 } from "./rng";
import { SIM_PATH } from "./tiers";
import type { CompanionId, EnemyId, Run, WeaponId } from "../../src/game/types";
import type { RunContext } from "../../src/game/runContext";

export type FightStamp = {
  professions?: Run["professions"];
  party?: CompanionId[];
  bag?: NonNullable<Run["bag"]>;
  mateDecks?: Run["mateDecks"];
  advance?: boolean;
  mark?: boolean;
  see?: boolean;
  wager?: boolean;
  foeRound?: number;
  foeStage?: number;
  foeSalt?: number;
  thinIds?: import("../../src/game/types").CardId[];
  extraIds?: import("../../src/game/types").CardId[];
  extraByMate?: Partial<Record<CompanionId, import("../../src/game/types").CardId[]>>;
  /** 模拟血档。开战后再写到场上和后场，不改 src 气血默认。 */
  partyHp?: number;
  mateWeapons?: Partial<Record<CompanionId, string>>;
  /** 模拟开局用淬毒。不改 src 默认，要 stamp 点开才喝。 */
  usePoison?: boolean;
  /** 外功注入。开战写进 run.techniques，走正式结算。 */
  techniques?: import("../../src/game/types").TechniqueId[];
  /** 心法注入。开战写进 labMateMinds，走 guardBreak / mindArts。 */
  mateMinds?: Partial<Record<CompanionId, import("../../src/game/mindArts").MindArtId[]>>;
};

export type OpenedHall = {
  enemyId: EnemyId;
  enemyName: string;
  rc: RunContext;
  run: Run;
  stage: number;
  waveEnemyId?: EnemyId;
  waveQueue?: EnemyId[];
  stamp?: FightStamp;
  enemyHitMul?: number;
  dmgCoef?: number;
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

export function openHall(
  run: GauntletRun,
  stage: number,
  knobs: ClimbKnobs = DEFAULT_KNOBS,
  hp?: number,
  rawLadder = false,
): OpenedHall {
  bootLab();
  const staged = { ...run, stage, facedEnemies: run.facedEnemies ?? [] };
  applyStageTuning(ladderEntryForRun(staged), staged);
  const tuned = getLabTuning();
  const ladderEnemy = ladderEntryForRun(staged).dmgCoef;
  const adj = rawLadder ? { enemy: 1, player: 1 } : stageDmgAdjust(stage, ladderEnemy);
  applyKnobs({ ...knobs, enemyDmg: knobs.enemyDmg * adj.enemy, playerDmg: knobs.playerDmg * adj.player });
  if (tuned.enemyHitMul != null) setLabTuning({ enemyHitMul: tuned.enemyHitMul });
  if (knobs.enemyHitMul != null) setLabTuning({ enemyHitMul: knobs.enemyHitMul });
  const preset = buildGauntletPreset(staged);
  const body = runFromPreset(preset);
  const hpMax = body.hpMax;
  const battleRun: Run = { ...body, hpMax, hp: Math.min(hp ?? hpMax, hpMax) };
  const enemyId = preset.enemyId;
  const now = getLabTuning();
  return {
    enemyId,
    enemyName: ENEMIES[enemyId]?.name ?? enemyId,
    rc: shellRunContext(),
    run: battleRun,
    stage,
    waveEnemyId: preset.waveEnemyId,
    waveQueue: preset.waveQueue,
    enemyHitMul: now.enemyHitMul,
    dmgCoef: now.dmgCoef,
  };
}
