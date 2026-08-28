import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setLabMode, setLabTuning } from "../game/labTuning";
import { BREAK_COUNTER_BASE, BREAK_COUNTER_CHAIN, EYE_COUNTER_DMG } from "../game/labV2Constants";
import { breakCounterDamage } from "../game/labV2";
import { stressMetaAt, tryAppendStressIntent } from "../game/labEnemyStress";
import { applyTurnDamageGovernor, dangerCellsForIntent, dangerCells, endTurn, playCard, projectedQueueThreat } from "../game/sim";
import type { Battle, Intent } from "../game/types";
import { startLabBattle } from "./factory";
import {
  GAUNTLET_HEAL_RATIO,
  GAUNTLET_MAX_STAGE,
  basePot,
  buildGauntletPreset,
  buyMarketOffer,
  createGauntletRun,
  isBetterBest,
  ladderEntry,
  marketOffers,
  redeemGauntletRun,
  reviveGauntletRun,
  reviveCost,
  applyBankerBoost,
  applyLifeline,
  peakPotAnchor,
  marketPrice,
  resolveStageEnemy,
  resolveWager,
  wagerOffers,
  type GauntletRun,
} from "./gauntlet";
import { setLabRuleset } from "./labRuleset";
import { gearById } from "../game/weapons";
import { renderGauntletResult, renderGauntletRewardPick } from "./gauntletUi";
import type { WeaponId } from "../game/types";

function v2Battle(school: WeaponId = "palm"): Battle {
  const b = startLabBattle(buildGauntletPreset(createGauntletRun("bandit", school)), true, 1);
  b.player.pos = 1;
  b.enemy.pos = 4;
  return b;
}

beforeEach(() => {
  setLabRuleset("classic");
  setLabMode(true);
  setLabTuning({ rulesV2: true, v2Fx: false, enemySegBonus: 0, v2VariantAi: false, enemyStressCap: 0 });
});
afterEach(() => {
  setLabTuning({ rulesV2: false, v2VariantAi: true });
  setLabMode(false);
});

describe("§31.13 拆招 v4 · 以拆为杀", () => {
  it("硬拆反打真伤 = 底数 + 兵器品阶（精阶 3 → 5）", () => {
    const b = v2Battle();
    expect(breakCounterDamage(b)).toBe(BREAK_COUNTER_BASE + 3);
  });

  it("硬拆一段（反架拆架式）：那段作废 + 反打真伤 + 势 +1", () => {
    let b = v2Battle("sword");
    b.player.pos = 3;
    b.enemy.pos = 5;
    b.intents = [{ kind: "guard", block: 8 }];
    const hpBefore = b.enemy.hp;
    b.hand = [{ uid: "g1", defId: "expose" }];
    b.energy = 6;
    b = playCard(b, "g1");
    b = endTurn(b);
    expect(b.v2BreakCount ?? 0).toBe(1);
    expect(b.enemy.hp).toBe(hpBefore - (BREAK_COUNTER_BASE + 3));
    expect(b.qi ?? 0).toBe(1);
  });

  it("连环拆：一回合第 2 段硬拆 +2 伤 +1 势", () => {
    let b = v2Battle("sword");
    b.player.pos = 3;
    b.enemy.pos = 5;
    b.intents = [
      { kind: "guard", block: 8 },
      { kind: "guard", block: 6 },
    ];
    b.hand = [
      { uid: "g1", defId: "expose" },
      { uid: "g2", defId: "marking" },
    ];
    b.energy = 6;
    b = playCard(b, "g1");
    b = playCard(b, "g2");
    const hpBefore = b.enemy.hp;
    b = endTurn(b);
    expect(b.v2BreakCount ?? 0).toBe(2);
    const per = BREAK_COUNTER_BASE + 3;
    expect(b.enemy.hp).toBe(hpBefore - per - (per + BREAK_COUNTER_CHAIN));
    // 势：拆 1 + 拆 1 + 连环 1 = 3
    expect(b.qi ?? 0).toBe(3);
  });

  it("反拆能拆死人：敌血量低于反打时直接胜", () => {
    let b = v2Battle("sword");
    b.player.pos = 3;
    b.enemy.pos = 5;
    b.enemy.hp = 3;
    b.intents = [{ kind: "guard", block: 8 }];
    b.hand = [{ uid: "g1", defId: "expose" }];
    b.energy = 6;
    b = playCard(b, "g1");
    b = endTurn(b);
    expect(b.phase).toBe("won");
  });

  it("破眼：套路崩塌 + 失衡 ×2 + 拆眼重创真伤", () => {
    let b = v2Battle(); // 拳系起手脚有退步掌
    // §31.14 打击红格 = 兵刃圈（敌 5 覆盖 4-6）：开局站 4 在圈里，退步掌撤到 3 = 拆
    b.player.pos = 4;
    b.enemy.pos = 5;
    b.v2Turn = { ...b.v2Turn!, turnStartPos: 4 };
    b.intents = [
      { kind: "strike", damage: 8 },
      { kind: "strike", damage: 9 },
    ];
    b.v2EyeIdx = 0;
    b.hand = [{ uid: "m1", defId: "backpalm" }];
    b.energy = 6;
    const hpBefore = b.enemy.hp;
    b = playCard(b, "m1");
    expect(b.player.pos).toBe(3);
    b = endTurn(b);
    expect(b.v2OffBalance ?? 0).toBeGreaterThan(0);
    // 反拆(精5) + 拆眼重创 6；第二段跟着套路散了、不再反打
    expect(b.enemy.hp).toBe(hpBefore - (BREAK_COUNTER_BASE + 3) - EYE_COUNTER_DMG);
    expect(b.qi ?? 0).toBe(3); // 拆 1 + 破眼 2
    expect(b.v2EyeCount ?? 0).toBe(1); // §31.14 破眼注的计数来源
  });

  it("势只从读招来：命中不再白给势", () => {
    let b = v2Battle();
    b.player.pos = 3;
    b.enemy.pos = 4;
    b.intents = [{ kind: "guard", block: 5 }];
    b.hand = [{ uid: "a1", defId: "strike" }];
    b.energy = 3;
    const qiBefore = b.qi ?? 0;
    b = playCard(b, "a1");
    expect(b.qi ?? 0).toBe(qiBefore);
  });
});

