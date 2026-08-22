/**
 * NPC / 物件落点：碰撞检测、限频、语义化保留
 */
export type PlaceOcc = Set<string>;

const BLOCK_CHARS = new Set("#~^%*".split(""));
/** 非堆叠类物件（同格不可再放） */
const FURNISH_CHARS = new Set("vbptj&gdkfmyzuqhic*,oalfzr".split(""));

export function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

export function gridGet(g: string[], x: number, y: number): string {
  if (y < 0 || y >= g.length || x < 0 || x >= (g[0]?.length ?? 0)) return "#";
  return g[y]![x]!;
}

export function gridSet(g: string[], x: number, y: number, ch: string): void {
  if (y < 0 || y >= g.length || x < 0 || x >= (g[0]?.length ?? 0)) return;
  const row = g[y]!;
  g[y] = row.slice(0, x) + ch + row.slice(x + 1);
}

export function isFree(
  g: string[],
  x: number,
  y: number,
  occupied: PlaceOcc,
  opts?: { allowRoad?: boolean; allowCh?: string },
): boolean {
  if (occupied.has(cellKey(x, y))) return false;
  const ch = gridGet(g, x, y);
  if (opts?.allowCh && ch === opts.allowCh) return true;
  if (BLOCK_CHARS.has(ch)) return false;
  if (FURNISH_CHARS.has(ch)) return false;
  if (ch === ".") return true;
  if (opts?.allowRoad && (ch === "=" || ch === "-")) return true;
  if (ch !== "." && ch !== "=" && ch !== "-" && ch !== ":") return false;
  return false;
}

export interface PlaceNpcResult {
  id: string;
  from: { x: number; y: number } | null;
  to: { x: number; y: number };
  overlapped: boolean;
  ok: boolean;
  reason?: string;
}

/**
 * 落点前检查占用；若占用则扩圈找最近空闲格（院内→全图）。
 * 失败时 ok=false 并带 reason，调用方必须报错，禁止静默丢弃。
 */
export function placeNpc(
  g: string[],
  npc: { id: string; ch: string; x?: number; y?: number },
  occupied: PlaceOcc,
  yard?: { x: number; y: number; w: number; h: number },
): PlaceNpcResult {
  const prefer = npc.x != null && npc.y != null ? [{ x: npc.x, y: npc.y }] : [];
  const candidates: { x: number; y: number; dist: number }[] = [];
  const pushCand = (x: number, y: number, dist: number) => {
    if (!isFree(g, x, y, occupied, { allowRoad: false, allowCh: npc.ch })) return;
    candidates.push({ x, y, dist });
  };

  for (const p of prefer) pushCand(p.x, p.y, 0);

  const ox = yard?.x ?? Math.max(0, (npc.x ?? 0) - 6);
  const oy = yard?.y ?? Math.max(0, (npc.y ?? 0) - 6);
  const ow = yard?.w ?? 14;
  const oh = yard?.h ?? 12;
  const originX = npc.x ?? ox + Math.floor(ow / 2);
  const originY = npc.y ?? oy + Math.floor(oh / 2);

  for (let r = 1; r <= 24; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = originX + dx;
        const y = originY + dy;
        if (yard && r <= 12) {
          if (x <= yard.x || y <= yard.y || x >= yard.x + yard.w - 1 || y >= yard.y + yard.h - 1) continue;
        }
        pushCand(x, y, Math.abs(dx) + Math.abs(dy));
      }
    }
    if (candidates.some((c) => c.dist > 0)) break;
  }

  if (yard && !candidates.length) {
    for (let y = yard.y + 1; y < yard.y + yard.h - 1; y++) {
      for (let x = yard.x + 1; x < yard.x + yard.w - 1; x++) {
        pushCand(x, y, 99);
      }
    }
  }

  if (!candidates.length) {
    for (let y = 1; y < g.length - 1; y++) {
      for (let x = 1; x < (g[0]?.length ?? 0) - 1; x++) {
        pushCand(x, y, Math.abs(x - originX) + Math.abs(y - originY) + 200);
      }
    }
  }

  candidates.sort((a, b) => a.dist - b.dist);
  const pick = candidates[0];
  const from = npc.x != null && npc.y != null ? { x: npc.x, y: npc.y } : null;
  if (!pick) {
    return {
      id: npc.id,
      from,
      to: from ?? { x: ox + 1, y: oy + 1 },
      overlapped: true,
      ok: false,
      reason: `无空闲格（物件/墙/水占满，疑似车或陈设泛滥）`,
    };
  }

  const moved = Boolean(from && (from.x !== pick.x || from.y !== pick.y));
  if (from && moved) {
    const cur = gridGet(g, from.x, from.y);
    if (cur === npc.ch) gridSet(g, from.x, from.y, ".");
    occupied.delete(cellKey(from.x, from.y));
  }
  gridSet(g, pick.x, pick.y, npc.ch);
  occupied.add(cellKey(pick.x, pick.y));
  return {
    id: npc.id,
    from,
    to: { x: pick.x, y: pick.y },
    overlapped: moved,
    ok: true,
  };
}

export type CapKind = "barrel" | "tree" | "lantern" | "jar" | "cart" | "post";

export const CAP_CH: Record<CapKind, string> = {
  barrel: "b",
  tree: "&",
  lantern: "l",
  jar: "j",
  cart: "f",
  post: "p",
};

