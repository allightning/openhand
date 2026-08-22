import { describe, expect, it } from "vitest";
import { PRIMARY_CITIES, TRANSIT_TOWNS } from "./cities";
import { loadScene } from "./world";
import { makeRun, addFlag } from "../game/run";
import { SCENES } from "./scenes";
import { questLog } from "../game/quest";
import { atlasNode } from "./atlas";
import { doorKind } from "./tileset";

describe("expanded primary cities", () => {
  it("loads each new primary hub", () => {
    for (const id of PRIMARY_CITIES) {
      expect(SCENES[id].name.length).toBeGreaterThan(1);
      const w = loadScene(id, makeRun("empty"));
      expect(w.tiles.length).toBeGreaterThan(4);
      expect(w.portals.length).toBeGreaterThan(0);
    }
  });

  it("loads transit towns between cities", () => {
    for (const id of TRANSIT_TOWNS) {
      expect(SCENES[id].name.length).toBeGreaterThan(1);
      expect(loadScene(id, makeRun("empty")).portals.length).toBeGreaterThan(0);
    }
  });

  it("keeps the hut small compared with harbor halls", () => {
    expect(SCENES.hut.ascii[0].length).toBeLessThan(SCENES.wharf.ascii[0].length);
    expect(SCENES.hut.ascii.length).toBeLessThan(12);
  });

  it("puts wine upstairs behind an indoor stair portal", () => {
    expect(SCENES.wine.portals["2"]?.to).toBe("wineUp");
    expect(SCENES.wineUp.portals["2"]?.to).toBe("wine");
    const wine = loadScene("wine", makeRun("empty"));
    expect(wine.portals.some((p) => p.to === "wineUp")).toBe(true);
  });

  it("opens the huainan road from the wharf after the first knife", () => {
    const run = addFlag(makeRun("empty"), "mainOpen");
    const w = loadScene("wharf", run);
    const ferry = w.portals.find((p) => p.to === "huainan");
    expect(ferry).toBeTruthy();
    const onRim = ferry!.x <= 2 || ferry!.x >= w.w - 3 || ferry!.y <= 2 || ferry!.y >= w.h - 3;
    expect(onRim, `wharf→huainan at ${ferry!.x},${ferry!.y}`).toBe(true);
  });

  it("fills transit towns with more than a bare crossroads", () => {
    for (const id of TRANSIT_TOWNS) {
      const w = loadScene(id, makeRun("empty"));
      expect(w.w, id).toBeGreaterThanOrEqual(40);
      expect(w.h, id).toBeGreaterThanOrEqual(10);
      expect(w.talkers.length + w.npcs.length, id).toBeGreaterThanOrEqual(1);
      const textured = w.tiles.flat().some((t) => t === "hill" || t === "water" || t === "pack");
      expect(textured, id).toBe(true);
    }
  });

  it("opens the usurper camp from Bianjing after roadUsurp", () => {
    const closed = loadScene("bianjing", makeRun("empty"));
    expect(closed.portals.some((p) => p.to === "usurpCamp")).toBe(false);
    const open = loadScene("bianjing", addFlag(makeRun("empty"), "roadUsurp"));
    expect(open.portals.some((p) => p.to === "usurpCamp")).toBe(true);
  });

  it("lays cities roughly by real geography (north capitals, south Lin'an)", () => {
    expect(atlasNode("luoyang").y).toBeLessThan(atlasNode("huainan").y);
    expect(atlasNode("bianjing").y).toBeLessThan(atlasNode("linan").y);
    expect(atlasNode("changan").x).toBeLessThan(atlasNode("luoyang").x);
    expect(atlasNode("luoyang").x).toBeLessThan(atlasNode("bianjing").x);
    expect(atlasNode("jiankang").y).toBeLessThan(atlasNode("linan").y);
    expect(atlasNode("jiaxing").y).toBeLessThan(atlasNode("linan").y);
  });

  it("spaces huainan road exits so south and harbor do not stack", () => {
    const w = loadScene("huainan", makeRun("empty"));
    const south = w.portals.find((p) => p.to === "chuzhou")!;
    const harbor = w.portals.find((p) => p.to === "wharf")!;
    expect(Math.abs(south.x - harbor.x) + Math.abs(south.y - harbor.y)).toBeGreaterThanOrEqual(6);
    expect(doorKind("chuzhou")).not.toBe(doorKind("wharf"));
  });

  it("puts major travel portals on the map rim, not the center", () => {
    const hubs = [...PRIMARY_CITIES, ...TRANSIT_TOWNS];
    for (const id of hubs) {
      const w = loadScene(id, makeRun("empty"));
      const travel = w.portals.filter(
        (p) =>
          !["wine", "wineUp", "hut", "plot", "luoyang_yamen_prison", "luoyang_yanbo_inner"].includes(p.to),
      );
      expect(travel.length, id).toBeGreaterThan(0);
      for (const p of travel) {
        const onRim = p.x <= 2 || p.x >= w.w - 3 || p.y <= 2 || p.y >= w.h - 3;
        expect(onRim, `${id}→${p.to} at ${p.x},${p.y}`).toBe(true);
      }
    }
  });

  it("keeps brand off the three main titles", () => {
    for (const hero of ["rail", "seer", "sapper"] as const) {
      const title = questLog(makeRun("empty", hero)).main.title;
      expect(title).not.toMatch(/烫印|取印|院印/);
    }
  });

  it("gives every transit town a unique ascii footprint", () => {
    const seen = new Map<string, string>();
    for (const id of TRANSIT_TOWNS) {
      const key = SCENES[id].ascii.join("\n");
      const prev = seen.get(key);
      expect(prev, `${id} duplicates ${prev}`).toBeUndefined();
      seen.set(key, id);
    }
  });

  it("gives every transit town a unique road skeleton (not just terrain paint)", () => {
    const seen = new Map<string, string>();
    for (const id of TRANSIT_TOWNS) {
      const bone = SCENES[id].ascii
        .map((line) =>
          line
            .split("")
            .map((c) => (c === "=" ? "=" : c === "#" || c === "N" || c === "S" || c === "W" || c === "E" ? "#" : "."))
            .join(""),
        )
        .join("\n");
      const prev = seen.get(bone);
      expect(prev, `${id} shares road bone with ${prev}`).toBeUndefined();
      seen.set(bone, id);
    }
  });

  it("assigns distinct metro street layouts to primary cities", async () => {
    const { layoutOf } = await import("./metro");
    const layouts = PRIMARY_CITIES.filter((id) => id !== "usurpCamp").map((id) => layoutOf(id));
    expect(new Set(layouts).size).toBeGreaterThanOrEqual(7);
  });
});
