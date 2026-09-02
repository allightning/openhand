import { describe, expect, it, beforeEach } from "vitest";
import {
  clearBreakDemoDone,
  createBreakDemoRun,
  companionWeaponLabel,
  buildBreakDemoPreset,
  applyBreakDemoBattle,
  afterDemoPlayCard,
  afterDemoEndTurn,
  lockDemoAfterFoeTurn,
  syncBreakDemoBattle,
  demoAllowsCard,
  demoAllowsEndTurn,
  demoEyeIdx,
  demoGuideForStage,
  demoIntents,
  demoLessons,
  demoRewardOptions,
  isBreakDemoDone,
  markBreakDemoDone,
  DEMO_COMPANION_CHOICES,
  DEMO_FIST_MATE,
  DEMO_SCHOOL,
} from "./breakDemo";
import { startLabBattle } from "./factory";
import { endTurn, playCard } from "../game/sim";
import { setLabMode, setLabTuning } from "../game/labTuning";
import { setLabRuleset } from "./labRuleset";

describe("break demo", () => {
  beforeEach(() => clearBreakDemoDone());

  it("starts locked to saber stage 1 with hard-break guide", () => {
    const run = createBreakDemoRun();
    expect(DEMO_SCHOOL).toBe("saber");
    expect(run.stage).toBe(1);
    expect(run.guideCardIds).toContain("retreat");
    expect(run.teachBanner).toMatch(/红格/);
    expect(demoIntents(1)[0]?.kind).toBe("strike");
  });

  it("training camp is six scripted lessons covering the core rules", () => {
    expect(demoLessons(1, null)[0]?.allowCardIds).toContain("retreat");
    expect(demoLessons(2, null)[0]?.allowCardIds).toEqual(["retreat"]);
    expect(demoLessons(2, null).filter((s) => s.kind === "play").length).toBeGreaterThanOrEqual(2);
    expect(demoIntents(2).filter((i) => i.kind === "strike").length).toBe(2);
    expect(demoIntents(3)[0]?.kind).toBe("barrage");
    expect(demoGuideForStage(3, false).guideCardIds).toContain("defend");
    expect(demoLessons(4, null)[0]?.allowCardIds).toContain("rift");
    expect(demoIntents(4)[0]?.kind).toBe("guard");
    const swapDone = demoLessons(6, "rail").find((s) => s.foeDebrief)?.foeDebrief?.body ?? "";
    expect(swapDone).toMatch(/追|撤/);
    expect(demoEyeIdx(5)).toBe(0);
    expect(demoLessons(5, null)[0]?.allowCardIds).toContain("retreat");
    expect(demoLessons(6, "rail")[0]?.kind).toBe("swap");
    expect(demoLessons(6, "rail").at(-1)?.kind).toBe("end");
    expect(demoLessons(6, "rail").some((s) => s.allowCardIds.includes("strike"))).toBe(true);
    expect(demoLessons(6, "rail").some((s) => s.allowCardIds.includes("cut"))).toBe(false);
    // ⑥ 收官牌跟同伴系别走：枪=戳 / 棍=裂桩 / 无同伴兜底刀
    expect(demoLessons(6, "guard").some((s) => s.allowCardIds.includes("thrust"))).toBe(true);
    expect(demoLessons(6, "sapper").some((s) => s.allowCardIds.includes("split"))).toBe(true);
    expect(demoLessons(6, null).some((s) => s.allowCardIds.includes("cut"))).toBe(true);
    expect(demoLessons(6, null)[0]?.kind).not.toBe("swap");
    expect(demoRewardOptions(6)).toHaveLength(3);
  });

  it("lesson script advances play → end → foe debrief", () => {
    let run = createBreakDemoRun();
    expect(demoAllowsCard(run, "retreat")).toBe(true);
    expect(demoAllowsCard(run, "advance")).toBe(false);
    // 收势常亮：出牌步也能主动结束回合（软锁兜底），但不推进教案
    expect(demoAllowsEndTurn(run)).toBe(true);
    const stalled = afterDemoEndTurn(run);
    expect(stalled.lessonStep).toBe(run.lessonStep);
    run = afterDemoPlayCard(run, "retreat");
    expect(demoAllowsEndTurn(run)).toBe(true);
    expect(demoAllowsCard(run, "retreat")).toBe(false);
    run = afterDemoEndTurn(run);
    expect(run.foeDebrief?.title).toMatch(/硬拆|拆势/);
    expect(run.foeDebrief?.body.length ?? 0).toBeLessThan(80);
    expect(demoLessons(1, null).some((s) => s.foeDebrief)).toBe(true);
    expect(demoLessons(1, null).every((s) => s.kind !== ("free" as string))).toBe(true);
  });

  it("stage 3 starts inside barrage threat so 让 needs block", () => {
    setLabRuleset("break");
    setLabMode(true);
    setLabTuning({ rulesV2: true, v2Fx: true });
    const run = createBreakDemoRun();
    run.stage = 3;
    const synced = applyBreakDemoBattle(startLabBattle(buildBreakDemoPreset(run), true, 1), run);
    expect(synced.player.pos).toBe(3);
    expect(synced.enemy.pos).toBe(4);
    expect(synced.intents?.[0]?.kind).toBe("barrage");
    expect(demoAllowsCard(run, "defend")).toBe(true);
    expect(demoAllowsCard(run, "retreat")).toBe(false);
    const defend = synced.hand.find((c) => c.defId === "defend");
    expect(defend).toBeTruthy();
    let b = playCard(synced, defend!.uid);
    expect(b.playerBlock).toBeGreaterThanOrEqual(8);
    const hpBefore = b.player.hp;
    b = endTurn(b);
    expect(b.player.hp).toBeGreaterThan(hpBefore - 16);
  });

  it("companion choices are fist/spear/staff", () => {
    expect(DEMO_COMPANION_CHOICES).toContain(DEMO_FIST_MATE);
    expect(DEMO_COMPANION_CHOICES).toHaveLength(3);
    expect(new Set(DEMO_COMPANION_CHOICES.map((id) => companionWeaponLabel(id))).size).toBe(3);
  });

  it("buildBreakDemoPreset locks saber field mate", () => {
    const run = createBreakDemoRun();
    const p = buildBreakDemoPreset(run);
    expect(p.fieldMate).toBe("watch");
    expect(p.enemyId).toBeTruthy();
    expect(p.deckRecipe.length).toBeGreaterThan(5);
  });

  it("reward pools are three options per stage", () => {
    expect(demoRewardOptions(1)).toHaveLength(3);
    expect(demoRewardOptions(4)).toHaveLength(3);
    expect(demoRewardOptions(6)).toHaveLength(3);
  });

  it("persists demo-done flag", () => {
    expect(isBreakDemoDone()).toBe(false);
    markBreakDemoDone();
    expect(isBreakDemoDone()).toBe(true);
  });

  it("stage 5 script sets eye on first segment", () => {
    expect(demoEyeIdx(5)).toBe(0);
    expect(demoEyeIdx(1)).toBe(-1);
    expect(demoEyeIdx(3)).toBe(-1);
  });

  it("applyBreakDemoBattle wires intents and guide", () => {
    const run = createBreakDemoRun();
    const preset = buildBreakDemoPreset(run);
    const b = applyBreakDemoBattle(startLabBattle(preset, true, 1), run);
    expect(b.intents?.[0]?.kind).toBe("strike");
    expect(run.guideCoach.length).toBeGreaterThan(0);
    expect(b.hand.some((c) => c.defId === "retreat")).toBe(true);
    expect(b.player.pos).toBe(3);
    expect(b.enemy.pos).toBe(4);
  });

  it("stage 1 retreat from threat cell hard-breaks", () => {
    setLabRuleset("break");
    setLabMode(true);
    setLabTuning({ rulesV2: true, v2Fx: true });
    const run = createBreakDemoRun();
    let b = applyBreakDemoBattle(startLabBattle(buildBreakDemoPreset(run), true, 1), run);
    expect(b.v2Turn?.turnStartPos).toBe(3);
    expect(b.hand.map((c) => c.defId)).toEqual(["retreat"]);
    const retreat = b.hand.find((c) => c.defId === "retreat");
    expect(retreat).toBeTruthy();
    b = playCard(b, retreat!.uid);
    expect(b.player.pos).toBeLessThan(3);
    b = endTurn(b);
    expect(b.v2BreakCount ?? 0).toBeGreaterThanOrEqual(1);
    expect(b.v2BreakMomentum ?? 0).toBeGreaterThan(0);
    expect(b.v2LastTrueDamage ?? 0).toBe(0);
  });

  it("finisher cut is in saber range after scripted sync", () => {
    setLabRuleset("break");
    setLabMode(true);
    setLabTuning({ rulesV2: true, v2Fx: true });
    let run = createBreakDemoRun();
    let b = applyBreakDemoBattle(startLabBattle(buildBreakDemoPreset(run), true, 1), run);
    const startPos = b.player.pos;
    const retreat = b.hand.find((c) => c.defId === "retreat")!;
    b = playCard(b, retreat.uid);
    const afterRetreat = b.player.pos;
    expect(afterRetreat).toBeLessThan(startPos);
    run = afterDemoPlayCard(run, "retreat");
    b = syncBreakDemoBattle(b, run);
    expect(b.player.pos).toBe(afterRetreat);
    const enemyBefore = b.enemy.pos;
    b = endTurn(b);
    run = afterDemoEndTurn(run);
    lockDemoAfterFoeTurn(b, afterRetreat, enemyBefore);
    b = syncBreakDemoBattle(b, run);
    expect(b.player.pos).toBe(afterRetreat);
    expect(b.enemy.pos).toBe(enemyBefore);
    run = { ...run, foeDebrief: null };
    b = syncBreakDemoBattle(b, run);
    expect(b.hand.map((c) => c.defId)).toEqual(["advance"]);
    expect(b.player.pos).toBe(afterRetreat);
    const adv = b.hand[0]!;
    b = playCard(b, adv.uid);
    run = afterDemoPlayCard(run, "advance");
    b = syncBreakDemoBattle(b, run);
    expect(b.player.pos).toBeGreaterThan(afterRetreat);
    expect(Math.abs(b.enemy.pos - b.player.pos)).toBeLessThanOrEqual(2);
    expect(b.hand.map((c) => c.defId)).toEqual(["cut"]);
    const cut = b.hand[0]!;
    expect(playCard(b, cut.uid).enemy.hp).toBeLessThan(b.enemy.hp);
  });

  it("rookie track does not teach break", () => {
    const run = createBreakDemoRun("rookie");
    expect(run.track).toBe("rookie");
    expect(run.guideCardIds).toContain("cut");
    expect(run.guideCardIds).not.toContain("retreat");
    const text = demoLessons(1, null, "rookie").map((s) => s.coach).join("");
    expect(text).not.toMatch(/硬拆|破招充能/);
    expect(demoLessons(4, null, "rookie").some((s) => s.foeDebrief?.title.includes("低阶"))).toBe(true);
  });
});
