import { mkdirSync, writeFileSync } from "fs";
import { setBattleRng } from "../../src/game/sim";
import { renderNight } from "./nightReport";
import { runNight } from "./nightRun";

function argNum(flag: string, fallback: number): number {
  const i = process.argv.indexOf(flag);
  if (i < 0) return fallback;
  const n = Number(process.argv[i + 1]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

const freshGames = argNum("--fresh", 10);
const climbRuns = argNum("--climb", 10);
const outFlag = process.argv.indexOf("--out");
const out = outFlag >= 0 ? process.argv[outFlag + 1] : "docs/combat/sim-reports/20261023-night.md";
const data = runNight(freshGames, climbRuns);
const text = renderNight(data);
if (out) {
  mkdirSync("docs/combat/sim-reports", { recursive: true });
  writeFileSync(out, text);
}
console.log(text);
setBattleRng(null);
