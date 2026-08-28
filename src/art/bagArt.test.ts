import { describe, expect, it } from "vitest";
import { bagArtSrc } from "./bagArt";
import { loadScene } from "../map/world";
import { makeRun } from "../game/run";

describe("bagArt", () => {
  it("points every common good at /art/bag", () => {
    expect(bagArtSrc("herb")).toMatch(/art\/bag\/herb\.png$/);
    expect(bagArtSrc("hide")).toMatch(/art\/bag\/hide\.png$/);
    expect(bagArtSrc("forgeShen")).toMatch(/art\/bag\/forgeShen\.png$/);
  });
});

describe("new props", () => {
  it("fills martial hall with training props", () => {
    const w = loadScene("martial", makeRun("empty"));
    const kinds = new Set(w.props.map((p) => p.kind));
    expect(kinds.has("dummy")).toBe(true);
    expect(kinds.has("rack")).toBe(true);
    expect(kinds.has("sandbag")).toBe(true);
    expect(kinds.has("table")).toBe(true);
  });

  it("puts clinic cabinets and basins", () => {
    const w = loadScene("clinic", makeRun("empty"));
    const kinds = new Set(w.props.map((p) => p.kind));
    expect(kinds.has("cabinet")).toBe(true);
    expect(kinds.has("basin")).toBe(true);
  });

  it("puts wine house screens and counters", () => {
    const w = loadScene("wine", makeRun("empty"));
    const kinds = new Set(w.props.map((p) => p.kind));
    expect(kinds.has("screen")).toBe(true);
    expect(kinds.has("counter")).toBe(true);
    expect(kinds.has("board")).toBe(true);
  });
});
