/**
 * 北宋交通网：汴京枢纽 + 地理铁律校验
 */
export type TransitMode = "road" | "river" | "mountain";

export interface TransitEdge {
  from: string;
  to: string;
  mode: TransitMode;
  via?: string; // 郊野节点
}

/** 一级：主城互达（链式，非全星形直连） */
export const PRIMARY_EDGES: TransitEdge[] = [
  { from: "bianjing", to: "luoyang", mode: "road", via: "wild_bian_luo" },
  { from: "bianjing", to: "yanshi", mode: "road", via: "wild_bian_yan" },
  { from: "luoyang", to: "shanzhou", mode: "road", via: "wild_luo_shan" },
  { from: "bianjing", to: "yangzhou", mode: "river", via: "wild_bian_yang" },
  { from: "yangzhou", to: "linan", mode: "river", via: "wild_yang_lin" },
  { from: "linan", to: "suzhou", mode: "road", via: "wild_lin_su" },
  { from: "yangzhou", to: "guangzhou", mode: "river", via: "wild_yang_guang" },
  { from: "bianjing", to: "daming", mode: "road", via: "wild_bian_da" },
  { from: "daming", to: "yanmenguan", mode: "mountain", via: "wild_da_yan" },
  { from: "bianjing", to: "chengdu", mode: "mountain", via: "wild_bian_cheng" },
  { from: "bianjing", to: "taishan", mode: "road", via: "wild_bian_tai" },
  { from: "bianjing", to: "yingtian", mode: "road", via: "wild_bian_ying" },
  { from: "luoyang", to: "songshan", mode: "mountain", via: "wild_luo_song" },
  { from: "bianjing", to: "huashan", mode: "mountain", via: "wild_bian_hua" },
];

export function validateTransitNetwork(edges: TransitEdge[] = PRIMARY_EDGES): {
  ok: boolean;
  islands: string[];
  oneWay: string[];
  report: string[];
} {
  const report: string[] = [];
  const nodes = new Set<string>();
  const undirected = new Map<string, Set<string>>();
  const directed = new Map<string, Set<string>>();
  const add = (m: Map<string, Set<string>>, a: string, b: string) => {
    if (!m.has(a)) m.set(a, new Set());
    m.get(a)!.add(b);
  };
  for (const e of edges) {
    nodes.add(e.from);
    nodes.add(e.to);
    add(undirected, e.from, e.to);
    add(undirected, e.to, e.from);
    add(directed, e.from, e.to);
    // 一级默认双向
    add(directed, e.to, e.from);
  }
  if (!nodes.has("bianjing")) report.push("缺少汴京枢纽");
  // 地理铁律抽样
  const must = [
    ["bianjing", "luoyang"],
    ["bianjing", "yangzhou"],
    ["bianjing", "daming"],
    ["bianjing", "chengdu"],
    ["bianjing", "taishan"],
  ];
  for (const [a, b] of must) {
    if (!undirected.get(a)?.has(b)) report.push(`地理铁律缺失: ${a}<->${b}`);
  }
  // BFS 连通
  const start = "bianjing";
  const seen = new Set<string>([start]);
  const q = [start];
  while (q.length) {
    const cur = q.pop()!;
    for (const n of undirected.get(cur) ?? []) {
      if (seen.has(n)) continue;
      seen.add(n);
      q.push(n);
    }
  }
  const islands = [...nodes].filter((n) => !seen.has(n));
  const oneWay: string[] = [];
  for (const e of edges) {
    if (!directed.get(e.to)?.has(e.from)) oneWay.push(`${e.from}->${e.to}`);
  }
  const ok = islands.length === 0 && oneWay.length === 0 && report.length === 0;
  if (ok) report.push(`连通 OK：${nodes.size} 城，${edges.length} 边，汴京枢纽`);
  return { ok, islands, oneWay, report };
}
