import type { SceneId } from "./types";

/**
 * 天下一级城（小地图大点）。
 * 方位约定：x 东、y 南，大致合宋时地理——
 * 北：长安→洛阳→汴京；淮：淮阴、扬州；江左：建康→苏州→临安。
 */
export const PRIMARY_CITIES: SceneId[] = [
  "changan",
  "luoyang",
  "bianjing",
  "usurpCamp",
  "huainan",
  "yangzhou",
  "jiankang",
  "suzhou",
  "linan",
];

/** Roadside towns between primaries (atlas secondary size). */
export const TRANSIT_TOWNS: SceneId[] = [
  "jiaxing",
  "wuxi",
  "changzhou",
  "chuzhou",
  "suqian",
  "suzhousu",
  "bozhou",
  "yanshi",
  "shanzhou",
  "tongguan",
  "gaoyou",
];
