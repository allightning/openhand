import { mkdirSync, writeFileSync } from "fs";
import { setBattleRng } from "../../src/game/sim";
import { renderNight10 } from "./night10Report";
import { runNight10 } from "./night10Run";

function argNum(flag: string, fallback: number): number {
  const i = process.argv.indexOf(flag);
  if (i < 0) return fallback;
  const n = Number(process.argv[i + 1]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function writeReport(text: string): void {
  mkdirSync("docs/combat", { recursive: true });
  writeFileSync("docs/combat/NIGHT10_REPORT_20261114.md", text);
  console.log(text);
}

function main(): void {
  writeReport(renderNight10(runNight10(argNum("--games", 20))));
  setBattleRng(null);
}

main();
