import type { CompanionId, EnemyId } from "../game/types";
import type { GauntletPath } from "./gauntletPaths";
import { GAUNTLET_FINAL_STAGE, pathLadder } from "./gauntletPaths";
import type { GauntletRun } from "./gauntlet";
import { banditCompanionChoices, rollCompanionChoices } from "./gauntlet";
import { usesBanditStory } from "./storyBeats";
import { MATES } from "../game/party";
import { rogueMate } from "./rogueRoster";

export type EncounterKind = "inn" | "fork" | "companion" | "finaleHint" | "ambush" | "stall" | "market" | "story" | "travel";
export type HallLaw = "noMove" | "mustMelee" | "earlyEye";
export type FinaleKind = "mob" | "seat" | "private";
export type EncounterRisk = "safe" | "rich" | "danger";

export interface EncounterChoice {
  id: string;
  title: string;
  blurb: string;
  risk: EncounterRisk;
  potDelta?: number;
  extraWaves?: number;
  dmgCoefMul?: number;
  rewardBonus?: number;
  basePotMul?: number;
  hallLaw?: HallLaw;
  skipMarket?: boolean;
  skipCompanion?: boolean;
  forceDangerNext?: boolean;
  intel?: boolean;
  skirmish?: "save" | "duel" | "side";
  storyFlag?: string;
  stall?: "small" | "double";
  /** 程后黑市事页：下一程营地摆跨阶货 */
  openMarket?: boolean;
  /** 选项把你送进赌馆屏，不当场 ±18 */
  openWager?: boolean;
  companionId?: CompanionId;
  guestEnemy?: boolean;
  /** 馆间小支线短战：不占脊骨馆号，UI 标 N-k */
  sideSkirmish?: boolean;
}

export function eventAfterFought(fought: number, final = GAUNTLET_FINAL_STAGE): EncounterKind | null {
  if (fought === 1) return "inn";
  if (fought === 4 || fought === 7) return "companion";
  if (fought === 5) return "ambush";
  if (fought === 6) return "stall";
  // 情报槽默认在期末前一馆；短 9 则情报在馆 8（顶替原岔路），长 12 在馆 11
  const intelStage = Math.max(2, final - 1);
  if (fought === intelStage) return "finaleHint";
  if (fought === 2 || fought === 8) return "fork";
  return null;
}

export function shouldShowFinale(run: Pick<GauntletRun, "stage" | "finaleKind" | "endless" | "routeLength">): boolean {
  if (run.endless) return false;
  return run.stage === (run.routeLength ?? GAUNTLET_FINAL_STAGE) && !run.finaleKind;
}

function pathSkin(path: GauntletPath): { inn: string; fork: string; road: string; other: string } {
  if (path === "shaolin") return { inn: "斋堂", fork: "寺径", road: "少林", other: "江湖" };
  if (path === "court") return { inn: "驿站", fork: "官道", road: "朝廷", other: "少林" };
  return { inn: "客栈", fork: "荒路", road: "江湖", other: "朝廷" };
}

function hasFlag(run: Pick<GauntletRun, "storyFlags" | "seenEvents">, flag: string): boolean {
  return Boolean(run.storyFlags?.includes(flag) || run.seenEvents?.includes(flag));
}

