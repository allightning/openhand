import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { CARDS } from "../game/content";
import { setLabMode, setLabTuning } from "../game/labTuning";
import {
  computeAuras,
  labCanUseItem,
  useLabItem,
  variantBranch,
} from "../game/labV21";
import { AURA_DUO_START_QI } from "../game/labV21Constants";
import { starterGear } from "../game/weapons";
import {
  canPlay,
  cloneBattle,
  playCard,
  previewCard,
} from "../game/sim";
import { startLabBattle } from "./factory";
import { BUILTIN_PRESETS } from "./presets";
import type { Battle, CardId, LabItemId } from "../game/types";

function v2Battle(enemyId: "catcher" | "escort" = "catcher") {
  setLabMode(true);
  setLabTuning({ rulesV2: true, v2Fx: false, v2VariantAi: true, v2Grudge: true });
  return startLabBattle({ ...BUILTIN_PRESETS[0]!, enemyId }, true);
}

function withCard(b: Battle, id: CardId, patch: Partial<Battle> = {}): Battle {
  return {
    ...b,
    hand: [{ uid: "t1", defId: id }],
    energy: 10,
    ...patch,
  };
}

beforeEach(() => {
  setLabMode(true);
  setLabTuning({ rulesV2: true });
});

afterEach(() => {
  setLabMode(false);
});

describe("v2.1 绝招", () => {
  it("blocks ult when qi precondition missing", () => {
    const b = withCard(v2Battle(), "ultQiBurst", { qi: 1 });
    expect(canPlay(b, "t1").ok).toBe(false);
  });

  it("allows ult when qi precondition met", () => {
    const b = withCard(v2Battle(), "ultQiBurst", { qi: 3 });
    b.enemy.pos = b.player.pos + 1; // §31.11 距离闸：贴身才够得着
    expect(canPlay(b, "t1").ok).toBe(true);
  });

  it("pojin ignores ult gate for the turn", () => {
    let b = withCard(v2Battle(), "ultQiBurst", { qi: 0, labItems: ["pojin"] });
    expect(canPlay(b, "t1").ok).toBe(false);
    const used = useLabItem(b, "pojin");
    expect(used.ok).toBe(true);
    b = used.battle!;
    b.enemy.pos = b.player.pos + 1; // §31.11 距离闸
    expect(canPlay(b, "t1").ok).toBe(true);
  });
});

describe("v2.1 变式", () => {
  it("triggers high and low branches on separate plays", () => {
    const def = CARDS.varOverhand;
    const low = v2Battle();
    low.player = { ...low.player, hp: 4, maxHp: 28 };
    expect(variantBranch(def, low)).toBe(null);

    const high = v2Battle();
    high.player = { ...high.player, hp: 26, maxHp: 28 };
    expect(variantBranch(def, high)).toBe("a");

    const back = v2Battle();
    back.player = { ...back.player, hp: 4, maxHp: 28 };
    expect(variantBranch(CARDS.varBackwater, back)).toBe("b");
  });

  it("preview matches play for active variant branch (D4)", () => {
    let b = withCard(v2Battle(), "varOverhand");
    b.player = { ...b.player, hp: 26, maxHp: 28 };
    b.enemy.pos = b.player.pos + 1; // §31.11 距离闸
    const prev = previewCard(b, "t1");
    const played = playCard(cloneBattle(b), "t1");
    expect(prev.enemyHp).toBe(played.enemy.hp);
    expect(prev.legal).toBe(true);
  });
});

describe("v2.1 道具", () => {
  const ALL_ITEMS: LabItemId[] = ["jinchuang", "xiujian", "huiqi", "lianhuan", "pojin"];

  it("each item type usable once when carried", () => {
    for (const item of ALL_ITEMS) {
      let b = v2Battle();
      b = { ...b, labItems: [item], labItemUsedThisTurn: false, energy: 8, player: { ...b.player, hp: Math.max(1, b.player.maxHp - 10) } };
      const hp0 = b.player.hp;
      const r = useLabItem(b, item);
      expect(r.ok).toBe(true);
      b = r.battle!;
      expect(b.labItemUsedThisTurn).toBe(true);
      if (item === "jinchuang") expect(b.player.hp).toBeGreaterThan(hp0);
      if (item === "huiqi") expect(b.energy).toBeGreaterThan(8);
      if (item === "lianhuan") expect(b.labComboPillActive).toBe(true);
      if (item === "pojin") expect(b.labUnlockUltimate).toBe(true);
    }
  });

  it("limits one item per turn and two slots max", () => {
    let b = v2Battle();
    b = { ...b, labItems: ["jinchuang", "huiqi"] };
    expect(b.labItems!.length).toBeLessThanOrEqual(2);
    const first = useLabItem(b, "jinchuang");
    b = first.battle!;
    expect(labCanUseItem(b, "huiqi").ok).toBe(false);
  });
});

describe("v2.5 构成光环（阶梯）", () => {
  it("activates tier 1 with two same-school on whole team", () => {
    const b = startLabBattle(
      { ...BUILTIN_PRESETS[0]!, party: ["rail", "hermit"], fieldMate: "rail", enemyId: "catcher" },
      true,
    );
    const res = computeAuras(b);
    expect(res.schools.find((s) => s.school === "palm")?.tier).toBe(1);
  });

  it("tier 2 at three same-school members", () => {
    const b = startLabBattle(
      {
        ...BUILTIN_PRESETS[0]!,
        party: ["rail", "hermit", "bard"],
        fieldMate: "rail",
        enemyId: "catcher",
        mateWeapons: {
          rail: starterGear("palm"),
          hermit: starterGear("palm"),
          bard: starterGear("palm"),
        },
      },
      true,
    );
    expect(computeAuras(b).schools.find((s) => s.school === "palm")?.tier).toBe(2);
  });

  it("duo hero bench grants start qi without spending action", () => {
    const b = startLabBattle(
      { ...BUILTIN_PRESETS[0]!, party: ["rail", "seer", "sapper"], fieldMate: "rail", enemyId: "catcher" },
      true,
    );
    expect(computeAuras(b).duoHeroes).toBe(true);
    expect(b.qi ?? 0).toBeGreaterThanOrEqual(AURA_DUO_START_QI);
  });
});
