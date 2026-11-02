import { MATES } from "../game/party";
import type { CompanionId } from "../game/types";
import type { EncounterChoice } from "./encounter";
import { applyEncounterChoice } from "./encounter";
import type { GauntletRun } from "./gauntlet";
import { ENV_TAG_LABEL, type EnvTag } from "./gauntletPaths";

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
    return "梁山脚的刀铺门开着，刀架空了一格，吕赤锋站在砧前，刀上的血还没干到刀背。地上那个人侧躺着，胸口还在一起一伏，血从肋下渗进泥里。门外三个人堵着门，其中一个手里提着同样的刀鞘，鞘口对着铺里。砧上压着药瓶，瓶塞松了半寸，药味混着铁锈飘到门槛。铺里的风从门缝进来，把地上的血吹出一条细印，印子指向门外。你站在门槛上，刀还在鞘里，门外的人已经把路堵住。";
  }
  if (id === "zhounuanxiang") {
    return "曹州城根的粥棚支着，周暖香用木勺给脚夫盛粥，勺沿一下一下磕在碗上。对街赌棚的人站在棚口，手里攥着几张工钱条子，条子边角被捏湿了。脚夫的手腕还缠着布，布上的血渗出来了，血滴在粥棚的地上。粥还冒着热气，碗沿烫手，脚夫用另一边的手扶着桌沿。赌棚里有人敲了一下骰盅，声音传过街，粥棚里的人都抬了头。你在棚外停下，工钱条子还在赌棚那人手里，粥勺停在半空。";
  }
  if (id === "chenchenlan") {
    return "徐州码头的跳板上横着一根缆，陈沉缆蹲在缆边，钩子扣着缆结。甲板上扔着一把卸下来的刀，刀主站在船舷上，手里空着，眼睛盯着缆结。船工在喊开船，缆还系在桩上，桩上的绳磨出了白印。跳板随着水晃，你踩上去的时候板响了一声，陈沉缆的钩子仍扣着结。岸上堆着两捆货，货上的封条还新，封条角被风掀起来。船要开，人还在缆边上，刀躺在甲板上没人去捡。";
  }
  if (id === "ananhuo") {
    return "泰安河岸的渡口停着一条浅船，安岸火把枪横在船舷上，枪尖对着对岸。水已经没过跳板，对岸有人喊过河，手里提着封了口的布袋。渡口的缆松着，浅船随着水往岸上撞了一下。岸边蹲着两个人，鞋上全是泥，谁也没先开口上船。你走到跳板尽头，枪尖还指着对岸的布袋。雾贴着河面，对岸的人把布袋举高了一寸。";
  }
  if (id === "boqing") {
    return "兖州剑铺的砧还热着，薄青把一柄旧剑按在布上，刃口缺了一角。柜上摆着三把没开刃的胚，胚上还留着锤印，锤印里嵌着铁屑。门外有人在问这柄剑还能不能押出去，问了第二遍，薄青仍按着剑。布上的剑映着铺里的火，缺角那一截发暗，暗处看不清刃口。你进门时踩到铁屑，铁屑粘在靴底，薄青抬头看了一眼你的刀。问价的人把钱袋放在柜沿，钱袋没打开，剑还在布上。";
  }
  if (id === "zhangshoushan") {
    return "山门闸的木杠横在路中间，章守山拄着棍站在杠后，门钱匣开着一条缝。门外排了三个人，手里各捏着一张路条，路条被汗浸软了。闸口过不去，木杠上有新的棍痕，痕里还留着泥。匣里的钱露出一角，章守山用棍压着匣盖，匣盖开合不了。排队的人往前挪了半步，又停住，眼睛看着杠后的棍。你走到队尾，路条在前头的人手里抖，山门里有钟声传出来。";
  }
  if (id === "lishuangxing") {
    return "梁山后寨的账桌堆着刀鞘，厉霜行把一叠纸按在桌上，纸角沾着血。寨门关着，门外有人等着把这叠纸换成货，货箱就搁在门槛外。纸上的字被血粘住两行，厉霜行的手指压在那两行上，指节发白。桌边还放着空刀鞘，鞘里没有刀，刀在他腰上。门外的人敲了一下寨门，门闩响了一声，纸角的血又洇开一点。你站在门缝外，看见纸、刀鞘和血，纸还按在他掌下。";
  }
  if (id === "ouyangyingou") {
    return "扬州夜航的船灯还亮着，欧阳饮钩把钩子扣在船舷上，缆泡在水里。舱里堆着两箱没拆封的货，封条上的墨还湿，湿墨蹭到箱角。岸上有人在喊开盅，骰盅扣在船板上，盅沿压着一张筹码。船身轻轻碰着码头，碰一下，舱里的箱子跟着响一下。欧阳饮钩的钩子没离船舷，人蹲在灯下，脸被灯照着半边。你踏上跳板，岸上喊开盅的人又喊了一声，箱子还堆在舱里。";
  }
  if (id === "fubishan") {
    return "济南药铺的柜上摆着揭开的药包，傅壁山把布缠在一个伤者的肋上。对街赌棚的灯亮着，伤者的腰包还鼓着，腰包带上有干了的血。药味从柜后涌出来，布条一圈圈勒紧，伤者吸气的时候肋下的布跟着动。柜上还剩两包没揭开的药，纸绳打着死结，傅壁山腾不出手。赌棚有人朝药铺这边看，看了一眼灯，又把目光收回骰盅。你停在药铺门口，伤者的眼睛睁着，傅壁山的手还按在布结上。";
  }
  if (id === "duguposui") {
    return "废院的砖缝里长着草，独孤破岁在院心练剑，剑风把草压平。墙根搁着一叠名帖，帖角被风掀起，院门外有人停下来看剑尖。剑每落一次，草就伏下一圈，圈边的土被剑风吹开。名帖上的字还湿着，湿字映着天光，门外的人伸长了脖子。院墙缺了一截砖，砖掉在草里，独孤破岁的步子避开那截砖。你进院时剑尖正对着门，名帖还在墙根，草上的圈还没合拢。";
  }
  if (id === "gongsunsizhang") {
    return "官道长坡的土还干着，公孙四丈把枪杆拄在坡上，枪头对着来路。坡下有一摊收了的货，货上盖着席，席角被风掀开一掌宽。他看你一眼，枪没收回去，枪头仍对着你来的那条路。坡上的辙印到他脚下就断了，断口的土是新的，新土里有靴印。收货的人蹲在席边数箱，数到一半停住，眼睛跟着枪头转。你停在坡下，货摊在你和枪之间，公孙四丈的手还握着枪杆。";
  }
  return "徐州闸口的木杠横在路中间，封堂把棍压在杠上，过闸的人把铜钱按在匣沿。后面又排上来两个人，路条在手里攥出了汗，汗把路条的字洇开了。闸口过不去，木杠上有新的压痕，压痕里嵌着泥。匣里的钱堆到匣沿，封堂的棍尖抵着钱，钱还在匣里。排队的人把肩上的包换到另一边，包带勒出一道印。你站在队尾，看见杠、棍和匣沿上的铜钱，封堂的眼睛看着下一条路条。";
}

export function storyArriveLead(id: CompanionId): string {
  return storyOpeningLead(id);
}

