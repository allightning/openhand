import { describe, expect, it } from "vitest";
import { createBreakCampaignRun } from "./breakCampaign";
import { renderQiCommitBattle } from "./qiCommitUi";
import {
  QI_CARDS,
  STARTER_DECK,
  assignToSegment,
  createQiFight,
  firstHiddenTell,
  isSegHidden,
  playAttackFree,
  playPass,
  playPeek,
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
      playerHp: 12,
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
    expect(f.playerStance).toBe(11); // 架 4-3
    expect(f.enemyStance).toBe(16); // 硬拆 -2，断蓄不夺势
    expect(f.momentum).toBe(1);
    expect(f.lastRecap.map((r) => r.outcome)).toEqual(["擦", "破", "断"]);
    expect(f.windupArmed).toBe(false);
    expect(f.inkCells).toContain(3);
  });

  it("unblocked hit clears momentum and counts as 打", () => {
    let f = createQiFight({
      playerHp: 12,
      enemyHp: 18,
      hand: ["atk2"],
      queue: [{ move: "crash", damage: 5 }],
      momentum: 3,
    });
    f = playAttackFree(selectCard(f, handUid(f, "atk2")));
    f = resolveTurn(f);
    expect(f.playerStance).toBe(7);
    expect(f.enemyStance).toBe(18); // 无拆，直取不夺势
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
    expect(f.playerStance).toBe(30);
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
    expect(f.playerStance).toBe(30);
    expect(f.enemyStance).toBe(14); // 18-2-2
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
    expect(f.enemyStance).toBe(32); // 40-8
    expect(f.lastRecap[0]!.outcome).toBe("绝");
    expect(f.playerStance).toBe(30);
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
    expect(f.playerStance).toBe(30);
    expect(f.lastRecap[0]!.outcome).toBe("躲");
    expect(f.momentum).toBe(0);
  });

  it("打空算躲：气势不清零、不算拆", () => {
    let f = createQiFight({
      playerHp: 12,
      enemyHp: 8,
      playerPos: 3,
      momentum: 3,
      hand: ["step_back"],
      queue: [{ move: "pierce", damage: 6, cell: 3 }],
    });
    f = playStep(selectCard(f, handUid(f, "step_back")));
    f = resolveTurn(f);
    expect(f.lastRecap[0]!.outcome).toBe("躲");
    expect(f.playerStance).toBe(12);
    expect(f.enemyStance).toBe(8);
    expect(f.momentum).toBe(3);
  });

  it("诱招：起手说谎，克的是真招", () => {
    let f = createQiFight({
      playerHp: 12,
      enemyHp: 8,
      hideFrom: 0,
      hand: ["break_press", "break_point"],
      queue: [{ move: "pierce", damage: 6, cell: 3, feintTell: "bladeDown" }],
    });
    expect(firstHiddenTell(f)?.tell).toBe("bladeDown");
    f = playOn(f, "break_press", 0);
    expect(f.queue[0]!.commit?.tier).toBe("miss");
    f = resolveTurn(f);
    expect(f.lastRecap.map((r) => r.outcome)).toContain("打");
  });

  it("盯梢拆穿诱招，看见真刺", () => {
    const peeked = playPeek(
      createQiFight({
        playerHp: 12,
        enemyHp: 8,
        hideFrom: 0,
        hand: ["break_point"],
        queue: [{ move: "pierce", damage: 6, cell: 3, feintTell: "bladeDown" }],
      }),
    );
    expect(isSegHidden(peeked, 0)).toBe(false);
    expect(peeked.log.some((l) => l.includes("诱"))).toBe(true);
  });

  it("后续拍可诱：开局队列不诱", () => {
    let f = createQiFight({
      playerHp: 12,
      enemyHp: 8,
      hideFrom: 0,
      allowFeint: true,
      feintRng: () => 0,
      hand: ["dodge"],
      queue: [{ move: "sweep", damage: 4, cell: 3 }],
      nextQueue: [{ move: "crash", damage: 5, cell: 3 }],
    });
    expect(f.queue[0]!.feintTell).toBeUndefined();
    f = playOn(f, "dodge", 0);
    f = resolveTurn(f);
    expect(f.queue[0]!.move).toBe("crash");
    expect(f.queue[0]!.feintTell).toBe("bladeDown");
  });

  it("招路：硬拆承则合作废", () => {
    let f = createQiFight({
      playerHp: 12,
      enemyHp: 14,
      hand: ["break_point"],
      queue: [
        { move: "pierce", damage: 6, cell: 3, node: "carry" },
        { move: "crash", damage: 8, cell: 3, node: "close" },
      ],
    });
    f = playOn(f, "break_point", 0);
    f = resolveTurn(f);
    expect(f.lastRecap.map((r) => r.outcome)).toEqual(["破", "滞"]);
    expect(f.playerStance).toBe(12);
    expect(f.enemyStance).toBe(12);
  });

  it("招路：承被拆，下一拍合仍滞", () => {
    let f = createQiFight({
      playerHp: 12,
      enemyHp: 14,
      hand: ["break_point"],
      queue: [{ move: "pierce", damage: 6, cell: 3, node: "carry" }],
      nextQueue: [{ move: "crash", damage: 8, cell: 3, node: "close" }],
    });
    f = playOn(f, "break_point", 0);
    f = resolveTurn(f);
    expect(f.throatCut).toBe(true);
    f = resolveTurn(f);
    expect(f.lastRecap.map((r) => r.outcome)).toEqual(["滞"]);
    expect(f.playerStance).toBe(12);
    expect(f.throatCut).toBe(false);
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
    expect(f.lastRecap.map((r) => r.outcome)).toEqual(["墨", "夺"]);
    expect(f.enemyStance).toBe(12); // 18-2 破，-2 墨，▲3 夺 2
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

  it("硬拆削敌架势 2，不掉你架势", () => {
    let f = createQiFight({
      playerHp: 12,
      enemyHp: 8,
      hand: ["break_point"],
      queue: [{ move: "pierce", damage: 6, cell: 3 }],
    });
    f = playOn(f, "break_point", 0);
    f = resolveTurn(f);
    expect(f.playerStance).toBe(12);
    expect(f.enemyStance).toBe(6);
    expect(f.phase).toBe("play");
  });

  it("打谱高架势：一记硬拆不会当场胜", () => {
    let f = createQiFight({
      playerHp: 12,
      enemyHp: 99,
      hand: ["break_point"],
      queue: [{ move: "pierce", damage: 6, cell: 3 }],
    });
    f = playOn(f, "break_point", 0);
    f = resolveTurn(f);
    expect(f.enemyStance).toBe(97);
    expect(f.phase).toBe("play");
  });

  it("绝式削 8 架势，杂兵当场破尽", () => {
    let f = createQiFight({
      playerHp: 12,
      enemyHp: 8,
      hand: ["atk1"],
      queue: [{ move: "crash", damage: 5 }],
      momentum: 8,
    });
    f = playUlt(f, 0);
    f = resolveTurn(f);
    expect(f.enemyStance).toBe(0);
    expect(f.phase).toBe("won");
    expect(f.playerStance).toBe(12);
  });

  it("不拆只攻：敌架势不动，你挨打", () => {
    let f = createQiFight({
      playerHp: 12,
      enemyHp: 8,
      hand: ["atk1", "atk1"],
      queue: [{ move: "pierce", damage: 6, cell: 3 }],
    });
    f = playAttackFree(selectCard(f, handUid(f, "atk1")));
    f = resolveTurn(f);
    expect(f.enemyStance).toBe(8);
    expect(f.playerStance).toBe(6);
    expect(f.phase).toBe("play");
  });

  it("半隐：起手式对应暗段，信读可硬拆，盯梢费 1 气", () => {
    let f = createQiFight({
      playerHp: 12,
      enemyHp: 8,
      hideFrom: 1,
      hand: ["break_press", "break_point"],
      queue: [
        { move: "sweep", damage: 4, cell: 3 },
        { move: "pierce", damage: 6, cell: 3 },
      ],
    });
    expect(isSegHidden(f, 0)).toBe(false);
    expect(isSegHidden(f, 1)).toBe(true);
    expect(firstHiddenTell(f)?.move).toBe("pierce");
    expect(firstHiddenTell(f)?.label).toMatch(/刀尖平指/);
    f = playOn(f, "break_point", 1);
    expect(f.queue[1]!.commit?.tier).toBe("hard");
    const peeked = playPeek(
      createQiFight({
        playerHp: 12,
        enemyHp: 8,
        hideFrom: 1,
        hand: ["break_point"],
        queue: [
          { move: "sweep", damage: 4, cell: 3 },
          { move: "pierce", damage: 6, cell: 3 },
        ],
      }),
    );
    expect(peeked.qi).toBe(2);
    expect(isSegHidden(peeked, 1)).toBe(false);
  });

  it("半隐：信错起手则拆空挨打", () => {
    let f = createQiFight({
      playerHp: 12,
      enemyHp: 8,
      hideFrom: 1,
      hand: ["break_press"],
      queue: [
        { move: "sweep", damage: 4, cell: 3 },
        { move: "pierce", damage: 6, cell: 3 },
      ],
    });
    f = playOn(f, "break_press", 1);
    f = resolveTurn(f);
    expect(f.lastRecap.map((r) => r.outcome)).toContain("打");
    expect(f.playerStance).toBeLessThan(12);
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
    expect(html).toContain("架势");
    expect(html).toContain("气力");
    expect(html).toContain("气势");
  });

  it("半隐对打不印标准答案，亮起手式", () => {
    const f = createQiFight({
      playerHp: 12,
      enemyHp: 8,
      hideFrom: 1,
      hand: ["break_press", "break_point"],
      queue: [
        { move: "sweep", damage: 4, cell: 3 },
        { move: "pierce", damage: 6, cell: 3 },
      ],
    });
    const run = { ...createBreakCampaignRun(), stageId: "RB" as const, stageIndex: 8 };
    const html = renderQiCommitBattle(f, run);
    expect(html).not.toContain("用 拆·点");
    expect(html).toContain("后段");
    expect(html).toContain("刀尖平指");
    expect(html).toContain("qi-peek");
  });
});
