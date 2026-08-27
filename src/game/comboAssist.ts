import type { WeaponId } from "./types";

/** §16.3 助战属性 — 读当前装备系；v2.5 仅跨系生效（同系 → §16.4 同门合击，批次三）。 */
export interface ComboAssistMods {
  rangeBonus?: number;
  knockBonus?: number;
  meleeBonus?: number;
  exposeBonus?: number;
  blockBonus?: number;
  pullAfterHit?: number;
}

const COMBO_ASSIST: Record<WeaponId, ComboAssistMods> = {
  spear: { rangeBonus: 2 },
  palm: { knockBonus: 1 },
  saber: { meleeBonus: 3 },
  sword: { exposeBonus: 1 },
  staff: { blockBonus: 4 },
  hook: { pullAfterHit: 1 },
};

/** 助战者系 ≠ 场上角色当前武器系才返回附加属性。 */
export function comboAssistMods(assistSchool: WeaponId, fieldSchool: WeaponId): ComboAssistMods | null {
  if (assistSchool === fieldSchool) return null;
  return { ...COMBO_ASSIST[assistSchool] };
}

/** @deprecated 请传 fieldSchool；缺省时不做跨系门控（测试兼容） */
export function comboAssistModsLegacy(school: WeaponId): ComboAssistMods {
  return { ...COMBO_ASSIST[school] };
}
