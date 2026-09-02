import { describe, expect, it } from "vitest";
import type { Battle } from "../game/types";
import { renderBattleSheet } from "./battleSheet";

function stub(partial: Pick<Battle, "drawPile" | "journal">): Battle {
  return { drawPile: partial.drawPile, journal: partial.journal } as Battle;
}

describe("battle sheets", () => {
  it("lists remaining draw cards by name", () => {
    const html = renderBattleSheet(
      "draw",
      stub({
        drawPile: [
          { uid: "a", defId: "retreat" },
          { uid: "b", defId: "retreat" },
        ],
        journal: [],
      }),
    );
    expect(html).toContain("残谱");
    expect(html).toContain("pile-sheet-close");
    expect(html).toContain("撤步");
    expect(html).toContain("×2");
  });

  it("lists journal newest first", () => {
    const html = renderBattleSheet(
      "journal",
      stub({
        drawPile: [],
        journal: [
          { side: "you", text: "先走" },
          { side: "foe", text: "后打" },
        ],
      }),
    );
    expect(html).toContain("战记");
    expect(html.indexOf("后打")).toBeLessThan(html.indexOf("先走"));
    expect(html).toContain("j-foe");
  });
});
