/** Stage pacing for rewards / unlocks. Early ≈ 港律; mid ≈ 淮阴→汴; late ≈ 汴营后. */
export type Stage = "early" | "mid" | "late";

const EARLY_SCENES = new Set([
  "hut",
  "plot",
  "ridge",
  "wharf",
  "yard",
  "hold",
  "customs",
  "salt",
  "ropes",
  "shed",
  "docks",
  "lamp",
  "shrine",
  "sluice",
  "pit",
  "spit",
  "pier",
  "flower",
  "escort",
  "yamen",
  "cellar",
  "cave",
]);

const LATE_SCENES = new Set([
  "bianjing",
  "usurpCamp",
  "linan",
  "changan",
  "palace",
  "inner",
  "glass",
  "shaolin",
  "luohan",
]);

export function stageOfScene(scene: string): Stage {
  if (EARLY_SCENES.has(scene)) return "early";
  if (LATE_SCENES.has(scene)) return "late";
  return "mid";
}

/** Target share of content volume: 1 : 2.5 : 2 */
export const STAGE_WEIGHT = { early: 1, mid: 2.5, late: 2 } as const;

export function stageSilver(stage: Stage, base: number): number {
  // 烟火气支线变多后，银两整体压一档
  if (stage === "early") return Math.max(1, Math.round(base * 0.8));
  if (stage === "mid") return Math.round(base * 1.45);
  return Math.round(base * 1.9);
}

export function stageCardBudget(stage: Stage): { uniqueUsable: number; note: string } {
  if (stage === "early") return { uniqueUsable: 20, note: "本系可用约二十张（含兵器附带）" };
  if (stage === "mid") return { uniqueUsable: 40, note: "中期本系约四十张" };
  return { uniqueUsable: 64, note: "后期本系逾六十张" };
}
