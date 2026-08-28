import { DEFAULT_LAB_TUNING, setLabMode, setLabTuning } from "../game/labTuning";
import { canPlay, endTurn, livingFoes, playCard } from "../game/sim";
import type { Battle, EnemyId } from "../game/types";
import { applyAutoLoadout } from "./autoLoadouts";
import { buildGauntletPreset, createGauntletRun, ladderEntry, getGauntletFinalStage } from "./gauntlet";
import { startLabBattle } from "./factory";

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function legalUids(b: Battle): string[] {
  return b.hand.filter((c) => canPlay(b, c.uid).ok).map((c) => c.uid);
}

function battleOver(b: Battle): boolean {
  if (b.phase === "won" || b.phase === "lost") return true;
  if (b.player.hp <= 0) return true;
  return livingFoes(b).every((f) => f.hp <= 0);
}

/** §29.4 乱点基线：固定种子、随机合法出牌、不收势策略（无合法牌才收势）、不换人/助战/道具。 */
export function runMashBattle(enemyId: EnemyId, seed: number): "win" | "loss" {
  setLabMode(true);
  setLabTuning({ rulesV2: true, rulesCombo: true });
  const preset = applyAutoLoadout("t1-four-palm", 4, 2, { enemyId });
  let b = startLabBattle(preset, true);
  const rng = mulberry32(seed);
  let guard = 0;
  while (!battleOver(b) && guard < 800) {
    guard += 1;
    if (b.phase !== "player") continue;
    const legal = legalUids(b);
    if (legal.length > 0 && b.energy > 0) {
      const uid = legal[Math.floor(rng() * legal.length)]!;
      b = playCard(b, uid);
    } else {
      b = endTurn(b);
    }
  }
  const out = b.phase === "won" || livingFoes(b).every((f) => f.hp <= 0) ? "win" : "loss";
  setLabMode(false);
  return out;
}

export function mashWinRate(
  enemyId: EnemyId,
  games: number,
  baseSeed = 280828,
): { wins: number; rate: number; pct: number } {
  setLabTuning({
    ...DEFAULT_LAB_TUNING,
    rulesV2: true,
    rulesCombo: true,
    v2Grudge: true,
  });
  let wins = 0;
  for (let i = 0; i < games; i++) {
    if (runMashBattle(enemyId, baseSeed + i * 9973) === "win") wins += 1;
  }
  const rate = games > 0 ? wins / games : 0;
  return { wins, rate, pct: Math.round(rate * 1000) / 10 };
}

/** §31 踢馆馆主乱点基线：末馆配置 + 起手 preset + rulesCombo=false。 */
export function runGauntletMashBattle(seed: number, bossId: EnemyId = "usurper"): "win" | "loss" {
  setLabMode(true);
  const final = getGauntletFinalStage();
  const entry = ladderEntry(final);
  setLabTuning({
    ...DEFAULT_LAB_TUNING,
    rulesV2: true,
    rulesCombo: false,
    v2Grudge: true,
    enemyHpMul: entry.hpMul,
    deckMultiplier: 1,
    designerMode: false,
  });
  let run = createGauntletRun("bandit", "palm", bossId);
  run = { ...run, stage: final, streak: final - 1 };
  const preset = buildGauntletPreset(run);
  let b = startLabBattle(preset, true, 1);
  const rng = mulberry32(seed);
  let guard = 0;
  while (!battleOver(b) && guard < 800) {
    guard += 1;
    if (b.phase !== "player") continue;
    const legal = legalUids(b);
    if (legal.length > 0 && b.energy > 0) {
      const uid = legal[Math.floor(rng() * legal.length)]!;
      b = playCard(b, uid);
    } else {
      b = endTurn(b);
    }
  }
  const out = b.phase === "won" || livingFoes(b).every((f) => f.hp <= 0) ? "win" : "loss";
  setLabMode(false);
  return out;
}

export function gauntletMashWinRate(
  bossId: EnemyId = "usurper",
  games = 100,
  baseSeed = 310828,
): { wins: number; rate: number; pct: number } {
  let wins = 0;
  for (let i = 0; i < games; i++) {
    if (runGauntletMashBattle(baseSeed + i * 9973, bossId) === "win") wins += 1;
  }
  const rate = games > 0 ? wins / games : 0;
  return { wins, rate, pct: Math.round(rate * 1000) / 10 };
}
