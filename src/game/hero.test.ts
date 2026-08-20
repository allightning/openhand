import { describe, expect, it } from "vitest";
import type { HeroId } from "./types";
import { HERO_BOSSES, HERO_START, remapEnemy } from "./hero";
import { makeRun } from "./run";
import { CARDS, ENEMIES, HEROES, TECHNIQUES } from "./content";

describe("three names on one map", () => {
  it("starts each name at a different door", () => {
    expect(HERO_START.rail).toBe("hut");
    expect(HERO_START.seer).toBe("customs");
    expect(HERO_START.sapper).toBe("ropes");
    expect(makeRun("empty", "seer").scene).toBe("customs");
    expect(makeRun("empty", "sapper").scene).toBe("ropes");
    expect(makeRun("empty").party).toEqual(["rail"]);
    expect(makeRun("empty", "seer").party).toEqual(["seer"]);
  });

  it("keeps at least fifteen named hunts for each name", () => {
    for (const hero of HEROES) {
      expect(HERO_BOSSES[hero.id as HeroId].length).toBeGreaterThanOrEqual(15);
    }
  });

  it("remaps the first knives without moving the tiles", () => {
    expect(remapEnemy("seer", "intruder")).toBe("inkhand");
    expect(remapEnemy("seer", "warden")).toBe("nametaker");
    expect(remapEnemy("sapper", "intruder")).toBe("stakeboss");
    expect(remapEnemy("rail", "intruder")).toBe("intruder");
  });

  it("has leftover pages and named blades on the roster", () => {
    expect(CARDS.bleedcut.name).toBe("裂创");
    expect(TECHNIQUES.leftover.id).toBe("leftover");
    expect(ENEMIES.inkhand.name).toBe("墨手");
    expect(ENEMIES.stakeboss.name).toBe("钉桩的");
  });
});
