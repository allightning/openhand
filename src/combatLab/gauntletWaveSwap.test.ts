import { beforeEach, describe, expect, it } from "vitest";
import { setLabRuleset } from "./labRuleset";
import { setLabMode, setLabTuning } from "../game/labTuning";
import { startLabBattle } from "./factory";
import { buildGauntletPreset, createGauntletRun } from "./gauntlet";
import { playCard, endTurn, canEndPlayerTurn, livingFoes, canPlay, needsDiscardToHandCap, labDiscardCard } from "../game/sim";
import { CARDS } from "../game/content";
import type { Battle } from "../game/types";

function v2Battle(stage = 6): Battle {
  setLabRuleset("break");
  setLabMode(true);
  setLabTuning({ rulesV2: true, v2Fx: false, v2VariantAi: false, enemyStressCap: 0 });
  const run = { ...createGauntletRun("shaolin", "saber"), stage };
  const b = startLabBattle(buildGauntletPreset(run), false, 1);
  b.player.pos = 1;
  b.enemy.pos = 4;
  return b;
}

function anyLegalAttack(b: Battle): string | undefined {
  return b.hand.find((c) => CARDS[c.defId]?.type === "attack" && canPlay(b, c.uid).ok)?.uid;
}

function anyLegalCard(b: Battle): string | undefined {
  return b.hand.find((c) => canPlay(b, c.uid).ok)?.uid;
}

function killFrontFoe(b: Battle): Battle {
  // 用直取/主攻杀掉前排触发 wave；杀不掉就再打一轮
  let cur = b;
  for (let round = 0; round < 12 && cur.enemy.hp > 0; round++) {
    const atk = anyLegalAttack(cur) ?? anyLegalCard(cur);
    if (!atk) { cur = endTurn(cur); continue; }
    cur = playCard(cur, atk);
    if (cur.phase !== "player") break;
  }
  return cur;
}

describe("拆招轮番接力不软锁", () => {
  beforeEach(() => {
    setLabRuleset("break");
    setLabMode(true);
    setLabTuning({ rulesV2: true, v2Fx: false, v2VariantAi: false, enemyStressCap: 0 });
  });

  it("前排倒下替补上场，phase 仍为 player，收势/出牌可用", () => {
    let b = v2Battle(6);
    const waveBefore = b.gauntletWaveEnemy;
    expect(waveBefore).toBeTruthy();
    b.enemy.hp = 1;
    b = killFrontFoe(b);
    // 替补上场
    expect(livingFoes(b).length).toBeGreaterThan(0);
    expect(b.phase).toBe("player");
    // 若手牌超上限，弃到可收势（测的是 phase 锁，不是弃牌闸）
    while (needsDiscardToHandCap(b) && b.hand.length) {
      b = labDiscardCard(b, b.hand[0]!.uid);
    }
    expect(canEndPlayerTurn(b).ok).toBe(true);
  });

  it("换人后敌招有计划，收势能过回合并不会卡死", () => {
    let b = v2Battle(6);
    b.enemy.hp = 1;
    b = killFrontFoe(b);
    expect(b.intents.length).toBeGreaterThan(0);
    const beforeTurn = b.turn;
    b = endTurn(b);
    expect(b.phase).toBe("player");
    expect(b.turn).toBeGreaterThan(beforeTurn);
    expect(b.intents.length).toBeGreaterThan(0);
  });

  it("拆势真伤击杀前排后替补上场：phase 仍是 player（不软锁）", () => {
    let b = v2Battle(6);
    expect(b.gauntletWaveEnemy).toBeTruthy();
    b.enemy.hp = 3;
    b.v2BreakMomentum = 1;
    b.v2BreakMomentumTrue = 8;
    b.player.pos = 2;
    b.enemy.pos = 4;
    b.hand = [{ uid: "t-cut", defId: "cut" }];
    b.energy = 5;
    b = playCard(b, "t-cut");
    expect(livingFoes(b).length).toBeGreaterThan(0);
    expect(b.enemy.hp).toBeGreaterThan(0);
    expect(b.phase).toBe("player");
    expect(canEndPlayerTurn(b).ok).toBe(true);
    for (const c of b.hand) {
      const gate = canPlay(b, c.uid);
      if (!gate.ok) expect(gate.reason).not.toBe("现在不是你的回合");
    }
  });
});

