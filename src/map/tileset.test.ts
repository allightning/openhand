import { describe, expect, it } from "vitest";
import { doorKind, groundTex, isSeen, markVision, neighborMask, tileArt, treeStampAt, visionCells } from "./tileset";
import type { Tile } from "./types";

describe("tileset", () => {
  it("uses water and wall textures", () => {
    expect(groundTex("wharf", "water")).toBe("water");
    expect(groundTex("wharf", "wall")).toBe("wall");
    expect(groundTex("yard", "floor")).toBe("grass");
    expect(groundTex("ridge", "hill")).toBe("hill");
    expect(groundTex("ridge", "rock")).toBe("rock");
    expect(groundTex("plot", "floor")).toBe("grass");
    expect(groundTex("plot", "road")).toBe("dirt");
    expect(groundTex("ridge", "road")).toBe("dirt");
    expect(groundTex("wharf", "road")).toBe("cobble");
    expect(groundTex("lane", "road")).toBe("brick");
    expect(groundTex("lane", "floor")).toBe("grass");
    expect(groundTex("wharf", "floor")).toBe("grass");
    expect(groundTex("cave", "floor")).toBe("stone");
    expect(groundTex("hold", "floor")).toBe("wood");
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
    expect(water.layers).toHaveLength(1);
    const bank = tileArt("ridge", grid, 2, 1);
    expect(bank.src).toContain("tile-grass");
    expect(bank.layers).toHaveLength(1);
    const hill = tileArt("ridge", [
      ["hill", "floor"],
      ["floor", "floor"],
    ], 0, 0);
    expect(hill.src).toContain("tile-water");
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
    expect(roadWall.layers[0].src).toContain("tile-dirt");
    expect(roadWall.layers.some((l) => l.src.includes("wall-"))).toBe(true);
    const road = tileArt("plot", [
      ["road", "road"],
      ["floor", "floor"],
    ], 0, 0);
    expect(road.src).toContain("tile-dirt");
    const floor = tileArt("hut", [
      ["wall", "floor"],
      ["floor", "floor"],
    ], 1, 1);
    expect(floor.src).toContain("tile-wood");
  });

  it("shows the tiles underfoot and one more step ahead", () => {
    const up = visionCells(10, 10, "up", 36, 18).map((c) => `${c.x},${c.y}`).sort();
    expect(up).toEqual(["10,10", "10,11", "10,8", "10,9", "11,10", "11,11", "11,9", "9,10", "9,11", "9,9"]);
    expect(up).not.toContain("10,7");
    const down = visionCells(10, 10, "down", 36, 18).map((c) => `${c.x},${c.y}`).sort();
    expect(down).toContain("10,12");
    expect(down).toContain("9,10");
    expect(down).toContain("11,10");
  });

  it("stops the second forward tile when a wall is in the face", () => {
    const cells = visionCells(10, 10, "up", 36, 18, (x, y) => x === 10 && y === 9);
    const keys = cells.map((c) => `${c.x},${c.y}`);
    expect(keys).toContain("10,9");
    expect(keys).not.toContain("10,8");
  });

  it("picks a building that matches the place you step into", () => {
    expect(doorKind("shrine")).toBe("paifang");
    expect(doorKind("yard")).toBe("paifang");
    expect(doorKind("hold")).toBe("hall");
    expect(doorKind("tea")).toBe("pavilion");
    expect(doorKind("wharf")).toBe("pavilion");
    expect(doorKind("cave")).toBe("hall");
    expect(doorKind("cellar")).toBe("hall");
  });

  it("paints roads that match how settled the place is", () => {
    const dirt = tileArt("plot", [["road"]], 0, 0);
    expect(dirt.src).toContain("tile-dirt");
    const cobble = tileArt("wharf", [["road"]], 0, 0);
    expect(cobble.src).toContain("tile-cobble");
    const brick = tileArt("lane", [["road"]], 0, 0);
    expect(brick.src).toContain("tile-brick");
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
