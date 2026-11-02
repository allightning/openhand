import { shellRunContext } from "./shellContext";
import { CARDS, TECHNIQUES } from "../game/content";
import { CARD_REGISTRY, type CardDef as ContentCardDef } from "../game/content/cards";
import { CHARM_REGISTRY } from "../game/content/charms";
import { ITEM_REGISTRY } from "../game/content/items";
import { MIND_REGISTRY } from "../game/content/mindArts";
import { TECHNIQUE_REGISTRY } from "../game/content/techniques";
import { cardDisplayText, godSkillText, pathSkillText } from "../game/cardTextV2";
import { LAB_ITEM_LABEL } from "../game/labV21Constants";
import { MIND_ARTS } from "../game/mindArts";
import { WEAPON_NAME, schoolLabel } from "../game/party";
import { SCHOOL_ULTIMATE } from "../game/rogueCards";
import type { CardId } from "../game/types";
import { CLIMB_BLEED_CAP, CLIMB_BLOCK_CAP, CLIMB_COMBO_CAP, CLIMB_EXPOSE_CAP } from "../game/climbCaps";
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
  /** 凡 / 精 / 绝 / 连携。样式归 UI。 */
  rarityLabel?: string;
  /** 注册表直出。排版不读这四项。 */
  cost?: number;
  school?: string;
  damage?: number;
  cap?: number;
  related: CodexRelated[];
}

const RARITY_LABEL = { common: "凡", adept: "精", supreme: "绝" } as const;

