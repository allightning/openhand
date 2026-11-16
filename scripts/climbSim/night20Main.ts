import { mkdirSync, writeFileSync } from "fs";
import { setBattleRng } from "../../src/game/sim";
import { renderNight20 } from "./night20Report";
import { runNight20 } from "./night20Run";

function writeReport(text: string): void {
  mkdirSync("docs/combat", { recursive: true });
  writeFileSync("docs/combat/NIGHT20_REPORT_20261116.md", text);
  console.log(text);
}

function main(): void {
  writeReport(renderNight20(runNight20()));
  setBattleRng(null);
}

main();
