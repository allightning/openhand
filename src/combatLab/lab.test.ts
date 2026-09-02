import { describe, expect, it } from "vitest";
import { CARDS, ENEMIES, TECHNIQUES } from "../game/content";
import { GEAR_WEAPONS } from "../game/weapons";
import { ARSENAL_COUNTS } from "./arsenal";
import { autoLoadoutCoverage, applyAutoLoadout } from "./autoLoadouts";
import { runFromPreset, startLabBattle } from "./factory";
import { BUILTIN_PRESETS } from "./presets";
import { labStorageKey } from "./storage";
import { balanceReport, startTelemetry } from "./telemetry";
import { expandDeckRecipe, tryAddToRecipe, tryLearnTech } from "./rules";
import { applyBankerBoost, buildGauntletPreset, createGauntletRun } from "./gauntlet";
import { normalizePreset } from "./draft";
import { escapeHtml } from "./setupUi";
import { clearEntityOverride, setContentOverride } from "../game/labContentOverrides";
import { labEnemy } from "../game/labContent";
import type { LabPreset } from "./types";
import { labCanPlay, labSwapFighter } from "./labCombat";
import { setLabMode, setLabTuning } from "../game/labTuning";
import { applyLabFightScale, canPlay, makeTutorialBattle, playCard, previewCard } from "../game/sim";

describe("Combat Lab arsenal", () => {
  it("exposes full content counts", () => {
    expect(ARSENAL_COUNTS.cards).toBe(Object.keys(CARDS).length);
    expect(ARSENAL_COUNTS.weapons).toBe(GEAR_WEAPONS.length);
    expect(ARSENAL_COUNTS.techniques).toBe(Object.keys(TECHNIQUES).length);
    expect(ARSENAL_COUNTS.enemies).toBe(Object.keys(ENEMIES).length);
    expect(ARSENAL_COUNTS.cards).toBeGreaterThanOrEqual(90);
    expect(ARSENAL_COUNTS.weapons).toBe(60);
  });

  it("uses isolated storage key", () => {
    expect(labStorageKey()).toBe("openhand-combat-lab");
    expect(labStorageKey()).not.toBe("openhand-mingshou");
  });
});

describe("Combat Lab presets", () => {
  it("ships 8–10 built-in scenarios", () => {
    expect(BUILTIN_PRESETS.length).toBeGreaterThanOrEqual(8);
    expect(BUILTIN_PRESETS.length).toBeLessThanOrEqual(11);
  });

  it("starts battles from preset without touching main save shape", () => {
    const preset = BUILTIN_PRESETS[0]!;
    const run = runFromPreset(preset);
    const mult = 5;
    const fieldDeck = run.mateDecks[preset.fieldMate] ?? [];
    expect(fieldDeck.length).toBeGreaterThan(0);
    expect(run.deck.length).toBe(0);
    expect(fieldDeck.length).toBeLessThanOrEqual(preset.deckRecipe.length * mult);
    expect(run.weapon).toBeTruthy();
    setLabMode(true);
    const b = startLabBattle(preset);
    expect(b.enemyId).toBe(preset.enemyId);
    expect(b.hand.length).toBe(5);
    expect(b.labFreshSwap).toBe(false);
    expect(b.orderedDeal).toBe(false);
    setLabMode(false);
  });
});

