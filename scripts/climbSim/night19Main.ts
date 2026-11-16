import { mkdirSync, writeFileSync } from "fs";
import { setBattleRng } from "../../src/game/sim";
import { renderNight19 } from "./night19Report";
import { runNight19 } from "./night19Run";

function writeReport(text: string): void {
  mkdirSync("docs/combat", { recursive: true });
  writeFileSync("docs/combat/NIGHT19_REPORT_20261116.md", text);
  console.log(text);
}

function main(): void {
  writeReport(renderNight19(runNight19()));
  setBattleRng(null);
}

main();
