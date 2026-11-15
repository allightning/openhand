import { describe, expect, it } from "vitest";
import { climbTestContext } from "./testContext";
import {
  CLIMB_RELAY_SEG_MUL,
  CLIMB_WINDOW_BASE_HIT,
  CLIMB_WINDOW_FIGHT_CAP,
  CLIMB_WINDOW_PAYOFF_BONUS,
  CLIMB_WINDOW_THINK_BONUS,
} from "../game/climbCaps";
import { CLIMB_ENV_SCHEDULE, envTagForHall } from "../game/content/envSchedule";
import { useLabItem } from "../game/labV21";
import { mindPierceBlock, shredBlockOnStrike } from "../game/rules/guardBreak";
import { matchWindow, tickFromIntent, windowFightCap, windowThinkBonusSec } from "../game/reactionWindows";
import { makeRun } from "../game/run";
import { answerReaction, endTurn, makeBattle, playCard } from "../game/sim";
import type { Battle } from "../game/types";

const rc = climbTestContext();

/** 拳装备、贴脸、劲够劈掌（打 5）。 */
function palmBattle(): Battle {
  const run = makeRun("empty");
  run.weapon = "palm-a-1";
  const b = makeBattle("catcher", rc, run, true);
  b.labMateWeapons = { ...(b.labMateWeapons ?? {}), [b.active]: "palm-a-1" };
  b.player.pos = 0;
  b.enemy.pos = 1;
  b.energy = 8;
  return b;
}

function playStrike(b: Battle): Battle {
  b.hand.push({ uid: "t1", defId: "strike" });
  return playCard(b, "t1", rc);
}

describe("P1 破挡构筑件", () => {
  it("破甲心法：攻击穿 2 点挡", () => {
    let b = palmBattle();
    b.enemyBlock = 5;
    b.labMateMinds = { ...(b.labMateMinds ?? {}), [b.active]: ["pojia"] };
    const hp = b.enemy.hp;
    b = playStrike(b);
    expect(hp - b.enemy.hp).toBe(2);
    expect(b.enemyBlock).toBe(2);
    expect(b.journal.some((j) => j.text.includes("破甲穿挡 2"))).toBe(true);
  });

  it("无破甲：同样的挡全卸，不漏伤", () => {
    let b = palmBattle();
    b.enemyBlock = 5;
    const hp = b.enemy.hp;
    b = playStrike(b);
    expect(hp - b.enemy.hp).toBe(0);
    expect(b.enemyBlock).toBe(0);
  });

  it("破甲穿 2 是天花板：心法叠两份也封 2", () => {
    const b = palmBattle();
    b.labMateMinds = { ...(b.labMateMinds ?? {}), [b.active]: ["pojia", "pojia"] };
    expect(mindPierceBlock(b)).toBe(2);
  });

  it("破甲与剑破绽各算各的：先穿 2，破绽再追 4", () => {
    let b = palmBattle();
    b.enemyBlock = 5;
    b.expose = 1;
    b.labMateMinds = { ...(b.labMateMinds ?? {}), [b.active]: ["pojia"] };
    const hp = b.enemy.hp;
    b = playStrike(b);
    expect(hp - b.enemy.hp).toBe(6);
    expect(b.expose).toBe(0);
    expect(b.journal.some((j) => j.text.includes("破甲穿挡 2"))).toBe(true);
    expect(b.journal.some((j) => j.text.includes("破绽穿挡 4"))).toBe(true);
  });

  it("裂石：敌挡 ≥6 出招先碎 3 挡", () => {
    let b = palmBattle();
    b.techniques = [...b.techniques, "lieshi"];
    b.enemyBlock = 6;
    const hp = b.enemy.hp;
    b = playStrike(b);
    expect(b.journal.some((j) => j.text.includes("裂石碎挡 3"))).toBe(true);
    expect(hp - b.enemy.hp).toBe(2);
    expect(b.enemyBlock).toBe(0);
  });

  it("裂石门禁：敌挡 5 不触发，不许放宽", () => {
    let b = palmBattle();
    b.techniques = [...b.techniques, "lieshi"];
    b.enemyBlock = 5;
    const hp = b.enemy.hp;
    b = playStrike(b);
    expect(b.journal.some((j) => j.text.includes("裂石碎挡"))).toBe(false);
    expect(hp - b.enemy.hp).toBe(0);
    expect(b.enemyBlock).toBe(0);
  });

  it("裂石与柏青裂甲同位相加：7 挡碎 6", () => {
    let b = palmBattle();
    b.active = "boqing";
    b.techniques = [...b.techniques, "lieshi"];
    b.enemyBlock = 7;
    const hp = b.enemy.hp;
    b = playStrike(b);
    expect(b.journal.some((j) => j.text.includes("裂石碎挡 3"))).toBe(true);
    expect(b.journal.some((j) => j.text.includes("裂甲破挡 3"))).toBe(true);
    expect(hp - b.enemy.hp).toBe(4);
    expect(b.enemyBlock).toBe(0);
  });

  it("裂石每招一次：同招二段不重复，下一招再触发", () => {
    const b = palmBattle();
    b.techniques = [...b.techniques, "lieshi"];
    b.enemyBlock = 14;
    b.resolvingCard = "strike";
    expect(shredBlockOnStrike(b)).toEqual(["裂石碎挡 3"]);
    expect(shredBlockOnStrike(b)).toEqual([]);
    expect(b.enemyBlock).toBe(11);
    b.playedThisTurn.push("劈掌");
    expect(shredBlockOnStrike(b)).toEqual(["裂石碎挡 3"]);
    expect(b.enemyBlock).toBe(8);
  });
});

