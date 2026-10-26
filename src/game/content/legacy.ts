/** 旧内容表。结算仍读这张表。路径 `src/game/content.ts` 只 re-export。 */
import type {
  CardDef,
  CardId,
  ChapterId,
  EnemyDef,
  EnemyId,
  HeartDef,
  HeartId,
  HeroDef,
  Intent,
  TechniqueDef,
  TechniqueId,
  WeaponId,
} from "../types";
import { BASE_HP } from "../types";
import { GENERATED_ELITE_ENERGY, GENERATED_ENEMIES, GENERATED_ENEMY_WEAPON } from "../foeCatalog";
import { ANY_CARDS } from "./cards/any";
import { FUSE_CARDS } from "./cards/fuse";
import { HOOK_CARDS } from "./cards/hook";
import { PALM_CARDS } from "./cards/palm";
import { SABER_CARDS } from "./cards/saber";
import { SPEAR_CARDS } from "./cards/spear";
import { STAFF_CARDS } from "./cards/staff";
import { SWORD_CARDS } from "./cards/sword";
import { SIGNATURE_BREAK } from "../enemySignatures";

export const CARDS = {
  ...ANY_CARDS,
  ...PALM_CARDS,
  ...SABER_CARDS,
  ...SWORD_CARDS,
  ...SPEAR_CARDS,
  ...STAFF_CARDS,
  ...HOOK_CARDS,
  ...FUSE_CARDS,
} as Record<CardId, CardDef>;

export const UPGRADES: Partial<Record<CardId, CardId>> = {
  strike: "strike2",
  defend: "defend2",
  push: "push2",
  advance: "advance2",
  mend: "mend2",
  finisher: "finisher2",
};

export const BASICS: CardId[] = [
  "strike",
  "defend",
  "push",
  "charge",
  "advance",
  "mend",
  "brace",
  "setup",
  "gather",
];
export const VERBS: CardId[] = [
  "drawcut",
  "backpalm",
  "split",
  "close",
  "elbow",
  "sweep",
  "cut",
  "thrust",
  "pierce",
  "plant",
  "hookpull",
  "bleedcut",
  "expose",
  "thorns",
  "inbreath",
  "haste",
  "brace",
  "gather",
  "setup",
  "finisher",
  "ironform",
  "marking",
  "rift",
  "mirror",
  "layer",
  "burySlash",
  "buryBleed",
  "buryKnock",
  "buryWard",
  "unbind",
  "sidestep",
  "suture",
  "qiPulse",
  "palmSeal",
  "saberBleed",
  "spearLock",
  "swordMute",
  "staffBind",
  "hookDisarm",
  "skillLock",
  "pouchSeal",
  "handCut",
  "qiLeech",
];

export const STARTER_DECK: CardId[] = [
  "strike",
  "strike",
  "strike",
  "defend",
  "push",
  "charge",
  "advance",
  "advance",
  "mend",
  "defend",
  "setup",
  "gather",
  "finisher",
  "burySlash",
  "sidestep",
];

export const STARTER = {
  playerHp: BASE_HP,
  enemyHp: 56,
  enemyDamage: 18,
  playerPos: 0,
  enemyPos: 5,
  /** 劲力上限（蓝条） */
  energy: 10,
  /** 开局当前劲力 */
  energyStart: 8,
  /** 每回基础回劲 */
  energyRegen: 4,
  gold: 49,
  floor: 1,
};

export const HEROES: HeroDef[] = [
  {
    id: "rail",
    name: "轨刃",
    title: "破门刀",
    sect: "推宫一门",
    verb: "推、撞、占步",
    hp: "28",
    crime: "比武已经判了推开，你还是拔了真刀。",
    pitch: "码头上替人踹过不少门。港律要找你算这一笔。",
    locked: false,
  },
  {
    id: "seer",
    name: "镜亭",
    title: "观气客",
    sect: "镜廷残谱",
    verb: "观气、破绽、连手",
    hp: "24",
    crime: "改过对方已经亮出的招。",
    pitch: "镜廷的人，观气不观这一掌。税卡缺的那一笔，要从案上找回来。",
    locked: false,
  },
  {
    id: "sapper",
    name: "沈夯",
    title: "桩师",
    sect: "垂街机关",
    verb: "落桩、占格、反震",
    hp: "32",
    crime: "不该下桩的地方，你落了一根。",
    pitch: "缆厂出身。桩还认你，官道还不认。",
    locked: false,
  },
];

