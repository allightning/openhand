import { describe, expect, it } from "vitest";
import { parseDialogue, dialogueToHtml, dialoguePlain } from "./dialogue";
import { LUOYANG_LINES } from "../data/dialogues";

describe("dialogue rich text", () => {
  it("parses bold and danger markers", () => {
    const frags = parseDialogue("客官请！**太白酒楼**的酒。{{漕帮来了}}躲着。");
    expect(frags.some((f) => f.bold && f.text === "太白酒楼")).toBe(true);
    expect(frags.some((f) => f.color === "danger" && f.text.includes("漕帮"))).toBe(true);
  });

  it("renders html classes", () => {
    const html = dialogueToHtml("见 **捕头姜**。{{危险}}");
    expect(html).toContain('class="dlg-bold"');
    expect(html).toContain('class="dlg-danger"');
    expect(dialoguePlain("**甲**{{乙}}")).toBe("甲乙");
  });

  it("covers 20+ luoyang named lines with at least one bold clue", () => {
    const keys = Object.keys(LUOYANG_LINES);
    expect(keys.length).toBeGreaterThanOrEqual(20);
    const withBold = keys.filter((k) => LUOYANG_LINES[k]!.idle.includes("**"));
    expect(withBold.length).toBeGreaterThanOrEqual(15);
  });
});
