import { describe, expect, it } from "vitest";
import {
  acceptBounty,
  applyFallFlags,
  checkBountyOnWin,
  gateScarOpen,
  maybeArmBounty,
  maybeUnlockFork,
  placeTeaBet,
  resolveTeaBet,
  scarFlagFor,
} from "./hooks";
import { makeRun } from "./run";
import { gateOpen } from "../map/world";
import { loadScene } from "../map/world";

describe("hooks", () => {
  it("scars open books gate without booksOk", () => {
    expect(scarFlagFor("customs", "inkhand")).toBe("scarBooks");
    expect(gateScarOpen("books", ["scarBooks"])).toBe(true);
    const run = { ...makeRun("empty", "seer"), flags: ["scarBooks"] };
    const w = loadScene("customs", run);
    expect(gateOpen(w, run)).toBe(true);
  });

  it("tea bet pays 2x when won in time", () => {
    let run = makeRun("empty");
    run = { ...run, silver: 20 };
    const placed = placeTeaBet(run, 5, 6);
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    const won = resolveTeaBet(placed.run, true, 4);
    expect(won.run.silver).toBe(25);
    expect(won.run.teaBet).toBeNull();
  });

  it("fall twice shuts sides", () => {
    let run = makeRun("empty");
    run = { ...run, lives: 1, livesMax: 3 };
    run = applyFallFlags(run);
    expect(run.flags).toContain("sidesShut");
    expect(run.flags).toContain("fallenTwice");
  });

  it("arms bounty every 3 boss kills", () => {
    let run = makeRun("empty", "rail");
    run = {
      ...run,
      beaten: ["intruder", "brute", "warden"] as never[],
      flags: ["branded"],
    };
    run = maybeArmBounty(run);
    expect(run.flags).toContain("bountyDue");
    run = acceptBounty(run, "silver");
    expect(run.flags).toContain("bountyActive");
    const target = run.flags.find((f) => f.startsWith("bountyTarget-"))!.replace("bountyTarget-", "");
    run = { ...run, beaten: [...run.beaten, target as never] };
    const pay = checkBountyOnWin(run, target as never);
    expect(pay.payout).toContain("结了");
  });

  it("unlocks hero fork after branded mid bosses", () => {
    let run = makeRun("empty", "rail");
    run = {
      ...run,
      flags: ["branded"],
      beaten: ["intruder", "brute", "warden", "raider", "bandit", "catcher"] as never[],
    };
    run = maybeUnlockFork(run);
    expect(run.flags).toContain("forkRail");
  });
});
