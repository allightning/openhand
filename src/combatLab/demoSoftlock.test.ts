/**
 * 复现用户反馈：新手关/训练关「无法收势」软锁。
 * 严格按 main.ts 的 demo/hall 处理逻辑模拟每一步，找出卡死点。
 */
import { describe, expect, it, beforeEach } from "vitest";
import {
  applyBreakDemoBattle,
  afterDemoEndTurn,
  afterDemoPlayCard,
  afterDemoSwap,
  buildBreakDemoPreset,
  createBreakDemoRun,
  currentDemoLesson,
  demoAllowsCard,
  demoAllowsEndTurn,
  demoAllowsSwap,
  demoLessonDone,
  lockDemoAfterFoeTurn,
  syncBreakDemoBattle,
  DEMO_FIST_MATE,
  type BreakDemoRun,
  type DemoStage,
} from "./breakDemo";
import {
  applyHallBattle,
  afterHallEndTurn,
  afterHallPlayCard,
  afterHallSwap,
  buildHallPreset,
  createHallRun,
  currentHallLesson,
  hallAllowsCard,
  hallAllowsEndTurn,
  hallAllowsSwap,
  hallLessonDone,
  lockHallAfterFoeTurn,
  syncHallBattle,
  HALL_COURSES,
  type HallRun,
} from "./trainingHall";
import { startLabBattle } from "./factory";
import { endTurn, playCard } from "../game/sim";
import { labCanPlay, labSwapFighter } from "./labCombat";
import { CARDS } from "../game/content";
import { cardSchool, MATES } from "../game/party";
import { battleEquippedSchool } from "../game/equippedWeapon";
import { setLabMode, setLabTuning } from "../game/labTuning";
import { setLabRuleset } from "./labRuleset";
import type { Battle, CompanionId } from "../game/types";

const TRACE = (globalThis as { process?: { env?: Record<string, string> } }).process?.env?.DEMO_TRACE === "1";

function log(run: BreakDemoRun | HallRun, b: Battle, tag: string): void {
  if (!TRACE) return;
  const step = "stage" in run ? currentDemoLesson(run) : currentHallLesson(run);
  console.log(
    `[${tag}] step=${run.lessonStep}(${step?.kind ?? "?"}) 我${b.player.pos} 敌${b.enemy.pos} 敌hp=${b.enemy.hp} 我hp=${b.player.hp} 劲=${b.energy} 手=${b.hand.map((c) => c.defId).join("/")} 意图=${b.intents.map((i) => i.kind).join("/")}`,
  );
}

/** 模拟 main.ts 打一张牌；返回 false = 门控挡下（软锁候选）。 */
function simPlay(b: Battle, uid: string): Battle | null {
  const gate = labCanPlay(b, uid);
  if (!gate.ok) return null;
  return playCard(b, uid);
}

/** 自由打收尾：优先打合法攻击牌，没有就打任意合法牌，再不行才收势。 */
function freePlayStep(b: Battle): { b: Battle; ended: boolean; note?: string } {
  const attack = b.hand.find((c) => CARDS[c.defId]?.type === "attack" && labCanPlay(b, c.uid).ok);
  const any = b.hand.find((c) => labCanPlay(b, c.uid).ok);
  const pick = attack ?? any;
  if (pick) return { b: playCard(b, pick.uid), ended: false };
  return { b: endTurn(b), ended: true };
}