describe("§31.14 空间诚实 · 红格=结算，够不着的招不算拆", () => {
  it("打击收势出圈 = 劈空（不扣血、不得势、不算拆）", () => {
    let b = v2Battle();
    b.player.pos = 4;
    b.enemy.pos = 5; // 兵刃圈覆盖 4-6
    b.v2Turn = { ...b.v2Turn!, turnStartPos: 4 };
    b.intents = [{ kind: "strike", damage: 10 }];
    b.hand = [{ uid: "m1", defId: "backpalm" }];
    b.energy = 3;
    const hp = b.player.hp;
    b = playCard(b, "m1"); // 撤到 3，出圈
    b = endTurn(b);
    expect(b.player.hp).toBe(hp);
    expect(b.v2BreakCount ?? 0).toBe(1); // 在圈里出牌走出 = 硬拆（段作废，不进结算）
  });

  it("本来就够不着的招：不算拆也不算让，自己打空", () => {
    let b = v2Battle();
    b.player.pos = 1;
    b.enemy.pos = 5; // 兵刃圈 4-6，你在 1——他够不着你
    b.v2Turn = { ...b.v2Turn!, turnStartPos: 1 };
    b.intents = [{ kind: "strike", damage: 10 }];
    b.hand = [{ uid: "m1", defId: "advance" }];
    b.energy = 3;
    const hp = b.player.hp;
    b = playCard(b, "m1"); // 哪怕出了位移牌（走到 2），也不算拆——他本来就打不到你
    b = endTurn(b);
    expect(b.player.hp).toBe(hp);
    expect(b.v2BreakCount ?? 0).toBe(0);
    expect(b.v2GrazedSegments ?? []).toEqual([]);
    expect(b.qi ?? 0).toBe(0);
    expect(b.log.join()).toContain("劈了个空"); // 段照常结算，只是自己打空
  });

  it("抢步扑锁定线：显示格=结算格；挪出落点圈 = 拆，本就圈外 = 抢空", () => {
    let b = v2Battle();
    b.player.pos = 3;
    b.enemy.pos = 4; // 贴脸：锁定格 3，不挪步，落点 4，圈 3-5
    b.v2Turn = { ...b.v2Turn!, turnStartPos: 3 };
    const lunge: Intent = { kind: "lunge", damage: 12 };
    expect(dangerCellsForIntent(b, lunge)).toEqual([3, 4, 5]);
    b.intents = [lunge];
    b.hand = [{ uid: "m1", defId: "backpalm" }];
    b.energy = 3;
    const hp = b.player.hp;
    b = playCard(b, "m1"); // 撤到 2，出圈 = 硬拆
    b = endTurn(b);
    expect(b.player.hp).toBe(hp);
    expect(b.v2BreakCount ?? 0).toBe(1);

    // 本来就够不着：敌 5 你 1，抢步落点 4、圈 3-5——不拆不让，他自己抢空
    let b2 = v2Battle();
    b2.player.pos = 1;
    b2.enemy.pos = 5;
    b2.v2Turn = { ...b2.v2Turn!, turnStartPos: 1 };
    b2.intents = [{ kind: "lunge", damage: 12 }];
    const hp2 = b2.player.hp;
    b2 = endTurn(b2);
    expect(b2.player.hp).toBe(hp2);
    expect(b2.v2BreakCount ?? 0).toBe(0);
    expect(b2.log.join()).toContain("抢了个空");
  });

  it("§31.15 连抢投影：后一段红格按前一段落位推进——不再「不在红格仍挨打」", () => {
    // 截图根因：敌 4 你 1，队列 [抢步, 抢步]。旧算法两段红格都画 {2,3,4}，
    // 但结算时第二段从 3 起步扑到 2、reach 1 罩住 1——你不在红格却挨打。
    let b = v2Battle(); // player 1 / enemy 4
    b.v2Turn = { ...b.v2Turn!, turnStartPos: 1 };
    b.intents = [
      { kind: "lunge", damage: 12 },
      { kind: "lunge", damage: 12 },
    ];
    const projected = projectedQueueThreat(b);
    expect(projected[0]).toEqual([2, 3, 4]); // 第一段落 3
    expect(projected[1]).toEqual([1, 2, 3]); // 第二段从 3 起步落 2，圈罩住 1
    expect(dangerCells(b)).toContain(1); // 棋盘红格是投影并集：你脚下是红的
    // 原地不动：第一段抢空，第二段命中（红格早告诉你会挨这一段）
    const hp = b.player.hp;
    b = endTurn(b);
    expect(b.player.hp).toBeLessThan(hp);
    expect(b.log.join()).toContain("抢了个空"); // 第一段空

    // 退步掌撤出投影圈：第二段可拆（开局你在它的投影圈里）
    let b2 = v2Battle();
    b2.v2Turn = { ...b2.v2Turn!, turnStartPos: 1 };
    b2.intents = [
      { kind: "lunge", damage: 12 },
      { kind: "lunge", damage: 12 },
    ];
    b2.hand = [{ uid: "m1", defId: "backpalm" }];
    b2.energy = 3;
    const hp2 = b2.player.hp;
    b2 = playCard(b2, "m1"); // 撤到 0
    b2 = endTurn(b2);
    expect(b2.player.hp).toBe(hp2); // 两段全空
    expect(b2.v2BreakCount ?? 0).toBe(1); // 第二段算硬拆（第一段本就够不着，不算）
  });

  it("§31.15 拆招战利品：走位拆起架（后手段吃到）+ 硬吃拆回血 + 连环", () => {
    let b = v2Battle();
    b.player.pos = 2;
    b.enemy.pos = 3; // 抢步贴脸：落点 3，圈 2-4，开局在圈里可拆
    b.v2Turn = { ...b.v2Turn!, turnStartPos: 2 };
    b.v2EyeIdx = -1; // 清掉开局势眼残留，专注战利品链路
    b.intents = [
      { kind: "lunge", damage: 12 },
      { kind: "bleedcut", damage: 8, bleed: 1 },
    ];
    b.hand = [{ uid: "m1", defId: "backpalm" }];
    b.energy = 3;
    b.player.hp = b.player.maxHp - 10; // 压血让回血可见（满血会被上限吃掉）
    const hp = b.player.hp;
    b = playCard(b, "m1"); // 撤到 1（退步掌自带架 5）
    b = endTurn(b);
    expect(b.log.join()).toContain("让中带架"); // 走位拆战利品：架 +4（共 9 架）
    expect(b.log.join()).toContain("铁扛回气"); // 刀创 8 ≤ 架 9 → 硬吃拆 → 回血 3
    expect(b.player.hp).toBe(hp + 3); // 全程零伤，还回了 3
    expect(b.v2BreakCount ?? 0).toBe(2); // 两段都拆，第二段吃连环
  });

  it("§31.15 拆招战利品：反架拆叠破绽 +2（看穿套路，攻势方向）", () => {
    let b = v2Battle("sword");
    b.player.pos = 3;
    b.enemy.pos = 5;
    b.v2EyeIdx = -1;
    b.intents = [{ kind: "guard", block: 8 }];
    b.hand = [{ uid: "g1", defId: "expose" }];
    b.energy = 6;
    b = playCard(b, "g1");
    const exposeAfterPlay = b.expose; // 破绽牌自身可能也叠了层数，以出牌后为基线
    b = endTurn(b);
    expect(b.v2BreakCount ?? 0).toBe(1);
    expect(b.log.join()).toContain("看穿套路");
    expect(b.expose).toBe(exposeAfterPlay + 2); // 战利品破绽 +2：你下两手攻击各吃 +4
  });

  it("§31.15 撤步：0 费退 2，给拆招充能——退到底正好拆连抢第二段", () => {
    let b = v2Battle();
    b.v2Turn = { ...b.v2Turn!, turnStartPos: 1 };
    b.v2EyeIdx = -1;
    b.intents = [
      { kind: "lunge", damage: 12 },
      { kind: "lunge", damage: 12 },
    ];
    b.hand = [{ uid: "r1", defId: "retreat" }];
    b.energy = 0; // 0 费：空劲也能撤
    const hp = b.player.hp;
    b = playCard(b, "r1"); // 1 → 0（身后只剩 1 格）
    expect(b.player.pos).toBe(0);
    b = endTurn(b);
    expect(b.player.hp).toBe(hp); // 两段全空
    expect(b.v2BreakCount ?? 0).toBe(1); // 第二段投影圈罩过起点 1，撤出算硬拆
  });

  it("§31.15 拆招战利品：桩拆回劲 +2（借势回劲）", () => {
    let b = v2Battle("staff");
    b.player.pos = 2;
    b.enemy.pos = 5; // 身前 3 空，点地落桩
    b.v2EyeIdx = -1;
    b.intents = [{ kind: "stake" }];
    b.hand = [{ uid: "p1", defId: "plant" }];
    b.energy = 5;
    b = playCard(b, "p1"); // 劲 5-1=4，桩落身前
    b = endTurn(b);
    expect(b.v2BreakCount ?? 0).toBe(1);
    expect(b.log.join()).toContain("借势回劲");
    expect(b.log.join()).toContain("劲力 +2");
  });

  it("§31.15 角色技能平衡：锡息 1→3 / 缆手 +2→+3 / 桩皮反震 +1→+2", () => {
    // 锡息：全程没出攻击，收势回 3
    let b = v2Battle();
    b.active = "pilgrim";
    b.player.hp = b.player.maxHp - 10;
    b.v2EyeIdx = -1;
    b.intents = [{ kind: "breathe", amount: 1 }];
    b.hand = [];
    const hp = b.player.hp;
    b = endTurn(b);
    expect(b.player.hp).toBe(hp + 3);
    expect(b.log.join()).toContain("锡息 回 3");

    // 缆手：钩挂拉近后下一掌 +3（钩系装配的主角就是石岸，换拳场让石岸以客座上场）
    let b2 = v2Battle("palm");
    b2.active = "hooker";
    b2.player.pos = 1;
    b2.enemy.pos = 3; // 钩挂打 2 格，别卡在「够不着」上
    b2.hand = [{ uid: "h1", defId: "hookpull" }];
    b2.energy = 3;
    const nd = b2.nextDamage;
    b2 = playCard(b2, "h1");
    expect(b2.nextDamage).toBe(nd + 3);

    // 桩皮：有格挡挨打，反震 +2（桩皮是主角级，须与 hero 不同人才算上场）
    let b3 = v2Battle("palm");
    b3.active = "sapper";
    b3.playerBlock = 5;
    b3.player.pos = 1;
    b3.enemy.pos = 2;
    b3.v2EyeIdx = -1;
    b3.intents = [{ kind: "strike", damage: 6 }];
    const foeHp = b3.enemy.hp;
    b3 = endTurn(b3);
    // 回敬 = 桩皮 2 + 兵器加成 2（精阶）——回敬也吃兵器，既有行为
    expect(b3.enemy.hp).toBe(foeHp - 4);
  });

  it("应激不再当场报复：挂起到下一手，带应签入场", () => {
    let b = v2Battle();
    setLabTuning({ enemyStressCap: 3 });
    const lenBefore = b.intents.length;
    expect(tryAppendStressIntent(b, "burst")).toBe(true);
    expect(b.intents.length).toBe(lenBefore); // 当前队列不变
    expect(b.v2PendingStress?.length).toBe(1);
    b = endTurn(b); // 结算 → 规划下一手
    expect(b.v2PendingStress ?? []).toEqual([]);
    expect(b.intents.some((_, i) => stressMetaAt(b, i))).toBe(true); // 应激段带签入场
  });

  it("单回合总督：攻击总伤封顶玩家气血上限比例，保留最大一段", () => {
    const b = v2Battle();
    b.player.maxHp = 48;
    setLabTuning({ enemyTurnCapRatio: 0.45 }); // 上限 ≈22
    const q: Intent[] = [
      { kind: "strike", damage: 14 },
      { kind: "barrage", damage: 8, hits: 3 }, // 潜力 24，最大 → 保留
      { kind: "strike", damage: 14 },
      { kind: "guard", block: 6 },
    ];
    applyTurnDamageGovernor(b, q);
    const attacks = q.filter((i) => "damage" in i && (i.damage ?? 0) > 0);
    expect(attacks).toHaveLength(1);
    expect(attacks[0]!.kind).toBe("barrage"); // 大招原样留，可读可拆
    // 不超帽时不动队
    const small: Intent[] = [{ kind: "strike", damage: 10 }];
    applyTurnDamageGovernor(b, small);
    expect(small[0]!.kind).toBe("strike");
  });
});

