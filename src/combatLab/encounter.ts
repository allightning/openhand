import type { CompanionId, EnemyId } from "../game/types";
import type { GauntletPath } from "./gauntletPaths";
import { pathLadder } from "./gauntletPaths";
import type { GauntletRun } from "./gauntlet";
import { rollCompanionChoices } from "./gauntlet";
import { MATES } from "../game/party";
import { rogueMate } from "./rogueRoster";

export type EncounterKind = "inn" | "fork" | "companion" | "finaleHint" | "ambush" | "stall";
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
  skirmish?: "save" | "duel";
  storyFlag?: string;
  stall?: "small" | "double";
  companionId?: CompanionId;
  guestEnemy?: boolean;
}

export function eventAfterFought(fought: number): EncounterKind | null {
  if (fought === 1) return "inn";
  if (fought === 2 || fought === 4 || fought === 8) return "fork";
  if (fought === 3 || fought === 7) return "companion";
  if (fought === 5) return "ambush";
  if (fought === 6) return "stall";
  if (fought === 9) return "finaleHint";
  return null;
}

export function shouldShowFinale(run: Pick<GauntletRun, "stage" | "finaleKind">): boolean {
  return run.stage === 10 && !run.finaleKind;
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
    if (line === "shaolin") return "斋堂只剩一盏灯。行者空明把素面推过来，不劝你吃。窗外有人念晚课，念到一半停了。";
    if (line === "court") return "官驿堂屋空着。捕快赵三把腰牌扣在桌上：前面差役换了班。他看你刀伤，像看一份还没写完的供。";
    return tipped
      ? "掌柜老周认得你。碗还没热，他已经把后门的钥匙转了一圈，等你开口。"
      : "客栈只剩掌柜老周在擦碗。他认得刀伤，不问你从哪来，只问这一碗茶还喝不喝。";
  }
  if (kind === "fork") {
    if (line === "shaolin") return "寺径在雾里分成三条。钟声、林更深、还有一条被人新踩出来的泥印。没有僧人指路。";
    if (line === "court") return "官道到此立着旧石。正面写「止步」，背面刮过。旁边又多了一条没上图的巷。";
    return "荒路没了辙印。左边炊烟，右边血腥，中间有人丢下一只还温着的酒碗。";
  }
  if (kind === "ambush") {
    if (line === "shaolin") return "夹道里突然没了蝉声。空明若在，会叫你别抬头。你得自己选：冲、绕、还是给香钱。";
    if (line === "court") return "巷口灯灭了一排。赵三若在，会拦你。今夜只有你，和三条都能走的黑。";
    return tipped
      ? "老周说过剪径换了刀。现在刀就横在路中，刀主还在看你的腰包。"
      : "路忽然窄了。有人咳嗽一声，像约好了似的。";
  }
  if (kind === "stall") {
    if (line === "shaolin") return "香案侧面摊开一局叶子戏。沙弥说寺里不许赌，手却没收回去。";
    if (line === "court") return "夜班书吏把骰盅扣在档册上：官银不能动，私钱可以。他笑得很浅。";
    return "酒楼后进有人拍桌子。掌柜不劝也不拦，只给你添一杯冷的。";
  }
  if (kind === "companion") {
    const first = run.companions?.[0] ?? run.companion;
    const name = first ? MATES[first]?.name : "";
    if (name) {
      if (line === "shaolin") return `${name}在林边顿住。那边坐着个带伤的人，锡杖还在泥里。他看你一眼，像在问你还认不认同门。`;
      if (line === "court") return `${name}把袖里的令箭按住。巷口那人被影卫盯上了——是仇，还是该伸的手，得你说。`;
      return `${name}认桥下那口血。「我跟过他。」他说完就不作声，把选择留给你。`;
    }
    if (line === "shaolin") return "路边坐着个带伤的武僧，锡杖插在泥里。他看你一眼，既不像求援，也不像过客。";
    if (line === "court") return "巷口有人被影卫盯上。她把令箭塞进袖里，问你敢不敢伸手。";
    return "桥下有人捂着肋。刀还在，人还醒。他抬眼认你，像认一条还能走的路。";
  }
  const intel = Boolean(run.pendingIntel);
  const scar = (run.scars ?? 0) > 0;
  if (line === "shaolin") {
    return intel
      ? `方丈院墙外有人把三条终局说全了：人海人多货厚${scar ? "，你带伤会被再挤一名" : ""}；座前下手更狠、护卫少；私了必须贴身、彩金薄。`
      : "方丈院墙外有人低声说：终馆不是比武，是看你还认不认山门的规矩。口风不全。";
  }
  if (line === "court") {
    return intel
      ? "夜班书吏把残档补齐：人海、座前、私了都写了赏格。座前不逼你读招，只是主座出手更重。"
      : "夜班书吏把一卷残档推过来：殿前有三条走法，写下来的只有两条。";
  }
  return intel
    ? "酒客散了。桌上三道口风写全：人海围场、座前主座狠手、私了贴身薄赏。你听过暗桩，这回不瞎选。"
    : "酒客散了。有人用指甲在桌上划了三道：人海、座前、私了。说终馆只认这三字。";
}

