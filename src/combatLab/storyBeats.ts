import { MATES } from "../game/party";
import type { CompanionId } from "../game/types";
import type { EncounterChoice } from "./encounter";
import { applyEncounterChoice } from "./encounter";
import type { GauntletRun } from "./gauntlet";

export const STORY_CAST_POOL: CompanionId[] = [
  "lvchifeng",
  "zhounuanxiang",
  "boqing",
  "ananhuo",
  "zhangshoushan",
  "chenchenlan",
  "lishuangxing",
  "fubishan",
  "duguposui",
  "gongsunsizhang",
  "fengtang",
  "ouyangyingou",
];

export type StoryPending = "opening" | "choice" | "followup" | "travel" | "rest" | "stall" | "market" | "ambush";
export type StoryPlaceId =
  | "liangshan"
  | "liangshan-rear"
  | "jinan"
  | "caozhou"
  | "xuzhou"
  | "xuzhou-gate"
  | "yangzhou"
  | "taian"
  | "yanzhou"
  | "shanmen"
  | "ruin"
  | "slope"
  | "end";
export type PostCampBeat = "story" | "stall" | "market" | "ambush" | "travel" | "rest";
export type StorySchedule = { stallSlots: number[]; marketSlots: number[] };

const GAMBLE_CAP = 3;
const CAST_DRAW = 5;

const PERSON_HOME: Partial<Record<CompanionId, StoryPlaceId>> = {
  lvchifeng: "liangshan",
  zhounuanxiang: "caozhou",
  chenchenlan: "xuzhou",
  ananhuo: "taian",
  boqing: "yanzhou",
  zhangshoushan: "shanmen",
  lishuangxing: "liangshan-rear",
  ouyangyingou: "yangzhou",
  fubishan: "jinan",
  duguposui: "ruin",
  gongsunsizhang: "slope",
  fengtang: "xuzhou-gate",
};

const PERSON_TITLE: Partial<Record<CompanionId, string>> = {
  lvchifeng: "梁山刀铺",
  zhounuanxiang: "曹州粥棚",
  chenchenlan: "徐州码头",
  ananhuo: "泰安河岸",
  boqing: "兖州剑铺",
  zhangshoushan: "山门闸",
  lishuangxing: "梁山后寨",
  ouyangyingou: "扬州夜航",
  fubishan: "济南药铺",
  duguposui: "废院",
  gongsunsizhang: "官道长坡",
  fengtang: "徐州闸口",
};

function nm(id: CompanionId): string {
  return MATES[id]?.name ?? id;
}

function has(run: Pick<GauntletRun, "storyFlags">, flag: string): boolean {
  return Boolean(run.storyFlags?.includes(flag));
}

export function usesBanditStory(run: Pick<GauntletRun, "path" | "endless">): boolean {
  return run.path === "bandit" && !run.endless;
}

export function personHome(id: CompanionId): StoryPlaceId {
  return PERSON_HOME[id] ?? "liangshan";
}

export function storyPlaceForFought(fought: number, openingId?: CompanionId): StoryPlaceId {
  if (fought <= 1) return openingId ? personHome(openingId) : "liangshan";
  if (fought <= 3) return "jinan";
  if (fought <= 5) return "caozhou";
  if (fought <= 7) return "xuzhou";
  if (fought <= 9) return "yangzhou";
  return "end";
}

export function rollStorySchedule(_rng: () => number): StorySchedule {
  return { stallSlots: [], marketSlots: [] };
}

function pickFrom<T>(rng: () => number, bag: T[]): T {
  const i = Math.min(bag.length - 1, Math.floor(rng() * bag.length));
  return bag.splice(i, 1)[0]!;
}

