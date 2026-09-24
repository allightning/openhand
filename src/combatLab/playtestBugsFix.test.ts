import { afterEach, describe, expect, it } from "vitest";
import { setLabMode, setLabTuning } from "../game/labTuning";
import { setLabRuleset } from "./labRuleset";
import {
  applyLifeline,
  buildGauntletPreset,
  createGauntletRun,
  reviveGauntletRun,
  wagerOffers,
} from "./gauntlet";
import { startLabBattle } from "./factory";
import { breakStarterDeck } from "../game/rogueCards";
import { CARDS } from "../game/content";
import { endTurn, playCard } from "../game/sim";
import { labCard } from "../game/labContent";
import { climbTestContext } from "../game/testContext";
import { labV21EffectiveCost } from "../game/labV21";
import { WEAPON_NAME } from "../game/party";

describe("试玩反馈修复 2026-09-17", () => {
  afterEach(() => {
    setLabRuleset("climb");
    setLabMode(false);
    setLabTuning({ playerDmgMul: 1 });
  });

  it("赌坊秘药：刀客开战气血也吃 +50%", () => {
    setLabRuleset("climb");
    let run = createGauntletRun("bandit", "saber");
    expect(run.hpMax).toBe(50);
    run = applyLifeline(run, "stat50");
    const revived = reviveGauntletRun({ ...run, pot: 99, bankruptUsed: false })!;
    expect(revived.hpMax).toBe(75);
    setLabMode(true);
    setLabTuning({ playerDmgMul: revived.statBoostMul ?? 1 });
    const b = startLabBattle(buildGauntletPreset(revived), true, 1);
    expect(b.player.maxHp).toBe(75);
    expect(b.player.hp).toBe(75);
  });

  it("下注本系项不写死「本系刀」", () => {
    setLabRuleset("climb");
    const palm = createGauntletRun("bandit", "palm");
    let offer: ReturnType<typeof wagerOffers>[number] | undefined;
    for (let i = 0; i < 40 && !offer; i++) {
      offer = wagerOffers(palm, () => i / 40).find((o) => o.kind === "school");
    }
    expect(offer).toBeTruthy();
    expect(offer!.title).toBe(`本系${WEAPON_NAME.palm}`);
    expect(offer!.title).not.toContain("本系刀");
  });

  it("爬塔收势清 youSkillTax，技能费不跨手累加", () => {
    setLabRuleset("climb");
    setLabMode(true);
    let b = startLabBattle(buildGauntletPreset(createGauntletRun("bandit", "palm")), true, 1);
    b.hand = [{ uid: "sk1", defId: "defend" }, ...b.hand];
    b.youSkillTax = 3;
    expect(labV21EffectiveCost(b, labCard("defend", climbTestContext()), climbTestContext())).toBeGreaterThan(labCard("defend", climbTestContext()).cost);
    b = endTurn(b, climbTestContext(), { deferIntentRefresh: true, deferStatusTicks: false });
    expect(b.youSkillTax ?? 0).toBe(0);
  });

  it("钩起手谱含击退或换位，可贴墙脱身", () => {
    const deck = breakStarterDeck("hook");
    const defs = deck.map((id) => CARDS[id]!);
    const canSpace = defs.some((d) => (d.knock ?? 0) > 0 || d.swap || (d.steps ?? 0) < 0 || idHasRetreat(deck));
    expect(canSpace).toBe(true);
    expect(defs.some((d) => (d.knock ?? 0) > 0 || d.swap)).toBe(true);
  });
});

function idHasRetreat(deck: string[]): boolean {
  return deck.includes("retreat");
}
