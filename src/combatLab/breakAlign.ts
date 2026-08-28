import type { TechniqueId, LabItemId } from "../game/types";
import type { MindArtId } from "../game/mindArts";
import { TECHNIQUES } from "../game/content";
import { MIND_ARTS } from "../game/mindArts";
import { LAB_ITEM_LABEL, LAB_ITEM_TIP } from "../game/labV21Constants";
import { isBreakAlign } from "./labRuleset";

/** Break-mode technique display overrides (name optional). */
export const TECH_TEXT_BREAK: Partial<Record<TechniqueId, { name?: string; text: string }>> = {
  longPush: { text: "硬拆「来锋」后击退再多 1（无硬拆则无）。" },
  backstep: { text: "每回合首次打位移牌额外 +1 位移充能。" },
  keepGuard: { text: "本回合有硬拆时，收势留 4 挡。" },
  hardWall: { text: "硬拆后若造成击退撞壁，撞壁伤至少 12。" },
  bodyCheck: { text: "打位移牌贴脸时造成 4 伤。" },
  shortCharge: { text: "对「冲锋」意图：硬拆条件放宽一档。" },
  ghostStep: { text: "打位移牌不消耗「桩」阻挡。" },
  trapWard: { text: "下机硬拆不耗充能（或视为打空）。" },
  delayGuard: { text: "敌有「养势」段时，开局 +3 挡且该段硬拆反打 +1。" },
  throne: { text: "在边格时，对「封你」母题硬拆反打 +2。" },
  nightStep: { text: "开战 +1 位移充能。" },
  leftover: { text: "本回合硬拆 ≥1 时，收势留 1 劲。" },
  stackHand: { text: "手牌上限 +1（壳型，中后期）。" },
  ironPalm: { text: "硬拆后击退撞壁 +6。" },
  softPalm: { text: "格挡牌 +2，且「连打」软拆门槛 −2。" },
  piercingPalm: { text: "硬拆「来锋」时击退 +1。" },
  brightBlade: { text: "硬拆后本回合贴身攻 +3。" },
  closeCut: { text: "抽刀按相邻结算（贴身拆工具）。" },
  saberGrudge: { text: "挨打后下一硬拆反打 +2。" },
  spearWind: { text: "相隔 ≥3 时，对「抢步」硬拆反打 +2。" },
  longMarch: { text: "进步类牌额外 +1 位移充能。" },
  pikeBrace: { text: "敌「蓄势」段：你 +2 挡且硬拆该段时势 +1。" },
  swordRain: { text: "硬拆后给敌 1 裂创；裂创≥3 时攻 +2。" },
  swordScreen: { text: "不贴身时「卸力」硬拆不耗反架充能（每回 1 次）。" },
  flowSword: { text: "本回合有硬拆时，收势多留 1 劲。" },
  heelStake: { text: "开场落桩（拆冲锋工具）。" },
  rebound: { text: "挨打反震 3；软拆（让）时也反震 2。" },
  stakeArmor: { text: "有桩时硬拆「冲锋/落桩」反打 +2。" },
  heavyStaff: { text: "硬拆后击退 +1。" },
  tether: { text: "过远拉近（贴身拆工具）。" },
  barbedHook: { text: "拉近成功时 +1 位移充能。" },
  hookVeil: { text: "敌「埋招」段：你本回合不出攻则硬拆，且挡 +3。" },
};

export const MIND_TEXT_BREAK: Partial<Record<MindArtId, { name?: string; text: string }>> = {
  ironBreath: { text: "气血上限 +10。续命护身，多拆一拍。" },
  springQi: { text: "每回合收势回血 +4。续命护身，多拆一拍。" },
  calmSea: { text: "劲力上限 +1，每回合多回劲 +1。硬拆时回 1 劲（文案核化）。" },
  steadyRoot: { text: "气血上限 +6，每回合回血 +2。边格硬拆更稳。" },
  palmMeridian: { text: "拳掌系：气血 +8，收势回血 +2。硬拆来锋后更易推开。" },
  saberEdge: { text: "刀系：劲力上限 +1，每回合多回劲 +1。破眼后攻势更狠。" },
  swordMirror: { text: "剑系：气血 +6，劲力上限 +1。反架充能更顺。" },
  spearStride: { text: "枪系：气血 +8，回血。位移充能开局更足。" },
  staffRoot: { text: "棍系：气血 +12。开局定桩，拆冲锋更稳。" },
  hookTide: { text: "钩系：劲与回血。拉近即得位移充能。" },
};

export const PASSIVE_BREAK: Partial<Record<string, string>> = {
  rail: "硬拆成功时挡 +1。",
  seer: "本回合硬拆≥1 且劲尽，下回 +1 劲。",
  sapper: "软拆（让）时反震 +2。",
  watch: "手牌有位移牌时上限 +1。",
  guard: "开局 +1 位移充能，挡 +1。",
  hooker: "拉近后下一硬拆反打 +3。",
  hermit: "有桩时硬拆冲锋反打 +1。",
  boat: "不贴身时来锋硬拆反打 +1。",
};

export const ITEM_TIP_BREAK: Partial<Record<LabItemId, string>> = {
  jinchuang: "回血，续命多拆一拍。",
  xiujian: "破招针：下一硬拆反打 +4。",
  huiqi: "即时回劲，为拆蓄势。",
  lianhuan: "本回合每段硬拆额外 +1 势。",
  pojin: "本回合下一段硬拆不耗充能。",
};

export function techniqueTip(id: TechniqueId): string {
  const def = TECHNIQUES[id];
  if (isBreakAlign()) {
    const o = TECH_TEXT_BREAK[id];
    if (o) return `${o.name ?? def.name}：${o.text}`;
  }
  return `${def.name}：${def.text}`;
}

export function mindTip(id: MindArtId): string {
  const def = MIND_ARTS[id];
  if (isBreakAlign()) {
    const o = MIND_TEXT_BREAK[id];
    if (o) return `${o.name ?? def.name}：${o.text}`;
  }
  return `${def.name}：${def.text}`;
}

export function itemTip(id: LabItemId): string {
  if (isBreakAlign() && ITEM_TIP_BREAK[id]) return ITEM_TIP_BREAK[id]!;
  return LAB_ITEM_TIP[id] ?? LAB_ITEM_LABEL[id] ?? id;
}

/** Break-mode reward kind weights (tech-heavy). */
export const BREAK_REWARD_WEIGHTS = { tech: 30, mind: 15, item: 12, aid: 15 } as const;