export function dealStoryCast(rng: () => number): { castDraw: CompanionId[]; openingId: CompanionId } {
  const bag = [...STORY_CAST_POOL];
  const castDraw: CompanionId[] = [];
  for (let n = 0; n < CAST_DRAW && bag.length; n++) castDraw.push(pickFrom(rng, bag));
  const openingId = pickFrom(rng, [...castDraw]);
  return { castDraw, openingId };
}

export function storyOpeningLead(id: CompanionId): string {
  if (id === "lvchifeng") {
    return "梁山脚的刀铺门开着，刀架空了一格，吕赤锋站在砧前，刀上的血还没干到刀背。地上那个人侧躺着，胸口还在一起一伏。门外三个人堵着门，其中一个手里提着同样的刀鞘。";
  }
  if (id === "zhounuanxiang") {
    return "曹州城根的粥棚支着，周暖香用木勺给脚夫盛粥，勺沿一下一下磕在碗上。对街赌棚的人站在棚口，手里攥着几张工钱条子。脚夫的手腕还缠着布，布上的血渗出来了。";
  }
  if (id === "chenchenlan") {
    return "徐州码头的跳板上横着一根缆，陈沉缆蹲在缆边，钩子扣着缆结。甲板上扔着一把卸下来的刀，刀主站在船舷上，手里空着，船工在喊开船，缆还系在桩上。";
  }
  if (id === "ananhuo") {
    return "泰安河岸的渡口停着一条浅船，安岸火把枪横在船舷上，枪尖对着对岸。水已经没过跳板，对岸有人喊过河，手里提着一只封了口的布袋。";
  }
  if (id === "boqing") {
    return "兖州剑铺的砧还热着，薄青把一柄旧剑按在布上，刃口缺了一角。柜上摆着三把没开刃的胚，门外有人在问这柄剑还能不能押出去。";
  }
  if (id === "zhangshoushan") {
    return "山门闸的木杠横在路中间，章守山拄着棍站在杠后，门钱匣开着一条缝。门外排了三个人，手里各捏着一张路条，闸口过不去。";
  }
  if (id === "lishuangxing") {
    return "梁山后寨的账桌堆着刀鞘，厉霜行把一叠纸按在桌上，纸角沾着血。寨门关着，门外有人等着把这叠纸换成货。";
  }
  if (id === "ouyangyingou") {
    return "扬州夜航的船灯还亮着，欧阳饮钩把钩子扣在船舷上，缆泡在水里。舱里堆着两箱没拆封的货，岸上有人在喊开盅。";
  }
  if (id === "fubishan") {
    return "济南药铺的柜上摆着揭开的药包，傅壁山把布缠在一个伤者的肋上。对街赌棚的灯亮着，伤者的腰包还鼓着。";
  }
  if (id === "duguposui") {
    return "废院的砖缝里长着草，独孤破岁在院心练剑，剑风把草压平。墙根搁着一叠名帖，院门外有人停下来看剑尖。";
  }
  if (id === "gongsunsizhang") {
    return "官道长坡的土还干着，公孙四丈把枪杆拄在坡上，枪头对着来路。坡下有一摊收了的货，他看你一眼，枪没收回去。";
  }
  return "徐州闸口的木杠横在路中间，封堂把棍压在杠上，过闸的人把铜钱按在匣沿。后面又排上来两个人，路条在手里攥出了汗，闸口过不去。";
}

export function storyArriveLead(id: CompanionId): string {
  return storyOpeningLead(id);
}

export function storyFollowLead(id: CompanionId): string {
  if (id === "lvchifeng") return "刀铺的灯还亮着，吕赤锋把伤药按在腰上，门外那几个人已经走远。";
  if (id === "zhounuanxiang") return "粥棚收了摊，周暖香把布卷起来，脚夫的碗扣在桌上。";
  if (id === "chenchenlan") return "缆结还在桩上，陈沉缆收了钩，船工已经散开。";
  if (id === "fubishan") return "药包收起来，傅壁山洗了手，伤者的呼吸稳下来。";
  return `${nm(id)}还站在原地，手里的兵器没放下。`;
}

