import { describe, expect, it } from "vitest";
import { atlasSurvey, atlasVisible } from "./atlas";

describe("atlas visibility", () => {
  it("hides rooms you have not entered", () => {
    expect(atlasVisible("wharf", ["wharf"]).sort()).toEqual(["wharf"]);
  });

  it("shows only rooms you can walk to from here, if already visited", () => {
    const seen = ["wharf", "hold", "yard", "spit", "lane"];
    expect(atlasVisible("wharf", seen).sort()).toEqual(["hold", "wharf", "yard"]);
    expect(atlasVisible("spit", seen).sort()).toEqual(["lane", "spit", "yard"]);
  });

  it("surveys every visited room and the doors beside them", () => {
    const seen = ["wharf", "hold"];
    expect(atlasSurvey("wharf", seen).sort()).toEqual(
      ["cellar", "customs", "hold", "huainan", "lamp", "pier", "ridge", "ropes", "salt", "wharf", "yard"].sort(),
    );
  });

  it("reveals harbor side rooms only after they have been entered", () => {
    const seen = ["wharf", "customs", "ropes", "lamp"];
    expect(atlasVisible("wharf", seen).sort()).toEqual(["customs", "lamp", "ropes", "wharf"]);
  });

  it("keeps the sea crossing off the spit until the ferry is seen", () => {
    expect(atlasVisible("spit", ["spit", "yard", "ferry"]).sort()).toEqual(["ferry", "spit", "yard"]);
  });
});
