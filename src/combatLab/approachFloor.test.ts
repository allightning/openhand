import { afterEach, describe, expect, it } from "vitest";
import { CLIMB_APPROACH_EXTRA } from "../game/climbCaps";
import { buildFoeKit, foeKitSeed, kitRng } from "../game/foeArchetype";
import { makeRun } from "../game/run";
import {
  applyClimbOpeningPositions,
  applyLabEnemyKit,
  battleHandCap,
  commitFoeKit,
  endTurn,
  enemyReach,
  labDiscardCard,
  makeBattle,
  needsDiscardToHandCap,
  sealFoeApproach,
  setBattleRng,
} from "../game/sim";
import type { Battle, Intent } from "../game/types";
import { climbTestContext } from "./testContext";

const rc = climbTestContext();
const ENEMY = "mob_escortBand_05";

afterEach(() => setBattleRng(null));

function approachSegment(intent: Intent): boolean {
  return (
    intent.kind === "advance" ||
    intent.kind === "pull" ||
    intent.kind === "lunge" ||
    intent.kind === "charge" ||
    intent.kind === "swap"
  );
}

function approachLen(intent: Intent): number {
  if (intent.kind === "advance" || intent.kind === "pull" || intent.kind === "charge") return intent.steps;
  if (intent.kind === "lunge" || intent.kind === "swap") return 1;
  return 0;
}

function shiftNet(queue: Intent[]): number {
  let net = 0;
  for (const it of queue) {
    net += approachLen(it);
    if (it.kind === "retreat") net -= it.steps;
  }
  return net;
}

function approachAfterRetreat(queue: Intent[]): boolean {
  let last = -1;
  for (let i = 0; i < queue.length; i++) if (queue[i]?.kind === "retreat") last = i;
  if (last < 0) return false;
  return queue.slice(last + 1).some(approachSegment);
}

function isCancel(queue: Intent[], archetype?: Battle["foeArchetype"]): boolean {
  const hasApproach = queue.some(approachSegment);
  const hasRetreat = queue.some((it) => it.kind === "retreat");
  if (!hasApproach || !hasRetreat || shiftNet(queue) !== 0) return false;
  if (archetype === "skirmish" && approachAfterRetreat(queue)) return false;
  return true;
}

function approachCount(queue: Intent[]): number {
  return queue.filter(approachSegment).length;
}

function stand(b: Battle, foePos: number): void {
  b.player.pos = 0;
  b.enemy.pos = foePos;
  const front = b.foes.find((f) => f.id === b.enemy.id) ?? b.foes[0];
  if (front) front.pos = foePos;
}

function fat(b: Battle): void {
  b.player.hp = 500;
  b.player.maxHp = 500;
  b.enemy.hp = 500;
  b.enemy.maxHp = 500;
  for (const f of b.foes) {
    f.hp = 500;
    f.maxHp = 500;
  }
}

function shed(b: Battle): Battle {
  let next = b;
  let guard = 0;
  while (needsDiscardToHandCap(next, rc) && guard < 12) {
    const cap = battleHandCap(next);
    const toss = next.hand[next.hand.length - 1];
    if (!toss || next.hand.length <= cap) break;
    next = labDiscardCard(next, toss.uid, rc);
    guard += 1;
  }
  return next;
}

function turtleSalts(n: number): number[] {
  const salts: number[] = [];
  for (let salt = 0; salts.length < n && salt < 80; salt++) {
    const kit = buildFoeKit(
      { stage: 9, enemyId: ENEMY, round: 1, salt, elite: true },
      kitRng(foeKitSeed(1, ENEMY, salt)),
    );
    if (kit.archetype === "turtle" && kit.foeVariant?.endsWith(":turtle-shell")) salts.push(salt);
  }
  return salts;
}

