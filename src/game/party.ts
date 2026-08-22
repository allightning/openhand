import { STARTER_DECK } from "./content";
import { SAPPER_DECK, SEER_DECK } from "./hero";
import type { CardId, CompanionId, Run, WeaponId } from "./types";

export const WEAPON_NAME: Record<WeaponId, string> = {
  palm: "拳掌",
  saber: "刀",
  spear: "枪",
  sword: "剑",
  staff: "棍",
  hook: "钩",
};

export const WEAPON_PACE: Record<WeaponId, number> = {
  sword: 8,
  saber: 7,
  hook: 6,
  palm: 5,
  staff: 4,
  spear: 3,
};

export const WEAPON_VERB: Record<WeaponId, string> = {
  palm: "伤轻、推远、撞壁认人。先机中。",
  saber: "贴身才狠，远了只是刀风。先机快。",
  spear: "隔步才戳得着，贴身使不开。先机慢。",
  sword: "一刺一带，不求砸死。先机最快。",
  staff: "先占步，再打人。先机稳。",
  hook: "不推，拉近了再算。先机活。",
};

export interface MateDef {
  id: CompanionId;
  name: string;
  title: string;
  weapon: WeaponId;
  hp: number;
  deck: CardId[];
  talker?: string;
  /** 同行页短评。 */
  bio?: string;
}

const PALM_DECK: CardId[] = [...STARTER_DECK];

const SABER_DECK: CardId[] = [
  "cut",
  "cut",
  "drawcut",
  "defend",
  "defend",
  "advance",
  "charge",
  "cut",
  "mend",
  "sidestep",
];

const SPEAR_DECK: CardId[] = [
  "thrust",
  "thrust",
  "thrust",
  "defend",
  "advance",
  "advance",
  "sweep",
  "mend",
  "haste",
  "thrust",
];

const SWORD_DECK: CardId[] = [
  "pierce",
  "pierce",
  "pierce",
  "defend",
  "advance",
  "charge",
  "mend",
  "pierce",
  "defend",
  "advance",
  "cauterize",
];

const STAFF_DECK: CardId[] = [
  "split",
  "defend",
  "split",
  "sweep",
  "plant",
  "plant",
  "defend",
  "advance",
  "mend",
  "sweep",
  "sidestep",
];

const HOOK_DECK: CardId[] = [
  "hookpull",
  "hookpull",
  "defend",
  "advance",
  "charge",
  "hookpull",
  "mend",
  "defend",
  "sweep",
  "hookpull",
  "sidestep",
];

const HERMIT_DECK: CardId[] = [
  "elbow",
  "strike",
  "defend",
  "backpalm",
  "mend",
  "advance",
  "elbow",
  "defend",
  "strike",
  "mend",
  "suture",
];

