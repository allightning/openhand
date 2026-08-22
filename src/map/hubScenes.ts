import type { ChapterId, EnemyId } from "../game/types";
import type { GateKind, ItemId, SceneId, SealId } from "./types";

export interface HubSceneDef {
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
    if (lines[i].length !== w) throw new Error(`${id} row ${i} width ${lines[i].length} != ${w}`);
  }
  return lines;
}

/** Compact courtyard / shop shell with south door letter. Portal letters placed ≥3 apart. */
function court(
  id: SceneId,
  door: string,
  portalLetters: string[],
  opts: {
    talk?: string;
    talkCh?: string;
    foe?: EnemyId;
    foeCh?: string;
    extraTalk?: string;
    extraCh?: string;
    outdoor?: boolean;
    sign?: string;
  } = {},
): string[] {
  const tCh = opts.talkCh ?? "m";
  const fCh = opts.foeCh ?? "1";
  const eCh = opts.extraCh ?? "u";
  const mid = opts.talk ? tCh : ".";
  const foe = opts.foe ? fCh : ".";
  const extra = opts.extraTalk ? eCh : ".";
  if (!opts.outdoor) {
    const letters = portalLetters.filter((ch) => ch !== door);
    const e = letters.includes("E") ? "E" : ".";
    const f = letters.includes("F") ? "F" : ".";
    const g = letters.includes("G") ? "G" : ".";
    const h = letters.includes("H") ? "H" : ".";
    const pad = (s: string) => {
      const body = s.length >= 2 ? s.slice(1, -1) : s;
      const filled = (body + ".".repeat(30)).slice(0, 30);
      return `#${filled}#`;
    };
    return rows(id, [
      "################################",
      pad("#....l.........p.........l.....#"),
      pad("#..############..############..#"),
      pad("#..#..t.v...............t.v.#..#"),
      pad("#..#.......................#..#"),
      pad("#..#..j.j..............b.b..#..#"),
      pad("#..############..############..#"),
      pad(`#......${mid}.......${extra}....${foe}......#`),
      pad("#..............,=,.............#"),
      pad("#..............@...............#"),
      pad(`#####${e}##########${f}##########${g}#${h}#`),
      pad(`###############${door}################`),
    ]);
  }
  // 箱式地图：门户开在内缘门槛（贴墙一格），不进庭院中心，也不封死在外墙外。
  const rim: Record<string, { x: number; y: number }> = {
    // 北缘内侧
    D: { x: 8, y: 1 },
    N: { x: 15, y: 1 },
    E: { x: 23, y: 1 },
    // 西缘内侧
    B: { x: 1, y: 7 },
    W: { x: 1, y: 14 },
    G: { x: 1, y: 19 },
    // 东缘内侧
    C: { x: 30, y: 7 },
    L: { x: 30, y: 14 },
    P: { x: 30, y: 19 },
    // 北厢南门（建筑门槛）
    K: { x: 5, y: 4 },
    T: { x: 15, y: 4 },
    J: { x: 24, y: 4 },
    // 南墙（回门以外的旁门）
    S: { x: 8, y: 23 },
    M: { x: 22, y: 23 },
    F: { x: 4, y: 23 },
    Y: { x: 26, y: 23 },
    I: { x: 11, y: 23 },
  };
  const H = 24;
  const W = 32;
  const grid = Array.from({ length: H }, (_, y) => {
    if (y === 0 || y === H - 1) return "#".repeat(W).split("");
    return ("#" + ".".repeat(W - 2) + "#").split("");
  });
  const set = (x: number, y: number, ch: string) => {
    if (y >= 0 && y < H && x >= 0 && x < W) grid[y][x] = ch;
  };
  set(5, 1, "l");
  set(26, 1, "l");
  set(10, 2, "&");
  set(20, 2, "&");
  set(15, Math.floor(H / 2), "@");
  set(15, Math.floor(H / 2) - 1, mid);
  set(10, Math.floor(H / 2) + 1, foe);
  set(20, Math.floor(H / 2) + 1, extra);
  set(14, H - 3, ",");
  set(15, H - 3, "=");
  set(16, H - 3, ",");
  grid[H - 1][15] = door;
  for (const ox of [3, 22]) {
    for (let x = ox; x < ox + 5; x++) {
      for (let y = 2; y < 5; y++) {
        set(x, y, y === 2 || y === 4 || x === ox || x === ox + 4 ? "#" : ".");
      }
    }
    set(ox + 2, 4, ":");
    set(ox + 1, 3, "t");
  }
  const want = new Set(portalLetters.filter((ch) => ch !== door));
  for (const ch of want) {
    const s = rim[ch];
    if (!s) throw new Error(`${id}: portal letter ${ch} has no rim slot`);
    set(s.x, s.y, ch);
  }
  return rows(
    id,
    grid.map((r) => r.join("")),
  );
}

