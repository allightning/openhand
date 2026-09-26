import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const GAME_DIR = dirname(fileURLToPath(import.meta.url));
const IMPORT_COMBAT_LAB = /(?:from|import)\s*\(?\s*["']([^"']*combatLab[^"']*)["']/g;

function walkTs(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      out.push(...walkTs(path));
      continue;
    }
    if (name.endsWith(".ts") && !name.endsWith(".test.ts")) out.push(path);
  }
  return out;
}

/** 主线遗留，随地图解冻再治理。 */
const FROZEN_DOM = new Set([
  "economy.ts",
  "bag.ts",
  "progress.ts",
  "quest.ts",
  "rewards.ts",
  "hooks.ts",
  "run.ts",
  "settings.ts",
]);

const DOM_API = /\blocalStorage\b|\bdocument\b|\bwindow\b/;

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

describe("engine layer boundary", () => {
  it("src/game 生产代码不得 import src/combatLab", () => {
    const offenders: string[] = [];
    for (const file of walkTs(GAME_DIR)) {
      const src = readFileSync(file, "utf8");
      for (const match of src.matchAll(IMPORT_COMBAT_LAB)) {
        offenders.push(`${relative(GAME_DIR, file)} → ${match[1]}`);
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("src/game 生产代码不得新碰 document / window / localStorage", () => {
    const offenders: string[] = [];
    for (const file of walkTs(GAME_DIR)) {
      const rel = relative(GAME_DIR, file);
      if (FROZEN_DOM.has(rel)) continue;
      const src = stripComments(readFileSync(file, "utf8"));
      if (DOM_API.test(src)) offenders.push(relative(GAME_DIR, file));
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });
});
