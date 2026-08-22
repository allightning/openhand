/**
 * 新手村：北宋中原小市井（规模约主城 1/3）
 */
export interface StarterNpc {
  id: string;
  age: "child" | "young" | "mid" | "old";
  gender: "m" | "f";
  role: string;
  x: number;
  y: number;
  dialogue: string;
  teach?: "move" | "talk" | "gather" | "fight";
}

export interface StarterVillage {
  id: "starter_village";
  w: number;
  h: number;
  features: string[];
  npcs: StarterNpc[];
  exit: { x: number; y: number; to: string };
}

export const STARTER_VILLAGE: StarterVillage = {
  id: "starter_village",
  w: 36,
  h: 22,
  features: [
    "土路",
    "茅草屋",
    "篱笆",
    "村口老树石碑",
    "水井",
    "晒谷场",
    "柴垛",
    "炊烟",
    "杂货铺",
    "豆腐坊",
    "铁匠铺",
    "村塾",
    "土地庙",
    "小桥流水",
  ],
  npcs: [
    {
      id: "sv_elder",
      age: "old",
      gender: "m",
      role: "村长",
      x: 10,
      y: 8,
      dialogue: "**孩子**，出村先走东头小路。{{汴京}}还远，莫慌。",
      teach: "talk",
    },
    {
      id: "sv_wife",
      age: "mid",
      gender: "f",
      role: "村妇",
      x: 14,
      y: 10,
      dialogue: "井边水干净。渴了自己打，别跟狗抢。",
    },
    {
      id: "sv_kid",
      age: "child",
      gender: "m",
      role: "孩童",
      x: 18,
      y: 9,
      dialogue: "俺娘说城门有金吾。你打得过吗？",
      teach: "move",
    },
    {
      id: "sv_girl",
      age: "child",
      gender: "f",
      role: "丫头",
      x: 20,
      y: 12,
      dialogue: "柴垛后面有蘑菇。{{可采集}}。",
      teach: "gather",
    },
    {
      id: "sv_smith",
      age: "mid",
      gender: "m",
      role: "铁匠",
      x: 24,
      y: 8,
      dialogue: "刀钝了来找洒家。第一场架，{{别硬拼}}。",
      teach: "fight",
    },
    {
      id: "sv_hawker",
      age: "young",
      gender: "f",
      role: "货郎",
      x: 12,
      y: 14,
      dialogue: "豆腐一块三文。出村的路在村尾。",
    },
    {
      id: "sv_watch",
      age: "mid",
      gender: "m",
      role: "更夫",
      x: 8,
      y: 6,
      dialogue: "夜里别瞎走。豺狗会叫。",
    },
  ],
  exit: { x: 34, y: 11, to: "wild_starter_bianjing" },
};

export function assertStarterVillage(v: StarterVillage = STARTER_VILLAGE): {
  ok: boolean;
  male: number;
  female: number;
  ratio: number;
  reasons: string[];
} {
  const reasons: string[] = [];
  if (v.features.length < 10) reasons.push("市井要素不足");
  if (v.npcs.length < 6) reasons.push("NPC 不足");
  if (!v.npcs.some((n) => n.age === "child")) reasons.push("缺孩童");
  const male = v.npcs.filter((n) => n.gender === "m").length;
  const female = v.npcs.filter((n) => n.gender === "f").length;
  const ratio = female ? male / female : 99;
  if (ratio < 1.2 || ratio > 1.8) reasons.push(`男女比 ${ratio.toFixed(2)} 偏离 1.5±0.3`);
  if (!v.npcs.some((n) => n.teach)) reasons.push("缺教学嵌入");
  return { ok: reasons.length === 0, male, female, ratio, reasons };
}
