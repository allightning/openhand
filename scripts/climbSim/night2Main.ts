import { mkdirSync, writeFileSync } from "fs";
import { setBattleRng } from "../../src/game/sim";
import { renderNight2, renderNight2Summary } from "./night2Report";
import { runNight2 } from "./night2Run";
import { gateStatus, waitGates } from "./waitGates";

function argNum(flag: string, fallback: number): number {
  const i = process.argv.indexOf(flag);
  if (i < 0) return fallback;
  const n = Number(process.argv[i + 1]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function has(flag: string): boolean {
  return process.argv.includes(flag);
}

const freshGames = argNum("--fresh", 10);
const climbRuns = argNum("--climb", 10);
const skipWait = has("--skip-wait");
const p1Only = has("--p1-only");

const INNOVATION = [
  "## 创新思路",
  "",
  "1. 策略开关是对照实验，不是难度旋钮。同一套对局种子，只翻一个开关：憋爆 vs 正常打、估值按窗 vs 永不/总按、环境开 vs 关。数字差才算机制差。",
  "2. 代表牌不进 131，模拟器自己注入抽堆。否则飞刀/蓄力永远是「没摸到」，回拍钉和蓄力帽会假阴性。",
  "3. 使用率分「没摸到 / 摸到不用」。没摸到先查供给和早死，摸到不用才进观察名单。",
  "4. 反应窗必须 holdReaction。默认引擎会自动放弃，模拟器按窗等于没接。窗后剩余意图引擎不续，报告里写明，不在脚本层假装续完。",
  "5. 敌原型字段未到树时走 profileFor classic，开关仍在。W1 落 foeArchetype 后同一套策略自动换读口，不必重写自动手。",
  "6. 环境按馆挂：3/6 灼烧、8 无墙。全馆随机挂会把灼烧 4 的回拍搅进早死噪声。",
  "",
].join("\n");

function writeAll(data: ReturnType<typeof runNight2>, gateNote: string): void {
  mkdirSync("docs/combat/sim-reports", { recursive: true });
  const full = renderNight2(data, gateNote);
  writeFileSync("docs/combat/sim-reports/20261102-night2.md", full);
  writeFileSync("docs/combat/NIGHT2_REPORT_20261102.md", renderNight2Summary(data, gateNote, INNOVATION));
  console.log(full);
}

async function main(): Promise<void> {
  const p1 = runNight2(freshGames, climbRuns);
  writeAll(p1, `P1 已跑。闸门：${gateStatus().note}`);
  if (p1Only || skipWait) {
    setBattleRng(null);
    return;
  }
  const wait = await waitGates();
  if (!wait.ready) {
    writeAll(p1, wait.note);
    setBattleRng(null);
    return;
  }
  const p3 = runNight2(freshGames, climbRuns);
  writeAll(p3, `${wait.note} P3 已按齐绿树重跑。`);
  setBattleRng(null);
}

void main();
