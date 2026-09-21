import { CARDS, TECHNIQUES } from "./content";
import { WEAPON_NAME } from "./party";
import type { CardId, Run, TechniqueId } from "./types";
import { GEAR_WEAPONS, gearById, type GearWeapon } from "./weapons";

/** 三本：明注 / 兵籍 / 势录 — 烫印后由账房发给，顶栏才出现。 */
export const CODEX = {
  mingzhu: {
    flag: "hasMingzhu",
    btn: "明注",
    kicker: "条注",
    title: "明注",
    lead: "战斗里亮过的字，都写在这里。",
  },
  bingji: {
    flag: "hasBingji",
    btn: "兵籍",
    kicker: "器录",
    title: "兵籍",
    lead: "摸过的兵刃在这里。没摸过的是空格。",
  },
  shilu: {
    flag: "hasShilu",
    btn: "势录",
    kicker: "招录",
    title: "势录",
    lead: "学会的外功在这里。没学会的只见空名。",
  },
} as const;

export type CodexBook = keyof typeof CODEX;

export const CODEX_FLAGS = [CODEX.mingzhu.flag, CODEX.bingji.flag, CODEX.shilu.flag] as const;

export function hasCodex(run: Run, book: CodexBook): boolean {
  return run.flags.includes(CODEX[book].flag);
}

export function hasAnyCodex(run: Run): boolean {
  return CODEX_FLAGS.some((f) => run.flags.includes(f));
}

export function grantCodexTrio(run: Run): Run {
  let flags = [...run.flags];
  for (const f of CODEX_FLAGS) {
    if (!flags.includes(f)) flags.push(f);
  }
  return { ...run, flags };
}

export interface StatusEntry {
  id: string;
  name: string;
  side: "you" | "foe" | "both" | "intent";
  text: string;
}

