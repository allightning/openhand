import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  GAUNTLET_HEAL_RATIO,
  GAUNTLET_MAX_STAGE,
  GAUNTLET_REWARD_TIERS,
  afterGauntletLoss,
  afterGauntletWin,
  applyCompanion,
  applyGauntletReward,
  applyStageTuning,
  applySuperReward,
  buildGauntletPreset,
  cardPool,
  createGauntletRun,
  enterGauntletTuning,
  exitGauntletTuning,
  getGauntletFinalStage,
  loadGauntletBest,
  marketOffers,
  rewardGate,
  rollCompanionChoices,
  rollGauntletRewards,
  rollSuperRewards,
  saveGauntletBest,
  isMidtermSuperFought,
} from "./gauntlet";
import { pathLadder } from "./gauntletPaths";
import { DEFAULT_LAB_TUNING, getLabTuning, setLabMode, setLabTuning } from "../game/labTuning";
import { tryAppendStressIntent } from "../game/labEnemyStress";
import { setLabRuleset } from "./labRuleset";
import { CARDS } from "../game/content";
import { breakStarterDeck } from "../game/rogueCards";

describe("§31 连胜踢馆", () => {
  beforeEach(() => {
    try {
      localStorage.clear();
    } catch {
      /* vitest node 环境可能无 localStorage */
    }
    setLabRuleset("break");
    exitGauntletTuning();
  });

  it("开踢起手 10 张，含直取、本系主攻与增补攻、撤步", () => {
    for (const school of ["palm", "saber", "sword", "spear", "staff", "hook"] as const) {
      const deck = breakStarterDeck(school);
      expect(deck).toHaveLength(10);
      expect(deck).toContain("direct");
      expect(deck).toContain("retreat");
      expect(deck.filter((id) => CARDS[id]?.type === "attack").length).toBeGreaterThanOrEqual(4);
    }
  });

  it("三条路径：少林/江湖/朝廷各 10 馆，期中 7 期末 10", () => {
    for (const path of ["shaolin", "bandit", "court"] as const) {
      const ladder = pathLadder(path);
      expect(ladder).toHaveLength(10);
      expect(ladder[6]?.tier).toBe("extreme");
      expect(ladder[9]?.tier).toBe("extreme");
      expect(GAUNTLET_MAX_STAGE).toBe(10);
    }
  });

  it("拆招模式：10 馆、双敌、伙伴里程碑 3/7 四选一", () => {
    setLabRuleset("break");
    for (const path of ["shaolin", "bandit", "court"] as const) {
      const ladder = pathLadder(path);
      expect(ladder).toHaveLength(10);
      expect(ladder[0]?.label).toMatch(/来锋位移/);
      expect(ladder[1]?.label).toMatch(/让与破眼/);
      expect(ladder[3]?.extraEnemyIds).toHaveLength(1);
      expect(ladder[6]?.extraEnemyIds).toHaveLength(1);
      expect(ladder[7]?.extraEnemyIds).toHaveLength(2);
      expect(ladder[8]?.extraEnemyIds).toHaveLength(2);
      expect(ladder[9]?.extraEnemyIds).toHaveLength(3);
      expect(ladder[9]?.forceGrudge).toBe(true);
      expect(ladder[0]?.stressCap).toBe(0);
      expect(ladder[1]?.stressCap).toBe(0);
    }
    expect(getGauntletFinalStage()).toBe(10);
    let run = createGauntletRun("bandit", "sword");
    expect(buildGauntletPreset(run).fieldMate).toBe("wenrensheng");
    run = { ...run, stage: 4, streak: 3 };
    const choices = rollCompanionChoices(run, () => 0);
    expect(choices).toHaveLength(4);
    expect(choices).not.toContain("wenrensheng");
    const a = choices[0]!;
    run = applyCompanion(run, a);
    expect(run.companions).toEqual([a]);
    expect(run.companion).toBe(a);
    run = { ...run, stage: 8, streak: 7 };
    const bChoices = rollCompanionChoices(run, () => 0);
    expect(bChoices).toHaveLength(4);
    expect(bChoices).not.toContain(a);
    run = applyCompanion(run, bChoices[0]!);
    expect(run.companions).toHaveLength(2);
    expect(buildGauntletPreset(run).party).toHaveLength(3);
  });

  it("拆招起手 10 张、奖励 4 选、轮番进队列不进场", () => {
    setLabRuleset("break");
    const run = createGauntletRun("bandit", "saber");
    expect(run.deckRecipe).toHaveLength(10);
    expect(run.deckRecipe).toContain("direct");
    expect(run.deckRecipe).toContain("cut");
    expect(run.deckRecipe).toContain("retreat");
    expect(run.deckRecipe).not.toContain("advance2");
    const opts = rollGauntletRewards(run, () => 0.1);
    expect(opts).toHaveLength(4);
    const staged = { ...run, stage: 8 };
    const p = buildGauntletPreset(staged);
    expect(p.extraFoeIds).toBeUndefined();
    expect(p.waveEnemyId).toBeTruthy();
    expect(p.waveQueue).toHaveLength(1);
  });

  it("拆招入伙：同系光环卡、异系融合卡注入牌池", () => {
    setLabRuleset("break");
    let run = createGauntletRun("bandit", "saber");
    run = applyCompanion(run, "zhounuanxiang");
    expect(run.mateDecks?.zhounuanxiang?.some((id) => String(id).startsWith("fuse"))).toBe(true);
    run = applyCompanion(run, "lvchifeng");
    expect(run.mateDecks?.lvchifeng).toContain("auraSaber");
  });

  it("战后回血与阶段推进", () => {
    let run = createGauntletRun("bandit", "palm");
    run = afterGauntletWin(run, 2, 10, 100, "mob_road_01");
    expect(run.streak).toBe(1);
    expect(run.stage).toBe(2);
    expect(run.totalBreaks).toBe(2);
    expect(run.hp).toBe(100);
  });

  it("败场 streak 回退", () => {
    let run = createGauntletRun("bandit", "palm");
    run = { ...run, stage: 3, streak: 2 };
    run = afterGauntletLoss(run, 1);
    expect(run.streak).toBe(2);
    expect(run.totalBreaks).toBe(1);
  });

  it("§31.18 外功/心法可指定受益角色；道具上限 2", () => {
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
    expect(run.items).toHaveLength(2);
    const blocked = applyGauntletReward(run, { kind: "item", id: "lianhuan", title: "连环", tip: "test" });
    expect(blocked.items).toHaveLength(2);
  });

  it("rollGauntletRewards 馆 1 为 4 项（含谱）", () => {
    const run = createGauntletRun("bandit", "saber");
    const opts = rollGauntletRewards(run, () => 0.1);
    expect(opts).toHaveLength(4);
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
    expect(rollGauntletRewards(createGauntletRun("bandit", "saber"), () => 0.1)).toHaveLength(4);
  });

  it("§31.7 淬刃：起手凡阶，按序升，不能跳档", () => {
    let run = createGauntletRun("bandit", "sword");
    expect(run.weaponId).toBe("sword-a-1");
    run = { ...run, stage: 4, streak: 3 };
    run = applyGauntletReward(run, { kind: "forge", id: "sword-a-2", title: "淬刃", tip: "test" });
    expect(run.weaponId).toBe("sword-a-2");
    run = applyGauntletReward(run, { kind: "forge", id: "saber-a-4", title: "错刃", tip: "test" });
    expect(run.weaponId).toBe("sword-a-2");
  });

  it("§31.9/§31.18 伙伴：3/7 四选一", () => {
    let run = createGauntletRun("bandit", "sword");
    run = { ...run, stage: 4, streak: 3 };
    const choices = rollCompanionChoices(run, () => 0);
    expect(choices).toHaveLength(4);
    expect(choices).not.toContain("wenrensheng");
    run = applyCompanion(run, choices[0]!);
    expect(run.companion).toBe(choices[0]);
    const preset = buildGauntletPreset(run);
    expect(preset.party).toHaveLength(2);
    expect(preset.party).toContain(choices[0]);
    expect(cardPool("sword", false)).not.toContain("comboSword");
    expect(cardPool("sword", true)).toContain("comboSword");
  });

  it("神兵仙药在第 7 馆后，不在第 6 馆", () => {
    expect(isMidtermSuperFought(6)).toBe(false);
    expect(isMidtermSuperFought(7)).toBe(true);
    expect(isMidtermSuperFought(10)).toBe(false);
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

  it("刀线神兵写进主角 weaponId", () => {
    const run = createGauntletRun("bandit", "saber");
    const opts = rollSuperRewards(run);
    expect(opts[0]?.id).toBe("saber-a-5");
    expect(applySuperReward(run, opts[0]!).weaponId).toBe("saber-a-5");
    const elixir = applySuperReward(run, opts.find((o) => o.kind === "elixir")!);
    expect(elixir.hpMax).toBe(run.hpMax + 12);
    expect(elixir.bonusEnergyMax).toBe(1);
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

describe("ROGUE_GRADIENT 淬刃/换页/绝招池", () => {
  beforeEach(() => {
    setLabRuleset("break");
  });

  it("拆招起手凡阶，淬刃必须 1→2，不能跳 3", () => {
    let run = createGauntletRun("bandit", "sword");
    expect(run.weaponId).toBe("sword-a-1");
    run = applyGauntletReward(run, { kind: "forge", id: "sword-a-3", title: "跳档", tip: "test" });
    expect(run.weaponId).toBe("sword-a-1");
    run = applyGauntletReward(run, { kind: "forge", id: "sword-a-2", title: "淬刃", tip: "test" });
    expect(run.weaponId).toBe("sword-a-2");
  });

  it("rewardGate：3 馆战后淬刃/换页，4 馆战后 ±2，7 馆战后绝招", () => {
    expect(rewardGate(1)).toEqual({ forge: false, upgrade: false, ultimate: false, advance2: false });
    expect(rewardGate(2)).toEqual({ forge: false, upgrade: false, ultimate: false, advance2: false });
    expect(rewardGate(3)).toEqual({ forge: true, upgrade: true, ultimate: false, advance2: false });
    expect(rewardGate(4)).toEqual({ forge: true, upgrade: true, ultimate: false, advance2: true });
    expect(rewardGate(7)).toEqual({ forge: true, upgrade: true, ultimate: true, advance2: true });
  });

  it("1–2 馆战后无淬刃换页绝招；3 馆战后淬刃进池", () => {
    const early = { ...createGauntletRun("bandit", "sword"), stage: 3, weaponId: "sword-a-1" as const };
    for (let i = 0; i < 40; i++) {
      const opts = rollGauntletRewards(early, () => (i * 0.024) % 1);
      expect(opts.every((o) => o.kind !== "forge" && o.kind !== "upgrade")).toBe(true);
      expect(opts.every((o) => o.id !== "ultSword")).toBe(true);
    }
    const after3 = { ...createGauntletRun("bandit", "sword"), stage: 4, weaponId: "sword-a-1" as const };
    let midForge = false;
    for (let i = 0; i < 80 && !midForge; i++) {
      midForge = rollGauntletRewards(after3, () => (i * 0.017) % 1).some((o) => o.kind === "forge" && o.id === "sword-a-2");
    }
    expect(midForge).toBe(true);
  });

  it("4–6 馆淬刃顶 2 档；7 馆后可到 3 档", () => {
    let run = { ...createGauntletRun("bandit", "sword"), stage: 5, weaponId: "sword-a-1" as const };
    let midForge = false;
    for (let i = 0; i < 80 && !midForge; i++) {
      midForge = rollGauntletRewards(run, () => (i * 0.017) % 1).some((o) => o.kind === "forge" && o.id === "sword-a-2");
    }
    expect(midForge).toBe(true);
    run = { ...run, stage: 5, weaponId: "sword-a-2" as const };
    for (let i = 0; i < 40; i++) {
      expect(rollGauntletRewards(run, () => (i * 0.023) % 1).every((o) => o.id !== "sword-a-3")).toBe(true);
    }
    run = { ...run, stage: 8, weaponId: "sword-a-2" as const };
    let lateForge = false;
    for (let i = 0; i < 80 && !lateForge; i++) {
      lateForge = rollGauntletRewards(run, () => (i * 0.017) % 1).some((o) => o.kind === "forge" && o.id === "sword-a-3");
    }
    expect(lateForge).toBe(true);
  });

  it("黑市与免费同一张闸：1–2 馆不卖淬刃/绝招，3 馆战后可卖淬刃", () => {
    const early = { ...createGauntletRun("bandit", "saber"), stage: 2 };
    for (let i = 0; i < 16; i++) {
      const stall = marketOffers(early, () => (i * 0.061) % 1);
      expect(stall.every((o) => o.kind !== "forge")).toBe(true);
      expect(stall.every((o) => !String(o.id).includes("ultSaber"))).toBe(true);
    }
    const after3 = { ...createGauntletRun("bandit", "saber"), stage: 4 };
    expect(marketOffers(after3, () => 0).some((o) => o.kind === "forge")).toBe(true);
  });

  it("换页替换本系架/卸力，永不把进步换成纵步", () => {
    let run = createGauntletRun("bandit", "palm");
    expect(run.deckRecipe).toContain("advance");
    run = applyGauntletReward(run, { kind: "upgrade", id: "advance", title: "换页", tip: "test" });
    expect(run.deckRecipe).toContain("advance");
    expect(run.deckRecipe).not.toContain("advance2");
    run = applyGauntletReward(run, { kind: "upgrade", id: "defend", title: "换页", tip: "test" });
    expect(run.deckRecipe).toContain("defend2");
    expect(run.deckRecipe.filter((id) => id === "defend")).toHaveLength(0);
    run = applyGauntletReward(run, { kind: "upgrade", id: "wardPalm", title: "换页", tip: "test" });
    expect(run.deckRecipe).toContain("wardPalm2");
  });

  it("7 馆后本系绝招进奖励池，更早没有", () => {
    const early = rollGauntletRewards({ ...createGauntletRun("bandit", "saber"), stage: 5 }, () => 0.55);
    expect(early.every((o) => o.id !== "ultSaber")).toBe(true);
    let found = false;
    for (let i = 0; i < 200; i++) {
      const opts = rollGauntletRewards({ ...createGauntletRun("bandit", "saber"), stage: 8 }, () => Math.random());
      if (opts.some((o) => o.kind === "card" && o.id === "ultSaber")) found = true;
    }
    expect(found).toBe(true);
  });
});

describe("拆招 1–2 馆无应激", () => {
  beforeEach(() => {
    setLabRuleset("break");
    setLabMode(true);
  });

  afterEach(() => {
    setLabTuning({ enemyStressCap: DEFAULT_LAB_TUNING.enemyStressCap });
    setLabMode(false);
  });

  it("开战调参把 1–2 馆帽打成 0，硬拆不挂应；第 3 馆恢复默认帽", async () => {
    const { startLabBattle } = await import("./factory");
    applyStageTuning(pathLadder("bandit")[0]!);
    expect(getLabTuning().enemyStressCap).toBe(0);
    applyStageTuning(pathLadder("bandit")[1]!);
    expect(getLabTuning().enemyStressCap).toBe(0);
    const b = startLabBattle(buildGauntletPreset(createGauntletRun("bandit", "palm")), true, 1);
    expect(tryAppendStressIntent(b, "break")).toBe(false);
    expect(b.v2PendingStress ?? []).toEqual([]);
    applyStageTuning(pathLadder("bandit")[2]!);
    expect(getLabTuning().enemyStressCap).toBe(DEFAULT_LAB_TUNING.enemyStressCap);
  });
});
