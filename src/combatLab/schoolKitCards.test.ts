import { describe, expect, it } from "vitest";
import { CARDS } from "../game/content";
import { CHASE_CARD_IDS, MOVE_CARD_IDS } from "../game/intentWeakness";
import {
  ROGUE_SCHOOLS,
  SCHOOL_EXTRA_HIT,
  SCHOOL_EXTRA_STATUS,
  SCHOOL_SCHOOL_STEP,
  hitCardId,
  statusCardId,
  stepCardId,
} from "../game/rogueCards";
import { playCard } from "../game/sim";
import { setLabMode } from "../game/labTuning";
import { startLabBattle } from "./factory";
import { breakRewardCardPool, buildGauntletPreset, createGauntletRun } from "./gauntlet";
import { renderDevPanelModal, setDevPanelState } from "./devPanel";
import { setLabRuleset } from "./labRuleset";

describe("六系增补：状态 / 攻击 / 本系进退", () => {
  it("每系各有一张攻击、状态、本系进退，且进 CARDS", () => {
    for (const school of ROGUE_SCHOOLS) {
      const hit = hitCardId(school);
      const buff = statusCardId(school);
      const step = stepCardId(school);
      expect(CARDS[hit]?.type).toBe("attack");
      expect(CARDS[hit]?.school).toBe(school);
      expect(CARDS[buff]?.type).toBe("skill");
      expect(CARDS[buff]?.school).toBe(school);
      expect(CARDS[step]?.type).toBe("skill");
      expect(CARDS[step]?.school).toBe(school);
      expect(CARDS[step]?.steps).not.toBe(0);
      expect(SCHOOL_EXTRA_HIT[school]).toBe(hit);
      expect(SCHOOL_EXTRA_STATUS[school]).toBe(buff);
      expect(SCHOOL_SCHOOL_STEP[school]).toBe(step);
    }
  });

  it("本系进退进位移充能；前进类可追", () => {
    for (const school of ROGUE_SCHOOLS) {
      const step = stepCardId(school);
      expect(MOVE_CARD_IDS).toContain(step);
      if ((CARDS[step]?.steps ?? 0) > 0) expect(CHASE_CARD_IDS).toContain(step);
    }
  });

  it("开踢奖励池从馆 1 就能摸到这三张", () => {
    setLabRuleset("break");
    for (const school of ROGUE_SCHOOLS) {
      const run = createGauntletRun("shaolin", school);
      const pool = breakRewardCardPool(run);
      expect(pool).toContain(statusCardId(school));
      expect(pool).toContain(stepCardId(school));
      expect(run.deckRecipe.includes(hitCardId(school)) || pool.includes(hitCardId(school))).toBe(true);
    }
  });

  it("实验台牌页能选到新牌，并显示生效数值", () => {
    setLabRuleset("break");
    setDevPanelState({ tab: "card" });
    const html = renderDevPanelModal();
    expect(html).toContain("hitPalm");
    expect(html).toContain("statusSaber");
    expect(html).toContain("stepSword");
    expect(html).toContain("生效");
  });

  it("崩拳打出伤和击退；攒枪不被枪距表改成 4", () => {
    setLabRuleset("break");
    setLabMode(true);
    const palm = startLabBattle(buildGauntletPreset(createGauntletRun("shaolin", "palm")), true, 1);
    palm.player.pos = 3;
    palm.enemy.pos = 4;
    palm.energy = 6;
    palm.hand = [{ uid: "hp", defId: hitCardId("palm") }];
    const hp = palm.enemy.hp;
    const pos = palm.enemy.pos;
    const afterPalm = playCard(palm, "hp");
    expect(afterPalm.enemy.hp).toBeLessThan(hp);
    expect(afterPalm.enemy.pos).not.toBe(pos);
    expect(afterPalm.journal.some((j) => j.side === "you" && /崩拳/.test(j.text))).toBe(true);

    const spear = startLabBattle(buildGauntletPreset(createGauntletRun("shaolin", "spear")), true, 1);
    spear.player.pos = 1;
    spear.enemy.pos = 3;
    spear.energy = 6;
    spear.hand = [{ uid: "hs", defId: hitCardId("spear") }];
    const shp = spear.enemy.hp;
    const afterSpear = playCard(spear, "hs");
    expect(shp - afterSpear.enemy.hp).toBeGreaterThanOrEqual(7);
  });

  it("打出本系进退会位移", () => {
    setLabRuleset("break");
    const run = createGauntletRun("shaolin", "palm");
    const b = startLabBattle(buildGauntletPreset(run), false, 1);
    b.player.pos = 1;
    b.enemy.pos = 4;
    b.energy = 6;
    b.hand = [{ uid: "stp", defId: stepCardId("palm") }];
    const after = playCard(b, "stp");
    expect(after.player.pos).not.toBe(1);
  });
});
