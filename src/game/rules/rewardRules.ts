import { CARDS, TECHNIQUES, cardSchool, breakStarterDeck, SCHOOL_EXTRA_HIT, SCHOOL_EXTRA_STATUS, SCHOOL_EXTRA_STATUS2, SCHOOL_SCHOOL_STEP, SCHOOL_SUB_ATTACK, SCHOOL_ULTIMATE, MOVE_CARD_IDS, isBreakAlign, expandDeckRecipe, getGauntletFinalStage } from "./gauntletKit";
import { ALL_ITEMS, GauntletRun, type GauntletTier } from "./gauntletModel";
import type { CardId, LabItemId, TechniqueId, WeaponId } from "../types";
import { gauntletPorts } from "./gauntletPorts";
import { ladderEntry } from "./ladderRules";

export function rewardFought(run: { stage: number }): number {
  return Math.max(1, run.stage - 1);
}

/** 免费奖励与黑市共用：淬刃/换页 3 馆战后，±2 4 馆战后，绝招 7 馆战后。 */
export function rewardGate(fought: number): {
  forge: boolean;
  upgrade: boolean;
  ultimate: boolean;
  advance2: boolean;
} {
  return {
    forge: fought >= 3,
    upgrade: fought >= 3,
    ultimate: fought >= 7,
    advance2: fought >= 4,
  };
}

function breakRewardCardPool(run: GauntletRun): CardId[] {
  const gate = rewardGate(rewardFought(run));
  const pool: CardId[] = [
    ...SCHOOL_SUB_ATTACK[run.school],
    SCHOOL_EXTRA_HIT[run.school],
    SCHOOL_EXTRA_STATUS[run.school],
    SCHOOL_EXTRA_STATUS2[run.school],
    SCHOOL_SCHOOL_STEP[run.school],
    "brace",
    "expose",
    "bleedcut",
    "mend",
    "defend",
  ];
  if (gate.advance2) pool.push("advance2", "sidestep", "brace");
  if (gate.ultimate) pool.push(SCHOOL_ULTIMATE[run.school]);
  return [...new Set(pool.filter((id) => CARDS[id]))];
}

export { breakRewardCardPool };

/** 谱牌类权重：攻 > 防 > 位移；位移软顶（牌组已有 ≥3 张位移则权重归零）。 */
function cardRewardBucket(id: CardId): "atk" | "def" | "move" | "ult" {
  if (Object.values(SCHOOL_ULTIMATE).includes(id)) return "ult";
  if ((MOVE_CARD_IDS as CardId[]).includes(id) || id === "advance2" || id === "sidestep") return "move";
  if (id === "brace" || id === "defend" || (CARDS[id]?.type === "skill" && (CARDS[id]?.block ?? 0) > 0)) return "def";
  return "atk";
}

const CARD_BUCKET_WEIGHT: Record<"atk" | "def" | "move" | "ult", number> = {
  atk: 55,
  def: 20,
  move: 15,
  /** 绝招开闸后应能摸到，勿被副攻淹没 */
  ult: 45,
};

function deckMoveCount(deck: CardId[]): number {
  return deck.filter((id) => (MOVE_CARD_IDS as CardId[]).includes(id) || id === "advance2").length;
}

/** 类权重随机抽一张谱；位移在牌组已 ≥3 时不出。 */
export function pickWeightedRewardCard(pool: CardId[], deck: CardId[], rng: () => number): CardId | null {
  if (!pool.length) return null;
  const moveSoftCap = deckMoveCount(deck) >= 3;
  const weighted: Array<{ id: CardId; w: number }> = [];
  for (const id of pool) {
    const bucket = cardRewardBucket(id);
    let w = CARD_BUCKET_WEIGHT[bucket];
    if (bucket === "move" && moveSoftCap) w = 0;
    if (w > 0) weighted.push({ id, w });
  }
  if (!weighted.length) {
    // 位移被软顶后仍有攻/防：回落均匀（池里只剩位移则仍抽位移）
    const fallback = pool.filter((id) => cardRewardBucket(id) !== "move");
    const use = fallback.length ? fallback : pool;
    return use[Math.floor(rng() * use.length)] ?? null;
  }
  const total = weighted.reduce((s, x) => s + x.w, 0);
  let roll = rng() * total;
  for (const row of weighted) {
    if (roll < row.w) return row.id;
    roll -= row.w;
  }
  return weighted[weighted.length - 1]!.id;
}

export function isMidtermSuperFought(fought: number): boolean {
  return fought === gauntletPorts().midtermStage;
}

export function cardPool(school: WeaponId, withCombo: boolean): CardId[] {
  return (Object.keys(CARDS) as CardId[]).filter((id) => {
    const cs = cardSchool(id);
    if (cs !== school && cs !== "any") return false;
    if (!withCombo && CARDS[id].tags?.includes("组合")) return false;
    return true;
  });
}

/** 全队已学外功（去重池用）。 */
export function allOwnedTechs(run: GauntletRun): TechniqueId[] {
  return [...new Set([...run.techniques, ...Object.values(run.mateTechs).flat()])];
}

/** §31.10 外功按系别过滤：只出「本系亲和 + 通用」（选刀不会再弹桩功/钩功）。 */
export function techPool(owned: TechniqueId[], school: WeaponId): TechniqueId[] {
  return (Object.keys(TECHNIQUES) as TechniqueId[]).filter((id) => {
    if (owned.includes(id)) return false;
    const ts = TECHNIQUES[id].school;
    return !ts || ts === school;
  });
}


export const ALL_AID_ITEMS: LabItemId[] = ["aidPalm", "aidSaber", "aidSword", "aidSpear", "aidStaff", "aidHook"];

export function itemPool(owned: LabItemId[]): LabItemId[] {
  return ALL_ITEMS.filter((id) => !owned.includes(id));
}

export function rewardTierForRun(run: GauntletRun): Exclude<GauntletTier, "extreme"> {
  const entry = ladderEntry(Math.max(1, run.stage - 1), run.path);
  return entry.tier === "extreme" ? "hard" : entry.tier;
}

export function forgeGradeOk(run: GauntletRun, nextGrade: number): boolean {
  if (!isBreakAlign()) return nextGrade < 5;
  const gate = rewardGate(rewardFought(run));
  if (!gate.forge) return false;
  return nextGrade <= (gate.ultimate ? 3 : 2);
}

/** 拆招：4 选 2；期末前一馆起 4 选 3。经典：按档 3/4 选 1。 */
export function gauntletRewardTakeCount(run: GauntletRun): number {
  const fought = Math.max(1, run.stage - 1);
  const final = getGauntletFinalStage(run);
  const base = fought >= final - 1 ? 3 : 2;
  return base + Math.max(0, run.pendingRewardBonus ?? 0);
}

export function gauntletDeckExpanded(run: GauntletRun): CardId[] {
  return expandDeckRecipe(run.deckRecipe, 1);
}

export function starterTip(school: WeaponId): string {
  const recipe = breakStarterDeck(school);
  const counts = new Map<CardId, number>();
  for (const id of recipe) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts.entries()]
    .map(([id, n]) => {
      const c = CARDS[id];
      return `${c.name}${n > 1 ? `×${n}` : ""}：${c.text}`;
    })
    .join("\n");
}