describe("Combat Lab assembly rules", () => {
  it("caps deck recipe at 20 unique types and expands by multiplier", () => {
    const recipe = BUILTIN_PRESETS[0]!.deckRecipe;
    const expanded = expandDeckRecipe(recipe, 5);
    expect(expanded.length).toBe(recipe.length * 5);
    setLabTuning({ deckMultiplier: 3 });
    const run = runFromPreset(BUILTIN_PRESETS[0]!);
    const fieldDeck = run.mateDecks[BUILTIN_PRESETS[0]!.fieldMate] ?? [];
    expect(fieldDeck.length).toBeGreaterThan(0);
    expect(fieldDeck.length).toBeLessThanOrEqual(recipe.length * 3);
  });

  it("rejects duplicate recipe entries", () => {
    const id = BUILTIN_PRESETS[0]!.deckRecipe[0]!;
    const weapon = runFromPreset(BUILTIN_PRESETS[0]!).weapon;
    const gate = tryAddToRecipe([id], id, weapon);
    expect(gate.ok).toBe(false);
  });

  it("caps tech per mate at 3", () => {
    const ids = Object.keys(TECHNIQUES).slice(0, 4) as import("../game/types").TechniqueId[];
    let list: import("../game/types").TechniqueId[] = [];
    for (const id of ids) {
      const g = tryLearnTech(list, id);
      if (g.ok) list = g.list;
    }
    expect(list.length).toBe(3);
  });

  it("migrates legacy preset fields", () => {
    const legacy = normalizePreset({
      id: "x",
      name: "legacy",
      blurb: "",
      tags: [],
      enemyId: "catcher",
      fieldMate: "rail",
      hero: "rail",
      deck: ["strike", "strike", "defend"],
      weapon: "palm-a-1",
      techniques: ["leftover"],
      party: ["rail"],
      mateWeapons: {},
      mateTechs: {},
    } as LabPreset);
    expect(legacy.deckRecipe).toEqual(["strike", "defend"]);
    expect(legacy.mateTechs.rail).toContain("leftover");
  });
});

describe("Combat Lab entry smoke", () => {
  it("canPlay uid wrapper does not throw after battle start (regression)", () => {
    setLabMode(true);
    setLabTuning({ rulesV2: true, rulesCombo: true });
    const b = startLabBattle(BUILTIN_PRESETS[0]!, true);
    const gate = (uid: string) => labCanPlay(b, uid);
    for (const c of b.hand) {
      expect(() => gate(c.uid)).not.toThrow();
      expect(gate(c.uid).ok).toBeTypeOf("boolean");
    }
    setLabMode(false);
  });

  it("content overrides merge into lab battle entities", () => {
    setLabMode(true);
    setContentOverride("enemies", "catcher", { hp: 99 });
    const def = labEnemy("catcher");
    expect(def.hp).toBe(99);
    clearEntityOverride("enemies", "catcher");
    setLabMode(false);
  });

  it("gauntlet path → school → banker bootstrap does not throw (regression)", () => {
    setLabMode(true);
    setLabTuning({ rulesV2: true });
    for (const path of ["shaolin", "bandit", "court"] as const) {
      let run = createGauntletRun(path, "sword");
      run = applyBankerBoost(run, 2);
      const preset = buildGauntletPreset(run);
      const b = startLabBattle(preset, false, 1);
      expect(b.player.hp).toBeGreaterThan(0);
      expect(run.path).toBe(path);
    }
    setLabMode(false);
  });

  it("gauntlet banker → battle bootstrap does not throw (regression)", () => {
    setLabMode(true);
    setLabTuning({ rulesV2: true });
    let run = createGauntletRun("bandit", "staff");
    run = applyBankerBoost(run, 2);
    const preset = buildGauntletPreset(run);
    const b = startLabBattle(preset, false, 1);
    expect(b.player.hp).toBeGreaterThan(0);
    expect(run.path).toBe("bandit");
    expect(escapeHtml("tip<&>")).toBe("tip&lt;&amp;>");
    setLabMode(false);
  });
});

describe("Combat Lab swap rules", () => {
  it("blocks play after swap except haste cards (v1 rules)", () => {
    setLabMode(true);
    setLabTuning({ rulesV2: false });
    let b = startLabBattle(BUILTIN_PRESETS.find((p) => p.party.length >= 2)!);
    const bench = b.bench[0]?.id;
    if (!bench) return;
    b = labSwapFighter(b, bench);
    expect(b.labFreshSwap).toBe(true);
    const strike = b.hand.find((c) => c.defId === "strike");
    if (strike) expect(labCanPlay(b, strike.uid).ok).toBe(false);
    const haste = b.hand.find((c) => c.defId === "haste" || c.defId === "sidestep");
    if (haste) expect(labCanPlay(b, haste.uid).ok).toBe(canPlay(b, haste.uid).ok);
    setLabMode(false);
    setLabTuning({ rulesV2: true });
  });
});