export function storyFollowLead(id: CompanionId): string {
  if (id === "lvchifeng") {
    return "刀铺的灯还亮着，吕赤锋把伤药按在腰上，药渍透出一层深色。门外那几个人已经走远，门槛上还留着他们的靴印。地上那个人的胸口仍在起伏，起伏比刚才慢。砧上的药瓶空了，瓶口朝下。血印被灯照着，从砧脚连到门槛。吕赤锋看着你，手按在腰上的药布，刀还插在鞘里。";
  }
  if (id === "zhounuanxiang") {
    return "粥棚收了摊，周暖香把布卷起来，布上的血已经干了一半。脚夫的碗扣在桌上，碗底还烫。对街赌棚的灯没灭，工钱条子不见了。粥勺搁在空锅沿上，锅里剩一层米粒。脚夫坐在凳上，手腕的布重新绕紧。周暖香看着你，布卷夹在肘弯里，棚外的路还亮着。";
  }
  if (id === "chenchenlan") {
    return "缆结还在桩上，陈沉缆收了钩，钩尖还带着水。船工已经散开，甲板上的刀有人捡起来，刀主站回船舷。跳板不再晃得那么厉害，货上的封条还在。岸上的喊声停了，船还没离桩。陈沉缆蹲在原处，手掌上有绳印。你站在跳板上，桩、缆、刀都还在原来的位置。";
  }
  if (id === "fubishan") {
    return "药包收起来，傅壁山洗了手，伤者的呼吸稳下来。肋上的布结还在，布上渗出一小块深色。对街赌棚的灯仍亮着，骰盅的声音隔街传过来。柜上揭开的药包少了一包，纸绳堆在柜角。伤者靠着柜，腰包还鼓着。傅壁山擦干手，看着你，药铺门口的风把药味往街上送。";
  }
  return `${nm(id)}还站在原地，手里的兵器没放下。脚边的土是新踩乱的，乱印里有你的靴印。旁边的人还在，手里的东西没换过手。灯还是刚才那一盏，光落在兵器和地上。你停在他身侧，这段事摊在你们中间。风从巷口过来，把刚才的声音带走了一点。`;
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
        blurb: "药瓶搁在砧上，门外那几个人还堵着门。**下一程多 1 人。**",
        risk: "danger",
        extraWaves: 1,
        storyFlag: "lv-left",
      },
      {
        id: "story-lv-sell",
        title: "把他交出去",
        blurb: "刀鞘对上刀鞘，人从门里被拖走，铺里空出砧前那一块。**下一程多 1 人，伤害 ×1.1。他不再出现。**",
        risk: "danger",
        extraWaves: 1,
        dmgCoefMul: 1.1,
        storyFlag: "lv-sold",
      },
      {
        id: "story-lv-jinan",
        title: "自己往济南走",
        blurb: "刀铺的门在身后合上，梁山这段到此，土路通向济南。**换城，下场照旧，伤 ?。**",
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
        blurb: "布从腕上绕到掌心，粥还热着，她仍站在棚里。**下一程照旧，不加人。**",
        risk: "safe",
        storyFlag: "zhou-wrap",
      },
      {
        id: "story-zhou-taian",
        title: "连夜去泰安",
        blurb: "粥棚的灯灭了，曹州这段到此，夜路通向泰安。**换城，下场照旧，伤 ?。**",
        risk: "safe",
        storyFlag: "zhou-left",
      },
    ];
    if (canOfferWager(run, "zhou-gamble")) {
      rows.splice(1, 0, wagerChoice("story-zhou-gamble", "拿她的筹进赌馆", "她把筹收回去，木勺扣在碗上，这局她不会再给你裹伤。**进赌馆。单注最高当前彩金 80%。**", "zhou-gamble"));
    }
    return rows;
  }
  if (id === "chenchenlan") {
    const rows: EncounterChoice[] = [
      {
        id: "story-chen-rope",
        title: "帮他把缆拉紧",
        blurb: "钩子扣死缆结，船上的人退了半步，缆仍系在桩上。**下一程多 1 人。**",
        risk: "danger",
        extraWaves: 1,
        storyFlag: "chen-rope",
      },
      {
        id: "story-chen-cut",
        title: "砍断缆离开",
        blurb: "缆落进水里，码头这段到此，岸上的灯还亮着一盏。**这一摊黑市关着，下场照旧，伤 ?。**",
        risk: "rich",
        skipMarket: true,
        storyFlag: "chen-left",
      },
    ];
    if (canOfferWager(run, "chen-gamble")) {
      rows.splice(1, 0, wagerChoice("story-chen-gamble", "拿船上的货去赌馆", "货记在他账上，缆结没松，他看了一眼你的腰包。**进赌馆。单注最高当前彩金 80%。**", "chen-gamble"));
    }
    return rows;
  }
  if (id === "ananhuo") {
    return [
      {
        id: "story-an-hold",
        title: "帮他守住距离",
        blurb: "枪尖对着对岸，船没靠岸，布袋仍在对岸那人手里。**下场照旧。**",
        risk: "safe",
        storyFlag: "an-hold",
      },
      {
        id: "story-an-market",
        title: "过河进黑市",
        blurb: "布袋沉在船板上，对岸灯从帘缝里漏出来。**去黑市。外功、淬刃这一摊开。**",
        risk: "rich",
        openMarket: true,
        storyFlag: "an-market",
      },
      {
        id: "story-an-shoo",
        title: "把人支走",
        blurb: "对岸的人退了，布袋还在船上，岸边留下两行新靴印。**下一程多 1 人。**",
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
        blurb: "缺角的刃在布上响了一声，薄青仍按着剑。**下场照旧。**",
        risk: "safe",
        storyFlag: "bo-try",
      },
      {
        id: "story-bo-pawn",
        title: "把旧剑当进当铺",
        blurb: "剑按在柜上，掌柜报了价，钱袋在柜沿上。**袋里 +12。**",
        risk: "rich",
        potDelta: 12,
        storyFlag: "bo-pawn",
      },
    ];
    if (canOfferWager(run, "boqing-wager")) {
      rows.push(wagerChoice("story-bo-wager", "把剑押进赌馆", "刃口缺着，庄家按成色把剑收进去。**进赌馆。单注最高当前彩金 80%。**", "boqing-wager"));
    }
    return rows;
  }
  if (id === "zhangshoushan") {
    const rows: EncounterChoice[] = [
      {
        id: "story-zh-gate",
        title: "帮他守闸",
        blurb: "木杠还横着，路条一张张从杠下递过去。**下场照旧。**",
        risk: "safe",
        storyFlag: "zh-gate",
      },
      {
        id: "story-zh-skip",
        title: "绕开山门",
        blurb: "从闸侧的泥路过去，门钱匣没动，匣盖仍压着。**这一摊黑市关着，下场照旧，伤 ?。**",
        risk: "rich",
        skipMarket: true,
        storyFlag: "zhangshoushan-left",
      },
    ];
    if (canOfferWager(run, "zhangshoushan-wager")) {
      rows.push(wagerChoice("story-zh-wager", "门钱改押赌馆", "匣里的钱改了去向，章守山看了你一眼。**进赌馆。单注最高当前彩金 80%。**", "zhangshoushan-wager"));
    }
    return rows;
  }
  if (id === "lishuangxing") {
    return [
      {
        id: "story-li-cut",
        title: "跟他把账砍完",
        blurb: "纸角的血还没干，刀鞘对上刀鞘，门外的人还在。**下一程多 1 人。**",
        risk: "danger",
        extraWaves: 1,
        storyFlag: "li-cut",
      },
      {
        id: "story-li-turn",
        title: "掉头离开",
        blurb: "后寨的门在身后合上，纸还留在桌上。**换城，下场照旧，伤 ?。**",
        risk: "safe",
        storyFlag: "lishuangxing-left",
      },
      {
        id: "story-li-market",
        title: "跟他去黑市销赃",
        blurb: "纸换成货，帘缝里灯还亮，货箱抬到门槛外。**去黑市。外功、淬刃这一摊开。**",
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
        blurb: "钩子扣死缆，船灯还亮，箱子仍在舱里。**下场照旧。**",
        risk: "safe",
        storyFlag: "ou-line",
      },
      {
        id: "story-ou-market",
        title: "货下黑市",
        blurb: "两箱货抬上岸，帘子掀开一条缝，灯从缝里漏出来。**去黑市。外功、淬刃这一摊开。**",
        risk: "rich",
        openMarket: true,
        storyFlag: "ou-market",
      },
    ];
    if (canOfferWager(run, "ouyangyingou-wager")) {
      rows.push(wagerChoice("story-ou-wager", "上船开盅", "岸上的人把骰盅扣在舱板上，筹码压在盅沿。**进赌馆。单注最高当前彩金 80%。**", "ouyangyingou-wager"));
    }
    return rows;
  }
  if (id === "fubishan") {
    const rows: EncounterChoice[] = [
      {
        id: "story-fu-heal",
        title: "让他扶伤",
        blurb: "药包按在肋上，布缠紧了，伤者的呼吸还在。**下一程照旧，不加人。**",
        risk: "safe",
        storyFlag: "fu-heal",
      },
      {
        id: "story-fu-buy",
        title: "买药",
        blurb: "柜上的药包换了手，纸绳落在柜角。**袋里 −10。下一摊免费奖励多抽 1。**",
        risk: "rich",
        potDelta: -10,
        rewardBonus: 1,
        storyFlag: "fu-buy",
      },
    ];
    if (canOfferWager(run, "fubishan-wager")) {
      rows.push(wagerChoice("story-fu-wager", "对街进赌馆", "他侧过身让出门口，对街赌棚的灯亮着。**进赌馆。单注最高当前彩金 80%。**", "fubishan-wager"));
    }
    return rows;
  }
  if (id === "duguposui") {
    return [
      {
        id: "story-du-watch",
        title: "看他练剑",
        blurb: "剑风把草压平，名帖还在墙根，剑尖对着院门。**下场照旧。**",
        risk: "safe",
        storyFlag: "du-watch",
      },
      {
        id: "story-du-intel",
        title: "名帖换下两程人名",
        blurb: "帖上的字还湿着，他按着帖角让你看清名字。**花 0 彩金，换下两馆人名。**",
        risk: "rich",
        intel: true,
        storyFlag: "du-intel",
      },
      {
        id: "story-du-leave",
        title: "离开，去下一座城",
        blurb: "废院的门在身后合上，草上的圈还在。**换城，下场照旧，伤 ?。**",
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
        blurb: "枪杆还拄在坡上，这一架不往上占馆号。**短打，不占程号，禁注。**",
        risk: "danger",
        sideSkirmish: true,
        storyFlag: "gs-duel",
      },
      {
        id: "story-gs-market",
        title: "枪当进黑市",
        blurb: "枪杆换了手，帘缝里灯还亮，席下的货露了一角。**去黑市。外功、淬刃这一摊开。**",
        risk: "rich",
        openMarket: true,
        storyFlag: "gs-market",
      },
      {
        id: "story-gs-walk",
        title: "自己走",
        blurb: "长坡还在脚下，枪没收回去，货摊留在坡下。**换城，下场照旧，伤 ?。**",
        risk: "safe",
        storyFlag: "gongsunsizhang-left",
      },
    ];
  }
  const rows: EncounterChoice[] = [
    {
      id: "story-ft-ask",
      title: "求他让路",
      blurb: "棍抬起一寸，过闸的人还在排队，路条从杠下递过去。**下场照旧。**",
      risk: "safe",
      storyFlag: "ft-ask",
    },
    {
      id: "story-ft-rush",
      title: "硬闯闸口",
      blurb: "杠响了一声，后面的人跟上来，匣沿上的钱还在。**下一程多 1 人。**",
      risk: "danger",
      extraWaves: 1,
      storyFlag: "ft-rush",
    },
  ];
  if (canOfferWager(run, "fengtang-wager")) {
    rows.push(wagerChoice("story-ft-wager", "买路钱改押赌馆", "匣沿上的钱改了去向，木杠还横在路中间。**进赌馆。单注最高当前彩金 80%。**", "fengtang-wager"));
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
      blurb: `${nm(id)}点了点头，手里的东西收回去，这段到此。**下场照旧。**`,
      risk: "safe",
      storyFlag: `${id}-enough`,
    },
  ];
  if (!partyFull(run)) {
    rows.unshift({
      id: `story-${id}-join`,
      title: joinTitle,
      blurb: `${nm(id)}收了兵器，跟在你侧后，步子和你齐。**当场入伙。**`,
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
  if (pending === "choice") {
    const s3 = currentStory3(run);
    if (s3) return s3.choices;
    const s2 = currentStory2(run);
    if (s2) return s2.choices;
    const env = currentEnvPage(run);
    if (env) return env.choices;
  }
  if (pending === "followup") {
    const who = helpedPerson(run);
    if (!who) return [];
    return followChoices(who, run);
  }
  return firstChoices(activePerson(run), run);
}

export function storyEventLead(run: GauntletRun): string {
  if (run.storyPending === "choice") {
    const s3 = currentStory3(run);
    if (s3) return s3.lead;
    const s2 = currentStory2(run);
    if (s2) return s2.lead;
    const env = currentEnvPage(run);
    if (env) return env.lead;
  }
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
  if (has(run, "lv-gone") || has(run, "lv-sold")) return "梁山脚的路断了辙，往济南去的土还湿着，你把刀收回鞘里往前走。";
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
  if (STORY3_META[id]?.next) return "choice";
  if (STORY2_META[id]?.next) return "choice";
  if (ENV_CHOICE_META[id]?.nextPage) return "choice";
  return "rest";
}

export function applyStoryChoice(run: GauntletRun, choice: EncounterChoice, rng: () => number): GauntletRun {
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
  const who = currentEnvPage(run) ? undefined : activePerson(run);
  if ((run.storyPending === "choice" || run.storyPending === "followup") && who && !seen.includes(who)) seen.push(who);
  const envApplied = applyEnvChoice(flags, choice, next);
  const s2Applied = applyStory2Choice(envApplied.flags, choice, envApplied.next);
  const s3Applied = applyStory3Choice(s2Applied.flags, choice, s2Applied.next);
  const dest = travelDest(choice);
  let storyPlace = next.storyPlace ?? run.storyPlace ?? personHome(run.openingId ?? "lvchifeng");
  if (dest === "elsewhere") {
    const nxt = nextUnseenElsewhere(run, who);
    if (nxt) storyPlace = personHome(nxt);
  } else if (dest) {
    storyPlace = dest;
  }
  return {
    ...s3Applied.next,
    storyFlags: s3Applied.flags,
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
  rng: () => number,
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

export function queuePostCampBeat(run: GauntletRun, fought: number, rng: () => number): GauntletRun {
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
  const s3 = currentStory3(run);
  if (s3 && run.storyPending === "choice") return s3.title;
  const s2 = currentStory2(run);
  if (s2 && run.storyPending === "choice") return s2.title;
  const env = currentEnvPage(run);
  if (env && run.storyPending === "choice") return env.title;
  const id = activePerson(run);
  return PERSON_TITLE[id] ?? "路上";
}

export interface EnvPage {
  id: string;
  tag: EnvTag;
  step: 1 | 2 | 3;
  title: string;
  lead: string;
  choices: EncounterChoice[];
}

export interface EnvChoiceMeta {
  nextPage?: string;
  tag?: EnvTag;
  clearTag?: boolean;
  stance?: "near" | "far" | "side" | "gap";
}

function envChoice(id: string, title: string, blurb: string, flag: string): EncounterChoice {
  return { id, title, blurb, risk: "safe", storyFlag: flag };
}

export const ENV_CHOICE_META: Record<string, EnvChoiceMeta> = {
  "env-burn-step": { nextPage: "env-burn-2", tag: "burn", stance: "near" },
  "env-burn-skirt": { nextPage: "env-burn-2", tag: "burn", stance: "far" },
  "env-burn-pull": { nextPage: "env-burn-3", tag: "burn", stance: "side" },
  "env-burn-kick": { tag: "burn", stance: "near" },
  "env-burn-let": { tag: "burn", clearTag: true, stance: "far" },
  "env-burn-stay": { tag: "burn", stance: "side" },
  "env-burn-leave": { tag: "burn", clearTag: true },
  "env-wall-center": { nextPage: "env-nowall-2", tag: "nowall", stance: "near" },
  "env-wall-side": { nextPage: "env-nowall-2", tag: "nowall", stance: "side" },
  "env-wall-back": { nextPage: "env-nowall-3", tag: "nowall", stance: "far" },
  "env-wall-hold": { tag: "nowall", stance: "near" },
  "env-wall-press": { tag: "nowall", stance: "side" },
  "env-wall-mark": { tag: "nowall", stance: "far" },
  "env-wall-go": { tag: "nowall", clearTag: true },
  "env-end-stop": { nextPage: "env-gapend-2", tag: "gap_end", stance: "gap" },
  "env-end-jump": { nextPage: "env-gapend-2", tag: "gap_end", stance: "near" },
  "env-end-send": { tag: "gap_end", stance: "far" },
  "env-end-fill": { tag: "gap_end", stance: "gap" },
  "env-end-leave": { tag: "gap_end", clearTag: true },
  "env-mid-around": { tag: "gap_mid", stance: "side" },
  "env-mid-stand": { tag: "gap_mid", stance: "near" },
  "env-mid-push": { tag: "gap_mid", clearTag: true, stance: "far" },
};

export const ENV_PAGES: EnvPage[] = [
  {
    id: "env-burn-1",
    tag: "burn",
    step: 1,
    title: "冒烟的格子",
    lead: "石台上有一格在冒烟，烟是白的，格子里的灰被踩出脚印。炭边蹲着一个人，他把脚缩回去，鞋底已经焦了一圈。烟从格子里往上走，走到你膝盖那么高就散开。旁边的人用手扇烟，扇开一掌宽的空隙。那一格比旁边的格子更暗，暗处有一点红。风从场边过来，红点亮了一下，蹲着的人又把脚挪远半步。",
    choices: [
      envChoice("env-burn-step", "踩上那一格", "你的靴底压上冒烟的灰，灰里的红点被踩灭一颗。**这一格仍是灼烧格，踩上去伤 X，下一程人离他更近。**", "env-burn-step"),
      envChoice("env-burn-skirt", "顺着边绕过去", "你贴着场边走，靴底没沾到那格灰，烟从你膝边过去。**灼烧格留在原地，伤 ?，下一程人离他更远。**", "env-burn-skirt"),
      envChoice("env-burn-pull", "把人从炭上拖开", "你拉住他的袖子，他的鞋底离开冒烟的格子，袖口沾了灰。**人离开灼烧格，他的伤 X，你的手背伤 ?。**", "env-burn-pull"),
    ],
  },
  {
    id: "env-burn-2",
    tag: "burn",
    step: 2,
    title: "鞋底发黑",
    lead: "你已经从那格烟边走过，炭还在格子里，红点比刚才小。你的鞋底发黑，黑印留在下一格的灰上。炭边那人看着你的靴，又看看自己焦了一圈的鞋。烟比刚才低，低得贴着格子表面，表面的灰还是热的。场边的风把灰吹到你脚跟，脚跟热了一下。石台其余的格子是凉的，凉热交界就在你脚下这一线。",
    choices: [
      envChoice("env-burn-kick", "把炭踢散", "你把灰踢开，炭星溅到小腿上，溅开的红点很快暗下去。**炭星伤 X，灼烧格还留在这一程。**", "env-burn-kick"),
      envChoice("env-burn-let", "让他先过去", "你侧身让出凉的格子，他从烟边走过去，鞋底又黑了一层。**他先走，灼烧格不带进下一程，站位远近 ?。**", "env-burn-let"),
    ],
  },
  {
    id: "env-burn-3",
    tag: "burn",
    step: 3,
    title: "拖开之后",
    lead: "被你拖开的人坐在炭格外面，脚上的布焦了一块，焦味还在。冒烟的格子空着，灰上留着两枚鞋印，一枚是他的，一枚是你的。他揉着袖口，袖口的灰拍不干净，灰还沾在指缝里。旁边的人把扇烟的手放下，看你们两个。红点还在那一格里，没有人再把脚放上去。你站在他身侧，炭烟从空格子里继续往上冒。",
    choices: [
      envChoice("env-burn-stay", "留在他旁边", "你在他身侧站定，焦布和你的鞋底对着同一格烟。**灼烧格还在，下一程你和他靠得近，伤 X。**", "env-burn-stay"),
      envChoice("env-burn-leave", "自己离开炭边", "你把脚从灰线上挪开，他仍坐在炭外，烟留在原来那一格。**这一程的灼烧格不带进下一程，下一程伤 ?。**", "env-burn-leave"),
    ],
  },
  {
    id: "env-nowall-1",
    tag: "nowall",
    step: 1,
    title: "墙不在了",
    lead: "这一场的墙没立在格后，原来墙根的位置空着，露出后面的地。站在最边上的人回头看了一眼，身后没有可挨的砖。风从空出来的那一侧直吹过来，吹得衣角贴在腿上。有人下意识往后退，退了一步，脚跟悬空，又站回来。石台还在，格子还在，缺的是格后那一堵墙。你看见所有人的背都露在外面，没有人能把肩靠上去。",
    choices: [
      envChoice("env-wall-center", "站到场中间", "你走到格子中间，他和你面对面，身后都是空的。**无墙场，下一程谁也靠不上墙，人离他近，靠墙伤 ?。**", "env-wall-center"),
      envChoice("env-wall-side", "绕到他侧面", "你从侧面走进去，他转过身，空出来的墙根在你们斜后面。**无墙场，下一程你在他侧面，远近 ?。**", "env-wall-side"),
      envChoice("env-wall-back", "退到场外", "你退到石台外面，他仍站在没有墙的格子上，风从他背后过来。**无墙场留给他，下一程你离他远，远近 ?。**", "env-wall-back"),
    ],
  },
  {
    id: "env-nowall-2",
    tag: "nowall",
    step: 2,
    title: "背都露着",
    lead: "你们已经站进没有墙的场子，他的背对着空地，你的背也对着空地。风比有墙的时候直，直吹到后颈，后颈的汗被吹凉。边上的人还在看那截空出来的墙根，墙根本来有的砖印还在地上。没有人再往那截砖印上靠，砖印留在原地。他的脚跟在格子里挪了挪，挪完仍站在原格。你看见他的肩线完全露出来，衣褶被风压平。",
    choices: [
      envChoice("env-wall-hold", "停在他对面", "你停在他对面，两个人的背都对着空地，谁也没有墙可挨。**无墙场还在，下一程站得近，靠墙伤 ?。**", "env-wall-hold"),
      envChoice("env-wall-press", "从侧面逼近", "你沿着侧面往前，他跟着转，空墙根始终在你们斜后面。**无墙场还在，下一程你在他侧面，远近 ?。**", "env-wall-press"),
    ],
  },
  {
    id: "env-nowall-3",
    tag: "nowall",
    step: 3,
    title: "场外看着",
    lead: "你退到石台外面，他仍站在没有墙的格子上，风从他背后灌进来。场外的土比格子凉，凉意从靴底慢慢上来。他回头看了一眼空墙根，又把脸转回场里。边上的人没有跟你一起退出来，他们还站在格子里。空出来的那一侧什么都没有，没有砖，没有影。你在场外能看见他的全身，他看不见你身后。",
    choices: [
      envChoice("env-wall-mark", "记住这截空墙", "你看着那截空墙根，下一程开打时它还是空的。**无墙场带进下一程，你离他远，远近 ?。**", "env-wall-mark"),
      envChoice("env-wall-go", "离开这座空场", "你转身走，空墙根留在身后，他的背影还在格子里。**这一程的无墙场不带进下一程，下一程伤 ?。**", "env-wall-go"),
    ],
  },
  {
    id: "env-gapend-1",
    tag: "gap_end",
    step: 1,
    title: "末端空着",
    lead: "石台末端空了一格，那一格没有木板，露出底下的土。他走到尽头就停住，脚尖对着空处，空处比肩还宽。后面的人挤上来，挤到他背上，他还是没有落脚的板。末端的缺口边沿有木茬，木茬上没有灰。你从侧面看见那一截空，空下面是实土，实土上没有靴印。风从缺口灌上来，灌到他的裤脚，裤脚被吹得贴在腿上。",
    choices: [
      envChoice("env-end-stop", "停在缺口前", "你停在他旁边，两个人的脚都对着那截没有木板的空。**末端缺格，下一程他站不进那一截，空多少 ?。**", "env-end-stop"),
      envChoice("env-end-jump", "从缺口跳过去", "你从空处跳到另一头，落地时靴底砸在实土上，他仍停在缺口前。**末端缺格还在，下一程你绕到他前头，距离 ?。**", "env-end-jump"),
      envChoice("env-end-send", "让他先面对缺口", "你退开半步，他一个人面对没有木板的那一格，后面的人还挤着。**末端缺格留给他，下一程你离他远，远近 ?。**", "env-end-send"),
    ],
  },
  {
    id: "env-gapend-2",
    tag: "gap_end",
    step: 2,
    title: "木茬还在",
    lead: "末端的缺口还在，木茬上多了一点新泥，泥是刚才跳过去的人带的。他的脚尖仍对着空处，空处下面的土被风吹干了一层。后面挤着的人换成了侧身，侧身之后背上的压力小了些。你能看见整截缺口，缺口的宽度够一个人侧着走，不够两个人并排。木板在缺口两侧都还在，中间就是没有。场上的说话声低下去，眼睛都看着那截空。",
    choices: [
      envChoice("env-end-fill", "站在缺口两侧", "你和他分站缺口两边，中间那截没有木板，谁也跨不过去并排。**末端缺格带进下一程，中间空着，空多少 ?。**", "env-end-fill"),
      envChoice("env-end-leave", "把缺口留在这一程", "你离开末端，木茬和空土留在原处，他的脚尖还对着缺口。**末端缺格不带进下一程，下一程伤 ?。**", "env-end-leave"),
    ],
  },
  {
    id: "env-gapmid-1",
    tag: "gap_mid",
    step: 1,
    title: "中间缺了一格",
    lead: "石台中间缺了一格，前后的木板都在，中间那一截是空的。他站在空处这边，你站在空处那边，中间隔着没有板的土。有人想迈过去，迈到一半把脚收回来，木茬刮到了鞋帮。空处的土比两边的板低一掌，低处积着一点灰。两边的人说话要提高声音，声音从缺口上飘过去。你看见他的脸在缺口对面，身子被那截空隔开。",
    choices: [
      envChoice("env-mid-around", "从场边绕到他那边", "你沿着场边绕过缺口，绕到他站的那一侧，中间的空留在身后。**中间缺格还在，下一程你在他侧面，远近 ?。**", "env-mid-around"),
      envChoice("env-mid-stand", "隔着空处对他", "你站在缺口这边，他在对面，中间没有板，话要从空上送过去。**中间缺格带进下一程，你和他隔着那一截空，空多少 ?。**", "env-mid-stand"),
      envChoice("env-mid-push", "退出这段缺口", "你从缺口这边退开，他仍留在对面，中间的空土没有新靴印。**中间缺格不带进下一程，下一程远近 ?。**", "env-mid-push"),
    ],
  },
];

export const ENV_DEATH: Record<EnvTag, string> = {
  burn: "你倒在冒烟的格子边上，炭还红着。炭边蹲着的人伸手拉你，手背也烫起一层，他的手停在半空。你的伤是 X，他的手背伤是 X。灰粘在你的袖口上，袖口还在冒细烟。下一程的人从烟里走出来，看见你已经躺下，红点仍在那一格里。",
  nowall: "你倒在没有墙的场子里，身后是空的，没有砖接住你。对面的人站住，风从你们之间直吹过去。你的伤是 X。场边的人看着那截空墙根，没有人把你挪到有墙的那一侧。你的背完全露在外面，衣角被风压在地上。",
  gap_end: "你倒在末端的缺口前，脚尖对着没有木板的那一截。他停在你旁边，后面的人不再挤。你的伤是 X。木茬上没有血，血在缺口这边的板上。空下面的土仍是干的，没有人从那截空里把你拖下去。",
  gap_mid: "你倒在中间的缺口这边，对面的人隔着空土看着你。他没有迈过来，木茬还刮着他刚才收回去的鞋帮。你的伤是 X。缺口两边的木板都在，你躺在其中一边。风从空处灌上来，把他的衣角吹起来，他又按下去。",
};

export const ENV_FLASH: Record<EnvTag, [string, string]> = {
  burn: ["炭格烫上来，伤 X。", "炭边那人的鞋底冒烟，又烫了 X。"],
  nowall: ["背后没有墙，这一下伤 X。", "他退了一步，身后空着，伤 X。"],
  gap_end: ["末端没有板，他停住，伤 X。", "脚尖对着空处，挤上来的人伤 X。"],
  gap_mid: ["中间缺一格，隔着空，伤 X。", "脚从缺口收回来，鞋帮伤 X。"],
};

/** 站位写脚步和空处，不写格数。远近交给数值框架。 */
export const ENV_STANCE: { id: string; tag: EnvTag; text: string }[] = [
  { id: "stance-burn", tag: "burn", text: "你从冒烟的格子侧面绕过去，靴底避开红点。下一程开打时，人离他近一截还是远一截，看你刚才踩的是烟还是场边，远近不写死。" },
  { id: "stance-nowall", tag: "nowall", text: "墙不在格后，你们的背都露在外面。下一程没有人能靠墙，你站在他对面、侧面，还是退到场外，都是这一场走出来的位置。" },
  { id: "stance-gap", tag: "gap_end", text: "末端或中间空了一截，没有木板。下一程他站不进那一截，你和他之间多出一块没人踩的地，这块地有多宽先留着。" },
];

function currentEnvPage(run: Pick<GauntletRun, "storyFlags">): EnvPage | undefined {
  const id = [...(run.storyFlags ?? [])].reverse().find((f) => f.startsWith("envpage:"))?.slice("envpage:".length);
  return id ? ENV_PAGES.find((p) => p.id === id) : undefined;
}

function applyEnvChoice(flags: string[], choice: EncounterChoice, next: GauntletRun): { flags: string[]; next: GauntletRun } {
  const meta = ENV_CHOICE_META[choice.id];
  if (!meta) return { flags, next };
  let f = flags.filter((x) => !x.startsWith("envpage:"));
  if (meta.tag) f.push(`envtag:${meta.tag}`);
  if (meta.clearTag) f.push("envtag-off");
  if (meta.nextPage) f.push(`envpage:${meta.nextPage}`);
  if (meta.stance) f.push(`stance:${meta.stance}`);
  const label = meta.tag ? ENV_TAG_LABEL[meta.tag] : undefined;
  const note = label
    ? next.lastEncounterNote?.includes(label)
      ? next.lastEncounterNote
      : [next.lastEncounterNote, label].filter(Boolean).join(" · ")
    : next.lastEncounterNote;
  return { flags: f, next: { ...next, lastEncounterNote: note } };
}

/** 词条事页由这里打开，不预排程，也不在第一程自动进赌馆。出现与否等数值框架。 */
export function offerEnvPage(run: GauntletRun, pageId: string): GauntletRun {
  const page = ENV_PAGES.find((p) => p.id === pageId);
  if (!page) return run;
  const flags = (run.storyFlags ?? []).filter((f) => !f.startsWith("envpage:"));
  flags.push(`envpage:${page.id}`);
  flags.push(`envtag:${page.tag}`);
  const label = ENV_TAG_LABEL[page.tag];
  const note = run.lastEncounterNote?.includes(label) ? run.lastEncounterNote : [run.lastEncounterNote, label].filter(Boolean).join(" · ");
  return { ...run, storyFlags: flags, storyPending: "choice", storyGuest: undefined, lastEncounterNote: note };
}

export type Story2Pack = "meet" | "road" | "wager" | "market" | "revive" | "fork";

export interface Story2Page {
  id: string;
  pack: Story2Pack;
  mateId?: string;
  title: string;
  lead: string;
  choices: EncounterChoice[];
}

export interface Story2Meta {
  next?: string;
  env?: EnvTag;
  clearEnv?: boolean;
}

function s2choice(id: string, title: string, blurb: string, extra: Partial<EncounterChoice> = {}): EncounterChoice {
  return { id, title, blurb, risk: extra.openWager || extra.openMarket ? "rich" : "safe", storyFlag: id, ...extra };
}

export const STORY2_META: Record<string, Story2Meta> = {
  "s2-watch-stay": { next: "s2-watch-road" },
  "s2-baimenghe-stay": { next: "s2-baimenghe-road" },
  "s2-wenrensheng-stay": { next: "s2-wenrensheng-road" },
  "s2-huochangchuan-stay": { next: "s2-huochangchuan-road" },
  "s2-shiwanshan-stay": { next: "s2-shiwanshan-road" },
  "s2-moqiwan-stay": { next: "s2-moqiwan-road" },
  "s2-lvchifeng-stay": { next: "s2-lvchifeng-road" },
  "s2-zhounuanxiang-stay": { next: "s2-zhounuanxiang-road" },
  "s2-boqing-stay": { next: "s2-boqing-road" },
  "s2-ananhuo-stay": { next: "s2-ananhuo-road" },
  "s2-zhangshoushan-stay": { next: "s2-zhangshoushan-road" },
  "s2-chenchenlan-stay": { next: "s2-chenchenlan-road" },
  "s2-lishuangxing-stay": { next: "s2-lishuangxing-road" },
  "s2-fubishan-stay": { next: "s2-fubishan-road" },
  "s2-duguposui-stay": { next: "s2-duguposui-road" },
  "s2-gongsunsizhang-stay": { next: "s2-gongsunsizhang-road" },
  "s2-fengtang-stay": { next: "s2-fengtang-road" },
  "s2-ouyangyingou-stay": { next: "s2-ouyangyingou-road" },
  "s2-wager-push": { next: "s2-wager-win" },
  "s2-wager-lose": { next: "s2-wager-bust" },
  "s2-wager-hands": { next: "s2-wager-fold" },
  "s2-market-open": { next: "s2-market-haggle" },
  "s2-market-walk": { next: "s2-market-leave" },
  "s2-revive-up": { next: "s2-revive-rematch" },
  "s2-fork-burn-shed": { next: "s2-zhounuanxiang-road", env: "burn" },
  "s2-fork-burn-wager": { env: "burn" },
  "s2-fork-burn-hunt": { env: "burn" },
  "s2-fork-wall-rope": { next: "s2-chenchenlan-road", env: "nowall" },
  "s2-fork-wall-market": { env: "nowall" },
  "s2-fork-wall-cut": { clearEnv: true },
  "s2-fork-gap-wait": { next: "s2-fengtang-road", env: "gap_end" },
  "s2-fork-gap-wager": { env: "gap_end" },
  "s2-fork-gap-rush": { env: "gap_end" },
};

export const STORY2_PAGES: Story2Page[] = [
  {
    id: "s2-watch-meet",
    pack: "meet",
    mateId: "watch",
    title: "夜巷的缝",
    lead: "夜巡的灯灭了一排，沈夜行的刀比袖口短一截，刀尖对着墙上一道缝。缝里卡着半张路条，字被潮气浸软。他用刀背把缝里的灰拨出来，灰落在靴面上。巷口还有两个人停着，手里的刀鞘和沈夜行那把一样短。你走到灯灭的那一截，他的眼睛在缝和人之间移了一下。刀入鞘的声音很轻，墙缝还开着。",
    choices: [
      s2choice("s2-watch-stay", "帮他把缝里的纸挑出来", "你把刀背让给他，纸从缝里出来，纸边还湿。**下一程多 X 人。**"),
      s2choice("s2-watch-leave", "离开这条夜巷", "你从灭灯的巷口走开，墙缝留在身后，短刀还对着灰。**换城，下场照旧，伤 ?。**"),
      s2choice("s2-watch-market", "把湿纸拿去帘后", "湿纸夹在你指间，帘缝里有灯，灯下摆着货。**去黑市。外功、淬刃这一摊开，货好不好是 ?。**", { openMarket: true }),
    ],
  },
  {
    id: "s2-watch-road",
    pack: "road",
    mateId: "watch",
    title: "又一道墙缝",
    lead: "夜里又走到一堵墙边，沈夜行的刀还是比袖口短。他在墙缝前停下，用刀背拨灰，灰里又卡着半张纸。你的靴印叠在他的靴印旁边，巷里有人跟着，跟着的距离时远时近。他把纸从缝里挑出来，纸上的字还湿。纸夹在他指间，他没有把纸递到你手里。短刀入鞘，墙缝仍开着一条。",
    choices: [
      s2choice("s2-watch-road-paper", "按他的刀背把纸收好", "纸按进你袖里，灰还沾在刀背上。**下场照旧，伤 ?。**"),
      s2choice("s2-watch-road-chase", "去看后面跟着的人", "你转身对着巷尾，跟着的人停住，刀鞘在灯外闪了一下。**下一程多 X 人。**"),
    ],
  },
  {
    id: "s2-baimenghe-meet",
    pack: "meet",
    mateId: "baimenghe",
    title: "肋上的拳",
    lead: "药铺的灯还亮着，白孟和把拳停在伤者的肋上，先按骨，再揭药包。伤者的呼吸顶着他的掌心，掌心的药粉沾了一层。柜上摆着揭开的药包，纸绳堆在柜角。对街有人敲骰盅，声音传过来，他的手没有离开肋。你停在门口，看见拳、药、伤者睁着的眼。他把布绕上肋，布结打在肋侧。",
    choices: [
      s2choice("s2-baimenghe-stay", "把药包按住", "你按着纸包，他的拳仍停在肋上，布结慢慢收紧。**下一程照旧，伤 ?。**"),
      s2choice("s2-baimenghe-leave", "退出药铺", "你退到街上，肋上的布还在绕，骰盅的声音更近。**换城，下场照旧，伤 ?。**"),
      s2choice("s2-baimenghe-wager", "对着街进赌棚", "你转身对着敲盅的灯，白孟和的手仍按在肋上。**进赌馆。单注最高当前彩金 80%，开盅输赢是 ?。**", { openWager: true }),
    ],
  },
  {
    id: "s2-baimenghe-road",
    pack: "road",
    mateId: "baimenghe",
    title: "路上的药包",
    lead: "路边又有人靠着树，白孟和把拳停在那人肋上，先按，再从袖里摸出药包。药包的纸绳是在柜上打过的那种结。你走在旁边，看见他的步子放慢，慢到和伤者的呼吸一起。树皮上有新鲜的血点，血点还没干透。他把布绕上，布结打在肋侧。骰盅声这次不在对街，在更远的巷里。",
    choices: [
      s2choice("s2-baimenghe-road-hold", "替他把药粉按实", "药粉按进布下，他的拳才离开肋。**下场照旧，回的血是 ?。**"),
      s2choice("s2-baimenghe-road-go", "先去巷里看敲盅的人", "你朝巷里走，他仍按着肋，盅声停了一下。**下一程多 X 人。**"),
    ],
  },
  {
    id: "s2-wenrensheng-meet",
    pack: "meet",
    mateId: "wenrensheng",
    title: "鞘还没出",
    lead: "剑还在鞘里，闻人笙侧耳听着街口的铁器相碰。碰的那一下很短，他的肩已经先动了。鞘口对着来路，剑穗垂在腕上。街口站着两个人，兵器碰过之后都停着。你走近时，他的眼睛看着鞘口，人还没有拔剑。地上有一道新的划痕，痕比剑穗窄。",
    choices: [
      s2choice("s2-wenrensheng-stay", "站在他肩侧听", "你停在他肩侧，下一次铁器相碰时，他的肩又先动。**下场照旧，先机 ?。**"),
      s2choice("s2-wenrensheng-leave", "从街口走开", "你离开街口，鞘仍对着来路，划痕留在地上。**换城，下场照旧，伤 ?。**"),
    ],
  },
  {
    id: "s2-wenrensheng-road",
    pack: "road",
    mateId: "wenrensheng",
    title: "路上还听着",
    lead: "走到下一条街，闻人笙的剑还在鞘里。前面有人把刀在鞘口碰了一下，他的肩又先于剑动。你走在他侧后，剑穗随着步子轻敲他的腕。街石上有新痕，痕的深浅和他听的那一下对得上。两个人在街口停住，兵器都收回去一半。他仍不拔剑，眼睛看着鞘口。你的脚步放慢，慢到能听见下一次相碰。",
    choices: [
      s2choice("s2-wenrensheng-road-wait", "等他肩动了再上", "你等肩线先动，剑仍在鞘里，街口的人已经退了半步。**下场照旧，先机 ?。**"),
      s2choice("s2-wenrensheng-road-draw", "你先把刀抽出来", "你的刀先出鞘，他的肩这才跟上，街口的人同时回头。**下一程多 X 人。**"),
    ],
  },
  {
    id: "s2-huochangchuan-meet",
    pack: "meet",
    mateId: "huochangchuan",
    title: "枪前的空地",
    lead: "空地比街宽，霍长川把枪杆拄在身前，枪头离对面的人还有一段。那段空地上没有人站，土是干的。他往侧边迈了一步，枪尖跟着抬高一寸。对面的人想靠近，靠近到一半又停住。你站在空地边上，看见枪、空地、对面那人的脚。他的手还握着枪杆，枪前面留着能伸直的空处。",
    choices: [
      s2choice("s2-huochangchuan-stay", "把空地留给他", "你退到空地边上，他的枪尖仍对着那段没有人的地。**下场照旧，距离 ?。**"),
      s2choice("s2-huochangchuan-leave", "从空地旁边走", "你贴着屋檐走，空地还在，枪尖没有收回来。**换城，下场照旧，伤 ?。**"),
      s2choice("s2-huochangchuan-hunt", "站进那段空地", "你的脚踏进枪前的空处，对面的人同时往前。**下一程多 X 人。**"),
    ],
  },
  {
    id: "s2-huochangchuan-road",
    pack: "road",
    mateId: "huochangchuan",
    title: "路上仍留空",
    lead: "下一段路又宽出来，霍长川走到宽处才把枪尖抬平。你若靠得太近，他会侧一步，侧完枪前又空出一段。这段路上有车辙，车辙到他脚下就断了。对面来了一个推车的人，推到空处边上停下。你走在他侧后，靴尖没有踏进枪前的那截土。枪杆上的汗还在，汗没有干。他看着那段空，人站得很稳。",
    choices: [
      s2choice("s2-huochangchuan-road-gap", "继续把空处留出来", "你停在空处外侧，推车的人把车把放下。**下场照旧，距离 ?。**"),
      s2choice("s2-huochangchuan-road-close", "走到他枪尖底下", "你走进那段空，枪尖从你肩旁擦过去，推车的人喊了一声。**下一程多 X 人。**"),
    ],
  },
  {
    id: "s2-shiwanshan-meet",
    pack: "meet",
    mateId: "shiwanshan",
    title: "先踏稳的一步",
    lead: "石万山先把脚踏进格子，踏稳了，才抬眼看你。棍尾抵着地面，地面上有一个新坑。对面的人还在动，他的脚不再挪。你走到他踏过的坑边，坑里有湿泥。棍身上有手汗，汗把木色浸深一圈。他看着你的脚，看你落在哪一格。人还站在先占的那一步上，棍没有离地。",
    choices: [
      s2choice("s2-shiwanshan-stay", "在他旁边把脚踏稳", "你的脚踏在坑边，踏稳之后他才点头，棍尾仍抵着地。**下场照旧，站位 ?。**"),
      s2choice("s2-shiwanshan-leave", "从坑边走开", "你离开那个新坑，他的脚还在格子里，对面的人仍在动。**换城，下场照旧，伤 ?。**"),
    ],
  },
  {
    id: "s2-shiwanshan-road",
    pack: "road",
    mateId: "shiwanshan",
    title: "每段路先占一步",
    lead: "每到一处宽地，石万山都先把脚踏实，踏实了才说话。你跟着走，看他的靴印：印深的那段土他会停，印浅的那段土他会再踏一次。棍尾在停过的土里留下一排小坑。后面有人想超到他前面，超到坑边就慢下来。你的脚有一次踏进他刚占的坑，他看了你的靴一眼。这一眼里没有催促，他在等你把脚放稳。棍上的手汗又浸深了一点，木色更暗。",
    choices: [
      s2choice("s2-shiwanshan-road-step", "等脚稳了再一起走", "你把脚从他的坑里挪开，重新踏实，他这才抬棍。**下场照旧，站位 ?。**"),
      s2choice("s2-shiwanshan-road-pass", "从他前面超过去", "你超到棍前，后面的人也跟着挤上来。**下一程多 X 人。**"),
    ],
  },
  {
    id: "s2-moqiwan-meet",
    pack: "meet",
    mateId: "moqiwan",
    title: "地上的线头",
    lead: "万俟晚的钩子扣着地上的一根线头，线头从货箱底下伸出来。她没有把路挡住，路还在钩子旁边空着。线越收越短，货箱跟着挪了一寸。箱角的封条裂开一条缝，缝里看见货。你停在路的另一侧，看见钩、线、箱。她把线头绕上腕，腕上已经有一圈旧印。",
    choices: [
      s2choice("s2-moqiwan-stay", "按住箱子让她收线", "你按着箱角，线头继续缩短，封条的缝裂得更开。**下场照旧，下一程人离箱 ?。**"),
      s2choice("s2-moqiwan-leave", "从箱子旁边的路走", "你顺着还空着的路走开，钩子仍扣着线头。**换城，下场照旧，伤 ?。**"),
      s2choice("s2-moqiwan-market", "跟着箱子去帘后", "箱子被线拖到帘边，帘缝里灯亮着。**去黑市。外功、淬刃这一摊开，价是 ?。**", { openMarket: true }),
    ],
  },
  {
    id: "s2-moqiwan-road",
    pack: "road",
    mateId: "moqiwan",
    title: "路上仍在收线",
    lead: "走到下一处货堆，万俟晚又蹲下去，钩子去找地上的线头。你走在路的空着的那一侧，没有踩到线。线头这次缠在一辆倒了的独轮车上，车把朝天。她把线绕上腕，旧印旁边多了一圈新印。货堆里有人喊车，喊声停在她把车拉正的时候。你看见钩尖上没有血，有的是麻绳的屑。路一直是开的，她收的是线，路口仍空着。",
    choices: [
      s2choice("s2-moqiwan-road-hold", "扶着车把等线收完", "车把在你手里停稳，线头收回她腕上。**下场照旧，距离 ?。**"),
      s2choice("s2-moqiwan-road-cut", "把缠着的线割断", "线断在车轴上，喊车的人从货堆里走出来。**下一程多 X 人。**"),
    ],
  },
  {
    id: "s2-lvchifeng-meet",
    pack: "meet",
    mateId: "lvchifeng",
    title: "拆完才下的刀",
    lead: "梁山脚的刀铺里，吕赤锋先把对面的刀架拆开，刀架空了，他的刀才落下。砧上有血，血还没干到刀背。地上的人侧躺着，胸口一起一伏。门外三个人的刀鞘和架上缺的那一格对得上。你站在门槛，看见先被拆开的架子，后落下的刀。风把血印吹向门外，门外的人没有退。",
    choices: [
      s2choice("s2-lvchifeng-stay", "等他把架子拆完", "架子又空出一格，他的刀这才收回鞘。**下一程多 X 人。**"),
      s2choice("s2-lvchifeng-leave", "自己往济南走", "刀铺的门在身后合上，空架子留在铺里。**换城，下场照旧，伤 ?。**"),
    ],
  },
  {
    id: "s2-lvchifeng-road",
    pack: "road",
    mateId: "lvchifeng",
    title: "路上仍先拆",
    lead: "走到下一处挡路的人，吕赤锋仍不先下刀。他先看那人的刀怎么拿，看完才把自己的刀从鞘里抽出来半寸。你走在侧后，看见他的眼睛停在刀鞘上，不停在脸上。挡路的人把刀横在胸前，横了很久。吕赤锋的刀又收回去一寸，他在等那人的架子先松。松的是那人的肩，肩一落，他的刀才全出鞘。血还没有落到地上，刀光先到了肩前。",
    choices: [
      s2choice("s2-lvchifeng-road-wait", "等架子松了再上", "你等那人的肩落下，吕赤锋的刀已经全出鞘。**下场照旧，伤 ?。**"),
      s2choice("s2-lvchifeng-road-cut", "你先砍过去", "你的刀先到，挡路的人身后又冒出人。**下一程多 X 人。**"),
    ],
  },
  {
    id: "s2-zhounuanxiang-meet",
    pack: "meet",
    mateId: "zhounuanxiang",
    title: "粥还热着",
    lead: "曹州城根的粥棚支着，周暖香用木勺给脚夫盛粥，勺沿磕在碗上。她先看脚夫手腕上的布挡不挡得住血，再把粥勺送过去。对街赌棚的人攥着工钱条子，条子边角被捏湿。脚夫的布上渗着血，血滴在棚里的地上。粥还冒热气，她空出来的手按着布结。你在棚外停下，看见粥、布、条子，她的人还在勺和布之间。",
    choices: [
      s2choice("s2-zhounuanxiang-stay", "坐下让布先绕好", "布从腕上绕到掌心，粥还热着，她仍站在棚里。**下一程照旧，伤 ?。**"),
      s2choice("s2-zhounuanxiang-leave", "连夜去泰安", "粥棚的灯在你身后还亮，条子仍在赌棚那人手里。**换城，下场照旧，伤 ?。**"),
      s2choice("s2-zhounuanxiang-wager", "拿条子进赌棚", "你从她勺边走过，条子到了你手里，木勺停在碗上。**进赌馆。单注最高当前彩金 80%，她不再给你裹伤。**", { openWager: true }),
    ],
  },
  {
    id: "s2-zhounuanxiang-road",
    pack: "road",
    mateId: "zhounuanxiang",
    title: "路上仍先看挡",
    lead: "走到下一处歇脚，周暖香先看你袖口上的血挡不挡得住，再把水囊递过来。水囊是温的，温得还带着锅边的热，她没有多说话。你坐下时，她把布条在你腕上比了一下，比完才问要不要绕。路边有人看你们的碗，碗里没有粥，有的是她顺手盛的热水。布条在她肘弯里，和粥棚那卷是同一条。她的步子不快，不快到能把伤者的呼吸听全。",
    choices: [
      s2choice("s2-zhounuanxiang-road-wrap", "让她把布绕上", "布绕上腕，水囊还温，她的手按在结上。**下场照旧，伤 ?。**"),
      s2choice("s2-zhounuanxiang-road-skip", "自己把袖口扎上", "你自己扎紧袖口，她把布条收回肘弯。**下一程照旧，伤 ?。**"),
    ],
  },
  {
    id: "s2-boqing-meet",
    pack: "meet",
    mateId: "boqing",
    title: "缺了半寸的刃",
    lead: "兖州剑铺的砧还热着，薄青把一柄旧剑按在布上，刃口缺了一小截。他在缺处比了比自己的指甲，指甲盖住的就是那半寸。柜上三把没开刃的胚还留着锤印。门外有人问这柄剑能不能押，问了两遍。薄青仍按着剑，眼睛在缺处。你进门踩到铁屑，他抬头看你的刀，眼睛停在刃上。缺处发暗，暗处看不清还能削开什么。",
    choices: [
      s2choice("s2-boqing-stay", "让他在缺处再比一次", "指甲又盖住那一小截，剑仍在布上。**下场照旧，破绽 ?。**"),
      s2choice("s2-boqing-leave", "离开剑铺", "你退出门，缺刃还按在布上，问价的人还在。**换城，下场照旧，伤 ?。**"),
      s2choice("s2-boqing-wager", "把这柄剑押进赌馆", "缺刃被你连布一起端起来，薄青的手离开剑。**进赌馆。单注最高当前彩金 80%。**", { openWager: true }),
    ],
  },
  {
    id: "s2-boqing-road",
    pack: "road",
    mateId: "boqing",
    title: "路上仍看那半寸",
    lead: "路上薄青不把剑全抽出来，缺处才露在鞘口。他抽出缺的那一截给你看，缺处在日光下仍发暗。你走在旁边，看见他每遇到别人的兵器，都先用眼睛去量那一小截。量完他才决定要不要再进半步。路边的石上有他用剑尖点出来的浅印，印和缺处一样短。有人要看他的剑，他把缺处转开，转开之后剑又入鞘。你听见鞘口响了一下，一下就停。",
    choices: [
      s2choice("s2-boqing-road-half", "按他量的那一截上", "你进的步子停在他点过的浅印上。**下场照旧，破绽 ?。**"),
      s2choice("s2-boqing-road-full", "一剑送满", "你的刀全送出去，浅印被踩过去，路边的人拔刀。**下一程多 X 人。**"),
    ],
  },
  {
    id: "s2-ananhuo-meet",
    pack: "meet",
    mateId: "ananhuo",
    title: "退开的一步",
    lead: "泰安河岸的渡口停着浅船，安岸火先往岸上退了一步，退完枪尖才抬起来。枪尖对着对岸提布袋的人，中间多出来的那一步全是水汽。水已经没过跳板，跳板响了一声。岸边蹲着两个人，鞋上全是泥。你走到跳板尽头，看见他退开的靴印比别人深。对岸的人把布袋举高，他的枪又长出一寸的空。雾贴着河面，枪和布袋之间没有人。",
    choices: [
      s2choice("s2-ananhuo-stay", "也退开一步", "你退到他的靴印旁边，枪前的空更清楚。**下场照旧，距离 ?。**"),
      s2choice("s2-ananhuo-leave", "从渡口走开", "你离开河岸，浅船还在，他仍站在退开的那一步上。**换城，下场照旧，伤 ?。**"),
      s2choice("s2-ananhuo-market", "过河去对岸的灯", "你踩过跳板，对岸帘缝里有灯。**去黑市。外功、淬刃这一摊开，货是 ?。**", { openMarket: true }),
    ],
  },
  {
    id: "s2-ananhuo-road",
    pack: "road",
    mateId: "ananhuo",
    title: "每遇人先退一步",
    lead: "路上遇到挡道的人，安岸火总是先退一步，退完枪才显得更长。你走在他侧后，靴印里能看出哪一步是退的：退的印前浅后深。挡道的人往往在这一步里停住，停住才说话。枪杆上的泥是河岸带上来的，泥还湿。他不解释这一步，你看见对面的人的手离开了刀柄。空出来的那一步里有风，风把你们的衣角吹向同一边。枪尖稳定，稳定在退开之后。",
    choices: [
      s2choice("s2-ananhuo-road-back", "跟他一起退", "你退到他旁边，挡道的人的手仍离开刀柄。**下场照旧，距离 ?。**"),
      s2choice("s2-ananhuo-road-forward", "你向前补上那一步", "你踏进他让出的空，挡道的人的手回到刀柄上。**下一程多 X 人。**"),
    ],
  },
  {
    id: "s2-zhangshoushan-meet",
    pack: "meet",
    mateId: "zhangshoushan",
    title: "闸后站稳",
    lead: "山门闸的木杠横在路中间，章守山把棍拄稳，拄稳了才看门外的人。门钱匣开着一条缝，缝里的钱没有洒。门外排着三个人，路条被汗浸软。他的脚在杠后不动，不动到靴边的泥干了。你走到队尾，看见棍、匣、路条。钟声从山门里传出来，他的肩没有跟着钟动。人站得很稳，稳在杠后那一小块地上。",
    choices: [
      s2choice("s2-zhangshoushan-stay", "在杠侧把脚站稳", "你的脚踏在杠侧，踏稳之后他才把棍抬起一寸。**下场照旧，站位 ?。**"),
      s2choice("s2-zhangshoushan-leave", "从泥路绕开", "你从闸侧的泥路过去，门钱匣没动。**这一摊黑市关着，下场照旧，伤 ?。**", { skipMarket: true }),
    ],
  },
  {
    id: "s2-zhangshoushan-road",
    pack: "road",
    mateId: "zhangshoushan",
    title: "路上也先站稳",
    lead: "离开山门之后，章守山每到岔路都先把脚站死，站死了才选边。你走在旁边，看见他的棍尾先点地，点出两个小坑，人再挪过去。岔路上的人想催他，催声停在他脚还没动的时候。泥干在靴边上，干泥在他终于起步时裂开。你有一次先走了，他没有跟，等你停住他才来。棍上的手很稳，稳得能把岔路的风挡住一点。这一段路因此走得慢，慢在每一步都踏实。",
    choices: [
      s2choice("s2-zhangshoushan-road-plant", "等他点完地再走", "两个小坑点完，他的脚才迈出去。**下场照旧，站位 ?。**"),
      s2choice("s2-zhangshoushan-road-rush", "先抢到岔路对面", "你先过岔路，对面的人已经在等。**下一程多 X 人。**"),
    ],
  },
  {
    id: "s2-chenchenlan-meet",
    pack: "meet",
    mateId: "chenchenlan",
    title: "先卸再钩",
    lead: "徐州码头的跳板上，陈沉缆先看甲板上那把卸下来的刀，看完才把钩子扣上缆结。刀主站在船舷上，手里空着，眼睛盯着缆。船工喊开船，缆还系在桩上，桩上的绳磨出白印。他的钩没有先去拉人，先在缆上停着。你踩上跳板，板响了一声，他的眼睛仍在那把刀上。岸上两捆货的封条还新，封条角被风掀起。刀躺在甲板上，钩尖对着缆，不对着人。",
    choices: [
      s2choice("s2-chenchenlan-stay", "等刀卸稳再拉缆", "刀仍在甲板上，他这才把钩扣死，船上的人退了半步。**下一程多 X 人。**"),
      s2choice("s2-chenchenlan-leave", "砍断缆离开", "缆落进水里，码头这段到此，岸上的灯还亮着一盏。**这一摊黑市关着，下场照旧，伤 ?。**", { skipMarket: true }),
    ],
  },
  {
    id: "s2-chenchenlan-road",
    pack: "road",
    mateId: "chenchenlan",
    title: "路上仍先看卸下的兵器",
    lead: "离开码头，陈沉缆遇到带兵器的人，仍先看兵器离没离手。兵器离了手，他的钩才靠近袖口。你走在跳板换成的土路上，看见他的眼睛停在别人的刀鞘上。有人把刀插回鞘，他的钩就停在半空。有人把刀扔在脚边，他才把钩子送出去，钩尖停在那人的袖上。钩尖上有绳屑，绳屑是码头带来的。你的步子跟着他的停顿，停顿总在兵器离手之前。",
    choices: [
      s2choice("s2-chenchenlan-road-wait", "等兵器离手", "刀扔在脚边之后，他的钩才碰到袖口。**下场照旧，距离 ?。**"),
      s2choice("s2-chenchenlan-road-hook", "兵器还在手里你就上", "你先靠近，那人的刀还握着，钩子擦空。**下一程多 X 人。**"),
    ],
  },
  {
    id: "s2-lishuangxing-meet",
    pack: "meet",
    mateId: "lishuangxing",
    title: "纸上的血",
    lead: "梁山后寨的账桌上，厉霜行把一叠纸按着，纸角的血还湿。他先看血渗进了哪一行字，才把腰上的刀抽出来半寸。门外的人等着拿货，货箱搁在门槛外。空刀鞘堆在桌边，鞘里没有刀。你站在门缝外，看见纸、血、半寸刀光。他把刀又收回去，等纸上的血再洇开一点。洇开之后，他的刀才全离开鞘。",
    choices: [
      s2choice("s2-lishuangxing-stay", "等血洇开再看刀", "纸角又洇深一圈，他的刀这才全出鞘。**下一程多 X 人。**"),
      s2choice("s2-lishuangxing-leave", "离开后寨", "后寨的门在身后合上，纸还按在他掌下。**换城，下场照旧，伤 ?。**"),
      s2choice("s2-lishuangxing-market", "把纸换成的货送去帘后", "货箱抬过门槛，帘缝里灯亮着。**去黑市。外功、淬刃这一摊开，价是 ?。**", { openMarket: true }),
    ],
  },
  {
    id: "s2-lishuangxing-road",
    pack: "road",
    mateId: "lishuangxing",
    title: "路上仍等血印",
    lead: "路上厉霜行遇到伤，仍先看血印，再决定刀出多少。你走在侧后，看见他用指腹去按别人袖上的血，按完才握刀。血印还浅的时候，他的刀不出鞘。血印深的时候刀出半寸，半寸就停。有人要他快，他的眼睛还在血上，不在那人的嘴上。你的袖口若有血，他会先看你的袖。看完他才继续走，刀仍在鞘里。这一段路的节奏跟血印走，不跟人的催声走。",
    choices: [
      s2choice("s2-lishuangxing-road-wait", "让他看完血印", "他的指腹离开你的袖，刀还在鞘里。**下场照旧，伤 ?。**"),
      s2choice("s2-lishuangxing-road-cut", "不等血印你先出刀", "你的刀先出，旁边看热闹的人围上来。**下一程多 X 人。**"),
    ],
  },
  {
    id: "s2-fubishan-meet",
    pack: "meet",
    mateId: "fubishan",
    title: "人撞上墙",
    lead: "济南药铺外的墙上有新的肩印，傅壁山把一个人推得肩撞上墙，墙把那人弹回半步。他这才伸手去扶，手扶在肋上。伤者的呼吸在弹回来的时候稳了一点。墙根的灰被肩印擦开，露出底下的砖。你站在街口，看见墙、肩印、他扶着的手。对街赌棚的灯亮着，他没有朝灯看。药包还夹在他肘弯里，等扶稳了才打开。",
    choices: [
      s2choice("s2-fubishan-stay", "帮他把人扶离墙", "肩离开墙，呼吸还在，药包这才打开。**下一程照旧，伤 ?。**"),
      s2choice("s2-fubishan-leave", "离开这堵墙", "你走开，肩印留在墙上，他的手还扶着。**换城，下场照旧，伤 ?。**"),
      s2choice("s2-fubishan-wager", "对街进赌棚", "你朝亮着的灯走，他仍扶着墙边的人。**进赌馆。单注最高当前彩金 80%。**", { openWager: true }),
    ],
  },
  {
    id: "s2-fubishan-road",
    pack: "road",
    mateId: "fubishan",
    title: "路上仍把人推到能靠住的墙边",
    lead: "路上傅壁山遇到站不稳的人，会把人推到车辕、树干、墙根，推到有东西接住再松手。你走在旁边，看见被推的人先晃，晃完才站直。他的手离开之后还会在原处停一秒，停的是看呼吸。药包仍夹在肘弯，不到呼吸稳了不打开。有一次树皮上留下肩印，肩印和药铺那堵墙上的一样深。你没有被他推过，你的肩是干的。他看你走路稳不稳，看的是步子，看完才继续往前。",
    choices: [
      s2choice("s2-fubishan-road-lean", "让他把人靠稳再走", "树干接住那个人，呼吸稳了，药包才开。**下场照旧，伤 ?。**"),
      s2choice("s2-fubishan-road-pull", "把人从树边拉开", "你把人拉开，那人又晃，旁边有人喊。**下一程多 X 人。**"),
    ],
  },
  {
    id: "s2-duguposui-meet",
    pack: "meet",
    mateId: "duguposui",
    title: "草上的圈还在",
    lead: "废院里独孤破岁练剑，剑风把草压出一圈，圈边的草还没有弹起来。墙根的名帖被风掀起一角，字还湿。他的步子避开地上缺的砖，剑尖仍对着院门。门外有人伸长脖子看，看的是剑尖，人没有进院。你进门时草上的圈还在，新的一剑又把圈压得更圆。名帖还摊在墙根，没有被他收起来。剑每落一次，土就多一条细印。",
    choices: [
      s2choice("s2-duguposui-stay", "在圈外看他练完这一轮", "草上的圈又圆了一分，剑尖仍对着门。**下场照旧，破绽 ?。**"),
      s2choice("s2-duguposui-leave", "退出废院", "院门在身后合上，草上的圈还在。**换城，下场照旧，伤 ?。**"),
      s2choice("s2-duguposui-intel", "看墙根那叠湿帖", "帖上的字还湿，他按着帖角让你把名字看清。**花 ? 彩金，换下两程人名。**", { intel: true }),
    ],
  },
  {
    id: "s2-duguposui-road",
    pack: "road",
    mateId: "duguposui",
    title: "路上的剑风还不散",
    lead: "离开废院，独孤破岁的剑不收干净。他走出几步，袖风还把路边的草压着，压过的草要过一会儿才起来。你走在后面，能看见一串短短的草伏。名帖他夹在肘里，帖角仍湿，湿字有时印到他的袖上。遇到人，他先让剑尖在身侧停住，停住的时候草也不动。有人要从他剑尖前过，他的步子让开，剑尖带着草继续伏着。你跟着这些伏下的草走，草把路标了出来。",
    choices: [
      s2choice("s2-duguposui-road-follow", "顺着伏下的草走", "草还没弹起，你的脚踏在伏倒的那一串上。**下场照旧，破绽 ?。**"),
      s2choice("s2-duguposui-road-cross", "从他剑尖前横穿", "你横步穿过剑尖，草被你踩起来，旁边的人停住。**下一程多 X 人。**"),
    ],
  },
  {
    id: "s2-gongsunsizhang-meet",
    pack: "meet",
    mateId: "gongsunsizhang",
    title: "再远的一截",
    lead: "官道长坡上，公孙四丈把枪杆拄着，枪头对着来路。对面的人站住之后，他又把枪往自己这边收了半寸，人没有跟着上前，空处因此更宽。坡下的货盖着席，席角被风掀开。收货的人蹲着数箱，数到一半看枪头。你停在坡下，货摊在你和枪之间。他看你一眼，枪没有收回去。辙印到他脚下就断，断口的土是新的。",
    choices: [
      s2choice("s2-gongsunsizhang-stay", "停在更远的那一截外", "你停在货摊外侧，枪前的空又宽了一掌。**下场照旧，距离 ?。**"),
      s2choice("s2-gongsunsizhang-leave", "自己走", "你离开长坡，枪头仍对着来路，席下的货留着。**换城，下场照旧，伤 ?。**"),
      s2choice("s2-gongsunsizhang-market", "把席下的货送去帘后", "席角掀开，帘缝里灯亮着，枪还拄在坡上。**去黑市。外功、淬刃这一摊开，价是 ?。**", { openMarket: true }),
    ],
  },
  {
    id: "s2-gongsunsizhang-road",
    pack: "road",
    mateId: "gongsunsizhang",
    title: "路上仍再远一截",
    lead: "公孙四丈走路时，和旁边的人总隔着一截能放下枪的空。你若贴上来，他会把枪横到你和他自己之间，横完空又回来。这段路上的人想并肩，并肩到一半就分开。枪杆上有长坡的泥，泥点到你的袖，是你曾经靠得太近。他不说话，空处自己在说明。坡下那种席角的风没有了，有的是路边的尘。尘在空处里打转，打转的那圈土上没有靴印。你走在空处外侧，枪尖平稳。",
    choices: [
      s2choice("s2-gongsunsizhang-road-far", "保持这一截空", "尘还在空处里转，你的袖不再碰到枪杆。**下场照旧，距离 ?。**"),
      s2choice("s2-gongsunsizhang-road-near", "挤进这一截空", "你挤进去，枪杆横到你胸前，路边的人停步。**下一程多 X 人。**"),
    ],
  },
  {
    id: "s2-fengtang-meet",
    pack: "meet",
    mateId: "fengtang",
    title: "先让队停住",
    lead: "徐州闸口，封堂把棍压在木杠上，过闸的人把铜钱按在匣沿。他先看队伍停不停得住，停住了才谈让谁过去。后面又排上两个人，路条被汗洇开。木杠上有新的压痕，压痕里嵌着泥。你站在队尾，看见杠、棍、一溜停住的肩。他的眼睛看着下一条路条，不看着钱堆得多高。队一旦停，闸口的风都小了。棍没有抬起来，队里的人就先不敢挤。",
    choices: [
      s2choice("s2-fengtang-stay", "在队尾等他把队停稳", "队停住，棍这才抬起一寸，路条从杠下递过去。**下场照旧，站位 ?。**"),
      s2choice("s2-fengtang-leave", "从队尾离开", "你离开闸口，队还停着，匣沿上的钱还在。**换城，下场照旧，伤 ?。**"),
    ],
  },
  {
    id: "s2-fengtang-road",
    pack: "road",
    mateId: "fengtang",
    title: "路上仍先让人停",
    lead: "离开闸口，封堂遇到挤在一起的人，仍先用棍把地面点一下，点完人就慢。你走在他侧后，看见慢下来的肩一排排出现。他很少先谈谁对谁错，先让脚停住。脚停住之后，才有人把话说完。棍尖上的泥是闸口的，泥还湿。有人想从他棍侧挤过去，挤到一半自己停。你的步子也被他点地的声音带慢。慢下来的这段路上，没有人摔倒。他看的是队形，看完才继续走。",
    choices: [
      s2choice("s2-fengtang-road-stop", "跟着把脚停住", "你的脚停在他点过的泥点旁边，前面的肩也不再挤。**下场照旧，站位 ?。**"),
      s2choice("s2-fengtang-road-push", "从队侧挤过去", "你挤出队侧，后面的人跟着挤。**下一程多 X 人。**"),
    ],
  },
  {
    id: "s2-ouyangyingou-meet",
    pack: "meet",
    mateId: "ouyangyingou",
    title: "先卸了舱里的货",
    lead: "扬州夜航的船灯下，欧阳饮钩先看舱里的箱子封条动没动，再把钩子靠近船舷上的人。那人的刀已经放在舱板上，手空着。岸上有人喊开盅，骰盅扣在船板上。他的钩尖没有先去腕，先在封条的缝上停了一停。你踏上跳板，看见箱、空着的手、扣着的盅。封条上的墨还湿，湿墨蹭到箱角。他确认刀离了手，钩子这才抬高。灯把他的半边脸照着，另半边在货影里。",
    choices: [
      s2choice("s2-ouyangyingou-stay", "等刀离手再靠过去", "刀还在舱板上，他的钩这才抬到那人腕侧。**下场照旧，伤 ?。**"),
      s2choice("s2-ouyangyingou-leave", "离船", "你退回岸上，封条还在，骰盅仍扣着。**换城，下场照旧，伤 ?。**"),
      s2choice("s2-ouyangyingou-wager", "上船看扣着的盅", "你靠近舱板，盅还扣着，他的钩仍停在封条上。**进赌馆。单注最高当前彩金 80%。**", { openWager: true }),
    ],
  },
  {
    id: "s2-ouyangyingou-road",
    pack: "road",
    mateId: "ouyangyingou",
    title: "路上仍先看兵器离手",
    lead: "下了船，欧阳饮钩遇到人，仍先看兵器在不在手里，在手里他就走在外侧，离了手钩才从袖里出来。你走在内侧，看见他的眼睛在别人腰间停得比在脸上久。有人把刀交给同伴，他的肩这才松下来。钩尖上没有新血，有船板的木屑，木屑是夜航带来的。你的手若按着自己的刀，他会多隔开半步。半步里是夜风，风里带着潮气。",
    choices: [
      s2choice("s2-ouyangyingou-road-empty", "先把刀放下", "你的刀放在脚边，他的钩从袖里出来，停在你腕侧。**下场照旧，伤 ?。**"),
      s2choice("s2-ouyangyingou-road-keep", "刀还握着往前走", "你握着刀靠近，他多隔开半步，旁边的人回头。**下一程多 X 人。**"),
    ],
  },
  {
    id: "s2-wager-enter",
    pack: "wager",
    title: "盅还扣着",
    lead: "赌馆里骰盅扣在桌上，盅沿压着一张筹码，筹码的边被手汗浸暗。围着的人把下巴凑近，没有人先揭盅。你的钱袋放在桌边，袋口还系着。庄家的手指停在盅顶，停着，等你的手。灯从梁上照下来，照见桌面上旧的划痕。划痕里嵌着以前留下的铜钱灰。你的手还没有碰到桌上的筹码。",
    choices: [
      s2choice("s2-wager-push", "把注推上去", "筹码推进盅沿，你的钱袋轻了一截。**进赌馆。单注最高当前彩金 80%，这一把输赢 ?。**", { openWager: true }),
      s2choice("s2-wager-lose", "注已经在盅下", "注压在盅下，庄家的手指终于离开盅顶。**注额不退，袋里剩下 ?，可能挨到复活线。**"),
      s2choice("s2-wager-hands", "手离开桌子", "你的手从桌边拿开，筹码还在原处，围着的人把下巴收回去。**这一把不押，袋里彩金不动，剩下 ?。**"),
    ],
  },
  {
    id: "s2-wager-win",
    pack: "wager",
    title: "盅开了",
    lead: "骰盅揭开，桌面上的点数对着灯，围着的人先安静了一息。庄家把筹码往你这边拨，拨过来的时候碰到你的腕。你的钱袋重新鼓起一截，鼓起的幅度没有人用嘴报出来。刚才扣盅的手指已经收了回去。桌上的旧划痕被新的铜钱盖住一角。有人在你肩后吸了一口气，气喷在你的后颈。你还坐在凳上，盅盖扣在一边。",
    choices: [
      s2choice("s2-wager-win-take", "把赢的收进袋", "筹码落进袋口，袋绳重新系上。**赢的彩金是 ?，单注仍不超过当前彩金 80%。**"),
      s2choice("s2-wager-win-stay", "让筹码留在桌上", "筹码还在你腕边，庄家又把盅扣上。**下一把仍是赌馆，输赢 ?。**", { openWager: true }),
    ],
  },
  {
    id: "s2-wager-bust",
    pack: "wager",
    title: "注飞了",
    lead: "骰盅揭开，点数停在另一面，庄家把你的筹码拨回去。钱袋瘪下去，瘪到袋底的缝能看见桌。围着的人把身体让开一条道，道对着门口。你的手还按在刚才放筹码的位置，位置已经空了。灯没有变，变的是桌边没有你的铜钱。有人在数你袋里剩下的，数得很慢。你坐着，复活赛的门在堂侧开了一条缝。",
    choices: [
      s2choice("s2-wager-bust-sit", "还坐着看袋底", "袋底的缝对着灯，剩下的彩金是 ?。**注额不退，挨到复活线与否是 ?。**"),
      s2choice("s2-wager-bust-door", "朝堂侧那条缝走", "你站起来，堂侧的门缝里有人在等重打的人。**下一程若赊账重打，这一把禁注，剩下的彩金是 ?。**"),
    ],
  },
  {
    id: "s2-wager-fold",
    pack: "wager",
    title: "手离开盅",
    lead: "你的手离开桌面，筹码没有推进去，骰盅仍扣着。庄家把下巴收回去，围着的人重新看盅，不再看你。钱袋还是进来时那个重量，袋绳没有松。桌上的划痕露出来，没有被新的铜钱盖住。你把凳子往后挪了一寸，挪完能看见门口。门口的风进来，把盅边的灰吹动一点。这一把到此，盅里的点数还没有人知道。",
    choices: [
      s2choice("s2-wager-fold-go", "从门口出去", "你走到门口，身后的盅还扣着。**这一把不押，袋里彩金不动，下场照旧。**"),
      s2choice("s2-wager-fold-watch", "在门口再看一眼", "你停在门口，庄家的手又放到盅顶上，等下一个人。**不押，下一程伤 ?。**"),
    ],
  },
  {
    id: "s2-market-look",
    pack: "market",
    title: "帘缝里的灯",
    lead: "黑市的帘子掀开一条缝，缝里的灯照见两样东西：一卷外功抄本，一截淬过的刃。抄本的边发毛，刃上有新的油。看货的人蹲在帘内，手指点在抄本上，点完又点刃。你站在缝外，能看见货，看不见价牌。价牌扣在摊主掌心，牌面朝下。摊上还有空位，空位上没有第三样货。灯芯跳了一下，刃上的油光跟着跳。",
    choices: [
      s2choice("s2-market-open", "把帘子再掀开些", "缝变宽，价牌仍在摊主掌心。**去黑市。外功、淬刃开着，价是 ?，有没有好货是 ?。**", { openMarket: true }),
      s2choice("s2-market-walk", "让帘子落回去", "帘子落下，灯变成一条细缝。**这一摊先不进，价仍是 ?。**"),
    ],
  },
  {
    id: "s2-market-haggle",
    pack: "market",
    title: "价牌还在掌心",
    lead: "你已经进了帘内，摊主把价牌在掌心翻了一面，又翻回去。外功抄本和淬刃还在原处，没有被人拿走。你伸出的手停在抄本边，没有碰到。摊主看着你的钱袋，袋口的绳松着一圈。灯把两个人的手影叠在货上。有人在帘外咳嗽，咳嗽完没有进来。价还没有说出口，屋里听见的是灯芯的声音。",
    choices: [
      s2choice("s2-market-haggle-ask", "问他掌心的价", "价牌终于翻向你，上面的数你先别记死。**黑市价是 ?，买不买下一句再说。**", { openMarket: true }),
      s2choice("s2-market-haggle-pass", "手收回来", "你的手离开抄本边，价牌又扣回掌心。**这一样不买，袋里彩金不动。**"),
    ],
  },
  {
    id: "s2-market-leave",
    pack: "market",
    title: "帘子放下",
    lead: "你退到帘外，摊主把帘子放实，灯缝消失。外功和淬刃都留在帘内，你的钱袋仍是进来时的重量。巷里的风比帘内冷，冷在脸上。刚才蹲着看货的人没有跟出来。你在巷口站了一息，巷口没有第二盏那样的灯。靴底的灰是帘内带出来的，灰还在。这一摊到此，下一程的货摊可以是关着的。",
    choices: [
      s2choice("s2-market-leave-shut", "让这一摊黑市关着", "你走远，身后没有灯缝。**这一摊黑市关着，下场照旧。**", { skipMarket: true }),
      s2choice("s2-market-leave-note", "把看见的货记住", "抄本和刃还在你脑子里，价仍是未知。**不买，下一程货是 ?。**"),
    ],
  },
  {
    id: "s2-revive-road",
    pack: "revive",
    title: "躺下之后",
    lead: "你躺在石台边上，血从肋下延伸到格子的缝里。刚才还站着的人蹲下来，手停在你肩上，没有立刻把你拖走。灯还是打的时候那盏，照见你的眼睛还睁着。袋里的彩金散了一角在地上，没有人去捡。堂侧有一扇门开着，门里是重打的空地。蹲着的人说了一句你的伤，句子里的数先空着。你的手指还能动，动的是想抓刀，刀在半尺外。",
    choices: [
      s2choice("s2-revive-up", "朝那扇门看", "门里的空地扫过，有人在等你站起来再打。**若赊账重打，状态拉满，这一把禁注，剩下的彩金是 ?。**"),
      s2choice("s2-revive-stay", "还躺着", "你的肩仍在他手里，血还在延伸。**伤是 X。这一程可以在这里停。**"),
    ],
  },
  {
    id: "s2-revive-rematch",
    pack: "revive",
    title: "重打之前",
    lead: "你站回空地中央，肋上的血被擦过，人还是刚才那个人。对面的人把兵器重新握好，握法和上一场开始时一样。骰盅不在场边，场边有人把盅收进袖里。你的钱袋系紧，系紧是因为这一把不能再往外掏注。灯重新拨亮，亮到能看见对面那人靴上的旧血。你的呼吸已经匀了，匀的是重打前的那几息。没有人再提刚才躺下的格子。刀在你手里，掌心是干的，干得能握紧。",
    choices: [
      s2choice("s2-revive-rematch-go", "重新开打", "兵器举起来，盅仍在别人袖里。**复活赛禁注。伤从满状态再算，数字是 ?。**"),
      s2choice("s2-revive-rematch-look", "先看他的起手", "你看着他的兵器，他看着你的脚。**禁注，先机 ?。**"),
    ],
  },
  {
    id: "s2-fork-burn",
    pack: "fork",
    title: "炭格边的粥棚",
    lead: "灼烧格还在冒烟，烟旁边就是周暖香的粥棚，棚柱上沾着炭灰。脚夫的手腕缠着布，布上有新的焦边。对街赌棚的人把工钱条子举着，条子几乎要伸进烟里。你站在炭与棚之间，靴底已经有一点黑。周暖香的勺停在半空，她在看你的脚会踩向哪边。烟里还有一个讨债的影子，影子没有走出格子。",
    choices: [
      s2choice("s2-fork-burn-shed", "把脚夫扶进棚里", "你把他扶离冒烟的格子，粥勺这才落下。**灼烧格还在，下一程是棚里的事，伤 ?，赌馆不开。**"),
      s2choice("s2-fork-burn-wager", "接过条子进赌棚", "条子到你手里，周暖香把勺扣回锅上。**进赌馆。单注最高当前彩金 80%。她留在棚里。**", { openWager: true }),
      s2choice("s2-fork-burn-hunt", "把讨债的影子引出烟", "你朝烟里走了一步，影子跟着出来，棚里的人退回柱后。**下一程多 X 人。这一摊黑市关着。**", { skipMarket: true }),
    ],
  },
  {
    id: "s2-fork-wall",
    pack: "fork",
    title: "没有墙的码头",
    lead: "这一场格后没有墙，风从空处直吹到徐州码头的跳板上。陈沉缆蹲在缆边，钩子还没有扣死。甲板上的刀已经卸下，刀主的手空着。岸上的帘缝里有灯，灯下堆着能抬走的货箱。你站在没有墙的格子上，背是空的。船工还在喊开船，喊声被风切成几截。三条走法都摆在跳板、空背、帘缝之间。",
    choices: [
      s2choice("s2-fork-wall-rope", "等刀卸稳再扣缆", "钩子扣死缆结，船上的人退了半步，帘缝没人去。**无墙场还在，下一程跟缆走，黑市不开，距离 ?。**"),
      s2choice("s2-fork-wall-market", "把卸下的货送进帘缝", "货箱抬向灯，陈沉缆的钩子停在半空。**去黑市，外功与淬刃开着，价 ?，人留在跳板上。**", { openMarket: true }),
      s2choice("s2-fork-wall-cut", "砍断缆从空处离开", "缆落进水，你从没有墙的那一侧走开。**这一摊黑市关着，下一程多 X 人，无墙场不带进下一程。**", { skipMarket: true }),
    ],
  },
  {
    id: "s2-fork-gap",
    pack: "fork",
    title: "缺口前的闸",
    lead: "石台末端空了一格，空处对着徐州闸口的木杠。封堂把棍压在杠上，队在缺口前停住，没有人把脚迈进没有板的土。匣沿上的铜钱堆着，堆到可以改去向。你站在缺口这边，看见杠、空土、一溜停住的肩。后面的人还在挤，挤到你背上。风从缺口灌上来，灌到封堂的裤脚。三条走法都在这一截空前面。",
    choices: [
      s2choice("s2-fork-gap-wait", "跟他停在缺口前", "你的脚停在空土边上，棍抬起一寸，队仍不挤。**末端缺格还在，下一程跟闸走，赌馆不开，空多少 ?。**"),
      s2choice("s2-fork-gap-wager", "把匣沿的钱改去赌馆", "铜钱离开匣沿，封堂的棍没有抬。**进赌馆。单注最高当前彩金 80%。队还停在缺口前。**", { openWager: true }),
      s2choice("s2-fork-gap-rush", "从缺口硬闯", "你的靴底砸在空处的土上，后面的人跟着跳。**下一程多 X 人。这一摊黑市关着。**", { skipMarket: true }),
    ],
  },
];

function currentStory2(run: Pick<GauntletRun, "storyFlags">): Story2Page | undefined {
  const id = [...(run.storyFlags ?? [])].reverse().find((f) => f.startsWith("s2page:"))?.slice("s2page:".length);
  return id ? STORY2_PAGES.find((p) => p.id === id) : undefined;
}

function applyStory2Choice(flags: string[], choice: EncounterChoice, next: GauntletRun): { flags: string[]; next: GauntletRun } {
  const meta = STORY2_META[choice.id];
  if (!meta) return { flags, next };
  let f = flags.filter((x) => !x.startsWith("s2page:") && !x.startsWith("envpage:"));
  if (meta.next) f.push(`s2page:${meta.next}`);
  if (meta.env) f.push(`envtag:${meta.env}`);
  if (meta.clearEnv) f.push("envtag-off");
  const label = meta.env ? ENV_TAG_LABEL[meta.env] : undefined;
  const note = label
    ? next.lastEncounterNote?.includes(label)
      ? next.lastEncounterNote
      : [next.lastEncounterNote, label].filter(Boolean).join(" · ")
    : next.lastEncounterNote;
  return { flags: f, next: { ...next, lastEncounterNote: note } };
}

/** 同道事页、赌馆黑市复活、分叉链都从这里打开。不预排，不在第一程自动进赌馆。 */
export function offerStory2Page(run: GauntletRun, pageId: string): GauntletRun {
  const page = STORY2_PAGES.find((p) => p.id === pageId);
  if (!page) return run;
  const flags = (run.storyFlags ?? []).filter((f) => !f.startsWith("s2page:") && !f.startsWith("envpage:"));
  flags.push(`s2page:${page.id}`);
  return { ...run, storyFlags: flags, storyPending: "choice", storyGuest: undefined };
}

export type Story3Pack = "intel" | "bond" | "group" | "grudge" | "job" | "open";

export interface Story3Page {
  id: string;
  pack: Story3Pack;
  title: string;
  lead: string;
  choices: EncounterChoice[];
}

export interface Story3Meta {
  next?: string;
}

export const STORY3_META: Record<string, Story3Meta> = {
  "s3-stake-stay": { next: "s3-stake-advance" },
  "s3-read-stay": { next: "s3-read-advance" },
  "s3-dice-stay": { next: "s3-dice-advance" },
  "s3-shade-stay": { next: "s3-shade-advance" },
};

function s3choice(id: string, title: string, blurb: string, extra: Partial<EncounterChoice> = {}): EncounterChoice {
  return { id, title, blurb, risk: extra.openWager || extra.openMarket ? "rich" : "safe", storyFlag: id, ...extra };
}

/** 买到或听到的那一句。伤、段、窗长都是占位。 */
export const INTEL_SAMPLES: { id: string; kind: "feint" | "rage" | "coach"; text: string }[] = [
  { id: "intel-feint-a", kind: "feint", text: "下一场那人先把肩沉成进的样子，手臂伸直时肩又抬成守。你看见的第一下会换，换过之后的伤仍是 ?。" },
  { id: "intel-feint-b", kind: "feint", text: "他有一次把退步亮给你，脚停在原地，真正迈出的是进。这一场过后，这条记在他名下，下一次你再看见退，先等手臂。" },
  { id: "intel-rage-a", kind: "rage", text: "他的血落到一条线以下，出手的段变密，密出来的段数是 X。线画在哪，条子上留白。" },
  { id: "intel-rage-b", kind: "rage", text: "连续挨过 X 下之后，他的肩不再收回，下一记比前面重。重出来的那一截伤是 ?。" },
  { id: "intel-coach-a", kind: "coach", text: "下一场那人袖里还有一记。你把同一招连用，他的手会从袖里插进来，插进来的那一下有多长是 ?。" },
  { id: "intel-coach-b", kind: "coach", text: "茶客把这种人叫教头。他守着你的重复，重复到第 ? 次，他的插入会落到你的腕上。" },
];

/** 初识、同路、生死各一句，给闪句用。 */
export const BOND_STAGE_LINES = {
  meet: "两个人的靴印还隔着一肩，同一件事刚做完第一遍，挂上的那一点是基线。",
  road: "肩并上了，同一件事做第二遍，幅度往上走，往上多少是 ?。",
  life: "有一个人在这一场倒下过，活着的那个把换人之后的一刀递到你手里，这一刀随两人当时的兵器。",
} as const;

export const STORY3_PAGES: Story3Page[] = [
  {
    id: "s3-tea-bowl",
    pack: "intel",
    title: "碗沿上的半句",
    lead: "州桥茶摊的碗还烫，掌柜用勺沿点着街对面那个人的肩。肩往下沉，他嘴里吐出半个字，字落在进上。邻桌两个人把耳朵侧过来，茶沫粘在唇上。你的碗扣着，扣着就听不见后半句。柜上压着一张条子，条子上写着下一馆的地名。掌柜看你的钱袋，看完把勺收回锅里。",
    choices: [
      s3choice("s3-tea-sit", "把碗翻开听完", "碗沿的热气扑到脸上，后半句补全，下一场偏进。**听全下一场的倾向，花 ? 彩金。**"),
      s3choice("s3-tea-walk", "扣着碗起身", "你把碗留在桌上，半句停在进上。**不听。下一程照旧，伤 ?。**"),
      s3choice("s3-tea-wrong", "坐到邻桌那一侧", "邻桌把你认成传话的人，茶沫溅到你袖上。**下一程多 X 人。**"),
    ],
  },
  {
    id: "s3-tea-wall",
    pack: "intel",
    title: "靠墙的位子",
    lead: "茶馆靠墙的位子空着一张，墙上的灰被肩膀磨出一块浅印。坐在那里的人说话压得很低，低到你要侧过脸才听见守。守这个字他说了两遍，第二遍看了一眼门外。门外有人练推手，推完就停，停的样子和屋里说的对得上。你的茶已经凉了半碗，凉意停在唇上。掌柜不过来添水，他在等你决定坐不坐这张椅子。",
    choices: [
      s3choice("s3-tea-wall-sit", "坐上这张椅子", "浅印贴上你的肩，守这个字听完整。**听全下一场的倾向，花 ? 彩金。下一场偏守。**"),
      s3choice("s3-tea-wall-out", "去门外看推手", "你走出门，推手的人已经散了，屋里的半句留在椅背上。**不听。下一程照旧，伤 ?。**"),
    ],
  },
  {
    id: "s3-tea-night",
    pack: "intel",
    title: "夜茶补后半句",
    lead: "夜茶的灯比白天矮，掌柜把白天没说完的半句写在一张湿纸上。湿纸扣在壶底，壶壁还是温的。你要看，他先用两根手指按住纸角。纸角上的字是退，退字旁边还有一个没干的点。点干了才算一句完整的话，话才算听全。门外的夜风把灯吹得跳，跳的时候纸上的字一明一暗。你的手停在壶边，没有按下去。",
    choices: [
      s3choice("s3-tea-night-pay", "按他要的数看纸", "纸角松开，退字和旁边的点都看见了。**听全下一场的倾向，花 ? 彩金。下一场偏退。**"),
      s3choice("s3-tea-night-leave", "让纸留在壶底", "你的手离开壶，湿纸仍扣着。**不听。下一程照旧，伤 ?。**"),
    ],
  },
  {
    id: "s3-slip-paper",
    pack: "intel",
    title: "折好的条子",
    lead: "黑市帘内的摊上放着一张折好的条子，折缝压得很死。摊主用指节敲了敲折缝，敲完才说话。他说条子里是下一场那人会亮的招，招名先空着，空着的格子有多少先写成 ?。你看见格子，看不见里面的字。灯把折缝照出一条发白的边。摊主的另一边手按在你的钱袋上，按着，等你点头。帘外有人咳嗽，咳嗽完没有进来。",
    choices: [
      s3choice("s3-slip-buy", "让他把折缝打开", "折缝松开，格子里的字填上，填上多少先记成 ?。**底细买下，花费当前彩金的 ?。**", { openMarket: true }),
      s3choice("s3-slip-walk", "手从钱袋上拿开", "你的钱袋离开他的手，条子仍折着。**不买，下一程照旧，伤 ?。**"),
      s3choice("s3-slip-follow", "把条子抢到手里", "折缝在抢的时候裂开一角，摊主从帘内跟出来。**下一程多 X 人。底细没有买成。**"),
    ],
  },
  {
    id: "s3-slip-box",
    pack: "intel",
    title: "匣子里的招名",
    lead: "第二摊把条子换成一口小匣，匣盖扣着，扣缝里露出纸边。纸边有墨，墨是刚刚磨开的。摊主说匣里是同一场的全份，份数仍是 ? 张。你把匣子抱起来，分量比一张纸重。帘内另一个人看着你的手，看着，不说话。灯跳了一下，扣缝里的墨更清楚。你的手还没有揭开这口匣盖。",
    choices: [
      s3choice("s3-slip-box-open", "揭开匣盖", "纸边展开，招名排成一列，列有多长是 ?。**底细在手，花费当前彩金的 ?。**"),
      s3choice("s3-slip-box-back", "把匣子放回摊上", "匣盖仍扣着，墨留在缝里。**不买，下一程照旧，伤 ?。**"),
    ],
  },
  {
    id: "s3-slip-blood",
    pack: "intel",
    title: "用伤换的底",
    lead: "这一摊不收钱袋，收你袖口上的血。摊主用布在你腕上按一下，按出的印子深浅他自己看。印子够了，他才把折好的条子递过来。条子上仍是下一场的招，招的数量是 ?。你的腕还在渗，渗出的那一点他用指头抹掉。帘内有一盆水，水已经红了边。他看着你的脸，等你把腕伸过去还是收回去。",
    choices: [
      s3choice("s3-slip-blood-give", "把腕伸过去", "布按实，条子到你手里，腕上的伤是 X。**底细换到。花费是伤 X。**"),
      s3choice("s3-slip-blood-back", "把腕收回袖里", "印子没有按成，条子留在他掌心。**不换。下一程照旧，伤 ?。**"),
    ],
  },
  {
    id: "s3-fatal-price",
    pack: "intel",
    title: "高价的一句",
    lead: "黑市最里面的桌点着一盏灯，灯下是一张不折的纸。纸上写着下一场的墙在哪一侧，写着那人袖里有没有插入的手，写着他怕不怕贴身。字都在，数字的那一格空着。摊主把价说得很慢，慢到你能听见自己的钱袋。这句比折缝里的条子贵，贵多少是当前彩金的 ?。你的手停在纸边，纸边有一圈油。油是别人的手指留在纸边上的。",
    choices: [
      s3choice("s3-fatal-pay", "按他说的价把纸拿走", "纸离桌，墙的一侧和袖里的手都在纸上。**命门买下，花费当前彩金的 ?。**"),
      s3choice("s3-fatal-no", "让纸留在灯下", "你的手收回来，油圈还在。**不买，下一程照旧，伤 ?。**"),
    ],
  },
  {
    id: "s3-fatal-win",
    pack: "intel",
    title: "赢档之后的话",
    lead: "赌馆这一档你赢了，筹码还堆在你腕边，庄家没有马上收盅。他把一张纸条压在筹码下面，压着，等你把筹码推开。纸条上是下一场的墙、袖里的插入、怕贴身的那一句。围着的人往后退了半步，退开是为了看你揭不揭。灯照着纸条的一角，一角已经能看见墙字。庄家的手指仍按着纸条中段。你还坐在赢下的这把位子上。",
    choices: [
      s3choice("s3-fatal-read", "把筹码拨开看纸条", "墙字露全，袖里的手和怕贴身的一句也露全。**命门在这一档赢来的话里。单注仍不超过当前彩金 80%。**"),
      s3choice("s3-fatal-again", "筹码留着再押一档", "纸条仍压着，盅又扣上。**再进赌馆。单注最高当前彩金 80%，这一档的话先不拿。**", { openWager: true }),
      s3choice("s3-fatal-pocket", "把筹码收进袋", "你收筹码，纸条被庄家抽回去。**命门不拿。袋里加上这一档的 ?。**"),
    ],
  },
  {
    id: "s3-bond-yeshuang",
    pack: "bond",
    title: "夜巷里的血纸",
    lead: "沈夜行的短刀还对着墙缝，缝外站着厉霜行，他掌下按着一叠带血的纸。纸角的血和墙缝里的灰沾在一起。沈夜行先看缝，厉霜行先看血，两个人的眼睛没有交会。你站在两人中间，短刀的光擦过纸边。巷口的灯灭着，灭着的那一截刚好照不见他们的脸。纸上的字被血粘住，刀背还停在缝口。",
    choices: [
      s3choice("s3-bond-yeshuang-stay", "让刀背和血纸碰到一起", "刀背离开缝，纸角的血印上一条灰。**两人同行。下一程裂创相关的幅度是 ?。**"),
      s3choice("s3-bond-yeshuang-split", "把纸从刀边拿开", "你把纸抽走，厉霜行跟着纸，沈夜行留在缝前。**下一程少一人。来的人多 X。**"),
    ],
  },
  {
    id: "s3-bond-wenbu",
    pack: "bond",
    title: "粥勺和药拳",
    lead: "周暖香的粥还热，白孟和的拳停在同一个脚夫的肋上。她先看布挡不挡得住血，他先按骨，两双手叠在同一处伤上。粥的热气扑到药粉上，药粉结了一小块。脚夫的呼吸顶着两个人的手。你在棚外看见勺、拳、同一条布。对街的骰盅响了一下，两个人都没有抬头。布结最后是她绕的，他按住结。",
    choices: [
      s3choice("s3-bond-wenbu-stay", "让两双手都留在肋上", "布绕紧，拳还按着，粥勺搁回锅沿。**两人同行。收势时回的血是 ?。**"),
      s3choice("s3-bond-wenbu-split", "把粥碗端开", "碗离开桌，周暖香跟着碗走，拳还留在肋上。**下一程少一人。伤 ?。**"),
    ],
  },
  {
    id: "s3-bond-menzhuang",
    pack: "bond",
    title: "先踏稳的闸",
    lead: "章守山的木杠还横着，石万山先把脚踏进杠侧的泥里，踏稳了才看杠。两根棍，一根压杠，一根抵地。门外的队停住，停在两个人的脚都不再挪的时候。你站在队尾，看见两个新坑和匣沿上的钱。钟声从门里出来，两个人的肩都不跟着动。泥干在两双靴边的折纹里面。杠后那一小块地现在站着两个人。",
    choices: [
      s3choice("s3-bond-menzhuang-stay", "在两个坑之间站稳", "你的脚踏实，两根棍才同时抬起一寸。**两人同行。挡在地上的那一层厚 ?。**"),
      s3choice("s3-bond-menzhuang-split", "从泥路绕开一个人", "你把石万山往泥路一侧引，杠后剩下章守山一个人。**下一程少一人。来的人多 X。**"),
    ],
  },
  {
    id: "s3-bond-siyin",
    pack: "bond",
    title: "线头和卸下的刀",
    lead: "万俟晚的钩子扣着线头，线头从一口卸下的刀鞘底下伸出来。欧阳饮钩蹲在旁边，先看那把刀离没离手，离了才让钩靠近。刀躺在舱板上，拿刀的手是空的。线越收越短，刀鞘跟着挪了一寸。你站在跳板上，看见两枚钩，一枚收线，一枚停在袖侧。封条裂开一条缝，缝里没有血。船灯照着两个人的腕，腕上都有旧印。",
    choices: [
      s3choice("s3-bond-siyin-stay", "按住刀鞘让线收完", "线头绕上腕，另一枚钩这才碰到空着的袖。**两人同行。靠近之后回的血是 ?。**"),
      s3choice("s3-bond-siyin-split", "把刀踢回那人手里", "刀回到手里，欧阳饮钩退开，万俟晚的线还扣着。**下一程少一人。来的人多 X。**"),
    ],
  },
  {
    id: "s3-bond-shuangchi",
    pack: "bond",
    title: "两杆枪前的空",
    lead: "霍长川的枪前留着一段空地，公孙四丈又把这段空往外推了半寸。两杆枪尖之间没有人站上去。推车的人停在空处边上，车把放下来。你站在外侧，看见两截空，一截是退开的，一截是再远的。车辙到两双脚前都断成新土。尘在空处里打转，打转的那圈土上没有靴印。两个人都不说话，空处自己在变宽。",
    choices: [
      s3choice("s3-bond-shuangchi-stay", "停在两杆枪的外侧", "你不再往里踏，两杆枪尖保持着那截空。**两人同行。远距离的伤加成是 ?。**"),
      s3choice("s3-bond-shuangchi-in", "踏进两杆枪中间", "你踏进去，两杆枪同时横过来，推车的人喊了一声。**下一程多 X 人。两人分开。**"),
    ],
  },
  {
    id: "s3-bond-suisheng",
    pack: "bond",
    title: "鞘口和草圈",
    lead: "闻人笙的剑还在鞘里，独孤破岁的剑风把路边的草压出一圈。圈边的草还没有弹起来，鞘口对着这一圈。街口有人把刀碰了一下，闻人笙的肩先动，独孤破岁的剑尖在身侧停住。你站在圈外，看见肩、鞘、伏下的草。名帖夹在独孤破岁肘里，帖角的湿字映着剑穗。两个人没有对视，草和肩在同一拍上停。",
    choices: [
      s3choice("s3-bond-suisheng-stay", "等肩动、草也停", "肩先动，草上的圈不再扩大，两个人站在同一拍上。**两人同行。开场叠上的那一层是 ?。**"),
      s3choice("s3-bond-suisheng-cross", "从剑尖前横穿", "你穿过剑尖，草被踩起来，街口的人拔刀。**下一程多 X 人。两人分开。**"),
    ],
  },
  {
    id: "s3-bond-lieren",
    pack: "bond",
    title: "缺刃对着空架子",
    lead: "薄青把缺了一小截的剑按在布上，吕赤锋先把对面的刀架拆开，拆完才看这柄缺刃。缺处和空出来的那一格对在一条线上。你进门踩到铁屑，铁屑粘在两个人的靴上。问价的人还在门外，门外的刀鞘和架上缺的一格对得上。薄青的眼睛在缺处，吕赤锋的眼睛在架子上。两个人的刀都没有先落下来。砧上的血还没干到刀背那边。",
    choices: [
      s3choice("s3-bond-lieren-stay", "让缺处对准空格", "缺刃移到空格前，两个人同时点头。**两人同行。先撕开的挡是 ?，裂创再加 ?。**"),
      s3choice("s3-bond-lieren-split", "把剑从布上拿开", "你端起剑，薄青跟着剑，吕赤锋留在空架子前。**下一程少一人。来的人多 X。**"),
    ],
  },
  {
    id: "s3-bond-bian",
    pack: "bond",
    title: "肩印和退开的一步",
    lead: "傅壁山把人推得肩撞上墙，安岸火在墙根退开一步，退完枪尖才抬起来。肩印和退开的靴印隔着一掌宽的灰。被推的人呼吸稳了一点，枪前的空又长出一寸。你站在街口，看见墙、枪、同一双还在晃的脚。药包夹在傅壁山肘弯里，还没有打开。安岸火不解释这一步，空处自己留在枪前。墙根的灰被两个人的脚改过。",
    choices: [
      s3choice("s3-bond-bian-stay", "扶稳的同时把空处留下", "肩离开墙，枪前的空还在，两个人都没有往前补。**两人同行。撞上墙回的血是 ?，远一档的伤是 ?。**"),
      s3choice("s3-bond-bian-split", "把人从枪前拉开", "你把人拉开，安岸火的空被踩实，傅壁山的手还扶着。**下一程少一人。来的人多 X。**"),
    ],
  },
  {
    id: "s3-group-dao",
    pack: "group",
    title: "三把刀停在同一条血印上",
    lead: "沈夜行的短刀对着墙缝，吕赤锋把挡路的刀架拆开，厉霜行按着纸上的血。三把刀都没有先落下，落下之前他们在看同一条血印。血印从纸角连到墙缝，再连到空出来的刀架。你站在三人外侧，看见三截刀光停在同一高度。巷灯灭着一排，灭着的那一截刚好照见血，照不见脸。有人在巷尾咳嗽，三把刀同时偏了一寸。偏完又停回那条还湿的血印上。",
    choices: [
      s3choice("s3-group-dao-all", "让三把刀都留下", "三截刀光不再偏，血印上的灰被刀背拨开。**三人同场。裂创相关的幅度是 ?。**"),
      s3choice("s3-group-dao-two", "把血纸先拿开", "厉霜行跟着纸走，剩下两把刀还对着缝。**下一程少一人。来的人多 X。**"),
    ],
  },
  {
    id: "s3-group-zhang",
    pack: "group",
    title: "三双手按在同一处伤上",
    lead: "白孟和的拳按着肋，周暖香的布绕着同一处，傅壁山把人推到墙边扶稳了才伸手。三双手叠在一起，粥的热气、药粉、墙上的肩印都在。脚夫的呼吸顶着最上面的手。你在棚外看见勺、拳和那堵墙。对街骰盅响了一下，三个人都没有朝灯看。布结打好之后，三双手才一起离开。离开的时候伤者的眼睛是睁着的。",
    choices: [
      s3choice("s3-group-zhang-all", "让三双手都留到布结打完", "布结打完，三双手一起离开肋。**三人同场。收势回的血是 ?。**"),
      s3choice("s3-group-zhang-two", "把粥碗端走", "周暖香跟着碗离开，拳和扶墙的手还在。**下一程少一人。伤 ?。**"),
    ],
  },
  {
    id: "s3-group-jian",
    pack: "group",
    title: "三柄剑停在同一拍",
    lead: "闻人笙的剑在鞘里，薄青的缺刃按在布上，独孤破岁的剑风把草压着。三个人听见街口铁器一碰，肩、缺处、草圈在同一拍上停住。你站在圈外，看见鞘、缺刃、伏下的草。名帖的湿字印在袖上，剑穗还在轻轻敲腕。有人要从剑尖前过，三个人同时让出半步。让完这一步，草还是伏着的。这一拍没有人把剑全送出去。",
    choices: [
      s3choice("s3-group-jian-all", "等这一拍过去再走", "半步让完，三柄剑仍停着，你从圈外绕过去。**三人同场。破绽相关的幅度是 ?。**"),
      s3choice("s3-group-jian-cross", "从剑尖前直穿", "你直穿过去，草被踩起来，街口的人拔刀。**下一程多 X 人。三人散开。**"),
    ],
  },
  {
    id: "s3-group-qiang",
    pack: "group",
    title: "三杆枪前的空",
    lead: "霍长川退开一步，安岸火又退开一步，公孙四丈把空处再推远半寸。三杆枪尖前面没有人站上去。推车的人把车把放在空处边上。你站在最外侧，看见三截空叠成一截更长的空。车辙断了三次，断口的土都是新的。尘在空里打转，打转的那圈土上没有靴印。三个人都不解释，空处自己在变宽。风把三杆枪的穗吹向同一边。",
    choices: [
      s3choice("s3-group-qiang-all", "停在最外侧", "你的靴尖停在尘圈外面，三杆枪保持着那截空。**三人同场。远距离的伤加成是 ?。**"),
      s3choice("s3-group-qiang-in", "踏进这截空", "你踏进去，三杆枪同时横过来。**下一程多 X 人。三人散开。**"),
    ],
  },
  {
    id: "s3-group-zhuang",
    pack: "group",
    title: "三根棍先把脚停死",
    lead: "石万山先踏稳，章守山把杠压住，封堂用棍在地上点一下，点完队就慢。三根棍尾都抵着地，抵着的时候没有人挤。你站在队尾，看见三个坑、一条杠、一溜停住的肩。钟声过来，三个人的肩都不跟着动。泥干在三双靴边的折纹里面。队一旦停，闸口的风都小了。三根棍没有抬，人就先不敢从杠下钻。",
    choices: [
      s3choice("s3-group-zhuang-all", "等三根棍都点完", "第三个坑点完，队才被放行半步。**三人同场。挡在地上的那一层厚 ?。**"),
      s3choice("s3-group-zhuang-rush", "从队侧挤过去", "你挤出队侧，后面的人跟着挤，三根棍同时抬起。**下一程多 X 人。**"),
    ],
  },
  {
    id: "s3-group-gou",
    pack: "group",
    title: "三枚钩都等兵器离手",
    lead: "万俟晚收着线头，陈沉缆看着卸下的刀，欧阳饮钩确认手是空的才把钩抬高。三枚钩都没有先去咽喉，先停在线、缆、袖侧。你站在跳板上，看见三截钩尖，尖上都有绳屑或木屑。刀躺在舱板上，封条裂着一条缝。船工喊开船，三个人同时没有动。等刀还在甲板上，三枚钩才一起靠近。灯照着三个人的腕，腕上都有旧印。",
    choices: [
      s3choice("s3-group-gou-all", "等刀离手再一起靠", "刀仍在甲板上，三枚钩同时碰到袖和线。**三人同场。靠近之后回的血是 ?。**"),
      s3choice("s3-group-gou-back", "把刀踢回那人手里", "刀回到手里，三枚钩一起退开。**下一程多 X 人。三人散开。**"),
    ],
  },
  {
    id: "s3-grudge-heal",
    pack: "grudge",
    title: "药拳对着血纸",
    lead: "白孟和的拳按在伤者肋上，厉霜行把带血的纸按在同一张桌上。纸角的血滴到药粉里，药粉结块。白孟和的手停住，停住是因为血还在被往刀上送。厉霜行的刀出了半寸，半寸对着纸，不对着肋。伤者的眼睛看着两个人，呼吸顶着拳，顶不到刀。你站在桌侧，看见药、血、半寸刀光。两个人都没有先说话，桌上的东西已经在争。",
    choices: [
      s3choice("s3-grudge-heal-bai", "把纸从药粉边拿开", "纸离开桌，厉霜行跟着纸走，拳还按在肋上。**沥血的人离开，下一程少他，回的血是 ?。**"),
      s3choice("s3-grudge-heal-li", "让刀把血印看完", "刀又出一分，白孟和的拳离开肋，药包合上。**掌上的人离开，下一程少他，裂创相关的幅度是 ?。**"),
      s3choice("s3-grudge-heal-both", "两个人都留下", "拳和刀都停在桌上，谁也不把东西收走。**两人同场。各自首手的劲少 ?。**"),
    ],
  },
  {
    id: "s3-grudge-sword",
    pack: "grudge",
    title: "同一圈草上的两柄剑",
    lead: "闻人笙的剑还在鞘里，独孤破岁的剑已经把草压出一圈。两个人都看着这圈草，谁的剑尖先停在圈心，谁就先开口。闻人笙的肩动了，独孤破岁的剑尖也动了，两下撞在同一拍上，草被两股风压得更扁。你站在圈外，名帖被风掀到你靴边。帖上的字还湿，湿字照见两截剑穗。街口的人停住，等他们分出先后。这一圈草上没有第三柄剑插着。",
    choices: [
      s3choice("s3-grudge-sword-wen", "让鞘里的肩先停", "闻人笙的肩先停住，独孤破岁的剑尖让出圈心。**独孤破岁当手的那一层少 ?。**"),
      s3choice("s3-grudge-sword-du", "让草上的剑尖先停", "剑尖先停在圈心，闻人笙的肩往后收。**闻人笙当手的那一层少 ?。**"),
      s3choice("s3-grudge-sword-both", "让他们先分出先后", "两柄剑在圈里走完一轮，你站在圈外。**先打他们之间的这一轮，不占程号。你伤 ?。**", { sideSkirmish: true }),
    ],
  },
  {
    id: "s3-stake-a",
    pack: "job",
    title: "地上先多了一根木",
    lead: "路口的人先跪下，把一根木楔进土里，楔紧了才站起来。木比膝高，横在人要过的那一步上。过路的人绕开它，绕开的靴印在木两侧分成两串。他拍掉手上的土，土还沾在木纹里。你走到木前，木挡住你的靴尖。他看着你的脚，等你绕还是把木拔出来。拔出来的话，这一步就重新空着。他没有把自己的名字报出来。",
    choices: [
      s3choice("s3-stake-stay", "绕开这根木，再看他楔第二根", "你绕过去，他已经在第二步上跪下来。**下一程这根木还在。挡下的次数是 ?。**"),
      s3choice("s3-stake-pull", "把木拔出来", "木离土，靴尖踏过原来的那一步，他的手停在半空。**下一程多 X 人。地上没有这根木。**"),
    ],
  },
  {
    id: "s3-stake-b",
    pack: "job",
    title: "第二根木已经在",
    lead: "下一处路口，土里已经有一根木，木纹里的土还湿。同一个人蹲在旁边，手里又握着一根。他不看你的脸，看你的脚会不会踩到第一根。第一根挡着路心，第二根还没有入土。过路的小孩绕得很熟，熟到不用看。你停在第一根前面，湿土沾上靴边。他把第二根在掌心转了一圈，转完对着你脚边的空处。空处刚好还能再楔进一根木。",
    choices: [
      s3choice("s3-stake-b-let", "让他把第二根楔下", "第二根入土，你的脚改道，两根木之间留出一条窄路。**两根都留到下一程。每根挡住的次数是 ?。**"),
      s3choice("s3-stake-b-stop", "按住他的手腕", "第二根没有入土，他的手腕在你掌下停住。**下一程多 X 人。地上仍是一根。**"),
    ],
  },
  {
    id: "s3-stake-advance",
    pack: "job",
    title: "木裂开的那一下",
    lead: "你跟着他把第三根楔进土里，楔到一半，木身发出一声裂响。裂开的木屑飞到你小腿上，也飞到对面那人的膝上。两个人同时退了半步，半步里木已经倒了。土坑还在，坑边有焦色，焦色是裂开时留下的。他看着自己的手，手心有一条新的木刺。你的小腿上有一块热，热过之后才疼。他没有解释这一声，把断木踢到路边。",
    choices: [
      s3choice("s3-stake-advance-keep", "把这一声记住", "断木留在路边，下一次你再点地，可以要它再裂一次。**裂开的伤是 X，晕的段数是 ?。**"),
      s3choice("s3-stake-advance-drop", "把断木扔掉", "你把断木丢进沟里，土坑还在，下一声不会再来。**不留这一下。下一程伤 ?。**"),
    ],
  },
  {
    id: "s3-read-a",
    pack: "job",
    title: "他先说肩",
    lead: "茶摊上有个人不看你的碗，看你的肩。你的肩还没有沉，他已经说了一个字，字是进。你把肩沉下去，进字和你的肩对上了。邻桌的人笑了一下，笑完又把耳朵侧过来。他有时也会说错，说错的那次你的肩往上抬，他说的是守，肩走成了退。错的那一下他用指节敲了敲桌，敲完重新看。你的茶凉了，他的眼睛还在肩上。",
    choices: [
      s3choice("s3-read-stay", "让他再看一轮肩", "你把肩连续换了三次，他对上两次，错一次。**下一程他看肩的话还在。对上的次数是 ?。**"),
      s3choice("s3-read-leave", "把肩转开", "你侧过身，他的眼睛失去肩，字停在半空。**不听。下一程照旧，伤 ?。**"),
    ],
  },
  {
    id: "s3-read-b",
    pack: "job",
    title: "错的那一次",
    lead: "第二天他还在茶摊，面前摆着三颗石子，石子代表他昨天说对的次数。你坐下，他把石子推开一颗，推开的是说错的那次。你的肩还没动，他已经用手指在桌上画出一个退字。你把脚往后退，退字和脚对上。邻桌有人要他把下一场的人整个说完，他摇头，摇头是因为肩还没有到。你看见他的眼睛很静，静在等下一次肩线。",
    choices: [
      s3choice("s3-read-b-more", "把肩再给他一次", "肩线走到守，他说的字也是守。**再对上一次。下一场能先听见的倾向是 ?。**"),
      s3choice("s3-read-b-pay", "让他把下一场的人说完", "他仍摇头，石子没有再推。**说不完。你若硬要，花 ? 彩金，他仍是摇头。**"),
    ],
  },
  {
    id: "s3-read-advance",
    pack: "job",
    title: "他把下一记说出口",
    lead: "这一次他不再等你把肩线送出来。对面的人还在握刀，他已经把下一记的字说出来，字落在进上。刀真的进了，进的幅度和他的字一样。茶摊上的人安静下来，安静是因为字在刀前面。他把一颗新的石子按在你手边，按着，等你收不收。你收下的话，下一次对面的人抬肩，你可以先听见字。石子是凉的，凉意停在掌心。他没有给这颗石子取过名字。",
    choices: [
      s3choice("s3-read-advance-take", "把石子收下", "石子进袖，下一次肩线抬起前，你能先听见那个字。**先听见的那一记，类型占位是 ?。**"),
      s3choice("s3-read-advance-back", "把石子推回去", "石子回到他掌心，下一记仍要等刀落下来才知道。**不收。下一程伤 ?。**"),
    ],
  },
  {
    id: "s3-dice-a",
    pack: "job",
    title: "手指停在盅顶",
    lead: "赌棚里有个人的手指永远停在盅顶，停的时间比别人长。长出来的那一瞬，盅沿会偏一指。偏过的盅，开出来的点数他事先用指节在桌上敲过。你坐在对面，看见敲过的印子和后来的点数对得上。有一回对不上，对不上的时候他笑，笑完把那枚点数拨给你。围着的人没有看破这一指，他们在看灯。他的钱袋比进来时沉，沉了多少他不说。",
    choices: [
      s3choice("s3-dice-stay", "盯着他的指节再看一轮", "指节又敲了三下，开盅后的点数跟上其中两下。**下一程他的手指还在盅上。对上的次数是 ?。**"),
      s3choice("s3-dice-call", "把偏过的盅沿说出来", "你说出那一指，围着的人转过脸，他的笑收住。**下一程多 X 人。**"),
    ],
  },
  {
    id: "s3-dice-b",
    pack: "job",
    title: "袖里的旧盅",
    lead: "他袖里还有第二口盅，盅底比桌上的那口更旧。换的时候灯刚好跳，跳完桌上的盅已经是旧底。你看见旧底的一道裂纹，裂纹在开盅前不该出现。他把裂纹用手指挡住，挡住的时候点数已经在他心里。你的注还压在桌边，压着的是新盅该有的那一面。围着的人仍在灯下笑出声来。他看你一眼，看你认不认这道裂纹。",
    choices: [
      s3choice("s3-dice-b-stay", "认下这道裂纹", "你点了点裂纹，他把旧盅转回袖里，这一把按你看见的算。**下一程裂纹还在。这一把的输赢是 ?。**"),
      s3choice("s3-dice-b-leave", "把注从桌边拿开", "注回到袋里，旧盅留在袖中。**不押。下一程照旧，伤 ?。**"),
    ],
  },
  {
    id: "s3-dice-advance",
    pack: "job",
    title: "盅在你手里换了底",
    lead: "他把旧盅放进你的手，你的手指找到那道裂纹，裂纹对着灯。你学他的样子，在灯跳的一瞬把盅转过去。转完，桌上的点数和你指节事先敲的印子对上了。围着的人这一次看着你，不看着他。他的手离开桌子，离开是把这一下交给你。你的掌心有汗，汗把裂纹浸得更深。下一次灯再跳，你可以自己转。",
    choices: [
      s3choice("s3-dice-advance-keep", "把裂纹留在自己掌心", "旧盅进你袖里，下一次灯跳你可以转底。**转成之后的点数仍是 ?。单注最高当前彩金 80%。**"),
      s3choice("s3-dice-advance-back", "把旧盅还给他", "裂纹回到他袖中，你的注仍按明面算。**不留。下一程照旧，伤 ?。**"),
    ],
  },
  {
    id: "s3-shade-meet",
    pack: "job",
    title: "手臂伸直的那一瞬",
    lead: "巷战里有个人不跟你对刀，他等你的手臂伸直。伸直的那一瞬，他的脚已经踏进你肘弯空出来的那一步，刀从空处过去。你的刀砍在他刚才站的位置，位置上剩下的是风。他的呼吸很浅，浅到你以为他不在。第二下你故意把手臂收短，他的脚就踏空，踏空之后他停住看你。看完他笑了一下，笑完又退回阴影里。阴影里的墙缝和沈夜行看过的那种不一样，这条缝刚好容一个人侧身。",
    choices: [
      s3choice("s3-shade-stay", "再把手臂伸直一次", "手臂伸直，他的脚又踏进肘弯的空处，这一次你看见了。**下一程这个空处还在。插进去的那一下伤是 ?。**"),
      s3choice("s3-shade-short", "手臂不再伸直", "你把刀收在身前，他的脚没有落点，人退回缝里。**他离开。下一程多 X 人。**"),
    ],
  },
  {
    id: "s3-shade-advance",
    pack: "job",
    title: "空处留给你的手",
    lead: "他对着你把自己的手臂伸直，伸直之后肘弯空出来，空处够你的手插进去一下。他数你的呼吸，数到出手的前一息才点头。你的手插进去的时候，他的刀已经收住，收住是为了让你感到这一下有多短。短过之后，巷里重新能听见风。他把你的手腕翻过来，翻开的掌心上有一道浅印。浅印是刚才插进去的那一下留下的。下一次别人的手臂伸直，你可以自己找这个空。",
    choices: [
      s3choice("s3-shade-advance-keep", "把浅印留下", "浅印还在掌心，下一次手臂伸直，你的手知道往哪插。**插进去的窗有多长是 ?，伤是 X。**"),
      s3choice("s3-shade-advance-wash", "把浅印擦掉", "你在墙根的水里把掌心擦净，下一次仍要自己撞上。**不留。下一程伤 ?。**"),
    ],
  },
  {
    id: "s3-open-a",
    pack: "open",
    title: "桌上七张扣着的牌",
    lead: "进门的桌上扣着七张牌，牌背是一种旧布，布上没有字。掌柜让你先翻开三张，其余四张仍扣着。翻开的第一张是一把短刀的印，第二张是一枚拳印，第三张是一截枪杆的印。印是刻在木牌上的，刻痕里有灰。你的手还停在第四张上，第四张他按住了。门外有人在等，等的是你带走哪三张。灯把三张翻开的牌照得很清楚，清楚到能看见刻痕的深浅。这一桌不谈下一场要打的人。",
    choices: [
      s3choice("s3-open-a-take", "带走这三张", "三张木牌进你手里，短刀、拳、枪杆的印都在。**开场看见三门兵器。第一程直接打，不进赌馆。**"),
      s3choice("s3-open-a-back", "把三张重新扣上", "牌背重新朝上，刻痕离开灯光。**三门先不看。第一程仍直接打，伤 ?。**"),
    ],
  },
  {
    id: "s3-open-b",
    pack: "open",
    title: "门石上的七颗",
    lead: "山门前的石板上摆着七颗卵石，石面朝下，朝下的一面磨得发亮。守门的人让你翻开三颗，翻开的一面是剑穗、棍尾、钩尖。三颗石头比牌重，重在掌心。其余四颗他用袖子整个盖住了。风从门里出来，把翻开的石面吹凉。你看见三样兵器的刻痕，刻痕里有泥。泥是刚才翻开石头时带上的。守门的人不问你的名字，他问你带走哪三颗。",
    choices: [
      s3choice("s3-open-b-take", "带走这三颗", "剑穗、棍尾、钩尖进你袋里，石面还凉。**开场看见另外三门兵器。第一程直接打，不进赌馆。**"),
      s3choice("s3-open-b-back", "把石头翻回朝下", "亮面重新贴着石板，袖子仍盖着其余四颗。**先不带。第一程仍直接打，伤 ?。**"),
    ],
  },
  {
    id: "s3-open-name",
    pack: "open",
    title: "空白的一条",
    lead: "三张牌旁边还有一条空白的纸，纸上没有字，墨在碟里。掌柜把笔搁在纸边，搁着，等你写。写上去的字会在下一程的闪句里被叫出来，叫的是你写下的那几个。你若留下空白，他们就用你带走的那门兵器叫你。墨香混着茶味，茶还是刚才那碗。门外的人已经在等开打，等的时候纸还是白的。你的手指沾了一点墨，墨点在纸角上，还没有成为名字。",
    choices: [
      s3choice("s3-open-name-write", "把名字写下", "墨干在纸上，下一程的闪句会带这个字。**名字记下。第一程仍直接打。**"),
      s3choice("s3-open-name-blank", "让纸保持空白", "笔放回碟里，纸还是白的。**用兵器叫你，第一程直接打，伤 ?。**"),
    ],
  },
  {
    id: "s3-open-job",
    pack: "open",
    title: "第三程的三个人",
    lead: "第三程的路口站着三个人，谁也没有先报自己做什么。左边的人膝上有土，脚边立着一根刚楔进地的木。中间的人看着你的肩，看完在掌心写了一个字，字你还没看见。右边的人手指停在一口扣着的盅上，停得比别人长。三条路都通到下一场，通之前他们等你的脚。你若三个人都不跟，路口仍能过，过完下一摊会多给你抽一次。风把木上的土、肩上的字、盅上的灰一起吹起来。",
    choices: [
      s3choice("s3-open-job-stake", "跟着膝上有土的人", "你的脚停在那根木旁边，他已经跪下去楔第二根。**下一程地上有木。挡住的次数是 ?。**"),
      s3choice("s3-open-job-read", "跟着看肩的人", "他把掌心的字给你看，字和你的肩对上。**下一程能先听见倾向。对上与否是 ?。**"),
      s3choice("s3-open-job-dice", "跟着停在盅上的人", "盅沿偏了一指，他的指节在桌上敲了一下。**下一程盅还在，这一把输赢是 ?，不在第一程开。**"),
      s3choice("s3-open-job-no", "三个人都不跟", "你从三个人中间走过，木、字、盅都留在路口。**拒绝。下一摊营地多抽 ? 张。**"),
    ],
  },
];

function currentStory3(run: Pick<GauntletRun, "storyFlags">): Story3Page | undefined {
  const id = [...(run.storyFlags ?? [])].reverse().find((f) => f.startsWith("s3page:"))?.slice("s3page:".length);
  return id ? STORY3_PAGES.find((p) => p.id === id) : undefined;
}

function applyStory3Choice(flags: string[], choice: EncounterChoice, next: GauntletRun): { flags: string[]; next: GauntletRun } {
  const meta = STORY3_META[choice.id];
  if (!meta) return { flags, next };
  let f = flags.filter((x) => !x.startsWith("s3page:"));
  if (meta.next) f.push(`s3page:${meta.next}`);
  return { flags: f, next };
}

/** 情报、缘分、职业、开局都从这里打开。不预排，不在第一程自动进赌馆。 */
export function offerStory3Page(run: GauntletRun, pageId: string): GauntletRun {
  const page = STORY3_PAGES.find((p) => p.id === pageId);
  if (!page) return run;
  const flags = (run.storyFlags ?? []).filter((f) => !f.startsWith("s3page:") && !f.startsWith("s2page:") && !f.startsWith("envpage:"));
  flags.push(`s3page:${page.id}`);
  return { ...run, storyFlags: flags, storyPending: "choice", storyGuest: undefined };
}