export const TECHNIQUES: Record<TechniqueId, TechniqueDef> = {
  longPush: {
    id: "longPush",
    name: "开山劲",
    text: "击退再多 1 格。",
    flavor: "门比人先开。",
    chapter: "dock",
  },
  backstep: {
    id: "backstep",
    name: "回身",
    text: "进步无路则后退。",
    flavor: "前脚不行，后脚还在。",
    chapter: "dock",
  },
  keepGuard: {
    id: "keepGuard",
    name: "残劲",
    text: "收势时留下 4 点格挡。",
    flavor: "力卸完，腕还硬。",
    chapter: "dock",
  },
  hardWall: {
    id: "hardWall",
    name: "震壁",
    text: "撞壁伤害至少 12 点。",
    flavor: "壁比门硬，人也比门硬。",
    chapter: "dock",
  },
  brightBlade: {
    id: "brightBlade",
    name: "亮刀残谱",
    text: "相邻时攻击伤害 +3。",
    flavor: "刀已经亮了，掌就不必藏。",
    chapter: "dock",
    school: "saber",
  },
  bodyCheck: {
    id: "bodyCheck",
    name: "对撞",
    text: "进步若撞上人，造成 6 点伤害。",
    flavor: "让开的那一步，改成撞。",
    chapter: "dock",
  },
  heelStake: {
    id: "heelStake",
    name: "后桩",
    text: "开场在第 2 步落一根桩。",
    flavor: "先把退的那一步钉上。",
    chapter: "dock",
    school: "staff",
  },
  shortCharge: {
    id: "shortCharge",
    name: "绊步",
    text: "对方冲锋少走 1 步。",
    flavor: "巷里迈不开第三步。",
    chapter: "alley",
  },
  ghostStep: {
    id: "ghostStep",
    name: "镜步",
    text: "进步可穿过桩。",
    flavor: "桩认人，不认影。",
    chapter: "alley",
  },
  trapWard: {
    id: "trapWard",
    name: "识机",
    text: "你不受机关格伤害。",
    flavor: "机簧响的时候，脚已经不在那儿。",
    chapter: "alley",
  },
  tether: {
    id: "tether",
    name: "纤力",
    text: "收势时若相隔超过 2 格，把对方拉近 1 格。",
    flavor: "缆还在手上。",
    chapter: "alley",
    school: "hook",
  },
  closeCut: {
    id: "closeCut",
    name: "巷刃",
    text: "抽刀始终按相邻结算。",
    flavor: "巷窄，刀不必出鞘。",
    chapter: "alley",
    school: "saber",
  },
  delayGuard: {
    id: "delayGuard",
    name: "等手",
    text: "对方蓄势时，你获得 3 点格挡。",
    flavor: "他要过一拍。你就卸这一拍。",
    chapter: "court",
  },
  throne: {
    id: "throne",
    name: "门墙",
    text: "你在第 1 步时，卸力类格挡 +4。",
    flavor: "背贴着门，力有地方去。",
    chapter: "court",
  },
  nightStep: {
    id: "nightStep",
    name: "夜步残谱",
    text: "开战先有 1 点格挡。",
    flavor: "井底下的人，先把气沉住。",
    chapter: "dock",
  },
  leftover: {
    id: "leftover",
    name: "余劲",
    text: "收势时留下 1 点劲力到下回合。",
    flavor: "这一拍没打完，下一拍还热。",    chapter: "dock",
  },
  rebound: {
    id: "rebound",
    name: "回桩",
    text: "你挨打时回敬 3 点。",
    flavor: "力打在桩上，桩还人。",
    chapter: "dock",
    school: "staff",
  },
  stackHand: {
    id: "stackHand",
    name: "多手",
    text: "手里多留一张。",
    flavor: "谱多一页，步就多一拍。",
    chapter: "dock",
  },
  // §31.19 分系外功：各武器分化出各自的外功，奖励池只出「本系 + 通用」。
  ironPalm: {
    id: "ironPalm",
    name: "铁掌印",
    text: "撞壁伤害 +6。",
    flavor: "印在墙上，也印在骨上。",
    chapter: "dock",
    school: "palm",
  },
  softPalm: {
    id: "softPalm",
    name: "绵里针",
    text: "你的格挡牌额外 +2。",
    flavor: "棉花里藏着针，架住才知道。",
    chapter: "dock",
    school: "palm",
  },
  piercingPalm: {
    id: "piercingPalm",
    name: "透骨劲",
    text: "击退再远 1 格。",
    flavor: "掌力穿过皮肉，落到桩子上。",
    chapter: "dock",
    school: "palm",
  },
  saberGrudge: {
    id: "saberGrudge",
    name: "衔恨刀",
    text: "上回合挨过打，本回合攻击再 +2（与埋招叠加）。",
    flavor: "刀记着疼，比人记得牢。",
    chapter: "alley",
    school: "saber",
  },
  spearWind: {
    id: "spearWind",
    name: "枪风",
    text: "相隔 3 格以上时，攻击 +3。",
    flavor: "枪头未到，风先到了。",
    chapter: "alley",
    school: "spear",
  },
  longMarch: {
    id: "longMarch",
    name: "长驱",
    text: "进步多走 1 步。",
    flavor: "枪出如龙，步不停。",
    chapter: "alley",
    school: "spear",
  },
  pikeBrace: {
    id: "pikeBrace",
    name: "拒马",
    text: "对方蓄势时，你获得 2 点格挡。",
    flavor: "枪尖朝外，就是半堵墙。",
    chapter: "court",
    school: "spear",
  },
  swordRain: {
    id: "swordRain",
    name: "剑雨",
    text: "目标裂创 ≥3 层时，你的攻击 +3。",
    flavor: "伤口越多，剑越密。",
    chapter: "alley",
    school: "sword",
  },
  swordScreen: {
    id: "swordScreen",
    name: "剑幕",
    text: "不贴身时，你的格挡牌 +3。",
    flavor: "剑光铺开，就是帘子。",
    chapter: "court",
    school: "sword",
  },
  flowSword: {
    id: "flowSword",
    name: "流水剑",
    text: "收势时再多留 1 点劲力到下回合。",
    flavor: "剑势不断，劲力不散。",
    chapter: "court",
    school: "sword",
  },
  stakeArmor: {
    id: "stakeArmor",
    name: "桩甲",
    text: "场上有桩时，每回合开局格挡 +2。",
    flavor: "桩立住了，人就硬了。",
    chapter: "dock",
    school: "staff",
  },
  heavyStaff: {
    id: "heavyStaff",
    name: "沉棍",
    text: "击退再远 1 格。",
    flavor: "棍重三分，人退三步。",
    chapter: "dock",
    school: "staff",
  },
  barbedHook: {
    id: "barbedHook",
    name: "倒刺钩",
    text: "每次把对方拉近时，附 3 点伤。",
    flavor: "钩上有倒刺，进来就得留东西。",
    chapter: "alley",
    school: "hook",
  },
  hookVeil: {
    id: "hookVeil",
    name: "钩帘",
    text: "对方被缴械时，你的格挡牌 +3。",
    flavor: "他没了家伙，你的钩子就是门帘。",
    chapter: "court",
    school: "hook",
  },
};

