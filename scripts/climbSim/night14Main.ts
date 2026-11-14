import { mkdirSync, writeFileSync } from "fs";
import { setBattleRng } from "../../src/game/sim";
import { renderNight14 } from "./night14Report";
import { runNight14 } from "./night14Run";

function writeReport(text: string): void {
  mkdirSync("docs/combat", { recursive: true });
  writeFileSync("docs/combat/NIGHT14_REPORT_20261114.md", text);
  console.log(text);
}

function main(): void {
  writeReport(renderNight14(runNight14()));
  setBattleRng(null);
}

main();
