import { escapeHtml } from "./setupUi";
import type { GauntletPath } from "./gauntletPaths";

export interface ClimbPlace {
  id: string;
  /** 地名：城市 / 殿 / 坊巷 */
  name: string;
  /** 歇脚点称呼 */
  rest: string;
  blurb: string;
  restBg: string;
}

const BANDIT_PLACES: ClimbPlace[] = [
  { id: "jh-kaifeng", name: "开封 · 州桥", rest: "州桥酒楼", blurb: "汴水从桥下走。州桥酒楼里酒烫着，柜上按刀口记账。桥上有人停了一步。", restBg: "art/scenes/scene-quiet-inn.png" },
  { id: "jh-caozhou", name: "曹州 · 野店", rest: "土路客栈", blurb: "店门半掩。土路还湿着，靴印通向下一馆。柜上搁着半碗冷酒，掌柜在擦刀。", restBg: "art/scenes/scene-quiet-lane.png" },
  { id: "jh-liangshan", name: "梁山泊 · 水寨外", rest: "寨外茶棚", blurb: "芦苇挡住去路。对岸有人停在水边。茶凉了半杯。棚外风把旗吹斜。", restBg: "art/scenes/scene-inn-yard.png" },
  { id: "jh-jinan", name: "济南 · 大明湖", rest: "湖畔歇脚", blurb: "城在水里。镖局的人，水都温些。湖面上有船。茶摊还开着，靠岸的客把茶碗扣着，账写在碗底。", restBg: "art/scenes/scene-moon-bridge.png" },
  { id: "jh-taian", name: "泰安 · 岱宗坊", rest: "坊下茶摊", blurb: "进山的人从坊下过，下来的人少。坊下茶摊还开着，账写在碗底。茶钱按刀口算。", restBg: "art/scenes/scene-quiet-fork.png" },
  { id: "jh-yanzhou", name: "兖州 · 城关", rest: "关厢客店", blurb: "城门未关。关厢店里有人擦刀。店外辙印断了，夜里过路的人脚步很快。", restBg: "art/scenes/scene-fork.png" },
  { id: "jh-xuzhou", name: "徐州 · 驿亭", rest: "官驿外棚", blurb: "文书走官道，刀走夜路。外棚还亮着灯。棚柱上有人用指甲划过路。", restBg: "art/scenes/scene-quiet-gate.png" },
  { id: "jh-yangzhou", name: "扬州 · 二十四桥", rest: "桥头酒家", blurb: "灯还亮着。账已经写在水上。桥上有人停步，看着河。酒家添了一杯冷的。", restBg: "art/scenes/scene-place-jh-yangzhou.png" },
  { id: "jh-jinling", name: "金陵 · 秦淮", rest: "河房一间", blurb: "画船停在河心。靠岸的人来讨债。河房门闩还温着，里面有人压低声音。灯灭了一半。", restBg: "art/scenes/scene-place-jh-jinling.png" },
  { id: "jh-end", name: "落脚 · 终馆", rest: "无名堂口", blurb: "路走到头。堂口剩一张桌子。灯灭了一半。人海、座前、私了，三条赏格不一样。", restBg: "art/scenes/scene-fight-jianghu-hall.png" },
];

const SHAOLIN_PLACES: ClimbPlace[] = [
  { id: "sl-shanmen", name: "少林 · 山门", rest: "山门廊", blurb: "钟响过一次。门还开着。廊下有人扫地，扫帚压在砖上。香钱按在砖缝里，晚课的钟还在响。", restBg: "art/scenes/scene-quiet-shaolin.png" },
  { id: "sl-tianwang", name: "天王殿", rest: "殿侧斋棚", blurb: "四天王泥塑立着。守殿的人把素面推到你手边。斋棚还热着。行者空明在廊下看着碗。", restBg: "art/scenes/scene-teahouse.png" },
  { id: "sl-daxiong", name: "大雄宝殿", rest: "月台石阶", blurb: "香灰厚。月台石阶还凉着。钟声从后山折回来。近路要香钱。", restBg: "art/scenes/scene-quiet-tea.png" },
  { id: "sl-zangjing", name: "藏经阁外", rest: "阁前柏下", blurb: "经卷锁在阁里。拳拦在路上。柏树下有人站着，锡杖插在泥里。伤在肋上的人还醒着。", restBg: "art/scenes/scene-place-sl-zangjing.png" },
  { id: "sl-luohan", name: "罗汉堂", rest: "堂外回廊", blurb: "十八身影。你过眼前这一身就够。回廊风把课诵吹散了一截。堂口灯灭着下一身，替补从林子里跟。", restBg: "art/scenes/scene-shaolin.png" },
  { id: "sl-damo", name: "达摩洞道", rest: "石径歇脚", blurb: "山风把话吹散。拳还在。石径歇脚处有人添了一盏灯。香袋的线在夹道里抖，货摊那一盏灭着。", restBg: "art/scenes/scene-place-sl-damo.png" },
  { id: "sl-baiyi", name: "白衣殿", rest: "殿角禅凳", blurb: "壁画上的人握着拳。禅凳空着一张，香还没燃尽。叶子戏摊在香案侧面，点下去才开盅。", restBg: "art/scenes/scene-fight-shaolin-luohan.png" },
  { id: "sl-fangzhang", name: "方丈院", rest: "院门影壁", blurb: "茶凉了。影壁后有人压低声音，问山门规矩。同道在林边顿住，四个人里你选一个同行。", restBg: "art/scenes/scene-fight-shaolin-gate.png" },
  { id: "sl-qianfo", name: "千佛殿", rest: "灯田外", blurb: "灯多。空位少。灯田外有人把香钱按在砖缝里。下两馆人名能买，终馆三条口风写到一半。", restBg: "art/scenes/scene-fight-shaolin-abbot.png" },
  { id: "sl-lixue", name: "立雪亭", rest: "亭下终馆", blurb: "亭下石台干着。桌子空着。人海、座前、私了，开打前还要再选一次。", restBg: "art/scenes/scene-winehouse.png" },
];

