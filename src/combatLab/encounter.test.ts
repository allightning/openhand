import { describe, expect, it, beforeEach } from "vitest";
import { setLabRuleset } from "./labRuleset";
import {
  applyScarPass,
  buildGauntletPreset,
  buildSkirmishPreset,
  canOfferLifeline,
  canOfferScarPass,
  createGauntletRun,
  gauntletRewardTakeCount,
  upcomingFoeNames,
  applyCompanion,
} from "./gauntlet";
import {
  applyEncounterChoice,
  applyFinale,
  encounterEffectLine,
  encounterOutcomeTag,
  eventAfterFought,
  rollEventChoices,
  shouldShowFinale,
} from "./encounter";
import { startLabBattle } from "./factory";
import { setLabMode } from "../game/labTuning";
import { canPlay } from "../game/sim";

describe("馆间遭遇 / 终局 / 带伤过馆", () => {
  beforeEach(() => {
    setLabRuleset("break");
    setLabMode(true);
  });

  it("拓扑：1 客栈、2/4/8 岔路、3/7 同道、5 伏击、6 赌摊、9 情报", () => {
    expect(eventAfterFought(1)).toBe("inn");
    expect(eventAfterFought(2)).toBe("fork");
    expect(eventAfterFought(3)).toBe("companion");
    expect(eventAfterFought(4)).toBe("fork");
    expect(eventAfterFought(5)).toBe("ambush");
    expect(eventAfterFought(6)).toBe("stall");
    expect(eventAfterFought(7)).toBe("companion");
    expect(eventAfterFought(8)).toBe("fork");
    expect(eventAfterFought(9)).toBe("finaleHint");
  });

  it("险枝给下一馆加替补", () => {
    let run = { ...createGauntletRun("bandit", "saber"), stage: 3 };
    const danger = rollEventChoices(run, "fork", () => 0).find((c) => c.risk === "danger");
    expect(danger).toBeTruthy();
    run = applyEncounterChoice(run, danger!);
    expect(run.pendingExtraWaves).toBeGreaterThanOrEqual(1);
    const preset = buildGauntletPreset(run);
    const waves = [preset.waveEnemyId, ...(preset.waveQueue ?? [])].filter(Boolean);
    const plain = buildGauntletPreset({ ...createGauntletRun("bandit", "saber"), stage: 3 });
    const plainWaves = [plain.waveEnemyId, ...(plain.waveQueue ?? [])].filter(Boolean);
    expect(waves.length).toBeGreaterThan(plainWaves.length);
  });

  it("肥枝让营地多抽 1", () => {
    let run = { ...createGauntletRun("bandit", "saber"), stage: 3 };
    const rich = rollEventChoices(run, "fork", () => 0.9).find((c) => c.risk === "rich")!;
    run = applyEncounterChoice(run, rich);
    expect(run.pendingRewardBonus).toBeGreaterThanOrEqual(1);
    const base = gauntletRewardTakeCount({ ...createGauntletRun("bandit", "saber"), stage: 3 });
    expect(gauntletRewardTakeCount(run)).toBe(base + (run.pendingRewardBonus ?? 0));
  });

  it("短战预设单人、不占下一馆队列", () => {
    const run = { ...createGauntletRun("bandit", "saber"), pendingSkirmish: "save" as const };
    const p = buildSkirmishPreset(run);
    expect(p.waveQueue ?? []).toEqual([]);
    expect(p.extraFoeIds ?? []).toEqual([]);
    expect(p.enemyId).toBe("mob_road_01");
  });

  it("馆 10 未选终局要先抉择；人海比座前人多", () => {
    const run = { ...createGauntletRun("bandit", "saber"), stage: 10 };
    expect(shouldShowFinale(run)).toBe(true);
    const mob = applyFinale(run, "mob");
    const seat = applyFinale(run, "seat");
    const n = (p: ReturnType<typeof buildGauntletPreset>) => [p.waveEnemyId, ...(p.waveQueue ?? [])].filter(Boolean).length;
    expect(n(buildGauntletPreset(mob))).toBeGreaterThan(n(buildGauntletPreset(seat)));
    expect(seat.pendingHallLaw).toBeUndefined();
    expect(seat.pendingDmgMul ?? 1).toBeGreaterThan(1);
  });

  it("同道带人可伸手点到买命；伏击卡不重复", () => {
    const run = createGauntletRun("bandit", "saber");
    const mates = rollEventChoices(run, "companion", () => 0);
    expect(mates.length).toBeGreaterThanOrEqual(4);
    expect(mates.some((c) => c.skirmish === "save" && c.companionId)).toBe(true);
    expect(mates.some((c) => c.skirmish === "duel" && c.companionId)).toBe(true);
    expect(mates.some((c) => c.id.startsWith("mate-buy") && c.companionId)).toBe(true);
    const first = rollEventChoices(run, "ambush", () => 0);
    expect(first.length).toBeGreaterThanOrEqual(3);
    const second = rollEventChoices({ ...run, seenEvents: first.map((c) => c.id) }, "ambush", () => 0.6);
    expect(second.every((c) => !first.some((x) => x.id === c.id))).toBe(true);
  });

  it("第一次败可赊账；第二次可带伤过馆（馆序+1、伤痕、抽 20%）", () => {
    const fresh = { ...createGauntletRun("bandit", "saber"), pot: 400, stage: 4 };
    expect(canOfferLifeline(fresh)).toBe(true);
    expect(canOfferScarPass(fresh)).toBe(false);
    const afterBankrupt = { ...fresh, bankruptUsed: true, pot: 200 };
    expect(canOfferLifeline(afterBankrupt)).toBe(false);
    expect(canOfferScarPass(afterBankrupt)).toBe(true);
    const scarred = applyScarPass(afterBankrupt);
    expect(scarred.stage).toBe(5);
    expect(scarred.scars).toBe(1);
    expect(scarred.pot).toBe(160);
    expect(scarred.streak).toBe(0);
    expect(canOfferScarPass(scarred)).toBe(false);
  });

  it("赌摊事先不写输赢，点下去才掷骰", () => {
    const run = { ...createGauntletRun("bandit", "saber"), pot: 80, stage: 7 };
    const small = rollEventChoices(run, "stall", () => 0).find((c) => c.stall === "small")!;
    expect(small.blurb).not.toMatch(/停在你这边|骰子翻了/);
    expect(small.potDelta).toBeUndefined();
    expect(applyEncounterChoice(run, small, () => 0).pot).toBe(98);
    expect(applyEncounterChoice(run, small, () => 0.9).pot).toBe(66);
  });

  it("路过同道不把第二次入伙关掉", () => {
    const run = { ...createGauntletRun("bandit", "saber"), stage: 4 };
    const refuse = rollEventChoices(run, "companion", () => 0).find((c) => c.skipCompanion)!;
    const after = applyEncounterChoice(run, refuse);
    expect(after.skipCompanionPick).toBeFalsy();
    expect(after.pendingRecruit).toBeUndefined();
  });

  it("同道选项带人名；买情报能读下两馆；跨线塞外路敌人", () => {
    const run = { ...createGauntletRun("bandit", "saber"), stage: 4 };
    const mates = rollEventChoices(run, "companion", () => 0);
    expect(mates.filter((c) => c.companionId).length).toBe(3);
    const intel = rollEventChoices(run, "inn", () => 0).find((c) => c.intel)!;
    const peeked = applyEncounterChoice(run, intel);
    expect(peeked.pendingIntel).toBe(true);
    const names = upcomingFoeNames(peeked, 2);
    expect(names).toHaveLength(2);
    expect(names[0]!.name.length).toBeGreaterThan(0);

    const late = { ...createGauntletRun("bandit", "saber"), stage: 9, facedEnemies: ["mob_road_01"] };
    const cross = rollEventChoices(late, "fork", () => 0).find((c) => c.guestEnemy);
    expect(cross).toBeTruthy();
    const guested = applyEncounterChoice(late, cross!);
    expect(guested.pendingGuestEnemyId).toBeTruthy();
    expect(String(guested.pendingGuestEnemyId)).not.toMatch(/^mob_road_|^mob_escort|^mob_canal_/);
    const waves = [buildGauntletPreset(guested).waveEnemyId, ...(buildGauntletPreset(guested).waveQueue ?? [])];
    expect(waves).toContain(guested.pendingGuestEnemyId);
  });

  it("点到短战打的是那个人的兵刃；馆7优先同门", () => {
    const duelRun = {
      ...createGauntletRun("bandit", "saber"),
      pendingSkirmish: "duel" as const,
      pendingRecruit: "boqing" as const,
    };
    expect(buildSkirmishPreset(duelRun).enemyId).toMatch(/court|sword|monk/);
    const withMate = applyCompanion({ ...createGauntletRun("bandit", "saber"), stage: 8 }, "lvchifeng");
    const hall7 = rollEventChoices({ ...withMate, stage: 8 }, "companion", () => 0);
    const ids = hall7.map((c) => c.companionId).filter(Boolean);
    expect(ids).toContain("lishuangxing");
  });

  it("效果字段能分清绕道、进账、入伙、添人、开盅", () => {
    const run = createGauntletRun("bandit", "saber");
    const rest = rollEventChoices(run, "inn", () => 0).find((c) => c.id.endsWith("-rest"))!;
    expect(encounterOutcomeTag(rest)).toBe("进账");
    expect(encounterEffectLine(rest)).toMatch(/彩金 \+8/);

    const forkSafe = rollEventChoices({ ...run, stage: 3 }, "fork", () => 0).find((c) => c.risk === "safe" && !c.skipMarket)!;
    expect(encounterOutcomeTag(forkSafe)).toBe("绕道");
    expect(encounterEffectLine(forkSafe)).toMatch(/下场照旧/);

    const danger = rollEventChoices({ ...run, stage: 3 }, "fork", () => 0).find((c) => c.extraWaves)!;
    expect(encounterOutcomeTag(danger)).toBe("添人");
    expect(encounterEffectLine(danger)).toMatch(/下场多 1 人/);

    const rich = rollEventChoices({ ...run, stage: 3 }, "fork", () => 0.9).find((c) => c.rewardBonus && !c.guestEnemy)!;
    expect(encounterOutcomeTag(rich)).toBe("多抽");
    expect(encounterEffectLine(rich)).toMatch(/营地多抽 1/);
    expect(encounterEffectLine(rich)).toMatch(/彩金 /);

    const save = rollEventChoices(run, "companion", () => 0).find((c) => c.skirmish === "save")!;
    expect(encounterOutcomeTag(save)).toBe("救人");
    expect(encounterEffectLine(save)).toMatch(/赢了入伙/);

    const buy = rollEventChoices(run, "companion", () => 0).find((c) => c.companionId && !c.skirmish)!;
    expect(encounterOutcomeTag(buy)).toBe("买命");
    expect(encounterEffectLine(buy)).toMatch(/当场入伙/);

    const refuse = rollEventChoices(run, "companion", () => 0).find((c) => c.skipCompanion)!;
    expect(encounterOutcomeTag(refuse)).toBe("绕过");
    expect(encounterEffectLine(refuse)).toMatch(/本站不入伙/);

    const small = rollEventChoices(run, "stall", () => 0).find((c) => c.stall === "small")!;
    expect(encounterOutcomeTag(small)).toBe("小注");
    expect(encounterEffectLine(small)).toMatch(/点下去开盅/);
    expect(encounterEffectLine(small)).not.toMatch(/一半停在/);
  });

  it("馆法禁位移：进步打不出", () => {
    const run = { ...createGauntletRun("bandit", "saber"), pendingHallLaw: "noMove" as const };
    const b = startLabBattle(buildGauntletPreset(run), true, 1);
    b.energy = 6;
    b.hand = [{ uid: "ad", defId: "advance" }];
    expect(canPlay(b, "ad").ok).toBe(false);
    expect(canPlay(b, "ad").reason).toMatch(/禁位移/);
  });
});