export function eventLead(run: Pick<GauntletRun, "path" | "storyFlags" | "seenEvents" | "companions" | "companion" | "pendingIntel" | "scars">, kind: EncounterKind): string {
  const line = run.path;
  const tipped = hasFlag(run, "inn-tip") || hasFlag(run, "zhou-tea");
  if (kind === "inn") {
    if (line === "shaolin")
      return "斋堂灯还亮着一盏。行者空明把素面推到你手边，筷子还搁在碗边。窗外晚课念到「下山」两个字，声断了。廊下有人用袖口捂着香袋，香钱磕在砖上，空明还在擦碗。锅里的汤还滚着，案上搁着半截冷斋饼。行堂欠的账写在木牌反面，山外的人在廊柱边咳嗽。碗边压着四张条：问路、歇脚、听墙、挡债。";
    if (line === "court")
      return "官驿堂屋空着。捕快赵三把腰牌扣在桌上：前面差役换了班。他盯着你肩上的刀伤，案上搁着半杯冷茶，杯底沉着昨夜没写完的名字。门外靴印还湿，值房灯灭了一截，档册边角被人翻过。夜巡名册摊开一角，巷口灯笼灭了三盏。腰牌下面压着四张条：问路、歇脚、买口供、顶一班夜巡。";
    return tipped
      ? "掌柜老周认得你。碗还没热，后门钥匙已经转了一圈。哪条巷换了人、哪间房还能睡、隔壁报路要不要封口，他划在碗底。灶火温着，门口还有人讨债，讨债的人把刀柄磕在门框上。灶台边上压着四张条。"
      : "堂屋里掌柜老周还在擦碗。他看你肩上的刀伤，抹布还在碗沿上转。灶火温着，隔壁有人报路，门口有人讨债，讨债的人把刀柄磕在门框上。后院钥匙挂在灶边，茶还热着。灶台边上压着四张条：问路、歇脚、听墙、挡债。";
  }
  if (kind === "fork") {
    if (line === "shaolin")
      return "寺径在雾里分成三条。一边传来钟声，林子那边更深，泥地上还有一串新踩出来的脚印。岔口空着。大路不添人，香钱买近路，深林会跟来替补，岔口里还有一仗不占程号。三条都会送回路上，人数和彩金不一样。";
    if (line === "court")
      return "官道到此立着旧石。正面写「止步」，背面被人刮过。旁边又多了一条路签外的巷，差役换班的脚印还湿着。腰牌扣在石上，有人已经走了。贴官道、改路签、进黑巷、替人带口信，赏格和围场会跟着改。";
    return "荒路没了辙印。左边炊烟，右边血腥，中间有人丢下还温着的酒碗，碗底有牙印。绕开、买路、硬闯、支线短打，踩哪一条，下两馆的人和彩金都不一样。";
  }
  if (kind === "ambush") {
    if (line === "shaolin")
      return "夹道里蝉声断了。空明不在你身边。草里有人换气，香袋的线还在抖。贴墙绕、丢香钱、踩断枯枝、报山门问名，四张条压在枯枝上。";
    if (line === "court")
      return "巷口灯灭了一排。赵三今夜不在。腰牌磕在砖上的声音远了。贴墙走、塞银点灯、踢开灯笼、翻今夜点名册，四张条压在灭灯的座上。走错一条，门后有人出来。";
    return tipped
      ? "老周说过剪径换了刀。现在刀横在路中，刀主还在看你的腰包。田埂、刀面上的酒钱、迎着刀走，三张条压在刀背上。"
      : "路收窄了。有人咳嗽一声，横在你前头。脸还没看清，刀已经横在路中。腰包还在你身上。田埂、买路、硬闯、问刀上的记号，四张条压在土路上。";
  }
  if (kind === "stall") {
    if (line === "shaolin")
      return "香案侧面摆着一局叶子戏。沙弥说寺里不许赌，手还按在牌上。烛火跳了两下，旁边有人把筹码按在木鱼边上。小注、不碰、买口风、把注加倍，点下去才开盅。";
    if (line === "court")
      return "夜班书吏把骰盅扣在档册上。私钱筹码按在册角，官银匣锁着。他笑得很浅，下巴一抬。档房门外有人咳嗽，里面的人低着头翻页。押一小笔、杯子扣上、花钱买人名、加倍开盅，四张条压在档册边。";
    return "酒楼后进有人拍桌子。掌柜给你添了一杯冷的。骰盅还温着，旁边的人把杯子扣上，眼睛盯着盅。押不押、买不买口风，点下去才开盅。";
  }
  if (kind === "market") {
    if (line === "shaolin")
      return "山门外有人支起布帘。香袋和刀按成色摆着。沙弥说寺里不收这摊，帘缝里灯还亮。掀帘、走过、问价，三条条压在帘边上。";
    if (line === "court")
      return "值房后墙挂着一块布。刀和药按成色标了价。档册上没有这一摊。掀帘、走过、问价，三条条压在布边上。";
    return "巷口挂着一块布帘。灯从帘缝里漏出来。货按成色摆着，价写在纸签上。掀帘、走过、问价，三条条压在帘边上。";
  }
  if (kind === "companion") {
    const first = run.companions?.[0] ?? run.companion;
    const name = first ? MATES[first]?.name : "";
    if (name) {
      if (line === "shaolin")
        return `${name}在林边顿住。柏树下坐着个带伤的人，锡杖还插在泥里，晚课的余音从回廊折过来。他看你一眼。挡刀、点到、把银子拍在伤口上，四张条压在锡杖旁。人跟上了，下两馆阵容会改。`;
      if (line === "court")
        return `${name}把袖里的令箭按住。巷口那人被影卫盯上了，灯灭了一排，靴声在墙那边停住。伸手、点到、买命，四张条排在灯影里，人数和花销写在条上。`;
      return `${name}认桥下那口血。「我跟过他。」他说完就不作声。酒碗还温着，刀还在泥里。伸手挡刀、桥上点到、银子买命，四张条压在桥栏上。人跟上了，下两馆的阵容会改。`;
    }
    if (line === "shaolin")
      return "路边坐着个带伤的武僧，锡杖插在泥里。他看你一眼，没伸手，没让路。伤在肋上，人还醒着，香袋的线在膝上抖。下场救人、桥上点到、当场买命，四张条压在泥里，人数和彩金写在条上。";
    if (line === "court")
      return "巷口有人被影卫盯上。她把令箭塞进袖里。灯灭了一排，脚步声在墙那边停住了。下场救人会多一名替补，点到能进账，买命要花彩金、这一摊黑市跳过。四张条压在灭灯座上。";
    return "桥下有人捂着肋。刀还在，人还醒。他抬眼认你。馆 3、馆 7 在这一步加人：伸手、点到、买命。四张条压在桥栏上。";
  }
  const intel = Boolean(run.pendingIntel);
  const scar = (run.scars ?? 0) > 0;
  if (line === "shaolin") {
    return intel
      ? `方丈院墙外有人把三条终局说全了。人海：场子里人多，底彩厚${scar ? "，你带伤还会再挤进一名替补" : ""}。座前：护卫少 2 人，主座下手更狠。私了：必须贴身，底彩按七成算。开打前你还要再选一次。`
      : "方丈院墙外有人压低声音。终馆三条走法他没说全：人海、座前、私了。口风不全，你听进耳朵里的这几句，开打前还要自己再选一次。人海人多货厚，座前护卫少下手狠，私了贴身彩金薄。";
  }
  if (line === "court") {
    return intel
      ? "夜班书吏把残档补齐。人海、座前、私了都写了赏格。人海多 1 名替补、底彩 ×1.15。座前护卫少 2 人、伤害 ×1.18。私了必须贴身，底彩 ×0.7。开打前你还要再选一次。"
      : "夜班书吏把一卷残档推过来。殿前有三条走法，写下来的两条，第三条被墨盖住了。你摸到边，开打前还要自己再选一次。人海围场、座前狠手、私了贴身，赏格不一样。";
  }
  return intel
    ? "酒客散了。桌上三道口风写全：人海围场人多货厚，座前主座狠手护卫少，私了贴身彩金薄。你听过暗桩，这回不瞎选。开打前你还要再选一次。"
    : "酒客散了。有人用指甲在桌上划了三道：人海、座前、私了。口风到此，开打前还要自己再选一次。人海加人加彩，座前少护卫加伤害，私了贴身彩金薄。";
}

export function eventTag(risk: EncounterRisk): string {
  if (risk === "danger") return "硬闯";
  if (risk === "rich") return "探路";
  return "歇脚";
}

/** 遭遇短文：只把 **关键句** 染成更黑（字号字重与正文相同）。不自动拆关键字。 */
export function formatEncounterRichText(raw: string): string {
  const esc = raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  return esc.replace(/\*\*(.+?)\*\*/g, '<span class="gauntlet-hint">$1</span>');
}

