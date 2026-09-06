import { afterEach, describe, expect, it } from "vitest";
import { getLabRuleset, isBreakAlign, setLabRuleset } from "./labRuleset";

describe("labRuleset · climb vs break", () => {
  afterEach(() => setLabRuleset("climb"));

  it("开踢默认 climb，读招才是 break", () => {
    setLabRuleset("climb");
    expect(getLabRuleset()).toBe("climb");
    expect(isBreakAlign()).toBe(false);
    setLabRuleset("break");
    expect(isBreakAlign()).toBe(true);
  });

  it("classic 旧值读成 climb", () => {
    setLabRuleset("classic");
    expect(getLabRuleset()).toBe("climb");
    expect(isBreakAlign()).toBe(false);
  });
});
