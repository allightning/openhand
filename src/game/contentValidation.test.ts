import { describe, expect, it } from "vitest";
import { isBossEnemy, isEliteEnemy } from "./labEnemyStress";
import { ALL_MIND_ART_IDS } from "./mindArts";
import { auraCardId, ROGUE_SCHOOLS, wardCardId } from "./rogueCards";
import { CARDS, ENEMIES, HEARTS, TECHNIQUES } from "./content";
import { CARDS as LEGACY_CARDS } from "./content/legacy";
import { CARD_HOLDS, CARD_REGISTRY, cardProblems, type CardDef } from "./content/cards";
import { ENEMY_HOLDS, ENEMY_REGISTRY, linkProblems } from "./content/enemies";
import { CHARM_HOLDS, CHARM_REGISTRY } from "./content/charms";
import { ITEM_HOLDS, ITEM_REGISTRY } from "./content/items";
import { HEART_HOLDS, HEART_REGISTRY, MIND_HOLDS, MIND_REGISTRY } from "./content/mindArts";
import { TECHNIQUE_HOLDS, TECHNIQUE_REGISTRY } from "./content/techniques";
import { CARD_KINDS } from "./content/hooks";

const NAMED_HOLDS = ["backpalm", "weave", "retreat", "cauterize", "peonyBrew", "lateWard", "close", "plant"];

function hold(id: string) {
  const found = CARD_HOLDS.find((item) => item.row.id === id);
  expect(found, id).toBeTruthy();
  return found!;
}

