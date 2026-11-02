import { mkdirSync, writeFileSync } from "fs";
import { setBattleRng } from "../../src/game/sim";
import { coverageMd } from "./coverage";
import { renderNight3 } from "./night3Report";
import { runNight3 } from "./night3Run";
import { role2Status, waitRole2 } from "./waitRole2";

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
  writeFileSync("docs/combat/NIGHT3_REPORT_20261102.md", text);
  console.log(text);
}

async function main(): Promise<void> {
  const games = argNum("--games", 10);
  const skipWait = has("--skip-wait");
  let gate = role2Status();
  if (!skipWait && !gate.ready) gate = await waitRole2();
  if (!gate.ready) {
    writeReport(
      [
        "# 夜校三班报告 · 2026-11-02",
        "",
        gate.note,
        "",
        "P1 覆盖表已按角色核改准，见 `docs/combat/NIGHT_COVERAGE_20261102.md`。",
        "",
        coverageMd(),
        "",
        "P2 / P3 没跑。等 `ROLE2_REPORT_20261102.md` 齐绿后再开缘分对照和毒三档。",
        "",
      ].join("\n"),
    );
    setBattleRng(null);
    return;
  }
  const data = runNight3(games, gate.poison);
  writeReport(renderNight3(data, gate.note));
  setBattleRng(null);
}

void main();
