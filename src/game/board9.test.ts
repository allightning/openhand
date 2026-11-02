import { describe, expect, it } from "vitest";
import { applyClimbOpeningPositions, endTurn, makeBattle, occupied, playCard } from "./sim";
import { addStake, stakeHitsAt } from "./stake";
import { makeRun } from "./run";
import { climbTestContext, makeTestContext } from "../combatLab/testContext";
import type { Battle, CardId, Intent, Run, WallSide } from "./types";
import type { RunContext } from "./runContext";

function rcClimb(lab = false): RunContext {
  return makeTestContext({ mode: "climb", lab });
}

function open(side?: WallSide, dist?: number, lab = false): { b: Battle; rc: RunContext } {
  const run = makeRun("empty");
  if (side) run.wallSide = side;
  if (dist != null) run.openingDist = dist;
  const rc = rcClimb(lab);
  return { b: makeBattle("catcher", rc, run), rc };
}

function stand(b: Battle, you: number, foe: number): void {
  b.player.pos = you;
  b.enemy.pos = foe;
  const front = b.foes.find((f) => f.id === b.enemy.id);
  if (front) front.pos = foe;
}

function cast(b: Battle, rc: RunContext, defId: CardId): Battle {
  const uid = `probe-${defId}`;
  b.energy = 20;
  b.hand = [{ uid, defId }, ...b.hand.filter((c) => c.uid !== uid)];
  return playCard(b, uid, rc);
}

function foeAct(b: Battle, rc: RunContext, intent: Intent): Battle {
  b.intent = intent;
  b.intents = [intent];
  b.enemyEnergy = 20;
  return endTurn(b, rc);
}

describe("石台 2.0 · 墙", () => {
  it("九格都能站人", () => {
    const { b, rc } = open();
    expect(b.boardSize).toBe(9);
    stand(b, 6, 4);
    const walked = cast(b, rc, "retreat");
    expect(walked.player.pos).toBe(8);
    stand(walked, 0, 8);
    for (let i = 0; i < 9; i++) expect(occupied(walked, i, rc)).toBe(i === 0 || i === 8);
  });

  it("高侧出界扣撞壁，低侧出界停在边格", () => {
    const { b, rc } = open("high");
    const hp = b.enemy.hp;
    stand(b, 5, 7);
    const high = cast(b, rc, "push");
    expect(high.enemy.pos).toBe(8);
    expect(high.enemy.hp).toBe(hp - 9);
    expect(high.log.some((line) => line.includes("撞壁 9"))).toBe(true);

    const { b: lowB, rc: lowRc } = open("high");
    const lowHp = lowB.enemy.hp;
    stand(lowB, 4, 1);
    const low = cast(lowB, lowRc, "push");
    expect(low.enemy.pos).toBe(0);
    expect(low.enemy.hp).toBe(lowHp);
    expect(low.log.some((line) => line.includes("撞壁"))).toBe(false);
  });

  it("低侧有墙才扣，无墙场两端都不扣", () => {
    const { b, rc } = open("low");
    const hp = b.enemy.hp;
    stand(b, 4, 1);
    const hit = cast(b, rc, "push");
    expect(hit.enemy.pos).toBe(0);
    expect(hit.enemy.hp).toBe(hp - 9);
    expect(hit.log.some((line) => line.includes("撞壁 9"))).toBe(true);

    const { b: openB, rc: openRc } = open("low");
    const openHp = openB.enemy.hp;
    stand(openB, 5, 7);
    const miss = cast(openB, openRc, "push");
    expect(miss.enemy.pos).toBe(8);
    expect(miss.enemy.hp).toBe(openHp);
    expect(miss.log.some((line) => line.includes("撞壁"))).toBe(false);

    const { b: noneB, rc: noneRc } = open("none");
    const noneHp = noneB.enemy.hp;
    stand(noneB, 4, 1);
    const down = cast(noneB, noneRc, "push");
    expect(down.enemy.pos).toBe(0);
    expect(down.enemy.hp).toBe(noneHp);
    stand(down, 5, 7);
    const up = cast(down, noneRc, "push");
    expect(up.enemy.pos).toBe(8);
    expect(up.enemy.hp).toBe(noneHp);
    expect(up.log.some((line) => line.includes("撞壁"))).toBe(false);
  });
});