describe("内容注册表", () => {
  it("旧路径 re-export 的是同一张牌表", () => {
    expect(CARDS).toBe(LEGACY_CARDS);
  });

  it("注册数等于盘点数，合同仍拦旧数据", () => {
    expect(Object.keys(CARD_REGISTRY)).toHaveLength(Object.keys(CARDS).length);
    for (const id of Object.keys(CARDS)) expect(CARD_REGISTRY[id]?.id).toBe(id);
    const held = new Set(CARD_HOLDS.map((item) => item.row.id));
    for (const row of Object.values(CARD_REGISTRY)) {
      const problems = cardProblems(row);
      if (held.has(row.id)) expect(problems.length).toBeGreaterThan(0);
      else expect(problems).toEqual([]);
    }
    for (const item of CARD_HOLDS) expect(item.problems).toEqual(cardProblems(item.row));
  });

  it("0 费、格挡越帽、牌面无数字不准入", () => {
    const held = new Set(CARD_HOLDS.map((item) => item.row.id));
    for (const school of ROGUE_SCHOOLS) {
      expect(held.has(wardCardId(school))).toBe(true);
      expect(held.has(auraCardId(school))).toBe(true);
      expect(hold(wardCardId(school)).problems).toContain("cost");
      expect(hold(auraCardId(school)).row.effectHooks).toContain("aura");
      expect(hold(wardCardId(school)).row.effectHooks).toContain("ward");
    }
    for (const id of NAMED_HOLDS) expect(held.has(id)).toBe(true);
    expect(hold("lateWard").problems).toContain("value:block");
    expect(hold("close").problems).toEqual(["text"]);
    expect(hold("plant").problems).toEqual(["text"]);
    expect(hold("retreat").problems).toContain("cost");
    expect(CARD_HOLDS).toHaveLength(ROGUE_SCHOOLS.length * 2 + NAMED_HOLDS.length);
  });

  it("现行牌的 kind 只有攻和技，七类落在钩子上", () => {
    const rows = Object.values(CARD_REGISTRY);
    expect(rows.some((row) => row.kind === "stance")).toBe(false);
    expect(rows.some((row) => row.effectHooks.includes("resonance"))).toBe(false);
    expect(CARD_KINDS).toEqual(["attack", "skill", "stance"]);
    expect(CARD_REGISTRY.strike).toEqual({
      id: "strike",
      cost: 1,
      school: "any",
      kind: "attack",
      effectHooks: ["damage"],
      values: { damage: 5 },
      text: "造成 5 点伤害。",
    });
    expect(CARD_REGISTRY.sidestep?.effectHooks).toContain("swap");
    expect(CARD_REGISTRY.ultPalm?.effectHooks).toContain("ultimate");
    expect(CARD_REGISTRY.comboPalm?.effectHooks).toEqual(expect.arrayContaining(["combo", "assist"]));
    expect(CARD_REGISTRY.fusePalmSaber?.kind).toBe("attack");
    expect(CARD_REGISTRY.fusePalmSaber?.effectHooks).toEqual(expect.arrayContaining(["fuse", "damage"]));
  });

  it("外功、心法、旧心法按同构字段准入", () => {
    expect(TECHNIQUE_HOLDS).toEqual([]);
    expect(Object.keys(TECHNIQUE_REGISTRY)).toHaveLength(Object.keys(TECHNIQUES).length);
    expect(TECHNIQUE_REGISTRY.longPush).toMatchObject({
      cost: 1,
      school: "any",
      kind: "technique",
      effectHooks: ["knock"],
      values: { knock: 1 },
    });
    expect(MIND_HOLDS).toEqual([]);
    expect(Object.keys(MIND_REGISTRY)).toHaveLength(ALL_MIND_ART_IDS.length);
    expect(MIND_REGISTRY.ironBreath).toMatchObject({
      cost: 1,
      kind: "mind",
      effectHooks: ["mind"],
      values: { hpMax: 30 },
    });
    expect(HEART_HOLDS).toEqual([]);
    expect(Object.keys(HEART_REGISTRY)).toHaveLength(Object.keys(HEARTS).length);
    expect(HEART_REGISTRY.breath?.effectHooks).toEqual(["heart"]);
    expect(CHARM_HOLDS).toEqual([]);
    expect(Object.keys(CHARM_REGISTRY)).toHaveLength(6);
    expect(CHARM_REGISTRY.aidSaber).toMatchObject({
      cost: 1,
      school: "saber",
      kind: "charm",
      values: { hpBase: 8, expose: 2 },
    });
    expect(CHARM_REGISTRY.aidPalm?.text).toMatch(/[0-9]/);
    expect(ITEM_HOLDS).toEqual([]);
    expect(Object.keys(ITEM_REGISTRY)).toHaveLength(6);
    expect(ITEM_REGISTRY.jinchuang).toMatchObject({ cost: 1, kind: "item", values: { healPct: 32 } });
    expect(ITEM_REGISTRY.deathSquad?.values.damage).toBe(8);
    expect(ITEM_REGISTRY.pojin?.text).toMatch(/[0-9]/);
  });

  it("敌人档位、意图钩子、外功与绝式引用都在", () => {
    expect(ENEMY_HOLDS).toEqual([]);
    const cards = new Set(Object.keys(CARDS));
    for (const [id, enemy] of Object.entries(ENEMIES)) {
      const row = ENEMY_REGISTRY[id];
      expect(row, id).toBeTruthy();
      const kind = isBossEnemy(id) ? "boss" : isEliteEnemy(id) ? "elite" : "mob";
      expect(row?.kind).toBe(kind);
      expect(row?.cost).toBe(kind === "boss" ? 3 : kind === "elite" ? 2 : 1);
      expect(linkProblems(enemy, cards)).toEqual([]);
    }
    expect(ENEMY_REGISTRY.catcher).toMatchObject({
      cost: 1,
      school: "saber",
      kind: "mob",
      effectHooks: ["breathe", "guard", "strike"],
      values: { hp: 56 },
      text: "亮刀",
    });
    expect(ENEMY_REGISTRY.bandit?.kind).toBe("elite");
    expect(ENEMY_REGISTRY.lord?.kind).toBe("boss");
    expect(ENEMY_REGISTRY.twin?.kind).toBe("boss");
  });

  it("各表 id 不撞", () => {
    const ids = [
      ...Object.keys(CARD_REGISTRY),
      ...Object.keys(ENEMY_REGISTRY),
      ...Object.keys(TECHNIQUE_REGISTRY),
      ...Object.keys(MIND_REGISTRY),
      ...Object.keys(HEART_REGISTRY),
      ...Object.keys(CHARM_REGISTRY),
      ...Object.keys(ITEM_REGISTRY),
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("坏数据必红，删掉即绿", () => {
    const good = CARD_REGISTRY.strike as CardDef;
    const bad: CardDef = {
      ...good,
      id: "badProbe" as CardDef["id"],
      cost: 0,
      effectHooks: ["noSuchHook" as CardDef["effectHooks"][number]],
      values: { block: 99, swordChain: 9 },
      text: "没有数字",
    };
    const badProblems = cardProblems(bad);
    expect(badProblems).toEqual(expect.arrayContaining(["cost", "hook:noSuchHook", "value:block", "value:swordChain", "text"]));
    const kept = [good, bad].filter((row) => cardProblems(row).length === 0);
    expect(kept).toEqual([good]);
    expect(cardProblems(good)).toEqual([]);
  });

  it("架势类 kind 合法，绝招当 kind 不合法", () => {
    const stance: CardDef = {
      id: "stanceProbe" as CardDef["id"],
      cost: 1,
      school: "sword",
      kind: "stance",
      effectHooks: ["block"],
      values: { block: 4 },
      text: "格挡 4。",
    };
    expect(cardProblems(stance)).toEqual([]);
    expect(cardProblems({ ...stance, kind: "ultimate" as CardDef["kind"] })).toContain("kind");
    expect(linkProblems(
      { remnant: "nope", pattern: [{ kind: "sig", id: "nope" }] },
      new Set(Object.keys(CARDS)),
      ["nope"],
    )).toEqual(["remnant:nope", "sig:nope", "card:nope"]);
  });
});
