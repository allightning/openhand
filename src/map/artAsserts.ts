/**
 * 美术铁律断言（任务 0-B）
 */
import { getPortraitKey } from "../assets/sprites";
import { LUOYANG_NPCS } from "./npc";
import { DEFAULT_CAPS, CAP_CH, type CapKind, countAsciiProps } from "./placement";
import { generateLuoyang } from "./luoyangGen";

export function assertNoCodeDrawnSprites(src: string, path = "src"): {
  ok: boolean;
  hits: string[];
} {
  const hits: string[] = [];
  if (/function cutSprite[\s\S]*?silhouetteSvg\s*\(/.test(src)) {
    hits.push(`${path}: cutSprite still calls silhouetteSvg`);
  }
  if (/function cutSprite[\s\S]*?npc-sil-wrap/.test(src)) {
    hits.push(`${path}: cutSprite still uses npc-sil-wrap`);
  }
  return { ok: hits.length === 0, hits };
}

export function assertPortraitUniqueness(
  ids: string[],
  maxShare = 0.3,
): { ok: boolean; maxShare: number; top: string; counts: Record<string, number> } {
  const counts: Record<string, number> = {};
  for (const id of ids) {
    const key = getPortraitKey(id);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  let top = "";
  let max = 0;
  for (const [k, n] of Object.entries(counts)) {
    if (n > max) {
      max = n;
      top = k;
    }
  }
  const share = ids.length ? max / ids.length : 0;
  return { ok: share <= maxShare, maxShare: share, top, counts };
}

export function assertFurnishingCapAfterPass(ascii: string[]): {
  ok: boolean;
  over: string[];
  counts: Record<string, number>;
} {
  const flat = ascii.join("");
  const counts: Record<string, number> = {};
  const over: string[] = [];
  for (const kind of Object.keys(DEFAULT_CAPS) as CapKind[]) {
    const ch = CAP_CH[kind];
    const n = [...flat].filter((c) => c === ch).length;
    counts[kind] = n;
    if (n > DEFAULT_CAPS[kind]) over.push(`${kind}=${n}>${DEFAULT_CAPS[kind]}`);
  }
  return { ok: over.length === 0, over, counts };
}

export function assertNoNpcFurnishingOverlap(
  talkers: { id: string; x: number; y: number }[],
  props: { kind: string; x: number; y: number }[],
): { ok: boolean; hits: string[] } {
  const hits: string[] = [];
  const propAt = new Map(props.map((p) => [`${p.x},${p.y}`, p.kind]));
  for (const t of talkers) {
    const k = propAt.get(`${t.x},${t.y}`);
    if (k) hits.push(`${t.id}@${t.x},${t.y} overlaps ${k}`);
  }
  return { ok: hits.length === 0, hits };
}

export function assertNoNpcLineup(
  talkers: { id: string; x: number; y: number }[],
): { ok: boolean; lines: string[] } {
  const lines: string[] = [];
  const byRow = new Map<number, { id: string; x: number; y: number }[]>();
  const byCol = new Map<number, { id: string; x: number; y: number }[]>();
  for (const t of talkers) {
    if (!byRow.has(t.y)) byRow.set(t.y, []);
    if (!byCol.has(t.x)) byCol.set(t.x, []);
    byRow.get(t.y)!.push(t);
    byCol.get(t.x)!.push(t);
  }
  const check = (list: { id: string; x: number; y: number }[], axis: "row" | "col") => {
    const sorted = [...list].sort((a, b) => (axis === "row" ? a.x - b.x : a.y - b.y));
    let run = [sorted[0]!];
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]!;
      const cur = sorted[i]!;
      const gap = axis === "row" ? cur.x - prev.x : cur.y - prev.y;
      if (gap <= 2) run.push(cur);
      else {
        if (run.length >= 3) lines.push(`${axis} lineup: ${run.map((t) => t.id).join("/")}`);
        run = [cur];
      }
    }
    if (run.length >= 3) lines.push(`${axis} lineup: ${run.map((t) => t.id).join("/")}`);
  };
  for (const list of byRow.values()) if (list.length >= 3) check(list, "row");
  for (const list of byCol.values()) if (list.length >= 3) check(list, "col");
  return { ok: lines.length === 0, lines };
}

export function assertMapDiversity(
  yards: { key: string; chars: Set<string> }[],
  maxSim = 0.7,
): { ok: boolean; pairs: string[] } {
  const pairs: string[] = [];
  for (let i = 0; i < yards.length; i++) {
    for (let j = i + 1; j < yards.length; j++) {
      const a = yards[i]!;
      const b = yards[j]!;
      const inter = [...a.chars].filter((c) => b.chars.has(c)).length;
      const union = new Set([...a.chars, ...b.chars]).size || 1;
      const sim = inter / union;
      if (sim > maxSim && a.chars.size >= 2 && b.chars.size >= 2) {
        pairs.push(`${a.key}~${b.key} sim=${sim.toFixed(2)}`);
      }
    }
  }
  return { ok: pairs.length === 0, pairs };
}

export function luoyangArtReport() {
  const scene = generateLuoyang();
  const ids = Object.values(scene.talkers);
  return {
    portrait: assertPortraitUniqueness(ids),
    furn: assertFurnishingCapAfterPass(scene.ascii),
    props: countAsciiProps(scene.ascii),
    npcCount: new Set(ids).size,
    roster: LUOYANG_NPCS.length,
  };
}