export const HEARTS: Record<HeartId, HeartDef> = {
  iron: {
    id: "iron",
    name: "劲力",
    text: "偏攻。开战先机略高，出招更沉半成。",
    flavor: "先抢半步，刀才认人。",
  },
  breath: {
    id: "breath",
    name: "命数",
    text: "偏防。命数上限 4（默认 3）。",
    flavor: "多留一口气在体外。",
  },
  empty: {
    id: "empty",
    name: "资装",
    text: "开局多银与凡药、赤铜，方便早做买卖。",
    flavor: "路上要银，也要药。",
  },
};

export const ENEMIES: Record<EnemyId, EnemyDef> = {
  catcher: {
    id: "catcher",
    name: "赵捕",
    title: "码头官差",
    hp: 56,
    pos: 5,
    skill: "亮刀",
    pitch: "「刀在这儿。名册上没有你。」",
    remnant: "brightBlade",
    pattern: [{ kind: "strike", damage: 18 }, { kind: "guard", block: 8 }, { kind: "breathe", amount: 3 }],
  },
  escort: {
    id: "escort",
    name: "沈镖",
    title: "走水护镖",
    hp: 72,
    pos: 3,
    skill: "冲锋",
    pitch: "「让开。这箱不是给你看的。」",
    remnant: "bodyCheck",
    pattern: [{ kind: "charge", damage: 18, steps: 3 }, { kind: "guard", block: 8 }, { kind: "strike", damage: 14 }],
  },
  piler: {
    id: "piler",
    name: "桩阿大",
    title: "垂街残徒",
    hp: 74,
    pos: 4,
    skill: "落桩",
    pitch: "「先下桩。船今晚不接除名。」",
    remnant: "heelStake",
    pattern: [{ kind: "stake" }, { kind: "guard", block: 8 }, { kind: "strike", damage: 19 }],
  },
  hauler: {
    id: "hauler",
    name: "纤佬",
    title: "岸缆",
    hp: 72,
    pos: 4,
    skill: "拉",
    pitch: "「缆在我手里。巷里的人叫我拦住往北的。」",
    remnant: "tether",
    pattern: [{ kind: "pull", steps: 2 }, { kind: "guard", block: 6 }, { kind: "strike", damage: 18 }],
  },
  alley: {
    id: "alley",
    name: "巷刃",
    title: "垂街夜行",
    hp: 70,
    pos: 3,
    skill: "抢步",
    pitch: "「问半页纸的人，巷里只有一步。」",
    remnant: "closeCut",
    pattern: [{ kind: "lunge", damage: 18 }, { kind: "guard", block: 6 }, { kind: "breathe", amount: 3 }],
  },
  trapper: {
    id: "trapper",
    name: "簧二",
    title: "簧片",
    hp: 70,
    pos: 4,
    skill: "下机",
    pitch: "「北栅是镜廷的。脚底下。」",
    remnant: "trapWard",
    pattern: [{ kind: "trap" }, { kind: "guard", block: 6 }, { kind: "strike", damage: 18 }],
  },
  delay: {
    id: "delay",
    name: "迟手裴",
    title: "镜廷过客",
    hp: 78,
    pos: 4,
    skill: "蓄势",
    pitch: "「这一拍让给你。名册要写得干净。」",
    remnant: "delayGuard",
    pattern: [{ kind: "windup" }, { kind: "strike", damage: 26 }, { kind: "guard", block: 10 }],
  },
  twin: {
    id: "twin",
    name: "影步",
    title: "镜中人",
    hp: 72,
    pos: 3,
    skill: "换位",
    pitch: "「你站的是我的位置。名册盖住你的时候，留下了我。」",
    remnant: "ghostStep",
    pattern: [{ kind: "swap" }, { kind: "guard", block: 6 }, { kind: "strike", damage: 19 }],
  },
  lord: {
    id: "lord",
    name: "门墙顾",
    title: "门墙",
    hp: 88,
    pos: 4,
    skill: "冲、桩、劈",
    pitch: "「名册在门里。墨还没干。」",
    remnant: "throne",
    pattern: [{ kind: "charge", damage: 16, steps: 2 }, { kind: "guard", block: 10 }, { kind: "stake" }, { kind: "strike", damage: 20 }],
    patternSets: [
      [{ kind: "barrage", damage: 8, hits: 2 }, { kind: "windup" }, { kind: "strike", damage: 22 }, { kind: "shatter", amount: 10 }],
    ],
  },
  usurper: {
    id: "usurper",
    name: "夺玺者",
    title: "谋逆主脑",
    hp: 120,
    pos: 4,
    skill: "冲、连打、架",
    pitch: "「印玺该换手了。你们三个，来得正好。」",
    remnant: "throne",
    // §31.10 馆主长兵：隔一格也能打到（踢馆线极难的空间压迫）。
    reach: 2,
    pattern: [
      { kind: "guard", block: 12 },
      { kind: "charge", damage: 18, steps: 2 },
      { kind: "counter", form: "slash" },
      { kind: "barrage", damage: 12, hits: 3 },
      { kind: "strike", damage: 24 },
    ],
  },
  bandit: {
    id: "bandit",
    name: "岗花子",
    title: "院外蹲手",
    hp: 110,
    pos: 4,
    skill: "恶手",
    pitch: "「过帖的人身上有油水。岗上不讲让。」",
    remnant: "hardWall",
    pattern: [{ kind: "shatter", amount: 8 }, { kind: "guard", block: 8 }, { kind: "bleedcut", damage: 10, bleed: 3 }, { kind: "charge", damage: 14, steps: 2 }, { kind: "barrage", damage: 6, hits: 2 }],
  },
  thief: {
    id: "thief",
    name: "剪绺",
    title: "驿路窃贼",
    hp: 58,
    pos: 3,
    skill: "摸袋",
    pitch: "「你看别处。我看你腰。」",
    remnant: "ghostStep",
    pattern: [{ kind: "lunge", damage: 14 }, { kind: "guard", block: 5 }, { kind: "strike", damage: 12 }],
  },
  hillBandit: {
    id: "hillBandit",
    name: "岗匪",
    title: "山路拦客",
    hp: 88,
    pos: 4,
    skill: "拦路",
    pitch: "「过山要钱。过刀也行。」",
    remnant: "bodyCheck",
    pattern: [{ kind: "shatter", amount: 8 }, { kind: "guard", block: 6 }, { kind: "charge", damage: 16, steps: 2 }, { kind: "strike", damage: 19 }],
  },
  riverThug: {
    id: "riverThug",
    name: "水匪",
    title: "渡口闲刀",
    hp: 72,
    pos: 4,
    skill: "扳船",
    pitch: "「岸上的货，水里也认价。」",
    remnant: "longPush",
    pattern: [{ kind: "pull", steps: 2 }, { kind: "guard", block: 6 }, { kind: "strike", damage: 17 }, { kind: "shatter", amount: 6 }],
  },
  raider: {
    id: "raider",
    name: "潮口",
    title: "潮口",
    hp: 76,
    pos: 4,
    skill: "拉缆",
    pitch: "「岸上的货，潮里也认。」",
    remnant: "longPush",
    pattern: [{ kind: "shatter", amount: 8 }, { kind: "pull", steps: 2 }, { kind: "breathe", amount: 3 }, { kind: "strike", damage: 19 }],
  },
  robber: {
    id: "robber",
    name: "缆刀",
    title: "缆厂夜手",
    hp: 68,
    pos: 3,
    skill: "抢步",
    pitch: "「契不在身上，刀也认。」",
    remnant: "shortCharge",
    pattern: [{ kind: "lunge", damage: 18 }, { kind: "breathe", amount: 3 }, { kind: "guard", block: 6 }],
  },
  smuggler: {
    id: "smuggler",
    name: "换口盐",
    title: "换口的人",
    hp: 72,
    pos: 4,
    skill: "卸力",
    pitch: "「官盐朝西。我朝东。」",
    remnant: "keepGuard",
    pattern: [{ kind: "guard", block: 12 }, { kind: "windup" }, { kind: "strike", damage: 20 }],
  },
  thug: {
    id: "thug",
    name: "巷霸",
    title: "巷口",
    hp: 68,
    pos: 3,
    skill: "回身",
    pitch: "「往北的人，把口袋留下。」",
    remnant: "backstep",
    pattern: [{ kind: "shatter", amount: 8 }, { kind: "guard", block: 7 }, { kind: "strike", damage: 17 }, { kind: "charge", damage: 16, steps: 2 }],
  },
  intruder: {
    id: "intruder",
    name: "夜客",
    title: "破门的人",
    hp: 42,
    pos: 4,
    skill: "劈",
    pitch: "「屋里那人，帖还没递。」",
    remnant: "backstep",
    pattern: [{ kind: "strike", damage: 13 }, { kind: "guard", block: 6 }, { kind: "breathe", amount: 3 }, { kind: "lunge", damage: 12 }],
  },
  brute: {
    id: "brute",
    name: "坡蹲",
    title: "坡上蹲手",
    hp: 76,
    pos: 4,
    skill: "撞岗",
    pitch: "「岗是我的。人留下。」",
    remnant: "bodyCheck",
    pattern: [{ kind: "charge", damage: 17, steps: 2 }, { kind: "guard", block: 8 }, { kind: "strike", damage: 19 }],
  },
  cavehand: {
    id: "cavehand",
    name: "缝手",
    title: "潮缝",
    hp: 74,
    pos: 3,
    skill: "拖",
    pitch: "「缝里的人，不认名册。」",
    remnant: "tether",
    pattern: [{ kind: "pull", steps: 2 }, { kind: "breathe", amount: 3 }, { kind: "lunge", damage: 18 }],
  },
  warden: {
    id: "warden",
    name: "岗老",
    title: "岗门",
    hp: 80,
    pos: 4,
    skill: "蓄势",
    pitch: "「过岗要留下一刀。」",
    remnant: "delayGuard",
    pattern: [{ kind: "windup" }, { kind: "strike", damage: 26 }, { kind: "guard", block: 10 }],
  },
  inkhand: {
    id: "inkhand",
    name: "墨手",
    title: "税卡夜笔",
    hp: 44,
    pos: 4,
    skill: "点墨",
    pitch: "「案下那一笔，还没干。」",
    remnant: "leftover",
    pattern: [{ kind: "strike", damage: 13 }, { kind: "breathe", amount: 4 }, { kind: "guard", block: 7 }],
  },
  bookcut: {
    id: "bookcut",
    name: "裁页",
    title: "潮祠刀笔",
    hp: 72,
    pos: 4,
    skill: "抽刀",
    pitch: "「页裁过。名就短一截。」",
    remnant: "stackHand",
    pattern: [{ kind: "lunge", damage: 17 }, { kind: "guard", block: 6 }, { kind: "strike", damage: 16 }],
  },
  nametaker: {
    id: "nametaker",
    name: "夺名吏",
    title: "岗上收名",
    hp: 82,
    pos: 4,
    skill: "蓄势",
    pitch: "「名留下。人可以走。」",
    remnant: "leftover",
    pattern: [{ kind: "windup" }, { kind: "strike", damage: 26 }, { kind: "breathe", amount: 3 }],
  },
  glasspin: {
    id: "glasspin",
    name: "镜钉",
    title: "潮口抽钉",
    hp: 74,
    pos: 4,
    skill: "拉",
    pitch: "「镜子里的钉子，要拔出来。」",
    remnant: "rebound",
    pattern: [{ kind: "pull", steps: 2 }, { kind: "guard", block: 6 }, { kind: "strike", damage: 18 }],
  },
  knotboss: {
    id: "knotboss",
    name: "死结手",
    title: "坞里那结",
    hp: 76,
    pos: 4,
    skill: "拉缆",
    pitch: "「结是死的。人不是。」",
    remnant: "leftover",
    pattern: [{ kind: "pull", steps: 2 }, { kind: "guard", block: 8 }, { kind: "lunge", damage: 17 }],
  },
  stakeboss: {
    id: "stakeboss",
    name: "钉桩的",
    title: "缆厂桩师",
    hp: 48,
    pos: 4,
    skill: "落桩",
    pitch: "「这根桩是我钉的。你把它拔了。」",
    remnant: "rebound",
    pattern: [{ kind: "stake" }, { kind: "guard", block: 8 }, { kind: "strike", damage: 14 }],
  },
  tutorPace: {
    id: "tutorPace",
    name: "步阿宽",
    title: "岗棚教习",
    hp: 30,
    pos: 4,
    skill: "让步",
    pitch: "“步是让出来的。你站在我要踩的地方，就是自己找撞。”",
    remnant: "leftover",
    pattern: [{ kind: "charge", damage: 10, steps: 2 }],
  },
  tutorWard: {
    id: "tutorWard",
    name: "掌阿稳",
    title: "岸上教习",
    hp: 32,
    pos: 4,
    skill: "卸力",
    pitch: "“掌打在卸上，力才回去。硬接会倒。”",
    remnant: "leftover",
    pattern: [{ kind: "strike", damage: 11 }],
  },
  tutorEdge: {
    id: "tutorEdge",
    name: "谱阿正",
    title: "巷口教习",
    hp: 30,
    pos: 4,
    skill: "分谱",
    pitch: "“拳谱是拳谱。刀谱是刀谱。别混着使。”",
    remnant: "leftover",
    pattern: [{ kind: "strike", damage: 10 }],
  },
  jinwu: {
    id: "jinwu",
    name: "金吾卒",
    title: "天津桥巡",
    hp: 68,
    pos: 4,
    skill: "拦路",
    pitch: "「桥上夜巡。无帖者，留下。」",
    remnant: "keepGuard",
    pattern: [{ kind: "guard", block: 10 }, { kind: "strike", damage: 16 }, { kind: "breathe", amount: 2 }],
  },
  canalThug: {
    id: "canalThug",
    name: "漕帮打手",
    title: "洛水私口",
    hp: 72,
    pos: 3,
    skill: "扑岸",
    pitch: "「漕口的账，不认官印。」",
    remnant: "bodyCheck",
    pattern: [{ kind: "charge", damage: 16, steps: 2 }, { kind: "strike", damage: 15 }, { kind: "guard", block: 6 }],
  },
  brothelGuard: {
    id: "brothelGuard",
    name: "平康护院",
    title: "坊门刀",
    hp: 64,
    pos: 4,
    skill: "拦门",
    pitch: "「姑娘的局，外人别闯。」",
    remnant: "closeCut",
    pattern: [{ kind: "lunge", damage: 15 }, { kind: "guard", block: 8 }, { kind: "strike", damage: 14 }],
  },
  jailer: {
    id: "jailer",
    name: "狱卒",
    title: "府衙侧牢",
    hp: 70,
    pos: 4,
    skill: "锁步",
    pitch: "「枷还热。你要试，就进来。」",
    remnant: "hardWall",
    pattern: [{ kind: "stake" }, { kind: "strike", damage: 17 }, { kind: "guard", block: 9 }],
  },
};

