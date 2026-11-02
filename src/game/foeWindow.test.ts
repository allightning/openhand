import { describe, expect, it } from "vitest";
import { climbTestContext } from "../combatLab/testContext";
import { CARDS } from "./content";
import { buildFoeKit, foeKitSeed, foeWindowChance, kitRng } from "./foeArchetype";
import { makeRun } from "./run";
import { bodyBuildForRole } from "./professions";
import { applySchoolTierOpen, drawOneCard, endTurn, makeBattle, playCard, setBattleRng, labCanComboReplay } from "./sim";
import type { Battle, CardId } from "./types";

const rc = climbTestContext();

function openBattle(): Battle {
  const b = makeBattle("catcher", rc, makeRun("empty"), true);
  b.energy = 20;
  b.playerBlock = 0;
  return b;
}

function arm(b: Battle, archetype: Battle["foeArchetype"] = "assassin"): Battle {
  b.foeWindows = ["dismantle", "bind", "read"];
  b.foeArchetype = archetype;
  b.foeWindowCap = 1;
  return b;
}

function pile(id: CardId, n: number) {
  return Array.from({ length: n }, (_, i) => ({ uid: `${id}-${i}`, defId: id }));
}

function only(b: Battle, hand: Battle["hand"], draw: Battle["drawPile"] = []): Battle {
  b.hand = hand;
  b.drawPile = draw;
  b.discardPile = [];
  return b;
}