const HALL_LAW_FX: Record<HallLaw, string> = {
  noMove: "下场禁位移",
  mustMelee: "下场必须贴身",
  earlyEye: "下场提前招眼",
};

/** @deprecated 仅测试/调试；玩家卡面不再挂账本。 */
export function encounterOutcomeTag(c: EncounterChoice): string {
  if (c.id === "hint-finale") return "口风";
  if (c.skipCompanion) return "绕过";
  if (c.sideSkirmish) return "支线";
  if (c.skirmish === "save") return "救人";
  if (c.skirmish === "duel") return "点到";
  if (c.companionId) return "买命";
  if (c.stall === "small") return "小注";
  if (c.stall === "double") return "加倍";
  if (c.guestEnemy) return "借道";
  if (c.intel) return "暗桩";
  if (c.extraWaves) return "添人";
  if (c.rewardBonus) return "多抽";
  if ((c.potDelta ?? 0) > 0) return "进账";
  if ((c.potDelta ?? 0) < 0) return "花钱";
  if (c.skipMarket) return "避摊";
  if (c.hallLaw) return "馆法";
  if (c.dmgCoefMul && c.dmgCoefMul !== 1) return "加伤";
  return "绕道";
}

/** @deprecated 仅测试/调试 */
export function encounterEffectParts(c: EncounterChoice): string[] {
  const parts: string[] = [];
  if (c.id === "hint-finale") return ["记下口风", "开打前再选终馆"];
  if (c.sideSkirmish) parts.push("馆间支线短战", "不占脊骨馆号");
  if (c.skipCompanion) parts.push("绕过", "本站不入伙");
  else if (c.skirmish === "save") parts.push("短战救人", "赢了入伙");
  else if (c.skirmish === "duel") parts.push("短战点到", "赢了入伙");
  else if (c.companionId) parts.push("当场入伙");

  if (c.stall === "small") {
    parts.push("点下去开盅", "一半 +18", "一半 −14");
  } else if (c.stall === "double") {
    parts.push("点下去开盅", "约一半 +28 且多抽 1", "约一半 −22 且下场多 1 人");
  } else if (c.potDelta) {
    parts.push(c.potDelta > 0 ? `彩金 +${c.potDelta}` : `彩金 ${c.potDelta}`);
  }

  if (c.extraWaves) parts.push(`下场多 ${c.extraWaves} 人`);
  if (c.guestEnemy) parts.push("下场塞外路敌人");
  if (c.hallLaw) parts.push(HALL_LAW_FX[c.hallLaw]);
  if (c.dmgCoefMul && c.dmgCoefMul !== 1) parts.push(`下场伤 ×${c.dmgCoefMul}`);
  if (c.basePotMul && c.basePotMul !== 1) parts.push(`底彩 ×${c.basePotMul}`);
  if (c.rewardBonus) parts.push(`营地多抽 ${c.rewardBonus}`);
  if (c.skipMarket) parts.push("跳过黑市");
  if (c.intel) parts.push("暗桩：下两馆人名");
  if (c.forceDangerNext) parts.push("下岔路更险");
  if (!parts.length) parts.push("绕道", "下场照旧");
  return parts;
}

export function encounterEffectLine(c: EncounterChoice): string {
  return encounterEffectParts(c).join(" · ");
}

export function finaleEffectLine(id: FinaleKind, scarred = false): string {
  if (id === "mob") return scarred ? "下场多 1 人 · 底彩 ×1.15 · 带伤再挤 1 人" : "下场多 1 人 · 底彩 ×1.15";
  if (id === "seat") return "护卫少 2 人 · 伤害 ×1.18 · 不提前招眼";
  return scarred ? "必须贴身 · 底彩 ×0.55" : "必须贴身 · 底彩 ×0.7";
}

function shuffleTake(cards: EncounterChoice[], seen: string[], rng: () => number, n: number): EncounterChoice[] {
  const fresh = cards.filter((c) => !seen.includes(c.id));
  const bag = fresh.length >= n ? [...fresh] : [...cards];
  const out: EncounterChoice[] = [];
  while (out.length < n && bag.length) {
    const i = Math.floor(rng() * bag.length);
    out.push(bag.splice(i, 1)[0]!);
  }
  return out;
}

