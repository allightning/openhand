import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setLabMode, setLabTuning } from "../game/labTuning";
import {
  endTurn,
  legalSummonCells,
  occupied,
  playCard,
  summonAssist,
} from "../game/sim";
import { useLabItem } from "../game/labV21";
import { CARDS } from "../game/content";
import type { Battle } from "../game/types";
import { startLabBattle } from "./factory";
import { buildGauntletPreset, createGauntletRun } from "./gauntlet";

function v2Battle(): Battle {
  const b = startLabBattle(buildGauntletPreset(createGauntletRun("bandit", "palm")), true, 1);
  b.player.pos = 1;
  b.enemy.pos = 4;
  return b;
}

beforeEach(() => {
  setLabMode(true);
  setLabTuning({ rulesV2: true, v2Fx: false });
});
afterEach(() => {
  setLabTuning({ rulesV2: false });
  setLabMode(false);
});

describe("§31.12 助战符（与同行分家的客座好手）", () => {
  it("召唤上场：实体占格、一回合后离场", () => {
    let b = v2Battle();
    const cells = legalSummonCells(b);
    expect(cells.length).toBeGreaterThan(0);
    b = summonAssist(b, "staff", cells[0]!);
    expect(b.labSummon?.name).toBe("顿僧");
    expect(b.labSummon?.pos).toBe(cells[0]);
    expect(occupied(b, cells[0]!)).toBe(true);
    // 敌回合走完、玩家回合开始 → 离场
    b = endTurn(b);
    expect(b.labSummon).toBeNull();
  });

  it("六系绝活：棍眩晕 / 钩缴械 / 剑裂创 / 刀破绽 / 枪挑退", () => {
    let b = v2Battle();
    b = summonAssist(b, "staff", 0);
    expect(b.foeStun).toBe(1);

    b = v2Battle();
    b = summonAssist(b, "hook", 0);
    expect(b.foeDisarm).toBe(2);

    b = v2Battle();
    b = summonAssist(b, "sword", 0);
    expect(b.bleed).toBe(3);

    b = v2Battle();
    const ex = b.expose;
    b = summonAssist(b, "saber", 0);
    expect(b.expose).toBe(ex + 2);

    b = v2Battle();
    b.player.pos = 1;
    b.enemy.pos = 3;
    b = summonAssist(b, "spear", 0);
    expect(b.enemy.pos).toBe(4); // 挑退 1 格（远离玩家）
  });

  it("拳符吸仇：敌攻击段打它，算你拆（势 +1）", () => {
    let b = v2Battle();
    b.player.pos = 3;
    b.enemy.pos = 4;
    b = summonAssist(b, "palm", 2);
    const hpBefore = b.player.hp;
    const qiBefore = b.qi ?? 0;
    const breaksBefore = b.v2BreakCount ?? 0;
    b.intents = [{ kind: "strike", damage: 10 }];
    b = endTurn(b);
    expect(b.player.hp).toBe(hpBefore); // 玩家没挨打
    expect((b.v2BreakCount ?? 0)).toBe(breaksBefore + 1);
    expect((b.qi ?? 0)).toBeGreaterThan(qiBefore);
  });

  it("身位卡冲锋：召唤体挡住冲锋路 = 拆", () => {
    let b = v2Battle();
    b.player.pos = 1;
    b.enemy.pos = 5;
    b = summonAssist(b, "sword", 3); // 冲锋路径中间
    const hpBefore = b.player.hp;
    const breaksBefore = b.v2BreakCount ?? 0;
    b.intents = [{ kind: "charge", damage: 12, steps: 2 }];
    b = endTurn(b);
    expect(b.player.hp).toBe(hpBefore);
    expect(b.v2BreakCount ?? 0).toBe(breaksBefore + 1);
  });

  it("临时墙：敌被推上召唤体 = 撞墙（拳系震壁连招）", () => {
    let b = v2Battle();
    b.player.pos = 3;
    b.enemy.pos = 4;
    b = summonAssist(b, "staff", 5); // 敌身后当墙
    const foeHp = b.enemy.hp;
    b.hand = [{ uid: "t1", defId: "push" }];
    b.energy = 6;
    b = playCard(b, "t1");
    // 推宫击退 2：敌 4→5 撞上顿僧，吃撞壁 + 拳系震壁
    expect(b.enemy.pos).toBe(4);
    expect(b.enemy.hp).toBeLessThan(foeHp - 8); // 撞壁 8+震壁 6
    expect(b.foeStun ?? 0).toBeGreaterThanOrEqual(2); // 顿僧上场 1 + 震壁 1
  });

  it("助战符是消耗品：用掉就没了", () => {
    const b = v2Battle();
    b.labItems = ["aidStaff"];
    const r = useLabItem(b, "aidStaff", 0);
    expect(r.ok).toBe(true);
    expect(r.battle?.labSummon?.school).toBe("staff");
    expect(r.battle?.labItems).not.toContain("aidStaff");
  });
});

describe("§31.12 攒势自查：各系起手都有蓄劲", () => {
  it("蓄劲（v2）顺手攒 1 势", () => {
    let b = v2Battle();
    b.qi = 0;
    b.hand = [{ uid: "t1", defId: "charge" }];
    b.energy = 6;
    b = playCard(b, "t1");
    expect(b.qi).toBe(1);
    expect(CARDS.charge.text).toContain("势 +1");
  });

  it("剑系裂创自足：封喉刺 裂创 +2（两张喂饱剑走龙蛇前置）", () => {
    expect(CARDS.swordMute.bleed).toBe(2);
  });
});

describe("§31.12 预演条双态", () => {
  it("收势后捕获上轮敌招全程（v2LastFoeTurn）", () => {
    let b = v2Battle();
    b.player.pos = 3;
    b.enemy.pos = 4;
    b.intents = [{ kind: "strike", damage: 8 }];
    b = endTurn(b);
    expect(b.v2LastFoeTurn?.length).toBeGreaterThan(0);
    expect(b.v2LastFoeTurn?.join("")).toContain("8");
  });
});

describe("§31.12 伙伴选择界面：同系光环 / 异系组合技 写明", () => {
  it("标注随系别走", async () => {
    const { renderGauntletCompanionPick } = await import("./gauntletUi");
    const { createGauntletRun } = await import("./gauntlet");
    const run = createGauntletRun("bandit", "palm"); // 主角拳
    // rail 拳（同系） / watch 刀（异系）
    const html = renderGauntletCompanionPick(run, ["rail", "watch"]);
    expect(html).toContain("同系 · 共鸣光环");
    expect(html).toContain("异系 · 组合技");
    expect(html).toContain("击退 +1"); // 拳系光环双人档
  });
});

describe("§31.12 棋盘渲染：召唤体与点位高亮", () => {
  it("召唤体占格 + 点位模式高亮空格", async () => {
    const { renderProdBoard } = await import("./prodBattleUi");
    let b = v2Battle();
    b = summonAssist(b, "palm", 0);
    const html = renderProdBoard(b, null);
    expect(html).toContain("铁牛");
    expect(html).toContain("吸仇");
    const pickHtml = renderProdBoard(b, null, [], [1, 2]);
    expect(pickHtml).toContain("summon-pick");
  });
});
