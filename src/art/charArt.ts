import { artUrl } from "./artUrl";
import { GAUNTLET_FOE_IDENTITY, schoolForGeneratedEnemy } from "../game/enemyKit";
import type { WeaponId } from "../game/types";

/**
 * 角色站位图。用户 2026-08-31 定：立绘原图整图直用（full.png，不抠图不清角标，
 * 与旧立绘同 cover 铺满）；入库脚本 scripts/full_hero.py（原图直拷）。
 * 后续姿势图入库后在 POSE_FILE 里补映射即可。
 *
 * 2026-09-01：花名册 18 人 + 精英/杂兵水墨立绘（仿沈夜行 full.png），
 * 杂兵按门派×兵刃共用 archetype；具名精英独占。
 */
export type CharPose = "idle" | "guard" | "attack" | "break" | "death";

/** CompanionId → public/art/... 相对目录（不含 art/ 前缀） */
const CHAR_DIR: Record<string, string> = {
  watch: "char/hero", // 沈夜行 · 夜巡刀
  baimenghe: "char/baimenghe",
  wenrensheng: "char/wenrensheng",
  huochangchuan: "char/huochangchuan",
  shiwanshan: "char/shiwanshan",
  moqiwan: "char/moqiwan",
  lvchifeng: "char/lvchifeng",
  zhounuanxiang: "char/zhounuanxiang",
  boqing: "char/boqing",
  ananhuo: "char/ananhuo",
  zhangshoushan: "char/zhangshoushan",
  chenchenlan: "char/chenchenlan",
  lishuangxing: "char/lishuangxing",
  fubishan: "char/fubishan",
  duguposui: "char/duguposui",
  gongsunsizhang: "char/gongsunsizhang",
  fengtang: "char/fengtang",
  ouyangyingou: "char/ouyangyingou",
};

/** 具名精英 / Boss 独占立绘 */
const FOE_UNIQUE: Record<string, string> = {
  mob_monk_05: "char/elite_monk_ward",
  mob_monk_08: "char/elite_monk_luohan",
  mob_monk_12: "char/elite_monk_ward",
  mob_escortBand_02: "char/elite_escort_shatter",
  mob_escortBand_03: "char/elite_escort_snare",
  mob_court_04: "char/elite_court_jinyi",
  mob_court_07: "char/elite_court_assassin",
  // 其它 stamp 精英：同系共用一张精英板（可后补独占）
  mob_road_05: "char/elite_escort_shatter",
  mob_road_08: "char/elite_escort_shatter",
  mob_canal_03: "char/elite_escort_snare",
  mob_canal_04: "char/elite_escort_shatter",
  mob_canal_05: "char/elite_escort_shatter",
  mob_yamenRunner_03: "char/elite_court_jinyi",
};

const POSE_FILE: Record<CharPose, string> = {
  idle: "full.png",
  guard: "full.png",
  attack: "full.png",
  break: "full.png",
  death: "full.png",
};

function mookDir(school: WeaponId, path?: string): string {
  if (path === "shaolin") {
    if (school === "staff") return "char/mook_monk_staff";
    if (school === "saber") return "char/mook_monk_saber";
    return "char/mook_monk_palm";
  }
  if (path === "court") {
    if (school === "sword") return "char/mook_court_sword";
    if (school === "saber") return "char/mook_court_saber";
    return "char/mook_court_palm";
  }
  // jianghu / 默认
  if (school === "hook") return "char/mook_jianghu_hook";
  if (school === "spear") return "char/mook_jianghu_spear";
  if (school === "staff") return "char/mook_monk_staff";
  if (school === "sword") return "char/mook_court_sword";
  if (school === "palm") return "char/mook_monk_palm";
  return "char/mook_road_saber";
}

/** 踢馆 mob_/luohan_ → 立绘目录；无则 null（走旧 ink 回落） */
export function resolveFoeCharDir(id: string): string | null {
  if (FOE_UNIQUE[id]) return FOE_UNIQUE[id]!;
  if (!id.startsWith("mob_") && !id.startsWith("luohan_")) return null;
  const ident = GAUNTLET_FOE_IDENTITY[id];
  const school = schoolForGeneratedEnemy(id);
  const path = ident?.path ?? (id.startsWith("luohan_") ? "shaolin" : undefined);
  return mookDir(school, path);
}

export function hasCharArt(id: string): boolean {
  return id in CHAR_DIR;
}

export function hasFoeCharArt(id: string): boolean {
  return resolveFoeCharDir(id) != null;
}

export function charArtSrc(id: string, pose: CharPose = "idle"): string {
  const dir = CHAR_DIR[id];
  return artUrl(`art/${dir}/${POSE_FILE[pose]}`);
}

export function foeCharArtSrc(id: string, pose: CharPose = "idle"): string | null {
  const dir = resolveFoeCharDir(id);
  if (!dir) return null;
  return artUrl(`art/${dir}/${POSE_FILE[pose]}`);
}

/** 与旧立绘同一渲染路径（.stand cover），头像略偏上取景避免斗笠顶被裁。 */
export function charArt(id: string, kind = "", pose: CharPose = "idle"): string {
  return `<img class="stand char-full ${kind}" src="${charArtSrc(id, pose)}" alt="" draggable="false" decoding="async" loading="eager">`;
}

export function foeCharArt(id: string, kind = "", pose: CharPose = "idle"): string | null {
  const src = foeCharArtSrc(id, pose);
  if (!src) return null;
  return `<img class="stand char-full ${kind}" src="${src}" alt="" draggable="false" decoding="async" loading="eager">`;
}

/** 助战符用水墨杂兵板，不和本系主角撞脸。 */
export function summonCharArt(school: WeaponId, kind = ""): string {
  const src = artUrl(`art/${mookDir(school)}/${POSE_FILE.idle}`);
  return `<img class="stand char-full ${kind}" src="${src}" alt="" draggable="false" decoding="async" loading="eager">`;
}
