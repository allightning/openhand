/**
 * 洛阳 NPC 表：四维度立绘 + 院落归属（走 npcSprite / placement 全局标准）
 */
import {
  assertGenderRatio,
  assertSpriteUniqueness,
  JOB_PALETTE,
  resolveDims,
  silhouetteKey,
  silhouetteSvg,
  type ContourVariant,
  type NpcAge,
  type NpcGender,
  type NpcJob,
  type NpcPalette,
  type SpriteDims,
} from "./npcSprite";

export type { NpcAge, NpcGender, NpcJob, NpcPalette, ContourVariant, SpriteDims };
export { silhouetteSvg, silhouetteKey, assertSpriteUniqueness, assertGenderRatio, JOB_PALETTE };

/** 旧接口兼容：sprite 字段改为 silhouette key */
export type NpcSpriteKey = string;

export interface NpcVisual {
  age: NpcAge;
  gender: NpcGender;
  job: NpcJob;
  variant: ContourVariant;
  palette: NpcPalette;
  attire: string; // = variant，兼容旧 CSS
  companion: string | null;
  role: string;
  dims: SpriteDims;
}

export const COMPANION_PROPS: Record<string, { ch: string; kind: string; tag: string; dx: number; dy: number }[]> = {
  carter: [
    { ch: "f", kind: "cart", tag: "carriage", dx: 1, dy: 0 },
    { ch: "v", kind: "crate", tag: "cargo", dx: 2, dy: 0 },
  ],
  docker: [{ ch: "f", kind: "cart", tag: "wheelbarrow", dx: 1, dy: 0 }],
  smith: [
    { ch: "p", kind: "post", tag: "forge", dx: 1, dy: 0 },
  ],
  hawker: [{ ch: "v", kind: "crate", tag: "goods", dx: 1, dy: 0 }],
  roadHawker: [{ ch: "v", kind: "crate", tag: "goods", dx: 1, dy: 0 }],
  townHawker: [{ ch: "v", kind: "crate", tag: "goods", dx: 1, dy: 0 }],
  luoHawker: [{ ch: "v", kind: "crate", tag: "goods", dx: 1, dy: 0 }],
  fisher: [{ ch: "z", kind: "rack", tag: "rod", dx: 1, dy: 0 }],
  townWatch: [{ ch: "l", kind: "lantern", tag: "watch", dx: 1, dy: 0 }],
  luoGate: [{ ch: "l", kind: "lantern", tag: "watch", dx: 1, dy: 0 }],
  sedan: [{ ch: "f", kind: "cart", tag: "sedan", dx: 1, dy: 0 }],
  teaHost: [{ ch: "v", kind: "crate", tag: "tea", dx: 1, dy: 0 }],
  rumorTea: [{ ch: "v", kind: "crate", tag: "tea", dx: 1, dy: 0 }],
};

export interface LuoNpcFull extends NpcVisual {
  id: string;
  yard?: string;
  standSpots: [number, number][];
}

function build(
  id: string,
  age: NpcAge,
  gender: NpcGender,
  job: NpcJob,
  variant: ContourVariant,
  role: string,
  companion: string | null,
  yard: string | undefined,
  spots: [number, number][],
  palette?: NpcPalette,
): LuoNpcFull {
  const dims = resolveDims({ age, gender, job, variant, palette });
  return {
    id,
    age,
    gender,
    job,
    variant,
    role,
    companion,
    yard,
    standSpots: spots,
    palette: dims.palette,
    attire: variant,
    dims,
  };
}

/**
 * 洛阳具名 + 院内 NPC
 * 每条 (age,gender,job,variant) 唯一；男女比约 1.5:1；含独立 child/old/female 轮廓
 */