function hub(
  id: SceneId,
  name: string,
  kicker: string,
  enter: string,
  mood: string,
  door: string,
  link: { to: SceneId; at: string },
  opts: {
    talk?: string;
    talkCh?: string;
    foe?: EnemyId;
    foeCh?: string;
    extraTalk?: string;
    extraCh?: string;
    outdoor?: boolean;
    sign?: string;
    chapter?: ChapterId;
    morePortals?: Record<string, { to: SceneId; at: string }>;
  } = {},
): HubSceneDef {
  const talkers: Record<string, string> = {};
  if (opts.talk) talkers[opts.talkCh ?? "m"] = opts.talk;
  if (opts.extraTalk) talkers[opts.extraCh ?? "u"] = opts.extraTalk;
  const npcs: Record<string, EnemyId> = {};
  if (opts.foe) npcs[opts.foeCh ?? "1"] = opts.foe;
  const portals: Record<string, { to: SceneId; at: string }> = { [door]: link, ...(opts.morePortals ?? {}) };
  // 新手村补景一律室外壳，保证通路/谈者可达；石砖靠 COURTYARD 集合
  const layout = { ...opts, outdoor: true };
  return {
    id,
    chapter: opts.chapter ?? "dock",
    name,
    kicker,
    enter,
    mood,
    ascii: court(id, door, Object.keys(portals), layout),
    npcs,
    talkers,
    portals,
    order: [],
    gate: "open",
    signs: opts.sign ? [opts.sign] : [],
    items: {},
  };
}