function innCards(path: GauntletPath): EncounterChoice[] {
  if (path === "shaolin") {
    return [
      { id: "shaolin-inn-ask", title: "斋堂·问路", blurb: "空明用箸点后山，热气还在碗沿上转。你丢几文斋钱，他盯着碗沿，在桌上划了近路：钟声那边人少。廊下讨香钱的人退了半步。**花 6 彩金。下一摊营地免费奖励多抽 1。**", risk: "rich", potDelta: -6, rewardBonus: 1, storyFlag: "inn-tip" },
      { id: "shaolin-inn-rest", title: "斋堂·歇脚", blurb: "你把素面吃完。钟还在敲。空明收了碗，廊下讨债的人走了。斋棚灯灭了一截，走廊空到天亮。**袋里彩金 +8。下一馆人数照旧。**", risk: "safe", potDelta: 8 },
      { id: "shaolin-inn-listen", title: "斋堂·听墙", blurb: "晚课停处有人换气。你把香钱按在砖缝里，墙那边把下两馆的人名一个一个吐出来。空明盯着木鱼，木鱼还扣在案上。**花 10 彩金，换下两馆人名。**", risk: "rich", potDelta: -10, intel: true },
      { id: "shaolin-inn-debt", title: "斋堂·挡债", blurb: "行堂欠了山外的人。你替他挡一晚，空明把你的名字记在斋堂账上。山外的人记住了你的脸，下一馆会多派手脚来问账。**下一馆多 1 名替补。**", risk: "danger", extraWaves: 1, storyFlag: "kongming-debt" },
    ];
  }
  if (path === "court") {
    return [
      { id: "court-inn-ask", title: "驿站·问路", blurb: "赵三换你一句班次。你丢几文打点，他用腰牌在桌上划了一道：哪一班人少。冷茶晃了一下，杯底的名字没被他擦掉。**花 6 彩金。下一摊营地免费奖励多抽 1。**", risk: "rich", potDelta: -6, rewardBonus: 1, storyFlag: "inn-tip" },
      { id: "court-inn-rest", title: "驿站·歇脚", blurb: "你在驿床上闭一会眼。差役换班的脚步从门外过去，跟你无关。赵三没把你的名字写进今夜的册，值房灯自己灭了一截。**袋里彩金 +8。下一馆人数照旧。**", risk: "safe", potDelta: 8 },
      { id: "court-inn-listen", title: "驿站·买口供", blurb: "书吏要银子。你给了，他把差役名册翻开一角，下两馆谁当值写在边栏上。档房门外有人咳嗽，里面的人低着头翻页。**花 10 彩金，换下两馆人名。**", risk: "rich", potDelta: -10, intel: true },
      { id: "court-inn-cover", title: "驿站·顶班", blurb: "你替赵三挡一班夜巡。巷口灯灭了一排，他欠你一次。巷里多出来的人会记到你头上，下一馆围场会挤。**下一馆多 1 名替补。**", risk: "danger", extraWaves: 1, storyFlag: "zhao-cover" },
    ];
  }
  return [
    { id: "bandit-inn-ask", title: "客栈·问路", blurb: "老周压低声音：剪径的人换了刀。你付茶钱，他把后门钥匙转了一圈，近路从灶房后面出去。**花 6 彩金。下一摊营地免费奖励多抽 1。**", risk: "rich", potDelta: -6, rewardBonus: 1, storyFlag: "zhou-tea" },
    { id: "bandit-inn-rest", title: "客栈·歇脚", blurb: "你要一间房，把门闩上。老周不再说话，灶火自己灭了一截。讨债的人在门口骂了两句就走了。**袋里彩金 +8。下一馆人数照旧。**", risk: "safe", potDelta: 8 },
    { id: "bandit-inn-listen", title: "客栈·听墙根", blurb: "隔壁有人报路。你给老周封口费，他侧耳把下两馆的人名听全，用指甲划在桌沿上。**花 10 彩金，换下两馆人名。**", risk: "rich", potDelta: -10, intel: true },
    { id: "bandit-inn-help", title: "客栈·挡债", blurb: "讨债的人堵在门口。你替老周挡，他记住你的脸。讨债的人记住你的腰包，下一馆会多派人截你。**下一馆多 1 名替补。**", risk: "danger", extraWaves: 1, storyFlag: "zhou-tea" },
  ];
}

function forkCards(path: GauntletPath, cross: boolean, scarred: boolean): EncounterChoice[] {
  const skin = pathSkin(path);
  const base: EncounterChoice[] = [
    {
      id: `${path}-fork-safe`,
      title: `${skin.fork}·绕开`,
      blurb:
        path === "shaolin"
          ? "你顺着钟声走大路。伏桩让给别人，林子里的泥印你没踩。香钱还在袋里。**下一馆不添替补，营地也不多抽牌。**"
          : path === "court"
            ? "你贴着官道走。影卫看你一眼就放过去，路签外的巷你绕开了。今夜点名册跳过了你这一行。**下一馆不添替补，营地也不多抽牌。**"
            : "你绕开血腥那条。炊烟处是猎户，酒碗你没捡。刀还横在原路上，跟你无关。**下一馆不添替补，营地也不多抽牌。**",
      risk: "safe",
    },
    {
      id: `${path}-fork-rich`,
      title: `${skin.fork}·买路`,
      blurb:
        path === "shaolin"
          ? "香钱塞进木鱼。沙弥给你一条近路，袋里轻了，禅院那边少拦一截。**花 12 彩金。下一摊营地免费奖励多抽 1。**"
          : path === "court"
            ? "你把盘缠递给夜班书吏。他改路签，官道上多了一道湿脚印，班次给你让开。**花 12 彩金。下一摊营地免费奖励多抽 1。**"
            : "剪径的人伸手要过路费。你付了，刀从路中收了回去。近路从田埂后面出去。**花 12 彩金。下一摊营地免费奖励多抽 1。**",
      risk: "rich",
      potDelta: -12,
      rewardBonus: 1,
    },
    {
      id: `${path}-fork-danger`,
      title: `${skin.fork}·硬闯`,
      blurb:
        path === "shaolin"
          ? `你踩进深林。伏桩会跟上来，钟声听不见了。香袋的线在身后抖。**下一馆多 1 名替补。底彩 ×1.2。${scarred ? "打不出位移牌（进步、撤步、换位、纵步）。" : ""}**`
          : path === "court"
            ? `你拐进路签外的巷。巷里有人换班，灯灭了一排。**下一馆多 1 名替补。底彩 ×1.2。${scarred ? "打不出位移牌（进步、撤步、换位、纵步）。" : ""}**`
            : scarred
              ? "你朝血腥处走。酒碗还温着，牙印对着你。伤还在身上，步子迈不开。**下一馆多 1 名替补。底彩 ×1.2。打不出位移牌（进步、撤步、换位、纵步）。**"
              : "你朝血腥处走。酒碗还温着，牙印对着你。刀主还在看你的腰包。**下一馆多 1 名替补。底彩 ×1.2。**",
      risk: "danger",
      extraWaves: 1,
      basePotMul: 1.2,
      hallLaw: scarred ? "noMove" : undefined,
    },
    {
      id: `${path}-fork-side`,
      title: `${skin.fork}·支线`,
      blurb: "岔路里还有一仗。炊烟那边有人招手，血腥那边有人喊你的号。馆号不往上走，这一仗打完再回营地。**短打，不占馆号，禁注。赢了彩金 +22，下一摊免费奖励多抽 1。输了彩金 −10。**",
      risk: "danger",
      sideSkirmish: true,
    },
    {
      id: `${path}-fork-favor`,
      title: `${skin.fork}·人情`,
      blurb: "路边有人求你带一句口信。你答应了，他把布条塞进你袖里。货摊那一盏灯你今晚见不着。**下一馆不添替补。这一摊黑市跳过。**",
      risk: "safe",
      skipMarket: true,
      storyFlag: "fork-favor",
    },
  ];
  if (cross) {
    base.push({
      id: `${path}-fork-cross`,
      title: `${skin.road}·借道${skin.other}`,
      blurb:
        path === "shaolin"
          ? "林尽处看见朝廷腰牌。你踩过去，木鱼声就断了。下场碰上朝廷线上的人。**下场塞 1 名外路敌人。下一摊营地免费奖励多抽 1。底彩 ×1.15。**"
          : path === "court"
            ? "巷子尽头有木鱼声。你跟进去，腰牌就凉了。下场碰上寺里的武僧。**下场塞 1 名外路武僧。下一摊营地免费奖励多抽 1。底彩 ×1.15。**"
            : "炊烟那边有人念佛号。你过去，酒碗就凉了。下场碰上外路的桩。**下场塞 1 名外路敌人。下一摊营地免费奖励多抽 1。底彩 ×1.15。**",
      risk: "danger",
      guestEnemy: true,
      basePotMul: 1.15,
      rewardBonus: 1,
      storyFlag: "cross-theme",
    });
  }
  return base;
}

