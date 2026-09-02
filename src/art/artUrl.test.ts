import { describe, expect, it } from "vitest";
import { artUrl } from "./artUrl";

describe("artUrl", () => {
  it("keeps public art under the Vite base path", () => {
    const src = artUrl("art/stand/rail.jpg");
    expect(src.endsWith("art/stand/rail.jpg")).toBe(true);
    expect(src.includes("//art/")).toBe(false);
  });
});