Object.assign(ENEMIES, GENERATED_ENEMIES);

export const SPAR_ENEMIES: EnemyId[] = ["tutorPace", "tutorWard", "tutorEdge"];

export function isSparEnemy(id: EnemyId): boolean {
  return SPAR_ENEMIES.includes(id);
}

export const ENEMY_WEAPON: Record<EnemyId, WeaponId> = {
  catcher: "saber",
  escort: "saber",
  piler: "staff",
  hauler: "hook",
  alley: "saber",
  trapper: "staff",
  delay: "sword",
  twin: "sword",
  lord: "palm",
  usurper: "saber",
  bandit: "saber",
  raider: "hook",
  robber: "saber",
  smuggler: "sword",
  thug: "palm",
  thief: "palm",
  hillBandit: "saber",
  riverThug: "hook",
  intruder: "palm",
  brute: "palm",
  cavehand: "hook",
  warden: "staff",
  inkhand: "sword",
  bookcut: "saber",
  nametaker: "sword",
  glasspin: "hook",
  knotboss: "hook",
  stakeboss: "staff",
  tutorPace: "palm",
  tutorWard: "palm",
  tutorEdge: "saber",
  jinwu: "saber",
  canalThug: "palm",
  brothelGuard: "saber",
  jailer: "staff",
};

