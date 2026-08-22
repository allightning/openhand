/**
 * 洛阳·天津桥 — 建筑/NPC 表现元数据（不定布局坐标）。
 * 布局仍由 luoyangGen 生成；本文件只提供命名、主题、陈设模板、立绘与子场景 id。
 */
import type { SceneId } from "./types";

export type LuoSpriteTheme =
  | "yamen"
  | "yanbo"
  | "taibai"
  | "martial"
  | "clinic"
  | "pawn"
  | "temple"
  | "post"
  | "shop"
  | "home"
  | "jail"
  | "shed"
  | "bridge"
  | "gate";

export type LuoFurnishTemplate =
  | "yamenHall"
  | "jailCell"
  | "yanboChamber"
  | "yanboStage"
  | "taibaiHall"
  | "taibaiPrivate"
  | "martialYard"
  | "clinicHall"
  | "pawnHall"
  | "templeHall"
  | "postHall"
  | "shopHall"
  | "homeHall"
  | "shedHall";

export type LuoNpcFaction = "yamen" | "yanbo" | "taibai" | "martial" | "merchant" | "folk";

export type LuoPalette =
  | "yamenInk" // 玄黑+朱红
  | "yanboRouge" // 胭脂+米白
  | "taibaiEarth" // 土褐+暖白
  | "martialIron" // 铁灰+血绛
  | "merchantOchre" // 赭黄+米黄（禁蓝）
  | "postOchre" // 驿卒赭黄
  | "clergyOchre" // 僧道赭黄
  | "folkInk"; // 淡墨+土褐

export type LuoSpriteKey = "clerk" | "woman" | "worker" | "foe";

export interface LuoBuildingDef {
  key: string;
  name: string;
  spriteTheme: LuoSpriteTheme;
  furnishTemplate: LuoFurnishTemplate;
  /** 子场景 id；无则 null */
  subScene: SceneId | null;
  /** 对应 generateLuoyang yards.key */
  yardKey: string;
  /** 主题地标说明（表现用） */
  landmarks: string[];
  themeColors: string;
}

export interface LuoTalkerDef {
  id: string;
  faction: LuoNpcFaction;
  sprite: LuoSpriteKey;
  palette: LuoPalette;
  /** 相对门口的备选站位（进入场景时随机抽一格） */
  standSpots: [number, number][];
  role: string;
}