/** 爬塔图鉴：状态与机制。意图只是预告，不进本表。硬拆套不进爬塔。 */
export const STATUS_ENTRIES: StatusEntry[] = [
  {
    id: "pace",
    name: "先机",
    side: "both",
    text: "出手快慢。底速：拳 8、剑 7、刀钩 6、枪棍 5。并手你先。馆 6–8 敌 +1，馆 9–10 敌 +2。爬塔刀领先不再加面伤。兵器「快刀」仍可抽摸回劲。贴刃是伤害被动，不改先机。",
  },
  {
    id: "block",
    name: "格挡",
    side: "both",
    text: "伤害先扣格挡再扣血。爬塔帽 12，局内留，受击减少。读招收势清（铁布除外）。裂创跳伤也可被格挡。",
  },
  { id: "thorns", name: "反震", side: "you", text: "他打你时，你按这个数回敬。外功「回桩」基础 3；喂养升档按 ×1.15 / ×1.30 取整。" },
  { id: "iron", name: "铁布", side: "you", text: "数回内，每回开局自带一截格挡，收势不清这一截。" },
  { id: "echo", name: "尾劲", side: "you", text: "下回第一掌额外加伤。收势时把尾劲写入蓄劲。与纳息分开：尾劲加伤，纳息加蓝。" },
  { id: "qi", name: "纳息", side: "you", text: "下回多这么多劲力。和侧栏「劲力」不是同一条：那是当前蓝。与尾劲分开。" },
  { id: "bury", name: "埋招", side: "both", text: "挨打时按埋下的形式反击：回刀、叠创、让步、回架。" },
  {
    id: "bleed",
    name: "裂创",
    side: "both",
    text: "爬塔帽 6（读招可到 9）。回合结束按层扣血，可被格挡。刀贴身命中叠 1（牌面另叠另算）。预演只跟注。金创、烙口、缝创可治。",
  },
  { id: "seal", name: "封脉", side: "you", text: "下回少这么多劲力。通脉可解。" },
  { id: "slow", name: "滞步", side: "you", text: "先机减这么多。每回减 1 层。通脉可解。" },
  {
    id: "sway",
    name: "乱步",
    side: "both",
    text: "同一息里又进又退。输出 -2，挨打 +3。敌方同样触发。不与送手、失位合并。",
  },
  {
    id: "gift",
    name: "送手",
    side: "both",
    text: "这一息贴上去却没出招：下一记挨打多吃 4。敌方贴脸却没打你，也会送手。不与乱步、失位合并。",
  },
  {
    id: "unseat",
    name: "失位",
    side: "both",
    text: "换位时先机不够的一方失位。爬塔：本手先机 −1。读招仍有输出 -2、挨打 +3。你先机领先再换位，则是他失位。不与乱步、送手合并。",
  },
  { id: "regen", name: "缝创", side: "you", text: "数回内每回回血；每隔一回压 1 层裂创。" },
  {
    id: "expose",
    name: "破绽",
    side: "both",
    text: "剑副。给他叠层（爬塔帽 4），克高格挡。打他时耗 1 层，穿挡直伤 4（先结算面伤吃挡，再掉这 4 点气血）。你身上的破绽：他打你每层 +4 并消耗。",
  },
  {
    id: "swordchain",
    name: "剑势",
    side: "you",
    text: "剑核。爬塔：攻击加伤等于当前层数，命中后再 +1 层，帽 6。破招连势已回收，爬塔不要再用连势。",
  },
  {
    id: "combo",
    name: "连击",
    side: "you",
    text: "拳核。爬塔：攻击命中叠层，帽 6，并击退 1。花 2 层点「连击重放」，再结算上一张攻击一次（不耗劲、不耗手牌）。",
  },
  {
    id: "spearcut",
    name: "断劲",
    side: "you",
    text: "枪副。同手两枪都在 3–4 格，立刻扣敌劲 3。扣不动的挂下次回劲。不转血。与「扣劲」（回劲变慢）不是同一件事。",
  },
  {
    id: "stake",
    name: "桩",
    side: "both",
    text: "棍核。爬塔场上最多 2 根。不能放敌人身后那一格。敌撞裂你的桩→你格挡 +4；你打出裂桩拆掉桩→爆炸双方各 4 伤并晕敌 1 段。",
  },
  { id: "mark", name: "点穴", side: "foe", text: "印记。开缝等招吃印；与破绽不是同一件事。" },
  { id: "frail", name: "滞手", side: "foe", text: "他打你时少 3 点。每回减 1 层。" },
  {
    id: "stun",
    name: "眩晕",
    side: "both",
    text: "敌：跳过 N 个攻击段（每段扣 1），立刻拿掉。爬塔你：本手锁最左 N 张（弃牌可弃）；已收势则下手少摸 N。后场摸牌不吃晕。晕 > 缴械。读招你：有层时打不出攻击。",
  },
  {
    id: "disarm",
    name: "缴械",
    side: "foe",
    text: "钩核（拉近成功才上）。爬塔：跳过下一次有伤，立刻拿掉。读招：攻击伤害减半，持续 N 回合。",
  },
  { id: "dodge", name: "闪避", side: "foe", text: "闪过你下一张攻击牌的牌面伤。馆 8 起敌招池才出现。" },
  {
    id: "endure",
    name: "霸体",
    side: "foe",
    text: "挨打但不吃击退/拉/眩晕。挡控耗 1 层。每个结束 −1（赋予当手也掉）。帽 3。杂兵意图不写霸体招。",
  },
  {
    id: "leech",
    name: "噬血",
    side: "you",
    text: "钩副。爬塔：只对缴械目标，命中回血 30%（至少 1）。角色被动另有固定吸血。回血不超过气血上限。",
  },
  { id: "mute", name: "禁技", side: "both", text: "有层时打不出技能牌。爬塔不进敌招池。" },
  {
    id: "dust",
    name: "迷眼",
    side: "you",
    text: "下一段攻击须贴身才中。隔位打空。爬塔仅 6 馆起精英会迷眼。",
  },
  { id: "nobag", name: "封囊", side: "both", text: "不能用伤药/暗器。爬塔不进敌招池。" },
  { id: "handtax", name: "削谱", side: "you", text: "手牌上限减少。爬塔不进敌招池。" },
  {
    id: "qiburn",
    name: "扣劲",
    side: "both",
    text: "回劲被克扣。与枪副「断劲」（立刻扣当前劲 / 挂下次回劲）不是同一件事。",
  },
  {
    id: "hand",
    name: "手牌与摸牌",
    side: "you",
    text: "上限默认 5、硬顶 10。开始摸 D=⌈上限/2⌉：场上 D（晕可削），后场每人 D−1。三人分池；每回（配装∪光环/连携）×3，扣手里同名。弃牌常亮；收势仅手牌≤上限。置换费=牌费−1。",
  },
  {
    id: "turn",
    name: "回合三截",
    side: "both",
    text: "开始：摸牌、亮招（并手你先；后手空条）。中期：出牌。结束：兑他整条→裂创→场上回劲→敌回劲→霸体−1（有才播）。格挡不清。",
  },
];