describe("石台 2.0 · 位移", () => {
  const pushLand = [
    { you: 0, foe: 1, land: 3, wall: false },
    { you: 0, foe: 5, land: 7, wall: false },
    { you: 3, foe: 6, land: 8, wall: false },
    { you: 5, foe: 7, land: 8, wall: true },
    { you: 6, foe: 8, land: 8, wall: true },
  ];

  it.each(pushLand)("推宫 $you→$foe 落到 $land", ({ you, foe, land, wall }) => {
    const { b, rc } = open();
    const hp = b.enemy.hp;
    stand(b, you, foe);
    const next = cast(b, rc, "push");
    expect(next.enemy.pos).toBe(land);
    expect(next.enemy.hp).toBe(wall ? hp - 9 : hp);
  });

  it("破门撞壁仍是 10", () => {
    const { b, rc } = open();
    const hp = b.enemy.hp;
    stand(b, 4, 6);
    const next = cast(b, rc, "push2");
    expect(next.enemy.pos).toBe(8);
    expect(next.enemy.hp).toBe(hp - 10);
    expect(next.log.some((line) => line.includes("撞壁 10"))).toBe(true);
  });

  const foePulls = [
    { you: 0, foe: 5, steps: 1, land: 1 },
    { you: 0, foe: 8, steps: 2, land: 2 },
    { you: 2, foe: 8, steps: 3, land: 5 },
    { you: 6, foe: 8, steps: 2, land: 7 },
  ];

  it.each(foePulls)("敌拉 $steps 步，你 $you → $land", ({ you, foe, steps, land }) => {
    const { b, rc } = open();
    stand(b, you, foe);
    const hp = b.player.hp;
    const next = foeAct(b, rc, { kind: "pull", steps });
    expect(next.player.pos).toBe(land);
    expect(next.enemy.pos).toBe(foe);
    expect(next.player.hp).toBe(hp);
  });

  const hookPulls = [
    { you: 0, foe: 5, land: 3 },
    { you: 0, foe: 8, land: 6 },
    { you: 4, foe: 8, land: 6 },
    { you: 6, foe: 8, land: 7 },
  ];

  it.each(hookPulls)("钩挂把敌从 $foe 拉到 $land", ({ you, foe, land }) => {
    const { b, rc } = open();
    stand(b, you, foe);
    const hp = b.enemy.hp;
    const next = cast(b, rc, "hookpull");
    expect(next.enemy.pos).toBe(land);
    expect(next.enemy.hp).toBe(hp - 3);
  });

  const charges = [
    { you: 0, foe: 8, steps: 2, land: 6 },
    { you: 0, foe: 4, steps: 1, land: 3 },
    { you: 0, foe: 5, steps: 3, land: 2 },
    { you: 2, foe: 8, steps: 4, land: 4 },
    { you: 0, foe: 3, steps: 5, land: 1 },
  ];

  it.each(charges)("冲锋 $steps 步，敌 $foe → $land", ({ you, foe, steps, land }) => {
    const { b, rc } = open();
    stand(b, you, foe);
    const next = foeAct(b, rc, { kind: "charge", damage: 0, steps });
    expect(next.enemy.pos).toBe(land);
  });

  it("换位：贴身互换，隔位只近一步", () => {
    const { b, rc } = open();
    stand(b, 4, 5);
    const swapped = foeAct(b, rc, { kind: "swap" });
    expect(swapped.player.pos).toBe(5);
    expect(swapped.enemy.pos).toBe(4);

    const { b: far, rc: farRc } = open();
    stand(far, 2, 7);
    const stepped = foeAct(far, farRc, { kind: "swap" });
    expect(stepped.player.pos).toBe(2);
    expect(stepped.enemy.pos).toBe(6);
  });
});

