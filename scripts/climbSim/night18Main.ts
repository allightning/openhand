import { mkdirSync, writeFileSync } from "fs";
import { setBattleRng } from "../../src/game/sim";
import { renderNight18 } from "./night18Report";
import { runNight18 } from "./night18Run";

function writeReport(text: string): void {
  mkdirSync("docs/combat", { recursive: true });
  writeFileSync("docs/combat/NIGHT18_REPORT_20261116.md", text);
  console.log(text);
}

function main(): void {
  writeReport(renderNight18(runNight18()));
  setBattleRng(null);
}

main();
