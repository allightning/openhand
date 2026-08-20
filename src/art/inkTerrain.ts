import type { World } from "../map/types";

function frac(n: number): number {
  return n - Math.floor(n);
}

function hash(x: number, y: number, k: number): number {
  return frac(Math.sin(x * 127.1 + y * 311.7 + k * 74.7) * 43758.5453);
}

function blob(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: string,
  alpha: number,
  seedX: number,
  seedY: number,
): void {
  ctx.beginPath();
  const steps = 10;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const j = 0.78 + hash(seedX, seedY, i) * 0.44;
    const px = cx + Math.cos(t) * rx * j;
    const py = cy + Math.sin(t) * ry * j;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  ctx.fill();
  ctx.globalAlpha = 1;
}

function isCliff(w: World, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= w.w || y >= w.h) return true;
  const t = w.tiles[y][x];
  return t === "wall" || t === "rock" || t === "hill";
}

function isWall(w: World, x: number, y: number): boolean {
  return isCliff(w, x, y);
}

function strokeEdge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dir: "n" | "e" | "s" | "w",
  tile: number,
): void {
  const jitter = (hash(x, y, dir.charCodeAt(0)) - 0.5) * 6;
  ctx.beginPath();
  if (dir === "n") {
    ctx.moveTo(x * tile - 2, y * tile + 3 + jitter);
    ctx.quadraticCurveTo(x * tile + tile / 2, y * tile - 2 + jitter, (x + 1) * tile + 2, y * tile + 4 + jitter);
  } else if (dir === "s") {
    ctx.moveTo(x * tile - 2, (y + 1) * tile - 3 + jitter);
    ctx.quadraticCurveTo(x * tile + tile / 2, (y + 1) * tile + 2 + jitter, (x + 1) * tile + 2, (y + 1) * tile - 2 + jitter);
  } else if (dir === "w") {
    ctx.moveTo(x * tile + 3 + jitter, y * tile - 2);
    ctx.quadraticCurveTo(x * tile - 2 + jitter, y * tile + tile / 2, x * tile + 4 + jitter, (y + 1) * tile + 2);
  } else {
    ctx.moveTo((x + 1) * tile - 3 + jitter, y * tile - 2);
    ctx.quadraticCurveTo((x + 1) * tile + 2 + jitter, y * tile + tile / 2, (x + 1) * tile - 2 + jitter, (y + 1) * tile + 2);
  }
  ctx.stroke();
}

export function paintInkTerrain(ctx: CanvasRenderingContext2D, w: World, tile: number): void {
  ctx.clearRect(0, 0, w.w * tile, w.h * tile);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  for (let y = 0; y < w.h; y++) {
    for (let x = 0; x < w.w; x++) {
      const t = w.tiles[y][x];
      const cx = x * tile + tile / 2;
      const cy = y * tile + tile / 2;
      if (t === "water") {
        blob(ctx, cx, cy, tile * 0.72, tile * 0.58, "#1a3a40", 0.22, x, y);
        blob(ctx, cx + 3, cy - 2, tile * 0.5, tile * 0.28, "#2a5a58", 0.12, x + 2, y);
      } else if (t === "wall") {
        const floorN = !isWall(w, x, y - 1);
        const floorS = !isWall(w, x, y + 1);
        const floorW = !isWall(w, x - 1, y);
        const floorE = !isWall(w, x + 1, y);
        if (floorN || floorS || floorW || floorE) {
          blob(ctx, cx, cy, tile * 0.42, tile * 0.4, "#1a1410", 0.16, x, y);
          ctx.globalAlpha = 0.55;
          ctx.strokeStyle = "#1a1410";
          ctx.lineWidth = 3.4 + hash(x, y, 4) * 1.6;
          if (floorN) strokeEdge(ctx, x, y, "n", tile);
          if (floorS) strokeEdge(ctx, x, y, "s", tile);
          if (floorW) strokeEdge(ctx, x, y, "w", tile);
          if (floorE) strokeEdge(ctx, x, y, "e", tile);
          ctx.globalAlpha = 1;
        }
      } else if (t === "gate") {
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = "#8b2a24";
        ctx.lineWidth = 3.4;
        ctx.beginPath();
        ctx.moveTo(cx - 8, cy + tile * 0.4);
        ctx.quadraticCurveTo(cx - 6, cy - tile * 0.45, cx, cy - tile * 0.42);
        ctx.quadraticCurveTo(cx + 7, cy - 6, cx + 8, cy + tile * 0.38);
        ctx.stroke();
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = "#8b2a24";
        ctx.fill();
        ctx.globalAlpha = 1;
      } else if (t === "hill" || t === "rock") {
        const earth = t === "hill" ? "#3a4a28" : "#4a3a28";
        const moss = t === "hill" ? "#5a6a38" : "#5a4a32";
        blob(ctx, cx, cy - 4, tile * 0.62, tile * 0.48, moss, 0.45, x, y);
        blob(ctx, cx + 2, cy, tile * 0.5, tile * 0.36, earth, 0.35, x + 3, y);
        const floorS = y + 1 < w.h && !isCliff(w, x, y + 1) && w.tiles[y + 1][x] !== "water";
        if (floorS) {
          blob(ctx, cx, cy + tile * 0.28, tile * 0.58, tile * 0.22, "#2a2018", 0.38, x, y + 8);
        }
      } else if (t === "brazier") {
        blob(ctx, cx, cy, tile * 0.4, tile * 0.28, "#c45a28", 0.18, x, y);
      }
    }
  }

  for (const s of w.seals) {
    const cx = s.x * tile + tile / 2;
    const cy = s.y * tile + tile / 2;
    const lit = w.progress.includes(s.id) && s.id !== "x";
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = lit ? "#8b2a24" : "#5a4030";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.ellipse(cx, cy, tile * 0.28, tile * 0.22, hash(s.x, s.y, 1) * 0.4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = lit ? 0.28 : 0.12;
    ctx.fillStyle = lit ? "#8b2a24" : "#3a2e22";
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  for (const sign of w.signs) {
    const cx = sign.x * tile + tile / 2;
    const cy = sign.y * tile + tile / 2;
    blob(ctx, cx, cy, tile * 0.3, tile * 0.36, "#d8cbb0", 0.4, sign.x, sign.y);
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = "#3a2a18";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy - 11);
    ctx.quadraticCurveTo(cx + 2, cy - 13, cx + 7, cy - 8);
    ctx.lineTo(cx + 6, cy + 10);
    ctx.quadraticCurveTo(cx - 2, cy + 12, cx - 7, cy + 7);
    ctx.closePath();
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  for (const p of w.portals) {
    const cx = p.x * tile + tile / 2;
    const cy = p.y * tile + tile / 2;
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = "#5a2018";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy + 12);
    ctx.quadraticCurveTo(cx, cy - 16, cx + 10, cy + 12);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}
