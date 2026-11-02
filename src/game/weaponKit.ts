import { cardSchool } from "./party";
import type { CardId, CompanionId, Run, WeaponId } from "./types";

/** 18 人武器谱。本命在第一位。 */
export const WEAPON_SPECTRUM: Record<string, WeaponId[]> = {
  watch: ["saber", "palm", "sword"],
  baimenghe: ["palm", "saber", "staff"],
  wenrensheng: ["sword", "saber", "dart"],
  huochangchuan: ["spear", "staff", "dart"],
  shiwanshan: ["staff", "spear", "palm"],
  moqiwan: ["hook", "palm", "dart"],
  lvchifeng: ["saber", "palm", "sword"],
  zhounuanxiang: ["palm", "saber", "staff"],
  boqing: ["sword", "saber", "dart"],
  ananhuo: ["spear", "staff", "dart"],
  zhangshoushan: ["staff", "spear", "palm"],
  chenchenlan: ["hook", "palm", "dart"],
  lishuangxing: ["saber", "sword", "palm", "dart"],
  fubishan: ["palm", "staff", "saber", "hook"],
  duguposui: ["sword", "dart", "saber", "spear"],
  gongsunsizhang: ["spear", "dart", "staff", "sword"],
  fengtang: ["staff", "palm", "spear", "hook"],
  ouyangyingou: ["hook", "dart", "palm", "saber"],
};

/** 每系 6 张基础牌。凡档，占配装位。飞刀挡用通用格挡，系内还没有刀囊。 */
export const BASIC_KIT: Record<WeaponId, CardId[]> = {
  palm: ["strike", "hitPalm", "wardPalm", "advance", "statusPalm", "gather"],
  saber: ["cut", "bleedcut", "wardSaber", "retreat", "drawcut", "gather"],
  sword: ["hitSword", "direct", "wardSword", "stepSword", "expose", "gather"],
  spear: ["thrust", "statusSpear", "wardSpear", "stepSpear", "statusSpear2", "gather"],
  staff: ["split", "staffBind", "wardStaff", "stepStaff", "plant", "gather"],
  hook: ["hookpull", "hookDisarm", "wardHook", "sidestep", "statusHook", "gather"],
  dart: ["dartFlick", "dartThrow", "defend", "retreat", "dartPin", "gather"],
};

export function spectrumOf(id: CompanionId): WeaponId[] {
  return WEAPON_SPECTRUM[id] ?? [];
}

export function canWear(id: CompanionId, school: WeaponId): boolean {
  return spectrumOf(id).includes(school);
}

function deckOf(run: Run, mate: CompanionId): CardId[] {
  if (mate === run.active && (run.mateDecks[mate]?.length ?? 0) === 0) return [...run.deck];
  return [...(run.mateDecks[mate] ?? run.deck)];
}

export interface WeaponSwap {
  ok: boolean;
  reason?: string;
  run: Run;
  ejected: CardId[];
}

/** 仅馆间。fighting 为真时拒绝。弹出非本系牌，补上 6 张基础牌。 */
export function swapHallWeapon(run: Run, mate: CompanionId, school: WeaponId, fighting: boolean): WeaponSwap {
  if (fighting) return { ok: false, reason: "战斗中不能换装", run, ejected: [] };
  if (!canWear(mate, school)) return { ok: false, reason: "不在武器谱里", run, ejected: [] };
  const ejected: CardId[] = [];
  const kept = deckOf(run, mate).filter((id) => {
    const sch = cardSchool(id);
    if (sch === "any" || sch === school) return true;
    ejected.push(id);
    return false;
  });
  const basics = BASIC_KIT[school];
  for (const id of basics) {
    if (!kept.includes(id)) kept.push(id);
  }
  const mateDecks = { ...run.mateDecks, [mate]: kept };
  const mateSchools = { ...(run.mateSchools ?? {}), [mate]: school };
  const weapon = mate === run.active ? `${school}-a-1` : run.weapon;
  const weapons = run.weapons.includes(weapon) ? run.weapons : [...run.weapons, weapon];
  return {
    ok: true,
    run: { ...run, mateDecks, mateSchools, deck: mate === run.active ? kept : run.deck, weapon, weapons },
    ejected,
  };
}
