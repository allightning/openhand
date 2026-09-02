import type { Battle } from "./types";

/**
 * §31.15 拆招战利品总线：labV2 判定「拆了什么路径给什么赏」，sim 注册「怎么落账」
 * （抽牌/劲力/回血都在 sim 里，labV2 不能反向依赖；独立小模块避免 import 环）。
 */
export type BreakLoot = {
  kind: "block" | "expose" | "heal" | "energy" | "draw";
  n: number;
  label: string;
  meleeBonus?: number;
};

type BreakLootApplier = (b: Battle, loot: BreakLoot) => void;
let applier: BreakLootApplier | null = null;

export function registerBreakLootApplier(fn: BreakLootApplier): void {
  applier = fn;
}

export function applyBreakLoot(b: Battle, loot: BreakLoot): void {
  applier?.(b, loot);
}
