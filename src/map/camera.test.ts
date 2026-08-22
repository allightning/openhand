import { describe, expect, it } from "vitest";
import { applyCamera, coverScale, EDGE_TILES } from "./camera";

const TILE = 40;

describe("edge camera", () => {
  it("stays put while the player is inside the dead zone", () => {
    const stageW = 400;
    const stageH = 400;
    const mapW = 800;
    const mapH = 800;
    const start = applyCamera({ x: 0, y: 0, scene: "" }, "a", { x: 5, y: 5 }, mapW, mapH, stageW, stageH, TILE);
    const next = applyCamera(start, "a", { x: 6, y: 5 }, mapW, mapH, stageW, stageH, TILE);
    expect(next.x).toBe(start.x);
    expect(next.y).toBe(start.y);
  });

  it("pans when the player comes within three tiles of the view edge", () => {
    const stageW = 400;
    const stageH = 400;
    const mapW = 1600;
    const mapH = 1600;
    let cam = applyCamera({ x: 0, y: 0, scene: "" }, "a", { x: 10, y: 10 }, mapW, mapH, stageW, stageH, TILE);
    const before = cam.x;
    cam = applyCamera(cam, "a", { x: 5, y: 10 }, mapW, mapH, stageW, stageH, TILE);
    expect(cam.x).toBeGreaterThan(before);
    const sx = 5 * TILE + TILE / 2 + cam.x;
    expect(sx).toBeGreaterThanOrEqual(EDGE_TILES * TILE - 0.5);
  });

  it("recenters when the scene changes", () => {
    const first = applyCamera({ x: 0, y: 0, scene: "" }, "a", { x: 2, y: 2 }, 1600, 1600, 400, 400, TILE);
    const second = applyCamera(first, "b", { x: 20, y: 20 }, 1600, 1600, 400, 400, TILE);
    expect(second.scene).toBe("b");
    expect(second.x).not.toBe(first.x);
  });

  it("uses a lower indoor camera and a higher outdoor camera", () => {
    expect(coverScale(true)).toBe(1);
    expect(coverScale(false)).toBeGreaterThan(1);
  });
});