function openTurtle(salt: number): Battle {
  const run = makeRun("empty");
  run.openingDist = 5;
  run.foeRound = 1;
  run.foeStage = 9;
  run.foeSalt = salt;
  const b = makeBattle(ENEMY, rc, run, true);
  b.labGauntletStage = 9;
  applyClimbOpeningPositions(b, rc);
  applyLabEnemyKit(b, rc);
  stand(b, 5);
  const kit = buildFoeKit(
    { stage: 9, enemyId: ENEMY, round: 1, salt, elite: true },
    kitRng(foeKitSeed(1, ENEMY, salt)),
  );
  commitFoeKit(b, kit, rc);
  b.foeDistMark = 5;
  b.foeApproachStall = 0;
  fat(b);
  return b;
}

describe("敌意图保底逼近", () => {
  it("龟谱馆 9：10 局里 10 手内敌进入自己的射程，队列不对消", () => {
    const salts = turtleSalts(10);
    expect(salts).toHaveLength(10);
    for (const salt of salts) {
      let b = openTurtle(salt);
      const reach = enemyReach(b, rc);
      const opening = Math.abs(b.player.pos - b.enemy.pos);
      expect(opening).toBeGreaterThan(reach);
      expect(shiftNet(b.intents)).toBeGreaterThanOrEqual(opening - reach);
      expect(isCancel(b.intents, b.foeArchetype)).toBe(false);
      let best = opening;
      const queues: Intent[][] = [b.intents];
      for (let hand = 0; hand < 10 && best > reach; hand++) {
        b = shed(b);
        if (b.phase !== "player") break;
        b = endTurn(b, rc);
        best = Math.min(best, Math.abs(b.player.pos - b.enemy.pos));
        queues.push(b.intents);
      }
      expect(best).toBeLessThanOrEqual(reach);
      for (const q of queues) expect(isCancel(q, "turtle")).toBe(false);
    }
  });

  it("advance2+retreat2 不成对消，净步进得进射程", () => {
    const run = makeRun("empty");
    const b = makeBattle(ENEMY, rc, run, true);
    stand(b, 6);
    b.foeArchetype = "turtle";
    const raw: Intent[] = [
      { kind: "advance", steps: 2 },
      { kind: "retreat", steps: 2 },
      { kind: "guard", block: 6 },
    ];
    const sealed = sealFoeApproach(b, raw, rc, 0);
    const reach = enemyReach(b, rc);
    expect(isCancel(sealed, "turtle")).toBe(false);
    expect(shiftNet(sealed)).toBeGreaterThanOrEqual(6 - reach);
    expect(sealed.some((it) => it.kind === "retreat")).toBe(false);
  });

  it("游走退完还有进势时，净零的进退可以留在射程内", () => {
    const run = makeRun("empty");
    const b = makeBattle(ENEMY, rc, run, true);
    stand(b, 2);
    b.foeArchetype = "skirmish";
    const raw: Intent[] = [
      { kind: "retreat", steps: 2 },
      { kind: "advance", steps: 2 },
    ];
    const sealed = sealFoeApproach(b, raw, rc, 0);
    expect(enemyReach(b, rc)).toBeGreaterThanOrEqual(2);
    expect(sealed).toBe(raw);
    expect(isCancel(sealed, "skirmish")).toBe(false);
  });

  it("连续两手距离没缩，下一队多一段进势", () => {
    setBattleRng(() => 0.3);
    const calm = stuck(0);
    const hot = stuck(1);
    setBattleRng(() => 0.3);
    const afterCalm = endTurn(shed(calm), rc);
    setBattleRng(() => 0.3);
    const afterHot = endTurn(shed(hot), rc);
    expect(approachCount(afterHot.intents)).toBeGreaterThanOrEqual(approachCount(afterCalm.intents) + CLIMB_APPROACH_EXTRA);
  });
});

function stuck(stall: number): Battle {
  const run = makeRun("empty");
  run.openingDist = 5;
  const b = makeBattle(ENEMY, rc, run, true);
  b.labGauntletStage = 9;
  applyClimbOpeningPositions(b, rc);
  applyLabEnemyKit(b, rc);
  stand(b, 6);
  b.intents = [
    { kind: "guard", block: 6 },
    { kind: "guard", block: 6 },
  ];
  b.intent = b.intents[0]!;
  b.foeDistMark = 6;
  b.foeApproachStall = stall;
  fat(b);
  return b;
}
