/**
 * 洛阳子场景：河南府牢房、烟波楼内室（12×10）
 * 由主城门洞 G / F 进入，回门 A → luoyang。
 */
import type { ChapterId, EnemyId } from "../game/types";
import type { GateKind, ItemId, SceneId, SealId } from "./types";
import type { MetroScene } from "./metro";

function rows(id: string, lines: string[]): string[] {
  const w = lines[0]?.length ?? 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]!.length !== w) throw new Error(`${id} row ${i} width ${lines[i]!.length} != ${w}`);
  }
  return lines;
}

/** 河南府·牢房 — 劫狱 / 狱卒 */
export const LUOYANG_YAMEN_PRISON: MetroScene = {
  id: "luoyang_yamen_prison" as SceneId,
  chapter: "court" as ChapterId,
  name: "河南府·牢房",
  kicker: "洛阳",
  enter: "铁锁比墨重。草席潮，水缸浑。墙上有旧枷印。",
  mood: "无票莫入。有刀另说。",
  ascii: rows("luoyang_yamen_prison", [
    "############",
    "#l.b....b.l#",
    "#..........#",
    "#.k......v.#",
    "#..........#",
    "#....1.....#",
    "#....m.....#",
    "#....@.....#",
    "#....,.....#",
    "######A#####",
  ]),
  npcs: { "1": "jailer" as EnemyId },
  talkers: { m: "luoJailer" },
  portals: { A: { to: "luoyang" as SceneId, at: "G" } },
  order: [] as SealId[],
  gate: "open" as GateKind,
  signs: ["侧牢。枷在壁上。"],
  items: {} as Record<string, ItemId>,
};

/** 烟波楼·内室 — 牡丹谱 / 阿砂 */
export const LUOYANG_YANBO_INNER: MetroScene = {
  id: "luoyang_yanbo_inner" as SceneId,
  chapter: "court" as ChapterId,
  name: "烟波楼·内室",
  kicker: "洛阳",
  enter: "纱帘半卷。妆台余粉。弦未定音。",
  mood: "谱在人不在刀。",
  ascii: rows("luoyang_yanbo_inner", [
    "############",
    "#l.&....&.l#",
    "#..u....h..#",
    "#..........#",
    "#.g......z.#",
    "#....n.....#",
    "#....m.....#",
    "#....@.....#",
    "#....o.....#",
    "######A#####",
  ]),
  npcs: {},
  talkers: { n: "luoAsha", m: "luoMadam" },
  portals: { A: { to: "luoyang" as SceneId, at: "F" } },
  order: [] as SealId[],
  gate: "open" as GateKind,
  signs: ["闺房。闲人止步。"],
  items: {} as Record<string, ItemId>,
};

export const LUOYANG_SUBSCENES: Record<string, MetroScene> = {
  luoyang_yamen_prison: LUOYANG_YAMEN_PRISON,
  luoyang_yanbo_inner: LUOYANG_YANBO_INNER,
};