export function eventTag(risk: EncounterRisk): string {
  if (risk === "danger") return "硬闯";
  if (risk === "rich") return "探路";
  return "歇脚";
}

const HALL_LAW_FX: Record<HallLaw, string> = {
  noMove: "下场禁位移",
  mustMelee: "下场必须贴身",
  earlyEye: "下场提前招眼",
};

/** 卡顶短标：一眼看出绕道、钱、人、入伙。 */
export function encounterOutcomeTag(c: EncounterChoice): string {
  if (c.id === "hint-finale") return "口风";
  if (c.skipCompanion) return "绕过";
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

/** 效果账本：钱、人、入伙、下场、营地。口味文案不顶这件事。 */
export function encounterEffectParts(c: EncounterChoice): string[] {
  const parts: string[] = [];
  if (c.id === "hint-finale") return ["记下口风", "开打前再选终馆"];
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
  if (id === "mob") return scarred ? "下场多人 · 底彩更厚 · 带伤再挤 1 人" : "下场多人 · 底彩更厚";
  if (id === "seat") return "护卫少 · 下手更狠 · 不提前招眼";
  return scarred ? "必须贴身 · 底彩更薄（带伤更薄）" : "必须贴身 · 底彩更薄";
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
      { id: "shaolin-inn-ask", title: "斋堂·问路", blurb: "空明用箸点后山。你丢几文斋钱。他说下一站禅院柜上会多一张谱。", risk: "rich", potDelta: -6, rewardBonus: 1, storyFlag: "inn-tip" },
      { id: "shaolin-inn-rest", title: "斋堂·歇脚", blurb: "你把素面吃完。不问钟。袋里多几文斋钱，下一馆照旧。", risk: "safe", potDelta: 8 },
      { id: "shaolin-inn-listen", title: "斋堂·听墙", blurb: "晚课停处有人换气。你花一笔香钱，把下两馆的人听进耳朵。", risk: "rich", potDelta: -10, intel: true },
      { id: "shaolin-inn-debt", title: "斋堂·挡债", blurb: "行堂欠了山外的人。你替他挡一晚：下一馆多一名替补，空明记下你的好。", risk: "danger", extraWaves: 1, storyFlag: "kongming-debt" },
    ];
  }
  if (path === "court") {
    return [
      { id: "court-inn-ask", title: "驿站·问路", blurb: "赵三换你一句班次。你丢几文打点，下一站官驿货会厚一点。", risk: "rich", potDelta: -6, rewardBonus: 1, storyFlag: "inn-tip" },
      { id: "court-inn-rest", title: "驿站·歇脚", blurb: "你在驿床上闭一会眼。差役换班与你无关。袋里多几文盘缠。", risk: "safe", potDelta: 8 },
      { id: "court-inn-listen", title: "驿站·买口供", blurb: "书吏要银子。你给了，他把下两馆差役名册翻给你看。", risk: "rich", potDelta: -10, intel: true },
      { id: "court-inn-cover", title: "驿站·顶班", blurb: "你替赵三挡一班夜巡。下一馆多一名记仇的人，他欠你一次。", risk: "danger", extraWaves: 1, storyFlag: "zhao-cover" },
    ];
  }
  return [
    { id: "bandit-inn-ask", title: "客栈·问路", blurb: "老周压低声音：剪径的人换了刀。你付茶钱，下一站酒楼柜上多一张货。", risk: "rich", potDelta: -6, rewardBonus: 1, storyFlag: "zhou-tea" },
    { id: "bandit-inn-rest", title: "客栈·歇脚", blurb: "你要一间房，把门闩上。老周不再说话。袋里多几文酒钱。", risk: "safe", potDelta: 8 },
    { id: "bandit-inn-listen", title: "客栈·听墙根", blurb: "隔壁有人报路。你给老周封口费，把下两馆听清楚。", risk: "rich", potDelta: -10, intel: true },
    { id: "bandit-inn-help", title: "客栈·挡债", blurb: "讨债的人堵在柜上。你替老周挡：下一馆多一名替补，他记住你的脸。", risk: "danger", extraWaves: 1, storyFlag: "zhou-tea" },
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
          ? "你顺着钟声走大路。伏桩让给别人。下一馆人不多，柜上也不肥。"
          : path === "court"
            ? "你贴着官道走。影卫看你一眼就放过去。下一馆不添人。"
            : "你绕开血腥那条。炊烟处只是猎户。下一馆人数不涨。",
      risk: "safe",
    },
    {
      id: `${path}-fork-rich`,
      title: `${skin.fork}·买路`,
      blurb:
        path === "shaolin"
          ? "香钱塞进木鱼。沙弥给你一条近路。袋里轻了，下一站禅院免费多抽一张。"
          : path === "court"
            ? "你把盘缠递给夜班书吏。他改路签。下一站官驿柜上多一张。"
            : "剪径的人伸手要过路费。你付了。下一站酒楼免费多抽一张。",
      risk: "rich",
      potDelta: -12,
      rewardBonus: 1,
    },
    {
      id: `${path}-fork-danger`,
      title: `${skin.fork}·硬闯`,
      blurb:
        path === "shaolin"
          ? "你踩进深林。伏桩会跟上来：下一馆多一名替补，底彩更厚。"
          : path === "court"
            ? "你偏不走官道。下一馆会多一名差役记仇，底彩按险路算。"
            : "你朝血腥处走。下一馆多一名替补拦路，底彩更厚。带伤时还可能锁死位移。",
      risk: "danger",
      extraWaves: 1,
      basePotMul: 1.2,
      hallLaw: scarred ? "noMove" : undefined,
    },
    {
      id: `${path}-fork-favor`,
      title: `${skin.fork}·人情`,
      blurb: "路边有人求你带一句口信。答应了：下一馆不添乱，可货架会薄一摊。",
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
          ? "林尽处看见朝廷腰牌。你若踩过去，下场会碰上差役的人，货却是另一路的。"
          : path === "court"
            ? "巷子尽头有木鱼声。你若跟进去，下场会多一名武僧，赏也按险路算。"
            : "炊烟那边有人念佛号。你若去，下场会摸到少林的桩，底彩更厚。",
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
      { id: "shaolin-amb-sneak", title: "夹道·绕林", blurb: `${warn}你贴着墙根走。不添人，也不发财。`, risk: "safe" },
      { id: "shaolin-amb-pay", title: "夹道·香钱", blurb: "把袋里银子丢进草里。伏桩让路，柜上多一张谱。", risk: "rich", potDelta: -14, rewardBonus: 1 },
      { id: "shaolin-amb-rush", title: "夹道·硬闯", blurb: "你踩断枯枝。下一馆多一名替补，底彩按险路算。", risk: "danger", extraWaves: 1, basePotMul: 1.2 },
      { id: "shaolin-amb-talk", title: "夹道·问名", blurb: "你报山门。对方愣一下。花一笔钱看清他们是谁。", risk: "rich", potDelta: -8, intel: true },
      { id: "shaolin-amb-night", title: "夹道·摸黑", blurb: "不点灯。下一馆伤重一点，可跳过一摊黑市。", risk: "danger", dmgCoefMul: 1.1, skipMarket: true },
      { id: "shaolin-amb-bait", title: "夹道·诱敌", blurb: "你故意咳一声。他们跟上来，下场多一人，你先拿一笔薄彩。", risk: "danger", extraWaves: 1, potDelta: 10 },
      { id: "shaolin-amb-rest", title: "夹道·装死", blurb: "你躺进落叶里。他们踩过去。袋里多几文，人也不添。", risk: "safe", potDelta: 6 },
      { id: "shaolin-amb-mark", title: "夹道·记仇", blurb: "你削断他们的香袋。下一馆馆法禁位移，底彩更厚。", risk: "danger", hallLaw: "noMove", basePotMul: 1.15 },
    ];
  }
  if (path === "court") {
    return [
      { id: "court-amb-sneak", title: "黑巷·贴墙", blurb: `${warn}你贴着官墙走。不添人。`, risk: "safe" },
      { id: "court-amb-pay", title: "黑巷·塞银", blurb: "腰牌敲在桌上。你付钱，柜上多一张。", risk: "rich", potDelta: -14, rewardBonus: 1 },
      { id: "court-amb-rush", title: "黑巷·硬闯", blurb: "你踢开灯笼。下一馆多一名差役，底彩按险路算。", risk: "danger", extraWaves: 1, basePotMul: 1.2 },
      { id: "court-amb-file", title: "黑巷·翻档", blurb: "花钱看今夜点名册。下两馆不再瞎打。", risk: "rich", potDelta: -8, intel: true },
      { id: "court-amb-skip", title: "黑巷·避摊", blurb: "你抄后巷。跳过黑市，伤会重一点。", risk: "danger", dmgCoefMul: 1.1, skipMarket: true },
      { id: "court-amb-bait", title: "黑巷·诱捕", blurb: "你故意露出刀。他们跟上来：下场多一人，你先拿薄彩。", risk: "danger", extraWaves: 1, potDelta: 10 },
      { id: "court-amb-tea", title: "黑巷·冷茶", blurb: "你坐到茶摊上装过路人。袋里多几文。", risk: "safe", potDelta: 6 },
      { id: "court-amb-chain", title: "黑巷·锁步", blurb: "你踩进他们的绳套。下一馆必须贴身打，底彩更厚。", risk: "danger", hallLaw: "mustMelee", basePotMul: 1.15 },
    ];
  }
  return [
    { id: "bandit-amb-sneak", title: "剪径·绕开", blurb: `${warn}你从田埂走。不添人。`, risk: "safe" },
    { id: "bandit-amb-pay", title: "剪径·买路", blurb: "把酒钱拍在刀面上。他们让路，柜上多一张。", risk: "rich", potDelta: -14, rewardBonus: 1 },
    { id: "bandit-amb-rush", title: "剪径·硬闯", blurb: "你迎着刀走。下一馆多一名替补，底彩更厚。", risk: "danger", extraWaves: 1, basePotMul: 1.2 },
    { id: "bandit-amb-ask", title: "剪径·问刀", blurb: "你认出刀上的记号。花一笔钱把后面的人问清楚。", risk: "rich", potDelta: -8, intel: true },
    { id: "bandit-amb-skip", title: "剪径·不进寨", blurb: "你不进他们的酒寨。跳过黑市，下手会重。", risk: "danger", dmgCoefMul: 1.1, skipMarket: true },
    { id: "bandit-amb-bait", title: "剪径·诱敌", blurb: "你把钱袋晃一晃。他们跟上来：下场多一人，你先拿薄彩。", risk: "danger", extraWaves: 1, potDelta: 10 },
    { id: "bandit-amb-sleep", title: "剪径·装醉", blurb: "你躺在沟里打呼。他们骂一声走了。袋里多几文。", risk: "safe", potDelta: 6 },
    { id: "bandit-amb-blood", title: "剪径·见血", blurb: "你削了他们的旗。下一馆必须贴身，底彩按险路算。", risk: "danger", hallLaw: "mustMelee", basePotMul: 1.15 },
  ];
}