function cardRarityLabel(id: string): string | undefined {
  if (id.startsWith("fuse")) return "连携";
  const rarity = CARD_REGISTRY[id]?.rarity;
  return rarity ? RARITY_LABEL[rarity] : undefined;
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

function registryStatLine(row: ContentCardDef): string {
  const bits = [`劲 ${row.cost}`];
  const v = row.values;
  if (row.kind === "attack") bits.push("攻击");
  if (row.kind === "skill") bits.push("技能");
  if (row.kind === "stance") bits.push("架势");
  if (v.damage) bits.push(`牌面伤 ${v.damage}`);
  if (v.block) bits.push(`格挡 ${v.block}`);
  if (v.heal) bits.push(`回血 ${v.heal}`);
  if (v.knock) bits.push(`击退 ${v.knock}`);
  if (v.wall) bits.push(`撞壁 ${v.wall}`);
  if (v.steps) bits.push(`位移 ${v.steps}`);
  if (v.pullEnemy) bits.push(`拉近 ${v.pullEnemy}`);
  if (v.bleed) bits.push(`裂创 ${v.bleed}`);
  if (v.expose) bits.push(`破绽 ${v.expose}`);
  if (v.thorns) bits.push(`反震 ${v.thorns}`);
  if (v.pace) bits.push(`先机 ${v.pace > 0 ? "+" : ""}${v.pace}`);
  if (v.energyNext) bits.push(`下回劲 ${v.energyNext}`);
  if (v.chargeBonus) bits.push(`蓄劲 ${v.chargeBonus}`);
  if (v.nearBonus) bits.push(`贴身+${v.nearBonus}`);
  if (v.farBonus) bits.push(`隔步+${v.farBonus}`);
  if (v.foeStun) bits.push(`眩晕 ${v.foeStun}`);
  if (v.foeDisarm) bits.push(`缴械 ${v.foeDisarm}`);
  if (v.mute) bits.push(`禁技 ${v.mute}`);
  return bits.join(" · ");
}

function cardNumbers(row: ContentCardDef): Pick<CodexEntry, "cost" | "school" | "damage" | "cap"> {
  const v = row.values;
  const cap = v.block ? CLIMB_BLOCK_CAP : v.bleed ? CLIMB_BLEED_CAP : v.expose ? CLIMB_EXPOSE_CAP : v.comboCost ? CLIMB_COMBO_CAP : undefined;
  return {
    cost: row.cost,
    school: row.school,
    ...(v.damage ? { damage: v.damage } : {}),
    ...(cap ? { cap } : {}),
  };
}

function cardFace(id: CardId): string {
  const card = CARDS[id]!;
  const row = CARD_REGISTRY[id]!;
  const body = cardDisplayText(card, shellRunContext());
  const stats = registryStatLine(row);
  const face = !stats || body.includes(stats) ? body : `${body}\n数值：${stats}`;
  const rarity = cardRarityLabel(id);
  return rarity ? `${face}\n品相：${rarity}` : face;
}

export function catalogUlt(): CodexEntry[] {
  return ALL_CARD_IDS.filter((id) => isUltCard(id)).map((id) => {
    const c = CARDS[id]!;
    const row = CARD_REGISTRY[id]!;
    return {
      kind: "ult" as const,
      id,
      name: c.name,
      kicker: `绝 · ${schoolLabel(id)} · ${row.cost}劲`,
      text: cardFace(id),
      flavor: c.flavor,
      rarityLabel: cardRarityLabel(id),
      ...cardNumbers(row),
      related: cardRelated(id),
    };
  });
}

export function catalogSkill(): CodexEntry[] {
  const cards: CodexEntry[] = ALL_CARD_IDS.filter((id) => !isUltCard(id)).map((id) => {
    const c = CARDS[id]!;
    const row = CARD_REGISTRY[id]!;
    const kindLabel = row.kind === "attack" ? "攻" : row.kind === "stance" ? "架势" : "技";
    return {
      kind: "skill" as const,
      id,
      name: c.name,
      kicker: `${kindLabel} · ${schoolLabel(id)} · ${row.cost}劲`,
      text: cardFace(id),
      flavor: c.flavor,
      rarityLabel: cardRarityLabel(id),
      ...cardNumbers(row),
      related: cardRelated(id),
    };
  });
  const techs: CodexEntry[] = ALL_TECHNIQUE_IDS.map((id) => {
    const t = TECHNIQUES[id];
    const row = TECHNIQUE_REGISTRY[id]!;
    const feed =
      id === "leftover"
        ? "投喂：携带量=档位（1/2/3 点过回合）。"
        : "投喂升档：1 档原值，2 档约 ×1.15，3 档约 ×1.30。";
    const nums = Object.entries(row.values).map(([key, n]) => `${key} ${n}`);
    return {
      kind: "skill" as const,
      id,
      name: t.name,
      kicker: t.school ? `外功 · ${WEAPON_NAME[t.school]}` : "外功 · 通用",
      text: [row.text, feed, nums.length ? `数值：${nums.join(" · ")}` : ""].filter(Boolean).join("\n"),
      flavor: t.flavor,
      cost: row.cost,
      school: row.school,
      ...(row.values.damage ? { damage: row.values.damage } : {}),
      related: [],
    };
  });
  const minds: CodexEntry[] = Object.values(MIND_ARTS).map((m) => {
    const row = MIND_REGISTRY[m.id]!;
    const nums = [
      row.values.hpMax ? `气血上限 +${row.values.hpMax}` : "",
      row.values.energyMax ? `劲力上限 +${row.values.energyMax}` : "",
      row.values.turnHeal ? `收势回血 +${row.values.turnHeal}` : "",
      row.values.turnEnergy ? `每回多回劲 +${row.values.turnEnergy}` : "",
    ].filter(Boolean);
    return {
      kind: "skill" as const,
      id: m.id,
      name: m.name,
      kicker: m.school ? `心法 · ${WEAPON_NAME[m.school]}` : "心法 · 通用",
      text: nums.length ? `${row.text}\n数值：${nums.join(" · ")}` : row.text,
      cost: row.cost,
      school: row.school,
      ...(row.values.damage ? { damage: row.values.damage } : {}),
      related: [],
    };
  });
  const charms: CodexEntry[] = Object.values(CHARM_REGISTRY).map((row) => ({
    kind: "skill" as const,
    id: row.id,
    name: LAB_ITEM_LABEL[row.id] ?? row.id,
    kicker: `助战符 · ${WEAPON_NAME[row.school as keyof typeof WEAPON_NAME] ?? "通用"}`,
    text: `数值：${Object.entries(row.values).map(([key, n]) => `${key} ${n}`).join(" · ")}\n${row.text}`,
    cost: row.cost,
    school: row.school,
    ...(row.values.damage ? { damage: row.values.damage } : {}),
    related: [],
  }));
  const items: CodexEntry[] = Object.values(ITEM_REGISTRY).map((row) => ({
    kind: "skill" as const,
    id: row.id,
    name: LAB_ITEM_LABEL[row.id] ?? row.id,
    kicker: "道具",
    text: `数值：${Object.entries(row.values).map(([key, n]) => `${key} ${n}`).join(" · ")}\n${row.text}`,
    cost: row.cost,
    school: row.school,
    ...(row.values.damage ? { damage: row.values.damage } : {}),
    related: [],
  }));
  return [...cards, ...techs, ...minds, ...charms, ...items];
}

export function catalogGear(): CodexEntry[] {
  return GEAR_WEAPONS.map((g) => {
    const pathKey = `${g.school}-${g.path}`;
    const path = PATH_SKILL[pathKey] ? pathSkillText(pathKey, shellRunContext()) : "";
    const god = g.godSkill && GOD_SKILL[pathKey] ? godSkillText(pathKey, shellRunContext()) : g.godSkill ?? "";
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
      school: g.school,
      damage: g.damage,
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
