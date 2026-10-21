import type { WeaponId } from "../game/types";

/**
 * 音效语义表。Notion「音乐音效」接线原则：按兵刃系 × 结算档复用，不为一招一条。
 * 值全部是现有 4 个占位（swing / clash / page / drop）。不新增音频文件。
 * 素材回来只改本表的值。
 *
 * 调用点现行音 → 查哪把键（应是 Notion 名；和现行占位不一致的写在键旁）：
 * - 出牌攻击、敌挥前摇、击杀、势爆、连击重放、拆招 85ms 回声：现行 swing。查 `windup`。
 *   出招短风以后并进 whiff；whiff 今天是打空的 drop，两处不能并成一格。
 * - 命中 / 玩家掉血：现行 clash。查兵刃 `*_hit`（不知系则 saber_hit，仍是 clash）。
 * - 拆 / 反击：现行 clash。查 `clash_blade`。
 * - 让 / 擦：现行 clash。查 `graze`。
 * - 架住（wall）：现行 clash。查 `block`。
 * - 打空 / 跳过：现行 drop。查 `whiff`。
 * - 非攻击且带步：现行 drop。查 `step`。
 * - 非攻击回血：现行 drop。查 `heal`。
 * - 非攻击格挡牌：现行 drop。查 `ward_gain`（格挡结算声是 block，牌面落子仍是 drop）。
 * - 其余技能牌：现行 drop。查 `qi_gain`。
 * - 收势：现行 drop。查 `end_turn`。
 * - 图鉴 / 攻略 / 设置打开：现行 page。查 `ink_ui`。
 * - 牌堆页：现行 page。查 `draw_card`。
 * - 音效滑条试听：现行 drop。查 `ui_confirm`。
 * - 共振：现行 drop。查 `aura`。
 * 表里有、调用点还没播：swap、bleed_tick、expose、intent_gone。
 * 已落码、等素材，只占键、不新接播放：断劲 qi_sever、噬血 blood_drink、
 * 裂桩爆炸 stake_blast、缴械 disarm、连击重放 combo_replay。
 * 连击重放按钮仍查 windup；combo_replay 同是 swing，改调用点也不会换文件。
 */

export type SfxSlot = "swing" | "clash" | "page" | "drop";

/** P0 十二键。验收要覆盖。 */
export const P0_SFX_KEYS = [
  "fist_hit",
  "saber_hit",
  "sword_hit",
  "spear_hit",
  "staff_hit",
  "hook_hit",
  "clash_blade",
  "graze",
  "whiff",
  "block",
  "step",
  "end_turn",
] as const;

/** P1，命名预留。 */
export const P1_SFX_KEYS = [
  "swap",
  "draw_card",
  "bleed_tick",
  "expose",
  "ward_gain",
  "ui_confirm",
  "intent_gone",
  "heal",
] as const;

/** P2，命名预留。 */
export const P2_SFX_KEYS = ["qi_gain", "ink_ui", "aura"] as const;

/** 已落码、等素材。不从这些键发声。 */
export const RESERVED_SFX_KEYS = [
  "qi_sever",
  "blood_drink",
  "stake_blast",
  "disarm",
  "combo_replay",
] as const;

/**
 * 出招挥空的现行占位行。
 * 听感应是 whiff，文件仍是 swing，避免打空从 drop 改成 swing。
 */
export const WINDUP_KEY = "windup" as const;

export type SfxKey =
  | (typeof P0_SFX_KEYS)[number]
  | (typeof P1_SFX_KEYS)[number]
  | (typeof P2_SFX_KEYS)[number]
  | (typeof RESERVED_SFX_KEYS)[number]
  | typeof WINDUP_KEY;

/** 语义键 → 现行占位。 */
export const SFX_MAP: Record<SfxKey, SfxSlot> = {
  fist_hit: "clash",
  saber_hit: "clash",
  sword_hit: "clash",
  spear_hit: "clash",
  staff_hit: "clash",
  hook_hit: "clash",
  clash_blade: "clash",
  graze: "clash",
  whiff: "drop",
  block: "clash",
  step: "drop",
  end_turn: "drop",
  swap: "drop",
  draw_card: "page",
  bleed_tick: "drop",
  expose: "clash",
  ward_gain: "drop",
  ui_confirm: "drop",
  intent_gone: "drop",
  heal: "drop",
  qi_gain: "drop",
  ink_ui: "page",
  aura: "drop",
  qi_sever: "drop",
  blood_drink: "drop",
  stake_blast: "clash",
  disarm: "drop",
  combo_replay: "swing",
  windup: "swing",
};

const HIT_KEY: Record<WeaponId, SfxKey> = {
  palm: "fist_hit",
  saber: "saber_hit",
  sword: "sword_hit",
  spear: "spear_hit",
  staff: "staff_hit",
  hook: "hook_hit",
};

export function sfxSlot(key: SfxKey): SfxSlot {
  return SFX_MAP[key];
}

/** 不知兵刃时用刀命中键。六系命中今天都是 clash。 */
export function hitKeyForSchool(school: WeaponId | null | undefined): SfxKey {
  if (!school) return "saber_hit";
  return HIT_KEY[school];
}

/** 出牌一声。攻击 = 挥空 swing；技能按步 / 回血 / 格挡 / 其余，都仍是 drop。 */
export function cardPlaySfxKey(def: {
  type?: string;
  steps?: number;
  heal?: number;
  block?: number;
} | undefined): SfxKey {
  if (!def) return "qi_gain";
  if (def.type === "attack") return WINDUP_KEY;
  if ((def.steps ?? 0) !== 0) return "step";
  if ((def.heal ?? 0) > 0) return "heal";
  if ((def.block ?? 0) > 0) return "ward_gain";
  return "qi_gain";
}

/** v2 演出名 → 语义键。hit 在播放时改走 hitKeyForSchool。 */
export const FX_KEY: Record<string, SfxKey> = {
  break: "clash_blade",
  counter: "clash_blade",
  wall: "block",
  graze: "graze",
  hit: "saber_hit",
  miss: "whiff",
  skip: "whiff",
  kill: WINDUP_KEY,
  burst: WINDUP_KEY,
  resonance: "aura",
};
