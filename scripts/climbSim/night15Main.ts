import { mkdirSync, writeFileSync } from "fs";
import { setBattleRng } from "../../src/game/sim";
import { renderNight15 } from "./night15Report";
import { runNight15 } from "./night15Run";

function writeReport(text: string): void {
  mkdirSync("docs/combat", { recursive: true });
  writeFileSync("docs/combat/NIGHT15_REPORT_20261114.md", text);
  console.log(text);
}

function main(): void {
  writeReport(renderNight15(runNight15()));
  setBattleRng(null);
}

main();