export const MATES: Record<CompanionId, MateDef> = {
  rail: {
    id: "rail",
    name: "轨刃",
    title: "破门刀",
    weapon: "palm",
    hp: 28,
    deck: PALM_DECK,
    bio: "门要正。踹歪了，自己也站不稳。",
  },
  seer: {
    id: "seer",
    name: "镜亭",
    title: "观气客",
    weapon: "sword",
    hp: 24,
    deck: SEER_DECK,
    bio: "气先于刀。案上的墨，比街上的血更早脏。",
  },
  sapper: {
    id: "sapper",
    name: "沈夯",
    title: "桩师",
    weapon: "staff",
    hp: 32,
    deck: SAPPER_DECK,
    bio: "桩不松，人就还认得这一方地。",
  },
  porter: {
    id: "porter",
    name: "韩铁",
    title: "码头扛手",
    weapon: "staff",
    hp: 26,
    deck: STAFF_DECK,
    talker: "porter",
    bio: "肩上压过货，心里压过话。码头认的是稳。",
  },
  boat: {
    id: "boat",
    name: "苏渡烟",
    title: "船娘",
    weapon: "sword",
    hp: 24,
    deck: SWORD_DECK,
    talker: "boat",
    bio: "水步比岸步滑。她先看潮，再看人。",
  },
  watch: {
    id: "watch",
    name: "沈夜行",
    title: "夜巡刀",
    weapon: "saber",
    hp: 26,
    deck: SABER_DECK,
    talker: "watch",
    bio: "夜里刀短，袖里却长。巡的是缝，不是灯。",
  },
  pilgrim: {
    id: "pilgrim",
    name: "玄香",
    title: "锡杖客",
    weapon: "spear",
    hp: 24,
    deck: SPEAR_DECK,
    talker: "pilgrim",
    bio: "锡响一声，息也跟着落。不抢先，也不让步。",
  },
  hooker: {
    id: "hooker",
    name: "石岸",
    title: "岸缆手",
    weapon: "hook",
    hp: 25,
    deck: HOOK_DECK,
    talker: "roper",
    bio: "缆要收，人要近。岸上的手比船上的嘴实。",
  },
  hermit: {
    id: "hermit",
    name: "井清源",
    title: "井底掌",
    weapon: "palm",
    hp: 25,
    deck: HERMIT_DECK,
    talker: "hermit",
    bio: "井下潮冷。掌从根上来，不从话里来。",
  },
  salter: {
    id: "salter",
    name: "颜牙",
    title: "秤上刀",
    weapon: "saber",
    hp: 25,
    deck: SABER_DECK,
    talker: "saltBroker",
    bio: "盐秤认两，刀口认人。先机领先才肯多一寸。",
  },
  scribe: {
    id: "scribe",
    name: "朱文渊",
    title: "案头剑",
    weapon: "sword",
    hp: 22,
    deck: SWORD_DECK,
    talker: "caseclerk",
    bio: "破绽写在卷上。剑比笔尖细，也比笔尖狠。",
  },
  bard: {
    id: "bard",
    name: "柳青云",
    title: "舌上剑",
    weapon: "palm",
    hp: 23,
    deck: PALM_DECK,
    talker: "storyman",
    bio: "话说一半，掌留一半。茶楼里的刃，藏在句读里。",
  },
  blade: {
    id: "blade",
    name: "江晚涛",
    title: "航边客",
    weapon: "saber",
    hp: 27,
    deck: SABER_DECK,
    talker: "riverBlade",
    bio: "朱雀航下的门，他踹过正，也踹过歪。",
  },
  weaver: {
    id: "weaver",
    name: "苏素心",
    title: "绣钩",
    weapon: "hook",
    hp: 24,
    deck: HOOK_DECK,
    talker: "silkWife",
    bio: "经纬在掌。钩不抢路，只把线头收回来。",
  },
  guard: {
    id: "guard",
    name: "西门远山",
    title: "关城卒",
    weapon: "spear",
    hp: 28,
    deck: SPEAR_DECK,
    talker: "westGuard",
    bio: "门岗先架后戳。先机慢半息，格挡厚两寸。",
  },
};

export const JOIN_FLAG: Record<string, CompanionId> = {
  joinPorter: "porter",
  joinBoat: "boat",
  joinWatch: "watch",
  joinPilgrim: "pilgrim",
  joinRoper: "hooker",
  joinHermit: "hermit",
  joinSalter: "salter",
  joinScribe: "scribe",
  joinBard: "bard",
  joinBlade: "blade",
  joinWeaver: "weaver",
  joinGuard: "guard",
};

/** 三职伙伴出场序：前段完全错开，后期才交错。 */
export const MATE_OFFER: Record<"rail" | "seer" | "sapper", CompanionId[]> = {
  rail: ["porter", "boat", "watch", "pilgrim", "hooker", "hermit", "salter", "blade", "weaver", "guard", "scribe", "bard"],
  seer: ["scribe", "weaver", "bard", "guard", "salter", "blade", "porter", "boat", "watch", "pilgrim", "hooker", "hermit"],
  sapper: ["hooker", "hermit", "guard", "blade", "porter", "salter", "weaver", "scribe", "bard", "boat", "watch", "pilgrim"],
};

