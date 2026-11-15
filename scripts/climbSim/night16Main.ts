import { mkdirSync, writeFileSync } from "fs";
import { setBattleRng } from "../../src/game/sim";
import { renderNight16 } from "./night16Report";
import { runNight16 } from "./night16Run";

function writeReport(text: string): void {
  mkdirSync("docs/combat", { recursive: true });
  writeFileSync("docs/combat/NIGHT16_REPORT_20261115.md", text);
  console.log(text);
}

function main(): void {
  writeReport(renderNight16(runNight16()));
  setBattleRng(null);
}

main();
