import { describe, expect, it } from "vitest";
import { STARTER } from "./content";
import { makeRun } from "./run";
import {
  cloneBattle,
  endTurn,
  makeBattle,
  makeTutorialBattle,
  playCard,
  previewCard,
  yourPace,
} from "./sim";
import type { CardId } from "./types";

function playNamed(b: ReturnType<typeof makeTutorialBattle>, name: CardId) {
  const card = b.hand.find((c) => c.defId === name);
  if (!card) throw new Error(`hand missing ${name}`);
  return playCard(b, card.uid);
}

describe("tutorial battle", () => {
  it("deals a fixed first hand", () => {
    const b = makeTutorialBattle();
    expect(b.hand.map((c) => c.defId)).toEqual([
      "strike",
      "strike",
      "strike",
      "defend",
      "push",
    ]);
    expect(b.enemy.hp).toBe(56);
    expect(b.intent).toEqual({ kind: "strike", damage: 18 });
    expect(b.player.title).toBe("破门刀");
    expect(b.player.title).toBe("破门刀");
  });

  it("three palm strikes leave the catcher alive", () => {
    let b = makeTutorialBattle();
    b = playNamed(b, "strike");
    b = playNamed(b, "strike");
    b = playNamed(b, "strike");
    expect(b.enemy.hp).toBe(38);
    expect(b.energy).toBe(0);
    expect(b.phase).toBe("player");
  });

  it("push from the sixth step hits the wall for 8", () => {
    const b = makeTutorialBattle();
    expect(b.enemy.pos).toBe(5);
    const prev = previewCard(b, b.hand.find((c) => c.defId === "push")!.uid);
    expect(prev.enemyPos).toBe(6);
    expect(prev.enemyHp).toBe(48);
    expect(prev.notes.some((n) => n.includes("撞壁"))).toBe(true);
  });

  it("push then two strikes does not kill before the catcher acts", () => {
    let b = makeTutorialBattle();
    b = playNamed(b, "push");
    b = playNamed(b, "strike");
    b = playNamed(b, "strike");
    expect(b.enemy.hp).toBe(36);
    expect(b.phase).toBe("player");
  });

  it("preview equals settlement for strike", () => {
    const b = makeTutorialBattle();
    const strike = b.hand.find((c) => c.defId === "strike")!;
    const prev = previewCard(b, strike.uid);
    const after = playCard(b, strike.uid);
    expect(after.enemy.hp).toBe(prev.enemyHp);
    expect(after.enemy.pos).toBe(prev.enemyPos);
    expect(after.player.hp).toBe(prev.playerHp);
  });

  it("one defend leaves 10 unblocked", () => {
    let b = makeTutorialBattle();
    b = playNamed(b, "defend");
    expect(b.playerBlock).toBe(8);
    b = endTurn(b);
    expect(b.player.hp).toBe(STARTER.playerHp - 10);
    expect(b.phase).toBe("player");
    expect(b.playerBlock).toBe(0);
    expect(b.turn).toBe(2);
  });

  it("greedy strikes then ending the turn takes 18", () => {
    let b = makeTutorialBattle();
    b = playNamed(b, "strike");
    b = playNamed(b, "strike");
    b = playNamed(b, "strike");
    const before = cloneBattle(b);
    b = endTurn(b);
    expect(b.player.hp).toBe(before.player.hp - 18);
    expect(b.enemy.hp).toBe(38);
  });

  it("turn two can charge then strike for 10", () => {
    let b = makeTutorialBattle();
    b = playNamed(b, "defend");
    b = endTurn(b);
    expect(b.hand.some((c) => c.defId === "charge")).toBe(true);
    b = playNamed(b, "charge");
    const strike = b.hand.find((c) => c.defId === "strike")!;
    const prev = previewCard(b, strike.uid);
    expect(prev.notes.some((n) => n.includes("10"))).toBe(true);
    b = playCard(b, strike.uid);
    expect(b.enemy.hp).toBe(prev.enemyHp);
    expect(b.nextDamage).toBe(0);
  });
});

