import { describe, expect, it } from "vitest";
import { climbTestContext, makeTestContext } from "../combatLab/testContext";
import { CLIMB_BURN_DMG as BURN, CLIMB_CHARGE_CAP, climbChargeBurstEq as burstEq, CLIMB_SPEAR_REVERSE_QI } from "./climbCaps";
import { MECH_CARDS } from "./content/cards/mechPool";
import { CARD_REGISTRY } from "./content/cards";
import { makeRun } from "./run";
import { answerReaction, canPlay, endTurn, makeBattle, playCard, yourPace } from "./sim";
import type { CardId } from "./types";

const rc = climbTestContext();

function inject(b: ReturnType<typeof makeBattle>, id: CardId, uid = "mech1") {
  b.hand.push({ uid, defId: id });
  b.energy = Math.max(b.energy, 8);
  return uid;
}

function play(b: ReturnType<typeof makeBattle>, id: CardId) {
  const uid = inject(b, id);
  return playCard(b, uid, rc);
}

describe("mech P1 staff charge", () => {
  it("interest formula: n=1 → 44, n=2 → 88, cap 6", () => {
    expect(burstEq(1)).toBe(44);
    expect(burstEq(2)).toBe(88);
    expect(burstEq(0)).toBe(0);
    expect(CLIMB_CHARGE_CAP).toBe(6);
  });

  it("charge card stacks and does not attack", () => {
    const run = makeRun("empty", "sapper");
    const b = makeBattle("catcher", rc, run, true);
    const hp = b.enemy.hp;
    const after = play(b, "staffSettle");
    expect(after.chargeStacks).toBe(2);
    expect(after.enemy.hp).toBe(hp);
    expect(after.playerBlock).toBeGreaterThanOrEqual(12);
  });

  it("burst spends all stacks for formula damage", () => {
    const run = makeRun("empty", "sapper");
    let b = makeBattle("catcher", rc, run, true);
    b.player.pos = 0;
    b.enemy.pos = 1;
    b = play(b, "staffPrime");
    const hp = b.enemy.hp;
    b = play(b, "staffBurst");
    expect(b.chargeStacks ?? 0).toBe(0);
    expect(hp - b.enemy.hp).toBe(88);
  });
});

describe("mech P2 dart", () => {
  it("keeps dart cards out of the 131 registry", () => {
    expect(Object.keys(CARD_REGISTRY)).toHaveLength(131);
    expect(CARD_REGISTRY.dartFlick).toBeUndefined();
    expect(MECH_CARDS.dartFlick?.school).toBe("dart");
    expect(MECH_CARDS.dartFlick?.damage).toBe(3);
  });

  it("dual form: melee 1-2, ranged 3-6, any 1-6, no dead zone", () => {
    const run = makeRun("empty");
    run.weapon = "dart-a-1";
    const b = makeBattle("catcher", rc, run, true);
    b.labMateWeapons = { ...(b.labMateWeapons ?? {}), [b.active]: "dart-a-1" };
    b.player.pos = 0;
    b.enemy.pos = 4;
    const cut = inject(b, "dartCut", "cut");
    expect(canPlay(b, cut, rc).ok).toBe(false);
    const throwUid = inject(b, "dartThrow", "throw");
    expect(canPlay(b, throwUid, rc).ok).toBe(true);
    b.enemy.pos = 1;
    const flick = inject(b, "dartFlick", "flick");
    expect(canPlay(b, flick, rc).ok).toBe(true);
  });

  it("pin cuts the next enemy displacement then clears", () => {
    const run = makeRun("empty");
    run.weapon = "dart-a-1";
    run.openingDist = 5;
    let b = makeBattle("catcher", rc, run, true);
    b.labMateWeapons = { ...(b.labMateWeapons ?? {}), [b.active]: "dart-a-1" };
    b.player.pos = 0;
    b.enemy.pos = 5;
    b = play(b, "dartPin");
    expect(b.foePin).toBe(2);
    const from = b.enemy.pos;
    b.intent = { kind: "advance", steps: 3 };
    b.intents = [b.intent];
    b = endTurn(b, rc);
    expect(from - b.enemy.pos).toBe(1);
    expect(b.foePin ?? 0).toBe(0);
  });
});

