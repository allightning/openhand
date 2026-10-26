import type { GauntletRewardOption, GauntletRun } from "../../src/game/rules/gauntletModel";
import { applyGauntletReward, applySuperReward, rollGauntletRewards } from "../../src/combatLab/gauntlet";

function rank(opt: GauntletRewardOption): number {
  if (opt.kind === "elixir") return 100;
  if (opt.kind === "card" && (opt.id === "mend" || opt.id === "mend2" || opt.id === "salve")) return 80;
  if (opt.kind === "card") return 30;
  return 10;
}

function pickReward(offers: GauntletRewardOption[]): GauntletRewardOption | null {
  let best: GauntletRewardOption | null = null;
  let score = -1;
  for (const opt of offers) {
    const n = rank(opt);
    if (n > score) {
      score = n;
      best = opt;
    }
  }
  return best;
}

/** 回血优先于随机牌。rng 由调用方传入。 */
export function chooseReward(run: GauntletRun, rng: () => number): GauntletRun {
  const offers = rollGauntletRewards(run, rng);
  const opt = pickReward(offers);
  if (!opt) return run;
  if (opt.kind === "elixir" || opt.kind === "aidPair") return applySuperReward(run, opt, rng);
  return applyGauntletReward(run, opt);
}