/** 门律补景：税署片区烟火气，对齐港律体量。 */
export const SEER_HUB_SCENES: Record<string, HubSceneDef> = {
  taxMarket: hub(
    "taxMarket",
    "税市",
    "门律",
    "册案外的市口。卖墨、卖纸、卖闲话。",
    "税认册。市认秤。",
    "A",
    { to: "customs", at: "T" },
    {
      outdoor: true,
      talk: "taxHawker",
      extraTalk: "taxPorter",
      foe: "thug",
      sign: "税市。南回税卡。西厢酒楼，东厢医馆。北出税门。茶寮在北厢。",
      morePortals: {
        B: { to: "taxWine", at: "A" },
        C: { to: "taxClinic", at: "A" },
        D: { to: "taxGate", at: "A" },
        T: { to: "taxTea", at: "A" },
      },
    },
  ),
  taxWine: hub(
    "taxWine",
    "墨香楼",
    "门律",
    "税署旁酒楼。案牍人下了班才敢大声。",
    "酒淡，话咸。",
    "A",
    { to: "taxMarket", at: "B" },
    { talk: "taxInn", extraTalk: "taxGuest", sign: "墨香楼。楼上有雅座。" },
  ),
  taxClinic: hub(
    "taxClinic",
    "册医馆",
    "门律",
    "给税丁看病的地方。也给过册的人诊脉。",
    "药苦。案更苦。",
    "A",
    { to: "taxMarket", at: "C" },
    { talk: "taxDoctor", sign: "册医。脉口不认官。" },
  ),
  taxGate: hub(
    "taxGate",
    "税门岗",
    "门律",
    "出税署的岗。过了岗才算上路。",
    "岗认册角，不认刀。",
    "A",
    { to: "taxMarket", at: "D" },
    {
      outdoor: true,
      talk: "taxGuard",
      foe: "delay",
      sign: "税门。北驿厩，西客栈。东武馆与镖局。井、当铺、后巷从北厢转。",
      morePortals: {
        E: { to: "taxStable", at: "A" },
        W: { to: "taxLodge", at: "A" },
        C: { to: "taxMartial", at: "A" },
        L: { to: "taxEscort", at: "A" },
        N: { to: "taxWell", at: "A" },
        P: { to: "taxPawn", at: "A" },
        G: { to: "taxAlley", at: "A" },
      },
    },
  ),
  taxStable: hub(
    "taxStable",
    "驿厩",
    "门律",
    "税署驿马在此换草。",
    "马比人老实。",
    "A",
    { to: "taxGate", at: "E" },
    { outdoor: true, talk: "taxGroom", sign: "驿厩。草料堆里有闲话。" },
  ),
  taxLodge: hub(
    "taxLodge",
    "案客栈",
    "门律",
    "过册的人歇脚处。墙上贴着缺角告示。",
    "客栈认帖，也认银。",
    "A",
    { to: "taxGate", at: "W" },
    {
      talk: "taxHost",
      extraTalk: "taxSleeper",
      sign: "案客栈。西去档库。",
      morePortals: { E: { to: "taxArchive", at: "A" } },
    },
  ),
  taxArchive: hub(
    "taxArchive",
    "档库",
    "门律",
    "旧册成山。缺角的那一页也许在这。",
    "尘比墨厚。",
    "A",
    { to: "taxLodge", at: "E" },
    { talk: "taxArchivist", extraTalk: "taxJudge", foe: "bookcut", sign: "档库重地。火烛勿近。缺页会回来。" },
  ),
  taxTea: hub(
    "taxTea",
    "墨茶寮",
    "门律",
    "税丁喝茶处。闲话比茶热。",
    "一盏茶，半卷案。",
    "A",
    { to: "taxMarket", at: "T" },
    { talk: "taxTeaHost", extraTalk: "taxWhisper", sign: "墨茶。市口可回。" },
  ),
  taxClerk: hub(
    "taxClerk",
    "书办房",
    "门律",
    "抄册的屋子。笔尖刮纸像刀。",
    "字写歪了，人就歪了。",
    "A",
    { to: "customs", at: "U" },
    { talk: "taxClerk", foe: "thug", sign: "书办房。案下有手。" },
  ),
  taxJail: hub(
    "taxJail",
    "押房",
    "门律",
    "暂押逃税、假册的人。",
    "铁锁比墨重。",
    "A",
    { to: "customs", at: "J" },
    { talk: "taxJailer", foe: "nametaker", sign: "押房。名册在墙上。" },
  ),
  taxWell: hub(
    "taxWell",
    "墨井院",
    "门律",
    "洗笔的井。井台有人卖闲话。",
    "井水清，心事不清。",
    "A",
    { to: "taxGate", at: "N" },
    { outdoor: true, talk: "taxWellman", sign: "墨井。铜钱沉下去会响。" },
  ),
  taxMartial: hub(
    "taxMartial",
    "案武馆",
    "门律",
    "税署护院练手处。也教过册人几招。",
    "刀慢，笔更快。",
    "A",
    { to: "taxGate", at: "C" },
    { talk: "taxCoach", foe: "thug", sign: "案武馆。先机在笔不在刀。" },
  ),
  taxEscort: hub(
    "taxEscort",
    "税镖局",
    "门律",
    "押册、押银的局子。",
    "镖旗上写着：册在人在。",
    "A",
    { to: "taxGate", at: "L" },
    { talk: "taxEscort", sign: "税镖。短途可接。" },
  ),
  taxPawn: hub(
    "taxPawn",
    "册当铺",
    "门律",
    "当笔、当印、当一夜安稳。",
    "利息比税狠。",
    "A",
    { to: "taxGate", at: "P" },
    { talk: "taxPawn", sign: "册当。赎期以册为准。" },
  ),
  taxAlley: hub(
    "taxAlley",
    "案巷",
    "门律",
    "税署后巷。假册常从这溜走。",
    "巷窄，心更窄。",
    "A",
    { to: "taxGate", at: "G" },
    { outdoor: true, talk: "taxAlley", foe: "alley", sign: "案巷。尽头接鼓楼外。" },
  ),
};

