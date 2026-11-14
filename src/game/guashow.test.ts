import { describe, expect, it } from "vitest";
import { climbTestContext } from "../combatLab/testContext";
import {
  CLIMB_BREAK_HURT,
  CLIMB_LIMP_LEECH,
  CLIMB_SPEAR_REJECT_DIST,
  CLIMB_STAFF_PIERCE_NEW,
  CLIMB_STAFF_PIERCE_OLD,
  CLIMB_WINDOW_BASE_HIT,
  CLIMB_WINDOW_QI_BIG,
  CLIMB_WINDOW_QI_SMALL,
} from "./climbCaps";
import { FOE_FAMILY_ARCHETYPE, archetypesForStage, buildFoeKit, deckCap, deckGrowth, foeKitSeed, kitRng } from "./foeArchetype";
import { aggregateStances, buildStanceBoard, noteSegmentRead, publishStance, stanceLine } from "./intentStance";
import { makeRun } from "./run";
import { answerReaction, endTurn, makeBattle, playCard } from "./sim";
import type { CardId, Intent } from "./types";

const rc = climbTestContext();

function arm(id: CardId, school: "palm" | "saber" | "spear" | "sword" | "staff" | "hook" | "dart") {
  const run = makeRun("empty");
  run.weapon = `${school}-a-1`;
  const b = makeBattle("catcher", rc, run, true);
  b.labMateWeapons = { ...(b.labMateWeapons ?? {}), [b.active]: `${school}-a-1` };
  b.holdReaction = true;
  b.energy = 8;
  b.hand.push({ uid: "g1", defId: id });
  return b;
}

