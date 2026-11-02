import {
  GROUP_BONDS,
  GRUDGE_BONDS,
  PAIR_BONDS,
  groupStage,
  stageOf,
  type BondStage,
} from "../../game/affinityBonds";
import { advanceProfession, cheatWager, fieldProfession, seeThrough } from "../../game/professions";
import type { Battle } from "../../game/types";
import { escapeHtml } from "../setupUi";

const BOND_NAME: Record<string, string> = {
  nightfrost: "夜霜",
  warm: "温补",
  gate: "门桩",
  silk: "丝饮",
  ruler: "双尺",
  year: "岁笙",
  splitblade: "裂刃",
  shore: "壁岸",
  saberhall: "刀社",
  palmspring: "掌春",
  swordloft: "剑阁",
  spearline: "枪行",
  stakegate: "桩门",
  hookline: "钩行",
};

const GRUDGE_NAME: Record<string, string> = {
  healerkill: "医杀",
  rival: "争锋",
};

const STAGE_LABEL: Record<BondStage, string> = {
  acquaint: "初识",
  road: "同路",
  life: "生死",
};

export type ProfAct = "advance" | "see" | "cheat";

type PoisonView = { text: string; source: "field" | "placeholder" };

export function profEnabled(b: Battle): Record<ProfAct, boolean> {
  const prof = fieldProfession(b);
  return {
    advance: prof === "staker" && !b.profAdvanced,
    see: prof === "diviner" && b.profAdvanced === true && !b.feintOpen,
    cheat: prof === "gambler" && b.profAdvanced === true && !b.wagerCheat,
  };
}

/** 点亮着的职业钮才调用已有主动技。 */
export function applyProfAct(b: Battle, act: ProfAct): string {
  if (!profEnabled(b)[act]) return "";
  if (act === "advance") return advanceProfession(b)[0] ?? "";
  if (act === "see") return seeThrough(b)[0] ?? "";
  return cheatWager(b)[0] ?? "";
}

function bondChip(id: string, stage: BondStage): string {
  const name = BOND_NAME[id] ?? id;
  return `<span class="lab-bond-chip" data-bond="${escapeHtml(id)}" data-bond-stage="${stage}">${escapeHtml(name)} · ${STAGE_LABEL[stage]}</span>`;
}

export function renderBondRow(b: Battle): string {
  const party = b.party ?? [];
  const chips: string[] = [];
  for (const bond of PAIR_BONDS) {
    if (!party.includes(bond.a) || !party.includes(bond.b)) continue;
    chips.push(bondChip(bond.id, stageOf(b.bondStages, bond.a, bond.b)));
  }
  for (const bond of GROUP_BONDS) {
    const present = bond.members.filter((id) => party.includes(id));
    if (present.length < 2) continue;
    chips.push(bondChip(bond.id, groupStage(b.bondStages, bond.id)));
  }
  const source = chips.length ? "field" : "placeholder";
  const body = chips.length ? chips.join("") : `<span class="lab-bond-chip" data-bond-source="placeholder" hidden>缘分</span>`;
  const grudges = GRUDGE_BONDS.filter((bond) => party.includes(bond.a) && party.includes(bond.b))
    .map((bond) => `<span class="lab-grudge-chip" data-grudge="${escapeHtml(bond.id)}">${escapeHtml(GRUDGE_NAME[bond.id] ?? bond.id)}</span>`)
    .join("");
  return `<div class="lab-bond-row" data-bond-source="${source}">${body}${grudges}</div>`;
}

function poisonView(b: Battle): PoisonView {
  const raw = b.foePoison;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return { text: `毒 ×${Math.max(0, Math.floor(raw))}`, source: "field" };
  }
  return { text: "毒 —", source: "placeholder" };
}

function profButton(id: string, act: ProfAct, label: string, on: boolean): string {
  return `<button type="button" class="fy-btn${on ? " is-on" : ""}" id="${id}" data-prof-act="${act}"${on ? "" : " disabled"}>${label}</button>`;
}

export function renderRoleHud(b: Battle): string {
  const on = profEnabled(b);
  const known = Boolean(b.professions?.[b.active]);
  const poison = poisonView(b);
  return `<div class="lab-role-hud" data-overlap-group="role-hud" data-prof-source="${known ? "field" : "placeholder"}">
    ${renderBondRow(b)}
    ${profButton("prof-advance", "advance", "桩师进阶", on.advance)}
    ${profButton("prof-see", "see", "相士看破", on.see)}
    ${profButton("prof-cheat", "cheat", "赌徒出千", on.cheat)}
    <span class="lab-poison-chip" data-poison-source="${poison.source}">${poison.text}</span>
    <button type="button" class="fy-btn" id="battle-weapon-swap" data-weapon-locked="battle" disabled>换装</button>
  </div>`;
}