function activePerson(run: Pick<GauntletRun, "openingId" | "storyPending" | "castDraw" | "storyGuest">): CompanionId {
  return run.storyGuest ?? run.openingId ?? "lvchifeng";
}

function helpedPerson(run: Pick<GauntletRun, "storyFlags" | "openingId">): CompanionId | undefined {
  if (has(run, "lv-left")) return "lvchifeng";
  if (has(run, "zhou-wrap")) return "zhounuanxiang";
  if (has(run, "chen-rope")) return "chenchenlan";
  if (has(run, "fu-heal")) return "fubishan";
  return undefined;
}

function personClosed(run: Pick<GauntletRun, "storyFlags">, id: CompanionId): boolean {
  const flags = [
    `${id}-enough`,
    `${id}-joined`,
    `${id}-wager`,
    `${id}-left`,
  ];
  if (id === "lvchifeng") flags.push("lv-sold", "lv-gone");
  if (id === "zhounuanxiang") flags.push("zhou-left", "zhou-gamble");
  if (id === "chenchenlan") flags.push("chen-left", "chen-gamble");
  return flags.some((f) => has(run, f));
}

function regionOf(place: StoryPlaceId): string {
  if (place === "liangshan" || place === "liangshan-rear") return "liangshan";
  if (place === "xuzhou" || place === "xuzhou-gate") return "xuzhou";
  return place;
}

function currentPlace(
  run: Pick<GauntletRun, "storyPlace" | "openingId">,
): StoryPlaceId {
  return run.storyPlace ?? personHome(run.openingId ?? "lvchifeng");
}

function isOpenInDraw(
  run: Pick<GauntletRun, "seenStoryIds" | "storyFlags">,
  id: CompanionId,
): boolean {
  if (run.seenStoryIds?.includes(id)) return false;
  if (personClosed(run, id)) return false;
  return true;
}

function nextUnseenAt(
  run: Pick<GauntletRun, "castDraw" | "seenStoryIds" | "storyFlags" | "storyPlace" | "openingId">,
  place?: StoryPlaceId,
): CompanionId | undefined {
  const here = regionOf(place ?? currentPlace(run));
  return (run.castDraw ?? []).find((id) => isOpenInDraw(run, id) && regionOf(personHome(id)) === here);
}

function nextUnseenElsewhere(
  run: Pick<GauntletRun, "castDraw" | "seenStoryIds" | "storyFlags" | "storyPlace" | "openingId">,
  skip?: CompanionId,
): CompanionId | undefined {
  const here = regionOf(currentPlace(run));
  return (run.castDraw ?? []).find((id) => {
    if (id === skip) return false;
    if (!isOpenInDraw(run, id)) return false;
    return regionOf(personHome(id)) !== here;
  });
}

function travelDest(choice: EncounterChoice): StoryPlaceId | "elsewhere" | undefined {
  if (choice.id === "story-lv-jinan") return "jinan";
  if (choice.id === "story-zhou-taian") return "taian";
  if (
    choice.id === "story-du-leave" ||
    choice.id === "story-gs-walk" ||
    choice.id === "story-li-turn" ||
    choice.id === "story-chen-cut"
  ) {
    return "elsewhere";
  }
  return undefined;
}

function partyCount(run: Pick<GauntletRun, "companions" | "companion">): number {
  if (run.companions?.length) return run.companions.length;
  return run.companion ? 1 : 0;
}

function partyFull(run: Pick<GauntletRun, "companions" | "companion">): boolean {
  return partyCount(run) >= 2;
}

function canOfferWager(run: GauntletRun, flag: string): boolean {
  if ((run.gambleCount ?? 0) >= GAMBLE_CAP) return false;
  return !has(run, flag);
}

function wagerChoice(id: string, title: string, blurb: string, flag: string): EncounterChoice {
  return {
    id,
    title,
    blurb,
    risk: "rich",
    openWager: true,
    storyFlag: flag,
  };
}

