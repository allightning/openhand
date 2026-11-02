import { describe, expect, it } from "vitest";
import { climbTestContext } from "../combatLab/testContext";
import { CARD_REGISTRY } from "./content/cards";
import { cardPool } from "./rules/rewardRules";
import { makeRun } from "./run";
import { ROGUE_ROSTER } from "./rogueRoster";
import {
  PAIR_BONDS,
  GROUP_BONDS,
  GRUDGE_BONDS,
  bondScale,
  farDamageBonus,
  fuseForSwap,
  stakeHitBonus,
  tearBlock,
} from "./affinityBonds";
import { CARDS } from "./content";
import { CLIMB_BLEED_CAP, CLIMB_EXPOSE_CAP, CLIMB_PULL_MAX, CLIMB_TRIPLE_BLEED_BONUS, CLIMB_TRIPLE_EXPOSE_BONUS } from "./climbCaps";
import { climbVitals } from "./climbVitals";
import { grantPoisonItem } from "./poison";
import { applyBodyBuild } from "./professions";
import { BASIC_KIT, WEAPON_SPECTRUM, swapHallWeapon } from "./weaponKit";
import { cardSchool } from "./party";
import { drawOneCard, endTurn, makeBattle, playCard, swapFighter } from "./sim";
import { advanceProfession, cheatWager, markEnemyOpen, rollWager, seeThrough } from "./professions";
import type { CardId, WeaponId } from "./types";

const rc = climbTestContext();

