import { describe, expect, it } from "vitest";
import { validateTransitNetwork, PRIMARY_EDGES } from "./transit";

describe("task1 transit", () => {
  it("validateTransitNetwork passes geographic hub rules", () => {
    const r = validateTransitNetwork(PRIMARY_EDGES);
    expect(r.ok, r.report.join("; ") + r.islands.join(",")).toBe(true);
    expect(r.islands).toEqual([]);
  });
});