Object.assign(ENEMY_WEAPON, GENERATED_ENEMY_WEAPON);

export const ENEMY_PACE: Partial<Record<EnemyId, number>> = {
  catcher: 4,
  escort: 5,
  piler: 3,
  delay: 2,
  trapper: 9,
  alley: 6,
  twin: 8,
  glasspin: 8,
  robber: 6,
  thug: 6,
  stakeboss: 4,
  hauler: 5,
  bandit: 8,
  thief: 7,
  hillBandit: 6,
  riverThug: 5,
  raider: 5,
  brute: 5,
  cavehand: 6,
  bookcut: 6,
  knotboss: 5,
  lord: 4,
  usurper: 6,
  smuggler: 4,
  warden: 3,
  nametaker: 3,
  inkhand: 5,
  intruder: 5,
};

export function enemyPace(id: EnemyId): number {
  return ENEMY_PACE[id] ?? 5;
}

/** Foe energy budget per round — weak hands 1, elites 3–4. */
export const ENEMY_ENERGY: Partial<Record<EnemyId, number>> = {
  catcher: 1,
  escort: 2,
  hauler: 2,
  alley: 2,
  trapper: 2,
  cavehand: 2,
  bookcut: 2,
  glasspin: 2,
  raider: 2,
  robber: 2,
  thug: 2,
  smuggler: 2,
  inkhand: 1,
  intruder: 1,
  stakeboss: 1,
  tutorPace: 1,
  tutorWard: 1,
  tutorEdge: 1,
  jinwu: 2,
  canalThug: 2,
  brothelGuard: 2,
  jailer: 2,
  bandit: 4,
  thief: 2,
  hillBandit: 2,
  riverThug: 2,
  brute: 4,
  piler: 2,
  delay: 1,
  twin: 4,
  warden: 4,
  knotboss: 4,
  nametaker: 5,
  lord: 6,
  usurper: 7,
};

