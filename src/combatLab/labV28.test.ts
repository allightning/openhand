import { describe, expect, it, vi } from "vitest";
import { schoolFromGearId } from "../game/equippedWeapon";
import { setLabMode, setLabTuning } from "../game/labTuning";
import { MATES, cardSchool } from "../game/party";
import { canPlay, drawOneCard, isComboUnlockCard } from "../game/sim";
import { AUTO_LOADOUTS, applyAutoLoadout, validateLoadoutPreset } from "./autoLoadouts";
import { runFromPreset, startLabBattle } from "./factory";
import { expandDeckRecipe } from "./rules";
import { BUILTIN_PRESETS } from "./presets";

function maxConsecutiveSame(ids: string[]): number {
  let best = 1;
  let run = 1;
  for (let i = 1; i < ids.length; i++) {
    if (ids[i] === ids[i - 1]) {
      run += 1;
      best = Math.max(best, run);
    } else run = 1;
  }
  return best;
}

describe("§28 牌堆归属与配额", () => {
  it("distributes per-mate decks from recipe by equipped school", () => {
    setLabMode(true);
    const p = applyAutoLoadout("t6-all-diff", 4, 2);
    const run = runFromPreset(p);
    const railDeck = run.mateDecks.rail ?? [];
    const bladeDeck = run.mateDecks.blade ?? [];
    expect(railDeck.length).toBeGreaterThan(0);
    expect(bladeDeck.length).toBeGreaterThan(0);
    expect(railDeck.every((id) => cardSchool(id) === "any" || cardSchool(id) === "palm")).toBe(true);
    expect(bladeDeck.every((id) => cardSchool(id) === "any" || cardSchool(id) === "saber")).toBe(true);
    expect(railDeck).not.toEqual(bladeDeck);
  });

  it("bench fighter uses mate deck not MATES default on swap", () => {
    setLabMode(true);
    const p = applyAutoLoadout("t6-all-diff", 4, 1);
    const b = startLabBattle(p, true);
    const benchBlade = b.bench.find((m) => m.id === "blade")!;
    expect(benchBlade.drawPile.length + benchBlade.hand.length).toBeGreaterThan(0);
    const all = [...benchBlade.hand, ...benchBlade.drawPile].map((c) => c.defId);
    expect(all.every((id) => cardSchool(id) === "any" || cardSchool(id) === "saber")).toBe(true);
    expect(all.some((id) => cardSchool(id) === "saber")).toBe(true);
  });

  for (const def of AUTO_LOADOUTS) {
    it(`${def.id} passes §28.3 quota`, () => {
      const p = applyAutoLoadout(def.id, 5, 3);
      expect(validateLoadoutPreset(p).ok).toBe(true);
    });
  }
});

describe("§28.4 组合技开闸 canPlay", () => {
  it("unlocks assist school cards when cross-school assist active", () => {
    setLabMode(true);
    setLabTuning({ rulesCombo: true, rulesV2: true });
    let b = startLabBattle({ ...BUILTIN_PRESETS[0]!, party: ["rail", "blade"], fieldMate: "rail" }, true);
    b = {
      ...b,
      labAssistActive: "blade",
      labAssistPos: b.player.pos + 1,
      energy: 9,
      hand: [{ uid: "t-cut", defId: "cut" }],
    };
    b.enemy.pos = b.player.pos + 2; // §31.11 距离闸：刀打到 2 格
    expect(isComboUnlockCard(b, "cut")).toBe(true);
    expect(canPlay(b, "t-cut").ok).toBe(true);
  });

  it("same-school assist does not mark combo unlock", () => {
    setLabMode(true);
    setLabTuning({ rulesCombo: true, rulesV2: true });
    let b = startLabBattle({ ...BUILTIN_PRESETS[0]!, party: ["rail", "hermit"], fieldMate: "rail" }, true);
    b = {
      ...b,
      labAssistActive: "hermit",
      labAssistPos: b.player.pos + 1,
      energy: 9,
      hand: [{ uid: "t-strike", defId: "strike" }],
    };
    expect(isComboUnlockCard(b, "strike")).toBe(false);
  });

  it("blocks off-school card without assist", () => {
    setLabMode(true);
    setLabTuning({ rulesV2: true });
    const b = startLabBattle({ ...BUILTIN_PRESETS[0]!, party: ["rail"], fieldMate: "rail" }, true);
    const gate = canPlay(
      {
        ...b,
        energy: 9,
        hand: [{ uid: "t-cut", defId: "cut" }],
      },
      "t-cut",
    );
    expect(gate.ok).toBe(false);
  });
});

describe("§28 + 阶段0 发牌", () => {
  it("ordered=false avoids 3+ consecutive same id in first 12 draws", () => {
    setLabMode(true);
    setLabTuning({ deckMultiplier: 5 });
    const p = applyAutoLoadout("t1-four-palm", 5, 1);
    const b = startLabBattle(p, false);
    const seq: string[] = [];
    for (const c of b.hand) seq.push(c.defId);
    let cur = { ...b };
    while (seq.length < 12 && (cur.drawPile.length > 0 || cur.discardPile.length > 0)) {
      const copy = structuredClone(cur);
      if (!drawOneCard(copy)) break;
      seq.push(copy.hand[copy.hand.length - 1]!.defId);
      cur = copy;
    }
    expect(seq.length).toBeGreaterThanOrEqual(12);
    expect(maxConsecutiveSame(seq.slice(0, 12))).toBeLessThan(3);
  });

  it("recycles discard in order when orderedDeal true", () => {
    setLabMode(true);
    const b = startLabBattle(BUILTIN_PRESETS[0]!, true);
    b.discardPile = [
      { uid: "d1", defId: "strike" },
      { uid: "d2", defId: "push" },
      { uid: "d3", defId: "defend" },
    ];
    b.drawPile = [];
    b.hand = [];
    drawOneCard(b);
    expect(b.drawPile.map((c) => c.uid)).toEqual(["d2", "d3"]);
    expect(b.hand[0]?.uid).toBe("d1");
  });

  it("recycles discard shuffled when orderedDeal false", () => {
    setLabMode(true);
    const mk = (ordered: boolean, randomFn?: () => number) => {
      if (randomFn) vi.spyOn(Math, "random").mockImplementation(randomFn);
      const b = startLabBattle(BUILTIN_PRESETS[0]!, ordered);
      b.orderedDeal = ordered;
      b.discardPile = [
        { uid: "d1", defId: "strike" },
        { uid: "d2", defId: "push" },
        { uid: "d3", defId: "defend" },
      ];
      b.drawPile = [];
      b.hand = [];
      drawOneCard(b);
      const order = [...b.hand, ...b.drawPile].map((c) => c.uid).join(",");
      vi.restoreAllMocks();
      return order;
    };
    expect(mk(true)).toBe("d1,d2,d3");
    let shuffled = false;
    for (let seed = 1; seed <= 30; seed++) {
      const order = mk(false, () => (seed * 0.17) % 1);
      if (order !== "d1,d2,d3") {
        shuffled = true;
        break;
      }
    }
    expect(shuffled).toBe(true);
  });
});
