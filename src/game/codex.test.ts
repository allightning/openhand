import { describe, expect, it } from "vitest";
import {
  CODEX_FLAGS,
  grantCodexTrio,
  hasAnyCodex,
  hasCodex,
  upgradeBeats,
  upgradeCompareLine,
} from "./codex";
import { makeRun } from "./run";
import { questLog } from "./quest";

describe("codex", () => {
  it("explains how an upgrade beats the old card", () => {
    const beats = upgradeBeats("strike", "strike2");
    expect(beats.some((b) => b.includes("伤害") && b.includes("5") && b.includes("10"))).toBe(true);
    expect(upgradeCompareLine("strike", "strike2")).toMatch(/劈掌/);
  });

  it("stays locked until the clerk trio is granted", () => {
    let run = makeRun("empty");
    expect(hasAnyCodex(run)).toBe(false);
    run = grantCodexTrio(run);
    for (const f of CODEX_FLAGS) expect(run.flags).toContain(f);
    expect(hasCodex(run, "mingzhu")).toBe(true);
    expect(hasCodex(run, "bingji")).toBe(true);
    expect(hasCodex(run, "shilu")).toBe(true);
  });

  it("puts the account books on the side quest after branding", () => {
    const run = { ...makeRun("empty"), flags: ["branded", "mainOpen"] };
    const sides = questLog(run).sides.map((q) => q.title);
    expect(sides).toContain("账房三本");
  });
});