Object.assign(ENEMY_ENERGY, GENERATED_ELITE_ENERGY);

export function enemyEnergyMax(id: EnemyId): number {
  const base = ENEMY_ENERGY[id] ?? 2;
  // 劲力蓝条化后敌上限抬到约 6–10
  return Math.min(10, 4 + base * 2);
}

export const CHAPTER_TECH: Record<ChapterId, TechniqueId[]> = {
  dock: ["longPush", "backstep", "keepGuard", "hardWall", "leftover", "rebound", "stackHand"],
  alley: ["shortCharge", "ghostStep", "trapWard"],
  court: ["delayGuard", "throne"],
  isle: ["brightBlade", "bodyCheck"],
};

export const CHALLENGE: EnemyId[] = [
  "bandit",
  "raider",
  "robber",
  "smuggler",
  "thug",
  "thief",
  "hillBandit",
  "riverThug",
  "brute",
  "cavehand",
  "warden",
];

export const CHAPTERS: Record<
  ChapterId,
  { name: string; kicker: string; next: ChapterId | null; index: number }
> = {
  dock: { name: "港律", kicker: "码头", next: "alley", index: 1 },
  alley: { name: "巷律", kicker: "垂街", next: "court", index: 2 },
  court: { name: "门律", kicker: "宫阙", next: "isle", index: 3 },
  isle: { name: "潮屿", kicker: "潮门", next: null, index: 4 },
};

