import { describe, expect, it } from "vitest";
import { artUrl } from "./artUrl";

describe("artUrl", () => {
  it("keeps public art under the Vite base path", () => {
    const src = artUrl("art/stand/rail.png");
    expect(src.endsWith("art/stand/rail.png")).toBe(true);
    expect(src.includes("//art/")).toBe(false);
  });
});