describe("敌方反应窗", () => {
  it("拆招接上：伤害减半，回敬 3", () => {
    const plain = openBattle();
    plain.player.pos = 0;
    plain.enemy.pos = 1;
    plain.hand = [{ uid: "st", defId: "strike" }];
    const armed = arm(openBattle());
    armed.player.pos = 0;
    armed.enemy.pos = 1;
    armed.hand = [{ uid: "st", defId: "strike" }];
    const foeBefore = armed.enemy.hp;
    const youBefore = armed.player.hp;
    setBattleRng(() => 0);
    let hit: Battle;
    try {
      hit = playCard(armed, "st", rc);
    } finally {
      setBattleRng(null);
    }
    const quiet = playCard(plain, "st", rc);
    expect(hit.log.join(" ")).toContain("敌拆招");
    expect(hit.log.join(" ")).toContain("回敬 3");
    expect(hit.foeReact).toBeUndefined();
    expect(foeBefore - hit.enemy.hp).toBeLessThan(foeBefore - quiet.enemy.hp);
    expect(youBefore - hit.player.hp).toBe(3);
  });

  it("拆招没接上", () => {
    const b = arm(openBattle());
    b.player.pos = 0;
    b.enemy.pos = 1;
    b.hand = [{ uid: "st", defId: "strike" }];
    const hp = b.player.hp;
    setBattleRng(() => 0.99);
    let after: Battle;
    try {
      after = playCard(b, "st", rc);
    } finally {
      setBattleRng(null);
    }
    expect(after.log.join(" ")).not.toContain("敌拆招");
    expect(after.player.hp).toBe(hp);
    expect(after.foeWindowUsed ?? 0).toBe(0);
  });

  it("拆招帽满不再接", () => {
    const b = arm(openBattle());
    b.foeWindowUsed = 1;
    b.player.pos = 0;
    b.enemy.pos = 1;
    b.hand = [{ uid: "st", defId: "strike" }];
    setBattleRng(() => 0);
    let after: Battle;
    try {
      after = playCard(b, "st", rc);
    } finally {
      setBattleRng(null);
    }
    expect(after.log.join(" ")).not.toContain("敌拆招");
    expect(after.foeWindowUsed).toBe(1);
  });

  it("缠手接上：人不动，剩招少一段", () => {
    const b = arm(openBattle());
    b.player.pos = 2;
    b.enemy.pos = 5;
    b.hand = [{ uid: "mv", defId: "advance" }];
    const queued = b.intents.length;
    setBattleRng(() => 0);
    let after: Battle;
    try {
      after = playCard(b, "mv", rc);
    } finally {
      setBattleRng(null);
    }
    expect(after.player.pos).toBe(2);
    expect(after.log.join(" ")).toContain("敌缠手");
    expect(after.log.join(" ")).toContain("位移作废");
    expect(after.intents.length).toBe(Math.max(0, queued - 1));
  });

  it("缠手没接上，人往前走", () => {
    const b = arm(openBattle());
    b.player.pos = 2;
    b.enemy.pos = 5;
    b.hand = [{ uid: "mv", defId: "advance" }];
    setBattleRng(() => 0.99);
    let after: Battle;
    try {
      after = playCard(b, "mv", rc);
    } finally {
      setBattleRng(null);
    }
    expect(after.player.pos).toBe(3);
    expect(after.log.join(" ")).not.toContain("敌缠手");
  });

  it("缠手帽满，位移照走", () => {
    const b = arm(openBattle());
    b.foeWindowUsed = 1;
    b.player.pos = 2;
    b.enemy.pos = 5;
    b.hand = [{ uid: "mv", defId: "advance" }];
    setBattleRng(() => 0);
    let after: Battle;
    try {
      after = playCard(b, "mv", rc);
    } finally {
      setBattleRng(null);
    }
    expect(after.player.pos).toBe(3);
  });

  it("读破从第三次起减伤，虚招不计数", () => {
    const b = arm(openBattle());
    b.foeWindows = ["read"];
    b.labMateWeapons = { rail: "sword-a-1" };
    b.player.pos = 0;
    b.enemy.pos = 1;
    b.hand = [
      { uid: "a", defId: "hitSword" },
      { uid: "b", defId: "hitSword" },
      { uid: "c", defId: "hitSword" },
    ];
    setBattleRng(() => 0);
    let after = b;
    try {
      after = playCard(after, "a", rc);
      after = playCard(after, "b", rc);
      expect(after.foeReadCards ?? []).not.toContain("hitSword");
      after = playCard(after, "c", rc);
    } finally {
      setBattleRng(null);
    }
    expect(after.foeReadCards).toContain("hitSword");
    expect(after.log.join(" ")).toContain("敌读破");
    expect(after.foeWindowUsed).toBe(1);
    const again = arm(openBattle());
    again.labMateWeapons = { rail: "sword-a-1" };
    again.foeReadCards = ["hitSword"];
    again.foeWindowUsed = 1;
    again.player.pos = 0;
    again.enemy.pos = 1;
    again.hand = [{ uid: "d", defId: "hitSword" }];
    const twin = openBattle();
    twin.labMateWeapons = { rail: "sword-a-1" };
    twin.player.pos = 0;
    twin.enemy.pos = 1;
    twin.hand = [{ uid: "d", defId: "hitSword" }];
    const readHit = playCard(again, "d", rc);
    const full = playCard(twin, "d", rc);
    expect(again.enemy.hp - readHit.enemy.hp).toBeLessThan(twin.enemy.hp - full.enemy.hp);

    const def = CARDS.hitSword;
    const prev = def.tags;
    def.tags = [...(prev ?? []), "虚招"];
    const feint = arm(openBattle());
    feint.foeWindows = ["read"];
    feint.player.pos = 0;
    feint.enemy.pos = 1;
    feint.hand = [
      { uid: "a", defId: "hitSword" },
      { uid: "b", defId: "hitSword" },
      { uid: "c", defId: "hitSword" },
    ];
    setBattleRng(() => 0);
    try {
      let stepped = playCard(feint, "a", rc);
      stepped = playCard(stepped, "b", rc);
      stepped = playCard(stepped, "c", rc);
      expect(stepped.foeReadCards ?? []).not.toContain("hitSword");
    } finally {
      def.tags = prev;
      setBattleRng(null);
    }
  });

  it("精英 6 馆起各原型有窗，杂兵没有，座前帽 2", () => {
    const elite = buildFoeKit({ stage: 6, enemyId: "mob", round: 1, salt: 1, elite: true }, kitRng(foeKitSeed(1, "mob", 1)));
    expect(elite.foeWindows).toEqual(["dismantle", "bind", "read"]);
    expect(elite.windowCap).toBe(1);
    const mob = buildFoeKit({ stage: 8, enemyId: "mob", round: 1, salt: 2, elite: false }, kitRng(3));
    expect(mob.foeWindows).toEqual([]);
    expect(buildFoeKit({ stage: 4, enemyId: "mob", round: 1, salt: 4, elite: true }, () => 0).foeWindows).toEqual([]);
    const seat = buildFoeKit({ stage: 10, enemyId: "mob", round: 1, salt: 5, elite: false, seat: true }, () => 0);
    expect(seat.foeWindows).toEqual(["dismantle", "bind", "read"]);
    expect(seat.windowCap).toBe(2);
    expect(foeWindowChance("assassin")).toBeGreaterThan(foeWindowChance("coach"));
    expect(foeWindowChance("coach")).toBeGreaterThan(foeWindowChance("skirmish"));
    expect(foeWindowChance("skirmish")).toBeGreaterThan(foeWindowChance("brute"));
    expect(foeWindowChance("brute")).toBe(foeWindowChance("turtle"));
  });

  it("贴身条件抽：距 2 以内才进手", () => {
    const def = CARDS.gather;
    const prev = def.drawWhen;
    def.drawWhen = "closeQuarters";
    try {
      const far = openBattle();
      far.player.pos = 0;
      far.enemy.pos = 4;
      far.hand = [];
      far.drawPile = [{ uid: "g", defId: "gather" }];
      expect(drawOneCard(far)).toBe(false);
      const near = openBattle();
      near.player.pos = 0;
      near.enemy.pos = 2;
      near.hand = [];
      near.drawPile = [{ uid: "g", defId: "gather" }];
      expect(drawOneCard(near)).toBe(true);
    } finally {
      def.drawWhen = prev;
    }
  });

  it("身板行者认 skirmish", () => {
    expect(bodyBuildForRole("skirmish")).toBe("walker");
  });
});