describe("过招 P1 反应窗", () => {
  it("耗蓝：大窗 2，小窗 1", () => {
    expect(CLIMB_WINDOW_QI_BIG).toBe(2);
    expect(CLIMB_WINDOW_QI_SMALL).toBe(1);
    expect(CLIMB_SPEAR_REJECT_DIST).toBe(3);
  });

  it("截拳贴脸清蓄力并打出 1 费伤", () => {
    let b = arm("strike", "palm");
    b.player.pos = 0;
    b.enemy.pos = 1;
    b.foeCharge = 3;
    b.intent = { kind: "windup" };
    b.intents = [b.intent];
    const hp = b.enemy.hp;
    b = endTurn(b, rc);
    expect(b.reactionWindow?.kind).toBe("palmCut");
    b = answerReaction(b, true, rc);
    expect(b.foeCharge).toBe(0);
    expect(hp - b.enemy.hp).toBe(CLIMB_WINDOW_BASE_HIT);
  });

  it("断息拦住回蓝，伤等于预回复并扣等量蓝", () => {
    let b = arm("strike", "dart");
    b.intent = { kind: "breathe", amount: 4 };
    b.intents = [b.intent];
    b.enemyEnergy = 9;
    const hp = b.enemy.hp;
    b = endTurn(b, rc);
    expect(b.reactionWindow?.kind).toBe("dartBreath");
    const qi = b.enemyEnergy;
    b = answerReaction(b, true, rc);
    expect(hp - b.enemy.hp).toBe(4);
    expect(qi - b.enemyEnergy).toBe(4);
  });

  it("弹反在第 3 段贴脸：格挡一部分、回敬一部分", () => {
    let b = arm("strike", "saber");
    b.player.pos = 0;
    b.enemy.pos = 1;
    b.meleeHits = 2;
    b.intent = { kind: "strike", damage: 10 };
    b.intents = [b.intent];
    const hp = b.enemy.hp;
    b = endTurn(b, rc);
    expect(b.reactionWindow?.kind).toBe("saberParry");
    b = answerReaction(b, true, rc);
    expect(b.playerBlock).toBeGreaterThan(0);
    expect(hp - b.enemy.hp).toBe(5);
    expect(b.meleeHits ?? 0).toBe(0);
  });

  it("偷势把叠层转成剑势，本段裂创不落地", () => {
    let b = arm("strike", "sword");
    b.player.pos = 0;
    b.enemy.pos = 1;
    b.intent = { kind: "bleedcut", damage: 6, bleed: 2 };
    b.intents = [b.intent];
    b = endTurn(b, rc);
    expect(b.reactionWindow?.kind).toBe("swordSteal");
    b = answerReaction(b, true, rc);
    expect(b.v2SwordChain).toBe(1);
    expect(b.youBleed).toBe(0);
  });

  it("瘸跛拉回并在缴械后吸血", () => {
    let b = arm("hookpull", "hook");
    b.player.pos = 0;
    b.enemy.pos = 1;
    b.wallEnds = "high";
    b.intent = { kind: "retreat", steps: 3 };
    b.intents = [b.intent];
    b = endTurn(b, rc);
    expect(b.reactionWindow?.kind).toBe("hookLimp");
    b = answerReaction(b, true, rc);
    expect(b.enemy.pos).toBe(1);
    expect(b.foeLimp).toBe(true);
    b.foeDisarm = 1;
    b.holdReaction = false;
    const before = b.player.hp;
    b.player.pos = 0;
    b.enemy.pos = 1;
    b.hand.push({ uid: "hit", defId: "strike" });
    b.energy = 8;
    b = playCard(b, "hit", rc);
    expect(b.player.hp).toBeGreaterThan(before);
    expect(b.player.hp - before).toBeGreaterThanOrEqual(Math.floor(1 * CLIMB_LIMP_LEECH));
  });

  it("透棍按已有挡和新增挡打真伤，一回合一次", () => {
    let b = arm("strike", "staff");
    b.enemyBlock = 8;
    b.intent = { kind: "guard", block: 4 };
    b.intents = [b.intent];
    const hp = b.enemy.hp;
    b = endTurn(b, rc);
    expect(b.reactionWindow?.kind).toBe("staffPierce");
    b = answerReaction(b, true, rc);
    const expectDmg = Math.round(8 * CLIMB_STAFF_PIERCE_OLD + 4 * CLIMB_STAFF_PIERCE_NEW);
    expect(hp - b.enemy.hp).toBe(expectDmg);
    expect(b.staffPierceUsed).toBe(true);
  });

  it("虚招段不弹窗", () => {
    let b = arm("strike", "palm");
    b.player.pos = 0;
    b.enemy.pos = 1;
    b.foeCharge = 2;
    b.intent = { kind: "windup" };
    b.intents = [b.intent];
    b.feintMask = [true];
    publishStance(b);
    b = endTurn(b, rc);
    expect(b.reactionWindow).toBeUndefined();
    expect(b.feintShown).toBe(true);
  });

  it("敌蓝归零：下一段灰留，当手受击 +25%", () => {
    const run = makeRun("empty");
    let b = makeBattle("catcher", rc, run, true);
    b.enemyEnergy = 1;
    b.intent = { kind: "guard", block: 1 };
    b.intents = [{ kind: "guard", block: 1 }];
    b = endTurn(b, rc);
    expect(b.foeBreakHurt).toBe(true);
    expect(b.foeGrayNext).toBe(true);
    b.player.pos = 0;
    b.enemy.pos = 1;
    b.enemyBlock = 0;
    b.hand = [{ uid: "br", defId: "strike" }];
    b.energy = 8;
    const foe = b.enemy.hp;
    b = playCard(b, "br", rc);
    const dealt = foe - b.enemy.hp;
    const base = Math.round(dealt / (1 + CLIMB_BREAK_HURT));
    expect(dealt).toBe(Math.max(1, Math.round(base * (1 + CLIMB_BREAK_HURT))));
    b.intent = { kind: "strike", damage: 12 };
    b.intents = [b.intent];
    const php = b.player.hp;
    b = endTurn(b, rc);
    expect(b.log.some((line) => line.includes("灰留"))).toBe(true);
    expect(b.player.hp).toBe(php);
  });
});