describe("§31.13/§31.14 赌馆 · 彩金与下注", () => {
  const runWithPot = (pot: number, stage = 1): GauntletRun => ({ ...createGauntletRun("bandit", "palm"), pot, stage });
  // §31.14 盘口轮换后 offers 是随机的：测试用全种直造 wager，或反复摇到目标盘口
  const rollKind = (run: GauntletRun, kind: "chain" | "eye" | "clean" | "speed" | "blood" | "fist") => {
    for (let i = 0; i < 64; i++) {
      const hit = wagerOffers(run).find((o) => o.kind === kind);
      if (hit) return hit;
    }
    throw new Error(`摇不到盘口 ${kind}`);
  };
  const stats = (over: Partial<Parameters<typeof resolveWager>[1]> = {}) => ({
    breaks: 0,
    turns: 5,
    hpEndRatio: 0.5,
    won: true,
    eyes: 0,
    itemsUsed: false,
    ...over,
  });

  it("过馆底彩随馆序涨", () => {
    expect(basePot(1)).toBe(16);
    expect(basePot(7)).toBe(52);
  });

  it("盘口轮换：六种盘口每场随机开三，不重复", () => {
    const withItems = { ...runWithPot(50), items: ["jinchuang"] as GauntletRun["items"] };
    const seen = new Set<string>();
    for (let i = 0; i < 40; i++) {
      const offers = wagerOffers(withItems);
      expect(offers.length).toBe(3);
      expect(new Set(offers.map((o) => o.kind)).size).toBe(3);
      offers.forEach((o) => seen.add(o.kind));
    }
    expect(seen.size).toBe(6);
  });

  it("§31.15 赤手注按持有开门：手无寸铁不开（必赢不赌），有道具才进池", () => {
    for (let i = 0; i < 40; i++) {
      const offers = wagerOffers(runWithPot(50)); // 起手 items: []
      expect(offers.length).toBe(3);
      expect(offers.some((o) => o.kind === "fist")).toBe(false);
    }
    const armed = { ...runWithPot(50), items: ["aidStaff"] as GauntletRun["items"] };
    let fistSeen = false;
    for (let i = 0; i < 64 && !fistSeen; i++) fistSeen = wagerOffers(armed).some((o) => o.kind === "fist");
    expect(fistSeen).toBe(true);
  });

  it("连拆注：拆够段数赢 ×2，不够飞注", () => {
    const offer = rollKind(runWithPot(50), "chain");
    const wRun = { ...runWithPot(50), wager: { kind: "chain" as const, stake: 30, target: offer.target, odds: offer.odds } };
    const win = resolveWager(wRun, stats({ breaks: offer.target }));
    expect(win.won).toBe(true);
    expect(win.payout).toBe(60);
    const lose = resolveWager(wRun, stats({ breaks: offer.target - 1 }));
    expect(lose.won).toBe(false);
    expect(lose.payout).toBe(-30);
  });

  it("破眼注：破眼次数达标才中", () => {
    const offer = rollKind(runWithPot(50), "eye");
    const wRun = { ...runWithPot(50), wager: { kind: "eye" as const, stake: 10, target: offer.target, odds: offer.odds } };
    expect(resolveWager(wRun, stats({ eyes: offer.target })).won).toBe(true);
    expect(resolveWager(wRun, stats({ eyes: offer.target - 1 })).won).toBe(false);
  });

  it("血战注/赤手注：走钢丝与空手两条险路", () => {
    const blood = { ...runWithPot(50), wager: { kind: "blood" as const, stake: 10, target: 35, odds: 2 } };
    expect(resolveWager(blood, stats({ hpEndRatio: 0.3 })).won).toBe(true);
    expect(resolveWager(blood, stats({ hpEndRatio: 0.8 })).won).toBe(false);
    const fist = { ...runWithPot(50), wager: { kind: "fist" as const, stake: 10, target: 0, odds: 2 } };
    expect(resolveWager(fist, stats({ itemsUsed: false })).won).toBe(true);
    expect(resolveWager(fist, stats({ itemsUsed: true })).won).toBe(false);
  });

  it("完璧注/速胜注：输馆必飞；彩金不欠债（庄垫只亏到 0）", () => {
    const clean = { ...runWithPot(5), wager: { kind: "clean" as const, stake: 10, target: 75, odds: 3 } };
    const lose = resolveWager(clean, stats({ breaks: 9, turns: 3, hpEndRatio: 1, won: false }));
    expect(lose.won).toBe(false);
    expect(lose.payout).toBe(-5);
    const win = resolveWager(clean, stats({ turns: 9, hpEndRatio: 0.8 }));
    expect(win.won).toBe(true);
    expect(win.payout).toBe(30);
    const speedRun = { ...runWithPot(5), wager: { kind: "speed" as const, stake: 10, target: 6, odds: 3 } };
    expect(resolveWager(speedRun, stats({ turns: 7, hpEndRatio: 1 })).won).toBe(false);
    expect(resolveWager(speedRun, stats({ turns: 6, hpEndRatio: 1 })).won).toBe(true);
  });

  it("下注档位随难度爬：第 5 馆连拆注目标 > 第 1 馆", () => {
    const early = rollKind(runWithPot(0, 1), "chain");
    const late = rollKind(runWithPot(0, 5), "chain");
    expect(late.target).toBeGreaterThan(early.target);
  });

  it("无尽踢馆：第 16 馆合成馆序、馆主轮换、数值爬升", () => {
    const e15 = ladderEntry(GAUNTLET_MAX_STAGE);
    const e16 = ladderEntry(16);
    const e17 = ladderEntry(17);
    expect(e15.tier).toBe("extreme");
    expect(e16.hpMul).toBeGreaterThan(e15.hpMul);
    expect(resolveStageEnemy(e15, "usurper")).toBe("usurper");
    expect(resolveStageEnemy(e16, "usurper")).toBe("lord");
    expect(resolveStageEnemy(e17, "usurper")).toBe("usurper");
  });

  it("打榜比较：连胜优先，平连胜比彩金，再平比破招", () => {
    expect(isBetterBest({ streak: 8, pot: 0, breaks: 0 }, { streak: 7, pot: 999, breaks: 99 })).toBe(true);
    expect(isBetterBest({ streak: 7, pot: 100, breaks: 0 }, { streak: 7, pot: 99, breaks: 99 })).toBe(true);
    expect(isBetterBest({ streak: 7, pot: 100, breaks: 5 }, { streak: 7, pot: 100, breaks: 6 })).toBe(false);
    expect(isBetterBest({ streak: 1, pot: 0, breaks: 0 }, null)).toBe(true);
  });

  it("§31.16 黑市摆摊：满血不卖金创，可升阶才卖淬刃；摊位 4~5 件", () => {
    const fresh = runWithPot(60); // 满血、3 阶兵
    const stall = marketOffers(fresh);
    expect(stall.some((o) => o.kind === "heal")).toBe(false);
    expect(stall.some((o) => o.kind === "forge")).toBe(true);
    expect(stall.length).toBe(4); // 谱/货/外功/淬刃
    stall.forEach((o) => expect(o.price).toBeGreaterThan(0));
    const hurt = { ...fresh, hp: fresh.hpMax - 10 };
    const stall2 = marketOffers(hurt);
    expect(stall2.length).toBe(5);
    expect(stall2[0]!.kind).toBe("heal");
    const maxed = { ...fresh, weaponId: "palm-a-4" }; // 4 阶 → 下一阶是神兵档，黑市不淬
    expect(marketOffers(maxed).some((o) => o.kind === "forge")).toBe(false);
  });

  it("§31.16 黑市落锤：扣彩金、货到手上；不够钱不卖", () => {
    const run = runWithPot(50);
    // 金创：先砍到残血再买回
    const hurt = { ...run, hp: 30 };
    const heal = marketOffers(hurt).find((o) => o.kind === "heal")!;
    const healed = buyMarketOffer(hurt, heal)!;
    expect(healed.pot).toBe(50 - heal.price);
    expect(healed.hp).toBe(30 + Math.ceil(hurt.hpMax * GAUNTLET_HEAL_RATIO));
    // 谱：进牌组的就是摊上那张
    const stall = marketOffers(run);
    const card = stall.find((o) => o.kind === "card")!;
    const bought = buyMarketOffer(run, card)!;
    expect(bought.pot).toBe(50 - card.price);
    expect(bought.deckRecipe.length).toBe(run.deckRecipe.length + 1);
    expect(bought.deckRecipe.at(-1)).toBe(card.id.slice(5));
    // 外功与淬刃
    const tech = stall.find((o) => o.kind === "tech");
    if (tech) expect(buyMarketOffer(run, tech)!.techniques).toContain(tech.id.slice(5));
    const forge = stall.find((o) => o.kind === "forge")!;
    expect(gearById(buyMarketOffer(run, forge)!.weaponId)!.grade).toBe(4);
    // 彩金不够 → null
    expect(buyMarketOffer(runWithPot(5), forge)).toBeNull();
  });

  it("§31.17 赊账复活：付复活费（非全赔），整局仅一次", () => {
    const cost = reviveCost(4);
    const run = { ...runWithPot(cost + 500, 4), hp: 12, streak: 3 };
    const r = reviveGauntletRun(run)!;
    expect(r).not.toBeNull();
    expect(r!.pot).toBe(cost + 500 - cost);
    expect(r!.hp).toBe(r!.hpMax);
    expect(r!.bankruptUsed).toBe(true);
    expect(r!.streak).toBe(3);
    expect(r!.stage).toBe(4);
    expect(reviveGauntletRun(r!)).toBeNull();
    expect(reviveGauntletRun({ ...run, pot: 5 })).toBeNull();
  });

  it("§31.17 峰值锚与垫资", () => {
    expect(peakPotAnchor(1)).toBeGreaterThan(peakPotAnchor(1) / 3);
    expect(reviveCost(7)).toBeGreaterThan(reviveCost(1));
    const run = createGauntletRun("bandit", "palm");
    expect(applyBankerBoost(run, 3).pot).toBe(60);
    const lifed = applyLifeline(run, "stat50");
    expect(lifed.statBoostMul).toBe(1.5);
    const divine = applyLifeline(run, "divineWeapons");
    expect(divine.divineWeapons).toBe(true);
  });

  it("§31.16 领奖屏黑市行：买得起可点、买不起置灰、已收锁定", () => {
    const run = { ...runWithPot(200), hp: 30 };
    const market = marketOffers(run, () => 0);
    const html = renderGauntletRewardPick(run, [], market, new Set());
    expect(html).toContain("顺路黑市");
    const heal = market.find((o) => o.kind === "heal")!;
    expect(heal.price).toBe(marketPrice("heal", 1, "easy"));
    const forge = market.find((o) => o.kind === "forge")!;
    const forgeHtml = html.slice(html.indexOf(`data-market-id="${forge.id}"`) - 220, html.indexOf(`data-market-id="${forge.id}"`));
    if (forge.price > run.pot) expect(forgeHtml).toContain("disabled");
    const bought = renderGauntletRewardPick(run, [], market, new Set([heal.id]));
    expect(bought).toContain("已收");
    expect(renderGauntletResult(runWithPot(33), 60, "破产出局")).toContain("破产出局");
  });
});