export const LUOYANG_NPCS: LuoNpcFull[] = [
  // —— 河南府 ——
  build("judge", "mid", "m", "yamen", "belt", "河南尹", null, "yamen", [[1, 0], [0, 1]]),
  build("caseclerk", "mid", "m", "yamen", "satchel", "案吏", null, "yamen", [[1, 0], [0, -1]]),
  build("luoBailiff", "mid", "m", "yamen", "blade", "捕头姜", null, "yamen", [[0, 1], [1, 1]]),
  build("luoClerk", "mid", "m", "yamen", "base", "师爷", null, "yamen", [[0, -1], [1, 0]]),
  build("luoJailer", "young", "m", "yamen", "wrap", "狱卒", null, "jail", [[0, 1], [1, 0]]),
  build("luoJailer2", "mid", "m", "yamen", "patch", "狱卒乙", null, "jail", [[1, 0], [-1, 0]]),
  build("luoPrisoner", "mid", "m", "folk", "ragged", "囚犯", null, "jail", [[0, 0], [1, 0]]),
  // —— 太白酒楼 ——
  build("luoBarkeeper", "mid", "m", "taibai", "belt", "掌柜老温", null, "wine", [[0, 1], [1, 0]]),
  build("luoCook", "mid", "m", "taibai", "fat", "厨子", null, "wine", [[0, -1], [1, 0]]),
  build("luoWaiter", "child", "m", "taibai", "apron", "跑堂小二", null, "wine", [[1, 0], [0, 1]]),
  build("luoWaiter2", "child", "f", "taibai", "twinbun", "跑堂丫头", null, "wine", [[-1, 0], [0, 1]]),
  build("luoGuest", "mid", "m", "folk", "base", "食客", null, "wine", [[0, 1], [1, 0]]),
  build("luoGuest2", "young", "f", "folk", "skirt", "女食客", null, "wine", [[1, 0], [-1, 0]]),
  build("luoRaconteur", "old", "m", "folk", "staff", "说书人", null, "wine", [[0, 1], [1, 0]]),
  build("luoFlower", "young", "f", "folk", "shawl", "卖花女", null, "wine", [[0, -1], [-1, 0]]),
  // —— 烟波楼 ——
  build("luoAsha", "young", "f", "yanbo", "shawl", "名妓阿砂", null, "brothel", [[0, 1], [1, 0]]),
  build("luoMadam", "mid", "f", "yanbo", "belt", "鸨母", null, "brothel", [[1, 0], [0, -1]]),
  build("luoGirl", "young", "f", "yanbo", "skirt", "姑娘", null, "brothel", [[1, 0], [-1, 0]]),
  build("luoGirl2", "young", "f", "yanbo", "topknot", "姑娘乙", null, "brothel", [[0, 1], [1, 1]]),
  build("luoMusician", "young", "m", "yanbo", "lute", "乐师", null, "brothel", [[0, 1], [1, 0]]),
  build("luoTurtle", "mid", "m", "yanbo", "base", "龟奴", null, "brothel", [[1, 0], [0, 1]]),
  build("luoEmbroid", "mid", "f", "folk", "skirt", "绣娘", null, "brothel", [[-1, 0], [0, -1]]),
  // —— 定鼎武馆 ——
  build("luoCoach", "mid", "m", "martial", "blade", "教头朱文渊", null, "martial", [[0, 1], [1, 0]]),
  build("luoDisciple", "young", "m", "martial", "wrap", "武馆弟子", null, "martial", [[1, 0], [-1, 0]]),
  build("luoDisciple2", "young", "m", "martial", "base", "弟子乙", null, "martial", [[0, 1], [1, 1]]),
  build("luoDisciple3", "young", "f", "martial", "belt", "女弟子", null, "martial", [[-1, 0], [0, -1]]),
  build("luoYardHand", "young", "f", "folk", "patch", "武馆杂役", null, "martial", [[1, 0], [0, 1]]),
  // —— 回春堂 ——
  build("luoDoctor", "old", "m", "merchant", "staff", "坐堂大夫", null, "clinic", [[0, 1], [1, 0]]),
  build("luoHerbBoy", "child", "m", "merchant", "topknot", "药童", null, "clinic", [[1, 0], [0, 1]]),
  build("luoHerb", "mid", "m", "merchant", "apron", "抓药的", "hawker", "clinic", [[0, 1], [-1, 0]]),
  build("luoHerb2", "mid", "f", "merchant", "skirt", "抓药娘子", null, "clinic", [[1, 0], [0, -1]]),
  // —— 当铺/寺/驿 ——
  build("luoVendor", "mid", "m", "merchant", "belt", "通远质库", null, "pawn", [[0, 1], [1, 0]]),
  build("luoTemple", "old", "m", "clergy", "staff", "大秦寺司", null, "temple", [[0, 1], [1, 0]]),
  build("luoPost", "mid", "m", "post", "satchel", "驿邮署吏", null, "post", [[0, 1], [1, 0]]),
  build("messenger", "young", "m", "post", "wrap", "急脚", null, "post", [[0, 1], [1, 0]]),
  // —— 南市 ——
  build("luoAntique", "mid", "f", "merchant", "base", "绸缎庄主", "hawker", "shop2", [[0, 1], [1, 0]]),
  build("luoHawker", "mid", "f", "merchant", "shawl", "南市摊妇", "hawker", "shop3", [[1, 0], [-1, 0]]),
  build("luoShopHand", "young", "f", "merchant", "patch", "伙计丫头", null, "shop1", [[1, 0], [0, 1]]),
  build("luoShopWife", "mid", "f", "merchant", "apron", "铺中娘子", null, "shop1", [[0, 1], [-1, 0]]),
  build("carter", "mid", "m", "folk", "belt", "车夫", "carter", undefined, [[1, 0], [-1, 0]]),
  build("docker", "mid", "m", "folk", "wrap", "脚夫", "docker", undefined, [[1, 0], [0, 1]]),
  build("roadHawker", "young", "f", "folk", "apron", "路摊娘子", "roadHawker", undefined, [[1, 0], [-1, 0]]),
  build("townHawker", "mid", "f", "merchant", "satchel", "市贩娘子", "townHawker", undefined, [[1, 0], [0, 1]]),
  build("rumorTea", "old", "m", "folk", "base", "茶客闲话", "rumorTea", undefined, [[0, 1], [1, 0]]),
  build("luoBeggar", "old", "m", "folk", "ragged", "南市乞丐", null, undefined, [[0, 1], [1, 0]]),
  build("luoTeaGirl", "young", "f", "taibai", "shawl", "茶博士", null, undefined, [[0, 1], [1, 0]]),
  // —— 居民坊 ——
  build("luoElder", "old", "m", "folk", "patch", "永丰老人", null, "home1", [[0, 1], [1, 0]]),
  build("luoElder2", "old", "f", "folk", "shawl", "殖业老妇", null, "home2", [[0, 1], [-1, 0]]),
  build("luoKid", "child", "m", "folk", "base", "坊中孩童", null, "home1", [[1, 0], [0, 1]]),
  build("luoKid2", "child", "f", "folk", "twinbun", "坊中丫头", null, "home2", [[-1, 0], [0, 1]]),
  build("luoWife", "mid", "f", "folk", "belt", "坊中妇人", null, "home1", [[0, -1], [1, 0]]),
  // —— 城门/巡逻 ——
  build("passClerk", "mid", "m", "yamen", "topknot", "验帖吏", null, undefined, [[0, 1], [1, 0]]),
  build("townWatch", "mid", "m", "yamen", "wrap", "更卒", "townWatch", undefined, [[0, 1], [1, 0]]),
  build("luoGate", "young", "m", "yamen", "satchel", "定鼎门卒", "luoGate", undefined, [[1, 0], [-1, 0]]),
  build("barber", "mid", "f", "folk", "apron", "剃头娘子", null, undefined, [[0, 1], [1, 0]]),
  build("butcher", "mid", "m", "martial", "fat", "屠户", null, undefined, [[0, 1], [1, 0]]),
  build("luoWasher", "mid", "f", "folk", "base", "浣衣妇", null, "home2", [[1, 0], [0, 1]]),
];