function stallCards(path: GauntletPath): EncounterChoice[] {
  const place = path === "shaolin" ? "香案" : path === "court" ? "档房" : "后进";
  return [
    {
      id: `${path}-stall-small`,
      title: `${place}·小注`,
      blurb: "押一小笔。点下去才开盅：约一半机会当场多一笔，输了只丢这点钱。不占馆号。",
      risk: "rich",
      stall: "small",
    },
    {
      id: `${path}-stall-fold`,
      title: `${place}·不碰`,
      blurb: "你把杯子扣上。旁人笑你怂。袋里那点钱还在。",
      risk: "safe",
    },
    {
      id: `${path}-stall-rumor`,
      title: `${place}·买口风`,
      blurb: "庄家把下巴一抬。你付钱，他把前面两馆的人名说清楚。",
      risk: "rich",
      potDelta: -12,
      intel: true,
    },
    {
      id: `${path}-stall-double`,
      title: `${place}·加一倍`,
      blurb: "把注加倍。点下去才开盅：赢了当场彩金加柜上多抽一张；输了丢钱，下一馆多一名替补。",
      risk: "danger",
      stall: "double",
    },
  ];
}

function companionCards(
  run: Pick<GauntletRun, "path" | "school" | "stage" | "companions" | "companion" | "seenEvents">,
  rng: () => number,
): EncounterChoice[] {
  const ids = rollCompanionChoices(run as GauntletRun, rng).slice(0, 3);
  const modes = ["save", "duel", "buy"] as const;
  const out: EncounterChoice[] = ids.map((id, i) => {
    const who = rogueMate(id);
    const name = who?.name ?? MATES[id]?.name ?? id;
    const title = who?.title ?? MATES[id]?.title ?? "";
    const mode = modes[i] ?? "save";
    if (mode === "save") {
      return {
        id: `mate-save-${id}`,
        title: `${name}·伸手`,
        blurb: `${name}被围住了。你下场替他挡刀——短打、禁注。赢了，${title}跟你走；仇家下一馆多派一名杂手。`,
        risk: "danger",
        extraWaves: 1,
        skirmish: "save",
        companionId: id,
      };
    }
    if (mode === "duel") {
      return {
        id: `mate-duel-${id}`,
        title: `${name}·点到`,
        blurb: `${name}要跟你分个高低。短打、禁注、不占馆号。你赢了，他跟你走，袋里多一笔薄彩。`,
        risk: "rich",
        potDelta: 12,
        skirmish: "duel",
        companionId: id,
      };
    }
    return {
      id: `mate-buy-${id}`,
      title: `${name}·买命`,
      blurb: `银子拍在${name}伤口上。不打。他跟你走，这一摊货会难看一点。`,
      risk: "rich",
      potDelta: -36,
      skipMarket: true,
      companionId: id,
    };
  });
  out.push({
    id: "mate-refuse",
    title: "路过",
    blurb: "你当没看见。这站同道空过，下一馆也不添乱。馆 7 仍会再遇上人。",
    risk: "safe",
    skipCompanion: true,
  });
  return out;
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
  const scarred = (run.scars ?? 0) > 0 || run.forceDangerNext;
  const tipped = hasFlag(run, "inn-tip") || hasFlag(run, "zhou-tea");
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
        ? `${pathSkin(run.path).road}线把人海、座前、私了说全了。座前是主座下手更狠，不是逼你读招。开打前你还要再选一次。`
        : `${pathSkin(run.path).road}线有人咬耳朵：人海——轮番人多、货厚；座前——护卫少、下手狠；私了——必须贴身、彩金薄。开打前你还要再选一次。`,
      risk: "safe",
    },
  ];
}