describe("过招 P2 架势", () => {
  it("六架势按段归类，聚合成一行", () => {
    const intents: Intent[] = [
      { kind: "strike", damage: 8 },
      { kind: "strike", damage: 8 },
      { kind: "advance", steps: 1 },
      { kind: "retreat", steps: 1 },
      { kind: "guard", block: 4 },
      { kind: "windup" },
      { kind: "dust" },
    ];
    const board = buildStanceBoard(intents, [false, false, false, false, false, false, true]);
    expect(stanceLine(aggregateStances(board))).toBe("伤势 ×2 · 进势 ×1 · 退势 ×1 · 守势 ×1 · 蓄势 ×1 · 诡势 ×1");
    expect(board[6]?.feint).toBe(true);
  });

  it("亮招记下解锁段数，读懂只收真招", () => {
    const run = makeRun("empty");
    const b = makeBattle("catcher", rc, run, true);
    b.intents = [
      { kind: "strike", damage: 4 },
      { kind: "advance", steps: 1 },
    ];
    b.intent = b.intents[0]!;
    b.feintMask = [true, false];
    publishStance(b);
    b.stanceCursor = 0;
    noteSegmentRead(b);
    expect(b.stanceRevealN).toBe(1);
    expect(b.feintShown).toBe(true);
    expect(b.readMoves ?? []).not.toContain("strike");
    b.stanceCursor = 1;
    noteSegmentRead(b);
    expect(b.stanceRevealN).toBe(2);
    expect(b.readMoves).toContain("advance");
  });
});

describe("过招 P3 敌配招", () => {
  it("馆段解锁原型，同轮同敌同盐不变", () => {
    expect(archetypesForStage(1)).toEqual(["brute", "turtle"]);
    expect(archetypesForStage(5)).toContain("assassin");
    expect(archetypesForStage(5)).not.toContain("coach");
    expect(archetypesForStage(8)).toContain("coach");
    const input = { stage: 2, enemyId: "catcher", round: 3, salt: 9 };
    const a = buildFoeKit(input, kitRng(foeKitSeed(3, "catcher", 9)));
    const b = buildFoeKit(input, kitRng(foeKitSeed(3, "catcher", 9)));
    expect(a.cards).toEqual(b.cards);
    expect(a.cards.length).toBeGreaterThanOrEqual(6);
    expect(a.cards.length).toBeLessThanOrEqual(10);
    const other = buildFoeKit({ ...input, round: 4 }, kitRng(foeKitSeed(4, "catcher", 9)));
    expect(foeKitSeed(3, "catcher", 9)).not.toBe(foeKitSeed(4, "catcher", 9));
    expect(other.cards).not.toEqual(a.cards);
  });

  it("成长帽：前期 0，中期 1，座前 2；回合越后越多", () => {
    expect(deckGrowth(2)).toBe(0);
    expect(deckGrowth(5)).toBe(1);
    expect(deckGrowth(10)).toBe(2);
    const early = deckCap(2, 4, 0);
    const mid = deckCap(5, 4, 0);
    const seat = deckCap(10, 4, 0);
    expect(mid - early).toBe(1);
    expect(seat - early).toBe(2);
    expect(deckCap(10, 1, 0)).toBe(early);
  });

  it("精英 6 馆和座前挂三件敌窗；变体只在精英和座前", () => {
    const kit = buildFoeKit(
      { stage: 8, enemyId: "mob", round: 1, salt: 1, elite: true },
      kitRng(foeKitSeed(1, "mob", 1)),
    );
    expect(kit.foeWindows).toEqual(["dismantle", "bind", "read"]);
    expect(kit.foeVariant).toMatch(/^mob:/);
    expect(["brute", "turtle", "skirmish"]).toContain(kit.archetype);
    expect(kit.tags).toEqual({});
    expect(kit.bond).toBeNull();
    expect(kit.aura).toBeNull();
    const plain = buildFoeKit(
      { stage: 8, enemyId: "mob", round: 1, salt: 0, elite: false },
      kitRng(1),
    );
    expect(plain.foeVariant).toBeUndefined();
    if (plain.archetype === "coach") expect(plain.foeWindows).toEqual([]);
  });

  it("族挂载不改目录血", () => {
    expect(FOE_FAMILY_ARCHETYPE.road).toBe("brute");
    expect(FOE_FAMILY_ARCHETYPE.monk).toBe("turtle");
    expect(FOE_FAMILY_ARCHETYPE.rebel).toBe("coach");
  });
});