function firstChoices(id: CompanionId, run: GauntletRun): EncounterChoice[] {
  if (id === "lvchifeng") {
    return [
      {
        id: "story-lv-medicine",
        title: "把伤药留下",
        blurb: "药瓶搁在砧上，门外那几个人还在。**下一程多 1 人。**",
        risk: "danger",
        extraWaves: 1,
        storyFlag: "lv-left",
      },
      {
        id: "story-lv-sell",
        title: "把他交出去",
        blurb: "刀鞘对上刀鞘，人从门里被拖走。**下一程多 1 人，伤害 ×1.1。他不再出现。**",
        risk: "danger",
        extraWaves: 1,
        dmgCoefMul: 1.1,
        storyFlag: "lv-sold",
      },
      {
        id: "story-lv-jinan",
        title: "自己往济南走",
        blurb: "刀铺的门在身后合上，梁山这段到此。**换城。下场照旧。**",
        risk: "safe",
        storyFlag: "lv-gone",
      },
    ];
  }
  if (id === "zhounuanxiang") {
    const rows: EncounterChoice[] = [
      {
        id: "story-zhou-wrap",
        title: "坐下让她裹伤",
        blurb: "布从腕上绕到掌心，粥还热着。**下一程照旧，不加人。**",
        risk: "safe",
        storyFlag: "zhou-wrap",
      },
      {
        id: "story-zhou-taian",
        title: "连夜去泰安",
        blurb: "粥棚的灯灭了，曹州这段到此。**换城。下场照旧。**",
        risk: "safe",
        storyFlag: "zhou-left",
      },
    ];
    if (canOfferWager(run, "zhou-gamble")) {
      rows.splice(1, 0, wagerChoice("story-zhou-gamble", "拿她的筹进赌馆", "她把筹收回去，木勺扣在碗上。这局她不会再给你裹伤。**进赌馆。单注最高当前彩金 80%。**", "zhou-gamble"));
    }
    return rows;
  }
  if (id === "chenchenlan") {
    const rows: EncounterChoice[] = [
      {
        id: "story-chen-rope",
        title: "帮他把缆拉紧",
        blurb: "钩子扣死缆结，船上的人退了半步。**下一程多 1 人。**",
        risk: "danger",
        extraWaves: 1,
        storyFlag: "chen-rope",
      },
      {
        id: "story-chen-cut",
        title: "砍断缆离开",
        blurb: "缆落进水里，码头这段到此。**这一摊黑市关着。**",
        risk: "rich",
        skipMarket: true,
        storyFlag: "chen-left",
      },
    ];
    if (canOfferWager(run, "chen-gamble")) {
      rows.splice(1, 0, wagerChoice("story-chen-gamble", "拿船上的货去赌馆", "货记在他账上。缆结没松，他看了一眼你的腰包。**进赌馆。单注最高当前彩金 80%。**", "chen-gamble"));
    }
    return rows;
  }
  if (id === "ananhuo") {
    return [
      {
        id: "story-an-hold",
        title: "帮他守住距离",
        blurb: "枪尖对着对岸。船没靠岸。**下场照旧。**",
        risk: "safe",
        storyFlag: "an-hold",
      },
      {
        id: "story-an-market",
        title: "过河进黑市",
        blurb: "布袋沉在船板上。对岸灯从帘缝里漏出来。**去黑市。外功、淬刃这一摊开。**",
        risk: "rich",
        openMarket: true,
        storyFlag: "an-market",
      },
      {
        id: "story-an-shoo",
        title: "把人支走",
        blurb: "对岸的人退了。布袋还在船上。**下一程多 1 人。**",
        risk: "danger",
        extraWaves: 1,
        storyFlag: "an-shoo",
      },
    ];
  }
  if (id === "boqing") {
    const rows: EncounterChoice[] = [
      {
        id: "story-bo-try",
        title: "让他试刃",
        blurb: "缺角的刃在布上响了一声。**下场照旧。**",
        risk: "safe",
        storyFlag: "bo-try",
      },
      {
        id: "story-bo-pawn",
        title: "把旧剑当进当铺",
        blurb: "剑按在柜上。掌柜报了价。**袋里 +12。**",
        risk: "rich",
        potDelta: 12,
        storyFlag: "bo-pawn",
      },
    ];
    if (canOfferWager(run, "boqing-wager")) {
      rows.push(wagerChoice("story-bo-wager", "把剑押进赌馆", "刃口缺着。庄家按成色收了。**进赌馆。单注最高当前彩金 80%。**", "boqing-wager"));
    }
    return rows;
  }
  if (id === "zhangshoushan") {
    const rows: EncounterChoice[] = [
      {
        id: "story-zh-gate",
        title: "帮他守闸",
        blurb: "木杠还横着。路条一张张过。**下场照旧。**",
        risk: "safe",
        storyFlag: "zh-gate",
      },
      {
        id: "story-zh-skip",
        title: "绕开山门",
        blurb: "从闸侧的泥路过去。门钱匣没动。**这一摊黑市关着。**",
        risk: "rich",
        skipMarket: true,
        storyFlag: "zhangshoushan-left",
      },
    ];
    if (canOfferWager(run, "zhangshoushan-wager")) {
      rows.push(wagerChoice("story-zh-wager", "门钱改押赌馆", "匣里的钱改了去向。章守山看了你一眼。**进赌馆。单注最高当前彩金 80%。**", "zhangshoushan-wager"));
    }
    return rows;
  }
  if (id === "lishuangxing") {
    return [
      {
        id: "story-li-cut",
        title: "跟他把账砍完",
        blurb: "纸角的血还没干。刀鞘对上刀鞘。**下一程多 1 人。**",
        risk: "danger",
        extraWaves: 1,
        storyFlag: "li-cut",
      },
      {
        id: "story-li-turn",
        title: "掉头离开",
        blurb: "后寨的门在身后合上。**换城。下场照旧。**",
        risk: "safe",
        storyFlag: "lishuangxing-left",
      },
      {
        id: "story-li-market",
        title: "跟他去黑市销赃",
        blurb: "纸换成货。帘缝里灯还亮。**去黑市。外功、淬刃这一摊开。**",
        risk: "rich",
        openMarket: true,
        storyFlag: "li-market",
      },
    ];
  }
  if (id === "ouyangyingou") {
    const rows: EncounterChoice[] = [
      {
        id: "story-ou-line",
        title: "帮他收线",
        blurb: "钩子扣死缆。船灯还亮。**下场照旧。**",
        risk: "safe",
        storyFlag: "ou-line",
      },
      {
        id: "story-ou-market",
        title: "货下黑市",
        blurb: "两箱货抬上岸。帘子掀开一条缝。**去黑市。外功、淬刃这一摊开。**",
        risk: "rich",
        openMarket: true,
        storyFlag: "ou-market",
      },
    ];
    if (canOfferWager(run, "ouyangyingou-wager")) {
      rows.push(wagerChoice("story-ou-wager", "上船开盅", "岸上的人把骰盅扣在舱板上。**进赌馆。单注最高当前彩金 80%。**", "ouyangyingou-wager"));
    }
    return rows;
  }
  if (id === "fubishan") {
    const rows: EncounterChoice[] = [
      {
        id: "story-fu-heal",
        title: "让他扶伤",
        blurb: "药包按在肋上。布缠紧了。**下一程照旧，不加人。**",
        risk: "safe",
        storyFlag: "fu-heal",
      },
      {
        id: "story-fu-buy",
        title: "买药",
        blurb: "柜上的药包换了手。**袋里 −10。下一摊免费奖励多抽 1。**",
        risk: "rich",
        potDelta: -10,
        rewardBonus: 1,
        storyFlag: "fu-buy",
      },
    ];
    if (canOfferWager(run, "fubishan-wager")) {
      rows.push(wagerChoice("story-fu-wager", "对街进赌馆", "他不拦。对街赌棚的灯亮着。**进赌馆。单注最高当前彩金 80%。**", "fubishan-wager"));
    }
    return rows;
  }
  if (id === "duguposui") {
    return [
      {
        id: "story-du-watch",
        title: "看他练剑",
        blurb: "剑风把草压平。名帖还在墙根。**下场照旧。**",
        risk: "safe",
        storyFlag: "du-watch",
      },
      {
        id: "story-du-intel",
        title: "名帖换下两程人名",
        blurb: "帖上的字还湿着。**花 0 彩金，换下两馆人名。**",
        risk: "rich",
        intel: true,
        storyFlag: "du-intel",
      },
      {
        id: "story-du-leave",
        title: "离开，去下一座城",
        blurb: "废院的门在身后合上。**换城。下场照旧。**",
        risk: "safe",
        storyFlag: "duguposui-left",
      },
    ];
  }
  if (id === "gongsunsizhang") {
    return [
      {
        id: "story-gs-duel",
        title: "跟他打一架",
        blurb: "枪杆还拄在坡上。馆号不往上走。**短打，不占程号，禁注。**",
        risk: "danger",
        sideSkirmish: true,
        storyFlag: "gs-duel",
      },
      {
        id: "story-gs-market",
        title: "枪当进黑市",
        blurb: "枪杆换了手。帘缝里灯还亮。**去黑市。外功、淬刃这一摊开。**",
        risk: "rich",
        openMarket: true,
        storyFlag: "gs-market",
      },
      {
        id: "story-gs-walk",
        title: "自己走",
        blurb: "长坡还在脚下。枪没收回去。**换城。下场照旧。**",
        risk: "safe",
        storyFlag: "gongsunsizhang-left",
      },
    ];
  }
  const rows: EncounterChoice[] = [
    {
      id: "story-ft-ask",
      title: "求他让路",
      blurb: "棍抬起一寸。过闸的人还在排队。**下场照旧。**",
      risk: "safe",
      storyFlag: "ft-ask",
    },
    {
      id: "story-ft-rush",
      title: "硬闯闸口",
      blurb: "杠响了一声。后面的人跟上来。**下一程多 1 人。**",
      risk: "danger",
      extraWaves: 1,
      storyFlag: "ft-rush",
    },
  ];
  if (canOfferWager(run, "fengtang-wager")) {
    rows.push(wagerChoice("story-ft-wager", "买路钱改押赌馆", "匣沿上的钱改了去向。**进赌馆。单注最高当前彩金 80%。**", "fengtang-wager"));
  }
  return rows;
}

