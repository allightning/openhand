/**
 * 大型景物多格足迹 — V4：多格仅限室内/院内；室外一律 1×1
 */
import type { Prop, PropKind, Tile } from "./types";

export function propFootprint(
  kind: PropKind,
  tag?: string,
  opts?: { outdoor?: boolean },
): { w: number; h: number } {
  // 室外马路上禁止巨型家具
  if (opts?.outdoor) return { w: 1, h: 1 };
  if (kind === "cart") return { w: 2, h: 1 };
  if (kind === "counter") return { w: 3, h: 1 };
  if (kind === "screen") return { w: 2, h: 1 };
  if (kind === "table") return { w: 2, h: 1 };
  if (kind === "rack") return { w: 2, h: 1 };
  if (kind === "desk" && tag === "long") return { w: 2, h: 1 };
  return { w: 1, h: 1 };
}

export function propCovers(p: Prop, x: number, y: number): boolean {
  const w = p.spanW ?? 1;
  const h = p.spanH ?? 1;
  return x >= p.x && x < p.x + w && y >= p.y && y < p.y + h;
}

function isOutdoorTile(tiles: Tile[][] | undefined, x: number, y: number): boolean {
  if (!tiles?.[y]) return false;
  const t = tiles[y]![x];
  return t === "road" || t === "pack" || t === "gate";
}

export function applyPropFootprints(props: Prop[], tiles?: Tile[][], scene?: string): void {
  // 室外柜台直接剔除（马路巨型柜台）
  for (let i = props.length - 1; i >= 0; i--) {
    const p = props[i]!;
    if (p.kind === "counter" && isOutdoorTile(tiles, p.x, p.y)) {
      props.splice(i, 1);
      continue;
    }
    // 室外大地图禁屏风/床榻（室内二级场景保留）
    if (scene === "luoyang" && (p.kind === "screen" || p.kind === "bed")) {
      props.splice(i, 1);
      continue;
    }
    // 水/山上的陈设 = 幽灵墙
    const tile = tiles?.[p.y]?.[p.x];
    if (tile === "water" || tile === "hill") {
      props.splice(i, 1);
      continue;
    }
    // 室外树上路 → 剔除
    if (p.kind === "tree" && tiles?.[p.y]?.[p.x] === "road") {
      props.splice(i, 1);
    }
  }

  for (const p of props) {
    const outdoor = isOutdoorTile(tiles, p.x, p.y);
    const fp = propFootprint(p.kind, p.tag, { outdoor });
    p.spanW = fp.w;
    p.spanH = fp.h;
  }

  for (let i = props.length - 1; i >= 0; i--) {
    const p = props[i]!;
    if ((p.spanW ?? 1) <= 1 && (p.spanH ?? 1) <= 1) continue;
    const earlier = props.slice(0, i).some(
      (m) => ((m.spanW ?? 1) > 1 || (m.spanH ?? 1) > 1) && footprintsOverlap(m, p),
    );
    if (earlier) props.splice(i, 1);
  }

  const primaries = props.filter((p) => (p.spanW ?? 1) > 1 || (p.spanH ?? 1) > 1);
  for (let i = props.length - 1; i >= 0; i--) {
    const p = props[i]!;
    if ((p.spanW ?? 1) > 1 || (p.spanH ?? 1) > 1) continue;
    const hit = primaries.some(
      (m) => m !== p && propCovers(m, p.x, p.y) && !(m.x === p.x && m.y === p.y),
    );
    if (hit) props.splice(i, 1);
  }
}

function footprintsOverlap(a: Prop, b: Prop): boolean {
  const aw = a.spanW ?? 1;
  const ah = a.spanH ?? 1;
  const bw = b.spanW ?? 1;
  const bh = b.spanH ?? 1;
  return !(a.x + aw <= b.x || b.x + bw <= a.x || a.y + ah <= b.y || b.y + bh <= a.y);
}
