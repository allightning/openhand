import { describe, expect, it, beforeEach } from "vitest";
import {
  GAUNTLET_HEAL_RATIO,
  GAUNTLET_MAX_STAGE,
  GAUNTLET_REWARD_TIERS,
  GAUNTLET_STARTERS,
  afterGauntletLoss,
  afterGauntletWin,
  applyCompanion,
  applyGauntletReward,
  applySuperReward,
  buildGauntletPreset,
  cardPool,
  createGauntletRun,
  enterGauntletTuning,
  exitGauntletTuning,
  getGauntletFinalStage,
  loadGauntletBest,
  rollCompanionChoices,
  rollGauntletRewards,
  rollSuperRewards,
  saveGauntletBest,
} from "./gauntlet";
import { pathLadder } from "./gauntletPaths";
import { getLabTuning, setLabTuning } from "../game/labTuning";
import { setLabRuleset } from "./labRuleset";

describe("§31 连胜踢馆", () => {
  beforeEach(() => {
    try {
      localStorage.clear();
    } catch {
      /* vitest node 环境可能无 localStorage */
    }
    setLabRuleset("classic");
    exitGauntletTuning();
  });

  it("§31.15 GAUNTLET_STARTERS 每系 14 张，且都带退步（撤步）与换位", () => {
    for (const school of Object.keys(GAUNTLET_STARTERS)) {
      const deck = GAUNTLET_STARTERS[school as keyof typeof GAUNTLET_STARTERS];
      expect(deck).toHaveLength(14);
      expect(deck).toContain("retreat");
      expect(deck).toContain("sidestep");
    }
  });

  it("三条 15 馆路径：少林/土匪/朝廷，期中 7 期末 15（经典模式）", () => {
    setLabRuleset("classic");
    for (const path of ["shaolin", "bandit", "court"] as const) {
      const ladder = pathLadder(path);
      expect(ladder).toHaveLength(15);
      expect(ladder[6]?.tier).toBe("extreme");
      expect(ladder[14]?.tier).toBe("extreme");
      expect(GAUNTLET_MAX_STAGE).toBe(15);
    }
  });

  it("拆招模式：10 馆、双敌/三敌、伙伴里程碑 4/7", () => {
    setLabRuleset("break");
    for (const path of ["shaolin", "bandit", "court"] as const) {
      const ladder = pathLadder(path);
      expect(ladder).toHaveLength(10);
      expect(ladder[0]?.label).toMatch(/来锋位移/);
      expect(ladder[1]?.label).toMatch(/让与破眼/);
      expect(ladder[7]?.extraEnemyIds).toHaveLength(1);
      expect(ladder[8]?.extraEnemyIds).toHaveLength(1);
      expect(ladder[9]?.extraEnemyIds).toHaveLength(1);
      expect(ladder[9]?.forceGrudge).toBe(true);
    }
    expect(getGauntletFinalStage()).toBe(10);
    let run = createGauntletRun("bandit", "sword");
    const a = rollCompanionChoices(run, () => 0)[0]!;
    run = applyCompanion(run, a);
    expect(run.companions).toEqual([a]);
    expect(run.companion).toBe(a);
    const b = rollCompanionChoices(run, () => 0)[0]!;
    run = applyCompanion(run, b);
    expect(run.companions).toHaveLength(2);
    expect(buildGauntletPreset(run).party).toHaveLength(3);
  });

  it("战后回血与阶段推进", () => {
    let run = createGauntletRun("bandit", "palm");
    run = afterGauntletWin(run, 2, 10, 100, "mob_road_01");
    expect(run.streak).toBe(1);
    expect(run.stage).toBe(2);
    expect(run.totalBreaks).toBe(2);
    expect(run.hp).toBe(Math.min(100, 10 + Math.round(100 * GAUNTLET_HEAL_RATIO)));
  });

  it("败场 streak 回退", () => {
    let run = createGauntletRun("bandit", "palm");
    run = { ...run, stage: 3, streak: 2 };
    run = afterGauntletLoss(run, 1);
    expect(run.streak).toBe(2);
    expect(run.totalBreaks).toBe(1);
  });

  it("§31.18 外功/心法可指定受益角色；道具上限 3", () => {
    let run = createGauntletRun("bandit", "palm");
    run = applyGauntletReward(run, { kind: "tech", id: "longPush", title: "开山劲", tip: "test", targetMate: "rail" });
    expect(run.mateTechs.rail).toContain("longPush");
    run = applyGauntletReward(run, { kind: "tech", id: "longPush", title: "开山劲", tip: "test", targetMate: "rail" });
    expect(run.mateTechs.rail?.filter((t) => t === "longPush")).toHaveLength(1);
    run = applyGauntletReward(run, { kind: "mind", id: "ironBreath", title: "铁骨", tip: "test", targetMate: "rail" });
    expect(run.mateMindArts.rail).toContain("ironBreath");
    run = applyGauntletReward(run, { kind: "item", id: "jinchuang", title: "金创", tip: "test" });
    run = applyGauntletReward(run, { kind: "item", id: "xiujian", title: "修剑", tip: "test" });
    run = applyGauntletReward(run, { kind: "item", id: "huiqi", title: "回气", tip: "test" });
    expect(run.items).toHaveLength(3);
    const blocked = applyGauntletReward(run, { kind: "item", id: "lianhuan", title: "连环", tip: "test" });
    expect(blocked.items).toHaveLength(3);
  });

  it("rollGauntletRewards 固定种子产出 3 项（外功/心法/道具/助战同阶层）", () => {
    const run = createGauntletRun("bandit", "saber");
    const opts = rollGauntletRewards(run, () => 0.1);
    expect(opts).toHaveLength(3);
    expect(opts.every((o) => ["tech", "mind", "item", "aid"].includes(o.kind))).toBe(true);
  });

  it("历史最佳 localStorage", () => {
    if (typeof localStorage === "undefined") return;
    let run = createGauntletRun("bandit", "staff");
    run = { ...run, streak: 5, totalBreaks: 12 };
    saveGauntletBest(run);
    expect(loadGauntletBest()).toEqual({ streak: 5, breaks: 12, pot: 20 });
    run = { ...run, streak: 3, totalBreaks: 20 };
    saveGauntletBest(run);
    expect(loadGauntletBest()?.streak).toBe(5);
  });

  it("G2 tuning 快照与恢复", () => {
    setLabTuning({ rulesCombo: true });
    enterGauntletTuning();
    expect(getLabTuning().rulesCombo).toBe(false);
    exitGauntletTuning();
    expect(getLabTuning().rulesCombo).toBe(true);
  });

  it("§31.18 奖励档位：简单 3 选，中等/困难 4 选", () => {
    expect(GAUNTLET_REWARD_TIERS.easy.picks).toBe(3);
    expect(GAUNTLET_REWARD_TIERS.mid.picks).toBe(4);
    expect(GAUNTLET_REWARD_TIERS.hard.picks).toBe(4);
    expect(GAUNTLET_HEAL_RATIO).toBe(0.3);
    let run = createGauntletRun("bandit", "saber");
    run = { ...run, stage: 4 };
    expect(rollGauntletRewards(run, () => 0.1)).toHaveLength(4);
    expect(rollGauntletRewards(createGauntletRun("bandit", "saber"), () => 0.1)).toHaveLength(3);
  });

  it("§31.7 淬刃：兵刃升阶；常规淬刃封顶玄阶，神兵只走超级奖励", () => {
    let run = createGauntletRun("bandit", "sword");
    expect(run.weaponId).toBe("sword-a-3");
    run = applyGauntletReward(run, { kind: "forge", id: "sword-a-4", title: "淬刃 · 镜心剑", tip: "test" });
    expect(run.weaponId).toBe("sword-a-4");
    run = applyGauntletReward(run, { kind: "forge", id: "saber-a-4", title: "错刃", tip: "test" });
    expect(run.weaponId).toBe("sword-a-4");
    const opts = rollSuperRewards(run);
    expect(opts[0]?.kind).toBe("forge");
  });

  it("§31.9/§31.18 伙伴三选一：仅 4/7/12 关里程碑，排除主角，入伙后进编队且组合卡解禁", () => {
    let run = createGauntletRun("bandit", "sword"); // 主角 seer
    const choices = rollCompanionChoices(run, () => 0);
    expect(choices).toHaveLength(3);
    expect(choices).not.toContain("seer");
    run = applyCompanion(run, choices[0]!);
    expect(run.companion).toBe(choices[0]);
    const preset = buildGauntletPreset(run);
    expect(preset.party).toHaveLength(2);
    expect(preset.party).toContain(choices[0]);
    expect(cardPool("sword", false)).not.toContain("comboSword");
    expect(cardPool("sword", true)).toContain("comboSword");
  });

  it("§31.9/§31.12 超级奖励：神兵直跃 / 助战符一对 / 仙药加上限", () => {
    let run = createGauntletRun("bandit", "sword");
    const opts = rollSuperRewards(run);
    expect(opts.map((o) => o.kind)).toEqual(["forge", "aidPair", "elixir"]);
    expect(opts[0]?.id).toBe("sword-a-5");
    run = applySuperReward(run, opts[0]!);
    expect(run.weaponId).toBe("sword-a-5");
    const hpBefore = run.hpMax;
    run = applySuperReward(run, opts[2]!);
    expect(run.hpMax).toBe(hpBefore + 12);
    expect(run.bonusEnergyMax).toBe(1);
    run = { ...run, items: ["jinchuang"] };
    run = applySuperReward(run, opts[1]!);
    const aids = run.items.filter((i) => i.startsWith("aid"));
    expect(aids).toHaveLength(2);
    expect(new Set(aids).size).toBe(2);
  });

  it("§31.10 伙伴真的进战斗：后场有人、可叫助战、兵器品阶同步主角封顶玄", async () => {
    const { startLabBattle } = await import("./factory");
    const { canCallAssist } = await import("../game/labAssist");
    const { setLabMode, setLabTuning } = await import("../game/labTuning");
    setLabMode(true);
    enterGauntletTuning();
    try {
      let run = createGauntletRun("bandit", "sword");
      run = { ...run, stage: 5, weaponId: "sword-a-4" };
      run = applyCompanion(run, "sapper");
      setLabTuning({ rulesCombo: Boolean(run.companion) });
      const b = startLabBattle(buildGauntletPreset(run), true, 1);
      expect(b.bench.map((m) => m.id)).toContain("sapper");
      expect(b.labMateWeapons?.sapper).toBe("staff-a-4");
      expect(canCallAssist(b, "sapper").ok).toBe(true);
      run = { ...run, weaponId: "sword-a-5" };
      const b2 = startLabBattle(buildGauntletPreset(run), true, 1);
      expect(b2.labMateWeapons?.sapper).toBe("staff-a-4");
    } finally {
      exitGauntletTuning();
      setLabMode(false);
    }
  });
});
