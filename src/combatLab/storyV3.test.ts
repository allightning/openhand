import { beforeEach, describe, expect, it } from "vitest";
import { setLabMode } from "../game/labTuning";
import { shouldSkipWager } from "./breakOnboard";
import { applyEncounterChoice } from "./encounter";
import { createGauntletRun, wagerStakeMax } from "./gauntlet";
import { setLabRuleset } from "./labRuleset";
import {
  STORY_CAST_POOL,
  applyPostCampBeat,
  applyStoryChoice,
  dealStoryCast,
  personHome,
  pickPostCampBeat,
  rollStoryChoices,
  rollStorySchedule,
  storyOpeningLead,
} from "./storyBeats";

function seqRng(values: number[]): () => number {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)]!;
}

describe("江湖 v3：选择开下一拍，不预排赌馆", () => {
  beforeEach(() => {
    setLabRuleset("climb");
    setLabMode(true);
  });

  it("新局起步 20 彩金，不记垫资；第一程默认跳过赌馆", () => {
    const run = createGauntletRun("bandit", "saber", "usurper", { rng: () => 0 });
    expect(run.pot).toBe(20);
    expect(run.bankerChosen).toBe(true);
    expect(shouldSkipWager(1, run)).toBe(true);
    expect(shouldSkipWager(2, run)).toBe(true);
    expect(shouldSkipWager(1, { ...run, pendingOpenWager: true })).toBe(false);
    setLabRuleset("break");
    expect(shouldSkipWager(1)).toBe(false);
    expect(shouldSkipWager(2)).toBe(false);
  });

  it("开局不预排 stallSlots；不选进赌馆则调度器也不出 stall", () => {
    const run = createGauntletRun("bandit", "saber", "usurper", { rng: () => 0 });
    expect(run.storySchedule?.stallSlots ?? []).toHaveLength(0);
    expect(run.storySchedule?.marketSlots ?? []).toHaveLength(0);
    expect(rollStorySchedule(() => 0.9).stallSlots).toHaveLength(0);
    const beat = pickPostCampBeat(
      {
        ...run,
        storyPending: "rest",
        seenStoryIds: [...(run.castDraw ?? [])],
        gambleCount: 0,
      },
      3,
      () => 0,
    );
    expect(beat).not.toBe("stall");
    expect(beat).not.toBe("market");
  });

  it("选项 openWager 才进赌馆，注额上限当前彩金 80%", () => {
    let run = {
      ...createGauntletRun("bandit", "palm", "usurper", { rng: () => 0 }),
      openingId: "zhounuanxiang" as const,
      storyGuest: "zhounuanxiang" as const,
      castDraw: ["zhounuanxiang", "chenchenlan", "lvchifeng", "ananhuo", "boqing"] as const,
      storyPending: "choice" as const,
      pot: 100,
      gambleCount: 0,
    };
    const gamble = rollStoryChoices(run).find((c) => c.openWager)!;
    expect(gamble.stall).toBeUndefined();
    run = applyStoryChoice(run, gamble, () => 0.1);
    expect(run.pendingOpenWager).toBe(true);
    expect(run.gambleCount).toBe(1);
    expect(shouldSkipWager(2, run)).toBe(false);
    expect(wagerStakeMax(100, 2)).toBe(80);
    expect(wagerStakeMax(20, 1)).toBe(16);
    setLabRuleset("break");
    expect(wagerStakeMax(100, 1)).toBe(30);
  });

  it("一局从 12 人里抽 5 个；没抽到的人整局不进选项", () => {
    expect(STORY_CAST_POOL).toHaveLength(12);
    const { castDraw, openingId } = dealStoryCast(seqRng([0, 0.2, 0.4, 0.6, 0.8, 0.1]));
    expect(castDraw).toHaveLength(5);
    expect(new Set(castDraw).size).toBe(5);
    expect(castDraw).toContain(openingId);
    const run = createGauntletRun("bandit", "saber", "usurper", { rng: () => 0 });
    expect(run.castDraw).toHaveLength(5);
    const missing = STORY_CAST_POOL.filter((id) => !run.castDraw?.includes(id));
    expect(missing.length).toBe(7);
    const blob = rollStoryChoices({
      ...run,
      storyPending: "choice",
      storyGuest: run.openingId,
      openingId: run.openingId,
    })
      .map((c) => `${c.title}${c.blurb}${c.companionId ?? ""}`)
      .join();
    for (const id of missing) {
      const name =
        id === "lvchifeng"
          ? "吕赤锋"
          : id === "zhounuanxiang"
            ? "周暖香"
            : id === "chenchenlan"
              ? "陈沉缆"
              : id === "ananhuo"
                ? "安岸火"
                : id === "boqing"
                  ? "薄青"
                  : id === "zhangshoushan"
                    ? "章守山"
                    : id === "lishuangxing"
                      ? "厉霜行"
                      : id === "ouyangyingou"
                        ? "欧阳饮钩"
                        : id === "fubishan"
                          ? "傅壁山"
                          : id === "duguposui"
                            ? "独孤破岁"
                            : id === "gongsunsizhang"
                              ? "公孙四丈"
                              : "封堂";
      expect(blob).not.toContain(name);
    }
  });

  it("十二人对调名字读不通；各人至少一条开赌馆或黑市或换城或追兵", () => {
    const keys: Record<string, RegExp> = {
      lvchifeng: /刀铺|梁山/,
      zhounuanxiang: /粥棚|曹州/,
      chenchenlan: /码头|缆/,
      ananhuo: /河岸|泰安/,
      boqing: /剑铺|兖州/,
      zhangshoushan: /山门|闸/,
      lishuangxing: /后寨/,
      ouyangyingou: /夜航|扬州/,
      fubishan: /药铺|济南/,
      duguposui: /废院/,
      gongsunsizhang: /长坡|官道/,
      fengtang: /闸口/,
    };
    for (const id of STORY_CAST_POOL) {
      const lead = storyOpeningLead(id);
      expect(lead).toMatch(keys[id]!);
      for (const other of STORY_CAST_POOL) {
        if (other === id) continue;
        const swapped = lead.replaceAll(
          { lvchifeng: "吕赤锋", zhounuanxiang: "周暖香", chenchenlan: "陈沉缆", ananhuo: "安岸火", boqing: "薄青", zhangshoushan: "章守山", lishuangxing: "厉霜行", ouyangyingou: "欧阳饮钩", fubishan: "傅壁山", duguposui: "独孤破岁", gongsunsizhang: "公孙四丈", fengtang: "封堂" }[id]!,
          { lvchifeng: "吕赤锋", zhounuanxiang: "周暖香", chenchenlan: "陈沉缆", ananhuo: "安岸火", boqing: "薄青", zhangshoushan: "章守山", lishuangxing: "厉霜行", ouyangyingou: "欧阳饮钩", fubishan: "傅壁山", duguposui: "独孤破岁", gongsunsizhang: "公孙四丈", fengtang: "封堂" }[other]!,
        );
        expect(swapped).toMatch(keys[id]!);
      }
      const run = {
        ...createGauntletRun("bandit", "saber"),
        openingId: id,
        storyGuest: id,
        castDraw: [id, ...STORY_CAST_POOL.filter((x) => x !== id).slice(0, 4)],
        storyPending: "choice" as const,
        gambleCount: 0,
      };
      const cards = rollStoryChoices(run);
      expect(cards.some((c) => c.openWager || c.openMarket || c.extraWaves || /济南|泰安|下一座城|自己走|连夜/.test(`${c.title}${c.blurb}`))).toBe(
        true,
      );
    }
    expect(personHome("ananhuo")).toBe("taian");
    expect(personHome("fubishan")).toBe("jinan");
    expect(personHome("fengtang")).not.toBe(personHome("chenchenlan"));
  });

  it("往济南：抽到傅壁山则下一拍在药铺；没抽到不把周暖香拉来", () => {
    const base = {
      ...createGauntletRun("bandit", "saber"),
      openingId: "lvchifeng" as const,
      storyGuest: "lvchifeng" as const,
      storyPlace: "liangshan" as const,
      storyPending: "choice" as const,
      seenStoryIds: [] as string[],
      gambleCount: 0,
    };
    const goJinan = rollStoryChoices({
      ...base,
      castDraw: ["lvchifeng", "zhounuanxiang", "fubishan", "ananhuo", "boqing"],
    }).find((c) => c.id === "story-lv-jinan")!;

    const withFu = applyStoryChoice(
      {
        ...base,
        castDraw: ["lvchifeng", "zhounuanxiang", "fubishan", "ananhuo", "boqing"],
      },
      goJinan,
    );
    expect(withFu.storyPlace).toBe("jinan");
    const restFu = { ...withFu, storyPending: "rest" as const };
    expect(pickPostCampBeat(restFu, 2, () => 0)).toBe("story");
    expect(applyPostCampBeat(restFu, "story", 2).storyGuest).toBe("fubishan");

    const noFu = applyStoryChoice(
      {
        ...base,
        castDraw: ["lvchifeng", "zhounuanxiang", "chenchenlan", "ananhuo", "boqing"],
      },
      goJinan,
    );
    expect(noFu.storyPlace).toBe("jinan");
    const restNo = { ...noFu, storyPending: "rest" as const };
    expect(pickPostCampBeat(restNo, 2, () => 0)).not.toBe("story");
    expect(applyPostCampBeat(restNo, "ambush", 2).storyPlace).toBe("jinan");
    expect(applyPostCampBeat(restNo, "ambush", 2).storyGuest).not.toBe("zhounuanxiang");
  });

  it("留在梁山：同山有厉霜行则见后寨，不见曹州周暖香", () => {
    const run = {
      ...createGauntletRun("bandit", "saber"),
      openingId: "lvchifeng" as const,
      storyGuest: "lvchifeng" as const,
      storyPlace: "liangshan" as const,
      storyPending: "choice" as const,
      castDraw: ["lvchifeng", "zhounuanxiang", "lishuangxing", "ananhuo", "boqing"] as const,
      seenStoryIds: [] as string[],
    };
    const medicine = rollStoryChoices(run).find((c) => c.id === "story-lv-medicine")!;
    const afterHelp = applyStoryChoice(run, medicine);
    expect(afterHelp.storyPending).toBe("followup");
    const enough = rollStoryChoices(afterHelp).find((c) => c.id === "story-lvchifeng-enough")!;
    const stayed = applyStoryChoice(afterHelp, enough);
    expect(stayed.storyPlace).toBe("liangshan");
    const rest = { ...stayed, storyPending: "rest" as const };
    expect(pickPostCampBeat(rest, 2, () => 0)).toBe("story");
    expect(applyPostCampBeat(rest, "story", 2).storyGuest).toBe("lishuangxing");
  });

  it("去黑市的选项当场打开 pendingOpenMarket", () => {
    const run = {
      ...createGauntletRun("bandit", "spear", "usurper", { rng: () => 0 }),
      openingId: "ananhuo" as const,
      storyGuest: "ananhuo" as const,
      castDraw: ["ananhuo", "lvchifeng", "boqing", "fubishan", "fengtang"],
      storyPending: "choice" as const,
    };
    const mkt = rollStoryChoices(run).find((c) => c.openMarket)!;
    const next = applyEncounterChoice(run, mkt);
    expect(next.pendingOpenMarket).toBe(true);
  });
});
