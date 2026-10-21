import { describe, expect, it } from "vitest";
import { campaignStage } from "./breakCampaign";
import {
  FEINT_CHANCE,
  createQiFight,
  isSegHidden,
  playPeek,
  playUlt,
  resolveTurn,
  selectCard,
  assignToSegment,
  type QiCardId,
  type QiFight,
} from "./qiCommit";

function playOn(f: QiFight, defId: QiCardId, seg: number): QiFight {
  const card = f.hand.find((c) => c.defId === defId);
  if (!card) throw new Error(`missing ${defId}`);
  return assignToSegment(selectCard(f, card.uid), seg);
}

function snap(f: QiFight, tag: string) {
  return {
    tag,
    playerStance: f.playerStance,
    enemyStance: f.enemyStance,
    qi: f.qi,
    momentum: f.momentum,
    ink: [...f.inkCells],
    recap: f.lastRecap.map((r) => `${r.name}${r.outcome}`).join(","),
    phase: f.phase,
  };
}

describe("qiCommit 定向", () => {
  it("录架势、气势、气力：拆中 / 放生 / 墨痕 / 绝式", () => {
    let broken = createQiFight({
      playerHp: 12,
      enemyHp: 18,
      playerPos: 3,
      hand: ["break_point", "dodge", "step_back", "atk1"],
      queue: [{ move: "pierce", damage: 6, cell: 3 }],
      nextQueue: [{ move: "pierce", damage: 6, cell: 3 }],
    });
    broken = resolveTurn(playOn(broken, "break_point", 0));
    const hard = snap(broken, "拆中");
    const inked = snap(resolveTurn(broken), "墨痕");

    let released = createQiFight({
      playerHp: 12,
      enemyHp: 18,
      playerPos: 3,
      hand: ["dodge", "break_point", "step_back", "atk1"],
      queue: [{ move: "pierce", damage: 6, cell: 3 }],
    });
    released = resolveTurn(playOn(released, "dodge", 0));

    let ult = createQiFight({
      playerHp: 12,
      enemyHp: 14,
      playerPos: 3,
      momentum: 8,
      hand: ["atk1", "dodge", "break_point", "step_back"],
      queue: [{ move: "crash", damage: 5, cell: 3 }],
    });
    ult = resolveTurn(playUlt(ult, 0));

    expect([hard, snap(released, "放生"), inked, snap(ult, "绝式")]).toEqual([
      {
        tag: "拆中",
        playerStance: 12,
        enemyStance: 16,
        qi: 3,
        momentum: 1,
        ink: [3],
        recap: "刺破",
        phase: "play",
      },
      {
        tag: "放生",
        playerStance: 12,
        enemyStance: 18,
        qi: 3,
        momentum: 0,
        ink: [],
        recap: "刺闪",
        phase: "play",
      },
      {
        tag: "墨痕",
        playerStance: 12,
        enemyStance: 14,
        qi: 3,
        momentum: 2,
        ink: [3],
        recap: "刺墨",
        phase: "play",
      },
      {
        tag: "绝式",
        playerStance: 12,
        enemyStance: 6,
        qi: 4,
        momentum: 8,
        ink: [],
        recap: "撞绝",
        phase: "play",
      },
    ]);
  });

  it("R5 半隐：第一段扣着，起手是刀平", () => {
    const stage = campaignStage("R5")!;
    const f = createQiFight({
      playerHp: stage.playerHp,
      enemyHp: stage.enemyHp,
      playerPos: stage.playerPos,
      hand: stage.hand,
      queue: stage.qiQueue,
      nextQueue: stage.qiNextQueue,
      qi: stage.energy,
      hideFrom: stage.hideFrom,
      allowFeint: true,
      feintRng: () => 1,
    });
    expect(stage.hideFrom).toBe(0);
    expect(isSegHidden(f, 0)).toBe(true);
    expect(f.queue[0]?.move).toBe("pierce");
    expect(f.queue[0]?.feintTell).toBeUndefined();
  });

  it("RB 座前：第一段亮，后段扣着，承在第二段", () => {
    const stage = campaignStage("RB")!;
    const f = createQiFight({
      playerHp: stage.playerHp,
      enemyHp: stage.enemyHp,
      playerPos: stage.playerPos,
      hand: stage.hand,
      queue: stage.qiQueue,
      qi: stage.energy,
      hideFrom: stage.hideFrom,
      allowFeint: true,
      feintRng: () => 1,
    });
    expect(f.hideFrom).toBe(1);
    expect(isSegHidden(f, 0)).toBe(false);
    expect(f.queue[0]?.move).toBe("sweep");
    expect(isSegHidden(f, 1)).toBe(true);
    expect(f.queue[1]?.node).toBe("carry");
    expect(f.enemyStance).toBe(14);
    expect(f.playerStance).toBe(12);
  });

  it("偶尔诱：固定种子低于 1/6 才把暗段起手换成别的", () => {
    expect(FEINT_CHANCE).toBe(1 / 6);
    const stage = campaignStage("R5")!;
    const open = (rng: () => number) =>
      createQiFight({
        playerHp: stage.playerHp,
        enemyHp: stage.enemyHp,
        playerPos: stage.playerPos,
        hand: stage.hand,
        queue: stage.qiQueue,
        nextQueue: stage.qiNextQueue,
        qi: stage.energy,
        loopQueue: true,
        hideFrom: 0,
        allowFeint: true,
        feintRng: rng,
      });

    const baited = resolveTurn(open(() => 0));
    expect(baited.queue[0]?.move).toBe("pierce");
    expect(baited.queue[0]?.feintTell).toBe("bladeSheathe");

    const plain = resolveTurn(open(() => FEINT_CHANCE));
    expect(plain.queue[0]?.feintTell).toBeUndefined();
    expect(plain.queue[0]?.move).toBe("pierce");
  });

  it("盯梢翻真招：诱被拆穿，气力减 1，招还是刺", () => {
    const stage = campaignStage("R5")!;
    let f = createQiFight({
      playerHp: stage.playerHp,
      enemyHp: stage.enemyHp,
      playerPos: stage.playerPos,
      hand: stage.hand,
      queue: stage.qiQueue,
      nextQueue: stage.qiNextQueue,
      qi: stage.energy,
      loopQueue: true,
      hideFrom: 0,
      allowFeint: true,
      feintRng: () => 0,
    });
    f = resolveTurn(f);
    const before = f.qi;
    f = playPeek(f);
    expect(f.qi).toBe(before - 1);
    expect(f.log.at(-1)).toBe("盯梢 · 诱 · 实为刺");
    expect(isSegHidden(f, 0)).toBe(false);
    expect(f.queue[0]?.move).toBe("pierce");
    expect(f.playerStance).toBeGreaterThan(0);
  });

  it("打空算躲：人不在红格，气势不清，架势不掉", () => {
    let f = createQiFight({
      playerHp: 12,
      enemyHp: 18,
      playerPos: 0,
      momentum: 4,
      qi: 3,
      hand: ["break_point", "brace"],
      queue: [{ move: "pierce", damage: 6, cell: 3 }],
    });
    f = resolveTurn(f);
    expect(f.lastRecap.map((r) => r.outcome)).toEqual(["躲"]);
    expect(f.momentum).toBe(4);
    expect(f.playerStance).toBe(12);
    expect(f.enemyStance).toBe(18);
    expect(f.qi).toBe(3);
  });
});