describe("石台 2.0 · 桩与召唤", () => {
  it("桩能落在旧墙外的格子，并挡住击退", () => {
    const { b, rc } = open();
    stand(b, 6, 8);
    const planted = cast(b, rc, "plant");
    expect(planted.stakes).toEqual([7]);

    const { b: block, rc: blockRc } = open();
    stand(block, 2, 4);
    addStake(block, 6, 1, blockRc);
    const hp = block.enemy.hp;
    const knocked = cast(block, blockRc, "push");
    expect(knocked.enemy.pos).toBe(5);
    expect(knocked.stakes).toEqual([6]);
    expect(knocked.enemy.hp).toBe(hp - 4);
    expect(knocked.log.some((line) => line.includes("桩挡住了"))).toBe(true);
  });

  it("高阶桩要砸两次，贴身砸的是身侧那根", () => {
    const { b, rc } = open();
    stand(b, 5, 8);
    addStake(b, 7, 2, rc);
    const once = cast(b, rc, "strike");
    expect(stakeHitsAt(once, 7)).toBe(1);
    expect(once.enemy.hp).toBe(b.enemy.hp);
    const twice = cast(once, rc, "strike");
    expect(twice.stakes).toEqual([]);

    const { b: side, rc: sideRc } = open();
    stand(side, 7, 8);
    addStake(side, 6, 2, sideRc);
    const smashed = cast(side, sideRc, "strike");
    expect(stakeHitsAt(smashed, 6)).toBe(1);
    expect(smashed.enemy.hp).toBe(side.enemy.hp);
  });

  it("召唤体在第 9 格仍当墙", () => {
    const rc = rcClimb(true);
    const b = makeBattle("catcher", rc, makeRun("empty"));
    stand(b, 6, 7);
    b.labSummon = { school: "saber", name: "客", pos: 8, hp: 12, maxHp: 12, taunt: false };
    const hp = b.enemy.hp;
    const next = cast(b, rc, "push");
    expect(next.enemy.pos).toBe(7);
    expect(next.enemy.hp).toBe(hp - 15);
    expect(next.log.some((line) => line.includes("撞上客"))).toBe(true);
    expect(next.log.some((line) => line.includes("震壁"))).toBe(true);
    expect(next.foeStun).toBe(1);
  });
});

describe("石台 2.0 · 站位与登门", () => {
  it("双人站位随板长缩放，开局间距盖章后不再跟关卡表", () => {
    const climb = makeBattle("twin", rcClimb());
    expect(climb.foes.map((f) => f.pos)).toEqual([4, 8]);
    const brk = makeBattle("twin", makeTestContext({ mode: "break", lab: false }));
    expect(brk.boardSize).toBe(7);
    expect(brk.foes.map((f) => f.pos)).toEqual([3, 6]);

    const run = makeRun("empty") as Run;
    run.openingDist = 3;
    const rc = climbTestContext();
    const b = makeBattle("catcher", rc, run);
    b.labGauntletStage = 2;
    applyClimbOpeningPositions(b, rc);
    expect(b.player.pos).toBe(0);
    expect(b.enemy.pos).toBe(3);

    const bare = {
      player: { pos: 0 },
      enemy: { pos: 5, id: "e" },
      foes: [{ pos: 5, id: "e", hp: 10, maxHp: 10, name: "x", title: "" }],
      enemyId: "mob_bandit_0",
      labGauntletStage: 2,
    } as unknown as Battle;
    applyClimbOpeningPositions(bare, rc);
    expect(Math.abs(bare.enemy.pos - bare.player.pos)).toBe(3);
  });

  it("登门仍是 7 格，两端出界都撞壁", () => {
    const rc = makeTestContext({ mode: "break", lab: false });
    const b = makeBattle("catcher", rc);
    expect(b.boardSize).toBe(7);
    expect(b.wallEnds).toBe("both");
    expect(b.player.pos).toBe(0);
    expect(b.enemy.pos).toBe(5);
    expect(b.openingDist).toBeUndefined();

    const hp = b.enemy.hp;
    const high = cast(b, rc, "push");
    expect(high.enemy.pos).toBe(6);
    expect(high.enemy.hp).toBe(hp - 9);
    expect(high.log.some((line) => line.includes("撞壁 9"))).toBe(true);

    const lowBoard = makeBattle("catcher", rc);
    const lowHp = lowBoard.enemy.hp;
    stand(lowBoard, 3, 1);
    const low = cast(lowBoard, rc, "push");
    expect(low.enemy.pos).toBe(0);
    expect(low.enemy.hp).toBe(lowHp - 9);
    expect(low.log.some((line) => line.includes("撞壁 9"))).toBe(true);
  });
});
