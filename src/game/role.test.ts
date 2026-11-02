import { describe, expect, it } from "vitest";
import { climbTestContext } from "../combatLab/testContext";
import { CARD_REGISTRY } from "./content/cards";
import { cardPool } from "./rules/rewardRules";
import { makeRun } from "./run";
import { ROGUE_ROSTER } from "./rogueRoster";
import { PAIR_BONDS, GROUP_BONDS, GRUDGE_BONDS, fuseForSwap } from "./affinityBonds";
import { BASIC_KIT, WEAPON_SPECTRUM, swapHallWeapon } from "./weaponKit";
import { cardSchool } from "./party";
import { drawOneCard, makeBattle, playCard, swapFighter } from "./sim";
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
});