describe("other duelists", () => {
  it("escort charges into the player and deals 18", () => {
    let b = makeBattle("escort");
    expect(b.enemy.pos).toBe(3);
    expect(b.intent.kind).toBe("charge");
    b = endTurn(b);
    expect(b.player.hp).toBe(STARTER.playerHp - 18);
    expect(b.enemy.pos).toBeLessThan(4);
  });

  it("piler drops a stake that blocks knockback", () => {
    let b = makeBattle("piler");
    expect(b.intent.kind).toBe("stake");
    b = endTurn(b);
    expect(b.stakes.length).toBe(1);
    const push = b.hand.find((c) => c.defId === "push");
    if (!push) throw new Error("no push");
    const before = b.enemy.pos;
    b = playCard(b, push.uid);
    expect(b.enemy.pos).toBe(before);
    expect(b.log.at(-1)).toMatch(/桩/);
  });
});

describe("new verbs and techniques", () => {
  it("hauler pulls the player closer", () => {
    let b = makeBattle("hauler");
    expect(b.intent.kind).toBe("pull");
    const from = b.player.pos;
    b = endTurn(b);
    expect(b.player.pos).toBeGreaterThan(from);
  });

  it("delay telegraphs windup then a heavy strike", () => {
    let b = makeBattle("delay");
    expect(b.intent.kind).toBe("windup");
    b = endTurn(b);
    expect(b.player.hp).toBe(STARTER.playerHp);
    expect(b.intent.kind).toBe("strike");
    if (b.intent.kind === "strike") expect(b.intent.damage).toBe(26);
  });

  it("longPush knocks one extra cell", () => {
    const run = makeRun("empty");
    run.techniques = ["longPush"];
    let b = makeBattle("catcher", run);
    b.enemy.pos = 3;
    const push = b.hand.find((c) => c.defId === "push")!;
    b = playCard(b, push.uid);
    expect(b.enemy.pos).toBe(6);
  });

  it("heelStake plants a post on the second step", () => {
    const run = makeRun("empty");
    run.techniques = ["heelStake"];
    const b = makeBattle("catcher", run);
    expect(b.stakes).toEqual([1]);
  });

  it("drawcut hits harder when adjacent", () => {
    const run = makeRun("empty");
    run.deck = ["drawcut", "defend", "defend", "defend", "defend"];
    const far = makeBattle("catcher", run);
    const uid = far.hand[0].uid;
    const farHit = previewCard(far, uid);
    far.player.pos = 4;
    const nearHit = previewCard(far, uid);
    expect(farHit.enemyHp).toBeGreaterThan(nearHit.enemyHp);
  });

  it("preview still matches settlement for push", () => {
    const b = makeBattle("catcher");
    const push = b.hand.find((c) => c.defId === "push")!;
    const prev = previewCard(b, push.uid);
    const after = playCard(b, push.uid);
    expect(after.enemy.hp).toBe(prev.enemyHp);
    expect(after.enemy.pos).toBe(prev.enemyPos);
  });

  it("mend restores life without exceeding the cap", () => {
    const run = makeRun("empty");
    run.hp = 20;
    run.deck = ["mend", "defend", "defend", "defend", "defend"];
    let b = makeBattle("catcher", run);
    b = playNamed(b, "mend");
    expect(b.player.hp).toBe(25);
  });

  it("lets a yard bandit take the stone", () => {
    const b = makeBattle("bandit");
    expect(b.enemy.name).toBe("岗花子");
    expect(b.enemy.hp).toBe(74);
    expect(b.intent.kind).toBe("charge");
  });

  it("lets follow hit harder after an attack, and chain after combo", () => {
    const run = makeRun("empty");
    run.deck = ["strike", "follow", "combo", "chain", "defend"];
    let b = makeBattle("intruder", run, true);
    b = playNamed(b, "strike");
    const afterStrike = b.enemy.hp;
    b = playNamed(b, "follow");
    expect(b.enemy.hp).toBe(afterStrike - 6);
    b = playNamed(b, "combo");
    expect(b.combo).toBe(1);
    const before = b.enemy.hp;
    b = playNamed(b, "chain");
    expect(b.enemy.hp).toBe(before - 11);
    expect(b.combo).toBe(0);
  });

  it("pays off setup into finisher and keeps flow across turns", () => {
    const run = makeRun("empty");
    run.deck = ["setup", "setup", "finisher", "gather", "strike", "defend", "defend", "defend", "defend", "defend"];
    let b = makeBattle("intruder", run, true);
    b = playNamed(b, "setup");
    b = playNamed(b, "setup");
    expect(b.setup).toBe(2);
    const before = b.enemy.hp;
    b = playNamed(b, "finisher");
    expect(b.enemy.hp).toBe(before - 14);
    expect(b.setup).toBe(0);
    b = playNamed(b, "gather");
    expect(b.flow).toBe(1);
    b = endTurn(b);
    expect(b.flow).toBe(1);
    const mid = b.enemy.hp;
    b = playNamed(b, "strike");
    expect(b.enemy.hp).toBe(mid - 7);
  });

  it("weaves after an attack, mirrors threat, and retains ironform block", () => {
    const run = makeRun("empty");
    run.deck = ["strike", "weave", "mirror", "ironform", "defend", "defend", "defend", "defend", "defend", "defend"];
    let b = makeBattle("catcher", run, true);
    b = playNamed(b, "strike");
    b = playNamed(b, "weave");
    expect(b.playerBlock).toBe(8);
    expect(b.combo).toBe(1);
    b = playNamed(b, "mirror");
    expect(b.playerBlock).toBe(8 + 14);
    b = endTurn(b);
    expect(b.player.hp).toBe(STARTER.playerHp);
    expect(b.playerBlock).toBe(0);

    const run2 = makeRun("empty");
    run2.deck = ["ironform", "defend", "defend", "defend", "defend"];
    let iron = makeBattle("catcher", run2, true);
    iron = playNamed(iron, "ironform");
    expect(iron.playerBlock).toBe(10);
    expect(iron.retainTurns).toBe(2);
    iron = endTurn(iron);
    expect(iron.playerBlock).toBe(6);
    expect(iron.retainTurns).toBe(1);
  });

  it("marks then rifts for a consumed bonus", () => {
    const run = makeRun("empty");
    run.deck = ["marking", "rift", "defend", "defend", "defend"];
    let b = makeBattle("intruder", run, true);
    const hp0 = b.enemy.hp;
    b = playNamed(b, "marking");
    expect(b.mark).toBe(2);
    expect(b.enemy.hp).toBe(hp0 - 6);
    const mid = b.enemy.hp;
    b = playNamed(b, "rift");
    expect(b.mark).toBe(1);
    expect(b.enemy.hp).toBe(mid - 12);
  });

  it("lets a smuggler raise a guard before winding up", () => {
    const b = makeBattle("smuggler");
    expect(b.intent.kind).toBe("guard");
  });
});

describe("先机", () => {
  it("keeps the catcher slower than a palm so the tutorial still opens", () => {
    const b = makeTutorialBattle();
    expect(yourPace(b)).toBe(5);
    expect(b.foePace).toBe(4);
    expect(b.player.hp).toBe(STARTER.playerHp);
    expect(b.log.some((line) => line.includes("手先到"))).toBe(false);
  });

  it("lets a faster foe plant a trap before you move", () => {
    const b = makeBattle("trapper");
    expect(b.foePace).toBeGreaterThan(yourPace(b));
    expect(b.log.some((line) => line.includes("手先到"))).toBe(true);
    expect(b.traps.length).toBe(1);
  });

  it("lets 抢先 raise 先机", () => {
    const run = makeRun("empty");
    run.deck = ["haste", "defend", "defend", "defend", "defend"];
    let b = makeBattle("catcher", run, true);
    expect(yourPace(b)).toBe(5);
    b = playNamed(b, "haste");
    expect(yourPace(b)).toBe(8);
  });
});

