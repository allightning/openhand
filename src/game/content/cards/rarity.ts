/**
 * 凡精绝判例。与 scripts/audit-rarity.ts 同一套钩子，整改后实测 凡 44 / 精 58 / 绝 14。
 * 连携不进这三档，调用方看 id 前缀 fuse，不写 rarity。
 */

export type CardRarity = "common" | "adept" | "supreme";

/** 家族核心 → 精 */
const ENGINE = new Set([
  "flow",
  "setup",
  "charge",
  "mark",
  "foeMute",
  "foeNoBag",
  "riposte",
  "variant",
  "regen",
  "finisher",
  "thorns",
  "mirror",
  "retain",
  "qiRegen",
  "foeQiBurn",
  "foeHandTax",
  "mute",
  "frail",
  "weave",
  "tide",
  "layer",
  "assist",
  "combo",
]);

const CONTROL = new Set(["stun", "disarm"]);

const LAYER_HOOKS = ["knock", "near", "bleed", "expose", "far", "plant", "pull"] as const;

const LAYER_VALUE: Record<(typeof LAYER_HOOKS)[number], string> = {
  knock: "knock",
  near: "nearBonus",
  bleed: "bleed",
  expose: "expose",
  far: "farBonus",
  plant: "stake",
  pull: "pullEnemy",
};

export interface RarityInput {
  id: string;
  effectHooks: readonly string[];
  values: Record<string, number>;
}

/** 连携返回 undefined。其余必落三档之一。 */
export function rarityOf(card: RarityInput): CardRarity | undefined {
  if (card.id.startsWith("fuse")) return undefined;
  if (card.effectHooks.includes("ultimate") || card.effectHooks.includes("aura")) return "supreme";
  if (card.effectHooks.some((hook) => ENGINE.has(hook) || CONTROL.has(hook))) return "adept";
  const layers = LAYER_HOOKS.filter((hook) => card.effectHooks.includes(hook));
  const layerSum = layers.reduce((sum, hook) => sum + (card.values[LAYER_VALUE[hook]] ?? 1), 0);
  if (layerSum >= 2) return "adept";
  if (layers.length > 0 && !card.values.damage && !card.values.block) return "adept";
  return "common";
}

const FUSE_CAPS = ["Palm", "Saber", "Sword", "Spear", "Staff", "Hook"] as const;

/** 连携 bondSchool = id 里排在前面的那一系（fusePalmSaber → palm）。 */
export function bondSchoolOf(id: string): string | undefined {
  if (!id.startsWith("fuse")) return undefined;
  const rest = id.slice(4);
  for (const cap of FUSE_CAPS) {
    if (rest.startsWith(cap)) return cap.toLowerCase();
  }
  return undefined;
}
