export const EDGE_TILES = 3;

/** Outdoor: higher camera (more ground in view). Indoor: lower camera (tiles closer). */
export const OUTDOOR_SCALE = 1;
export const INDOOR_SCALE = 1.42;

/** Fixed play scales — big cities must not shrink the avatar. */
export function coverScale(outdoor: boolean): number {
  return outdoor ? OUTDOOR_SCALE : INDOOR_SCALE;
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
