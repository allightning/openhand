import { shellRunContext } from "./shellContext";
import { CARDS, TECHNIQUES } from "../game/content";
import { cardWikiBody, godSkillText, pathSkillText } from "../game/cardTextV2";
import { MIND_ARTS } from "../game/mindArts";
import { WEAPON_NAME, schoolLabel } from "../game/party";
import { SCHOOL_ULTIMATE } from "../game/rogueCards";
import type { CardId } from "../game/types";
import { GEAR_WEAPONS, GOD_SKILL, PATH_SKILL, TIER_NAME, gearById } from "../game/weapons";
import { ALL_CARD_IDS, ALL_TECHNIQUE_IDS } from "./arsenal";

export type CodexKind = "ult" | "skill" | "gear";

export interface CodexRelated {
  id: string;
  name: string;
}

export interface CodexEntry {
  kind: CodexKind;
  id: string;
  name: string;
  kicker: string;
  text: string;
  flavor?: string;
  related: CodexRelated[];
}

const ULT_SET = new Set<string>([
  ...Object.values(SCHOOL_ULTIMATE),
  "finisher",
  "finisher2",
]);

function isFusionId(id: string): boolean {
  return id.startsWith("fuse");
}

function isUltCard(id: CardId): boolean {
  return ULT_SET.has(id) || id.startsWith("ult") || isFusionId(id);
}

function cardRelated(id: CardId): CodexRelated[] {
  const c = CARDS[id];
  if (!c) return [];
  if (c.school && c.school !== "any") {
    return ALL_CARD_IDS.filter((oid) => oid !== id && CARDS[oid]?.school === c.school)
      .slice(0, 8)
      .map((oid) => ({ id: oid, name: CARDS[oid]!.name }));
  }
  return [];
}

function weaponRelated(weaponId: string): CodexRelated[] {
  const g = gearById(weaponId, shellRunContext());
  if (!g) return [];
  return ALL_CARD_IDS.filter((id) => CARDS[id]?.school === g.school)
    .slice(0, 10)
    .map((id) => ({ id, name: CARDS[id]!.name }));
}

export function catalogUlt(): CodexEntry[] {
  return ALL_CARD_IDS.filter((id) => isUltCard(id)).map((id) => {
    const c = CARDS[id]!;
    return {
      kind: "ult" as const,
      id,
      name: c.name,
      kicker: `绝 · ${schoolLabel(id)} · ${c.cost}劲`,
      text: cardWikiBody(c),
      flavor: c.flavor,
      related: cardRelated(id),
    };
  });
}

export function catalogSkill(): CodexEntry[] {
  const cards: CodexEntry[] = ALL_CARD_IDS.filter((id) => !isUltCard(id)).map((id) => {
    const c = CARDS[id]!;
    return {
      kind: "skill" as const,
      id,
      name: c.name,
      kicker: `${c.type === "attack" ? "攻" : "技"} · ${schoolLabel(id)} · ${c.cost}劲`,
      text: cardWikiBody(c),
      flavor: c.flavor,
      related: cardRelated(id),
    };
  });
  const techs: CodexEntry[] = ALL_TECHNIQUE_IDS.map((id) => {
    const t = TECHNIQUES[id];
    const feed =
      id === "leftover"
        ? "投喂：携带量=档位（1/2/3 点过回合）。"
        : "投喂升档：1 档原值，2 档约 ×1.15，3 档约 ×1.30。";
    return {
      kind: "skill" as const,
      id,
      name: t.name,
      kicker: t.school ? `外功 · ${WEAPON_NAME[t.school]}` : "外功 · 通用",
      text: `${t.text}\n${feed}`,
      flavor: t.flavor,
      related: [],
    };
  });
  const minds: CodexEntry[] = Object.values(MIND_ARTS).map((m) => {
    const nums = [
      m.hpMax ? `气血上限 +${m.hpMax}` : "",
      m.energyMax ? `劲力上限 +${m.energyMax}` : "",
      m.turnHeal ? `收势回血 +${m.turnHeal}` : "",
      m.turnEnergy ? `每回多回劲 +${m.turnEnergy}` : "",
    ].filter(Boolean);
    return {
      kind: "skill" as const,
      id: m.id,
      name: m.name,
      kicker: m.school ? `心法 · ${WEAPON_NAME[m.school]}` : "心法 · 通用",
      text: nums.length ? `${m.text}\n数值：${nums.join(" · ")}` : m.text,
      related: [],
    };
  });
  return [...cards, ...techs, ...minds];
}

export function catalogGear(): CodexEntry[] {
  return GEAR_WEAPONS.map((g) => {
    const pathKey = `${g.school}-${g.path}`;
    const path = PATH_SKILL[pathKey] ? pathSkillText(pathKey) : "";
    const god = g.godSkill && GOD_SKILL[pathKey] ? godSkillText(pathKey) : g.godSkill ?? "";
    const bits = [`伤+${g.damage}`, `推+${g.knock}`, `架+${g.ward}`];
    const hit =
      g.grade < 5
        ? ""
        : {
            "palm-a": "命中：击退 1。",
            "palm-b": "命中：势≥2 且本回第 3 击起，伤 +4。",
            "saber-a": "命中：贴身且本回第 3 击起，伤害翻倍。",
            "saber-b": "命中：先机领先则抽 1、回 1 劲。",
            "spear-a": "命中：敌禁技 1 息。",
            "spear-b": "命中：破绽≥3 则敌手牌税 1 息。",
            "sword-a": "命中：下一张技能 0 费。",
            "sword-b": "命中：你有格挡则回 2 劲。",
            "staff-a": "命中：格挡 +2。",
            "staff-b": "命中：场上敌人多于 1 人则伤 +3。",
            "hook-a": "命中：回 2 劲。",
            "hook-b": "命中：敌缴械中则抽牌。",
          }[pathKey] ?? "命中：伤 +2。";
    return {
      kind: "gear" as const,
      id: g.id,
      name: g.name,
      kicker: `${WEAPON_NAME[g.school]} · ${g.path === "a" ? "甲" : "乙"} · ${TIER_NAME[g.tier]}${g.grade}成`,
      text: [g.tip, `数值：${bits.join(" · ")}`, path && `兵路：${path}`, god && `神技：${god}`, hit].filter(Boolean).join("\n"),
      related: weaponRelated(g.id),
    };
  });
}

export function catalogByKind(kind: CodexKind): CodexEntry[] {
  if (kind === "ult") return catalogUlt();
  if (kind === "skill") return catalogSkill();
  return catalogGear();
}

export function searchCatalog(kind: CodexKind, query: string): CodexEntry[] {
  const q = query.trim().toLowerCase();
  const all = catalogByKind(kind);
  if (!q) return all;
  const tokens = q.split(/\s+/).filter(Boolean);
  return all.filter((e) => {
    const hay = `${e.id} ${e.name} ${e.kicker} ${e.text} ${e.flavor ?? ""}`.toLowerCase();
    return tokens.every((t) => hay.includes(t));
  });
}
