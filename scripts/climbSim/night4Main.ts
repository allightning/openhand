import { mkdirSync, writeFileSync } from "fs";
import { setBattleRng } from "../../src/game/sim";
import { renderNight4 } from "./night4Report";
import { runNight4 } from "./night4Run";
import { mech3Status, waitMech3 } from "./waitMech3";

function argNum(flag: string, fallback: number): number {
  const i = process.argv.indexOf(flag);
  if (i < 0) return fallback;
  const n = Number(process.argv[i + 1]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function has(flag: string): boolean {
  return process.argv.includes(flag);
}

function writeReport(text: string): void {
  mkdirSync("docs/combat", { recursive: true });
  writeFileSync("docs/combat/NIGHT4_REPORT_20261102.md", text);
  console.log(text);
}

async function main(): Promise<void> {
  const games = argNum("--games", 10);
  const skipWait = has("--skip-wait");
  let gate = mech3Status();
  if (!skipWait && !gate.ready) gate = await waitMech3();
  const data = runNight4(games, gate.ready);
  writeReport(renderNight4(data, gate.note));
  setBattleRng(null);
}

void main();
