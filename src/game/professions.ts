import {
  CLIMB_GAMBLE_CHEAT,
  CLIMB_GAMBLE_LOSS,
  CLIMB_GAMBLE_WIN,
} from "./climbCaps";
import { STANCE_LABEL, publishStance, stanceOf } from "./intentStance";
import type { Battle } from "./types";

export type ProfessionId = "staker" | "diviner" | "gambler";

export function fieldProfession(b: Battle): ProfessionId | undefined {
  return b.professions?.[b.active];
}

export function openRumor(b: Battle): void {
  if (fieldProfession(b) !== "diviner") return;
  if (!b.intent) return;
  b.rumor = STANCE_LABEL[stanceOf(b.intent)];
  if (b.divinerMarkLeft == null) b.divinerMarkLeft = 1;
}

/** 桩师进阶后裂桩可爆。相士、赌徒进阶后才能看破 / 出千。 */
export function advanceProfession(b: Battle): string[] {
  const prof = fieldProfession(b);
  if (!prof) return ["没有职业"];
  b.profAdvanced = true;
  if (prof === "staker") return ["裂桩可爆"];
  if (prof === "diviner") return ["可以看破"];
  return ["可以出千"];
}

export function markEnemyOpen(b: Battle): string[] {
  if (fieldProfession(b) !== "diviner") return ["不是相士"];
  if ((b.divinerMarkLeft ?? 0) <= 0) return ["这一程已经记过"];
  publishStance(b);
  b.stanceRevealN = b.stanceBoard?.length ?? b.intents.length;
  b.divinerMarkLeft = (b.divinerMarkLeft ?? 1) - 1;
  return ["记成亮招"];
}

export function seeThrough(b: Battle): string[] {
  if (fieldProfession(b) !== "diviner") return ["不是相士"];
  if (!b.profAdvanced) return ["还没看破"];
  b.feintOpen = true;
  b.feintShown = true;
  return ["本回合虚招还原"];
}

export function rollWager(b: Battle, rng: () => number): string[] {
  if (fieldProfession(b) !== "gambler") return ["不是赌徒"];
  const cheat = b.wagerCheat === true && b.profAdvanced === true;
  b.wagerCheat = false;
  const win = cheat || rng() < 0.5;
  if (win) {
    const n = cheat ? CLIMB_GAMBLE_CHEAT : CLIMB_GAMBLE_WIN;
    b.energy = Math.min(b.energyMax, b.energy + n);
    return [cheat ? `出千 回劲 ${n}` : `加注赚 回劲 ${n}`];
  }
  b.player.hp = Math.max(1, b.player.hp - CLIMB_GAMBLE_LOSS);
  return [`加注亏 自伤 ${CLIMB_GAMBLE_LOSS}`];
}

export function cheatWager(b: Battle): string[] {
  if (fieldProfession(b) !== "gambler") return ["不是赌徒"];
  if (!b.profAdvanced) return ["还没出千"];
  b.wagerCheat = true;
  return ["这次加注必赚"];
}
