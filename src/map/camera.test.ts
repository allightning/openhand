import { describe, expect, it } from "vitest";
import { applyCamera, coverScale, EDGE_TILES, fitMapScale, overviewCamera, testCamScale } from "./camera";

const TILE = 40;

describe("edge camera", () => {
  it("stays put while the player is inside the dead zone", () => {
    const stageW = 1200;
    const stageH = 1200;
    const mapW = 2400;
    const mapH = 2400;
    const start = applyCamera({ x: 0, y: 0, scene: "" }, "a", { x: 15, y: 15 }, mapW, mapH, stageW, stageH, TILE);
    const next = applyCamera(start, "a", { x: 16, y: 15 }, mapW, mapH, stageW, stageH, TILE);
    expect(next.x).toBe(start.x);
    expect(next.y).toBe(start.y);
  });

  it("pans when the player comes within six tiles of the view edge", () => {
    const stageW = 1200;
    const stageH = 1200;
    const mapW = 3200;
    const mapH = 3200;
    let cam = applyCamera({ x: 0, y: 0, scene: "" }, "a", { x: 20, y: 20 }, mapW, mapH, stageW, stageH, TILE);
    const before = cam.x;
    cam = applyCamera(cam, "a", { x: 10, y: 20 }, mapW, mapH, stageW, stageH, TILE);
    expect(cam.x).toBeGreaterThan(before);
    const sx = 10 * TILE + TILE / 2 + cam.x;
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

  it("fits the whole map inside the stage without upscaling", () => {
    const fit = fitMapScale(3360, 2160, 1200, 800);
    expect(fit).toBeLessThan(1);
    expect(3360 * fit).toBeLessThanOrEqual(1200 + 0.001);
    expect(2160 * fit).toBeLessThanOrEqual(800 + 0.001);
  });

  it("centers overview camera for survey view", () => {
    const scale = fitMapScale(800, 600, 400, 300);
    const o = overviewCamera(800, 600, 400, 300, scale);
    expect(o.x).toBeCloseTo((400 - 800 * scale) / 2);
    expect(o.y).toBeCloseTo((300 - 600 * scale) / 2);
  });

  it("test cam lift reaches full map at level 2", () => {
    const mapW = 3360;
    const mapH = 2160;
    const stageW = 1200;
    const stageH = 800;
    const fit = fitMapScale(mapW, mapH, stageW, stageH);
    expect(testCamScale(0, true, mapW, mapH, stageW, stageH)).toBe(1);
    expect(testCamScale(2, true, mapW, mapH, stageW, stageH)).toBe(fit);
    const mid = testCamScale(1, true, mapW, mapH, stageW, stageH);
    expect(mid).toBeGreaterThan(fit);
    expect(mid).toBeLessThan(1);
  });
});
