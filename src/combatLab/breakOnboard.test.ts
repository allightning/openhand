import { describe, expect, it, beforeEach } from "vitest";
import { renderBreakIntro, shouldSkipWager } from "./breakOnboard";
import { setLabRuleset } from "./labRuleset";

describe("break onboard", () => {
  beforeEach(() => setLabRuleset("break"));

  it("开踢从第 1 馆起就进赌馆（新手关已独立，不再跳过 1–2）", () => {
    setLabRuleset("break");
    expect(shouldSkipWager(1)).toBe(false);
    expect(shouldSkipWager(2)).toBe(false);
    expect(shouldSkipWager(3)).toBe(false);
  });

  it("renders three-frame intro without undefined", () => {
    const html = renderBreakIntro();
    expect(html).toContain("红格");
    expect(html).toContain("走开");
    expect(html).toContain("硬拆");
    expect(html).toContain("break-intro-go");
    expect(html).toContain("新手关");
    expect(html).toContain("开始");
    expect(html).toContain("break-intro-back");
    expect(html).toContain("hall-chrome");
    expect(html).not.toContain("break-intro-skip");
    expect(html).not.toContain("undefined");
  });
});
