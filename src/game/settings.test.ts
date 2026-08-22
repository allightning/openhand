import { describe, expect, it, beforeEach } from "vitest";
import { difficultyScale, getDifficulty, setSettings } from "./settings";
import { makeBattle } from "./sim";
import { makeRun } from "./run";

describe("difficulty", () => {
  beforeEach(() => {
    setSettings({ difficulty: "normal" });
  });

  it("keeps catcher hp at 56 on normal", () => {
    const b = makeBattle("catcher", makeRun("empty"));
    expect(b.enemy.hp).toBe(56);
    expect(getDifficulty()).toBe("normal");
  });

  it("softens foes on easy", () => {
    setSettings({ difficulty: "easy" });
    const b = makeBattle("catcher", makeRun("empty"));
    expect(b.enemy.hp).toBe(Math.round(56 * difficultyScale("easy").hp));
    expect(b.intent.kind === "strike" ? b.intent.damage : 0).toBe(
      Math.round(18 * difficultyScale("easy").dmg),
    );
  });

  it("hardens foes on hard and softens your blade", () => {
    setSettings({ difficulty: "hard" });
    const scale = difficultyScale("hard");
    const b = makeBattle("catcher", makeRun("empty"));
    expect(b.enemy.hp).toBe(Math.round(56 * scale.hp));
    expect(b.intent.kind === "strike" ? b.intent.damage : 0).toBe(Math.round(18 * scale.dmg));
    expect(scale.youDmg).toBeLessThan(1);
    expect(difficultyScale("easy").youDmg).toBeGreaterThan(1);
  });
});
