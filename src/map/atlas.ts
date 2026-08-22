import type { SceneId } from "./types";

/** Corner chip size. */
export const ATLAS_W = 128;
export const ATLAS_H = 72;
/** Opened map ~70% of a typical game stage (CSS also scales). */
export const ATLAS_ZOOM_W = 960;
export const ATLAS_ZOOM_H = 640;

interface AtlasNode {
  id: SceneId;
  x: number;
  y: number;
  /** Short label for zoom map (optional override). */
  short?: string;
}

const NODES: AtlasNode[] = [
  { id: "hut", x: 0, y: 0, short: "茅屋" },
  { id: "plot", x: 1, y: 0, short: "土坡" },
  { id: "ridge", x: 2, y: 0, short: "岗坡" },
  { id: "salt", x: 0, y: 1 },
  { id: "hold", x: 1, y: 1, short: "西仓" },
  { id: "wharf", x: 2, y: 1, short: "港湾" },
  { id: "yard", x: 3, y: 1, short: "印院" },
  { id: "spit", x: 4, y: 1, short: "沙嘴" },
  { id: "customs", x: 3, y: 0, short: "税卡" },
  { id: "shrine", x: 4, y: 0 },
  { id: "sluice", x: 5, y: 0 },
  { id: "ropes", x: 1, y: 2, short: "缆厂" },
  { id: "pit", x: 0, y: 2, short: "桩场" },
  { id: "docks", x: 0, y: 3 },
  { id: "shed", x: 1, y: 3 },
  { id: "lamp", x: 3, y: 2, short: "灯楼" },
  { id: "cave", x: 3, y: 3 },
  { id: "cellar", x: 2, y: 2 },
  { id: "lane", x: 4, y: 2, short: "垂街" },
  { id: "tea", x: 3, y: 4 },
  { id: "drums", x: 2, y: 4 },
  { id: "outer", x: 2, y: 5 },
  { id: "palace", x: 2, y: 6 },
  { id: "glass", x: 3, y: 5 },
  { id: "inner", x: 4, y: 5 },
  { id: "ferry", x: 5, y: 1 },
  { id: "isle", x: 6, y: 1 },
  { id: "yamen", x: 2, y: -1, short: "衙门" },
  { id: "wine", x: 5, y: 2, short: "酒楼" },
  { id: "wineUp", x: 5, y: 1.5 },
  { id: "flower", x: 1, y: 4 },
  { id: "clinic", x: 5, y: 3, short: "医馆" },
  { id: "pier", x: 2, y: 3, short: "码头" },
  { id: "pawn", x: 5, y: 4 },
  { id: "escort", x: 0, y: 4 },
  { id: "martial", x: 4, y: 3, short: "武馆" },
  { id: "lodge", x: 4, y: 4, short: "客栈" },
  { id: "railNight", x: 5, y: 5 },
  { id: "seerGaze", x: 3, y: 6 },
  { id: "sapperPile", x: 0, y: 5 },
  { id: "taxMarket", x: 3.5, y: -0.5, short: "税市" },
  { id: "ropeMarket", x: 1.5, y: 2.5, short: "缆市" },
  { id: "changan", x: 0, y: 0, short: "长安" },
  { id: "tongguan", x: 2, y: 0, short: "潼关" },
  { id: "shanzhou", x: 3, y: 0, short: "陕州" },
  { id: "luoyang", x: 5, y: 0, short: "洛阳" },
  { id: "yanshi", x: 6, y: 1, short: "偃师" },
  { id: "bozhou", x: 7, y: 2, short: "亳州" },
  { id: "bianjing", x: 9, y: 0, short: "汴京" },
  { id: "shaolin", x: 8, y: -1, short: "少室" },
  { id: "luohan", x: 8, y: -2 },
  { id: "usurpCamp", x: 11, y: 0, short: "汴营" },
  { id: "suzhousu", x: 9, y: 1, short: "宿州" },
  { id: "suqian", x: 8, y: 2, short: "宿迁" },
  { id: "huainan", x: 7, y: 3, short: "淮阴" },
  { id: "gaoyou", x: 10, y: 2, short: "高邮" },
  { id: "yangzhou", x: 11, y: 3, short: "扬州" },
  { id: "chuzhou", x: 7, y: 4, short: "滁州" },
  { id: "jiankang", x: 8, y: 5, short: "建康" },
  { id: "changzhou", x: 9, y: 5, short: "常州" },
  { id: "wuxi", x: 10, y: 6, short: "无锡" },
  { id: "suzhou", x: 11, y: 6, short: "苏州" },
  { id: "jiaxing", x: 11, y: 7, short: "嘉兴" },
  { id: "linan", x: 12, y: 8, short: "临安" },
];