export function npcById(id: string): LuoNpcFull | undefined {
  return LUOYANG_NPCS.find((n) => n.id === id);
}

export function assignNpcSprite(talker: { id: string }): {
  sprite: string;
  palette: string;
  age: NpcAge;
  attire: string;
  gender?: NpcGender;
  variant?: ContourVariant;
} {
  const n = npcById(talker.id);
  if (n) {
    return {
      sprite: silhouetteKey(n.dims),
      palette: n.palette,
      age: n.age,
      attire: n.variant,
      gender: n.gender,
      variant: n.variant,
    };
  }
  return { sprite: "worker", palette: "folkInk", age: "mid", attire: "plain" };
}

export function npcsForYard(yard: string): LuoNpcFull[] {
  return LUOYANG_NPCS.filter((n) => n.yard === yard);
}

export function luoyangSpriteReport(): {
  uniqueness: ReturnType<typeof assertSpriteUniqueness>;
  gender: ReturnType<typeof assertGenderRatio>;
  total: number;
} {
  const uniqueness = assertSpriteUniqueness(LUOYANG_NPCS.map((n) => ({ id: n.id, dims: n.dims })));
  const gender = assertGenderRatio(LUOYANG_NPCS);
  return { uniqueness, gender, total: LUOYANG_NPCS.length };
}
