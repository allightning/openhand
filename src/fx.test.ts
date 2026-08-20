import { describe, expect, it } from "vitest";
import { fxKind } from "./fx";
import { cardArt } from "./art/cardArt";
import { CARDS } from "./game/content";

describe("card fx", () => {
  it("gives attacks a cut and heals a green ward family", () => {
    expect(fxKind("strike")).toBe("palm");
    expect(fxKind("strike2")).toBe("palm");
    expect(fxKind("defend")).toBe("ward");
    expect(fxKind("mend")).toBe("mend");
    expect(fxKind("push")).toBe("wind");
    expect(fxKind("charge")).toBe("qi");
    expect(fxKind("advance")).toBe("step");
    expect(fxKind("cut")).toBe("saber");
    expect(fxKind("thrust")).toBe("spear");
    expect(fxKind("haste")).toBe("haste");
  });

  it("does not collapse every card into one effect", () => {
    const kinds = Object.keys(CARDS).map((id) => fxKind(id));
    expect(new Set(kinds).size).toBeGreaterThan(10);
  });

  it("paints a distinct plate for each move family", () => {
    const arts = Object.keys(CARDS).map((id) => cardArt(id));
    expect(new Set(arts).size).toBeGreaterThan(18);
    expect(cardArt("mend")).not.toBe(cardArt("defend"));
    expect(cardArt("thrust")).not.toBe(cardArt("strike"));
    expect(cardArt("inbreath")).not.toBe(cardArt("charge"));
  });
});