function ambushCards(path: GauntletPath, tipped: boolean): EncounterChoice[] {
  const warn = tipped ? "你听过通风报信。" : "你是临时踩进来的。";
  if (path === "shaolin") {
    return [
      { id: "shaolin-amb-sneak", title: "夹道·绕林", blurb: `${warn}你贴着墙根走。蝉声没回来，香袋没碰。伏桩让你过去。**不添替补，营地不多抽牌。**`, risk: "safe" },
      { id: "shaolin-amb-pay", title: "夹道·香钱", blurb: "把袋里银子丢进草里。伏桩让路，枯枝没断。近路从香袋旁边出去。**花 14 彩金。下一摊营地免费奖励多抽 1。**", risk: "rich", potDelta: -14, rewardBonus: 1 },
      { id: "shaolin-amb-rush", title: "夹道·硬闯", blurb: "你踩断枯枝。人从林子里跟上来，香袋的线全抖开了。**下一馆多 1 名替补。底彩 ×1.2。**", risk: "danger", extraWaves: 1, basePotMul: 1.2 },
      { id: "shaolin-amb-talk", title: "夹道·问名", blurb: "你报山门。对方愣一下，香袋上的线松了。他把下两馆谁守门说给你听。**花 8 彩金，换下两馆人名。**", risk: "rich", potDelta: -8, intel: true },
      { id: "shaolin-amb-night", title: "夹道·摸黑", blurb: "灯灭着。巷里看不清脸，货摊那一盏也灭了。刀口会沉一点。**下一馆伤害 ×1.1。这一摊黑市跳过。**", risk: "danger", dmgCoefMul: 1.1, skipMarket: true },
      { id: "shaolin-amb-bait", title: "夹道·诱敌", blurb: "你故意咳一声。他们跟上来，你先把彩金攥进手里。下一馆会多一名替补。**下一馆多 1 名替补。袋里彩金 +10。**", risk: "danger", extraWaves: 1, potDelta: 10 },
      { id: "shaolin-amb-rest", title: "夹道·装死", blurb: "你躺进落叶里。他们踩过去，骂了一声。香袋没碰你的腰包。**袋里彩金 +6。不添替补。**", risk: "safe", potDelta: 6 },
      { id: "shaolin-amb-mark", title: "夹道·记仇", blurb: "你削断他们的香袋。线散在泥里。他们把你的步子记进规矩。**下一馆打不出位移牌（进步、撤步、换位、纵步）。底彩 ×1.15。**", risk: "danger", hallLaw: "noMove", basePotMul: 1.15 },
      { id: "shaolin-amb-side", title: "夹道·支线", blurb: "林子里还有一仗。有人喊你的号，钟声听不见了。馆号不往上走。**短打，不占馆号，禁注。赢了彩金 +22，下一摊免费奖励多抽 1。输了彩金 −10。**", risk: "danger", sideSkirmish: true },
    ];
  }
  if (path === "court") {
    return [
      { id: "court-amb-sneak", title: "黑巷·贴墙", blurb: `${warn}你贴着官墙走。灯还灭着。差役把脸偏向墙。**不添替补，营地不多抽牌。**`, risk: "safe" },
      { id: "court-amb-pay", title: "黑巷·塞银", blurb: "腰牌敲在桌上。你付钱，差役把灯重新点上，班次给你让开。**花 14 彩金。下一摊营地免费奖励多抽 1。**", risk: "rich", potDelta: -14, rewardBonus: 1 },
      { id: "court-amb-rush", title: "黑巷·硬闯", blurb: "你踢开灯笼。纸火在巷里滚，门后有人跟上来。**下一馆多 1 名替补。底彩 ×1.2。**", risk: "danger", extraWaves: 1, basePotMul: 1.2 },
      { id: "court-amb-file", title: "黑巷·翻档", blurb: "花钱换暗桩。书吏把今夜点名册翻开一角，下两馆谁当值写在边栏。**花 8 彩金，换下两馆人名。**", risk: "rich", potDelta: -8, intel: true },
      { id: "court-amb-skip", title: "黑巷·避摊", blurb: "你抄后巷。货摊的灯还关着。刀口会沉一点。**这一摊黑市跳过。下一馆伤害 ×1.1。**", risk: "danger", dmgCoefMul: 1.1, skipMarket: true },
      { id: "court-amb-bait", title: "黑巷·诱捕", blurb: "你故意露出刀。他们跟上来，你先把彩金攥进手里。**下一馆多 1 名替补。袋里彩金 +10。**", risk: "danger", extraWaves: 1, potDelta: 10 },
      { id: "court-amb-tea", title: "黑巷·冷茶", blurb: "你坐到茶摊上装过路人。茶是冷的，人走过去了。册上没写你的名字。**袋里彩金 +6。不添替补。**", risk: "safe", potDelta: 6 },
      { id: "court-amb-chain", title: "黑巷·锁步", blurb: "你踩进他们的绳套。步子迈不开，攻击必须贴上去。**下一馆攻击必须贴身。底彩 ×1.15。**", risk: "danger", hallLaw: "mustMelee", basePotMul: 1.15 },
      { id: "court-amb-side", title: "黑巷·支线", blurb: "更鼓巷里还有一仗。灯灭了一排。馆号不往上走。**短打，不占馆号，禁注。赢了彩金 +22，下一摊免费奖励多抽 1。输了彩金 −10。**", risk: "danger", sideSkirmish: true },
    ];
  }
  return [
    { id: "bandit-amb-sneak", title: "剪径·绕开", blurb: `${warn}你从田埂走。刀还横在官道上，刀主没回头。**不添替补，营地不多抽牌。**`, risk: "safe" },
    { id: "bandit-amb-pay", title: "剪径·买路", blurb: "把酒钱拍在刀面上。他们让路，刀收了回去。近路从沟沿出去。**花 14 彩金。下一摊营地免费奖励多抽 1。**", risk: "rich", potDelta: -14, rewardBonus: 1 },
    { id: "bandit-amb-rush", title: "剪径·硬闯", blurb: "你迎着刀走。刀主盯着你的腰包，后面还有人拔刀。**下一馆多 1 名替补。底彩 ×1.2。**", risk: "danger", extraWaves: 1, basePotMul: 1.2 },
    { id: "bandit-amb-ask", title: "剪径·问刀", blurb: "你认出刀上的记号。对方愣一下，把下两馆谁守口说给你听。**花 8 彩金，换下两馆人名。**", risk: "rich", potDelta: -8, intel: true },
    { id: "bandit-amb-skip", title: "剪径·不进寨", blurb: "你绕过酒寨。货摊的灯还关着。刀口会沉一点。**这一摊黑市跳过。下一馆伤害 ×1.1。**", risk: "danger", dmgCoefMul: 1.1, skipMarket: true },
    { id: "bandit-amb-bait", title: "剪径·诱敌", blurb: "你把钱袋晃一晃。他们跟上来，你先把彩金攥进手里。**下一馆多 1 名替补。袋里彩金 +10。**", risk: "danger", extraWaves: 1, potDelta: 10 },
    { id: "bandit-amb-sleep", title: "剪径·装醉", blurb: "你躺在沟里打呼。他们骂一声走了。腰包还在你身上。**袋里彩金 +6。不添替补。**", risk: "safe", potDelta: 6 },
    { id: "bandit-amb-blood", title: "剪径·见血", blurb: "你削了他们的旗。旗面落在泥里。他们把场子收窄，攻击必须贴上去。**下一馆攻击必须贴身。底彩 ×1.15。**", risk: "danger", hallLaw: "mustMelee", basePotMul: 1.15 },
    { id: "bandit-amb-side", title: "剪径·支线", blurb: "寨后门还有一仗。有人喊你的号。馆号不往上走。**短打，不占馆号，禁注。赢了彩金 +22，下一摊免费奖励多抽 1。输了彩金 −10。**", risk: "danger", sideSkirmish: true },
  ];
}