const COURT_PLACES: ClimbPlace[] = [
  { id: "ct-waiguo", name: "汴京 · 外郭", rest: "城门外驿", blurb: "腰牌能进门。驿棚还亮着，差役换班的脚印湿着。赵三把腰牌扣在桌上。四张条压在腰牌下。", restBg: "art/scenes/scene-home-gate.png" },
  { id: "ct-tianjie", name: "天街", rest: "御街茶棚", blurb: "路宽。刀藏在规矩里。茶棚有人扣盅。路签上写着官道，旁边多一条湿脚印。", restBg: "art/scenes/scene-place-court-tianjie.png" },
  { id: "ct-kaifengfu", name: "开封府前", rest: "府衙侧驿", blurb: "鼓未敲。人已经到了。侧驿冷茶搁着半杯，昨夜的名字沉在杯底。买口供能翻开名册一角。", restBg: "art/scenes/scene-quiet-yamen.png" },
  { id: "ct-jinming", name: "金明池", rest: "池上水榭", blurb: "游人散了。剩下当差的。水榭灯灭了一排，人还在岸上。同道把令箭按在袖里。", restBg: "art/scenes/scene-place-court-jinming.png" },
  { id: "ct-yamen", name: "衙廊", rest: "值房外", blurb: "案牍横着。刀也横着。值房外有人把腰牌扣在桌上。巷口灯灭了一排，门后有人换班。", restBg: "art/scenes/scene-yamen.png" },
  { id: "ct-danei", name: "大内廊", rest: "廊间歇脚", blurb: "灯灭了一排。差役换了班。廊间还留着半杯冷茶。骰盅扣在档册上，官银匣锁着。", restBg: "art/scenes/scene-quiet-yard.png" },
  { id: "ct-shumi", name: "枢密院侧", rest: "偏院茶灶", blurb: "公文走正面。人走侧面。茶灶温着，偏院有人压低声音。同道四选一，人数和花销写在选项上。", restBg: "art/scenes/scene-fight-court-inner.png" },
  { id: "ct-yujie", name: "御街夜", rest: "夜驿", blurb: "街空了。夜驿门闩还温着，里面有人翻档。下两馆人名能买，货摊那一盏能错过。", restBg: "art/scenes/scene-fight-court-night.png" },
  { id: "ct-neiting", name: "内廷值房", rest: "值房", blurb: "茶凉了。值房案上搁着没写完的供。残档补齐了，终馆三条赏格写在边上。", restBg: "art/scenes/scene-fight-court-gate.png" },
  { id: "ct-danqi", name: "丹墀", rest: "殿阶终馆", blurb: "座前留一人，或留一群。殿阶空着，灯火从四面压过来。人海、座前、私了，馆号仍是 10。", restBg: "art/scenes/scene-teahouse.png" },
];

export function climbPlaces(path: GauntletPath): ClimbPlace[] {
  if (path === "shaolin") return SHAOLIN_PLACES;
  if (path === "court") return COURT_PLACES;
  return BANDIT_PLACES;
}

export function climbPlace(path: GauntletPath, stage: number): ClimbPlace {
  const list = climbPlaces(path);
  const i = Math.max(0, Math.min(list.length - 1, stage - 1));
  return list[i]!;
}

export function wagerBgFor(path: GauntletPath): string {
  if (path === "shaolin") return "art/scenes/scene-wager-shaolin.png";
  if (path === "court") return "art/scenes/scene-wager-court.png";
  return "art/scenes/scene-wager-jianghu.png";
}

export function loadoutBgFor(path: GauntletPath): string {
  if (path === "shaolin") return "art/scenes/scene-loadout-shaolin.png";
  if (path === "court") return "art/scenes/scene-loadout-court.png";
  return "art/scenes/scene-loadout-jianghu.png";
}

export interface RouteLogEntry {
  stage: number;
  placeId: string;
  placeName: string;
  rest: string;
  note?: string;
}

export function upsertRouteLog(log: RouteLogEntry[] | undefined, entry: RouteLogEntry): RouteLogEntry[] {
  const next = [...(log ?? [])];
  const i = next.findIndex((e) => e.stage === entry.stage && e.placeId === entry.placeId);
  if (i >= 0) next[i] = { ...next[i]!, ...entry, note: entry.note ?? next[i]!.note };
  else next.push(entry);
  return next.sort((a, b) => a.stage - b.stage);
}

export function renderRouteBook(log: RouteLogEntry[], pathLabel: string): string {
  const rows =
    log.length === 0
      ? `<li>尚无落脚。开程之后才有路。</li>`
      : log
          .map(
            (e) =>
              `<li><b>${escapeHtml(e.placeName)}</b><span>${escapeHtml(e.rest)}${e.note ? ` · ${escapeHtml(e.note)}` : ""}</span></li>`,
          )
          .join("");
  return `
    <div class="lab-overlay lab-pile-mask" id="route-book-mask">
      <div class="lab-overlay-panel lab-pile-sheet" role="dialog" aria-labelledby="route-book-title">
        <header class="hall-chrome">
          <button type="button" class="lab-btn hall-back" id="route-book-close">收</button>
          <div class="hall-chrome-title">
            <h2 id="route-book-title">路程小本</h2>
            <p>${escapeHtml(pathLabel)} · 落过的城、殿、选择</p>
          </div>
        </header>
        <ul class="lab-pile-list">${rows}</ul>
      </div>
    </div>`;
}