const EDGES: [SceneId, SceneId][] = [
  ["hut", "plot"],
  ["plot", "ridge"],
  ["ridge", "wharf"],
  ["ridge", "yamen"],
  ["salt", "hold"],
  ["hold", "wharf"],
  ["wharf", "yard"],
  ["wharf", "customs"],
  ["wharf", "ropes"],
  ["wharf", "lamp"],
  ["wharf", "pier"],
  ["pier", "flower"],
  ["pier", "escort"],
  ["lamp", "cave"],
  ["wharf", "cellar"],
  ["yard", "spit"],
  ["customs", "shrine"],
  ["customs", "taxMarket"],
  ["ropes", "ropeMarket"],
  ["shrine", "sluice"],
  ["ropes", "shed"],
  ["ropes", "docks"],
  ["ropes", "pit"],
  ["spit", "lane"],
  ["spit", "ferry"],
  ["ferry", "isle"],
  ["lane", "tea"],
  ["lane", "wine"],
  ["wine", "wineUp"],
  ["lane", "clinic"],
  ["lane", "martial"],
  ["lane", "pawn"],
  ["lane", "lodge"],
  ["tea", "drums"],
  ["drums", "outer"],
  ["outer", "glass"],
  ["outer", "palace"],
  ["glass", "inner"],
  ["lane", "railNight"],
  ["customs", "seerGaze"],
  ["ropes", "sapperPile"],
  ["wharf", "huainan"],
  ["customs", "huainan"],
  ["ropes", "huainan"],
  ["huainan", "suqian"],
  ["huainan", "bozhou"],
  ["huainan", "yangzhou"],
  ["huainan", "chuzhou"],
  ["suqian", "suzhousu"],
  ["suzhousu", "bianjing"],
  ["suzhousu", "gaoyou"],
  ["bozhou", "yanshi"],
  ["yanshi", "luoyang"],
  ["luoyang", "shanzhou"],
  ["shanzhou", "tongguan"],
  ["tongguan", "changan"],
  ["luoyang", "bianjing"],
  ["bianjing", "usurpCamp"],
  ["bianjing", "shaolin"],
  ["shaolin", "luohan"],
  ["bianjing", "gaoyou"],
  ["gaoyou", "yangzhou"],
  ["yangzhou", "jiankang"],
  ["chuzhou", "jiankang"],
  ["jiankang", "changzhou"],
  ["changzhou", "wuxi"],
  ["wuxi", "suzhou"],
  ["suzhou", "jiaxing"],
  ["jiaxing", "linan"],
];

/** Hubs clustered near origin; metro uses larger east coords — paint as regions. */
const HUB_IDS = new Set<SceneId>([
  "hut",
  "plot",
  "ridge",
  "wharf",
  "yard",
  "spit",
  "customs",
  "ropes",
  "pit",
  "lane",
  "lamp",
  "pier",
  "martial",
  "wine",
  "lodge",
  "clinic",
  "yamen",
  "taxMarket",
  "ropeMarket",
  "hold",
  "docks",
  "shed",
]);

