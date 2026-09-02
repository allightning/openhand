import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assignSceneBg,
  campPlaceName,
  combatBgPool,
  COMBAT_BG_BANDIT,
  COMBAT_BG_COURT,
  COMBAT_BG_SHAOLIN,
  HOME_BG,
  OVERLAY_BG_POOL,
  overlayPoolFor,
  SCENE_BG_CAP,
  staticOverlayBg,
} from "./sceneBg";

const PUB = resolve(__dirname, "../../public");

describe("场景背景：同一张图最多两个场景", () => {
  it("叠加层全是 art/scenes 大场景，不用茅草房小图", () => {
    expect(OVERLAY_BG_POOL.every((p) => p.startsWith("art/scenes/"))).toBe(true);
    expect(OVERLAY_BG_POOL.join("")).not.toContain("hut");
    expect(OVERLAY_BG_POOL.join("")).not.toContain("art/refs");
    for (const p of OVERLAY_BG_POOL) {
      expect(existsSync(resolve(PUB, p)), p).toBe(true);
    }
    expect(existsSync(resolve(PUB, HOME_BG))).toBe(true);
    expect(OVERLAY_BG_POOL.join("")).not.toContain("winehouse");
    expect(OVERLAY_BG_POOL.join("")).not.toContain("night-market");
    expect(staticOverlayBg("path")).toContain("scene-quiet-fork");
    expect(staticOverlayBg("pick")).toContain("scene-quiet-gate");
    expect(staticOverlayBg("banker")).toContain("scene-quiet-inn");
    expect(existsSync(resolve(PUB, "art/ui/ink-border-a.png"))).toBe(true);
    expect(existsSync(resolve(PUB, "art/ui/ink-border-b.png"))).toBe(true);
  });

  it("十馆战斗不重复用同一张超过两次", () => {
    let uses: Record<string, number> = {};
    const assign: Record<string, string> = {};
    const files: string[] = [];
    for (let s = 1; s <= 10; s++) {
      const r = assignSceneBg({ bgUses: uses, bgAssign: assign }, `combat:bandit:${s}`, combatBgPool("bandit", s));
      uses = r.bgUses;
      Object.assign(assign, r.bgAssign);
      files.push(r.url);
    }
    expect(new Set(files).size).toBeGreaterThan(4);
    expect(Math.max(0, ...Object.values(uses))).toBeLessThanOrEqual(SCENE_BG_CAP);
  });

  it("少林 / 江湖 / 朝廷开战底图不同，后期偏向夜景", () => {
    for (const p of COMBAT_BG_SHAOLIN.concat(COMBAT_BG_BANDIT, COMBAT_BG_COURT)) {
      expect(existsSync(resolve(PUB, p)), p).toBe(true);
    }
    const s1 = assignSceneBg({ bgUses: {}, bgAssign: {} }, "combat:shaolin:1", combatBgPool("shaolin", 1));
    const b1 = assignSceneBg({ bgUses: {}, bgAssign: {} }, "combat:bandit:1", combatBgPool("bandit", 1));
    const c1 = assignSceneBg({ bgUses: {}, bgAssign: {} }, "combat:court:1", combatBgPool("court", 1));
    expect(s1.file).toContain("shaolin-gate");
    expect(b1.file).toContain("jianghu-road");
    expect(c1.file).toContain("court-gate");
    expect(new Set([s1.file, b1.file, c1.file]).size).toBe(3);
    const s10 = assignSceneBg({ bgUses: {}, bgAssign: {} }, "combat:shaolin:10", combatBgPool("shaolin", 10));
    const b10 = assignSceneBg({ bgUses: {}, bgAssign: {} }, "combat:bandit:10", combatBgPool("bandit", 10));
    const c10 = assignSceneBg({ bgUses: {}, bgAssign: {} }, "combat:court:10", combatBgPool("court", 10));
    expect(s10.file).toContain("shaolin-abbot");
    expect(b10.file).toContain("jianghu-hall");
    expect(c10.file).toContain("court-night");
  });

  it("战斗+营地+遭遇共用计数，仍不超过两次", () => {
    let uses: Record<string, number> = {};
    const assign: Record<string, string> = {};
    const keys = [
      ...Array.from({ length: 10 }, (_, i) => [`combat:bandit:${i + 1}`, combatBgPool("bandit", i + 1)] as const),
      ...Array.from({ length: 9 }, (_, i) => [`camp:${i + 1}`, overlayPoolFor("reward", "bandit")] as const),
      ...["event:1", "event:2", "event:4", "event:8", "event:9"].map((k) => [k, overlayPoolFor("event", "bandit")] as const),
    ];
    for (const [key, pool] of keys) {
      const r = assignSceneBg({ bgUses: uses, bgAssign: assign }, key, pool);
      uses = r.bgUses;
      Object.assign(assign, r.bgAssign);
    }
    expect(Math.max(0, ...Object.values(uses))).toBeLessThanOrEqual(SCENE_BG_CAP);
  });

  it("同一 scene key 再次取回同一张；营地名跟线路走", () => {
    const a = assignSceneBg({ bgUses: {}, bgAssign: {} }, "combat:1", combatBgPool("bandit", 1));
    const b = assignSceneBg({ bgUses: a.bgUses, bgAssign: a.bgAssign }, "combat:1", combatBgPool("bandit", 1));
    expect(b.url).toBe(a.url);
    expect(campPlaceName("bandit").title).toBe("酒楼歇脚");
    expect(campPlaceName("shaolin").title).toBe("禅院歇脚");
    expect(campPlaceName("court").title).toBe("官驿歇脚");
  });
});
