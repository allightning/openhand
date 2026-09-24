import { beforeEach, describe, expect, it } from "vitest";
import { setLabMode } from "./labTuning";
import { MATES } from "../game/party";
import {
  applyEncounterChoice,
  eventAfterFought,
  rollEventChoices,
} from "./encounter";
import {
  applyCompanion,
  banditCompanionChoices,
  createGauntletRun,
  runCompanions,
} from "./gauntlet";
import { setLabRuleset } from "./labRuleset";
import {
  STORY_CAST_POOL,
  applyStoryChoice,
  continueStoryTravel,
  dealStoryCast,
  dismissStoryOpening,
  rollStoryChoices,
  storyOpeningLead,
  usesBanditStory,
} from "./storyBeats";

function seqRng(values: number[]): () => number {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)]!;
}

describe("江湖三整段 / 旗标换页", () => {
  beforeEach(() => {
    setLabRuleset("climb");
    setLabMode(true);
  });

  it("江湖开局抽 5 人、1 个开场，关馆 3/7", () => {
    const a = createGauntletRun("bandit", "saber", "usurper", { rng: seqRng([0, 0]) });
    expect(usesBanditStory(a)).toBe(true);
    expect(a.skipCompanionPick).toBe(true);
    expect(a.castDraw).toHaveLength(5);
    expect(new Set(a.castDraw).size).toBe(5);
    expect(STORY_CAST_POOL).toContain(a.openingId);
    expect(a.castDraw).toContain(a.openingId);
    expect(a.storyPending).toBe("opening");

    const b = createGauntletRun("bandit", "palm", "usurper", { rng: seqRng([0.9, 0.9]) });
    expect(a.openingId).not.toBe(b.openingId);

    const shaolin = createGauntletRun("shaolin", "saber");
    expect(usesBanditStory(shaolin)).toBe(false);
    expect(shaolin.skipCompanionPick).toBeFalsy();
    expect(eventAfterFought(4)).toBe("companion");
    expect(eventAfterFought(3)).toBeNull();
    expect(eventAfterFought(2)).toBe("fork");
  });

  it("三套开场对调名字读不通", () => {
    const lv = storyOpeningLead("lvchifeng");
    const zhou = storyOpeningLead("zhounuanxiang");
    const chen = storyOpeningLead("chenchenlan");
    expect(lv).toMatch(/刀铺|梁山/);
    expect(zhou).toMatch(/粥棚|曹州/);
    expect(chen).toMatch(/码头|缆/);
    expect(lv.replaceAll("吕赤锋", "周暖香")).not.toMatch(/粥棚/);
    expect(zhou).not.toMatch(/刀铺/);
    expect(chen).not.toMatch(/粥棚/);
  });

  it("开场白描不许连着超短句", () => {
    for (const id of STORY_CAST_POOL) {
      const parts = storyOpeningLead(id)
        .split("。")
        .map((s) => s.trim())
        .filter(Boolean);
      expect(parts.filter((s) => s.length < 16), id).toEqual([]);
    }
  });

  it("江湖程 4 里程碑只从见过的人里出；没见过的不在四选一", () => {
    // castDraw 本身算「见过」；seenStoryIds 可补充 castDraw 之外的人
    const castDraw = ["lvchifeng", "zhounuanxiang"] as const;
    const seenStoryIds = ["lvchifeng"] as const;
    const seen = [...castDraw, ...seenStoryIds] as const;
    const run = {
      ...createGauntletRun("bandit", "saber", "usurper", { rng: () => 0 }),
      stage: 5,
      streak: 4,
      openingId: "lvchifeng" as const,
      storyGuest: "lvchifeng" as const,
      castDraw: castDraw as unknown as readonly CompanionId[],
      seenStoryIds: [...seenStoryIds] as unknown as readonly CompanionId[],
      storyPending: "rest" as const,
      skipCompanionPick: false,
    };
    const choices = banditCompanionChoices(run, () => 0);
    expect(choices).toContain("lvchifeng");
    for (const id of choices) {
      expect(seen).toContain(id);
    }
    expect(choices).not.toContain("chenchenlan"); // 不在 castDraw 也没 seen
    expect(choices).not.toContain("ananhuo");
  });

  it("商店后选项带数字，看不出伙伴二字", () => {
    const run = {
      ...createGauntletRun("bandit", "saber", "usurper", { rng: () => 0 }),
      openingId: "lvchifeng" as const,
      storyGuest: "lvchifeng" as const,
      castDraw: ["lvchifeng", "zhounuanxiang"] as const,
      storyPending: "choice" as const,
    };
    const cards = rollStoryChoices(run);
    expect(cards.length).toBeGreaterThanOrEqual(2);
    expect(cards.length).toBeLessThanOrEqual(3);
    expect(cards.every((c) => c.blurb.includes("**"))).toBe(true);
    expect(cards.some((c) => /伙伴/.test(`${c.title}${c.blurb}`))).toBe(false);
    expect(cards.some((c) => c.extraWaves === 1)).toBe(true);
  });

  it("留药后是后果场入队；交出去他不再出现并打 story-solo", () => {
    let run = {
      ...createGauntletRun("bandit", "saber", "usurper", { rng: () => 0 }),
      openingId: "lvchifeng" as const,
      storyGuest: "lvchifeng" as const,
      castDraw: ["lvchifeng", "chenchenlan"] as const,
      storyPending: "choice" as const,
    };
    const medicine = rollStoryChoices(run).find((c) => c.id === "story-lv-medicine")!;
    run = applyStoryChoice(run, medicine);
    expect(run.storyFlags).toContain("lv-left");
    expect(run.storyPending).toBe("followup");
    expect(run.pendingExtraWaves).toBe(1);

    const follow = rollStoryChoices(run);
    expect(follow.some((c) => c.companionId === "lvchifeng")).toBe(true);
    expect(follow.some((c) => /伙伴/.test(c.blurb))).toBe(false);

    let sold = {
      ...createGauntletRun("bandit", "saber", "usurper", { rng: () => 0 }),
      openingId: "lvchifeng" as const,
      storyGuest: "lvchifeng" as const,
      castDraw: ["lvchifeng", "chenchenlan"] as const,
      storyPending: "choice" as const,
    };
    const sell = rollStoryChoices(sold).find((c) => c.id === "story-lv-sell")!;
    sold = applyStoryChoice(sold, sell);
    expect(sold.storyFlags).toContain("story-solo");
    expect(sold.storyPending).toBe("rest");
    expect(rollStoryChoices({ ...sold, storyPending: "followup" }).some((c) => c.companionId === "lvchifeng")).toBe(
      false,
    );
  });

  it("周暖香裹伤不加人；赌一次后不再入队；她自己的筹只出一次", () => {
    let run = {
      ...createGauntletRun("bandit", "palm", "usurper", { rng: () => 0 }),
      openingId: "zhounuanxiang" as const,
      storyGuest: "zhounuanxiang" as const,
      castDraw: ["zhounuanxiang", "chenchenlan"] as const,
      storyPending: "choice" as const,
    };
    const wrap = rollStoryChoices(run).find((c) => c.id === "story-zhou-wrap")!;
    expect(wrap.extraWaves).toBeUndefined();
    expect(wrap.blurb).toMatch(/不加人/);

    const gamble = rollStoryChoices(run).find((c) => c.openWager)!;
    expect(gamble.blurb).toMatch(/不会再给你裹伤/);
    run = applyStoryChoice(run, gamble, () => 0.1);
    expect(run.storyFlags).toContain("gamble-used");
    expect(run.storyFlags).toContain("zhou-gamble");
    expect(run.pendingOpenWager).toBe(true);
    expect(rollStoryChoices({ ...run, storyPending: "followup" }).some((c) => c.companionId === "zhounuanxiang")).toBe(
      false,
    );

    const chen = {
      ...run,
      storyPending: "choice" as const,
      openingId: "chenchenlan" as const,
      storyGuest: "chenchenlan" as const,
    };
    expect(rollStoryChoices(chen).some((c) => c.openWager)).toBe(true);
  });

  it("陈沉缆拉缆才有上船；砍缆跳过黑市；独行补偿多抽 1", () => {
    let run = {
      ...createGauntletRun("bandit", "hook", "usurper", { rng: () => 0 }),
      openingId: "chenchenlan" as const,
      storyGuest: "chenchenlan" as const,
      castDraw: ["chenchenlan", "lvchifeng"] as const,
      storyPending: "choice" as const,
      companions: [],
    };
    const cut = rollStoryChoices(run).find((c) => c.id === "story-chen-cut")!;
    expect(cut.skipMarket).toBe(true);
    run = applyStoryChoice(run, cut);
    expect(run.storyFlags).toContain("story-solo");
    expect(run.pendingRewardBonus).toBeGreaterThanOrEqual(1);
    expect(runCompanions(run)).toHaveLength(0);

    let ropeRun = {
      ...createGauntletRun("bandit", "hook", "usurper", { rng: () => 0 }),
      openingId: "chenchenlan" as const,
      storyGuest: "chenchenlan" as const,
      castDraw: ["chenchenlan", "lvchifeng"] as const,
      storyPending: "choice" as const,
    };
    const rope = rollStoryChoices(ropeRun).find((c) => c.id === "story-chen-rope")!;
    ropeRun = applyStoryChoice(ropeRun, rope);
    expect(ropeRun.storyPending).toBe("followup");
    const join = rollStoryChoices(ropeRun).find((c) => c.companionId === "chenchenlan");
    expect(join).toBeTruthy();

    const full = applyCompanion(ropeRun, "lvchifeng");
    const full2 = applyCompanion(full, "zhounuanxiang");
    expect(rollStoryChoices({ ...full2, storyPending: "followup" }).some((c) => c.companionId)).toBe(false);
  });

  it("开场可跳过进入 choice；赶路无四选", () => {
    let run = createGauntletRun("bandit", "saber", "usurper", { rng: () => 0 });
    expect(run.storyPending).toBe("opening");
    run = dismissStoryOpening(run);
    expect(run.storyPending).toBe("choice");
    run = {
      ...run,
      storyPending: "travel",
      storyFlags: ["lv-gone", "story-solo"],
    };
    expect(rollStoryChoices(run)).toHaveLength(0);
    run = continueStoryTravel(run);
    expect(run.storyPending).toBe("rest");
    expect(run.storyPending).not.toBe("opening");
  });

  it("抽签五人不同；没抽到的人整局不进选项", () => {
    const { castDraw, openingId } = dealStoryCast(seqRng([0, 0.5]));
    expect(castDraw).toHaveLength(5);
    expect(castDraw).toContain(openingId);
    const missing = STORY_CAST_POOL.find((id) => !castDraw.includes(id))!;
    const run = {
      ...createGauntletRun("bandit", "saber", "usurper", { rng: seqRng([0, 0.5]) }),
      castDraw,
      openingId,
      storyGuest: openingId,
      storyPending: "choice" as const,
    };
    const blob = rollStoryChoices(run)
      .map((c) => `${c.title}${c.blurb}${c.companionId ?? ""}`)
      .join();
    expect(blob).not.toContain(MATES[missing]?.name ?? missing);
  });

  it("applyEncounterChoice 不把江湖 skipCompanionPick 清掉", () => {
    const run = createGauntletRun("bandit", "saber", "usurper", { rng: () => 0 });
    expect(run.skipCompanionPick).toBe(true);
    const next = applyEncounterChoice(run, {
      id: "noop",
      title: "赶路",
      blurb: "路还在。**下场照旧。**",
      risk: "safe",
    });
    expect(next.skipCompanionPick).toBe(true);
  });

  it("少林仍走固定客栈槽", () => {
    expect(eventAfterFought(1)).toBe("inn");
    const run = createGauntletRun("shaolin", "palm");
    expect(rollEventChoices(run, "inn").length).toBeGreaterThan(0);
  });
});
