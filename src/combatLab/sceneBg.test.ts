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
  eventBgPool,
  SCENE_BG_CAP,
  staticOverlayBg,
} from "./sceneBg";

const PUB = resolve(__dirname, "../../public");

describe("场景背景：一张图整局只用一次", () => {
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

  it("十馆战斗各用不同底图", () => {
    let uses: Record<string, number> = {};
    const assign: Record<string, string> = {};
    const files: string[] = [];
    for (let s = 1; s <= 10; s++) {
      const r = assignSceneBg({ bgUses: uses, bgAssign: assign }, `combat:bandit:${s}`, combatBgPool("bandit", s));
      uses = r.bgUses;
      Object.assign(assign, r.bgAssign);
      files.push(r.url);
    }
    expect(new Set(files).size).toBe(10);
    expect(Math.max(0, ...Object.values(uses))).toBeLessThanOrEqual(SCENE_BG_CAP);
  });

  it("少林 / 江湖 / 朝廷开战底图不同", () => {
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
    expect(s10.file).not.toBe(s1.file);
    expect(b10.file).not.toBe(b1.file);
  });

  it("战斗十馆底图互不重复；歇脚用该地 restBg，不抢错线院子", () => {
    let uses: Record<string, number> = {};
    const assign: Record<string, string> = {};
    const combatFiles: string[] = [];
    for (let s = 1; s <= 10; s++) {
      const r = assignSceneBg({ bgUses: uses, bgAssign: assign }, `combat:bandit:${s}`, combatBgPool("bandit", s));
      uses = r.bgUses;
      Object.assign(assign, r.bgAssign);
      combatFiles.push(r.file);
    }
    expect(new Set(combatFiles).size).toBe(10);
    const camp2 = assignSceneBg({ bgUses: uses, bgAssign: assign }, "camp:2", overlayPoolFor("reward", "bandit", undefined, 2));
    expect(camp2.file).toContain("quiet-lane");
    const wager = assignSceneBg({ bgUses: camp2.bgUses, bgAssign: camp2.bgAssign }, "wager:3", overlayPoolFor("wager", "bandit", undefined, 3));
    expect(wager.file).toContain("wager-jianghu");
  });

  it("同一 scene key 再次取回同一张；营地名跟线路走", () => {
    const a = assignSceneBg({ bgUses: {}, bgAssign: {} }, "combat:1", combatBgPool("bandit", 1));
    const b = assignSceneBg({ bgUses: a.bgUses, bgAssign: a.bgAssign }, "combat:1", combatBgPool("bandit", 1));
    expect(b.url).toBe(a.url);
    expect(campPlaceName("bandit").title).toBe("州桥酒楼");
    expect(eventBgPool("fork")[0]).toContain("scene-fork");
    expect(eventBgPool("inn")[0]).toContain("quiet-inn");
    expect(overlayPoolFor("event", "bandit", "ambush")[0]).toContain("ambush");
    expect(overlayPoolFor("wager", "bandit")[0]).toContain("wager-jianghu");
    expect(overlayPoolFor("loadout", "shaolin")[0]).toContain("loadout-shaolin");
    expect(campPlaceName("shaolin").title).toBe("山门廊");
    expect(campPlaceName("court").title).toBe("城门外驿");
    const wager = overlayPoolFor("wager", "bandit", undefined, 2);
    const camp = overlayPoolFor("reward", "bandit", undefined, 1);
    expect(wager[0]).not.toBe(camp[0]);
  });
});