const PRIMARY = new Set<SceneId>([
  "hut",
  "plot",
  "ridge",
  "wharf",
  "yard",
  "spit",
  "lane",
  "tea",
  "drums",
  "outer",
  "palace",
  "ferry",
  "isle",
  "pit",
  "huainan",
  "yangzhou",
  "jiankang",
  "suzhou",
  "linan",
  "changan",
  "luoyang",
  "bianjing",
  "usurpCamp",
]);

export function atlasVisible(current: SceneId, visited: string[]): SceneId[] {
  const seen = new Set(visited);
  const out = new Set<SceneId>([current]);
  for (const [a, b] of EDGES) {
    if (a === current && seen.has(b)) out.add(b);
    if (b === current && seen.has(a)) out.add(a);
  }
  return [...out];
}

export function atlasSurvey(current: SceneId, visited: string[]): SceneId[] {
  const seen = new Set(visited);
  seen.add(current);
  const out = new Set<SceneId>(seen as Set<SceneId>);
  for (const id of seen) {
    for (const [a, b] of EDGES) {
      if (a === id) out.add(b);
      if (b === id) out.add(a);
    }
  }
  return [...out];
}

function node(id: SceneId): AtlasNode {
  return NODES.find((n) => n.id === id)!;
}

export function atlasNode(id: SceneId): { x: number; y: number } {
  const n = node(id);
  return { x: n.x, y: n.y };
}