describe("牌意四档七档", () => {
  it("拳：首次击退多 1 格，七档重放花 1 层", () => {
    const low = only(openBattle(), [{ uid: "pu", defId: "push" }], pile("hitPalm", 3));
    low.player.pos = 0;
    low.enemy.pos = 1;
    const nudged = playCard(low, "pu", rc);
    const bare = only(openBattle(), [{ uid: "pu", defId: "push" }]);
    bare.player.pos = 0;
    bare.enemy.pos = 1;
    const plain = playCard(bare, "pu", rc);
    expect(nudged.enemy.pos).toBe(plain.enemy.pos + 1);

    const replay = only(openBattle(), [], pile("hitPalm", 7));
    replay.combo = 1;
    replay.climbLastAttackId = "hitPalm";
    expect(labCanComboReplay(replay, rc).ok).toBe(true);
    const poor = only(openBattle(), []);
    poor.combo = 1;
    poor.climbLastAttackId = "hitPalm";
    expect(labCanComboReplay(poor, rc).ok).toBe(false);
  });

  it("刀：首次裂创多 1，七档贴身多 1 伤", () => {
    const run = makeRun("empty");
    run.party = ["watch"];
    run.active = "watch";
    const low = makeBattle("catcher", rc, run, true);
    low.energy = 20;
    low.player.pos = 0;
    low.enemy.pos = 1;
    low.hand = [{ uid: "sb", defId: "hitSaber" }];
    low.drawPile = pile("cut", 3);
    const bareRun = makeRun("empty");
    bareRun.party = ["watch"];
    bareRun.active = "watch";
    const bare = makeBattle("catcher", rc, bareRun, true);
    bare.energy = 20;
    bare.player.pos = 0;
    bare.enemy.pos = 1;
    bare.hand = [{ uid: "sb", defId: "hitSaber" }];
    const withTier = playCard(low, "sb", rc);
    const without = playCard(bare, "sb", rc);
    expect(withTier.bleed).toBe(without.bleed + 1);

    const mid = makeBattle("catcher", rc, run, true);
    mid.energy = 20;
    mid.player.pos = 0;
    mid.enemy.pos = 1;
    mid.hand = [{ uid: "sb", defId: "hitSaber" }];
    mid.drawPile = pile("cut", 6);
    mid.tierSaberBled = true;
    const hit = playCard(mid, "sb", rc);
    const calm = makeBattle("catcher", rc, bareRun, true);
    calm.energy = 20;
    calm.player.pos = 0;
    calm.enemy.pos = 1;
    calm.hand = [{ uid: "sb", defId: "hitSaber" }];
    calm.tierSaberBled = true;
    const base = playCard(calm, "sb", rc);
    expect(mid.enemy.hp - hit.enemy.hp).toBe(calm.enemy.hp - base.enemy.hp + 1);
  });

  it("剑：四档开场剑势，七档破绽多留一击", () => {
    const opened = only(openBattle(), [], pile("hitSword", 4));
    opened.labMateWeapons = { rail: "sword-a-1" };
    opened.v2SwordChain = 0;
    applySchoolTierOpen(opened, rc);
    expect(opened.v2SwordChain ?? 0).toBeGreaterThanOrEqual(1);

    const mid = only(openBattle(), [
      { uid: "a", defId: "hitSword" },
      { uid: "b", defId: "hitSword" },
    ], pile("hitSword", 5));
    mid.labMateWeapons = { rail: "sword-a-1" };
    mid.energy = 20;
    mid.player.pos = 0;
    mid.enemy.pos = 1;
    let stepped = playCard(mid, "a", rc);
    stepped = playCard(stepped, "b", rc);
    expect(stepped.expose).toBeGreaterThan(0);
  });

  it("枪：四档远档多 1，七档断劲后下一段少 2", () => {
    const run = makeRun("empty");
    run.party = ["huochangchuan"];
    run.active = "huochangchuan";
    const low = makeBattle("catcher", rc, run, true);
    low.energy = 20;
    low.player.pos = 0;
    low.enemy.pos = 3;
    only(low, [{ uid: "th", defId: "thrust" }], pile("thrust", 3));
    const bare = makeBattle("catcher", rc, run, true);
    bare.energy = 20;
    bare.player.pos = 0;
    bare.enemy.pos = 3;
    only(bare, [{ uid: "th", defId: "thrust" }]);
    const far = playCard(low, "th", rc);
    const near = playCard(bare, "th", rc);
    expect(low.enemy.hp - far.enemy.hp).toBe(bare.enemy.hp - near.enemy.hp + 1);

    const mid = makeBattle("catcher", rc, run, true);
    mid.energy = 20;
    mid.player.pos = 0;
    mid.enemy.pos = 3;
    mid.enemyEnergy = 10;
    only(mid, [
      { uid: "a", defId: "thrust" },
      { uid: "b", defId: "thrust" },
    ], pile("thrust", 5));
    let cut = playCard(mid, "a", rc);
    cut.energy = 20;
    cut.player.pos = 0;
    cut.enemy.pos = 4;
    cut = playCard(cut, "b", rc);
    expect(cut.foeNextHurtCut).toBe(2);
    const hp = cut.player.hp;
    cut.playerBlock = 0;
    cut.intent = { kind: "strike", damage: 8 };
    cut.intents = [cut.intent];
    const ended = endTurn(cut, rc);
    expect(hp - ended.player.hp).toBeLessThan(8);
  });

  it("棍：四档开场蓄力，七档撞壁多 2", () => {
    const opened = only(openBattle(), [], pile("staffPrime", 4));
    opened.labMateWeapons = { rail: "staff-a-1" };
    opened.chargeStacks = 0;
    applySchoolTierOpen(opened, rc);
    expect(opened.chargeStacks ?? 0).toBeGreaterThanOrEqual(1);

    const over = climbTestContext();
    over.contentOverrides = {
      ...over.contentOverrides,
      cards: { ...over.contentOverrides.cards, statusStaff: { knock: 1 } },
    };
    const mid = only(makeBattle("catcher", over, makeRun("empty"), true), [{ uid: "pl", defId: "statusStaff" }], pile("statusStaff", 6));
    mid.labMateWeapons = { rail: "staff-a-1" };
    mid.energy = 20;
    mid.player.pos = 7;
    mid.enemy.pos = 8;
    const crashed = playCard(mid, "pl", over);
    const lone = only(makeBattle("catcher", over, makeRun("empty"), true), [{ uid: "pl", defId: "statusStaff" }]);
    lone.labMateWeapons = { rail: "staff-a-1" };
    lone.energy = 20;
    lone.player.pos = 7;
    lone.enemy.pos = 8;
    const soft = playCard(lone, "pl", over);
    expect(mid.enemy.hp - crashed.enemy.hp).toBe(lone.enemy.hp - soft.enemy.hp + 2);
  });

  it("钩：四档缴械多 1 息，七档噬血封顶 50%", () => {
    const run = makeRun("empty");
    run.party = ["moqiwan"];
    run.active = "moqiwan";
    const low = makeBattle("catcher", rc, run, true);
    low.energy = 20;
    low.player.pos = 0;
    low.enemy.pos = 2;
    low.hand = [{ uid: "hp", defId: "hookpull" }];
    low.drawPile = pile("hookpull", 3);
    const pulled = playCard(low, "hp", rc);
    expect(pulled.foeDisarm).toBeGreaterThanOrEqual(2);

    const over = climbTestContext();
    over.contentOverrides = {
      ...over.contentOverrides,
      cards: { ...over.contentOverrides.cards, hitHook: { damage: 7 } },
    };
    const mid = makeBattle("catcher", over, run, true);
    mid.energy = 20;
    mid.player.pos = 0;
    mid.enemy.pos = 1;
    mid.player.hp = mid.player.maxHp - 10;
    mid.foeDisarm = 1;
    mid.hand = [{ uid: "hk", defId: "hitHook" }];
    mid.drawPile = pile("hitHook", 6);
    const drank = playCard(mid, "hk", over);
    const bare = makeBattle("catcher", over, run, true);
    bare.energy = 20;
    bare.player.pos = 0;
    bare.enemy.pos = 1;
    bare.player.hp = bare.player.maxHp - 10;
    bare.foeDisarm = 1;
    bare.hand = [{ uid: "hk", defId: "hitHook" }];
    const sip = playCard(bare, "hk", over);
    expect(drank.player.hp - (mid.player.maxHp - 10)).toBe(sip.player.hp - (bare.player.maxHp - 10) + 1);
  });

  it("飞刀：四档钉帽加 2，七档远战多钉 1", () => {
    const run = makeRun("empty");
    run.party = ["watch"];
    run.active = "watch";
    const low = makeBattle("catcher", rc, run, true);
    low.labMateWeapons = { watch: "dart-a-1" };
    low.energy = 20;
    low.foePin = 6;
    low.player.pos = 0;
    low.enemy.pos = 1;
    low.hand = [{ uid: "df", defId: "dartFlick" }];
    low.drawPile = pile("dartFlick", 3);
    const pinned = playCard(low, "df", rc);
    expect(pinned.foePin).toBe(7);

    const mid = makeBattle("catcher", rc, run, true);
    mid.labMateWeapons = { watch: "dart-a-1" };
    mid.energy = 20;
    mid.player.pos = 0;
    mid.enemy.pos = 4;
    mid.hand = [{ uid: "th", defId: "dartThrow" }];
    mid.drawPile = pile("dartThrow", 6);
    const thrown = playCard(mid, "th", rc);
    expect(thrown.foePin).toBe(2);
  });
});
