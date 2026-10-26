/**
 * 把现行 CARDS 按整改表烘焙进 content/cards/<系>.ts。
 * 费用只改 RECOST；系只改 RETAG / CROSS_MOVE；其余数字原样。
 * npx tsx scripts/cardAudit/emitPool.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { CARDS } from "../../src/game/content/legacy";
import type { CardDef } from "../../src/game/types";
import { CROSS_MOVE, DELETED, RECOST, RETAG } from "../../src/game/content/cards/rectify";

const TEXT_FIX: Record<string, string> = {
  close: "移到对方身前 1 格。路要空。",
  plant: "身前 1 格为空则落 1 根桩。",
};

const FLAVOR_FIX: Record<string, string> = {
  push: "门闩在门上，掌推过去。",
  split: "桩立在身前。挡路就拆。",
  cut: "刀口对着胸口。",
  buryBleed: "他撞上来，创口叠在旧口上。",
  buryWard: "架先架住，等他的手送上来。",
  lateTide: "后期的气，一整片压过来。",
  stepPalm: "掌随身进，这一步进了还有挡。",
  hitSaber: "刀口拖过，留下一道口子。",
  hitSword: "剑尖取脉口。",
};

const FILES = ["any", "palm", "saber", "sword", "spear", "staff", "hook", "fuse"] as const;
type Bucket = (typeof FILES)[number];

const KEY_ORDER = [
  "id",
  "name",
  "cost",
  "type",
  "school",
  "text",
  "flavor",
  "tags",
  "damage",
  "block",
  "heal",
  "knock",
  "wall",
  "steps",
  "pullEnemy",
  "nearBonus",
  "farBonus",
  "bleed",
  "expose",
  "thorns",
  "pace",
  "energyNext",
  "chargeBonus",
  "plant",
  "ultimate",
  "variant",
  "riposte",
];

function emitVal(value: unknown): string {
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return JSON.stringify(value);
  if (value && typeof value === "object") {
    const body = Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k}: ${emitVal(v)}`)
      .join(", ");
    return `{ ${body} }`;
  }
  return "null";
}

function emitCard(card: CardDef): string {
  const keys = Object.keys(card).filter((key) => (card as unknown as Record<string, unknown>)[key] !== undefined);
  keys.sort((a, b) => {
    const ia = KEY_ORDER.indexOf(a);
    const ib = KEY_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
  const body = keys
    .map((key) => `    ${key}: ${emitVal((card as unknown as Record<string, unknown>)[key])},`)
    .join("\n");
  return `  ${card.id}: {\n${body}\n  },`;
}

function bucketOf(card: CardDef): Bucket {
  if (card.id.startsWith("fuse")) return "fuse";
  const school = card.school ?? "any";
  if ((FILES as readonly string[]).includes(school)) return school as Bucket;
  return "any";
}

function bake(card: CardDef): CardDef | null {
  if (DELETED.has(card.id)) return null;
  const next: CardDef = { ...card };
  const school = RETAG[card.id] ?? CROSS_MOVE[card.id];
  if (school) next.school = school as CardDef["school"];
  if (RECOST[card.id] !== undefined) next.cost = RECOST[card.id]!;
  if (TEXT_FIX[card.id]) next.text = TEXT_FIX[card.id]!;
  if (FLAVOR_FIX[card.id]) next.flavor = FLAVOR_FIX[card.id]!;
  if (!next.school) next.school = "any";
  return next;
}

const groups: Record<Bucket, CardDef[]> = {
  any: [],
  palm: [],
  saber: [],
  sword: [],
  spear: [],
  staff: [],
  hook: [],
  fuse: [],
};

let kept = 0;
for (const card of Object.values(CARDS)) {
  const next = bake(card);
  if (!next) continue;
  kept++;
  groups[bucketOf(next)].push(next);
}

mkdirSync("src/game/content/cards", { recursive: true });
const EXPORT: Record<Bucket, string> = {
  any: "ANY_CARDS",
  palm: "PALM_CARDS",
  saber: "SABER_CARDS",
  sword: "SWORD_CARDS",
  spear: "SPEAR_CARDS",
  staff: "STAFF_CARDS",
  hook: "HOOK_CARDS",
  fuse: "FUSE_CARDS",
};

for (const file of FILES) {
  const list = groups[file].sort((a, b) => a.id.localeCompare(b.id));
  const body = list.map(emitCard).join("\n");
  const src = `import type { CardDef } from "../../types";

/** ${file} 牌面。结算读 legacy.ts 汇总后的 CARDS。 */
export const ${EXPORT[file]}: Record<string, CardDef> = {
${body}
};
`;
  writeFileSync(`src/game/content/cards/${file}.ts`, src);
  console.log(file, list.length);
}
console.log("kept", kept);
