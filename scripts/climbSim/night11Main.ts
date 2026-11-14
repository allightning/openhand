import { mkdirSync, writeFileSync } from "fs";
import { setBattleRng } from "../../src/game/sim";
import { renderNight11 } from "./night11Report";
import { runNight11 } from "./night11Run";

function writeReport(text: string): void {
  mkdirSync("docs/combat", { recursive: true });
  writeFileSync("docs/combat/NIGHT11_REPORT_20261114.md", text);
  console.log(text);
}

function main(): void {
  writeReport(renderNight11(runNight11()));
  setBattleRng(null);
}

main();