describe("mech P3 env tags", () => {
  it("nowall maps to wallEnds none and skip wall damage", () => {
    const off = makeTestContext({ mode: "climb", lab: false });
    const run = makeRun("empty", "sapper");
    run.envTag = "nowall";
    const b = makeBattle("catcher", off, run, true);
    expect(b.wallEnds).toBe("none");
    b.player.pos = 6;
    b.enemy.pos = 8;
    const hp = b.enemy.hp;
    const uid = inject(b, "push");
    const after = playCard(b, uid, off);
    expect(after.enemy.hp).toBe(hp);
    expect(after.foeStun ?? 0).toBe(0);
  });

  it("burn cells tick X at turn end; gap stays unwired", () => {
    const run = makeRun("empty");
    run.envTag = "burn";
    let b = makeBattle("catcher", rc, run, true);
    expect(b.burnCells).toEqual([4]);
    b.player.pos = 4;
    const php = b.player.hp;
    b.intent = { kind: "guard", block: 1 };
    b.intents = [b.intent];
    b = endTurn(b, rc);
    expect(php - b.player.hp).toBe(BURN);
    const g = makeRun("empty");
    g.envTag = "gap_end";
    const gb = makeBattle("catcher", rc, g, true);
    expect(gb.gapCells).toEqual([]);
  });
});

describe("mech P4 wall package", () => {
  it("staff knock into wall stuns", () => {
    const off = makeTestContext({ mode: "climb", lab: false });
    const run = makeRun("empty", "sapper");
    run.wallSide = "high";
    let b = makeBattle("catcher", off, run, true);
    b.player.pos = 6;
    b.enemy.pos = 8;
    b.wallEnds = "high";
    const hp = b.enemy.hp;
    const uid = inject(b, "push");
    b = playCard(b, uid, off);
    expect(hp - b.enemy.hp).toBeGreaterThanOrEqual(8);
    expect(b.foeStun ?? 0).toBeGreaterThanOrEqual(1);
  });

  it("spear reverse window: 血低于一半 + 背墙, 拒在 3 格并废位移", () => {
    const run = makeRun("empty");
    run.weapon = "spear-a-1";
    run.wallSide = "low";
    run.openingDist = 5;
    let b = makeBattle("catcher", rc, run, true);
    b.labMateWeapons = { ...(b.labMateWeapons ?? {}), [b.active]: "spear-a-1" };
    b.player.pos = 0;
    b.player.hp = Math.floor(b.player.maxHp * 0.4);
    b.enemy.pos = 5;
    b.wallEnds = "low";
    b.holdReaction = true;
    b.energy = 6;
    b.intent = { kind: "advance", steps: 4 };
    b.intents = [b.intent];
    b = endTurn(b, rc);
    expect(b.reactionWindow?.kind).toBe("spearReverse");
    expect(Math.abs(b.enemy.pos - b.player.pos)).toBe(3);
    const qi = b.energy;
    b = answerReaction(b, true, rc);
    expect(b.reactionWindow).toBeUndefined();
    expect(Math.abs(b.enemy.pos - b.player.pos)).toBe(3);
    expect(b.displaceSealed).toBe(true);
    expect(qi - b.energy).toBe(CLIMB_SPEAR_REVERSE_QI);
  });

  it("hook smash swaps, wall hits, counts as pull", () => {
    const run = makeRun("empty");
    run.weapon = "hook-a-1";
    run.wallSide = "low";
    let b = makeBattle("catcher", rc, run, true);
    b.labMateWeapons = { ...(b.labMateWeapons ?? {}), [b.active]: "hook-a-1" };
    b.player.pos = 0;
    b.enemy.pos = 1;
    b.wallEnds = "low";
    const hp = b.enemy.hp;
    const uid = inject(b, "hookpull");
    const gate = canPlay(b, uid, rc);
    expect(gate.ok).toBe(true);
    b = playCard(b, uid, rc);
    expect(b.player.pos).toBe(1);
    expect(b.enemy.pos).toBe(0);
    expect(hp - b.enemy.hp).toBeGreaterThanOrEqual(8);
    expect(b.foeDisarm ?? 0).toBeGreaterThanOrEqual(1);
  });
});