export const DEFAULT_CAPS: Record<CapKind, number> = {
  barrel: 6,
  tree: 15,
  lantern: 10,
  jar: 4,
  cart: 8,
  post: 10,
};

const SEMANTIC_NEAR: Record<CapKind, string[]> = {
  barrel: ["~", "*", "q", "!", "="],
  tree: ["#", "~"],
  lantern: ["#", "!", ":"],
  jar: ["q", "m", "y", "*"],
  cart: ["p", "=", "~", ":"],
  post: ["#", "z", "d"], // 墙根/武馆木人旁
};

export function capFurnishing(
  g: string[],
  kind: CapKind,
  maxPerMap: number = DEFAULT_CAPS[kind],
): { before: number; after: number; removed: { x: number; y: number }[] } {
  const ch = CAP_CH[kind];
  const cells: { x: number; y: number; score: number }[] = [];
  for (let y = 0; y < g.length; y++) {
    for (let x = 0; x < (g[0]?.length ?? 0); x++) {
      if (gridGet(g, x, y) !== ch) continue;
      let score = 0;
      for (const near of SEMANTIC_NEAR[kind]) {
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            if (gridGet(g, x + dx, y + dy) === near) score += 3 - Math.max(Math.abs(dx), Math.abs(dy));
          }
        }
      }
      if (kind !== "cart") {
        if (gridGet(g, x, y - 1) === "=" || gridGet(g, x, y + 1) === "=") score -= 2;
      } else {
        let walls = 0;
        for (const [dx, dy] of [
          [0, 1],
          [0, -1],
          [1, 0],
          [-1, 0],
        ] as const) {
          if (gridGet(g, x + dx, y + dy) === "#") walls += 1;
        }
        if (walls >= 2) score -= 4;
      }
      cells.push({ x, y, score });
    }
  }
  const before = cells.length;
  cells.sort((a, b) => b.score - a.score);
  const keep = cells.slice(0, maxPerMap);
  const drop = cells.slice(maxPerMap);
  for (const d of drop) gridSet(g, d.x, d.y, ".");
  return { before, after: keep.length, removed: drop.map((d) => ({ x: d.x, y: d.y })) };
}

export function capAllFurnishings(g: string[]): Record<CapKind, { before: number; after: number }> {
  const out = {} as Record<CapKind, { before: number; after: number }>;
  for (const kind of Object.keys(DEFAULT_CAPS) as CapKind[]) {
    const r = capFurnishing(g, kind);
    out[kind] = { before: r.before, after: r.after };
  }
  return out;
}

export type FurnishKind = CapKind | "brazier" | "stall" | "well" | "stele";

const ENSURE_CH: Record<FurnishKind, string> = {
  barrel: "b",
  tree: "&",
  lantern: "l",
  jar: "j",
  cart: "f",
  post: "p",
  brazier: "*",
  stall: "v",
  well: "o",
  stele: "!",
};

export function ensureFurnishingMins(
  g: string[],
  mins: Partial<Record<FurnishKind, number>>,
  anchors: { kind: FurnishKind; spots: { x: number; y: number }[] }[],
  occupied?: PlaceOcc,
): Record<string, { before: number; after: number }> {
  const count = (ch: string) => {
    let n = 0;
    for (const row of g) for (const c of row) if (c === ch) n++;
    return n;
  };
  const report: Record<string, { before: number; after: number }> = {};
  for (const [kind, min] of Object.entries(mins) as [FurnishKind, number][]) {
    const ch = ENSURE_CH[kind];
    const before = count(ch);
    let need = Math.max(0, min - before);
    if (need <= 0) {
      report[kind] = { before, after: before };
      continue;
    }
    const spots = anchors.filter((a) => a.kind === kind).flatMap((a) => a.spots);
    for (const s of spots) {
      if (need <= 0) break;
      for (const [dx, dy] of [
        [0, 0],
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [2, 0],
        [0, 2],
        [1, 1],
      ] as const) {
        if (need <= 0) break;
        const x = s.x + dx;
        const y = s.y + dy;
        if (gridGet(g, x, y) !== ".") continue;
        if (occupied?.has(cellKey(x, y))) continue;
        gridSet(g, x, y, ch);
        occupied?.add(cellKey(x, y));
        need -= 1;
      }
    }
    report[kind] = { before, after: count(ch) };
  }
  return report;
}

export function findOverlaps(
  g: string[],
  talkers: Record<string, string>,
): { ch: string; id: string; x: number; y: number; reason: string }[] {
  const hits: { ch: string; id: string; x: number; y: number; reason: string }[] = [];
  const seenPos = new Map<string, string>();
  for (let y = 0; y < g.length; y++) {
    for (let x = 0; x < (g[0]?.length ?? 0); x++) {
      const ch = gridGet(g, x, y);
      const id = talkers[ch];
      if (!id) continue;
      const k = cellKey(x, y);
      if (seenPos.has(k)) {
        hits.push({ ch, id, x, y, reason: `overlap talker ${seenPos.get(k)}` });
      } else seenPos.set(k, id);
    }
  }
  return hits;
}

export function countAsciiProps(g: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of g) {
    for (const ch of row) {
      if (".#=~^%:@-".includes(ch)) continue;
      out[ch] = (out[ch] ?? 0) + 1;
    }
  }
  return out;
}