function followChoices(id: CompanionId, run: GauntletRun): EncounterChoice[] {
  if (has(run, "zhou-gamble") && id === "zhounuanxiang") return [];
  if (has(run, "chen-gamble") && id === "chenchenlan") return [];
  if (has(run, "lv-sold") && id === "lvchifeng") return [];
  const joinTitle = id === "chenchenlan" ? "让他上船" : "让他同行";
  const leaveTitle = id === "chenchenlan" ? "船先开" : "到此为止";
  const rows: EncounterChoice[] = [
    {
      id: `story-${id}-enough`,
      title: leaveTitle,
      blurb: `${nm(id)}点了点头。这段到此。**下场照旧。**`,
      risk: "safe",
      storyFlag: `${id}-enough`,
    },
  ];
  if (!partyFull(run)) {
    rows.unshift({
      id: `story-${id}-join`,
      title: joinTitle,
      blurb: `${nm(id)}收了兵器，跟在你侧后。**当场入伙。**`,
      risk: "safe",
      companionId: id,
      storyFlag: `${id}-joined`,
    });
  }
  return rows;
}

export function rollStoryChoices(run: GauntletRun): EncounterChoice[] {
  const pending = run.storyPending;
  if (!pending || pending === "opening" || pending === "travel" || pending === "rest") return [];
  if (pending === "stall" || pending === "market" || pending === "ambush") return [];
  if (pending === "followup") {
    const who = helpedPerson(run);
    if (!who) return [];
    return followChoices(who, run);
  }
  return firstChoices(activePerson(run), run);
}

