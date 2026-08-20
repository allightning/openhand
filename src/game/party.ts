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
  "backpalm",
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
];

const STAFF_DECK: CardId[] = [
  "strike",
  "defend",
  "split",
  "sweep",
  "plant",
  "plant",
  "defend",
  "advance",
  "mend",
  "sweep",
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
];

export const MATES: Record<CompanionId, MateDef> = {
  rail: {
    id: "rail",
    name: "轨刃",
    title: "破门刀",
    weapon: "palm",
    hp: 28,
    deck: PALM_DECK,
  },
  seer: {
    id: "seer",
    name: "镜亭",
    title: "观气客",
    weapon: "sword",
    hp: 24,
    deck: SEER_DECK,
  },
  sapper: {
    id: "sapper",
    name: "工兵",
    title: "桩师",
    weapon: "staff",
    hp: 32,
    deck: SAPPER_DECK,
  },
  porter: {
    id: "porter",
    name: "杠七",
    title: "杠手",
    weapon: "staff",
    hp: 26,
    deck: STAFF_DECK,
    talker: "porter",
  },
  boat: {
    id: "boat",
    name: "阿渡",
    title: "水上剑",
    weapon: "sword",
    hp: 24,
    deck: SWORD_DECK,
    talker: "boat",
  },
  watch: {
    id: "watch",
    name: "更三",
    title: "夜刀",
    weapon: "saber",
    hp: 26,
    deck: SABER_DECK,
    talker: "watch",
  },
  pilgrim: {
    id: "pilgrim",
    name: "香九",
    title: "锡杖",
    weapon: "spear",
    hp: 24,
    deck: SPEAR_DECK,
    talker: "pilgrim",
  },
  hooker: {
    id: "hooker",
    name: "缆石",
    title: "岸钩",
    weapon: "hook",
    hp: 25,
    deck: HOOK_DECK,
    talker: "roper",
  },
  hermit: {
    id: "hermit",
    name: "井叟",
    title: "井底掌",
    weapon: "palm",
    hp: 25,
    deck: HERMIT_DECK,
    talker: "hermit",
  },
};

export const JOIN_FLAG: Record<string, CompanionId> = {
  joinPorter: "porter",
  joinBoat: "boat",
  joinWatch: "watch",
  joinPilgrim: "pilgrim",
  joinRoper: "hooker",
  joinHermit: "hermit",
};

export function cardSchool(id: CardId): WeaponId | "any" {
  const key = id.replace(/2$/, "");
  if (key === "strike" || key === "push" || key === "backpalm" || key === "elbow" || key === "finisher" || key === "layer" || key === "weave") return "palm";
  if (key === "cut" || key === "drawcut" || key === "rift") return "saber";
  if (key === "thrust") return "spear";
  if (key === "pierce" || key === "expose" || key === "marking") return "sword";
  if (key === "split" || key === "plant" || key === "bleedcut" || key === "thorns" || key === "ironform") return "staff";
  if (key === "hookpull") return "hook";
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

export function addCompanion(run: Run, id: CompanionId): Run {
  if (run.party.includes(id)) return run;
  const def = MATES[id];
  return teachScrolls({
    ...run,
    party: [...run.party, id],
    companionHp: { ...run.companionHp, [id]: def.hp },
  });
}

export function grantChapterTwo(run: Run): Run {
  if (!run.party.includes("boat")) return addCompanion(run, "boat");
  if (!run.party.includes("watch")) return addCompanion(run, "watch");
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
  return Math.max(1, Math.round(max * 0.1));
}

export function noteFall(falls: number): { over: boolean; said: string; thought: string } {
  if (falls >= FALL_LIMIT) {
    return { over: true, said: "三次都倒了。这一趟帖作废。", thought: "要重新递。" };
  }
  const left = FALL_LIMIT - falls;
  if (left === 2) {
    return {
      over: false,
      said: "倒了。只剩一成血。还能起两回。",
      thought: "第三回就要重新递帖。",
    };
  }
  return {
    over: false,
    said: "倒了。只剩一成血。还能起一回。",
    thought: "再倒一次，这一趟就完了。",
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
