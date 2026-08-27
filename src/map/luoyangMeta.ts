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
  /** 功能铺/衙署：输出普通或地标名 */
  functional?: boolean;
  /** 地标白字大号，锚在门口 */
  landmark?: boolean;
  /** 阙门/坊门渲染缩放 */
  renderScale?: number;
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
    name: "慈惠堂",
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
    key: "templeOffice",
    yardKey: "templeOffice",
    name: "白马寺司",
    spriteTheme: "temple",
    furnishTemplate: "templeHall",
    subScene: "luoyang_temple_outer",
    landmarks: ["香炉g", "纱屏h"],
    themeColors: "淡墨+米黄",
    functional: true,
    landmark: false,
  },
  {
    key: "templeOuter",
    yardKey: "templeOuter",
    name: "白马寺",
    spriteTheme: "temple",
    furnishTemplate: "templeHall",
    subScene: "luoyang_temple_outer",
    landmarks: ["山门", "古钟"],
    themeColors: "淡墨+米黄",
    functional: true,
    landmark: true,
  },
  {
    key: "sixDoors",
    yardKey: "sixDoors",
    name: "六扇门",
    spriteTheme: "yamen",
    furnishTemplate: "yamenHall",
    subScene: null,
    landmarks: ["兵器架z", "卷宗柜k", "捕快房"],
    themeColors: "玄黑+朱红",
  },
  {
    key: "garrison",
    yardKey: "garrison",
    name: "城防守备营",
    spriteTheme: "martial",
    furnishTemplate: "martialYard",
    subScene: null,
    landmarks: ["兵器架z", "沙袋c", "演武桩"],
    themeColors: "铁灰+血绛",
  },
  {
    key: "silk",
    yardKey: "silk",
    name: "绸缎庄",
    spriteTheme: "shop",
    furnishTemplate: "shopHall",
    subScene: null,
    landmarks: ["布幌e"],
    themeColors: "靛青+米黄",
  },
  {
    key: "smith",
    yardKey: "smith",
    name: "铁匠铺",
    spriteTheme: "shed",
    furnishTemplate: "shedHall",
    subScene: null,
    landmarks: ["炉火*", "砧"],
    themeColors: "铁灰+土褐",
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
    name: "西市杂货",
    spriteTheme: "shop",
    furnishTemplate: "shopHall",
    subScene: null,
    landmarks: ["货箱v"],
    themeColors: "土黄+靛青",
  },
  {
    key: "shop2",
    yardKey: "shop2",
    name: "古董铺",
    spriteTheme: "shop",
    furnishTemplate: "shopHall",
    subScene: null,
    landmarks: ["货箱v"],
    themeColors: "土黄+靛青",
  },
  {
    key: "shop3",
    yardKey: "shop3",
    name: "肉铺",
    spriteTheme: "shop",
    furnishTemplate: "shopHall",
    subScene: null,
    landmarks: ["货箱v"],
    themeColors: "土黄+血绛",
  },
  {
    key: "shop4",
    yardKey: "shop4",
    name: "茶铺",
    spriteTheme: "shop",
    furnishTemplate: "shopHall",
    subScene: null,
    landmarks: ["货箱v"],
    themeColors: "土黄+淡墨",
  },
  {
    key: "shop5",
    yardKey: "shop5",
    name: "米铺",
    spriteTheme: "shop",
    furnishTemplate: "shopHall",
    subScene: null,
    landmarks: ["货箱v"],
    themeColors: "土黄+靛青",
  },
  {
    key: "shop6",
    yardKey: "shop6",
    name: "布行",
    spriteTheme: "shop",
    furnishTemplate: "shopHall",
    subScene: null,
    landmarks: ["货箱v"],
    themeColors: "靛青+米黄",
  },
  {
    key: "shed2",
    yardKey: "shed2",
    name: "车马行",
    spriteTheme: "shed",
    furnishTemplate: "shedHall",
    subScene: null,
    landmarks: ["马桩p"],
    themeColors: "铁灰+土褐",
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
    key: "home3",
    yardKey: "home3",
    name: "履道坊",
    spriteTheme: "home",
    furnishTemplate: "homeHall",
    subScene: null,
    landmarks: ["井灶"],
    themeColors: "淡墨+土褐",
  },
  {
    key: "home4",
    yardKey: "home4",
    name: "敦厚坊",
    spriteTheme: "home",
    furnishTemplate: "homeHall",
    subScene: null,
    landmarks: ["井灶"],
    themeColors: "淡墨+土褐",
  },
  {
    key: "home5",
    yardKey: "home5",
    name: "永丰东巷",
    spriteTheme: "home",
    furnishTemplate: "homeHall",
    subScene: null,
    landmarks: ["井灶"],
    themeColors: "淡墨+土褐",
  },
  {
    key: "home6",
    yardKey: "home6",
    name: "平康西巷",
    spriteTheme: "home",
    furnishTemplate: "homeHall",
    subScene: null,
    landmarks: ["井灶"],
    themeColors: "淡墨+土褐",
  },
  {
    key: "shop7",
    yardKey: "shop7",
    name: "北市茶摊",
    spriteTheme: "shop",
    furnishTemplate: "shopHall",
    subScene: null,
    landmarks: ["货箱v"],
    themeColors: "土黄+淡墨",
  },
  {
    key: "shop8",
    yardKey: "shop8",
    name: "北市油店",
    spriteTheme: "shop",
    furnishTemplate: "shopHall",
    subScene: null,
    landmarks: ["货箱v"],
    themeColors: "土黄+靛青",
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
    key: "yingtian",
    yardKey: "yingtian",
    name: "应天门",
    spriteTheme: "gate",
    furnishTemplate: "shedHall",
    subScene: null,
    landmarks: ["阙楼", "门扉"],
    themeColors: "玄黑+朱红",
    renderScale: 1.25,
  },
  {
    key: "duanmen",
    yardKey: "duanmen",
    name: "端门",
    spriteTheme: "gate",
    furnishTemplate: "shedHall",
    subScene: null,
    landmarks: ["戟门", "御道"],
    themeColors: "玄黑+朱红",
    renderScale: 1.15,
  },
  {
    key: "shangyang",
    yardKey: "shangyang",
    name: "上阳宫",
    spriteTheme: "home",
    furnishTemplate: "homeHall",
    subScene: null,
    landmarks: ["花木&", "廊灯l"],
    themeColors: "淡墨+石青",
  },
  {
    key: "southMarket",
    yardKey: "southMarket",
    name: "南市楼",
    spriteTheme: "shop",
    furnishTemplate: "shopHall",
    subScene: null,
    landmarks: ["市幌e", "货箱v"],
    themeColors: "土黄+靛青",
  },
  {
    key: "westMarket",
    yardKey: "westMarket",
    name: "西市楼",
    spriteTheme: "shop",
    furnishTemplate: "shopHall",
    subScene: null,
    landmarks: ["市幌e", "货箱v"],
    themeColors: "土黄+靛青",
  },
  {
    key: "lideGate",
    yardKey: "lideGate",
    name: "立德坊门",
    spriteTheme: "home",
    furnishTemplate: "homeHall",
    subScene: null,
    landmarks: ["坊门"],
    themeColors: "淡墨+土褐",
    renderScale: 1.05,
  },
  {
    key: "tongyuanGate",
    yardKey: "tongyuanGate",
    name: "通远坊门",
    spriteTheme: "home",
    furnishTemplate: "homeHall",
    subScene: null,
    landmarks: ["坊门"],
    themeColors: "淡墨+土褐",
    renderScale: 1.05,
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

const LABEL_ROLE: Record<string, { functional: boolean; landmark: boolean }> = {
  yingtian: { functional: true, landmark: true },
  duanmen: { functional: true, landmark: true },
  shangyang: { functional: true, landmark: true },
  yamen: { functional: true, landmark: true },
  wine: { functional: true, landmark: true },
  brothel: { functional: true, landmark: true },
  templeOffice: { functional: true, landmark: false },
  templeOuter: { functional: true, landmark: true },
  southMarket: { functional: true, landmark: true },
  westMarket: { functional: true, landmark: true },
  lideGate: { functional: true, landmark: true },
  tongyuanGate: { functional: true, landmark: true },
  bridge: { functional: true, landmark: true },
  clinic: { functional: true, landmark: false },
  pawn: { functional: true, landmark: false },
  silk: { functional: true, landmark: false },
  smith: { functional: true, landmark: false },
  post: { functional: true, landmark: false },
  shed: { functional: true, landmark: false },
  shop1: { functional: true, landmark: false },
  shop2: { functional: true, landmark: false },
  shop3: { functional: true, landmark: false },
  shop4: { functional: true, landmark: false },
  shop5: { functional: true, landmark: false },
  shop6: { functional: true, landmark: false },
  shed2: { functional: true, landmark: false },
  jail: { functional: true, landmark: false },
  sixDoors: { functional: true, landmark: false },
  martial: { functional: true, landmark: false },
  garrison: { functional: true, landmark: false },
  gate: { functional: false, landmark: false },
  home1: { functional: false, landmark: false },
  home2: { functional: false, landmark: false },
  home3: { functional: false, landmark: false },
  home4: { functional: false, landmark: false },
  home5: { functional: false, landmark: false },
  home6: { functional: false, landmark: false },
  shop7: { functional: false, landmark: false },
  shop8: { functional: false, landmark: false },
};

for (const b of LUOYANG_BUILDINGS) {
  const role = LABEL_ROLE[b.key] ?? { functional: false, landmark: false };
  b.functional = role.functional;
  b.landmark = role.landmark;
}

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
  { id: "luoDoctor", faction: "merchant", sprite: "clerk", palette: "merchantOchre", role: "慈惠堂医", standSpots: [[0, 1], [1, 0], [-1, 0]] },
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
