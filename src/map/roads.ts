import type { ChapterId, EnemyId } from "../game/types";
import type { GateKind, ItemId, SceneId, SealId } from "./types";

export interface RoadSceneDef {
  id: SceneId;
  chapter: ChapterId;
  name: string;
  kicker: string;
  enter: string;
  mood: string;
  ascii: string[];
  npcs: Record<string, EnemyId>;
  talkers: Record<string, string>;
  portals: Record<string, { to: SceneId; at: string }>;
  order: SealId[];
  gate: GateKind;
  signs: string[];
  items: Record<string, ItemId>;
}

function rows(id: string, lines: string[]): string[] {
  const w = lines[0]?.length ?? 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].length !== w) {
      throw new Error(`${id} row ${i} width ${lines[i].length}, expected ${w}`);
    }
  }
  return lines;
}

type RoadTheme = "canal" | "hills" | "market" | "pass" | "lake";

const ROAD_THEMES: Record<RoadTheme, string[]> = {
  hills: [
    "################################################",
    "#.............#N#.................%%%%%%%%%%%%%#",
    "#.....&&......=......&&...........%%%%%%%%%%%%%#",
    "#...##:##.....=.....##:##..............^^^^^^^^#",
    "#...#Ht.#.....=.....#.t.#..............^^^^^^^^#",
    "#...##:##...,=,...##:##.q.......1......^^^^^^^^#",
    "#W=============@==============================E#",
    "#.....p.p.t...=......&&.....e..........^^^^^^^^#",
    "#....&&.......=.......................^^^^^^^^^#",
    "#.............=.....vvvvv.............^^^^^^^^^#",
    "#............#S#......................%%%%%%%%%#",
    "################################################",
  ],
  market: [
    "################################################",
    "#%%%%.........#N#..........%%%%%%%%.....&&.....#",
    "#%%%%...##:##..=..##:##....%%%%%%%%............#",
    "#%%%%...#Ht.#..=..#.t.#....%%%%%%....vvvvv.....#",
    "#%%%%...##:##.,=,.#####....%%%%%...............#",
    "#%%%%...&&.....=...&&...q...%%%%....##:##...1..#",
    "#W=============@==============================E#",
    "#%%%%..p.p.t...=.....&&....e%%%....#####.......#",
    "#%%%%..........=...........%%%%%...............#",
    "#%%%%...&&.....=....&&.....%%%%%%......&&......#",
    "#%%%%.........#S#..........%%%%%%%%............#",
    "################################################",
  ],
  pass: [
    "################################################",
    "#^^^^########.#N#.########^^^^%%%%%%%%%%%%%%%%%#",
    "#^^^#.........=.........#^^^%%%%%%%%%%%%%%%%%%%#",
    "#^^#...t.v....=....v.t...#^^%%%%%%%%%%%%%%%%%%%#",
    "#^#....p.p....=....p.p....#^%%%%%%%%%%%%%%%%%%%#",
    "#%#...........=.....q.....#%%%%%%%%%%%%%%%%%%%%#",
    "#W=============@==============================E#",
    "#%#..#Ht.#...,=,...#.t.#e.#%%%%%%%%%%%%%%%%%%%%#",
    "#%%#.##:##....=....##:##.#%%%%%%%%%%%%%%%%%%%%%#",
    "#%%%#....1....=.........#%%%%%%%%%%%%%%%%%%%%%%#",
    "#%%%%########.#S#.########%%%%%%%%%%%%%%%%%%%%%#",
    "################################################",
  ],
  lake: [
    "################################################",
    "#~~~~~~~~~~~~~#N#~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~#",
    "#~~~~~...&&...=.....&&.....~~~~~~~~~~~~~~~~~~~~#",
    "#~~~~...##:##.=...##:##....~~~~~~~~~~~~~~~~~~~~#",
    "#~~~~...#.t.#.=...#Ht.#....~~~~.........1......#",
    "#~~~....#####.,=,.#####.q..~~~....vvvvv........#",
    "#W=============@==============================E#",
    "#~~~.....p.t...=.........e.....~~~...&&........#",
    "#~~~~...&&.....=.....&&........~~~~............#",
    "#~~~~~.........=...............~~~~~...........#",
    "#~~~~~~.......#S#..............~~~~~~..........#",
    "################################################",
  ],
  canal: [
    "################################################",
    "#%%%%%........#N#.........%%%%%~~~~~~~~~~~~~~~~#",
    "#%%%%...&&.....=.....&&....%%%%~~~~~~~~~~~~~~~~#",
    "#%%%...##:##...=...##:##....%%%~~~~~~~~~~~~~~~~#",
    "#%%%...#Ht.#...=...#.t.#....%%~~~~~~~~~~~~~~~~~#",
    "#%%....##:##..,=,..#####.q..%~~~~~~~~~~~~~~~~~~#",
    "#W=============@==============================E#",
    "#%%.....p.p.t..=.....&&.....e%~~~~~~~~...1.....#",
    "#%%%...&&......=............%%%~~~~~~~~~~~~~~~~#",
    "#%%%%..........=....vvvvv...%%%%~~~~~~~~~~~~~~~#",
    "#%%%%%........#S#.........%%%%%~~~~~~~~~~~~~~~~#",
    "################################################",
  ],
};