export function intentLabel(intent: Intent): string {
  if (intent.kind === "strike") return `打击 ${intent.damage}`;
  if (intent.kind === "charge") return `冲锋 ${intent.steps} · ${intent.damage}`;
  if (intent.kind === "stake") return "落桩";
  if (intent.kind === "pull") return `拉 ${intent.steps}`;
  if (intent.kind === "trap") return "下机";
  if (intent.kind === "windup") return "蓄势";
  if (intent.kind === "lunge") return `抢步 ${intent.damage}`;
  if (intent.kind === "swap") return "换位";
  if (intent.kind === "barrage") return `连打 ${intent.hits} · ${intent.damage}`;
  if (intent.kind === "guard") return `卸力 ${intent.block}`;
  if (intent.kind === "bleedcut") return `刀创 ${intent.damage}`;
  if (intent.kind === "counter") return "埋招";
  if (intent.kind === "mend") return `金创 ${intent.heal}`;
  if (intent.kind === "seal") return "封脉";
  if (intent.kind === "shatter") return `裂盾 ${intent.amount}`;
  if (intent.kind === "breathe") return `吐纳 +${intent.amount}`;
  if (intent.kind === "retreat") return `撤 ${intent.steps}`;
  if (intent.kind === "pestle") return `韦陀杵 ${intent.damage}`;
  if (intent.kind === "dust") return "迷眼";
  if (intent.kind === "shackle") return "锁链";
  if (intent.kind === "dodge") return "闪避";
  if (intent.kind === "endure") return "霸体";
  if (intent.kind === "sig") return SIGNATURE_BREAK[intent.id as keyof typeof SIGNATURE_BREAK]?.label ?? "绝招";
  return "换位";
}

/** 意图条标题：不含数字（数字只出现在右侧一处）。 */
export function intentShortName(intent: Intent): string {
  if (intent.kind === "strike") return "打击";
  if (intent.kind === "charge") return "冲锋";
  if (intent.kind === "stake") return "落桩";
  if (intent.kind === "pull") return "拉近";
  if (intent.kind === "trap") return "下机";
  if (intent.kind === "windup") return "蓄势";
  if (intent.kind === "lunge") return "抢步";
  if (intent.kind === "advance") return "逼近";
  if (intent.kind === "swap") return "换位";
  if (intent.kind === "barrage") return "连打";
  if (intent.kind === "guard") return "卸力";
  if (intent.kind === "bleedcut") return "刀创";
  if (intent.kind === "counter") return "埋招";
  if (intent.kind === "mend") return "金创";
  if (intent.kind === "seal") return "封脉";
  if (intent.kind === "shatter") return "裂盾";
  if (intent.kind === "breathe") return "吐纳";
  if (intent.kind === "retreat") return "撤";
  if (intent.kind === "pestle") return "韦陀杵";
  if (intent.kind === "dust") return "迷眼";
  if (intent.kind === "shackle") return "锁链";
  if (intent.kind === "dodge") return "闪避";
  if (intent.kind === "endure") return "霸体";
  if (intent.kind === "sig") return SIGNATURE_BREAK[intent.id as keyof typeof SIGNATURE_BREAK]?.label ?? "绝招";
  return "意图";
}