/** 只有轮到本职序的下一位（或已过序）才可入队。 */
export function mateJoinReady(run: Run, mate: CompanionId): boolean {
  if (run.party.includes(mate)) return false;
  const hero = (run.hero ?? "rail") as "rail" | "seer" | "sapper";
  const order = MATE_OFFER[hero];
  const idx = order.indexOf(mate);
  if (idx < 0) return true;
  for (let i = 0; i < idx; i++) {
    if (!run.party.includes(order[i])) return false;
  }
  return true;
}

export interface MatePassive {
  name: string;
  text: string;
}

export const MATE_PASSIVE: Partial<Record<CompanionId, MatePassive>> = {
  rail: { name: "门劲", text: "推撞成功，格挡 +1。" },
  seer: { name: "余墨", text: "收势时若劲力用尽，下回额外回劲 +1。" },
  sapper: { name: "桩皮", text: "有格挡时，挨打多 1 点反震。" },
  porter: { name: "稳肩", text: "上场每回开局格挡 +1。" },
  boat: { name: "水步", text: "不贴身时，每回开局格挡 +1。" },
  watch: { name: "夜袖", text: "上场手牌上限 +1。" },
  pilgrim: { name: "锡息", text: "这一息没出攻击，收势回 1 血。" },
  hooker: { name: "缆手", text: "拉近后，下一掌 +2。" },
  hermit: { name: "井根", text: "场上有桩，每回开局格挡 +1。" },
  salter: { name: "秤口", text: "先机领先时，攻击 +1。" },
  scribe: { name: "案锋", text: "破绽≥2 时抽牌上限视作多 1（开局）。" },
  bard: { name: "舌刃", text: "每回开局若手牌有技能，格挡 +1。" },
  blade: { name: "航刃", text: "贴身攻击 +1。" },
  weaver: { name: "经纬", text: "铺势≥1 时格挡牌额外 +1。" },
  guard: { name: "门岗", text: "开局格挡 +2，先机 -1。" },
};

export function cardSchool(id: CardId): WeaponId | "any" {
  const key = id.replace(/2$/, "");
  if (
    key === "strike" ||
    key === "push" ||
    key === "backpalm" ||
    key === "elbow" ||
    key === "finisher" ||
    key === "layer" ||
    key === "weave" ||
    key === "bindwound" ||
    key === "palmSeal"
  )
    return "palm";
  if (key === "cut" || key === "drawcut" || key === "rift" || key === "saberBleed") return "saber";
  if (key === "thrust" || key === "spearLock") return "spear";
  if (key === "pierce" || key === "expose" || key === "marking" || key === "swordMute") return "sword";
  if (key === "split" || key === "plant" || key === "bleedcut" || key === "thorns" || key === "ironform" || key === "staffBind")
    return "staff";
  if (key === "hookpull" || key === "hookDisarm") return "hook";
  return "any";
}

export function schoolLabel(id: CardId): string {
  const school = cardSchool(id);
  return school === "any" ? "通用" : WEAPON_NAME[school];
}

export function wielderOf(run: Run, school: WeaponId | "any"): CompanionId | null {
  if (school === "any") return run.active;
  return run.party.find((id) => MATES[id].weapon === school) ?? null;
}

export function isLead(run: Run, id: CompanionId): boolean {
  return id === (run.hero ?? "rail");
}

export function teachCard(run: Run, who: CompanionId, id: CardId): Run {
  if (isLead(run, who)) return { ...run, deck: [...run.deck, id] };
  const have = run.mateDecks[who] ?? [];
  return { ...run, mateDecks: { ...run.mateDecks, [who]: [...have, id] } };
}