function runDemoStage(stage: DemoStage, companion: CompanionId | null, opts?: { skipSwap?: boolean }): string[] {
  const problems: string[] = [];
  let run: BreakDemoRun = createBreakDemoRun();
  run.stage = stage;
  if (companion) run.companion = companion;
  let b = applyBreakDemoBattle(startLabBattle(buildBreakDemoPreset(run), true, 1), run);
  let checkedFreeDeck = false;
  for (let guard = 0; guard < 30 && b.enemy.hp > 0 && b.player.hp > 0; guard++) {
    if (b.phase === "won") break;
    // 收势常亮：任何教案步（无弹窗时）都必须能收势
    if (!run.foeDebrief && !demoAllowsEndTurn(run)) {
      problems.push(`step${run.lessonStep} 收势被灭（收势必须常亮）`);
      break;
    }
    if (demoLessonDone(run)) {
      if (!checkedFreeDeck) {
        checkedFreeDeck = true;
        const field = b.active;
        const bad = b.hand.filter((c) => {
          const cs = cardSchool(c.defId);
          return cs !== "any" && cs !== battleEquippedSchool(b, field) && !b.bench.some((m) => battleEquippedSchool(b, m.id) === cs);
        });
        if (bad.length) {
          problems.push(`自由打手牌不配套：${bad.map((c) => c.defId).join(",")}（场上=${MATES[field].name}）`);
        }
      }
      const r = freePlayStep(b);
      b = r.b;
      continue;
    }
    const step = currentDemoLesson(run);
    if (step.kind === "swap") {
      const target = run.companion ?? DEMO_FIST_MATE;
      if (opts?.skipSwap) {
        // 不换也能打：收势跳过换人步，教案继续
        b = endTurn(b);
        run = afterDemoEndTurn(run);
        if (currentDemoLesson(run).kind === "swap") {
          problems.push("收势没能跳过换人步");
          break;
        }
        b = syncBreakDemoBattle(b, run);
        continue;
      }
      if (!demoAllowsSwap(run, target)) {
        problems.push(`step${run.lessonStep} swap 步但不可换人（目标=${target}）`);
        break;
      }
      b = labSwapFighter(b, target);
      run = afterDemoSwap(run, target);
      b = syncBreakDemoBattle(b, run);
      log(run, b, `demo${stage}-swap`);
      continue;
    }
    if (step.kind === "play") {
      const cid = step.allowCardIds[0]!;
      if (!demoAllowsCard(run, cid)) {
        problems.push(`step${run.lessonStep} 教案牌 ${cid} 被 demoAllowsCard 挡`);
        break;
      }
      const card = b.hand.find((c) => c.defId === cid);
      if (!card) {
        problems.push(`step${run.lessonStep} 手牌没有 ${cid}（手牌=${b.hand.map((c) => c.defId).join(",")}）`);
        break;
      }
      const next = simPlay(b, card.uid);
      if (!next) {
        problems.push(
          `step${run.lessonStep} 教案牌 ${cid} 不合法：我${b.player.pos} 敌${b.enemy.pos} 劲${b.energy}（${labCanPlay(b, card.uid).reason ?? "?"}）`,
        );
        break;
      }
      b = next;
      run = afterDemoPlayCard(run, cid);
      b = syncBreakDemoBattle(b, run);
      continue;
    }
    // end 步
    if (!demoAllowsEndTurn(run)) {
      problems.push(`step${run.lessonStep} end 步但 demoAllowsEndTurn=false（debrief=${run.foeDebrief?.title ?? "无"}）`);
      break;
    }
    log(run, b, `demo${stage}-end前`);
    b = endTurn(b);
    const you = b.player.pos;
    const foe = b.enemy.pos;
    run = afterDemoEndTurn(run);
    lockDemoAfterFoeTurn(b, you, foe);
    b = syncBreakDemoBattle(b, run);
    run = { ...run, foeDebrief: null };
    b = syncBreakDemoBattle(b, run);
    log(run, b, `demo${stage}-end后`);
  }
  if (b.enemy.hp > 0 && b.player.hp > 0) {
    const step = currentDemoLesson(run);
    problems.push(`30 步未分胜负：停在 step${run.lessonStep} ${step.kind}，敌 hp=${b.enemy.hp} 我 hp=${b.player.hp}`);
  }
  return problems;
}

