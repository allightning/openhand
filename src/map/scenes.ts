import type { ChapterId, EnemyId } from "../game/types";
import type { GateKind, ItemId, SceneId, SealId } from "./types";

export interface SceneDef {
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

export interface TalkCtx {
  branded: boolean;
  items: string[];
  beaten: EnemyId[];
  flags: string[];
  party?: string[];
  step?: number;
  pick?: string;
}

export interface TalkChoice {
  id: string;
  label: string;
}

export interface Voice {
  said: string;
  thought: string;
  flags?: string[];
  reply?: string;
  spar?: EnemyId;
  choices?: TalkChoice[];
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

export const SCENES: Record<SceneId, SceneDef> = {
  hut: {
    id: "hut",
    chapter: "dock",
    name: "茅屋",
    kicker: "港律",
    enter: "屋里潮。南墙有门。门外土响。",
    mood: "WASD 挪步，点已见处可走。贴着人按空格，才开得了口。刀已经在手里。",
    ascii: rows("hut", [
      "################################",
      "#..............................#",
      "#..########################....#",
      "#..#......................#....#",
      "#..#..t..............@....#....#",
      "#..#......................#....#",
      "#..############..##########....#",
      "#..............................#",
      "#..............................#",
      "###############R################",
    ]),
    npcs: {},
    talkers: {},
    portals: { R: { to: "plot", at: "R" } },
    order: [],
    gate: "open",
    signs: [],
    items: {},
  },
  plot: {
    id: "plot",
    chapter: "dock",
    name: "屋后",
    kicker: "港律",
    enter: "坡上有人。路只有一条。",
    mood: "先过这一刀。帖才算开。",
    ascii: rows("plot", [
      "%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%",
      "%^^^^^&&&^^^^^^^^^^^^^^^^^^^^^^^^^^%",
      "%^^....##########........&&&...^^^^%",
      "%^^....#........#....l..&&.....^^^^%",
      "%^^....#...t....#.....&&&......^^^^%",
      "%^^....#####R####..............^^^^%",
      "%.&&.l......=....v....&&...&&......%",
      "%.....&&&...=..f..........&&...&&..%",
      "%.&&........=.....l..&&&........&&.%",
      "%....r.o....=........p....&&...&&..%",
      "%.g..H......=....H.................%",
      "%....j......=......................%",
      "%&&&&&&&&&&&1&&&&&&&&&&&&&&&&&&&&&&%",
      "%...........=......................%",
      "%..........#S#.....................%",
      "%^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^%",
      "%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%",
    ]),
    npcs: { "1": "intruder" },
    talkers: { g: "farmer" },
    portals: { R: { to: "hut", at: "R" }, S: { to: "ridge", at: "S" } },
    order: [],
    gate: "open",
    signs: [],
    items: {},
  },
  ridge: {
    id: "ridge",
    chapter: "dock",
    name: "岗坡",
    kicker: "港律",
    enter: "土是硬的。人比土硬。",
    mood: "岗认刀。不认帖。",
    ascii: rows("ridge", [
      "%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%",
      "%^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^%",
      "%..........#S#.....................%",
      "%...........=......................%",
      "%.&&.l......=.....&&...o..&&...&&..%",
      "%....r......=..f....p....&&........%",
      "%.....H.....=....H.................%",
      "%......z....=...........d..........%",
      "%.&&........=........&&.1..........%",
      "%....b.v....=..l...........2.......%",
      "%.e........&=.&....&&...&&.........%",
      "%...........=......................%",
      "%..........#T#.....................%",
      "%^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^%",
      "%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%",
    ]),
    npcs: { "1": "brute", "2": "warden" },
    talkers: { d: "sentry", e: "woodcut", z: "tutorPace" },
    portals: { S: { to: "plot", at: "S" }, T: { to: "wharf", at: "T" } },
    order: [],
    gate: "open",
    signs: [],
    items: {},
  },
  wharf: {
    id: "wharf",
    chapter: "dock",
    name: "港湾",
    kicker: "港律",
    enter: "岗坡石路连进港。仓院、税卡、缆厂、灯楼都接在路上。市井铺面靠街一字排开。",
    mood: "江是活的。名册不是。",
    ascii: rows("wharf", [
      "####################################",
      "#~~~.&&.&.&####B####.&.&...&...~~~~#",
      "#~~~.&.&...#...=...#..&.&l..&..~~~~#",
      "#~~~.&.....#...=...#...........~~~~#",
      "#~~~.#######...=....#######....~~~~#",
      "#~~~.#.v#..=========##.t..#....~~~~#",
      "#~~~.#.vA=======k===M.....#....~~~~#",
      "#~~~.#.vvb.=...=H...#.....#....~~~~#",
      "#~~~.######=...=....=######....~~~~#",
      "#~~~.=========================.~~~~#",
      "#~~~.lHcb.Hhtby===========Hq&..~~~~#",
      "#~~~T============zpp..&........~~~~#",
      "#~~~##Hfe.l...@============o&..~~~~#",
      "#~~~...&.......=##=##...##=##..~~~~#",
      "#~~~...Hdrr=====#==.#...#.=.#..~~~~#",
      "#~~~....1......=##N##...#.=.#..~~~~#",
      "#~~~........pm.=========##O##..~~~~#",
      "#~~~.&.&.l.....=......&.....&..~~~~#",
      "####################################",
    ]),
    npcs: { "1": "raider" },
    talkers: { k: "clerk", q: "fisher", c: "vendor", h: "hawker", y: "kid", e: "carter", d: "docker", z: "tutorWard" },
    portals: {
      A: { to: "hold", at: "A" },
      B: { to: "yard", at: "B" },
      M: { to: "customs", at: "M" },
      N: { to: "ropes", at: "N" },
      O: { to: "lamp", at: "O" },
      T: { to: "ridge", at: "T" },
    },
    order: [],
    gate: "open",
    signs: [],
    items: {},
  },
  hold: {
    id: "hold",
    chapter: "dock",
    name: "西仓",
    kicker: "港律",
    enter: "仓分两厢。中间是过道。潮气往骨头里钻。",
    mood: "货在厢里。字也在厢里。",
    ascii: rows("hold", [
      "################################",
      "#..............................#",
      "#..########......########......#",
      "#..#..g...#......#..I...#......#",
      "H..#..v...#......#..!...#......#",
      "#..#......#......#......#......#",
      "#..###..###......###..###......#",
      "#..............l...............A",
      "#..............C...............#",
      "#..............................#",
      "#..########......########......#",
      "#..#..vv..#......#..!...#......#",
      "#..#..b...#......#..t...#......#",
      "#..###..###......###..###......#",
      "#..............................#",
      "#..............................#",
      "#..............................#",
      "################################",
    ]),
    npcs: {},
    talkers: { g: "porter" },
    portals: { A: { to: "wharf", at: "A" }, H: { to: "salt", at: "H" } },
    order: [],
    gate: "open",
    signs: [
      "西风过，东船开。南人上台，北印收。印要见火才认。",
      "破门刀若北上，拦。名册未干。——镜廷",
    ],
    items: { I: "brand" },
  },
  yard: {
    id: "yard",
    chapter: "dock",
    name: "印院",
    kicker: "港律",
    enter: "四合院。炉在天井。北面是岗。",
    mood: "院空着。空着的地方最认印。",
    ascii: rows("yard", [
      "####################################",
      "#^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^#",
      "#^^.&.&&&....l...C.....&&......o.^^#",
      "#^^..............G...............^^#",
      "#^^...1...#######=########.......^^#",
      "#^^.......#.&&...=.......#.......^^#",
      "#^^.......#.t....n.......#.......^^#",
      "#^^.......#.....w*ex.....#.......^^#",
      "#^^.......#......s.....t.#.......^^#",
      "#^^.......#......=....&&.#.......^^#",
      "#^^.......###.........###........^^#",
      "#^^.&&.l.......i......f...&&...y...A",
      "#^^............###B###...........^^#",
      "####################################",
    ]),
    npcs: { "1": "bandit" },
    talkers: { i: "stamp", y: "warder" },
    portals: { B: { to: "wharf", at: "B" }, A: { to: "spit", at: "A" } },
    order: ["w", "e", "s", "n"],
    gate: "fire-seals",
    signs: [],
    items: {},
  },
  spit: {
    id: "spit",
    chapter: "dock",
    name: "跳板",
    kicker: "港律",
    enter: "板伸进潮里。两边是乱石。",
    mood: "板在晃。人不是。",
    ascii: rows("spit", [
      "####################################",
      "#%%%%%%%%%%%..#D#........%%%%%%%%%%#",
      "#%%%%%%%%%%%%~...~%%%%%%%%%%%%%%%%%#",
      "#%%%%%%%%%%%%~.3.~%%%%%%%%%%%%%%%%%#",
      "#~~~~~~~~~~~~~...~~~~~~~~~~~~~~~~~~#",
      "#~~~~~~~~~~~~~.!.~~~~~~~~~~~~~~~~~~#",
      "#~~~~~~~~~~~~~.2.~~~~~~~~~~~~~~~~~~#",
      "#~~~~~~~~~~~~~...~~~~~~~~~~~~~~~~~~#",
      "#~~~~~~~~~~~~~.1.~~~~~~~~~~~~~~~~~~#",
      "#~~~~~~~~~~~~~...~~~~~~~~~~~~~~~~~~#",
      "#%%%%..........................~~~~#",
      "#%^^^.....q...............r....~~~~#",
      "#%%%%~~~~~~~~~~A~~~~~~~~~~~~~~~~^^%#",
      "#%%%%%%~~~~~~~^^^~~~~~~~%%%%%%%%%%%#",
      "####################################",
    ]),
    npcs: { "1": "catcher", "2": "escort", "3": "piler" },
    talkers: { q: "boat" },
    portals: { A: { to: "yard", at: "A" }, D: { to: "lane", at: "D" } },
    order: [],
    gate: "open",
    signs: ["箱子上的漆是朱红。底下有字：镜廷。"],
    items: {},
  },
  customs: {
    id: "customs",
    chapter: "dock",
    name: "税卡",
    kicker: "港律",
    enter: "册案横在当中。里间关着。潮祠的香从东边漏进来。",
    mood: "税认册。册认角。",
    ascii: rows("customs", [
      "################################",
      "#..............@...............#",
      "#..##########..##########......#",
      "#..#........#..#........#......#",
      "#..#........G..#....!...#......#",
      "#..##########..##########......#",
      "#..............!...............#",
      "#..............c...............#",
      "#..............1...............#",
      "M..............................V",
      "#..............................#",
      "################################",
    ]),
    npcs: { "1": "inkhand" },
    talkers: { c: "filer" },
    portals: { M: { to: "wharf", at: "M" }, V: { to: "shrine", at: "V" } },
    order: [],
    gate: "books",
    signs: ["册子缺一角。角不在案上。", "官盐坛口朝西。东边那一排是私盐。"],
    items: {},
  },
  salt: {
    id: "salt",
    chapter: "dock",
    name: "盐仓",
    kicker: "港律",
    enter: "两厢都是坛。潮气把封泥泡软了。",
    mood: "盐是官的。口是人转的。",
    ascii: rows("salt", [
      "################################",
      "#..............................#",
      "#..########......########......#",
      "#..#a.a.a.#......#.j.j.j#......#",
      "#..#......#......#......#......#",
      "#..###..###......###..###......#",
      "#..............h...............#",
      "#.........d....................#",
      "#..............................H",
      "#.........................1....#",
      "################################",
    ]),
    npcs: { "1": "smuggler" },
    talkers: { h: "saltman", d: "digger" },
    portals: { H: { to: "hold", at: "H" } },
    order: [],
    gate: "open",
    signs: [],
    items: {},
  },
  ropes: {
    id: "ropes",
    chapter: "dock",
    name: "缆厂",
    kicker: "港律",
    enter: "缆盘在地上。后厂的门关着。石头压着棚。",
    mood: "缆认风。结认人。",
    ascii: rows("ropes", [
      "################################",
      "#%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%#",
      "#%............#P#............%%#",
      "#%.............G.............%%#",
      "#%........@..................%%#",
      "#%.....................1.....%%#",
      "#%.....r.....d.....h.........%%#",
      "#%.............q.............%%#",
      "#%..........2................%%#",
      "#%....#N#.............#Q#....%%#",
      "#%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%#",
      "################################",
    ]),
    npcs: { "1": "robber", "2": "stakeboss" },
    talkers: { q: "roper" },
    portals: { N: { to: "wharf", at: "N" }, P: { to: "docks", at: "P" }, Q: { to: "shed", at: "Q" } },
    order: [],
    gate: "deed",
    signs: [],
    items: {},
  },
  shed: {
    id: "shed",
    chapter: "dock",
    name: "工寮",
    kicker: "港律",
    enter: "棚矮。凳是潮的。人还坐着。",
    mood: "坐过的人把纸垫在底下。",
    ascii: rows("shed", [
      "################################",
      "#..............................#",
      "#..########################....#",
      "#..#......................#....#",
      "#..#..t..............d....#....#",
      "#..#......................#....#",
      "#..############..##########....#",
      "#..............................#",
      "#..............................#",
      "###############Q################",
    ]),
    npcs: {},
    talkers: { d: "coolie" },
    portals: { Q: { to: "ropes", at: "Q" } },
    order: [],
    gate: "open",
    signs: [],
    items: {},
  },
  shrine: {
    id: "shrine",
    chapter: "dock",
    name: "潮祠",
    kicker: "港律",
    enter: "香灰是冷的。水闸的潮声从东边过来。",
    mood: "神听潮。不听人。",
    ascii: rows("shrine", [
      "################################",
      "#..............................#",
      "#..########################....#",
      "V..#....1.................#....W",
      "#..#..........a...........#....#",
      "#..#..........h...........#....#",
      "#..#......................#....#",
      "#..############..##########....#",
      "#..............................#",
      "#..............................#",
      "################################",
    ]),
    npcs: { "1": "bookcut" },
    talkers: { h: "pilgrim" },
    portals: { V: { to: "customs", at: "V" }, W: { to: "sluice", at: "W" } },
    order: [],
    gate: "open",
    signs: [],
    items: {},
  },
  lamp: {
    id: "lamp",
    chapter: "dock",
    name: "灯楼",
    kicker: "港律",
    enter: "灯楼砌在石头上。南盏是灭过的。",
    mood: "灯认油。值房认香。",
    ascii: rows("lamp", [
      "################################",
      "#%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%#",
      "#%..##########..##########...%%#",
      "#%..#........#..#....$...#...%%#",
      "#%..#........G..#........#...%%#",
      "#%..##########..##########...%%#",
      "#%.............y.............%%#",
      "#%^^....1....................%%#",
      "#%^^..........#O#............%%#",
      "#%%%%..................u.....%%#",
      "################################",
    ]),
    npcs: { "1": "glasspin" },
    talkers: { y: "lamper" },
    portals: { O: { to: "wharf", at: "O" } },
    order: [],
    gate: "incense",
    signs: [],
    items: { $: "badge" },
  },
  docks: {
    id: "docks",
    chapter: "dock",
    name: "船坞",
    kicker: "港律",
    enter: "船骨还没上板。箱子压在缆下。",
    mood: "坞认结。结认风。",
    ascii: rows("docks", [
      "################################",
      "#..............................#",
      "#..########################....#",
      "#..#....1.................#....#",
      "#..#..........C...........#....#",
      "#..#..........d...........#....#",
      "#..#......................#....#",
      "#..############..##########....#",
      "#..............................#",
      "#..............................#",
      "###############P################",
    ]),
    npcs: { "1": "knotboss" },
    talkers: { d: "wright" },
    portals: { P: { to: "ropes", at: "P" } },
    order: [],
    gate: "open",
    signs: [],
    items: {},
  },
  sluice: {
    id: "sluice",
    chapter: "dock",
    name: "水闸",
    kicker: "港律",
    enter: "三根杠横在水上。岗夹着水道。",
    mood: "水认杠。人不认。",
    ascii: rows("sluice", [
      "####################################",
      "#%%%%%%%%^^^^^..~~~~....%%%%%%%%%%%#",
      "#%^^^^^^........~.C.~........^^^^%%#",
      "#%^^^...........~.G.~.........^^^%%#",
      "#%^^............~~~~...........^^%%#",
      "#%^^...........................^^%%#",
      "#%^^............n..............^^%%#",
      "#%^^..........w...e............^^%%#",
      "#%^^............s..............^^%%#",
      "#%^^............y..............^^%%#",
      "#%^^^..........#W#.............^^%%#",
      "#%%%%%%^^^^^^^^..~~~~.....%%%%%%%%%#",
      "####################################",
    ]),
    npcs: {},
    talkers: { y: "sluicer" },
    portals: { W: { to: "shrine", at: "W" } },
    order: [],
    gate: "tide",
    signs: [],
    items: {},
  },
  lane: {
    id: "lane",
    chapter: "alley",
    name: "垂街",
    kicker: "巷律",
    enter: "铺门对着街。巷角有一洼死水。坡从西面压过来。",
    mood: "巷比江窄。窄的地方好拦人。",
    ascii: rows("lane", [
      "####################################",
      "#~~~......&&....=.......&&......~~~#",
      "#~~~..#######...=...#######.2...~~~#",
      "#~~~..#.....#...=...#.....#.....~~~#",
      "#~~~..#.v...#...=...#..j..#.....~~~#",
      "#~~~..#.....#...=...#.t...#.....~~~#",
      "#~~~..#######...=...#######.....~~~#",
      "#~~~..........##=##.............~~~#",
      "#~~~.&..l.r...#.=.#....o....&...~~~#",
      "#~~~.&........#.=.#..........&..~~~#",
      "#~~~.&........##F##...........&.~~~#",
      "#~~~.c.b==============h$====....~~~#",
      "#~~~............=...............~~~#",
      "#~~~....&&1.....=.......&&......~~~#",
      "#~~~..f.........=..z..l.........~~~#",
      "#~~~............=.....~~~~~.....~~~#",
      "#~~~.........###=###..~~~~~.....~~~#",
      "#~~~.........#.t=..#...~~~......~~~#",
      "#~~~.........#..=..#............~~~#",
      "#~~~.........###D###............~~~#",
      "#~~~............u...............~~~#",
      "#~~~............g...............~~~#",
      "####################################",
    ]),
    npcs: { "1": "hauler", "2": "thug" },
    talkers: { g: "beggar", h: "hawker", u: "aunt", c: "barber", z: "tutorEdge" },
    portals: { D: { to: "spit", at: "D" }, F: { to: "tea", at: "F" } },
    order: [],
    gate: "open",
    signs: [],
    items: { $: "cake" },
  },
  tea: {
    id: "tea",
    chapter: "alley",
    name: "茶棚",
    kicker: "巷律",
    enter: "棚里有人。碗还热。更鼓在北。",
    mood: "茶是热的。话是冷的。",
    ascii: rows("tea", [
      "###############H################",
      "#..............................#",
      "#..############..############..#",
      "#..#........................#..#",
      "#..#..........f.............#..#",
      "#..#..o....a.j.j.......C....#..#",
      "#..#........................#..#",
      "#..#...........u............#..#",
      "#..#........................#..#",
      "#..#..t.................t...#..#",
      "#..############..############..#",
      "#..............................#",
      "#..............................#",
      "#..............................#",
      "#..............................#",
      "###############F################",
    ]),
    npcs: {},
    talkers: { o: "inn", u: "guest" },
    portals: { F: { to: "lane", at: "F" }, H: { to: "drums", at: "H" } },
    order: [],
    gate: "open",
    signs: [],
    items: {},
  },
  drums: {
    id: "drums",
    chapter: "alley",
    name: "更院",
    kicker: "巷律",
    enter: "更楼在北。鼓在院里。西侧一洼静水。岗从四面围过来。",
    mood: "更鼓不认人。认更。",
    ascii: rows("drums", [
      "####################################",
      "#%%%%%%%%^^^^^...............%%%%%%#",
      "#%%%%%%%%%%%%%%.J=%%%%%%%%%%%%%%%%%#",
      "#%%%%%%%%%%%%%%.3=%%%%%%%%%%%%%%%%%#",
      "#%%%%%%%%%%%%%%.G=%%%%%%%%%%%%%%%%%#",
      "#%%%%%%%%%%%%%%.2=%%%%%%%%%%%%%%%%%#",
      "#%~~.............=.............^^%%#",
      "#%~~~...........n=.............^^%%#",
      "#%~~~~........w.=.e............^^%%#",
      "#%~~~...........s=.............^^%%#",
      "#%~~............y=.............^^%%#",
      "#%^^^............=.............^^%%#",
      "#%%%%%%^^^^^^^^....#H#....%%%%%%%%%#",
      "####################################",
    ]),
    npcs: { "2": "alley", "3": "trapper" },
    talkers: { y: "watch" },
    portals: { H: { to: "tea", at: "H" }, J: { to: "outer", at: "J" } },
    order: [],
    gate: "watch",
    signs: [],
    items: {},
  },
  outer: {
    id: "outer",
    chapter: "court",
    name: "外庭",
    kicker: "门律",
    enter: "中轴石道。东厢外一泓湖水。岗在门外。",
    mood: "门还远。石道已经开始认人了。",
    ascii: rows("outer", [
      "####################################",
      "#%%%%%%%%%%%%%%.K=%%%%%%%%%%%%%%%%%#",
      "#%^^^^^^.........=...........^^^^%%#",
      "#%^^..#####......=.......#####..^^%#",
      "#%^^..#..........=.........~.#..^^%#",
      "#%^^..#.t........1.......~~~.#..^^%#",
      "#%^^..#..........=.......~~..#..^^%#",
      "#%^^..#####......=.......#####..^^%#",
      "#%^^^............=.............^^%%#",
      "#%%%%...........f=.............^^%%#",
      "#%%%%%...........=.............^^%%#",
      "#%%%%%%.........J=.............^^%%#",
      "#%%%%%%%^^^^^^^^..........%%%%%%%%%#",
      "####################################",
    ]),
    npcs: { "1": "delay" },
    talkers: { f: "usher" },
    portals: { J: { to: "drums", at: "J" }, K: { to: "glass", at: "K" } },
    order: [],
    gate: "open",
    signs: [],
    items: {},
  },
  glass: {
    id: "glass",
    chapter: "court",
    name: "镜廊",
    kicker: "门律",
    enter: "廊里有三面镜子。门在北。",
    mood: "廊不照路。照名。",
    ascii: rows("glass", [
      "###############L################",
      "#..............................#",
      "#..............................#",
      "#..............G...............#",
      "#..............................#",
      "#............w.x.e.............#",
      "#..............................#",
      "#..............z...............#",
      "#..............................#",
      "#..............................#",
      "#..............................#",
      "###############K################",
    ]),
    npcs: {},
    talkers: { z: "maid" },
    portals: { K: { to: "outer", at: "K" }, L: { to: "inner", at: "L" } },
    order: [],
    gate: "mirror",
    signs: [],
    items: {},
  },
  inner: {
    id: "inner",
    chapter: "court",
    name: "名册房",
    kicker: "门律",
    enter: "正堂在北。案上有册。册上有墨。",
    mood: "墨还没干。",
    ascii: rows("inner", [
      "################################",
      "#......######..........######..#",
      "#......#.........E..........#..#",
      "#......#..t......3........t.#..#",
      "#......#..m......$..........#..#",
      "#......######..........######..#",
      "#................2.............#",
      "#..............................#",
      "#..............................#",
      "###############L################",
    ]),
    npcs: { "2": "twin", "3": "lord" },
    talkers: { m: "scribe" },
    portals: { L: { to: "glass", at: "L" } },
    order: [],
    gate: "open",
    signs: [],
    items: { $: "scrap" },
  },
  cave: {
    id: "cave",
    chapter: "dock",
    name: "潮窟",
    kicker: "港律",
    enter: "潮气从石头缝里出来。有人在里头住。",
    mood: "井认盖。窟认潮。",
    ascii: rows("cave", [
      "################################",
      "#%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%#",
      "#%....%%%..........%%%.......%%#",
      "#%..%%%......h........%%%....%%#",
      "#%................C..........%%#",
      "#%....%%%.............%%%....%%#",
      "#%...........1...............%%#",
      "#%.............U.............%%#",
      "#%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%#",
      "################################",
    ]),
    npcs: { "1": "cavehand" },
    talkers: { h: "hermit" },
    portals: { U: { to: "lamp", at: "U" } },
    order: [],
    gate: "open",
    signs: [],
    items: {},
  },
  cellar: {
    id: "cellar",
    chapter: "dock",
    name: "暗窖",
    kicker: "港律",
    enter: "石头底下是潮。潮底下还有人。",
    mood: "名册盖不住的人，往潮里钻。",
    ascii: rows("cellar", [
      "################################",
      "#%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%#",
      "#%....%%%%........%%%%.......%%#",
      "#%..%%%%.....z........%%%%...%%#",
      "#%...............C...........%%#",
      "#%....%%%%.............%%%%..%%#",
      "#%...........................%%#",
      "#%.............Y.............%%#",
      "#%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%#",
      "################################",
    ]),
    npcs: {},
    talkers: { z: "fugitive" },
    portals: { Y: { to: "wharf", at: "Y" } },
    order: [],
    gate: "open",
    signs: [],
    items: {},
  },
};

export const SCENE_LIST = Object.keys(SCENES) as SceneId[];

export function talkBeat(id: string, ctx: TalkCtx): Voice {
  if (id === "clerk") {
    if (ctx.beaten.includes("catcher")) {
      return {
        said: "「北面来的帖子写的是你的刀。」",
        thought: "账房不看刀。他看印。印过了，刀还是要被点名。",
      };
    }
    if (ctx.branded) {
      return {
        said: "「闸开了你也过不了。跳板上有人点名。」",
        thought: "过帖是给闸看的。点名是给人看的。",
      };
    }
    if (ctx.items.includes("brand")) {
      return {
        said: "「印烫热了才认。北院那几枚是冷的。」",
        thought: "铜还烫。写这帖的人没走远。",
      };
    }
    if (ctx.items.includes("slip")) {
      return {
        said: "「税卡那本册子，缺的就是这个角。」",
        thought: "他不收纸。他只认册。",
      };
    }
    if (ctx.flags.includes("metFisher")) {
      if (ctx.pick === "ask") {
        return {
          said: "“夜里的事不入册。你要听，去岸上问。”",
          thought: "",
        };
      }
      if (ctx.pick === "leave") {
        return { said: "“账还没结完。”", thought: "" };
      }
      return {
        said: "“渔婆爱说夜里的事。入册的只有过帖。”",
        thought: "",
        choices: [
          { id: "ask", label: "夜里的事呢" },
          { id: "leave", label: "不打扰" },
        ],
      };
    }
    if (ctx.pick === "brand") {
      return {
        said: "“西仓有个搬货的，肩上还扛着杠。火印在他认的那张桌上。你去问，别在我这儿吵。”",
        thought: "他不拦我。他只报规矩。",
      };
    }
    if (ctx.pick === "leave") {
      return { said: "“账还没结完。你站着，潮气往墨里钻。”", thought: "" };
    }
    return {
      said: "“坐。潮气重，墨干得慢。过帖的事不归我批——我只管账上有没有这一笔。”",
      thought: "账房的人不抬头。抬头的时候，多半已经晚了。",
      choices: [
        { id: "brand", label: "过帖呢" },
        { id: "leave", label: "不打扰" },
      ],
    };
  }
  if (id === "porter") {
    if (ctx.party?.includes("porter")) {
      return {
        said: "「杠在。你走你的。」",
        thought: "他不看账桌了。账桌的事了了。",
      };
    }
    if (ctx.branded) {
      return {
        said: "「火印烫过了。账桌那边的人不认活人。我跟你走。杠还在肩上。」",
        thought: "他不像官差。官差不会把命押在别人的印上。",
        flags: ["joinPorter"],
      };
    }
    if (ctx.items.includes("brand")) {
      return {
        said: "「烫过就去北院。炉认火，印认顺序。顺序在东厢墙上。」",
        thought: "他不像官差。官差不会把桌子指给我。",
        flags: ["metPorter"],
      };
    }
    if (ctx.flags.includes("metFisher")) {
      if (ctx.pick === "ask") {
        return {
          said: "“西门外盐工夜里不搬货。他蹲着。蹲的不是坛。”",
          thought: "",
          flags: ["metPorter"],
        };
      }
      if (ctx.pick === "leave") {
        return { said: "“杠还在肩上。”", thought: "", flags: ["metPorter"] };
      }
      return {
        said: "“西门外夜里有人蹲。盐工不认我。我只认桌子。”",
        thought: "",
        flags: ["metPorter"],
        choices: [
          { id: "ask", label: "蹲的是谁" },
          { id: "leave", label: "知道了" },
        ],
      };
    }
    if (ctx.pick === "desk") {
      return {
        said: "“印在东厢账桌上。墙上那两行字是给活人读的——死人读不懂。西边那扇门最近有人进出，脚步轻，不像搬货。”",
        thought: "他把桌子指给我。官差不会这样。",
        flags: ["metPorter"],
      };
    }
    if (ctx.pick === "leave") {
      return { said: "“杠还在肩上。你走你的。”", thought: "" };
    }
    return {
      said: "“印不在货里。货只会压肩。你要问印，东厢有桌；你要问货，西厢有人夜里蹲。”",
      thought: "潮气从门缝进来。他肩上的杠比话重。",
      choices: [
        { id: "desk", label: "印在哪" },
        { id: "leave", label: "告辞" },
      ],
    };
  }
  if (id === "boat") {
    if (ctx.party?.includes("boat")) {
      return {
        said: "「船还在。人已经上岸。」",
        thought: "她不问过帖了。帖已经过了。",
      };
    }
    if (ctx.beaten.includes("catcher") && ctx.branded) {
      return {
        said: "「闸后头那个人点的是刀。你过了。我跟你走。剑比篙短，够用。」",
        thought: "船认过帖。她认刀。",
        flags: ["joinBoat"],
      };
    }
    if (ctx.items.includes("badge")) {
      return {
        said: "「腰牌是灯楼的。船认过帖，不认腰牌。」",
        thought: "她看印。牌她看过一眼就不看了。",
        flags: ["metBoat"],
      };
    }
    if (ctx.beaten.includes("catcher")) {
      return {
        said: "「朱红箱子底下还有字。不是给船看的。」",
        thought: "船认过帖。镜廷认刀。",
        flags: ["metBoat"],
      };
    }
    if (ctx.branded) {
      return {
        said: "「闸后头那个人点的是刀，不是货。」",
        thought: "她不问我叫什么。她问印。印过了，她开始问刀。",
        flags: ["metBoat"],
      };
    }
    if (ctx.pick === "ask") {
      return {
        said: "“没有火印的人，船不认。”",
        thought: "",
        flags: ["metBoat"],
      };
    }
    if (ctx.pick === "leave") {
      return { said: "“过帖办好再来。”", thought: "", flags: ["metBoat"] };
    }
    return {
      said: "“过帖呢？船认帖，不认刀。”",
      thought: "",
      flags: ["metBoat"],
      choices: [
        { id: "ask", label: "没有帖呢" },
        { id: "leave", label: "我再去办" },
      ],
    };
  }
  if (id === "inn") {
    if (ctx.flags.includes("heardTree")) {
      return {
        said: "「歪树不是我的。茶客昨夜看见有人蹲过。」",
        thought: "她认空碗。不认树。",
      };
    }
    if (ctx.items.includes("scrap")) {
      return {
        said: "「半页纸。镜廷连抄本都要收回去。」",
        thought: "她见过这纸。见过就说明抄过的人不止我一个。",
      };
    }
    if (ctx.flags.includes("emptyBowl")) {
      return {
        said: "「锁开了就开。别谢我。北面更夫只认北鼓。」",
        thought: "她把钥匙藏在空的东西里。和港律一样。",
      };
    }
    if (ctx.pick === "bowl") {
      return {
        said: "“空碗是我的。有茶的别动——动了，锁不认你。北面更夫只认北鼓，不认热茶。”",
        thought: "空的才是钥匙。和港律一样。",
      };
    }
    if (ctx.pick === "leave") {
      return { said: "“茶凉了就不好喝了。门别挡着。”", thought: "" };
    }
    return {
      said: "“坐。碗还热。昨夜棚里有人吵到打更，茶客睡不着，我也不睡。你别挡门口。”",
      thought: "棚婆认碗。认完碗，才认人。",
      choices: [
        { id: "bowl", label: "碗怎么分" },
        { id: "leave", label: "告辞" },
      ],
    };
  }
  if (id === "guest") {
    if (ctx.flags.includes("metBeggar") && !ctx.flags.includes("treeOpen")) {
      if (ctx.pick === "tree") {
        return {
          said: "“棚后头那棵根往北。棚婆不认。”",
          thought: "",
          flags: ["metGuest", "heardTree"],
        };
      }
      if (ctx.pick === "leave") {
        return { said: "“那就别吵。”", thought: "", flags: ["metGuest"] };
      }
      return {
        said: "“棚婆认碗。有人不认。”",
        thought: "",
        flags: ["metGuest"],
        choices: [
          { id: "tree", label: "谁不认" },
          { id: "leave", label: "知道了" },
        ],
      };
    }
    if (ctx.items.includes("scrap")) {
      return {
        said: "「纸对上了。墨是新的。」",
        thought: "他说话像在对账。",
        flags: ["metGuest"],
      };
    }
    if (ctx.pick === "night") {
      return {
        said: "“昨夜有人把名册抄本撕了半页，往北走。更鼓只敲北面那一更——南面的更，像是被人捂住了。”",
        thought: "他说话像在对账。账对上了，人就不对劲。",
        flags: ["metGuest"],
      };
    }
    if (ctx.pick === "leave") {
      return { said: "“那就别吵。我还想眯一会儿。”", thought: "", flags: ["metGuest"] };
    }
    return {
      said: "“昨夜没睡好。棚外有脚步，棚里有纸响。你也别吵——吵了，昨夜那半页纸更远。”",
      thought: "茶客柳的眼圈是青的。青的地方，多半藏过事。",
      flags: ["metGuest"],
      choices: [
        { id: "night", label: "昨夜什么事" },
        { id: "leave", label: "那就歇着" },
      ],
    };
  }
  if (id === "watch") {
    if (ctx.party?.includes("watch")) {
      return {
        said: "「北更过了。刀还在腰上。」",
        thought: "一更就够。他跟来了。",
      };
    }
    if (ctx.flags.includes("watchOpen")) {
      return {
        said: "「北栅开了。你走你的。我也走。夜路认刀，不认鼓。」",
        thought: "一更就够。不像院里那四枚印。",
        flags: ["joinWatch"],
      };
    }
    if (ctx.pick === "ask") {
      return {
        said: "“对着北鼓拍一下就行。别踩。西皮是空的。”",
        thought: "",
        flags: ["metWatch"],
      };
    }
    if (ctx.pick === "leave") {
      return { said: "“北更过了再走。”", thought: "", flags: ["metWatch"] };
    }
    return {
      said: "“北更起夜。别把鼓当印踩。”",
      thought: "",
      flags: ["metWatch"],
      choices: [
        { id: "ask", label: "敲哪一面" },
        { id: "leave", label: "知道了" },
      ],
    };
  }
  if (id === "stamp") {
    if (ctx.pick === "ask") {
      return { said: "“炉在当中。印要见火。顺序不在这院里。”", thought: "" };
    }
    if (ctx.pick === "leave") {
      return { said: "“别伸手。”", thought: "" };
    }
    return {
      said: "“炉在当中。别伸手。”",
      thought: "",
      choices: [
        { id: "ask", label: "印怎么烫" },
        { id: "leave", label: "告辞" },
      ],
    };
  }
  if (id === "filer") {
    if (ctx.flags.includes("booksOk")) {
      return {
        said: "「盐上的字，朝西的才是官家的。」",
        thought: "册子合上了。他开始说盐。",
      };
    }
    if (ctx.items.includes("slip")) {
      return {
        said: "“你手里那角，对上就对上了。我对册，不对人。”",
        thought: "",
      };
    }
    if (ctx.pick === "ask") {
      return { said: "“册子缺一角。缺的那页自己会回来。”", thought: "" };
    }
    if (ctx.pick === "leave") {
      return { said: "“我对册，不对人。”", thought: "" };
    }
    return {
      said: "“册子合不上。”",
      thought: "",
      choices: [
        { id: "ask", label: "缺哪一页" },
        { id: "leave", label: "告辞" },
      ],
    };
  }
  if (id === "coolie") {
    if (ctx.pick === "ask") {
      return { said: "“凳下那角纸不是我的。我坐过就坐过。”", thought: "" };
    }
    if (ctx.pick === "leave") {
      return { said: "“潮气往凳下钻。”", thought: "" };
    }
    return {
      said: "“潮气往凳下钻。你也坐？”",
      thought: "",
      choices: [
        { id: "ask", label: "凳下什么" },
        { id: "leave", label: "不坐" },
      ],
    };
  }
  if (id === "saltman") {
    if (ctx.items.includes("deed")) {
      return {
        said: "“契对上了。缆厂后头才认这个。”",
        thought: "",
      };
    }
    if (ctx.pick === "ask") {
      return { said: "“有人把坛口转过。西边那一排，我没敢动。”", thought: "" };
    }
    if (ctx.pick === "leave") {
      return { said: "“东边封泥是新的。”", thought: "" };
    }
    return {
      said: "“坛口有人动过。你问哪一排？”",
      thought: "",
      choices: [
        { id: "ask", label: "西边那排" },
        { id: "leave", label: "不敢动" },
      ],
    };
  }
  if (id === "roper") {
    if (ctx.party?.includes("hooker")) {
      return {
        said: "「缆在你这边。钩也在。」",
        thought: "后厂的门已经开过。",
      };
    }
    if (ctx.items.includes("deed") && ctx.flags.includes("knotOk")) {
      return {
        said: "「契对了。结也对了。钩我带着。后厂的事了了。」",
        thought: "缆认风。人认路。",
        flags: ["joinRoper"],
      };
    }
    if (ctx.items.includes("deed")) {
      return {
        said: "「死结朝下的，才压得住风。活结是给小船的。」",
        thought: "后厂的门认契。坞里的箱子认结。",
      };
    }
    if (ctx.pick === "ask") {
      return { said: "“没有契的人，后厂不进。工寮那人老把纸垫在凳下，湿了就湿了。”", thought: "" };
    }
    if (ctx.pick === "leave") {
      return { said: "“后厂不认生人。”", thought: "" };
    }
    return {
      said: "“后厂不认生人。”",
      thought: "",
      choices: [
        { id: "ask", label: "怎么进" },
        { id: "leave", label: "告辞" },
      ],
    };
  }
  if (id === "wright") {
    if (ctx.flags.includes("heardStone")) {
      return {
        said: "「桩认船。石头不认。有人把窖口压在底下。」",
        thought: "他不看契。他看结。石头他看过。",
      };
    }
    if (ctx.flags.includes("knotOk")) {
      return {
        said: "「这结压得住。箱子你拿。」",
        thought: "死结朝下。船骨才不散。",
      };
    }
    if (ctx.pick === "ask") {
      return { said: "“死结朝下的，才压得住。缆会自己认。”", thought: "" };
    }
    if (ctx.pick === "leave") {
      return { said: "“结不对。”", thought: "" };
    }
    return {
      said: "“结不对。你问活的还是死的。”",
      thought: "",
      choices: [
        { id: "ask", label: "怎么才压得住" },
        { id: "leave", label: "告辞" },
      ],
    };
  }
  if (id === "pilgrim") {
    if (ctx.party?.includes("pilgrim")) {
      return {
        said: "「香灰冷了。杖还热。」",
        thought: "她不看闸了。",
      };
    }
    if (ctx.items.includes("incense") && ctx.flags.includes("tideOpen")) {
      return {
        said: "「水认过了。我跟你走。锡杖比香长。」",
        thought: "神听潮。人听路。",
        flags: ["joinPilgrim"],
      };
    }
    if (ctx.items.includes("incense")) {
      return {
        said: "「匙是凉的。灯楼值房认这个。」",
        thought: "神听潮。匙给人。",
      };
    }
    if (ctx.flags.includes("heardWell")) {
      return {
        said: "「井不在祠里。灯楼南墙根有盖。灯守不认井，只认油。」",
        thought: "她不看闸。她看香。盖她看过一眼。",
      };
    }
    if (ctx.pick === "ask") {
      return { said: "“退潮的时候，香灰自己倒。”", thought: "" };
    }
    if (ctx.pick === "leave") {
      return { said: "“香还热。”", thought: "" };
    }
    return {
      said: "“香还热。你问潮还是问香？”",
      thought: "",
      choices: [
        { id: "ask", label: "退潮呢" },
        { id: "leave", label: "告辞" },
      ],
    };
  }
  if (id === "lamper") {
    if (ctx.flags.includes("heardWell") || ctx.flags.includes("askedWell")) {
      return {
        said: "「南盏底下不是油。是盖。我没掀过。」",
        thought: "灭过的那盏对着水闸。盖对着潮。",
        flags: ["askedWell"],
      };
    }
    if (ctx.pick === "ask") {
      return { said: "“南盏灭过。北盏还亮。我只添油，不问潮。值房是香开的。”", thought: "" };
    }
    if (ctx.pick === "leave") {
      return { said: "“我只添油。”", thought: "" };
    }
    return {
      said: "“我只添油。不问潮。”",
      thought: "",
      choices: [
        { id: "ask", label: "南盏呢" },
        { id: "leave", label: "告辞" },
      ],
    };
  }
  if (id === "sluicer") {
    if (ctx.flags.includes("tideOpen")) {
      return {
        said: "「水认了。北闸你自己过。」",
        thought: "他仍然不认潮。水替他认。",
      };
    }
    if (ctx.pick === "ask") {
      return { said: "“南盏灭过。南边那根对着灭过的那盏。”", thought: "" };
    }
    if (ctx.pick === "leave") {
      return { said: "“三根杠。水认哪根，我不认。”", thought: "" };
    }
    return {
      said: "“三根杠。水认哪根，我不认。”",
      thought: "",
      choices: [
        { id: "ask", label: "认哪根" },
        { id: "leave", label: "告辞" },
      ],
    };
  }
  if (id === "usher") {
    if (ctx.pick === "ask") {
      return { said: "“廊里真的那面不照人。”", thought: "" };
    }
    if (ctx.pick === "leave") {
      return { said: "“除名不是死。”", thought: "" };
    }
    return {
      said: "“除名不是死。是从名册上被盖住。”",
      thought: "",
      choices: [
        { id: "ask", label: "真的那面呢" },
        { id: "leave", label: "告辞" },
      ],
    };
  }
  if (id === "maid") {
    if (ctx.flags.includes("trueMirror")) {
      return {
        said: "「名册房在北。墨还没干。」",
        thought: "她不看我的脸。她看有没有被盖住。",
        flags: ["metMaid"],
      };
    }
    if (ctx.pick === "ask") {
      return {
        said: "“真的那面不照人。照的是名。中镜不要看。”",
        thought: "",
        flags: ["metMaid"],
      };
    }
    if (ctx.pick === "leave") {
      return { said: "“廊里有三面。别乱看。”", thought: "", flags: ["metMaid"] };
    }
    return {
      said: "“廊里有三面。别乱看。”",
      thought: "",
      flags: ["metMaid"],
      choices: [
        { id: "ask", label: "哪面真" },
        { id: "leave", label: "告辞" },
      ],
    };
  }
  if (id === "fisher") {
    if (ctx.flags.includes("wellOpen") && !ctx.flags.includes("heardStone")) {
      return {
        said: "「南桩底下还有一块。不是井。会响。」",
        thought: "她不看印。她看潮。石头她听过。",
        flags: ["metFisher", "heardStone", "sideStone"],
      };
    }
    if (ctx.flags.includes("heardWell") || ctx.flags.includes("askedWell")) {
      return {
        said: "「盖在南墙根。掀之前先问灯守。」",
        thought: "她把井说成盖。盖比井轻。",
        flags: ["metFisher"],
      };
    }
    if (ctx.flags.includes("metPorter")) {
      if (ctx.pick === "night") {
        return {
          said: "“盖在南墙根。掀之前先问灯守。”",
          thought: "",
          flags: ["metFisher", "heardWell", "sideWell"],
        };
      }
      if (ctx.pick === "leave") {
        return { said: "“潮还没回来。”", thought: "", flags: ["metFisher"] };
      }
      return {
        said: "“搬货的人只认桌子。灯楼南盏灭过。灯守只说油。”",
        thought: "",
        flags: ["metFisher"],
        choices: [
          { id: "night", label: "盖在哪" },
          { id: "leave", label: "知道了" },
        ],
      };
    }
    if (ctx.pick === "night") {
      return {
        said: "“夜里西仓墙根有人蹲。蹲的人不是搬货的。”",
        thought: "",
        flags: ["metFisher", "sideWell"],
      };
    }
    if (ctx.pick === "leave") {
      return { said: "“潮还没回来。”", thought: "", flags: ["metFisher"] };
    }
    return {
      said: "“夜里岸上不安生。潮还没回来，桩上坐着的人却先回来了。你坐不坐。”",
      thought: "渔婆看潮。潮比册老实。",
      flags: ["metFisher"],
      choices: [
        { id: "night", label: "夜里谁在蹲" },
        { id: "leave", label: "不坐" },
      ],
    };
  }
  if (id === "digger") {
    if (ctx.flags.includes("wellOpen")) {
      return {
        said: "「盖开了就开了。我不再蹲。」",
        thought: "盐工夜里不搬货。现在也不蹲了。",
        flags: ["metDigger"],
      };
    }
    if (ctx.pick === "ask") {
      return {
        said: "“她不说井，只说退潮。盖不在盐里。”",
        thought: "",
        flags: ["metDigger", "heardWell", "sideWell"],
      };
    }
    if (ctx.pick === "leave") {
      return { said: "“我夜里不搬货。”", thought: "", flags: ["metDigger"] };
    }
    return {
      said: "“我夜里不搬货。你问白天的，找盐工。”",
      thought: "",
      flags: ["metDigger"],
      choices: [
        { id: "ask", label: "夜里蹲什么" },
        { id: "leave", label: "告辞" },
      ],
    };
  }
  if (id === "beggar") {
    if (ctx.flags.includes("treeOpen")) {
      return {
        said: "「根下空了。空了就别再刨。」",
        thought: "他不看碗。树他看过。",
        flags: ["metBeggar"],
      };
    }
    if (ctx.items.includes("cake")) {
      return {
        said: "「饼你留着。巷口那摊婆不是给我的。棚后头有人说话，说话的人不看碗。」",
        thought: "他不抢饼。他认树。",
        flags: ["metBeggar", "sideTree"],
      };
    }
    if (ctx.pick === "ask") {
      return {
        said: "“茶棚里有人说话。说话的人不看碗，看树。”",
        thought: "",
        flags: ["metBeggar", "sideTree"],
      };
    }
    if (ctx.pick === "leave") {
      return { said: "“让让。巷这么窄。”", thought: "", flags: ["metBeggar"] };
    }
    return {
      said: "“让让。巷这么窄。”",
      thought: "",
      flags: ["metBeggar"],
      choices: [
        { id: "ask", label: "茶棚呢" },
        { id: "leave", label: "借过" },
      ],
    };
  }
  if (id === "hawker") {
    if (ctx.items.includes("cake")) {
      return {
        said: "“那块不是卖的。伢儿眼馋一天了，你拿去给他。我又不收他的钱。”",
        thought: "",
      };
    }
    if (ctx.pick === "cake") {
      return {
        said: "“摊边那块饼凉了。伢儿蹲一天了。你要，拿去。别说是我给的。”",
        thought: "",
      };
    }
    if (ctx.pick === "where") {
      return {
        said: "“路北那棚。找棚婆。空碗是她的，有茶的别动。”",
        thought: "",
      };
    }
    if (ctx.pick === "night") {
      return {
        said: "“夜里北棚那帮人爱坐到打更。昨儿又吵。茶是热的，话不一定。”",
        thought: "",
        choices: [
          { id: "where", label: "北棚怎么走" },
          { id: "leave", label: "哦" },
        ],
      };
    }
    if (ctx.pick === "leave") {
      return { said: "“走就走。热的趁热。”", thought: "" };
    }
    return {
      said: "“还热。过路的也成。给钱就卖，不给钱别挡着我收摊——潮一涨，饼就潮。”",
      thought: "摊婆阿秀的手是热的。热的人，话才肯分给你听。",
      choices: [
        { id: "cake", label: "这块饼呢" },
        { id: "night", label: "这么晚还摆" },
        { id: "leave", label: "告辞" },
      ],
    };
  }
  if (id === "vendor") {
    if (ctx.items.includes("flask")) {
      return {
        said: "「岗上那壶我闻过。西仓夜里有人蹲。不是搬货。」",
        thought: "货在白天走。人在夜里停。",
      };
    }
    if (ctx.pick === "ask") {
      return { said: "“西仓夜里有人蹲。蹲的人问过渔婆。渔婆不看货，看潮。”", thought: "" };
    }
    if (ctx.pick === "leave") {
      return { said: "“看就看，别空手问价。”", thought: "" };
    }
    return {
      said: "“缆、钉、破碗。看就看，别空手问价。”",
      thought: "",
      choices: [
        { id: "ask", label: "夜里西仓" },
        { id: "leave", label: "不买" },
      ],
    };
  }
  if (id === "kid") {
    if (ctx.items.includes("cake")) {
      return {
        said: "“饼是热的。北棚的茶客爱说昨夜。空碗是棚婆的。”",
        thought: "",
      };
    }
    if (ctx.pick === "ask") {
      return {
        said: "“摊上有饼。渔婆夜里还坐在桩上。账房不来。”",
        thought: "",
      };
    }
    if (ctx.pick === "leave") {
      return { said: "“那我不摸缆。”", thought: "" };
    }
    return {
      said: "“江边有船。大人不让摸缆。”",
      thought: "",
      choices: [
        { id: "ask", label: "夜里谁坐桩上" },
        { id: "leave", label: "我不摸" },
      ],
    };
  }
  if (id === "aunt") {
    if (ctx.items.includes("cake")) {
      return {
        said: "「饼给伢儿。棚里有人说话。说话的人不看碗。」",
        thought: "巷比江窄。窄的地方好藏话。",
      };
    }
    if (ctx.pick === "ask") {
      return { said: "“棚里有人说话。说话的人不看碗。”", thought: "" };
    }
    if (ctx.pick === "leave") {
      return { said: "“别踩我家门槛。”", thought: "" };
    }
    return {
      said: "“巷里潮。鞋底要换。别踩我家门槛。”",
      thought: "",
      choices: [
        { id: "ask", label: "茶棚呢" },
        { id: "leave", label: "告辞" },
      ],
    };
  }
  if (id === "hermit") {
    if (ctx.party?.includes("hermit")) {
      return {
        said: "「洞还在。人已经出来。」",
        thought: "杖比井绳结实。",
      };
    }
    return {
      said: "「你掀得开盖，就走得动路。我跟你。掌在井底下也热。」",
      thought: "窟认潮。他认路。",
      flags: ["joinHermit"],
    };
  }
  if (id === "fugitive") {
    if (ctx.flags.includes("wellOpen")) {
      return {
        said: "「潮窟里那个老头不认名册。名册也认不出他。」",
        thought: "盖不住的人，分两处藏。",
      };
    }
    if (ctx.pick === "ask") {
      return {
        said: "“灯楼南墙根有盖。账房不说。”",
        thought: "",
        flags: ["heardWell"],
      };
    }
    if (ctx.pick === "leave") {
      return { said: "“名册要盖住人。”", thought: "" };
    }
    return {
      said: "“名册要盖住人。盖不住的往潮里钻。”",
      thought: "",
      choices: [
        { id: "ask", label: "盖不住呢" },
        { id: "leave", label: "告辞" },
      ],
    };
  }
  if (id === "farmer") {
    if (ctx.items.includes("flask")) {
      return {
        said: "“那壶是给岗上的。别自己喝完。路只有一条，别往水里踩。”",
        thought: "",
      };
    }
    if (ctx.pick === "flask") {
      return {
        said: "“车上还有一壶。岗上那人夜里口干。你端上去，他才肯说话。”",
        thought: "",
      };
    }
    if (ctx.pick === "night") {
      return {
        said: "“出来的人不走田。走那条土路。往岗上。”",
        thought: "",
      };
    }
    if (ctx.pick === "leave") {
      return { said: "“走田边。别踩苗。”", thought: "" };
    }
    return {
      said: "“路从这儿过。别踩田。夜里屋里有人出来，我还当是牛惊了。”",
      thought: "",
      choices: [
        { id: "night", label: "夜里什么人" },
        { id: "flask", label: "车上那壶" },
        { id: "leave", label: "借过" },
      ],
    };
  }
  if (id === "sentry") {
    if (ctx.items.includes("flask")) {
      return {
        said: "“酒来了就说话。坡下港认册，岗认人。从亭子下来的，先过土路。”",
        thought: "",
      };
    }
    if (ctx.pick === "ask") {
      return {
        said: "“口干。有酒再问。从亭子下来的，先过土路。”",
        thought: "",
      };
    }
    if (ctx.pick === "leave") {
      return { said: "“让开。”", thought: "" };
    }
    return {
      said: "“岗上认刀。别挡路。”",
      thought: "",
      choices: [
        { id: "ask", label: "往哪走" },
        { id: "leave", label: "借过" },
      ],
    };
  }
  if (id === "woodcut") {
    if (ctx.items.includes("flask")) {
      return {
        said: "「喝一口就让。路从树旁边过。水里不过。」",
        thought: "树比人老实。",
      };
    }
    if (ctx.pick === "ask") {
      return { said: "“路从树旁边过。有酒的人我才肯让。”", thought: "" };
    }
    if (ctx.pick === "leave") {
      return { said: "“让让。树是挡路的，人别再挡。”", thought: "" };
    }
    return {
      said: "“让让。树是挡路的，人别再挡。”",
      thought: "",
      choices: [
        { id: "ask", label: "路怎么走" },
        { id: "leave", label: "借过" },
      ],
    };
  }
  if (id === "docker") {
    if (ctx.pick === "ask") {
      return { said: "“南边厂里的人认结。我不认。别问第二次。”", thought: "" };
    }
    if (ctx.pick === "leave") {
      return { said: "“缆在桩上。手别往潮里伸。”", thought: "" };
    }
    return {
      said: "“缆在桩上。手别往潮里伸。”",
      thought: "",
      choices: [
        { id: "ask", label: "船呢" },
        { id: "leave", label: "借过" },
      ],
    };
  }
  if (id === "carter") {
    if (ctx.pick === "ask") {
      return { said: "“西仓那辆是空的。空的才肯让路。”", thought: "" };
    }
    if (ctx.pick === "leave") {
      return { said: "“车不走水。你也别挡辕。”", thought: "" };
    }
    return {
      said: "“车不走水。你也别挡辕。”",
      thought: "",
      choices: [
        { id: "ask", label: "哪辆空" },
        { id: "leave", label: "借过" },
      ],
    };
  }
  if (id === "barber") {
    if (ctx.pick === "ask") {
      return { said: "“剃完的人不回头。回头的是被拦的。”", thought: "" };
    }
    if (ctx.pick === "leave") {
      return { said: "“坐。剃完再说。”", thought: "" };
    }
    return {
      said: "“坐。剃完再说。巷这么窄。”",
      thought: "",
      choices: [
        { id: "ask", label: "坡从哪来" },
        { id: "leave", label: "不剃" },
      ],
    };
  }
  if (id === "warder") {
    if (ctx.pick === "ask") {
      return { said: "“印烫了才开闸。”", thought: "" };
    }
    if (ctx.pick === "leave") {
      return { said: "“院空着。”", thought: "" };
    }
    return {
      said: "“院空着。炉在天井。北面是岗。”",
      thought: "",
      choices: [
        { id: "ask", label: "闸怎么开" },
        { id: "leave", label: "告辞" },
      ],
    };
  }
  if (id === "tutorPace") {
    if (ctx.flags.includes("sparredPace")) {
      return {
        said: "“还要走两步？倒了不算。”",
        thought: "",
        spar: "tutorPace",
      };
    }
    if (ctx.pick === "teach") {
      return {
        said: "“拳脚认路。石台上见。倒了不算数。”",
        thought: "",
        spar: "tutorPace",
      };
    }
    if (ctx.pick === "leave") {
      return { said: "“过路就让开。”", thought: "" };
    }
    return {
      said: "“岗上不闲逛。你是过路的，还是来找打的。”",
      thought: "",
      choices: [
        { id: "teach", label: "请教一步" },
        { id: "leave", label: "路过" },
      ],
    };
  }
  if (id === "tutorWard") {
    if (ctx.flags.includes("sparredWard")) {
      return {
        said: "“还要卸一掌？倒了不算。”",
        thought: "",
        spar: "tutorWard",
      };
    }
    if (ctx.pick === "teach") {
      return {
        said: "“掌打在卸上。你跟我过一招。倒了不算数。”",
        thought: "",
        spar: "tutorWard",
      };
    }
    if (ctx.pick === "leave") {
      return { said: "“过路就让开。”", thought: "" };
    }
    return {
      said: "“看你掌门的人。过路的，还是来讨教的。”",
      thought: "",
      choices: [
        { id: "teach", label: "请教卸力" },
        { id: "leave", label: "路过" },
      ],
    };
  }
  if (id === "tutorEdge") {
    if (ctx.flags.includes("sparredEdge")) {
      return {
        said: "“谱还要分一回？倒了不算。”",
        thought: "",
        spar: "tutorEdge",
      };
    }
    if (ctx.pick === "teach") {
      return {
        said: "“拳不能使刀。石台上我让你看明白。倒了不算数。”",
        thought: "",
        spar: "tutorEdge",
      };
    }
    if (ctx.pick === "leave") {
      return { said: "“过路就让开。”", thought: "" };
    }
    return {
      said: "“你手里是什么谱。过路的，还是来问的。”",
      thought: "",
      choices: [
        { id: "teach", label: "请教分谱" },
        { id: "leave", label: "路过" },
      ],
    };
  }
  return {
    said: "「除名不是删掉。是盖住。盖住的底下还有一笔。」",
    thought: "漏网。说明他们下手的时候急。",
  };
}

export function talkLine(id: string, ctx: TalkCtx): string {
  return talkBeat(id, ctx).said;
}

export const SPAR_FLAG: Record<string, string> = {
  tutorPace: "sparredPace",
  tutorWard: "sparredWard",
  tutorEdge: "sparredEdge",
};

export function tutorLesson(id: string, won: boolean): Voice {
  if (id === "tutorPace") {
    if (won) {
      return {
        said: "“冲锋认空位。红格子是他要踩的。你让开，或者上前抢他的步。这就是进退。”",
        thought: "岗上这一招，比帖管用。",
        reply: "“记下了。”",
      };
    }
    return {
      said: "“你站在他要来的格子上。让开，或者上前。倒了不算。再来。”",
      thought: "进退就是这一寸。",
      reply: "“再请一回。”",
    };
  }
  if (id === "tutorWard") {
    if (won) {
      return {
        said: "“卸力那一张，力从你掌边过去。硬接会倒。下次先出卸。”",
        thought: "岸上这一掌，比刀稳。",
        reply: "“记下了。”",
      };
    }
    return {
      said: "“你硬接了。力还在身上。先出卸力，再还掌。倒了不算。”",
      thought: "卸的是力。不是面子。",
      reply: "“再请一回。”",
    };
  }
  if (won) {
    return {
      said: "“拳谱只有拳门认。刀谱要等人会刀。你现在使拳，抽刀进了行囊，别硬塞进手里。”",
      thought: "谱分门。人不分路，谱会乱。",
      reply: "“记下了。”",
    };
  }
  return {
    said: "“你把刀谱当掌使，才会乱。拳是拳，刀是刀。倒了不算。再来。”",
    thought: "门认谱。不认着急。",
    reply: "“再请一回。”",
  };
}

export const TALKER_NAME: Record<string, string> = {
  clerk: "钱司",
  porter: "杠七",
  stamp: "周印",
  boat: "阿渡",
  inn: "棚婆",
  guest: "茶客柳",
  watch: "更三",
  usher: "门子",
  maid: "镜奴阿青",
  scribe: "记名吏",
  filer: "书办程",
  coolie: "脚夫",
  saltman: "盐工老西",
  roper: "缆石",
  wright: "船匠木",
  pilgrim: "香九",
  lamper: "灯守",
  sluicer: "闸夫",
  fisher: "渔婆阿潮",
  digger: "夜工",
  beggar: "闲汉",
  hawker: "摊婆阿秀",
  vendor: "货郎石",
  kid: "伢儿阿毛",
  aunt: "巷嫂",
  hermit: "井叟",
  fugitive: "逃册",
  farmer: "田婆",
  sentry: "岗卒",
  woodcut: "樵夫",
  docker: "缆夫",
  carter: "车夫",
  barber: "剃头",
  warder: "更夫",
  tutorPace: "步阿宽",
  tutorWard: "掌阿稳",
  tutorEdge: "谱阿正",
};

const ITEM_NAME: Record<ItemId, string> = {
  brand: "火印",
  scrap: "残页",
  slip: "纸角",
  deed: "盐契",
  incense: "香匙",
  badge: "腰牌",
  flask: "酒葫芦",
  cake: "麦饼",
};

export function itemName(id: ItemId): string {
  return ITEM_NAME[id];
}

export function itemVoice(id: ItemId): Voice {
  if (id === "brand") {
    return { said: "铜印一块，入手还烫。", thought: "方才盖过的人，未必走远。" };
  }
  if (id === "slip") {
    return { said: "纸角一截，撕痕是旧的。", thought: "缺的那一角，多半在册子上。" };
  }
  if (id === "deed") {
    return { said: "盐契一张，泥印未干透。", thought: "要对，还得看西边那排坛。" };
  }
  if (id === "incense") {
    return { said: "铜匙一把，凉的。", thought: "潮祠的香，不是给人闻着玩的。" };
  }
  if (id === "badge") {
    return { said: "腰牌一面，灯楼字号。", thought: "船上未必认，人见了却会留神。" };
  }
  if (id === "flask") {
    return { said: "酒葫芦一只，嘴上还有余温。", thought: "岗上守夜的，夜里爱干这一口。" };
  }
  if (id === "cake") {
    return { said: "麦饼一张，尚热。", thought: "摊上那婆子说过，留给岸边伢儿。" };
  }
  return {
    said: "残页一张，名是你的。朱砂在下，墨在上。",
    thought: "盖住不是抹去。底下那一笔还在。",
  };
}

export function itemPickup(id: ItemId): string {
  return itemVoice(id).said;
}

export function propVoice(kind: string, tag: string | undefined, scene: SceneId): Voice {
  if (tag === "empty") {
    return { said: "空碗一只，扣着。", thought: "棚婆说过，空的那只才是她的。" };
  }
  if (tag === "westSalt") {
    return { said: "坛口朝西，封泥发旧。", thought: "官盐不轻易改口。" };
  }
  if (tag === "eastSalt") {
    return { said: "坛口朝东，泥是新抹的。", thought: "有人动过。动过的恐怕不是官契。" };
  }
  if (tag === "liveKnot") {
    return { said: "活结，朝上。", thought: "缆头说过，小船才用这种。" };
  }
  if (tag === "looseKnot") {
    return { said: "结散了，潮一来就开。", thought: "压不住风。" };
  }
  if (tag === "deadKnot") {
    return { said: "死结，朝下。", thought: "这个才压得住。" };
  }
  if (tag === "altar") {
    return { said: "香灰冷了，匙搁在一旁。", thought: "退潮时分，香客才肯开口。" };
  }
  if (tag === "slip") {
    return { said: "凳下压着一角纸。", thought: "脚夫说不是他的。" };
  }
  if (tag === "hiddenWell") {
    return { said: "井盖锈死了。", thought: "先前没人跟我提过井。" };
  }
  if (tag === "hiddenTree") {
    return { said: "根扎得深。", thought: "没人叫我刨这棵。" };
  }
  if (tag === "hiddenStone") {
    return { said: "石头沉，搬不动。", thought: "像是压着什么，不是给船系缆用的。" };
  }
  if (kind === "house") {
    return { said: "一间铺面，门面不大。", thought: "人在铺前，买卖才像话。" };
  }
  if (kind === "cart") {
    return { said: "板车一辆，辕木结实。", thought: "走货的路，别往水里赶。" };
  }
  if (kind === "well") {
    return { said: "井口封着。", thought: "跟灯楼那口不是一回事。" };
  }
  if (kind === "jar" && scene === "tea") {
    return { said: "碗里还有茶。", thought: "有茶的动不得，钥匙不在这儿。" };
  }
  if (kind === "barrel") {
    return { said: "酒坛一口，泥封着。", thought: "封得紧，里面未必是酒。" };
  }
  if (kind === "crate") {
    if (tag === "cart") return { said: "板车一辆，辕木结实。", thought: "走货的路，别往水里赶。" };
    if (scene === "hold") return { said: "货箱，漆掉了大半。", thought: "西厢是货。印不在货里。" };
    return { said: "货箱，漆掉了大半。", thought: "挡路用的，推也推不开。" };
  }
  if (kind === "lantern") {
    return { said: "灯还亮着。", thought: "亮处不好动手脚。" };
  }
  if (kind === "coil") {
    return { said: "缆绳一盘，潮气重。", thought: "系船用的，别当兵器使。" };
  }
  if (kind === "post") {
    return { said: "木桩一根，给船系缆。", thought: "站得稳，人不如它。" };
  }
  if (kind === "tree") {
    return { said: "大树挡路。", thought: "从旁边绕过去便是。" };
  }
  if (kind === "bench") {
    return { said: "条凳一条，坐痕深。", thought: "坐过的人早走了。" };
  }
  return { said: "瓦罐一口，空的。", thought: "空罐子有时比满的有用。" };
}

export function bumpVoice(kind: "gate" | "water" | "cliff", gate: GateKind): Voice {
  if (kind === "cliff") return { said: "坡太陡，过不去。", thought: "贴着崖边走，会摔下去。" };
  if (kind === "water") return { said: "江水。", thought: "人不能走水。" };
  if (gate === "fire-seals") return { said: "闸关着，印要见火。", thought: "西仓墙上写过。炉在天井。" };
  if (gate === "watch") return { said: "北栅关着。", thought: "更鼓还没应。对着鼓拍一下。" };
  if (gate === "mirror") return { said: "廊门关着。", thought: "真的那面不照人。" };
  if (gate === "books") return { said: "册门关着。", thought: "缺的那一角不在这屋里。" };
  if (gate === "deed") return { said: "后厂关着。", thought: "没契进不去。" };
  if (gate === "tide") return { said: "北闸关着。", thought: "水还没过这根杠。" };
  if (gate === "incense") return { said: "值房关着。", thought: "钥匙不像寻常钥匙。" };
  return { said: "闸关着。", thought: "眼下过不去。" };
}
