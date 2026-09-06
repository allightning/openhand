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
  { id: "jh-kaifeng", name: "开封 · 州桥", rest: "州桥酒楼", blurb: "汴水从桥下走。歇脚处只认刀伤，不认名号。", restBg: "art/scenes/scene-quiet-inn.png" },
  { id: "jh-caozhou", name: "曹州 · 野店", rest: "土路客栈", blurb: "店门半掩。下一馆从不报上号。", restBg: "art/scenes/scene-quiet-lane.png" },
  { id: "jh-liangshan", name: "梁山泊 · 水寨外", rest: "寨外茶棚", blurb: "芦苇挡住去路。有人在对岸看你。", restBg: "art/scenes/scene-inn-yard.png" },
  { id: "jh-jinan", name: "济南 · 大明湖", rest: "湖畔歇脚", blurb: "城在水里。镖局的人比水还冷。", restBg: "art/scenes/scene-moon-bridge.png" },
  { id: "jh-taian", name: "泰安 · 岱宗坊", rest: "坊下茶摊", blurb: "进山的人多，活着下来的少。", restBg: "art/scenes/scene-quiet-fork.png" },
  { id: "jh-yanzhou", name: "兖州 · 城关", rest: "关厢客店", blurb: "城门未关。关的是嘴。", restBg: "art/scenes/scene-fork.png" },
  { id: "jh-xuzhou", name: "徐州 · 驿亭", rest: "官驿外棚", blurb: "文书走官道，刀走夜路。", restBg: "art/scenes/scene-quiet-gate.png" },
  { id: "jh-yangzhou", name: "扬州 · 二十四桥", rest: "桥头酒家", blurb: "灯还亮着。账已经写在水上。", restBg: "art/scenes/scene-place-jh-yangzhou.png" },
  { id: "jh-jinling", name: "金陵 · 秦淮", rest: "河房一间", blurb: "画船不靠岸。靠岸的是要债的。", restBg: "art/scenes/scene-place-jh-jinling.png" },
  { id: "jh-end", name: "落脚 · 终馆", rest: "无名堂口", blurb: "路走到头。堂口只剩一张桌子。", restBg: "art/scenes/scene-fight-jianghu-hall.png" },
];

const SHAOLIN_PLACES: ClimbPlace[] = [
  { id: "sl-shanmen", name: "少林 · 山门", rest: "山门廊", blurb: "钟响过一次。门还开着。", restBg: "art/scenes/scene-quiet-shaolin.png" },
  { id: "sl-tianwang", name: "天王殿", rest: "殿侧斋棚", blurb: "四天王不开口。开口的是守殿的人。", restBg: "art/scenes/scene-teahouse.png" },
  { id: "sl-daxiong", name: "大雄宝殿", rest: "月台石阶", blurb: "香灰厚。规矩比香更厚。", restBg: "art/scenes/scene-quiet-tea.png" },
  { id: "sl-zangjing", name: "藏经阁外", rest: "阁前柏下", blurb: "经不外传。拳却拦路。", restBg: "art/scenes/scene-place-sl-zangjing.png" },
  { id: "sl-luohan", name: "罗汉堂", rest: "堂外回廊", blurb: "十八身影。你只需过眼前这一身。", restBg: "art/scenes/scene-shaolin.png" },
  { id: "sl-damo", name: "达摩洞道", rest: "石径歇脚", blurb: "山风把话吹散。拳还在。", restBg: "art/scenes/scene-place-sl-damo.png" },
  { id: "sl-baiyi", name: "白衣殿", rest: "殿角禅凳", blurb: "壁画看你。你看拳。", restBg: "art/scenes/scene-fight-shaolin-luohan.png" },
  { id: "sl-fangzhang", name: "方丈院", rest: "院门影壁", blurb: "茶凉了。问的不是茶。", restBg: "art/scenes/scene-fight-shaolin-gate.png" },
  { id: "sl-qianfo", name: "千佛殿", rest: "灯田外", blurb: "灯多。空位少。", restBg: "art/scenes/scene-fight-shaolin-abbot.png" },
  { id: "sl-lixue", name: "立雪亭", rest: "亭下终馆", blurb: "雪不在。规矩还在。", restBg: "art/scenes/scene-winehouse.png" },
];

const COURT_PLACES: ClimbPlace[] = [
  { id: "ct-waiguo", name: "汴京 · 外郭", rest: "城门外驿", blurb: "腰牌能进门。进门不等于能活。", restBg: "art/scenes/scene-home-gate.png" },
  { id: "ct-tianjie", name: "天街", rest: "御街茶棚", blurb: "路宽。刀藏在规矩里。", restBg: "art/scenes/scene-place-court-tianjie.png" },
  { id: "ct-kaifengfu", name: "开封府前", rest: "府衙侧驿", blurb: "鼓未敲。人已经到了。", restBg: "art/scenes/scene-quiet-yamen.png" },
  { id: "ct-jinming", name: "金明池", rest: "池上水榭", blurb: "游人散了。剩下当差的。", restBg: "art/scenes/scene-place-court-jinming.png" },
  { id: "ct-yamen", name: "衙廊", rest: "值房外", blurb: "案牍横着。刀也横着。", restBg: "art/scenes/scene-yamen.png" },
  { id: "ct-danei", name: "大内廊", rest: "廊间歇脚", blurb: "灯灭了一排。差役换了班。", restBg: "art/scenes/scene-quiet-yard.png" },
  { id: "ct-shumi", name: "枢密院侧", rest: "偏院茶灶", blurb: "公文走正面。人走侧面。", restBg: "art/scenes/scene-fight-court-inner.png" },
  { id: "ct-yujie", name: "御街夜", rest: "夜驿", blurb: "街空了。空的才危险。", restBg: "art/scenes/scene-fight-court-night.png" },
  { id: "ct-neiting", name: "内廷值房", rest: "值房", blurb: "茶是冷的。问话是热的。", restBg: "art/scenes/scene-fight-court-gate.png" },
  { id: "ct-danqi", name: "丹墀", rest: "殿阶终馆", blurb: "座前只留一人。或留一群。", restBg: "art/scenes/scene-teahouse.png" },
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
      ? `<li>尚无落脚。开踢之后才有路。</li>`
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
