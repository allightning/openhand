import { EMPTY_LIMIT, HAND_WARN, bandDeviation } from "./tiers";

export type Gate = "green" | "warn" | "red";

/** 空手率 >5% 红。手数偏离锚点 >30% 警告。胜率越出 0–100% 红。 */
export function judgeRow(emptyRate: number, hands: number, band: string, winRate: number): Gate {
  if (winRate < 0 || winRate > 1 || emptyRate > EMPTY_LIMIT) return "red";
  if (bandDeviation(hands, band) > HAND_WARN) return "warn";
  return "green";
}

export function judgeSelfTest(): string[] {
  const problems: string[] = [];
  if (judgeRow(0, 4.5, "4-5", 0.33) !== "green") problems.push("绿样例没有判绿");
  if (judgeRow(0.08, 4.5, "4-5", 0.33) !== "red") problems.push("空手 8% 没有判红");
  if (judgeRow(0, 9, "4-5", 0.33) !== "warn") problems.push("手数偏离没有判警告");
  if (judgeRow(0, 4.5, "4-5", 1.2) !== "red") problems.push("胜率 120% 没有判红");
  return problems;
}
