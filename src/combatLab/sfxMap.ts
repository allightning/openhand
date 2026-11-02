import type { WeaponId } from "../game/types";

/**
 * 音效语义表。Notion「音乐音效」接线原则：按兵刃系 × 结算档复用，不为一招一条。
 * 值全部是现有 4 个占位（swing / clash / page / drop）。不新增音频文件。
 * 素材回来只改本表的值。
 *
 * 调用点现行音 → 查哪把键（应是 Notion 名；和现行占位不一致的写在键旁）：
 * - 出牌攻击、敌挥前摇、击杀、势爆、拆招 85ms 回声：现行 swing。查 `windup`。连击重放查 `combo_replay`（同是 swing）。
 *   出招短风以后并进 whiff；whiff 今天是打空的 drop，两处不能并成一格。
 * - 命中 / 玩家掉血：现行 clash。查兵刃 `*_hit`（不知系则 saber_hit，仍是 clash）。
 * - 拆 / 反击：现行 clash。查 `clash_blade`。
 * - 让 / 擦：现行 clash。查 `graze`。
 * - 撞墙（fx wall）：现行 clash。查 `wall_slam`。格挡语义仍是 `block`，牌面落挡走 `ward_gain`。
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
 * 2026-10-23：九个挂账键接到现有壳层 hook。飞刀 / 蓄力 / 无墙 / 环境只占位。
 * intent_gone 占位改 page：墨点掉条，不进打击总线。
 * 占位听感：clash 接触，swing 过风，drop 轻点，page 纸与墨。
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

/** 印记键。已接到出牌日志或阶段拍。 */
export const RESERVED_SFX_KEYS = [
  "qi_sever",
  "blood_drink",
  "stake_blast",
  "disarm",
  "combo_replay",
] as const;

/** 飞刀。WeaponId 还没有飞刀，命中表不收 dart_hit。 */
export const DART_SFX_KEYS = ["dart_throw", "dart_hit", "dart_pin", "dart_switch"] as const;

/** 棍蓄力与击退撞墙。staff_hit 仍是普通命中。 */
export const STAFF_CHARGE_SFX_KEYS = [
  "staff_charge",
  "staff_charge_full",
  "staff_burst",
  "staff_push_wall",
] as const;

/** 石台与环境。stake_shatter 与 stake_blast 同一占位 clash，等桩碎单独 hook。 */
export const BOARD_SFX_KEYS = [
  "wall_slam",
  "wall_none",
  "env_burn",
  "env_gap",
  "env_nowall",
  "stake_plant",
  "stake_shatter",
] as const;

/** 弃牌与置换。不是摸牌。 */
export const SHELL_SFX_KEYS = ["discard", "cycle_card"] as const;

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
  | (typeof DART_SFX_KEYS)[number]
  | (typeof STAFF_CHARGE_SFX_KEYS)[number]
  | (typeof BOARD_SFX_KEYS)[number]
  | (typeof SHELL_SFX_KEYS)[number]
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
  intent_gone: "page",
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
  // 飞刀。等素材。无 hook 不播。
  dart_throw: "swing",
  dart_hit: "clash",
  dart_pin: "drop",
  dart_switch: "page",
  // 蓄力。staff_burst 接到 burst 且当前兵器是棍；其余等蓄力牌面 hook。
  staff_charge: "drop",
  staff_charge_full: "swing",
  staff_burst: "swing",
  staff_push_wall: "clash",
  // 石台 / 环境。wall_slam 接到 fx wall。无墙与环境词条等 hook。
  wall_slam: "clash",
  wall_none: "drop",
  env_burn: "drop",
  env_gap: "page",
  env_nowall: "drop",
  stake_plant: "drop",
  stake_shatter: "clash",
  discard: "page",
  cycle_card: "page",
};

const HIT_KEY: Record<WeaponId, SfxKey> = {
  palm: "fist_hit",
  saber: "saber_hit",
  sword: "sword_hit",
  spear: "spear_hit",
  staff: "staff_hit",
  hook: "hook_hit",
  dart: "saber_hit",
};

export function sfxSlot(key: SfxKey): SfxSlot {
  return SFX_MAP[key];
}

/** 不知兵刃时用刀命中键。六系命中今天都是 clash。 */
export function hitKeyForSchool(school: WeaponId | null | undefined): SfxKey {
  if (!school) return "saber_hit";
  return HIT_KEY[school];
}

/** 出牌一声。攻击 = 挥空。步 / 回血 / 格挡 / 落桩仍是 drop。破绽牌走 expose（clash）。 */
export function cardPlaySfxKey(def: {
  type?: string;
  steps?: number;
  heal?: number;
  block?: number;
  plant?: boolean;
  expose?: number;
} | undefined): SfxKey {
  if (!def) return "qi_gain";
  if (def.type === "attack") return WINDUP_KEY;
  if ((def.steps ?? 0) !== 0) return "step";
  if ((def.heal ?? 0) > 0) return "heal";
  if ((def.block ?? 0) > 0) return "ward_gain";
  if (def.plant) return "stake_plant";
  if ((def.expose ?? 0) > 0) return "expose";
  return "qi_gain";
}

/** 出牌前后日志里多出来的印记。调用方去掉与牌面键重复的那一声。 */
export type RiderSnap = {
  log?: readonly string[];
  foeDisarm?: number;
};

export function riderSfxKeys(before: RiderSnap, after: RiderSnap): SfxKey[] {
  const prev = before.log?.length ?? 0;
  const fresh = (after.log ?? []).slice(prev).join("\n");
  const keys: SfxKey[] = [];
  if (fresh.includes("噬血")) keys.push("blood_drink");
  if (fresh.includes("裂桩爆炸")) keys.push("stake_blast");
  if (fresh.includes("断劲")) keys.push("qi_sever");
  if (fresh.includes("破绽")) keys.push("expose");
  if (
    fresh.includes("缴械") ||
    fresh.includes("缴手") ||
    (after.foeDisarm ?? 0) > (before.foeDisarm ?? 0)
  ) {
    keys.push("disarm");
  }
  return keys;
}

/** 爬塔阶段拍。无对应键的拍返回 null，不另造一声。 */
export function climbBeatSfxKey(step: string, read: string): SfxKey | null {
  if (step === "bleed") return "bleed_tick";
  if (step === "draw" || step === "drawBench") return "draw_card";
  if (step === "wage" && /断劲|挂账/.test(read)) return "qi_sever";
  return null;
}

/** v2 演出名 → 语义键。hit 在播放时改走 hitKeyForSchool。 */
export const FX_KEY: Record<string, SfxKey> = {
  break: "clash_blade",
  counter: "clash_blade",
  wall: "wall_slam",
  graze: "graze",
  hit: "saber_hit",
  miss: "whiff",
  skip: "whiff",
  kill: WINDUP_KEY,
  burst: WINDUP_KEY,
  resonance: "aura",
  swap: "swap",
};
