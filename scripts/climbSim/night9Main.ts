import { mkdirSync, writeFileSync } from "fs";
import { setBattleRng } from "../../src/game/sim";
import { renderNight9 } from "./night9Report";
import { runNight9 } from "./night9Run";
import { numgen8Status, waitNumgen8 } from "./waitNumgen8";

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
  writeFileSync("docs/combat/NIGHT9_REPORT_20261102.md", text);
  console.log(text);
}

async function main(): Promise<void> {
  const games = argNum("--games", 20);
  const skipWait = has("--skip-wait");
  const force = has("--force");
  let gate = numgen8Status();
  if (force && !gate.ready) gate = { ...gate, ready: true, note: `${gate.note}（--force 先跑）` };
  if (!skipWait && !force && !gate.ready) gate = await waitNumgen8();
  if (!gate.ready) {
    writeReport(
      [
        "# 夜校九班报告 · 2026-11-02",
        "",
        gate.note,
        "",
        "等 NUMGEN8 齐绿后再跑馆 1–10 散点（20 局）。本班未改 src、未改旋钮默认、未 commit。",
        "",
      ].join("\n"),
    );
    setBattleRng(null);
    return;
  }
  writeReport(renderNight9(runNight9(games, gate.note)));
  setBattleRng(null);
}

void main();
