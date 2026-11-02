import { mkdirSync, writeFileSync } from "fs";
import { setBattleRng } from "../../src/game/sim";
import { renderNight6 } from "./night6Report";
import { runNight6 } from "./night6Run";

function argNum(flag: string, fallback: number): number {
  const i = process.argv.indexOf(flag);
  if (i < 0) return fallback;
  const n = Number(process.argv[i + 1]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function main(): void {
  const text = renderNight6(runNight6(argNum("--games", 20)));
  mkdirSync("docs/combat", { recursive: true });
  writeFileSync("docs/combat/NIGHT6_REPORT_20261102.md", text);
  console.log(text);
  setBattleRng(null);
}

main();
