import { describe, expect, it } from "vitest";
import { archSrc, cellUsesBrick, doorKind, groundTex, isSeen, markVision, neighborMask, objSrc, tileArt, treeStampAt, visionCells, wallSeamEdge } from "./tileset";
import { loadScene } from "./world";
import { makeRun } from "../game/run";
import type { Tile } from "./types";

describe("tileset", () => {
  it("uses water and wall textures", () => {
    expect(groundTex("wharf", "water")).toBe("water");
    expect(groundTex("wharf", "wall")).toBe("wall");
    expect(groundTex("yard", "floor")).toBe("grass");
    expect(groundTex("ridge", "hill")).toBe("hill");
    expect(groundTex("ridge", "rock")).toBe("rock");
    expect(groundTex("plot", "floor")).toBe("grass");
    expect(groundTex("plot", "road")).toBe("gravel-grass");
    expect(groundTex("ridge", "road")).toBe("gravel-grass");
    expect(groundTex("wharf", "road")).toBe("gravel-grass");
    expect(groundTex("lane", "road")).toBe("gravel-grass");
    expect(groundTex("jiaxing", "road")).toBe("gravel-grass");
    expect(groundTex("bianjing", "road")).toBe("gravel-brick");
    expect(groundTex("plot", "pack")).toBe("dirt");
    expect(groundTex("lane", "floor")).toBe("grass");
    expect(groundTex("wharf", "floor")).toBe("grass");
    expect(groundTex("bianjing", "floor")).toBe("brick");
    expect(groundTex("ridge", "floor")).toBe("grass");
    expect(groundTex("cave", "floor")).toBe("stone");
    expect(groundTex("hold", "floor")).toBe("wood");
    const yard = loadScene("yard", makeRun("empty"));
    const inner = yard.tiles.flatMap((row, y) => row.map((t, x) => (t === "floor" ? [x, y] as const : null))).filter(Boolean) as [number, number][];
    expect(inner.some(([x, y]) => cellUsesBrick("yard", yard.tiles, x, y))).toBe(true);
    expect(inner.some(([x, y]) => !cellUsesBrick("yard", yard.tiles, x, y))).toBe(true);
  });

  it("uses the original painted squares", () => {
    const grid: Tile[][] = [
      ["water", "water", "floor"],
      ["water", "water", "floor"],
      ["floor", "floor", "water"],
    ];
    const mask = neighborMask(grid, 1, 1, (t) => t === "water", false);
    expect(mask & 1).toBe(1);
    expect(mask & 64).toBe(64);
    expect(mask & 4).toBe(0);
    const water = tileArt("ridge", grid, 1, 1);
    expect(water.src).toContain("tile-water");
    expect(water.layers.length).toBeGreaterThanOrEqual(1);
    expect(water.layers.every((l) => !l.src.includes("overlay-shore"))).toBe(true);
    expect(water.layers.some((l) => l.src.includes("tile-water"))).toBe(true);
    const bridge = tileArt("wharf", [
      ["water", "road", "water"],
      ["water", "road", "water"],
      ["water", "road", "water"],
    ], 1, 1);
    expect(bridge.layers.some((l) => l.src.includes("obj-bridge"))).toBe(true);
    expect(bridge.layers.some((l) => l.src.includes("tile-water"))).toBe(true);
    const bank = tileArt("ridge", grid, 2, 1);
    expect(bank.src).toContain("tile-grass");
    expect(bank.layers.length).toBeGreaterThanOrEqual(1);
    const hill = tileArt("ridge", [
      ["hill", "floor"],
      ["floor", "floor"],
    ], 0, 0);
    expect(hill.layers.some((l) => l.src.includes("hill-core"))).toBe(true);
    const beach = tileArt("wharf", [
      ["floor", "water"],
      ["floor", "floor"],
    ], 0, 0);
    expect(beach.src).toContain("tile-grass");
    const grass = tileArt("plot", [
      ["floor", "floor"],
      ["floor", "floor"],
    ], 0, 0);
    expect(grass.src).toContain("tile-grass");
    const wall = tileArt("hut", [
      ["wall", "wall"],
      ["wall", "floor"],
    ], 0, 0);
    expect(wall.layers[0].src).toContain("tile-wood");
    expect(wall.layers.some((l) => l.role === "post")).toBe(true);
    expect(wall.layers.some((l) => l.role === "arm-e")).toBe(true);
    expect(wall.layers.some((l) => l.role === "arm-s")).toBe(true);
    expect(wall.layers.some((l) => l.role === "bar-h")).toBe(false);
    const run = tileArt("ridge", [
      ["wall", "wall", "wall"],
      ["floor", "floor", "floor"],
    ], 1, 0);
    expect(run.layers[0].src).toContain("tile-grass");
    expect(run.layers.some((l) => l.role === "bar-h")).toBe(true);
    expect(run.layers.some((l) => l.role === "post")).toBe(false);
    const corner = tileArt("ridge", [
      ["wall", "wall", "floor"],
      ["wall", "floor", "floor"],
    ], 0, 0);
    expect(corner.layers.some((l) => l.role === "arm-e")).toBe(true);
    expect(corner.layers.some((l) => l.role === "arm-s")).toBe(true);
    expect(corner.layers.some((l) => l.role === "bar-h")).toBe(false);
    expect(corner.layers.some((l) => l.role === "bar-v")).toBe(false);
    expect(corner.layers.some((l) => l.role === "post")).toBe(true);
    const outdoorWall = tileArt("ridge", [
      ["wall", "floor"],
      ["floor", "floor"],
    ], 0, 0);
    expect(outdoorWall.layers[0].src).toContain("tile-grass");
    expect(outdoorWall.layers.some((l) => l.role === "post")).toBe(true);
    const roadWall = tileArt("plot", [
      ["wall", "road"],
      ["floor", "road"],
    ], 0, 0);
    // 墙下绝不能是路，只能是草/砖
    expect(roadWall.layers[0].src).toMatch(/tile-grass|tile-brick/);
    expect(roadWall.layers[0].src).not.toMatch(/gravel|dirt/);
    expect(roadWall.layers.some((l) => l.src.includes("wall-"))).toBe(true);
    const road = tileArt("plot", [
      ["road", "road"],
      ["floor", "floor"],
    ], 0, 0);
    expect(road.layers[0].src).toContain("tile-grass");
    expect(road.layers.some((l) => l.src.includes("tile-gravel-grass"))).toBe(true);
    const floor = tileArt("hut", [
      ["wall", "floor"],
      ["floor", "floor"],
    ], 1, 1);
    expect(floor.src).toContain("tile-wood");
  });

  it("reveals a wide cone so large cities are not pitch black", () => {
    const up = visionCells(10, 10, "up", 36, 18).map((c) => `${c.x},${c.y}`);
    expect(up).toContain("10,10");
    expect(up).toContain("10,8");
    expect(up).toContain("10,7");
    expect(up.length).toBeGreaterThan(20);
    const down = visionCells(10, 10, "down", 36, 18).map((c) => `${c.x},${c.y}`);
    expect(down).toContain("10,12");
    expect(down).toContain("9,10");
  });

  it("keeps indoor vision tighter than outdoor", () => {
    const out = visionCells(10, 10, "up", 36, 18, undefined, true);
    const inn = visionCells(10, 10, "up", 36, 18, undefined, false);
    expect(out.length).toBeGreaterThan(inn.length);
    expect(inn.map((c) => `${c.x},${c.y}`)).toContain("10,9");
    expect(inn.map((c) => `${c.x},${c.y}`)).toContain("10,8");
    expect(inn.map((c) => `${c.x},${c.y}`)).not.toContain("10,6");
  });

  it("stops the forward cone when a wall is in the face", () => {
    const cells = visionCells(10, 10, "up", 36, 18, (x, y) => x === 10 && y === 9);
    const keys = cells.map((c) => `${c.x},${c.y}`);
    expect(keys).toContain("10,9");
    // 近距方块仍可见；前向锥在墙后截断
    expect(keys).not.toContain("10,5");
  });

  it("picks a building that matches the place you step into", () => {
    expect(doorKind("shrine")).toBe("shrine");
    expect(doorKind("yard")).toBe("paifang");
    expect(doorKind("hold")).toBe("hall");
    expect(doorKind("customs")).toBe("hall");
    expect(doorKind("tea")).toBe("shrine");
    expect(doorKind("wharf")).toBe("ferry");
    expect(doorKind("cave")).toBe("hall");
    expect(doorKind("cellar")).toBe("hall");
    expect(doorKind("chuzhou")).toBe("shrine");
    expect(doorKind("bozhou")).toBe("post");
    expect(doorKind("wine")).toBe("wine");
    expect(doorKind("usurpCamp")).toBe("camp");
    expect(doorKind("plot")).toBe("hut");
    expect(doorKind("ridge")).toBe("post");
    expect(doorKind("hut")).toBe("hut");
    expect(doorKind("yamen")).toBe("paifang");
    expect(doorKind("escort")).toBe("paifang");
    expect(doorKind("flower")).toBe("wine");
  });

  it("draws mooring posts as piles, not door halls", () => {
    expect(objSrc("post")).toBe("/art/objs/obj-pile.png");
  });

  it("orients courtyard arches to the wall seam", () => {
    const wharf = loadScene("wharf", makeRun("empty"));
    const tax = wharf.props.find((p) => p.kind === "arch" && p.tag === "税卡")!;
    expect(wallSeamEdge(wharf.tiles, tax.x, tax.y)).toBe("v");
    expect(archSrc(wharf.tiles, tax.x, tax.y)).toContain("-v.png");

    const ridge = loadScene("ridge", makeRun("empty"));
    const yamen = ridge.props.find((p) => p.kind === "arch" && p.tag === "衙门")!;
    expect(wallSeamEdge(ridge.tiles, yamen.x, yamen.y)).toBe("h");
    expect(archSrc(ridge.tiles, yamen.x, yamen.y)).toContain("-h.png");
  });

  it("paints roads that match how settled the place is", () => {
    const grassRoad = tileArt("plot", [["road"], ["road"], ["road"]], 0, 1);
    expect(grassRoad.layers[0].src).toContain("tile-grass");
    expect(grassRoad.layers.some((l) => l.src.includes("tile-gravel-grass"))).toBe(true);
    const horiz = tileArt("plot", [["road", "road", "road"]], 1, 0);
    expect(horiz.layers.some((l) => l.src.includes("tile-gravel-grass-h"))).toBe(true);
    const dirtGravel = tileArt("wharf", [["road"], ["road"]], 0, 0);
    expect(dirtGravel.layers.some((l) => l.src.includes("tile-gravel-grass"))).toBe(true);
    expect(dirtGravel.layers.some((l) => l.src.includes("tile-grass"))).toBe(true);
    const city = tileArt("bianjing", [["road", "road", "road"]], 1, 0);
    expect(city.layers.some((l) => l.src.includes("tile-brick"))).toBe(true);
    expect(city.layers.some((l) => l.src.includes("tile-cobble"))).toBe(true);
    expect(city.layers.every((l) => !l.src.includes("gravel-brick"))).toBe(true);
    const cross = tileArt("plot", [
      ["floor", "road", "floor"],
      ["road", "road", "road"],
      ["floor", "road", "floor"],
    ], 1, 1);
    expect(cross.layers.some((l) => l.src.includes("-x.png"))).toBe(true);
    const dirt = tileArt("plot", [["pack"]], 0, 0);
    expect(dirt.layers.some((l) => l.src.includes("tile-dirt"))).toBe(true);
    const yardW = loadScene("yard", makeRun("empty"));
    let sawBrick = false;
    let sawGrass = false;
    for (let y = 0; y < yardW.h; y++) {
      for (let x = 0; x < yardW.w; x++) {
        if (yardW.tiles[y][x] !== "floor") continue;
        const art = tileArt("yard", yardW.tiles, x, y);
        if (art.layers[0].src.includes("tile-brick")) sawBrick = true;
        if (art.layers[0].src.includes("tile-grass")) sawGrass = true;
      }
    }
    expect(sawBrick).toBe(true);
    expect(sawGrass).toBe(true);
    const yamen = loadScene("yamen", makeRun("empty"));
    const yFloor = yamen.tiles.flatMap((row, y) => row.map((t, x) => (t === "floor" ? [x, y] as const : null))).find(Boolean)!;
    expect(tileArt("yamen", yamen.tiles, yFloor[0], yFloor[1]).layers[0].src).toContain("tile-brick");
  });

  it("varies tree canopies by place", () => {
    const kinds = new Set<string>();
    for (let x = 0; x < 12; x++) {
      for (let y = 0; y < 8; y++) kinds.add(treeStampAt(x, y));
    }
    expect(kinds.size).toBeGreaterThanOrEqual(3);
    expect(kinds.has("tree") || kinds.has("bush")).toBe(true);
  });

  it("keeps previously seen tiles after turning", () => {
    let seen = markVision({}, "wharf", 10, 10, "up", 36, 18);
    expect(isSeen(seen, "wharf", 10, 9)).toBe(true);
    seen = markVision(seen, "wharf", 10, 10, "right", 36, 18);
    expect(isSeen(seen, "wharf", 10, 9)).toBe(true);
    expect(isSeen(seen, "wharf", 12, 10)).toBe(true);
  });
});
