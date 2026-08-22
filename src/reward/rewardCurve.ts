/**
 * 探索率 → 容错 映射 + 反无脑通关门槛声明
 */
export function calcToleranceMargin(exploredRewardRatio: number, difficulty: "easy" | "normal" | "hard"): number {
  const base =
    exploredRewardRatio < 0.3 ? 0.05 : exploredRewardRatio < 0.6 ? 0.25 : exploredRewardRatio < 1 ? 0.55 : 0.9;
  const dMul = difficulty === "easy" ? 1.15 : difficulty === "hard" ? 0.85 : 1;
  return Math.min(1, base * dMul);
}

export function systemGuidedShare(): number {
  return 0.1;
}

export function exploreShare(): number {
  return 0.9;
}

/** 声明式校验：<50% 奖励不允许「数值碾压」标签通关 */
export function assertNoBruteForceClear(exploredRewardRatio: number, strategyScore: number): {
  ok: boolean;
  reason?: string;
} {
  if (exploredRewardRatio < 0.5 && strategyScore < 0.4) {
    return { ok: false, reason: "<50% 奖励且策略分过低，禁止无脑通关" };
  }
  return { ok: true };
}

export function capProgressionPower(atk: number, hp: number, caps = { atk: 120, hp: 400 }): {
  atk: number;
  hp: number;
  capped: boolean;
} {
  const a = Math.min(atk, caps.atk);
  const h = Math.min(hp, caps.hp);
  return { atk: a, hp: h, capped: a !== atk || h !== hp };
}