export function storyEventLead(run: GauntletRun): string {
  if (run.storyPending === "followup") {
    const who = helpedPerson(run);
    return who ? storyFollowLead(who) : "";
  }
  if (run.storyPending === "choice" || run.storyPending === "opening") {
    return storyArriveLead(activePerson(run));
  }
  return "";
}

export function storyTravelText(run: Pick<GauntletRun, "storyFlags" | "openingId" | "storyPlace" | "stage">): string {
  const place = run.storyPlace ?? storyPlaceForFought(Math.max(1, (run.stage ?? 1) - 1), run.openingId);
  if (place === "jinan") return "土路还湿着，济南的城墙在前头，你把刀收回鞘里往城门走。";
  if (place === "caozhou") return "官道转了弯，曹州城根亮着一排灯，粥棚的烟从巷口飘出来。";
  if (place === "xuzhou" || place === "xuzhou-gate") return "河岸的灯亮起来，徐州闸口在前头，你沿着土路走过去。";
  if (place === "yangzhou") return "桥上的灯还亮着，扬州的水拍着船舷，你踩着石板往前。";
  if (place === "taian") return "进山的路还干着，泰安河岸的渡口在雾里，你把刀收回鞘里。";
  if (place === "yanzhou") return "兖州城关的辙印断了，剑铺的烟从巷口飘出来，你踩着土路往前。";
  if (has(run, "lv-gone") || has(run, "lv-sold")) return "梁山脚的路断了辙，往济南的方向土还湿着，你把刀收回鞘里往前走。";
  return "这一段路没有新的人拦你，下一程直接开打。";
}