function stallCards(path: GauntletPath): EncounterChoice[] {
  const place = path === "shaolin" ? "香案" : path === "court" ? "档房" : "后进";
  return [
    {
      id: `${path}-stall-small`,
      title: `${place}·小注`,
      blurb: "押一小笔。骰盅还扣着，旁人看着你。事先没人告诉你停在哪一面。**点下去才开盅：约一半彩金 +18，一半 −14。不占馆号。**",
      risk: "rich",
      stall: "small",
    },
    {
      id: `${path}-stall-fold`,
      title: `${place}·不碰`,
      blurb: "你把杯子扣上。旁人笑你怂，庄家把下巴收回去。这一局跟你无关。**袋里彩金不动。下一馆人数照旧。**",
      risk: "safe",
    },
    {
      id: `${path}-stall-rumor`,
      title: `${place}·买口风`,
      blurb: "庄家把下巴一抬。你付钱，他把前面下两馆的人名按在桌上，旁人把眼睛盯着盅。**花 12 彩金，换下两馆人名。**",
      risk: "rich",
      potDelta: -12,
      intel: true,
    },
    {
      id: `${path}-stall-double`,
      title: `${place}·加一倍`,
      blurb: "把注加倍。骰盅还扣着，旁人往这边凑。事先没人告诉你停在哪一面。**点下去才开盅：约一半彩金 +28 且下一摊免费奖励多抽 1；约一半 −22 且下一馆多 1 名替补。**",
      risk: "danger",
      stall: "double",
    },
  ];
}

function marketCards(): EncounterChoice[] {
  return [
    {
      id: "market-enter",
      title: "掀开帘子",
      blurb: "帘子掀开。刀和药按成色标了价。掌柜按着账。**下一程营地开黑市。**",
      risk: "rich",
      openMarket: true,
    },
    {
      id: "market-walk",
      title: "帘外走过",
      blurb: "灯还亮。你没停。布帘在身后合上。**黑市这一程不开。**",
      risk: "safe",
    },
    {
      id: "market-tax",
      title: "问一问价",
      blurb: "掌柜把账翻过一页。货还在，价高一成。**袋里 −8。下一程营地开黑市。**",
      risk: "rich",
      openMarket: true,
      potDelta: -8,
    },
  ];
}