const NUM_KEYS = [
  "cost",
  "damage",
  "block",
  "knock",
  "wall",
  "chargeBonus",
  "steps",
  "heal",
  "bleed",
  "thorns",
  "expose",
  "energyNext",
  "pace",
  "flow",
  "setupGain",
  "echo",
  "mark",
  "pullEnemy",
  "nearBonus",
  "farBonus",
] as const;

const NUM_LABEL: Record<(typeof NUM_KEYS)[number], string> = {
  cost: "劲力",
  damage: "伤害",
  block: "格挡",
  knock: "击退",
  wall: "撞壁",
  chargeBonus: "蓄劲",
  steps: "进步",
  heal: "回血",
  bleed: "裂创",
  thorns: "反震",
  expose: "破绽",
  energyNext: "下回劲力",
  pace: "先机",
  flow: "气脉",
  setupGain: "铺势",
  echo: "尾劲",
  mark: "点穴",
  pullEnemy: "拉近",
  nearBonus: "贴身加伤",
  farBonus: "隔步加伤",
};

/** 改字对比：列出数值变强处，供收获页展示。 */
export function upgradeBeats(from: CardId, to: CardId): string[] {
  const a = CARDS[from];
  const b = CARDS[to];
  const beats: string[] = [];
  if (a.name !== b.name) beats.push(`「${a.name}」→「${b.name}」`);
  for (const key of NUM_KEYS) {
    const av = a[key as keyof typeof a];
    const bv = b[key as keyof typeof b];
    if (typeof av !== "number" && typeof bv !== "number") continue;
    const left = typeof av === "number" ? av : 0;
    const right = typeof bv === "number" ? bv : 0;
    if (left === right) continue;
    const label = NUM_LABEL[key];
    if (key === "cost") {
      if (right < left) beats.push(`${label} ${left}→${right}（更省）`);
      else beats.push(`${label} ${left}→${right}`);
      continue;
    }
    if (right > left) beats.push(`${label} ${left}→${right}`);
    else if (right < left) beats.push(`${label} ${left}→${right}`);
  }
  if (a.text !== b.text && beats.length <= 1) {
    beats.push(b.text);
  }
  return beats;
}

export function upgradeCompareLine(from: CardId, to: CardId): string {
  const beats = upgradeBeats(from, to);
  if (!beats.length) return `由「${CARDS[from].name}」改来。`;
  return `比「${CARDS[from].name}」强：${beats.join(" · ")}`;
}

export function ownedWeaponIds(run: Run): Set<string> {
  const set = new Set<string>();
  for (const id of run.weapons ?? []) {
    const g = gearById(id);
    if (g) set.add(g.id);
    else set.add(id);
  }
  if (run.weapon) {
    const g = gearById(run.weapon);
    if (g) set.add(g.id);
  }
  return set;
}

export function bingjiRows(run: Run): { school: string; items: { gear: GearWeapon; owned: boolean }[] }[] {
  const owned = ownedWeaponIds(run);
  const schools = ["palm", "saber", "spear", "sword", "staff", "hook"] as const;
  return schools.map((school) => ({
    school: WEAPON_NAME[school],
    items: GEAR_WEAPONS.filter((g) => g.school === school).map((gear) => ({
      gear,
      owned: owned.has(gear.id),
    })),
  }));
}

export function shiluRows(run: Run): { id: TechniqueId; name: string; text: string; owned: boolean }[] {
  const owned = new Set(run.techniques);
  return (Object.keys(TECHNIQUES) as TechniqueId[]).map((id) => ({
    id,
    name: TECHNIQUES[id].name,
    text: TECHNIQUES[id].text,
    owned: owned.has(id),
  }));
}