/** 任务1：洛阳建筑命名完整清单 */
export const LUOYANG_BUILDINGS: LuoBuildingDef[] = [
  {
    key: "yamen",
    yardKey: "yamen",
    name: "河南府·正堂",
    spriteTheme: "yamen",
    furnishTemplate: "yamenHall",
    subScene: null,
    landmarks: ["石狮p×2", "照壁h", "肃静回避!×2", "旗架z"],
    themeColors: "玄黑+朱红",
  },
  {
    key: "jail",
    yardKey: "jail",
    name: "河南府·牢房",
    spriteTheme: "jail",
    furnishTemplate: "jailCell",
    subScene: "luoyang_yamen_prison",
    landmarks: ["水缸b", "枷锁k", "油灯l"],
    themeColors: "玄黑+铁灰",
  },
  {
    key: "wine",
    yardKey: "wine",
    name: "太白酒楼",
    spriteTheme: "taibai",
    furnishTemplate: "taibaiHall",
    subScene: null,
    landmarks: ["酒旗!", "酒坛j成排", "炉火*", "临河雅座"],
    themeColors: "土褐+暖白",
  },
  {
    key: "brothel",
    yardKey: "brothel",
    name: "烟波楼",
    spriteTheme: "yanbo",
    furnishTemplate: "yanboChamber",
    subScene: "luoyang_yanbo_inner",
    landmarks: ["红灯笼l×4", "花圃&×6", "纱帘h", "戏台"],
    themeColors: "胭脂+米白",
  },
  {
    key: "martial",
    yardKey: "martial",
    name: "定鼎武馆",
    spriteTheme: "martial",
    furnishTemplate: "martialYard",
    subScene: null,
    landmarks: ["兵器架z", "木人桩d", "沙袋c", "演武空地"],
    themeColors: "铁灰+血绛",
  },
  {
    key: "clinic",
    yardKey: "clinic",
    name: "回春堂",
    spriteTheme: "clinic",
    furnishTemplate: "clinicHall",
    subScene: null,
    landmarks: ["药幌!", "晒药架z", "药罐j成排"],
    themeColors: "淡青+米白",
  },
  {
    key: "pawn",
    yardKey: "pawn",
    name: "通远质库",
    spriteTheme: "pawn",
    furnishTemplate: "pawnHall",
    subScene: null,
    landmarks: ["柜台q", "货架i"],
    themeColors: "靛青+米黄",
  },
  {
    key: "temple",
    yardKey: "temple",
    name: "大秦寺",
    spriteTheme: "temple",
    furnishTemplate: "templeHall",
    subScene: null,
    landmarks: ["香炉g", "纱屏h"],
    themeColors: "淡墨+米黄",
  },
  {
    key: "post",
    yardKey: "post",
    name: "洛阳驿",
    spriteTheme: "post",
    furnishTemplate: "postHall",
    subScene: null,
    landmarks: ["马桩p", "驿箱v"],
    themeColors: "土褐+铁灰",
  },
  {
    key: "shop1",
    yardKey: "shop1",
    name: "药铺",
    spriteTheme: "shop",
    furnishTemplate: "shopHall",
    subScene: null,
    landmarks: ["药幌!", "货摊,"],
    themeColors: "淡青+米黄",
  },
  {
    key: "shop2",
    yardKey: "shop2",
    name: "绸缎庄",
    spriteTheme: "shop",
    furnishTemplate: "shopHall",
    subScene: null,
    landmarks: ["布匹架", "柜台"],
    themeColors: "靛青+米黄",
  },
  {
    key: "shop3",
    yardKey: "shop3",
    name: "杂货铺",
    spriteTheme: "shop",
    furnishTemplate: "shopHall",
    subScene: null,
    landmarks: ["货箱v", "告示!"],
    themeColors: "土褐+米黄",
  },
  {
    key: "home1",
    yardKey: "home1",
    name: "永丰坊",
    spriteTheme: "home",
    furnishTemplate: "homeHall",
    subScene: null,
    landmarks: ["井灶", "草席"],
    themeColors: "淡墨+土褐",
  },
  {
    key: "home2",
    yardKey: "home2",
    name: "殖业坊",
    spriteTheme: "home",
    furnishTemplate: "homeHall",
    subScene: null,
    landmarks: ["井灶", "草席"],
    themeColors: "淡墨+土褐",
  },
  {
    key: "shed",
    yardKey: "shed",
    name: "镖局",
    spriteTheme: "shed",
    furnishTemplate: "shedHall",
    subScene: null,
    landmarks: ["兵器架z", "货箱"],
    themeColors: "铁灰+土褐",
  },
  {
    key: "bridge",
    yardKey: "bridge",
    name: "天津桥",
    spriteTheme: "bridge",
    furnishTemplate: "shedHall",
    subScene: null,
    landmarks: ["桥亭", "验帖"],
    themeColors: "铁灰+淡青",
  },
  {
    key: "gate",
    yardKey: "gate",
    name: "定鼎门",
    spriteTheme: "gate",
    furnishTemplate: "shedHall",
    subScene: null,
    landmarks: ["瓮城", "门卒"],
    themeColors: "玄黑+朱红",
  },
];

/** 身份 → 立绘 / palette 映射（任务2） */
export const LUO_FACTION_SPRITE: Record<
  LuoNpcFaction,
  { sprite: LuoSpriteKey; palette: LuoPalette }
> = {
  yamen: { sprite: "clerk", palette: "yamenInk" },
  yanbo: { sprite: "woman", palette: "yanboRouge" },
  taibai: { sprite: "worker", palette: "taibaiEarth" },
  martial: { sprite: "foe", palette: "martialIron" },
  merchant: { sprite: "worker", palette: "merchantOchre" },
  folk: { sprite: "worker", palette: "folkInk" },
};