function companionCards(
  run: Pick<GauntletRun, "path" | "school" | "stage" | "companions" | "companion" | "seenEvents" | "castDraw" | "seenStoryIds">,
  rng: () => number,
): EncounterChoice[] {
  const ids = (usesBanditStory(run as GauntletRun) ? banditCompanionChoices(run as GauntletRun, rng) : rollCompanionChoices(run as GauntletRun, rng)).slice(0, 4);
  const modes = ["save", "duel", "buy", "save"] as const;
  const path = run.path;
  return ids.map((id, i) => {
    const who = rogueMate(id);
    const name = who?.name ?? MATES[id]?.name ?? id;
    const title = who?.title ?? "";
    const named = title ? `${name}·${title}` : name;
    const mode = modes[i] ?? "save";
    if (mode === "save") {
      const scene =
        i === 3
          ? path === "shaolin"
            ? `${named}肋上渗血，锡杖倒在泥里，刀对着他。柏树下旁人已经散开。你下场替他挡，仇家记住你的脸。`
            : path === "court"
              ? `${named}肋上渗血，巷口灯灭了一排，影卫退了半步，刀对着他。你下场替他挡，仇家记住你的脸。`
              : `${named}肋上渗血，桥下旁人已经散开，酒碗扣在泥里，刀对着他。你下场替他挡，仇家记住你的脸。`
          : path === "shaolin"
            ? `${named}被人堵在回廊口。刀已经出了鞘，他肋上渗着血，锡杖还撑得住。你下场替他挡这一刀，仇家会记住你的脸。`
            : path === "court"
              ? `${named}被人堵在巷口。刀已经出了鞘，令箭还在袖里，人还站得住。你下场替他挡这一刀，仇家会记住你的脸。`
              : `${named}被人堵在桥下。刀已经出了鞘，他肋上渗着血，还站得住。你下场替他挡这一刀，仇家会记住你的脸。`;
      return {
        id: `mate-save-${id}-${i}`,
        title: `${name}·伸手`,
        blurb: `${scene} **短打，禁注。赢了${name}入伙。下一馆多 1 名替补。**`,
        risk: "danger" as const,
        extraWaves: 1,
        skirmish: "save" as const,
        companionId: id,
      };
    }
    if (mode === "duel") {
      const scene =
        path === "shaolin"
          ? `${named}要跟你分个高低。他把兵器横在寺径上，等人过完晚课。点到为止，你赢了他才肯同行。`
          : path === "court"
            ? `${named}要跟你分个高低。他把兵器横在官道石上，等人过完换班。点到为止，你赢了他才肯同行。`
            : `${named}要跟你分个高低。他把兵器横在桥上，等人过完。点到为止，你赢了他才肯同行。`;
      return {
        id: `mate-duel-${id}`,
        title: `${name}·点到`,
        blurb: `${scene} **短打，禁注。你赢了${name}入伙，袋里彩金 +12。**`,
        risk: "rich" as const,
        potDelta: 12,
        skirmish: "duel" as const,
        companionId: id,
      };
    }
    const buy =
      path === "shaolin"
        ? `银子拍在${named}伤口上。不打。他站起来跟上，香案那一盏灯暗了。今晚黑市那一摊你见不着。`
        : path === "court"
          ? `银子拍在${named}伤口上。不打。他站起来跟上，档房那一盏灯暗了。今晚黑市那一摊你见不着。`
          : `银子拍在${named}伤口上。不打。他站起来跟上，货摊的灯暗了一排。今晚黑市那一盏你见不着。`;
    return {
      id: `mate-buy-${id}`,
      title: `${name}·买命`,
      blurb: `${buy} **当场入伙。花 36 彩金。这一摊黑市跳过。**`,
      risk: "rich" as const,
      potDelta: -36,
      skipMarket: true,
      companionId: id,
    };
  });
}

export function otherThemePath(path: GauntletPath): GauntletPath {
  if (path === "shaolin") return "court";
  if (path === "court") return "shaolin";
  return "court";
}

export function pickGuestEnemy(run: Pick<GauntletRun, "path" | "facedEnemies">): EnemyId | undefined {
  const used = new Set(run.facedEnemies ?? []);
  return pathLadder(otherThemePath(run.path))
    .map((e) => e.enemyId)
    .find((id) => !used.has(id));
}

function resolveStall(choice: EncounterChoice, rng: () => number): Partial<EncounterChoice> {
  if (choice.stall === "small") {
    const win = rng() < 0.5;
    return { potDelta: win ? 18 : -14 };
  }
  if (choice.stall === "double") {
    const win = rng() < 0.45;
    return win ? { potDelta: 28, rewardBonus: 1 } : { potDelta: -22, extraWaves: 1 };
  }
  return {};
}

export function rollEventChoices(
  run: Pick<GauntletRun, "path" | "scars" | "forceDangerNext" | "seenEvents" | "storyFlags" | "stage" | "school" | "companions" | "companion" | "pendingIntel">,
  kind: EncounterKind,
  rng: () => number = Math.random,
): EncounterChoice[] {
  const seen = run.seenEvents ?? [];
  const scarred = (run.scars ?? 0) > 0 || Boolean(run.forceDangerNext);
  const tipped = hasFlag(run, "inn-tip") || hasFlag(run, "zhou-tea");
  if (kind === "story" || kind === "travel") return [];
  if (kind === "market") return marketCards();
  if (kind === "inn") return shuffleTake(innCards(run.path), seen, rng, 4);
  if (kind === "fork") {
    const cross = run.stage >= 9;
    const rows = forkCards(run.path, cross, scarred);
    if (cross) {
      const guest = rows.find((c) => c.guestEnemy);
      const rest = shuffleTake(
        rows.filter((c) => !c.guestEnemy),
        seen,
        rng,
        scarred ? 2 : 3,
      );
      return guest ? [guest, ...rest] : rest;
    }
    if (scarred) {
      const danger = rows.filter((c) => c.risk === "danger");
      const safe = rows.filter((c) => c.risk === "safe");
      return shuffleTake([...danger, ...safe.slice(0, 1)], seen, rng, Math.min(3, danger.length + 1));
    }
    return shuffleTake(rows, seen, rng, 3);
  }
  if (kind === "ambush") return shuffleTake(ambushCards(run.path, tipped), seen, rng, 4);
  if (kind === "stall") return stallCards(run.path);
  if (kind === "companion") return companionCards(run, rng);
  return [
    {
      id: "hint-finale",
      title: "三道口风",
      blurb: run.pendingIntel
        ? `${pathSkin(run.path).road}线把人海、座前、私了说全了。人海：多 1 名替补，底彩 ×1.15。座前：护卫少 2 人，伤害 ×1.18。私了：必须贴身，底彩 ×0.7。开打前你还要再选一次。`
        : `${pathSkin(run.path).road}线有人咬耳朵。人海：轮番人多、货厚。座前：护卫少、下手狠。私了：必须贴身、彩金薄。三条赏格不一样。开打前你还要再选一次。`,
      risk: "safe",
    },
  ];
}

