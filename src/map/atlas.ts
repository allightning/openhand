import type { SceneId } from "./types";

export const ATLAS_W = 112;
export const ATLAS_H = 56;
export const ATLAS_ZOOM_W = 420;
export const ATLAS_ZOOM_H = 240;

interface AtlasNode {
  id: SceneId;
  x: number;
  y: number;
}

const NODES: AtlasNode[] = [
  { id: "hut", x: 0, y: 0 },
  { id: "plot", x: 1, y: 0 },
  { id: "ridge", x: 2, y: 0 },
  { id: "salt", x: 0, y: 1 },
  { id: "hold", x: 1, y: 1 },
  { id: "wharf", x: 2, y: 1 },
  { id: "yard", x: 3, y: 1 },
  { id: "spit", x: 4, y: 1 },
  { id: "customs", x: 3, y: 0 },
  { id: "shrine", x: 4, y: 0 },
  { id: "sluice", x: 5, y: 0 },
  { id: "ropes", x: 1, y: 2 },
  { id: "docks", x: 0, y: 2 },
  { id: "shed", x: 1, y: 3 },
  { id: "lamp", x: 2, y: 2 },
  { id: "cave", x: 3, y: 2 },
  { id: "cellar", x: 3, y: 3 },
  { id: "lane", x: 4, y: 2 },
  { id: "tea", x: 3, y: 4 },
  { id: "drums", x: 2, y: 4 },
  { id: "outer", x: 2, y: 5 },
  { id: "glass", x: 2, y: 6 },
  { id: "inner", x: 3, y: 6 },
];

const EDGES: [SceneId, SceneId][] = [
  ["hut", "plot"],
  ["plot", "ridge"],
  ["ridge", "wharf"],
  ["salt", "hold"],
  ["hold", "wharf"],
  ["wharf", "yard"],
  ["wharf", "customs"],
  ["wharf", "ropes"],
  ["wharf", "lamp"],
  ["lamp", "cave"],
  ["wharf", "cellar"],
  ["yard", "spit"],
  ["customs", "shrine"],
  ["shrine", "sluice"],
  ["ropes", "shed"],
  ["ropes", "docks"],
  ["spit", "lane"],
  ["lane", "tea"],
  ["tea", "drums"],
  ["drums", "outer"],
  ["outer", "glass"],
  ["glass", "inner"],
];

function neighbors(id: SceneId): SceneId[] {
  const out: SceneId[] = [];
  for (const [a, b] of EDGES) {
    if (a === id) out.push(b);
    if (b === id) out.push(a);
  }
  return out;
}

export function atlasVisible(current: SceneId, visited: string[]): SceneId[] {
  const seen = new Set(visited);
  seen.add(current);
  const show = new Set<SceneId>([current]);
  for (const n of neighbors(current)) {
    if (seen.has(n)) show.add(n);
  }
  return [...show];
}

export function atlasSurvey(current: SceneId, visited: string[]): SceneId[] {
  const seen = new Set<string>([...visited, current]);
  const show = new Set<SceneId>();
  for (const id of seen) show.add(id as SceneId);
  for (const id of [...seen]) {
    for (const n of neighbors(id as SceneId)) show.add(n);
  }
  return [...show];
}

function node(id: SceneId): AtlasNode {
  return NODES.find((n) => n.id === id)!;
}

function project(ids: SceneId[], width: number, height: number): Map<SceneId, { x: number; y: number }> {
  const pad = 18;
  const placed = ids.map(node);
  const map = new Map<SceneId, { x: number; y: number }>();
  if (placed.length === 1) {
    map.set(placed[0].id, { x: width / 2, y: height / 2 });
    return map;
  }
  const xs = placed.map((n) => n.x);
  const ys = placed.map((n) => n.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const bw = Math.max(1, maxX - minX);
  const bh = Math.max(1, maxY - minY);
  const scale = Math.min((width - pad * 2) / bw, (height - pad * 2) / bh);
  const ox = (width - bw * scale) / 2 - minX * scale;
  const oy = (height - bh * scale) / 2 - minY * scale;
  for (const n of placed) {
    map.set(n.id, { x: n.x * scale + ox, y: n.y * scale + oy });
  }
  return map;
}

export function paintAtlas(
  ctx: CanvasRenderingContext2D,
  current: SceneId,
  visited: string[],
  opts?: { width?: number; height?: number; survey?: boolean; labels?: Record<string, string> },
): void {
  const width = opts?.width ?? ATLAS_W;
  const height = opts?.height ?? ATLAS_H;
  const ids = opts?.survey ? atlasSurvey(current, visited) : atlasVisible(current, visited);
  const known = new Set(visited);
  known.add(current);
  const at = project(ids, width, height);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#d4c6a4";
  ctx.fillRect(0, 0, width, height);

  for (const [a, b] of EDGES) {
    const from = at.get(a);
    const to = at.get(b);
    if (!from || !to) continue;
    ctx.strokeStyle = "#5a4030";
    ctx.lineWidth = opts?.survey ? 2 : 1.5;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }

  for (const id of ids) {
    const p = at.get(id);
    if (!p) continue;
    const here = id === current;
    const seen = known.has(id);
    const w = here ? (opts?.survey ? 22 : 14) : opts?.survey ? 16 : 10;
    const h = here ? (opts?.survey ? 16 : 10) : opts?.survey ? 12 : 7;
    ctx.globalAlpha = seen ? 1 : 0.35;
    ctx.fillStyle = here ? "#8b2a24" : "#3a2e22";
    ctx.fillRect(p.x - w / 2, p.y - h / 2, w, h);
    ctx.strokeStyle = here ? "#5a2018" : "#2a2018";
    ctx.lineWidth = here ? 2 : 1;
    ctx.strokeRect(p.x - w / 2, p.y - h / 2, w, h);
    const label = opts?.labels?.[id];
    if (label && seen) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#1a1410";
      ctx.font = "11px serif";
      ctx.textAlign = "center";
      ctx.fillText(label, p.x, p.y + h / 2 + 12);
    }
    ctx.globalAlpha = 1;
  }
}
