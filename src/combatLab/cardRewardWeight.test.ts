import { describe, expect, it } from "vitest";
import { pickWeightedRewardCard } from "./gauntlet";
import type { CardId } from "../game/types";

function seeded(seq: number[]): () => number {
  let i = 0;
  return () => seq[i++] ?? 0.5;
}

describe("谱牌奖励权重", () => {
  it("位移软顶：牌组已有 ≥3 张位移时不再抽位移", () => {
    const pool: CardId[] = ["drawcut", "saberBleed", "advance2", "sidestep", "brace"];
    const deck: CardId[] = ["advance", "retreat", "sidestep"];
    const counts = { atk: 0, move: 0, def: 0 };
    for (let n = 0; n < 80; n++) {
      const id = pickWeightedRewardCard(pool, deck, () => (n % 100) / 100);
      expect(id).toBeTruthy();
      if (id === "advance2" || id === "sidestep") counts.move += 1;
      else if (id === "brace") counts.def += 1;
      else counts.atk += 1;
    }
    expect(counts.move).toBe(0);
    expect(counts.atk).toBeGreaterThan(counts.def);
  });

  it("无软顶时攻击权重大于位移", () => {
    const pool: CardId[] = ["drawcut", "saberBleed", "advance2", "sidestep", "brace"];
    const deck: CardId[] = ["advance", "retreat"];
    const counts = { atk: 0, move: 0 };
    for (let n = 0; n < 200; n++) {
      const id = pickWeightedRewardCard(pool, deck, seeded([n / 200, 0.1, 0.3, 0.7, 0.9][n % 5]!));
      if (!id) continue;
      if (id === "advance2" || id === "sidestep") counts.move += 1;
      else if (id === "drawcut" || id === "saberBleed") counts.atk += 1;
    }
    expect(counts.atk).toBeGreaterThan(counts.move);
  });
});