describe("P2 接力段系数转正", () => {
  it("CLIMB_RELAY_SEG_MUL = 0.5（2026-11-14 拍定转正）", () => {
    expect(CLIMB_RELAY_SEG_MUL).toBe(0.5);
  });
});

describe("P3 环境投放表", () => {
  it("灼烧馆 3/6/8，无墙馆 5/9，缺格·末端馆 4/7", () => {
    expect(envTagForHall(3)).toBe("burn");
    expect(envTagForHall(6)).toBe("burn");
    expect(envTagForHall(8)).toBe("burn");
    expect(envTagForHall(5)).toBe("nowall");
    expect(envTagForHall(9)).toBe("nowall");
    expect(envTagForHall(4)).toBe("gap_end");
    expect(envTagForHall(7)).toBe("gap_end");
    for (const h of [1, 2, 3, 5, 6, 8, 9, 10]) {
      const tag = envTagForHall(h);
      expect(tag === "gap_end" || tag === "gap_mid").toBe(false);
    }
  });

  it("gap_mid 不投", () => {
    expect(Object.values(CLIMB_ENV_SCHEDULE)).not.toContain("gap_mid");
  });
});

describe("P5 反应窗流", () => {
  it("明镜心法：每场反应窗帽 +1", () => {
    const b = palmBattle();
    b.windowsUsed = CLIMB_WINDOW_FIGHT_CAP;
    const tick = tickFromIntent({ kind: "windup" }, 1);
    expect(matchWindow(b, "palm", tick)).toBeNull();
    b.labMateMinds = { ...(b.labMateMinds ?? {}), [b.active]: ["mingjing"] };
    expect(windowFightCap(b)).toBe(CLIMB_WINDOW_FIGHT_CAP + 1);
    expect(matchWindow(b, "palm", tick)?.kind).toBe("palmCut");
  });

  it("醒神丸：本馆反应窗帽 +1，用一少一", () => {
    let b = palmBattle();
    b.labItems = ["xingshen"];
    b.windowsUsed = CLIMB_WINDOW_FIGHT_CAP;
    const tick = tickFromIntent({ kind: "windup" }, 1);
    expect(matchWindow(b, "palm", tick)).toBeNull();
    const res = useLabItem(b, "xingshen", rc);
    expect(res.ok).toBe(true);
    b = res.battle!;
    expect(b.windowCapBonus).toBe(1);
    expect(b.labItemCharges?.xingshen).toBe(1);
    expect(matchWindow(b, "palm", tick)?.kind).toBe("palmCut");
    expect(b.journal.some((j) => j.text.includes("醒神丸"))).toBe(true);
  });

  it("抢半招：截拳兑现伤害 +50%", () => {
    let b = palmBattle();
    b.holdReaction = true;
    b.techniques = [...b.techniques, "qiangbanzhao"];
    b.foeCharge = 3;
    b.intent = { kind: "windup" };
    b.intents = [b.intent];
    const hp = b.enemy.hp;
    b = endTurn(b, rc);
    expect(b.reactionWindow?.kind).toBe("palmCut");
    b = answerReaction(b, true, rc);
    expect(hp - b.enemy.hp).toBe(Math.round(CLIMB_WINDOW_BASE_HIT * (1 + CLIMB_WINDOW_PAYOFF_BONUS)));
  });

  it("听劲：反应窗思考时间 +2 秒（引擎登记，表现壳读）", () => {
    const b = palmBattle();
    expect(windowThinkBonusSec(b)).toBe(0);
    b.techniques = [...b.techniques, "tingjin"];
    expect(windowThinkBonusSec(b)).toBe(CLIMB_WINDOW_THINK_BONUS);
  });
});