describe("Combat Lab preview discipline", () => {
  it("preview equals play under lab tuning", () => {
    setLabMode(true);
    setLabTuning({ dmgCoef: 1.35, paceBias: 1, aiAggression: 40 });
    let b = startLabBattle(BUILTIN_PRESETS[0]!, true);
    applyLabFightScale();
    const card = b.hand.find((c) => canPlay(b, c.uid).ok);
    expect(card).toBeTruthy();
    const prev = previewCard(b, card!.uid);
    b = playCard(b, card!.uid);
    expect(b.enemy.hp).toBe(prev.enemyHp);
    expect(b.enemy.pos).toBe(prev.enemyPos);
    expect(b.player.hp).toBe(prev.playerHp);
    setLabMode(false);
  });

  it("main-line tutorial still preview=play when lab mode off", () => {
    setLabMode(false);
    const b = makeTutorialBattle();
    const strike = b.hand.find((c) => c.defId === "strike")!;
    const prev = previewCard(b, strike.uid);
    const after = playCard(b, strike.uid);
    expect(after.enemy.hp).toBe(prev.enemyHp);
  });
});

import { isCardAllowedForWeapon, pruneDeckForWeapon, renderWeaponHint } from "./cardUi";

describe("Combat Lab weapon hint", () => {
  it("renders path skill for jing+ gear", () => {
    const html = renderWeaponHint("saber-a-3");
    expect(html).toContain("路线技");
    expect(html).toContain("贴身");
    expect(html).toContain("可装配");
  });
});

describe("Combat Lab school filter", () => {
  it("allows any and matching school cards only", () => {
    expect(isCardAllowedForWeapon("defend", "sword-b-1")).toBe(true);
    expect(isCardAllowedForWeapon("pierce", "sword-b-1")).toBe(true);
    expect(isCardAllowedForWeapon("cut", "sword-b-1")).toBe(false);
    expect(isCardAllowedForWeapon("strike", "palm-a-1")).toBe(true);
    expect(isCardAllowedForWeapon("cut", "palm-a-1")).toBe(false);
  });

  it("prunes deck when weapon school changes", () => {
    const deck = pruneDeckForWeapon(["strike", "cut", "defend"], "sword-b-1");
    expect(deck).toEqual(["defend"]);
  });

  it("blocks drunkFist for non-palm weapons", () => {
    expect(isCardAllowedForWeapon("drunkFist", "spear-a-3")).toBe(false);
    expect(isCardAllowedForWeapon("drunkFist", "palm-a-1")).toBe(true);
  });
});

describe("Combat Lab auto loadouts", () => {
  it("covers mates, techniques, items, combos, and portraits across 12 teams", () => {
    const cov = autoLoadoutCoverage();
    expect(cov.ok).toBe(true);
    expect(cov.mates).toBe(15);
    expect(cov.techniques).toBe(32);
    expect(cov.items).toBe(5);
    expect(cov.comboCards).toBe(6);
  });

  it("applies weapon grade and tech depth", () => {
    const p1 = applyAutoLoadout("t1-four-palm", 5, 1);
    expect(p1.party).toEqual(["rail", "hermit", "bard", "hooker"]);
    expect(p1.mateWeapons.rail).toBe("palm-a-5");
    expect(p1.mateTechs.rail).toHaveLength(1);
    expect(p1.labItems).toEqual(["huiqi", "jinchuang"]);

    const p2 = applyAutoLoadout("t1-four-palm", 5, 2);
    expect(p2.mateTechs.rail).toHaveLength(2);
    expect(p2.mateTechs.rail![0]).toBe(p1.mateTechs.rail![0]);

    const p3 = applyAutoLoadout("t1-four-palm", 5, 3);
    expect(p3.mateTechs.rail).toHaveLength(3);
    expect(p3.deckRecipe).toHaveLength(20);
  });
});

describe("Combat Lab telemetry", () => {
  it("emits balance report skeleton", () => {
    const tel = startTelemetry({
      presetId: "tutorial",
      presetName: "新手首战",
      designerMode: true,
      startedAt: Date.now(),
    });
    const text = balanceReport(tel);
    expect(text).toContain("踢馆平衡报告");
    expect(text).toContain("预演不符");
    expect(text).toContain("§24 死穴审计");
  });
});