/** 工律补景：缆厂片区烟火气。 */
export const SAPPER_HUB_SCENES: Record<string, HubSceneDef> = {
  ropeMarket: hub(
    "ropeMarket",
    "缆市",
    "工律",
    "缆厂外的市口。卖麻、卖钉、卖力气。",
    "市声压过潮声。",
    "A",
    { to: "ropes", at: "T" },
    {
      outdoor: true,
      talk: "ropeHawker",
      extraTalk: "ropeCoolie",
      foe: "robber",
      sign: "缆市。北回缆厂。西厢酒楼，东厢伤医。北出厂门。",
      morePortals: {
        B: { to: "ropeWine", at: "A" },
        C: { to: "ropeClinic", at: "A" },
        D: { to: "ropeGate", at: "A" },
      },
    },
  ),
  ropeWine: hub(
    "ropeWine",
    "桩酒楼",
    "工律",
    "工丁下工处。酒粗，话也粗。",
    "一碗酒，半根桩。",
    "A",
    { to: "ropeMarket", at: "B" },
    { talk: "ropeInn", extraTalk: "ropeGuest", sign: "桩酒楼。楼上可听潮。" },
  ),
  ropeClinic: hub(
    "ropeClinic",
    "伤医棚",
    "工律",
    "砸伤、缆伤、桩伤都往这抬。",
    "药酒比酒烈。",
    "A",
    { to: "ropeMarket", at: "C" },
    { talk: "ropeDoctor", sign: "伤医。先止血，再说话。" },
  ),
  ropeGate: hub(
    "ropeGate",
    "厂门岗",
    "工律",
    "出厂上路的岗。工契在此验。",
    "岗认契，不认嗓门。",
    "A",
    { to: "ropeMarket", at: "D" },
    {
      outdoor: true,
      talk: "ropeGuard",
      foe: "hauler",
      sign: "厂门。西料棚客栈，东武馆镖局。坞口在西下。井铁巷从厢门进。",
      morePortals: {
        E: { to: "ropeStore", at: "A" },
        W: { to: "ropeLodge", at: "A" },
        G: { to: "ropeQuay", at: "A" },
        N: { to: "ropeWatch", at: "A" },
        C: { to: "ropeMartial", at: "A" },
        L: { to: "ropeEscort", at: "A" },
        J: { to: "ropeWell", at: "A" },
        K: { to: "ropeForge", at: "A" },
        P: { to: "ropeAlley", at: "A" },
      },
    },
  ),
  ropeStore: hub(
    "ropeStore",
    "料棚",
    "工律",
    "麻料、铁钉、旧桩堆在这。",
    "棚漏雨，货不漏。",
    "A",
    { to: "ropeGate", at: "E" },
    { talk: "ropeStoreman", foe: "piler", sign: "料棚。契纸有时夹在缆里。" },
  ),
  ropeLodge: hub(
    "ropeLodge",
    "工客栈",
    "工律",
    "外地工丁歇脚。墙上贴着招工告示。",
    "炕硬，人更硬。",
    "A",
    { to: "ropeGate", at: "W" },
    {
      talk: "ropeHost",
      extraTalk: "ropeSleeper",
      sign: "工客栈。可问皇粮旧事。",
      morePortals: { E: { to: "ropeMess", at: "A" } },
    },
  ),
  ropeMess: hub(
    "ropeMess",
    "工灶",
    "工律",
    "大锅饭。盐比肉多。",
    "吃饱了才有力气打桩。",
    "A",
    { to: "ropeLodge", at: "E" },
    { talk: "ropeCook", extraTalk: "ropeElder", sign: "工灶。剩饭留给夜班。老人爱讲皇粮。" },
  ),
  ropeQuay: hub(
    "ropeQuay",
    "坞口",
    "工律",
    "船坞外侧。缆要从这拖进去。",
    "潮涨潮落，桩不落。",
    "A",
    { to: "ropeGate", at: "G" },
    {
      outdoor: true,
      talk: "ropeQuayman",
      foe: "smuggler",
      sign: "坞口。里通船坞，外通潮。",
      morePortals: { I: { to: "docks", at: "R" }, Y: { to: "ropeYard", at: "A" } },
    },
  ),
  ropeWatch: hub(
    "ropeWatch",
    "更楼",
    "工律",
    "夜巡工丁在此换班。",
    "更鼓比潮准。",
    "A",
    { to: "ropeGate", at: "N" },
    { talk: "ropeWatch", sign: "更楼。北望桩场灯。" },
  ),
  ropeForge: hub(
    "ropeForge",
    "缆铁铺",
    "工律",
    "打钉、修钩、焊环。",
    "火比人诚实。",
    "A",
    { to: "ropeGate", at: "K" },
    { talk: "ropeSmith", foe: "brute", sign: "缆铁。钩钝了来这。" },
  ),
  ropeWell: hub(
    "ropeWell",
    "厂井",
    "工律",
    "工丁打水处。井栏有人刻日子。",
    "水甜，工苦。",
    "A",
    { to: "ropeGate", at: "J" },
    { outdoor: true, talk: "ropeWellman", sign: "厂井。铜钱许愿不灵，许工还灵。" },
  ),
  ropeMartial: hub(
    "ropeMartial",
    "桩武棚",
    "工律",
    "工丁练棍处。也教外地人站桩。",
    "棍慢，桩稳。",
    "A",
    { to: "ropeGate", at: "C" },
    { talk: "ropeCoach", foe: "thug", sign: "桩武棚。先站稳，再抡棍。" },
  ),
  ropeEscort: hub(
    "ropeEscort",
    "工镖棚",
    "工律",
    "押料、押缆的短镖。",
    "镖旗上写着：缆在货在。",
    "A",
    { to: "ropeGate", at: "L" },
    { talk: "ropeEscort", sign: "工镖。短途可接。" },
  ),
  ropeAlley: hub(
    "ropeAlley",
    "缆巷",
    "工律",
    "厂后窄巷。偷料的人爱钻。",
    "巷里缆味重。",
    "A",
    { to: "ropeGate", at: "P" },
    { outdoor: true, talk: "ropeAlley", foe: "thief", sign: "缆巷。尽头接灯厂影。" },
  ),
  ropeYard: hub(
    "ropeYard",
    "晒缆场",
    "工律",
    "新缆摊在地上晒。",
    "日头毒，缆更韧。",
    "A",
    { to: "ropeQuay", at: "Y" },
    { outdoor: true, talk: "ropeDryer", foe: "hauler", sign: "晒缆场。桩影压在缆上。" },
  ),
};

