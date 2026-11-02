import type { Night4Row } from "./night4Run";
import { runNight4P2, runRow } from "./night4Run";
import { FLAGS_ON } from "./flags";
import { DEFAULT_KNOBS, type ClimbKnobs } from "./knobs";
import { schoolPolicy } from "./schools";

const SCHOOL = "saber" as const;
const KIT = { foeRound: 1 as const };

export type Night5Data = {
  games: number;
  ready: boolean;
  scatter: Night4Row;
  windows: { on: Night4Row; off: Night4Row } | null;
};

export function runNight5(games: number, ready: boolean): Night5Data {
  const scatter = runNight4P2(games);
  if (!ready) return { games, ready, scatter, windows: null };
  const off: ClimbKnobs = { ...DEFAULT_KNOBS, foeWindowP: 0 };
  const policy = schoolPolicy(SCHOOL, FLAGS_ON);
  return {
    games,
    ready,
    scatter,
    windows: {
      on: runRow("n5-win-on", "敌窗开", games, 6, 10, DEFAULT_KNOBS, KIT, policy),
      off: runRow("n5-win-off", "敌窗关 p=0", games, 6, 10, off, KIT, policy),
    },
  };
}
