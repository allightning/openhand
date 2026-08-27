import { describe, expect, it } from "vitest";
import { generateLuoyang } from "./luoyangGen";
import { loadScene, interact, floodFloor } from "./world";
import { makeRun } from "../game/run";
import { propVoice } from "./scenes";

function openRun() {
  return {
    ...makeRun("empty"),
    flags: ["branded", "watchOpen", "trueMirror", "booksOk", "knotOk", "tideOpen", "mainOpen"],
    items: ["deed", "incense", "brand", "roadPass"] as never[],
  };
}

describe("Luoyang V2 forced fixes", () => {
  it("1: props carry unique multi-char ids; rack voice is not jar", () => {
    const w = loadScene("luoyang", openRun());
    const ids = w.props.map((p) => p.id).filter(Boolean) as string[];
    expect(ids.length).toBe(w.props.length);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id.length >= 2)).toBe(true);

    const rack = w.props.find((p) => p.kind === "rack");
    expect(rack).toBeTruthy();
    const voice = propVoice("rack", rack!.tag, "luoyang");
    expect(voice.said).not.toContain("瓦罐");
    expect(voice.said).toContain("兵器");
  });

  it("2: brothel yard has no weapon racks/dummies/sandbags", () => {
    const scene = generateLuoyang();
    const brothel = {
      x: 66,
      y: 33,
      w: 18,
      h: 12,
    };
    const martialLetters = new Set(["z", "d", "c"]);
    let bad = 0;
    for (let y = brothel.y + 1; y < brothel.y + brothel.h - 1; y++) {
      for (let x = brothel.x + 1; x < brothel.x + brothel.w - 1; x++) {
        const ch = scene.ascii[y]![x]!;
        if (martialLetters.has(ch)) bad += 1;
      }
    }
    expect(bad, "青楼内不得有兵器架/木人/沙袋").toBe(0);
  });

  it("3: brothel density diluted; streets have talkers", () => {
    const w = loadScene("luoyang", openRun());
    const scene = generateLuoyang();
    const yards = {
      brothel: { x: 66, y: 33, w: 18, h: 12 },
    };
    const inBox = (t: { x: number; y: number }, b: { x: number; y: number; w: number; h: number }) =>
      t.x > b.x && t.x < b.x + b.w - 1 && t.y > b.y && t.y < b.y + b.h - 1;
    const brothelN = w.talkers.filter((t) => inBox(t, yards.brothel)).length;
    expect(brothelN).toBeLessThanOrEqual(5);
    expect(brothelN).toBeGreaterThanOrEqual(1);

    const cx = Math.floor(84 / 2);
    const cy = Math.floor(54 / 2);
    const streetish = w.talkers.filter(
      (t) => Math.abs(t.x - cx) <= 2 || Math.abs(t.y - (cy + 8)) <= 3 || Math.abs(t.y - (cy - 5)) <= 2,
    );
    expect(streetish.length).toBeGreaterThanOrEqual(8);
    expect(w.talkers.length).toBeGreaterThanOrEqual(40);
    expect(scene.entityMarks?.filter((m) => m.role === "talker").length).toBeGreaterThanOrEqual(40);
  });

  it("4: secondary portals sit deep inside, not on outer doors", () => {
    const scene = generateLuoyang();
    const w = loadScene("luoyang", openRun());
    const fa = w.portals.find((p) => p.ch === "FA");
    const ga = w.portals.find((p) => p.ch === "GA");
    expect(fa).toBeTruthy();
    expect(ga).toBeTruthy();

    for (const p of [fa!, ga!]) {
      const edge =
        p.x <= 1 || p.y <= 1 || p.x >= 82 || p.y >= 52 || scene.ascii[p.y]![p.x] === "#";
      expect(edge).toBe(false);
      expect(scene.ascii[p.y]![p.x]).not.toMatch(/^[FG]$/);
    }

    const bx = 66;
    const by = 33;
    const doorX = bx;
    const doorY = by + Math.floor(12 / 2);
    expect(fa!.x !== doorX || fa!.y !== doorY).toBe(true);
    expect(scene.ascii[doorY]![doorX]).toBe(":");
  });

  it("5: street shops have no black wall foundation", () => {
    const scene = generateLuoyang();
    const cx = Math.floor(84 / 2);
    const cy = Math.floor(54 / 2);
    const shop = { x: 50, y: cy - 8, w: 5, h: 3 };
    let walls = 0;
    for (let y = shop.y; y < shop.y + shop.h; y++) {
      for (let x = shop.x; x < shop.x + shop.w; x++) {
        if (scene.ascii[y]![x] === "#") walls += 1;
      }
    }
    expect(walls, "临街小铺不得有黑墙地基").toBe(0);
    expect(scene.ascii[shop.y]!.includes("H") || scene.ascii.slice(shop.y, shop.y + shop.h).some((r) => r.slice(shop.x, shop.x + shop.w).includes("H"))).toBe(true);
  });

  it("interacting rack does not say jar", () => {
    const run = openRun();
    const w = loadScene("luoyang", run);
    const rack = w.props.find((p) => p.kind === "rack");
    expect(rack).toBeTruthy();
    const next = {
      ...w,
      player: { x: rack!.x, y: rack!.y + 1 },
      facing: "up" as const,
    };
    const r = interact(next, run);
    if (r.action === "talk") {
      expect(r.world.said).not.toContain("瓦罐");
    }
  });

  it("FA portal reachable from north gate", () => {
    const run = openRun();
    const w = loadScene("luoyang", run);
    w.npcs.forEach((n) => {
      n.beaten = true;
    });
    const fa = w.portals.find((p) => p.ch === "FA")!;
    const d = w.portals.find((p) => p.ch === "D")!;
    w.player = { x: d.x, y: d.y };
    const seen = floodFloor(w, run, true);
    const blockers = w.talkers.filter((t) => t.y === fa.y && Math.abs(t.x - fa.x) <= 4);
    expect(seen.has(`${fa.x},${fa.y}`), JSON.stringify({ fa, blockers })).toBe(true);
  });
});