export function applyEncounterChoice<T extends GauntletRun>(run: T, choice: EncounterChoice, rng: () => number = Math.random): T {
  const resolved = { ...choice, ...resolveStall(choice, rng) };
  const seen = [...(run.seenEvents ?? [])];
  if (!seen.includes(choice.id)) seen.push(choice.id);
  const flags = [...(run.storyFlags ?? [])];
  if (choice.storyFlag && !flags.includes(choice.storyFlag)) flags.push(choice.storyFlag);
  const pot = Math.max(0, run.pot + (resolved.potDelta ?? 0));
  const guest = choice.guestEnemy ? pickGuestEnemy(run) : undefined;
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
    skipCompanionPick: undefined,
    forceDangerNext: choice.forceDangerNext ? true : false,
    pendingIntel: choice.intel || run.pendingIntel,
    pendingSkirmish: choice.skirmish,
    pendingRecruit: choice.companionId,
    pendingGuestEnemyId: guest ?? run.pendingGuestEnemyId,
    lastPotText: resolved.potDelta
      ? `${choice.title}${resolved.potDelta > 0 ? " +" : " "}${resolved.potDelta}`
      : choice.title,
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
  { id: "mob", title: "人海", blurb: "他们把你围进场子。轮番上，货厚、底彩高。你若带着伤痕，还会再挤进一名。" },
  { id: "seat", title: "座前", blurb: "主座亲自看你。护卫少，下手更狠——不是逼你读招，是这一馆打得更疼。" },
  { id: "private", title: "私了", blurb: "只留一人对你。必须贴身，不许拉开。彩金薄，可这一馆能尽快打完。" },
];
