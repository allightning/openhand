/**
 * 郊野过渡图框架：地形 + 固定资源点 + 短支线 NPC 槽位
 */
export type WildResource = "wood" | "ore" | "herb" | "water";

export interface WildResourceSpot {
  kind: WildResource;
  x: number;
  y: number;
  label: string;
}

export interface WildNpcSlot {
  id: string;
  role: string;
  x: number;
  y: number;
  quest: string;
  dialogue: string;
}

export interface WildernessDef {
  id: string;
  hub: string;
  next: string;
  w: number;
  h: number;
  /** ASCII 简图（生成器可扩展） */
  terrainNote: string;
  resources: WildResourceSpot[];
  npcs: WildNpcSlot[];
  secrets: { id: string; kind: "cave" | "temple" | "ruin" | "ferry"; x: number; y: number }[];
}

const HUBS = [
  "bianjing",
  "luoyang",
  "yangzhou",
  "linan",
  "suzhou",
  "guangzhou",
  "daming",
  "yanmenguan",
  "chengdu",
  "taishan",
  "yingtian",
  "songshan",
  "huashan",
] as const;

function makeWild(hub: string, next: string, seed: number): WildernessDef {
  const id = `wild_${hub}_${next}`;
  const ox = 4 + (seed % 5);
  const oy = 6 + (seed % 3);
  return {
    id,
    hub,
    next,
    w: 48,
    h: 28,
    terrainNote: "土路+树林+溪流+农田+山坡；物件限频沿用 placement 标准",
    resources: [
      { kind: "wood", x: ox, y: oy, label: "可采集 木头" },
      { kind: "wood", x: ox + 8, y: oy + 2, label: "可采集 木头" },
      { kind: "ore", x: ox + 20, y: oy + 4, label: "可采集 矿石" },
      { kind: "ore", x: ox + 24, y: oy + 1, label: "可采集 矿石" },
      { kind: "herb", x: ox + 12, y: oy + 10, label: "可采集 药草" },
      { kind: "herb", x: ox + 14, y: oy + 12, label: "可采集 药草" },
      { kind: "water", x: ox + 6, y: oy + 14, label: "可采集 水源" },
      { kind: "water", x: ox + 18, y: oy + 14, label: "可采集 水源" },
    ],
    npcs: [
      {
        id: `${id}_woodcut`,
        role: "樵夫",
        x: ox + 3,
        y: oy + 1,
        quest: "short_wood",
        dialogue: "**官人**慢走。山里风硬，{{小心豺狗}}。",
      },
      {
        id: `${id}_herbal`,
        role: "采药人",
        x: ox + 13,
        y: oy + 11,
        quest: "short_herb",
        dialogue: "小可采的是柴胡。{{贯}}不够，卖不了好货。",
      },
      {
        id: `${id}_beggar`,
        role: "乞丐",
        x: ox + 22,
        y: oy + 8,
        quest: "short_rumor",
        dialogue: "俺听过渡口有人卖{{通关文牒}}——真假不知。",
      },
    ],
    secrets: [
      { id: `${id}_cave`, kind: "cave", x: ox + 28, y: oy + 3 },
      { id: `${id}_ruin`, kind: "ruin", x: ox + 10, y: oy + 16 },
    ],
  };
}

export const WILDERNESS: WildernessDef[] = HUBS.map((hub, i) => {
  const next = HUBS[(i + 1) % HUBS.length]!;
  return makeWild(hub, next, i * 17 + 3);
});

export function wildernessByHub(hub: string): WildernessDef | undefined {
  return WILDERNESS.find((w) => w.hub === hub);
}

export function assertWildernessCaps(w: WildernessDef): { ok: boolean; reason?: string } {
  if (w.resources.length < 6) return { ok: false, reason: "资源点不足" };
  if (w.npcs.length < 3) return { ok: false, reason: "郊野 NPC 不足" };
  if (w.secrets.length < 1) return { ok: false, reason: "缺少隐藏点" };
  return { ok: true };
}
