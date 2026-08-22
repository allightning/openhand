import { describe, expect, it } from "vitest";
import { addFlag, makeRun } from "../game/run";
import { canEnterHubScene, hubOwner } from "./hubScenes";

describe("starter hub isolation", () => {
  it("assigns the three starter districts to three owners", () => {
    expect(hubOwner("customs")).toBe("seer");
    expect(hubOwner("taxMarket")).toBe("seer");
    expect(hubOwner("pit")).toBe("sapper");
    expect(hubOwner("ropes")).toBe("sapper");
    expect(hubOwner("ropeMarket")).toBe("sapper");
    expect(hubOwner("wharf")).toBe("rail");
    expect(hubOwner("hut")).toBe("rail");
    expect(hubOwner("huainan")).toBeNull();
  });

  it("keeps seer out of the harbor until booksOk", () => {
    const run = makeRun("empty", "seer");
    expect(canEnterHubScene("taxMarket", run).ok).toBe(true);
    expect(canEnterHubScene("wharf", run).ok).toBe(false);
    expect(canEnterHubScene("ropes", run).ok).toBe(false);
    expect(canEnterHubScene("wharf", addFlag(run, "booksOk")).ok).toBe(true);
  });

  it("keeps sapper out of the harbor until knotOk", () => {
    const run = makeRun("empty", "sapper");
    expect(canEnterHubScene("ropes", run).ok).toBe(true);
    expect(canEnterHubScene("ropeMarket", run).ok).toBe(true);
    expect(canEnterHubScene("wharf", run).ok).toBe(false);
    expect(canEnterHubScene("customs", run).ok).toBe(false);
    expect(canEnterHubScene("wharf", addFlag(run, "knotOk")).ok).toBe(true);
  });

  it("keeps rail out of tax and rope markets until branded, but allows waterfront ropes", () => {
    const run = makeRun("empty", "rail");
    expect(canEnterHubScene("wharf", run).ok).toBe(true);
    expect(canEnterHubScene("ropes", run).ok).toBe(true);
    expect(canEnterHubScene("taxMarket", run).ok).toBe(false);
    expect(canEnterHubScene("ropeMarket", run).ok).toBe(false);
    expect(canEnterHubScene("taxMarket", addFlag(run, "branded")).ok).toBe(true);
  });
});
