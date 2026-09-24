import { describe, expect, it, beforeEach } from "vitest";
import { breakTestContext } from "../game/testContext";
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
  eventLead,
  formatEncounterRichText,
  rollEventChoices,
  shouldShowFinale,
} from "./encounter";
import { startLabBattle } from "./factory";
import { setLabMode } from "../game/labTuning";
import { canPlay } from "../game/sim";

function findChoice(
  run: ReturnType<typeof createGauntletRun>,
  kind: Parameters<typeof rollEventChoices>[1],
  pred: (c: ReturnType<typeof rollEventChoices>[number]) => boolean,
) {
  for (let i = 0; i < 24; i++) {
    const hit = rollEventChoices(run, kind, () => (i * 0.11) % 1).find(pred);
    if (hit) return hit;
  }
  return undefined;
}

describe("馆间遭遇 / 终局 / 带伤过馆", () => {
  beforeEach(() => {
    setLabRuleset("break");
    setLabMode(true);
  });

  it("机制关键句加黑：整句同字号，不拆关键字", () => {
    const rest = formatEncounterRichText("差役换班与你无关。**袋里彩金 +8。**");
    expect(rest).toContain('<span class="gauntlet-hint">袋里彩金 +8。</span>');
    expect(rest).not.toContain("<b ");
    const ask = formatEncounterRichText("你丢几文打点，**花 6 彩金。下一摊营地免费奖励多抽 1。**");
    expect(ask).toContain('<span class="gauntlet-hint">花 6 彩金。下一摊营地免费奖励多抽 1。</span>');
    const plain = formatEncounterRichText("讨债的人堵在柜上。");
    expect(plain).not.toContain("gauntlet-hint");
  });

  it("拓扑：1 客栈、2/8 岔路、4/7 同道、5 伏击、6 赌摊、final-1 情报（默认 10 程）", () => {
    expect(eventAfterFought(1)).toBe("inn");
    expect(eventAfterFought(2)).toBe("fork");
    expect(eventAfterFought(3)).toBeNull();
    expect(eventAfterFought(4)).toBe("companion");
    expect(eventAfterFought(5)).toBe("ambush");
    expect(eventAfterFought(6)).toBe("stall");
    expect(eventAfterFought(7)).toBe("companion");
    expect(eventAfterFought(8)).toBe("fork");
    expect(eventAfterFought(9)).toBe("finaleHint");
    expect(eventAfterFought(9, 9)).toBeNull();
    expect(eventAfterFought(8, 9)).toBe("finaleHint");
    expect(eventAfterFought(11, 12)).toBe("finaleHint");
    expect(eventAfterFought(9, 12)).toBeNull();
    expect(eventAfterFought(8, 12)).toBe("fork");
  });

  it("遭遇导语是故事线，不是一行奖励摘要", () => {
    const run = createGauntletRun("bandit", "saber");
    const lead = eventLead(run, "inn");
    expect(lead.length).toBeGreaterThan(80);
    expect(lead).toMatch(/老周|茶|刀伤/);
    expect(lead).not.toMatch(/像|仿佛|如同/);
    expect(lead).not.toMatch(/你不开口|局就开了|把路摊开|得你先说|来路他不问|不问来路|没叫你的号|不报上姓/);
    expect(eventLead(createGauntletRun("shaolin", "saber"), "inn")).not.toMatch(/局就开了|把路摊开|没抬头|不问后山/);
    expect(eventLead(createGauntletRun("shaolin", "saber"), "inn").length).toBeGreaterThan(80);
    expect(eventLead(createGauntletRun("court", "saber"), "fork").length).toBeGreaterThan(70);
  });

  it("险枝给下一馆加替补", () => {
    let run = { ...createGauntletRun("bandit", "saber"), stage: 3 };
    const danger = findChoice(run, "fork", (c) => c.risk === "danger" && Boolean(c.extraWaves));
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
    const rich = findChoice(run, "fork", (c) => c.risk === "rich" && Boolean(c.rewardBonus))!;
    expect(rich).toBeTruthy();
    expect(rich.blurb).toMatch(/营地免费奖励多抽 1/);
    expect(rich.blurb).not.toMatch(/开战手牌/);
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
    const run = { ...createGauntletRun("shaolin", "saber"), stage: 5 }; // 过第 4 馆后进里程碑
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

  it("少林朝廷客栈导语铺开；同道选项带花名册称号且三线口气不同", () => {
    const slLead = eventLead(createGauntletRun("shaolin", "saber"), "inn");
    expect(slLead).toMatch(/空明|晚课|斋堂/);
    expect(slLead.length).toBeGreaterThan(120);
    expect(slLead).not.toMatch(/像|仿佛|如同|断劲|噬血|裂桩/);
    const ctLead = eventLead(createGauntletRun("court", "saber"), "inn");
    expect(ctLead).toMatch(/赵三|腰牌|冷茶/);
    expect(ctLead.length).toBeGreaterThan(120);

    const sl = rollEventChoices({ ...createGauntletRun("shaolin", "saber"), stage: 5 }, "companion", () => 0);
    const ct = rollEventChoices({ ...createGauntletRun("court", "saber"), stage: 5 }, "companion", () => 0);
    const jh = rollEventChoices(
      {
        ...createGauntletRun("bandit", "saber"),
        stage: 5,
        castDraw: ["lvchifeng", "zhounuanxiang", "chenchenlan", "ananhuo", "boqing"] as const,
        seenStoryIds: ["lvchifeng", "zhounuanxiang", "chenchenlan"] as const,
      },
      "companion",
      () => 0,
    );
    const duelSl = sl.find((c) => c.skirmish === "duel")!.blurb;
    const duelCt = ct.find((c) => c.skirmish === "duel")!.blurb;
    const duelJh = jh.find((c) => c.skirmish === "duel")?.blurb ?? "";
    expect(duelSl).toMatch(/寺径|晚课/);
    expect(duelCt).toMatch(/官道|换班/);
    expect(duelJh).toMatch(/桥|夺|下/);
    expect(duelSl).toMatch(/·/);
    expect(sl.every((c) => c.blurb.includes("入伙") || c.blurb.includes("当场入伙"))).toBe(true);
    expect(sl.some((c) => c.blurb.includes("多 1 名替补"))).toBe(true);
    expect(sl.some((c) => c.blurb.includes("彩金 +12"))).toBe(true);
    expect(sl.some((c) => c.blurb.includes("花 36 彩金"))).toBe(true);
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

  it("同道四具名必选一人；无路过空过", () => {
    const run = { ...createGauntletRun("shaolin", "saber"), stage: 5 }; // 过第 4 馆后进里程碑
    const mates = rollEventChoices(run, "companion", () => 0);
    expect(mates).toHaveLength(4);
    expect(mates.every((c) => c.companionId)).toBe(true);
    expect(mates.some((c) => c.skipCompanion)).toBe(false);
  });

  it("同道选项带人名；买情报能读下两馆；跨线塞外路敌人", () => {
    const run = { ...createGauntletRun("shaolin", "saber"), stage: 5 }; // 过第 4 馆后进里程碑
    const mates = rollEventChoices(run, "companion", () => 0);
    expect(mates.filter((c) => c.companionId).length).toBe(4);
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
    const withMate = applyCompanion({ ...createGauntletRun("shaolin", "saber"), stage: 8 }, "lvchifeng");
    const hall7 = rollEventChoices({ ...withMate, stage: 8 }, "companion", () => 0);
    const ids = hall7.map((c) => c.companionId).filter(Boolean);
    expect(ids).toContain("lishuangxing");
  });

  it("效果字段能分清绕道、进账、入伙、添人、开盅", () => {
    const run = createGauntletRun("bandit", "saber");
    const rest = findChoice(run, "inn", (c) => c.id.endsWith("-rest"))!;
    expect(encounterOutcomeTag(rest)).toBe("进账");
    expect(encounterEffectLine(rest)).toMatch(/彩金 \+8/);

    const forkSafe = findChoice({ ...run, stage: 3 }, "fork", (c) => c.risk === "safe" && !c.skipMarket)!;
    expect(encounterOutcomeTag(forkSafe)).toBe("绕道");
    expect(encounterEffectLine(forkSafe)).toMatch(/下场照旧/);

    const danger = findChoice({ ...run, stage: 3 }, "fork", (c) => Boolean(c.extraWaves))!;
    expect(encounterOutcomeTag(danger)).toBe("添人");
    expect(encounterEffectLine(danger)).toMatch(/下场多 1 人/);

    const rich = findChoice({ ...run, stage: 3 }, "fork", (c) => Boolean(c.rewardBonus) && !c.guestEnemy)!;
    expect(encounterOutcomeTag(rich)).toBe("多抽");
    expect(encounterEffectLine(rich)).toMatch(/营地多抽 1/);
    expect(encounterEffectLine(rich)).toMatch(/彩金 /);

    const save = rollEventChoices({ ...createGauntletRun("shaolin", "saber"), stage: 5 }, "companion", () => 0).find(
      (c) => c.skirmish === "save",
    )!;
    expect(encounterOutcomeTag(save)).toBe("救人");
    expect(encounterEffectLine(save)).toMatch(/赢了入伙/);

    const buy = rollEventChoices({ ...createGauntletRun("shaolin", "saber"), stage: 5 }, "companion", () => 0).find(
      (c) => c.companionId && !c.skirmish,
    )!;
    expect(encounterOutcomeTag(buy)).toBe("买命");
    expect(encounterEffectLine(buy)).toMatch(/当场入伙/);

    const side = findChoice({ ...run, stage: 3 }, "fork", (c) => Boolean(c.sideSkirmish));
    expect(side).toBeTruthy();
    expect(side!.blurb).toMatch(/\+22/);
    expect(side!.blurb).toMatch(/−10/);
    expect(encounterOutcomeTag(side!)).toBe("支线");
    const after = applyEncounterChoice({ ...run, stage: 3 }, side!);
    expect(after.pendingSkirmish).toBe("side");
    expect(after.pendingSideLabel).toMatch(/^\d+-\d+$/);

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
    expect(canPlay(b, "ad", breakTestContext()).ok).toBe(false);
    expect(canPlay(b, "ad", breakTestContext()).reason).toMatch(/禁位移/);
  });

  it("无尽不开终局抉择，也不进遭遇", () => {
    const run = createGauntletRun("bandit", "saber", "usurper", { endless: true });
    expect(run.endless).toBe(true);
    expect(shouldShowFinale({ ...run, stage: 10 })).toBe(false);
  });

  it("短 9/长 12 的期末位置正确", () => {
    expect(shouldShowFinale({ ...createGauntletRun("bandit", "saber"), stage: 9, routeLength: 9 })).toBe(true);
    expect(shouldShowFinale({ ...createGauntletRun("bandit", "saber"), stage: 8, routeLength: 9 })).toBe(false);
    expect(shouldShowFinale({ ...createGauntletRun("bandit", "saber"), stage: 12, routeLength: 12 })).toBe(true);
    expect(shouldShowFinale({ ...createGauntletRun("bandit", "saber"), stage: 10, routeLength: 12 })).toBe(false);
  });
});