function extraFlagsFor(choice: EncounterChoice): string[] {
  const out: string[] = [];
  if (choice.stall || choice.openWager) out.push("gamble-used");
  if (
    choice.storyFlag === "lv-sold" ||
    choice.storyFlag === "lv-gone" ||
    choice.storyFlag === "zhou-left" ||
    choice.storyFlag === "chen-left" ||
    choice.storyFlag?.endsWith("-left")
  ) {
    out.push("story-solo");
  }
  return out;
}

function nextPendingAfterChoice(_run: GauntletRun, choice: EncounterChoice): StoryPending {
  const id = choice.id;
  if (id === "story-lv-medicine" || id === "story-zhou-wrap" || id === "story-chen-rope" || id === "story-fu-heal") {
    return "followup";
  }
  return "rest";
}

export function applyStoryChoice(run: GauntletRun, choice: EncounterChoice, rng: () => number = Math.random): GauntletRun {
  let next = applyEncounterChoice(run, choice, rng);
  const extra = extraFlagsFor(choice);
  const flags = [...(next.storyFlags ?? [])];
  for (const f of extra) if (!flags.includes(f)) flags.push(f);
  if (flags.includes("story-solo") && partyCount(next) === 0 && !flags.includes("story-solo-bonus")) {
    flags.push("story-solo-bonus");
    next = { ...next, pendingRewardBonus: (next.pendingRewardBonus ?? 0) + 1 };
  }
  const gambleCount = (run.gambleCount ?? 0) + (choice.stall || choice.openWager ? 1 : 0);
  const seen = [...(next.seenStoryIds ?? run.seenStoryIds ?? [])];
  const who = activePerson(run);
  if ((run.storyPending === "choice" || run.storyPending === "followup") && who && !seen.includes(who)) seen.push(who);
  const dest = travelDest(choice);
  let storyPlace = next.storyPlace ?? run.storyPlace ?? personHome(run.openingId ?? "lvchifeng");
  if (dest === "elsewhere") {
    const nxt = nextUnseenElsewhere(run, who);
    if (nxt) storyPlace = personHome(nxt);
  } else if (dest) {
    storyPlace = dest;
  }
  return {
    ...next,
    storyFlags: flags,
    storyPending: nextPendingAfterChoice(next, choice),
    skipCompanionPick: true,
    gambleCount,
    seenStoryIds: seen,
    storyPlace,
  };
}

