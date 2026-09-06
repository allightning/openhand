import { describe, expect, it, beforeEach } from "vitest";
import {
  CAMPAIGN_STAGES,
  campaignStage,
  clearBreakCampaignProgress,
  createBreakCampaignRun,
  createQiFightFromStage,
  evaluateCampaignBattle,
  advanceCampaignAfterClear,
  recordCampaignClear,
  campaignAllowsCard,
  tickCampaignAfterResolve,
  isBreakCampaignCleared,
  markBreakCampaignCleared,
  campaignStageCount,
  syncCampaignLesson,
  readQiResolveStats,
  type BreakCampaignRun,
} from "./breakCampaign";
import { renderGauntletHome } from "./gauntletUi";
import { setLabRuleset } from "./labRuleset";
import { clearBreakDemoDone } from "./breakDemo";
import { assignToSegment, playAttackFree, playPass, playStep, resolveTurn, selectCard, type QiFight } from "./qiCommit";

function playOn(f: QiFight, defId: string, seg: number): QiFight {
  const card = f.hand.find((c) => c.defId === defId);
  if (!card) throw new Error(`missing ${defId}`);
  return assignToSegment(selectCard(f, card.uid), seg);
}

describe("break campaign · 气力承诺", () => {
  beforeEach(() => {
    clearBreakCampaignProgress();
    clearBreakDemoDone();
    setLabRuleset("break");
  });

  it("座前试刃手牌含进步，且会循环来招", () => {
    const rb = CAMPAIGN_STAGES.find((s) => s.id === "RB")!;
    expect(rb.hand).toContain("step_fwd");
    expect(rb.hand).toContain("step_back");
    expect(rb.hand).toContain("break_yield");
    expect([...rb.qiQueue, ...(rb.qiNextQueue ?? [])].some((s) => s.move === "crash")).toBe(true);
    const f0 = createQiFightFromStage(rb);
    expect(f0.loopQueue).toBe(true);
  });

  it("座前试刃：拆刺+撤步+打断蓄力，后三拍直取可击倒", () => {
    const rb = CAMPAIGN_STAGES.find((s) => s.id === "RB")!;
    let f = createQiFightFromStage(rb);
    f = playOn(f, "break_point", 1);
    f = playStep(selectCard(f, f.hand.find((c) => c.defId === "step_back")!.uid));
    f = playOn(f, "atk1", 2);
    f = resolveTurn(f);
    expect(f.enemyHp).toBe(12);
    expect(f.momentum).toBe(1);
    expect(f.phase).toBe("play");
    for (let beat = 2; beat <= 4; beat++) {
      const atk = f.hand.find((c) => c.defId === "atk1");
      if (!atk) throw new Error("missing atk1");
      f = playAttackFree(selectCard(f, atk.uid));
      f = resolveTurn(f);
    }
    expect(f.enemyHp).toBe(0);
    expect(f.phase).toBe("won");
  });

  it("ships nine qi-commit stages", () => {
    expect(campaignStageCount()).toBe(9);
    expect(CAMPAIGN_STAGES[0]!.id).toBe("R1");
    expect(CAMPAIGN_STAGES.map((s) => s.id)).toEqual(["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8", "RB"]);
    expect(CAMPAIGN_STAGES.at(-1)!.id).toBe("RB");
    for (const s of CAMPAIGN_STAGES) {
      expect(s.hand.length).toBeGreaterThan(0);
      expect(s.qiQueue.length).toBeGreaterThan(0);
      expect(s.maxTurns).toBeGreaterThan(0);
      expect(s.goals.some((g) => g.type === "withinTurns" || g.type === "hardBreaks" || g.type === "kill")).toBe(
        true,
      );
    }
    expect(campaignStage("R1")?.goals.some((g) => g.type === "noHit")).toBe(true);
    expect(campaignStage("R4")?.qiQueue.some((i) => i.move === "pierce")).toBe(true);
  });

  it("R5 气势：拆刺后两拍直取，第三拍吃 +1 砍满", () => {
    const st = CAMPAIGN_STAGES.find((s) => s.id === "R5")!;
    expect(st.teach).toMatch(/气势/);
    let f = createQiFightFromStage(st);
    f = playOn(f, "break_point", 0);
    f = playAttackFree(selectCard(f, f.hand.find((c) => c.defId === "atk1")!.uid));
    f = resolveTurn(f);
    f = playAttackFree(selectCard(f, f.hand.find((c) => c.defId === "atk1")!.uid));
    f = resolveTurn(f);
    f = playAttackFree(selectCard(f, f.hand.find((c) => c.defId === "atk1")!.uid));
    f = resolveTurn(f);
    expect(f.enemyHp).toBe(0);
    expect(f.phase).toBe("won");
  });

  it("R6 过·存气：第一拍过，第二拍拆+断蓄", () => {
    const st = CAMPAIGN_STAGES.find((s) => s.id === "R6")!;
    expect(st.teach).toMatch(/气力/);
    let f = createQiFightFromStage(st);
    f = playPass(f);
    f = resolveTurn(f);
    expect(f.qi).toBeGreaterThanOrEqual(4);
    f = playOn(f, "break_point", 0);
    f = playOn(f, "atk1", 1);
    f = resolveTurn(f);
    expect(f.lastRecap.map((r) => r.outcome)).toEqual(["破", "断"]);
  });

  it("tick: hard break + no hit wins R1 in one beat", () => {
    const run = createBreakCampaignRun();
    const win = tickCampaignAfterResolve(run, {
      hardBreaksDelta: 1,
      chaseDelta: 0,
      grazeDelta: 0,
      interruptDelta: 0,
      hitCount: 0,
      enemyDead: false,
      outcomes: ["破"],
    });
    expect(win.kind).toBe("win");
  });

  it("tick: any 打 loses immediately on noHit stages", () => {
    const run = createBreakCampaignRun();
    const lose = tickCampaignAfterResolve(run, {
      hardBreaksDelta: 1,
      chaseDelta: 0,
      grazeDelta: 0,
      interruptDelta: 0,
      hitCount: 1,
      enemyDead: false,
      outcomes: ["打"],
    });
    expect(lose.kind).toBe("lose");
    expect(lose.kind === "lose" && lose.tip).toMatch(/拆·点|刺/);
  });

  it("tick: unmet goals after max turns loses", () => {
    const run = createBreakCampaignRun();
    const lose = tickCampaignAfterResolve(run, {
      hardBreaksDelta: 0,
      chaseDelta: 0,
      grazeDelta: 0,
      interruptDelta: 0,
      hitCount: 0,
      enemyDead: false,
      outcomes: ["空"],
    });
    expect(lose.kind).toBe("lose");
  });

  it("narrow hand lock + advance chapter", () => {
    const run = createBreakCampaignRun();
    expect(campaignAllowsCard(run, "break_point")).toBe(true);
    expect(campaignAllowsCard(run, "atk2")).toBe(false);
    const next = advanceCampaignAfterClear(recordCampaignClear(run, 1, 40));
    expect(next.done).toBe(false);
    expect(next.run.stageId).toBe("R2");
  });

  it("evaluate helper still rejects skip-break fantasy", () => {
    const run = createBreakCampaignRun();
    expect(evaluateCampaignBattle(run, { won: true, hardBreaks: 0, hitsTaken: 0, turns: 1 }).ok).toBe(false);
    expect(evaluateCampaignBattle(run, { won: true, hardBreaks: 1, hitsTaken: 0, turns: 1 }).ok).toBe(true);
  });

  it("finishing Boss marks cleared", () => {
    let run: BreakCampaignRun = syncCampaignLesson({
      ...createBreakCampaignRun(),
      stageIndex: CAMPAIGN_STAGES.length - 1,
      stageId: "RB",
    });
    run = recordCampaignClear(run, 3, 30);
    expect(advanceCampaignAfterClear(run).done).toBe(true);
    markBreakCampaignCleared();
    expect(isBreakCampaignCleared()).toBe(true);
  });

  it("home enables 读招战役 entry", () => {
    const html = renderGauntletHome("");
    expect(html).toContain("start-break-campaign");
    expect(html).not.toMatch(/id="start-break-campaign"[^>]*disabled/);
  });

  it("R1 qi: 拆·点 then resolve wins", () => {
    const run = createBreakCampaignRun();
    const stage = CAMPAIGN_STAGES[0]!;
    let f = createQiFightFromStage(stage);
    f = playOn(f, "break_point", 0);
    f = resolveTurn(f);
    const tick = tickCampaignAfterResolve(run, readQiResolveStats(f));
    expect(f.lastRecap.map((r) => r.outcome)).toContain("破");
    expect(tick.kind).toBe("win");
  });

  it("R2 qi: chain refunds cover both segments", () => {
    const run = {
      ...createBreakCampaignRun(),
      stageIndex: 1,
      stageId: "R2" as const,
    };
    let f = createQiFightFromStage(CAMPAIGN_STAGES[1]!);
    f = playOn(f, "break_press", 0);
    f = playOn(f, "break_point", 1);
    f = resolveTurn(f);
    expect(tickCampaignAfterResolve(run, readQiResolveStats(f)).kind).toBe("win");
  });

  it("R3 qi: 撤步出红格 + 攻断蓄", () => {
    const run = {
      ...createBreakCampaignRun(),
      stageIndex: 2,
      stageId: "R3" as const,
    };
    let f = createQiFightFromStage(CAMPAIGN_STAGES[2]!);
    const step = f.hand.find((c) => c.defId === "step_back")!;
    f = playStep(selectCard(f, step.uid));
    f = playOn(f, "atk1", 1);
    f = resolveTurn(f);
    expect(f.lastRecap.map((r) => r.outcome)).toEqual(["空", "断"]);
    expect(tickCampaignAfterResolve(run, readQiResolveStats(f)).kind).toBe("win");
  });

  it("R7：闪躲开刺，架会挨打", () => {
    const stage = CAMPAIGN_STAGES.find((s) => s.id === "R7")!;
    const run = { ...createBreakCampaignRun(), stageIndex: CAMPAIGN_STAGES.indexOf(stage), stageId: "R7" as const };
    let f = createQiFightFromStage(stage);
    f = playOn(f, "dodge", 0);
    f = resolveTurn(f);
    expect(f.lastRecap.map((r) => r.outcome)).toEqual(["闪"]);
    expect(tickCampaignAfterResolve(run, readQiResolveStats(f)).kind).toBe("win");
  });

  it("R8：先拆留墨，再进步闪另一格", () => {
    const stage = CAMPAIGN_STAGES.find((s) => s.id === "R8")!;
    const run = { ...createBreakCampaignRun(), stageIndex: CAMPAIGN_STAGES.indexOf(stage), stageId: "R8" as const };
    let f = createQiFightFromStage(stage);
    f = playOn(f, "break_point", 0);
    f = resolveTurn(f);
    expect(tickCampaignAfterResolve(run, readQiResolveStats(f)).kind).toBe("continue");
    const step = f.hand.find((c) => c.defId === "step_fwd")!;
    f = playStep(selectCard(f, step.uid));
    f = playOn(f, "dodge", 0);
    f = resolveTurn(f);
    expect(f.lastRecap.map((r) => r.outcome)).toContain("闪");
    const t2 = tickCampaignAfterResolve(
      { ...run, puzzleTurn: 1, sessionHardBreaks: 1, sessionDodges: 0 },
      readQiResolveStats(f),
    );
    expect(t2.kind).toBe("win");
  });
});