function project(ids: SceneId[], width: number, height: number): Map<SceneId, { x: number; y: number }> {
  const pad = Math.max(28, Math.min(width, height) * 0.06);
  const placed = ids.map(node).filter(Boolean);
  const map = new Map<SceneId, { x: number; y: number }>();
  if (placed.length === 0) return map;
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

function shortName(id: SceneId, labels?: Record<string, string>): string {
  const n = NODES.find((x) => x.id === id);
  if (n?.short) return n.short;
  const full = labels?.[id] ?? id;
  const head = full.split("·")[0] ?? full;
  return head.length > 4 ? head.slice(0, 4) : head;
}

function drawRegionWash(
  ctx: CanvasRenderingContext2D,
  at: Map<SceneId, { x: number; y: number }>,
  ids: SceneId[],
  fill: string,
): void {
  const pts = ids.map((id) => at.get(id)).filter(Boolean) as { x: number; y: number }[];
  if (pts.length < 2) return;
  const pad = 36;
  const minX = Math.min(...pts.map((p) => p.x)) - pad;
  const maxX = Math.max(...pts.map((p) => p.x)) + pad;
  const minY = Math.min(...pts.map((p) => p.y)) - pad;
  const maxY = Math.max(...pts.map((p) => p.y)) + pad;
  ctx.fillStyle = fill;
  ctx.beginPath();
  const r = 18;
  ctx.moveTo(minX + r, minY);
  ctx.arcTo(maxX, minY, maxX, maxY, r);
  ctx.arcTo(maxX, maxY, minX, maxY, r);
  ctx.arcTo(minX, maxY, minX, minY, r);
  ctx.arcTo(minX, minY, maxX, minY, r);
  ctx.closePath();
  ctx.fill();
}

export function paintAtlas(
  ctx: CanvasRenderingContext2D,
  current: SceneId,
  visited: string[],
  opts?: { width?: number; height?: number; survey?: boolean; labels?: Record<string, string> },
): void {
  const width = opts?.width ?? ATLAS_W;
  const height = opts?.height ?? ATLAS_H;
  const zoom = Boolean(opts?.survey) && width >= 400;
  const ids = opts?.survey ? atlasSurvey(current, visited) : atlasVisible(current, visited);
  const known = new Set(visited);
  known.add(current);
  const at = project(ids, width, height);
  ctx.clearRect(0, 0, width, height);

  // Parchment ground
  const g = ctx.createLinearGradient(0, 0, 0, height);
  g.addColorStop(0, "#e8dcc0");
  g.addColorStop(1, "#d4c6a4");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);

  if (zoom) {
    const hubShown = ids.filter((id) => HUB_IDS.has(id));
    const roadShown = ids.filter((id) => !HUB_IDS.has(id));
    drawRegionWash(ctx, at, hubShown, "#cbb89655");
    drawRegionWash(ctx, at, roadShown, "#a8b89a44");
    // Region titles
    const hubPts = hubShown.map((id) => at.get(id)).filter(Boolean) as { x: number; y: number }[];
    if (hubPts.length) {
      ctx.fillStyle = "#5a403088";
      ctx.font = "bold 14px serif";
      ctx.textAlign = "left";
      ctx.fillText("港湾一带", Math.min(...hubPts.map((p) => p.x)) - 20, Math.min(...hubPts.map((p) => p.y)) - 22);
    }
    const roadPts = roadShown.map((id) => at.get(id)).filter(Boolean) as { x: number; y: number }[];
    if (roadPts.length) {
      ctx.fillStyle = "#3a504088";
      ctx.font = "bold 14px serif";
      ctx.textAlign = "left";
      ctx.fillText("官道诸城", Math.min(...roadPts.map((p) => p.x)) - 12, Math.min(...roadPts.map((p) => p.y)) - 22);
    }
  }

  // Roads: thick soft underlay + dark stroke (less spiderweb)
  for (const [a, b] of EDGES) {
    const from = at.get(a);
    const to = at.get(b);
    if (!from || !to) continue;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#b8a888";
    ctx.lineWidth = zoom ? 10 : 3;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.strokeStyle = "#6a5040";
    ctx.lineWidth = zoom ? 3.5 : 1.5;
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
    const major = PRIMARY.has(id);
    const w = here ? (zoom ? 28 : 12) : major ? (zoom ? 22 : 10) : zoom ? 14 : 6;
    const h = here ? (zoom ? 20 : 9) : major ? (zoom ? 16 : 8) : zoom ? 11 : 5;
    ctx.globalAlpha = seen ? 1 : 0.4;
    // Rounded node
    const x0 = p.x - w / 2;
    const y0 = p.y - h / 2;
    const rr = zoom ? 4 : 2;
    ctx.fillStyle = here ? "#8b2a24" : major ? "#2a2018" : "#4a3a30";
    ctx.beginPath();
    ctx.moveTo(x0 + rr, y0);
    ctx.arcTo(x0 + w, y0, x0 + w, y0 + h, rr);
    ctx.arcTo(x0 + w, y0 + h, x0, y0 + h, rr);
    ctx.arcTo(x0, y0 + h, x0, y0, rr);
    ctx.arcTo(x0, y0, x0 + w, y0, rr);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = here ? "#f4ead6" : "#1a1410";
    ctx.lineWidth = here ? 2.5 : 1;
    ctx.stroke();

    const label = zoom ? shortName(id, opts?.labels) : opts?.labels?.[id];
    if (label && (seen || zoom)) {
      ctx.globalAlpha = seen ? 1 : 0.55;
      ctx.fillStyle = "#1a1410";
      ctx.font = zoom ? (major || here ? "bold 13px serif" : "12px serif") : "10px serif";
      ctx.textAlign = "center";
      ctx.fillText(label, p.x, p.y + h / 2 + (zoom ? 16 : 11));
    }
    ctx.globalAlpha = 1;
  }

  if (zoom) {
    ctx.fillStyle = "#8b2a24";
    ctx.font = "12px serif";
    ctx.textAlign = "left";
    ctx.fillText("■ 你在此处", 24, height - 20);
    ctx.fillStyle = "#2a2018";
    ctx.fillText("■ 已至大城", 120, height - 20);
    ctx.fillStyle = "#5a4030";
    ctx.fillText("点空白关闭", width - 110, height - 20);
  }
}