function roadTown(opts: {
  id: SceneId;
  name: string;
  kicker: string;
  enter: string;
  mood: string;
  chapter?: ChapterId;
  north?: { to: SceneId; at: string };
  south?: { to: SceneId; at: string };
  west?: { to: SceneId; at: string };
  east?: { to: SceneId; at: string };
  talkId?: string;
  talkId2?: string;
  talkExtra?: string;
  sign?: string;
  theme?: RoadTheme;
  foe?: EnemyId;
  item?: ItemId;
}): RoadSceneDef {
  const portals: RoadSceneDef["portals"] = {};
  if (opts.north) portals.N = opts.north;
  if (opts.south) portals.S = opts.south;
  if (opts.west) portals.W = opts.west;
  if (opts.east) portals.E = opts.east;
  const talkers: Record<string, string> = {
    q: opts.talkId ?? opts.talkExtra ?? "townHawker",
    e: "innkeep",
    ...(opts.talkId2 ? { r: opts.talkId2 } : {}),
  };
  const theme = opts.theme ?? "canal";
  const npcs: Record<string, EnemyId> = { "1": opts.foe ?? "thief" };
  const items: Record<string, ItemId> = opts.item ? { $: opts.item } : {};
  const grid = ROAD_THEMES[theme].map((line) => line.split(""));
  const w = grid[0].length;
  const h = grid.length;
  // 城际口贴四边；没有方向的口封回墙
  if (!opts.north) {
    for (let x = 0; x < w; x++) if (grid[1][x] === "N") grid[1][x] = "#";
  }
  if (!opts.south) {
    for (let x = 0; x < w; x++) if (grid[h - 2][x] === "S") grid[h - 2][x] = "#";
  }
  if (!opts.west) {
    for (let y = 0; y < h; y++) if (grid[y][1] === "W") grid[y][1] = "#";
  }
  if (!opts.east) {
    for (let y = 0; y < h; y++) if (grid[y][w - 2] === "E") grid[y][w - 2] = "#";
  }
  // 可选第三人：在 q 旁空地标 r
  if (opts.talkId2) {
    outer: for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        if (grid[y][x] === "q") {
          for (const [dx, dy] of [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
            [2, 0],
          ] as const) {
            const nx = x + dx;
            const ny = y + dy;
            if (grid[ny]?.[nx] === ".") {
              grid[ny][nx] = "r";
              break outer;
            }
          }
        }
      }
    }
  }
  // 路匪与双谈者默认保留
  const signs = [
    ...(opts.sign ? [opts.sign] : []),
    `${opts.name.split("·")[0] ?? opts.name}驿酒楼。官道客都在这歇脚。`,
  ];
  return {
    id: opts.id,
    chapter: opts.chapter ?? "alley",
    name: opts.name,
    kicker: opts.kicker,
    enter: opts.enter,
    mood: opts.mood,
    ascii: rows(
      opts.id,
      grid.map((r) => r.join("")),
    ),
    npcs,
    talkers,
    portals,
    order: [],
    gate: "open",
    signs,
    items,
  };
}