export function encounterConsequenceLine(choice: EncounterChoice): string {
  const bits = [`因你选了「${choice.title}」`];
  if (choice.potDelta && choice.potDelta > 0) bits.push(`袋里 +${choice.potDelta}`);
  if (choice.potDelta && choice.potDelta < 0) bits.push(`袋里 ${choice.potDelta}`);
  if (choice.extraWaves) bits.push(`下一馆多 ${choice.extraWaves} 名替补`);
  if (choice.dmgCoefMul && choice.dmgCoefMul > 1) bits.push("下一馆下手更狠");
  if (choice.dmgCoefMul && choice.dmgCoefMul < 1) bits.push("下一馆略松");
  if (choice.rewardBonus) bits.push(`下一摊免费奖励多抽 ${choice.rewardBonus}`);
  if (choice.basePotMul && choice.basePotMul !== 1) bits.push("下一馆底彩有变");
  if (choice.hallLaw === "noMove") bits.push("下一馆禁位移");
  if (choice.hallLaw === "mustMelee") bits.push("下一馆须贴身");
  if (choice.hallLaw === "earlyEye") bits.push("下一馆招眼提前");
  if (choice.skipMarket) bits.push("下一摊没有黑市");
  if (choice.intel) bits.push("换了一份暗桩");
  if (choice.forceDangerNext) bits.push("下一馆更险");
  if (choice.skirmish || choice.sideSkirmish) bits.push("先打一场馆间短战");
  if (choice.companionId) bits.push("有人愿同行");
  if (bits.length === 1) bits.push("路还是那条路");
  return bits.join(" · ");
}

export function applyEncounterChoice<T extends GauntletRun>(run: T, choice: EncounterChoice, rng: () => number = Math.random): T {
  const resolved = { ...choice, ...resolveStall(choice, rng) };
  const seen = [...(run.seenEvents ?? [])];
  if (!seen.includes(choice.id)) seen.push(choice.id);
  const flags = [...(run.storyFlags ?? [])];
  if (choice.storyFlag && !flags.includes(choice.storyFlag)) flags.push(choice.storyFlag);
  const pot = Math.max(0, run.pot + (resolved.potDelta ?? 0));
  const guest = choice.guestEnemy ? pickGuestEnemy(run) : undefined;
  const spine = Math.max(1, run.stage - 1);
  const sideAt = { ...(run.sideBranchAt ?? {}) };
  let pendingSideLabel = run.pendingSideLabel;
  let pendingSkirmish = choice.skirmish;
  if (choice.sideSkirmish) {
    const idx = (sideAt[spine] ?? 0) + 1;
    sideAt[spine] = idx;
    pendingSideLabel = `${spine}-${idx}`;
    pendingSkirmish = "side";
  }
  return {
    ...run,
    pot,
    seenEvents: seen,
    storyFlags: flags,
    pendingExtraWaves: (run.pendingExtraWaves ?? 0) + (resolved.extraWaves ?? 0),
    pendingDmgMul: resolved.dmgCoefMul ?? run.pendingDmgMul,
    pendingHallLaw: resolved.hallLaw ?? run.pendingHallLaw,
    pendingRewardBonus: (run.pendingRewardBonus ?? 0) + (resolved.rewardBonus ?? 0),
    pendingBasePotMul: resolved.basePotMul ?? run.pendingBasePotMul,
    pendingSkipMarket: resolved.skipMarket || run.pendingSkipMarket,
    pendingOpenMarket: Boolean(choice.openMarket) || run.pendingOpenMarket,
    pendingOpenWager: Boolean(choice.openWager) || run.pendingOpenWager,
    skipCompanionPick: run.skipCompanionPick,
    forceDangerNext: choice.forceDangerNext ? true : false,
    pendingIntel: choice.intel || run.pendingIntel,
    pendingSkirmish,
    pendingRecruit: choice.sideSkirmish ? undefined : choice.companionId,
    pendingGuestEnemyId: guest ?? run.pendingGuestEnemyId,
    pendingSideLabel: choice.sideSkirmish ? pendingSideLabel : run.pendingSideLabel,
    sideBranchAt: sideAt,
    lastPotText: resolved.potDelta
      ? `${choice.title}${resolved.potDelta > 0 ? " +" : " "}${resolved.potDelta}`
      : choice.title,
    lastEncounterNote: encounterConsequenceLine(choice),
  };
}

export function applyFinale<T extends GauntletRun>(run: T, kind: FinaleKind): T {
  const scars = run.scars ?? 0;
  if (kind === "mob") {
    return {
      ...run,
      finaleKind: kind,
      pendingExtraWaves: (run.pendingExtraWaves ?? 0) + 1 + scars,
      pendingBasePotMul: 1.15,
      pendingHallLaw: undefined,
    };
  }
  if (kind === "seat") {
    return {
      ...run,
      finaleKind: kind,
      pendingExtraWaves: (run.pendingExtraWaves ?? 0) - 2,
      pendingHallLaw: undefined,
      pendingDmgMul: 1.18,
    };
  }
  return {
    ...run,
    finaleKind: kind,
    pendingExtraWaves: -99,
    pendingHallLaw: "mustMelee",
    pendingBasePotMul: scars ? 0.55 : 0.7,
  };
}

export const FINALE_CHOICES: Array<{ id: FinaleKind; title: string; blurb: string }> = [
  { id: "mob", title: "人海", blurb: "他们把你围进场子。轮番上，灯火从四面压过来。场子里人多，货也厚。**下场多 1 名替补。底彩 ×1.15。带伤再多 1 名替补。**" },
  { id: "seat", title: "座前", blurb: "主座亲自看你。护卫退开两步，场子空了一截。不逼你读招，下手更重。**护卫少 2 人。下一馆伤害 ×1.18。不提前招眼。**" },
  { id: "private", title: "私了", blurb: "场子里留一人对你。灯灭了一排，步子迈不开。攻击必须贴上去。**必须贴身打。底彩 ×0.7。带伤底彩 ×0.55。**" },
];
