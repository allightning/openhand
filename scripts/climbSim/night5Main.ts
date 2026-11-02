import { mkdirSync, writeFileSync } from "fs";
import { setBattleRng } from "../../src/game/sim";
import { renderNight5 } from "./night5Report";
import { runNight5 } from "./night5Run";
import { numgen6Status, waitNumgen6 } from "./waitNumgen6";

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
  writeFileSync("docs/combat/NIGHT5_REPORT_20261102.md", text);
  console.log(text);
}

async function main(): Promise<void> {
  const games = argNum("--games", 20);
  const skipWait = has("--skip-wait");
  let gate = numgen6Status();
  if (!skipWait && !gate.ready) gate = await waitNumgen6();
  if (!gate.ready) {
    writeReport(
      [
        "# 夜校五班报告 · 2026-11-02",
        "",
        gate.note,
        "",
        "等 NUMGEN6 齐绿后再跑馆 1–10 散点（20 局）和敌窗开/关。本班未改 src、未改旋钮默认、未 commit。",
        "",
      ].join("\n"),
    );
    setBattleRng(null);
    return;
  }
  const data = runNight5(games, true);
  writeReport(renderNight5(data, gate.note));
  setBattleRng(null);
}

void main();
