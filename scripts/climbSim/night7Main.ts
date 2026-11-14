import { mkdirSync, writeFileSync } from "fs";
import { setBattleRng } from "../../src/game/sim";
import { renderNight7 } from "./night7Report";
import { runNight7 } from "./night7Run";

function argNum(flag: string, fallback: number): number {
  const i = process.argv.indexOf(flag);
  if (i < 0) return fallback;
  const n = Number(process.argv[i + 1]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function main(): void {
  const text = renderNight7(runNight7(argNum("--games", 20)));
  mkdirSync("docs/combat", { recursive: true });
  writeFileSync("docs/combat/NIGHT7_REPORT_20261102.md", text);
  console.log(text);
  setBattleRng(null);
}

main();
