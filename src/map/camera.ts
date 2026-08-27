export const EDGE_TILES = 6;

/** Outdoor: higher camera (more ground in view). Indoor: lower camera (tiles closer). */
export const OUTDOOR_SCALE = 1;
export const INDOOR_SCALE = 1.42;

/** Fixed play scales — big cities must not shrink the avatar. */
export function coverScale(outdoor: boolean): number {
  return outdoor ? OUTDOOR_SCALE : INDOOR_SCALE;
}

/** Smallest uniform scale that fits the whole map in the stage (never upscales). */
export function fitMapScale(mapW: number, mapH: number, stageW: number, stageH: number): number {
  if (mapW <= 0 || mapH <= 0 || stageW <= 0 || stageH <= 0) return 1;
  return Math.min(1, stageW / mapW, stageH / mapH);
}

/** Center the scaled map in the stage (full-map / survey view). */
export function overviewCamera(
  mapW: number,
  mapH: number,
  stageW: number,
  stageH: number,
  scale: number,
): { x: number; y: number } {
  return {
    x: (stageW - mapW * scale) / 2,
    y: (stageH - mapH * scale) / 2,
  };
}

/** Test版镜头档位：0 近、1 远、2 全图。 */
export function testCamScale(
  lift: number,
  outdoor: boolean,
  mapW: number,
  mapH: number,
  stageW: number,
  stageH: number,
): number {
  const base = coverScale(outdoor);
  if (lift <= 0) return base;
  const fit = fitMapScale(mapW, mapH, stageW, stageH);
  if (lift >= 2) return fit;
  return (base + fit) / 2;
}

export interface Cam {
  x: number;
  y: number;
  scene: string;
}

function clamp(camX: number, camY: number, mapW: number, mapH: number, stageW: number, stageH: number): { x: number; y: number } {
  let x = camX;
  let y = camY;
  if (mapW <= stageW) x = (stageW - mapW) / 2;
  else x = Math.min(0, Math.max(stageW - mapW, x));
  if (mapH <= stageH) y = (stageH - mapH) / 2;
  else y = Math.min(0, Math.max(stageH - mapH, y));
  return { x, y };
}

export function applyCamera(
  cam: Cam,
  scene: string,
  player: { x: number; y: number },
  mapW: number,
  mapH: number,
  stageW: number,
  stageH: number,
  tile: number,
): Cam {
  const reset = cam.scene !== scene;
  let x = cam.x;
  let y = cam.y;
  if (reset) {
    x = stageW / 2 - (player.x + 0.5) * tile;
    y = stageH / 2 - (player.y + 0.5) * tile;
  } else if (mapW > stageW || mapH > stageH) {
    const sx = player.x * tile + tile / 2 + x;
    const sy = player.y * tile + tile / 2 + y;
    const m = EDGE_TILES * tile;
    if (mapW > stageW) {
      if (sx < m) x += m - sx;
      if (sx > stageW - m) x -= sx - (stageW - m);
    }
    if (mapH > stageH) {
      if (sy < m) y += m - sy;
      if (sy > stageH - m) y -= sy - (stageH - m);
    }
  }
  const clamped = clamp(x, y, mapW, mapH, stageW, stageH);
  return { ...clamped, scene };
}