/** 过渡驿站 + 酒楼二楼。 */
export const ROAD_SCENES: Record<string, RoadSceneDef> = {
  jiaxing: roadTown({
    id: "jiaxing",
    name: "嘉兴·杉青闸",
    kicker: "运河",
    enter: "杉青闸水声细。北去苏州阊门，南下临安钱塘。岸上有人卖闸饭。",
    mood: "闸不认官。认船。",
    north: { to: "suzhou", at: "S" },
    south: { to: "linan", at: "D" },
    talkId: "gateKeeper",
    talkExtra: "roadHawker",
    sign: "杉青闸。运河水程半日。",
    theme: "canal",
    foe: "mob_canal_02",
  }),
  wuxi: roadTown({
    id: "wuxi",
    name: "无锡·惠山浜",
    kicker: "江南",
    enter: "惠山在西影里。北去常州，南接苏州。浜上堆着竹缆。",
    mood: "山影压水。水压船。",
    north: { to: "changzhou", at: "S" },
    south: { to: "suzhou", at: "D" },
    talkId: "hamPorter",
    talkExtra: "roadBeggar",
    sign: "惠山浜。锡山不在眼前，在话里。",
    theme: "hills",
    foe: "mob_road_05",
  }),
  changzhou: roadTown({
    id: "changzhou",
    name: "常州·毗陵驿",
    kicker: "江南",
    enter: "毗陵驿土黄色。北通建康，南下无锡苏州。驿卒在换马。",
    mood: "驿马一身汗。人也不干爽。",
    north: { to: "jiankang", at: "S" },
    south: { to: "wuxi", at: "N" },
    talkId: "postRider",
    talkExtra: "roadHawker",
    sign: "毗陵驿。官文过此换马。",
    theme: "market",
    foe: "mob_escortBand_02",
  }),
  chuzhou: roadTown({
    id: "chuzhou",
    name: "滁州·醉翁亭外",
    kicker: "江淮",
    enter: "亭在山前。北上淮阴，南下建康。山路有人拦客。",
    mood: "山不高，影却长。",
    north: { to: "huainan", at: "S" },
    south: { to: "jiankang", at: "D" },
    talkId: "pavilionMonk",
    talkExtra: "roadHunter",
    sign: "醉翁亭外。山路认脚。",
    theme: "hills",
    foe: "mob_road_08",
  }),
  suqian: roadTown({
    id: "suqian",
    name: "宿迁·项王故里渡",
    kicker: "淮北",
    enter: "渡口北望宿州。南回淮阴。碑下有人卖粥，岸边有闲刀。",
    mood: "故里碑还在。人换了。",
    north: { to: "suzhousu", at: "S" },
    south: { to: "huainan", at: "N" },
    talkId: "ferryCook",
    talkExtra: "roadBeggar",
    sign: "项王故里。碑上字浅。",
    theme: "canal",
    foe: "mob_canal_05",
  }),
  suzhousu: roadTown({
    id: "suzhousu",
    name: "宿州·符离集",
    kicker: "淮北",
    enter: "符离集烟大。北上汴京，南回宿迁，东接高邮。集上盐腥。",
    mood: "集上盐腥和马粪一块闻。",
    north: { to: "bianjing", at: "D" },
    south: { to: "suqian", at: "N" },
    east: { to: "gaoyou", at: "N" },
    talkId: "marketSalt",
    talkExtra: "roadHawker",
    sign: "符离集。北去汴京官道。",
    theme: "market",
    foe: "mob_canal_04",
  }),
  bozhou: roadTown({
    id: "bozhou",
    name: "亳州·涡水驿",
    kicker: "中原",
    enter: "涡水驿西望洛阳方向，东接淮阴。药香压过刀腥。",
    mood: "药肆比刀铺多。",
    west: { to: "yanshi", at: "E" },
    east: { to: "huainan", at: "W" },
    talkId: "herbDoc",
    talkExtra: "roadPatient",
    sign: "涡水驿。西去偃师、洛阳。",
    theme: "market",
    foe: "mob_yamenRunner_03",
  }),
  yanshi: roadTown({
    id: "yanshi",
    name: "偃师·首阳驿",
    kicker: "中原",
    enter: "首阳驿外土硬。西去洛阳天津桥，东回亳州。丘上有人蹲。",
    mood: "洛阳的影，在西边。",
    west: { to: "luoyang", at: "D" },
    east: { to: "bozhou", at: "W" },
    talkId: "clayPotter",
    talkExtra: "roadHunter",
    sign: "首阳驿。洛阳在西一日程。",
    theme: "hills",
    foe: "hillBandit",
  }),
  shanzhou: roadTown({
    id: "shanzhou",
    name: "陕州·茅津渡",
    kicker: "关西",
    enter: "茅津渡风大。西去潼关，东回洛阳。渡口要等风。",
    mood: "河比路宽。风比话硬。",
    west: { to: "tongguan", at: "E" },
    east: { to: "luoyang", at: "W" },
    talkId: "fordMan",
    talkExtra: "roadBeggar",
    sign: "茅津渡。西望潼关。",
    theme: "hills",
    foe: "riverThug",
  }),
  tongguan: roadTown({
    id: "tongguan",
    name: "潼关·关门",
    kicker: "关西",
    enter: "关门压在山脊上。西去长安开远门，东回陕州。关下有闲人。",
    mood: "关不认情。认符。",
    west: { to: "changan", at: "E" },
    east: { to: "shanzhou", at: "W" },
    talkId: "guanGuard",
    talkExtra: "roadHawker",
    sign: "潼关。西极长安。",
    theme: "pass",
    foe: "hillBandit",
  }),
  gaoyou: roadTown({
    id: "gaoyou",
    name: "高邮·盂城驿",
    kicker: "运河",
    enter: "盂城驿靠湖。北接宿州符离，南回扬州。湖风终夜。",
    mood: "湖面比城门宽。",
    north: { to: "suzhousu", at: "E" },
    south: { to: "yangzhou", at: "N" },
    talkId: "lakeFish",
    talkExtra: "roadHunter",
    sign: "盂城驿。湖风终夜。",
    theme: "lake",
    foe: "thief",
  }),
  wineUp: {
    id: "wineUp",
    chapter: "dock",
    name: "酒楼·雅间",
    kicker: "港律",
    enter: "楼梯吱呀。雅间窗对着巷。桌上有盏冷酒。",
    mood: "楼上话更轻。轻处有帖。",
    ascii: rows("wineUp", [
      "########################",
      "#....l....p.......l....#",
      "#..######..######......#",
      "#..#..t.v....C.t..#....#",
      "#..#..............#....#",
      "#..#......g.......#....#",
      "#..#..............#....#",
      "#..######..######......#",
      "#..........=...........#",
      "#..........@...........#",
      "##########2#############",
    ]),
    npcs: {},
    talkers: { g: "privateGuest" },
    portals: { "2": { to: "wine", at: "2" } },
    order: [],
    gate: "open",
    signs: [],
    items: {},
  },
};