export function stashOrTeach(run: Run, id: CardId): Run {
  const school = cardSchool(id);
  const who = wielderOf(run, school);
  if (school === "any") return teachCard(run, run.hero ?? "rail", id);
  if (who) return teachCard(run, who, id);
  return { ...run, scrolls: [...run.scrolls, id] };
}

export function teachScrolls(run: Run): Run {
  let next = { ...run, scrolls: [] as CardId[], mateDecks: { ...run.mateDecks }, deck: [...run.deck] };
  for (const id of run.scrolls) {
    const school = cardSchool(id);
    const who = wielderOf(next, school);
    if (school === "any") next = { ...next, deck: [...next.deck, id] };
    else if (who) next = teachCard(next, who, id);
    else next = { ...next, scrolls: [...next.scrolls, id] };
  }
  return next;
}

export const PARTY_CAP = 7;

export function addCompanion(run: Run, id: CompanionId): Run {
  if (run.party.includes(id)) return run;
  if (run.party.length >= PARTY_CAP) {
    return {
      ...run,
      flags: run.flags.includes("partyFullHint") ? run.flags : [...run.flags, "partyFullHint"],
    };
  }
  const def = MATES[id];
  return teachScrolls({
    ...run,
    party: [...run.party, id],
    companionHp: { ...run.companionHp, [id]: def.hp },
  });
}

export function dismissCompanion(run: Run, id: CompanionId): Run {
  if (isLead(run, id)) return run;
  if (!run.party.includes(id)) return run;
  const party = run.party.filter((p) => p !== id);
  const companionHp = { ...run.companionHp };
  delete companionHp[id];
  const active = run.active === id ? (party[0] ?? run.active) : run.active;
  return { ...run, party, companionHp, active };
}

export function grantChapterTwo(run: Run): Run {
  const hero = (run.hero ?? "rail") as keyof typeof MATE_OFFER;
  for (const id of MATE_OFFER[hero]) {
    if (!run.party.includes(id)) return addCompanion(run, id);
  }
  return run;
}

export function restHeal(scene: string): number {
  if (scene === "tea") return 10;
  if (scene === "shrine") return 8;
  if (scene === "yard") return 6;
  return 5;
}

export const FALL_LIMIT = 3;

export function reviveHp(max: number): number {
  // Kept for tests; combat now restores full HP after a life is spent.
  return max;
}

export function noteFall(livesLeft: number, livesMax = 3): { over: boolean; said: string; thought: string } {
  if (livesLeft <= 0) {
    return { over: true, said: "命数尽了。这趟算完了。", thought: "要重新走。港上的口，也不会再认这一回。" };
  }
  const spent = Math.max(0, livesMax - livesLeft);
  if (spent <= 1) {
    return {
      over: false,
      said: `倒了。命数还剩 ${livesLeft}。下场仍是满状态。`,
      thought: "港上的人看见了。有些话，会变得短。",
    };
  }
  return {
    over: false,
    said: `倒了。命数还剩 ${livesLeft}。再倒就危险了。`,
    thought: "再倒一次，井树石那些口子，港上就不认了。",
  };
}

export function healRun(run: Run, amount: number): Run {
  const companionHp = { ...run.companionHp };
  for (const id of run.party) {
    const cap = isLead(run, id) ? run.hpMax : MATES[id].hp;
    const cur = companionHp[id] ?? cap;
    companionHp[id] = Math.min(cap, cur + amount);
  }
  return { ...run, hp: companionHp[run.active] ?? run.hp, companionHp };
}

export function syncActiveHp(run: Run, hp: number): Run {
  return { ...run, hp, companionHp: { ...run.companionHp, [run.active]: hp } };
}

export function deckFor(run: Run, id: CompanionId): CardId[] {
  const extra = run.mateDecks[id] ?? [];
  if (isLead(run, id)) return [...run.deck, ...extra];
  return [...MATES[id].deck, ...extra];
}
