import type { GauntletMarketOffer, GauntletRewardOption, GauntletRun } from "./gauntlet";

export const CLIMB_CONTINUE_KEY = "openhand-lab-climb-continue";
const CLIMB_EXHAUSTED_KEY = "openhand-lab-climb-exhausted";
/** 门厅对同一歇可再进的次数（不含刚记下后还在营里的那一程）。 */
export const CLIMB_CONTINUE_REPLAYS = 2;

export interface ClimbCampSnapshot {
  v: 1;
  replayLeft: number;
  run: GauntletRun;
  rewards: GauntletRewardOption[];
  market: GauntletMarketOffer[];
  marketBought: string[];
  rewardTakes: number;
  marketRefreshN: number;
  rewardsAreSuper: boolean;
  savedAt: number;
}

export type ClimbCampPayload = Omit<ClimbCampSnapshot, "v" | "savedAt" | "replayLeft"> & {
  replayLeft?: number;
};

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function clearClimbContinue(): void {
  storage()?.removeItem(CLIMB_CONTINUE_KEY);
}

function exhaustedKey(run: GauntletRun): string {
  return `${run.startedAt}:${run.stage}`;
}

function readExhausted(): Set<string> {
  const raw = storage()?.getItem(CLIMB_EXHAUSTED_KEY);
  if (!raw) return new Set();
  try {
    const list = JSON.parse(raw) as string[];
    return new Set(Array.isArray(list) ? list : []);
  } catch {
    return new Set();
  }
}

function writeExhausted(set: Set<string>): void {
  try {
    storage()?.setItem(CLIMB_EXHAUSTED_KEY, JSON.stringify([...set].slice(-40)));
  } catch {
    /* quota */
  }
}

export function readClimbContinue(): ClimbCampSnapshot | null {
  const raw = storage()?.getItem(CLIMB_CONTINUE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ClimbCampSnapshot;
    if (parsed?.v !== 1 || !parsed.run || parsed.run.endless) return null;
    if (!Number.isFinite(parsed.replayLeft) || parsed.replayLeft < 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function peekClimbContinue(): { replayLeft: number; stage: number; pot: number } | null {
  const s = readClimbContinue();
  if (!s || s.replayLeft <= 0) return null;
  return { replayLeft: s.replayLeft, stage: s.run.stage, pot: s.run.pot };
}

/** 营地当前态写入。同一局同一馆不刷新次数；换馆则重置为 2。无尽不写。 */
export function touchClimbCamp(payload: ClimbCampPayload): void {
  if (payload.run.endless) {
    clearClimbContinue();
    return;
  }
  const prev = readClimbContinue();
  const sameCamp =
    prev != null &&
    prev.run.startedAt === payload.run.startedAt &&
    prev.run.stage === payload.run.stage;
  const exhausted = readExhausted();
  if (exhausted.has(exhaustedKey(payload.run))) {
    clearClimbContinue();
    return;
  }
  const snap: ClimbCampSnapshot = {
    v: 1,
    replayLeft: sameCamp ? Math.max(0, Math.min(prev.replayLeft, payload.replayLeft ?? prev.replayLeft)) : (payload.replayLeft ?? CLIMB_CONTINUE_REPLAYS),
    run: payload.run,
    rewards: payload.rewards,
    market: payload.market,
    marketBought: payload.marketBought,
    rewardTakes: payload.rewardTakes,
    marketRefreshN: payload.marketRefreshN,
    rewardsAreSuper: payload.rewardsAreSuper,
    savedAt: Date.now(),
  };
  try {
    storage()?.setItem(CLIMB_CONTINUE_KEY, JSON.stringify(snap));
  } catch {
    /* quota */
  }
}

/** 从门厅续关：消耗一次机会，返回记下的营地（奖励/黑市不重摇）。 */
export function consumeClimbContinue(): ClimbCampSnapshot | null {
  const s = readClimbContinue();
  if (!s || s.replayLeft <= 0) {
    clearClimbContinue();
    return null;
  }
  const next: ClimbCampSnapshot = { ...s, replayLeft: s.replayLeft - 1 };
  if (next.replayLeft <= 0) {
    clearClimbContinue();
    const set = readExhausted();
    set.add(exhaustedKey(s.run));
    writeExhausted(set);
  } else {
    try {
      storage()?.setItem(CLIMB_CONTINUE_KEY, JSON.stringify(next));
    } catch {
      /* quota */
    }
  }
  return { ...s, replayLeft: next.replayLeft };
}
