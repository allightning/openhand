import { describe, expect, it } from "vitest";
import { mashWinRate, gauntletMashWinRate } from "./labMashBaseline";

describe("§29.4 乱点基线", () => {
  it("usurper 100 局胜率 <30%", () => {
    const r = mashWinRate("usurper", 100);
    expect(r.pct).toBeLessThan(30);
  }, 120_000);

  it("lord 100 局胜率 <30%", () => {
    const r = mashWinRate("lord", 100);
    expect(r.pct).toBeLessThan(30);
  }, 120_000);

  it("§31.9 末馆（馆 7）usurper 踢馆配置 100 局 <30%", () => {
    const r = gauntletMashWinRate("usurper", 100);
    expect(r.pct).toBeLessThan(30);
  }, 120_000);
});