export const HUB_SCENES: Record<string, HubSceneDef> = {
  ...SEER_HUB_SCENES,
  ...SAPPER_HUB_SCENES,
};

export const SEER_HUB_IDS = new Set<SceneId>([
  "customs",
  "shrine",
  "sluice",
  "tea",
  "drums",
  "outer",
  "glass",
  "inner",
  "palace",
  ...(Object.keys(SEER_HUB_SCENES) as SceneId[]),
]);

export const SAPPER_HUB_IDS = new Set<SceneId>([
  "ropes",
  "pit",
  "shed",
  "docks",
  "sapperPile",
  ...(Object.keys(SAPPER_HUB_SCENES) as SceneId[]),
]);

export const RAIL_HUB_IDS = new Set<SceneId>([
  "hut",
  "plot",
  "ridge",
  "wharf",
  "hold",
  "yard",
  "spit",
  "yamen",
  "wine",
  "wineUp",
  "flower",
  "clinic",
  "pier",
  "escort",
  "salt",
  "lamp",
  "cave",
  "cellar",
  "lane",
  "martial",
  "lodge",
  "pawn",
  "ferry",
  "isle",
  "railNight",
]);

export function hubOwner(id: SceneId): "rail" | "seer" | "sapper" | null {
  if (id.startsWith("tax") || id === "customs" || id === "shrine" || id === "sluice") return "seer";
  if (id === "ropes" || id === "pit" || id === "docks" || id === "shed" || id === "sapperPile" || id.startsWith("rope")) {
    return "sapper";
  }
  if (
    id === "hut" ||
    id === "plot" ||
    id === "ridge" ||
    id === "wharf" ||
    id === "hold" ||
    id === "salt" ||
    id === "yard" ||
    id === "spit" ||
    id === "yamen" ||
    id === "pier" ||
    id === "lamp" ||
    id === "cellar" ||
    id === "cave" ||
    id === "lane" ||
    id === "wine" ||
    id === "wineUp" ||
    id === "flower" ||
    id === "clinic" ||
    id === "escort" ||
    id === "martial" ||
    id === "lodge" ||
    id === "pawn" ||
    id === "ferry" ||
    id === "isle" ||
    id === "railNight"
  ) {
    return "rail";
  }
  return null;
}

function leftStarterVillage(run: { flags: string[] }): boolean {
  return (
    run.flags.includes("branded") ||
    run.flags.includes("booksOk") ||
    run.flags.includes("knotOk") ||
    run.flags.includes("seerRoad") ||
    run.flags.includes("sapperRoad") ||
    run.flags.includes("railRoad")
  );
}

/** 未出村前：三职各守一片，不共用港湾当客厅。出村手续齐了再互通。 */
export function canEnterHubScene(
  to: SceneId,
  run: { hero?: string; flags: string[]; visited: string[] },
): { ok: true } | { ok: false; reason: string } {
  if (run.visited.includes(to)) return { ok: true };
  // 官道城不在新手村互锁里
  if (hubOwner(to) === null) return { ok: true };

  const hero = (run.hero ?? "rail") as "rail" | "seer" | "sapper";
  const owner = hubOwner(to)!;

  if (leftStarterVillage(run)) return { ok: true };
  if (owner === hero) return { ok: true };

  // 港律可先走沿江缆厂壳（桩场/船坞），但不进缆市税市那一套
  if (hero === "rail" && (to === "ropes" || to === "pit" || to === "docks" || to === "shed")) {
    return { ok: true };
  }

  if (hero === "seer") {
    return { ok: false, reason: "过册之前，税署的门不接港湾。北去税市，南廊出官道。" };
  }
  if (hero === "sapper") {
    return { ok: false, reason: "验契之前，缆厂的门不接港湾。东去缆市，北门出官道。" };
  }
  if (owner === "seer") return { ok: false, reason: "税署重地。过册的人自有路，你此刻还不该进。" };
  if (owner === "sapper") return { ok: false, reason: "缆厂重地。有工契的人自有路，你此刻还不该进。" };
  return { ok: false, reason: "港律这边的路，还没轮到你走。" };
}
