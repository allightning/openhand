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

/** 战斗里会出现的状态 / 意图，供明注查阅。 */
export const STATUS_ENTRIES: StatusEntry[] = [
  { id: "pace", name: "先机", side: "both", text: "出手快慢。你比他高则你先打；抢先加、滞步减。" },
  { id: "block", name: "格挡", side: "you", text: "这一息卸掉的伤害。收势清掉（铁布除外）。" },
  { id: "guard", name: "架势", side: "foe", text: "打在他身上先吃掉这些，相当于他的格挡。" },
  { id: "thorns", name: "反震", side: "you", text: "他打你时，你按这个数回敬。" },
  { id: "combo", name: "连势", side: "you", text: "下一掌更重，或让连环类招式接上。" },
  { id: "flow", name: "气脉", side: "you", text: "本场攻击各加这么多。最多叠到 3。" },
  { id: "setup", name: "铺势", side: "you", text: "收势掌按层数加伤，打完清掉。" },
  { id: "iron", name: "铁布", side: "you", text: "数回内，每回开局自带一截格挡。" },
  { id: "echo", name: "尾劲", side: "you", text: "下回第一掌额外加伤。" },
  { id: "qi", name: "纳息", side: "you", text: "下回多这么多劲力。" },
  { id: "bury", name: "埋招", side: "both", text: "挨打时按埋下的形式反击。形式有回刀、叠创、让步、回架。" },
  { id: "bleed", name: "裂创", side: "both", text: "每回收势按层数掉血。金创、烙口、缝创可治。" },
  { id: "seal", name: "封脉", side: "you", text: "下回少这么多劲力。通脉可解。" },
  { id: "slow", name: "滞步", side: "you", text: "先机减这么多。通脉可解。" },
  { id: "sway", name: "乱步", side: "you", text: "输出少 2，挨打多 3。进退同一息或换位时先机不够会乱。" },
  { id: "gift", name: "送手", side: "you", text: "下一记挨打多吃 4。贴上去却没出招。" },
  { id: "regen", name: "缝创", side: "you", text: "数回内每回回血，并慢慢压裂创。" },
  { id: "expose", name: "破绽", side: "foe", text: "你的攻击各多吃一层破绽。" },
  { id: "mark", name: "点穴", side: "foe", text: "你的攻击加印，开缝类招式能吃印。" },
  { id: "frail", name: "滞手", side: "foe", text: "他打你时少 3 点。每回减一层。" },
  { id: "intent-strike", name: "打击", side: "intent", text: "对你造成公示伤害。" },
  { id: "intent-charge", name: "冲锋", side: "intent", text: "沿石带冲近并出手。" },
  { id: "intent-stake", name: "落桩", side: "intent", text: "他在格上落下工事。" },
  { id: "intent-pull", name: "拉", side: "intent", text: "把你往他那边拖。" },
  { id: "intent-windup", name: "蓄势", side: "intent", text: "下下回才爆的大招预告。" },
  { id: "intent-guard", name: "架", side: "intent", text: "他先架起来。" },
  { id: "intent-bleed", name: "刀创", side: "intent", text: "打出伤害并叠裂创。" },
  { id: "intent-counter", name: "埋招（意图）", side: "intent", text: "他埋下反击，你打他会触发。" },
  { id: "intent-seal", name: "封脉（意图）", side: "intent", text: "他要封你的劲力。" },
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
