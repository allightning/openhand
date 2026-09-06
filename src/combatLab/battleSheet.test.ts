import { describe, expect, it } from "vitest";
import type { Battle } from "../game/types";
import { renderBattleSheet } from "./battleSheet";

function stub(partial: Partial<Battle> & Pick<Battle, "drawPile">): Battle {
  return {
    journal: [],
    v2AttackPlays: 2,
    v2BreakCount: 1,
    v2SwapCount: 0,
    turn: 4,
    player: { hp: 18, maxHp: 30 },
    ...partial,
  } as Battle;
}

describe("battle sheets", () => {
  it("lists remaining draw cards by name and next card", () => {
    const html = renderBattleSheet(
      "draw",
      stub({
        drawPile: [
          { uid: "a", defId: "retreat" },
          { uid: "b", defId: "retreat" },
        ],
      }),
    );
    expect(html).toContain("残谱");
    expect(html).toContain("pile-sheet-close");
    expect(html).toContain("撤步");
    expect(html).toContain("×2");
    expect(html).toContain("下一张");
  });

  it("本馆战绩看汇总，不复述流水", () => {
    const html = renderBattleSheet(
      "journal",
      stub({
        drawPile: [],
        v2AttackPlays: 5,
        v2BreakCount: 2,
        turn: 6,
        player: { hp: 12, maxHp: 30 } as Battle["player"],
      }),
    );
    expect(html).toContain("本馆");
    expect(html).toContain("出刀");
    expect(html).toContain("5 张");
    expect(html).toContain("拆招");
  });
});
