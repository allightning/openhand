import { mkdirSync, writeFileSync } from "fs";
import { setBattleRng } from "../../src/game/sim";
import { renderNight13 } from "./night13Report";
import { runNight13 } from "./night13Run";

function argNum(flag: string, fallback: number): number {
  const i = process.argv.indexOf(flag);
  if (i < 0) return fallback;
  const n = Number(process.argv[i + 1]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function writeReport(text: string): void {
  mkdirSync("docs/combat", { recursive: true });
  writeFileSync("docs/combat/NIGHT13_REPORT_20261114.md", text);
  console.log(text);
}

function main(): void {
  writeReport(renderNight13(runNight13(argNum("--games", 20))));
  setBattleRng(null);
}

main();
