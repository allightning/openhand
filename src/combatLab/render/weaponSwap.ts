import type { GauntletRun } from "../../game/rules/gauntletModel";
import { WEAPON_NAME } from "../../game/party";
import type { CompanionId, Run, WeaponId } from "../../game/types";
import { spectrumOf, swapHallWeapon } from "../../game/weaponKit";
import { gauntletFieldMate } from "../gauntlet";
import { mateDeck } from "../loadout";
import { escapeHtml } from "../setupUi";

/** 馆间换装记在这一局里。`mateSchools` 跟角色核的字段同名，跑程类型上还没有。 */
export type HallLoadout = GauntletRun & {
  mateSchools?: Partial<Record<CompanionId, WeaponId>>;
  weaponSwapNote?: string;
};

export const CORE_LINE: Record<WeaponId, string> = {
  palm: "击退，连击",
  saber: "贴身，裂创",
  sword: "剑势，破绽",
  spear: "距离档，断劲",
  staff: "蓄力，击退",
  hook: "拉近缴械，噬血",
  dart: "双形态，钉",
};

const ICON: Record<WeaponId, string> = {
  palm: "拳",
  saber: "刀",
  sword: "剑",
  spear: "枪",
  staff: "棍",
  hook: "钩",
  dart: "飞",
};

function isWeapon(value: string): value is WeaponId {
  return value in WEAPON_NAME;
}

export function wornSchool(run: HallLoadout, mate: CompanionId): WeaponId | undefined {
  const saved = run.mateSchools?.[mate];
  if (saved) return saved;
  const gear = run.mateWeapons?.[mate] ?? (mate === gauntletFieldMate(run.school) ? run.weaponId : "");
  const head = gear.split("-")[0] ?? "";
  if (isWeapon(head)) return head;
  if (mate === gauntletFieldMate(run.school)) return run.school;
  return undefined;
}

function bridge(run: HallLoadout, mate: CompanionId): Run {
  const deck = mateDeck(run, mate);
  const school = wornSchool(run, mate);
  const schools = { ...(run.mateSchools ?? {}) };
  if (school) schools[mate] = school;
  return {
    active: mate,
    deck,
    mateDecks: { ...(run.mateDecks ?? {}), [mate]: deck },
    mateSchools: schools,
    weapon: run.mateWeapons?.[mate] ?? run.weaponId,
    weapons: [run.weaponId],
  } as Run;
}

/** 馆间调用已有换装。战斗中原样拒绝，配装不改。 */
export function applyHallSwap(run: GauntletRun, mate: CompanionId, school: WeaponId, fighting: boolean): HallLoadout {
  const hall = run as HallLoadout;
  const result = swapHallWeapon(bridge(hall, mate), mate, school, fighting);
  if (!result.ok) return { ...hall, weaponSwapNote: result.reason ?? "换不上" };
  const hero = gauntletFieldMate(run.school);
  return {
    ...hall,
    mateDecks: result.run.mateDecks,
    deckRecipe: mate === hero ? result.run.deck : run.deckRecipe,
    weaponId: mate === hero ? result.run.weapon : run.weaponId,
    mateWeapons: { ...(run.mateWeapons ?? {}), [mate]: result.run.weapon },
    mateSchools: result.run.mateSchools,
    weaponSwapNote: `已弹出 ${result.ejected.length} 张不符牌`,
  };
}

function pickButton(school: WeaponId, current: boolean, fighting: boolean): string {
  const locked = fighting || current;
  return `<button type="button" class="lab-btn shell-weapon-pick${current ? " is-on" : ""}" id="swap-${school}" data-swap-school="${school}"${locked ? " disabled" : ""}>
    <i class="shell-weapon-icon" data-weapon-icon="${school}">${ICON[school]}</i>
    <b>${escapeHtml(WEAPON_NAME[school])}</b>
    <span>${escapeHtml(CORE_LINE[school])}</span>
  </button>`;
}

export function renderWeaponSwap(run: GauntletRun, mate: CompanionId, fighting = false): string {
  const hall = run as HallLoadout;
  const current = wornSchool(hall, mate);
  const spectrum = spectrumOf(mate);
  const note = hall.weaponSwapNote ?? "";
  const locked = fighting ? ` data-weapon-locked="battle"` : "";
  if (!spectrum.length) {
    return `<section class="shell-weapon-swap" data-overlap-group="weapon-swap" data-spectrum-source="placeholder"${locked}>
      <p data-current-weapon="">当前未定</p>
      <p>武器谱还没写上</p>
      <button type="button" class="lab-btn" disabled>换装</button>
      <p class="shell-weapon-note" data-weapon-note>${escapeHtml(note)}</p>
    </section>`;
  }
  const picks = spectrum.map((school) => pickButton(school, school === current, fighting)).join("");
  const name = current ? WEAPON_NAME[current] : "未定";
  return `<section class="shell-weapon-swap" data-overlap-group="weapon-swap" data-spectrum-source="field" data-spectrum-n="${spectrum.length}"${locked}>
    <p data-current-weapon="${current ?? ""}">当前 ${escapeHtml(name)}</p>
    ${picks}
    <p class="shell-weapon-note" data-weapon-note>${escapeHtml(note)}</p>
  </section>`;
}
