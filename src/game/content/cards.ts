import type { CardDef as LegacyCard, CardId, WeaponId } from "../types";
import { CARDS } from "./legacy";
import type { CardKind, HookId, SchoolId } from "./hooks";
import { CARD_KINDS, uniqueHooks } from "./hooks";
import { validateRow, type Hold } from "./validate";
import { CROSS_HOLD } from "./cards/rectify";
import { bondSchoolOf, rarityOf, type CardRarity } from "./cards/rarity";

export type { CardRarity };

/** 字段契约见 ARCHITECTURE 阶段 4。kind 已按 KIND.md 冻结。 */
export interface CardDef {
  id: CardId;
  cost: number;
  school: SchoolId;
  kind: CardKind;
  effectHooks: HookId[];
  values: Record<string, number>;
  text: string;
  /** 凡 common / 精 adept / 绝 supreme。连携不写。 */
  rarity?: CardRarity;
  /** 连携所跟的武器系。换人结算不读。 */
  bondSchool?: WeaponId;
}

/** 旧牌没有 steps 字段、但结算里就是位移。 */
const MOVE_IDS = new Set<string>(["close", "retreat", "backpalm"]);

const NUMBER_FIELDS: { field: keyof LegacyCard; hook: HookId }[] = [
  { field: "damage", hook: "damage" },
  { field: "block", hook: "block" },
  { field: "knock", hook: "knock" },
  { field: "wall", hook: "wall" },
  { field: "chargeBonus", hook: "charge" },
  { field: "steps", hook: "step" },
  { field: "heal", hook: "heal" },
  { field: "pullEnemy", hook: "pull" },
  { field: "nearBonus", hook: "near" },
  { field: "farBonus", hook: "far" },
  { field: "bleed", hook: "bleed" },
  { field: "thorns", hook: "thorns" },
  { field: "expose", hook: "expose" },
  { field: "energyNext", hook: "energyNext" },
  { field: "frail", hook: "frail" },
  { field: "pace", hook: "pace" },
  { field: "flow", hook: "flow" },
  { field: "setupGain", hook: "setup" },
  { field: "setupCost", hook: "setup" },
  { field: "echo", hook: "echo" },
  { field: "retainTurns", hook: "retain" },
  { field: "retainAmt", hook: "retain" },
  { field: "mark", hook: "mark" },
  { field: "regen", hook: "regen" },
  { field: "regenTurns", hook: "regen" },
  { field: "payHp", hook: "payHp" },
  { field: "comboCost", hook: "combo" },
  { field: "flowCost", hook: "flow" },
  { field: "stackTaxHp", hook: "stackTax" },
  { field: "stackTaxQi", hook: "stackTax" },
  { field: "mute", hook: "mute" },
  { field: "foeMute", hook: "foeMute" },
  { field: "foeDisarm", hook: "disarm" },
  { field: "foeStun", hook: "stun" },
  { field: "costDiscountNext", hook: "costDiscount" },
  { field: "noBag", hook: "noBag" },
  { field: "foeNoBag", hook: "foeNoBag" },
  { field: "handTax", hook: "handTax" },
  { field: "foeHandTax", hook: "foeHandTax" },
  { field: "qiBurn", hook: "qiBurn" },
  { field: "foeQiBurn", hook: "foeQiBurn" },
  { field: "qiRegenSelf", hook: "qiRegen" },
];

const FLAG_FIELDS: { field: keyof LegacyCard; hook: HookId }[] = [
  { field: "plant", hook: "plant" },
  { field: "combo", hook: "combo" },
  { field: "finisher", hook: "finisher" },
  { field: "mirror", hook: "mirror" },
  { field: "weave", hook: "weave" },
  { field: "layer", hook: "layer" },
  { field: "tide", hook: "tide" },
  { field: "clearBleed", hook: "clearBleed" },
  { field: "clearSeal", hook: "clearSeal" },
  { field: "swap", hook: "swap" },
  { field: "requiresAssist", hook: "assist" },
];

function copyNumbers(source: object, into: Record<string, number>): void {
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === "number") into[key] = value;
  }
}

export function projectCard(card: LegacyCard): CardDef {
  const hooks = new Set<HookId>();
  const values: Record<string, number> = {};
  for (const { field, hook } of NUMBER_FIELDS) {
    const raw = card[field];
    if (typeof raw !== "number" || raw === 0) continue;
    hooks.add(hook);
    values[field] = raw;
  }
  for (const { field, hook } of FLAG_FIELDS) {
    if (card[field] === true) hooks.add(hook);
  }
  if (card.riposte) hooks.add("riposte");
  if (card.ultimate) {
    hooks.add("ultimate");
    copyNumbers(card.ultimate, values);
  }
  if (card.variant) {
    hooks.add("variant");
    copyNumbers(card.variant, values);
  }
  if (card.plant) values.stake = 1;
  if (MOVE_IDS.has(card.id)) hooks.add("step");
  if (card.id.startsWith("aura")) hooks.add("aura");
  if (card.id.startsWith("ward")) hooks.add("ward");
  if (card.id.startsWith("fuse")) hooks.add("fuse");
  if (card.tags?.includes("组合")) hooks.add("combo");
  const effectHooks = uniqueHooks([...hooks]);
  const projected = {
    id: card.id,
    cost: card.cost,
    school: card.school ?? "any",
    kind: card.type,
    effectHooks,
    values,
    text: card.text,
  };
  const rarity = rarityOf(projected);
  const bondSchool = bondSchoolOf(card.id);
  return {
    ...projected,
    ...(rarity ? { rarity } : {}),
    ...(bondSchool ? { bondSchool: bondSchool as WeaponId } : {}),
  };
}

export function cardProblems(row: CardDef): string[] {
  const problems = validateRow(row, { kinds: CARD_KINDS, requireDigit: true });
  const note = CROSS_HOLD[row.id];
  if (note) problems.push(note);
  return problems;
}

const projected = Object.values(CARDS).map(projectCard);

/** 现行牌全部入表。费用和系别按整改表烘焙在分系文件里。 */
export const CARD_REGISTRY: Readonly<Record<string, CardDef>> = Object.fromEntries(
  projected.map((row) => [row.id, row]),
);

/** 合同没过，或交叉系还没拍的牌。人还在注册表里。 */
export const CARD_HOLDS: readonly Hold<CardDef>[] = projected
  .map((row) => ({ row, problems: cardProblems(row) }))
  .filter((item) => item.problems.length > 0);
