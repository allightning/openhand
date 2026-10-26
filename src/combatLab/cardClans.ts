import type { CardId } from "../game/types";

export type CardClan =
  | "积势"
  | "聚势"
  | "爆发"
  | "空间"
  | "防御"
  | "印记"
  | "控制";

export const CARD_CLAN: Partial<Record<CardId, CardClan>> = {
  strike: "积势",
  defend: "防御",
  push: "空间",
  charge: "积势",
  advance: "空间",
  mend: "防御",
  setup: "聚势",
  gather: "聚势",
  finisher: "爆发",
  burySlash: "印记",
  sidestep: "空间",
  push2: "空间",
  backpalm: "空间",
  haste: "聚势",
  finisher2: "爆发",
  brace: "防御",
  ironform: "防御",
  expose: "印记",
  pierce: "积势",
  cut: "积势",
  drawcut: "积势",
  thrust: "积势",
  hookpull: "空间",
  plant: "空间",
  split: "空间",
  bleedcut: "印记",
  thorns: "防御",
  layer: "聚势",
  mirror: "控制",
  rift: "爆发",
  marking: "印记",
  close: "空间",
  sweep: "空间",
  hookDisarm: "控制",
  swordMute: "控制",
  staffBind: "控制",
  palmSeal: "控制",
  spearLock: "控制",
  saberBleed: "印记",
  skillLock: "控制",
  pouchSeal: "控制",
  handCut: "控制",
  qiLeech: "控制",
  venomFog: "控制",
  inbreath: "聚势",
  lateTide: "聚势",
  lateWard: "防御",
  lateBleed: "印记",
  drunkFist: "积势",
  jinwuToken: "控制",
  qiPulse: "聚势",
  suture: "防御",
  buryBleed: "印记",
  buryKnock: "空间",
  buryWard: "防御",
} as Partial<Record<CardId, CardClan>>;

export function cardClan(id: CardId): CardClan {
  return CARD_CLAN[id] ?? "积势";
}

export const CLAN_ORDER: CardClan[] = ["积势", "聚势", "爆发", "空间", "防御", "印记", "控制"];

export function clanCounts(recipe: CardId[]): Record<CardClan, number> {
  const out = Object.fromEntries(CLAN_ORDER.map((c) => [c, 0])) as Record<CardClan, number>;
  for (const id of recipe) {
    const c = cardClan(id);
    out[c] += 1;
  }
  return out;
}

export function renderClanBar(recipe: CardId[]): string {
  const counts = clanCounts(recipe);
  const total = Math.max(1, recipe.length);
  return CLAN_ORDER.map((c) => {
    const n = counts[c];
    const pct = Math.round((n / total) * 100);
    return `<span class="lab-clan-chip" title="${c} ${n}"><em>${c}</em><i style="width:${pct}%"></i><b>${n}</b></span>`;
  }).join("");
}
