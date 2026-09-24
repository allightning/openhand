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
  ladderEntryForRun,
  loadGauntletBest,
  marketOffers,
  rewardGate,
  rollCompanionChoices,
  banditCompanionChoices,
  breakRewardCardPool,
  rollGauntletRewards,
  rollSuperRewards,
  saveGauntletBest,
  isMidtermSuperFought,
} from "./gauntlet";
import { eventAfterFought } from "./encounter";
import { maxCompanions, pathLadder } from "./gauntletPaths";
import { DEFAULT_LAB_TUNING, getLabTuning, setLabMode, setLabTuning } from "../game/labTuning";
import { tryAppendStressIntent } from "../game/labEnemyStress";
import { breakTestContext, climbTestContext } from "../game/testContext";
import { setLabRuleset } from "./labRuleset";
import { CARDS } from "../game/content";
import { breakStarterDeck, rogueMate } from "./rogueRoster";
import { STORY_CAST_POOL } from "./storyBeats";
import { startLabBattle } from "./factory";
import { livingFoes } from "../game/sim";

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

  it("routeLength 9/10/12 改变 getGauntletFinalStage；拓扑按 final 平移", () => {
    expect(getGauntletFinalStage()).toBe(10);
    expect(getGauntletFinalStage({ routeLength: 9 })).toBe(9);
    expect(getGauntletFinalStage({ routeLength: 12 })).toBe(12);
    // 默认 run 仍是 10
    const run10 = createGauntletRun("bandit", "saber");
    expect(getGauntletFinalStage(run10)).toBe(10);
    // 短 9：情报在馆 8、期末在馆 9（回头关继承 last，仍极端）
    const run9 = { ...run10, routeLength: 9 as const };
    expect(getGauntletFinalStage(run9)).toBe(9);
    const entry9Final = ladderEntryForRun(run9, 9);
    expect(entry9Final.tier).toBe("extreme");
    expect(entry9Final.forceGrudge).toBe(true);
    expect(eventAfterFought(9, 9)).toBeNull();
    expect(eventAfterFought(8, 9)).toBe("finaleHint");
    // 9 馆的 final-1 情报落在馆 8
    expect(eventAfterFought(8, 9)).toBe("finaleHint");
    // 长 12：馆 11 复用 ladder 末尾前一条（hard）压力，馆 12 期末继承 extreme
    const run12 = { ...run10, routeLength: 12 as const };
    expect(getGauntletFinalStage(run12)).toBe(12);
    const entry12_11 = ladderEntryForRun(run12, 11);
    expect(entry12_11.tier).toBe("hard");
    expect(entry12_11.stage).toBe(11);
    const entry12Final = ladderEntryForRun(run12, 12);
    expect(entry12Final.tier).toBe("extreme");
    expect(entry12Final.forceGrudge).toBe(true);
    expect(eventAfterFought(11, 12)).toBe("finaleHint");
    expect(eventAfterFought(10, 12)).toBeNull();
  });

  it("拆招模式：10 馆、双敌、伙伴里程碑 4/7 四选一", () => {
    setLabRuleset("break");
    for (const path of ["shaolin", "court"] as const) {
      const ladder = pathLadder(path);
      expect(ladder).toHaveLength(10);
      expect(ladder[0]?.label).toMatch(/山门沙弥|剪径|皂隶/);
      expect(ladder[1]?.label).toMatch(/巡寺棍僧|坡蹲|快班/);
      expect(ladder[0]?.label).not.toMatch(/来锋|让与破/);
      expect(ladder[1]?.label).not.toMatch(/来锋|让与破/);
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
    run = { ...run, stage: 5, streak: 4 }; // 打过第 4 馆后进里程碑
    const choices = rollCompanionChoices(run, () => 0);
    expect(choices).toHaveLength(4);
    expect(choices).not.toContain("wenrensheng");
    const a = choices[0]!;
    run = applyCompanion(run, a);
    expect(run.companions).toEqual([a]);
    expect(run.companion).toBe(a);
    run = { ...run, stage: 8, streak: 7 }; // 打过第 7 馆后进里程碑
    const bChoices = rollCompanionChoices(run, () => 0);
    expect(bChoices).toHaveLength(4);
    expect(bChoices).not.toContain(a);
    run = applyCompanion(run, bChoices[0]!);
    expect(run.companions).toHaveLength(2);
    expect(buildGauntletPreset(run).party).toHaveLength(3);
  });

  it("拆招同伴池：江湖线关闭陌生人四选一，只出 castDraw 或 seenStoryIds 里见过的人", () => {
    setLabRuleset("climb");
    // castDraw 的 5 人本身就算「见过」
    const castDraw = ["zhounuanxiang", "chenchenlan", "lvchifeng", "ananhuo", "boqing"] as const;
    let run = {
      ...createGauntletRun("bandit", "saber", "usurper", { rng: () => 0 }),
      stage: 5,
      streak: 4,
      castDraw: castDraw as unknown as readonly CompanionId[],
      seenStoryIds: [],
    };
    const choices = banditCompanionChoices(run, () => 0);
    expect(choices.length).toBeGreaterThan(0);
    for (const id of choices) {
      expect(castDraw).toContain(id);
    }
    // 没抽到也没 seen 的人不出现在选项里
    const unseen = STORY_CAST_POOL.find((id) => !castDraw.includes(id as any))!;
    expect(choices).not.toContain(unseen);
    // seenStoryIds 可补充 castDraw 以外的人
    const seenStoryIds = ["zhangshoushan"] as const;
    run = { ...run, seenStoryIds: [...seenStoryIds] as unknown as readonly CompanionId[] };
    const choices2 = banditCompanionChoices(run, () => 0);
    for (const id of choices2) {
      expect([...castDraw, ...seenStoryIds]).toContain(id);
    }
    // 少林/朝廷不走这条约束，仍可能出标准花名册
    const shaolin = { ...createGauntletRun("shaolin", "saber"), stage: 5, streak: 4 };
    const sChoices = rollCompanionChoices(shaolin, () => 0);
    expect(sChoices).toHaveLength(4);
  });

  it("maxCompanions 阶段化：1–8 程 2 人，9 程起 3 人", () => {
    expect(maxCompanions(1)).toBe(2);
    expect(maxCompanions(8)).toBe(2);
    expect(maxCompanions(9)).toBe(3);
    expect(maxCompanions(12)).toBe(3);
    let run = createGauntletRun("bandit", "sword");
    run = applyCompanion(run, "zhounuanxiang");
    run = applyCompanion(run, "lvchifeng");
    expect(run.companions).toHaveLength(2);
    // 9 程后允许第 3 名同伴
    run = { ...run, stage: 10, streak: 9 };
    run = applyCompanion(run, "ananhuo");
    expect(run.companions).toHaveLength(3);
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

  it("爬塔第4馆轮番：第二人进替补，石台上只有一人", () => {
    setLabRuleset("climb");
    setLabMode(true);
    const run = { ...createGauntletRun("bandit", "saber"), stage: 4 };
    const p = buildGauntletPreset(run);
    expect(p.extraFoeIds).toBeUndefined();
    expect(p.waveEnemyId).toBeTruthy();
    const b = startLabBattle(p, false, 1);
    expect(livingFoes(b)).toHaveLength(1);
    expect(b.gauntletWaveEnemy).toBe(p.waveEnemyId);
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

  it("§31.9/§31.18 伙伴：4/7 四选一", () => {
    let run = createGauntletRun("shaolin", "sword");
    run = { ...run, stage: 5, streak: 4 };
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
    expect(opts.map((o) => o.kind)).toEqual(["forge", "forge", "aidPair", "elixir"]);
    expect(opts[0]?.id).toBe("god-main");
    run = applySuperReward(run, opts[0]!);
    expect(run.weaponId).toBe("sword-a-5");
    expect(run.godMain).toBe(true);
    const hpBefore = run.hpMax;
    run = applySuperReward(run, opts.find((o) => o.kind === "elixir")!);
    expect(run.hpMax).toBe(hpBefore + 12);
    expect(run.bonusEnergyMax).toBe(4);
    run = { ...run, items: ["jinchuang"] };
    run = applySuperReward(run, opts.find((o) => o.kind === "aidPair")!);
    const aids = run.items.filter((i) => i.startsWith("aid"));
    expect(aids).toHaveLength(2);
    expect(new Set(aids).size).toBe(2);
  });

  it("刀线神兵写进主角 weaponId", () => {
    const run = createGauntletRun("bandit", "saber");
    const opts = rollSuperRewards(run);
    expect(opts[0]?.id).toBe("god-main");
    expect(applySuperReward(run, opts[0]!).weaponId).toBe("saber-a-5");
    const elixir = applySuperReward(run, opts.find((o) => o.kind === "elixir")!);
    expect(elixir.hpMax).toBe(run.hpMax + 12);
    expect(elixir.bonusEnergyMax).toBe(4);
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
      expect(canCallAssist(b, climbTestContext(), "sapper").ok).toBe(true);
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

  it("换页替换卸力，本系架不再换成数字复制，永不把进步换成纵步", () => {
    let run = createGauntletRun("bandit", "palm");
    expect(run.deckRecipe).toContain("advance");
    run = applyGauntletReward(run, { kind: "upgrade", id: "advance", title: "换页", tip: "test" });
    expect(run.deckRecipe).toContain("advance");
    expect(run.deckRecipe).not.toContain("advance2");
    run = applyGauntletReward(run, { kind: "upgrade", id: "defend", title: "换页", tip: "test" });
    expect(run.deckRecipe).toContain("defend2");
    expect(run.deckRecipe.filter((id) => id === "defend")).toHaveLength(0);
    run = applyGauntletReward(run, { kind: "upgrade", id: "wardPalm", title: "换页", tip: "test" });
    expect(run.deckRecipe).toContain("wardPalm");
    expect(run.deckRecipe).not.toContain("wardPalm2");
  });

  it("7 馆后本系绝招进奖励池，更早没有", () => {
    const early = rollGauntletRewards({ ...createGauntletRun("bandit", "saber"), stage: 5 }, () => 0.55);
    expect(early.every((o) => o.id !== "ultSaber")).toBe(true);
    const late = { ...createGauntletRun("bandit", "saber"), stage: 8 };
    expect(breakRewardCardPool(late)).toContain("ultSaber");
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
    expect(tryAppendStressIntent(b, "break", breakTestContext({ enemyStressCap: 0 }))).toBe(false);
    expect(b.v2PendingStress ?? []).toEqual([]);
    applyStageTuning(pathLadder("bandit")[2]!);
    expect(getLabTuning().enemyStressCap).toBe(DEFAULT_LAB_TUNING.enemyStressCap);
  });
});

describe("爬塔 climb：奖励仍出谱，不跟读招规则集", () => {
  beforeEach(() => {
    setLabRuleset("climb");
    try {
      localStorage.clear();
    } catch {
      /* ignore */
    }
    setLabRuleset("climb");
  });

  it("馆 1 奖励 4 项且含谱", () => {
    const run = createGauntletRun("bandit", "saber");
    const opts = rollGauntletRewards(run, () => 0.1);
    expect(opts).toHaveLength(4);
    expect(opts.some((o) => o.kind === "card")).toBe(true);
  });

  it("爬塔同伴写牌、分档四选一、三档双心法", () => {
    let run = { ...createGauntletRun("shaolin", "saber"), stage: 5 }; // 打过第 4 馆后进 T2 里程碑
    const t2 = rollCompanionChoices(run, () => 0);
    expect(t2).toHaveLength(4);
    expect(t2.every((id) => rogueMate(id)?.tier === 2)).toBe(true);
    run = applyCompanion(run, t2[0]!);
    expect((run.mateDecks?.[t2[0]!] ?? []).length).toBeGreaterThan(0);
    expect(run.mateMindArts[t2[0]!]).toHaveLength(1);
    run = { ...run, stage: 8 }; // 打过第 7 馆后进 T3 里程碑
    const t3 = rollCompanionChoices(run, () => 0);
    expect(t3).toHaveLength(4);
    expect(t3.every((id) => rogueMate(id)?.tier === 3)).toBe(true);
    run = applyCompanion(run, t3[0]!);
    expect((run.mateDecks?.[t3[0]!] ?? []).length).toBeGreaterThan(0);
    expect(run.mateMindArts[t3[0]!]).toHaveLength(2);
  });
});