/** 意图悬浮说明（对战条用） */
export function intentTip(intent: Intent): string {
  if (intent.kind === "strike") return `对你造成 ${intent.damage} 点伤害（先吃格挡）。`;
  if (intent.kind === "charge") return `冲 ${intent.steps} 步；撞上则打 ${intent.damage}。`;
  if (intent.kind === "stake") return "在身前落桩，挡你退路与击退。挡路的桩会先吃你的攻击（低阶 1 次、高阶 2 次）；棍一棍可拆高阶。";
  if (intent.kind === "pull") return `把你往他身边拉 ${intent.steps} 步。`;
  if (intent.kind === "trap") return "在你脚下埋机关，踩中受伤。";
  if (intent.kind === "windup") return "这一息蓄势，下一息往往更重。";
  if (intent.kind === "lunge") return `抢步贴近并打 ${intent.damage}。`;
  if (intent.kind === "swap") return "与你换位，改写站位与撞墙方向。";
  if (intent.kind === "barrage") return `连打 ${intent.hits} 下，每下 ${intent.damage}。`;
  if (intent.kind === "guard") return `获得 ${intent.block} 点架势，打在他身上先被卸掉。`;
  if (intent.kind === "bleedcut") return `打 ${intent.damage}，并给你叠裂创。`;
  if (intent.kind === "counter") return "埋下反击。你打他时会触发回手。";
  if (intent.kind === "mend") return `回 ${intent.heal} 血，并清掉他身上的裂创。`;
  if (intent.kind === "seal") return "封你的脉：下回少劲，并滞步。";
  if (intent.kind === "shatter") return `震掉你约 ${intent.amount} 点格挡。`;
  if (intent.kind === "breathe") return `吐纳回 ${intent.amount} 点敌劲，下息更好出手。`;
  if (intent.kind === "retreat") return `向后撤 ${intent.steps} 格。用进步追上可硬拆。`;
  if (intent.kind === "pestle") return `韦陀杵打 ${intent.damage}，不拆则眩 1。`;
  if (intent.kind === "dust") return "迷眼：下一段你的攻击须贴身才中。";
  if (intent.kind === "shackle") return "锁链：收势若仍贴身则滞步。";
  if (intent.kind === "dodge") return "闪避：你下一张攻击牌落空。走开或先不出刀。";
  if (intent.kind === "endure") return "霸体：你下一张攻击仍能打伤，但击退/拉/眩晕无效。破绽/刺/开缝可硬拆。";
  if (intent.kind === "sig") {
    const sig = SIGNATURE_BREAK[intent.id as keyof typeof SIGNATURE_BREAK];
    return sig ? `${sig.label}：${sig.tip}` : "特色招。";
  }
  return "改变站位。";
}

export function intentMark(intent: Intent): string {
  if (intent.kind === "strike") return String(intent.damage);
  if (intent.kind === "charge") return String(intent.damage);
  if (intent.kind === "lunge") return String(intent.damage);
  if (intent.kind === "barrage") return `${intent.hits}`;
  if (intent.kind === "guard") return "卸";
  if (intent.kind === "bleedcut") return "创";
  if (intent.kind === "counter") return "埋";
  if (intent.kind === "mend") return "药";
  if (intent.kind === "seal") return "封";
  if (intent.kind === "shatter") return "裂";
  if (intent.kind === "breathe") return "纳";
  if (intent.kind === "pull") return "拉";
  if (intent.kind === "trap") return "机";
  if (intent.kind === "windup") return "蓄";
  if (intent.kind === "swap") return "换";
  if (intent.kind === "dodge") return "闪";
  if (intent.kind === "endure") return "霸";
  return "桩";
}

export const WORLD = {
  title: "明手",
  kicker: "港律 · 宫阙 · 缆域 · 潮屿",
  lead: "比武要先亮招。偷袭的人，名册上除名。",
  you: "码头、宫城、街巷、潮屿。人不同，进门处也不同。",
};

export function heartHp(id: HeartId): number {
  return id === "iron" ? 30 : BASE_HP;
}

export function winHeal(id: HeartId): number {
  return id === "breath" ? 4 : 3;
}