/** 洛阳具名 NPC 配置 */
export const LUOYANG_TALKERS: LuoTalkerDef[] = [
  { id: "judge", faction: "yamen", sprite: "clerk", palette: "yamenInk", role: "河南尹", standSpots: [[1, 0], [0, 1], [-1, 0]] },
  { id: "caseclerk", faction: "yamen", sprite: "clerk", palette: "yamenInk", role: "案吏", standSpots: [[1, 0], [0, -1], [2, 0]] },
  { id: "luoBailiff", faction: "yamen", sprite: "clerk", palette: "yamenInk", role: "捕头姜", standSpots: [[0, 1], [1, 1], [-1, 1]] },
  { id: "luoClerk", faction: "yamen", sprite: "clerk", palette: "yamenInk", role: "师爷", standSpots: [[0, -1], [1, 0], [-1, 0]] },
  { id: "luoJailer", faction: "yamen", sprite: "foe", palette: "yamenInk", role: "狱卒", standSpots: [[0, 1], [1, 0], [-1, 0]] },
  { id: "passClerk", faction: "yamen", sprite: "clerk", palette: "yamenInk", role: "验帖吏", standSpots: [[0, 1], [1, 0], [-1, 0]] },
  { id: "townWatch", faction: "yamen", sprite: "clerk", palette: "yamenInk", role: "更卒", standSpots: [[0, 1], [1, 0], [-1, 1]] },
  { id: "luoGate", faction: "yamen", sprite: "clerk", palette: "yamenInk", role: "定鼎门卒", standSpots: [[1, 0], [-1, 0], [0, 1]] },
  { id: "luoAsha", faction: "yanbo", sprite: "woman", palette: "yanboRouge", role: "名妓阿砂", standSpots: [[0, 1], [1, 0], [-1, 0]] },
  { id: "luoMadam", faction: "yanbo", sprite: "woman", palette: "yanboRouge", role: "鸨母", standSpots: [[1, 0], [0, -1], [-1, 0]] },
  { id: "luoMusician", faction: "yanbo", sprite: "woman", palette: "yanboRouge", role: "乐师", standSpots: [[0, 1], [1, 1], [-1, 0]] },
  { id: "luoBarkeeper", faction: "taibai", sprite: "worker", palette: "taibaiEarth", role: "掌柜老温", standSpots: [[0, 1], [1, 0], [-1, 0]] },
  { id: "luoCook", faction: "taibai", sprite: "worker", palette: "taibaiEarth", role: "厨子", standSpots: [[0, -1], [1, 0], [0, 1]] },
  { id: "luoCoach", faction: "martial", sprite: "foe", palette: "martialIron", role: "教头朱文渊", standSpots: [[0, 1], [1, 0], [-1, 0]] },
  { id: "luoDisciple", faction: "martial", sprite: "foe", palette: "martialIron", role: "武馆弟子", standSpots: [[1, 0], [-1, 0], [0, 1]] },
  { id: "luoDoctor", faction: "merchant", sprite: "clerk", palette: "merchantOchre", role: "回春堂医", standSpots: [[0, 1], [1, 0], [-1, 0]] },
  { id: "luoVendor", faction: "merchant", sprite: "worker", palette: "merchantOchre", role: "通远质库", standSpots: [[0, 1], [1, 0], [-1, 0]] },
  { id: "luoHerb", faction: "merchant", sprite: "worker", palette: "merchantOchre", role: "药贩", standSpots: [[0, 1], [1, 0], [-1, 0]] },
  { id: "luoAntique", faction: "merchant", sprite: "worker", palette: "merchantOchre", role: "古董商", standSpots: [[0, 1], [1, 0], [-1, 0]] },
  { id: "luoHawker", faction: "merchant", sprite: "worker", palette: "merchantOchre", role: "南市摊贩", standSpots: [[1, 0], [-1, 0], [0, 1]] },
  { id: "luoPost", faction: "merchant", sprite: "worker", palette: "merchantOchre", role: "驿邮署吏", standSpots: [[0, 1], [1, 0], [-1, 0]] },
  { id: "messenger", faction: "merchant", sprite: "worker", palette: "postOchre" as LuoPalette, role: "急脚", standSpots: [[0, 1], [1, 0], [-1, 0]] },
  { id: "luoTemple", faction: "folk", sprite: "woman", palette: "clergyOchre" as LuoPalette, role: "大秦寺司", standSpots: [[0, 1], [1, 0], [-1, 0]] },
  { id: "luoRaconteur", faction: "folk", sprite: "worker", palette: "folkInk", role: "说书人", standSpots: [[0, 1], [1, 0], [-1, 1]] },
  { id: "rumorTea", faction: "folk", sprite: "worker", palette: "folkInk", role: "茶客闲话", standSpots: [[0, 1], [1, 0], [-1, 0]] },
  { id: "roadHawker", faction: "folk", sprite: "worker", palette: "folkInk", role: "路摊", standSpots: [[1, 0], [-1, 0], [0, 1]] },
  { id: "townHawker", faction: "folk", sprite: "worker", palette: "folkInk", role: "市贩", standSpots: [[1, 0], [-1, 0], [0, 1]] },
  { id: "docker", faction: "folk", sprite: "worker", palette: "folkInk", role: "脚夫", standSpots: [[0, 1], [1, 0], [-1, 0]] },
  { id: "carter", faction: "folk", sprite: "worker", palette: "folkInk", role: "车夫", standSpots: [[0, 1], [1, 0], [-1, 0]] },
  { id: "barber", faction: "folk", sprite: "clerk", palette: "folkInk", role: "剃头", standSpots: [[0, 1], [1, 0], [-1, 0]] },
  { id: "butcher", faction: "martial", sprite: "foe", palette: "martialIron", role: "屠户", standSpots: [[0, 1], [1, 0], [-1, 0]] },
];

export function buildingByYard(yardKey: string): LuoBuildingDef | undefined {
  return LUOYANG_BUILDINGS.find((b) => b.yardKey === yardKey);
}

export function talkerMeta(id: string): LuoTalkerDef | undefined {
  return LUOYANG_TALKERS.find((t) => t.id === id);
}

/** 子场景门户字母（与主图 D/W/E 及 talker 字母错开；G=牢房门，F=烟波门） */
export const LUO_PORTAL_PRISON = "G";
export const LUO_PORTAL_YANBO = "F";
