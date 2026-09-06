import { describe, expect, it } from "vitest";
import { createBreakCampaignRun } from "./breakCampaign";
import { renderQiCommitBattle } from "./qiCommitUi";
import {
  QI_CARDS,
  STARTER_DECK,
  assignToSegment,
  createQiFight,
  playAttackFree,
  playPass,
  playStep,
  playUlt,
  resolveTurn,
  selectCard,
  type QiFight,
} from "./qiCommit";

function handUid(f: QiFight, defId: string): string {
  const c = f.hand.find((x) => x.defId === defId);
  if (!c) throw new Error(`hand missing ${defId}: ${f.hand.map((x) => x.defId).join(",")}`);
  return c.uid;
}

function playOn(f: QiFight, defId: string, seg: number): QiFight {
  return assignToSegment(selectCard(f, handUid(f, defId)), seg);
}

describe("qi commit kernel", () => {
  it("starter deck is 12 and default refill is 3 qi / draw 4", () => {
    expect(STARTER_DECK).toHaveLength(12);
    expect(QI_CARDS.break_point.cost).toBe(2);
    expect(QI_CARDS.brace.cost).toBe(1);
    const f = createQiFight({
      playerHp: 30,
      enemyHp: 18,
      hand: ["break_point", "brace", "dodge", "atk1"],
      queue: [
        { move: "sweep", damage: 4 },
        { move: "pierce", damage: 6 },
        { move: "windup", damage: 0 },
      ],
    });
    expect(f.qi).toBe(3);
    expect(f.hand).toHaveLength(4);
    expect(f.queue).toHaveLength(3);
  });

  it("hard break refunds 1 qi and marks ink + momentum", () => {
    let f = createQiFight({
      playerHp: 30,
      enemyHp: 18,
      hand: ["break_point", "brace", "dodge", "atk1"],
      queue: [
        { move: "sweep", damage: 4 },
        { move: "pierce", damage: 6 },
        { move: "windup", damage: 0 },
      ],
    });
    f = playOn(f, "break_point", 1);
    expect(f.qi).toBe(2); // 3-2+1
    expect(f.momentum).toBe(1);
    expect(f.queue[1]!.commit?.tier).toBe("hard");
    expect(f.inkPending).toContain(3);
  });

  it("wrong break spends 2 and does not refund", () => {
    let f = createQiFight({
      playerHp: 30,
      enemyHp: 18,
      hand: ["break_press", "brace"],
      queue: [{ move: "pierce", damage: 6 }],
    });
    f = playOn(f, "break_press", 0);
    expect(f.qi).toBe(1);
    expect(f.momentum).toBe(0);
    expect(f.queue[0]!.commit?.tier).toBe("miss");
  });

  it("cannot assign twice or overspend", () => {
    let f = createQiFight({
      playerHp: 30,
      enemyHp: 18,
      hand: ["break_point", "break_press", "brace"],
      queue: [{ move: "pierce", damage: 6 }],
      qi: 2,
    });
    f = playOn(f, "break_point", 0);
    expect(() => playOn(f, "brace", 0)).toThrow(/已落子/);
    const poor = createQiFight({
      playerHp: 30,
      enemyHp: 18,
      hand: ["break_point"],
      queue: [{ move: "pierce", damage: 6 }],
      qi: 1,
    });
    expect(() => playOn(poor, "break_point", 0)).toThrow(/气力/);
  });

  it("playguide T1: break pierce + brace sweep + attack windup", () => {
    let f = createQiFight({
      playerHp: 30,
      enemyHp: 18,
      hand: ["brace", "break_point", "dodge", "atk1"],
      queue: [
        { move: "sweep", damage: 4 },
        { move: "pierce", damage: 6 },
        { move: "windup", damage: 0 },
      ],
    });
    f = playOn(f, "break_point", 1);
    f = playOn(f, "brace", 0);
    f = playOn(f, "atk1", 2);
    f = resolveTurn(f);
    expect(f.playerHp).toBe(29); // 4-3 graze
    expect(f.enemyHp).toBe(12); // 3*2 windup interrupt
    expect(f.momentum).toBe(1);
    expect(f.lastRecap.map((r) => r.outcome)).toEqual(["擦", "破", "断"]);
    expect(f.windupArmed).toBe(false);
    expect(f.inkCells).toContain(3);
  });

  it("unblocked hit clears momentum and counts as 打", () => {
    let f = createQiFight({
      playerHp: 30,
      enemyHp: 18,
      hand: ["atk2"],
      queue: [{ move: "crash", damage: 5 }],
      momentum: 3,
    });
    f = playAttackFree(selectCard(f, handUid(f, "atk2")));
    f = resolveTurn(f);
    expect(f.playerHp).toBe(25);
    expect(f.enemyHp).toBe(11); // 6 + 收势时气势▲3 的 +1
    expect(f.momentum).toBe(0);
    expect(f.lastRecap[0]!.outcome).toBe("打");
  });

  it("pass banks 1 qi on top of refill 3", () => {
    let f = createQiFight({
      playerHp: 30,
      enemyHp: 18,
      hand: ["dodge"],
      queue: [{ move: "sweep", damage: 4 }],
    });
    f = playOn(f, "dodge", 0);
    f = playPass(f);
    f = resolveTurn(f);
    expect(f.qi).toBe(4);
    expect(f.playerHp).toBe(30);
  });

  it("ink auto-voids same cell next turn", () => {
    let f = createQiFight({
      playerHp: 30,
      enemyHp: 18,
      hand: ["break_point"],
      queue: [{ move: "pierce", damage: 6 }],
    });
    f = playOn(f, "break_point", 0);
    f = resolveTurn(f);
    expect(f.inkCells).toEqual([3]);
    f = resolveTurn({
      ...f,
      queue: [{ move: "pierce", damage: 6, cell: 3 }],
      hand: [{ uid: "x", defId: "brace" }],
      qi: 3,
    });
    expect(f.lastRecap[0]!.outcome).toBe("墨");
    expect(f.momentum).toBe(2);
    expect(f.playerHp).toBe(30);
    expect(f.inkCells).toContain(3);
  });

  it("uninterrupted windup adds a segment and +2 damage next turn", () => {
    let f = createQiFight({
      playerHp: 30,
      enemyHp: 18,
      hand: ["dodge"],
      queue: [
        { move: "sweep", damage: 4 },
        { move: "windup", damage: 0 },
      ],
      nextQueue: [
        { move: "pierce", damage: 6 },
        { move: "sweep", damage: 4 },
      ],
    });
    f = playOn(f, "dodge", 0);
    f = resolveTurn(f);
    expect(f.queue).toHaveLength(3);
    expect(f.queue.every((s) => s.move === "windup" || s.damage >= 6)).toBe(true);
  });

  it("momentum 5 raises refill to 4; ult at 8 voids a segment for 12", () => {
    let f = createQiFight({
      playerHp: 30,
      enemyHp: 40,
      hand: ["atk1"],
      queue: [{ move: "crash", damage: 5 }],
      momentum: 8,
    });
    f = playUlt(f, 0);
    f = resolveTurn(f);
    expect(f.enemyHp).toBe(28);
    expect(f.lastRecap[0]!.outcome).toBe("绝");
    expect(f.playerHp).toBe(30);
    expect(f.qi).toBe(4);
  });

  it("cannot 拆/架 a windup", () => {
    const f = createQiFight({
      playerHp: 30,
      enemyHp: 18,
      hand: ["break_point", "brace"],
      queue: [{ move: "windup", damage: 0 }],
    });
    expect(() => playOn(f, "break_point", 0)).toThrow(/蓄力/);
    expect(() => playOn(f, "brace", 0)).toThrow(/蓄力/);
  });

  it("7格：撤步离开红格则来招打空", () => {
    let f = createQiFight({
      playerHp: 30,
      enemyHp: 18,
      playerPos: 3,
      hand: ["step_back"],
      queue: [{ move: "sweep", damage: 4, cell: 3 }],
    });
    expect(f.playerPos).toBe(3);
    f = playStep(selectCard(f, handUid(f, "step_back")));
    expect(f.playerPos).toBe(2);
    expect(f.qi).toBe(2);
    f = resolveTurn(f);
    expect(f.playerHp).toBe(30);
    expect(f.lastRecap[0]!.outcome).toBe("空");
  });

  it("loopQueue: 脚本拍打完后循环来招，不会空队列", () => {
    let f = createQiFight({
      playerHp: 30,
      enemyHp: 40,
      hand: ["dodge"],
      queue: [{ move: "sweep", damage: 4, cell: 3 }],
      nextQueue: [{ move: "pierce", damage: 6, cell: 3 }],
      loopQueue: true,
    });
    f = playOn(f, "dodge", 0);
    f = resolveTurn(f);
    expect(f.queue.map((s) => s.move)).toEqual(["pierce"]);
    f = resolveTurn({ ...f, hand: [{ uid: "d2", defId: "dodge" }], qi: 3, selectedUid: null });
    expect(f.queue.length).toBeGreaterThan(0);
    expect(f.queue[0]!.move).toBe("pierce");
  });

  it("直取伤害按收势时气势结算，墨痕叠到 ▲3 当拍就 +1", () => {
    let f = createQiFight({
      playerHp: 30,
      enemyHp: 18,
      momentum: 1,
      hand: ["break_point", "atk1"],
      queue: [{ move: "pierce", damage: 6, cell: 3 }],
      nextQueue: [{ move: "pierce", damage: 6, cell: 3 }],
    });
    f = playOn(f, "break_point", 0);
    f = resolveTurn(f);
    expect(f.momentum).toBe(2);
    expect(f.inkCells).toEqual([3]);
    f = playAttackFree(selectCard(f, handUid(f, "atk1")));
    expect(f.pendingAttacks).toEqual([3]);
    f = resolveTurn(f);
    expect(f.lastRecap.map((r) => r.outcome)).toEqual(["墨"]);
    expect(f.enemyHp).toBe(14); // 3 + 气势刚到 3 的 +1
    expect(f.momentum).toBe(3);
  });

  it("7格：不在红格不能拆/架", () => {
    const f = createQiFight({
      playerHp: 30,
      enemyHp: 18,
      playerPos: 2,
      hand: ["break_press", "brace"],
      queue: [{ move: "sweep", damage: 4, cell: 3 }],
    });
    expect(() => playOn(f, "break_press", 0)).toThrow(/红格/);
    expect(() => playOn(f, "brace", 0)).toThrow(/红格/);
  });
});

describe("qi commit UI", () => {
  it("renders goal, meters, and queue as separate bands", () => {
    const f = createQiFight({
      playerHp: 12,
      enemyHp: 99,
      hand: ["break_point", "brace"],
      queue: [{ move: "pierce", damage: 6 }],
    });
    const html = renderQiCommitBattle(f, createBreakCampaignRun());
    expect(html).toContain("qi-goal");
    expect(html).toContain("qi-table");
    expect(html).toContain("qi-meter");
    expect(html).toContain("刺");
    expect(html).toContain("用 拆·点");
    expect(html).toContain("qi-board");
    expect(html).toContain("data-qi-cell");
    expect(html).toContain("红格");
    expect(html).toContain("qi-pick");
    expect(html).toContain("气力");
    expect(html).toContain("气势");
    expect(html).toContain("墨痕");
  });
});
