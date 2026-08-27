import { describe, expect, it } from "vitest";
import { generateLuoyang } from "./luoyangGen";
import { loadScene, interact, floodFloor, walkable } from "./world";
import { makeRun } from "../game/run";
import { propVoice } from "./scenes";

function openRun() {
  return {
    ...makeRun("empty"),
    flags: ["branded", "watchOpen", "trueMirror", "booksOk", "knotOk", "tideOpen", "mainOpen"],
    items: ["deed", "incense", "brand", "roadPass"] as never[],
  };
}

describe("Luoyang V3 acceptance", () => {
  it("1: restores 洛阳门 paifang on Tianjin bridge water", () => {
    const scene = generateLuoyang();
    const w = loadScene("luoyang", openRun());
    const cx = Math.floor(84 / 2);
    const cy = Math.floor(54 / 2);
    expect(scene.ascii[cy - 2]![cx]).toBe(";");
    expect(scene.ascii[cy + 2]![cx]).toBe(";");
    const gates = w.props.filter((p) => p.kind === "arch" && p.tag === "洛阳门");
    expect(gates.length).toBeGreaterThanOrEqual(2);
    const voice = propVoice("arch", "洛阳门", "luoyang");
    expect(voice.said).toContain("洛阳门");
  });

  it("2: multi-cell furniture only indoors; outdoor stays 1x1", () => {
    const w = loadScene("luoyang", openRun());
    for (const p of w.props) {
      const tile = w.tiles[p.y]![p.x];
      const outdoor = tile === "road" || tile === "pack" || tile === "gate";
      if (outdoor) {
        expect(p.spanW ?? 1).toBe(1);
        expect(p.spanH ?? 1).toBe(1);
        expect(p.kind).not.toBe("counter");
      }
    }
    expect(w.props.some((p) => p.kind === "counter" && (p.spanW ?? 1) >= 2)).toBe(true);
  });

  it("3: trees are grouped accents, not a carpet", () => {
    const w = loadScene("luoyang", openRun());
    const trees = w.props.filter((p) => p.kind === "tree").length;
    expect(trees).toBeGreaterThanOrEqual(8);
    expect(trees).toBeLessThanOrEqual(133);
    const cx = Math.floor(w.w / 2);
    expect(w.props.some((p) => p.kind === "tree" && Math.abs(p.x - cx) <= 1)).toBe(false);
  });

  it("4: market cluster; street shops wall-free house without counter", () => {
    const scene = generateLuoyang();
    const w = loadScene("luoyang", openRun());
    const cx = Math.floor(84 / 2);
    const cy = Math.floor(54 / 2);
    const market = { x: cx + 5, y: cy + 8 };
    const cluster = w.talkers.filter(
      (t) => Math.abs(t.x - market.x) <= 5 && Math.abs(t.y - market.y) <= 4,
    );
    expect(cluster.length).toBeGreaterThanOrEqual(3);

    const shop = { x: 50, y: cy - 8, w: 5, h: 3 };
    let walls = 0;
    let hasH = false;
    let hasQ = false;
    for (let y = shop.y; y < shop.y + shop.h; y++) {
      for (let x = shop.x; x < shop.x + shop.w; x++) {
        const ch = scene.ascii[y]![x]!;
        if (ch === "#") walls += 1;
        if (ch === "H") hasH = true;
        if (ch === "q") hasQ = true;
      }
    }
    expect(walls).toBe(0);
    expect(hasH).toBe(true);
    expect(hasQ).toBe(false);
  });

  it("5: interact texts correct; FA/GA deep; bridge axis walkable", () => {
    const run = openRun();
    const w = loadScene("luoyang", run);
    const cart = w.props.find((p) => p.kind === "cart");
    const counter = w.props.find((p) => p.kind === "counter");
    expect(cart && counter).toBeTruthy();

    for (const [prop, needle] of [
      [cart!, "车"],
      [counter!, "柜"],
    ] as const) {
      const next = {
        ...w,
        player: { x: prop.x, y: Math.min(w.h - 2, prop.y + (prop.spanH ?? 1)) },
        facing: "up" as const,
      };
      const r = interact(next, run);
      expect(r.world.message || r.said || "").toMatch(new RegExp(needle));
      expect(r.world.message || "").not.toMatch(/瓦罐/);
    }

    const gate = w.props.find((p) => p.kind === "arch" && p.tag === "洛阳门")!;
    const gNext = {
      ...w,
      player: { x: gate.x, y: gate.y + 1 },
      facing: "up" as const,
    };
    const gR = interact(gNext, run);
    expect((gR.world.message || "") + (gR.said || "")).toContain("洛阳门");

    const fa = w.portals.find((p) => p.ch === "FA");
    const ga = w.portals.find((p) => p.ch === "GA");
    expect(fa && ga).toBeTruthy();
    expect(walkable(w, Math.floor(w.w / 2), Math.floor(w.h / 2), run)).toBe(true);
    expect(floodFloor(w, run).has(`${Math.floor(w.w / 2)},${Math.floor(w.h / 2)}`)).toBe(true);
  });
});
