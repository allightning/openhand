import { describe, expect, it } from "vitest";
import { canTravelTo, travelTier } from "./access";
import { addFlag, addItem, makeRun } from "../game/run";

describe("road access", () => {
  it("keeps early runs out of capitals without a pass or story beat", () => {
    const run = addFlag(makeRun("empty"), "mainOpen");
    expect(travelTier(run)).toBeLessThan(4);
    expect(canTravelTo("huainan", "bianjing", run).ok).toBe(false);
    expect(canTravelTo("huainan", "chuzhou", run).ok).toBe(true);
  });

  it("opens deeper roads with a travel pass", () => {
    let run = addFlag(makeRun("empty"), "mainOpen");
    run = addItem(run, "roadPass");
    expect(canTravelTo("huainan", "jiankang", run).ok).toBe(true);
  });

  it("always allows return to visited places", () => {
    const run = { ...makeRun("empty"), visited: ["bianjing", "huainan"] };
    expect(canTravelTo("huainan", "bianjing", run).ok).toBe(true);
  });

  it("opens capitals after mid-story beats, not only after capital flags", () => {
    const rail = addFlag(addFlag(makeRun("empty", "rail"), "branded"), "midDoorTrue");
    expect(travelTier(rail)).toBeGreaterThanOrEqual(4);
    expect(canTravelTo("jiaxing", "linan", rail).ok).toBe(true);

    const seer = addFlag(makeRun("empty", "seer"), "booksOk");
    expect(canTravelTo("yanshi", "luoyang", seer).ok).toBe(true);

    const sapper = addFlag(makeRun("empty", "sapper"), "graceKnown");
    expect(canTravelTo("suzhousu", "bianjing", sapper).ok).toBe(true);
  });

  it("opens the usurper camp only with roadUsurp, not salt expose alone", () => {
    const saltOnly = addFlag(makeRun("empty", "rail"), "midSaltLedger");
    expect(canTravelTo("bianjing", "usurpCamp", saltOnly).ok).toBe(false);
    const usurped = addFlag(makeRun("empty", "rail"), "roadUsurp");
    expect(canTravelTo("bianjing", "usurpCamp", usurped).ok).toBe(true);
  });
});
