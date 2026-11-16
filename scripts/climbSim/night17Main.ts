import { mkdirSync, writeFileSync } from "fs";
import { setBattleRng } from "../../src/game/sim";
import { renderNight17 } from "./night17Report";
import { runNight17 } from "./night17Run";

function writeReport(text: string): void {
  mkdirSync("docs/combat", { recursive: true });
  writeFileSync("docs/combat/NIGHT17_REPORT_20261116.md", text);
  console.log(text);
}

function main(): void {
  writeReport(renderNight17(runNight17()));
  setBattleRng(null);
}

main();