describe("角色核", () => {
  it("18 人武器谱是 3 或 4 种，本命在第一位", () => {
    expect(ROGUE_ROSTER).toHaveLength(18);
    for (const mate of ROGUE_ROSTER) {
      const spec = WEAPON_SPECTRUM[mate.id] ?? [];
      expect(spec.length === 3 || spec.length === 4).toBe(true);
      expect(spec[0]).toBe(mate.weapon);
      expect(mate.spectrum).toEqual(spec);
      expect(mate.body === "scholar" || mate.body === "fighter" || mate.body === "walker").toBe(true);
    }
    expect(ROGUE_ROSTER.filter((m) => m.body === "walker").length).toBeGreaterThanOrEqual(4);
    for (const mate of ROGUE_ROSTER) {
      if (mate.body === "walker") expect(mate.role).toBe("skirmish");
    }
  });

  it("战斗中不能换装；馆间换装弹出异系牌并补上 6 张基础牌", () => {
    const run = makeRun("empty");
    run.party = ["watch"];
    run.active = "watch";
    run.deck = ["cut", "strike", "thrust", "gather"];
    run.mateDecks = { watch: ["cut", "strike", "thrust", "gather"] };
    const denied = swapHallWeapon(run, "watch", "palm", true);
    expect(denied.ok).toBe(false);
    const swapped = swapHallWeapon(run, "watch", "palm", false);
    expect(swapped.ok).toBe(true);
    expect(swapped.ejected).toContain("thrust");
    expect(swapped.ejected).not.toContain("strike");
    for (const id of BASIC_KIT.palm) expect(swapped.run.mateDecks.watch).toContain(id);
    expect(swapped.run.mateSchools?.watch).toBe("palm");
  });

  it("基础牌留在本系或通用", () => {
    for (const [school, ids] of Object.entries(BASIC_KIT) as [WeaponId, CardId[]][]) {
      expect(ids).toHaveLength(6);
      for (const id of ids) {
        const sch = cardSchool(id);
        expect(sch === school || sch === "any").toBe(true);
      }
    }
  });

  it("融合牌不进奖励池，登记为生成物", () => {
    expect(cardPool("saber", true).some((id) => String(id).startsWith("fuse"))).toBe(false);
    expect(CARD_REGISTRY.fusePalmSaber?.generated).toBe(true);
    expect(PAIR_BONDS).toHaveLength(8);
    expect(GROUP_BONDS).toHaveLength(6);
    expect(GRUDGE_BONDS).toHaveLength(2);
  });

  it("生死缘分换人发一张融合牌，打完不进弃牌", () => {
    const run = makeRun("empty");
    run.party = ["watch", "lishuangxing"];
    run.active = "watch";
    let b = makeBattle("catcher", rc, run, true);
    b.party = ["watch", "lishuangxing"];
    b.active = "watch";
    b.bench = [
      {
        id: "lishuangxing",
        hp: 20,
        maxHp: 20,
        hand: [],
        drawPile: [],
        discardPile: [],
        energy: 6,
      },
    ];
    b.labMateWeapons = { watch: "saber-a-1", lishuangxing: "sword-a-1" };
    b.bondStages = { "lishuangxing|watch": "life" };
    b.energy = 8;
    expect(fuseForSwap(b.party, "watch", "lishuangxing", b.bondStages)).toBe(true);
    b = swapFighter(b, "lishuangxing", rc);
    const fuse = b.hand.find((c) => String(c.defId).startsWith("fuse"));
    expect(fuse?.ephemeral).toBe(true);
    b.energy = 8;
    b.player.pos = 0;
    b.enemy.pos = 1;
    b = playCard(b, fuse!.uid, rc);
    expect(b.hand.some((c) => c.uid === fuse!.uid)).toBe(false);
    expect(b.discardPile.some((c) => c.uid === fuse!.uid)).toBe(false);
  });

  it("桩师没进阶时裂桩不爆，进阶后可爆", () => {
    const run = makeRun("empty", "sapper");
    run.professions = { sapper: "staker" };
    let b = makeBattle("catcher", rc, run, true);
    b.professions = { sapper: "staker" };
    b.stakes = [1];
    b.player.pos = 0;
    b.enemy.pos = 2;
    b.hand = [{ uid: "sp", defId: "split" }];
    b.energy = 8;
    const held = playCard(b, "sp", rc);
    expect(held.log.join(" ")).toContain("桩还没开");
    advanceProfession(b);
    b.hand = [{ uid: "sp2", defId: "split" }];
    b.stakes = [1];
    b.energy = 8;
    const open = playCard(b, "sp2", rc);
    expect(open.log.join(" ")).toContain("裂桩爆炸");
  });

  it("相士有风声，记亮招一次，看破后虚招不再挡窗", () => {
    const run = makeRun("empty");
    run.professions = { rail: "diviner" };
    const b = makeBattle("catcher", rc, run, true);
    expect(b.rumor).toBeTruthy();
    expect(markEnemyOpen(b)[0]).toBe("记成亮招");
    expect(markEnemyOpen(b)[0]).toContain("已经记过");
    expect(seeThrough(b)[0]).toContain("还没看破");
    advanceProfession(b);
    expect(seeThrough(b)[0]).toContain("虚招还原");
    expect(b.feintOpen).toBe(true);
  });

  it("赌徒加注近乎对半；出千后必赚且奖励更高", () => {
    const run = makeRun("empty");
    run.professions = { rail: "gambler" };
    const b = makeBattle("catcher", rc, run, true);
    b.professions = { rail: "gambler" };
    b.energy = 3;
    const lose = rollWager(b, () => 0.9);
    expect(lose[0]).toContain("自伤");
    b.energy = 3;
    b.player.hp = b.player.maxHp;
    const win = rollWager(b, () => 0.1);
    expect(win[0]).toContain("回劲 4");
    advanceProfession(b);
    cheatWager(b);
    b.energy = 3;
    const cheated = rollWager(b, () => 0.9);
    expect(cheated[0]).toContain("回劲 6");
  });

  it("没有 drawWhen 的牌照常抽进手", () => {
    const b = makeBattle("catcher", rc, makeRun("empty"), true);
    const top = b.drawPile[0];
    expect(top).toBeTruthy();
    b.hand = [];
    expect(drawOneCard(b)).toBe(true);
    expect(b.hand[0]?.defId).toBe(top!.defId);
  });

  it("同路 ×1.5 取整，生死 ×2", () => {
    expect(bondScale(2, "acquaint")).toBe(2);
    expect(bondScale(2, "road")).toBe(3);
    expect(bondScale(2, "life")).toBe(4);
    expect(stakeHitBonus(["shiwanshan", "zhangshoushan"], "shiwanshan", { "shiwanshan|zhangshoushan": "road" })).toBe(2);
    expect(tearBlock(["boqing", "lvchifeng"], "boqing")).toBe(2);
    expect(farDamageBonus(["huochangchuan", "gongsunsizhang"], "huochangchuan")).toBe(2);
  });

  it("门桩落桩多挡一次", () => {
    const run = makeRun("empty");
    run.party = ["shiwanshan", "zhangshoushan"];
    run.active = "shiwanshan";
    const b = makeBattle("catcher", rc, run, true);
    b.party = ["shiwanshan", "zhangshoushan"];
    b.active = "shiwanshan";
    b.player.pos = 0;
    b.enemy.pos = 3;
    b.hand = [{ uid: "pl", defId: "plant" }];
    b.energy = 8;
    const after = playCard(b, "pl", rc);
    expect(after.stakeHits?.[1]).toBeGreaterThanOrEqual(2);
  });

  it("掌春收势回血", () => {
    const run = makeRun("empty");
    run.party = ["baimenghe", "zhounuanxiang"];
    run.active = "baimenghe";
    let b = makeBattle("catcher", rc, run, true);
    b.party = ["baimenghe", "zhounuanxiang"];
    b.player.hp = b.player.maxHp - 5;
    const before = b.player.hp;
    b.intent = { kind: "guard", block: 1 };
    b.intents = [b.intent];
    b = endTurn(b, rc);
    expect(b.player.hp).toBeGreaterThan(before);
  });

  it("岁笙开场剑势，争锋压掉一层", () => {
    const year = makeRun("empty");
    year.party = ["wenrensheng", "duguposui"];
    year.active = "wenrensheng";
    const opened = makeBattle("catcher", rc, year, true);
    expect(opened.v2SwordChain ?? 0).toBeGreaterThanOrEqual(1);
    const rival = makeRun("empty");
    rival.party = ["wenrensheng", "duguposui"];
    rival.active = "wenrensheng";
    const b = makeBattle("catcher", rc, rival, true);
    b.party = ["wenrensheng", "duguposui"];
    b.active = "wenrensheng";
    b.labMateWeapons = { wenrensheng: "sword-a-1" };
    b.player.pos = 0;
    b.enemy.pos = 1;
    b.hand = [{ uid: "sw", defId: "hitSword" }];
    b.energy = 8;
    const before = b.v2SwordChain ?? 0;
    const after = playCard(b, "sw", rc);
    expect(after.log.join(" ")).toContain("争锋");
    expect(after.v2SwordChain ?? 0).toBeLessThanOrEqual(before);
  });

  it("身板三档：术士加蓝，武夫加血，行者加开局劲", () => {
    const scholar = makeRun("empty");
    scholar.party = ["moqiwan"];
    scholar.active = "moqiwan";
    const s = makeBattle("catcher", rc, scholar, true);
    expect(s.energyMax).toBe(climbVitals("moqiwan").energyMax + 2);
    expect(s.energyRegen).toBe(climbVitals("moqiwan").energyRegen + 1);
    const fighter = makeRun("empty");
    fighter.party = ["shiwanshan"];
    fighter.active = "shiwanshan";
    const f = makeBattle("catcher", rc, fighter, true);
    expect(f.player.maxHp).toBeGreaterThan(climbVitals("shiwanshan").hp);
    const walker = makeBattle("catcher", rc, makeRun("empty"), true);
    const qi = walker.energy;
    applyBodyBuild(walker, "walker");
    expect(walker.energy).toBe(qi + 2);
  });

  it("毒三档叠层，回合结束扣血且层不掉", () => {
    let b = makeBattle("catcher", rc, makeRun("empty"), true);
    b.player.pos = 0;
    b.enemy.pos = 1;
    b.hand = [{ uid: "st", defId: "strike" }];
    b.energy = 8;
    grantPoisonItem(b, "cuandu");
    b = playCard(b, "st", rc);
    expect(b.foePoison).toBe(2);
    const hp = b.enemy.hp;
    b.enemyBlock = 8;
    b.bleed = 0;
    b.intent = { kind: "guard", block: 1 };
    b.intents = [b.intent];
    b = endTurn(b, rc);
    expect(hp - b.enemy.hp).toBe(2);
    expect(b.enemyBlock).toBeGreaterThan(0);
    expect(b.foePoison).toBe(2);
    grantPoisonItem(b, "dujing");
    grantPoisonItem(b, "dugong");
    expect((b.poisonMind ?? 0) + (b.poisonTech ?? 0)).toBe(3);
  });

  it("条件抽：本手打过则 notAttacked 不进手", () => {
    const b = makeBattle("catcher", rc, makeRun("empty"), true);
    const def = CARDS.gather;
    const prev = def.drawWhen;
    def.drawWhen = "notAttacked";
    b.attacksThisTurn = 1;
    b.hand = [];
    b.drawPile = [{ uid: "g", defId: "gather" }, { uid: "d", defId: "defend" }];
    try {
      expect(drawOneCard(b)).toBe(false);
      expect(b.hand).toHaveLength(0);
    } finally {
      def.drawWhen = prev;
    }
  });

  it("十二条初识进结算，同路取整、生死翻倍，已发连携不重复", () => {
    const silk = withParty(["moqiwan", "ouyangyingou"], "moqiwan");
    const lone = withParty(["moqiwan"], "moqiwan");
    for (const b of [silk, lone]) {
      b.player.pos = 0;
      b.enemy.pos = 1;
      b.player.hp = b.player.maxHp - 10;
      b.foeDisarm = 1;
      b.hand = [{ uid: "hk", defId: "hitHook" }];
      b.energy = 8;
    }
    const silkAfter = playCard(silk, "hk", rc);
    const loneAfter = playCard(lone, "hk", rc);
    expect(silkAfter.player.hp - (silk.player.maxHp - 10)).toBe(loneAfter.player.hp - (lone.player.maxHp - 10) + 1);

    const rulers = withParty(["huochangchuan", "gongsunsizhang"], "huochangchuan");
    rulers.player.pos = 0;
    rulers.enemy.pos = 3;
    rulers.hand = [{ uid: "th", defId: "thrust" }];
    rulers.energy = 8;
    expect(playCard(rulers, "th", rc).log.join(" ")).toContain("远档缘分 +2");
    const line = withParty(["huochangchuan", "ananhuo"], "huochangchuan");
    line.player.pos = 0;
    line.enemy.pos = 3;
    line.hand = [{ uid: "th", defId: "thrust" }];
    line.energy = 8;
    expect(playCard(line, "th", rc).log.join(" ")).toContain("远档缘分 +1");

    const tear = withParty(["lvchifeng", "boqing"], "lvchifeng");
    tear.player.pos = 0;
    tear.enemy.pos = 1;
    tear.enemyBlock = 6;
    tear.bondStages = { "boqing|lvchifeng": "life" };
    tear.hand = [{ uid: "sb", defId: "hitSaber" }];
    tear.energy = 8;
    const torn = playCard(tear, "sb", rc);
    expect(torn.log.join(" ")).toContain("撕挡 4");
    expect(torn.bondTearUsed).toBe(true);

    const shore = withParty(["fubishan", "ananhuo"], "fubishan");
    shore.player.pos = 7;
    shore.enemy.pos = 8;
    shore.player.hp = shore.player.maxHp - 3;
    shore.hand = [{ uid: "pu", defId: "push" }];
    shore.energy = 8;
    const crashed = playCard(shore, "pu", rc);
    expect(crashed.log.join(" ")).toContain("撞壁回血 1");
    expect(crashed.player.hp).toBe(shore.player.maxHp - 2);

    const spring = withParty(["zhounuanxiang", "fubishan"], "fubishan");
    spring.player.hp = spring.player.maxHp - 5;
    spring.intent = { kind: "guard", block: 1 };
    spring.intents = [spring.intent];
    const rested = endTurn(spring, rc);
    expect(rested.log.join(" ")).toContain("缘分温补 回 1");
    expect(rested.player.hp).toBe(spring.player.maxHp - 4);

    const loft = withParty(["wenrensheng", "boqing"], "wenrensheng");
    loft.player.pos = 0;
    loft.enemy.pos = 1;
    loft.expose = 1;
    loft.hand = [{ uid: "sw", defId: "hitSword" }];
    loft.energy = 8;
    expect(playCard(loft, "sw", rc).log.join(" ")).toContain("破绽穿挡 5");

    const gate = withParty(["shiwanshan", "zhangshoushan"], "shiwanshan");
    gate.bondStages = { "shiwanshan|zhangshoushan": "road" };
    gate.player.pos = 0;
    gate.enemy.pos = 3;
    gate.hand = [{ uid: "pl", defId: "plant" }];
    gate.energy = 8;
    expect(playCard(gate, "pl", rc).stakeHits?.[1]).toBe(4);

    const staff = withParty(["shiwanshan", "fengtang"], "shiwanshan");
    staff.hand = [{ uid: "cg", defId: "staffPrime" }];
    staff.energy = 8;
    expect(playCard(staff, "cg", rc).chargeStacks).toBe(2);

    const hooks = withParty(["moqiwan", "chenchenlan"], "moqiwan");
    hooks.player.pos = 0;
    hooks.enemy.pos = 2;
    hooks.hand = [{ uid: "hp", defId: "hookpull" }];
    hooks.energy = 8;
    const pulled = playCard(hooks, "hp", rc);
    expect(pulled.log.join(" ")).toContain("续 1");
    expect(pulled.foeDisarm).toBeGreaterThanOrEqual(2);

    const run = makeRun("empty");
    run.party = ["watch", "lishuangxing"];
    run.active = "watch";
    let swap = makeBattle("catcher", rc, run, true);
    swap.party = ["watch", "lishuangxing"];
    swap.active = "watch";
    swap.bench = [{ id: "lishuangxing", hp: 20, maxHp: 20, hand: [], drawPile: [], discardPile: [], energy: 6 }];
    swap.labMateWeapons = { watch: "saber-a-1", lishuangxing: "sword-a-1" };
    swap.bondStages = { "lishuangxing|watch": "life" };
    swap.energy = 8;
    swap = swapFighter(swap, "lishuangxing", rc);
    const fid = swap.hand.find((c) => c.ephemeral)?.defId;
    expect(fid).toBeTruthy();
    swap.swappedThisTurn = false;
    swap.bench = swap.bench.map((m) => ({ ...m, energy: 6 }));
    swap.energy = 8;
    swap = swapFighter(swap, "watch", rc);
    swap.swappedThisTurn = false;
    swap.bench = swap.bench.map((m) => ({ ...m, energy: 6 }));
    swap.energy = 8;
    swap = swapFighter(swap, "lishuangxing", rc);
    const copies = [...swap.hand, ...swap.drawPile, ...swap.discardPile, ...swap.bench.flatMap((m) => [...m.hand, ...m.drawPile, ...m.discardPile])].filter(
      (c) => c.defId === fid,
    );
    expect(copies).toHaveLength(1);
  });

  it("牌意满 10 张：裂创帽、破绽帽、钩拉近上限", () => {
    const saber = withParty(["watch"], "watch");
    saber.bleed = 7;
    saber.drawPile = Array.from({ length: 10 }, (_, i) => ({ uid: `c${i}`, defId: "cut" }));
    saber.player.pos = 0;
    saber.enemy.pos = 1;
    saber.hand = [{ uid: "hit", defId: "hitSaber" }];
    saber.energy = 8;
    expect(playCard(saber, "hit", rc).bleed).toBe(CLIMB_BLEED_CAP + CLIMB_TRIPLE_BLEED_BONUS);

    const sword = withParty(["wenrensheng"], "wenrensheng");
    sword.expose = 10;
    sword.drawPile = Array.from({ length: 10 }, (_, i) => ({ uid: `s${i}`, defId: "hitSword" }));
    sword.hand = [{ uid: "ex", defId: "expose" }];
    sword.energy = 8;
    expect(playCard(sword, "ex", rc).expose).toBe(CLIMB_EXPOSE_CAP + CLIMB_TRIPLE_EXPOSE_BONUS);

    const hook = withParty(["moqiwan"], "moqiwan");
    hook.player.pos = 0;
    hook.enemy.pos = 8;
    hook.drawPile = Array.from({ length: 10 }, (_, i) => ({ uid: `h${i}`, defId: "hookpull" }));
    hook.hand = [{ uid: "sk", defId: "statusHook2" }];
    hook.energy = 8;
    const card = CARDS.statusHook2;
    const prev = card.pullEnemy;
    card.pullEnemy = 6;
    try {
      expect(playCard(hook, "sk", rc).enemy.pos).toBe(8 - CLIMB_PULL_MAX);
    } finally {
      card.pullEnemy = prev;
    }
  });

  it("条件抽：落桩、破绽、封、前进", () => {
    const def = CARDS.gather;
    const prev = def.drawWhen;
    const cases: Array<["staked" | "exposed" | "sealed" | "moved", (b: ReturnType<typeof makeBattle>) => void, boolean]> = [
      ["staked", (b) => { b.stakes = []; }, false],
      ["staked", (b) => { b.stakes = [2]; }, true],
      ["exposed", (b) => { b.expose = 0; }, false],
      ["exposed", (b) => { b.expose = 1; }, true],
      ["sealed", (b) => { b.youSeal = 0; }, false],
      ["sealed", (b) => { b.youSeal = 1; }, true],
      ["moved", (b) => { b.movedFwd = false; b.movedBack = false; }, false],
      ["moved", (b) => { b.movedFwd = true; }, true],
    ];
    try {
      for (const [when, prep, ok] of cases) {
        def.drawWhen = when;
        const b = makeBattle("catcher", rc, makeRun("empty"), true);
        prep(b);
        b.hand = [];
        b.drawPile = [{ uid: "g", defId: "gather" }];
        expect(drawOneCard(b)).toBe(ok);
      }
    } finally {
      def.drawWhen = prev;
    }
  });
});

function withParty(ids: string[], active: string) {
  const run = makeRun("empty");
  run.party = ids as typeof run.party;
  run.active = active as typeof run.active;
  const b = makeBattle("catcher", rc, run, true);
  b.party = ids as typeof b.party;
  b.active = active as typeof b.active;
  return b;
}