export function dismissStoryOpening(run: GauntletRun): GauntletRun {
  const seen = [...(run.seenStoryIds ?? [])];
  if (run.openingId && !seen.includes(run.openingId)) seen.push(run.openingId);
  return {
    ...run,
    storyPending: "choice",
    seenStoryIds: seen,
    storyGuest: run.openingId,
    storyPlace: personHome(run.openingId ?? "lvchifeng"),
  };
}

export function continueStoryTravel(run: GauntletRun): GauntletRun {
  return { ...run, storyPending: "rest", storyGuest: undefined };
}

export function pickPostCampBeat(
  run: Pick<GauntletRun, "storyPending" | "storySchedule" | "gambleCount" | "castDraw" | "seenStoryIds" | "storyFlags" | "openingId" | "storyPlace">,
  _fought: number,
  rng: () => number = Math.random,
): PostCampBeat {
  if (run.storyPending === "followup" || run.storyPending === "choice") return "story";
  if (nextUnseenAt(run)) return "story";
  const roll = rng();
  if (roll < 0.35) return "ambush";
  return "rest";
}

export function applyPostCampBeat(run: GauntletRun, beat: PostCampBeat, fought: number): GauntletRun {
  const here = run.storyPlace ?? storyPlaceForFought(fought, run.openingId);
  if (beat === "story") {
    if (run.storyPending === "followup") return { ...run, storyPlace: here };
    const guest = nextUnseenAt(run);
    if (!guest) return { ...run, storyPending: "rest", storyPlace: here };
    const seen = [...(run.seenStoryIds ?? [])];
    if (!seen.includes(guest)) seen.push(guest);
    return {
      ...run,
      storyPending: "choice",
      storyGuest: guest,
      storyPlace: personHome(guest),
      seenStoryIds: seen,
    };
  }
  if (beat === "stall") return { ...run, storyPending: "stall", storyPlace: here };
  if (beat === "market") return { ...run, storyPending: "market", storyPlace: here };
  if (beat === "ambush") return { ...run, storyPending: "ambush", storyPlace: here };
  if (beat === "travel") return { ...run, storyPending: "travel", storyPlace: here };
  return { ...run, storyPending: "rest", storyPlace: here };
}

export function queuePostCampBeat(run: GauntletRun, fought: number, rng: () => number = Math.random): GauntletRun {
  const pending = run.storyPending;
  if (
    pending === "choice" ||
    pending === "followup" ||
    pending === "opening" ||
    pending === "stall" ||
    pending === "market" ||
    pending === "ambush" ||
    pending === "travel"
  ) {
    return { ...run, storyPlace: run.storyPlace ?? storyPlaceForFought(fought, run.openingId) };
  }
  return applyPostCampBeat(run, pickPostCampBeat(run, fought, rng), fought);
}

export function storyBeatTitle(run: GauntletRun): string {
  if (run.storyPending === "travel") return "赶路";
  if (run.storyPending === "followup") return "事后";
  if (run.storyPending === "stall") return "赌馆";
  if (run.storyPending === "market") return "黑市";
  if (run.storyPending === "ambush") return "剪径";
  const id = activePerson(run);
  return PERSON_TITLE[id] ?? "路上";
}