function runHallGuide(courseId: string): string[] {
  const problems: string[] = [];
  let run: HallRun = createHallRun(courseId as HallRun["courseId"], 1);
  let b = applyHallBattle(startLabBattle(buildHallPreset(run), true, 1), run);
  for (let guard = 0; guard < 30 && b.enemy.hp > 0 && b.player.hp > 0; guard++) {
    if (b.phase === "won") break;
    if (!run.foeDebrief && !hallAllowsEndTurn(run)) {
      problems.push(`step${run.lessonStep} 收势被灭（收势必须常亮）`);
      break;
    }
    if (hallLessonDone(run)) {
      const r = freePlayStep(b);
      b = r.b;
      continue;
    }
    const step = currentHallLesson(run);
    if (!step) break;
    if (step.kind === "swap") {
      const target = run.companion ?? DEMO_FIST_MATE;
      if (!hallAllowsSwap(run, target)) {
        problems.push(`step${run.lessonStep} swap 步但不可换人（目标=${target}）`);
        break;
      }
      b = labSwapFighter(b, target);
      run = afterHallSwap(run, target);
      b = syncHallBattle(b, run);
      log(run, b, `hall-${courseId}-swap`);
      continue;
    }
    if (step.kind === "play") {
      const cid = step.allowCardIds[0]!;
      if (!hallAllowsCard(run, cid)) {
        problems.push(`step${run.lessonStep} 教案牌 ${cid} 被 hallAllowsCard 挡`);
        break;
      }
      const card = b.hand.find((c) => c.defId === cid);
      if (!card) {
        problems.push(`step${run.lessonStep} 手牌没有 ${cid}（手牌=${b.hand.map((c) => c.defId).join(",")}）`);
        break;
      }
      const next = simPlay(b, card.uid);
      if (!next) {
        problems.push(
          `step${run.lessonStep} 教案牌 ${cid} 不合法：我${b.player.pos} 敌${b.enemy.pos} 劲${b.energy}（${labCanPlay(b, card.uid).reason ?? "?"}）`,
        );
        break;
      }
      b = next;
      run = afterHallPlayCard(run, cid);
      b = syncHallBattle(b, run);
      log(run, b, `hall-${courseId}-play`);
      continue;
    }
    if (!hallAllowsEndTurn(run)) {
      problems.push(`step${run.lessonStep} end 步但 hallAllowsEndTurn=false`);
      break;
    }
    log(run, b, `hall-${courseId}-end前`);
    b = endTurn(b);
    const you = b.player.pos;
    const foe = b.enemy.pos;
    run = afterHallEndTurn(run);
    lockHallAfterFoeTurn(b, run, you, foe);
    b = syncHallBattle(b, run);
    run = { ...run, foeDebrief: null };
    b = syncHallBattle(b, run);
    log(run, b, `hall-${courseId}-end后`);
  }
  if (b.enemy.hp > 0 && b.player.hp > 0) {
    const step = currentHallLesson(run);
    problems.push(`30 步未分胜负：停在 step${run.lessonStep} ${step?.kind ?? "?"}，敌 hp=${b.enemy.hp} 我 hp=${b.player.hp}`);
  }
  return problems;
}

describe("新手关软锁复现", () => {
  beforeEach(() => {
    setLabRuleset("break");
    setLabMode(true);
    setLabTuning({ rulesV2: true, v2Fx: true });
  });

  for (const stage of [1, 2, 3, 4, 5] as DemoStage[]) {
    it(`demo stage ${stage} 全程无软锁`, () => {
      const problems = runDemoStage(stage, null);
      expect(problems).toEqual([]);
    });
  }

  for (const comp of ["rail", "guard", "sapper"] as CompanionId[]) {
    it(`demo stage 6（换人）同伴=${MATES[comp].name} 全程无软锁`, () => {
      const problems = runDemoStage(6, comp);
      expect(problems).toEqual([]);
    });
  }

  it("demo stage 6 换人步可点收势跳过（不换也能打）", () => {
    const problems = runDemoStage(6, "rail", { skipSwap: true });
    expect(problems).toEqual([]);
  });

  for (const c of HALL_COURSES) {
    it(`训练馆引导 ${c.id} 全程无软锁`, () => {
      const problems = runHallGuide(c.id);
      expect(problems).toEqual([]);
    });
  }

  it("踢馆轮番：前排倒下替补上场，phase 仍是 player（收势可用）", () => {
    const run = createHallRun("hard", 2);
    const preset = { ...buildHallPreset(run), waveEnemyId: "mob_road_02" as const };
    let b = applyHallBattle(startLabBattle(preset, true, 1), run);
    b.enemy.hp = 1;
    const attack = b.hand.find((c) => CARDS[c.defId]?.type === "attack" && labCanPlay(b, c.uid).ok);
    expect(attack).toBeTruthy();
    b = playCard(b, attack!.uid);
    // 替补接力：战斗没结束，仍是玩家回合——收势/出牌都可用
    expect(b.phase).toBe("player");
    expect(b.enemy.hp).toBeGreaterThan(0);
    expect(b.enemy.id).toBe("mob_road_02");
  });
});
