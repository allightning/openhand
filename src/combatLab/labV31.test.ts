/**
 * §31.11 武器体系重做：
 * 距离闸（拳1/刀剑钩2/枪棍3）、六系特色（刀埋招/枪远近/棍连晕/钩缴械/拳震壁/剑创伤）、
 * 六系绝招前置、搓手减费、弃牌按回合（甲方实测回归）。
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CARDS } from "../game/content";
import { setLabMode, setLabTuning } from "../game/labTuning";
import { SCHOOL_REACH, WEAPON_PACE, cardSchool } from "../game/party";
import { canPlay, endTurn, labDiscardsLeft, playCard, previewCard } from "../game/sim";
import type { Battle, CardId, WeaponId } from "../game/types";
import { startLabBattle } from "./factory";
import { buildGauntletPreset, createGauntletRun } from "./gauntlet";

function schoolBattle(school: WeaponId): Battle {
  return startLabBattle(buildGauntletPreset(createGauntletRun("bandit", school)), true, 1);
}

function withCard(b: Battle, id: CardId, patch: Partial<Battle> = {}): Battle {
  return { ...b, hand: [{ uid: "t1", defId: id }], energy: 10, ...patch };
}

beforeEach(() => {
  setLabMode(true);
  setLabTuning({ rulesV2: true, v2Fx: false });
});
afterEach(() => setLabMode(false));

describe("§31.11 距离与先机", () => {
  it("距离链：拳1 刀剑钩2 枪棍3", () => {
    expect(SCHOOL_REACH.palm).toBe(1);
    expect(SCHOOL_REACH.saber).toBe(2);
    expect(SCHOOL_REACH.sword).toBe(2);
    expect(SCHOOL_REACH.hook).toBe(2);
    expect(SCHOOL_REACH.spear).toBe(3);
    expect(SCHOOL_REACH.staff).toBe(3);
  });

  it("先机链：拳最快，刀最慢", () => {
    expect(WEAPON_PACE.palm).toBeGreaterThan(WEAPON_PACE.sword);
    expect(WEAPON_PACE.sword).toBe(WEAPON_PACE.hook);
    expect(WEAPON_PACE.sword).toBeGreaterThan(WEAPON_PACE.spear);
    expect(WEAPON_PACE.spear).toBe(WEAPON_PACE.staff);
    expect(WEAPON_PACE.staff).toBeGreaterThan(WEAPON_PACE.saber);
  });

  it("拳掌贴身才打得到，枪三格外也能戳", () => {
    const palm = withCard(schoolBattle("palm"), "strike");
    palm.enemy.pos = palm.player.pos + 3;
    expect(canPlay(palm, "t1").ok).toBe(false);
    expect(canPlay(palm, "t1").reason).toContain("够不着");
    palm.enemy.pos = palm.player.pos + 1;
    expect(canPlay(palm, "t1").ok).toBe(true);

    const spear = withCard(schoolBattle("spear"), "thrust");
    spear.enemy.pos = spear.player.pos + 3;
    expect(canPlay(spear, "t1").ok).toBe(true);
    spear.enemy.pos = spear.player.pos + 4;
    expect(canPlay(spear, "t1").ok).toBe(false);
  });
});

describe("§31.11 六系特色", () => {
  it("刀·埋招：上回合挨过打则 +4", () => {
    const base = withCard(schoolBattle("saber"), "cut");
    base.enemy.pos = base.player.pos + 1;
    const cold = previewCard(base, "t1");
    const hot = previewCard({ ...base, foeHitLastTurn: true }, "t1");
    expect(cold.enemyHp - hot.enemyHp).toBe(4);
  });

  it("枪·远强近弱：远 +3 近 -2", () => {
    const b = withCard(schoolBattle("spear"), "thrust");
    b.enemy.pos = b.player.pos + 3;
    const far = previewCard(b, "t1");
    b.enemy.pos = b.player.pos + 1;
    const near = previewCard(b, "t1");
    expect(near.enemyHp - far.enemyHp).toBe(8); // farBonus 3 + 特色远+3/近-2
  });

  it("剑·创伤叠层：敌裂创 6 层则 +2", () => {
    const b = withCard(schoolBattle("sword"), "pierce");
    b.enemy.pos = b.player.pos + 1;
    const clean = previewCard(b, "t1");
    const bleeding = previewCard({ ...b, bleed: 6 }, "t1");
    expect(clean.enemyHp - bleeding.enemyHp).toBe(2);
  });

  it("棍·连击眩晕：一回合第 3 张攻击晕 1 段", () => {
    let b = schoolBattle("staff");
    b.enemy.pos = b.player.pos + 2;
    b = {
      ...b,
      energy: 10,
      hand: [
        { uid: "s1", defId: "split" },
        { uid: "s2", defId: "split" },
        { uid: "s3", defId: "split" },
      ],
    };
    b = playCard(b, "s1");
    b = playCard(b, "s2");
    expect(b.foeStun ?? 0).toBe(0);
    b = playCard(b, "s3");
    expect(b.foeStun).toBe(1);
  });

  it("眩晕跳过敌攻击段", () => {
    let b = schoolBattle("staff");
    b.enemy.pos = b.player.pos + 1;
    b = { ...b, foeStun: 1, playerBlock: 0 };
    b.intent = { kind: "strike", damage: 10 };
    b.intents = [{ kind: "strike", damage: 10 }];
    const hp = b.player.hp;
    b = endTurn(b);
    expect(b.player.hp).toBe(hp);
    expect(b.foeStun).toBe(0);
  });

  it("钩·缴械：摘兵钩缴械 2 息，敌攻击减半；钩打缴械敌 +3", () => {
    let b = withCard(schoolBattle("hook"), "hookDisarm");
    b.enemy.pos = b.player.pos + 2;
    b = playCard(b, "t1");
    expect(b.foeDisarm).toBe(2);
    // 缴械中钩系攻击 +3
    const c = withCard(b, "hookpull", { energy: 10 });
    const armed = previewCard({ ...c, foeDisarm: 0 }, "t1");
    const disarmed = previewCard(c, "t1");
    expect(armed.enemyHp - disarmed.enemyHp).toBe(3);
    // 缴械中敌攻击减半
    let d = { ...b, playerBlock: 0 };
    d.intent = { kind: "strike", damage: 10 };
    d.intents = [{ kind: "strike", damage: 10 }];
    const hp = d.player.hp;
    d = endTurn(d);
    expect(d.player.hp).toBe(hp - 5);
  });

  it("拳·震壁：敌上墙 +6 且晕 1 段", () => {
    let b = withCard(schoolBattle("palm"), "push");
    b.enemy.pos = 5;
    b.player.pos = 4;
    b = playCard(b, "t1");
    expect(b.foeStun).toBe(1);
    expect(b.log.some((l) => l.includes("震壁"))).toBe(true);
  });
});

describe("§31.11 六系绝招前置", () => {
  const cases: Array<{ school: WeaponId; id: CardId; setup: (b: Battle) => Battle }> = [
    { school: "saber", id: "ultSaber", setup: (b) => ({ ...b, foeHitLastTurn: true }) },
    { school: "sword", id: "ultSword", setup: (b) => ({ ...b, bleed: 4 }) },
    { school: "spear", id: "ultSpear", setup: (b) => b },
    { school: "staff", id: "ultStaff", setup: (b) => ({ ...b, attacksThisTurn: 2 }) },
    { school: "hook", id: "ultHook", setup: (b) => ({ ...b, foeDisarm: 1 }) },
    { school: "palm", id: "ultPalm", setup: (b) => b },
  ];
  for (const c of cases) {
    it(`${CARDS[c.id].name}：缺前置锁住，满足前置可打`, () => {
      let b = withCard(schoolBattle(c.school), c.id);
      // 摆到该绝招「距离合法但前置不满足」的位置
      if (c.id === "ultSpear") b.enemy.pos = b.player.pos + 2;
      else if (c.id === "ultPalm") {
        b.enemy.pos = 5;
        b.player.pos = 4;
      } else b.enemy.pos = b.player.pos + 1;
      const locked = canPlay(b, "t1");
      expect(locked.ok).toBe(false);
      expect(locked.reason).toContain("绝招");
      b = c.setup(b);
      if (c.id === "ultSpear") b.enemy.pos = b.player.pos + 3;
      if (c.id === "ultPalm") {
        b.enemy.pos = 6;
        b.player.pos = 5;
      }
      expect(canPlay(b, "t1").ok).toBe(true);
    });
  }

  it("六系绝招都在奖励池（系别归属正确）", () => {
    for (const id of ["ultSaber", "ultSword", "ultSpear", "ultStaff", "ultHook", "ultPalm"] as CardId[]) {
      expect(CARDS[id].ultimate).toBeTruthy();
      expect(cardSchool(id)).not.toBe("any");
    }
  });
});

describe("§31.11 减费与弃牌", () => {
  it("搓手 0 费，下张牌耗劲 -1", () => {
    expect(CARDS.weave.cost).toBe(0);
    let b = schoolBattle("palm");
    b.enemy.pos = b.player.pos + 1;
    b = {
      ...b,
      energy: 3,
      hand: [
        { uid: "w", defId: "weave" },
        { uid: "s", defId: "strike2" },
      ],
    };
    b = playCard(b, "w");
    expect(b.costDiscountNext).toBe(1);
    const e0 = b.energy;
    b = playCard(b, "s"); // 开山掌 2 费 → 实扣 1
    expect(e0 - b.energy).toBe(1);
    expect(b.costDiscountNext ?? 0).toBe(0);
  });

  it("弃牌上限按补牌后的手牌数（上回合打光也有 2 次）", () => {
    let b = schoolBattle("palm");
    b.enemy.pos = b.player.pos + 1;
    b = { ...b, hand: [b.hand[0]!], playerBlock: 0 };
    b.intent = { kind: "windup" };
    b.intents = [{ kind: "windup" }];
    b = endTurn(b); // 补牌后手牌回到 5
    expect(b.hand.length).toBe(5);
    expect(b.v2Turn?.turnStartHand).toBe(5);
    expect(labDiscardsLeft(b)).toBe(2);
  });
});

describe("§31.12 败判看全队", () => {
  it("后场有活人：场上倒下→队友顶上，不判负", () => {
    let b = schoolBattle("palm");
    // 手工塞一个后场队员
    b = {
      ...b,
      bench: [
        ...b.bench,
        { id: "blade" as never, hp: 30, maxHp: 30, hand: [], drawPile: [], discardPile: [] },
      ],
    };
    b.player.hp = 1;
    b.playerBlock = 0;
    b.enemy.pos = b.player.pos + 1;
    b.intent = { kind: "strike", damage: 10 };
    b.intents = [{ kind: "strike", damage: 10 }];
    b = endTurn(b);
    expect(b.phase).not.toBe("lost");
    expect(b.active).toBe("blade");
    expect(b.player.hp).toBe(30);
    expect(b.bench.some((m) => m.hp > 0)).toBe(false); // 顶上者已离场下
  });

  it("后场无人：倒下才判负", () => {
    let b = schoolBattle("palm");
    b = { ...b, bench: [] };
    b.player.hp = 1;
    b.playerBlock = 0;
    b.enemy.pos = b.player.pos + 1;
    b.intent = { kind: "strike", damage: 10 };
    b.intents = [{ kind: "strike", damage: 10 }];
    b = endTurn(b);
    expect(b.phase).toBe("lost");
  });
});

describe("§31.12 红格覆盖与实收伤害", () => {
  it("抢步红格 = 落点覆盖圈（落点旁也算危险）", async () => {
    const { dangerCellsForIntent } = await import("../game/sim");
    const b = schoolBattle("palm");
    b.enemy.pos = 4;
    b.player.pos = 1;
    b.v2Turn = { ...b.v2Turn!, turnStartPos: 1 };
    // 敌在 4，朝锁定格 1 进一步 → 落点 3，reach 1 → 红格 2,3,4
    const cells = dangerCellsForIntent(b, { kind: "lunge", damage: 10 });
    expect(cells).toContain(3);
    expect(cells).toContain(2);
    expect(cells).toContain(4);
  });

  it("冲锋红格含终点覆盖圈", async () => {
    const { dangerCellsForIntent } = await import("../game/sim");
    const b = schoolBattle("palm");
    b.enemy.pos = 1;
    b.player.pos = 5;
    // 冲锋 3 步：路径 2,3,4，终点 4 的 reach1 覆盖 3,4,5 → 你站 5 也是红格
    const cells = dangerCellsForIntent(b, { kind: "charge", damage: 10, steps: 3 });
    expect(cells).toContain(2);
    expect(cells).toContain(5);
  });

  it("长兵器敌（reach 2）抢步后 2 格内都命中", async () => {
    const b = schoolBattle("palm");
    b.enemy = { ...b.enemy, pos: 4 };
    b.player.pos = 2;
    b.playerBlock = 0;
    // 篡玺 reach 2：4 → 进一步到 3，距你 1 ≤ 2 → 命中
    const hp = b.player.hp;
    b.intent = { kind: "lunge", damage: 10 };
    b.intents = [{ kind: "lunge", damage: 10 }];
    b.enemyId = "usurper" as never;
    const after = endTurn(b);
    expect(after.player.hp).toBeLessThan(hp);
  });

  it("意图条显示实收伤害：鏖战加成进数字并进悬停拆解", async () => {
    const { intentIncoming } = await import("../game/sim");
    const b = schoolBattle("palm");
    b.v2GrudgeBonus = 9;
    const inc = intentIncoming(b, { kind: "strike", damage: 11 });
    expect(inc.total).toBe(20);
    expect(inc.parts.join()).toContain("鏖战 +9");
  });

  it("缴械中实收减半", async () => {
    const { intentIncoming } = await import("../game/sim");
    const b = schoolBattle("palm");
    b.foeDisarm = 2;
    const inc = intentIncoming(b, { kind: "strike", damage: 11 });
    expect(inc.total).toBe(5);
    expect(inc.parts.join()).toContain("缴械");
  });
});
