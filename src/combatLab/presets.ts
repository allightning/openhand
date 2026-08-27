import { STARTER_DECK, TECHNIQUES } from "../game/content";
import { SAPPER_DECK, SEER_DECK } from "../game/hero";
import { MATES } from "../game/party";
import type { CardId, HeroId, TechniqueId } from "../game/types";
import { starterGear } from "../game/weapons";
import { uniqueRecipe } from "./rules";
import type { LabPreset } from "./types";

function heroDeck(hero: HeroId): CardId[] {
  if (hero === "seer") return [...SEER_DECK];
  if (hero === "sapper") return [...SAPPER_DECK];
  return [...STARTER_DECK];
}

function basePreset(
  id: string,
  name: string,
  blurb: string,
  tags: string[],
  fieldMate: LabPreset["fieldMate"],
  enemyId: LabPreset["enemyId"],
  patch: Partial<LabPreset> = {},
): LabPreset {
  const weapon = starterGear(MATES[fieldMate].weapon);
  const deckRecipe = uniqueRecipe(patch.deckRecipe ?? patch.deck ?? heroDeck(fieldMate as HeroId));
  const party = (patch.party ?? [fieldMate]).slice(0, 4);
  return {
    id,
    name,
    blurb,
    tags,
    enemyId,
    fieldMate,
    party,
    deckRecipe,
    mateWeapons: { [fieldMate]: patch.mateWeapons?.[fieldMate] ?? weapon, ...patch.mateWeapons },
    mateTechs: patch.mateTechs ?? {},
    hp: patch.hp ?? 32,
    hpMax: patch.hpMax ?? 32,
    extraFoeIds: patch.extraFoeIds,
  };
}

export const BUILTIN_PRESETS: LabPreset[] = [
  basePreset("tutorial", "新手首战", "教程捕快，学读意图与推撞。", ["新手", "教学"], "rail", "catcher"),
  basePreset("elite-read", "单精英读招", "护镖头多意图，练算招换步。", ["精英", "读招"], "rail", "escort", {
    mateTechs: { rail: ["leftover"] },
    deckRecipe: uniqueRecipe([...STARTER_DECK, "expose", "sidestep", "brace", "follow"]),
  }),
  basePreset("boss-lord", "Boss·门主", "门主多段意图，测长战闭环。", ["Boss", "多阶段"], "rail", "lord", {
    hp: 36,
    hpMax: 36,
    mateTechs: { rail: ["nightStep", "leftover"] },
    deckRecipe: uniqueRecipe([...STARTER_DECK, "finisher", "setup", "combo", "ironform", "mend"]),
    mateWeapons: { rail: "palm-a-4" },
  }),
  basePreset("boss-usurper", "Boss·夺玺", "终局夺玺者，高压拆招。", ["Boss"], "seer", "usurper", {
    deckRecipe: uniqueRecipe([...SEER_DECK, "mirror", "layer", "rift", "marking"]),
    mateWeapons: { seer: "sword-b-4" },
    mateTechs: { seer: ["brightBlade", "ghostStep"] },
  }),
  basePreset("surrounded", "被包围·双影", "双影占台，练换位与距离。", ["空间", "多敌"], "sapper", "twin", {
    party: ["sapper", "porter"],
    deckRecipe: uniqueRecipe([...SAPPER_DECK, "plant", "sweep", "hookpull", "gather"]),
    mateWeapons: { sapper: "staff-a-3", porter: starterGear(MATES.porter.weapon) },
  }),
  basePreset("num-vs-read", "数值对算招", "纯砍刀组对阵卸力桩师，对照局。", ["对照"], "rail", "piler", {
    deckRecipe: uniqueRecipe(["cut", "drawcut", "charge", "advance", "defend", "mend"]),
    mateWeapons: { rail: "saber-a-3" },
  }),
  basePreset("combo-party", "连携合击", "轨刃+镜亭同行，换人与谱系。", ["连携", "同行"], "rail", "bandit", {
    party: ["rail", "seer"],
    mateWeapons: { rail: "palm-b-3", seer: starterGear("sword") },
    mateTechs: { rail: ["leftover"], seer: ["brightBlade"] },
    deckRecipe: uniqueRecipe([...STARTER_DECK, "twinpalm", "chain", "follow", "haste"]),
  }),
  basePreset("pace-duel", "先机对弈", "快刀对快剑，抢先机。", ["先机"], "seer", "delay", {
    deckRecipe: uniqueRecipe([...SEER_DECK, "haste", "haste2", "follow2"]),
    mateWeapons: { seer: "sword-b-4" },
    mateTechs: { seer: ["ghostStep"] },
  }),
  basePreset("block-shatter", "卸力对撞", "架盾桩师对你高架势，练裂盾。", ["卸力"], "sapper", "piler", {
    deckRecipe: uniqueRecipe([...SAPPER_DECK, "expose", "thorns", "ironform", "brace"]),
    mateWeapons: { sapper: "staff-b-3" },
    mateTechs: { sapper: ["keepGuard"] },
  }),
  basePreset("spar-tutor", "拆招教练", "教头练手，零惩罚。", ["教学", "拆招"], "rail", "tutorPace", {
    deckRecipe: uniqueRecipe([...STARTER_DECK, "sidestep", "backpalm", "push2", "defend2"]),
    mateTechs: { rail: Object.keys(TECHNIQUES).slice(0, 3) as TechniqueId[] },
  }),
  basePreset("break-practice", "拆招练习房", "轨刃对赵捕+沈镖，练时间轴与破招窗口。", ["教学", "破招", "v2"], "rail", "catcher", {
    party: ["rail", "hermit"],
    extraFoeIds: ["escort"],
    mateWeapons: { rail: "palm-a-3", hermit: "palm-b-2" },
    deckRecipe: uniqueRecipe([...STARTER_DECK, "sidestep", "advance", "expose", "defend2", "combo", "finisher"]),
    mateTechs: { rail: ["leftover"], hermit: ["keepGuard"] },
  }),
];

export function presetById(id: string): LabPreset | undefined {
  return BUILTIN_PRESETS.find((p) => p.id === id);
}
